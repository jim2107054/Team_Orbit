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
  | 'T6_STAGED_INVESTMENT' // Held out for testing
  | 'T7_GAMBLING_HUB'
  | 'T8_AGENT_CASH_OUT_MULE'
  | 'T9_GHOST_WALLET'
  | 'T10_PHISHING_APK'
  // Conversational Scam Intelligence Typologies
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

export interface Merchant {
  merchant_id: string;
  name: string;
  category: string;
  division: string;
  created_at: string;
}

export interface Transaction {
  txn_id: string;
  ts: string;
  sender_wallet: string;
  receiver_wallet: string;
  type: TxnType;
  amount_bdt: number;
  channel: 'APP' | 'USSD' | 'AGENT_PORTAL';
  device_id: string;
  geo_cell: string;
  fee_bdt: number;
  status: 'SUCCESS' | 'PENDING' | 'BLOCKED' | 'CANCELLED_BY_USER';
  label_fraud: boolean;
  typology_id?: TypologyId;
  ring_id?: string;
  created_at: string;
}

export interface SessionEvent {
  event_id: string;
  ts: string;
  wallet_id: string;
  type: 'LOGIN' | 'DEVICE_CHANGE' | 'SIM_SWAP' | 'PIN_RESET' | 'FAILED_PIN' | 'APP_INSTALL';
  device_id: string;
  metadata_json?: string;
}

export interface CommunityReport {
  report_id: string;
  ts: string;
  reporter_wallet: string;
  reported_number: string;
  category: 'IMPERSONATION' | 'PRIZE_SCAM' | 'REFUND_FRAUD' | 'GAMBLING' | 'OTHER';
  text: string;
  language: 'bn' | 'en' | 'banglish';
  trust_weight: number;
  analyst_verified: boolean;
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
  copilot_brief?: CopilotBrief;
  four_eyes_required: boolean;
  four_eyes_approved?: boolean;
  second_analyst_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RingCase {
  ring_id: string;
  ring_name: string;
  typology: TypologyId;
  member_wallets: string[];
  member_agents: string[];
  total_volume_bdt: number;
  ring_score: number;
  density: number;
  pass_through_ratio: number;
  shared_device_count: number;
  burst_synchrony: number;
  seed_proximity: number;
  status: 'DETECTED' | 'CONFIRMED_RING' | 'DISMISSED' | 'REPORTED_STR';
  created_at: string;
  nodes: Array<{ id: string; label: string; type: 'wallet' | 'agent' | 'merchant' | 'seed'; role: string; risk: number }>;
  edges: Array<{ source: string; target: string; weight: number; amount: number; count: number }>;
}

export interface CopilotBrief {
  language: 'en' | 'bn';
  case_id: string;
  summary: string;
  sections: Array<{
    title: string;
    sentences: Array<{
      text: string;
      evidence_ids: string[];
      verified: boolean;
    }>;
  }>;
  total_claims: number;
  verified_claims: number;
  confidence: number;
  suggested_actions: string[];
  open_questions: string[];
  str_draft?: string;
  generated_at: string;
}

export interface AuditLogEntry {
  seq: number;
  ts: string;
  actor: string;
  action: string;
  target_id: string;
  payload_hash: string;
  prev_hash: string;
  payload_json: string;
}

export interface MoneyFlowHop {
  wallet_id: string;
  customer_name: string;
  phone: string;
  hop_level: number;
  received_bdt: number;
  current_balance_bdt: number;
  forwarded_bdt: number;
  cashed_out_bdt: number;
  cashout_agent_id?: string;
  is_terminal: boolean;
  hold_recommended: boolean;
  collateral_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  children: MoneyFlowHop[];
}

export interface HoldCandidate {
  wallet_id: string;
  customer_name: string;
  phone: string;
  hop: number;
  current_balance: number;
  estimated_recoverable_bdt: number;
  confidence: number;
  collateral_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING_APPROVAL' | 'HOLD_PLACED' | 'REJECTED';
}
