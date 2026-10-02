// ================= HUMAN SCAM COACH TYPES =================

export type HumanCoachQuestionId =
  | 'Q1_RECENT_CONTACT'
  | 'Q2_CREDENTIAL_REQUEST'
  | 'Q3_AUTHORITY_IMPERSONATION'
  | 'Q4_URGENCY_PRESSURE'
  | 'Q5_SECRECY_PRESSURE'
  | 'Q6_EMERGENCY_IMPERSONATION'
  | 'Q7_ADVANCE_PAYMENT_SCAM'
  | 'Q8_INVESTMENT_TASK_SCAM';

export type HumanCoachAnswerValue = 'YES' | 'NO' | 'NOT_SURE';

export type HumanCoachSessionStatus =
  | 'NOT_TRIGGERED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SKIPPED';

export type HumanCoachCustomerChoice =
  | 'CANCEL_PAYMENT'
  | 'REVIEW_RECIPIENT'
  | 'CHECK_SCAM_INFO'
  | 'CONTACT_SUPPORT'
  | 'CONTINUE_ANYWAY';

export interface HumanCoachQuestion {
  id: HumanCoachQuestionId;
  question_en: string;
  question_bn: string;
  simple_mode_bn?: string;
  signal_key: string;
  options: { value: HumanCoachAnswerValue; label_en: string; label_bn: string }[];
  category: 'SOCIAL_CONTACT' | 'CREDENTIAL' | 'AUTHORITY' | 'PRESSURE' | 'TYPOLOGY';
  why_we_ask_en: string;
  why_we_ask_bn: string;
}

export interface HumanCoachAnswerRecord {
  question_id: HumanCoachQuestionId;
  answer: HumanCoachAnswerValue;
  timestamp: string;
  signal_generated?: string;
}

export interface HumanCoachSignals {
  recent_social_contact: boolean;
  credential_request: boolean;
  authority_impersonation: boolean;
  urgency_pressure: boolean;
  secrecy_pressure: boolean;
  emergency_impersonation: boolean;
  advance_payment_scam: boolean;
  investment_or_task_scam: boolean;
  uncertainty_signal: boolean;
  total_positive_signals: number;
}

export interface HumanCoachSafetyExplanation {
  headline_en: string;
  headline_bn: string;
  matched_warning_signs_en: string[];
  matched_warning_signs_bn: string[];
  recommended_guidance_en: string;
  recommended_guidance_bn: string;
  risk_elevation: 'HIGH_RISK_SCAM_CONFIRMED' | 'ELEVATED_CAUTION' | 'LOW_FRICTION_CLEARED';
}

export interface HumanCoachSession {
  session_id: string;
  transaction_id: string;
  customer_wallet: string;
  recipient_wallet: string;
  amount_bdt: number;
  status: HumanCoachSessionStatus;
  selected_questions: HumanCoachQuestion[];
  current_question_index: number;
  answers: HumanCoachAnswerRecord[];
  signals: HumanCoachSignals;
  safety_explanation?: HumanCoachSafetyExplanation;
  customer_final_choice?: HumanCoachCustomerChoice;
  created_at: string;
  completed_at?: string;
}

export interface HumanCoachEvaluationResult {
  should_intervene: boolean;
  intervention_reason: string;
  intervention_reason_bn: string;
  session_id: string;
  total_questions_count: number;
  first_question?: HumanCoachQuestion;
  questions: HumanCoachQuestion[];
  initial_signals?: Partial<HumanCoachSignals>;
}
