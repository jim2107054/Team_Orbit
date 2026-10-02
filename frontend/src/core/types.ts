export type UserSegment = 'salaried' | 'student' | 'farmer' | 'gig' | 'merchant_owner' | 'remittance_recipient';
export type DistrictType = 'urban' | 'rural';
export type KycLevel = 'basic' | 'standard' | 'enhanced';
export type OnboardingChannel = 'app' | 'agent';

export type TxnType = 
  | 'P2P_SEND' 
  | 'CASH_IN' 
  | 'CASH_OUT' 
  | 'MERCHANT_PAY' 
  | 'BILL_PAY' 
  | 'MOBILE_RECHARGE' 
  | 'REMITTANCE_IN' 
  | 'BANK_TO_WALLET';

export type TypologyId = 
  | 'T1_EMERGENCY_IMPERSONATION'
  | 'T2_ATO_DRAIN'
  | 'T3_REFUND_MISTAKE'
  | 'T4_PRIZE_LOTTERY'
  | 'T5_MULE_COLLECTOR'
  | 'T6_STAGED_INVESTMENT'
  | 'T7_GAMBLING_HUB'
  | 'T8_AGENT_CASH_OUT_MULE'
  | 'T9_GHOST_WALLET'
  | 'T10_PHISHING_APK'
  | 'SCAM_CALL_CUSTOMER_CARE'
  | 'SCAM_CALL_SIM_BLOCK'
  | 'SCAM_CALL_ACCOUNT_VERIFY'
  | 'SCAM_CALL_RELATIVE_EMERGENCY'
  | 'SCAM_CALL_REFUND'
  | 'SCAM_CALL_PRIZE'
  | 'SCAM_CALL_INVESTMENT'
  | 'SCAM_CALL_TASK'
  | 'SCAM_CALL_LEGAL_THREAT';

export type SignalCode =
  | 'SIG_URGENCY'
  | 'SIG_SECRECY'
  | 'SIG_AUTHORITY_IMPERSONATION'
  | 'SIG_FEAR_THREAT'
  | 'SIG_REWARD_PROMISE'
  | 'SIG_EMERGENCY_STORY'
  | 'SIG_ACCOUNT_SUSPENSION'
  | 'SIG_PIN_REQUEST'
  | 'SIG_OTP_REQUEST'
  | 'SIG_PASSWORD_REQUEST'
  | 'SIG_VERIFICATION_REQUEST'
  | 'SIG_MONEY_TRANSFER_REQUEST'
  | 'SIG_REFUND_REQUEST'
  | 'SIG_UNKNOWN_LINK'
  | 'SIG_APK_INSTALL'
  | 'SIG_REMOTE_ACCESS'
  | 'SIG_INVESTMENT_PROMISE'
  | 'SIG_GUARANTEED_RETURN'
  | 'SIG_RELATIONSHIP_IMPERSONATION'
  | 'SIG_CUSTOMER_CARE_IMPERSONATION';

export interface SignalExtractionResult {
  signal_code: SignalCode | string;
  signal_name: string;
  detected: boolean;
  confidence: number;
  evidence_span: string;
  turn_index?: number;
  speaker?: string;
}

export interface ConversationTurn {
  speaker: 'caller' | 'receiver' | 'user' | 'agent' | 'scammer' | 'customer' | 'speaker_1' | 'speaker_2';
  text: string;
  timestamp?: string;
}

export interface ExtractedEntities {
  phone_numbers: string[];
  wallets: string[];
  urls: string[];
  merchant_ids: string[];
  txn_refs: string[];
}

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
    customer_reasons_bn: string[];
    customer_reasons_en: string[];
    what_to_do_bn: string[];
    what_to_do_en: string[];
    analyst_brief: string;
  };
  detected_language: 'bn' | 'en' | 'banglish' | 'mixed';
  is_injection_attempt: boolean;
  normalized_turns?: ConversationTurn[];
}

export type RiskTier = 'T0' | 'T1' | 'T2' | 'T3';

export type PolicyAction = 
  | 'ALLOW' 
  | 'NUDGE' 
  | 'PAUSE_VERIFY' 
  | 'HOLD_ASSIST' 
  | 'QUEUE_ANALYST' 
  | 'ESCALATE_RING';

export interface ReasonCodeDetail {
  code: string;
  label_en: string;
  label_bn: string;
  weight: number;
  description?: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  segment: UserSegment;
  division: string;
  district_type: DistrictType;
  age_band: '18-24' | '25-34' | '35-49' | '50+';
  gender: 'female' | 'male' | 'other';
  onboarding_channel: OnboardingChannel;
  kyc_level: KycLevel;
  created_at: string;
}

export interface Wallet {
  wallet_id: string;
  customer_id: string;
  phone: string;
  status: 'active' | 'suspended' | 'frozen' | 'closed';
  balance: number;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  is_mule_candidate?: boolean;
}

export interface Device {
  device_id: string;
  os_family: 'android' | 'ios' | 'kaios' | 'web';
  first_seen: string;
  linked_wallet_count: number;
  is_emulator?: boolean;
}

export interface Agent {
  agent_id: string;
  name: string;
  phone: string;
  division: string;
  district_type: DistrictType;
  tenure_days: number;
  size_tier: 'tier_1' | 'tier_2' | 'tier_3';
  trained_flag: boolean;
  cashout_velocity_score: number;
  risk_status: 'normal' | 'watchlist' | 'investigating';
}

export type MerchantTrustBadge = 'NEW' | 'NORMAL' | 'WATCH' | 'REVIEW';

export interface Merchant {
  merchant_id: string;
  name: string;
  category: string;
  division: string;
  created_at: string;
}

export interface MerchantProfile extends Merchant {
  qr_code_id: string;
  location_cluster: string;
  merchant_age: number; // in days
  transaction_volume: number; // 30-day BDT
  unique_customer_count: number;
  refund_ratio: number;
  complaint_ratio: number;
  chargeback_like_events: number;
  average_ticket: number;
  transaction_velocity: number; // txns per day
  customer_concentration: number; // top customer volume ratio
  device_count: number;
  linked_wallet_count: number;
  cashout_ratio: number; // pass-through ratio
  trust_badge: MerchantTrustBadge;
  risk_score: number;
  is_suspicious_drain: boolean;
  linked_mule_rings: string[];
}

export interface CustomerToMerchantFeatures {
  first_time_merchant: boolean;
  amount_deviation: number;
  merchant_novelty: boolean;
  customer_merchant_frequency: number;
  merchant_customer_entropy: number;
  qr_scan_context: string;
}

export interface MerchantEvaluationResult {
  merchant: MerchantProfile;
  customer_features: CustomerToMerchantFeatures;
  risk_score: number;
  trust_badge: MerchantTrustBadge;
  action_recommended: 'ALLOW' | 'PAUSE_VERIFY' | 'HOLD_ASSIST' | 'BLOCK';
  warning_required: boolean;
  warning_message_bn: string;
  warning_message_en: string;
  reasons: Array<{ code: string; label_en: string; label_bn: string; weight: number }>;
  evaluation_comparison: {
    transaction_only_score: number;
    behavioral_merchant_score: number;
    lift: number;
  };
}

export type ChannelType = 'APP' | 'USSD' | 'AGENT' | 'WEB' | 'AGENT_PORTAL';
export type DeviceCapability = 'SMARTPHONE' | 'FEATURE_PHONE' | 'UNKNOWN';
export type NetworkContext = 'MOBILE_DATA' | 'USSD' | 'WIFI' | 'UNKNOWN';

export interface Transaction {
  txn_id: string;
  ts: string;
  sender_wallet: string;
  receiver_wallet: string;
  type: TxnType;
  amount_bdt: number;
  channel: ChannelType;
  device_id: string;
  geo_cell: string;
  fee_bdt: number;
  status: 'SUCCESS' | 'PENDING' | 'BLOCKED' | 'CANCELLED_BY_USER';
  label_fraud: boolean;
  typology_id?: TypologyId;
  ring_id?: string;
  device_capability?: DeviceCapability;
  network_context?: NetworkContext;
  created_at: string;
}

export interface AlertCase {
  case_id: string;
  txn_id: string;
  sender_wallet: string;
  receiver_wallet: string;
  amount_bdt: number;
  risk_score: number;
  risk_tier: RiskTier;
  action_recommended: PolicyAction;
  reasons: ReasonCodeDetail[];
  rule_trace: Array<{ rule: string; fired: boolean }>;
  status: 'NEW' | 'UNDER_REVIEW' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'RECOVERED' | 'CLOSED';
  analyst_id?: string;
  analyst_notes?: string;
  copilot_brief?: any;
  four_eyes_required: boolean;
  four_eyes_approved?: boolean;
  second_analyst_id?: string;
  created_at: string;
  updated_at: string;
}

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


