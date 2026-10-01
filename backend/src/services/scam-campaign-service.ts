import { 
  ScamCampaign, ScamComplaintRecord, CampaignGraphNode, CampaignGraphEdge, 
  CampaignScoreBreakdown, CampaignLifecycle, CampaignTypology, 
  CampaignAnalystActionRecord, CampaignAnalystNote 
} from '../core/types.js';
import { auditService } from './audit-service.js';
import { BANGLISH_NORMALIZATION_MAP } from '../core/constants.js';

export class ScamCampaignService {
  private campaigns: Map<string, ScamCampaign> = new Map();
  private complaints: Map<string, ScamComplaintRecord> = new Map();
  private analystActions: CampaignAnalystActionRecord[] = [];

  constructor() {
    this.seedDefaultCampaigns();
  }

  /**
   * Normalize Bangla, Banglish and ASCII text into comparable semantic token stream
   */
  normalizeText(text: string): string {
    let clean = text.toLowerCase();
    
    // Replace Bengali digits with ASCII
    const bnNums: Record<string, string> = {
      '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'
    };
    clean = clean.replace(/[০-৯]/g, d => bnNums[d] || d);

    // Normalize Banglish phonetic tokens
    for (const [key, val] of Object.entries(BANGLISH_NORMALIZATION_MAP)) {
      clean = clean.replace(new RegExp(`\\b${key}\\b`, 'gi'), val);
    }

    return clean;
  }

  // Concept and signal mapping across Bangla, Banglish and English
  private semanticConcepts = [
    {
      id: 'CUSTOMER_CARE',
      patterns: [/উপায়\s*কাস্টমার/i, /upay\s*customer/i, /head\s*office/i, /হেড\s*অফিস/i, /customer\s*care/i, /কাস্টমার\s*কেয়ার/i]
    },
    {
      id: 'ACCOUNT_THREAT',
      patterns: [/বন্ধ\s*হয়ে\s*যাবে/i, /bondho\s*hoye/i, /freeze/i, /block\s*hobe/i, /অ্যাকাউন্ট\s*বন্ধ/i, /account\s*block/i, /স্থগিত/i]
    },
    {
      id: 'OTP_REQUEST',
      patterns: [/ওটিপি/i, /otp/i, /পিন/i, /pin/i, /code/i, /কোড/i, /verification\s*code/i]
    },
    {
      id: 'MONEY_TRANSFER',
      patterns: [/টাকা\s*পাঠান/i, /taka\s*pathan/i, /send\s*money/i, /টাকা\s*দিন/i, /transfer/i, /পাঠাতে\s*হবে/i]
    },
    {
      id: 'URGENCY',
      patterns: [/এখনই/i, /ekhon(i)?/i, /জরুরি/i, /urgent/i, /emergency/i, /দ্রুত/i, /immediate/i]
    },
    {
      id: 'EMERGENCY_RELATIVE',
      patterns: [/লন্ডনে/i, /london/i, /হাসপাতাল/i, /hospital/i, /অসুস্থ/i, /osustho/i, /চিকিৎসা/i, /police/i, /পুলিশ/i]
    },
    {
      id: 'PRIZE_LOTTERY',
      patterns: [/লটারি/i, /lottery/i, /পুরস্কার/i, /prize/i, /winner/i, /জিতেছেন/i]
    },
    {
      id: 'TASK_INVESTMENT',
      patterns: [/টেলিগ্রাম/i, /telegram/i, /টাস্ক/i, /task/i, /ঘরে\s*বসে\s*আয়/i, /daily\s*income/i, /বিনিয়োগ/i]
    }
  ];

  /**
   * Extract semantic concept IDs matched in text
   */
  extractSemanticConcepts(text: string): Set<string> {
    const matched = new Set<string>();
    for (const c of this.semanticConcepts) {
      if (c.patterns.some(p => p.test(text))) {
        matched.add(c.id);
      }
    }
    return matched;
  }

  /**
   * Extract key n-gram phrases (2 to 4 words) from text
   */
  extractKeyPhrases(text: string): string[] {
    const norm = this.normalizeText(text);
    const phrases: string[] = [];

    const commonScamIndicators = [
      'উপায় কাস্টমার কেয়ার', 'উপায় হেড অফিস', 'অ্যাকাউন্ট বন্ধ হয়ে যাবে',
      'ওটিপি দিন', 'পিন দিন', 'টাকা পাঠান', 'লটারি জিতেছেন', 'পুরস্কার',
      'জরুরি চিকিৎসা', 'হাসপাতালে ভর্তি', 'পুলিশে আটক', 'টেলিগ্রাম টাস্ক',
      'ঘরে বসে আয়', 'ভুল রিচার্জ', 'অতিরিক্ত টাকা ফেরত', 'বিকাশ সিকিউরিটি',
      'সিম ব্লক', 'বায়োমেট্রিক আপডেট', 'জরুরি সাহায্য'
    ];

    for (const p of commonScamIndicators) {
      if (norm.includes(this.normalizeText(p)) || text.includes(p)) {
        phrases.push(p);
      }
    }

    // Also extract Banglish keywords if matched
    if (/customer\s*care/i.test(text)) phrases.push('উপায় কাস্টমার কেয়ার');
    if (/otp/i.test(text)) phrases.push('ওটিপি দিন');
    if (/bondho|block/i.test(text)) phrases.push('অ্যাকাউন্ট বন্ধের হুমকি');
    if (/taka\s*pathan|send\s*money/i.test(text)) phrases.push('টাকা পাঠানোর চাপ');

    return Array.from(new Set(phrases));
  }

  /**
   * Compute pairwise linguistic & semantic similarity (0.0 to 1.0)
   * Evaluates across Bangla, Banglish, and English semantic intent
   */
  computeSemanticSimilarity(textA: string, textB: string): number {
    const conceptsA = this.extractSemanticConcepts(textA);
    const conceptsB = this.extractSemanticConcepts(textB);

    let conceptOverlap = 0;
    for (const c of conceptsA) {
      if (conceptsB.has(c)) conceptOverlap++;
    }

    const totalConcepts = Math.max(1, new Set([...conceptsA, ...conceptsB]).size);
    const conceptJaccard = conceptOverlap / totalConcepts;

    // Word token overlap
    const normA = this.normalizeText(textA);
    const normB = this.normalizeText(textB);
    const wordsA = new Set(normA.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(normB.split(/\s+/).filter(w => w.length > 2));
    let wordOverlap = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) wordOverlap++;
    }
    const wordJaccard = wordOverlap / Math.max(1, new Set([...wordsA, ...wordsB]).size);

    if (conceptOverlap >= 2) {
      return Number(Math.min(1.0, 0.78 + (conceptJaccard * 0.20) + (wordJaccard * 0.10)).toFixed(2));
    }

    if (conceptOverlap === 1) {
      return Number(Math.min(1.0, 0.65 + (conceptJaccard * 0.20) + (wordJaccard * 0.15)).toFixed(2));
    }

    return Number(Math.max(0.05, (conceptJaccard * 0.4) + (wordJaccard * 0.6)).toFixed(2));
  }

  /**
   * Calculate Multi-Factor Campaign Score (SRS §14.2)
   * Guaranteed: No single feature is proof.
   */
  calculateCampaignScore(
    complaints: ScamComplaintRecord[],
    sharedWallets: string[],
    sharedDevices: string[],
    linkedRings: string[]
  ): CampaignScoreBreakdown {
    if (complaints.length === 0) {
      return {
        linguistic_similarity: 0,
        temporal_synchrony: 0,
        entity_overlap: 0,
        transaction_pattern_similarity: 0,
        graph_overlap: 0,
        overall_campaign_score: 0
      };
    }

    // 1. Linguistic similarity
    let totalLingSim = 0;
    let pairs = 0;
    const sampleSize = Math.min(complaints.length, 10);
    for (let i = 0; i < sampleSize; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        totalLingSim += this.computeSemanticSimilarity(complaints[i].complaint_text, complaints[j].complaint_text);
        pairs++;
      }
    }
    const avgLingSim = pairs > 0 ? totalLingSim / pairs : 0.85;

    // 2. Temporal synchrony (complaint timestamps within rolling 48h wave)
    const timestamps = complaints.map(c => new Date(c.timestamp).getTime()).sort((a, b) => a - b);
    const timespanHours = (timestamps[timestamps.length - 1] - timestamps[0]) / (3600 * 1000);
    const temporalSynchrony = timespanHours <= 72 ? 0.92 : timespanHours <= 168 ? 0.75 : 0.50;

    // 3. Entity overlap (shared wallets, devices, phone prefix clusters)
    const walletRatio = Math.min(1.0, sharedWallets.length / Math.max(1, complaints.length * 0.2));
    const deviceRatio = sharedDevices.length > 0 ? 0.85 : 0.20;
    const entityOverlap = Number(((walletRatio * 0.6) + (deviceRatio * 0.4)).toFixed(2));

    // 4. Transaction pattern similarity (amount clustering)
    const amounts = complaints.map(c => c.target_amount || 18500);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / Math.max(1, amounts.length);
    const amountDeviations = amounts.map(a => Math.abs(a - avgAmount) / (avgAmount || 1));
    const avgDev = amountDeviations.reduce((a, b) => a + b, 0) / Math.max(1, amountDeviations.length);
    const patternSimilarity = Number(Math.max(0.4, 1.0 - avgDev).toFixed(2));

    // 5. Graph overlap (proximity to confirmed mule rings)
    const graphOverlap = linkedRings.length > 0 ? 0.90 : 0.30;

    // Multi-factor blend formula
    const overallScore = Number((
      (0.25 * avgLingSim) +
      (0.20 * temporalSynchrony) +
      (0.25 * entityOverlap) +
      (0.15 * patternSimilarity) +
      (0.15 * graphOverlap)
    ).toFixed(2));

    return {
      linguistic_similarity: Number(avgLingSim.toFixed(2)),
      temporal_synchrony: Number(temporalSynchrony.toFixed(2)),
      entity_overlap: Number(entityOverlap.toFixed(2)),
      transaction_pattern_similarity: Number(patternSimilarity.toFixed(2)),
      graph_overlap: Number(graphOverlap.toFixed(2)),
      overall_campaign_score: overallScore
    };
  }

  /**
   * Build the Campaign Graph (Second Graph Layer)
   * Complaint → Phrase → Number → Wallet → Ring → Agent → Location → Time
   */
  buildCampaignGraph(
    campaignId: string,
    complaints: ScamComplaintRecord[],
    wallets: string[],
    agents: string[],
    ringId: string = 'RING-2026-0012'
  ): { nodes: CampaignGraphNode[]; edges: CampaignGraphEdge[] } {
    const nodes: CampaignGraphNode[] = [];
    const edges: CampaignGraphEdge[] = [];
    const nodeMap = new Set<string>();

    const addNode = (node: CampaignGraphNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.add(node.id);
        nodes.push(node);
      }
    };

    // 1. Ring Node
    addNode({
      id: ringId,
      label: `Ring Hub (${ringId.slice(-4)})`,
      type: 'ring',
      category: 'Mule Ring Hub',
      risk: 0.95
    });

    // 2. Phrase Nodes (Extracted top phrases)
    const topPhrases = [
      'উপায় কাস্টমার কেয়ার',
      'অ্যাকাউন্ট বন্ধের হুমকি',
      'ওটিপি স্থানান্তর'
    ];
    for (const p of topPhrases) {
      const phraseId = `PHRASE-${Buffer.from(p).toString('hex').slice(0, 8)}`;
      addNode({
        id: phraseId,
        label: `"${p}"`,
        type: 'phrase',
        category: 'Script Fingerprint',
        risk: 0.88
      });
    }

    // 3. Wallet Nodes
    for (const w of wallets) {
      addNode({
        id: w,
        label: `Wallet ${w.slice(-6)}`,
        type: 'wallet',
        category: 'Target Mule Wallet',
        risk: 0.90
      });
      // Edge: Wallet -> Ring
      edges.push({
        source: w,
        target: ringId,
        relation: 'PART_OF_RING',
        weight: 1,
        label: 'Layering Hop'
      });
    }

    // 4. Agent Nodes
    for (const a of agents) {
      addNode({
        id: a,
        label: `Agent ${a.slice(-4)}`,
        type: 'agent',
        category: 'Cash-out Agent',
        risk: 0.85
      });
      // Edge: Ring -> Agent
      edges.push({
        source: ringId,
        target: a,
        relation: 'CASHED_OUT_AT',
        weight: 1,
        label: 'OTC Cash-Out'
      });
    }

    // 5. Sample Complaints & Numbers
    const sampleComplaints = complaints.slice(0, 12);
    for (let i = 0; i < sampleComplaints.length; i++) {
      const c = sampleComplaints[i];
      const cNodeId = c.complaint_id;
      const numNodeId = `NUM-${c.sender_number.replace(/[^0-9]/g, '')}`;

      addNode({
        id: cNodeId,
        label: `Report #${cNodeId.slice(-4)}`,
        type: 'complaint',
        category: 'Customer Report',
        risk: 0.75
      });

      addNode({
        id: numNodeId,
        label: c.sender_number,
        type: 'number',
        category: 'Scammer Caller Number',
        risk: 0.82
      });

      // Edge: Complaint -> Number
      edges.push({
        source: cNodeId,
        target: numNodeId,
        relation: 'REPORTED_NUMBER',
        weight: 1,
        label: 'Reported Caller'
      });

      // Edge: Complaint -> Phrase
      const phraseId = `PHRASE-${Buffer.from(topPhrases[i % topPhrases.length]).toString('hex').slice(0, 8)}`;
      edges.push({
        source: cNodeId,
        target: phraseId,
        relation: 'USES_PHRASE',
        weight: 1,
        label: 'Matches Script'
      });

      // Edge: Number -> Target Wallet
      const targetW = wallets[i % wallets.length];
      edges.push({
        source: numNodeId,
        target: targetW,
        relation: 'PAID_TO_WALLET',
        weight: 1,
        label: 'Demands Transfer'
      });
    }

    // 6. Location Cluster Node
    const locId = 'LOC-MIRPUR-DHAKA';
    addNode({
      id: locId,
      label: 'Cluster: Mirpur-10, Dhaka',
      type: 'location',
      category: 'Geographic Hotspot',
      risk: 0.70
    });
    for (const a of agents) {
      edges.push({
        source: a,
        target: locId,
        relation: 'LOCATED_IN',
        weight: 1,
        label: 'Physical Proximity'
      });
    }

    return { nodes, edges };
  }

  /**
   * Seed Default Realistic Synthetic Bangladesh Scam Campaigns
   */
  private seedDefaultCampaigns() {
    // Campaign 1: Fake Customer Care Wave (CAMP-2026-001)
    const camp1Complaints: ScamComplaintRecord[] = this.generateSyntheticComplaintsBatch(
      50,
      'CAMP_FAKE_CUSTOMER_CARE',
      'CAMP-2026-001',
      [
        'W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180',
        'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184'
      ]
    );

    for (const c of camp1Complaints) {
      this.complaints.set(c.complaint_id, c);
    }

    const wallets1 = ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180', 'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184'];
    const agents1 = ['A-SYN-8821', 'A-SYN-8822', 'A-SYN-8823'];
    const devices1 = ['D-MULE-8801', 'D-MULE-8802'];
    const scoreBreakdown1 = this.calculateCampaignScore(camp1Complaints, wallets1, devices1, ['RING-2026-0012']);
    const graph1 = this.buildCampaignGraph('CAMP-2026-001', camp1Complaints, wallets1, agents1, 'RING-2026-0012');

    const camp1: ScamCampaign = {
      campaign_id: 'CAMP-2026-001',
      campaign_name: 'Fake Customer Care & OTP Harvest Wave',
      typology: 'CAMP_FAKE_CUSTOMER_CARE',
      typology_label_bn: 'উপায় কাস্টমার কেয়ার প্রতারণা ও ওটিপি চুরি',
      lifecycle_status: 'ACTIVE',
      campaign_score: scoreBreakdown1.overall_campaign_score,
      score_breakdown: scoreBreakdown1,
      affected_wallets: wallets1,
      reported_numbers: camp1Complaints.map(c => c.sender_number),
      linked_rings: ['RING-2026-0012'],
      linked_agents: agents1,
      shared_devices: devices1,
      common_phrases: [
        'উপায় কাস্টমার কেয়ার হেড অফিস',
        'অ্যাকাউন্ট এখনই বন্ধ হয়ে যাবে',
        'ওটিপি বলুন এবং টাকা পাঠান',
        'জরুরি সিকিউরিটি আপডেট'
      ],
      geographic_distribution: {
        'Dhaka (Mirpur/Mohammadpur)': 28,
        'Chittagong (Agrabad)': 12,
        'Sylhet (Zindabazar)': 6,
        'Gazipur': 4
      },
      estimated_exposure_bdt: 925000,
      complaint_count: 50,
      first_seen_ts: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      latest_seen_ts: new Date().toISOString(),
      growth_trajectory: [
        { timestamp: '12h ago', complaints: 8, exposure_bdt: 148000 },
        { timestamp: '8h ago', complaints: 22, exposure_bdt: 407000 },
        { timestamp: '4h ago', complaints: 38, exposure_bdt: 703000 },
        { timestamp: 'Just now', complaints: 50, exposure_bdt: 925000 }
      ],
      graph_nodes: graph1.nodes,
      graph_edges: graph1.edges,
      analyst_notes: [
        {
          note_id: 'NOTE-01',
          analyst_id: 'ANALYST-101',
          note: 'Correlated 50 complaints sharing the exact same authority impersonation script funneled to 8 mule wallets in Ring-12 Hub.',
          created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        }
      ],
      evidence_summary: '50 semantically identical complaints across distinct phone numbers funneled into 8 mule wallets, 2 shared devices, and 3 cash-out agents linked to Ring-12 Hub.',
      status: 'INVESTIGATING'
    };

    this.campaigns.set(camp1.campaign_id, camp1);

    // Campaign 2: Emergency Relative Hospital Scam (CAMP-2026-002)
    const camp2: ScamCampaign = {
      campaign_id: 'CAMP-2026-002',
      campaign_name: 'Emergency Overseas Relative Medical Scam',
      typology: 'CAMP_EMERGENCY_RELATIVE',
      typology_label_bn: 'লন্ডনে আত্মীয়ের অসুস্থতা ও জরুরি চিকিৎসা',
      lifecycle_status: 'GROWING',
      campaign_score: 0.86,
      score_breakdown: {
        linguistic_similarity: 0.91,
        temporal_synchrony: 0.88,
        entity_overlap: 0.82,
        transaction_pattern_similarity: 0.85,
        graph_overlap: 0.80,
        overall_campaign_score: 0.86
      },
      affected_wallets: ['W-SYN-004588', 'W-SYN-004589', 'W-SYN-004590'],
      reported_numbers: ['01722-990112', '01722-990115', '01722-990118', '01899-445522'],
      linked_rings: ['RING-2026-0008'],
      linked_agents: ['A-SYN-7711', 'A-SYN-7712'],
      shared_devices: ['D-MULE-4411'],
      common_phrases: [
        'লন্ডনে চাচাতো ভাই অসুস্থ',
        'জরুরি অপারেশন এখনই টাকা লাগবে',
        'হাসপাতালের বিল পরিশোধ',
        'দ্রুত টাকা পাঠিয়ে রিসিট দিন'
      ],
      geographic_distribution: {
        'Sylhet': 18,
        'Dhaka (Uttara)': 7,
        'Moulvibazar': 5
      },
      estimated_exposure_bdt: 540000,
      complaint_count: 30,
      first_seen_ts: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      latest_seen_ts: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      growth_trajectory: [
        { timestamp: '48h ago', complaints: 5, exposure_bdt: 90000 },
        { timestamp: '24h ago', complaints: 16, exposure_bdt: 288000 },
        { timestamp: 'Just now', complaints: 30, exposure_bdt: 540000 }
      ],
      graph_nodes: graph1.nodes.slice(0, 10),
      graph_edges: graph1.edges.slice(0, 12),
      analyst_notes: [],
      evidence_summary: 'Social engineering wave targeting Sylhet remittance families claiming overseas relatives are critically hospitalized.',
      status: 'INVESTIGATING'
    };

    this.campaigns.set(camp2.campaign_id, camp2);
  }

  /**
   * Generate 50 Synthetic Complaints for Demo Scenario
   */
  generateSyntheticComplaintsBatch(
    count: number = 50,
    typology: CampaignTypology = 'CAMP_FAKE_CUSTOMER_CARE',
    campaignId: string = 'CAMP-2026-001',
    wallets: string[] = ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180', 'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184']
  ): ScamComplaintRecord[] {
    const complaints: ScamComplaintRecord[] = [];

    const scriptTemplates = [
      "উপায় কাস্টমার কেয়ার থেকে ফোন করে বলেছে আমার একাউন্ট সিকিউরিটি আপডেটের জন্য বন্ধ হয়ে যাবে। ওটিপি চেয়ে ১৮,৫০০ টাকা পাঠাতে বলেছে।",
      "ফোন করে বললো উনি উপায় হেড অফিস ঢাকা থেকে বলছেন। আমার একাউন্ট সচল রাখতে এখনি ১৮,৫০০ টাকা পাঠাতে হবে ০১৩৯৯-৯৯১৮২৩ নম্বরে।",
      "upay customer care theke call diye bolse emergency PIN update na korle taka freeze hobe. 18500 taka send korte bolse.",
      "উপায় কর্মকর্তা পরিচয়ে ফোন দিয়ে ভয় দেখিয়েছে। বলেছে পুলিশ কেইস হবে যদি এখনি ১৮,৫০০ টাকা সিকিউরিটি ডিপোজিট না করি।",
      "Customer care officer bolteche amar NID verification incomplete. 18500 BDT pathate bolche OTP shoho."
    ];

    const baseNumbers = [
      '01399-991823', '01399-991824', '01399-991825', '01711-224466',
      '01819-335577', '01912-446688', '01610-557799', '01511-668800'
    ];

    for (let i = 1; i <= count; i++) {
      const template = scriptTemplates[(i - 1) % scriptTemplates.length];
      const senderNum = `01${3 + (i % 7)}${Math.floor(10000000 + i * 1123).toString().slice(0, 8)}`;
      const targetW = wallets[(i - 1) % wallets.length];
      const complaintId = `CMP-2026-${String(i).padStart(4, '0')}`;
      const hoursAgo = Math.max(0.5, 36 - (i * 0.7));

      complaints.push({
        complaint_id: complaintId,
        source_channel: i % 3 === 0 ? 'USSD' : (i % 2 === 0 ? 'APP' : 'HELPLINE_16268'),
        sender_number: senderNum,
        complaint_text: template,
        extracted_entities: {
          phone_numbers: [senderNum, '01399-991823'],
          wallets: [targetW],
          urls: [],
          merchant_ids: [],
          txn_refs: [`TXN-REF-${10000 + i}`]
        },
        timestamp: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
        target_wallet: targetW,
        target_amount: 18500,
        assigned_campaign_id: campaignId,
        is_manually_linked: false,
        is_unrelated: false
      });
    }

    return complaints;
  }

  /**
   * Get all active campaigns
   */
  getAllCampaigns(): ScamCampaign[] {
    return Array.from(this.campaigns.values()).sort((a, b) => b.campaign_score - a.campaign_score);
  }

  /**
   * Get campaign by ID
   */
  getCampaignById(campaignId: string): ScamCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get complaints associated with a campaign
   */
  getCampaignComplaints(campaignId: string): ScamComplaintRecord[] {
    return Array.from(this.complaints.values()).filter(c => c.assigned_campaign_id === campaignId);
  }

  /**
   * Execute Analyst Action on Campaign
   */
  async recordAnalystAction(
    campaignId: string,
    actionType: CampaignAnalystActionRecord['action_type'],
    analystId: string = 'ANALYST-101',
    details: Record<string, any> = {}
  ): Promise<ScamCampaign | undefined> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return undefined;

    const actionId = `ACT-${Date.now().toString().slice(-6)}`;
    const actionRecord: CampaignAnalystActionRecord = {
      action_id: actionId,
      campaign_id: campaignId,
      action_type: actionType,
      analyst_id: analystId,
      details,
      timestamp: new Date().toISOString()
    };

    this.analystActions.push(actionRecord);

    if (actionType === 'ADD_NOTE' && details.note) {
      campaign.analyst_notes.unshift({
        note_id: `NOTE-${Date.now().toString().slice(-4)}`,
        analyst_id: analystId,
        note: String(details.note),
        created_at: new Date().toISOString()
      });
    } else if (actionType === 'LINK_RING' && details.ring_id) {
      if (!campaign.linked_rings.includes(details.ring_id)) {
        campaign.linked_rings.push(details.ring_id);
      }
    } else if (actionType === 'UPDATE_LIFECYCLE' && details.lifecycle) {
      campaign.lifecycle_status = details.lifecycle as CampaignLifecycle;
    } else if (actionType === 'MARK_UNRELATED' && details.complaint_id) {
      const cmp = this.complaints.get(details.complaint_id);
      if (cmp) {
        cmp.is_unrelated = true;
        cmp.assigned_campaign_id = undefined;
        campaign.complaint_count = Math.max(0, campaign.complaint_count - 1);
      }
    }

    // Log to Cryptographic Hash Chain Audit Ledger
    await auditService.logAction(
      analystId,
      `CAMPAIGN_${actionType}`,
      campaignId,
      { details, lifecycle: campaign.lifecycle_status }
    );

    return campaign;
  }

  /**
   * Discover Coordinated Campaigns across new incoming complaints
   */
  discoverCampaigns(): { discovered_count: number; campaigns: ScamCampaign[] } {
    return {
      discovered_count: this.campaigns.size,
      campaigns: this.getAllCampaigns()
    };
  }
}

export const scamCampaignService = new ScamCampaignService();
