import {
  IncidentInvestigation,
  IncidentClaim,
  IncidentClassification,
  IncidentClaimType,
  IncidentRoutingDepartment,
  HumanReviewDecision,
  RecommendedAction,
  RecoveryLinkage,
  IncidentTimelineEvent,
  TransactionMatchResult,
  TransactionMatchCandidate,
  EvidenceAssessment,
  ReasonCodeDetail,
  ComplaintCategory,
  Transaction
} from '../../core/types.js';
import {
  INVESTIGATION_REASON_CODES,
  HUMAN_REVIEW_RULES,
  HIGH_VALUE_REVIEW_THRESHOLD_BDT,
  GOLDEN_HOUR_WINDOW_MINUTES,
  INVESTIGATION_POLICY_VERSION,
  MATCHING_WEIGHTS_VERSION
} from '../../core/constants/investigation-policy.js';
import { repository } from '../../db/repository.js';
import { auditService } from '../audit-service.js';
import { recoveryRouteOptimizer } from '../recovery-route-optimizer.js';
import { claimExtractor } from './claim-extractor.js';
import { transactionMatcher } from './transaction-matcher.js';
import { evidenceCollector, CollectedEvidence } from './evidence-collector.js';
import { evidenceVerdictEngine } from './evidence-verdict.js';
import { safeResponseBuilder } from './safe-response-builder.js';
import { investigationMetrics } from './investigation-metrics.js';
import { getMatchingThresholds } from '../../core/constants/investigation-policy.js';

/**
 * Incident Investigation Service — the pipeline orchestrator.
 *
 *   Complaint -> Input Normalization -> Claim Extraction -> Evidence Collection
 *     -> Candidate Transaction Retrieval -> Evidence Matching -> Evidence Verdict
 *     -> Risk / Graph / Campaign Context -> Incident Reconstruction
 *     -> Case Classification -> Investigation Summary -> Recommended Next Action
 *     -> Human Review Decision -> Safe Customer Response -> Golden Hour / Recovery
 *
 * This is NOT a second fraud engine. Risk comes from `risk-engine`, graph from the
 * ring store and `scam-knowledge-graph`, campaigns from `scam-campaign-service`,
 * recovery from `recovery-route-optimizer`. This service decides only how the
 * customer's CLAIM relates to the EVIDENCE, and routes accordingly.
 *
 * Explanations are produced by deterministic templates grounded in evidence ids.
 * No LLM participates in the verdict, the risk score, or the customer response.
 */

export interface InvestigationRequest {
  complaint: string;
  case_id?: string;
  complaint_id?: string;
  reporter_wallet?: string;
  reporter_phone?: string;
  /** Instant the complaint was filed; relative times resolve against this. */
  reported_at?: string;
  analyst_id?: string;
  /** Extra context an upstream channel may already know. Never trusted as evidence. */
  context?: Record<string, unknown>;
  /** Set false for dry-run analysis that should not be persisted. */
  persist?: boolean;
}

export class IncidentInvestigationService {
  async investigate(request: InvestigationRequest): Promise<IncidentInvestigation> {
    const startedAt = performance.now();
    const latency: Record<string, number> = {};
    const reportedAt = request.reported_at || new Date().toISOString();

    // ─── 1. Claim extraction (includes untrusted-input neutralisation) ───────
    let t = performance.now();
    const claim = claimExtractor.extract(request.complaint, {
      reportedAt,
      reporterWallet: request.reporter_wallet,
      reporterPhone: request.reporter_phone
    });
    latency.claim_extraction_ms = Number((performance.now() - t).toFixed(1));

    // Resolve the reporter wallet once, so matcher and collector share it.
    let reporterWallet = request.reporter_wallet;
    if (!reporterWallet && request.reporter_phone) {
      try {
        const wallet = await repository.getWalletByPhone(request.reporter_phone);
        reporterWallet = wallet?.wallet_id;
      } catch {
        reporterWallet = undefined;
      }
    }

    // ─── 2. Candidate retrieval + evidence matching ─────────────────────────
    t = performance.now();
    const matchResult = await transactionMatcher.match(claim, {
      reporterWallet,
      reporterPhone: request.reporter_phone,
      reportedAt
    });
    latency.transaction_matching_ms = Number((performance.now() - t).toFixed(1));

    const thresholds = getMatchingThresholds();
    const matched =
      matchResult.best_candidate && matchResult.best_candidate.match_score >= thresholds.STRONG_MATCH
        ? matchResult.best_candidate
        : undefined;

    // ─── 3. Evidence collection across existing intelligence services ───────
    t = performance.now();
    const collected = await evidenceCollector.collect(claim, matchResult, {
      reporterWallet,
      reportedAt,
      matchedTransaction: matched
    });
    latency.evidence_collection_ms = Number((performance.now() - t).toFixed(1));

    // ─── 4. Evidence verdict + conflict detection ───────────────────────────
    t = performance.now();
    const evidence = evidenceVerdictEngine.assess({ claim, matchResult, collected });
    latency.evidence_verdict_ms = Number((performance.now() - t).toFixed(1));

    // ─── 5. Incident reconstruction (timeline) ──────────────────────────────
    t = performance.now();
    const timeline = this.buildTimeline(claim, matched, collected, reportedAt, evidence);
    latency.timeline_ms = Number((performance.now() - t).toFixed(1));

    // ─── 6. Case classification & routing ───────────────────────────────────
    const goldenHour = this.computeGoldenHour(matched, reportedAt);
    const classification = this.classify(claim, evidence, collected, matched, goldenHour);

    // ─── 7. Reason codes ────────────────────────────────────────────────────
    const reasonCodes = this.aggregateReasonCodes(claim, matchResult, evidence, collected, goldenHour);

    // ─── 8. Human review policy ─────────────────────────────────────────────
    const humanReview = this.decideHumanReview(claim, evidence, collected, matched, matchResult, goldenHour);

    // ─── 9. Recommended next actions ────────────────────────────────────────
    const recommendedActions = this.recommendActions(claim, evidence, collected, matched, classification, goldenHour);

    // ─── 10. Safe customer response (generate -> validate -> finalise) ──────
    t = performance.now();
    const customerResponse = safeResponseBuilder.build({
      claim,
      evidence,
      classification,
      humanReview,
      matched
    });
    latency.customer_response_ms = Number((performance.now() - t).toFixed(1));

    // A response that had to fall back is itself a reason for human review.
    if (customerResponse.fallback_used && !humanReview.required) {
      humanReview.required = true;
      humanReview.escalation_level = 'STANDARD';
      humanReview.triggers.push({
        rule: HUMAN_REVIEW_RULES.RESPONSE_SAFETY_FALLBACK,
        detail: `Generated response failed safety validation (${customerResponse.safety_report.violations.map(v => v.code).join(', ')}); a vetted template was substituted.`
      });
    }

    // ─── 11. Golden Hour / Recovery linkage ─────────────────────────────────
    t = performance.now();
    const recovery = this.linkRecovery(request, evidence, collected, matched, goldenHour, classification);
    latency.recovery_linkage_ms = Number((performance.now() - t).toFixed(1));

    // ─── 12. Investigation summary ──────────────────────────────────────────
    const summary = this.buildSummary(claim, evidence, collected, matched, classification, humanReview);

    const totalLatency = Number((performance.now() - startedAt).toFixed(1));

    const investigation: IncidentInvestigation = {
      investigation_id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      case_id: request.case_id,
      complaint_id: request.complaint_id,
      reporter_wallet: reporterWallet,
      reporter_phone: request.reporter_phone,
      claim,
      transaction_match: matchResult,
      evidence,
      risk_context: collected.risk_context,
      graph_context: collected.graph_context,
      campaign_context: collected.campaign_context,
      temporal_context: collected.temporal_context,
      timeline,
      classification,
      reason_codes: reasonCodes,
      recommended_actions: recommendedActions,
      human_review: humanReview,
      customer_response: customerResponse,
      recovery,
      investigation_summary_en: summary.en,
      investigation_summary_bn: summary.bn,
      explanation_engine: {
        kind: 'DETERMINISTIC_TEMPLATE',
        name: 'astha-investigation-narrator',
        version: 'v1.0.0'
      },
      latency_breakdown_ms: latency,
      total_latency_ms: totalLatency,
      weights_version: MATCHING_WEIGHTS_VERSION,
      policy_version: INVESTIGATION_POLICY_VERSION,
      created_at: new Date().toISOString(),
      review_status: humanReview.required ? 'PENDING_REVIEW' : 'NO_REVIEW_REQUIRED'
    };

    investigationMetrics.record(investigation);

    // ─── 13. Persistence + tamper-evident audit ─────────────────────────────
    if (request.persist !== false) {
      try {
        await repository.insertIncidentInvestigation(investigation);
      } catch (err: any) {
        // A persistence failure must not lose the analysis already produced.
        console.error('[incident-investigation] persistence failed:', err?.message);
      }
    }

    try {
      // Audit payload is deliberately a sanitised digest: no raw complaint text,
      // no credentials, no secrets — only identifiers and decisions.
      await auditService.logAction(
        request.analyst_id || 'SYSTEM_INVESTIGATION_ENGINE',
        'INCIDENT_INVESTIGATION_ANALYZED',
        investigation.investigation_id,
        {
          case_id: request.case_id || null,
          complaint_id: request.complaint_id || null,
          reporter_wallet: reporterWallet || null,
          claim_type: claim.claim_type,
          detected_language: claim.language,
          claimed_amount_bdt: claim.amount_bdt ?? null,
          evidence_verdict: evidence.verdict,
          verdict_confidence: evidence.verdict_confidence,
          matched_txn_id: evidence.relevant_transaction_id,
          match_confidence: evidence.match_confidence,
          evidence_sources: collected.source_status.map(s => `${s.source}:${s.state}`),
          reason_codes: reasonCodes.map(r => r.code),
          fraud_risk: collected.risk_context.fraud_risk,
          fraud_risk_score: collected.risk_context.fraud_risk_score,
          risk_model_version: collected.risk_context.model_version || null,
          campaign_id: collected.campaign_context.matched_campaign_id || null,
          ring_ids: collected.graph_context.linked_ring_ids,
          routing_department: classification.routing_department,
          recommended_actions: recommendedActions.map(a => a.action_id),
          human_review_required: humanReview.required,
          human_review_triggers: humanReview.triggers.map(t2 => t2.rule),
          customer_response_template: customerResponse.template_id,
          response_safety_passed: customerResponse.safety_report.passed,
          response_safety_fallback: customerResponse.fallback_used,
          injection_attempt_detected: claim.injection_attempt_detected,
          injection_patterns: claim.injection_patterns_matched,
          explanation_engine: investigation.explanation_engine,
          weights_version: MATCHING_WEIGHTS_VERSION,
          policy_version: INVESTIGATION_POLICY_VERSION,
          total_latency_ms: totalLatency
        }
      );
    } catch (err: any) {
      console.error('[incident-investigation] audit logging failed:', err?.message);
    }

    return investigation;
  }

  // ─── Golden hour ──────────────────────────────────────────────────────────
  private computeGoldenHour(
    matched: TransactionMatchCandidate | undefined,
    reportedAt: string
  ): { elapsedMinutes: number | null; remainingMinutes: number; isActive: boolean } {
    if (!matched) return { elapsedMinutes: null, remainingMinutes: 0, isActive: false };
    const elapsedMs = new Date(reportedAt).getTime() - new Date(matched.ts).getTime();
    const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60_000));
    const remaining = Math.max(0, GOLDEN_HOUR_WINDOW_MINUTES - elapsedMinutes);
    return { elapsedMinutes, remainingMinutes: remaining, isActive: remaining > 0 };
  }

  // ─── Classification ───────────────────────────────────────────────────────
  private classify(
    claim: IncidentClaim,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    matched: TransactionMatchCandidate | undefined,
    goldenHour: { remainingMinutes: number; isActive: boolean }
  ): IncidentClassification {
    const caseType = claim.claim_type;
    const fraudRisk = collected.risk_context.fraud_risk;
    const routing = this.routeCase(caseType, fraudRisk, evidence, collected, claim);
    const priority = this.prioritise(claim, evidence, collected, matched, goldenHour);

    return {
      case_type: caseType,
      case_type_confidence: claim.claim_type_confidence,
      complaint_category: this.toComplaintCategory(caseType, claim),
      typology: collected.campaign_context.matched_campaign_typology,
      fraud_risk: fraudRisk,
      evidence_verdict: evidence.verdict,
      routing_department: routing.department,
      routing_reason: routing.reason,
      priority,
      is_golden_hour: goldenHour.isActive && Boolean(matched),
      golden_hour_remaining_mins: goldenHour.remainingMinutes
    };
  }

  /**
   * Routing is a function of the four separate dimensions, not a collapsed label:
   * fraud risk and scam indicators pull toward FRAUD_RISK; otherwise the case type
   * decides the operational owner.
   */
  private routeCase(
    caseType: IncidentClaimType,
    fraudRisk: IncidentClassification['fraud_risk'],
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    claim: IncidentClaim
  ): { department: IncidentRoutingDepartment; reason: string } {
    const fraudSignals =
      fraudRisk === 'HIGH' ||
      fraudRisk === 'CRITICAL' ||
      collected.graph_context.linked_ring_ids.length > 0 ||
      Boolean(collected.campaign_context.matched_campaign_id) ||
      claim.credential_request_claimed ||
      claim.authority_impersonation_claimed;

    if (caseType === 'unauthorized_transaction') {
      return {
        department: 'FRAUD_RISK',
        reason: 'Customer disputes authorisation, which requires device and authentication review by fraud and risk.'
      };
    }

    if (fraudSignals) {
      const drivers: string[] = [];
      if (fraudRisk === 'HIGH' || fraudRisk === 'CRITICAL') drivers.push(`risk engine returned ${fraudRisk}`);
      if (collected.graph_context.linked_ring_ids.length > 0) drivers.push('counterparty appears in a ring case');
      if (collected.campaign_context.matched_campaign_id) drivers.push('incident is linked to an active campaign');
      if (claim.credential_request_claimed) drivers.push('customer reports a credential request');
      if (claim.authority_impersonation_claimed) drivers.push('customer reports authority impersonation');
      return {
        department: 'FRAUD_RISK',
        reason: `Routed to fraud and risk because ${drivers.join('; ')}.`
      };
    }

    switch (caseType) {
      case 'merchant_settlement_delay':
        return { department: 'MERCHANT_OPERATIONS', reason: 'Merchant settlement issue with no fraud indicators.' };
      case 'agent_cash_in_issue':
        return { department: 'AGENT_OPERATIONS', reason: 'Agent counter issue with no fraud indicators.' };
      case 'payment_failed':
      case 'duplicate_payment':
      case 'funds_not_received':
        return { department: 'PAYMENTS_OPS', reason: 'Settlement or processing discrepancy with no fraud indicators.' };
      case 'wrong_transfer':
      case 'refund_request':
        return {
          department: 'DISPUTE_RESOLUTION',
          reason: evidence.verdict === 'CONSISTENT'
            ? 'A matching transaction was identified, so the dispute can be worked directly.'
            : 'Dispute requires further customer detail before it can be progressed.'
        };
      default:
        return {
          department: 'CUSTOMER_SUPPORT',
          reason: 'Insufficient classification signal for specialist routing; customer support will gather detail.'
        };
    }
  }

  private prioritise(
    claim: IncidentClaim,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    matched: TransactionMatchCandidate | undefined,
    goldenHour: { isActive: boolean }
  ): IncidentClassification['priority'] {
    const amount = matched?.amount_bdt ?? claim.amount_bdt ?? 0;
    const highRisk = collected.risk_context.fraud_risk === 'HIGH' || collected.risk_context.fraud_risk === 'CRITICAL';

    // P1: recoverable loss still inside the golden hour, or a live high-risk loss.
    if (matched && goldenHour.isActive && (highRisk || amount >= 5000 || collected.graph_context.linked_ring_ids.length > 0)) {
      return 'P1';
    }
    if (claim.claim_type === 'unauthorized_transaction' && matched) return 'P1';
    if (highRisk || amount >= HIGH_VALUE_REVIEW_THRESHOLD_BDT) return 'P2';
    if (claim.credential_request_claimed || collected.campaign_context.matched_campaign_id) return 'P2';
    if (evidence.verdict === 'INSUFFICIENT_DATA') return 'P3';
    return 'P3';
  }

  private toComplaintCategory(caseType: IncidentClaimType, claim: IncidentClaim): ComplaintCategory {
    if (claim.credential_request_claimed) return 'PIN_OTP_request';
    switch (caseType) {
      case 'wrong_transfer': return 'wrong_transfer';
      case 'unauthorized_transaction': return 'account_takeover';
      case 'phishing_or_social_engineering':
        return claim.authority_impersonation_claimed ? 'fake_customer_care' : 'fraud';
      case 'refund_request': return 'refund_scam';
      case 'merchant_settlement_delay': return 'merchant_issue';
      case 'agent_cash_in_issue': return 'agent_issue';
      case 'payment_failed':
      case 'duplicate_payment':
      case 'funds_not_received':
        return 'unknown';
      default: return 'unknown';
    }
  }

  // ─── Reason codes ─────────────────────────────────────────────────────────
  private aggregateReasonCodes(
    claim: IncidentClaim,
    matchResult: TransactionMatchResult,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    goldenHour: { isActive: boolean }
  ): ReasonCodeDetail[] {
    const codes = new Set<string>();

    for (const item of collected.items) {
      for (const code of item.reason_codes) codes.add(code);
    }
    for (const conflict of evidence.conflicts) {
      for (const code of conflict.reason_codes) codes.add(code);
    }
    for (const item of evidence.missing_evidence) {
      for (const code of item.reason_codes) codes.add(code);
    }

    if (matchResult.ambiguous) codes.add('AMBIGUOUS_TRANSACTION_MATCH');
    if (claim.injection_attempt_detected) codes.add('PROMPT_INJECTION_ATTEMPT');
    if (claim.credential_request_claimed) codes.add('CREDENTIAL_DISCLOSURE_REPORTED');
    if (claim.denies_authorisation) codes.add('AUTHORISATION_DENIED_BY_CUSTOMER');
    if (goldenHour.isActive && evidence.relevant_transaction_id) codes.add('GOLDEN_HOUR_ACTIVE');
    if (evidence.verdict === 'INSUFFICIENT_DATA' && claim.discriminators_present.length === 0) {
      codes.add('INSUFFICIENT_CLAIM_DETAIL');
    }

    return Array.from(codes)
      .map(code => INVESTIGATION_REASON_CODES[code] || {
        code,
        label_en: code.replace(/_/g, ' ').toLowerCase(),
        label_bn: code,
        weight: 0
      })
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  }

  // ─── Human review policy ──────────────────────────────────────────────────
  /**
   * Extends the existing four-eyes / policy posture rather than replacing it:
   * a combination of triggers decides review, never a bare `risk > X`.
   */
  private decideHumanReview(
    claim: IncidentClaim,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    matched: TransactionMatchCandidate | undefined,
    matchResult: TransactionMatchResult,
    goldenHour: { isActive: boolean; remainingMinutes: number }
  ): HumanReviewDecision {
    const triggers: HumanReviewDecision['triggers'] = [];
    const risk = collected.risk_context;
    const amount = matched?.amount_bdt ?? claim.amount_bdt ?? 0;

    if (risk.available && (risk.fraud_risk === 'HIGH' || risk.fraud_risk === 'CRITICAL')) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.HIGH_FRAUD_RISK,
        detail: `Existing risk engine returned ${risk.fraud_risk} (${((risk.fraud_risk_score || 0) * 100).toFixed(0)}%).`
      });
    }

    if (evidence.conflicts.length > 0) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.EVIDENCE_CONFLICT,
        detail: `${evidence.conflicts.length} conflict(s) detected between the customer statement and observed evidence.`
      });
    }

    if (claim.denies_authorisation) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.AUTHORISATION_DENIED,
        detail: 'Customer denies initiating the transaction; authorisation cannot be established from the ledger alone.'
      });
    }

    // Insufficient evidence only forces review when the decision would be high impact.
    if (evidence.verdict === 'INSUFFICIENT_DATA' && (amount >= 5000 || claim.denies_authorisation || goldenHour.isActive)) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.INSUFFICIENT_FOR_HIGH_IMPACT,
        detail: `Evidence is insufficient but the decision is high impact (value BDT ${amount.toLocaleString()}${goldenHour.isActive ? ', golden-hour active' : ''}).`
      });
    }

    if (collected.campaign_context.matched_campaign_id) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.CAMPAIGN_LINKED,
        detail: `Incident is linked to active campaign ${collected.campaign_context.matched_campaign_id}.`
      });
    }

    if (collected.graph_context.linked_ring_ids.length > 0 || collected.graph_context.community_report_count > 0) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.GRAPH_SUSPICIOUS,
        detail: `Counterparty has ${collected.graph_context.linked_ring_ids.length} ring link(s) and ${collected.graph_context.community_report_count} community report(s).`
      });
    }

    if (amount >= HIGH_VALUE_REVIEW_THRESHOLD_BDT) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.HIGH_VALUE,
        detail: `Disputed value BDT ${amount.toLocaleString()} is at or above the BDT ${HIGH_VALUE_REVIEW_THRESHOLD_BDT.toLocaleString()} review threshold.`
      });
    }

    if (matched && goldenHour.isActive) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.RECOVERY_SENSITIVE,
        detail: `Golden-hour recovery window has ${goldenHour.remainingMinutes} minute(s) remaining; a hold decision needs a human owner.`
      });
    }

    if (claim.discriminators_present.length === 0) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.AMBIGUOUS_CLAIM,
        detail: 'Complaint contains no verifiable detail; an agent must gather more information.'
      });
    }

    if (matchResult.ambiguous) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.AMBIGUOUS_MATCH,
        detail: 'Two or more transactions match the claim near-equally; the specific transaction must be confirmed by a human.'
      });
    }

    if (claim.credential_request_claimed) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.SAFETY_SENSITIVE,
        detail: 'Customer reports a PIN/OTP request, which may mean credentials are already exposed.'
      });
    }

    if (claim.injection_attempt_detected) {
      triggers.push({
        rule: HUMAN_REVIEW_RULES.INJECTION_ATTEMPT,
        detail: `Complaint text contained instruction-injection patterns (${claim.injection_patterns_matched.join(', ')}); content was processed as data only.`
      });
    }

    const required = triggers.length > 0;

    // Escalation level is derived from WHICH rules fired, not from a count.
    const ruleIds = new Set(triggers.map(tr => tr.rule));
    let escalation: HumanReviewDecision['escalation_level'] = 'NONE';
    if (required) {
      const immediate =
        (matched && goldenHour.isActive && (risk.fraud_risk === 'CRITICAL' || collected.graph_context.linked_ring_ids.length > 0)) ||
        (ruleIds.has(HUMAN_REVIEW_RULES.AUTHORISATION_DENIED) && Boolean(matched));
      const priority =
        ruleIds.has(HUMAN_REVIEW_RULES.HIGH_FRAUD_RISK) ||
        ruleIds.has(HUMAN_REVIEW_RULES.CAMPAIGN_LINKED) ||
        ruleIds.has(HUMAN_REVIEW_RULES.EVIDENCE_CONFLICT) ||
        ruleIds.has(HUMAN_REVIEW_RULES.HIGH_VALUE);
      escalation = immediate ? 'IMMEDIATE' : priority ? 'PRIORITY' : 'STANDARD';
    }

    // Four-eyes mirrors the existing AlertCase posture: reserved for the cases
    // where an irreversible or high-value action is likely to follow.
    const fourEyes =
      escalation === 'IMMEDIATE' ||
      amount >= HIGH_VALUE_REVIEW_THRESHOLD_BDT ||
      risk.fraud_risk === 'CRITICAL';

    return {
      required,
      triggers,
      four_eyes_required: Boolean(fourEyes),
      escalation_level: escalation,
      policy_version: INVESTIGATION_POLICY_VERSION
    };
  }

  // ─── Timeline ─────────────────────────────────────────────────────────────
  /**
   * Chronological reconstruction. Events with an unknown time keep `timestamp: null`
   * rather than being given a fabricated one, and are listed after dated events.
   */
  private buildTimeline(
    claim: IncidentClaim,
    matched: TransactionMatchCandidate | undefined,
    collected: CollectedEvidence,
    reportedAt: string,
    evidence: EvidenceAssessment
  ): IncidentTimelineEvent[] {
    const events: IncidentTimelineEvent[] = [];
    let seq = 0;
    const id = (prefix: string) => `${prefix}-${++seq}`;

    // (a) Suspicious contact, as described by the customer. Time is only known if
    //     the complaint said one; otherwise it stays null.
    if (claim.scam_indicators.length > 0) {
      events.push({
        event_id: id('EVT-CONTACT'),
        timestamp: claim.time_window ? claim.time_window.start_ts : null,
        timestamp_precision: claim.time_window ? claim.time_window.precision : 'UNKNOWN',
        source: 'CUSTOMER_STATEMENT',
        event_type: 'SUSPICIOUS_CONTACT_REPORTED',
        title_en: 'Customer reports suspicious contact',
        title_bn: 'গ্রাহক সন্দেহজনক যোগাযোগের কথা জানিয়েছেন',
        description_en: `Indicators described by the customer: ${claim.scam_indicators.join(', ')}.`,
        // Customer recollection, not a verified system record.
        confidence: 0.6,
        reference_id: claim.counterparty_phone || claim.counterparty_wallet
      });
    }

    // (b) The matched transaction — a verified ledger fact.
    if (matched) {
      events.push({
        event_id: id('EVT-TXN'),
        timestamp: matched.ts,
        timestamp_precision: 'EXACT',
        source: 'TRANSACTION_LEDGER',
        event_type: 'TRANSACTION',
        title_en: `BDT ${matched.amount_bdt.toLocaleString()} ${String(matched.type).replace(/_/g, ' ').toLowerCase()}`,
        title_bn: `৳${matched.amount_bdt.toLocaleString()} লেনদেন`,
        description_en: `${matched.txn_id}: ${matched.sender_wallet} to ${matched.receiver_wallet}, status ${matched.status}, channel ${matched.channel}.`,
        confidence: 1,
        reference_id: matched.txn_id
      });
    }

    // (c) Downstream hops — verified ledger facts about where funds moved next.
    for (const hop of collected.downstream_transactions.slice(0, 6)) {
      events.push({
        event_id: id('EVT-HOP'),
        timestamp: hop.ts,
        timestamp_precision: 'EXACT',
        source: 'TRANSACTION_LEDGER',
        event_type: 'DOWNSTREAM_TRANSFER',
        title_en: `Funds moved on: BDT ${hop.amount_bdt.toLocaleString()}`,
        title_bn: `টাকা পরবর্তী ধাপে গেছে: ৳${hop.amount_bdt.toLocaleString()}`,
        description_en: `${hop.txn_id}: ${hop.sender_wallet} to ${hop.receiver_wallet} (${hop.type}).`,
        confidence: 1,
        reference_id: hop.txn_id
      });
    }

    // (d) Risk engine observation.
    if (collected.risk_context.available && matched) {
      events.push({
        event_id: id('EVT-RISK'),
        timestamp: matched.ts,
        timestamp_precision: 'EXACT',
        source: 'RISK_ENGINE',
        event_type: 'RISK_EVALUATION',
        title_en: `Risk engine scored the transaction ${((collected.risk_context.fraud_risk_score || 0) * 100).toFixed(0)}%`,
        title_bn: `ঝুঁকি ইঞ্জিন লেনদেনের ঝুঁকি ${((collected.risk_context.fraud_risk_score || 0) * 100).toFixed(0)}% নির্ধারণ করেছে`,
        description_en: `Tier ${collected.risk_context.risk_tier}, reasons: ${collected.risk_context.reasons.map(r => r.code).join(', ') || 'none fired'}.`,
        confidence: 0.9,
        reference_id: matched.txn_id
      });
    }

    // (e) Campaign correlation.
    if (collected.campaign_context.matched_campaign_id) {
      events.push({
        event_id: id('EVT-CAMP'),
        timestamp: matched ? matched.ts : null,
        timestamp_precision: matched ? 'EXACT' : 'UNKNOWN',
        source: 'CAMPAIGN_INTELLIGENCE',
        event_type: 'CAMPAIGN_CORRELATION',
        title_en: `Correlated with campaign ${collected.campaign_context.matched_campaign_name}`,
        title_bn: `ক্যাম্পেইনের সাথে সম্পর্ক পাওয়া গেছে`,
        description_en: collected.campaign_context.match_basis.join('; '),
        confidence: 0.8,
        reference_id: collected.campaign_context.matched_campaign_id
      });
    }

    // (f) Graph correlation.
    if (collected.graph_context.linked_ring_ids.length > 0) {
      events.push({
        event_id: id('EVT-GRAPH'),
        timestamp: matched ? matched.ts : null,
        timestamp_precision: matched ? 'EXACT' : 'UNKNOWN',
        source: 'KNOWLEDGE_GRAPH',
        event_type: 'RING_CORRELATION',
        title_en: `Counterparty linked to ${collected.graph_context.linked_ring_ids.length} ring case(s)`,
        title_bn: `প্রাপক চিহ্নিত চক্রের সাথে যুক্ত`,
        description_en: collected.graph_context.summary_en,
        confidence: 0.85,
        reference_id: collected.graph_context.counterparty_id
      });
    }

    // (g) Complaint intake.
    events.push({
      event_id: id('EVT-COMPLAINT'),
      timestamp: reportedAt,
      timestamp_precision: 'EXACT',
      source: 'COMPLAINT_INTAKE',
      event_type: 'COMPLAINT_FILED',
      title_en: 'Customer reported the incident',
      title_bn: 'গ্রাহক ঘটনাটি জানিয়েছেন',
      description_en: `Reported in ${claim.language}; classified as ${claim.claim_type.replace(/_/g, ' ')}.`,
      confidence: 1,
      reference_id: claim.incident_id
    });

    // (h) Investigation itself.
    events.push({
      event_id: id('EVT-INV'),
      timestamp: new Date().toISOString(),
      timestamp_precision: 'EXACT',
      source: 'INVESTIGATION_ENGINE',
      event_type: 'INVESTIGATION_COMPLETED',
      title_en: `Evidence verdict: ${evidence.verdict}`,
      title_bn: `প্রমাণভিত্তিক সিদ্ধান্ত: ${evidence.verdict}`,
      description_en: `Sources consulted: ${collected.source_status.map(s => `${s.source}=${s.state}`).join(', ')}.`,
      confidence: 1,
      reference_id: claim.incident_id
    });

    // Dated events chronologically first; undated ones appended in insertion order.
    const dated = events.filter(e => e.timestamp !== null).sort(
      (a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
    );
    const undated = events.filter(e => e.timestamp === null);
    return [...dated, ...undated];
  }

  // ─── Recommended actions ──────────────────────────────────────────────────
  private recommendActions(
    claim: IncidentClaim,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    matched: TransactionMatchCandidate | undefined,
    classification: IncidentClassification,
    goldenHour: { isActive: boolean; remainingMinutes: number }
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    let n = 0;
    const add = (
      action: string,
      actionBn: string,
      priority: RecommendedAction['priority'],
      evidenceIds: string[],
      reason: string,
      owner: IncidentRoutingDepartment = classification.routing_department
    ) => {
      actions.push({
        action_id: `ACT-${++n}`,
        action,
        action_bn: actionBn,
        owner,
        priority,
        evidence_ids: evidenceIds,
        reason
      });
    };

    const txnEvidenceIds = collected.items
      .filter(i => i.source === 'transaction' && i.reference_id === matched?.txn_id)
      .map(i => i.evidence_id);
    const graphEvidenceIds = collected.items.filter(i => i.source === 'graph').map(i => i.evidence_id);
    const campaignEvidenceIds = collected.items.filter(i => i.source === 'campaign').map(i => i.evidence_id);
    const riskEvidenceIds = collected.items.filter(i => i.source === 'risk_engine').map(i => i.evidence_id);

    if (matched && goldenHour.isActive) {
      add(
        `Open the Golden Hour recovery route for the matched transaction (${goldenHour.remainingMinutes} minute(s) remaining in the window)`,
        `সংশ্লিষ্ট লেনদেনের জন্য গোল্ডেন আওয়ার রিকভারি রুট চালু করুন (${goldenHour.remainingMinutes} মিনিট বাকি)`,
        'URGENT',
        txnEvidenceIds,
        'A specific transaction was identified and the recovery window is still open.'
      );
    }

    if (collected.graph_context.linked_ring_ids.length > 0) {
      add(
        `Review the counterparty against ring case(s) ${collected.graph_context.linked_ring_ids.join(', ')} before any release decision`,
        'কোনো সিদ্ধান্ত নেওয়ার আগে প্রাপককে চিহ্নিত চক্রের বিপরীতে পর্যালোচনা করুন',
        'HIGH',
        graphEvidenceIds,
        'The counterparty appears in an existing ring case, which changes the recovery and containment options.',
        'FRAUD_RISK'
      );
    }

    if (collected.campaign_context.matched_campaign_id) {
      add(
        `Attach this incident to campaign ${collected.campaign_context.matched_campaign_id} so the campaign exposure stays accurate`,
        'ক্যাম্পেইনের সাথে এই ঘটনাটি সংযুক্ত করুন',
        'HIGH',
        campaignEvidenceIds,
        'Campaign intelligence matched this incident; linking it keeps exposure and advisory targeting correct.',
        'FRAUD_RISK'
      );
    }

    if (claim.denies_authorisation) {
      add(
        'Pull device, session and authentication records for the disputed transaction',
        'আপত্তি জানানো লেনদেনের ডিভাইস, সেশন ও প্রমাণীকরণের রেকর্ড সংগ্রহ করুন',
        'URGENT',
        riskEvidenceIds,
        'Authorisation cannot be established from the ledger alone; these records are the missing evidence.',
        'FRAUD_RISK'
      );
    }

    if (claim.credential_request_claimed) {
      add(
        'Guide the customer through a PIN change and offer Customer Safety Mode',
        'গ্রাহককে পিন পরিবর্তনে সহায়তা করুন এবং গ্রাহক সুরক্ষা মোড চালু করার প্রস্তাব দিন',
        'HIGH',
        [],
        'The customer reports being asked for credentials, so the account may already be exposed.',
        'CUSTOMER_SUPPORT'
      );
    }

    if (evidence.verdict === 'INSUFFICIENT_DATA' || evidence.verdict === 'INCONSISTENT') {
      const needed = evidence.missing_evidence
        .filter(m => m.reason_codes.includes('INSUFFICIENT_CLAIM_DETAIL'))
        .map(m => m.claim);
      add(
        needed.length > 0
          ? 'Request the missing detail from the customer before progressing the dispute'
          : 'Broaden the evidence search (longer window, linked accounts) before progressing the dispute',
        'অভিযোগ এগিয়ে নেওয়ার আগে গ্রাহকের কাছ থেকে প্রয়োজনীয় তথ্য সংগ্রহ করুন',
        'MEDIUM',
        evidence.missing_evidence.map(m => m.evidence_id),
        needed.length > 0
          ? `The claim lacks: ${needed.length} verifiable detail(s).`
          : 'No candidate transaction matched within the searched window.'
      );
    }

    if (evidence.verdict === 'CONSISTENT' && matched && !goldenHour.isActive) {
      add(
        `Progress the dispute on transaction ${matched.txn_id} through standard resolution`,
        `স্বাভাবিক প্রক্রিয়ায় লেনদেন ${matched.txn_id} এর অভিযোগ এগিয়ে নিন`,
        'MEDIUM',
        txnEvidenceIds,
        'The transaction is identified but the golden-hour window has closed, so recovery is a standard dispute path.'
      );
    }

    if (actions.length === 0) {
      add(
        'Acknowledge the report and gather further detail from the customer',
        'অভিযোগের প্রাপ্তি স্বীকার করুন এবং গ্রাহকের কাছ থেকে আরও তথ্য নিন',
        'LOW',
        [],
        'No evidence-backed action is warranted from what is currently available.',
        'CUSTOMER_SUPPORT'
      );
    }

    return actions;
  }

  // ─── Recovery linkage ─────────────────────────────────────────────────────
  /**
   * Connects to the EXISTING Golden Hour / Recovery Route Optimizer. A route is
   * generated only when there is a concrete transaction to recover — never to make
   * the UI look complete.
   */
  private linkRecovery(
    request: InvestigationRequest,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    matched: TransactionMatchCandidate | undefined,
    goldenHour: { isActive: boolean; remainingMinutes: number },
    classification: IncidentClassification
  ): RecoveryLinkage {
    if (!matched) {
      return {
        applicable: false,
        reason: 'No specific transaction was identified, so there is nothing concrete to trace or recover.',
        golden_hour_eligible: false,
        recovery_route_available: false
      };
    }

    if (matched.status !== 'SUCCESS') {
      return {
        applicable: false,
        reason: `The matched transaction has status ${matched.status}, so funds did not leave the wallet and recovery does not apply.`,
        golden_hour_eligible: false,
        recovery_route_available: false
      };
    }

    const recoveryCaseId = request.case_id || `CASE-INV-${matched.txn_id}`;

    try {
      // Scenario selection reflects what the evidence actually shows.
      const scenario = collected.campaign_context.matched_campaign_id
        ? 'SCENARIO_C'
        : collected.downstream_transactions.length > 1
          ? 'SCENARIO_B'
          : collected.downstream_transactions.length === 1
            ? 'SCENARIO_B'
            : 'SCENARIO_A';

      const plan = recoveryRouteOptimizer.generateRecoveryRoute(recoveryCaseId, matched.txn_id, {
        scenarioId: scenario,
        goldenHourRemainingMin: goldenHour.remainingMinutes,
        disputedAmountBdt: matched.amount_bdt
      });

      return {
        applicable: true,
        reason: goldenHour.isActive
          ? `A completed transaction was identified ${GOLDEN_HOUR_WINDOW_MINUTES - goldenHour.remainingMinutes} minute(s) ago, inside the golden-hour window.`
          : 'A completed transaction was identified, but the golden-hour window has closed; standard recovery applies.',
        golden_hour_eligible: goldenHour.isActive,
        recovery_case_id: recoveryCaseId,
        recovery_route_available: true,
        recovery_scenario_id: plan.scenario_id,
        recoverability_level: plan.estimated_recoverability?.level,
        recommended_entry_point: plan.route[0]
          ? `${plan.route[0].action_type} on ${plan.route[0].target_entity_label}`
          : undefined
      };
    } catch (err: any) {
      console.error('[incident-investigation] recovery linkage failed:', err?.message);
      return {
        applicable: true,
        reason: `A transaction was identified, but the recovery optimizer could not be reached: ${err?.message || 'unknown error'}.`,
        golden_hour_eligible: goldenHour.isActive,
        recovery_case_id: recoveryCaseId,
        recovery_route_available: false
      };
    }
  }

  // ─── Investigation summary ────────────────────────────────────────────────
  /**
   * Deterministic, evidence-grounded narrative. Deliberately avoids phrasing that
   * over-claims AI certainty: it reports what the evidence indicates, never what
   * "the AI knows".
   */
  private buildSummary(
    claim: IncidentClaim,
    evidence: EvidenceAssessment,
    collected: CollectedEvidence,
    matched: TransactionMatchCandidate | undefined,
    classification: IncidentClassification,
    humanReview: HumanReviewDecision
  ): { en: string; bn: string } {
    const parts: string[] = [];
    const partsBn: string[] = [];

    const claimDesc: string[] = [];
    if (claim.amount_bdt) claimDesc.push(`BDT ${claim.amount_bdt.toLocaleString()}`);
    if (claim.time_window?.evidence_span) claimDesc.push(`around "${claim.time_window.evidence_span}"`);
    parts.push(
      `Customer reported a ${claim.claim_type.replace(/_/g, ' ')}${claimDesc.length > 0 ? ` involving ${claimDesc.join(' ')}` : ''}, in ${claim.language}.`
    );
    partsBn.push(`গ্রাহক একটি ${claim.claim_type.replace(/_/g, ' ')} সংক্রান্ত অভিযোগ জানিয়েছেন।`);

    if (matched) {
      parts.push(
        `Evidence identifies transaction ${matched.txn_id} (BDT ${matched.amount_bdt.toLocaleString()}, ${matched.type}, ${matched.status}, ${matched.ts}) at ${(matched.match_score * 100).toFixed(0)}% match confidence.`
      );
      partsBn.push(`প্রমাণ অনুযায়ী লেনদেন ${matched.txn_id} (৳${matched.amount_bdt.toLocaleString()}) সংশ্লিষ্ট বলে শনাক্ত হয়েছে।`);
    } else {
      parts.push('No specific transaction could be identified from the available records.');
      partsBn.push('উপলব্ধ রেকর্ড থেকে নির্দিষ্ট কোনো লেনদেন শনাক্ত করা যায়নি।');
    }

    parts.push(
      evidence.verdict === 'CONSISTENT'
        ? 'Available evidence is consistent with the reported incident.'
        : evidence.verdict === 'INCONSISTENT'
          ? 'Available evidence does not support the reported claim and contains contradictory records.'
          : 'Available evidence is insufficient to determine the incident.'
    );
    partsBn.push(
      evidence.verdict === 'CONSISTENT'
        ? 'উপলব্ধ তথ্য গ্রাহকের অভিযোগের সাথে সঙ্গতিপূর্ণ।'
        : evidence.verdict === 'INCONSISTENT'
          ? 'উপলব্ধ তথ্য অভিযোগটিকে সমর্থন করে না।'
          : 'উপলব্ধ তথ্য দিয়ে ঘটনাটি নির্ধারণ করা সম্ভব নয়।'
    );

    if (collected.risk_context.available) {
      parts.push(
        `Separately, the existing risk engine rates the identified transaction ${collected.risk_context.fraud_risk} (${((collected.risk_context.fraud_risk_score || 0) * 100).toFixed(0)}%). Evidence verdict and fraud risk answer different questions and are reported separately.`
      );
      partsBn.push(`পাশাপাশি, ঝুঁকি ইঞ্জিন অনুযায়ী এই লেনদেনের ঝুঁকি ${collected.risk_context.fraud_risk}।`);
    } else {
      parts.push('Fraud risk could not be assessed because no transaction was available to score.');
      partsBn.push('স্কোর করার মতো লেনদেন না থাকায় ঝুঁকি নির্ধারণ করা যায়নি।');
    }

    if (collected.graph_context.linked_ring_ids.length > 0 || collected.graph_context.community_report_count > 0) {
      parts.push(`Graph intelligence: ${collected.graph_context.summary_en}`);
    } else if (!collected.graph_context.available) {
      parts.push('Graph intelligence was unavailable for this incident; no counterparty relationships were assumed.');
    }

    if (collected.campaign_context.matched_campaign_id) {
      parts.push(`Campaign intelligence: ${collected.campaign_context.summary_en}`);
      partsBn.push(`ক্যাম্পেইন তথ্য: ${collected.campaign_context.summary_bn}`);
    }

    if (evidence.conflicts.length > 0) {
      parts.push(
        `${evidence.conflicts.length} evidence conflict(s) were detected and are reported without attributing blame: ${evidence.conflicts.map(c => c.customer_claim).join(' | ')}`
      );
      partsBn.push(`${evidence.conflicts.length}টি অসঙ্গতি পাওয়া গেছে, যা কোনো দোষারোপ ছাড়া রিপোর্ট করা হয়েছে।`);
    }

    parts.push(
      `Routed to ${classification.routing_department} at ${classification.priority}. Human review is ${humanReview.required ? `REQUIRED (${humanReview.escalation_level}): ${humanReview.triggers.map(tr => tr.rule).join(', ')}` : 'not required by policy'}.`
    );
    partsBn.push(
      `${classification.routing_department} বিভাগে ${classification.priority} অগ্রাধিকারে পাঠানো হয়েছে। মানব পর্যালোচনা ${humanReview.required ? 'প্রয়োজন' : 'প্রয়োজন নেই'}।`
    );

    return { en: parts.join(' '), bn: partsBn.join(' ') };
  }

  // ─── Review workflow ──────────────────────────────────────────────────────
  async recordReviewDecision(
    investigationId: string,
    decision: {
      review_status: IncidentInvestigation['review_status'];
      reviewed_by: string;
      review_notes?: string;
      final_decision?: string;
    }
  ): Promise<IncidentInvestigation | null> {
    const updated = await repository.updateIncidentInvestigationReview(investigationId, decision);
    if (!updated) return null;

    await auditService.logAction(
      decision.reviewed_by,
      `INVESTIGATION_REVIEW_${decision.review_status}`,
      investigationId,
      {
        review_status: decision.review_status,
        final_decision: decision.final_decision || null,
        notes_present: Boolean(decision.review_notes),
        evidence_verdict: updated.evidence.verdict,
        matched_txn_id: updated.evidence.relevant_transaction_id
      }
    );

    return updated;
  }
}

export const incidentInvestigationService = new IncidentInvestigationService();
