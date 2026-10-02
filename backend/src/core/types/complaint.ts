import type { TypologyId } from './common.js';

// ================= COMPLAINT-TO-ACTION INTELLIGENCE TYPES =================
export type ComplaintCategory = 
  | 'fraud'
  | 'wrong_transfer'
  | 'account_takeover'
  | 'fake_customer_care'
  | 'PIN_OTP_request'
  | 'investment_scam'
  | 'refund_scam'
  | 'merchant_issue'
  | 'agent_issue'
  | 'unknown';

export type ComplaintPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type ComplaintStatus = 'NEW' | 'TRIAGED' | 'LINKED_TO_CASE' | 'FROZEN_RECOVERY' | 'DISMISSED' | 'RESOLVED';
export type CustomerResponseStatus = 'UNREAD' | 'CONTACTED' | 'STATEMENT_TAKEN' | 'ADVISORY_SENT';

export interface ExtractedComplaintEntities {
  phone_numbers: string[];
  wallets: string[];
  merchant_ids: string[];
  agent_ids: string[];
  txn_refs: string[];
  amounts_bdt: number[];
  timestamps: string[];
  urls: string[];
  named_entities: string[];
}

export interface ComplaintEvidenceLink {
  target_type: 'TRANSACTION' | 'WALLET' | 'RECIPIENT' | 'AGENT' | 'MERCHANT' | 'RING' | 'CAMPAIGN' | 'CASE';
  target_id: string;
  target_label: string;
  confidence: number;
  evidence_text: string;
  is_analyst_override?: boolean;
}

export interface StructuredComplaint {
  complaint_id: string;
  raw_text: string;
  normalized_text: string;
  detected_language: 'bn' | 'en' | 'banglish' | 'mixed';
  reporter_wallet?: string;
  reporter_phone?: string;
  reporter_name?: string;
  classification: ComplaintCategory;
  category_label_bn: string;
  category_label_en: string;
  typology: TypologyId | string;
  typology_label_bn: string;
  priority: ComplaintPriority;
  priority_reason: string;
  is_golden_hour: boolean;
  golden_hour_remaining_mins: number;
  potential_loss_bdt: number;
  extracted_entities: ExtractedComplaintEntities;
  duplicate_group_id?: string;
  duplicate_count: number;
  duplicate_similarity_score: number;
  linked_txn_id?: string;
  linked_wallet_id?: string;
  linked_recipient_wallet?: string;
  linked_agent_id?: string;
  linked_merchant_id?: string;
  linked_ring_id?: string;
  linked_campaign_id?: string;
  linked_case_id?: string;
  evidence_links: ComplaintEvidenceLink[];
  status: ComplaintStatus;
  customer_response_status: CustomerResponseStatus;
  created_at: string;
  updated_at: string;
  analyst_notes?: string;
}

export interface ComplaintDuplicateGroup {
  group_id: string;
  primary_complaint_id: string;
  complaint_ids: string[];
  common_entities: {
    phones: string[];
    wallets: string[];
    urls: string[];
  };
  shared_phrases: string[];
  linked_campaign_id?: string;
  linked_ring_id?: string;
  total_exposure_bdt: number;
  created_at: string;
}

export interface ComplaintAnalystAction {
  action_id: string;
  complaint_id: string;
  action_type: 'OVERRIDE_LINK' | 'UNLINK' | 'CHANGE_PRIORITY' | 'MERGE_DUPLICATES' | 'DISPATCH_ADVISORY' | 'ATTACH_TO_CASE' | 'TRIGGER_EMERGENCY_HOLD' | 'RESOLVE';
  analyst_id: string;
  details: Record<string, any>;
  timestamp: string;
}
