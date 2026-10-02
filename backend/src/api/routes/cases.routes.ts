import { Router, Request, Response } from 'express';
import { repository } from '../../db/repository.js';
import { copilotService } from '../../services/copilot-service.js';
import { recoveryTracer } from '../../services/recovery-tracer.js';
import { auditService } from '../../services/audit-service.js';
import { AlertCase } from '../../core/types.js';
import { listCache, invalidateCache } from '../middleware/index.js';

export const casesRouter = Router();

// Cache the alerts list for 30s
casesRouter.get('/alerts', listCache);

// ================= API-06 & API-07: ALERTS & CASES =================
casesRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const cases = await repository.getAllAlertCases();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${cases.length} alert cases`,
      count: cases.length,
      cases
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alert cases',
      error: { code: 'GET_ALERTS_FAILED', details: err.message }
    });
  }
});

casesRouter.get('/cases/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const c = await repository.getCaseById(id);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case ${id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Case ${id} details retrieved`,
      case: c
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve case details',
      error: { code: 'GET_CASE_FAILED', details: err.message }
    });
  }
});

casesRouter.post('/cases/:id/actions', async (req: Request, res: Response) => {
  try {
    const { action, analyst_id, notes, second_analyst_id } = req.body;
    const caseId = req.params.id as string;
    const c = await repository.getCaseById(caseId);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case ${caseId} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }

    const updates: Partial<AlertCase> = {
      analyst_id: analyst_id || 'ANALYST-101',
      analyst_notes: notes
    };

    if (action === 'CONFIRM_FRAUD') {
      updates.status = 'CONFIRMED_FRAUD';
    } else if (action === 'MARK_FALSE_POSITIVE') {
      updates.status = 'FALSE_POSITIVE';
    } else if (action === 'APPROVE_FOUR_EYES') {
      updates.four_eyes_approved = true;
      updates.second_analyst_id = second_analyst_id || 'ANALYST-MLRO-99';
    }

    await repository.updateCase(caseId, updates);
    invalidateCache('/alerts');  // Bust the alerts list cache on any case mutation
    await auditService.logAction(analyst_id || 'ANALYST-101', `CASE_ACTION_${action}`, caseId, { updates });

    return res.status(200).json({
      success: true,
      message: `Case ${caseId} updated with status ${updates.status || action}`,
      case_id: caseId,
      status: updates.status
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to execute action on case',
      error: { code: 'ACTION_FAILED', details: err.message }
    });
  }
});

// ================= API-09: COPILOT CASE NARRATIVE =================
casesRouter.post('/cases/:id/copilot', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const c = await repository.getCaseById(id);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case ${id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    
    const lang = (req.body.language === 'bn' ? 'bn' : 'en');
    const brief = copilotService.generateCaseBrief(c, lang);

    await repository.updateCase(c.case_id, { copilot_brief: brief });
    return res.status(200).json({
      success: true,
      message: 'AI Copilot case brief generated successfully',
      brief
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate copilot case brief',
      error: { code: 'COPILOT_BRIEF_FAILED', details: err.message }
    });
  }
});

// ================= API-10: GOLDEN-HOUR RECOVERY TRACE =================
casesRouter.post('/cases/:id/trace', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const c = await repository.getCaseById(id);
    const amount = c ? c.amount_bdt : 18500;
    const victimWallet = c ? c.sender_wallet : 'W-SYN-004512';

    const trace = recoveryTracer.traceMoneyFlow(victimWallet, amount);
    return res.status(200).json({
      success: true,
      message: 'Golden-hour recovery flow traced successfully',
      ...trace
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recovery trace',
      error: { code: 'TRACE_FAILED', details: err.message }
    });
  }
});
