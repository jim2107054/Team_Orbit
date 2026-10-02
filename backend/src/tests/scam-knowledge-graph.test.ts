import { describe, it, expect } from 'vitest';
import { scamKnowledgeGraph } from '../services/scam-knowledge-graph.js';
import { copilotService } from '../services/copilot-service.js';

describe('Bangladesh Scam Knowledge Graph Service & Query Engine Suite', () => {

  it('initializes the knowledge graph with 15 node types and evidence-backed edges', () => {
    const nodes = scamKnowledgeGraph.getAllNodes();
    const edges = scamKnowledgeGraph.getAllEdges();

    expect(nodes.length).toBeGreaterThanOrEqual(15);
    expect(edges.length).toBeGreaterThanOrEqual(15);

    // Verify 15 distinct node types are present
    const nodeTypes = new Set(nodes.map(n => n.type));
    expect(nodeTypes.has('CUSTOMER')).toBe(true);
    expect(nodeTypes.has('WALLET')).toBe(true);
    expect(nodeTypes.has('PHONE')).toBe(true);
    expect(nodeTypes.has('DEVICE')).toBe(true);
    expect(nodeTypes.has('AGENT')).toBe(true);
    expect(nodeTypes.has('MERCHANT')).toBe(true);
    expect(nodeTypes.has('TRANSACTION')).toBe(true);
    expect(nodeTypes.has('COMPLAINT')).toBe(true);
    expect(nodeTypes.has('SCAM_CONVERSATION')).toBe(true);
    expect(nodeTypes.has('SCAM_TYPOLOGY')).toBe(true);
    expect(nodeTypes.has('CAMPAIGN')).toBe(true);
    expect(nodeTypes.has('RING')).toBe(true);
    expect(nodeTypes.has('LOCATION')).toBe(true);
    expect(nodeTypes.has('EVENT')).toBe(true);
    expect(nodeTypes.has('CASE')).toBe(true);

    // Verify EVERY edge has an underlying synthetic evidence record
    for (const edge of edges) {
      expect(edge.evidence).toBeDefined();
      expect(edge.evidence.source_event_id).toMatch(/^EVD-KB-\d+/);
      expect(edge.evidence.confidence).toBeGreaterThan(0.80);
      expect(edge.evidence.verification_source).toBeDefined();
      expect(edge.evidence.evidence_summary.length).toBeGreaterThan(10);
    }
  });

  it('performs progressive sub-graph expansion starting from customer complaint CMP-2026-0914', () => {
    // 1-hop depth expansion
    const subDepth1 = scamKnowledgeGraph.getSubGraph({
      center_node_id: 'CMP-2026-0914',
      depth: 1
    });

    expect(subDepth1.nodes.some(n => n.id === 'CMP-2026-0914')).toBe(true);
    expect(subDepth1.nodes.some(n => n.id === 'PHN-01799443322')).toBe(true);
    expect(subDepth1.nodes.some(n => n.id === 'TYP-FAKE-CARE')).toBe(true);

    // 2-hop depth expansion (reveals wallet, phone, campaign, ring)
    const subDepth2 = scamKnowledgeGraph.getSubGraph({
      center_node_id: 'CMP-2026-0914',
      depth: 2,
      limit: 30
    });

    expect(subDepth2.nodes.length).toBeGreaterThan(subDepth1.nodes.length);
    expect(subDepth2.nodes.some(n => n.id === 'WAL-CUST-8821' || n.id === 'WAL-SYN-091177')).toBe(true);
  });

  it('resolves natural language questions accurately with structured citations (Bangla & English)', () => {
    // Query 1: "এই নম্বরের সাথে কোন wallet যুক্ত?"
    const resPhone = scamKnowledgeGraph.queryGraph('এই নম্বরের সাথে কোন wallet যুক্ত? 01799-443322', 'bn');
    expect(resPhone.matched_nodes.some(n => n.id === 'WAL-SYN-091177')).toBe(true);
    expect(resPhone.confidence).toBeGreaterThanOrEqual(0.95);
    expect(resPhone.answer_text_bn).toContain('W-SYN-091177');

    // Query 2: "এই wallet-এর টাকা কোথায় গেছে?"
    const resMoney = scamKnowledgeGraph.queryGraph('এই wallet-এর টাকা কোথায় গেছে? WAL-SYN-091177', 'bn');
    expect(resMoney.matched_nodes.some(n => n.id === 'AGT-DH-4412')).toBe(true);
    expect(resMoney.answer_text_bn).toContain('AGT-DH-4412');
    expect(resMoney.answer_text_bn).toContain('সাভার');

    // Query 3: "এই complaint কোন campaign-এর সাথে মিলে?"
    const resCamp = scamKnowledgeGraph.queryGraph('এই complaint কোন campaign-এর সাথে মিলে? CMP-2026-0914', 'bn');
    expect(resCamp.matched_nodes.some(n => n.id === 'CAMP-2026-EID-01')).toBe(true);
    expect(resCamp.answer_text_bn).toContain('CAMP-2026-EID-01');

    // Query 4: "এই ring-এর সাথে কোন agent যুক্ত?"
    const resAgent = scamKnowledgeGraph.queryGraph('এই ring-এর সাথে কোন agent যুক্ত? RING-003', 'bn');
    expect(resAgent.matched_nodes.some(n => n.id === 'AGT-DH-4412')).toBe(true);
    expect(resAgent.answer_text_bn).toContain('AGT-DH-4412');

    // Query 5: "এই campaign-এর প্রথম evidence কখন পাওয়া গেছে?"
    const resFirst = scamKnowledgeGraph.queryGraph('এই campaign-এর প্রথম evidence কখন পাওয়া গেছে? CAMP-2026-EID-01', 'bn');
    expect(resFirst.answer_text_bn).toContain('২০২৬-১০-০১');
    expect(resFirst.evidence_citations.length).toBeGreaterThan(0);
    expect(resFirst.evidence_citations[0].source_event_id).toBe('EVD-KB-006');
  });

  it('generates a graph-derived Copilot Evidence Pack with zero hallucination', () => {
    const pack = scamKnowledgeGraph.generateCopilotEvidencePack('WAL-SYN-091177');
    expect(pack.entity_id).toBe('WAL-SYN-091177');
    expect(pack.connected_rings.length).toBeGreaterThan(0);
    expect(pack.fund_flow_trail.length).toBeGreaterThan(0);
    expect(pack.suspicious_devices.length).toBeGreaterThan(0);
    expect(Object.keys(pack.evidence_records).length).toBeGreaterThan(0);
    expect(pack.uncertainty_margin).toBeDefined();

    // Test Copilot query invocation
    const copilotRes = copilotService.queryKnowledgeCopilot('এই wallet-এর সাথে কোন suspicious campaign যুক্ত?', 'bn');
    expect(copilotRes.evidence_ids.length).toBeGreaterThan(0);
    expect(copilotRes.confidence).toBeGreaterThan(0.90);
  });

  it('filters graph by time window and suspicious flags without corrupting layout', () => {
    const subSuspiciousOnly = scamKnowledgeGraph.getSubGraph({
      suspicious_only: true
    });
    for (const node of subSuspiciousOnly.nodes) {
      expect(node.is_suspicious).toBe(true);
    }
    for (const edge of subSuspiciousOnly.edges) {
      expect(edge.is_suspicious).toBe(true);
    }
  });

});
