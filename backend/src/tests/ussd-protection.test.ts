import { describe, it, expect } from 'vitest';
import { channelRiskService } from '../services/channel-risk-service.js';
import { featureStore } from '../services/feature-store.js';
import { riskEngine } from '../services/risk-engine.js';
import { repository } from '../db/repository.js';

describe('USSD / Feature-Phone Protection Layer Suite', () => {
  it('formats low-bandwidth concise Bangla USSD warning within 160 GSM character limit', () => {
    const ussdScreen = channelRiskService.formatUssdWarning(
      'PAUSE_VERIFY',
      18500,
      'W-SYN-091177',
      'RC10'
    );

    expect(ussdScreen.display_text.length).toBeLessThanOrEqual(160);
    expect(ussdScreen.display_text).toContain('upay সতর্কতা');
    expect(ussdScreen.display_text).toContain('1. বাতিল (নিরাপদ)');
    expect(ussdScreen.display_text).toContain('2. চালিয়ে যান');
    expect(ussdScreen.options?.length).toBe(2);
    // Ensure no raw model scores are exposed to customer
    expect(ussdScreen.display_text).not.toContain('risk_score');
    expect(ussdScreen.display_text).not.toContain('0.8');
  });

  it('detects cross-channel hijacking when historical APP user suddenly initiates USSD send to mule wallet', async () => {
    // Simulated account where customer is 100% app user, suddenly transacting on USSD
    const channelFeats = await channelRiskService.extractChannelFeatures(
      'W-SYN-004512',
      'USSD',
      'FEATURE_PHONE',
      'USSD'
    );

    const mockFeatures: any = {
      amount_bdt: 18500,
      amount_zscore_user: 6.5,
      is_night_time: true,
      is_new_recipient: true,
      balance_drain_ratio: 0.90,
      device_is_new: false,
      mins_since_pin_reset: null,
      mins_since_sim_swap: null,
      ato_composite_score: 0.20,
      recipient_fan_in_1h: 6,
      recipient_pass_through_ratio: 0.80,
      recipient_report_count: 1,
      hops_to_known_ring: 1,
      scam_check_session_flag: false,
      scam_conversation_context_score: 0.0,
      temporal_features: {
        seasonal_amount_zscore: 4.5,
        period_adjusted_velocity: 1.0,
        salary_day_deviation: 0.0,
        festival_deviation: 0.0,
        expected_recipient_deviation: 0.0,
        temporal_behavior_similarity: 0.30,
        temporal_context: { period_type: 'NORMAL_DAY', period_name: 'Normal', expected_amount_multiplier: 1.0, expected_velocity_multiplier: 1.0, expected_recipient_entropy: 0.5, confidence: 0.9, is_festival: false, is_salary_window: false }
      },
      channel_features: channelFeats
    };

    const evaluation = riskEngine.evaluateRisk(mockFeatures, 0.90);

    expect(evaluation.risk_tier).toBe('T3');
    expect(evaluation.action_recommended).toBe('HOLD_ASSIST');
    expect(evaluation.reasons.some(r => r.code === 'RC04' || r.code === 'RC01')).toBe(true);
  });

  it('ensures legitimate rural USSD feature phone users are NOT penalized (No Channel Bias)', async () => {
    // Regular rural user transacting normally on USSD
    const channelFeats = {
      channel: 'USSD' as const,
      device_capability: 'FEATURE_PHONE' as const,
      network_context: 'USSD' as const,
      channel_switch_frequency: 1,
      first_time_channel: false, // Regular USSD user
      device_channel_mismatch: false,
      recent_channel_change: false,
      ussd_velocity: 1,
      cross_channel_behavior_change: 0.0, // Zero cross-channel anomaly
      primary_channel_past_30d: 'USSD' as const
    };

    const mockLegitUssdFeatures: any = {
      amount_bdt: 1500,
      amount_zscore_user: 0.4,
      is_night_time: false,
      is_new_recipient: false, // Existing family member
      balance_drain_ratio: 0.20,
      device_is_new: false,
      mins_since_pin_reset: null,
      mins_since_sim_swap: null,
      ato_composite_score: 0.0,
      recipient_fan_in_1h: 1,
      recipient_pass_through_ratio: 0.05,
      recipient_report_count: 0,
      hops_to_known_ring: 5,
      scam_check_session_flag: false,
      scam_conversation_context_score: 0.0,
      temporal_features: {
        seasonal_amount_zscore: 0.3,
        period_adjusted_velocity: 0.8,
        salary_day_deviation: 0.0,
        festival_deviation: 0.0,
        expected_recipient_deviation: 0.0,
        temporal_behavior_similarity: 0.90,
        temporal_context: { period_type: 'NORMAL_DAY', period_name: 'Normal', expected_amount_multiplier: 1.0, expected_velocity_multiplier: 1.0, expected_recipient_entropy: 0.5, confidence: 0.9, is_festival: false, is_salary_window: false }
      },
      channel_features: channelFeats
    };

    const evaluation = riskEngine.evaluateRisk(mockLegitUssdFeatures, 0.0);

    // Fairly allowed without channel discrimination
    expect(evaluation.action_recommended).toBe('ALLOW');
    expect(evaluation.risk_tier).toBe('T0');
    expect(evaluation.risk_score).toBeLessThan(0.30);
  });

  it('persists and audits customer USSD intervention cancellations', async () => {
    const intvRecord = {
      intervention_id: `INTV-TEST-${Date.now()}`,
      txn_id: 'TXN-USSD-99120',
      variant: 'PAUSE_VERIFY_USSD' as const,
      shown_ts: new Date().toISOString(),
      customer_action: 'CANCEL' as const,
      treatment_flag: true,
      channel: 'USSD' as const
    };

    await channelRiskService.logIntervention(intvRecord);

    const pastIntvs = await repository.getCustomerInterventions(10);
    expect(pastIntvs.some(i => i.intervention_id === intvRecord.intervention_id)).toBe(true);
  });
});
