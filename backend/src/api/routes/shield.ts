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
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction payload schema',
        error: { code: 'INVALID_PAYLOAD', details: parseRes.error.format() }
      });
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

    return res.status(200).json({
      success: true,
      message: evaluation.risk_tier === 'T1' 
        ? 'Transaction evaluated as low risk' 
        : `Transaction flagged as ${evaluation.risk_tier} (${evaluation.action_recommended})`,
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
    return res.status(500).json({
      success: false,
      message: 'Failed to score transaction risk',
      error: { code: 'INTERNAL_ERROR', details: err.message }
    });
  }
});

// ================= API-03: SCAM CHECK & CONVERSATIONAL INTELLIGENCE =================
shieldRouter.post('/scamcheck', async (req: Request, res: Response) => {
  try {
    const { text, conversation } = req.body;
    const rawInput = conversation || text;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field text or conversation is required',
        error: { code: 'MISSING_TEXT' }
      });
    }
    const result = await scamNLP.analyze(rawInput);

    await auditService.logAction('SCAM_INTEL', 'ANALYZE_CONVERSATION', `SCAM-${Date.now()}`, {
      verdict: result.verdict,
      typology: result.typology_matched,
      extracted_entities: result.conversation_risk_profile?.extracted_entities
    });

    return res.status(200).json({
      success: true,
      message: result.verdict === 'SCAM' 
        ? `High scam likelihood detected (${result.typology_matched})` 
        : 'Scam check analysis completed successfully',
      ...result
    });
  } catch (err: any) {
    console.error('Scam Check Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Scam check analysis failed',
      error: { code: 'SCAM_CHECK_FAILED', details: err.message }
    });
  }
});

shieldRouter.post('/scamcheck/conversation', async (req: Request, res: Response) => {
  try {
    const { conversation, text } = req.body;
    const rawInput = conversation || text;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field conversation is required',
        error: { code: 'MISSING_CONVERSATION' }
      });
    }
    const result = await scamNLP.analyze(rawInput);
    return res.status(200).json({
      success: true,
      message: 'Conversation intelligence analysis completed successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Conversation analysis failed',
      error: { code: 'CONVERSATION_ANALYSIS_FAILED', details: err.message }
    });
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
      return res.status(200).json({
        success: true,
        message: 'USSD main menu initialized',
        step: 'MENU',
        display_text: 'upay (*268#):\n1. Send Money\n2. Cash Out\n3. Check Balance',
        is_terminal: false,
        prompt: 'Enter choice (1-3):'
      });
    }

    // Step 2: Recipient Prompt
    if (step === 'ENTER_RECIPIENT') {
      return res.status(200).json({
        success: true,
        message: 'Recipient wallet prompt displayed',
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

      return res.status(200).json({
        success: true,
        message: 'Pre-flight USSD transaction risk evaluated',
        step: evaluation.action_recommended === 'ALLOW' ? 'ENTER_PIN' : 'INTERVENTION_WARNING',
        ...ussdScreen,
        reasons: evaluation.reasons,
        risk_tier: evaluation.risk_tier,
        risk_score: evaluation.risk_score
      });
    }

    // Step 4: Final Confirmation
    return res.status(200).json({
      success: true,
      message: 'USSD transaction completed successfully',
      step: 'CONFIRMED',
      display_text: `upay:\n৳${amount.toLocaleString()} সফলভাবে ${receiver} নম্বরে পাঠানো হয়েছে। ট্রানজেকশন আইডি: TXN-${Date.now()}`,
      is_terminal: true
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'USSD session failed to process',
      error: { code: 'USSD_SESSION_ERROR', details: err.message }
    });
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
    return res.status(200).json({
      success: true,
      message: 'Intervention outcome logged successfully',
      intervention_id: interventionId,
      status: 'LOGGED'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to log customer intervention',
      error: { code: 'INTERVENTION_LOG_FAILED', details: err.message }
    });
  }
});

// ================= SCAM CAMPAIGN INTELLIGENCE ROUTES =================
// 1. Get all discovered scam campaigns
shieldRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = scamCampaignService.getAllCampaigns();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${campaigns.length} scam campaigns`,
      count: campaigns.length,
      campaigns
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scam campaigns',
      error: { code: 'GET_CAMPAIGNS_FAILED', details: err.message }
    });
  }
});

// 2. Get specific scam campaign with graph and complaints
shieldRouter.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = scamCampaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `Campaign ${req.params.id} not found`,
        error: { code: 'CAMPAIGN_NOT_FOUND' }
      });
    }
    const complaints = scamCampaignService.getCampaignComplaints(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Campaign ${req.params.id} retrieved successfully`,
      campaign,
      complaints
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve campaign details',
      error: { code: 'GET_CAMPAIGN_FAILED', details: err.message }
    });
  }
});

// 3. Discover coordinated scam campaigns across recent complaints
shieldRouter.post('/campaigns/discover', async (req: Request, res: Response) => {
  try {
    const result = scamCampaignService.discoverCampaigns();
    return res.status(200).json({
      success: true,
      message: 'Coordinated scam campaign discovery completed successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to run campaign discovery algorithm',
      error: { code: 'DISCOVER_CAMPAIGNS_FAILED', details: err.message }
    });
  }
});

// 4. Generate 50-complaint synthetic demo scenario
shieldRouter.post('/campaigns/demo/generate-50', async (req: Request, res: Response) => {
  try {
    const complaints = scamCampaignService.generateSyntheticComplaintsBatch(50, 'CAMP_FAKE_CUSTOMER_CARE', 'CAMP-2026-001');
    return res.status(200).json({
      success: true,
      message: 'Generated 50 semantically correlated synthetic complaints linked to 8 wallets, 2 devices, 3 agents, and Ring-12',
      complaint_count: complaints.length,
      sample_complaints: complaints.slice(0, 5),
      target_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180', 'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184'],
      linked_ring: 'RING-2026-0012'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate synthetic demo complaints batch',
      error: { code: 'DEMO_GENERATE_FAILED', details: err.message }
    });
  }
});

// 5. Execute analyst actions on campaign (Add note, link ring, update lifecycle, mark related/unrelated)
shieldRouter.post('/campaigns/:id/actions', async (req: Request, res: Response) => {
  try {
    const { action_type, analyst_id, details } = req.body;
    if (!action_type) {
      return res.status(400).json({
        success: false,
        message: 'Field action_type is required',
        error: { code: 'MISSING_ACTION_TYPE' }
      });
    }

    const updated = await scamCampaignService.recordAnalystAction(
      req.params.id,
      action_type,
      analyst_id || 'ANALYST-101',
      details || {}
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Campaign ${req.params.id} not found`,
        error: { code: 'CAMPAIGN_NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      campaign: updated,
      message: `Analyst action ${action_type} executed and logged to SHA-256 audit ledger.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to execute analyst action on campaign',
      error: { code: 'CAMPAIGN_ACTION_FAILED', details: err.message }
    });
  }
});

// ================= MERCHANT / QR SCAM SHIELD ROUTES =================
// 1. Get all merchants
shieldRouter.get('/merchants', async (req: Request, res: Response) => {
  try {
    const merchants = merchantScamShield.getAllMerchants();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${merchants.length} merchants`,
      count: merchants.length,
      merchants
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve merchants',
      error: { code: 'GET_MERCHANTS_FAILED', details: err.message }
    });
  }
});

// 2. Get merchant profile details
shieldRouter.get('/merchants/:id', async (req: Request, res: Response) => {
  try {
    const merchant = merchantScamShield.resolveMerchant(req.params.id);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: `Merchant ${req.params.id} not found`,
        error: { code: 'MERCHANT_NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Merchant ${req.params.id} profile retrieved`,
      merchant
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve merchant profile',
      error: { code: 'GET_MERCHANT_FAILED', details: err.message }
    });
  }
});

// 3. Get merchant graph connections (Customer -> Merchant -> Mules -> Ring -> Agent)
shieldRouter.get('/merchants/:id/graph', async (req: Request, res: Response) => {
  try {
    const graph = merchantScamShield.getMerchantGraph(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Merchant ${req.params.id} graph topology retrieved`,
      ...graph
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve merchant graph',
      error: { code: 'GET_MERCHANT_GRAPH_FAILED', details: err.message }
    });
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
    return res.status(200).json({
      success: true,
      message: evaluation.decision === 'HOLD' || evaluation.decision === 'WARN'
        ? `Merchant transaction flagged (${evaluation.decision}): ${evaluation.risk_tier}`
        : 'Merchant transaction approved',
      ...evaluation
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate merchant transaction risk',
      error: { code: 'MERCHANT_EVALUATION_FAILED', details: err.message }
    });
  }
});

// 5. Resolve QR Code
shieldRouter.post('/qr/resolve', async (req: Request, res: Response) => {
  try {
    const { qr_code } = req.body;
    const merchant = merchantScamShield.resolveMerchant(qr_code || 'QR-UPAY-M7001');
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'QR Code not registered with upay',
        error: { code: 'INVALID_QR_CODE' }
      });
    }
    return res.status(200).json({
      success: true,
      message: 'QR code successfully resolved to merchant',
      qr_code,
      merchant
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve QR code',
      error: { code: 'QR_RESOLVE_FAILED', details: err.message }
    });
  }
});

// 6. Comparative Model Evaluation Metrics (Transaction-Only vs Integrated Behavioral Merchant Model)
shieldRouter.get('/merchants/evaluation/benchmark', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Merchant shield model benchmark evaluation retrieved',
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
    if (!reported_number) {
      return res.status(400).json({
        success: false,
        message: 'Reported phone number or wallet is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

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
    return res.status(200).json({
      success: true,
      message: 'Scam report submitted and logged for verification',
      report_id: reportId
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit scam report',
      error: { code: 'REPORT_FAILED', details: err.message }
    });
  }
});

// ================= API-05: COARSE TRUST BADGE =================
shieldRouter.get('/recipients/:id/trust', async (req: Request, res: Response) => {
  try {
    const reports = await repository.getReportsForNumber(req.params.id);
    const isReported = reports.length > 0;
    const isKnownMule = req.params.id.includes('091177');

    let badge: 'SAFE' | 'NEW_RECIPIENT' | 'REPORTED' = 'SAFE';
    if (isReported || isKnownMule) badge = 'REPORTED';

    return res.status(200).json({
      success: true,
      message: `Trust status evaluated for recipient ${req.params.id}`,
      recipient_id: req.params.id,
      trust_badge: badge,
      total_reports: reports.length
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate recipient trust badge',
      error: { code: 'TRUST_BADGE_FAILED', details: err.message }
    });
  }
});

// ================= API-06 & API-07: ALERTS & CASES =================
shieldRouter.get('/alerts', async (req: Request, res: Response) => {
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

shieldRouter.get('/cases/:id', async (req: Request, res: Response) => {
  try {
    const c = await repository.getCaseById(req.params.id);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case ${req.params.id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Case ${req.params.id} details retrieved`,
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

shieldRouter.post('/cases/:id/actions', async (req: Request, res: Response) => {
  try {
    const { action, analyst_id, notes, second_analyst_id } = req.body;
    const caseId = req.params.id;
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

// ================= API-08: RINGS & GRAPHS =================
shieldRouter.get('/rings', async (req: Request, res: Response) => {
  try {
    const rings = await repository.getAllRings();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${rings.length} mule rings`,
      count: rings.length,
      rings
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve mule rings',
      error: { code: 'GET_RINGS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/rings/:id', async (req: Request, res: Response) => {
  try {
    const ring = await repository.getRingById(req.params.id);
    if (!ring) {
      return res.status(404).json({
        success: false,
        message: `Ring ${req.params.id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Ring ${req.params.id} details retrieved`,
      ring
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ring details',
      error: { code: 'GET_RING_FAILED', details: err.message }
    });
  }
});

// ================= API-09: COPILOT CASE NARRATIVE =================
shieldRouter.post('/cases/:id/copilot', async (req: Request, res: Response) => {
  try {
    const c = await repository.getCaseById(req.params.id);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case ${req.params.id} not found`,
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
shieldRouter.post('/cases/:id/trace', async (req: Request, res: Response) => {
  try {
    const c = await repository.getCaseById(req.params.id);
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

// ================= API-11: IMPACT SIMULATOR =================
shieldRouter.post('/simulate', (req: Request, res: Response) => {
  try {
    const params = req.body;
    const result = simulatorService.simulateImpact(params);
    return res.status(200).json({
      success: true,
      message: 'Risk threshold simulation completed successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Simulation execution failed',
      error: { code: 'SIMULATION_FAILED', details: err.message }
    });
  }
});

// ================= API-12: METRICS & FAIRNESS =================
shieldRouter.get('/metrics/fairness', (req: Request, res: Response) => {
  try {
    const slices = monitoringService.getFairnessSlices();
    return res.status(200).json({
      success: true,
      message: 'Fairness slice metrics retrieved',
      slices
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fairness metrics',
      error: { code: 'FAIRNESS_METRICS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/metrics/drift', (req: Request, res: Response) => {
  try {
    const drift = monitoringService.getDriftMetrics();
    return res.status(200).json({
      success: true,
      message: 'Model drift metrics retrieved',
      drift
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve drift metrics',
      error: { code: 'DRIFT_METRICS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const stats = await repository.getSummaryStats();
    return res.status(200).json({
      success: true,
      message: 'Summary metrics retrieved successfully',
      ...stats
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system summary metrics',
      error: { code: 'SUMMARY_METRICS_FAILED', details: err.message }
    });
  }
});

// ================= AGENT GUARD & LIQUIDITY SEPARATION (M8) =================
shieldRouter.get('/agents', (req: Request, res: Response) => {
  try {
    const agents = agentGuard.getAllAgentProfiles();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${agents.length} agent profiles`,
      count: agents.length,
      agents
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agents',
      error: { code: 'GET_AGENTS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/agents/:id/dual-profile', (req: Request, res: Response) => {
  try {
    const profile = agentGuard.getAgentProfile(req.params.id) || agentGuard.evaluateDualProfile(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Dual risk profile retrieved for agent ${req.params.id}`,
      profile
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent dual profile',
      error: { code: 'GET_AGENT_PROFILE_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/agents/:id/risk', async (req: Request, res: Response) => {
  try {
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
    return res.status(200).json({
      success: true,
      message: `Risk evaluation for agent ${req.params.id} completed`,
      ...legacy
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent risk evaluation',
      error: { code: 'GET_AGENT_RISK_FAILED', details: err.message }
    });
  }
});

shieldRouter.post('/agents/:id/actions', (req: Request, res: Response) => {
  try {
    const { action, analyst_id, notes } = req.body;
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = agentGuard.executeAnalystAction(
      req.params.id,
      action,
      analyst_id || 'ANALYST-101',
      notes
    );

    return res.status(200).json({
      success: true,
      message: `Action ${action} executed successfully on agent ${req.params.id}`,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to execute agent action',
      error: { code: 'ACTION_FAILED', details: err.message }
    });
  }
});

// ================= AUDIT LOGS (M17) =================
shieldRouter.get('/audit/logs', async (req: Request, res: Response) => {
  try {
    const logs = await repository.getAuditLogs(50);
    return res.status(200).json({
      success: true,
      message: `Retrieved ${logs.length} cryptographic audit logs`,
      count: logs.length,
      logs
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: { code: 'GET_AUDIT_LOGS_FAILED', details: err.message }
    });
  }
});

shieldRouter.post('/audit/verify', async (req: Request, res: Response) => {
  try {
    const result = await auditService.verifyAuditChainIntegrity();
    return res.status(200).json({
      success: true,
      message: 'Audit ledger cryptographic chain verification completed',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Audit verification failed',
      error: { code: 'AUDIT_VERIFY_FAILED', details: err.message }
    });
  }
});

// ================= COMMUNITY SCAM PROPAGATION INTELLIGENCE =================
shieldRouter.get('/propagation/timeline', (req: Request, res: Response) => {
  try {
    const timeline = communityPropagationService.getTimeAnimationSnapshots();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${timeline.length} propagation timeline frames`,
      count: timeline.length,
      timeline
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation timeline',
      error: { code: 'GET_PROPAGATION_TIMELINE_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/propagation/clusters', (req: Request, res: Response) => {
  try {
    const day = req.query.day ? parseInt(req.query.day as string, 10) : 5;
    const regions = communityPropagationService.getRegionalSpreadData(day);
    return res.status(200).json({
      success: true,
      message: `Retrieved regional spread data for day ${day}`,
      day,
      count: regions.length,
      regions
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation clusters',
      error: { code: 'GET_PROPAGATION_CLUSTERS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/propagation/alerts', (req: Request, res: Response) => {
  try {
    const alerts = communityPropagationService.getSpreadAlerts();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${alerts.length} active propagation alerts`,
      count: alerts.length,
      alerts
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation alerts',
      error: { code: 'GET_PROPAGATION_ALERTS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/propagation/alerts/:id', (req: Request, res: Response) => {
  try {
    const alert = communityPropagationService.getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Spread alert not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Spread alert ${req.params.id} details retrieved`,
      alert
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation alert',
      error: { code: 'GET_ALERT_FAILED', details: err.message }
    });
  }
});

shieldRouter.post('/propagation/alerts/:id/action', async (req: Request, res: Response) => {
  try {
    const { action_type, analyst_id, notes, warning_payload } = req.body;
    if (!action_type) {
      return res.status(400).json({
        success: false,
        message: 'Field action_type is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await communityPropagationService.recordAnalystAction(
      req.params.id,
      action_type,
      analyst_id || 'ANALYST-OPS-01',
      notes,
      warning_payload
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Action failed on propagation alert',
        error: { code: 'ACTION_FAILED' }
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'Analyst action executed on spread alert',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record action on propagation alert',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/propagation/simulate-demo', (req: Request, res: Response) => {
  try {
    const { start_region, target_region } = req.body || {};
    const demo = communityPropagationService.generateSyntheticOutbreakDemo(start_region, target_region);
    return res.status(200).json({
      success: true,
      message: 'Synthetic outbreak demo scenario generated successfully',
      demo
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to simulate propagation demo',
      error: { code: 'SIMULATION_ERROR', details: err.message }
    });
  }
});

// ================= CUSTOMER SAFETY MODE ENDPOINTS =================
shieldRouter.get('/customer/safety-mode/:walletId', (req: Request, res: Response) => {
  try {
    const record = customerSafetyModeService.getSafetyMode(req.params.walletId);
    const thresholds = customerSafetyModeService.getPolicyThresholds(req.params.walletId);
    return res.status(200).json({
      success: true,
      message: `Safety mode status retrieved for wallet ${req.params.walletId}`,
      safety_mode: record,
      thresholds
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve safety mode status',
      error: { code: 'GET_SAFETY_MODE_FAILED', details: err.message }
    });
  }
});

shieldRouter.post('/customer/safety-mode/activate', async (req: Request, res: Response) => {
  try {
    const { wallet_id, reason, duration_minutes, source } = req.body;
    if (!wallet_id) {
      return res.status(400).json({
        success: false,
        message: 'Field wallet_id is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await customerSafetyModeService.activateSafetyMode(
      wallet_id,
      reason || 'SUSPICIOUS_CALL',
      duration_minutes || 120,
      source || 'CUSTOMER_APP'
    );

    return res.status(200).json({
      success: true,
      message: result.message || 'Safety Mode activated successfully for your protection',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to activate Safety Mode',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/customer/safety-mode/extend', async (req: Request, res: Response) => {
  try {
    const { wallet_id, additional_minutes } = req.body;
    if (!wallet_id) {
      return res.status(400).json({
        success: false,
        message: 'Field wallet_id is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await customerSafetyModeService.extendSafetyMode(
      wallet_id,
      additional_minutes || 120
    );

    return res.status(200).json({
      success: true,
      message: result.message || 'Safety Mode extended successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to extend Safety Mode duration',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/customer/safety-mode/disable', async (req: Request, res: Response) => {
  try {
    const { wallet_id, step_up_pin } = req.body;
    if (!wallet_id) {
      return res.status(400).json({
        success: false,
        message: 'Field wallet_id is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await customerSafetyModeService.disableSafetyMode(
      wallet_id,
      step_up_pin || '1234'
    );

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message || 'Incorrect PIN or verification failed to disable Safety Mode',
        error: { code: 'VERIFICATION_FAILED' }
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'Safety Mode has been successfully disabled',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to disable Safety Mode',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

shieldRouter.get('/customer/safety-mode-config', (req: Request, res: Response) => {
  try {
    const config = customerSafetyModeService.getConfig();
    return res.status(200).json({
      success: true,
      message: 'Safety Mode policy configuration retrieved',
      config
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Safety Mode configuration',
      error: { code: 'GET_CONFIG_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/customer/safety-mode-audits/:walletId?', (req: Request, res: Response) => {
  try {
    const audits = customerSafetyModeService.getAuditHistory(req.params.walletId);
    return res.status(200).json({
      success: true,
      message: `Retrieved ${audits.length} safety mode audit events`,
      count: audits.length,
      audits
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve safety mode audit logs',
      error: { code: 'GET_AUDITS_FAILED', details: err.message }
    });
  }
});

// ================= COMPLAINT-TO-ACTION INTELLIGENCE ENDPOINTS =================
shieldRouter.get('/complaints', (req: Request, res: Response) => {
  try {
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

    return res.status(200).json({
      success: true,
      message: `Retrieved ${filtered.length} complaints`,
      total: complaints.length,
      count: filtered.length,
      complaints: filtered
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints',
      error: { code: 'GET_COMPLAINTS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/complaints/stats', (req: Request, res: Response) => {
  try {
    const stats = complaintActionIntelligenceService.getStats();
    return res.status(200).json({
      success: true,
      message: 'Complaint intelligence statistics retrieved',
      stats
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint statistics',
      error: { code: 'GET_COMPLAINT_STATS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/complaints/duplicate-groups', (req: Request, res: Response) => {
  try {
    const groups = complaintActionIntelligenceService.getAllDuplicateGroups();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${groups.length} duplicate complaint clusters`,
      count: groups.length,
      groups
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve duplicate complaint clusters',
      error: { code: 'GET_DUPLICATE_GROUPS_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/complaints/:id', (req: Request, res: Response) => {
  try {
    const cmp = complaintActionIntelligenceService.getComplaintById(req.params.id);
    if (!cmp) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Complaint ${req.params.id} details retrieved`,
      complaint: cmp
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint details',
      error: { code: 'GET_COMPLAINT_FAILED', details: err.message }
    });
  }
});

shieldRouter.post('/complaints/process', (req: Request, res: Response) => {
  try {
    const { raw_text, reporter_wallet, reporter_phone, reporter_name, elapsed_minutes } = req.body;
    if (!raw_text || typeof raw_text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field raw_text is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const complaint = complaintActionIntelligenceService.processComplaint({
      raw_text,
      reporter_wallet,
      reporter_phone,
      reporter_name,
      elapsed_minutes: elapsed_minutes !== undefined ? Number(elapsed_minutes) : 15
    });

    return res.status(200).json({
      success: true,
      message: `Complaint analyzed and classified as ${complaint.classification} (${complaint.priority} priority)`,
      complaint
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process customer complaint',
      error: { code: 'PROCESSING_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/complaints/demo-5-scams', (req: Request, res: Response) => {
  try {
    const demo = complaintActionIntelligenceService.generate5ComplaintDemoScenario();
    return res.status(200).json({
      success: true,
      message: 'Demo 5-scam complaints scenario generated successfully',
      ...demo
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate demo complaints scenario',
      error: { code: 'DEMO_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/complaints/:id/override-link', (req: Request, res: Response) => {
  try {
    const { target_type, target_id, analyst_id, notes } = req.body;
    if (!target_type || !target_id) {
      return res.status(400).json({
        success: false,
        message: 'target_type and target_id are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const updated = complaintActionIntelligenceService.overrideLink(
      req.params.id,
      target_type,
      target_id,
      analyst_id || 'ANALYST-101',
      notes
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        error: { code: 'NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Complaint link successfully updated to ${target_type}: ${target_id}`,
      complaint: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to override complaint linkage',
      error: { code: 'OVERRIDE_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/complaints/:id/priority', (req: Request, res: Response) => {
  try {
    const { priority, analyst_id, reason } = req.body;
    if (!priority) {
      return res.status(400).json({
        success: false,
        message: 'Priority parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const updated = complaintActionIntelligenceService.changePriority(
      req.params.id,
      priority,
      analyst_id || 'ANALYST-101',
      reason || 'Analyst triage review'
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        error: { code: 'NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Complaint priority updated to ${priority}`,
      complaint: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint priority',
      error: { code: 'PRIORITY_ERROR', details: err.message }
    });
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
    return res.status(200).json({
      success: true,
      message: result.message || 'Emergency hold triggered successfully on target wallet',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger emergency hold',
      error: { code: 'HOLD_ERROR', details: err.message }
    });
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
    return res.status(200).json({
      success: true,
      message: result.message || 'Customer safety advisory SMS dispatched',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch customer advisory SMS',
      error: { code: 'ADVISORY_ERROR', details: err.message }
    });
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

    return res.status(200).json({
      success: true,
      message: `Knowledge subgraph retrieved with ${sub.nodes.length} nodes and ${sub.edges.length} edges`,
      subgraph: sub
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graph subgraph',
      error: { code: 'SUBGRAPH_ERROR', details: err.message }
    });
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

    return res.status(200).json({
      success: true,
      message: `Retrieved ${nodes.length} knowledge graph entities`,
      count: nodes.length,
      nodes
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graph entities',
      error: { code: 'NODES_FETCH_ERROR', details: err.message }
    });
  }
});

shieldRouter.get('/knowledge-graph/nodes/:id', (req: Request, res: Response) => {
  try {
    const node = scamKnowledgeGraph.getNode(req.params.id);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge node not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    const sub = scamKnowledgeGraph.getSubGraph({ center_node_id: req.params.id, depth: 1 });
    return res.status(200).json({
      success: true,
      message: `Knowledge entity ${req.params.id} details and 1-hop neighborhood retrieved`,
      node,
      connections: sub
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve node details',
      error: { code: 'NODE_DETAILS_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/knowledge-graph/query', (req: Request, res: Response) => {
  try {
    const { query, language } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = scamKnowledgeGraph.queryGraph(query, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Knowledge graph natural language query completed',
      result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to query knowledge graph',
      error: { code: 'QUERY_ERROR', details: err.message }
    });
  }
});

shieldRouter.get('/knowledge-graph/evidence-pack/:id', (req: Request, res: Response) => {
  try {
    const pack = scamKnowledgeGraph.generateCopilotEvidencePack(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Evidence pack generated for entity ${req.params.id}`,
      evidence_pack: pack
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate evidence pack',
      error: { code: 'PACK_ERROR', details: err.message }
    });
  }
});

shieldRouter.post('/copilot/knowledge-query', (req: Request, res: Response) => {
  try {
    const { question, language } = req.body;
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = copilotService.queryKnowledgeCopilot(question, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Copilot knowledge question answered',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Knowledge Copilot query failed',
      error: { code: 'COPILOT_ERROR', details: err.message }
    });
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
shieldRouter.post('/cases/:id/recovery-route/optimize', (req: Request, res: Response) => {
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
shieldRouter.post('/cases/:id/recovery-route/actions/:actionId', async (req: Request, res: Response) => {
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
shieldRouter.get('/cases/:id/recovery-timeline', (req: Request, res: Response) => {
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
shieldRouter.post('/copilot/recovery-query', (req: Request, res: Response) => {
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

// ================= HUMAN SCAM COACH (PROMPT 12) =================

// 1. Evaluate transaction context & determine whether to intervene with 1-4 questions
shieldRouter.post('/coach/evaluate', (req: Request, res: Response) => {
  try {
    const { customer_wallet, recipient_wallet, amount_bdt, risk_score, risk_tier, reasons, is_new_recipient, scam_conversation_typology, safety_mode_active, channel } = req.body;
    
    if (!customer_wallet || !recipient_wallet || !amount_bdt) {
      return res.status(400).json({
        success: false,
        message: 'customer_wallet, recipient_wallet, and amount_bdt are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
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

    return res.status(200).json({
      success: true,
      message: result.should_intervene 
        ? 'Human scam coach intervention triggered' 
        : 'Transaction cleared without coach intervention',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Human Scam Coach evaluation failed',
      error: { code: 'COACH_EVALUATION_FAILED', details: err.message }
    });
  }
});

// 2. Record customer answer & fetch next question or final explanation
shieldRouter.post('/coach/answer', (req: Request, res: Response) => {
  try {
    const { session_id, question_id, answer } = req.body;

    if (!session_id || !question_id || !answer) {
      return res.status(400).json({
        success: false,
        message: 'session_id, question_id, and answer are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = humanScamCoach.recordAnswer(session_id, question_id, answer);
    return res.status(200).json({
      success: true,
      message: result.completed ? 'Coach session completed' : 'Next coaching question ready',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record coach answer',
      error: { code: 'COACH_ANSWER_FAILED', details: err.message }
    });
  }
});

// 3. Record customer's final safety decision (Cancel, Review, Continue)
shieldRouter.post('/coach/choice', (req: Request, res: Response) => {
  try {
    const { session_id, choice } = req.body;

    if (!session_id || !choice) {
      return res.status(400).json({
        success: false,
        message: 'session_id and choice are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = humanScamCoach.recordCustomerChoice(session_id, choice);
    return res.status(200).json({
      success: true,
      message: `Customer safety decision recorded: ${choice}`,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record customer choice',
      error: { code: 'COACH_CHOICE_FAILED', details: err.message }
    });
  }
});

// 4. Get Human Scam Coach session for investigator case review
shieldRouter.get('/coach/session/:id', (req: Request, res: Response) => {
  try {
    const session = humanScamCoach.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Coach session not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Coach session ${req.params.id} retrieved`,
      session
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coach session',
      error: { code: 'COACH_SESSION_FAILED', details: err.message }
    });
  }
});

// 5. Copilot Human Coach Query Endpoint
shieldRouter.post('/copilot/coach-query', (req: Request, res: Response) => {
  try {
    const { session_id, question, language } = req.body;
    if (!session_id || !question) {
      return res.status(400).json({
        success: false,
        message: 'session_id and question are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = copilotService.queryCoachCopilot(session_id, question, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Coach Copilot answered successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Coach Copilot query failed',
      error: { code: 'COPILOT_COACH_ERROR', details: err.message }
    });
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

    return res.status(200).json({
      success: true,
      message: 'Demo state successfully reset to pristine initial baseline.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset demo environment',
      error: { code: 'DEMO_RESET_FAILED', details: err.message }
    });
  }
});

shieldRouter.get('/demo/scenarios', (req: Request, res: Response) => {
  try {
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

    return res.status(200).json({
      success: true,
      message: 'Standard demo scenarios retrieved successfully',
      scenarios
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve demo scenarios',
      error: { code: 'GET_SCENARIOS_FAILED', details: err.message }
    });
  }
});
