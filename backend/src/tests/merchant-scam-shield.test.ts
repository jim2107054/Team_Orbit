import { describe, it, expect } from 'vitest';
import { merchantScamShield } from '../services/merchant-scam-shield.js';

describe('Merchant / QR Scam Shield Test Suite', () => {

  it('detects suspicious newly created merchant receiving high-volume 100-customer fan-in with rapid pass-through drain', () => {
    // Evaluating payment of ৳18,500 to Apex Digital Task QR (M-SYN-7001)
    const result = merchantScamShield.evaluateMerchantPayment(
      'W-SYN-004512',
      'QR-UPAY-M7001',
      18500
    );

    expect(result.merchant.merchant_id).toBe('M-SYN-7001');
    expect(result.merchant.merchant_age).toBeLessThanOrEqual(7); // 4 days old
    expect(result.merchant.unique_customer_count).toBe(100);
    expect(result.merchant.cashout_ratio).toBeGreaterThanOrEqual(0.90); // 94% drain
    expect(result.trust_badge).toBe('REVIEW');
    expect(result.risk_score).toBeGreaterThanOrEqual(0.75);
    expect(result.action_recommended).toBe('PAUSE_VERIFY');
    expect(result.warning_required).toBe(true);
    expect(result.warning_message_bn).toContain('এই মার্চেন্টটি নতুন এবং সাম্প্রতিক লেনদেনের ধরন অস্বাভাবিক');
    
    // Check Reason Codes
    const reasonCodes = result.reasons.map(r => r.code);
    expect(reasonCodes).toContain('RC_MERCH_01'); // New surge
    expect(reasonCodes).toContain('RC_MERCH_02'); // 100 customer fan-in
    expect(reasonCodes).toContain('RC_MERCH_03'); // 94% rapid drain
    expect(reasonCodes).toContain('RC_MERCH_04'); // Ring-12 hub link
  });

  it('allows legitimate established grocery merchant without false positive friction', () => {
    // Paying ৳850 to Shwapno Super Shop (M-SYN-1002)
    const result = merchantScamShield.evaluateMerchantPayment(
      'W-SYN-004512',
      'M-SYN-1002',
      850
    );

    expect(result.merchant.name).toContain('Shwapno Daily');
    expect(result.merchant.merchant_age).toBeGreaterThan(365);
    expect(result.trust_badge).toBe('NORMAL');
    expect(result.risk_score).toBeLessThan(0.10);
    expect(result.action_recommended).toBe('ALLOW');
    expect(result.warning_required).toBe(false);
  });

  it('generates merchant graph network connecting customers, merchant QR, downstream mules, and Ring-12 Hub', () => {
    const graph = merchantScamShield.getMerchantGraph('M-SYN-7001');

    expect(graph.nodes.length).toBeGreaterThanOrEqual(6);
    expect(graph.edges.length).toBeGreaterThanOrEqual(5);

    const nodeTypes = new Set(graph.nodes.map(n => n.type));
    expect(nodeTypes.has('merchant')).toBe(true);
    expect(nodeTypes.has('wallet')).toBe(true);
    expect(nodeTypes.has('ring')).toBe(true);
    expect(nodeTypes.has('agent')).toBe(true);

    const ringEdge = graph.edges.find(e => e.target === 'RING-2026-0012');
    expect(ringEdge).toBeDefined();
  });

  it('demonstrates measurable model lift over transaction-only baseline', () => {
    const result = merchantScamShield.evaluateMerchantPayment(
      'W-SYN-004512',
      'QR-UPAY-M7001',
      18500
    );

    // Transaction only score was ~0.45 (amount alone), while behavioral merchant score is 0.91
    expect(result.evaluation_comparison.behavioral_merchant_score).toBeGreaterThan(result.evaluation_comparison.transaction_only_score);
    expect(result.evaluation_comparison.lift).toBeGreaterThan(1.5);
  });

});
