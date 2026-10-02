import { describe, it, expect, beforeEach } from 'vitest';
import { HumanScamCoachService } from '../services/human-scam-coach.js';
import { riskEngine } from '../services/risk-engine.js';
import { copilotService } from '../services/copilot-service.js';

describe('Prompt 12: Human Scam Coach (Contextual Human-in-the-Loop Safety Layer)', () => {
  let coach: HumanScamCoachService;

  beforeEach(() => {
    coach = new HumanScamCoachService();
  });

  // 1. Normal transfer to known recipient
  it('1. should NOT intervene with questions for low-risk transactions to known recipients', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-001122',
      amount_bdt: 1200,
      risk_score: 0.12,
      risk_tier: 'T0',
      is_new_recipient: false
    });

    expect(evalRes.should_intervene).toBe(false);
    expect(evalRes.total_questions_count).toBe(0);
    expect(evalRes.questions.length).toBe(0);
  });

  // 2. New recipient but moderate risk
  it('2. should select 1-2 targeted questions for moderate risk first-time sends', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 18500,
      risk_score: 0.65,
      risk_tier: 'T2',
      reasons: ['RC01'],
      is_new_recipient: true
    });

    expect(evalRes.should_intervene).toBe(true);
    expect(evalRes.total_questions_count).toBeGreaterThanOrEqual(1);
    expect(evalRes.total_questions_count).toBeLessThanOrEqual(3);
    expect(evalRes.questions[0].id).toBe('Q1_RECENT_CONTACT');
  });

  // 3. Fake Customer Care Impersonation Scam
  it('3. should select authority impersonation and OTP questions when customer care scam context is flagged', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 12000,
      risk_score: 0.85,
      risk_tier: 'T3',
      scam_conversation_typology: 'FAKE_CUSTOMER_CARE',
      is_new_recipient: true
    });

    expect(evalRes.should_intervene).toBe(true);
    const questionIds = evalRes.questions.map((q) => q.id);
    expect(questionIds).toContain('Q1_RECENT_CONTACT');
    expect(questionIds).toContain('Q3_AUTHORITY_IMPERSONATION');
    expect(questionIds).toContain('Q2_CREDENTIAL_REQUEST');
  });

  // 4. OTP / Credential Request Signal Transformation & Risk Engine Elevation
  it('4. should extract credential_request signal when customer answers YES to Q2 and elevate risk tier to T3', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 15000,
      risk_score: 0.60,
      is_new_recipient: true
    });

    // Customer answers YES to Q1 and YES to Q2
    coach.recordAnswer(evalRes.session_id, 'Q1_RECENT_CONTACT', 'YES');
    const answer2 = coach.recordAnswer(evalRes.session_id, 'Q2_CREDENTIAL_REQUEST', 'YES');

    expect(answer2.generated_signals.credential_request).toBe(true);
    expect(answer2.generated_signals.recent_social_contact).toBe(true);

    // Pass structured signals to Risk Engine
    const mockFeatures: any = {
      is_new_recipient: true,
      amount_zscore_user: 3.0,
      is_night_time: false,
      balance_drain_ratio: 0.5,
      recipient_report_count: 0,
      ato_composite_score: 0.1,
      hops_to_known_ring: 5
    };
    const riskEval = riskEngine.evaluateRisk(mockFeatures, 0.05, false, answer2.generated_signals);

    expect(riskEval.risk_tier).toBe('T3');
    expect(riskEval.action_recommended).toBe('HOLD_ASSIST');
    expect(riskEval.reasons.some((r) => r.code === 'RC17')).toBe(true);
    expect(riskEval.rule_trace.some((r) => r.rule === 'HUMAN_COACH_CREDENTIAL_REQUEST_CONFIRMED')).toBe(true);
  });

  // 5. Emergency Relative Impersonation Scam
  it('5. should present emergency relative questions for hospital/family impersonation context', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 25000,
      risk_score: 0.78,
      scam_conversation_typology: 'EMERGENCY_IMPERSONATION',
      is_new_recipient: true
    });

    const questionIds = evalRes.questions.map((q) => q.id);
    expect(questionIds).toContain('Q6_EMERGENCY_IMPERSONATION');

    const ans = coach.recordAnswer(evalRes.session_id, 'Q6_EMERGENCY_IMPERSONATION', 'YES');
    expect(ans.generated_signals.emergency_impersonation).toBe(true);
  });

  // 6. Advance Payment / Lottery Prize Scam
  it('6. should present advance fee questions when lottery/prize scam context is flagged', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 8500,
      scam_conversation_typology: 'LOTTERY_PRIZE',
      is_new_recipient: true
    });

    const questionIds = evalRes.questions.map((q) => q.id);
    expect(questionIds).toContain('Q7_ADVANCE_PAYMENT_SCAM');

    const ans = coach.recordAnswer(evalRes.session_id, 'Q7_ADVANCE_PAYMENT_SCAM', 'YES');
    expect(ans.generated_signals.advance_payment_scam).toBe(true);
  });

  // 7. Investment / Task Scheme Scam
  it('7. should present investment profit questions when task fraud context is detected', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 30000,
      scam_conversation_typology: 'INVESTMENT_FRAUD',
      is_new_recipient: true
    });

    const questionIds = evalRes.questions.map((q) => q.id);
    expect(questionIds).toContain('Q8_INVESTMENT_TASK_SCAM');

    const ans = coach.recordAnswer(evalRes.session_id, 'Q8_INVESTMENT_TASK_SCAM', 'YES');
    expect(ans.generated_signals.investment_or_task_scam).toBe(true);
  });

  // 8. "Not Sure" handling (Uncertainty Signal without assuming guilt)
  it('8. should record uncertainty_signal when customer selects Not Sure', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 18500,
      is_new_recipient: true
    });

    const ans = coach.recordAnswer(evalRes.session_id, 'Q1_RECENT_CONTACT', 'NOT_SURE');
    expect(ans.generated_signals.uncertainty_signal).toBe(true);
    expect(ans.generated_signals.recent_social_contact).toBe(false);
  });

  // 9. Adversarial: User answers NO to everything
  it('9. should not erase baseline metadata risk when user answers NO to all questions', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 50000,
      risk_score: 0.75,
      is_new_recipient: true
    });

    coach.recordAnswer(evalRes.session_id, 'Q1_RECENT_CONTACT', 'NO');
    const finalAns = coach.recordAnswer(evalRes.session_id, 'Q2_CREDENTIAL_REQUEST', 'NO');

    expect(finalAns.generated_signals.total_positive_signals).toBe(0);

    // Baseline features still maintain risk in engine
    const mockFeatures: any = {
      is_new_recipient: true,
      amount_zscore_user: 4.5,
      is_night_time: true,
      balance_drain_ratio: 0.9,
      recipient_report_count: 2,
      ato_composite_score: 0.2,
      hops_to_known_ring: 1
    };
    const riskEval = riskEngine.evaluateRisk(mockFeatures, 0.85, false, finalAns.generated_signals);

    // Risk remains high due to ring proximity + anomalous amount
    expect(riskEval.risk_tier).toBe('T3');
  });

  // 10. Adaptive Branching: Answering NO to Q1 reduces friction
  it('10. should prune redundant questions when customer explicitly answers NO to initial contact', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 18500,
      is_new_recipient: true
    });

    expect(evalRes.session_id).toBeDefined();
    const ans1 = coach.recordAnswer(evalRes.session_id, 'Q1_RECENT_CONTACT', 'NO');
    // Session should have pruned remaining questions to a maximum of 2 total
    expect(ans1.session.selected_questions.length).toBeLessThanOrEqual(2);
  });

  // 11. Customer Safety Choices & Audit Persistence
  it('11. should record customer cancellation choice and update session status to CANCELLED', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 18500
    });

    const choiceRes = coach.recordCustomerChoice(evalRes.session_id, 'CANCEL_PAYMENT');
    expect(choiceRes.success).toBe(true);
    expect(choiceRes.session.status).toBe('CANCELLED');
    expect(choiceRes.session.customer_final_choice).toBe('CANCEL_PAYMENT');
  });

  // 12. Investigation Copilot Integration
  it('12. should provide grounded Copilot explanation of customer coach responses without hallucination', () => {
    const evalRes = coach.evaluateIntervention({
      customer_wallet: 'W-SYN-004512',
      recipient_wallet: 'W-SYN-091177',
      amount_bdt: 18500,
      scam_conversation_typology: 'FAKE_CUSTOMER_CARE'
    });

    coach.recordAnswer(evalRes.session_id, 'Q1_RECENT_CONTACT', 'YES');
    coach.recordAnswer(evalRes.session_id, 'Q3_AUTHORITY_IMPERSONATION', 'YES');

    const copilotRes = copilotService.queryCoachCopilot(
      evalRes.session_id,
      'Why did this transaction receive elevated risk?',
      'en'
    );

    expect(copilotRes).toBeDefined();
    expect(copilotRes.answer).toContain('someone contacted them');
    expect(copilotRes.answer).toContain('customer care');
    expect(copilotRes.confidence).toBeGreaterThan(0.9);
    expect(copilotRes.evidence_citations.length).toBeGreaterThan(0);
  });
});
