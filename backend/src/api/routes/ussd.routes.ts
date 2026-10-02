import { Router, Request, Response } from 'express';
import { featureStore } from '../../services/feature-store.js';
import { riskEngine } from '../../services/risk-engine.js';
import { channelRiskService } from '../../services/channel-risk-service.js';

export const ussdRouter = Router();

// ================= USSD / FEATURE-PHONE SIMULATION API =================
ussdRouter.post('/ussd/session', async (req: Request, res: Response) => {
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
