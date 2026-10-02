import { describe, it, expect } from 'vitest';
import { complaintActionIntelligenceService } from '../services/complaint-action-intelligence.js';

describe('Complaint-to-Action Intelligence Service', () => {
  it('1. Correctly detects language, extracts entities (phones, wallets, amounts, agents, merchants, URLs)', () => {
    const rawText = `আমি 01711-998822 নম্বর থেকে একটি ফোন কল পাই। প্রতারক দাবি করে সে উপায় হেড অফিসের লোক। সে আমার অ্যাকাউন্ট সচল রাখার জন্য W-SYN-881920 নম্বরে ৳25,000 পাঠাতে বলে। আমি টাকা পাঠিয়ে দেওয়ার পর এজেন্ট A-SYN-4412 থেকে ক্যাশ আউট হয়েছে।`;
    
    const lang = complaintActionIntelligenceService.detectLanguage(rawText);
    expect(lang).toBe('bn');

    const entities = complaintActionIntelligenceService.extractEntities(rawText);
    expect(entities.phone_numbers.some(p => p.includes('01711'))).toBe(true);
    expect(entities.wallets.includes('W-SYN-881920')).toBe(true);
    expect(entities.agent_ids.includes('A-SYN-4412')).toBe(true);
    expect(entities.amounts_bdt.includes(25000)).toBe(true);
    expect(entities.named_entities.some(e => e.includes('Customer Care') || e.includes('upay'))).toBe(true);
  });

  it('2. Classifies complaints across fraud typologies and assigns appropriate priorities (P1 Golden-Hour vs P2 Attempted vs P3 Historical)', () => {
    // 2a. P1 Active Loss within Golden Hour (15m elapsed)
    const p1Complaint = complaintActionIntelligenceService.processComplaint({
      raw_text: 'উপায় কাস্টমার কেয়ার সেজে কল করে W-SYN-881920 নাম্বারে ৳25,000 টাকা নিয়ে নিয়েছে ১৫ মিনিট আগে। দ্রুত সাহায্য করুন!',
      reporter_name: 'Karim',
      elapsed_minutes: 15
    });
    expect(p1Complaint.classification).toBe('fake_customer_care');
    expect(p1Complaint.priority).toBe('P1');
    expect(p1Complaint.is_golden_hour).toBe(true);
    expect(p1Complaint.golden_hour_remaining_mins).toBeGreaterThan(0);
    expect(p1Complaint.potential_loss_bdt).toBe(25000);

    // 2b. P2 Attempted Scam (No money sent)
    const p2Complaint = complaintActionIntelligenceService.processComplaint({
      raw_text: '01711-998822 থেকে কল করে ওটিপি কোড চেয়েছে। আমি দেইনি এবং কল কেটে দিয়েছি। কোনো টাকা পাঠাইনি।',
      reporter_name: 'Farhana',
      elapsed_minutes: 30
    });
    expect(p2Complaint.classification).toBe('PIN_OTP_request');
    expect(p2Complaint.priority).toBe('P2');
    expect(p2Complaint.is_golden_hour).toBe(false);
    expect(p2Complaint.potential_loss_bdt).toBe(0);

    // 2c. P3 Historical Complaint (36h ago)
    const p3Complaint = complaintActionIntelligenceService.processComplaint({
      raw_text: 'গতকাল সকালে প্রতারণা করে W-SYN-881920 নাম্বারে ৳15,000 টাকা নিয়ে গেছে।',
      reporter_name: 'Tanveer',
      elapsed_minutes: 2160
    });
    expect(p3Complaint.priority).toBe('P3');
    expect(p3Complaint.is_golden_hour).toBe(false);
  });

  it('3. Detects duplicate complaints sharing semantic similarity, scammer numbers, or destination wallets', () => {
    const text1 = '01711-998822 pretending to be customer care told me to send ৳18,500 to W-SYN-881920 immediately';
    const text2 = 'উপায় হেড অফিস দাবি করে 01711-998822 থেকে কল আসে এবং W-SYN-881920 ওয়ালেটে টাকা পাঠাতে বলে';

    const cmp1 = complaintActionIntelligenceService.processComplaint({ raw_text: text1, elapsed_minutes: 20 });
    const cmp2 = complaintActionIntelligenceService.processComplaint({ raw_text: text2, elapsed_minutes: 25 });

    expect(cmp2.duplicate_group_id).toBeDefined();
    expect(cmp2.duplicate_count).toBeGreaterThanOrEqual(2);
    expect(cmp2.duplicate_similarity_score).toBeGreaterThan(0.4);
  });

  it('4. Automatically links complaints to destination wallets, Mule Rings, Campaigns, and Cases with verifiable evidence', () => {
    const complaint = complaintActionIntelligenceService.processComplaint({
      raw_text: 'W-SYN-881920 নাম্বারে ৳32,000 পাঠিয়েছি উপায় কাস্টমার কেয়ার পরিচয়ে। ক্যাশ আউট হয়েছে A-SYN-4412 এজেন্টে।',
      elapsed_minutes: 40
    });

    expect(complaint.linked_recipient_wallet).toBe('W-SYN-881920');
    expect(complaint.linked_ring_id).toBe('RING-003');
    expect(complaint.linked_campaign_id).toBe('CAMP-FAKE-CUSTOMER-CARE');
    expect(complaint.linked_agent_id).toBe('A-SYN-4412');
    
    // Check evidence links
    const ringEvidence = complaint.evidence_links.find(l => l.target_type === 'RING');
    expect(ringEvidence).toBeDefined();
    expect(ringEvidence?.evidence_text).toContain('Ring-003');
  });

  it('5. Allows analyst to override links, change priority, and trigger emergency recovery holds with audit logging', () => {
    const complaint = complaintActionIntelligenceService.processComplaint({
      raw_text: 'সন্দেহজনক লেনদেন W-SYN-999999 নাম্বারে ৳50,000',
      elapsed_minutes: 10
    });

    // Analyst overrides ring link
    const updated = complaintActionIntelligenceService.overrideLink(
      complaint.complaint_id,
      'RING',
      'RING-012',
      'ANALYST-101',
      'Verified mule nexus with Ring-012 Chittagong corridor'
    );
    expect(updated).not.toBeNull();
    expect(updated?.linked_ring_id).toBe('RING-012');
    const ringLink = updated?.evidence_links.find(l => l.target_type === 'RING');
    expect(ringLink?.is_analyst_override).toBe(true);

    // Analyst triggers emergency recovery hold
    const holdRes = complaintActionIntelligenceService.triggerEmergencyHold(
      complaint.complaint_id,
      'W-SYN-999999',
      'ANALYST-101'
    );
    expect(holdRes.success).toBe(true);
    expect(holdRes.complaint?.status).toBe('FROZEN_RECOVERY');
  });

  it('6. Executes the 5-Complaint Coordinated Scam Demo Scenario', () => {
    const demo = complaintActionIntelligenceService.generate5ComplaintDemoScenario();
    expect(demo.complaints.length).toBe(5);
    expect(demo.summary.total_victims).toBe(5);
    expect(demo.summary.shared_scammer_number).toBe('01711-998822');
    expect(demo.summary.shared_destination_wallet).toBe('W-SYN-881920');
    expect(demo.summary.p1_golden_hour_count).toBe(3);
    expect(demo.duplicate_group.complaint_ids.length).toBeGreaterThanOrEqual(5);
  });
});
