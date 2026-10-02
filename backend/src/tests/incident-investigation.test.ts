import { describe, it, expect, beforeAll } from 'vitest';
import { claimExtractor } from '../services/investigation/claim-extractor.js';
import { transactionMatcher } from '../services/investigation/transaction-matcher.js';
import { responseSafetyValidator } from '../services/investigation/response-safety-validator.js';
import { safeResponseBuilder } from '../services/investigation/safe-response-builder.js';
import { incidentInvestigationService } from '../services/investigation/incident-investigation-service.js';
import { copilotService } from '../services/copilot-service.js';
import { repository } from '../db/repository.js';
import {
  seedInvestigationEvidenceLedger,
  LedgerScenario
} from '../generator/investigation-evidence-ledger.js';
import {
  getMatchingWeights,
  getMatchingThresholds,
  configureMatchingWeights,
  resetMatchingWeights,
  INVESTIGATION_REASON_CODES
} from '../core/constants/investigation-policy.js';
import { Transaction, IncidentClaim } from '../core/types.js';

/**
 * Evidence-Driven Scam Incident Investigation — unit, integration and scenario suite.
 *
 * Scenario tests run against the real Neon database, the real risk engine, the real
 * ring/community-report stores and the real campaign service. Nothing on the critical
 * path is stubbed.
 */

let scenarios: LedgerScenario[] = [];
const scenario = (id: string): LedgerScenario => {
  const found = scenarios.find(s => s.id === id);
  if (!found) throw new Error(`Scenario ${id} missing from ledger seed`);
  return found;
};

beforeAll(async () => {
  const seeded = await seedInvestigationEvidenceLedger();
  scenarios = seeded.scenarios;
}, 60_000);

// ════════════════════════════════════════════════════════════════════════════
// 1. CLAIM EXTRACTION
// ════════════════════════════════════════════════════════════════════════════
describe('Claim Extraction', () => {
  it('extracts amount, intent and time from Banglish: "vai amar 5k taka vul number e chole gese ajke 2tar dike"', () => {
    const claim = claimExtractor.extract(
      'vai amar 5k taka vul number e chole gese ajke 2tar dike',
      { reportedAt: '2026-10-02T12:00:00.000Z' }
    );

    expect(claim.amount_bdt).toBe(5000);
    expect(claim.claim_type).toBe('wrong_transfer');
    expect(claim.language).toBe('banglish');
    expect(claim.time_window).toBeDefined();
    // "2tar dike" with no daypart resolves to 14:00 Dhaka = 08:00 UTC.
    expect(new Date(claim.time_window!.start_ts).getUTCHours()).toBe(7);
    expect(claim.time_window!.precision).toBe('APPROXIMATE');
    // The 02:00 reading is retained as a scored alternate rather than discarded.
    expect(claim.alternate_time_windows.length).toBe(1);
    expect(claim.discriminators_present).toContain('amount');
    expect(claim.discriminators_present).toContain('time');
  });

  it('extracts the same structure from Bangla and English phrasings of one incident', () => {
    const bangla = claimExtractor.extract('আমি ভুল নাম্বারে ৫০০০ টাকা পাঠাইছি');
    const banglish = claimExtractor.extract('ami vul number e 5000 taka pathaisi');
    const english = claimExtractor.extract('I sent 5000 taka to the wrong number');

    for (const claim of [bangla, banglish, english]) {
      expect(claim.claim_type).toBe('wrong_transfer');
      expect(claim.amount_bdt).toBe(5000);
      expect(claim.currency).toBe('BDT');
    }
    expect(bangla.language).toBe('bn');
    expect(english.language).toBe('en');
  });

  it('leaves unstated values undefined instead of inventing them', () => {
    const claim = claimExtractor.extract('I lost money yesterday.');

    expect(claim.amount_bdt).toBeUndefined();
    expect(claim.candidate_amounts_bdt).toEqual([]);
    expect(claim.counterparty_wallet).toBeUndefined();
    expect(claim.transaction_reference).toBeUndefined();
    expect(claim.merchant_id).toBeUndefined();
    expect(claim.agent_id).toBeUndefined();
    // "yesterday" is a day anchor only — no fabricated hour.
    expect(claim.time_window?.precision).toBe('DAY');
  });

  it('detects denial of authorisation and distinguishes it from a wrong transfer', () => {
    const denial = claimExtractor.extract('I did not make this transaction of 8000 taka. Someone else used my account.');
    const banglaDenial = claimExtractor.extract('আমি এই লেনদেন করিনি, আমার অনুমতি ছাড়া ৮০০০ টাকা চলে গেছে');
    const mistake = claimExtractor.extract('I sent 8000 taka to the wrong number by mistake');

    expect(denial.claim_type).toBe('unauthorized_transaction');
    expect(denial.denies_authorisation).toBe(true);
    expect(denial.claimed_status).toBe('not_initiated');
    expect(banglaDenial.denies_authorisation).toBe(true);
    expect(mistake.denies_authorisation).toBe(false);
  });

  it('extracts social-engineering indicators from a Bangla fake customer care report', () => {
    const claim = claimExtractor.extract(
      'উপায় কাস্টমার কেয়ার পরিচয়ে ফোন করে বলল অ্যাকাউন্ট বন্ধ হয়ে যাবে, ওটিপি চাইল। এখনই টাকা পাঠাতে বলল।'
    );

    expect(claim.claim_type).toBe('phishing_or_social_engineering');
    expect(claim.credential_request_claimed).toBe(true);
    expect(claim.authority_impersonation_claimed).toBe(true);
    expect(claim.scam_indicators).toContain('ACCOUNT_SUSPENSION_THREAT');
    expect(claim.urgency_indicators.length).toBeGreaterThan(0);
  });

  it('redacts credential digits the customer pasted, and does not read them as an amount', () => {
    const claim = claimExtractor.extract('ওটিপি 445566 আর পিন 1234 দিয়ে দিয়েছি, ৳8,000 চলে গেছে W-SYN-091177 এ।');

    expect(claim.credential_digits_redacted).toBe(true);
    // The disclosed OTP/PIN must not survive anywhere in the stored claim.
    expect(claim.raw_complaint).not.toContain('445566');
    expect(claim.raw_complaint).not.toContain('1234');
    expect(claim.sanitized_complaint).not.toContain('445566');
    // The real amount is still extracted, and the OTP digits are not mistaken for one.
    expect(claim.candidate_amounts_bdt).toContain(8000);
    expect(claim.candidate_amounts_bdt).not.toContain(445566);
    // The social-engineering signal survives redaction.
    expect(claim.credential_request_claimed).toBe(true);
  });

  it('resolves relative times without fabricating a clock reading', () => {
    const claim = claimExtractor.extract('15 minutes ago I sent 3000 taka', {
      reportedAt: '2026-10-02T10:00:00.000Z'
    });

    expect(claim.time_window?.precision).toBe('RELATIVE');
    const start = new Date(claim.time_window!.start_ts).getTime();
    const end = new Date(claim.time_window!.end_ts).getTime();
    const target = new Date('2026-10-02T09:45:00.000Z').getTime();
    expect(start).toBeLessThanOrEqual(target);
    expect(end).toBeGreaterThanOrEqual(target);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. MATCHING SIGNALS & SCORING
// ════════════════════════════════════════════════════════════════════════════
describe('Transaction Matching & Evidence Scoring', () => {
  const baseTxn = (over: Partial<Transaction> = {}): Transaction => ({
    txn_id: 'TXN-UNIT-1',
    ts: '2026-10-02T08:08:00.000Z',
    sender_wallet: 'W-SYN-UNIT01',
    receiver_wallet: 'W-SYN-UNIT02',
    type: 'P2P_SEND',
    amount_bdt: 5000,
    channel: 'APP' as any,
    device_id: 'D-UNIT',
    geo_cell: 'GEO-DH-01',
    fee_bdt: 0,
    status: 'SUCCESS' as any,
    label_fraud: false,
    created_at: '2026-10-02T08:08:00.000Z',
    ...over
  });

  const claimFor = (text: string, reportedAt = '2026-10-02T11:00:00.000Z'): IncidentClaim =>
    claimExtractor.extract(text, { reportedAt, reporterWallet: 'W-SYN-UNIT01' });

  it('selects the amount-matching transaction over near-miss candidates (spec worked example)', () => {
    const claim = claimFor('I sent 5000 taka around 2 PM to the wrong number');
    const candidates = [
      baseTxn({ txn_id: 'TXN-001', amount_bdt: 500, ts: '2026-10-02T07:50:00.000Z' }),
      baseTxn({ txn_id: 'TXN-002', amount_bdt: 5000, ts: '2026-10-02T08:08:00.000Z' }),
      baseTxn({ txn_id: 'TXN-003', amount_bdt: 2000, ts: '2026-10-02T10:30:00.000Z' })
    ].map(t => transactionMatcher.scoreCandidate(claim, t, 'W-SYN-UNIT01'));

    candidates.sort((a, b) => b.match_score - a.match_score);
    expect(candidates[0].txn_id).toBe('TXN-002');
    expect(candidates[0].match_score).toBeGreaterThan(candidates[1].match_score);
    expect(candidates[0].reason_codes).toContain('AMOUNT_MATCH');
    expect(candidates[0].reason_codes).toContain('TIME_MATCH');
  });

  it('scores amount within the rounding band as a partial, not exact, match', () => {
    const claim = claimFor('I sent 5000 taka');
    const exact = transactionMatcher.scoreCandidate(claim, baseTxn({ amount_bdt: 5000 }), 'W-SYN-UNIT01');
    const rounded = transactionMatcher.scoreCandidate(claim, baseTxn({ amount_bdt: 4700 }), 'W-SYN-UNIT01');
    const wrong = transactionMatcher.scoreCandidate(claim, baseTxn({ amount_bdt: 500 }), 'W-SYN-UNIT01');

    const strength = (c: typeof exact) => c.signals.find(s => s.signal === 'AMOUNT_MATCH')!.strength;
    expect(strength(exact)).toBe(1);
    expect(strength(rounded)).toBeGreaterThan(0);
    expect(strength(rounded)).toBeLessThan(1);
    expect(strength(wrong)).toBe(0);
    expect(wrong.contradicting_signals).toContain('AMOUNT_MATCH');
  });

  it('decays the time signal with distance and does not evaluate it when no time was claimed', () => {
    const timed = claimFor('I sent 5000 taka around 2 PM');
    const inside = transactionMatcher.scoreCandidate(timed, baseTxn({ ts: '2026-10-02T08:08:00.000Z' }), 'W-SYN-UNIT01');
    const justOutside = transactionMatcher.scoreCandidate(timed, baseTxn({ ts: '2026-10-02T09:30:00.000Z' }), 'W-SYN-UNIT01');
    const farOutside = transactionMatcher.scoreCandidate(timed, baseTxn({ ts: '2026-10-01T23:00:00.000Z' }), 'W-SYN-UNIT01');

    const strength = (c: typeof inside) => c.signals.find(s => s.signal === 'TIME_MATCH')!.strength;
    expect(strength(inside)).toBe(1);
    expect(strength(justOutside)).toBeGreaterThan(0);
    expect(strength(justOutside)).toBeLessThan(1);
    expect(strength(farOutside)).toBe(0);

    const untimed = claimFor('I sent 5000 taka to the wrong number');
    const noTime = transactionMatcher.scoreCandidate(untimed, baseTxn(), 'W-SYN-UNIT01');
    expect(noTime.signals.find(s => s.signal === 'TIME_MATCH')).toBeUndefined();
  });

  it('normalises the score over evaluable signals only, so omissions are not penalised', () => {
    const minimal = claimFor('I sent 5000 taka');
    const scored = transactionMatcher.scoreCandidate(minimal, baseTxn(), 'W-SYN-UNIT01');

    // No counterparty or reference was named, so those signals must not be scored.
    expect(scored.signals.find(s => s.signal === 'COUNTERPARTY_MATCH')).toBeUndefined();
    expect(scored.signals.find(s => s.signal === 'REFERENCE_MATCH')).toBeUndefined();
    // Everything that WAS evaluable matched, so the normalised score is full marks.
    expect(scored.match_score).toBe(1);
  });

  it('treats a quoted transaction reference as the strongest single signal', () => {
    const weights = getMatchingWeights();
    expect(weights.REFERENCE_MATCH).toBeGreaterThan(weights.AMOUNT_MATCH);
    expect(weights.AMOUNT_MATCH).toBeGreaterThan(weights.TYPE_MATCH);
    expect(weights.COUNTERPARTY_MATCH).toBeGreaterThan(weights.STATUS_CONSISTENCY);
    expect(weights.TIME_MATCH).toBeGreaterThan(weights.CONTEXT_MATCH);

    const claim = claimFor('My transaction TXN-UNIT-1 for 5000 taka went to the wrong number');
    const hit = transactionMatcher.scoreCandidate(claim, baseTxn({ txn_id: 'TXN-UNIT-1' }), 'W-SYN-UNIT01');
    const miss = transactionMatcher.scoreCandidate(claim, baseTxn({ txn_id: 'TXN-OTHER' }), 'W-SYN-UNIT01');

    expect(hit.reason_codes).toContain('REFERENCE_MATCH');
    expect(miss.contradicting_signals).toContain('REFERENCE_MATCH');
    expect(hit.match_score).toBeGreaterThan(miss.match_score);
  });

  it('matches the counterparty named in the complaint against the ledger counterparty', () => {
    const claim = claimFor('I sent 5000 taka to W-SYN-UNIT02 by mistake');
    const right = transactionMatcher.scoreCandidate(claim, baseTxn(), 'W-SYN-UNIT01');
    const wrong = transactionMatcher.scoreCandidate(claim, baseTxn({ receiver_wallet: 'W-SYN-UNIT09' }), 'W-SYN-UNIT01');

    expect(right.reason_codes).toContain('COUNTERPARTY_MATCH');
    expect(wrong.contradicting_signals).toContain('COUNTERPARTY_MATCH');
  });

  it('exposes weights as configurable and replaceable without touching the matcher', () => {
    const claim = claimFor('I sent 5000 taka');
    const before = transactionMatcher.scoreCandidate(claim, baseTxn({ amount_bdt: 4700 }), 'W-SYN-UNIT01');

    try {
      configureMatchingWeights({ amountTolerance: { NEAR_STRENGTH: 0.95 } });
      const after = transactionMatcher.scoreCandidate(claim, baseTxn({ amount_bdt: 4700 }), 'W-SYN-UNIT01');
      expect(after.match_score).toBeGreaterThan(before.match_score);
    } finally {
      resetMatchingWeights();
    }

    const restored = transactionMatcher.scoreCandidate(claim, baseTxn({ amount_bdt: 4700 }), 'W-SYN-UNIT01');
    expect(restored.match_score).toBeCloseTo(before.match_score, 6);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. REASON CODES
// ════════════════════════════════════════════════════════════════════════════
describe('Investigation Reason Codes', () => {
  it('defines every code the pipeline emits, with bilingual labels', () => {
    const required = [
      'AMOUNT_MATCH', 'TIME_MATCH', 'TYPE_MATCH', 'COUNTERPARTY_MATCH', 'REFERENCE_MATCH',
      'COMPLETED_TRANSACTION', 'NEW_COUNTERPARTY', 'HIGH_RISK_COUNTERPARTY',
      'KNOWN_SCAM_RECIPIENT', 'CAMPAIGN_MATCH', 'GRAPH_CLUSTER_MATCH', 'BEHAVIOR_ANOMALY',
      'EVIDENCE_CONFLICT', 'INSUFFICIENT_TRANSACTION_DATA'
    ];
    for (const code of required) {
      const def = INVESTIGATION_REASON_CODES[code];
      expect(def, `missing reason code ${code}`).toBeDefined();
      expect(def.label_en.length).toBeGreaterThan(0);
      expect(def.label_bn.length).toBeGreaterThan(0);
      expect(def.description!.length).toBeGreaterThan(0);
    }
  });

  it('keeps the conflict code free of any claim that the customer is dishonest', () => {
    const def = INVESTIGATION_REASON_CODES['EVIDENCE_CONFLICT'];
    expect(def.description).toMatch(/not a finding of customer dishonesty/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. RESPONSE SAFETY VALIDATION
// ════════════════════════════════════════════════════════════════════════════
describe('Response Safety Validator', () => {
  it('rejects credential requests in English, Bangla and Banglish', () => {
    const unsafe = [
      'Please share your OTP so we can verify the transaction.',
      'Reply with your PIN to confirm your identity.',
      'Send us your password and full card number.',
      'অনুগ্রহ করে আপনার ওটিপি দিন যাতে আমরা যাচাই করতে পারি।',
      'আপনার পিন নম্বর বলুন।',
      'apnar otp ta den'
    ];
    for (const text of unsafe) {
      const report = responseSafetyValidator.validate([text]);
      expect(report.passed, `should have been rejected: ${text}`).toBe(false);
      expect(report.violations.some(v => v.code.startsWith('CREDENTIAL_REQUEST'))).toBe(true);
    }
  });

  it('allows a PIN/OTP WARNING, which a naive keyword block would wrongly reject', () => {
    const safe = [
      'upay staff will never ask you for your PIN, OTP or password. Never share them with anyone.',
      'উপায়ের কোনো কর্মী কখনো আপনার পিন, ওটিপি বা পাসওয়ার্ড চাইবে না। এগুলো কাউকে কখনো শেয়ার করবেন না।',
      'If anyone asks for your OTP, it is a scam.'
    ];
    for (const text of safe) {
      const report = responseSafetyValidator.validate([text]);
      expect(report.passed, `should have passed: ${text} -> ${JSON.stringify(report.violations)}`).toBe(true);
    }
  });

  it('rejects unauthorised refund, reversal and unblock promises', () => {
    const cases: Array<[string, string]> = [
      ['Your money will be returned within 24 hours.', 'UNAUTHORIZED_REFUND_PROMISE'],
      ['We will refund the full amount immediately.', 'UNAUTHORIZED_REFUND_PROMISE'],
      ['আপনার টাকা ফেরত পাবেন।', 'UNAUTHORIZED_REFUND_PROMISE'],
      ['We have reversed the transaction for you.', 'UNAUTHORIZED_REVERSAL_PROMISE'],
      ['Your account will be unblocked shortly.', 'UNAUTHORIZED_UNBLOCK_PROMISE']
    ];
    for (const [text, code] of cases) {
      const report = responseSafetyValidator.validate([text]);
      expect(report.passed, `should have been rejected: ${text}`).toBe(false);
      expect(report.violations.some(v => v.code === code), `expected ${code} for: ${text}`).toBe(true);
    }
  });

  it('permits hedged, non-committal wording about recovery', () => {
    const report = responseSafetyValidator.validate([
      'We cannot guarantee a refund; whether funds can be recovered depends on what the review finds.'
    ]);
    expect(report.passed).toBe(true);
  });

  it('rejects directing the customer to an unverified third party but allows official channels', () => {
    const unsafe = responseSafetyValidator.validate(['Please call 01799-112233 to resolve this quickly.']);
    expect(unsafe.passed).toBe(false);
    expect(unsafe.violations.some(v => v.code === 'THIRD_PARTY_CONTACT')).toBe(true);

    const link = responseSafetyValidator.validate(['Click https://upay-verify.example.net to claim your refund']);
    expect(link.passed).toBe(false);

    const official = responseSafetyValidator.validate([
      'If you need to reach us, use the upay app or the official helpline 16268 only.'
    ]);
    expect(official.passed).toBe(true);
  });

  it('rejects over-claimed AI certainty about fraud', () => {
    const overclaim = responseSafetyValidator.validate(['Our AI knows this is fraud.']);
    expect(overclaim.passed).toBe(false);
    expect(overclaim.violations.some(v => v.code === 'OVERCLAIMED_AI_CERTAINTY')).toBe(true);

    const measured = responseSafetyValidator.validate([
      'Available evidence is consistent with the incident you reported and the case is under review.'
    ]);
    expect(measured.passed).toBe(true);
  });

  it('substitutes a vetted template when a draft would be unsafe, and the result always passes', () => {
    const claim = claimExtractor.extract('I sent 5000 taka to the wrong number');
    const response = safeResponseBuilder.build({
      claim,
      evidence: {
        verdict: 'INSUFFICIENT_DATA',
        verdict_confidence: 0.8,
        relevant_transaction_id: null,
        match_confidence: null,
        supporting_evidence: [],
        conflicting_evidence: [],
        contextual_evidence: [],
        missing_evidence: [],
        conflicts: [],
        reasoning_chain: [],
        reasoning: 'test',
        reasoning_bn: 'test',
        source_status: []
      },
      classification: {
        case_type: 'wrong_transfer',
        case_type_confidence: 0.8,
        complaint_category: 'wrong_transfer',
        fraud_risk: null,
        evidence_verdict: 'INSUFFICIENT_DATA',
        routing_department: 'DISPUTE_RESOLUTION',
        routing_reason: 'test',
        priority: 'P3',
        is_golden_hour: false,
        golden_hour_remaining_mins: 0
      },
      humanReview: {
        required: false,
        triggers: [],
        four_eyes_required: false,
        escalation_level: 'NONE',
        policy_version: 'test'
      }
    });

    expect(response.safety_report.passed).toBe(true);
    const recheck = responseSafetyValidator.validate([
      response.headline_en, response.headline_bn, response.body_en, response.body_bn,
      ...response.next_steps_en, ...response.next_steps_bn
    ]);
    expect(recheck.passed).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. SCENARIO TESTS (end-to-end against real services and the real database)
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 1 — Consistent wrong transfer', () => {
  it('identifies the BDT 5,000 transfer over the BDT 500 and BDT 2,000 candidates', async () => {
    const sc = scenario('INV_SCENARIO_B_WRONG_TRANSFER');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'vai amar 5k taka vul number e chole gese ajke 2tar dike',
      reporter_wallet: sc.reporter_wallet,
      reported_at: sc.suggested_reported_at,
      persist: false
    });

    expect(inv.claim.amount_bdt).toBe(5000);
    expect(inv.evidence.verdict).toBe('CONSISTENT');
    expect(inv.evidence.relevant_transaction_id).toBe(sc.expected_txn_id);
    expect(inv.transaction_match.candidates_considered).toBeGreaterThanOrEqual(3);
    expect(inv.reason_codes.map(r => r.code)).toContain('AMOUNT_MATCH');
    expect(inv.reason_codes.map(r => r.code)).toContain('TIME_MATCH');
    expect(inv.customer_response.safety_report.passed).toBe(true);
  }, 60_000);
});

describe('Scenario 2 — Inconsistent amount', () => {
  it('returns INCONSISTENT without alleging dishonesty when no matching amount exists', async () => {
    const sc = scenario('INV_SCENARIO_C_INCONSISTENT');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'I sent 5000 taka by mistake earlier today, please check.',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.claim.amount_bdt).toBe(5000);
    expect(inv.evidence.verdict).toBe('INCONSISTENT');
    expect(inv.evidence.relevant_transaction_id).toBeNull();
    expect(inv.transaction_match.candidates_considered).toBeGreaterThan(0);
    // The explanation must state the limitation, not accuse the customer.
    expect(inv.evidence.reasoning).toMatch(/not a determination that the customer is being untruthful/i);
    expect(inv.customer_response.template_id).toBe('ICR-INCONSISTENT');
  }, 60_000);
});

describe('Scenario 3 — Insufficient data', () => {
  it('returns INSUFFICIENT_DATA rather than forcing an answer when nothing is verifiable', async () => {
    const sc = scenario('INV_SCENARIO_E_NO_HISTORY');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'I lost money yesterday.',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.evidence.verdict).toBe('INSUFFICIENT_DATA');
    expect(inv.evidence.relevant_transaction_id).toBeNull();
    expect(inv.claim.discriminators_present).toEqual([]);
    expect(inv.risk_context.available).toBe(false);
    expect(inv.risk_context.fraud_risk).toBeNull();
    expect(inv.evidence.missing_evidence.length).toBeGreaterThan(0);
    expect(inv.human_review.required).toBe(true);
  }, 60_000);
});

describe('Scenario 4 — Suspicious recipient', () => {
  it('reports CONSISTENT, elevated risk, ring linkage and mandatory human review together', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint: `আমি ভুল করে W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, ১২ মিনিট আগে।`,
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.evidence.verdict).toBe('CONSISTENT');
    expect(inv.evidence.relevant_transaction_id).toBe(sc.expected_txn_id);

    // Graph context resolves from the real ring store and community report store.
    expect(inv.graph_context.available).toBe(true);
    expect(inv.graph_context.linked_ring_ids.length).toBeGreaterThan(0);
    expect(inv.graph_context.community_report_count).toBeGreaterThan(0);

    // Risk context comes from the existing risk engine, not a second scorer.
    expect(inv.risk_context.available).toBe(true);
    expect(inv.risk_context.model_version).toBeTruthy();
    expect(['MEDIUM', 'HIGH', 'CRITICAL']).toContain(inv.risk_context.fraud_risk!);

    expect(inv.human_review.required).toBe(true);
    expect(inv.human_review.triggers.map(t => t.rule)).toContain('HR05_SUSPICIOUS_GRAPH_RELATIONSHIPS');
    expect(inv.classification.routing_department).toBe('FRAUD_RISK');

    // Evidence verdict and fraud risk stay separate concepts.
    expect(inv.classification.evidence_verdict).toBe('CONSISTENT');
    expect(inv.classification.fraud_risk).toBe(inv.risk_context.fraud_risk);
  }, 60_000);
});

describe('Scenario 5 — Campaign-linked scam', () => {
  it('links the incident to the existing active campaign with a stated, verifiable basis', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint:
        'উপায় কাস্টমার কেয়ার পরিচয়ে একজন ফোন করে বলল আমার অ্যাকাউন্ট বন্ধ হয়ে যাবে, ওটিপি চাইল। ' +
        'এরপর W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, মাত্র ১২ মিনিট আগে।',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.campaign_context.available).toBe(true);
    expect(inv.campaign_context.matched_campaign_id).toBeTruthy();
    expect(inv.campaign_context.match_basis.length).toBeGreaterThan(0);
    expect(inv.reason_codes.map(r => r.code)).toContain('CAMPAIGN_MATCH');
    expect(inv.human_review.triggers.map(t => t.rule)).toContain('HR04_ACTIVE_CAMPAIGN_INVOLVEMENT');

    // Golden-hour / recovery linkage engages through the existing optimizer.
    expect(inv.classification.is_golden_hour).toBe(true);
    expect(inv.recovery.applicable).toBe(true);
    expect(inv.recovery.golden_hour_eligible).toBe(true);
    expect(inv.recovery.recovery_route_available).toBe(true);
    expect(inv.recovery.recoverability_level).toBeTruthy();
  }, 60_000);
});

describe('Scenario 6 — Evidence conflict', () => {
  it('reports a conflict and withholds a verdict when the customer denies an existing transaction', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'I did not make this transaction of 8000 taka. Someone else used my account.',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.claim.denies_authorisation).toBe(true);
    expect(inv.evidence.conflicts.length).toBeGreaterThan(0);
    const conflict = inv.evidence.conflicts[0];
    expect(conflict.reason_codes).toContain('AUTHORISATION_DENIED_BY_CUSTOMER');
    expect(conflict.severity).toBe('HIGH');

    // Never a finding of customer fraud, and never a confident verdict.
    expect(inv.evidence.verdict).toBe('INSUFFICIENT_DATA');
    expect(inv.evidence.reasoning).not.toMatch(/customer fraud|customer is lying/i);
    expect(inv.human_review.required).toBe(true);
    expect(inv.human_review.triggers.map(t => t.rule)).toContain('HR10_CUSTOMER_DENIES_AUTHORISATION');
    expect(inv.customer_response.template_id).toBe('ICR-INSUFFICIENT-DISPUTED-AUTH');
    expect(inv.customer_response.safety_report.passed).toBe(true);
  }, 60_000);
});

describe('Scenario 7 — Banglish', () => {
  it('maps "vai 5k taka vul number e pathaisi" into the shared structured representation', async () => {
    const claim = claimExtractor.extract('vai 5k taka vul number e pathaisi');
    expect(claim.amount_bdt).toBe(5000);
    expect(claim.claim_type).toBe('wrong_transfer');
    expect(claim.language).toBe('banglish');
  });
});

describe('Scenario 8 — Ambiguous match', () => {
  it('flags ambiguity and escalates instead of silently picking one of two equal candidates', async () => {
    const sc = scenario('INV_SCENARIO_D_AMBIGUOUS');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'I sent 3000 taka and want it back.',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.transaction_match.ambiguous).toBe(true);
    expect(inv.reason_codes.map(r => r.code)).toContain('AMBIGUOUS_TRANSACTION_MATCH');
    expect(inv.human_review.required).toBe(true);
    expect(inv.human_review.triggers.map(t => t.rule)).toContain('HR13_AMBIGUOUS_TRANSACTION_MATCH');
    // Confidence is reduced precisely because the identification is not certain.
    expect(inv.evidence.verdict_confidence).toBeLessThan(0.95);
  }, 60_000);
});

// ════════════════════════════════════════════════════════════════════════════
// 6. TRACEABILITY, TIMELINE, PERSISTENCE & COPILOT INTEGRATION
// ════════════════════════════════════════════════════════════════════════════
describe('Traceability & Integration', () => {
  it('builds a CLAIM -> EVIDENCE -> REASON -> CONCLUSION chain for every conclusion', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'আমি ভুল করে W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, ১২ মিনিট আগে।',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.evidence.reasoning_chain.length).toBeGreaterThan(2);
    const allEvidenceIds = new Set([
      ...inv.evidence.supporting_evidence.map(e => e.evidence_id),
      ...inv.evidence.conflicting_evidence.map(e => e.evidence_id),
      ...inv.evidence.contextual_evidence.map(e => e.evidence_id),
      ...inv.evidence.missing_evidence.map(e => e.evidence_id)
    ]);
    for (const step of inv.evidence.reasoning_chain) {
      expect(step.claim.length).toBeGreaterThan(0);
      expect(step.reason.length).toBeGreaterThan(0);
      expect(step.conclusion.length).toBeGreaterThan(0);
      // Every cited evidence id must resolve to a real evidence item.
      for (const id of step.evidence_ids) {
        expect(allEvidenceIds.has(id), `unresolved evidence id ${id}`).toBe(true);
      }
    }
  }, 60_000);

  it('builds a chronological timeline and never invents a timestamp', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'উপায় কাস্টমার কেয়ার সেজে ওটিপি চেয়ে W-SYN-091177 এ ৳8,000 নিয়েছে, ১২ মিনিট আগে।',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    expect(inv.timeline.length).toBeGreaterThan(3);
    const dated = inv.timeline.filter(e => e.timestamp !== null);
    for (let i = 1; i < dated.length; i++) {
      expect(new Date(dated[i].timestamp!).getTime()).toBeGreaterThanOrEqual(
        new Date(dated[i - 1].timestamp!).getTime()
      );
    }
    for (const event of inv.timeline) {
      expect(event.source).toBeTruthy();
      expect(event.event_type).toBeTruthy();
      expect(event.confidence).toBeGreaterThan(0);
      if (event.timestamp === null) expect(event.timestamp_precision).toBe('UNKNOWN');
    }
    // The ledger-sourced transaction event must be a verified, exact record.
    const txnEvent = inv.timeline.find(e => e.source === 'TRANSACTION_LEDGER');
    expect(txnEvent).toBeDefined();
    expect(txnEvent!.confidence).toBe(1);
    expect(txnEvent!.timestamp_precision).toBe('EXACT');
  }, 60_000);

  it('persists the investigation, exposes it for review, and records the decision in the audit chain', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'আমি ভুল করে W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, ১২ মিনিট আগে।',
      reporter_wallet: sc.reporter_wallet,
      case_id: 'CASE-2026-00417',
      persist: true
    });

    const loaded = await repository.getIncidentInvestigationById(inv.investigation_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.evidence.verdict).toBe(inv.evidence.verdict);
    expect(loaded!.case_id).toBe('CASE-2026-00417');
    expect(loaded!.review_status).toBe(inv.human_review.required ? 'PENDING_REVIEW' : 'NO_REVIEW_REQUIRED');

    const reviewed = await incidentInvestigationService.recordReviewDecision(inv.investigation_id, {
      review_status: 'APPROVED',
      reviewed_by: 'ANALYST-TEST',
      review_notes: 'Evidence chain verified in test.',
      final_decision: 'PROCEED_WITH_RECOVERY'
    });
    expect(reviewed!.review_status).toBe('APPROVED');
    expect(reviewed!.reviewed_by).toBe('ANALYST-TEST');
    expect(reviewed!.reviewed_at).toBeTruthy();

    const listed = await repository.listIncidentInvestigations({ caseId: 'CASE-2026-00417', limit: 5 });
    expect(listed.some(i => i.investigation_id === inv.investigation_id)).toBe(true);
  }, 90_000);

  it('never writes credentials or secrets into the audit payload', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    await incidentInvestigationService.investigate({
      complaint: 'ওটিপি 445566 আর পিন 1234 দিয়ে দিয়েছি, ৳8,000 চলে গেছে W-SYN-091177 এ।',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    const logs = await repository.getAuditLogs(10);
    const entry = logs.find(l => l.action === 'INCIDENT_INVESTIGATION_ANALYZED');
    expect(entry).toBeDefined();
    const payload = entry!.payload_json;
    // The raw complaint (which contains the digits the customer disclosed) is never logged.
    expect(payload).not.toContain('445566');
    expect(payload).not.toContain('1234');
    expect(payload).not.toMatch(/raw_complaint/);
    expect(payload).not.toMatch(/DATABASE_URL|password|secret/i);
    // Decision provenance IS logged.
    expect(payload).toMatch(/evidence_verdict/);
    expect(payload).toMatch(/weights_version/);
  }, 60_000);

  it('extends the existing Investigator Copilot with an evidence-verified brief', async () => {
    const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
    const inv = await incidentInvestigationService.investigate({
      complaint: 'আমি ভুল করে W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, ১২ মিনিট আগে।',
      reporter_wallet: sc.reporter_wallet,
      persist: false
    });

    for (const lang of ['en', 'bn'] as const) {
      const brief = copilotService.generateIncidentInvestigationBrief(inv, lang);
      expect(brief.language).toBe(lang);
      expect(brief.sections.length).toBeGreaterThan(5);
      const titles = brief.sections.map(s => s.title).join(' | ');
      expect(titles).toMatch(/Evidence/i);
      expect(titles).toMatch(/Verdict/i);
      expect(titles).toMatch(/Risk/i);
      expect(titles).toMatch(/Graph/i);
      expect(titles).toMatch(/Campaign/i);
      expect(titles).toMatch(/Human Review/i);
      expect(brief.verified_claims).toBeGreaterThan(0);
      expect(brief.verified_claims).toBeLessThanOrEqual(brief.total_claims);
      // Confidence is carried over from the verdict, never re-invented.
      expect(brief.confidence).toBe(inv.evidence.verdict_confidence);
    }
  }, 60_000);

  it('declares the explanation engine and the policy versions used', async () => {
    const inv = await incidentInvestigationService.investigate({
      complaint: 'I sent 5000 taka to the wrong number',
      reporter_wallet: scenario('INV_SCENARIO_B_WRONG_TRANSFER').reporter_wallet,
      persist: false
    });

    expect(inv.explanation_engine.kind).toBe('DETERMINISTIC_TEMPLATE');
    expect(inv.weights_version).toMatch(/investigation-weights/);
    expect(inv.policy_version).toMatch(/investigation-policy/);
    expect(inv.total_latency_ms).toBeGreaterThan(0);
    expect(Object.keys(inv.latency_breakdown_ms).length).toBeGreaterThan(4);
  }, 60_000);
});

// ════════════════════════════════════════════════════════════════════════════
// 7. GRACEFUL DEGRADATION
// ════════════════════════════════════════════════════════════════════════════
describe('Failure Handling', () => {
  it('reports INSUFFICIENT_DATA and flags the ledger as unavailable when transaction lookup fails', async () => {
    const original = repository.getWalletTransactionsInWindow;
    (repository as any).getWalletTransactionsInWindow = async () => {
      throw new Error('simulated transaction service outage');
    };

    try {
      const inv = await incidentInvestigationService.investigate({
        complaint: 'I sent 5000 taka to the wrong number around 2 PM',
        reporter_wallet: 'W-SYN-001001',
        persist: false
      });

      expect(inv.transaction_match.ledger_available).toBe(false);
      expect(inv.evidence.verdict).toBe('INSUFFICIENT_DATA');
      expect(inv.reason_codes.map(r => r.code)).toContain('LEDGER_UNAVAILABLE');
      // No transaction evidence is fabricated to fill the gap.
      expect(inv.evidence.relevant_transaction_id).toBeNull();
      expect(inv.transaction_match.candidates.length).toBe(0);
      expect(inv.customer_response.safety_report.passed).toBe(true);
    } finally {
      (repository as any).getWalletTransactionsInWindow = original;
    }
  }, 60_000);

  it('reports graph evidence as unavailable rather than inventing relationships', async () => {
    const original = repository.getRingsContainingEntity;
    (repository as any).getRingsContainingEntity = async () => {
      throw new Error('simulated graph service outage');
    };

    try {
      const sc = scenario('INV_SCENARIO_A_CAMPAIGN_LINKED');
      const inv = await incidentInvestigationService.investigate({
        complaint: 'আমি ভুল করে W-SYN-091177 নাম্বারে ৳8,000 টাকা পাঠিয়ে দিয়েছি, ১২ মিনিট আগে।',
        reporter_wallet: sc.reporter_wallet,
        persist: false
      });

      expect(inv.graph_context.available).toBe(false);
      expect(inv.graph_context.linked_ring_ids).toEqual([]);
      expect(inv.graph_context.unavailable_reason).toMatch(/simulated graph service outage/);
      expect(inv.reason_codes.map(r => r.code)).toContain('GRAPH_UNAVAILABLE');
      expect(inv.evidence.source_status.find(s => s.source === 'graph')!.state).toBe('UNAVAILABLE');
    } finally {
      (repository as any).getRingsContainingEntity = original;
    }
  }, 60_000);

  it('distinguishes "no counterparty to look up" from a graph outage', async () => {
    const inv = await incidentInvestigationService.investigate({
      complaint: 'I lost money yesterday.',
      reporter_wallet: 'W-SYN-001015',
      persist: false
    });

    expect(inv.evidence.source_status.find(s => s.source === 'graph')!.state).toBe('NOT_APPLICABLE');
    expect(inv.reason_codes.map(r => r.code)).not.toContain('GRAPH_UNAVAILABLE');
  }, 60_000);
});
