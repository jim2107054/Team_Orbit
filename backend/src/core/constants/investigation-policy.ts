import type { ReasonCodeDetail } from '../types.js';

/**
 * Evidence-Driven Incident Investigation — matching weights & policy thresholds.
 *
 * IMPORTANT (calibration honesty): the weights below are DOCUMENTED HEURISTIC PRIORS,
 * not statistically optimal values. They encode an ordering that is defensible from
 * domain reasoning — a transaction reference is near-dispositive, amount and
 * counterparty are strong, time is strong but noisy because customers estimate it,
 * transaction type is medium, status/context are supporting only.
 *
 * They are deliberately:
 *   - configurable  → override via `configureMatchingWeights()` or MATCHING_WEIGHTS_ENV
 *   - documented    → every signal states what it means and why it has that weight
 *   - testable      → `src/tests/incident-investigation.test.ts` asserts the ordering
 *   - replaceable   → swap in learned/calibrated weights without touching the matcher,
 *                     which only reads from `getMatchingWeights()`
 *
 * The matcher normalises the score over EVALUABLE signals only, so a claim that
 * mentions no counterparty is not penalised for the missing counterparty signal.
 */

export interface MatchingWeightConfig {
  /** Exact transaction reference quoted by the customer. Near-dispositive. */
  REFERENCE_MATCH: number;
  /** Amount, with a graded tolerance band (see AMOUNT_TOLERANCE). */
  AMOUNT_MATCH: number;
  /** Counterparty wallet / phone / merchant / agent identity. */
  COUNTERPARTY_MATCH: number;
  /** Transaction falls inside the claimed time window (graded by distance). */
  TIME_MATCH: number;
  /** Transaction type consistent with the claimed action. */
  TYPE_MATCH: number;
  /** Ledger status consistent with what the customer says happened. */
  STATUS_CONSISTENCY: number;
  /** Soft contextual alignment (channel, amount magnitude vs claim type). */
  CONTEXT_MATCH: number;
}

export interface MatchingThresholdConfig {
  /**
   * Score at or above which a single candidate is treated as the relevant transaction.
   * Below this, the investigation does not assert which transaction is meant.
   */
  STRONG_MATCH: number;
  /** Score at or above which a candidate is worth showing to an investigator. */
  WEAK_MATCH: number;
  /**
   * If the top two candidates are within this margin AND both clear STRONG_MATCH,
   * the match is flagged ambiguous and escalated for human review.
   */
  AMBIGUITY_MARGIN: number;
  /** Retrieval window (hours) searched backwards from the claimed/report time. */
  SEARCH_WINDOW_HOURS: number;
  /** Hard cap on candidates pulled from the ledger per investigation. */
  MAX_CANDIDATES: number;
}

export interface AmountToleranceConfig {
  /** Relative tolerance treated as an exact amount match (rounding, fees). */
  EXACT_RELATIVE: number;
  /** Relative tolerance treated as a partial amount match (customer rounding "5k"). */
  NEAR_RELATIVE: number;
  /** Absolute floor so small amounts are not matched by relative tolerance alone. */
  EXACT_ABSOLUTE_BDT: number;
  /** Strength assigned to a NEAR (rounded) amount match. */
  NEAR_STRENGTH: number;
}

export interface TimeToleranceConfig {
  /** Full-strength tolerance (minutes) around an EXACT claimed time. */
  EXACT_MINUTES: number;
  /** Full-strength tolerance (minutes) around an APPROXIMATE claimed time. */
  APPROXIMATE_MINUTES: number;
  /** Decay tail (minutes) beyond full strength before the signal reaches zero. */
  DECAY_TAIL_MINUTES: number;
  /** Strength assigned when only an alternate (ambiguous am/pm) window matches. */
  ALTERNATE_WINDOW_STRENGTH: number;
}

export const MATCHING_WEIGHTS_VERSION = 'investigation-weights-v1.0.0';
export const INVESTIGATION_POLICY_VERSION = 'investigation-policy-v1.0.0';
export const SAFETY_VALIDATOR_VERSION = 'response-safety-validator-v1.0.0';

const DEFAULT_MATCHING_WEIGHTS: MatchingWeightConfig = {
  REFERENCE_MATCH: 0.40,
  AMOUNT_MATCH: 0.25,
  COUNTERPARTY_MATCH: 0.22,
  TIME_MATCH: 0.18,
  TYPE_MATCH: 0.08,
  STATUS_CONSISTENCY: 0.05,
  CONTEXT_MATCH: 0.04
};

const DEFAULT_MATCHING_THRESHOLDS: MatchingThresholdConfig = {
  STRONG_MATCH: 0.70,
  WEAK_MATCH: 0.40,
  AMBIGUITY_MARGIN: 0.07,
  SEARCH_WINDOW_HOURS: 72,
  MAX_CANDIDATES: 200
};

const DEFAULT_AMOUNT_TOLERANCE: AmountToleranceConfig = {
  EXACT_RELATIVE: 0.01,
  NEAR_RELATIVE: 0.10,
  EXACT_ABSOLUTE_BDT: 1,
  NEAR_STRENGTH: 0.55
};

const DEFAULT_TIME_TOLERANCE: TimeToleranceConfig = {
  EXACT_MINUTES: 15,
  APPROXIMATE_MINUTES: 60,
  DECAY_TAIL_MINUTES: 120,
  ALTERNATE_WINDOW_STRENGTH: 0.5
};

let activeWeights: MatchingWeightConfig = { ...DEFAULT_MATCHING_WEIGHTS };
let activeThresholds: MatchingThresholdConfig = { ...DEFAULT_MATCHING_THRESHOLDS };
let activeAmountTolerance: AmountToleranceConfig = { ...DEFAULT_AMOUNT_TOLERANCE };
let activeTimeTolerance: TimeToleranceConfig = { ...DEFAULT_TIME_TOLERANCE };

/**
 * Optional environment override, e.g.
 *   INVESTIGATION_MATCHING_WEIGHTS='{"AMOUNT_MATCH":0.30,"TIME_MATCH":0.12}'
 * Unknown keys and non-numeric values are ignored rather than crashing boot.
 */
function loadEnvWeightOverrides(): void {
  const raw = process.env.INVESTIGATION_MATCHING_WEIGHTS;
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of Object.keys(activeWeights) as Array<keyof MatchingWeightConfig>) {
      const val = parsed[key];
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        activeWeights[key] = val;
      }
    }
  } catch {
    console.warn('[investigation-policy] INVESTIGATION_MATCHING_WEIGHTS is not valid JSON; using defaults.');
  }
}
loadEnvWeightOverrides();

export function getMatchingWeights(): MatchingWeightConfig {
  return activeWeights;
}

export function getMatchingThresholds(): MatchingThresholdConfig {
  return activeThresholds;
}

export function getAmountTolerance(): AmountToleranceConfig {
  return activeAmountTolerance;
}

export function getTimeTolerance(): TimeToleranceConfig {
  return activeTimeTolerance;
}

/** Test/ops hook for swapping in calibrated weights without redeploying the matcher. */
export function configureMatchingWeights(overrides: {
  weights?: Partial<MatchingWeightConfig>;
  thresholds?: Partial<MatchingThresholdConfig>;
  amountTolerance?: Partial<AmountToleranceConfig>;
  timeTolerance?: Partial<TimeToleranceConfig>;
}): void {
  if (overrides.weights) activeWeights = { ...activeWeights, ...overrides.weights };
  if (overrides.thresholds) activeThresholds = { ...activeThresholds, ...overrides.thresholds };
  if (overrides.amountTolerance) activeAmountTolerance = { ...activeAmountTolerance, ...overrides.amountTolerance };
  if (overrides.timeTolerance) activeTimeTolerance = { ...activeTimeTolerance, ...overrides.timeTolerance };
}

export function resetMatchingWeights(): void {
  activeWeights = { ...DEFAULT_MATCHING_WEIGHTS };
  activeThresholds = { ...DEFAULT_MATCHING_THRESHOLDS };
  activeAmountTolerance = { ...DEFAULT_AMOUNT_TOLERANCE };
  activeTimeTolerance = { ...DEFAULT_TIME_TOLERANCE };
  loadEnvWeightOverrides();
}

/**
 * Investigation-specific reason codes (IRC**).
 *
 * These are additive to the existing transaction risk codes (RC01-RC20 in
 * `reason-codes.ts`) and are kept in a separate namespace because they answer a
 * different question: "how does the claim relate to the evidence?", not
 * "how risky is this transaction?".
 *
 * Audience: investigators, audit, analytics, model evaluation. They are NOT shown
 * verbatim to customers — the safe customer response never exposes internal
 * intelligence such as ring membership or campaign identifiers.
 */
export const INVESTIGATION_REASON_CODES: Record<string, ReasonCodeDetail> = {
  AMOUNT_MATCH: {
    code: 'AMOUNT_MATCH',
    label_en: 'Claimed amount matches a ledger transaction',
    label_bn: 'গ্রাহকের বলা পরিমাণ লেনদেনের রেকর্ডের সাথে মিলেছে',
    weight: 0.25,
    description: 'Transaction amount is within the configured exact-match tolerance of the claimed amount.'
  },
  AMOUNT_APPROXIMATE_MATCH: {
    code: 'AMOUNT_APPROXIMATE_MATCH',
    label_en: 'Claimed amount approximately matches a ledger transaction',
    label_bn: 'গ্রাহকের বলা পরিমাণ লেনদেনের রেকর্ডের কাছাকাছি',
    weight: 0.14,
    description: 'Amount falls inside the rounding tolerance band (e.g. customer said "5k" for 4,950).'
  },
  AMOUNT_MISMATCH: {
    code: 'AMOUNT_MISMATCH',
    label_en: 'No ledger transaction matches the claimed amount',
    label_bn: 'গ্রাহকের বলা পরিমাণের কোনো লেনদেন পাওয়া যায়নি',
    weight: 0.30,
    description: 'The searched ledger window contains transactions, but none at or near the claimed amount.'
  },
  TIME_MATCH: {
    code: 'TIME_MATCH',
    label_en: 'Transaction time falls inside the claimed time window',
    label_bn: 'লেনদেনের সময় গ্রাহকের বলা সময়ের সাথে মিলেছে',
    weight: 0.18,
    description: 'Ledger timestamp is within the tolerance derived from how precisely the customer stated the time.'
  },
  TIME_MISMATCH: {
    code: 'TIME_MISMATCH',
    label_en: 'Transaction time falls outside the claimed time window',
    label_bn: 'লেনদেনের সময় গ্রাহকের বলা সময়ের সাথে মেলেনি',
    weight: 0.12,
    description: 'Candidate transaction sits beyond the claimed window plus decay tail.'
  },
  TYPE_MATCH: {
    code: 'TYPE_MATCH',
    label_en: 'Transaction type consistent with the reported action',
    label_bn: 'লেনদেনের ধরন গ্রাহকের বর্ণনার সাথে সঙ্গতিপূর্ণ',
    weight: 0.08,
    description: 'Ledger transaction type matches the action the customer described.'
  },
  COUNTERPARTY_MATCH: {
    code: 'COUNTERPARTY_MATCH',
    label_en: 'Counterparty identified in the complaint matches the ledger',
    label_bn: 'অভিযোগে উল্লেখ করা প্রাপক লেনদেনের রেকর্ডের সাথে মিলেছে',
    weight: 0.22,
    description: 'Wallet, phone, merchant or agent identifier quoted by the customer matches the transaction counterparty.'
  },
  REFERENCE_MATCH: {
    code: 'REFERENCE_MATCH',
    label_en: 'Transaction reference quoted by the customer exists in the ledger',
    label_bn: 'গ্রাহকের দেওয়া লেনদেন রেফারেন্স রেকর্ডে পাওয়া গেছে',
    weight: 0.40,
    description: 'Exact transaction id supplied by the customer resolves to a ledger record.'
  },
  REFERENCE_NOT_FOUND: {
    code: 'REFERENCE_NOT_FOUND',
    label_en: 'Transaction reference quoted by the customer does not exist',
    label_bn: 'গ্রাহকের দেওয়া লেনদেন রেফারেন্স রেকর্ডে পাওয়া যায়নি',
    weight: 0.35,
    description: 'Customer supplied a transaction reference that is absent from the ledger.'
  },
  COMPLETED_TRANSACTION: {
    code: 'COMPLETED_TRANSACTION',
    label_en: 'Matched transaction completed successfully',
    label_bn: 'সংশ্লিষ্ট লেনদেনটি সফলভাবে সম্পন্ন হয়েছে',
    weight: 0.05,
    description: 'Ledger status is SUCCESS, so funds did leave the wallet.'
  },
  FAILED_TRANSACTION: {
    code: 'FAILED_TRANSACTION',
    label_en: 'Matched transaction did not complete',
    label_bn: 'সংশ্লিষ্ট লেনদেনটি সম্পন্ন হয়নি',
    weight: 0.05,
    description: 'Ledger status indicates the transfer failed or was reversed.'
  },
  NEW_COUNTERPARTY: {
    code: 'NEW_COUNTERPARTY',
    label_en: 'First transaction between this customer and this counterparty',
    label_bn: 'এই গ্রাহক ও প্রাপকের মধ্যে এটিই প্রথম লেনদেন',
    weight: 0.20,
    description: 'No prior transfer history exists between sender and receiver.'
  },
  HIGH_RISK_COUNTERPARTY: {
    code: 'HIGH_RISK_COUNTERPARTY',
    label_en: 'Counterparty carries elevated risk in the existing risk engine',
    label_bn: 'প্রাপক ঝুঁকিপূর্ণ হিসেবে চিহ্নিত',
    weight: 0.30,
    description: 'Existing risk engine returned HIGH or CRITICAL for the matched transaction.'
  },
  KNOWN_SCAM_RECIPIENT: {
    code: 'KNOWN_SCAM_RECIPIENT',
    label_en: 'Counterparty has prior verified community reports',
    label_bn: 'প্রাপকের বিরুদ্ধে আগের অভিযোগ রয়েছে',
    weight: 0.26,
    description: 'Community report store holds prior reports against this counterparty.'
  },
  CAMPAIGN_MATCH: {
    code: 'CAMPAIGN_MATCH',
    label_en: 'Incident aligns with an active scam campaign',
    label_bn: 'ঘটনাটি একটি সক্রিয় প্রতারণা ক্যাম্পেইনের সাথে মিলেছে',
    weight: 0.28,
    description: 'Existing Scam Campaign Intelligence matched this incident on entity overlap and/or narrative.'
  },
  GRAPH_CLUSTER_MATCH: {
    code: 'GRAPH_CLUSTER_MATCH',
    label_en: 'Counterparty belongs to a known mule ring cluster',
    label_bn: 'প্রাপক পরিচিত মিউল চক্রের সদস্য',
    weight: 0.35,
    description: 'Counterparty appears in the member set of a confirmed or detected ring case.'
  },
  BEHAVIOR_ANOMALY: {
    code: 'BEHAVIOR_ANOMALY',
    label_en: 'Behavioural anomaly reported by the risk engine',
    label_bn: 'ঝুঁকি ইঞ্জিনে আচরণগত অস্বাভাবিকতা পাওয়া গেছে',
    weight: 0.22,
    description: 'Existing feature store / risk engine fired one or more behavioural rules.'
  },
  EVIDENCE_CONFLICT: {
    code: 'EVIDENCE_CONFLICT',
    label_en: 'Customer statement conflicts with observed evidence',
    label_bn: 'গ্রাহকের বক্তব্য ও পাওয়া তথ্যের মধ্যে অসঙ্গতি রয়েছে',
    weight: 0.40,
    description: 'At least one claim is directly contradicted by a ledger or risk observation. Not a finding of customer dishonesty.'
  },
  INSUFFICIENT_TRANSACTION_DATA: {
    code: 'INSUFFICIENT_TRANSACTION_DATA',
    label_en: 'Not enough transaction evidence to determine what happened',
    label_bn: 'কী ঘটেছে তা নির্ধারণের জন্য পর্যাপ্ত লেনদেনের তথ্য নেই',
    weight: 0.0,
    description: 'The searched window held no candidate transactions, or the ledger could not be reached.'
  },
  INSUFFICIENT_CLAIM_DETAIL: {
    code: 'INSUFFICIENT_CLAIM_DETAIL',
    label_en: 'Complaint contains no verifiable detail to match against',
    label_bn: 'অভিযোগে যাচাইযোগ্য কোনো তথ্য নেই',
    weight: 0.0,
    description: 'No amount, time, counterparty or reference was stated, so no claim can be tested.'
  },
  AMBIGUOUS_TRANSACTION_MATCH: {
    code: 'AMBIGUOUS_TRANSACTION_MATCH',
    label_en: 'Multiple transactions match the claim near-equally',
    label_bn: 'একাধিক লেনদেন প্রায় সমানভাবে অভিযোগের সাথে মিলেছে',
    weight: 0.0,
    description: 'Top candidates are within the ambiguity margin; the system does not assert which one is meant.'
  },
  LEDGER_UNAVAILABLE: {
    code: 'LEDGER_UNAVAILABLE',
    label_en: 'Transaction ledger could not be reached',
    label_bn: 'লেনদেনের ডেটাবেস থেকে তথ্য আনা যায়নি',
    weight: 0.0,
    description: 'Transaction service error. No transaction evidence was fabricated to compensate.'
  },
  GRAPH_UNAVAILABLE: {
    code: 'GRAPH_UNAVAILABLE',
    label_en: 'Graph intelligence unavailable for this incident',
    label_bn: 'গ্রাফ ইন্টেলিজেন্স এই ঘটনার জন্য পাওয়া যায়নি',
    weight: 0.0,
    description: 'Knowledge graph / ring lookup failed. Graph evidence is reported as unavailable, not absent.'
  },
  CAMPAIGN_UNAVAILABLE: {
    code: 'CAMPAIGN_UNAVAILABLE',
    label_en: 'Campaign intelligence unavailable for this incident',
    label_bn: 'ক্যাম্পেইন ইন্টেলিজেন্স এই ঘটনার জন্য পাওয়া যায়নি',
    weight: 0.0,
    description: 'Campaign service lookup failed.'
  },
  RISK_CONTEXT_UNAVAILABLE: {
    code: 'RISK_CONTEXT_UNAVAILABLE',
    label_en: 'Risk context unavailable (no transaction to score)',
    label_bn: 'ঝুঁকি প্রসঙ্গ পাওয়া যায়নি (স্কোর করার মতো লেনদেন নেই)',
    weight: 0.0,
    description: 'The risk engine needs a concrete transaction; none was matched.'
  },
  AUTHORISATION_DENIED_BY_CUSTOMER: {
    code: 'AUTHORISATION_DENIED_BY_CUSTOMER',
    label_en: 'Customer denies initiating the transaction',
    label_bn: 'গ্রাহক লেনদেনটি করার কথা অস্বীকার করেছেন',
    weight: 0.30,
    description: 'Complaint asserts the transaction was not initiated by the account holder.'
  },
  PROMPT_INJECTION_ATTEMPT: {
    code: 'PROMPT_INJECTION_ATTEMPT',
    label_en: 'Complaint text contained instruction-injection patterns',
    label_bn: 'অভিযোগের লেখায় নির্দেশ-ইনজেকশনের চেষ্টা পাওয়া গেছে',
    weight: 0.0,
    description: 'Untrusted input guard neutralised embedded instructions. Content was processed strictly as data.'
  },
  CREDENTIAL_DISCLOSURE_REPORTED: {
    code: 'CREDENTIAL_DISCLOSURE_REPORTED',
    label_en: 'Customer reports being asked for a PIN/OTP by a third party',
    label_bn: 'গ্রাহক জানিয়েছেন তৃতীয় পক্ষ পিন/ওটিপি চেয়েছে',
    weight: 0.45,
    description: 'Social-engineering indicator extracted from the customer statement.'
  },
  GOLDEN_HOUR_ACTIVE: {
    code: 'GOLDEN_HOUR_ACTIVE',
    label_en: 'Incident reported inside the golden-hour recovery window',
    label_bn: 'ঘটনাটি গোল্ডেন আওয়ার উদ্ধার সময়সীমার মধ্যে জানানো হয়েছে',
    weight: 0.0,
    description: 'Elapsed time since the matched transaction is within the recovery window.'
  }
};

/** Human-review policy identifiers, surfaced in HumanReviewDecision.triggers. */
export const HUMAN_REVIEW_RULES = {
  HIGH_FRAUD_RISK: 'HR01_HIGH_OR_CRITICAL_FRAUD_RISK',
  EVIDENCE_CONFLICT: 'HR02_EVIDENCE_CONFLICT_DETECTED',
  INSUFFICIENT_FOR_HIGH_IMPACT: 'HR03_INSUFFICIENT_EVIDENCE_HIGH_IMPACT_DECISION',
  CAMPAIGN_LINKED: 'HR04_ACTIVE_CAMPAIGN_INVOLVEMENT',
  GRAPH_SUSPICIOUS: 'HR05_SUSPICIOUS_GRAPH_RELATIONSHIPS',
  HIGH_VALUE: 'HR06_HIGH_VALUE_TRANSACTION',
  RECOVERY_SENSITIVE: 'HR07_GOLDEN_HOUR_RECOVERY_SENSITIVE',
  AMBIGUOUS_CLAIM: 'HR08_AMBIGUOUS_OR_UNDERSPECIFIED_CLAIM',
  SAFETY_SENSITIVE: 'HR09_SAFETY_SENSITIVE_CREDENTIAL_EXPOSURE',
  AUTHORISATION_DENIED: 'HR10_CUSTOMER_DENIES_AUTHORISATION',
  INJECTION_ATTEMPT: 'HR11_UNTRUSTED_INPUT_INJECTION_ATTEMPT',
  RESPONSE_SAFETY_FALLBACK: 'HR12_GENERATED_RESPONSE_FAILED_SAFETY_VALIDATION',
  AMBIGUOUS_MATCH: 'HR13_AMBIGUOUS_TRANSACTION_MATCH'
} as const;

/** BDT threshold above which a matched transaction alone triggers human review. */
export const HIGH_VALUE_REVIEW_THRESHOLD_BDT = 25000;

/** Golden-hour recovery window in minutes, aligned with the existing recovery optimizer. */
export const GOLDEN_HOUR_WINDOW_MINUTES = 60;
