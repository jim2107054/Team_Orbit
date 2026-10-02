import { describe, it, expect } from 'vitest';
import { communityPropagationService } from '../services/community-propagation.js';

describe('Community Scam Propagation Intelligence Test Suite', () => {
  it('calculates multi-day time-based propagation features and detects cluster growth', () => {
    const caseHistory = [
      {
        day: 1,
        count: 4,
        victims: ['W-SYN-101', 'W-SYN-102', 'W-SYN-103', 'W-SYN-104'],
        wallets: ['W-MULE-991'],
        phrases: ['upay kyc verification block'],
        caller_numbers: ['01719988111'],
        geo_cell: 'CELL-SYL-02'
      },
      {
        day: 2,
        count: 22,
        victims: ['W-SYN-105', 'W-SYN-106', 'W-SYN-107', 'W-SYN-108', 'W-SYN-109'],
        wallets: ['W-MULE-991', 'W-MULE-992'],
        phrases: ['upay kyc verification block', 'head office otp'],
        caller_numbers: ['01719988111', '01823344555'],
        geo_cell: 'CELL-SYL-02'
      }
    ];

    const features = communityPropagationService.calculatePropagationFeatures(caseHistory, 0.95);

    expect(features.new_cases_per_day).toBe(22);
    expect(features.growth_rate).toBeGreaterThanOrEqual(5.0);
    expect(features.unique_victims).toBe(9);
    expect(features.common_phrase_rate).toBeGreaterThan(0.85);
    expect(features.common_recipient_rate).toBeGreaterThan(0.50);
    expect(features.time_to_spread).toBe(2);

    const status = communityPropagationService.classifyClusterStatus(features, 'REG-SYL-01');
    expect(['EMERGING_CLUSTER', 'RISING_CLUSTER']).toContain(status);
  });

  it('provides 5-day animation snapshots showing outbreak expanding across coarse regions', () => {
    const snapshots = communityPropagationService.getTimeAnimationSnapshots();
    expect(snapshots.length).toBe(5);

    const d1 = snapshots[0];
    const d5 = snapshots[4];

    expect(d1.day_label).toBe('Day 1');
    expect(d1.total_cases).toBe(7);
    expect(d1.total_exposure_bdt).toBeLessThan(150000);

    expect(d5.day_label).toBe('Day 5 (Current)');
    expect(d5.total_cases).toBe(226);
    expect(d5.total_victims).toBe(213);
    expect(d5.total_exposure_bdt).toBeGreaterThan(4000000);
    expect(d5.regions.length).toBeGreaterThanOrEqual(4);

    // Verify coarse geography only (No exact customer GPS/addresses)
    d5.regions.forEach(reg => {
      expect(reg.coarse_geo_cell).toMatch(/^CELL-[A-Z]{3}-\d{2}$/);
      expect(reg.division).toBeDefined();
    });
  });

  it('generates SCAM_SPREAD_ALERT with campaign linkage and evidence bundle', () => {
    const alerts = communityPropagationService.getSpreadAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    const alert = alerts[0];
    expect(alert.alert_id).toBe('SSA-2026-8801');
    expect(alert.campaign_id).toBe('CAMP-2026-004');
    expect(alert.cluster_status).toBe('RISING_CLUSTER');
    expect(alert.evidence.common_phrases.length).toBeGreaterThan(0);
    expect(alert.evidence.shared_destination_wallets).toContain('W-SYN-091177');
    expect(alert.customer_warning_draft_bn).toContain('ওটিপি বা টাকা পাঠাবেন না');
    expect(alert.customer_warning_draft_en).toContain('Security Alert');
  });

  it('allows analyst actions and handles false cluster neutralization with audit logging', async () => {
    // 1. Analyst reviews and drafts warning
    const reviewRes = await communityPropagationService.recordAnalystAction(
      'SSA-2026-8801',
      'DRAFT_CUSTOMER_WARNING',
      'ANALYST-OPS-99',
      'Targeted SMS warning broadcast dispatched to Sylhet-Dhaka North corridor',
      {
        text_bn: 'সতর্কতা: হেড অফিস পরিচয়ে কোনো কল আসলে পিন বা ওটিপি দেবেন না।',
        text_en: 'Security Alert: Never share PIN or OTP with callers claiming to be Head Office.',
        target_regions: ['CELL-SYL-02', 'CELL-DHK-04']
      }
    );

    expect(reviewRes.success).toBe(true);
    expect(reviewRes.alert?.status).toBe('WARNING_BROADCAST');
    expect(reviewRes.alert?.customer_warning_draft_bn).toContain('পিন বা ওটিপি দেবেন না');

    // 2. Mark False Cluster (e.g. legitimate seasonal spike)
    const falseClusterRes = await communityPropagationService.recordAnalystAction(
      'SSA-2026-8801',
      'MARK_FALSE_CLUSTER',
      'ANALYST-OPS-99',
      'Investigated: Legitimate salary disbursement surge in export processing zone.'
    );

    expect(falseClusterRes.success).toBe(true);
    expect(falseClusterRes.alert?.status).toBe('DISMISSED_FALSE_CLUSTER');
    expect(falseClusterRes.alert?.cluster_status).toBe('FALSE_CLUSTER');
  });

  it('runs synthetic outbreak demo generator from Region A to Region B', () => {
    const demo = communityPropagationService.generateSyntheticOutbreakDemo('Sylhet', 'Dhaka North');
    expect(demo.outbreak_id).toBeDefined();
    expect(demo.timeline.length).toBe(5);
    expect(demo.alert.campaign_id).toBe('CAMP-2026-004');
  });
});
