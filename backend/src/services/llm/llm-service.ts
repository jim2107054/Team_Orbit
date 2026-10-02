import { z } from 'zod';
import { envConfig } from '../../core/env.js';
import { getDbPool } from '../../db/client.js';
import { createProviders, createEmbeddingProvider } from './providers.js';
import {
  LlmProvider,
  EmbeddingProvider,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProviderError,
  EmbeddingResult
} from './types.js';

export interface LlmCallMeta {
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  attempts: number;
  ragChunkCount: number;
  /** Providers that were tried first and failed before this one answered. */
  failover: Array<{ provider: string; model: string; reason: string }>;
}

/**
 * Explicit success/failure so no call site can mistake "the model was
 * unavailable" for "the model said nothing was wrong". Every caller has to
 * handle `ok: false` by falling back to its deterministic path.
 */
export type LlmOutcome<T> =
  | { ok: true; value: T; meta: LlmCallMeta }
  | { ok: false; reason: string; meta: Partial<LlmCallMeta> };

export interface JsonCallOptions<T> {
  /** Short stable name, e.g. 'scam-nlp' — used for the invocation log. */
  task: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  targetId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** Retrieved context attached to this call, recorded for observability. */
  ragChunkCount?: number;
}

class LlmService {
  private providers: LlmProvider[] = createProviders();
  private embedder: EmbeddingProvider = createEmbeddingProvider();

  isEnabled(): boolean {
    return envConfig.LLM_ENABLED && this.providers.length > 0;
  }

  describe(): {
    enabled: boolean;
    provider: string | null;
    model: string | null;
    chain: Array<{ provider: string; model: string }>;
    embedding_provider: string;
    embedding_model: string;
    rag_enabled: boolean;
  } {
    const primary = this.providers[0];
    return {
      enabled: this.isEnabled(),
      provider: primary?.name ?? null,
      model: primary?.model ?? null,
      chain: this.providers.map(p => ({ provider: p.name, model: p.model })),
      embedding_provider: this.embedder.name,
      embedding_model: this.embedder.model,
      rag_enabled: envConfig.RAG_ENABLED
    };
  }

  /**
   * Ask the model for JSON matching `schema`. A malformed or schema-violating
   * reply is a failure, not something to coerce — the caller falls back.
   */
  async completeJson<T>(options: JsonCallOptions<T>): Promise<LlmOutcome<T>> {
    const ragChunkCount = options.ragChunkCount ?? 0;

    if (!this.isEnabled()) {
      const reason = envConfig.IS_LLM_CONFIGURED
        ? 'LLM disabled by configuration'
        : 'No LLM API key configured';
      await this.record(options.task, 'SKIPPED', reason, { ragChunkCount, targetId: options.targetId });
      return { ok: false, reason, meta: { ragChunkCount } };
    }

    const request: LlmCompletionRequest = {
      task: options.task,
      system: options.system,
      messages: [{ role: 'user', content: options.user }],
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature ?? 0,
      jsonMode: true,
      targetId: options.targetId
    };

    const failover: LlmCallMeta['failover'] = [];
    const startedAt = Date.now();

    for (let index = 0; index < this.providers.length; index++) {
      const provider = this.providers[index];
      const isLast = index === this.providers.length - 1;

      // Each attempt gets the smaller of the per-call timeout and what is left of
      // the whole-chain budget. Below ~1.5s there is no realistic chance of a
      // model answering, so skip it rather than burn the remainder.
      const remaining = envConfig.LLM_TOTAL_BUDGET_MS - (Date.now() - startedAt);
      if (remaining < 1500) {
        failover.push({
          provider: provider.name,
          model: provider.model,
          reason: `Skipped: ${Math.max(0, Math.round(remaining))}ms left of the ${envConfig.LLM_TOTAL_BUDGET_MS}ms budget`
        });
        continue;
      }
      const attemptTimeoutMs = Math.min(envConfig.LLM_TIMEOUT_MS, remaining);

      // A provider that just returned a quota or overload error will almost
      // certainly do so again, and every doomed attempt costs the user latency.
      // Skip it while it cools down — unless it is the only one left, in which
      // case a doomed attempt still beats giving up without trying.
      const coolingMs = this.cooldownRemainingMs(provider.name);
      if (!isLast && coolingMs > 0) {
        failover.push({
          provider: provider.name,
          model: provider.model,
          reason: `Skipped: cooling down after a recent failure (${Math.ceil(coolingMs / 1000)}s left)`
        });
        continue;
      }
      // Retrying the same provider only makes sense when nothing else is left to
      // try; otherwise the next provider is a better use of the time budget.
      const maxAttempts = isLast ? Math.max(1, envConfig.LLM_MAX_RETRIES + 1) : 1;

      const attempt = await this.tryProvider(provider, request, options.schema, maxAttempts, attemptTimeoutMs);

      if (attempt.ok) {
        this.cooldownUntil.delete(provider.name);
        const meta: LlmCallMeta = {
          provider: attempt.result.provider,
          model: attempt.result.model,
          latencyMs: attempt.result.latencyMs,
          inputTokens: attempt.result.inputTokens,
          outputTokens: attempt.result.outputTokens,
          attempts: attempt.attempts,
          ragChunkCount,
          failover
        };

        await this.record(
          options.task,
          'SUCCESS',
          failover.length
            ? `Served by ${meta.provider} after failover from ${failover.map(f => f.provider).join(', ')}`
            : null,
          { ragChunkCount, targetId: options.targetId, meta }
        );

        return { ok: true, value: attempt.value, meta };
      }

      failover.push({ provider: provider.name, model: provider.model, reason: attempt.reason });
      this.noteProviderFailure(provider.name, attempt.status);

      if (!isLast) {
        // Logged as its own row so a flapping provider is visible even though
        // the request itself succeeded on the next one.
        await this.record(options.task, 'FAILOVER', attempt.reason, {
          ragChunkCount,
          targetId: options.targetId,
          provider: provider.name,
          model: provider.model
        });
        console.warn(
          `[LLM] ${options.task}: ${provider.name} failed (${attempt.reason}); trying ${this.providers[index + 1].name}`
        );
      }
    }

    const last = failover[failover.length - 1];
    const reason = failover.map(f => `${f.provider}: ${f.reason}`).join(' | ');
    await this.record(options.task, 'FAILED', reason, {
      ragChunkCount,
      targetId: options.targetId,
      provider: last?.provider,
      model: last?.model
    });
    console.warn(`[LLM] ${options.task} fell back to rules: ${reason}`);
    return { ok: false, reason, meta: { ragChunkCount, failover } };
  }

  private cooldownUntil = new Map<string, number>();

  private cooldownRemainingMs(provider: string): number {
    return Math.max(0, (this.cooldownUntil.get(provider) ?? 0) - Date.now());
  }

  /**
   * Quota exhaustion (429) tends to last until the window resets, so back off
   * for a minute. Overload and timeouts are usually brief, so a short pause.
   * A bad request or auth error is not transient and is not cooled down — the
   * next call may succeed once the configuration is fixed.
   */
  private noteProviderFailure(provider: string, status: number | undefined): void {
    const ms = status === 429 ? 60_000 : status === 503 || status === 408 || status === 504 ? 15_000 : 0;
    if (ms > 0) this.cooldownUntil.set(provider, Date.now() + ms);
  }

  /** One provider, with its own timeout per attempt and retry on transient errors. */
  private async tryProvider<T>(
    provider: LlmProvider,
    request: LlmCompletionRequest,
    schema: z.ZodType<T>,
    maxAttempts: number,
    timeoutMs: number
  ): Promise<
    | { ok: true; value: T; result: LlmCompletionResult; attempts: number }
    | { ok: false; reason: string; status?: number }
  > {
    let lastReason = 'unknown error';
    let lastStatus: number | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await provider.complete(request, controller.signal);
        const parsed = this.parseJson(result.text);

        if (!parsed.ok) {
          // A malformed body will usually repeat; do not burn the retry budget.
          return { ok: false, reason: parsed.reason };
        }

        const validated = schema.safeParse(parsed.value);
        if (!validated.success) {
          const issues = validated.error.issues
            .slice(0, 3)
            .map(i => `${i.path.join('.')} ${i.message}`)
            .join('; ');
          return { ok: false, reason: `Response did not match schema: ${issues}` };
        }

        return { ok: true, value: validated.data, result, attempts: attempt };
      } catch (err: any) {
        const aborted = err?.name === 'AbortError';
        lastStatus = err instanceof LlmProviderError ? err.status : aborted ? 408 : undefined;
        lastReason = aborted
          ? `Timed out after ${timeoutMs}ms`
          : String(err?.message || err);

        const retryable = aborted || (err instanceof LlmProviderError && err.retryable);
        if (!retryable) break;
      } finally {
        clearTimeout(timer);
      }
    }

    return { ok: false, reason: lastReason, status: lastStatus };
  }

  /**
   * Embed texts for retrieval.
   *
   * Results are cached by (model, text). A single complaint is embedded for
   * grounding, again to search for near-duplicates, and again to index it — the
   * same text three times. Each is a network round trip that sits on the request
   * path, so caching turns three calls into one.
   */
  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (!texts.length) {
      return { vectors: [], model: this.embedder.model, provider: this.embedder.name, dimension: 0 };
    }

    const keyOf = (text: string) => `${this.embedder.name}|${this.embedder.model}|${text}`;
    const vectors: Array<number[] | undefined> = texts.map(t => this.embeddingCache.get(keyOf(t)));
    const missingIdx = vectors.flatMap((v, i) => (v ? [] : [i]));

    let dimension = vectors.find(Boolean)?.length ?? 0;

    if (missingIdx.length) {
      const fresh = await this.embedder.embed(missingIdx.map(i => texts[i]));
      missingIdx.forEach((textIndex, k) => {
        const vec = fresh.vectors[k];
        vectors[textIndex] = vec;
        this.rememberEmbedding(keyOf(texts[textIndex]), vec);
      });
      dimension = fresh.dimension || dimension;
    }

    return {
      vectors: vectors as number[][],
      model: this.embedder.model,
      provider: this.embedder.name,
      dimension
    };
  }

  private embeddingCache = new Map<string, number[]>();
  private static readonly EMBEDDING_CACHE_LIMIT = 1000;

  private rememberEmbedding(key: string, vector: number[]): void {
    if (this.embeddingCache.has(key)) this.embeddingCache.delete(key);
    this.embeddingCache.set(key, vector);
    if (this.embeddingCache.size > LlmService.EMBEDDING_CACHE_LIMIT) {
      const oldest = this.embeddingCache.keys().next().value;
      if (oldest !== undefined) this.embeddingCache.delete(oldest);
    }
  }

  embeddingInfo(): { provider: string; model: string } {
    return { provider: this.embedder.name, model: this.embedder.model };
  }

  /**
   * Models sometimes wrap JSON in prose or a fenced block even in JSON mode, so
   * pull out the first balanced object before parsing.
   */
  private parseJson(raw: string): { ok: true; value: unknown } | { ok: false; reason: string } {
    const text = (raw ?? '').trim();
    if (!text) return { ok: false, reason: 'Empty response body' };

    const candidates: string[] = [text];

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) candidates.push(fenced[1].trim());

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));

    for (const candidate of candidates) {
      try {
        return { ok: true, value: JSON.parse(candidate) };
      } catch {
        continue;
      }
    }

    return { ok: false, reason: 'Response was not valid JSON' };
  }

  /**
   * Append an invocation row. Observability must never break a request, so a
   * logging failure is swallowed after a warning.
   */
  private async record(
    task: string,
    status: 'SUCCESS' | 'FAILED' | 'FAILOVER' | 'SKIPPED',
    reason: string | null,
    extra: {
      ragChunkCount: number;
      targetId?: string;
      meta?: LlmCallMeta;
      provider?: string;
      model?: string;
    }
  ): Promise<void> {
    if (envConfig.NODE_ENV === 'test') return;

    const id = `LLM-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    try {
      await getDbPool().query(
        `INSERT INTO llm_invocations
           (invocation_id, task, provider, model, status, fallback_used, fallback_reason,
            rag_used, rag_chunk_count, latency_ms, input_tokens, output_tokens, target_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          task,
          extra.meta?.provider ?? extra.provider ?? envConfig.RESOLVED_LLM_PROVIDER ?? 'none',
          extra.meta?.model ?? extra.model ?? envConfig.LLM_MODEL ?? 'none',
          status,
          // fallback_used means the rule engine had to serve the request. A
          // FAILOVER row is a provider miss that another provider then covered.
          status === 'FAILED' || status === 'SKIPPED',
          reason ? reason.slice(0, 255) : null,
          extra.ragChunkCount > 0,
          extra.ragChunkCount,
          extra.meta?.latencyMs ?? 0,
          extra.meta?.inputTokens ?? 0,
          extra.meta?.outputTokens ?? 0,
          extra.targetId ?? null
        ]
      );
    } catch (err: any) {
      console.warn(`[LLM] could not record invocation: ${err?.message || err}`);
    }
  }
}

export const llmService = new LlmService();
