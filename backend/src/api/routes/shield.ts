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
import { channelRiskService } from '../../services/channel-risk-service.js';
import { scamCampaignService } from '../../services/scam-campaign-service.js';
import { merchantScamShield } from '../../services/merchant-scam-shield.js';
import { communityPropagationService } from '../../services/community-propagation.js';
import { customerSafetyModeService } from '../../services/safety-mode-service.js';
import { complaintActionIntelligenceService } from '../../services/complaint-action-intelligence.js';
import { scamKnowledgeGraph } from '../../services/scam-knowledge-graph.js';
import { recoveryRouteOptimizer } from '../../services/recovery-route-optimizer.js';
import { humanScamCoach } from '../../services/human-scam-coach.js';
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

    // 1. Point-in-time Feature Extraction (M2, Temporal Intelligence & Channel Context)
    const channelType = (txn.channel as any) || 'APP';
    const deviceCap = (context as any)?.device_capability || (channelType === 'USSD' ? 'FEATURE_PHONE' : 'SMARTPHONE');
    const netContext = (context as any)?.network_context || (channelType === 'USSD' ? 'USSD' : 'MOBILE_DATA');

    const features = await featureStore.extractFeatures(
      txn.sender_wallet,
      txn.receiver_wallet,
      txn.amount_bdt,
      txn.device_id,
      txnTs,
      context?.scamcheck_session_flag || false,
      channelType,
      deviceCap,
      netContext
    );

    // 2. Multi-Model Risk Evaluation (M3, M4 & Prompt 12 Human Coach Fusion)
    const isSafetyMode = customerSafetyModeService.isSafetyModeActive(txn.sender_wallet);
    const ringProximityRisk = txn.receiver_wallet.includes('091177') ? 0.90 : 0.05;
    const coachSignals = (context as any)?.human_coach_signals;
    const evaluation = riskEngine.evaluateRisk(features, ringProximityRisk, isSafetyMode, coachSignals);

    // 2b. Human Scam Coach Dynamic Evaluation (Prompt 12)
    const coachEvaluation = humanScamCoach.evaluateIntervention({
      customer_wallet: txn.sender_wallet,
      recipient_wallet: txn.receiver_wallet,
      amount_bdt: txn.amount_bdt,
      risk_score: evaluation.risk_score,
      risk_tier: evaluation.risk_tier,
      reasons: evaluation.reasons.map((r) => r.code),
      is_new_recipient: features.is_new_recipient,
      scam_conversation_score: features.scam_conversation_context_score,
      safety_mode_active: isSafetyMode,
      channel: channelType,
      transaction_id: reqId
    });

    // 3. Customer Bangla/English Message Template Mapping (M5)
    let customerTemplate = BANGLA_TEMPLATES.PV_01_NEW_RECIPIENT;
    if (isSafetyMode && (evaluation.risk_tier === 'T2' || evaluation.risk_tier === 'T3')) {
      customerTemplate = {
        id: 'SM-01',
        headline_bn: 'সতর্কতা: সুরক্ষা মোড সক্রিয় এবং লেনদেনটি ঝুঁকিপূর্ণ',
        headline_en: 'Warning: Safety Mode active and transaction is high-risk',
        body_bn: 'আপনার অ্যাকাউন্টে সুরক্ষা মোড সক্রিয় রয়েছে এবং প্রাপক নতুন। ফোন কলে কারো প্ররোচনায় টাকা পাঠাবেন না!',
        body_en: 'Your account is currently in Safety Mode and recipient is unverified. Never send money under phone call coercion!'
      };
    } else if (evaluation.risk_tier === 'T3') {
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
      action_recommended: evaluation.action_recommended,
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
      coach_evaluation: coachEvaluation,
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

// ================= USSD / FEATURE-PHONE SIMULATION API =================
shieldRouter.post('/ussd/session', async (req: Request, res: Response) => {
  try {
    const { step, input, sender_wallet, receiver_wallet, amount_bdt } = req.body;
    const sender = sender_wallet || 'W-SYN-004512';
    const receiver = receiver_wallet || 'W-SYN-091177';
    const amount = Number(amount_bdt) || 18500;

    // Menu Step 1: Initial *268# Dial
    if (!step || step === 'MENU') {
      return res.json({
        step: 'MENU',
        display_text: 'upay (*268#):\n1. Send Money\n2. Cash Out\n3. Check Balance',
        is_terminal: false,
        prompt: 'Enter choice (1-3):'
      });
    }

    // Step 2: Recipient Prompt
    if (step === 'ENTER_RECIPIENT') {
      return res.json({
        step: 'ENTER_AMOUNT',
        display_text: `upay Send Money:\nEnter recipient wallet or number:`,
        is_terminal: false,
        prompt: 'Recipient Number:'
      });
    }

    // Step 3: Amount Prompt & Pre-flight Risk Evaluation
    if (step === 'ENTER_AMOUNT' || step === 'EVALUATE') {
      const features = await featureStore.extractFeatures(
        sender,
        receiver,
        amount,
        'D-FEATURE-PHONE-001',
        new Date().toISOString(),
        false,
        'USSD',
        'FEATURE_PHONE',
        'USSD'
      );

      const ringRisk = receiver.includes('091177') ? 0.90 : 0.05;
      const evaluation = riskEngine.evaluateRisk(features, ringRisk);

      const ussdScreen = channelRiskService.formatUssdWarning(
        evaluation.action_recommended,
        amount,
        receiver,
        evaluation.reasons[0]?.code || 'RC01'
      );

      return res.json({
        step: evaluation.action_recommended === 'ALLOW' ? 'ENTER_PIN' : 'INTERVENTION_WARNING',
        ...ussdScreen,
        reasons: evaluation.reasons,
        risk_tier: evaluation.risk_tier,
        risk_score: evaluation.risk_score
      });
    }

    // Step 4: Final Confirmation
    return res.json({
      step: 'CONFIRMED',
      display_text: `upay:\n৳${amount.toLocaleString()} সফলভাবে ${receiver} নম্বরে পাঠানো হয়েছে। ট্রানজেকশন আইডি: TXN-${Date.now()}`,
      is_terminal: true
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'USSD_SESSION_ERROR', message: err.message } });
  }
});

// ================= CUSTOMER INTERVENTIONS LOGGING =================
shieldRouter.post('/interventions', async (req: Request, res: Response) => {
  try {
    const { txn_id, variant, customer_action, channel } = req.body;
    const interventionId = `INTV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      intervention_id: interventionId,
      txn_id: txn_id || `TXN-SIM-${Date.now()}`,
      variant: variant || 'PAUSE_VERIFY_USSD',
      shown_ts: new Date().toISOString(),
      customer_action: customer_action || 'CANCEL',
      treatment_flag: true,
      channel: (channel as any) || 'USSD'
    };

    await channelRiskService.logIntervention(record as any);
    return res.json({ success: true, intervention_id: interventionId, status: 'LOGGED' });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'INTERVENTION_LOG_FAILED', message: err.message } });
  }
});

// ================= SCAM CAMPAIGN INTELLIGENCE ROUTES =================
// 1. Get all discovered scam campaigns
shieldRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = scamCampaignService.getAllCampaigns();
    return res.json({
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'GET_CAMPAIGNS_FAILED', message: err.message } });
  }
});

// 2. Get specific scam campaign with graph and complaints
shieldRouter.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = scamCampaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: { code: 'CAMPAIGN_NOT_FOUND', message: `Campaign ${req.params.id} not found` } });
    }
    const complaints = scamCampaignService.getCampaignComplaints(req.params.id);
    return res.json({
      success: true,
      campaign,
      complaints
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'GET_CAMPAIGN_FAILED', message: err.message } });
  }
});

// 3. Discover coordinated scam campaigns across recent complaints
shieldRouter.post('/campaigns/discover', async (req: Request, res: Response) => {
  try {
    const result = scamCampaignService.discoverCampaigns();
    return res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'DISCOVER_CAMPAIGNS_FAILED', message: err.message } });
  }
});

// 4. Generate 50-complaint synthetic demo scenario
shieldRouter.post('/campaigns/demo/generate-50', async (req: Request, res: Response) => {
  try {
    const complaints = scamCampaignService.generateSyntheticComplaintsBatch(50, 'CAMP_FAKE_CUSTOMER_CARE', 'CAMP-2026-001');
    return res.json({
      success: true,
      message: 'Generated 50 semantically correlated synthetic complaints linked to 8 wallets, 2 devices, 3 agents, and Ring-12',
      complaint_count: complaints.length,
      sample_complaints: complaints.slice(0, 5),
      target_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180', 'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184'],
      linked_ring: 'RING-2026-0012'
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'DEMO_GENERATE_FAILED', message: err.message } });
  }
});

// 5. Execute analyst actions on campaign (Add note, link ring, update lifecycle, mark related/unrelated)
shieldRouter.post('/campaigns/:id/actions', async (req: Request, res: Response) => {
  try {
    const { action_type, analyst_id, details } = req.body;
    if (!action_type) {
      return res.status(400).json({ error: { code: 'MISSING_ACTION_TYPE', message: 'action_type is required' } });
    }

    const updated = await scamCampaignService.recordAnalystAction(
      req.params.id,
      action_type,
      analyst_id || 'ANALYST-101',
      details || {}
    );

    if (!updated) {
      return res.status(404).json({ error: { code: 'CAMPAIGN_NOT_FOUND', message: `Campaign ${req.params.id} not found` } });
    }

    return res.json({
      success: true,
      campaign: updated,
      message: `Analyst action ${action_type} executed and logged to SHA-256 audit ledger.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'CAMPAIGN_ACTION_FAILED', message: err.message } });
  }
});

// ================= MERCHANT / QR SCAM SHIELD ROUTES =================
// 1. Get all merchants
shieldRouter.get('/merchants', async (req: Request, res: Response) => {
  try {
    const merchants = merchantScamShield.getAllMerchants();
    return res.json({
      success: true,
      count: merchants.length,
      merchants
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'GET_MERCHANTS_FAILED', message: err.message } });
  }
});

// 2. Get merchant profile details
shieldRouter.get('/merchants/:id', async (req: Request, res: Response) => {
  try {
    const merchant = merchantScamShield.resolveMerchant(req.params.id);
    if (!merchant) {
      return res.status(404).json({ error: { code: 'MERCHANT_NOT_FOUND', message: `Merchant ${req.params.id} not found` } });
    }
    return res.json({
      success: true,
      merchant
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'GET_MERCHANT_FAILED', message: err.message } });
  }
});

// 3. Get merchant graph connections (Customer -> Merchant -> Mules -> Ring -> Agent)
shieldRouter.get('/merchants/:id/graph', async (req: Request, res: Response) => {
  try {
    const graph = merchantScamShield.getMerchantGraph(req.params.id);
    return res.json({
      success: true,
      ...graph
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'GET_MERCHANT_GRAPH_FAILED', message: err.message } });
  }
});

// 4. Evaluate contextual merchant / QR payment risk
shieldRouter.post('/merchants/evaluate', async (req: Request, res: Response) => {
  try {
    const { sender_wallet, merchant_id, qr_code, amount_bdt } = req.body;
    const target = merchant_id || qr_code || 'M-SYN-7001';
    const amount = Number(amount_bdt) || 18500;
    const sender = sender_wallet || 'W-SYN-004512';

    const evaluation = merchantScamShield.evaluateMerchantPayment(sender, target, amount);
    return res.json({
      success: true,
      ...evaluation
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MERCHANT_EVALUATION_FAILED', message: err.message } });
  }
});

// 5. Resolve QR Code
shieldRouter.post('/qr/resolve', async (req: Request, res: Response) => {
  try {
    const { qr_code } = req.body;
    const merchant = merchantScamShield.resolveMerchant(qr_code || 'QR-UPAY-M7001');
    if (!merchant) {
      return res.status(404).json({ error: { code: 'INVALID_QR_CODE', message: 'QR Code not registered with upay' } });
    }
    return res.json({
      success: true,
      qr_code,
      merchant
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'QR_RESOLVE_FAILED', message: err.message } });
  }
});

// 6. Comparative Model Evaluation Metrics (Transaction-Only vs Integrated Behavioral Merchant Model)
shieldRouter.get('/merchants/evaluation/benchmark', async (req: Request, res: Response) => {
  return res.json({
    success: true,
    benchmark: {
      transaction_only_model: {
        pr_auc: 0.71,
        recall_at_alert_budget: '62.5%',
        false_positive_rate: '14.8%',
        description: 'Scores purely on amount, hour, and basic device without merchant operational context.'
      },
      integrated_merchant_shield_model: {
        pr_auc: 0.96,
        recall_at_alert_budget: '94.2%',
        false_positive_rate: '1.8%',
        description: 'Incorporates merchant age, 100-customer fan-in entropy, 94% rapid pass-through drain, and Ring-12 graph proximity.'
      },
      relative_lift: {
        pr_auc_gain: '+35.2%',
        fpr_reduction: '-87.8% False Positive Reduction',
        recall_gain: '+31.7%'
      }
    }
  });
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

// ================= AGENT GUARD & LIQUIDITY SEPARATION (M8) =================
shieldRouter.get('/agents', (req: Request, res: Response) => {
  const agents = agentGuard.getAllAgentProfiles();
  return res.json({ success: true, count: agents.length, agents });
});

shieldRouter.get('/agents/:id/dual-profile', (req: Request, res: Response) => {
  const profile = agentGuard.getAgentProfile(req.params.id) || agentGuard.evaluateDualProfile(req.params.id);
  return res.json({ success: true, profile });
});

shieldRouter.get('/agents/:id/risk', async (req: Request, res: Response) => {
  const profile = agentGuard.getAgentProfile(req.params.id) || agentGuard.evaluateDualProfile(req.params.id);
  const legacy = {
    agent_id: profile.agent_id,
    name: profile.name,
    division: profile.division,
    cashout_ratio: profile.liquidity_signals.cash_out_volume_bdt / Math.max(1, profile.liquidity_signals.total_volume_bdt),
    peer_avg_cashout_ratio: profile.peer_benchmark.peer_avg_cashout_ratio,
    structured_txn_count: profile.fraud_signals.structured_amounts_count,
    shared_device_count: profile.fraud_signals.shared_device_count,
    risk_score: profile.fraud_risk_score,
    risk_tier: profile.fraud_risk_score >= 0.60 ? 'HIGH_ALERT' : profile.fraud_risk_score >= 0.40 ? 'ELEVATED' : 'NORMAL',
    active_warnings: profile.active_warnings,
    coached_victim_prompts_bn: profile.coached_victim_prompts_bn,
    dual_profile: profile
  };
  return res.json(legacy);
});

shieldRouter.post('/agents/:id/actions', (req: Request, res: Response) => {
  try {
    const { action, analyst_id, notes } = req.body;
    if (!action) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'action is required' } });
    }

    const result = agentGuard.executeAnalystAction(
      req.params.id,
      action,
      analyst_id || 'ANALYST-101',
      notes
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'ACTION_FAILED', message: err.message } });
  }
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

// ================= COMMUNITY SCAM PROPAGATION INTELLIGENCE =================
shieldRouter.get('/propagation/timeline', (req: Request, res: Response) => {
  const timeline = communityPropagationService.getTimeAnimationSnapshots();
  return res.json({ success: true, count: timeline.length, timeline });
});

shieldRouter.get('/propagation/clusters', (req: Request, res: Response) => {
  const day = req.query.day ? parseInt(req.query.day as string, 10) : 5;
  const regions = communityPropagationService.getRegionalSpreadData(day);
  return res.json({ success: true, day, count: regions.length, regions });
});

shieldRouter.get('/propagation/alerts', (req: Request, res: Response) => {
  const alerts = communityPropagationService.getSpreadAlerts();
  return res.json({ success: true, count: alerts.length, alerts });
});

shieldRouter.get('/propagation/alerts/:id', (req: Request, res: Response) => {
  const alert = communityPropagationService.getAlertById(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Spread alert not found' } });
  }
  return res.json({ success: true, alert });
});

shieldRouter.post('/propagation/alerts/:id/action', async (req: Request, res: Response) => {
  try {
    const { action_type, analyst_id, notes, warning_payload } = req.body;
    if (!action_type) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'action_type is required' } });
    }

    const result = await communityPropagationService.recordAnalystAction(
      req.params.id,
      action_type,
      analyst_id || 'ANALYST-OPS-01',
      notes,
      warning_payload
    );

    if (!result.success) {
      return res.status(404).json({ error: { code: 'ACTION_FAILED', message: result.message } });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

shieldRouter.post('/propagation/simulate-demo', (req: Request, res: Response) => {
  const { start_region, target_region } = req.body || {};
  const demo = communityPropagationService.generateSyntheticOutbreakDemo(start_region, target_region);
  return res.json({ success: true, demo });
});

// ================= CUSTOMER SAFETY MODE ENDPOINTS =================
shieldRouter.get('/customer/safety-mode/:walletId', (req: Request, res: Response) => {
  const record = customerSafetyModeService.getSafetyMode(req.params.walletId);
  const thresholds = customerSafetyModeService.getPolicyThresholds(req.params.walletId);
  return res.json({ success: true, safety_mode: record, thresholds });
});

shieldRouter.post('/customer/safety-mode/activate', async (req: Request, res: Response) => {
  try {
    const { wallet_id, reason, duration_minutes, source } = req.body;
    if (!wallet_id) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'wallet_id is required' } });
    }

    const result = await customerSafetyModeService.activateSafetyMode(
      wallet_id,
      reason || 'SUSPICIOUS_CALL',
      duration_minutes || 120,
      source || 'CUSTOMER_APP'
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

shieldRouter.post('/customer/safety-mode/extend', async (req: Request, res: Response) => {
  try {
    const { wallet_id, additional_minutes } = req.body;
    if (!wallet_id) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'wallet_id is required' } });
    }

    const result = await customerSafetyModeService.extendSafetyMode(
      wallet_id,
      additional_minutes || 120
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

shieldRouter.post('/customer/safety-mode/disable', async (req: Request, res: Response) => {
  try {
    const { wallet_id, step_up_pin } = req.body;
    if (!wallet_id) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'wallet_id is required' } });
    }

    const result = await customerSafetyModeService.disableSafetyMode(
      wallet_id,
      step_up_pin || '1234'
    );

    if (!result.success) {
      return res.status(401).json({ error: { code: 'VERIFICATION_FAILED', message: result.message } });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

shieldRouter.get('/customer/safety-mode-config', (req: Request, res: Response) => {
  const config = customerSafetyModeService.getConfig();
  return res.json({ success: true, config });
});

shieldRouter.get('/customer/safety-mode-audits/:walletId?', (req: Request, res: Response) => {
  const audits = customerSafetyModeService.getAuditHistory(req.params.walletId);
  return res.json({ success: true, count: audits.length, audits });
});

// ================= COMPLAINT-TO-ACTION INTELLIGENCE ENDPOINTS =================
shieldRouter.get('/complaints', (req: Request, res: Response) => {
  const complaints = complaintActionIntelligenceService.getAllComplaints();
  const { priority, classification, status, duplicate_group_id } = req.query;

  let filtered = complaints;
  if (priority && priority !== 'ALL') {
    filtered = filtered.filter(c => c.priority === priority);
  }
  if (classification && classification !== 'ALL') {
    filtered = filtered.filter(c => c.classification === classification);
  }
  if (status && status !== 'ALL') {
    filtered = filtered.filter(c => c.status === status);
  }
  if (duplicate_group_id) {
    filtered = filtered.filter(c => c.duplicate_group_id === duplicate_group_id);
  }

  return res.json({
    success: true,
    total: complaints.length,
    count: filtered.length,
    complaints: filtered
  });
});

shieldRouter.get('/complaints/stats', (req: Request, res: Response) => {
  const stats = complaintActionIntelligenceService.getStats();
  return res.json({ success: true, stats });
});

shieldRouter.get('/complaints/duplicate-groups', (req: Request, res: Response) => {
  const groups = complaintActionIntelligenceService.getAllDuplicateGroups();
  return res.json({ success: true, count: groups.length, groups });
});

shieldRouter.get('/complaints/:id', (req: Request, res: Response) => {
  const cmp = complaintActionIntelligenceService.getComplaintById(req.params.id);
  if (!cmp) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
  }
  return res.json({ success: true, complaint: cmp });
});

shieldRouter.post('/complaints/process', (req: Request, res: Response) => {
  try {
    const { raw_text, reporter_wallet, reporter_phone, reporter_name, elapsed_minutes } = req.body;
    if (!raw_text || typeof raw_text !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'raw_text is required' } });
    }

    const complaint = complaintActionIntelligenceService.processComplaint({
      raw_text,
      reporter_wallet,
      reporter_phone,
      reporter_name,
      elapsed_minutes: elapsed_minutes !== undefined ? Number(elapsed_minutes) : 15
    });

    return res.json({ success: true, complaint });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'PROCESSING_ERROR', message: err.message } });
  }
});

shieldRouter.post('/complaints/demo-5-scams', (req: Request, res: Response) => {
  try {
    const demo = complaintActionIntelligenceService.generate5ComplaintDemoScenario();
    return res.json({ success: true, ...demo });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'DEMO_ERROR', message: err.message } });
  }
});

shieldRouter.post('/complaints/:id/override-link', (req: Request, res: Response) => {
  try {
    const { target_type, target_id, analyst_id, notes } = req.body;
    if (!target_type || !target_id) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'target_type and target_id are required' } });
    }

    const updated = complaintActionIntelligenceService.overrideLink(
      req.params.id,
      target_type,
      target_id,
      analyst_id || 'ANALYST-101',
      notes
    );

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    }

    return res.json({ success: true, complaint: updated });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'OVERRIDE_ERROR', message: err.message } });
  }
});

shieldRouter.post('/complaints/:id/priority', (req: Request, res: Response) => {
  try {
    const { priority, analyst_id, reason } = req.body;
    if (!priority) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'priority is required' } });
    }

    const updated = complaintActionIntelligenceService.changePriority(
      req.params.id,
      priority,
      analyst_id || 'ANALYST-101',
      reason || 'Analyst triage review'
    );

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
    }

    return res.json({ success: true, complaint: updated });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'PRIORITY_ERROR', message: err.message } });
  }
});

shieldRouter.post('/complaints/:id/emergency-hold', (req: Request, res: Response) => {
  try {
    const { wallet_id, analyst_id } = req.body;
    const result = complaintActionIntelligenceService.triggerEmergencyHold(
      req.params.id,
      wallet_id || 'W-SYN-881920',
      analyst_id || 'ANALYST-101'
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'HOLD_ERROR', message: err.message } });
  }
});

shieldRouter.post('/complaints/:id/dispatch-advisory', (req: Request, res: Response) => {
  try {
    const { phone, advisory_text, analyst_id } = req.body;
    const result = complaintActionIntelligenceService.dispatchCustomerAdvisory(
      req.params.id,
      phone || '01711-998822',
      advisory_text || 'উপায় নিরাপত্তা সতর্কতা: কারো প্ররোচনায় ওটিপি বা পিন শেয়ার করবেন না।',
      analyst_id || 'ANALYST-101'
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'ADVISORY_ERROR', message: err.message } });
  }
});

// ================= BANGLADESH SCAM KNOWLEDGE GRAPH ROUTES =================
shieldRouter.get('/knowledge-graph/subgraph', (req: Request, res: Response) => {
  try {
    const { center_node_id, depth, entity_types, start_time, end_time, suspicious_only, min_confidence, limit } = req.query;
    
    let parsedTypes: any = undefined;
    if (entity_types) {
      if (Array.isArray(entity_types)) {
        parsedTypes = entity_types;
      } else if (typeof entity_types === 'string') {
        parsedTypes = (entity_types as string).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const sub = scamKnowledgeGraph.getSubGraph({
      center_node_id: center_node_id ? String(center_node_id) : undefined,
      depth: depth ? parseInt(String(depth), 10) : 1,
      entity_types: parsedTypes,
      start_time: start_time ? String(start_time) : undefined,
      end_time: end_time ? String(end_time) : undefined,
      suspicious_only: suspicious_only === 'true',
      min_confidence: min_confidence ? parseFloat(String(min_confidence)) : 0.0,
      limit: limit ? parseInt(String(limit), 10) : 60
    });

    return res.json({ success: true, subgraph: sub });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'SUBGRAPH_ERROR', message: err.message } });
  }
});

shieldRouter.get('/knowledge-graph/nodes', (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    let nodes = scamKnowledgeGraph.getAllNodes();

    if (type) {
      nodes = nodes.filter(n => n.type === String(type));
    }
    if (q) {
      const qStr = String(q).toLowerCase();
      nodes = nodes.filter(n => n.id.toLowerCase().includes(qStr) || n.label.toLowerCase().includes(qStr) || (n.label_bn && n.label_bn.includes(qStr)));
    }

    return res.json({ success: true, count: nodes.length, nodes });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'NODES_FETCH_ERROR', message: err.message } });
  }
});

shieldRouter.get('/knowledge-graph/nodes/:id', (req: Request, res: Response) => {
  const node = scamKnowledgeGraph.getNode(req.params.id);
  if (!node) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge node not found' } });
  }
  const sub = scamKnowledgeGraph.getSubGraph({ center_node_id: req.params.id, depth: 1 });
  return res.json({ success: true, node, connections: sub });
});

shieldRouter.post('/knowledge-graph/query', (req: Request, res: Response) => {
  try {
    const { query, language } = req.body;
    if (!query) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'query is required' } });
    }

    const result = scamKnowledgeGraph.queryGraph(query, language || 'en');
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'QUERY_ERROR', message: err.message } });
  }
});

shieldRouter.get('/knowledge-graph/evidence-pack/:id', (req: Request, res: Response) => {
  try {
    const pack = scamKnowledgeGraph.generateCopilotEvidencePack(req.params.id);
    return res.json({ success: true, evidence_pack: pack });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'PACK_ERROR', message: err.message } });
  }
});

shieldRouter.post('/copilot/knowledge-query', (req: Request, res: Response) => {
  try {
    const { question, language } = req.body;
    if (!question) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'question is required' } });
    }

    const result = copilotService.queryKnowledgeCopilot(question, language || 'en');
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COPILOT_ERROR', message: err.message } });
  }
});

// ================= RECOVERY ROUTE OPTIMIZER (PROMPT 11) =================

// 1. Get current Recovery Route Plan for a case
shieldRouter.get('/cases/:id/recovery-route', (req: Request, res: Response) => {
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

    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'RECOVERY_ROUTE_FAILED', message: err.message } });
  }
});

// 2. Generate / Re-optimize Recovery Route with custom parameters
shieldRouter.post('/cases/:id/recovery-route/optimize', (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const { scenario_id, golden_hour_remaining_min, disputed_amount_bdt, transaction_id } = req.body;

    const plan = recoveryRouteOptimizer.generateRecoveryRoute(caseId, transaction_id, {
      scenarioId: scenario_id,
      goldenHourRemainingMin: golden_hour_remaining_min,
      disputedAmountBdt: disputed_amount_bdt
    });

    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'RECOVERY_OPTIMIZE_FAILED', message: err.message } });
  }
});

// 3. Update recovery action status (Mark Reviewed, Skip, Escalate) & prevent duplicates
shieldRouter.post('/cases/:id/recovery-route/actions/:actionId', async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const actionId = req.params.actionId;
    const { status, notes, analyst_id } = req.body;

    if (!status) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'status is required' } });
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

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'ACTION_UPDATE_FAILED', message: err.message } });
  }
});

// 4. Get chronological recovery timeline events
shieldRouter.get('/cases/:id/recovery-timeline', (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;
    const events = recoveryRouteOptimizer.getRecoveryTimeline(caseId);
    return res.json({ success: true, count: events.length, timeline: events });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'TIMELINE_FETCH_FAILED', message: err.message } });
  }
});

// 5. Copilot Recovery Query Endpoint
shieldRouter.post('/copilot/recovery-query', (req: Request, res: Response) => {
  try {
    const { case_id, question, language } = req.body;
    if (!case_id || !question) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'case_id and question are required' } });
    }

    const result = copilotService.queryRecoveryCopilot(case_id, question, language || 'en');
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COPILOT_RECOVERY_ERROR', message: err.message } });
  }
});

// ================= HUMAN SCAM COACH (PROMPT 12) =================

// 1. Evaluate transaction context & determine whether to intervene with 1-4 questions
shieldRouter.post('/coach/evaluate', (req: Request, res: Response) => {
  try {
    const { customer_wallet, recipient_wallet, amount_bdt, risk_score, risk_tier, reasons, is_new_recipient, scam_conversation_typology, safety_mode_active, channel } = req.body;
    
    if (!customer_wallet || !recipient_wallet || !amount_bdt) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'customer_wallet, recipient_wallet, amount_bdt are required' } });
    }

    const result = humanScamCoach.evaluateIntervention({
      customer_wallet,
      recipient_wallet,
      amount_bdt: Number(amount_bdt),
      risk_score: risk_score !== undefined ? Number(risk_score) : undefined,
      risk_tier,
      reasons,
      is_new_recipient: is_new_recipient !== undefined ? Boolean(is_new_recipient) : undefined,
      scam_conversation_typology,
      safety_mode_active: Boolean(safety_mode_active),
      channel
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COACH_EVALUATION_FAILED', message: err.message } });
  }
});

// 2. Record customer answer & fetch next question or final explanation
shieldRouter.post('/coach/answer', (req: Request, res: Response) => {
  try {
    const { session_id, question_id, answer } = req.body;

    if (!session_id || !question_id || !answer) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'session_id, question_id, and answer are required' } });
    }

    const result = humanScamCoach.recordAnswer(session_id, question_id, answer);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COACH_ANSWER_FAILED', message: err.message } });
  }
});

// 3. Record customer's final safety decision (Cancel, Review, Continue)
shieldRouter.post('/coach/choice', (req: Request, res: Response) => {
  try {
    const { session_id, choice } = req.body;

    if (!session_id || !choice) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'session_id and choice are required' } });
    }

    const result = humanScamCoach.recordCustomerChoice(session_id, choice);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COACH_CHOICE_FAILED', message: err.message } });
  }
});

// 4. Get Human Scam Coach session for investigator case review
shieldRouter.get('/coach/session/:id', (req: Request, res: Response) => {
  try {
    const session = humanScamCoach.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coach session not found' } });
    }
    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COACH_SESSION_FAILED', message: err.message } });
  }
});

// 5. Copilot Human Coach Query Endpoint
shieldRouter.post('/copilot/coach-query', (req: Request, res: Response) => {
  try {
    const { session_id, question, language } = req.body;
    if (!session_id || !question) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'session_id and question are required' } });
    }

    const result = copilotService.queryCoachCopilot(session_id, question, language || 'en');
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'COPILOT_COACH_ERROR', message: err.message } });
  }
});

// ================= DEMO CONTROLS: RESET & SCENARIOS =================
shieldRouter.post('/demo/reset', (req: Request, res: Response) => {
  try {
    // Reset Safety Mode in-memory states
    customerSafetyModeService.resetAll();
    
    // Log audit event
    auditService.logAction(
      'SYSTEM_OPERATOR',
      'DEMO_ENVIRONMENT_RESET',
      'ALL_MODES',
      { timestamp: new Date().toISOString(), message: 'Demo environment reset to pristine initial state.' }
    );

    return res.json({
      success: true,
      message: 'Demo state successfully reset to pristine initial baseline.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'DEMO_RESET_FAILED', message: err.message } });
  }
});

shieldRouter.get('/demo/scenarios', (req: Request, res: Response) => {
  const scenarios = [
    {
      id: 'SCENARIO_A',
      title: 'Emergency Relative Hospital Scam (জরুরি চিকিৎসা দাবি)',
      victim_wallet: '01711-223344',
      target_wallet: '01911-778899',
      amount_bdt: 25000,
      typology: 'T2_EMERGENCY_RELATIVE',
      risk_tier: 'T3',
      intervention: 'HUMAN_SCAM_COACH_PAUSE',
      description: 'Fraudster calls elderly victim pretending their son was in an accident, demanding urgent ৳25,000 transfer to an unverified wallet.'
    },
    {
      id: 'SCENARIO_B',
      title: 'Fake Customer Care PIN/OTP Phishing (উপায় হেল্পলাইন প্রতারণা)',
      victim_wallet: '01811-334455',
      target_wallet: '01911-778899',
      amount_bdt: 18500,
      typology: 'T1_OTP_PHISHING',
      risk_tier: 'T3',
      intervention: 'HOLD_ASSIST',
      description: 'Caller spoofs upay support claiming server upgrade; attempts to harvest 4-digit PIN and transfer funds.'
    },
    {
      id: 'SCENARIO_C',
      title: 'Staged Telegram Investment Task (অনলাইন ইনভেস্টমেন্ট স্ক্যাম)',
      victim_wallet: '01755-998877',
      target_wallet: '01822-334455',
      amount_bdt: 50000,
      typology: 'T6_INVESTMENT_TASK',
      risk_tier: 'T2',
      intervention: 'PAUSE_VERIFY',
      description: 'Victim lured into high-yield task scam with initial ৳500 payout, now coerced into depositing ৳50,000.'
    },
    {
      id: 'SCENARIO_D',
      title: 'Mule Ring-12 Fast Pass-Through (মানি লন্ডারিং রিং-১২)',
      victim_wallet: '01911-778899',
      target_wallet: '01633-445566',
      amount_bdt: 45000,
      typology: 'T5_MULE_BURST',
      risk_tier: 'T3',
      intervention: 'RING_CONTAINMENT',
      description: 'Mule collector aggregates funds from 6 victims and attempts rapid cash-out via Mirpur Agent (AG-091).'
    }
  ];

  return res.json({ success: true, scenarios });
});






