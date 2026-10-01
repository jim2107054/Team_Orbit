import { describe, it, expect } from 'vitest';
import { temporalRiskIntelligence } from '../services/temporal-risk-intelligence.js';
import { featureStore } from '../services/feature-store.js';
import { riskEngine } from '../services/risk-engine.js';
import { repository } from '../db/repository.js';
import { Customer, Wallet } from '../core/types.js';

describe('Bangladesh Temporal Risk Intelligence Suite', () => {
  it('correctly maps Bangladesh synthetic calendar events across temporal windows', () => {
    // Ramadan
    const ramadanPeriod = temporalRiskIntelligence.getPeriodForTimestamp('2026-03-05T14:00:00Z');
    expect(ramadanPeriod.period_type).toBe('RAMADAN');
    expect(ramadanPeriod.is_festival).toBe(true);

    // Eid-ul-Fitr
    const eidFitrPeriod = temporalRiskIntelligence.getPeriodForTimestamp('2026-03-22T10:30:00Z');
    expect(eidFitrPeriod.period_type).toBe('EID_FITR');
    expect(eidFitrPeriod.is_festival).toBe(true);

    // Pohela Boishakh
    const boishakhPeriod = temporalRiskIntelligence.getPeriodForTimestamp('2026-04-14T09:00:00Z');
    expect(boishakhPeriod.period_type).toBe('POHELA_BOISHAKH');
    expect(boishakhPeriod.is_festival).toBe(true);

    // Salary Window (1st-5th of any month)
    const salaryPeriod = temporalRiskIntelligence.getPeriodForTimestamp('2026-08-02T11:00:00Z');
    expect(salaryPeriod.period_type).toBe('SALARY_DAY');
    expect(salaryPeriod.is_salary_window).toBe(true);

    // Month End (25th-31st)
    const monthEndPeriod = temporalRiskIntelligence.getPeriodForTimestamp('2026-08-28T16:00:00Z');
    expect(monthEndPeriod.period_type).toBe('MONTH_END');

    // Normal Weekday
    const normalPeriod = temporalRiskIntelligence.getPeriodForTimestamp('2026-08-18T12:00:00Z');
    expect(normalPeriod.period_type).toBe('NORMAL_DAY');
  });

  it('computes segment-specific expected multipliers without temporal leakage', () => {
    // Merchant during Eid-ul-Fitr
    const merchantCtx = temporalRiskIntelligence.getTemporalContext('2026-03-22T10:00:00Z', 'merchant_owner');
    expect(merchantCtx.expected_amount_multiplier).toBeGreaterThanOrEqual(3.0);
    expect(merchantCtx.expected_velocity_multiplier).toBeGreaterThanOrEqual(4.0);

    // Student during Eid-ul-Fitr (lower multiplier)
    const studentCtx = temporalRiskIntelligence.getTemporalContext('2026-03-22T10:00:00Z', 'student');
    expect(studentCtx.expected_amount_multiplier).toBeLessThan(merchantCtx.expected_amount_multiplier);

    // Farmer during Eid-ul-Adha (high cattle market sales multiplier)
    const farmerAdhaCtx = temporalRiskIntelligence.getTemporalContext('2026-05-28T10:00:00Z', 'farmer');
    expect(farmerAdhaCtx.expected_amount_multiplier).toBeGreaterThanOrEqual(4.0);
  });

  it('prevents false positive flags for legitimate seasonal surges (Customer A Merchant Demo)', () => {
    // Merchant sending ৳25,000 to a new supplier during Eid shopping surge (Baseline avg ৳8,000)
    const temporalFeats = temporalRiskIntelligence.computeTemporalFeatures(
      25000,
      8000,
      2000,
      3,
      5,
      'merchant_owner',
      '2026-03-22T14:00:00Z' // Eid-ul-Fitr
    );

    expect(temporalFeats.temporal_behavior_similarity).toBeGreaterThanOrEqual(0.85);
    expect(temporalFeats.seasonal_amount_zscore).toBeLessThan(1.5);

    // Simulated features for merchant customer sending to a supplier
    const mockFeatures: any = {
      amount_bdt: 25000,
      amount_zscore_user: 8.5, // Unadjusted z-score is very high
      is_night_time: false,
      is_new_recipient: true,  // New supplier
      balance_drain_ratio: 0.40,
      device_is_new: false,
      mins_since_pin_reset: null,
      mins_since_sim_swap: null,
      ato_composite_score: 0.05,
      recipient_fan_in_1h: 2,
      recipient_pass_through_ratio: 0.10,
      recipient_report_count: 0,
      hops_to_known_ring: 5,
      scam_check_session_flag: false,
      scam_conversation_context_score: 0.0,
      temporal_features: temporalFeats
    };

    const evaluation = riskEngine.evaluateRisk(mockFeatures, 0.05);

    // Temporal intelligence prevents false positive penalty
    expect(evaluation.action_recommended).toBe('ALLOW');
    expect(evaluation.risk_tier).toBe('T0');
    expect(evaluation.rule_trace.some(r => r.rule === 'TEMPORAL_SEASONAL_BASELINE_ALIGNMENT')).toBe(true);
    expect(evaluation.reasons.some(r => r.code === 'RC12')).toBe(true);
    expect(evaluation.model_scores.temporal_adjusted_score).toBeLessThan(evaluation.model_scores.baseline_unadjusted_score);
  });

  it('retains high risk and catches fraud during festival periods (Customer B ATO & Mule Ring Demo)', () => {
    // Fraudster attempting ৳25,000 drain during Eid with new device and mule ring link at night
    const temporalFeats = temporalRiskIntelligence.computeTemporalFeatures(
      25000,
      3000,
      1000,
      1,
      1,
      'salaried',
      '2026-03-22T23:45:00Z' // Night time during Eid
    );

    const mockFraudFeatures: any = {
      amount_bdt: 25000,
      amount_zscore_user: 22.0,
      is_night_time: true,
      is_new_recipient: true,
      balance_drain_ratio: 0.95,
      device_is_new: true,
      mins_since_pin_reset: 45,
      mins_since_sim_swap: 120,
      ato_composite_score: 0.85,
      recipient_fan_in_1h: 8,
      recipient_pass_through_ratio: 0.90,
      recipient_report_count: 2,
      hops_to_known_ring: 1,
      scam_check_session_flag: false,
      scam_conversation_context_score: 0.0,
      temporal_features: temporalFeats
    };

    const evaluation = riskEngine.evaluateRisk(mockFraudFeatures, 0.90);

    // High risk is strictly preserved
    expect(evaluation.action_recommended).toBe('HOLD_ASSIST');
    expect(evaluation.risk_tier).toBe('T3');
    expect(evaluation.risk_score).toBeGreaterThanOrEqual(0.80);
    expect(evaluation.reasons.some(r => r.code === 'RC03' || r.code === 'RC04')).toBe(true);
  });
});
