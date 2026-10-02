import { Router, Request, Response } from 'express';
import { customerSafetyModeService } from '../../services/safety-mode-service.js';
import { auditService } from '../../services/audit-service.js';

export const demoRouter = Router();

// ================= DEMO CONTROLS: RESET & SCENARIOS =================
demoRouter.post('/demo/reset', (req: Request, res: Response) => {
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

demoRouter.get('/demo/scenarios', (req: Request, res: Response) => {
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
