// ================= RECOVERY ROUTE OPTIMIZER TYPES =================

export type RecoveryActionType =
  | 'REVIEW_TRANSACTION'
  | 'REVIEW_RECIPIENT_WALLET'
  | 'REVIEW_SOURCE_WALLET'
  | 'REVIEW_AGENT'
  | 'REVIEW_CASHOUT'
  | 'REVIEW_LINKED_TRANSACTION'
  | 'REVIEW_COMPLAINT'
  | 'REVIEW_CAMPAIGN'
  | 'REVIEW_RING'
  | 'REVIEW_ACCOUNT_ACTIVITY'
  | 'REQUEST_ADDITIONAL_EVIDENCE'
  | 'ESCALATE_CASE';

export type RecoveryActionPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RecoveryActionStatus = 'PENDING' | 'IN_PROGRESS' | 'REVIEWED' | 'SKIPPED' | 'ESCALATED';

export type RecoverabilityLevel =
  | 'POTENTIALLY_RECOVERABLE'
  | 'MODERATE_RECOVERY_EFFORT'
  | 'LOW_RECOVERY_PROBABILITY'
  | 'INSUFFICIENT_EVIDENCE';

export interface RecoveryEvidenceItem {
  evidence_id: string;
  evidence_type:
    | 'DIRECT_TRANSACTION'
    | 'RECENT_TRANSFER'
    | 'LINKED_COMPLAINT'
    | 'KNOWN_SCAM_CAMPAIGN'
    | 'KNOWN_RING'
    | 'DEVICE_LINK'
    | 'AGENT_LINK'
    | 'REPEATED_PATTERN'
    | 'TEMPORAL_PATTERN'
    | 'DOWNSTREAM_HOP';
  source_event_id: string;
  timestamp: string;
  description_en: string;
  description_bn: string;
  confidence: number;
  amount_bdt?: number;
  raw_data?: Record<string, any>;
}

export interface RecoveryRouteStep {
  step_number: number;
  action_id: string;
  action_type: RecoveryActionType;
  target_entity_id: string;
  target_entity_type: 'WALLET' | 'AGENT' | 'TRANSACTION' | 'COMPLAINT' | 'CAMPAIGN' | 'RING' | 'CASE';
  target_entity_label: string;
  priority: RecoveryActionPriority;
  priority_score: number; // 0 - 100
  status: RecoveryActionStatus;
  reason_codes: string[];
  reason_en: string;
  reason_bn: string;
  evidence_confidence: number; // 0.0 - 1.0
  evidence_items: RecoveryEvidenceItem[];
  score_breakdown: {
    time_urgency: number; // weight 35%
    money_flow_relevance: number; // weight 30%
    evidence_strength: number; // weight 20%
    recoverability_potential: number; // weight 15%
    golden_hour_decay: number;
  };
  reviewed_by?: string;
  reviewed_at?: string;
  analyst_notes?: string;
  evidence_version: number;
}

export interface RecoverabilityAssessment {
  level: RecoverabilityLevel;
  level_bn: string;
  confidence_score: number; // 0.0 - 1.0
  reasons_en: string[];
  reasons_bn: string[];
  observable_balance_bdt: number;
  disputed_amount_bdt: number;
  current_downstream_reach: string;
  last_hop_type: 'ACTIVE_WALLET_BALANCE' | 'CASHOUT_AGENT' | 'EXTERNAL_OUTFLOW' | 'UNKNOWN';
  insufficient_evidence_reason?: string;
  insufficient_evidence_reason_bn?: string;
}

export interface GoldenHourState {
  elapsed_minutes: number;
  remaining_minutes: number;
  total_window_minutes: number;
  urgency_tier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'EXPIRED';
  time_since_transaction: string;
  time_since_last_transfer?: string;
  time_since_cashout?: string;
}

export interface RecoveryRoutePlan {
  case_id: string;
  transaction_id: string;
  disputed_amount_bdt: number;
  scenario_id: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D' | 'CUSTOM';
  scenario_name: string;
  overall_priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  golden_hour_state: GoldenHourState;
  route: RecoveryRouteStep[];
  completed_actions: RecoveryRouteStep[];
  estimated_recoverability: RecoverabilityAssessment;
  evidence_count: number;
  unsupported_recommendation_rate: number; // 0.0%
  generated_at: string;
  version: number;
}

export interface RecoveryTimelineEvent {
  event_id: string;
  timestamp: string;
  relative_time_min: number;
  event_type:
    | 'TRANSACTION'
    | 'RECIPIENT_RECEIVED'
    | 'DOWNSTREAM_TRANSFER'
    | 'CASHOUT'
    | 'COMPLAINT_FILED'
    | 'CAMPAIGN_DETECTED'
    | 'ROUTE_GENERATED'
    | 'ACTION_REVIEWED'
    | 'CASE_ESCALATED';
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  entity_id: string;
  entity_type: string;
  amount_bdt?: number;
  evidence_id: string;
}
