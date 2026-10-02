import { envConfig } from '../../core/env.js';
import { getDbPool } from '../../db/client.js';
import { llmService } from '../llm/llm-service.js';

/**
 * Retrieval over the scam-intelligence corpus.
 *
 * Chunks and their embeddings live in Postgres (rag_chunks). Because the corpus
 * is small — hundreds to low thousands of chunks — the whole embedded set is
 * held in memory and scored with cosine similarity in process, which is
 * sub-millisecond and keeps the store independent of any vector extension.
 * pgvector with an HNSW index is the scale-up path if the corpus grows by
 * orders of magnitude.
 */

export type RagCollection =
  | 'scam_typology'
  | 'customer_advisory'
  | 'policy'
  | 'historical_case'
  | 'complaint_history';

export interface RetrievedChunk {
  chunk_id: string;
  doc_id: string;
  collection: string;
  title: string;
  content: string;
  score: number;
}

interface CachedChunk {
  chunk_id: string;
  doc_id: string;
  collection: string;
  title: string;
  content: string;
  embedding: number[];
  model: string;
}

export interface RetrievalOptions {
  collections?: RagCollection[];
  topK?: number;
  minScore?: number;
  /** Exclude a document, e.g. the complaint being compared against others. */
  excludeDocIds?: string[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

class RetrievalService {
  private cache: CachedChunk[] = [];
  private loaded = false;
  private loading: Promise<void> | null = null;

  isEnabled(): boolean {
    return envConfig.RAG_ENABLED;
  }

  /** Load (or reload) the embedded corpus into memory. */
  async load(force = false): Promise<void> {
    if (this.loaded && !force) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const res = await getDbPool().query(
        `SELECT c.chunk_id, c.doc_id, c.collection, c.content, c.embedding_json, c.embedding_model,
                d.title
           FROM rag_chunks c
           JOIN rag_documents d ON d.doc_id = c.doc_id
          WHERE c.embedding_json IS NOT NULL`
      );

      this.cache = res.rows.map(row => ({
        chunk_id: String(row.chunk_id),
        doc_id: String(row.doc_id),
        collection: String(row.collection),
        title: String(row.title ?? ''),
        content: String(row.content ?? ''),
        embedding: Array.isArray(row.embedding_json)
          ? (row.embedding_json as number[])
          : JSON.parse(String(row.embedding_json)),
        model: String(row.embedding_model ?? '')
      }));

      this.loaded = true;
    })();

    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  invalidate(): void {
    this.loaded = false;
    this.cache = [];
  }

  stats(): { loaded: boolean; chunk_count: number; collections: Record<string, number>; models: string[] } {
    const collections: Record<string, number> = {};
    const models = new Set<string>();
    for (const chunk of this.cache) {
      collections[chunk.collection] = (collections[chunk.collection] ?? 0) + 1;
      if (chunk.model) models.add(chunk.model);
    }
    return {
      loaded: this.loaded,
      chunk_count: this.cache.length,
      collections,
      models: Array.from(models)
    };
  }

  /**
   * Embed the query and return the closest chunks.
   *
   * Returns an empty array rather than throwing when retrieval is off, the
   * corpus is empty, or embedding fails — callers treat retrieved context as an
   * enhancement, never a requirement.
   */
  async retrieve(query: string, options: RetrievalOptions = {}): Promise<RetrievedChunk[]> {
    if (!this.isEnabled() || !query.trim()) return [];

    try {
      await this.load();
    } catch (err: any) {
      console.warn(`[RAG] corpus load failed: ${err?.message || err}`);
      return [];
    }

    if (!this.cache.length) return [];

    const topK = options.topK ?? envConfig.RAG_TOP_K;
    const minScore = options.minScore ?? envConfig.RAG_MIN_SCORE;
    const allowed = options.collections ? new Set<string>(options.collections) : null;
    const excluded = options.excludeDocIds ? new Set(options.excludeDocIds) : null;

    let queryVector: number[];
    try {
      const embedded = await llmService.embed([query]);
      queryVector = embedded.vectors[0] ?? [];
    } catch (err: any) {
      console.warn(`[RAG] query embedding failed: ${err?.message || err}`);
      return [];
    }

    if (!queryVector.length) return [];

    const scored: RetrievedChunk[] = [];
    for (const chunk of this.cache) {
      if (allowed && !allowed.has(chunk.collection)) continue;
      if (excluded?.has(chunk.doc_id)) continue;
      // Embeddings from different models are not comparable.
      if (chunk.embedding.length !== queryVector.length) continue;

      const score = cosineSimilarity(queryVector, chunk.embedding);
      if (score < minScore) continue;

      scored.push({
        chunk_id: chunk.chunk_id,
        doc_id: chunk.doc_id,
        collection: chunk.collection,
        title: chunk.title,
        content: chunk.content,
        score: Number(score.toFixed(4))
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Score above which two texts are treated as the same scam report. A property
   * of the embedding space, so it is chosen per provider in env.ts from measured
   * score distributions rather than being one universal constant.
   */
  nearDuplicateThreshold(): number {
    return envConfig.RAG_DUPLICATE_THRESHOLD;
  }

  /**
   * True only for embedders measured to place a Bangla report and an English
   * report of the same incident close together. OpenAI's models were measured
   * and are not.
   */
  crossLanguageCapable(): boolean {
    return envConfig.EMBEDDING_CROSS_LANGUAGE;
  }

  /** Similarity between two free-text strings, for clustering comparisons. */
  async similarity(a: string, b: string): Promise<number> {
    try {
      const { vectors } = await llmService.embed([a, b]);
      if (vectors.length < 2) return 0;
      return Number(cosineSimilarity(vectors[0], vectors[1]).toFixed(4));
    } catch (err: any) {
      console.warn(`[RAG] pairwise similarity failed: ${err?.message || err}`);
      return 0;
    }
  }
}

export const retrievalService = new RetrievalService();
