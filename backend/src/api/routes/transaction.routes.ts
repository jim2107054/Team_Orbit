import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { featureStore } from '../../services/feature-store.js';
import { riskEngine } from '../../services/risk-engine.js';
import { humanScamCoach } from '../../services/human-scam-coach.js';
import { customerSafetyModeService } from '../../services/safety-mode-service.js';
import { channelRiskService } from '../../services/channel-risk-service.js';
import { auditService } from '../../services/audit-service.js';
import { repository } from '../../db/repository.js';
import { BANGLA_TEMPLATES } from '../../core/constants.js';
import { AlertCase } from '../../core/types.js';

export const transactionRouter = Router();

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

transactionRouter.post('/score/transaction', async (req: Request, res: Response) => {
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

    const isSafetyMode = customerSafetyModeService.isSafetyModeActive(txn.sender_wallet);
    const ringProximityRisk = txn.receiver_wallet.includes('091177') ? 0.90 : 0.05;
    const coachSignals = (context as any)?.human_coach_signals;
    const evaluation = riskEngine.evaluateRisk(features, ringProximityRisk, isSafetyMode, coachSignals);

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

    const generatedTxnId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnStatus = evaluation.action_recommended === 'BLOCK' ? 'BLOCKED'
      : evaluation.action_recommended === 'AUTO_HOLD' || evaluation.action_recommended === 'STEP_UP_CHALLENGE' ? 'HOLD_PENDING'
      : 'SUCCESS';

    await repository.insertTransaction({
      txn_id: generatedTxnId,
      ts: txnTs,
      sender_wallet: txn.sender_wallet,
      receiver_wallet: txn.receiver_wallet,
      type: txn.type || 'P2P_SEND',
      amount_bdt: txn.amount_bdt,
      channel: channelType,
      device_id: txn.device_id,
      geo_cell: 'GEO-DHAKA-CENTRAL',
      fee_bdt: txn.amount_bdt > 1000 ? 5 : 0,
      status: txnStatus,
      label_fraud: evaluation.risk_tier === 'T3',
      typology_id: evaluation.reasons[0]?.code,
      created_at: txnTs
    });

    let analystCaseId: string | undefined;
    if (evaluation.risk_tier === 'T2' || evaluation.risk_tier === 'T3') {
      analystCaseId = `CASE-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const newCase: AlertCase = {
        case_id: analystCaseId,
        txn_id: generatedTxnId,
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

    await auditService.logAction('RISK_API', 'SCORE_TXN', reqId, {
      score: evaluation.risk_score,
      tier: evaluation.risk_tier,
      action: evaluation.action_recommended,
      txn_id: generatedTxnId
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

transactionRouter.post('/interventions', async (req: Request, res: Response) => {
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
