import { Router, Request, Response } from 'express';
import { customerSafetyModeService } from '../../services/safety-mode-service.js';
import { auditService } from '../../services/audit-service.js';
import { seedInvestigationEvidenceLedger, resolveInvestigationScenarios } from '../../generator/investigation-evidence-ledger.js';

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

// ================= DEMO: INVESTIGATION EVIDENCE LEDGER =================
/**
 * Refresh the synthetic investigation evidence ledger so the golden-hour scenario
 * sits a few minutes in the past again. Idempotent; it never deletes existing data.
 */
demoRouter.post('/demo/investigation-ledger/seed', async (req: Request, res: Response) => {
  try {
    const referenceTs = typeof req.body?.reference_ts === 'string' ? req.body.reference_ts : undefined;
    const result = await seedInvestigationEvidenceLedger(referenceTs);

    await auditService.logAction(
      'SYSTEM_OPERATOR',
      'DEMO_INVESTIGATION_LEDGER_SEEDED',
      'INVESTIGATION_LEDGER',
      { reference_ts: result.reference_ts, transactions_written: result.transactions_written }
    );

    return res.status(200).json({
      success: true,
      message: `Investigation evidence ledger refreshed: ${result.transactions_written} synthetic transactions across ${result.scenarios.length} scenarios`,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to seed investigation evidence ledger',
      error: { code: 'INVESTIGATION_LEDGER_SEED_FAILED', details: err.message }
    });
  }
});

demoRouter.get('/demo/investigation-scenarios', (_req: Request, res: Response) => {
  try {
    // Resolved against now, so the suggested reported_at values match the timestamps
    // the ledger seeder most recently wrote.
    const scenarios = resolveInvestigationScenarios();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${scenarios.length} evidence-driven investigation demo scenarios`,
      count: scenarios.length,
      scenarios,
      sample_complaints: [
        {
          scenario_id: 'INV_SCENARIO_A_CAMPAIGN_LINKED',
          language: 'bn',
          reporter_wallet: 'W-SYN-004512',
          complaint:
            'উপায় কাস্টমার কেয়ার পরিচয়ে একজন ফোন করে বলল আমার অ্যাকাউন্ট বন্ধ হয়ে যাবে, ওটিপি চাইল। ' +
            'এরপর W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, মাত্র ১২ মিনিট আগে। দ্রুত সাহায্য করুন।'
        },
        {
          scenario_id: 'INV_SCENARIO_B_WRONG_TRANSFER',
          language: 'banglish',
          reporter_wallet: 'W-SYN-001001',
          complaint: 'vai amar 5k taka vul number e chole gese'
        },
        {
          scenario_id: 'INV_SCENARIO_C_INCONSISTENT',
          language: 'en',
          reporter_wallet: 'W-SYN-001003',
          complaint: 'I sent 5000 taka by mistake earlier today, please check.'
        },
        {
          scenario_id: 'INV_SCENARIO_D_AMBIGUOUS',
          language: 'en',
          reporter_wallet: 'W-SYN-001005',
          complaint: 'I sent 3000 taka and want it back.'
        },
        {
          scenario_id: 'INV_SCENARIO_E_NO_HISTORY',
          language: 'en',
          reporter_wallet: 'W-SYN-001015',
          complaint: 'I lost money yesterday.'
        }
      ]
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve investigation demo scenarios',
      error: { code: 'GET_INVESTIGATION_SCENARIOS_FAILED', details: err.message }
    });
  }
});
