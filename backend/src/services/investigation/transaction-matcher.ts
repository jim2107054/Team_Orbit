import {
  IncidentClaim,
  Transaction,
  TransactionMatchCandidate,
  TransactionMatchResult,
  MatchSignalResult,
  ClaimTimeWindow
} from '../../core/types.js';
import {
  getMatchingWeights,
  getMatchingThresholds,
  getAmountTolerance,
  getTimeTolerance,
  MATCHING_WEIGHTS_VERSION
} from '../../core/constants/investigation-policy.js';
import { repository } from '../../db/repository.js';

/**
 * Complaint → Transaction matching.
 *
 * Answers exactly one question: "which transaction, if any, does this complaint
 * refer to?" It does NOT decide whether fraud occurred and it does NOT produce a
 * verdict — that is `evidence-verdict.ts`.
 *
 * Scoring is a transparent weighted sum normalised over EVALUABLE signals only, so
 * a claim that omits the counterparty is not penalised for the omission. Every
 * signal reports its weight, strength and a human-readable explanation, so an
 * investigator can see precisely why a candidate ranked where it did.
 *
 * Retrieval is a single windowed query per wallet (see
 * `repository.getWalletTransactionsInWindow`) — no per-candidate round trips.
 */

const CASH_LIKE_TYPES = new Set(['CASH_OUT', 'CASH_IN']);

export class TransactionMatcher {
  /**
   * @param claim    structured customer claim
   * @param context.reporterWallet wallet whose ledger is searched
   * @param context.reportedAt     reference instant that bounds the search window
   */
  async match(
    claim: IncidentClaim,
    context: {
      reporterWallet?: string;
      reporterPhone?: string;
      reportedAt?: string;
    }
  ): Promise<TransactionMatchResult> {
    const thresholds = getMatchingThresholds();
    const reportedAt = context.reportedAt || new Date().toISOString();
    const reportedAtMs = new Date(reportedAt).getTime();

    // Search window: widest of (claim window, default lookback), clamped to reportedAt.
    const { startTs, endTs } = this.buildSearchWindow(claim, reportedAtMs, thresholds.SEARCH_WINDOW_HOURS);

    const emptyResult = (available: boolean, error?: string): TransactionMatchResult => ({
      candidates_considered: 0,
      search_window_start: startTs,
      search_window_end: endTs,
      ledger_available: available,
      ledger_error: error,
      candidates: [],
      best_candidate: undefined,
      runner_up_candidate: undefined,
      ambiguous: false,
      weights_version: MATCHING_WEIGHTS_VERSION
    });

    // Resolve the reporter's wallet; a phone number is enough.
    let reporterWallet = context.reporterWallet;
    let ledgerTxns: Transaction[] = [];

    try {
      if (!reporterWallet && context.reporterPhone) {
        const wallet = await repository.getWalletByPhone(context.reporterPhone);
        reporterWallet = wallet?.wallet_id;
      }

      // A quoted transaction reference is checked directly — it is the strongest
      // discriminator and may point outside the time window.
      const referencedTxn = claim.transaction_reference
        ? await repository.getTransactionById(claim.transaction_reference)
        : null;

      if (reporterWallet) {
        ledgerTxns = await repository.getWalletTransactionsInWindow(
          reporterWallet,
          startTs,
          endTs,
          thresholds.MAX_CANDIDATES
        );
      }

      if (referencedTxn && !ledgerTxns.some(t => t.txn_id === referencedTxn.txn_id)) {
        ledgerTxns = [referencedTxn, ...ledgerTxns];
      }
    } catch (err: any) {
      // Transaction service unavailable: report it, never substitute fabricated data.
      console.error('[transaction-matcher] ledger lookup failed:', err?.message);
      return emptyResult(false, err?.message || 'Transaction ledger query failed');
    }

    if (!reporterWallet) {
      return emptyResult(true, 'Reporter wallet could not be resolved from the complaint or request context');
    }

    const candidates = ledgerTxns
      .map(txn => this.scoreCandidate(claim, txn, reporterWallet!))
      .sort((a, b) => b.match_score - a.match_score);

    const thresholded = candidates.filter(c => c.match_score >= thresholds.WEAK_MATCH);
    const best = candidates[0];
    const runnerUp = candidates[1];

    const ambiguous = Boolean(
      best &&
      runnerUp &&
      best.match_score >= thresholds.STRONG_MATCH &&
      runnerUp.match_score >= thresholds.STRONG_MATCH &&
      best.match_score - runnerUp.match_score <= thresholds.AMBIGUITY_MARGIN
    );

    return {
      candidates_considered: ledgerTxns.length,
      search_window_start: startTs,
      search_window_end: endTs,
      ledger_available: true,
      candidates: thresholded.length > 0 ? thresholded : candidates.slice(0, 5),
      best_candidate: best && best.match_score >= thresholds.WEAK_MATCH ? best : undefined,
      runner_up_candidate: runnerUp && runnerUp.match_score >= thresholds.WEAK_MATCH ? runnerUp : undefined,
      ambiguous,
      weights_version: MATCHING_WEIGHTS_VERSION
    };
  }

  /** Public so unit tests can score a candidate without touching the database. */
  scoreCandidate(claim: IncidentClaim, txn: Transaction, reporterWallet: string): TransactionMatchCandidate {
    const weights = getMatchingWeights();
    const signals: MatchSignalResult[] = [];
    const contradicting: string[] = [];
    const reasonCodes: string[] = [];

    // ─── 1. Reference match (near-dispositive) ──────────────────────────────
    if (claim.transaction_reference) {
      const hit = claim.transaction_reference.toUpperCase() === txn.txn_id.toUpperCase();
      signals.push({
        signal: 'REFERENCE_MATCH',
        weight: weights.REFERENCE_MATCH,
        strength: hit ? 1 : 0,
        evaluable: true,
        explanation: hit
          ? `Customer-supplied reference ${claim.transaction_reference} is this transaction.`
          : `Customer-supplied reference ${claim.transaction_reference} does not match ${txn.txn_id}.`
      });
      if (hit) reasonCodes.push('REFERENCE_MATCH');
      else contradicting.push('REFERENCE_MATCH');
    }

    // ─── 2. Amount match (graded tolerance) ─────────────────────────────────
    const amountResult = this.scoreAmount(claim, txn);
    if (amountResult) {
      signals.push({ ...amountResult, weight: weights.AMOUNT_MATCH });
      if (amountResult.strength >= 0.9) reasonCodes.push('AMOUNT_MATCH');
      else if (amountResult.strength > 0) reasonCodes.push('AMOUNT_APPROXIMATE_MATCH');
      else contradicting.push('AMOUNT_MATCH');
    }

    // ─── 3. Counterparty match ──────────────────────────────────────────────
    const counterpartyResult = this.scoreCounterparty(claim, txn, reporterWallet);
    if (counterpartyResult) {
      signals.push({ ...counterpartyResult, weight: weights.COUNTERPARTY_MATCH });
      if (counterpartyResult.strength >= 0.9) reasonCodes.push('COUNTERPARTY_MATCH');
      else if (counterpartyResult.strength === 0) contradicting.push('COUNTERPARTY_MATCH');
    }

    // ─── 4. Time match (graded, honours alternate windows) ──────────────────
    const timeResult = this.scoreTime(claim, txn);
    if (timeResult) {
      signals.push({ ...timeResult, weight: weights.TIME_MATCH });
      if (timeResult.strength >= 0.9) reasonCodes.push('TIME_MATCH');
      else if (timeResult.strength === 0) contradicting.push('TIME_MATCH');
    }

    // ─── 5. Transaction type ────────────────────────────────────────────────
    if (claim.transaction_type) {
      const hit = claim.transaction_type === txn.type;
      // Treat the P2P/cash family loosely: customers routinely say "sent money"
      // for an agent cash-out, so a family match scores partially rather than 0.
      const familyHit =
        !hit &&
        ((claim.transaction_type === 'P2P_SEND' && CASH_LIKE_TYPES.has(txn.type)) ||
          (CASH_LIKE_TYPES.has(claim.transaction_type) && txn.type === 'P2P_SEND'));
      signals.push({
        signal: 'TYPE_MATCH',
        weight: weights.TYPE_MATCH,
        strength: hit ? 1 : familyHit ? 0.5 : 0,
        evaluable: true,
        explanation: hit
          ? `Ledger type ${txn.type} matches the described action.`
          : familyHit
            ? `Ledger type ${txn.type} is in the same family as the described ${claim.transaction_type}.`
            : `Ledger type ${txn.type} differs from the described ${claim.transaction_type}.`
      });
      if (hit) reasonCodes.push('TYPE_MATCH');
    }

    // ─── 6. Status consistency ──────────────────────────────────────────────
    if (claim.claimed_status && claim.claimed_status !== 'unknown') {
      const ledgerCompleted = txn.status === 'SUCCESS';
      let strength = 0.5;
      let explanation = `Ledger status ${txn.status} is neither confirmed nor contradicted by the claim.`;

      if (claim.claimed_status === 'completed') {
        strength = ledgerCompleted ? 1 : 0;
        explanation = ledgerCompleted
          ? 'Customer says funds left the wallet; ledger shows a successful transaction.'
          : `Customer says funds left the wallet; ledger shows status ${txn.status}.`;
      } else if (claim.claimed_status === 'failed') {
        strength = ledgerCompleted ? 0 : 1;
        explanation = ledgerCompleted
          ? 'Customer says the payment failed; ledger shows it succeeded.'
          : `Customer says the payment failed; ledger status ${txn.status} is consistent.`;
      } else if (claim.claimed_status === 'not_initiated') {
        // A denial is not a mismatch for MATCHING purposes: the transaction the
        // customer disputes is precisely the one that exists. The contradiction is
        // recorded as an evidence CONFLICT downstream, not as a scoring penalty.
        strength = ledgerCompleted ? 1 : 0.5;
        explanation = ledgerCompleted
          ? 'Customer denies initiating a transaction; a completed transaction exists for this account.'
          : `Customer denies initiating a transaction; ledger status is ${txn.status}.`;
      }

      signals.push({
        signal: 'STATUS_CONSISTENCY',
        weight: weights.STATUS_CONSISTENCY,
        strength,
        evaluable: true,
        explanation
      });
      if (ledgerCompleted) reasonCodes.push('COMPLETED_TRANSACTION');
      else reasonCodes.push('FAILED_TRANSACTION');
      if (strength === 0) contradicting.push('STATUS_CONSISTENCY');
    }

    // ─── 7. Soft context: direction of funds vs the kind of complaint ────────
    const contextResult = this.scoreContext(claim, txn, reporterWallet);
    if (contextResult) {
      signals.push({ ...contextResult, weight: weights.CONTEXT_MATCH });
    }

    // Normalise over evaluable signals only.
    const evaluable = signals.filter(s => s.evaluable);
    const weightSum = evaluable.reduce((acc, s) => acc + s.weight, 0);
    const score = weightSum > 0
      ? evaluable.reduce((acc, s) => acc + s.weight * s.strength, 0) / weightSum
      : 0;

    return {
      txn_id: txn.txn_id,
      ts: txn.ts,
      sender_wallet: txn.sender_wallet,
      receiver_wallet: txn.receiver_wallet,
      type: txn.type,
      amount_bdt: txn.amount_bdt,
      status: txn.status,
      channel: txn.channel,
      match_score: Number(score.toFixed(4)),
      signals,
      contradicting_signals: contradicting,
      reason_codes: Array.from(new Set(reasonCodes))
    };
  }

  // ─── Signal scorers ───────────────────────────────────────────────────────
  private scoreAmount(claim: IncidentClaim, txn: Transaction): Omit<MatchSignalResult, 'weight'> | null {
    if (claim.candidate_amounts_bdt.length === 0) return null;
    const tol = getAmountTolerance();

    let best = { strength: 0, claimed: claim.candidate_amounts_bdt[0] };
    for (const claimed of claim.candidate_amounts_bdt) {
      const diff = Math.abs(txn.amount_bdt - claimed);
      const exactBand = Math.max(tol.EXACT_ABSOLUTE_BDT, claimed * tol.EXACT_RELATIVE);
      const nearBand = claimed * tol.NEAR_RELATIVE;

      let strength = 0;
      if (diff <= exactBand) strength = 1;
      else if (diff <= nearBand) strength = tol.NEAR_STRENGTH;

      if (strength > best.strength) best = { strength, claimed };
    }

    const pct = ((Math.abs(txn.amount_bdt - best.claimed) / Math.max(1, best.claimed)) * 100).toFixed(1);
    return {
      signal: 'AMOUNT_MATCH',
      strength: best.strength,
      evaluable: true,
      explanation: best.strength === 1
        ? `Ledger amount BDT ${txn.amount_bdt.toLocaleString()} equals the claimed BDT ${best.claimed.toLocaleString()}.`
        : best.strength > 0
          ? `Ledger amount BDT ${txn.amount_bdt.toLocaleString()} is within rounding tolerance of the claimed BDT ${best.claimed.toLocaleString()} (${pct}% apart).`
          : `Ledger amount BDT ${txn.amount_bdt.toLocaleString()} does not match any claimed amount (closest: BDT ${best.claimed.toLocaleString()}).`
    };
  }

  private scoreCounterparty(
    claim: IncidentClaim,
    txn: Transaction,
    reporterWallet: string
  ): Omit<MatchSignalResult, 'weight'> | null {
    const counterpartyOnLedger = txn.sender_wallet === reporterWallet ? txn.receiver_wallet : txn.sender_wallet;
    const claimed: Array<{ kind: string; value: string }> = [];
    if (claim.counterparty_wallet) claimed.push({ kind: 'wallet', value: claim.counterparty_wallet });
    if (claim.merchant_id) claimed.push({ kind: 'merchant', value: claim.merchant_id });
    if (claim.agent_id) claimed.push({ kind: 'agent', value: claim.agent_id });
    if (claim.counterparty_phone) claimed.push({ kind: 'phone', value: claim.counterparty_phone });

    if (claimed.length === 0) return null;

    for (const c of claimed) {
      if (c.kind === 'phone') {
        // The ledger stores wallet ids, not phone numbers. A phone-only claim is
        // matched on the trailing digits that wallet ids are derived from; a
        // non-match here is weak evidence, so it scores neutral rather than zero.
        const digits = c.value.replace(/[^\d]/g, '');
        const tail = digits.slice(-6);
        if (tail && counterpartyOnLedger.includes(tail)) {
          return {
            signal: 'COUNTERPARTY_MATCH',
            strength: 1,
            evaluable: true,
            explanation: `Counterparty ${counterpartyOnLedger} corresponds to the reported number ${c.value}.`
          };
        }
        continue;
      }
      if (counterpartyOnLedger.toUpperCase() === c.value.toUpperCase()) {
        return {
          signal: 'COUNTERPARTY_MATCH',
          strength: 1,
          evaluable: true,
          explanation: `Ledger counterparty ${counterpartyOnLedger} equals the reported ${c.kind} ${c.value}.`
        };
      }
    }

    const hasStrongIdentifier = claimed.some(c => c.kind !== 'phone');
    return {
      signal: 'COUNTERPARTY_MATCH',
      strength: 0,
      evaluable: hasStrongIdentifier,
      explanation: hasStrongIdentifier
        ? `Ledger counterparty ${counterpartyOnLedger} does not match any identifier named in the complaint.`
        : `Complaint named only a phone number, which cannot be resolved against this ledger entry.`
    };
  }

  private scoreTime(claim: IncidentClaim, txn: Transaction): Omit<MatchSignalResult, 'weight'> | null {
    const windows: Array<{ window: ClaimTimeWindow; isAlternate: boolean }> = [];
    if (claim.time_window) windows.push({ window: claim.time_window, isAlternate: false });
    for (const alt of claim.alternate_time_windows) windows.push({ window: alt, isAlternate: true });
    if (windows.length === 0) return null;

    const tol = getTimeTolerance();
    const txnMs = new Date(txn.ts).getTime();
    let best = { strength: 0, window: windows[0].window, isAlternate: windows[0].isAlternate, distanceMin: Infinity };

    for (const { window, isAlternate } of windows) {
      const startMs = new Date(window.start_ts).getTime();
      const endMs = new Date(window.end_ts).getTime();
      const distanceMs = txnMs < startMs ? startMs - txnMs : txnMs > endMs ? txnMs - endMs : 0;
      const distanceMin = distanceMs / 60_000;

      let strength: number;
      if (distanceMin === 0) {
        strength = 1;
      } else if (distanceMin <= tol.DECAY_TAIL_MINUTES) {
        // Linear decay across the tail: just-outside is still partial evidence.
        strength = Math.max(0, 1 - distanceMin / tol.DECAY_TAIL_MINUTES);
      } else {
        strength = 0;
      }

      if (isAlternate) strength *= tol.ALTERNATE_WINDOW_STRENGTH;
      if (strength > best.strength || (strength === best.strength && distanceMin < best.distanceMin)) {
        best = { strength, window, isAlternate, distanceMin };
      }
    }

    const txnLocal = new Date(txn.ts).toISOString();
    return {
      signal: 'TIME_MATCH',
      strength: Number(best.strength.toFixed(3)),
      evaluable: true,
      explanation: best.strength >= 0.9 && !best.isAlternate
        ? `Transaction at ${txnLocal} falls inside the claimed window (${best.window.precision.toLowerCase()}, from "${best.window.evidence_span}").`
        : best.strength > 0 && best.isAlternate
          ? `Transaction at ${txnLocal} matches only the alternate reading of "${best.window.evidence_span}" (am/pm ambiguity), scored at reduced strength.`
          : best.strength > 0
            ? `Transaction at ${txnLocal} is ${Math.round(best.distanceMin)} minutes outside the claimed window, scored by decay.`
            : `Transaction at ${txnLocal} is outside the claimed window and its decay tail.`
    };
  }

  private scoreContext(
    claim: IncidentClaim,
    txn: Transaction,
    reporterWallet: string
  ): Omit<MatchSignalResult, 'weight'> | null {
    const isOutbound = txn.sender_wallet === reporterWallet;

    // Claims about money leaving the wallet should match outbound ledger entries;
    // "funds not received" should match inbound ones.
    const expectsOutbound = [
      'wrong_transfer',
      'unauthorized_transaction',
      'duplicate_payment',
      'payment_failed',
      'refund_request',
      'phishing_or_social_engineering'
    ].includes(claim.claim_type);
    const expectsInbound = claim.claim_type === 'funds_not_received' || claim.claim_type === 'merchant_settlement_delay';

    if (!expectsOutbound && !expectsInbound) return null;

    const aligned = expectsOutbound ? isOutbound : !isOutbound;
    return {
      signal: 'CONTEXT_MATCH',
      strength: aligned ? 1 : 0,
      evaluable: true,
      explanation: aligned
        ? `Fund direction (${isOutbound ? 'outbound' : 'inbound'}) is consistent with a ${claim.claim_type.replace(/_/g, ' ')} report.`
        : `Fund direction (${isOutbound ? 'outbound' : 'inbound'}) is inconsistent with a ${claim.claim_type.replace(/_/g, ' ')} report.`
    };
  }

  private buildSearchWindow(
    claim: IncidentClaim,
    reportedAtMs: number,
    defaultLookbackHours: number
  ): { startTs: string; endTs: string } {
    const lookbackMs = defaultLookbackHours * 3_600_000;
    let startMs = reportedAtMs - lookbackMs;
    // Allow a small forward margin so clock skew between the ledger and the
    // report time cannot hide the very transaction being disputed.
    let endMs = reportedAtMs + 15 * 60_000;

    const allWindows = [claim.time_window, ...claim.alternate_time_windows].filter(Boolean) as ClaimTimeWindow[];
    for (const w of allWindows) {
      const ws = new Date(w.start_ts).getTime();
      const we = new Date(w.end_ts).getTime();
      if (Number.isFinite(ws)) startMs = Math.min(startMs, ws - 2 * 3_600_000);
      if (Number.isFinite(we)) endMs = Math.max(endMs, we + 2 * 3_600_000);
    }

    return { startTs: new Date(startMs).toISOString(), endTs: new Date(endMs).toISOString() };
  }
}

export const transactionMatcher = new TransactionMatcher();
