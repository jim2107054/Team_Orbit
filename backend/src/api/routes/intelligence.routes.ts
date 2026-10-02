import { Router, Request, Response } from 'express';
import { getDbPool } from '../../db/client.js';
import { llmService } from '../../services/llm/llm-service.js';
import { retrievalService, RagCollection } from '../../services/rag/retrieval-service.js';
import { ingestionService } from '../../services/rag/ingestion-service.js';
import { envConfig } from '../../core/env.js';

export const intelligenceRouter = Router();

const VALID_COLLECTIONS: RagCollection[] = [
  'scam_typology',
  'customer_advisory',
  'policy',
  'historical_case',
  'complaint_history'
];

/**
 * Current model and retrieval configuration. Reports which provider is actually
 * live rather than which one was requested, so a missing key is visible.
 */
intelligenceRouter.get('/intelligence/config', (_req: Request, res: Response) => {
  const llm = llmService.describe();
  return res.status(200).json({
    success: true,
    message: llm.enabled
      ? `Language model active: ${llm.chain.map(c => `${c.provider} (${c.model})`).join(' -> ')}`
      : 'No language model configured — deterministic rule engines are running alone',
    llm: {
      ...llm,
      requested_provider: envConfig.LLM_PROVIDER,
      timeout_ms: envConfig.LLM_TIMEOUT_MS,
      max_retries: envConfig.LLM_MAX_RETRIES,
      keys_present: {
        anthropic: Boolean(envConfig.ANTHROPIC_API_KEY),
        gemini: Boolean(envConfig.GEMINI_API_KEY),
        openai: Boolean(envConfig.OPENAI_API_KEY)
      }
    },
    retrieval: {
      enabled: envConfig.RAG_ENABLED,
      top_k: envConfig.RAG_TOP_K,
      min_score: envConfig.RAG_MIN_SCORE,
      cache: retrievalService.stats()
    },
    timestamp: new Date().toISOString()
  });
});

/** Corpus size and embedding coverage. */
intelligenceRouter.get('/intelligence/rag/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await ingestionService.stats();
    return res.status(200).json({
      success: true,
      message: `Retrieval corpus holds ${stats.documents} documents across ${stats.chunks} chunks`,
      corpus: stats,
      cache: retrievalService.stats(),
      embedding: llmService.embeddingInfo(),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to read retrieval corpus statistics',
      error: { code: 'RAG_STATS_FAILED', details: err.message }
    });
  }
});

/** Build or rebuild the embedded corpus. `force` re-embeds unchanged documents. */
intelligenceRouter.post('/intelligence/rag/ingest', async (req: Request, res: Response) => {
  try {
    const force = req.body?.force === true;
    const report = await ingestionService.ingestSeedCorpus(force);
    return res.status(report.failures.length ? 207 : 200).json({
      success: report.failures.length === 0,
      message: `Ingested ${report.documents_written} documents (${report.chunks_written} chunks), skipped ${report.documents_skipped_unchanged} unchanged`,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Corpus ingestion failed',
      error: { code: 'RAG_INGEST_FAILED', details: err.message }
    });
  }
});

/**
 * Run a retrieval query directly. This is the endpoint that demonstrates the
 * retrieval half of RAG in isolation, separately from any generation.
 */
intelligenceRouter.post('/intelligence/rag/search', async (req: Request, res: Response) => {
  try {
    const { query, collections, top_k, min_score } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field query is required and must be a string',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const requested = Array.isArray(collections)
      ? collections.filter((c: unknown): c is RagCollection =>
          VALID_COLLECTIONS.includes(c as RagCollection))
      : undefined;

    const results = await retrievalService.retrieve(query, {
      collections: requested?.length ? requested : undefined,
      topK: typeof top_k === 'number' ? top_k : undefined,
      minScore: typeof min_score === 'number' ? min_score : undefined
    });

    return res.status(200).json({
      success: true,
      message: `Retrieved ${results.length} matching chunks`,
      query,
      embedding: llmService.embeddingInfo(),
      count: results.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Retrieval query failed',
      error: { code: 'RAG_SEARCH_FAILED', details: err.message }
    });
  }
});

/**
 * Recent model invocations: which provider served each call, how long it took,
 * and whether it fell back to the rule engine. This is how the hybrid behaviour
 * is audited rather than assumed.
 */
intelligenceRouter.get('/intelligence/llm/invocations', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const task = typeof req.query.task === 'string' ? req.query.task : null;

    const result = task
      ? await getDbPool().query(
          `SELECT * FROM llm_invocations WHERE task = $1 ORDER BY created_at DESC LIMIT $2`,
          [task, limit]
        )
      : await getDbPool().query(
          `SELECT * FROM llm_invocations ORDER BY created_at DESC LIMIT $1`,
          [limit]
        );

    const summary = await getDbPool().query(
      `SELECT task,
              COUNT(*)::int AS total,
              SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END)::int AS succeeded,
              SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::int AS fell_back,
              ROUND(AVG(latency_ms)::numeric, 1) AS avg_latency_ms
         FROM llm_invocations
        GROUP BY task
        ORDER BY total DESC`
    );

    return res.status(200).json({
      success: true,
      message: `Retrieved ${result.rows.length} model invocations`,
      count: result.rows.length,
      invocations: result.rows,
      by_task: summary.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to read model invocation log',
      error: { code: 'LLM_INVOCATIONS_FAILED', details: err.message }
    });
  }
});
