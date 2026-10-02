import { Router, Request, Response } from 'express';
import { recoveryRouteOptimizer } from '../../services/recovery-route-optimizer.js';
import { copilotService } from '../../services/copilot-service.js';
import { auditService } from '../../services/audit-service.js';

export const recoveryRouteRouter = Router();

// ================= RECOVERY ROUTE OPTIMIZER (PROMPT 11) =================

// 1. Get current Recovery Route Plan for a case
recoveryRouteRouter.get('/cases/:id/recovery-route', (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const scenario = (req.query.scenario as any) || undefined;
    const remainingMin = req.query.golden_hour_remaining ? Number(req.query.golden_hour_remaining) : undefined;
    const amount = req.query.amount ? Number(req.query.amount) : undefined;

    const plan = recoveryRouteOptimizer.generateRecoveryRoute(caseId, undefined, {
      scenarioId: scenario,
      goldenHourRemainingMin: remainingMin,
      disputedAmountBdt: amount
    });

    return res.status(200).json({
      success: true,
      message: `Optimized recovery plan generated for case ${caseId}`,
      plan
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recovery route plan',
      error: { code: 'RECOVERY_ROUTE_FAILED', details: err.message }
    });
  }
});

// 2. Generate / Re-optimize Recovery Route with custom parameters
recoveryRouteRouter.post('/cases/:id/recovery-route/optimize', (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const { scenario_id, golden_hour_remaining_min, disputed_amount_bdt, transaction_id } = req.body;

    const plan = recoveryRouteOptimizer.generateRecoveryRoute(caseId, transaction_id, {
      scenarioId: scenario_id,
      goldenHourRemainingMin: golden_hour_remaining_min,
      disputedAmountBdt: disputed_amount_bdt
    });

    return res.status(200).json({
      success: true,
      message: `Recovery route re-optimized with expected recovery rate of ${plan.overall_recovery_probability_pct}%`,
      plan
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to re-optimize recovery route',
      error: { code: 'RECOVERY_OPTIMIZE_FAILED', details: err.message }
    });
  }
});

// 3. Update recovery action status (Mark Reviewed, Skip, Escalate) & prevent duplicates
recoveryRouteRouter.post('/cases/:id/recovery-route/actions/:actionId', async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const actionId = req.params.actionId;
    const { status, notes, analyst_id } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = recoveryRouteOptimizer.updateActionStatus(
      caseId,
      actionId,
      status,
      notes,
      analyst_id || 'ANALYST-101'
    );

    await auditService.logAction(
      analyst_id || 'ANALYST-101',
      `RECOVERY_ACTION_${status}`,
      `${caseId}:${actionId}`,
      { status, notes }
    );

    return res.status(200).json({
      success: true,
      message: result.message || `Recovery action marked as ${status}`,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update recovery action status',
      error: { code: 'ACTION_UPDATE_FAILED', details: err.message }
    });
  }
});

// 4. Get chronological recovery timeline events
recoveryRouteRouter.get('/cases/:id/recovery-timeline', (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const events = recoveryRouteOptimizer.getRecoveryTimeline(caseId);
    return res.status(200).json({
      success: true,
      message: `Retrieved ${events.length} recovery timeline events`,
      count: events.length,
      timeline: events
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recovery timeline',
      error: { code: 'TIMELINE_FETCH_FAILED', details: err.message }
    });
  }
});

// 5. Copilot Recovery Query Endpoint
recoveryRouteRouter.post('/copilot/recovery-query', (req: Request, res: Response) => {
  try {
    const { case_id, question, language } = req.body;
    if (!case_id || !question) {
      return res.status(400).json({
        success: false,
        message: 'case_id and question are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = copilotService.queryRecoveryCopilot(case_id, question, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Recovery Copilot answered successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Recovery Copilot query failed',
      error: { code: 'COPILOT_RECOVERY_ERROR', details: err.message }
    });
  }
});
