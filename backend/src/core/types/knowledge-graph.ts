import type { KnowledgeEdgeType, KnowledgeNodeType, VerificationSource } from './common.js';

// Re-export for convenience
export type { KnowledgeNodeType, KnowledgeEdgeType, VerificationSource };

export interface KnowledgeEdgeEvidence {
  source_event_id: string;
  timestamp: string;
  confidence: number; // 0.0 to 1.0
  relationship_type: KnowledgeEdgeType;
  evidence_summary: string;
  evidence_summary_bn: string;
  verification_source: VerificationSource;
  raw_payload?: Record<string, any>;
}

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  label_bn: string;
  subtitle?: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NEUTRAL';
  is_suspicious: boolean;
  attributes: Record<string, any>;
  first_seen: string;
  last_seen: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  type: KnowledgeEdgeType;
  label: string;
  label_bn: string;
  is_suspicious: boolean;
  weight: number;
  evidence: KnowledgeEdgeEvidence;
  created_at: string;
}

export interface KnowledgeGraphSubGraph {
  center_node_id?: string;
  depth: number;
  total_nodes_count: number;
  total_edges_count: number;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  generated_at: string;
}

export interface KnowledgeGraphQueryFilter {
  center_node_id?: string;
  depth?: number;
  entity_types?: KnowledgeNodeType[];
  start_time?: string;
  end_time?: string;
  suspicious_only?: boolean;
  min_confidence?: number;
  limit?: number;
}

export interface KnowledgeGraphQueryResult {
  query: string;
  language: 'bn' | 'en';
  parsed_intent: {
    target_entity_id?: string;
    target_entity_type?: KnowledgeNodeType;
    question_type: 'WALLET_OF_PHONE' | 'FUND_DESTINATION' | 'CAMPAIGN_OF_COMPLAINT' | 'AGENT_OF_RING' | 'CAMPAIGN_FIRST_EVIDENCE' | 'GENERAL_ENTITY_EXPANSION' | 'CUSTOM';
  };
  answer_text: string;
  answer_text_bn: string;
  matched_nodes: KnowledgeNode[];
  matched_edges: KnowledgeEdge[];
  evidence_citations: KnowledgeEdgeEvidence[];
  confidence: number;
  uncertainty_notes?: string;
}

export interface KnowledgeGraphEvidencePack {
  entity_id: string;
  entity_type: KnowledgeNodeType;
  connected_campaigns: { campaign_id: string; name: string; confidence: number; evidence_id: string }[];
  connected_rings: { ring_id: string; name: string; evidence_id: string }[];
  associated_complaints: { complaint_id: string; date: string; category: string; evidence_id: string }[];
  fund_flow_trail: { from_wallet: string; to_wallet: string; amount_bdt: number; agent_id?: string; evidence_id: string }[];
  suspicious_devices: { device_id: string; shared_wallets_count: number; evidence_id: string }[];
  evidence_records: Record<string, KnowledgeEdgeEvidence>;
  summary_en: string;
  summary_bn: string;
  uncertainty_margin: string;
}
