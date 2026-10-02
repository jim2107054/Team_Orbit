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

export type ChannelType = 'APP' | 'USSD' | 'AGENT' | 'WEB' | 'AGENT_PORTAL';
export type DeviceCapability = 'SMARTPHONE' | 'FEATURE_PHONE' | 'UNKNOWN';
export type NetworkContext = 'MOBILE_DATA' | 'USSD' | 'WIFI' | 'UNKNOWN';

// ================= KNOWLEDGE GRAPH BASE TYPES =================
export type KnowledgeNodeType = 
  | 'CUSTOMER' 
  | 'WALLET' 
  | 'PHONE' 
  | 'DEVICE' 
  | 'AGENT' 
  | 'MERCHANT' 
  | 'TRANSACTION' 
  | 'COMPLAINT' 
  | 'SCAM_CONVERSATION' 
  | 'SCAM_TYPOLOGY' 
  | 'CAMPAIGN' 
  | 'RING' 
  | 'LOCATION' 
  | 'EVENT' 
  | 'CASE';

export type KnowledgeEdgeType =
  | 'OWNS'
  | 'USES'
  | 'TRANSFERRED_TO'
  | 'CASHED_OUT_AT'
  | 'PAID_MERCHANT'
  | 'REPORTED'
  | 'REFERENCES'
  | 'MATCHES_TYPOLOGY'
  | 'MATCHES_CAMPAIGN'
  | 'CONNECTED_TO_RING'
  | 'CONTAINS_WALLET'
  | 'RECEIVED_FROM'
  | 'LOCATED_IN'
  | 'TRIGGERED_EVENT'
  | 'ATTACHED_TO_CASE'
  | 'COMMUNICATED_WITH'
  | 'SIMILAR_TO';

export type VerificationSource = 
  | 'SYSTEM_AUDIT' 
  | 'NLP_EXTRACTION' 
  | 'CORE_BANKING_LOG' 
  | 'COMPLAINT_INTAKE' 
  | 'CDR_RECORD' 
  | 'DEVICE_FINGERPRINT' 
  | 'MLRO_AFFIRMATION';
