import { describe, it, expect } from 'vitest';
import { agentGuard } from '../services/agent-guard.js';

describe('Agent Guard — Liquidity vs Fraud Separation Suite', () => {
  it('1. Keeps operational pressure and fraud risk scores strictly independent', () => {
    const peer = agentGuard.getRegionalPeerBenchmark('Dhaka', 'tier_1', 'Wholesale Hub');

    // High volume liquidity signals with ZERO fraud signals
    const liquidity = {
      cash_in_volume_bdt: 2000000,
      cash_out_volume_bdt: 2000000,
      total_volume_bdt: 4000000,
      hourly_volume_peak: 60,
      inventory_balance_pressure: 0.50,
      customer_count: 500,
      repeat_customer_rate: 0.80,
      regional_peer_deviation: 10.0, // 10x volume
      business_hours_ratio: 0.98,
      seasonal_volume_change: 3.0
    };

    const cleanFraud = {
      shared_device_count: 0,
      suspicious_wallet_connections: 0,
      rapid_in_out_ratio: 0.02,
      ring_membership: [],
      structured_amounts_count: 0,
      unusual_counterparties_rate: 0.02,
      complaint_rate: 0,
      pass_through_behavior_ratio: 0.05
    };

    const opScore = agentGuard.calculateOperationalPressureScore(liquidity, peer);
    const fraudScore = agentGuard.calculateFraudRiskScore(cleanFraud, peer);

    // Operational score should be high due to massive throughput
    expect(opScore).toBeGreaterThan(0.70);
    // Fraud score MUST remain clean (low) despite 10x volume
    expect(fraudScore).toBeLessThan(0.15);
  });

  it('2. Classifies Legitimate Super-Agent (Agent A) as HIGH_ACTIVITY with low fraud risk', () => {
    const agentA = agentGuard.getAgentProfile('AGT-DH-8821');
    expect(agentA).not.toBeNull();
    expect(agentA?.classification).toBe('HIGH_ACTIVITY');
    expect(agentA?.operational_pressure_score).toBeGreaterThan(0.60);
    expect(agentA?.fraud_risk_score).toBeLessThan(0.15);
    expect(agentA?.liquidity_signals.regional_peer_deviation).toBeGreaterThanOrEqual(8.0);
    expect(agentA?.fraud_signals.shared_device_count).toBe(0);
  });

  it('3. Classifies Complicit Mule Agent (Agent B) as FRAUD_REVIEW despite moderate volume', () => {
    const agentB = agentGuard.getAgentProfile('AGT-DH-4412');
    expect(agentB).not.toBeNull();
    expect(agentB?.classification).toBe('FRAUD_REVIEW');
    expect(agentB?.fraud_risk_score).toBeGreaterThan(0.85);
    expect(agentB?.fraud_signals.shared_device_count).toBeGreaterThanOrEqual(5);
    expect(agentB?.fraud_signals.ring_membership).toContain('RING-003');
    expect(agentB?.fraud_signals.rapid_in_out_ratio).toBeGreaterThan(0.80);
  });

  it('4. Classifies Salary Day Float Strain (Agent C) as LIQUIDITY_PRESSURE with low fraud score', () => {
    const agentC = agentGuard.getAgentProfile('AGT-GZ-1092');
    expect(agentC).not.toBeNull();
    expect(agentC?.classification).toBe('LIQUIDITY_PRESSURE');
    expect(agentC?.operational_pressure_score).toBeGreaterThan(0.80);
    expect(agentC?.fraud_risk_score).toBeLessThan(0.10);
    expect(agentC?.liquidity_signals.inventory_balance_pressure).toBeGreaterThanOrEqual(0.90);
  });


  it('5. Generates peer benchmark matrix for comparison against same region and size tier', () => {
    const peerDhakaT1 = agentGuard.getRegionalPeerBenchmark('Dhaka', 'tier_1', 'Wholesale Market Hub');
    expect(peerDhakaT1.size_tier).toBe('tier_1');
    expect(peerDhakaT1.peer_avg_daily_volume_bdt).toBe(850000);
    expect(peerDhakaT1.peer_avg_customer_count).toBe(210);

    const peerCtgT3 = agentGuard.getRegionalPeerBenchmark('Chittagong', 'tier_3', 'Retail');
    expect(peerCtgT3.size_tier).toBe('tier_3');
    expect(peerCtgT3.peer_avg_daily_volume_bdt).toBe(95000);
  });

  it('6. Allows analyst to execute liquidity float rebalances and monitoring actions with audit trail', () => {
    const res = agentGuard.executeAnalystAction(
      'AGT-GZ-1092',
      'REQUEST_FLOAT_REBALANCE',
      'ANALYST-101',
      'Dispatched ৳500k liquidity buffer for month-end factory salary'
    );
    expect(res.success).toBe(true);
    expect(res.profile?.recommended_actions.some(a => a.includes('Float rebalance request'))).toBe(true);
  });
});
