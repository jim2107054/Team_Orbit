import type { TypologyId, RiskTier, PolicyAction, ReasonCodeDetail } from './common.js';
import type { ComplaintCategory } from './complaint.js';

// ================= EVIDENCE-DRIVEN SCAM INCIDENT INVESTIGATION TYPES =================
//
// This module models the UNDERSTAND / INVESTIGATE / EXPLAIN layer that sits on top of the
// existing upay Shield intelligence platform (risk engine, knowledge graph, campaign
// intelligence, recovery route optimizer). It deliberately keeps four separate dimensions
// that must never be collapsed into a single label:
//
//   1. evidence_verdict      — does available evidence support the customer's claim?
//   2. fraud_risk            — how risky does the existing risk engine consider the event?
//   3. case_type             — what kind of incident is being reported?
//   4. routing_department    — who operationally owns the next step?

export type IncidentLanguage = 'bn' | 'en' | 'banglish' | 'mixed';

/** What the customer says happened. Distinct from what the system can observe. */
export type IncidentClaimType =
  | 'wrong_transfer'
  | 'payment_failed'
  | 'refund_request'
  | 'phishing_or_social_engineering'
  | 'unauthorized_transaction'
  | 'duplicate_payment'
  | 'merchant_settlement_delay'
  | 'agent_cash_in_issue'
  | 'funds_not_received'
  | 'other';

/** Operational owner of the recommended next action. */
export type IncidentRoutingDepartment =
  | 'CUSTOMER_SUPPORT'
  | 'DISPUTE_RESOLUTION'
  | 'PAYMENTS_OPS'
  | 'MERCHANT_OPERATIONS'
  | 'AGENT_OPERATIONS'
  | 'FRAUD_RISK';

export type IncidentFraudRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** The three — and only three — core evidence states. */
export type EvidenceVerdict = 'CONSISTENT' | 'INCONSISTENT' | 'INSUFFICIENT_DATA';

export type EvidenceSource =
  | 'transaction'
  | 'risk_engine'
  | 'graph'
  | 'campaign'
  | 'complaint'
  | 'temporal'
  | 'account';

export type EvidenceDirection = 'supports' | 'contradicts' | 'neutral';
export type EvidenceRelevance = 'high' | 'medium' | 'low';

/** Precision of the time the customer gave us. Drives the matching tolerance window. */
export type ClaimTimePrecision =
  | 'EXACT'        // "14:08"
  | 'APPROXIMATE'  // "around 2 PM", "2tar dike"
  | 'RELATIVE'     // "15 minutes ago"
  | 'DAYPART'      // "দুপুরে", "in the evening"
  | 'DAY'          // "today", "গতকাল"
  | 'UNKNOWN';

export interface ClaimTimeWindow {
  start_ts: string;
  end_ts: string;
  precision: ClaimTimePrecision;
  /** Evidence span from the raw complaint that produced this window. */
  evidence_span: string;
}

/**
 * Structured representation of what the customer asserts.
 * Fields are left undefined when the complaint does not contain the value —
 * nothing here is inferred or invented.
 */
export interface IncidentClaim {
  incident_id: string;
  claim_type: IncidentClaimType;
  claim_type_confidence: number;
  amount_bdt?: number;
  /** Every amount the complaint mentions, strongest candidate first. */
  candidate_amounts_bdt: number[];
  currency: 'BDT';
  /** Primary resolved time window, plus alternates for am/pm or daypart ambiguity. */
  time_window?: ClaimTimeWindow;
  alternate_time_windows: ClaimTimeWindow[];
  transaction_type?: string;
  counterparty_wallet?: string;
  counterparty_phone?: string;
  merchant_id?: string;
  agent_id?: string;
  transaction_reference?: string;
  claimed_status?: 'completed' | 'failed' | 'pending' | 'not_initiated' | 'unknown';
  /** Customer explicitly denies authorising the transaction. */
  denies_authorisation: boolean;
  scam_indicators: string[];
  credential_request_claimed: boolean;
  authority_impersonation_claimed: boolean;
  urgency_indicators: string[];
  language: IncidentLanguage;
  /**
   * Customer text as stored, with any credential digits the customer disclosed
   * (an OTP or PIN they typed into the complaint) already redacted. It is never
   * treated as an instruction, and the unredacted original is never persisted.
   */
  raw_complaint: string;
  /** Injection-neutralised text that downstream extraction actually reads. */
  sanitized_complaint: string;
  /** True when the customer pasted a PIN/OTP/password into the complaint. */
  credential_digits_redacted: boolean;
  injection_attempt_detected: boolean;
  injection_patterns_matched: string[];
  /** Discriminators are the fields that make a claim falsifiable against the ledger. */
  discriminators_present: string[];
  extracted_at: string;
}

export interface EvidenceItem {
  evidence_id: string;
  source: EvidenceSource;
  reference_id?: string;
  /** Plain statement of what this evidence asserts. */
  claim: string;
  claim_bn: string;
  value?: unknown;
  relevance: EvidenceRelevance;
  direction: EvidenceDirection;
  /** 0.0 - 1.0 confidence in the evidence itself, not in the conclusion. */
  confidence: number;
  observed_at?: string;
  reason_codes: string[];
}

/** Why a source produced nothing: unavailable infrastructure vs genuinely absent data. */
export type EvidenceSourceState = 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'NOT_APPLICABLE';

export interface EvidenceSourceStatus {
  source: EvidenceSource;
  state: EvidenceSourceState;
  detail: string;
  latency_ms: number;
}

export interface MatchSignalResult {
  signal: string;
  /** Weight applied, from the configured matching policy. */
  weight: number;
  /** 0.0 - 1.0; 0 means evaluated and did not match. */
  strength: number;
  evaluable: boolean;
  explanation: string;
}

export interface TransactionMatchCandidate {
  txn_id: string;
  ts: string;
  sender_wallet: string;
  receiver_wallet: string;
  type: string;
  amount_bdt: number;
  status: string;
  channel: string;
  /** 0.0 - 1.0 normalised over evaluable signals only. */
  match_score: number;
  signals: MatchSignalResult[];
  /** Signals that were evaluable and actively contradicted the claim. */
  contradicting_signals: string[];
  reason_codes: string[];
}

export interface TransactionMatchResult {
  /** Transactions considered, i.e. the retrieval window actually searched. */
  candidates_considered: number;
  search_window_start: string;
  search_window_end: string;
  ledger_available: boolean;
  ledger_error?: string;
  candidates: TransactionMatchCandidate[];
  best_candidate?: TransactionMatchCandidate;
  runner_up_candidate?: TransactionMatchCandidate;
  /** True when two or more candidates match the claim's discriminators near-equally. */
  ambiguous: boolean;
  weights_version: string;
}

export interface EvidenceConflict {
  conflict_id: string;
  customer_claim: string;
  observed_evidence: string;
  additional_context?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  reason_codes: string[];
}

export interface EvidenceReasoningStep {
  step_id: string;
  claim: string;
  evidence_ids: string[];
  evidence_statements: string[];
  reason: string;
  conclusion: string;
  /** False when the step rests on heuristics rather than a verified ledger record. */
  verified: boolean;
}

export interface EvidenceAssessment {
  verdict: EvidenceVerdict;
  /** Confidence in the VERDICT, not in any fraud determination. */
  verdict_confidence: number;
  relevant_transaction_id: string | null;
  match_confidence: number | null;
  supporting_evidence: EvidenceItem[];
  conflicting_evidence: EvidenceItem[];
  /**
   * Evidence that is relevant but neither supports nor contradicts the claim —
   * risk reasons, graph links, campaign correlation, temporal period. Kept as its
   * own bucket so context is never silently dropped, and never mislabelled as
   * support for the customer's account of events.
   */
  contextual_evidence: EvidenceItem[];
  missing_evidence: EvidenceItem[];
  conflicts: EvidenceConflict[];
  /** CLAIM -> EVIDENCE -> REASON -> CONCLUSION chain, one entry per conclusion. */
  reasoning_chain: EvidenceReasoningStep[];
  reasoning: string;
  reasoning_bn: string;
  source_status: EvidenceSourceStatus[];
}

/** Risk context pulled from the EXISTING risk engine. Never recomputed here. */
export interface IncidentRiskContext {
  available: boolean;
  unavailable_reason?: string;
  fraud_risk: IncidentFraudRisk | null;
  fraud_risk_score: number | null;
  risk_tier: RiskTier | null;
  action_recommended: PolicyAction | null;
  reasons: ReasonCodeDetail[];
  rule_trace: Array<{ rule: string; fired: boolean }>;
  model_version?: string;
  rules_version?: string;
}

export interface IncidentGraphContext {
  available: boolean;
  unavailable_reason?: string;
  counterparty_id?: string;
  linked_ring_ids: string[];
  linked_ring_names: string[];
  community_report_count: number;
  connected_campaign_ids: string[];
  associated_complaint_count: number;
  suspicious_device_count: number;
  downstream_hop_count: number;
  summary_en: string;
  summary_bn: string;
}

export interface IncidentCampaignContext {
  available: boolean;
  unavailable_reason?: string;
  matched_campaign_id?: string;
  matched_campaign_name?: string;
  matched_campaign_typology?: string;
  campaign_score?: number;
  match_basis: string[];
  within_campaign_window: boolean;
  summary_en: string;
  summary_bn: string;
}

export interface IncidentTemporalContext {
  available: boolean;
  period_type?: string;
  period_name?: string;
  is_festival?: boolean;
  is_salary_window?: boolean;
  summary_en: string;
}

export type IncidentTimelineSource =
  | 'CUSTOMER_STATEMENT'
  | 'TRANSACTION_LEDGER'
  | 'RISK_ENGINE'
  | 'COMPLAINT_INTAKE'
  | 'KNOWLEDGE_GRAPH'
  | 'CAMPAIGN_INTELLIGENCE'
  | 'INVESTIGATION_ENGINE'
  | 'RECOVERY_WORKFLOW';

export interface IncidentTimelineEvent {
  event_id: string;
  /** Null when the complaint gave no usable time — never back-filled with a guess. */
  timestamp: string | null;
  timestamp_precision: ClaimTimePrecision;
  source: IncidentTimelineSource;
  event_type: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  confidence: number;
  reference_id?: string;
}

export interface IncidentClassification {
  case_type: IncidentClaimType;
  case_type_confidence: number;
  /** Mapped onto the existing complaint taxonomy so triage queues stay consistent. */
  complaint_category: ComplaintCategory;
  typology?: TypologyId | string;
  fraud_risk: IncidentFraudRisk | null;
  evidence_verdict: EvidenceVerdict;
  routing_department: IncidentRoutingDepartment;
  routing_reason: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  is_golden_hour: boolean;
  golden_hour_remaining_mins: number;
}

export interface HumanReviewDecision {
  required: boolean;
  /** Each trigger names the policy rule that fired, for audit. */
  triggers: Array<{ rule: string; detail: string }>;
  four_eyes_required: boolean;
  escalation_level: 'NONE' | 'STANDARD' | 'PRIORITY' | 'IMMEDIATE';
  policy_version: string;
}

export interface RecommendedAction {
  action_id: string;
  action: string;
  action_bn: string;
  owner: IncidentRoutingDepartment;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Evidence ids that justify this action. Empty means the action is policy-driven only. */
  evidence_ids: string[];
  reason: string;
}

export type SafetyViolationCode =
  | 'CREDENTIAL_REQUEST_PIN'
  | 'CREDENTIAL_REQUEST_OTP'
  | 'CREDENTIAL_REQUEST_PASSWORD'
  | 'CREDENTIAL_REQUEST_CARD'
  | 'THIRD_PARTY_CONTACT'
  | 'UNAUTHORIZED_REFUND_PROMISE'
  | 'UNAUTHORIZED_REVERSAL_PROMISE'
  | 'UNAUTHORIZED_UNBLOCK_PROMISE'
  | 'OVERCLAIMED_AI_CERTAINTY';

export interface ResponseSafetyReport {
  passed: boolean;
  violations: Array<{ code: SafetyViolationCode; matched_span: string; detail: string }>;
  checks_run: string[];
  validator_version: string;
}

export interface SafeCustomerResponse {
  template_id: string;
  headline_en: string;
  headline_bn: string;
  body_en: string;
  body_bn: string;
  next_steps_en: string[];
  next_steps_bn: string[];
  /** True when the first draft failed validation and a safe template replaced it. */
  fallback_used: boolean;
  safety_report: ResponseSafetyReport;
  requires_agent_approval: boolean;
}

export interface RecoveryLinkage {
  applicable: boolean;
  reason: string;
  golden_hour_eligible: boolean;
  recovery_case_id?: string;
  recovery_route_available: boolean;
  recovery_scenario_id?: string;
  recoverability_level?: string;
  recommended_entry_point?: string;
}

/** The complete, persisted investigation record. */
export interface IncidentInvestigation {
  investigation_id: string;
  case_id?: string;
  complaint_id?: string;
  reporter_wallet?: string;
  reporter_phone?: string;
  claim: IncidentClaim;
  transaction_match: TransactionMatchResult;
  evidence: EvidenceAssessment;
  risk_context: IncidentRiskContext;
  graph_context: IncidentGraphContext;
  campaign_context: IncidentCampaignContext;
  temporal_context: IncidentTemporalContext;
  timeline: IncidentTimelineEvent[];
  classification: IncidentClassification;
  reason_codes: ReasonCodeDetail[];
  recommended_actions: RecommendedAction[];
  human_review: HumanReviewDecision;
  customer_response: SafeCustomerResponse;
  recovery: RecoveryLinkage;
  /** Narrative summary for investigators. Grounded in evidence ids only. */
  investigation_summary_en: string;
  investigation_summary_bn: string;
  /** Provenance of the explanation layer, for responsible-AI disclosure. */
  explanation_engine: {
    kind: 'DETERMINISTIC_TEMPLATE' | 'LLM';
    name: string;
    version: string;
  };
  latency_breakdown_ms: Record<string, number>;
  total_latency_ms: number;
  weights_version: string;
  policy_version: string;
  created_at: string;
  review_status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NO_REVIEW_REQUIRED';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  final_decision?: string;
}

export interface InvestigationMetricsSnapshot {
  investigations_total: number;
  evidence_consistent_total: number;
  evidence_inconsistent_total: number;
  evidence_insufficient_total: number;
  transaction_match_rate: number;
  human_review_rate: number;
  campaign_linked_cases: number;
  high_risk_cases: number;
  response_safety_rejections: number;
  prompt_injection_attempts: number;
  investigation_latency_ms: {
    count: number;
    p50: number;
    p95: number;
    max: number;
    avg: number;
  };
  ledger_unavailable_total: number;
}
