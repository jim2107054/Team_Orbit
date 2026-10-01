import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { repository } from '../../db/repository.js';
import { featureStore } from '../../services/feature-store.js';
import { riskEngine } from '../../services/risk-engine.js';
import { scamNLP } from '../../services/scam-nlp.js';
import { copilotService } from '../../services/copilot-service.js';
import { recoveryTracer } from '../../services/recovery-tracer.js';
import { simulatorService } from '../../services/simulator-service.js';
import { monitoringService } from '../../services/monitoring-service.js';
import { agentGuard } from '../../services/agent-guard.js';
import { auditService } from '../../services/audit-service.js';
import { BANGLA_TEMPLATES } from '../../core/constants.js';
import { AlertCase } from '../../core/types.js';

export const shieldRouter = Router();

// ================= API-01: SCORE TRANSACTION =================
const scoreTxnSchema = z.object({
  request_id: z.string().optional(),
  idempotency_key: z.string().optional(),
  timestamp: z.string().optional(),
  txn: z.object({
    type: z.enum(['P2P_SEND', 'CASH_IN', 'CASH_OUT', 'MERCHANT_PAY', 'BILL_PAY', 'MOBILE_RECHARGE']),
    sender_wallet: z.string(),
    receiver_wallet: z.string(),
    amount_bdt: z.number().positive(),
    channel: z.enum(['APP', 'USSD', 'AGENT_PORTAL']).default('APP'),
    device_id: z.string()
  }),
  context: z.object({
    scamcheck_session_flag: z.boolean().default(false),
    customer_answers: z.any().optional()
  }).optional()
});

shieldRouter.post('/score/transaction', async (req: Request, res: Response) => {
  try {
    const parseRes = scoreTxnSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', details: parseRes.error.format() } });
    }

    const { request_id, txn, context, timestamp } = parseRes.data;
    const reqId = request_id || `req-${Math.random().toString(36).slice(2, 8)}`;
    const txnTs = timestamp || new Date().toISOString();

    // 1. Point-in-time Feature Extraction (M2)
    const features = await featureStore.extractFeatures(
      txn.sender_wallet,
      txn.receiver_wallet,
      txn.amount_bdt,
      txn.device_id,
      txnTs,
      context?.scamcheck_session_flag || false
    );

    // 2. Multi-Model Risk Evaluation (M3, M4)
    const ringProximityRisk = txn.receiver_wallet.includes('091177') ? 0.90 : 0.05;
    const evaluation = riskEngine.evaluateRisk(features, ringProximityRisk);

    // 3. Customer Bangla/English Message Template Mapping (M5)
    let customerTemplate = BANGLA_TEMPLATES.PV_01_NEW_RECIPIENT;
    if (evaluation.risk_tier === 'T3') {
      customerTemplate = BANGLA_TEMPLATES.PV_05_HOLD;
    } else if (features.recipient_report_count > 0) {
      customerTemplate = BANGLA_TEMPLATES.PV_02_REPORTED;
    } else if (features.is_night_time && features.amount_zscore_user > 2) {
      customerTemplate = BANGLA_TEMPLATES.PV_03_EMERGENCY;
    }

    // 4. Case Creation if High/Elevated Risk (M11)
    let analystCaseId: string | undefined;
    if (evaluation.risk_tier === 'T2' || evaluation.risk_tier === 'T3') {
      analystCaseId = `CASE-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const newCase: AlertCase = {
        case_id: analystCaseId,
        txn_id: `TXN-${Date.now()}`,
        sender_wallet: txn.sender_wallet,
        receiver_wallet: txn.receiver_wallet,
        amount_bdt: txn.amount_bdt,
        risk_score: evaluation.risk_score,
        risk_tier: evaluation.risk_tier,
        action_recommended: evaluation.action_recommended,
        reasons: evaluation.reasons,
        rule_trace: evaluation.rule_trace,
        status: 'NEW',
        four_eyes_required: evaluation.risk_tier === 'T3',
        created_at: txnTs,
        updated_at: txnTs
      };
      await repository.insertAlertCase(newCase);
    }

    // 5. Audit Logging (M17)
    await auditService.logAction('RISK_API', 'SCORE_TXN', reqId, {
      score: evaluation.risk_score,
      tier: evaluation.risk_tier,
      action: evaluation.action_recommended
    });

    return res.json({
      request_id: reqId,
      risk_score: evaluation.risk_score,
      risk_tier: evaluation.risk_tier,
      action: evaluation.action_recommended,
      reasons: evaluation.reasons,
      rule_trace: evaluation.rule_trace,
      customer_message: {
        template_id: customerTemplate.id,
        headline_bn: customerTemplate.headline_bn,
        headline_en: customerTemplate.headline_en,
        body_bn: customerTemplate.body_bn,
        body_en: customerTemplate.body_en,
        cooling_off_seconds: evaluation.risk_tier === 'T2' ? 25 : 0
      },
      analyst_case_id: analystCaseId,
      model_scores: evaluation.model_scores,
      versions: {
        model: evaluation.model_version,
        rules: evaluation.rules_version
      },
      latency_ms: evaluation.latency_ms
    });
  } catch (err: any) {
    console.error('Error scoring transaction:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ================= API-03: SCAM CHECK & CONVERSATIONAL INTELLIGENCE =================
shieldRouter.post('/scamcheck', async (req: Request, res: Response) => {
  try {
    const { text, conversation } = req.body;
    const rawInput = conversation || text;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: { code: 'MISSING_TEXT', message: 'Field text or conversation is required' } });
    }
    const result = await scamNLP.analyze(rawInput);

    await auditService.logAction('SCAM_INTEL', 'ANALYZE_CONVERSATION', `SCAM-${Date.now()}`, {
      verdict: result.verdict,
      typology: result.typology_matched,
      extracted_entities: result.conversation_risk_profile?.extracted_entities
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Scam Check Error:', err);
    return res.status(500).json({ error: { code: 'SCAM_CHECK_FAILED', message: err.message } });
  }
});

shieldRouter.post('/scamcheck/conversation', async (req: Request, res: Response) => {
  try {
    const { conversation, text } = req.body;
    const rawInput = conversation || text;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: { code: 'MISSING_CONVERSATION', message: 'Field conversation is required' } });
    }
    const result = await scamNLP.analyze(rawInput);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'CONVERSATION_ANALYSIS_FAILED', message: err.message } });
  }
});

// ================= API-04: COMMUNITY REPORT =================
shieldRouter.post('/reports/number', async (req: Request, res: Response) => {
  try {
    const { reporter_wallet, reported_number, category, text, language } = req.body;
    const reportId = `REP-${Date.now()}`;
    await repository.insertReport({
      report_id: reportId,
      ts: new Date().toISOString(),
      reporter_wallet: reporter_wallet || 'W-SYN-UNKNOWN',
      reported_number,
      category: category || 'IMPERSONATION',
      text: text || '',
      language: language || 'bn',
      trust_weight: 1.0,
      analyst_verified: false
    });

    await auditService.logAction('COMMUNITY', 'REPORT_NUMBER', reportId, { reported_number, category });
    return res.json({ success: true, report_id: reportId, message: 'Report submitted for verification' });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'REPORT_FAILED', message: err.message } });
  }
});

// ================= API-05: COARSE TRUST BADGE =================
shieldRouter.get('/recipients/:id/trust', async (req: Request, res: Response) => {
  const reports = await repository.getReportsForNumber(req.params.id);
  const isReported = reports.length > 0;
  const isKnownMule = req.params.id.includes('091177');

  let badge: 'SAFE' | 'NEW_RECIPIENT' | 'REPORTED' = 'SAFE';
  if (isReported || isKnownMule) badge = 'REPORTED';

  return res.json({
    recipient_id: req.params.id,
    trust_badge: badge,
    total_reports: reports.length
  });
});

// ================= API-06 & API-07: ALERTS & CASES =================
shieldRouter.get('/alerts', async (req: Request, res: Response) => {
  const cases = await repository.getAllAlertCases();
  return res.json({ cases });
});

shieldRouter.get('/cases/:id', async (req: Request, res: Response) => {
  const c = await repository.getCaseById(req.params.id);
  if (!c) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
  return res.json({ case: c });
});

shieldRouter.post('/cases/:id/actions', async (req: Request, res: Response) => {
  try {
    const { action, analyst_id, notes, second_analyst_id } = req.body;
    const caseId = req.params.id;
    const c = await repository.getCaseById(caseId);
    if (!c) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Case not found' } });

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
    await auditService.logAction(analyst_id || 'ANALYST-101', `CASE_ACTION_${action}`, caseId, { updates });

    return res.json({ success: true, case_id: caseId, status: updates.status });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'ACTION_FAILED', message: err.message } });
  }
});

// ================= API-08: RINGS & GRAPHS =================
shieldRouter.get('/rings', async (req: Request, res: Response) => {
  const rings = await repository.getAllRings();
  return res.json({ rings });
});

shieldRouter.get('/rings/:id', async (req: Request, res: Response) => {
  const ring = await repository.getRingById(req.params.id);
  if (!ring) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ring not found' } });
  return res.json({ ring });
});

// ================= API-09: COPILOT CASE NARRATIVE =================
shieldRouter.post('/cases/:id/copilot', async (req: Request, res: Response) => {
  const c = await repository.getCaseById(req.params.id);
  if (!c) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Case not found' } });
  
  const lang = (req.body.language === 'bn' ? 'bn' : 'en');
  const brief = copilotService.generateCaseBrief(c, lang);

  await repository.updateCase(c.case_id, { copilot_brief: brief });
  return res.json({ brief });
});

// ================= API-10: GOLDEN-HOUR RECOVERY TRACE =================
shieldRouter.post('/cases/:id/trace', async (req: Request, res: Response) => {
  const c = await repository.getCaseById(req.params.id);
  const amount = c ? c.amount_bdt : 18500;
  const victimWallet = c ? c.sender_wallet : 'W-SYN-004512';

  const trace = recoveryTracer.traceMoneyFlow(victimWallet, amount);
  return res.json(trace);
});

// ================= API-11: IMPACT SIMULATOR =================
shieldRouter.post('/simulate', (req: Request, res: Response) => {
  const params = req.body;
  const result = simulatorService.simulateImpact(params);
  return res.json(result);
});

// ================= API-12: METRICS & FAIRNESS =================
shieldRouter.get('/metrics/fairness', (req: Request, res: Response) => {
  const slices = monitoringService.getFairnessSlices();
  return res.json({ slices });
});

shieldRouter.get('/metrics/drift', (req: Request, res: Response) => {
  const drift = monitoringService.getDriftMetrics();
  return res.json({ drift });
});

shieldRouter.get('/metrics/summary', async (req: Request, res: Response) => {
  const stats = await repository.getSummaryStats();
  return res.json(stats);
});

// ================= API-14: AGENT RISK =================
shieldRouter.get('/agents/:id/risk', async (req: Request, res: Response) => {
  const agent = {
    agent_id: req.params.id,
    name: 'Rahman Telecom & Flexiload',
    phone: '01799-330192',
    division: 'Dhaka',
    district_type: 'urban' as const,
    tenure_days: 420,
    size_tier: 'tier_1' as const,
    trained_flag: true,
    cashout_velocity_score: 0.88,
    risk_status: 'watchlist' as const
  };
  const profile = agentGuard.evaluateAgentRisk(agent);
  return res.json(profile);
});

// ================= AUDIT LOGS (M17) =================
shieldRouter.get('/audit/logs', async (req: Request, res: Response) => {
  const logs = await repository.getAuditLogs(50);
  return res.json({ logs });
});

shieldRouter.post('/audit/verify', async (req: Request, res: Response) => {
  const result = await auditService.verifyAuditChainIntegrity();
  return res.json(result);
});
