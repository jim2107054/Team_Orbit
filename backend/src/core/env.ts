import dotenv from 'dotenv';
dotenv.config();

export type LlmProviderName = 'anthropic' | 'gemini' | 'openai';
export type EmbeddingProviderName = 'gemini' | 'openai' | 'local';

export interface AppEnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  FRONTEND_URL: string;
  IS_DATABASE_CONFIGURED: boolean;

  // ─── Language model configuration ───────────────────────────
  /** Explicit provider choice. Unset means "use whichever key is present". */
  LLM_PROVIDER: LlmProviderName | null;
  ANTHROPIC_API_KEY: string;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  /** Overrides the provider's default model when set. */
  LLM_MODEL: string;
  LLM_TIMEOUT_MS: number;
  /** Ceiling on the whole provider chain for one call, across failovers. */
  LLM_TOTAL_BUDGET_MS: number;
  LLM_MAX_RETRIES: number;
  LLM_MAX_OUTPUT_TOKENS: number;
  /** Master switch. Off means the deterministic rule engines run alone. */
  LLM_ENABLED: boolean;
  /** The primary provider: the first one tried. Null when no key is present. */
  RESOLVED_LLM_PROVIDER: LlmProviderName | null;
  /**
   * Every provider that has a key, primary first. A failed or timed-out call
   * moves down this list before the request falls back to the rule engine, so
   * one provider having a bad minute does not cost the model layer entirely.
   */
  LLM_PROVIDER_CHAIN: LlmProviderName[];
  /** Model used for each provider. Only providers in the chain are ever called. */
  LLM_MODELS: Record<LlmProviderName, string>;
  IS_LLM_CONFIGURED: boolean;

  // ─── Retrieval configuration ────────────────────────────────
  EMBEDDING_PROVIDER: EmbeddingProviderName;
  EMBEDDING_MODEL: string;
  RAG_ENABLED: boolean;
  RAG_TOP_K: number;
  RAG_MIN_SCORE: number;
  /** Cosine score at or above which two complaints are treated as the same report. */
  RAG_DUPLICATE_THRESHOLD: number;
  /** True when the embedder was measured to place Bangla and English reports of one incident together. */
  EMBEDDING_CROSS_LANGUAGE: boolean;
}

// gemini-3.5-flash is the newest Flash model that answered reliably on a
// free-tier key when probed; gemini-3.7/3.8-flash returned 503 or hung, and the
// Pro models are not free-tier.
const DEFAULT_MODELS: Record<LlmProviderName, string> = {
  anthropic: 'claude-sonnet-5',
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-4o-mini'
};

const DEFAULT_EMBEDDING_MODELS: Record<EmbeddingProviderName, string> = {
  gemini: 'gemini-embedding-001',
  openai: 'text-embedding-3-small',
  local: 'local-hashing-v1'
};


/**
 * Score distributions differ sharply between embedders, so a single cutoff is
 * wrong for all of them. These were measured on Bangla / Banglish / English
 * reports of the same incident versus different incidents:
 *
 *  - gemini-embedding-001: same incident scores 0.89-0.95 even across scripts,
 *    different incidents 0.61-0.74. Separable; cutoff 0.82 sits in the gap.
 *  - openai text-embedding-3-small/large: same incident across Bangla and
 *    English scores 0.30-0.59 while *different* English incidents score up to
 *    0.58, so Bangla<->English duplicates cannot be separated from unrelated
 *    complaints at any threshold. Within one script it works (~0.73 vs ~0.45).
 *  - local hashing embedder: lexical only; matches within one script.
 */
const RETRIEVAL_DEFAULTS: Record<EmbeddingProviderName, { minScore: number; duplicate: number; crossLanguage: boolean }> = {
  // Retrieval floor 0.69. Measured: 8/8 clear scam queries (Bangla/Banglish/English)
  // retrieve the right typology at 0.795-0.948; a deliberately subtle English scam
  // with none of the usual keywords scores 0.715-0.720; benign and off-topic text
  // tops out at 0.672. 0.69 sits in the gap between the last two. Small sample, so
  // RAG_MIN_SCORE can override it.
  gemini: { minScore: 0.69, duplicate: 0.82, crossLanguage: true },
  openai: { minScore: 0.25, duplicate: 0.65, crossLanguage: false },
  local: { minScore: 0.25, duplicate: 0.40, crossLanguage: false }
};

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function validateAndLoadEnv(): AppEnvConfig {
  const PORT = parseInt(process.env.PORT || '4000', 10);
  const NODE_ENV = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const DATABASE_URL = process.env.DATABASE_URL || '';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!DATABASE_URL) {
    console.warn('⚠️ WARNING: DATABASE_URL environment variable is missing.');
    console.warn('Please configure DATABASE_URL in backend/.env for Neon PostgreSQL connectivity.');
  }

  const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
  const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();

  const requested = (process.env.LLM_PROVIDER || '').trim().toLowerCase();
  const LLM_PROVIDER: LlmProviderName | null =
    requested === 'anthropic' || requested === 'gemini' || requested === 'openai'
      ? requested
      : null;

  const keyFor = (p: LlmProviderName): string =>
    p === 'anthropic' ? ANTHROPIC_API_KEY : p === 'gemini' ? GEMINI_API_KEY : OPENAI_API_KEY;

  // Honour an explicit choice only if its key exists; otherwise fall back to
  // whichever provider is actually usable, so a half-configured .env still runs.
  let RESOLVED_LLM_PROVIDER: LlmProviderName | null = null;
  if (LLM_PROVIDER && keyFor(LLM_PROVIDER)) {
    RESOLVED_LLM_PROVIDER = LLM_PROVIDER;
  } else {
    RESOLVED_LLM_PROVIDER =
      (['anthropic', 'gemini', 'openai'] as LlmProviderName[]).find(p => keyFor(p)) ?? null;
    if (LLM_PROVIDER && !keyFor(LLM_PROVIDER)) {
      console.warn(
        `⚠️ LLM_PROVIDER is "${LLM_PROVIDER}" but no matching API key was found.` +
        (RESOLVED_LLM_PROVIDER ? ` Falling back to "${RESOLVED_LLM_PROVIDER}".` : ' Model calls are disabled.')
      );
    }
  }

  // Vitest loads backend/.env, so real keys are visible inside the test run. The
  // suites assert deterministic behaviour and must not make paid, networked,
  // nondeterministic calls, so both layers default to off under NODE_ENV=test.
  // Set LLM_ENABLED=true / RAG_ENABLED=true explicitly to opt a run back in.
  const isTest = NODE_ENV === 'test';

  const LLM_PROVIDER_CHAIN: LlmProviderName[] = RESOLVED_LLM_PROVIDER
    ? [
        RESOLVED_LLM_PROVIDER,
        ...(['anthropic', 'gemini', 'openai'] as LlmProviderName[])
          .filter(p => p !== RESOLVED_LLM_PROVIDER && keyFor(p))
      ]
    : [];

  const modelOverride = (process.env.LLM_MODEL || '').trim();
  const modelFor = (p: LlmProviderName): string => {
    const specific = (process.env[`${p.toUpperCase()}_MODEL`] || '').trim();
    if (specific) return specific;
    // The generic override only applies to the primary; applying one model name
    // to every provider in the chain would send e.g. a Gemini id to OpenAI.
    if (modelOverride && p === RESOLVED_LLM_PROVIDER) return modelOverride;
    return DEFAULT_MODELS[p];
  };
  const LLM_MODELS: Record<LlmProviderName, string> = {
    anthropic: modelFor('anthropic'),
    gemini: modelFor('gemini'),
    openai: modelFor('openai')
  };

  const LLM_ENABLED = bool(process.env.LLM_ENABLED, !isTest) && RESOLVED_LLM_PROVIDER !== null;

  const requestedEmbedding = (process.env.EMBEDDING_PROVIDER || '').trim().toLowerCase();
  let EMBEDDING_PROVIDER: EmbeddingProviderName = isTest && !process.env.RAG_ENABLED
    ? 'local'
    : requestedEmbedding === 'gemini' || requestedEmbedding === 'openai' || requestedEmbedding === 'local'
      ? requestedEmbedding
      : GEMINI_API_KEY
        ? 'gemini'
        : OPENAI_API_KEY
          ? 'openai'
          : 'local';

  // Anthropic has no embeddings endpoint, so retrieval needs Gemini, OpenAI, or
  // the built-in local embedder. Never silently require a key that cannot work.
  if ((EMBEDDING_PROVIDER === 'gemini' && !GEMINI_API_KEY) || (EMBEDDING_PROVIDER === 'openai' && !OPENAI_API_KEY)) {
    console.warn(`⚠️ EMBEDDING_PROVIDER "${EMBEDDING_PROVIDER}" has no API key. Using the local embedder instead.`);
    EMBEDDING_PROVIDER = 'local';
  }

  return {
    PORT,
    NODE_ENV,
    DATABASE_URL,
    FRONTEND_URL,
    IS_DATABASE_CONFIGURED: Boolean(DATABASE_URL && !DATABASE_URL.includes('replace_with_real')),

    LLM_PROVIDER,
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
    LLM_MODEL: RESOLVED_LLM_PROVIDER ? LLM_MODELS[RESOLVED_LLM_PROVIDER] : '',
    LLM_PROVIDER_CHAIN,
    LLM_MODELS,
    LLM_TIMEOUT_MS: num(process.env.LLM_TIMEOUT_MS, 9_000),
    // The web client gives up at 15s. Embedding (~0.7s) and the database writes
    // (~1-2s) share that window, so the model chain gets 11s.
    LLM_TOTAL_BUDGET_MS: num(process.env.LLM_TOTAL_BUDGET_MS, 11_000),
    LLM_MAX_RETRIES: num(process.env.LLM_MAX_RETRIES, 1),
    LLM_MAX_OUTPUT_TOKENS: num(process.env.LLM_MAX_OUTPUT_TOKENS, 1600),
    LLM_ENABLED,
    RESOLVED_LLM_PROVIDER,
    IS_LLM_CONFIGURED: RESOLVED_LLM_PROVIDER !== null,

    EMBEDDING_PROVIDER,
    EMBEDDING_MODEL: (process.env.EMBEDDING_MODEL || '').trim() || DEFAULT_EMBEDDING_MODELS[EMBEDDING_PROVIDER],
    RAG_ENABLED: bool(process.env.RAG_ENABLED, !isTest),
    RAG_TOP_K: num(process.env.RAG_TOP_K, 5),
    RAG_MIN_SCORE: num(process.env.RAG_MIN_SCORE, RETRIEVAL_DEFAULTS[EMBEDDING_PROVIDER].minScore),
    RAG_DUPLICATE_THRESHOLD: num(process.env.RAG_DUPLICATE_THRESHOLD, RETRIEVAL_DEFAULTS[EMBEDDING_PROVIDER].duplicate),
    EMBEDDING_CROSS_LANGUAGE: RETRIEVAL_DEFAULTS[EMBEDDING_PROVIDER].crossLanguage
  };
}

export const envConfig = validateAndLoadEnv();
