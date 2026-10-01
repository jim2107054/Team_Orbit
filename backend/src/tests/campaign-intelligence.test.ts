import { describe, it, expect } from 'vitest';
import { scamCampaignService } from '../services/scam-campaign-service.js';

describe('Scam Campaign Intelligence Layer Test Suite', () => {

  it('computes semantic & linguistic similarity accurately across Bangla and Banglish dialogues', () => {
    const textA = 'উপায় কাস্টমার কেয়ার ঢাকা হেড অফিস থেকে বলছি। আপনার অ্যাকাউন্ট বন্ধ হয়ে যাবে। ওটিপি দিন।';
    const textB = 'upay customer care theke bolchi, account bondho hoye jabe. OTP din ebong taka pathan.';
    const textC = 'লন্ডনে আপনার আত্মীয় অসুস্থ, জরুরি চিকিৎসার জন্য টাকা পাঠান।';

    const simAB = scamCampaignService.computeSemanticSimilarity(textA, textB);
    const simAC = scamCampaignService.computeSemanticSimilarity(textA, textC);

    expect(simAB).toBeGreaterThan(0.60); // High semantic match between Bangla & Banglish fake care
    expect(simAC).toBeLessThan(0.40); // Dissimilar typologies
  });

  it('calculates balanced multi-factor campaign_score without single-feature bias', () => {
    const complaints = scamCampaignService.generateSyntheticComplaintsBatch(10, 'CAMP_FAKE_CUSTOMER_CARE', 'TEST-CAMP-01');
    const scoreBreakdown = scamCampaignService.calculateCampaignScore(
      complaints,
      ['W-SYN-091177', 'W-SYN-091178'],
      ['D-MULE-8801'],
      ['RING-2026-0012']
    );

    expect(scoreBreakdown.linguistic_similarity).toBeGreaterThan(0.70);
    expect(scoreBreakdown.temporal_synchrony).toBeGreaterThan(0.70);
    expect(scoreBreakdown.entity_overlap).toBeGreaterThan(0.50);
    expect(scoreBreakdown.graph_overlap).toBeGreaterThan(0.50);
    expect(scoreBreakdown.overall_campaign_score).toBeGreaterThan(0.75);
    expect(scoreBreakdown.overall_campaign_score).toBeLessThanOrEqual(1.0);
  });

  it('generates second-layer Campaign Graph connecting Complaints, Phrases, Numbers, Wallets, Rings, and Agents', () => {
    const complaints = scamCampaignService.generateSyntheticComplaintsBatch(15, 'CAMP_FAKE_CUSTOMER_CARE', 'TEST-CAMP-02');
    const graph = scamCampaignService.buildCampaignGraph(
      'TEST-CAMP-02',
      complaints,
      ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179'],
      ['A-SYN-8821', 'A-SYN-8822'],
      'RING-2026-0012'
    );

    expect(graph.nodes.length).toBeGreaterThan(10);
    expect(graph.edges.length).toBeGreaterThan(10);

    const nodeTypes = new Set(graph.nodes.map(n => n.type));
    expect(nodeTypes.has('ring')).toBe(true);
    expect(nodeTypes.has('wallet')).toBe(true);
    expect(nodeTypes.has('agent')).toBe(true);
    expect(nodeTypes.has('phrase')).toBe(true);
    expect(nodeTypes.has('number')).toBe(true);
    expect(nodeTypes.has('complaint')).toBe(true);
  });

  it('discovers 50 synthetic complaints funneled to 8 wallets, 2 devices, 3 agents, and 1 suspicious ring', () => {
    const demoComplaints = scamCampaignService.generateSyntheticComplaintsBatch(
      50,
      'CAMP_FAKE_CUSTOMER_CARE',
      'CAMP-2026-001',
      [
        'W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180',
        'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184'
      ]
    );

    expect(demoComplaints.length).toBe(50);
    const uniqueSenders = new Set(demoComplaints.map(c => c.sender_number));
    expect(uniqueSenders.size).toBe(50); // 50 distinct numbers

    const targetWallets = new Set(demoComplaints.map(c => c.target_wallet));
    expect(targetWallets.size).toBe(8); // funneled into 8 wallets

    const campaign = scamCampaignService.getCampaignById('CAMP-2026-001');
    expect(campaign).toBeDefined();
    expect(campaign?.lifecycle_status).toBe('ACTIVE');
    expect(campaign?.affected_wallets.length).toBe(8);
    expect(campaign?.linked_agents.length).toBe(3);
    expect(campaign?.shared_devices.length).toBe(2);
    expect(campaign?.linked_rings).toContain('RING-2026-0012');
  });

  it('records analyst actions and updates campaign lifecycle with audit logging', async () => {
    const updated = await scamCampaignService.recordAnalystAction(
      'CAMP-2026-001',
      'ADD_NOTE',
      'ANALYST-101',
      { note: 'Urgent coordination: 8 wallets under Ring-12 escalated to MLRO.' }
    );

    expect(updated).toBeDefined();
    expect(updated?.analyst_notes[0].note).toContain('Urgent coordination');

    const updatedLifecycle = await scamCampaignService.recordAnalystAction(
      'CAMP-2026-001',
      'UPDATE_LIFECYCLE',
      'ANALYST-101',
      { lifecycle: 'ACTIVE' }
    );
    expect(updatedLifecycle?.lifecycle_status).toBe('ACTIVE');
  });

});
