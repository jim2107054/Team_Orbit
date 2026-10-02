import {
  IncidentClaim,
  TransactionMatchResult,
  TransactionMatchCandidate,
  EvidenceAssessment,
  EvidenceItem,
  EvidenceConflict,
  EvidenceReasoningStep,
  EvidenceVerdict,
  EvidenceSourceStatus,
  IncidentRiskContext,
  IncidentGraphContext
} from '../../core/types.js';
import { getMatchingThresholds } from '../../core/constants/investigation-policy.js';
import { CollectedEvidence } from './evidence-collector.js';

/**
 * Evidence Verdict — the deterministic core of the investigation.
 *
 * Decides between exactly three states:
 *
 *   CONSISTENT        available evidence supports the customer's claim
 *   INCONSISTENT      available evidence directly contradicts the claim
 *   INSUFFICIENT_DATA evidence is not enough to determine what happened
 *
 * Deliberate design rules:
 *
 *   1. INCONSISTENT is never a finding that the customer is lying. It states only
 *      that the currently available evidence does not support the claim AND holds
 *      contradictory records. It requires a FALSIFIABLE discriminator (amount or
 *      reference) plus a non-empty ledger window — otherwise the honest answer is
 *      INSUFFICIENT_DATA.
 *   2. A denial of authorisation combined with an existing transaction is an
 *      evidence CONFLICT, not proof of customer fraud. It resolves to
 *      INSUFFICIENT_DATA and mandatory human review.
 *   3. No LLM participates in this decision. Nothing here is probabilistic
 *      guessing — the verdict is a function of recorded facts and documented rules.
 */

let conflictSeq = 0;
function nextConflictId(): string {
  conflictSeq = (conflictSeq + 1) % 100_000;
  return `CONF-${Date.now().toString(36).toUpperCase()}-${String(conflictSeq).padStart(3, '0')}`;
}

let stepSeq = 0;
function nextStepId(): string {
  stepSeq = (stepSeq + 1) % 100_000;
  return `STEP-${String(stepSeq).padStart(4, '0')}`;
}

export interface VerdictInput {
  claim: IncidentClaim;
  matchResult: TransactionMatchResult;
  collected: CollectedEvidence;
}

export class EvidenceVerdictEngine {
  assess(input: VerdictInput): EvidenceAssessment {
    const { claim, matchResult, collected } = input;
    const thresholds = getMatchingThresholds();

    const best = matchResult.best_candidate;
    const strongMatch = Boolean(best && best.match_score >= thresholds.STRONG_MATCH);
    const matched = strongMatch ? best : undefined;

    const supporting: EvidenceItem[] = [];
    const conflicting: EvidenceItem[] = [];
    const contextual: EvidenceItem[] = [];
    const missing: EvidenceItem[] = [];
    const conflicts: EvidenceConflict[] = [];
    const reasoning: EvidenceReasoningStep[] = [];

    // Partition collected evidence by direction. Neutral items go to their own
    // bucket rather than being dropped or counted as support.
    for (const item of collected.items) {
      if (item.direction === 'supports') supporting.push(item);
      else if (item.direction === 'contradicts') conflicting.push(item);
      else contextual.push(item);
    }

    // ─── Missing evidence: state what we would have needed ──────────────────
    missing.push(...this.identifyMissingEvidence(claim, matchResult, collected));

    // ─── Conflict detection (runs regardless of the final verdict) ───────────
    conflicts.push(...this.detectConflicts(claim, matchResult, matched, collected));

    // ─── Verdict decision tree ──────────────────────────────────────────────
    const decision = this.decideVerdict({
      claim,
      matchResult,
      matched,
      collected,
      conflicts,
      strongMatchThreshold: thresholds.STRONG_MATCH
    });

    // ─── Traceable reasoning: CLAIM -> EVIDENCE -> REASON -> CONCLUSION ─────
    reasoning.push(...this.buildReasoningChain(claim, matchResult, matched, collected, decision.verdict));

    const matchConfidence = best ? best.match_score : null;

    return {
      verdict: decision.verdict,
      verdict_confidence: decision.confidence,
      relevant_transaction_id: matched ? matched.txn_id : null,
      match_confidence: matchConfidence,
      supporting_evidence: supporting,
      conflicting_evidence: conflicting,
      contextual_evidence: contextual,
      missing_evidence: missing,
      conflicts,
      reasoning_chain: reasoning,
      reasoning: decision.reasoning_en,
      reasoning_bn: decision.reasoning_bn,
      source_status: collected.source_status
    };
  }

  // ─── Decision tree ────────────────────────────────────────────────────────
  private decideVerdict(args: {
    claim: IncidentClaim;
    matchResult: TransactionMatchResult;
    matched?: TransactionMatchCandidate;
    collected: CollectedEvidence;
    conflicts: EvidenceConflict[];
    strongMatchThreshold: number;
  }): { verdict: EvidenceVerdict; confidence: number; reasoning_en: string; reasoning_bn: string } {
    const { claim, matchResult, matched, conflicts } = args;

    // Rule 1 — the ledger itself could not be reached. Degrade safely; never guess.
    if (!matchResult.ledger_available) {
      return {
        verdict: 'INSUFFICIENT_DATA',
        confidence: 0.95,
        reasoning_en:
          'The transaction ledger could not be queried, so no transaction evidence exists for this incident. ' +
          'The available evidence is insufficient to determine what happened. No evidence has been inferred to fill the gap.',
        reasoning_bn:
          'লেনদেনের ডেটাবেস থেকে তথ্য আনা যায়নি, তাই এই ঘটনার জন্য কোনো লেনদেনভিত্তিক প্রমাণ নেই। ' +
          'উপলব্ধ তথ্য দিয়ে কী ঘটেছে তা নির্ধারণ করা সম্ভব নয়।'
      };
    }

    // Rule 2 — the claim is not falsifiable: nothing to test against the ledger.
    const hasAnyDiscriminator = claim.discriminators_present.length > 0;
    if (!hasAnyDiscriminator) {
      return {
        verdict: 'INSUFFICIENT_DATA',
        confidence: 0.9,
        reasoning_en:
          'The complaint states that something went wrong but contains no amount, time, counterparty or transaction reference. ' +
          'There is no verifiable detail to compare against the transaction records, so the available evidence is insufficient to determine the incident.',
        reasoning_bn:
          'অভিযোগে সমস্যার কথা বলা হয়েছে, কিন্তু কোনো পরিমাণ, সময়, প্রাপক বা লেনদেন রেফারেন্স উল্লেখ নেই। ' +
          'যাচাই করার মতো কোনো তথ্য না থাকায় ঘটনাটি নির্ধারণ করা সম্ভব নয়।'
      };
    }

    // Rule 3 — a denial of authorisation against an existing transaction is a
    // conflict, not a determination. This is the case the spec calls out
    // explicitly: never conclude "customer fraud".
    const authorisationConflict = conflicts.find(c => c.reason_codes.includes('AUTHORISATION_DENIED_BY_CUSTOMER'));
    if (authorisationConflict) {
      return {
        verdict: 'INSUFFICIENT_DATA',
        confidence: 0.85,
        reasoning_en:
          `The customer states the transaction was not initiated by them, while the ledger holds a ${matched ? `matching ${matched.status.toLowerCase()} transaction (${matched.txn_id})` : 'transaction for this account'}. ` +
          'These two accounts of the same event cannot both be verified from the records now available: the ledger shows what happened, not who authorised it. ' +
          'Determining authorisation requires device, session and authentication review by a human investigator, so no conclusion is drawn here.',
        reasoning_bn:
          'গ্রাহক বলছেন লেনদেনটি তিনি করেননি, অথচ রেকর্ডে একটি সম্পন্ন লেনদেন রয়েছে। ' +
          'বর্তমান রেকর্ড থেকে কে অনুমোদন দিয়েছে তা নিশ্চিত করা যায় না, তাই মানব তদন্তকারীর পর্যালোচনা ছাড়া কোনো সিদ্ধান্ত নেওয়া হচ্ছে না।'
      };
    }

    // Rule 4 — strong match found and no contradiction on the matched record.
    if (matched) {
      const contradicted = matched.contradicting_signals.filter(s => s !== 'STATUS_CONSISTENCY');
      if (contradicted.length === 0) {
        const ambiguous = matchResult.ambiguous;
        const matchedSignals = matched.signals.filter(s => s.evaluable && s.strength >= 0.9).map(s => s.signal);
        return {
          verdict: 'CONSISTENT',
          // Ambiguity lowers confidence in WHICH transaction, not in whether the claim holds.
          confidence: Number(Math.min(0.97, matched.match_score * (ambiguous ? 0.85 : 1)).toFixed(2)),
          reasoning_en:
            `Transaction ${matched.txn_id} matches the reported incident on ${matchedSignals.length} evidence signal(s): ${matchedSignals.join(', ')}. ` +
            `The ledger records BDT ${matched.amount_bdt.toLocaleString()} as a ${matched.type} at ${matched.ts} with status ${matched.status}. ` +
            `Available evidence is consistent with the reported incident` +
            (ambiguous
              ? ', though more than one transaction matches the claim near-equally, so the specific transaction is not asserted with certainty.'
              : '.'),
          reasoning_bn:
            `লেনদেন ${matched.txn_id} অভিযোগের সাথে ${matchedSignals.length}টি প্রমাণ-সংকেতে মিলেছে। ` +
            `রেকর্ড অনুযায়ী ৳${matched.amount_bdt.toLocaleString()} (${matched.type}) ${matched.ts} সময়ে, অবস্থা ${matched.status}. ` +
            'উপলব্ধ তথ্য গ্রাহকের অভিযোগের সাথে সঙ্গতিপূর্ণ।'
        };
      }

      // Matched above threshold but a strong signal actively contradicts.
      return {
        verdict: 'INSUFFICIENT_DATA',
        confidence: 0.7,
        reasoning_en:
          `The closest transaction (${matched.txn_id}) partly matches the complaint but contradicts it on ${contradicted.join(', ')}. ` +
          'The records neither support nor refute the claim cleanly, so the available evidence is insufficient to determine the incident.',
        reasoning_bn:
          `সবচেয়ে কাছাকাছি লেনদেন (${matched.txn_id}) আংশিক মিলেছে, কিন্তু ${contradicted.join(', ')} ক্ষেত্রে অসঙ্গতি রয়েছে। ` +
          'তাই উপলব্ধ তথ্য দিয়ে নিশ্চিত সিদ্ধান্ত নেওয়া সম্ভব নয়।'
      };
    }

    // Rule 5 — INCONSISTENT requires: the ledger window held records, AND the claim
    // carried a falsifiable discriminator, AND no record satisfies it.
    const ledgerHadRecords = matchResult.candidates_considered > 0;
    const falsifiable = claim.discriminators_present.includes('amount') ||
      claim.discriminators_present.includes('transaction_reference');

    if (ledgerHadRecords && falsifiable) {
      const referenceClaimed = claim.transaction_reference;
      const referenceFound = matchResult.candidates.some(
        c => referenceClaimed && c.txn_id.toUpperCase() === referenceClaimed.toUpperCase()
      );

      if (referenceClaimed && !referenceFound) {
        return {
          verdict: 'INCONSISTENT',
          confidence: 0.85,
          reasoning_en:
            `The customer quoted transaction reference ${referenceClaimed}, which does not exist in the ledger. ` +
            `${matchResult.candidates_considered} transaction(s) were searched for this account in the relevant window. ` +
            'The available evidence does not support the reported claim and contains contradictory evidence. This is not a determination that the customer is being untruthful — the reference may be mistyped, belong to another provider, or relate to a record outside the searched window.',
          reasoning_bn:
            `গ্রাহকের দেওয়া রেফারেন্স ${referenceClaimed} রেকর্ডে নেই। ` +
            'উপলব্ধ তথ্য অভিযোগটিকে সমর্থন করে না। এটি গ্রাহকের অসত্য বলার প্রমাণ নয় — রেফারেন্সটি ভুল টাইপ হতে পারে বা অন্য সময়সীমার হতে পারে।'
        };
      }

      const claimedAmounts = claim.candidate_amounts_bdt;
      const observedAmounts = Array.from(new Set(matchResult.candidates.map(c => c.amount_bdt))).slice(0, 6);
      return {
        verdict: 'INCONSISTENT',
        confidence: 0.8,
        reasoning_en:
          `No transaction at or near the claimed amount (BDT ${claimedAmounts.map(a => a.toLocaleString()).join(' / ')}) exists for this account in the searched window. ` +
          `${matchResult.candidates_considered} transaction(s) were examined${observedAmounts.length > 0 ? `, with amounts such as BDT ${observedAmounts.map(a => a.toLocaleString()).join(', ')}` : ''}. ` +
          'The available evidence does not support the reported claim and contains contradictory evidence. This is not a determination that the customer is being untruthful — the amount may be misremembered, or the transaction may sit outside the searched window or on another account.',
        reasoning_bn:
          `অনুসন্ধানের সময়সীমায় গ্রাহকের বলা পরিমাণের (৳${claimedAmounts.map(a => a.toLocaleString()).join(' / ')}) কোনো লেনদেন পাওয়া যায়নি। ` +
          `${matchResult.candidates_considered}টি লেনদেন পরীক্ষা করা হয়েছে। ` +
          'উপলব্ধ তথ্য অভিযোগটিকে সমর্থন করে না। এটি গ্রাহকের অসত্য বলার প্রমাণ নয়।'
      };
    }

    // Rule 6 — ledger window was empty: genuinely nothing to compare.
    if (!ledgerHadRecords) {
      return {
        verdict: 'INSUFFICIENT_DATA',
        confidence: 0.9,
        reasoning_en:
          `No transactions were found for this account between ${matchResult.search_window_start} and ${matchResult.search_window_end}. ` +
          'Without any transaction records in the relevant period, the available evidence is insufficient to determine what happened. ' +
          (matchResult.ledger_error ? `Retrieval note: ${matchResult.ledger_error}` : ''),
        reasoning_bn:
          'প্রাসঙ্গিক সময়সীমায় এই অ্যাকাউন্টের কোনো লেনদেন পাওয়া যায়নি। ' +
          'লেনদেনের রেকর্ড না থাকায় কী ঘটেছে তা নির্ধারণ করা সম্ভব নয়।'
      };
    }

    // Rule 7 — fallback: candidates exist, nothing matched strongly, claim not falsifiable
    // on amount/reference (e.g. only a counterparty or a vague time was given).
    return {
      verdict: 'INSUFFICIENT_DATA',
      confidence: 0.75,
      reasoning_en:
        `${matchResult.candidates_considered} transaction(s) were searched, but the complaint does not contain enough specific detail ` +
        `(amount or transaction reference) to confirm or rule out a match. The available evidence is insufficient to determine the incident.`,
      reasoning_bn:
        `${matchResult.candidates_considered}টি লেনদেন পরীক্ষা করা হয়েছে, তবে অভিযোগে পর্যাপ্ত নির্দিষ্ট তথ্য (পরিমাণ বা রেফারেন্স) নেই। ` +
        'তাই উপলব্ধ তথ্য দিয়ে নিশ্চিত সিদ্ধান্ত নেওয়া সম্ভব নয়।'
    };
  }

  // ─── Conflict detection ───────────────────────────────────────────────────
  /**
   * Detects contradictions BETWEEN sources: customer statement vs transaction
   * evidence vs risk evidence vs graph evidence vs campaign evidence.
   */
  private detectConflicts(
    claim: IncidentClaim,
    matchResult: TransactionMatchResult,
    matched: TransactionMatchCandidate | undefined,
    collected: CollectedEvidence
  ): EvidenceConflict[] {
    const conflicts: EvidenceConflict[] = [];

    // (1) Customer denies authorising; a transaction exists for the account.
    if (claim.denies_authorisation) {
      const anyTransaction = matched || matchResult.candidates[0];
      if (anyTransaction) {
        const extra: string[] = [];
        if (collected.counterparty_is_new) extra.push('the counterparty is new to this customer');
        if (collected.graph_context.linked_ring_ids.length > 0) {
          extra.push(`the counterparty appears in ring case(s) ${collected.graph_context.linked_ring_ids.join(', ')}`);
        }
        if (collected.graph_context.community_report_count > 0) {
          extra.push(`${collected.graph_context.community_report_count} prior community report(s) exist against the counterparty`);
        }
        if (collected.risk_context.available && collected.risk_context.fraud_risk_score !== null) {
          extra.push(`the existing risk engine scored the transaction ${(collected.risk_context.fraud_risk_score * 100).toFixed(0)}%`);
        }

        conflicts.push({
          conflict_id: nextConflictId(),
          customer_claim: 'The transaction was not initiated by the customer.',
          observed_evidence: `A ${anyTransaction.status.toLowerCase()} ${anyTransaction.type} of BDT ${anyTransaction.amount_bdt.toLocaleString()} (${anyTransaction.txn_id}) is recorded on this account at ${anyTransaction.ts}.`,
          additional_context: extra.length > 0
            ? `Additional observations that do not resolve the conflict either way: ${extra.join('; ')}.`
            : undefined,
          severity: 'HIGH',
          reason_codes: ['EVIDENCE_CONFLICT', 'AUTHORISATION_DENIED_BY_CUSTOMER']
        });
      }
    }

    // (2) Customer says the payment failed; the ledger says it succeeded.
    if (claim.claimed_status === 'failed' && matched && matched.status === 'SUCCESS') {
      conflicts.push({
        conflict_id: nextConflictId(),
        customer_claim: 'The payment failed or did not go through.',
        observed_evidence: `Transaction ${matched.txn_id} is recorded with status SUCCESS at ${matched.ts}.`,
        additional_context: 'A successful debit with a non-delivered credit is a settlement question, not necessarily a contradiction of the customer.',
        severity: 'MEDIUM',
        reason_codes: ['EVIDENCE_CONFLICT']
      });
    }

    // (3) Customer says funds were sent; the matched record shows a failure.
    if (claim.claimed_status === 'completed' && matched && matched.status !== 'SUCCESS') {
      conflicts.push({
        conflict_id: nextConflictId(),
        customer_claim: 'The money left the wallet.',
        observed_evidence: `Transaction ${matched.txn_id} is recorded with status ${matched.status}.`,
        severity: 'MEDIUM',
        reason_codes: ['EVIDENCE_CONFLICT']
      });
    }

    // (4) Reported counterparty does not match the counterparty on the matched record.
    if (matched && matched.contradicting_signals.includes('COUNTERPARTY_MATCH')) {
      const named = claim.counterparty_wallet || claim.merchant_id || claim.agent_id;
      if (named) {
        conflicts.push({
          conflict_id: nextConflictId(),
          customer_claim: `Funds went to ${named}.`,
          observed_evidence: `The best-matching transaction ${matched.txn_id} involves ${matched.receiver_wallet} instead.`,
          severity: 'MEDIUM',
          reason_codes: ['EVIDENCE_CONFLICT']
        });
      }
    }

    // (5) Claim looks low-risk but the existing risk engine disagrees sharply.
    if (
      collected.risk_context.available &&
      collected.risk_context.fraud_risk_score !== null &&
      collected.risk_context.fraud_risk_score >= 0.7 &&
      claim.claim_type === 'wrong_transfer' &&
      claim.scam_indicators.length === 0
    ) {
      conflicts.push({
        conflict_id: nextConflictId(),
        customer_claim: 'This was an accidental transfer to a wrong number.',
        observed_evidence: `The existing risk engine scored the matched transaction ${(collected.risk_context.fraud_risk_score * 100).toFixed(0)}% with reasons: ${collected.risk_context.reasons.map(r => r.code).join(', ')}.`,
        additional_context: 'An accidental transfer and a socially engineered transfer can look identical to the customer; the risk signals do not establish which occurred.',
        severity: 'LOW',
        reason_codes: ['EVIDENCE_CONFLICT']
      });
    }

    return conflicts;
  }

  // ─── Missing evidence ─────────────────────────────────────────────────────
  private identifyMissingEvidence(
    claim: IncidentClaim,
    matchResult: TransactionMatchResult,
    collected: CollectedEvidence
  ): EvidenceItem[] {
    const missing: EvidenceItem[] = [];
    const add = (source: EvidenceItem['source'], text: string, textBn: string, codes: string[]) => {
      missing.push({
        evidence_id: `EVD-MISSING-${missing.length + 1}`,
        source,
        claim: text,
        claim_bn: textBn,
        relevance: 'medium',
        direction: 'neutral',
        confidence: 1,
        reason_codes: codes
      });
    };

    // A single absent field is a gap to chase, not grounds to call the whole claim
    // undetailed. Only an entirely non-falsifiable claim carries
    // INSUFFICIENT_CLAIM_DETAIL, which is attached at the top level by the
    // orchestrator when no discriminator at all was extracted.
    const fieldGapCodes: string[] = [];

    if (!claim.amount_bdt) {
      add('complaint', 'The complaint does not state an amount, which is the strongest ledger discriminator available to customers.',
        'অভিযোগে কোনো পরিমাণ উল্লেখ নেই, যা যাচাইয়ের সবচেয়ে কার্যকর তথ্য।', fieldGapCodes);
    }
    if (!claim.time_window) {
      add('complaint', 'The complaint does not state when the incident occurred, so the search window could not be narrowed.',
        'অভিযোগে ঘটনার সময় উল্লেখ নেই, তাই অনুসন্ধানের সময়সীমা সংকুচিত করা যায়নি।', fieldGapCodes);
    }
    if (!claim.counterparty_wallet && !claim.counterparty_phone && !claim.merchant_id && !claim.agent_id) {
      add('complaint', 'The complaint does not identify the counterparty, so recipient-side intelligence could not be queried.',
        'অভিযোগে প্রাপকের পরিচয় নেই, তাই প্রাপক-সংক্রান্ত তথ্য যাচাই করা যায়নি।', fieldGapCodes);
    }
    if (!claim.transaction_reference) {
      add('complaint', 'No transaction reference was supplied; a reference would resolve the match decisively.',
        'কোনো লেনদেন রেফারেন্স দেওয়া হয়নি; রেফারেন্স থাকলে নিশ্চিতভাবে মিলিয়ে দেখা যেত।', fieldGapCodes);
    }
    if (!matchResult.ledger_available) {
      add('transaction', 'Transaction records could not be retrieved for this investigation.',
        'এই তদন্তের জন্য লেনদেনের রেকর্ড আনা যায়নি।', ['LEDGER_UNAVAILABLE']);
    }
    if (!collected.risk_context.available) {
      add('risk_engine', collected.risk_context.unavailable_reason || 'Risk context unavailable.',
        'ঝুঁকি প্রসঙ্গ পাওয়া যায়নি।', ['RISK_CONTEXT_UNAVAILABLE']);
    }
    // "Unavailable" is reserved for a lookup that FAILED. Having no counterparty to
    // look up is not an outage and must not be reported as one.
    if (!collected.graph_context.available) {
      const graphLookupFailed = Boolean(collected.graph_context.counterparty_id);
      add('graph',
        collected.graph_context.unavailable_reason || 'Graph evidence unavailable.',
        'গ্রাফ তথ্য পাওয়া যায়নি।',
        graphLookupFailed ? ['GRAPH_UNAVAILABLE'] : []);
    }
    if (!collected.campaign_context.available) {
      add('campaign', collected.campaign_context.unavailable_reason || 'Campaign evidence unavailable.',
        'ক্যাম্পেইন তথ্য পাওয়া যায়নি।', ['CAMPAIGN_UNAVAILABLE']);
    }
    if (claim.denies_authorisation) {
      add('account', 'Device, session and authentication records are required to establish who authorised the transaction; they were not part of this evidence set.',
        'কে লেনদেনটি অনুমোদন করেছে তা নির্ধারণে ডিভাইস, সেশন ও প্রমাণীকরণের রেকর্ড প্রয়োজন, যা এই তথ্যভাণ্ডারে নেই।', ['EVIDENCE_CONFLICT']);
    }

    return missing;
  }

  // ─── Reasoning chain ──────────────────────────────────────────────────────
  private buildReasoningChain(
    claim: IncidentClaim,
    matchResult: TransactionMatchResult,
    matched: TransactionMatchCandidate | undefined,
    collected: CollectedEvidence,
    verdict: EvidenceVerdict
  ): EvidenceReasoningStep[] {
    const steps: EvidenceReasoningStep[] = [];

    // Step 1 — the claim itself.
    const claimParts: string[] = [];
    if (claim.amount_bdt) claimParts.push(`BDT ${claim.amount_bdt.toLocaleString()}`);
    if (claim.time_window) claimParts.push(`around ${claim.time_window.evidence_span || claim.time_window.start_ts}`);
    if (claim.counterparty_wallet) claimParts.push(`to ${claim.counterparty_wallet}`);
    if (claim.transaction_reference) claimParts.push(`reference ${claim.transaction_reference}`);

    steps.push({
      step_id: nextStepId(),
      claim: `Customer reports a ${claim.claim_type.replace(/_/g, ' ')}${claimParts.length > 0 ? ` involving ${claimParts.join(', ')}` : ''}.`,
      evidence_ids: [],
      evidence_statements: [`Extracted from the customer statement (language: ${claim.language}).`],
      reason: `Claim extraction produced ${claim.discriminators_present.length} verifiable discriminator(s): ${claim.discriminators_present.join(', ') || 'none'}.`,
      conclusion: claim.discriminators_present.length > 0
        ? 'The claim is testable against transaction records.'
        : 'The claim cannot be tested against transaction records.',
      verified: false
    });

    // Step 2 — transaction match.
    if (matched) {
      const matchedSignalItems = collected.items.filter(
        i => i.source === 'transaction' && i.reference_id === matched.txn_id
      );
      steps.push({
        step_id: nextStepId(),
        claim: `The incident refers to transaction ${matched.txn_id}.`,
        evidence_ids: matchedSignalItems.map(i => i.evidence_id),
        evidence_statements: matchedSignalItems.map(i => i.claim),
        reason: `Weighted match score ${(matched.match_score * 100).toFixed(0)}% across ${matched.signals.filter(s => s.evaluable).length} evaluable signal(s), using weights ${matchResult.weights_version}.`,
        conclusion: matchResult.ambiguous
          ? `Transaction ${matched.txn_id} is the strongest candidate, but another candidate scores near-equally, so the identification is not certain.`
          : `Transaction ${matched.txn_id} is identified as the relevant transaction.`,
        verified: true
      });
    } else {
      steps.push({
        step_id: nextStepId(),
        claim: 'A specific transaction corresponds to this incident.',
        evidence_ids: collected.items.filter(i => i.source === 'transaction').map(i => i.evidence_id),
        evidence_statements: [
          `${matchResult.candidates_considered} transaction(s) searched between ${matchResult.search_window_start} and ${matchResult.search_window_end}.`
        ],
        reason: matchResult.ledger_available
          ? 'No candidate reached the configured strong-match threshold.'
          : 'The transaction ledger was unavailable.',
        conclusion: 'No specific transaction is identified for this incident.',
        verified: matchResult.ledger_available
      });
    }

    // Step 3 — risk context (kept separate from the evidence verdict).
    if (collected.risk_context.available) {
      const riskItems = collected.items.filter(i => i.source === 'risk_engine');
      steps.push({
        step_id: nextStepId(),
        claim: 'The matched transaction carries fraud risk.',
        evidence_ids: riskItems.map(i => i.evidence_id),
        evidence_statements: riskItems.map(i => i.claim),
        reason: `Scored by the existing risk engine (${collected.risk_context.model_version}); this is a separate question from whether the customer's account of events is supported.`,
        conclusion: `Fraud risk is ${collected.risk_context.fraud_risk} (${((collected.risk_context.fraud_risk_score || 0) * 100).toFixed(0)}%).`,
        verified: true
      });
    }

    // Step 4 — graph / campaign context.
    if (collected.graph_context.available && (collected.graph_context.linked_ring_ids.length > 0 || collected.graph_context.community_report_count > 0)) {
      const graphItems = collected.items.filter(i => i.source === 'graph');
      steps.push({
        step_id: nextStepId(),
        claim: 'The counterparty has suspicious relationships.',
        evidence_ids: graphItems.map(i => i.evidence_id),
        evidence_statements: graphItems.map(i => i.claim),
        reason: 'Queried from the existing ring case store and community report store.',
        conclusion: collected.graph_context.summary_en,
        verified: true
      });
    }

    if (collected.campaign_context.matched_campaign_id) {
      const campItems = collected.items.filter(i => i.source === 'campaign');
      steps.push({
        step_id: nextStepId(),
        claim: 'The incident belongs to a coordinated scam campaign.',
        evidence_ids: campItems.map(i => i.evidence_id),
        evidence_statements: campItems.map(i => i.claim),
        reason: `Matched by the existing Scam Campaign Intelligence on: ${collected.campaign_context.match_basis.join('; ')}.`,
        conclusion: collected.campaign_context.summary_en,
        verified: true
      });
    }

    // Step 5 — the verdict itself.
    steps.push({
      step_id: nextStepId(),
      claim: 'Overall relationship between the customer statement and the available evidence.',
      evidence_ids: collected.items.map(i => i.evidence_id),
      evidence_statements: [
        `Evidence sources consulted: ${collected.source_status.map(s => `${s.source}=${s.state}`).join(', ')}.`
      ],
      reason: 'Deterministic verdict policy applied to the collected evidence; no generative model participates in this decision.',
      conclusion: verdict === 'CONSISTENT'
        ? 'Available evidence is consistent with the reported incident.'
        : verdict === 'INCONSISTENT'
          ? 'Available evidence does not support the reported claim and contains contradictory records.'
          : 'Available evidence is insufficient to determine the incident.',
      verified: true
    });

    return steps;
  }
}

export const evidenceVerdictEngine = new EvidenceVerdictEngine();
