import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { incidentInvestigationService } from '../../services/investigation/incident-investigation-service.js';
import { claimExtractor } from '../../services/investigation/claim-extractor.js';
import { responseSafetyValidator } from '../../services/investigation/response-safety-validator.js';
import { investigationMetrics } from '../../services/investigation/investigation-metrics.js';
import { copilotService } from '../../services/copilot-service.js';
import { complaintActionIntelligenceService } from '../../services/complaint-action-intelligence.js';
import { repository } from '../../db/repository.js';
import { listCache, invalidateCache } from '../middleware/index.js';

export const investigationsRouter = Router();

/**
 * Evidence-Driven Scam Incident Investigation API.
 *
 * Follows the existing conventions in this codebase: `/v1` prefix applied by the
 * router index, `{ success, message, ... }` envelope, `error: { code, details }`
 * on failure, zod validation on write endpoints.
 */

const analyzeSchema = z.object({
  complaint: z.string().min(1, 'complaint text is required').max(8000),
  case_id: z.string().max(64).optional(),
  complaint_id: z.string().max(64).optional(),
  reporter_wallet: z.string().max(64).optional(),
  reporter_phone: z.string().max(32).optional(),
  reported_at: z.string().max(40).optional(),
  analyst_id: z.string().max(64).optional(),
  language: z.string().max(16).optional(),
  context: z.record(z.unknown()).optional(),
  persist: z.boolean().optional()
});

const reviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'START_REVIEW']),
  reviewed_by: z.string().max(64).optional(),
  notes: z.string().max(4000).optional(),
  final_decision: z.string().max(200).optional()
});

// ─── 1. Run an investigation ────────────────────────────────────────────────
investigationsRouter.post('/investigations/analyze', async (req: Request, res: Response) => {
  try {
    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid investigation payload schema',
        error: { code: 'INVALID_PAYLOAD', details: parsed.error.format() }
      });
    }

    const investigation = await incidentInvestigationService.investigate({
      complaint: parsed.data.complaint,
      case_id: parsed.data.case_id,
      complaint_id: parsed.data.complaint_id,
      reporter_wallet: parsed.data.reporter_wallet,
      reporter_phone: parsed.data.reporter_phone,
      reported_at: parsed.data.reported_at,
      analyst_id: parsed.data.analyst_id,
      context: parsed.data.context,
      persist: parsed.data.persist
    });

    invalidateCache('/investigations');

    return res.status(200).json({
      success: true,
      message:
        `Investigation complete: evidence verdict ${investigation.evidence.verdict}` +
        (investigation.evidence.relevant_transaction_id
          ? ` on transaction ${investigation.evidence.relevant_transaction_id}`
          : ' with no specific transaction identified') +
        (investigation.human_review.required ? ' — human review required' : ''),
      investigation
    });
  } catch (err: any) {
    console.error('[investigations] analyze failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete incident investigation',
      error: { code: 'INVESTIGATION_FAILED', details: err.message }
    });
  }
});

// ─── 2. Investigate an already-ingested complaint ───────────────────────────
investigationsRouter.post('/complaints/:id/investigate', async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const complaint = complaintActionIntelligenceService.getComplaintById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: `Complaint ${complaintId} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }

    const investigation = await incidentInvestigationService.investigate({
      complaint: complaint.raw_text,
      complaint_id: complaint.complaint_id,
      case_id: complaint.linked_case_id,
      reporter_wallet: complaint.reporter_wallet,
      reporter_phone: complaint.reporter_phone,
      reported_at: complaint.created_at,
      analyst_id: (req.body?.analyst_id as string) || 'ANALYST-101'
    });

    invalidateCache('/investigations');

    return res.status(200).json({
      success: true,
      message: `Complaint ${complaintId} investigated: evidence verdict ${investigation.evidence.verdict}`,
      complaint_id: complaintId,
      investigation
    });
  } catch (err: any) {
    console.error('[investigations] complaint investigation failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to investigate complaint',
      error: { code: 'COMPLAINT_INVESTIGATION_FAILED', details: err.message }
    });
  }
});

// ─── 3. Claim extraction only (dry run, no persistence, no side effects) ────
investigationsRouter.post('/investigations/extract-claim', (req: Request, res: Response) => {
  try {
    const { complaint, reported_at, reporter_wallet, reporter_phone } = req.body || {};
    if (!complaint || typeof complaint !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field complaint is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const claim = claimExtractor.extract(complaint, {
      reportedAt: reported_at,
      reporterWallet: reporter_wallet,
      reporterPhone: reporter_phone
    });

    return res.status(200).json({
      success: true,
      message: `Claim extracted (${claim.language}); ${claim.discriminators_present.length} verifiable discriminator(s) found`,
      claim
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to extract claim from complaint text',
      error: { code: 'CLAIM_EXTRACTION_FAILED', details: err.message }
    });
  }
});

// ─── 4. Observability snapshot ──────────────────────────────────────────────
investigationsRouter.get('/investigations/metrics', async (_req: Request, res: Response) => {
  try {
    const live = investigationMetrics.snapshot();
    let persisted: Awaited<ReturnType<typeof repository.getInvestigationAggregates>> | null = null;
    let persistedError: string | undefined;
    try {
      persisted = await repository.getInvestigationAggregates();
    } catch (err: any) {
      persistedError = err.message;
    }

    return res.status(200).json({
      success: true,
      message: 'Investigation metrics retrieved',
      process_metrics: live,
      persisted_metrics: persisted,
      persisted_metrics_error: persistedError
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve investigation metrics',
      error: { code: 'INVESTIGATION_METRICS_FAILED', details: err.message }
    });
  }
});

// ─── 5. Validate an arbitrary customer-facing draft ─────────────────────────
investigationsRouter.post('/investigations/validate-response', (req: Request, res: Response) => {
  try {
    const { text, fragments } = req.body || {};
    const inputs: string[] = Array.isArray(fragments)
      ? fragments.filter((f: unknown) => typeof f === 'string')
      : typeof text === 'string'
        ? [text]
        : [];

    if (inputs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide text or fragments to validate',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const report = responseSafetyValidator.validate(inputs);
    return res.status(200).json({
      success: true,
      message: report.passed
        ? 'Draft passed all response safety checks'
        : `Draft REJECTED by response safety validator: ${report.violations.map(v => v.code).join(', ')}`,
      report
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate customer response draft',
      error: { code: 'RESPONSE_VALIDATION_FAILED', details: err.message }
    });
  }
});

// Cache the investigation list for 30s, consistent with other list endpoints.
investigationsRouter.get('/investigations', listCache);

// ─── 6. List investigations ─────────────────────────────────────────────────
investigationsRouter.get('/investigations', async (req: Request, res: Response) => {
  try {
    const { verdict, human_review, review_status, case_id, complaint_id, limit } = req.query;
    const investigations = await repository.listIncidentInvestigations({
      limit: limit ? Number(limit) : 25,
      verdict: verdict && verdict !== 'ALL' ? String(verdict) : undefined,
      humanReviewRequired: human_review === undefined ? undefined : human_review === 'true',
      reviewStatus: review_status && review_status !== 'ALL' ? String(review_status) : undefined,
      caseId: case_id ? String(case_id) : undefined,
      complaintId: complaint_id ? String(complaint_id) : undefined
    });

    return res.status(200).json({
      success: true,
      message: `Retrieved ${investigations.length} incident investigation(s)`,
      count: investigations.length,
      investigations
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve incident investigations',
      error: { code: 'LIST_INVESTIGATIONS_FAILED', details: err.message }
    });
  }
});

// ─── 7. Fetch a single investigation ────────────────────────────────────────
investigationsRouter.get('/investigations/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const investigation = await repository.getIncidentInvestigationById(id);
    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: `Investigation ${id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Investigation ${id} retrieved`,
      investigation
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve investigation',
      error: { code: 'GET_INVESTIGATION_FAILED', details: err.message }
    });
  }
});

// ─── 8. Copilot brief for an investigation ──────────────────────────────────
investigationsRouter.post('/investigations/:id/copilot', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const investigation = await repository.getIncidentInvestigationById(id);
    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: `Investigation ${id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }

    const lang = req.body?.language === 'bn' ? 'bn' : 'en';
    const brief = copilotService.generateIncidentInvestigationBrief(investigation, lang);

    return res.status(200).json({
      success: true,
      message: `Investigator Copilot brief generated (${brief.verified_claims}/${brief.total_claims} statements evidence-verified)`,
      brief
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate investigation copilot brief',
      error: { code: 'INVESTIGATION_COPILOT_FAILED', details: err.message }
    });
  }
});

// ─── 9. Record a human review decision ─────────────────────────────────────
investigationsRouter.post('/investigations/:id/review', async (req: Request, res: Response) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review payload schema',
        error: { code: 'INVALID_PAYLOAD', details: parsed.error.format() }
      });
    }

    const id = req.params.id as string;
    const statusMap = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      START_REVIEW: 'UNDER_REVIEW'
    } as const;

    const updated = await incidentInvestigationService.recordReviewDecision(id, {
      review_status: statusMap[parsed.data.decision],
      reviewed_by: parsed.data.reviewed_by || 'ANALYST-101',
      review_notes: parsed.data.notes,
      final_decision: parsed.data.final_decision
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Investigation ${id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }

    invalidateCache('/investigations');

    return res.status(200).json({
      success: true,
      message: `Investigation ${id} marked ${updated.review_status} and recorded in the hash-chained audit log`,
      investigation: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record investigation review decision',
      error: { code: 'INVESTIGATION_REVIEW_FAILED', details: err.message }
    });
  }
});
