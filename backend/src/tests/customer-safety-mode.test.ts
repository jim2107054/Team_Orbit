import { describe, it, expect } from 'vitest';
import { customerSafetyModeService } from '../services/safety-mode-service.js';
import { riskEngine } from '../services/risk-engine.js';
import { CalculatedFeatures } from '../core/types.js';

describe('Customer Safety Mode Service & Policy Engine Suite', () => {
  const testWallet = 'W-TEST-SAFETY-01';

  it('allows customer to voluntarily activate Safety Mode and transition to PROTECTED state', async () => {
    const res = await customerSafetyModeService.activateSafetyMode(
      testWallet,
      'SUSPICIOUS_CALL',
      120,
      'CUSTOMER_APP'
    );

    expect(res.success).toBe(true);
    expect(res.record.state).toBe('PROTECTED');
    expect(res.record.is_expired).toBe(false);
    expect(res.record.duration_minutes).toBe(120);
    expect(res.record.reason).toBe('SUSPICIOUS_CALL');
    expect(res.record.reason_label_bn).toContain('সন্দেহজনক');
    expect(res.record.protections_enabled.length).toBeGreaterThan(0);
  });

  it('modifies policy engine thresholds dynamically without altering ML raw predictions', () => {
    const thresholdsNormal = customerSafetyModeService.getPolicyThresholds('W-UNKNOWN-NORMAL');
    expect(thresholdsNormal.isProtected).toBe(false);
    expect(thresholdsNormal.pauseVerifyThreshold).toBe(0.60);
    expect(thresholdsNormal.holdAssistThreshold).toBe(0.85);

    const thresholdsProtected = customerSafetyModeService.getPolicyThresholds(testWallet);
    expect(thresholdsProtected.isProtected).toBe(true);
    expect(thresholdsProtected.pauseVerifyThreshold).toBe(0.40);
    expect(thresholdsProtected.holdAssistThreshold).toBe(0.70);

    // Test transaction evaluation with moderate risk (e.g. 0.48 score)
    const mockFeatures: any = {
      user_segment: 'salaried',
      amount_zscore_user: 1.2,
      velocity_1h_user: 1,
      velocity_24h_user: 2,
      balance_drain_ratio: 0.3,
      is_new_recipient: true,
      hops_to_known_ring: 5,
      device_is_new: false,
      is_night_time: false,
      recipient_fan_in_1h: 1,
      recipient_pass_through_ratio: 0.1,
      recipient_report_count: 0,
      ato_composite_score: 0.1,
      mins_since_pin_reset: null,
      scam_check_session_flag: false,
      channel_type: 'APP',
      device_capability: 'SMARTPHONE',
      network_context: 'MOBILE_DATA',
      scam_conversation_context_score: 0.45
    };

    // Under Normal mode:
    const normalEval = riskEngine.evaluateRisk(mockFeatures, 0.05, false);
    // Under Safety Mode:
    const protectedEval = riskEngine.evaluateRisk(mockFeatures, 0.05, true);

    // Raw ML score remains consistent
    expect(protectedEval.risk_score).toBe(normalEval.risk_score);

    // Policy Tier & Action elevates to PAUSE_VERIFY with RC16 reason code
    expect(protectedEval.action_recommended).toBe('PAUSE_VERIFY');
    expect(protectedEval.reasons.some(r => r.code === 'RC16')).toBe(true);
    expect(protectedEval.rule_trace.some(r => r.rule === 'SAFETY_MODE_PROTECTED_POLICY_THRESHOLDS')).toBe(true);
  });

  it('allows extending the active Safety Mode duration', async () => {
    const extendRes = await customerSafetyModeService.extendSafetyMode(testWallet, 60);
    expect(extendRes.success).toBe(true);
    expect(extendRes.record.duration_minutes).toBe(180);
    expect(extendRes.record.remaining_seconds).toBeGreaterThan(120 * 60);
  });

  it('requires step-up verification to disable Safety Mode (Reversibility)', async () => {
    // 1. Invalid step-up PIN fails
    const invalidRes = await customerSafetyModeService.disableSafetyMode(testWallet, '9999');
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.record.state).toBe('PROTECTED');

    // 2. Valid step-up PIN succeeds and reverts to NORMAL
    const validRes = await customerSafetyModeService.disableSafetyMode(testWallet, '1234');
    expect(validRes.success).toBe(true);
    expect(validRes.record.state).toBe('NORMAL');
    expect(validRes.record.is_expired).toBe(true);
  });

  it('records tamper-evident audit logs for activation, extension, and disable events', () => {
    const audits = customerSafetyModeService.getAuditHistory(testWallet);
    expect(audits.length).toBeGreaterThanOrEqual(3);

    const eventTypes = audits.map(a => a.event_type);
    expect(eventTypes).toContain('ACTIVATION');
    expect(eventTypes).toContain('EXTENSION');
    expect(eventTypes).toContain('DISABLE');
  });

  it('auto-expires without permanent lockouts when timer elapses', async () => {
    const autoExpireWallet = 'W-TEST-AUTO-EXPIRE';
    await customerSafetyModeService.activateSafetyMode(autoExpireWallet, 'OTHER', 1);

    // Manually force expiry timestamp to past
    const record = customerSafetyModeService.getSafetyMode(autoExpireWallet);
    record.expires_at = new Date(Date.now() - 10000).toISOString();

    // Querying status triggers auto-expiry check
    const status = customerSafetyModeService.getSafetyMode(autoExpireWallet);
    expect(status.state).toBe('NORMAL');
    expect(status.is_expired).toBe(true);
    expect(status.remaining_seconds).toBe(0);
  });
});
