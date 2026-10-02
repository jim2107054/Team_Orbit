import type {
  TypologyId, RiskTier, PolicyAction, ReasonCodeDetail,
  ChannelType, DeviceCapability, NetworkContext, SignalExtractionResult,
  ExtractedEntities, ConversationTurn
} from './common.js';

// ================= TEMPORAL RISK INTELLIGENCE TYPES =================
export type PeriodType = 
  | 'RAMADAN' 
  | 'EID_FITR' 
  | 'EID_ADHA' 
  | 'POHELA_BOISHAKH' 
  | 'PUJA_PERIOD' 
  | 'SALARY_DAY' 
  | 'MONTH_END' 
  | 'WEEKEND' 
  | 'NORMAL_DAY';

export interface TemporalContext {
  period_type: PeriodType;
  period_name: string;
  expected_amount_multiplier: number;
  expected_velocity_multiplier: number;
  expected_recipient_entropy: number;
  confidence: number;
  is_festival: boolean;
  is_salary_window: boolean;
}

export interface TemporalFeatures {
  seasonal_amount_zscore: number;
  period_adjusted_velocity: number;
  salary_day_deviation: number;
  festival_deviation: number;
  expected_recipient_deviation: number;
  temporal_behavior_similarity: number;
  temporal_context: TemporalContext;
}

export interface ChannelRiskFeatures {
  channel: ChannelType;
  device_capability: DeviceCapability;
  network_context: NetworkContext;
  channel_switch_frequency: number;
  first_time_channel: boolean;
  device_channel_mismatch: boolean;
  recent_channel_change: boolean;
  ussd_velocity: number;
  cross_channel_behavior_change: number;
  primary_channel_past_30d: ChannelType;
}

export interface CalculatedFeatures {
  // Velocity features
  txn_count_1m: number;
  txn_count_10m: number;
  txn_count_1h: number;
  txn_count_24h: number;
  amount_sum_1h: number;
  amount_sum_24h: number;
  distinct_recipients_24h: number;
  
  // Behavioral features
  amount_bdt: number;
  amount_zscore_user: number;
  hour_of_day: number;
  is_night_time: boolean;
  is_new_recipient: boolean;
  balance_drain_ratio: number;
  
  // ATO & Device features
  device_is_new: boolean;
  mins_since_pin_reset: number | null;
  mins_since_sim_swap: number | null;
  ato_composite_score: number;
  
  // Network & Social Context
  recipient_fan_in_1h: number;
  recipient_pass_through_ratio: number;
  recipient_report_count: number;
  hops_to_known_ring: number;
  scam_check_session_flag: boolean;
  scam_conversation_context_score: number;

  // Bangladesh Temporal Risk Intelligence Features
  temporal_features: TemporalFeatures;

  // Channel & Feature-Phone Context
  channel_features: ChannelRiskFeatures;
}

export interface CustomerInterventionRecord {
  intervention_id: string;
  txn_id: string;
  variant: 'PAUSE_VERIFY_APP' | 'PAUSE_VERIFY_USSD' | 'HOLD_ASSIST_APP' | 'HOLD_ASSIST_USSD';
  shown_ts: string;
  customer_action: 'CANCEL' | 'PROCEED' | 'REPORT' | 'TIMEOUT';
  treatment_flag: boolean;
  channel: ChannelType;
}

// ================= CONVERSATION RISK PROFILE =================
export interface CampaignLinkingResult {
  linked_wallet?: string;
  previous_reports_count: number;
  linked_ring_id?: string;
  linked_cases_count: number;
  risk_flag: boolean;
  notes?: string;
}

export interface ConversationRiskProfile {
  scam_probability: number;
  typology: TypologyId;
  typology_name: string;
  escalation_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: SignalExtractionResult[];
  evidence_spans: string[];
  extracted_entities: ExtractedEntities;
  campaign_links: CampaignLinkingResult;
  recommended_action: {
    customer_heading_bn: string;
    customer_heading_en: string;
    customer_reasons_bn: string[]; // max 3 simple reasons
    customer_reasons_en: string[]; // max 3 simple reasons
    what_to_do_bn: string[];
    what_to_do_en: string[];
    analyst_brief: string;
  };
  detected_language: 'bn' | 'en' | 'banglish' | 'mixed';
  is_injection_attempt: boolean;
  normalized_turns?: ConversationTurn[];
}
