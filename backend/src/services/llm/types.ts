import { LlmProviderName } from '../../core/env.js';

/** A single chat turn. System guidance is passed separately, not as a turn. */
export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionRequest {
  /** Short task name, used for observability and per-task budgets. */
  task: string;
  system: string;
  messages: LlmMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Ask the provider for a JSON-only reply where it supports that natively. */
  jsonMode?: boolean;
  /** Correlates the invocation row with a complaint/case/investigation id. */
  targetId?: string;
}

export interface LlmCompletionResult {
  text: string;
  provider: LlmProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface LlmProvider {
  readonly name: LlmProviderName;
  readonly model: string;
  complete(request: LlmCompletionRequest, signal: AbortSignal): Promise<LlmCompletionResult>;
}

export interface EmbeddingResult {
  vectors: number[][];
  model: string;
  provider: string;
  dimension: number;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  embed(texts: string[]): Promise<EmbeddingResult>;
}

/** Raised when a provider responds but the response is unusable. */
export class LlmProviderError extends Error {
  constructor(message: string, readonly status?: number, readonly retryable: boolean = false) {
    super(message);
    this.name = 'LlmProviderError';
  }
}
