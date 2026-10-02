import type { TypologyId, ExtractedEntities } from './common.js';

// ================= SCAM CAMPAIGN INTELLIGENCE TYPES =================
export type CampaignLifecycle = 'EMERGING' | 'GROWING' | 'ACTIVE' | 'DECLINING' | 'RESOLVED';

export type CampaignTypology = 
  | 'CAMP_FAKE_CUSTOMER_CARE'
  | 'CAMP_SIM_VERIFICATION'
  | 'CAMP_EMERGENCY_RELATIVE'
  | 'CAMP_PRIZE_LOTTERY'
  | 'CAMP_INVESTMENT_TASK'
  | 'CAMP_REFUND_TRAP';

export interface CampaignScoreBreakdown {
  linguistic_similarity: number;
  temporal_synchrony: number;
  entity_overlap: number;
  transaction_pattern_similarity: number;
  graph_overlap: number;
  overall_campaign_score: number;
}

export interface CampaignGraphNode {
  id: string;
  type: 'complaint' | 'phrase' | 'number' | 'wallet' | 'ring' | 'agent' | 'location' | 'time_cluster';
  label: string;
  category: string;
  risk?: number;
  meta?: Record<string, any>;
}

export interface CampaignGraphEdge {
  source: string;
  target: string;
  relation: 'USES_PHRASE' | 'REPORTED_NUMBER' | 'PAID_TO_WALLET' | 'PART_OF_RING' | 'CASHED_OUT_AT' | 'LOCATED_IN' | 'TIME_SYNCHRONY';
  weight: number;
  label?: string;
}

export interface ScamComplaintRecord {
  complaint_id: string;
  source_channel: string;
  sender_number: string;
  complaint_text: string;
  extracted_entities: ExtractedEntities;
  timestamp: string;
  target_wallet?: string;
  target_amount?: number;
  assigned_campaign_id?: string;
  is_manually_linked?: boolean;
  is_unrelated?: boolean;
}

export interface CampaignAnalystNote {
  note_id: string;
  analyst_id: string;
  note: string;
  created_at: string;
}

export interface ScamCampaign {
  campaign_id: string;
  campaign_name: string;
  typology: CampaignTypology | string;
  typology_label_bn: string;
  lifecycle_status: CampaignLifecycle;
  campaign_score: number;
  score_breakdown: CampaignScoreBreakdown;
  affected_wallets: string[];
  reported_numbers: string[];
  linked_rings: string[];
  linked_agents: string[];
  shared_devices: string[];
  common_phrases: string[];
  geographic_distribution: Record<string, number>;
  estimated_exposure_bdt: number;
  complaint_count: number;
  first_seen_ts: string;
  latest_seen_ts: string;
  growth_trajectory: Array<{ timestamp: string; complaints: number; exposure_bdt: number }>;
  graph_nodes: CampaignGraphNode[];
  graph_edges: CampaignGraphEdge[];
  analyst_notes: CampaignAnalystNote[];
  evidence_summary: string;
  status: 'INVESTIGATING' | 'ESCALATED' | 'DISRUPTED' | 'CLOSED';
}

export interface CampaignAnalystActionRecord {
  action_id: string;
  campaign_id: string;
  action_type: 'CREATE_CAMPAIGN' | 'MARK_RELATED' | 'MARK_UNRELATED' | 'ADD_NOTE' | 'LINK_RING' | 'GENERATE_SUMMARY' | 'UPDATE_LIFECYCLE';
  analyst_id: string;
  details: Record<string, any>;
  timestamp: string;
}
