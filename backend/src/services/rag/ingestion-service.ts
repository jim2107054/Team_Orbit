import { createHash } from 'node:crypto';
import { getDbPool } from '../../db/client.js';
import { llmService } from '../llm/llm-service.js';
import { retrievalService, RagCollection } from './retrieval-service.js';
import { SCAM_CORPUS, CorpusDocument } from './corpus.js';

export interface IngestionReport {
  documents_written: number;
  documents_skipped_unchanged: number;
  chunks_written: number;
  embedding_provider: string;
  embedding_model: string;
  failures: Array<{ doc_id: string; error: string }>;
}

/**
 * Kept small enough that each paragraph is normally its own chunk. That matters
 * here beyond general retrieval hygiene: the typology documents carry their
 * Bangla and Banglish script phrases in a dedicated paragraph, and giving that
 * paragraph its own vector is what lets a Bangla-script query match a document
 * whose surrounding prose is English.
 */
const MAX_CHUNK_CHARS = 500;
const EMBED_BATCH_SIZE = 16;

/**
 * Builds and maintains the embedded retrieval corpus.
 *
 * Ingestion is idempotent: a document whose content hash and embedding model
 * both match what is already stored is skipped, so boot does not re-embed the
 * whole corpus on every restart. Changing the embedding model invalidates the
 * stored vectors, because embeddings from different models are not comparable.
 */
class IngestionService {
  /** Split on blank lines, then pack paragraphs up to the chunk size cap. */
  chunk(content: string): string[] {
    const paragraphs = content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      if (paragraph.length >= MAX_CHUNK_CHARS) {
        if (current) {
          chunks.push(current);
          current = '';
        }
        // A single oversized paragraph is split on sentence boundaries.
        for (const piece of this.splitLong(paragraph)) chunks.push(piece);
        continue;
      }

      if (!current) {
        current = paragraph;
      } else if (current.length + paragraph.length + 2 <= MAX_CHUNK_CHARS) {
        current = `${current}\n\n${paragraph}`;
      } else {
        chunks.push(current);
        current = paragraph;
      }
    }

    if (current) chunks.push(current);
    return chunks.length ? chunks : [content.trim()].filter(Boolean);
  }

  private splitLong(text: string): string[] {
    const sentences = text.split(/(?<=[.!?।])\s+/);
    const out: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if (current.length + sentence.length + 1 <= MAX_CHUNK_CHARS) {
        current = current ? `${current} ${sentence}` : sentence;
      } else {
        if (current) out.push(current);
        current = sentence.slice(0, MAX_CHUNK_CHARS);
      }
    }

    if (current) out.push(current);
    return out;
  }

  /**
   * Chunks for a document: one per language surface in `query_surface` (split
   * on single newlines so the Bangla, Banglish and English phrase lists each
   * get their own vector), followed by the explanatory prose.
   */
  private buildChunks(doc: CorpusDocument): string[] {
    const chunks: string[] = [];

    if (doc.query_surface) {
      for (const line of doc.query_surface.split('\n').map(l => l.trim()).filter(Boolean)) {
        chunks.push(line);
      }
    }

    chunks.push(...this.chunk(doc.content));
    return chunks;
  }

  /** Ingest the built-in corpus. */
  async ingestSeedCorpus(force = false): Promise<IngestionReport> {
    return this.ingestDocuments(SCAM_CORPUS, force);
  }

  async ingestDocuments(documents: CorpusDocument[], force = false): Promise<IngestionReport> {
    const { provider, model } = llmService.embeddingInfo();
    const report: IngestionReport = {
      documents_written: 0,
      documents_skipped_unchanged: 0,
      chunks_written: 0,
      embedding_provider: provider,
      embedding_model: model,
      failures: []
    };

    for (const doc of documents) {
      try {
        // The query surface is part of what gets indexed, so editing it has to
        // invalidate the stored chunks just as editing the prose does.
        const hash = createHash('sha256')
          .update(doc.content)
          .update('\u0000')
          .update(doc.query_surface ?? '')
          .digest('hex');
        if (!force && (await this.isUnchanged(doc.doc_id, hash, model))) {
          report.documents_skipped_unchanged++;
          continue;
        }

        const chunks = this.buildChunks(doc);
        const vectors = await this.embedAll(chunks);

        await this.writeDocument(doc, hash, chunks, vectors, provider, model);
        report.documents_written++;
        report.chunks_written += chunks.length;
      } catch (err: any) {
        report.failures.push({ doc_id: doc.doc_id, error: String(err?.message || err) });
        console.warn(`[RAG] ingestion failed for ${doc.doc_id}: ${err?.message || err}`);
      }
    }

    if (report.documents_written > 0) {
      retrievalService.invalidate();
      await retrievalService.load(true).catch(() => {});
    }

    return report;
  }

  /**
   * Re-embed documents whose stored vectors came from a different embedding
   * model than the one now configured.
   *
   * The seed corpus handles this itself (its hash-and-model check re-embeds on a
   * model change), but live documents such as indexed complaints are not part of
   * the seed list. Without this, switching from the local embedder to a hosted
   * one would leave them with vectors of a different dimension, which retrieval
   * correctly skips — so they would silently stop being found.
   */
  async reembedStaleLiveDocuments(): Promise<{ reembedded: number; failed: number }> {
    const { provider, model } = llmService.embeddingInfo();
    const seedIds = SCAM_CORPUS.map(d => d.doc_id);

    const stale = await getDbPool().query(
      `SELECT d.doc_id, d.collection, d.title, d.source, d.language, d.typology, d.content, d.content_hash
         FROM rag_documents d
        WHERE d.doc_id <> ALL($1::text[])
          AND (
            NOT EXISTS (SELECT 1 FROM rag_chunks c WHERE c.doc_id = d.doc_id)
            OR EXISTS (SELECT 1 FROM rag_chunks c
                        WHERE c.doc_id = d.doc_id AND c.embedding_model IS DISTINCT FROM $2)
          )`,
      [seedIds, model]
    );

    let reembedded = 0;
    let failed = 0;

    for (const row of stale.rows) {
      try {
        const doc: CorpusDocument = {
          doc_id: String(row.doc_id),
          collection: row.collection as RagCollection,
          title: String(row.title),
          source: String(row.source ?? 'live'),
          language: (row.language as CorpusDocument['language']) ?? 'mixed',
          typology: row.typology ?? undefined,
          content: String(row.content)
        };
        const chunks = this.chunk(doc.content);
        const vectors = await this.embedAll(chunks);
        await this.writeDocument(doc, String(row.content_hash), chunks, vectors, provider, model);
        reembedded++;
      } catch (err: any) {
        failed++;
        console.warn(`[RAG] re-embed failed for ${row.doc_id}: ${err?.message || err}`);
      }
    }

    if (reembedded > 0) retrievalService.invalidate();
    return { reembedded, failed };
  }

  /**
   * Upsert a single free-text document, used to index live complaints so later
   * complaints can be matched against them semantically.
   */
  async upsertLiveDocument(params: {
    doc_id: string;
    collection: RagCollection;
    title: string;
    content: string;
    source?: string;
    language?: 'en' | 'bn' | 'mixed';
    typology?: string;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    if (!params.content.trim()) return false;

    const { provider, model } = llmService.embeddingInfo();
    const hash = createHash('sha256').update(params.content).digest('hex');

    try {
      if (await this.isUnchanged(params.doc_id, hash, model)) return false;

      const chunks = this.chunk(params.content);
      const vectors = await this.embedAll(chunks);

      await this.writeDocument(
        {
          doc_id: params.doc_id,
          collection: params.collection,
          title: params.title,
          source: params.source ?? 'live',
          language: params.language ?? 'mixed',
          typology: params.typology,
          content: params.content
        },
        hash,
        chunks,
        vectors,
        provider,
        model,
        params.metadata
      );

      retrievalService.invalidate();
      return true;
    } catch (err: any) {
      console.warn(`[RAG] live document upsert failed for ${params.doc_id}: ${err?.message || err}`);
      return false;
    }
  }

  private async embedAll(chunks: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const result = await llmService.embed(batch);
      if (result.vectors.length !== batch.length) {
        throw new Error('Embedding provider returned a different number of vectors than inputs');
      }
      vectors.push(...result.vectors);
    }
    return vectors;
  }

  private async isUnchanged(docId: string, hash: string, model: string): Promise<boolean> {
    const res = await getDbPool().query(
      `SELECT d.content_hash, COUNT(c.chunk_id)::int AS chunk_count,
              BOOL_AND(c.embedding_model = $2) AS same_model
         FROM rag_documents d
         LEFT JOIN rag_chunks c ON c.doc_id = d.doc_id
        WHERE d.doc_id = $1
        GROUP BY d.content_hash`,
      [docId, model]
    );

    const row = res.rows[0];
    if (!row) return false;
    return row.content_hash === hash && row.chunk_count > 0 && row.same_model === true;
  }

  private async writeDocument(
    doc: CorpusDocument,
    hash: string,
    chunks: string[],
    vectors: number[][],
    provider: string,
    model: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO rag_documents
           (doc_id, collection, title, source, language, typology, content, metadata_json, content_hash, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (doc_id) DO UPDATE SET
           collection = EXCLUDED.collection,
           title = EXCLUDED.title,
           source = EXCLUDED.source,
           language = EXCLUDED.language,
           typology = EXCLUDED.typology,
           content = EXCLUDED.content,
           metadata_json = EXCLUDED.metadata_json,
           content_hash = EXCLUDED.content_hash,
           updated_at = NOW()`,
        [
          doc.doc_id,
          doc.collection,
          doc.title,
          doc.source,
          doc.language,
          doc.typology ?? null,
          doc.content,
          JSON.stringify(metadata ?? {}),
          hash
        ]
      );

      // Replace chunks wholesale: re-chunking can change their number, so
      // leaving stale rows behind would keep retired text retrievable.
      await client.query('DELETE FROM rag_chunks WHERE doc_id = $1', [doc.doc_id]);

      for (const [index, content] of chunks.entries()) {
        const vector = vectors[index] ?? [];
        await client.query(
          `INSERT INTO rag_chunks
             (chunk_id, doc_id, collection, chunk_index, content, token_estimate,
              embedding_json, embedding_dim, embedding_model, embedding_provider)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            `${doc.doc_id}::${index}`,
            doc.doc_id,
            doc.collection,
            index,
            content,
            Math.ceil(content.length / 4),
            JSON.stringify(vector),
            vector.length,
            model,
            provider
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async stats(): Promise<{
    documents: number;
    chunks: number;
    embedded_chunks: number;
    by_collection: Record<string, number>;
    models: string[];
  }> {
    const pool = getDbPool();
    const [docs, chunks, byCollection, models] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM rag_documents'),
      pool.query(
        'SELECT COUNT(*)::int AS n, COUNT(embedding_json)::int AS embedded FROM rag_chunks'
      ),
      pool.query('SELECT collection, COUNT(*)::int AS n FROM rag_chunks GROUP BY collection'),
      pool.query(
        'SELECT DISTINCT embedding_model FROM rag_chunks WHERE embedding_model IS NOT NULL'
      )
    ]);

    const by_collection: Record<string, number> = {};
    for (const row of byCollection.rows) by_collection[String(row.collection)] = row.n;

    return {
      documents: docs.rows[0]?.n ?? 0,
      chunks: chunks.rows[0]?.n ?? 0,
      embedded_chunks: chunks.rows[0]?.embedded ?? 0,
      by_collection,
      models: models.rows.map(r => String(r.embedding_model))
    };
  }
}

export const ingestionService = new IngestionService();
