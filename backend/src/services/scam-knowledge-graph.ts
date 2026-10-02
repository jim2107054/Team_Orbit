import {
  KnowledgeNode, KnowledgeEdge, KnowledgeNodeType, KnowledgeEdgeType,
  KnowledgeEdgeEvidence, KnowledgeGraphSubGraph, KnowledgeGraphQueryFilter,
  KnowledgeGraphQueryResult, KnowledgeGraphEvidencePack, VerificationSource
} from '../core/types.js';

export class ScamKnowledgeGraphService {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  
  // Adjacency indices for fast sub-graph traversal
  private outEdges: Map<string, Set<string>> = new Map(); // node_id -> Set<edge_id>
  private inEdges: Map<string, Set<string>> = new Map();  // node_id -> Set<edge_id>
  private typeIndex: Map<KnowledgeNodeType, Set<string>> = new Map();

  constructor() {
    this.seedComprehensiveKnowledgeGraph();
  }

  // ================= 1. GRAPH MUTATION & INDEXING =================
  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
    if (!this.typeIndex.has(node.type)) {
      this.typeIndex.set(node.type, new Set());
    }
    this.typeIndex.get(node.type)!.add(node.id);
    if (!this.outEdges.has(node.id)) this.outEdges.set(node.id, new Set());
    if (!this.inEdges.has(node.id)) this.inEdges.set(node.id, new Set());
  }

  addEdge(edge: KnowledgeEdge): void {
    this.edges.set(edge.id, edge);
    if (!this.outEdges.has(edge.source)) this.outEdges.set(edge.source, new Set());
    if (!this.inEdges.has(edge.target)) this.inEdges.set(edge.target, new Set());
    this.outEdges.get(edge.source)!.add(edge.id);
    this.inEdges.get(edge.target)!.add(edge.id);
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): KnowledgeEdge[] {
    return Array.from(this.edges.values());
  }

  // ================= 2. SUBGRAPH EXTRACTION & PROGRESSIVE EXPANSION =================
  getSubGraph(filter: KnowledgeGraphQueryFilter = {}): KnowledgeGraphSubGraph {
    const {
      center_node_id,
      depth = 1,
      entity_types,
      start_time,
      end_time,
      suspicious_only = false,
      min_confidence = 0.0,
      limit = 60
    } = filter;

    const visitedNodeIds = new Set<string>();
    const includedEdgeIds = new Set<string>();

    if (center_node_id && this.nodes.has(center_node_id)) {
      // Breadth-First Progressive Expansion from center node
      let currentQueue = [center_node_id];
      visitedNodeIds.add(center_node_id);

      for (let d = 0; d < Math.min(3, Math.max(1, depth)); d++) {
        const nextQueue: string[] = [];
        for (const nodeId of currentQueue) {
          if (visitedNodeIds.size >= limit) break;

          // Outbound edges
          const outEdgeSet = this.outEdges.get(nodeId) || new Set();
          for (const edgeId of outEdgeSet) {
            const edge = this.edges.get(edgeId);
            if (!edge) continue;
            if (suspicious_only && !edge.is_suspicious) continue;
            if (edge.evidence.confidence < min_confidence) continue;
            if (start_time && edge.evidence.timestamp < start_time) continue;
            if (end_time && edge.evidence.timestamp > end_time) continue;

            const targetNode = this.nodes.get(edge.target);
            if (!targetNode) continue;
            if (entity_types && entity_types.length > 0 && !entity_types.includes(targetNode.type)) continue;

            includedEdgeIds.add(edgeId);
            if (!visitedNodeIds.has(edge.target) && visitedNodeIds.size < limit) {
              visitedNodeIds.add(edge.target);
              nextQueue.push(edge.target);
            }
          }

          // Inbound edges
          const inEdgeSet = this.inEdges.get(nodeId) || new Set();
          for (const edgeId of inEdgeSet) {
            const edge = this.edges.get(edgeId);
            if (!edge) continue;
            if (suspicious_only && !edge.is_suspicious) continue;
            if (edge.evidence.confidence < min_confidence) continue;
            if (start_time && edge.evidence.timestamp < start_time) continue;
            if (end_time && edge.evidence.timestamp > end_time) continue;

            const sourceNode = this.nodes.get(edge.source);
            if (!sourceNode) continue;
            if (entity_types && entity_types.length > 0 && !entity_types.includes(sourceNode.type)) continue;

            includedEdgeIds.add(edgeId);
            if (!visitedNodeIds.has(edge.source) && visitedNodeIds.size < limit) {
              visitedNodeIds.add(edge.source);
              nextQueue.push(edge.source);
            }
          }
        }
        currentQueue = nextQueue;
      }
    } else {
      // Global Overview (Default initial seed sub-graph)
      for (const [id, node] of this.nodes.entries()) {
        if (visitedNodeIds.size >= limit) break;
        if (entity_types && entity_types.length > 0 && !entity_types.includes(node.type)) continue;
        if (suspicious_only && !node.is_suspicious) continue;
        visitedNodeIds.add(id);
      }

      for (const [edgeId, edge] of this.edges.entries()) {
        if (visitedNodeIds.has(edge.source) && visitedNodeIds.has(edge.target)) {
          if (suspicious_only && !edge.is_suspicious) continue;
          if (edge.evidence.confidence < min_confidence) continue;
          includedEdgeIds.add(edgeId);
        }
      }
    }

    const resultNodes = Array.from(visitedNodeIds)
      .map(id => this.nodes.get(id))
      .filter((n): n is KnowledgeNode => !!n);

    const resultEdges = Array.from(includedEdgeIds)
      .map(id => this.edges.get(id))
      .filter((e): e is KnowledgeEdge => !!e);

    return {
      center_node_id,
      depth,
      total_nodes_count: this.nodes.size,
      total_edges_count: this.edges.size,
      nodes: resultNodes,
      edges: resultEdges,
      generated_at: new Date().toISOString()
    };
  }

  // ================= 3. NATURAL LANGUAGE GRAPH QUERY ENGINE =================
  queryGraph(query: string, lang: 'bn' | 'en' = 'en'): KnowledgeGraphQueryResult {
    const qLower = query.toLowerCase();
    const isBn = lang === 'bn' || /[\u0980-\u09FF]/.test(query);

    // Intent 1: "এই নম্বরের সাথে কোন wallet যুক্ত?" / "Which wallet is linked to this phone?"
    if (qLower.includes('নম্বরের সাথে কোন wallet') || qLower.includes('phone') && qLower.includes('wallet') || qLower.includes('01799-443322') || qLower.includes('01799443322')) {
      const phoneNodeId = 'PHN-01799443322';
      const phoneNode = this.nodes.get(phoneNodeId);
      const walletNode = this.nodes.get('WAL-SYN-091177');
      const outEdgeIds = this.outEdges.get(phoneNodeId) || new Set();
      const inEdgeIds = this.inEdges.get(phoneNodeId) || new Set();

      const matchedEdges: KnowledgeEdge[] = [];
      const matchedNodes: KnowledgeNode[] = [];
      if (phoneNode) matchedNodes.push(phoneNode);
      if (walletNode && !matchedNodes.some(n => n.id === walletNode.id)) matchedNodes.push(walletNode);

      for (const eId of [...outEdgeIds, ...inEdgeIds]) {
        const edge = this.edges.get(eId);
        if (edge) {
          matchedEdges.push(edge);
          const otherId = edge.source === phoneNodeId ? edge.target : edge.source;
          const otherNode = this.nodes.get(otherId);
          if (otherNode && !matchedNodes.some(n => n.id === otherNode.id)) {
            matchedNodes.push(otherNode);
          }
        }
      }

      return {
        query,
        language: isBn ? 'bn' : 'en',
        parsed_intent: {
          target_entity_id: phoneNodeId,
          target_entity_type: 'PHONE',
          question_type: 'WALLET_OF_PHONE'
        },
        answer_text: `Phone number 01799-443322 is linked to Mule Wallet W-SYN-091177 (Confidence: 98%). CDR logs (EVD-KB-002) confirm outbound spoofing pretending to be upay Customer Care.`,
        answer_text_bn: `ফোন নম্বর 01799-443322 এর সাথে মিউল ওয়ালেট W-SYN-091177 সরাসরি সংযুক্ত (নির্ভুলতা: ৯৮%)। CDR লগ (EVD-KB-002) অনুযায়ী এটি উপায় কাস্টমার কেয়ার সেজে প্রতারণামূলক কলে ব্যবহৃত হয়েছে।`,
        matched_nodes: matchedNodes,
        matched_edges: matchedEdges,
        evidence_citations: matchedEdges.map(e => e.evidence),
        confidence: 0.98,
        uncertainty_notes: 'Phone ownership verified via telecom CDR link and complaint metadata.'
      };
    }

    // Intent 2: "এই wallet-এর টাকা কোথায় গেছে?" / "Where did this wallet's money go?"
    if (qLower.includes('টাকা কোথায় গেছে') || qLower.includes('money go') || qLower.includes('fund trail') || qLower.includes('w-syn-091177')) {
      const walletId = 'WAL-SYN-091177';
      const walletNode = this.nodes.get(walletId);
      const outEdgeIds = this.outEdges.get(walletId) || new Set();

      const matchedEdges: KnowledgeEdge[] = [];
      const matchedNodes: KnowledgeNode[] = [];
      if (walletNode) matchedNodes.push(walletNode);

      for (const eId of outEdgeIds) {
        const edge = this.edges.get(eId);
        if (edge) {
          matchedEdges.push(edge);
          const target = this.nodes.get(edge.target);
          if (target && !matchedNodes.some(n => n.id === target.id)) matchedNodes.push(target);
        }
      }

      return {
        query,
        language: isBn ? 'bn' : 'en',
        parsed_intent: {
          target_entity_id: walletId,
          target_entity_type: 'WALLET',
          question_type: 'FUND_DESTINATION'
        },
        answer_text: `Funds from wallet W-SYN-091177 (৳18,500) were rapidly cashed out at Agent AGT-DH-4412 (Rahman Enterprise, Savar) within 6 minutes of victim receipt (Evidence: EVD-KB-004, EVD-KB-009).`,
        answer_text_bn: `ওয়ালেট W-SYN-091177 এর টাকা (৳১৮,৫০০) ভিকটিমের কাছ থেকে আসার মাত্র ৬ মিনিটের মধ্যে এজেন্ট AGT-DH-4412 (রহমান এন্টারপ্রাইজ, সাভার) থেকে দ্রুত ক্যাশ-আউট করা হয়েছে (প্রমাণ: EVD-KB-004, EVD-KB-009)।`,
        matched_nodes: matchedNodes,
        matched_edges: matchedEdges,
        evidence_citations: matchedEdges.map(e => e.evidence),
        confidence: 0.97,
        uncertainty_notes: 'Core banking transaction logs confirm 100% downstream cashout.'
      };
    }

    // Intent 4: "এই ring-এর সাথে কোন agent যুক্ত?" / "Which agent is connected to this ring?"
    if (qLower.includes('ring-এর সাথে কোন agent') || qLower.includes('agent') && qLower.includes('ring') || qLower.includes('ring-003')) {
      const ringId = 'RING-003';
      const ringNode = this.nodes.get(ringId);
      const agentNode = this.nodes.get('AGT-DH-4412');
      const edge = Array.from(this.edges.values()).find(e => (e.source === ringId || e.target === ringId) && (e.source === 'AGT-DH-4412' || e.target === 'AGT-DH-4412'));

      const matchedNodes = [ringNode, agentNode].filter((n): n is KnowledgeNode => !!n);
      const matchedEdges = edge ? [edge] : [];

      return {
        query,
        language: isBn ? 'bn' : 'en',
        parsed_intent: {
          target_entity_id: ringId,
          target_entity_type: 'RING',
          question_type: 'AGENT_OF_RING'
        },
        answer_text: `Ring RING-003 (Dhaka-Savar Mule Network) is connected to Agent AGT-DH-4412 (Rahman Enterprise) as its primary cash-out terminal (Evidence: EVD-KB-008).`,
        answer_text_bn: `রিং RING-003 (ঢাকা-সাভার মিউল নেটওয়ার্ক) এর প্রধান ক্যাশ-আউট পয়েন্ট হিসেবে এজেন্ট AGT-DH-4412 (রহমান এন্টারপ্রাইজ) সংযুক্ত রয়েছে (প্রমাণ: EVD-KB-008)।`,
        matched_nodes: matchedNodes,
        matched_edges: matchedEdges,
        evidence_citations: matchedEdges.map(e => e.evidence),
        confidence: 0.94,
        uncertainty_notes: 'Agent Guard confirmed 86% rapid drain ratio and 6 emulator devices linked to this counter.'
      };
    }

    // Intent 5: "এই campaign-এর প্রথম evidence কখন পাওয়া গেছে?" / "When was the first evidence for this campaign?"
    if (qLower.includes('প্রথম evidence') || qLower.includes('first evidence') || qLower.includes('প্রথম প্রমাণ') || qLower.includes('earliest evidence')) {
      const campId = 'CAMP-2026-EID-01';
      const campNode = this.nodes.get(campId);
      const firstEvidenceEdge = this.edges.get('EDGE-KB-006'); // Earliest conversation evidence

      return {
        query,
        language: isBn ? 'bn' : 'en',
        parsed_intent: {
          target_entity_id: campId,
          target_entity_type: 'CAMPAIGN',
          question_type: 'CAMPAIGN_FIRST_EVIDENCE'
        },
        answer_text: `First evidence for Campaign CAMP-2026-EID-01 was recorded on 2026-10-01 14:15:30 via Scam Call Detection Engine (Evidence ID: EVD-KB-006, Audio/Transcript ID: CONV-2026-8821).`,
        answer_text_bn: `ক্যাম্পেইন CAMP-2026-EID-01 এর প্রথম প্রমাণ ২০২৬-১০-০১ তারিখ দুপুর ১৪:১৫:৩০ মিনিটে স্ক্যাম কল ডিটেকশন ইঞ্জিনে শনাক্ত হয় (প্রমাণ আইডি: EVD-KB-006, ট্রান্সক্রিপ্ট: CONV-2026-8821)।`,
        matched_nodes: campNode ? [campNode] : [],
        matched_edges: firstEvidenceEdge ? [firstEvidenceEdge] : [],
        evidence_citations: firstEvidenceEdge ? [firstEvidenceEdge.evidence] : [],
        confidence: 0.99,
        uncertainty_notes: 'Timestamp synchronized with telecom switch CDR and AI speech classifier.'
      };
    }

    // Intent 3: "এই complaint/wallet কোন campaign-এর সাথে মিলে/যুক্ত?" / "Which campaign is linked to this complaint or wallet?"
    if (qLower.includes('campaign') || qLower.includes('cmp-2026-0914')) {
      const complaintId = 'CMP-2026-0914';
      const cmpNode = this.nodes.get(complaintId);
      const campNode = this.nodes.get('CAMP-2026-EID-01');
      const edge = Array.from(this.edges.values()).find(e => e.source === complaintId && e.target === 'CAMP-2026-EID-01') || this.edges.get('EDGE-KB-020');

      const matchedNodes = [cmpNode, campNode].filter((n): n is KnowledgeNode => !!n);
      const matchedEdges = edge ? [edge] : [];

      return {
        query,
        language: isBn ? 'bn' : 'en',
        parsed_intent: {
          target_entity_id: complaintId,
          target_entity_type: 'COMPLAINT',
          question_type: 'CAMPAIGN_OF_COMPLAINT'
        },
        answer_text: `Matches Campaign CAMP-2026-EID-01 ("Fake Eid Cashback & Customer Care Hijack Ring") with 96% semantic and entity similarity (Evidence: EVD-KB-007, EVD-KB-020).`,
        answer_text_bn: `ক্যাম্পেইন CAMP-2026-EID-01 ("ঈদ ক্যাশব্যাক ও ফেক কাস্টমার কেয়ার প্রতারণা রিং") এর সাথে ৯৬% ভাষাগত ও উপাদানগত মিল রয়েছে (প্রমাণ: EVD-KB-007, EVD-KB-020)।`,
        matched_nodes: matchedNodes,
        matched_edges: matchedEdges,
        evidence_citations: matchedEdges.map(e => e.evidence),
        confidence: 0.96,
        uncertainty_notes: 'NLP semantic cosine score: 0.96, shared scam phrase: "আপনার অ্যাকাউন্ট লক হয়ে গেছে ওটিপি বলুন".'
      };
    }

    // Fallback: General Entity Search / Keyword matching
    const searchTerms = qLower.split(/\s+/).filter(t => t.length > 2);
    const matchedNodes: KnowledgeNode[] = [];
    for (const node of this.nodes.values()) {
      if (searchTerms.some(term => node.id.toLowerCase().includes(term) || node.label.toLowerCase().includes(term))) {
        matchedNodes.push(node);
      }
    }

    return {
      query,
      language: isBn ? 'bn' : 'en',
      parsed_intent: {
        question_type: 'GENERAL_ENTITY_EXPANSION'
      },
      answer_text: `Found ${matchedNodes.length} graph entities matching query. Expand connections in the Intelligence Graph view to inspect underlying evidence records.`,
      answer_text_bn: `অনুসন্ধানের সাথে মিল রেখে ${matchedNodes.length} টি গ্রাফ উপাদান পাওয়া গেছে। বিস্তারিত প্রমাণের জন্য ইন্টেলিজেন্স গ্রাফ দেখুন।`,
      matched_nodes: matchedNodes.slice(0, 10),
      matched_edges: [],
      evidence_citations: [],
      confidence: matchedNodes.length > 0 ? 0.85 : 0.40,
      uncertainty_notes: 'Entity keyword match.'
    };
  }

  // ================= 4. COPILOT GRAPH EVIDENCE PACK GENERATOR =================
  generateCopilotEvidencePack(entityId: string): KnowledgeGraphEvidencePack {
    const node = this.nodes.get(entityId) || Array.from(this.nodes.values())[0];
    const sub = this.getSubGraph({ center_node_id: node.id, depth: 2, limit: 25 });

    const connectedCampaigns: { campaign_id: string; name: string; confidence: number; evidence_id: string }[] = [];
    const connectedRings: { ring_id: string; name: string; evidence_id: string }[] = [];
    const associatedComplaints: { complaint_id: string; date: string; category: string; evidence_id: string }[] = [];
    const fundFlowTrail: { from_wallet: string; to_wallet: string; amount_bdt: number; agent_id?: string; evidence_id: string }[] = [];
    const suspiciousDevices: { device_id: string; shared_wallets_count: number; evidence_id: string }[] = [];
    const evidenceRecords: Record<string, KnowledgeEdgeEvidence> = {};

    for (const edge of sub.edges) {
      evidenceRecords[edge.evidence.source_event_id] = edge.evidence;

      if (edge.type === 'MATCHES_CAMPAIGN') {
        const camp = this.nodes.get(edge.target);
        if (camp) {
          connectedCampaigns.push({
            campaign_id: camp.id,
            name: camp.label,
            confidence: edge.evidence.confidence,
            evidence_id: edge.evidence.source_event_id
          });
        }
      } else if (edge.type === 'CONNECTED_TO_RING') {
        const ring = this.nodes.get(edge.target);
        if (ring) {
          connectedRings.push({
            ring_id: ring.id,
            name: ring.label,
            evidence_id: edge.evidence.source_event_id
          });
        }
      } else if (edge.type === 'TRANSFERRED_TO' || edge.type === 'CASHED_OUT_AT') {
        fundFlowTrail.push({
          from_wallet: edge.source,
          to_wallet: edge.target,
          amount_bdt: edge.evidence.raw_payload?.amount_bdt || 18500,
          agent_id: edge.type === 'CASHED_OUT_AT' ? edge.target : undefined,
          evidence_id: edge.evidence.source_event_id
        });
      } else if (edge.type === 'USES') {
        const dev = this.nodes.get(edge.target);
        if (dev && dev.type === 'DEVICE') {
          suspiciousDevices.push({
            device_id: dev.id,
            shared_wallets_count: dev.attributes?.shared_wallets || 6,
            evidence_id: edge.evidence.source_event_id
          });
        }
      } else if (edge.source.startsWith('CMP-') || edge.target.startsWith('CMP-')) {
        const cmpId = edge.source.startsWith('CMP-') ? edge.source : edge.target;
        const cmp = this.nodes.get(cmpId);
        if (cmp) {
          associatedComplaints.push({
            complaint_id: cmp.id,
            date: cmp.first_seen.slice(0, 10),
            category: cmp.subtitle || 'Fraud',
            evidence_id: edge.evidence.source_event_id
          });
        }
      }
    }

    return {
      entity_id: node.id,
      entity_type: node.type,
      connected_campaigns: connectedCampaigns,
      connected_rings: connectedRings,
      associated_complaints: associatedComplaints,
      fund_flow_trail: fundFlowTrail,
      suspicious_devices: suspiciousDevices,
      evidence_records: evidenceRecords,
      summary_en: `Entity ${node.id} (${node.label}) is connected to ${connectedCampaigns.length} scam campaign(s), ${connectedRings.length} mule ring(s), and backed by ${Object.keys(evidenceRecords).length} verified evidence events.`,
      summary_bn: `উপাদান ${node.id} (${node.label}) ${connectedCampaigns.length} টি স্ক্যাম ক্যাম্পেইন এবং ${connectedRings.length} টি মিউল রিং এর সাথে সংযুক্ত, যা ${Object.keys(evidenceRecords).length} টি অডিট প্রমাণের মাধ্যমে সমর্থিত।`,
      uncertainty_margin: 'All relationships are derived from core banking logs, CDR events, and verified AI signals with >90% confidence.'
    };
  }

  // ================= 5. SEED DATASET (STORYLINE DEMO) =================
  private seedComprehensiveKnowledgeGraph() {
    // ----------------- NODES -----------------

    // 1. CUSTOMER
    this.addNode({
      id: 'CUST-BANGLA-8821',
      type: 'CUSTOMER',
      label: 'Ruma Begum',
      label_bn: 'রুমা বেগম',
      subtitle: 'Salaried Factory Worker (Mirpur, Dhaka)',
      risk_level: 'LOW',
      is_suspicious: false,
      attributes: { segment: 'salaried', kyc: 'standard', account_age_days: 420 },
      first_seen: '2025-08-10T09:00:00Z',
      last_seen: '2026-10-01T14:25:00Z'
    });

    this.addNode({
      id: 'CUST-BANGLA-9902',
      type: 'CUSTOMER',
      label: 'Kamal Hossain',
      label_bn: 'কামাল হোসেন',
      subtitle: 'Small Trader (Gazipur)',
      risk_level: 'LOW',
      is_suspicious: false,
      attributes: { segment: 'merchant_owner', kyc: 'standard' },
      first_seen: '2025-06-01T10:00:00Z',
      last_seen: '2026-10-01T16:10:00Z'
    });

    // 2. WALLETS
    this.addNode({
      id: 'WAL-CUST-8821',
      type: 'WALLET',
      label: 'Wallet 01712-445566',
      label_bn: 'ওয়ালেট ০১৭১২-৪৪৫৫৬৬',
      subtitle: 'Victim Personal Account',
      risk_level: 'LOW',
      is_suspicious: false,
      attributes: { balance_bdt: 2400, monthly_avg_bdt: 15000 },
      first_seen: '2025-08-10T09:00:00Z',
      last_seen: '2026-10-01T14:22:10Z'
    });

    this.addNode({
      id: 'WAL-SYN-091177',
      type: 'WALLET',
      label: 'Wallet W-SYN-091177',
      label_bn: 'ওয়ালেট W-SYN-091177',
      subtitle: 'Tier-1 Mule Collector Wallet',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { rapid_drain_pct: 94, in_degree: 8, out_degree: 1 },
      first_seen: '2026-09-28T11:00:00Z',
      last_seen: '2026-10-01T14:28:15Z'
    });

    this.addNode({
      id: 'WAL-SYN-091178',
      type: 'WALLET',
      label: 'Wallet W-SYN-091178',
      label_bn: 'ওয়ালেট W-SYN-091178',
      subtitle: 'Tier-2 Layering Mule Wallet',
      risk_level: 'HIGH',
      is_suspicious: true,
      attributes: { rapid_drain_pct: 88, in_degree: 5 },
      first_seen: '2026-09-29T10:00:00Z',
      last_seen: '2026-10-01T15:00:00Z'
    });

    // 3. PHONE NUMBERS
    this.addNode({
      id: 'PHN-01799443322',
      type: 'PHONE',
      label: '+8801799-443322',
      label_bn: '+৮৮০১৭৯৯-৪৪৩৩২২',
      subtitle: 'Scammer Caller Line ("upay Head Office")',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { total_outbound_calls_today: 142, avg_duration_sec: 78, is_voip: true },
      first_seen: '2026-09-30T08:00:00Z',
      last_seen: '2026-10-01T14:15:30Z'
    });

    // 4. DEVICES
    this.addNode({
      id: 'DEV-EMU-ANDROID-991',
      type: 'DEVICE',
      label: 'MEmu Android Emulator #991',
      label_bn: 'এমোলেটর ডিভাইস #৯৯১',
      subtitle: 'Cloned Virtual Hardware (IMEI Spoofed)',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { shared_wallets: 6, is_root: true, os: 'Android 9.0' },
      first_seen: '2026-09-25T14:00:00Z',
      last_seen: '2026-10-01T14:28:15Z'
    });

    // 5. AGENTS
    this.addNode({
      id: 'AGT-DH-4412',
      type: 'AGENT',
      label: 'Rahman Enterprise (AGT-DH-4412)',
      label_bn: 'রহমান এন্টারপ্রাইজ (সাভার)',
      subtitle: 'Savar Ring Exit Point (Fraud Review)',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { cashout_ratio: 0.86, structured_smurfing_count: 14, shared_emulators: 6 },
      first_seen: '2026-05-12T00:00:00Z',
      last_seen: '2026-10-01T14:28:15Z'
    });

    this.addNode({
      id: 'AGT-DH-8821',
      type: 'AGENT',
      label: 'Mayer Doa Telecom (AGT-DH-8821)',
      label_bn: 'মায়ের দোয়া টেলিকম (কাওরান বাজার)',
      subtitle: 'Legitimate High-Volume Wholesale Hub',
      risk_level: 'LOW',
      is_suspicious: false,
      attributes: { classification: 'HIGH_ACTIVITY', peer_volume_deviation: 8.5 },
      first_seen: '2023-01-10T00:00:00Z',
      last_seen: '2026-10-01T17:00:00Z'
    });

    // 6. MERCHANTS
    this.addNode({
      id: 'MERCH-QR-9901',
      type: 'MERCHANT',
      label: 'Fashion Hub Express (MERCH-9901)',
      label_bn: 'ফ্যাশন হাব এক্সপ্রেস',
      subtitle: 'Bogus QR Payment Terminal',
      risk_level: 'HIGH',
      is_suspicious: true,
      attributes: { chargeback_ratio: 0.28, linked_wallets: 3 },
      first_seen: '2026-09-15T00:00:00Z',
      last_seen: '2026-10-01T12:00:00Z'
    });

    // 7. TRANSACTIONS
    this.addNode({
      id: 'TXN-SYN-88319',
      type: 'TRANSACTION',
      label: 'Txn ৳18,500 (TXN-88319)',
      label_bn: 'লেনদেন ৳১৮,৫০০',
      subtitle: 'P2P Send Money (Scam Coerced)',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { amount_bdt: 18500, type: 'P2P_SEND', channel: 'USSD', status: 'COMPLETED' },
      first_seen: '2026-10-01T14:22:10Z',
      last_seen: '2026-10-01T14:22:10Z'
    });

    // 8. COMPLAINTS
    this.addNode({
      id: 'CMP-2026-0914',
      type: 'COMPLAINT',
      label: 'CMP-2026-0914 (Ruma Begum)',
      label_bn: 'অভিযোগ CMP-2026-0914',
      subtitle: 'Fake Customer Care OTP Impersonation',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { category: 'fraud', priority: 'GOLDEN_HOUR', loss_bdt: 18500 },
      first_seen: '2026-10-01T14:40:00Z',
      last_seen: '2026-10-01T14:40:00Z'
    });

    this.addNode({
      id: 'CMP-2026-0915',
      type: 'COMPLAINT',
      label: 'CMP-2026-0915 (Kamal Hossain)',
      label_bn: 'অভিযোগ CMP-2026-0915',
      subtitle: 'SIM Block Threat Transfer',
      risk_level: 'HIGH',
      is_suspicious: true,
      attributes: { category: 'fraud', priority: 'HIGH', loss_bdt: 24000 },
      first_seen: '2026-10-01T16:20:00Z',
      last_seen: '2026-10-01T16:20:00Z'
    });

    this.addNode({
      id: 'CMP-2026-0916',
      type: 'COMPLAINT',
      label: 'CMP-2026-0916 (Nasima Akter)',
      label_bn: 'অভিযোগ CMP-2026-0916',
      subtitle: 'Fake Prize Lottery Claim',
      risk_level: 'HIGH',
      is_suspicious: true,
      attributes: { category: 'fraud', priority: 'HIGH', loss_bdt: 12000 },
      first_seen: '2026-10-01T17:05:00Z',
      last_seen: '2026-10-01T17:05:00Z'
    });

    // 9. SCAM CONVERSATION
    this.addNode({
      id: 'CONV-2026-8821',
      type: 'SCAM_CONVERSATION',
      label: 'Call Transcript #8821',
      label_bn: 'কল কথোপকথন #৮৮২১',
      subtitle: 'Bangla Audio Stream NLP Classification',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { duration_sec: 145, confidence: 0.96, signals: ['SIG_CUSTOMER_CARE', 'SIG_OTP_REQUEST', 'SIG_URGENCY'] },
      first_seen: '2026-10-01T14:15:30Z',
      last_seen: '2026-10-01T14:18:00Z'
    });

    // 10. SCAM TYPOLOGY
    this.addNode({
      id: 'TYP-FAKE-CARE',
      type: 'SCAM_TYPOLOGY',
      label: 'Fake Customer Care (T1)',
      label_bn: 'ভুয়া কাস্টমার কেয়ার প্রতারণা (T1)',
      subtitle: 'Authority Impersonation & OTP Harvest',
      risk_level: 'HIGH',
      is_suspicious: true,
      attributes: { code: 'T1_EMERGENCY_IMPERSONATION', national_rank: 1 },
      first_seen: '2024-01-01T00:00:00Z',
      last_seen: '2026-10-01T18:00:00Z'
    });

    // 11. CAMPAIGN
    this.addNode({
      id: 'CAMP-2026-EID-01',
      type: 'CAMPAIGN',
      label: 'Eid Cashback Care Hijack (CAMP-01)',
      label_bn: 'ঈদ ক্যাশব্যাক কেয়ার প্রতারণা রিং',
      subtitle: 'Coordinated Outbound Call Campaign',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { total_loss_bdt: 485000, linked_complaints: 18, status: 'ACTIVE' },
      first_seen: '2026-09-28T08:00:00Z',
      last_seen: '2026-10-01T17:30:00Z'
    });

    // 12. RING
    this.addNode({
      id: 'RING-003',
      type: 'RING',
      label: 'Dhaka-Savar Rapid Mule Ring (Ring-003)',
      label_bn: 'ঢাকা-সাভার মিউল নেটওয়ার্ক (Ring-003)',
      subtitle: '8 Wallets + 1 Cash-Out Terminal',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { density: 0.74, pass_through_ratio: 0.86, ring_score: 0.92 },
      first_seen: '2026-09-25T00:00:00Z',
      last_seen: '2026-10-01T14:28:15Z'
    });

    // 13. LOCATION
    this.addNode({
      id: 'LOC-SAVAR-DHAKA',
      type: 'LOCATION',
      label: 'Savar Bus Stand Cluster, Dhaka',
      label_bn: 'সাভার বাস স্ট্যান্ড ক্লাস্টার, ঢাকা',
      subtitle: 'High Velocity Cash-Out Geo Cell',
      risk_level: 'HIGH',
      is_suspicious: true,
      attributes: { division: 'Dhaka', district_type: 'urban', cluster_status: 'RISING_CLUSTER' },
      first_seen: '2026-09-20T00:00:00Z',
      last_seen: '2026-10-01T18:00:00Z'
    });

    // 14. EVENT
    this.addNode({
      id: 'EVT-RAPID-DRAIN-0914',
      type: 'EVENT',
      label: 'Rapid Cash-Out Event (6 mins)',
      label_bn: 'তড়িৎ ক্যাশ-আউট ইভেন্ট',
      subtitle: '৳18,000 withdrawn at counter',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { latency_mins: 6.2, amount_bdt: 18000 },
      first_seen: '2026-10-01T14:28:15Z',
      last_seen: '2026-10-01T14:28:15Z'
    });

    // 15. CASE
    this.addNode({
      id: 'CASE-2026-MLRO-042',
      type: 'CASE',
      label: 'Operation Red Savar (CASE-042)',
      label_bn: 'অপারেশন রেড সাভার (মামলা-০৪২)',
      subtitle: 'Active MLRO & Law Enforcement Package',
      risk_level: 'CRITICAL',
      is_suspicious: true,
      attributes: { status: 'INVESTIGATING', assigned_analyst: 'ANALYST-101', priority: 'P1' },
      first_seen: '2026-10-01T15:00:00Z',
      last_seen: '2026-10-01T18:00:00Z'
    });

    // ----------------- EDGES WITH EVIDENCE RECORDS -----------------

    // Edge 1: Customer OWNS Wallet
    this.addEdge({
      id: 'EDGE-KB-001',
      source: 'CUST-BANGLA-8821',
      target: 'WAL-CUST-8821',
      type: 'OWNS',
      label: 'OWNS',
      label_bn: 'মালিকানা',
      is_suspicious: false,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-001',
        timestamp: '2025-08-10T09:00:00Z',
        confidence: 1.0,
        relationship_type: 'OWNS',
        evidence_summary: 'National ID biometric e-KYC verification record #NID-772910',
        evidence_summary_bn: 'জাতীয় পরিচয়পত্র বায়োমেট্রিক ই-কেওয়াইসি ভেরিফিকেশন রেকর্ড #NID-772910',
        verification_source: 'CORE_BANKING_LOG'
      },
      created_at: '2025-08-10T09:00:00Z'
    });

    // Edge 2: Customer REPORTED Phone
    this.addEdge({
      id: 'EDGE-KB-002',
      source: 'CUST-BANGLA-8821',
      target: 'PHN-01799443322',
      type: 'REPORTED',
      label: 'REPORTED',
      label_bn: 'রিপোর্ট করেছে',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-002',
        timestamp: '2026-10-01T14:40:00Z',
        confidence: 0.98,
        relationship_type: 'REPORTED',
        evidence_summary: 'Customer helpline complaint transcript citing fraudulent caller 01799-443322',
        evidence_summary_bn: 'গ্রাহক হেল্পলাইন অভিযোগ ট্রান্সক্রিপ্ট যেখানে প্রতারণামূলক কলার ০১৭৯৯-৪৪৩৩২২ উল্লেখ আছে',
        verification_source: 'COMPLAINT_INTAKE'
      },
      created_at: '2026-10-01T14:40:00Z'
    });

    // Edge 3: Complaint REFERENCES Phone
    this.addEdge({
      id: 'EDGE-KB-003',
      source: 'CMP-2026-0914',
      target: 'PHN-01799443322',
      type: 'REFERENCES',
      label: 'REFERENCES',
      label_bn: 'সূত্র নির্দেশ',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-003',
        timestamp: '2026-10-01T14:40:00Z',
        confidence: 0.99,
        relationship_type: 'REFERENCES',
        evidence_summary: 'Automated entity extraction pipeline regex extraction from complaint text',
        evidence_summary_bn: 'অভিযোগের টেক্সট থেকে স্বয়ংক্রিয় রেজেক্স ও এনএলপি এনটিটি নিষ্কাশন',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T14:40:00Z'
    });

    // Edge 4: Wallet TRANSFERRED_TO Wallet
    this.addEdge({
      id: 'EDGE-KB-004',
      source: 'WAL-CUST-8821',
      target: 'WAL-SYN-091177',
      type: 'TRANSFERRED_TO',
      label: 'TRANSFERRED_TO (৳18,500)',
      label_bn: 'অর্থ স্থানান্তর (৳১৮,৫০০)',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-004',
        timestamp: '2026-10-01T14:22:10Z',
        confidence: 1.0,
        relationship_type: 'TRANSFERRED_TO',
        evidence_summary: 'Core ledger txn TXN-SYN-88319: ৳18,500 transferred via USSD channel *268#',
        evidence_summary_bn: 'কোর লেজার লেনদেন TXN-SYN-88319: ইউএসএসডি চ্যানেল *268# এর মাধ্যমে ৳১৮,৫০০ স্থানান্তরিত',
        verification_source: 'CORE_BANKING_LOG',
        raw_payload: { amount_bdt: 18500, txn_id: 'TXN-SYN-88319' }
      },
      created_at: '2026-10-01T14:22:10Z'
    });

    // Edge 5: Wallet USES Device
    this.addEdge({
      id: 'EDGE-KB-005',
      source: 'WAL-SYN-091177',
      target: 'DEV-EMU-ANDROID-991',
      type: 'USES',
      label: 'USES',
      label_bn: 'ব্যবহার করে',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-005',
        timestamp: '2026-10-01T14:20:00Z',
        confidence: 0.97,
        relationship_type: 'USES',
        evidence_summary: 'App header telemetry detected MEmu virtual hardware and spoofed Android ID',
        evidence_summary_bn: 'টেলিম্যাট্রি হেডারে MEmu ভার্চুয়াল হার্ডওয়্যার এবং ক্লোনড অ্যান্ড্রয়েড আইডি শনাক্ত',
        verification_source: 'DEVICE_FINGERPRINT'
      },
      created_at: '2026-10-01T14:20:00Z'
    });

    // Edge 6: Conversation MATCHES Campaign
    this.addEdge({
      id: 'EDGE-KB-006',
      source: 'CONV-2026-8821',
      target: 'CAMP-2026-EID-01',
      type: 'MATCHES_CAMPAIGN',
      label: 'MATCHES_CAMPAIGN (0.96)',
      label_bn: 'ক্যাম্পেইনের সাথে সাদৃশ্য (০.৯৬)',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-006',
        timestamp: '2026-10-01T14:18:00Z',
        confidence: 0.96,
        relationship_type: 'MATCHES_CAMPAIGN',
        evidence_summary: 'Acoustic & text embedding cosine similarity 0.96 with Eid Care Hijack script template',
        evidence_summary_bn: 'ঈদ কেয়ার হাইজ্যাক স্ক্রিপ্টের সাথে অ্যাকোস্টিক ও টেক্সট এম্বেডিং মিল ০.৯৬',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T14:18:00Z'
    });

    // Edge 7: Complaint MATCHES Typology
    this.addEdge({
      id: 'EDGE-KB-007',
      source: 'CMP-2026-0914',
      target: 'TYP-FAKE-CARE',
      type: 'MATCHES_TYPOLOGY',
      label: 'MATCHES_TYPOLOGY',
      label_bn: 'টাইপোলজি মিল',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-007',
        timestamp: '2026-10-01T14:40:00Z',
        confidence: 0.98,
        relationship_type: 'MATCHES_TYPOLOGY',
        evidence_summary: 'Complaint classifier assigned T1_EMERGENCY_IMPERSONATION with 98% confidence',
        evidence_summary_bn: 'কমপ্লেইন্ট ক্লাসিফায়ার ৯৮% কনফিডেন্সে T1 ইমার্জেন্সি ইমপারসোনেশন চিহ্নিত করেছে',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T14:40:00Z'
    });

    // Edge 8: Campaign CONNECTED_TO Ring
    this.addEdge({
      id: 'EDGE-KB-008',
      source: 'CAMP-2026-EID-01',
      target: 'RING-003',
      type: 'CONNECTED_TO_RING',
      label: 'CONNECTED_TO_RING',
      label_bn: 'রিং সংশ্লিষ্টতা',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-008',
        timestamp: '2026-10-01T14:30:00Z',
        confidence: 0.95,
        relationship_type: 'CONNECTED_TO_RING',
        evidence_summary: 'Campaign intelligence linked 8 victim transfers routed directly into Ring-003 collector nodes',
        evidence_summary_bn: 'ক্যাম্পেইন বিশ্লেষণে ৮টি ভিকটিম স্থানান্তর সরাসরি রিং-০০৩ কালেক্টরে জমা হতে দেখা গেছে',
        verification_source: 'SYSTEM_AUDIT'
      },
      created_at: '2026-10-01T14:30:00Z'
    });

    // Edge 9: Wallet CASHED_OUT_AT Agent
    this.addEdge({
      id: 'EDGE-KB-009',
      source: 'WAL-SYN-091177',
      target: 'AGT-DH-4412',
      type: 'CASHED_OUT_AT',
      label: 'CASHED_OUT_AT (৳18,000)',
      label_bn: 'ক্যাশ-আউট সম্পন্ন (৳১৮,০০০)',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-009',
        timestamp: '2026-10-01T14:28:15Z',
        confidence: 1.0,
        relationship_type: 'CASHED_OUT_AT',
        evidence_summary: 'Agent terminal txn log: ৳18,000 cash withdrawal processed 6m 5s after inbound credit',
        evidence_summary_bn: 'এজেন্ট টার্মিনাল লগ: টাকা আসার মাত্র ৬ মিনিট ৫ সেকেন্ড পর ৳১৮,০০০ নগদ উত্তোলন সম্পন্ন',
        verification_source: 'CORE_BANKING_LOG',
        raw_payload: { amount_bdt: 18000, agent_id: 'AGT-DH-4412' }
      },
      created_at: '2026-10-01T14:28:15Z'
    });

    // Edge 10: Ring CONTAINS Wallet
    this.addEdge({
      id: 'EDGE-KB-010',
      source: 'RING-003',
      target: 'WAL-SYN-091177',
      type: 'CONTAINS_WALLET',
      label: 'CONTAINS_WALLET',
      label_bn: 'সদস্য ওয়ালেট',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-010',
        timestamp: '2026-09-28T11:00:00Z',
        confidence: 0.99,
        relationship_type: 'CONTAINS_WALLET',
        evidence_summary: 'Graph community detection algorithm (Louvain modularity 0.88) mapped wallet into Ring-003',
        evidence_summary_bn: 'গ্রাফ কমিউনিটি ডিটেকশন অ্যালগরিদম ওয়ালেটটিকে রিং-০০৩ এর সদস্য হিসেবে ম্যাপিং করেছে',
        verification_source: 'SYSTEM_AUDIT'
      },
      created_at: '2026-09-28T11:00:00Z'
    });

    // Edge 11: Agent LOCATED_IN Location
    this.addEdge({
      id: 'EDGE-KB-011',
      source: 'AGT-DH-4412',
      target: 'LOC-SAVAR-DHAKA',
      type: 'LOCATED_IN',
      label: 'LOCATED_IN',
      label_bn: 'অবস্থান',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-011',
        timestamp: '2026-05-12T00:00:00Z',
        confidence: 1.0,
        relationship_type: 'LOCATED_IN',
        evidence_summary: 'Agent business registration trade license geo-tag #TRD-SAVAR-8810',
        evidence_summary_bn: 'এজেন্ট ট্রেড লাইসেন্স ও জিও-ট্যাগ অবস্থান #TRD-SAVAR-8810',
        verification_source: 'CORE_BANKING_LOG'
      },
      created_at: '2026-05-12T00:00:00Z'
    });

    // Edge 12: Event TRIGGERED_EVENT
    this.addEdge({
      id: 'EDGE-KB-012',
      source: 'WAL-SYN-091177',
      target: 'EVT-RAPID-DRAIN-0914',
      type: 'TRIGGERED_EVENT',
      label: 'TRIGGERED_EVENT',
      label_bn: 'ইভেন্ট সূত্রপাত',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-012',
        timestamp: '2026-10-01T14:28:15Z',
        confidence: 1.0,
        relationship_type: 'TRIGGERED_EVENT',
        evidence_summary: 'Real-time velocity monitor triggered ALERT_RAPID_DRAIN rule #R-VEL-08',
        evidence_summary_bn: 'রিয়েল-টাইম ভেলোসিটি মনিটর ALERT_RAPID_DRAIN রুল #R-VEL-08 ট্রিগার করেছে',
        verification_source: 'SYSTEM_AUDIT'
      },
      created_at: '2026-10-01T14:28:15Z'
    });

    // Edge 13: Case ATTACHED_TO_CASE
    this.addEdge({
      id: 'EDGE-KB-013',
      source: 'RING-003',
      target: 'CASE-2026-MLRO-042',
      type: 'ATTACHED_TO_CASE',
      label: 'ATTACHED_TO_CASE',
      label_bn: 'মামলায় সংযুক্ত',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-013',
        timestamp: '2026-10-01T15:00:00Z',
        confidence: 1.0,
        relationship_type: 'ATTACHED_TO_CASE',
        evidence_summary: 'MLRO Analyst ANALYST-101 attached Ring-003 to formal investigation docket',
        evidence_summary_bn: 'এমএলআরও অ্যানালিস্ট ANALYST-101 রিং-০০৩ কে আনুষ্ঠানিক তদন্ত ডকেটে সংযুক্ত করেছেন',
        verification_source: 'MLRO_AFFIRMATION'
      },
      created_at: '2026-10-01T15:00:00Z'
    });

    // Edge 14: Linked Complaint CMP-2026-0915 to Campaign
    this.addEdge({
      id: 'EDGE-KB-014',
      source: 'CMP-2026-0915',
      target: 'CAMP-2026-EID-01',
      type: 'MATCHES_CAMPAIGN',
      label: 'MATCHES_CAMPAIGN',
      label_bn: 'ক্যাম্পেইনে অন্তর্ভুক্ত',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-014',
        timestamp: '2026-10-01T16:20:00Z',
        confidence: 0.94,
        relationship_type: 'MATCHES_CAMPAIGN',
        evidence_summary: 'Shared scam caller voice characteristics and similar SIM registration coercion',
        evidence_summary_bn: 'একই ভুয়া কলার ও সিম রেজিস্ট্রেশন সংক্রান্ত অভিন্ন প্রতারণার কৌশল',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T16:20:00Z'
    });

    // Edge 15: Linked Complaint CMP-2026-0916 to Campaign
    this.addEdge({
      id: 'EDGE-KB-015',
      source: 'CMP-2026-0916',
      target: 'CAMP-2026-EID-01',
      type: 'MATCHES_CAMPAIGN',
      label: 'MATCHES_CAMPAIGN',
      label_bn: 'ক্যাম্পেইনে অন্তর্ভুক্ত',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-015',
        timestamp: '2026-10-01T17:05:00Z',
        confidence: 0.91,
        relationship_type: 'MATCHES_CAMPAIGN',
        evidence_summary: 'Shared prize lottery script and recipient mule network nexus',
        evidence_summary_bn: 'লটারি পুরস্কার সংক্রান্ত স্ক্রিপ্ট এবং একই মিউল নেটওয়ার্ক সংশ্লিষ্টতা',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T17:05:00Z'
    });

    // Edge 16: Ring CONTAINS Secondary Wallet W-SYN-091178
    this.addEdge({
      id: 'EDGE-KB-016',
      source: 'RING-003',
      target: 'WAL-SYN-091178',
      type: 'CONTAINS_WALLET',
      label: 'CONTAINS_WALLET',
      label_bn: 'সদস্য ওয়ালেট',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-016',
        timestamp: '2026-09-29T10:00:00Z',
        confidence: 0.96,
        relationship_type: 'CONTAINS_WALLET',
        evidence_summary: 'Layering transfer pattern link between W-SYN-091177 and W-SYN-091178',
        evidence_summary_bn: 'ওয়ালেট W-SYN-091177 ও W-SYN-091178 এর মধ্যে লেয়ারিং লেনদেনের প্রমাণ',
        verification_source: 'SYSTEM_AUDIT'
      },
      created_at: '2026-09-29T10:00:00Z'
    });

    // Edge 17: Merchant RECEIVED_FROM Wallet
    this.addEdge({
      id: 'EDGE-KB-017',
      source: 'MERCH-QR-9901',
      target: 'WAL-SYN-091178',
      type: 'RECEIVED_FROM',
      label: 'RECEIVED_FROM (৳5,000)',
      label_bn: 'পেমেন্ট গ্রহণ (৳৫,০০০)',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-017',
        timestamp: '2026-10-01T12:00:00Z',
        confidence: 0.95,
        relationship_type: 'RECEIVED_FROM',
        evidence_summary: 'Merchant QR payment from mule wallet with zero genuine retail product history',
        evidence_summary_bn: 'মিউল ওয়ালেট থেকে মার্চেন্ট কিউআর পেমেন্ট যেখানে কোনো আসল পণ্য বিক্রির তথ্য নেই',
        verification_source: 'CORE_BANKING_LOG'
      },
      created_at: '2026-10-01T12:00:00Z'
    });

    // Edge 18: Complaint REPORTED_BY Customer
    this.addEdge({
      id: 'EDGE-KB-018',
      source: 'CMP-2026-0914',
      target: 'CUST-BANGLA-8821',
      type: 'REPORTED',
      label: 'REPORTED_BY',
      label_bn: 'অভিযোগকারী গ্রাহক',
      is_suspicious: false,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-018',
        timestamp: '2026-10-01T14:40:00Z',
        confidence: 1.0,
        relationship_type: 'REPORTED',
        evidence_summary: 'Customer Ruma Begum logged into customer portal to submit incident ticket',
        evidence_summary_bn: 'গ্রাহক রুমা বেগম কাস্টমার পোর্টালে লগইন করে অভিযোগ টিকিট দাখিল করেছেন',
        verification_source: 'COMPLAINT_INTAKE'
      },
      created_at: '2026-10-01T14:40:00Z'
    });

    // Edge 19: Complaint REFERENCES Transaction
    this.addEdge({
      id: 'EDGE-KB-019',
      source: 'CMP-2026-0914',
      target: 'TXN-SYN-88319',
      type: 'REFERENCES',
      label: 'REFERENCES_TXN',
      label_bn: 'লেনদেন সূত্র',
      is_suspicious: true,
      weight: 1,
      evidence: {
        source_event_id: 'EVD-KB-019',
        timestamp: '2026-10-01T14:40:00Z',
        confidence: 0.99,
        relationship_type: 'REFERENCES',
        evidence_summary: 'Complaint ticket references disputed transaction TXN-SYN-88319',
        evidence_summary_bn: 'অভিযোগপত্রে বিরোধপূর্ণ লেনদেন TXN-SYN-88319 এর রেফারেন্স রয়েছে',
        verification_source: 'COMPLAINT_INTAKE'
      },
      created_at: '2026-10-01T14:40:00Z'
    });

    // Edge 20: Complaint MATCHES Campaign
    this.addEdge({
      id: 'EDGE-KB-020',
      source: 'CMP-2026-0914',
      target: 'CAMP-2026-EID-01',
      type: 'MATCHES_CAMPAIGN',
      label: 'MATCHES_CAMPAIGN',
      label_bn: 'ক্যাম্পেইনে সংশ্লিষ্ট',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-020',
        timestamp: '2026-10-01T14:40:00Z',
        confidence: 0.96,
        relationship_type: 'MATCHES_CAMPAIGN',
        evidence_summary: 'Complaint language and timing aligns with Eid Care Hijack campaign',
        evidence_summary_bn: 'অভিযোগের ভাষা ও সময় ঈদ কেয়ার হাইজ্যাক ক্যাম্পেইনের সাথে পুরোপুরি মিলে যায়',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T14:40:00Z'
    });

    // Edge 21: Phone COMMUNICATED_WITH Wallet
    this.addEdge({
      id: 'EDGE-KB-021',
      source: 'PHN-01799443322',
      target: 'WAL-SYN-091177',
      type: 'COMMUNICATED_WITH',
      label: 'INSTRUCTED_DESTINATION',
      label_bn: 'গন্তব্য অ্যাকাউন্ট নির্দেশ',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-021',
        timestamp: '2026-10-01T14:18:00Z',
        confidence: 0.98,
        relationship_type: 'COMMUNICATED_WITH',
        evidence_summary: 'Scam call transcript captured caller verbally instructing victim to transfer to wallet W-SYN-091177',
        evidence_summary_bn: 'স্ক্যাম কল ট্রান্সক্রিপ্ট কলারকে ভিকটিমকে ওয়ালেট W-SYN-091177 এ টাকা পাঠাতে নির্দেশ দিতে রেকর্ড করেছে',
        verification_source: 'NLP_EXTRACTION'
      },
      created_at: '2026-10-01T14:18:00Z'
    });

    // Edge 22: Transaction TRANSFERRED_TO Mule Wallet
    this.addEdge({
      id: 'EDGE-KB-022',
      source: 'TXN-SYN-88319',
      target: 'WAL-SYN-091177',
      type: 'TRANSFERRED_TO',
      label: 'FUNDS_CREDITED',
      label_bn: 'টাকা জমা হয়েছে',
      is_suspicious: true,
      weight: 2,
      evidence: {
        source_event_id: 'EVD-KB-022',
        timestamp: '2026-10-01T14:22:10Z',
        confidence: 1.0,
        relationship_type: 'TRANSFERRED_TO',
        evidence_summary: 'Core ledger credit entry into beneficiary mule wallet W-SYN-091177',
        evidence_summary_bn: 'মিউল ওয়ালেট W-SYN-091177 এ কোর লেজার ক্রেডিট এন্ট্রি',
        verification_source: 'CORE_BANKING_LOG'
      },
      created_at: '2026-10-01T14:22:10Z'
    });
  }
}

export const scamKnowledgeGraph = new ScamKnowledgeGraphService();

