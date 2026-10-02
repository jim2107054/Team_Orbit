import type { TypologyId } from './common.js';

// ================= COMMUNITY SCAM PROPAGATION INTELLIGENCE TYPES =================
export type ClusterStatus = 'EMERGING_CLUSTER' | 'RISING_CLUSTER' | 'STABLE_CLUSTER' | 'DECLINING_CLUSTER' | 'FALSE_CLUSTER';

export interface PropagationFeatures {
  new_cases_per_day: number;
  growth_rate: number;
  unique_victims: number;
  common_recipient_rate: number;
  common_phrase_rate: number;
  common_number_rate: number;
  time_to_spread: number;
  geographic_concentration: number;
  campaign_overlap: number;
}

export interface RegionalSpreadData {
  region_id: string;
  division: string;
  coarse_geo_cell: string;
  district_name: string;
  cases: number;
  growth_pct: number;
  top_typology: TypologyId | string;
  top_typology_name: string;
  linked_campaign_id?: string;
  linked_campaign_name?: string;
  linked_wallets: string[];
  affected_customer_count: number;
  total_exposure_bdt: number;
  risk_level: 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW';
  cluster_status: ClusterStatus;
}

export interface DayPropagationSnapshot {
  day_index: number;
  day_label: string;
  date_str: string;
  active_clusters_count: number;
  total_cases: number;
  total_victims: number;
  total_exposure_bdt: number;
  growth_rate: number;
  regions: RegionalSpreadData[];
  key_events: string[];
}

export interface ScamSpreadAlert {
  alert_id: string;
  campaign_id: string;
  campaign_name: string;
  affected_regions: string[];
  growth_rate: number;
  growth_label: string;
  top_typology: TypologyId | string;
  top_typology_name: string;
  cluster_status: ClusterStatus;
  features: PropagationFeatures;
  evidence: {
    common_phrases: string[];
    shared_destination_wallets: string[];
    reported_caller_numbers: string[];
    unique_victims_count: number;
    attempted_volume_bdt: number;
    first_detected_ts: string;
    velocity_timeline: Array<{ day: string; cases: number }>;
  };
  recommended_analyst_action: 'DRAFT_CUSTOMER_WARNING' | 'LINK_SCAM_RADAR' | 'CREATE_CAMPAIGN_CASE' | 'FREEZE_RECIPIENT_CLUSTER';
  customer_warning_draft_bn: string;
  customer_warning_draft_en: string;
  status: 'PENDING_REVIEW' | 'INVESTIGATING' | 'WARNING_BROADCAST' | 'RADAR_LINKED' | 'DISMISSED_FALSE_CLUSTER';
  created_at: string;
  updated_at: string;
}

export interface PropagationAnalystActionRecord {
  action_id: string;
  alert_id: string;
  action_type: 'REVIEW' | 'CREATE_CAMPAIGN_CASE' | 'DRAFT_CUSTOMER_WARNING' | 'LINK_TO_SCAM_RADAR' | 'MARK_FALSE_CLUSTER';
  analyst_id: string;
  notes?: string;
  warning_payload?: { text_bn: string; text_en: string; target_regions: string[] };
  timestamp: string;
}

// ================= CUSTOMER SAFETY MODE TYPES =================
export type SafetyModeState = 'NORMAL' | 'PROTECTED' | 'RECOVERY';

export type SafetyModeReason = 
  | 'SUSPICIOUS_CALL' 
  | 'PHONE_LOST' 
  | 'SIM_REPLACEMENT' 
  | 'UNEXPECTED_LOGIN' 
  | 'FAMILY_PROTECTION' 
  | 'VOLUNTARY_HIGH_PROTECTION' 
  | 'OTHER';

export interface CustomerSafetyModeRecord {
  wallet_id: string;
  state: SafetyModeState;
  active_since: string;
  expires_at: string;
  remaining_seconds: number;
  duration_minutes: number;
  reason: SafetyModeReason;
  reason_label_bn: string;
  reason_label_en: string;
  activation_source: 'CUSTOMER_APP' | 'VOICE_CALL_SCAM_CHECK' | 'USSD' | 'AGENT_ASSIST' | 'HELPLINE';
  protections_enabled: string[];
  step_up_method_required: 'PIN' | 'OTP' | 'BIOMETRIC';
  is_expired: boolean;
}

export interface SafetyModePolicyConfig {
  normal_pause_verify_threshold: number;
  normal_hold_assist_threshold: number;
  protected_pause_verify_threshold: number;
  protected_hold_assist_threshold: number;
  max_extension_hours: number;
}

export interface SafetyModeAuditEvent {
  event_id: string;
  wallet_id: string;
  event_type: 'ACTIVATION' | 'EXTENSION' | 'DISABLE' | 'EXPIRY';
  previous_state: SafetyModeState;
  new_state: SafetyModeState;
  reason?: string;
  actor: string;
  timestamp: string;
}
