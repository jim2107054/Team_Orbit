import { envConfig, LlmProviderName } from '../../core/env.js';
import {
  LlmProvider,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProviderError,
  EmbeddingProvider,
  EmbeddingResult
} from './types.js';

/**
 * Provider adapters built on the global fetch, so no vendor SDK is added to the
 * dependency tree and all three providers share one timeout/abort contract.
 */

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.text();
    // Providers wrap the useful part in a JSON envelope; surface just the message
    // so a failure reads as one line instead of a pretty-printed body.
    try {
      const parsed = JSON.parse(body);
      const message = parsed?.error?.message ?? parsed?.message;
      if (typeof message === 'string' && message) return message.replace(/\s+/g, ' ').slice(0, 240);
    } catch {
      // not JSON — fall through to the raw text
    }
    return body.replace(/\s+/g, ' ').slice(0, 240);
  } catch {
    return res.statusText;
  }
}

const GEMINI_OUTPUT_HEADROOM = 1024;

/**
 * Keep thinking minimal for the structured-extraction tasks here. They are
 * classification and summarisation over supplied text, not open-ended reasoning,
 * and unbounded thinking cost 4-7s per call and put the JSON at risk of
 * truncation. The parameter differs by model generation.
 */
function geminiThinkingConfig(model: string): Record<string, unknown> {
  if (/gemini-3/.test(model)) {
    return { thinkingConfig: { thinkingLevel: 'minimal' } };
  }
  // 2.5 Flash can disable thinking outright; 2.5 Pro cannot, so leave it alone.
  if (/gemini-2\.5/.test(model) && !/pro/.test(model)) {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }
  return {};
}

/**
 * GPT-5/6 and the o-series are reasoning models: they reject max_tokens and any
 * non-default temperature, and bill hidden reasoning tokens against the
 * completion cap.
 */
function isOpenAiReasoningModel(model: string): boolean {
  return /^(gpt-5|gpt-6|o\d)/.test(model);
}

const OPENAI_REASONING_HEADROOM = 2048;

/** Embedding calls are not covered by the per-call LLM abort, so they carry their own. */
const EMBEDDING_TIMEOUT_MS = 20_000;

// ─── Anthropic (Claude) ───────────────────────────────────────────────────────

export class AnthropicProvider implements LlmProvider {
  readonly name: LlmProviderName = 'anthropic';

  constructor(readonly model: string, private readonly apiKey: string) {}

  async complete(req: LlmCompletionRequest, signal: AbortSignal): Promise<LlmCompletionResult> {
    const started = performance.now();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxOutputTokens ?? envConfig.LLM_MAX_OUTPUT_TOKENS,
        temperature: req.temperature ?? 0,
        system: req.system,
        messages: req.messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!res.ok) {
      throw new LlmProviderError(
        `Anthropic request failed (${res.status}): ${await readError(res)}`,
        res.status,
        retryableStatus(res.status)
      );
    }

    const data: any = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      : '';

    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: data?.usage?.input_tokens ?? 0,
      outputTokens: data?.usage?.output_tokens ?? 0,
      latencyMs: performance.now() - started
    };
  }
}

// ─── Google Gemini ────────────────────────────────────────────────────────────

export class GeminiProvider implements LlmProvider {
  readonly name: LlmProviderName = 'gemini';

  constructor(readonly model: string, private readonly apiKey: string) {}

  async complete(req: LlmCompletionRequest, signal: AbortSignal): Promise<LlmCompletionResult> {
    const started = performance.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map(m => ({
          // Gemini names the assistant role "model".
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          temperature: req.temperature ?? 0,
          // Thinking tokens are drawn from this same budget on Gemini 2.5+/3.x.
          // Without headroom a model can spend the whole allowance reasoning and
          // return an empty, unparseable body (observed: finishReason MAX_TOKENS
          // with 3 output tokens against 382 thinking tokens at a 400 cap).
          maxOutputTokens: (req.maxOutputTokens ?? envConfig.LLM_MAX_OUTPUT_TOKENS) + GEMINI_OUTPUT_HEADROOM,
          ...geminiThinkingConfig(this.model),
          ...(req.jsonMode ? { responseMimeType: 'application/json' } : {})
        }
      })
    });

    if (!res.ok) {
      throw new LlmProviderError(
        `Gemini request failed (${res.status}): ${await readError(res)}`,
        res.status,
        retryableStatus(res.status)
      );
    }

    const data: any = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? '')
      .join('');

    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs: performance.now() - started
    };
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

export class OpenAiProvider implements LlmProvider {
  readonly name: LlmProviderName = 'openai';

  constructor(readonly model: string, private readonly apiKey: string) {}

  async complete(req: LlmCompletionRequest, signal: AbortSignal): Promise<LlmCompletionResult> {
    const started = performance.now();

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        ...(isOpenAiReasoningModel(this.model)
          ? {
              max_completion_tokens:
                (req.maxOutputTokens ?? envConfig.LLM_MAX_OUTPUT_TOKENS) + OPENAI_REASONING_HEADROOM,
              // 'low' is accepted by every reasoning model; 'minimal' is not
              // (gpt-5.6-luna rejects it).
              reasoning_effort: 'low'
            }
          : {
              temperature: req.temperature ?? 0,
              max_tokens: req.maxOutputTokens ?? envConfig.LLM_MAX_OUTPUT_TOKENS
            }),
        ...(req.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: req.system },
          ...req.messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });

    if (!res.ok) {
      throw new LlmProviderError(
        `OpenAI request failed (${res.status}): ${await readError(res)}`,
        res.status,
        retryableStatus(res.status)
      );
    }

    const data: any = await res.json();

    return {
      text: data?.choices?.[0]?.message?.content ?? '',
      provider: this.name,
      model: this.model,
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
      latencyMs: performance.now() - started
    };
  }
}

export function createProviders(): LlmProvider[] {
  return envConfig.LLM_PROVIDER_CHAIN.map((name): LlmProvider => {
    const model = envConfig.LLM_MODELS[name];
    switch (name) {
      case 'anthropic':
        return new AnthropicProvider(model, envConfig.ANTHROPIC_API_KEY);
      case 'gemini':
        return new GeminiProvider(model, envConfig.GEMINI_API_KEY);
      case 'openai':
        return new OpenAiProvider(model, envConfig.OPENAI_API_KEY);
    }
  });
}

// ─── Embedding providers ──────────────────────────────────────────────────────

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';

  constructor(readonly model: string, private readonly apiKey: string) {}

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:batchEmbedContents`;

    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        requests: texts.map(text => ({
          model: `models/${this.model}`,
          content: { parts: [{ text }] }
        }))
      })
    });

    if (!res.ok) {
      throw new LlmProviderError(
        `Gemini embedding failed (${res.status}): ${await readError(res)}`,
        res.status,
        retryableStatus(res.status)
      );
    }

    const data: any = await res.json();
    const vectors: number[][] = (data?.embeddings ?? []).map((e: any) => e?.values ?? []);
    if (vectors.length !== texts.length) {
      throw new LlmProviderError('Gemini returned a different number of embeddings than inputs');
    }

    return { vectors, model: this.model, provider: this.name, dimension: vectors[0]?.length ?? 0 };
  }
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';

  constructor(readonly model: string, private readonly apiKey: string) {}

  async embed(texts: string[]): Promise<EmbeddingResult> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts })
    });

    if (!res.ok) {
      throw new LlmProviderError(
        `OpenAI embedding failed (${res.status}): ${await readError(res)}`,
        res.status,
        retryableStatus(res.status)
      );
    }

    const data: any = await res.json();
    const vectors: number[][] = (data?.data ?? [])
      .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
      .map((d: any) => d?.embedding ?? []);

    return { vectors, model: this.model, provider: this.name, dimension: vectors[0]?.length ?? 0 };
  }
}

/**
 * Deterministic bag-of-character-ngrams embedder with no network dependency.
 *
 * It is a real vector representation — hashed n-gram counts, L2-normalised — so
 * cosine similarity is meaningful for the near-duplicate and paraphrase matching
 * the campaign clustering needs, and it works across Bangla, Banglish and
 * English because it operates on character n-grams rather than a word list. It
 * is deliberately not a semantic model: it cannot relate words that share no
 * characters. It exists so retrieval is demonstrable without any API key, and
 * the hosted providers above are the quality path.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'local';
  readonly model = 'local-hashing-v1';
  private readonly dimension = 512;

  async embed(texts: string[]): Promise<EmbeddingResult> {
    return {
      vectors: texts.map(t => this.embedOne(t)),
      model: this.model,
      provider: this.name,
      dimension: this.dimension
    };
  }

  private embedOne(text: string): number[] {
    const vector = new Array<number>(this.dimension).fill(0);
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return vector;

    for (const gram of this.ngrams(normalized, 3)) {
      vector[this.hash(gram) % this.dimension] += 1;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }

  private ngrams(text: string, n: number): string[] {
    if (text.length <= n) return [text];
    const out: string[] = [];
    for (let i = 0; i <= text.length - n; i++) {
      out.push(text.slice(i, i + n));
    }
    return out;
  }

  /** FNV-1a, for a stable spread across buckets between runs. */
  private hash(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  switch (envConfig.EMBEDDING_PROVIDER) {
    case 'gemini':
      return new GeminiEmbeddingProvider(envConfig.EMBEDDING_MODEL, envConfig.GEMINI_API_KEY);
    case 'openai':
      return new OpenAiEmbeddingProvider(envConfig.EMBEDDING_MODEL, envConfig.OPENAI_API_KEY);
    default:
      return new LocalEmbeddingProvider();
  }
}
