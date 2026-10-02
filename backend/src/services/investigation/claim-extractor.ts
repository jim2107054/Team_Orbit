import {
  IncidentClaim,
  IncidentClaimType,
  ClaimTimeWindow,
  ClaimTimePrecision,
  IncidentLanguage
} from '../../core/types.js';
import { complaintActionIntelligenceService } from '../complaint-action-intelligence.js';
import { untrustedInputGuard } from './untrusted-input-guard.js';

/**
 * Claim Extraction — "what is the customer actually asserting?"
 *
 * Works on English, Bangla, Banglish and mixed text. It REUSES the existing
 * complaint parser (`complaint-action-intelligence`) for language detection,
 * Bengali-digit conversion and entity extraction, and adds what the investigation
 * layer needs on top:
 *
 *   - resolved time windows (with am/pm and daypart ambiguity made explicit)
 *   - claim type (wrong transfer vs denial vs failed payment vs refund …)
 *   - authorisation denial detection
 *   - the list of DISCRIMINATORS, i.e. the fields that make the claim falsifiable
 *
 * Nothing is invented. A value absent from the complaint stays undefined.
 */

interface DaypartDefinition {
  patterns: RegExp[];
  /** Inclusive start hour, exclusive end hour, local wall-clock. */
  startHour: number;
  endHour: number;
  /** Hour an unqualified "N o'clock" resolves to inside this daypart. */
  pmBias: boolean;
}

const DAYPARTS: Array<{ id: string } & DaypartDefinition> = [
  {
    id: 'morning',
    patterns: [/সকাল/, /ভোর/, /\bshokal\b/i, /\bvor\b/i, /\bmorning\b/i, /\bam\b/i],
    startHour: 5,
    endHour: 12,
    pmBias: false
  },
  {
    id: 'noon',
    patterns: [/দুপুর/, /\bdupur\b/i, /\bnoon\b/i, /\bmidday\b/i],
    startHour: 12,
    endHour: 16,
    pmBias: true
  },
  {
    id: 'afternoon',
    patterns: [/বিকাল/, /বিকেল/, /\bbikal\b/i, /\bbikel\b/i, /\bafternoon\b/i],
    startHour: 15,
    endHour: 18,
    pmBias: true
  },
  {
    id: 'evening',
    patterns: [/সন্ধ্যা/, /সন্ধ্যে/, /\bshondha\b/i, /\bsondha\b/i, /\bevening\b/i],
    startHour: 18,
    endHour: 21,
    pmBias: true
  },
  {
    id: 'night',
    patterns: [/রাত/, /\braat\b/i, /\brat\b/i, /\bnight\b/i, /\bmidnight\b/i],
    startHour: 21,
    endHour: 24,
    pmBias: true
  }
];

/** Claim-type signatures, evaluated in priority order (most specific first). */
interface ClaimTypeRule {
  type: IncidentClaimType;
  confidence: number;
  patterns: RegExp[];
}

const CLAIM_TYPE_RULES: ClaimTypeRule[] = [
  {
    // Denial of authorisation must win over everything else: it changes the whole
    // investigation posture (see evidence-verdict conflict handling).
    type: 'unauthorized_transaction',
    confidence: 0.9,
    patterns: [
      /\bi\s+(did\s*n[o']?t|never|have\s+not|havent|haven't)\s+(make|do|send|authorise|authorize|initiate|approve)/i,
      /\b(not|never)\s+(made|done|sent|authorised|authorized|initiated)\s+(this|that|the)\s*(transaction|txn|payment|transfer)?/i,
      /\bwithout\s+my\s+(knowledge|permission|consent)\b/i,
      /\bsomeone\s+(else\s+)?(used|accessed|hacked|took\s+over)\s+my\s+(account|wallet|number)/i,
      /\b(unauthorised|unauthorized)\s+(transaction|transfer|payment|debit)/i,
      /আমি\s*(এই\s*)?(লেনদেন|টাকা)\s*(টি\s*|টা\s*)?(পাঠাইনি|করিনি|দেইনি|পাঠাই\s*নাই)/,
      /আমার\s*(অনুমতি|সম্মতি)\s*(ছাড়া|ব্যতীত)/,
      /(আমার\s*)?(অ্যাকাউন্ট|একাউন্ট|নাম্বার)\s*(হ্যাক|দখল)\s*(হয়েছে|হয়ে\s*গেছে|করেছে)/,
      /\bami\s+(ei\s+)?(lenden|transaction|taka)\s*(ta|ti)?\s*(pathai\s*ni|pathaini|kori\s*ni|korini)/i,
      /\bamar\s+account\s+hack\s+(hoise|hoyeche|hoye\s*geche)/i
    ]
  },
  {
    type: 'wrong_transfer',
    confidence: 0.85,
    patterns: [
      /\bwrong\s+(number|wallet|account|recipient|person|nombor)/i,
      /\bsent\s+(it\s+)?to\s+the\s+wrong\b/i,
      /\bmistakenly\s+(sent|transferred|paid)/i,
      /\bby\s+mistake\b/i,
      /ভুল\s*(নাম্বার|নম্বর|ওয়ালেট|অ্যাকাউন্ট|একাউন্ট|ব্যক্তি|লোক)/,
      /ভুল\s*(করে|বশত)\s*(পাঠিয়ে|পাঠাইছি|পাঠিয়েছি|চলে)/,
      /\b(vul|bhul|vhul)\s*(number|nombor|wallet|account|lok)/i,
      /\b(vul|bhul|vhul)\s*(kore|bosot)\s*(pathaisi|pathaichi|pathiyechi|chole)/i
    ]
  },
  {
    type: 'phishing_or_social_engineering',
    confidence: 0.85,
    patterns: [
      /\b(customer\s*care|help\s*line|helpline|head\s*office|support\s*team|security\s*team)\b/i,
      /\b(otp|pin|password|verification\s*code)\b.{0,40}\b(ask|asked|wanted|demand|share|gave|give)/i,
      /\b(ask|asked|wanted|demanded)\b.{0,40}\b(otp|pin|password|verification\s*code)/i,
      /\b(fake|fraud|scam|spoof)\w*\s*(call|caller|sms|message|agent|officer)/i,
      /\b(cashback|lottery|prize|reward|bonus|offer)\b.{0,60}\b(won|win|claim|call|called)/i,
      /\b(won|win)\b.{0,40}\b(cashback|lottery|prize|reward|bonus)/i,
      /(কাস্টমার\s*কেয়ার|হেড\s*অফিস|হেল্পলাইন|কাস্টমার\s*কেয়ার)/,
      /(ওটিপি|পিন|পাসওয়ার্ড|কোড)\s*(চেয়েছে|চাইলো|চেয়েছিল|চাচ্ছিল|দিতে\s*বলে)/,
      /(ক্যাশব্যাক|লটারি|পুরস্কার|প্রাইজ|অফার|বোনাস)/,
      /(প্রতারক|প্রতারণা|ফাঁদ|ভুয়া\s*কল|ভুয়া)/,
      /\b(customer\s*care|head\s*office)\b.{0,40}\b(seje|shejhe|porichoy)/i,
      /\b(otp|pin|password)\s*(ta|ti)?\s*(chaise|cheyeche|chailo|chaichilo)/i
    ]
  },
  {
    type: 'payment_failed',
    confidence: 0.8,
    patterns: [
      /\b(payment|transaction|transfer|txn)\s+(failed|declined|unsuccessful|did\s*n[o']?t\s+go\s+through)/i,
      /\b(money|amount|balance)\s+(deducted|debited|cut|gone)\b.{0,50}\b(not\s+received|didn'?t\s+receive|failed)/i,
      /(লেনদেন|পেমেন্ট|ট্রানজেকশন)\s*(ব্যর্থ|ফেইল|হয়নি|সম্পন্ন\s*হয়নি)/,
      /(টাকা\s*কেটে\s*(নিয়েছে|গেছে))\s*(কিন্তু|but)?/,
      /\b(payment|lenden)\s*(fail|fail\s*hoise|hoy\s*nai|hoyni)/i
    ]
  },
  {
    type: 'funds_not_received',
    confidence: 0.75,
    patterns: [
      /\b(did\s*n[o']?t|never|have\s*n[o']?t)\s+receive[d]?\s+(the\s+)?(money|amount|payment|fund)/i,
      /\b(money|payment|amount)\s+(not|never)\s+(received|credited|arrived)/i,
      /(টাকা\s*(পাইনি|পাই\s*নাই|আসেনি|ঢোকেনি|জমা\s*হয়নি))/,
      /\btaka\s*(pai\s*ni|paini|ashe\s*ni|aseni)/i
    ]
  },
  {
    type: 'duplicate_payment',
    confidence: 0.8,
    patterns: [
      /\b(double|twice|duplicate|two\s+times)\s*(charged|debited|deducted|paid|payment|transaction)/i,
      /\b(charged|debited|deducted|paid)\s+(twice|two\s+times|double)/i,
      /(দুইবার|দু'?বার|দুবার)\s*(কেটে|টাকা|পেমেন্ট|চার্জ)/,
      /\b(duibar|dubar)\s*(kete|taka|payment)/i
    ]
  },
  {
    type: 'refund_request',
    confidence: 0.7,
    patterns: [
      /\b(refund|money\s+back|reverse|reversal|return\s+my\s+money)\b/i,
      /(রিফান্ড|টাকা\s*ফেরত|ফেরত\s*চাই|রিভার্স)/,
      /\b(refund|taka\s*ferot)\b/i
    ]
  },
  {
    type: 'merchant_settlement_delay',
    confidence: 0.75,
    patterns: [
      /\b(merchant|shop|store|qr)\b.{0,50}\b(settle|settlement|payout|not\s+credited|delay)/i,
      /(মার্চেন্ট|দোকান|কিউআর)\s*.{0,40}(সেটেলমেন্ট|পেআউট|জমা\s*হয়নি|দেরি)/
    ]
  },
  {
    type: 'agent_cash_in_issue',
    confidence: 0.75,
    patterns: [
      /\b(agent|agent\s*point|cash[\s-]*in|cash[\s-]*out)\b.{0,60}\b(not|didn'?t|issue|problem|missing|less)/i,
      /(এজেন্ট|ক্যাশ\s*ইন|ক্যাশ\s*আউট)\s*.{0,50}(সমস্যা|পাইনি|কম\s*দিয়েছে|দেয়নি)/
    ]
  }
];

const URGENCY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'IMMEDIATE_ACTION_DEMANDED', pattern: /\b(immediately|right\s+now|urgent(ly)?|asap|hurry|quickly)\b/i },
  { label: 'IMMEDIATE_ACTION_DEMANDED', pattern: /(এখনই|অবিলম্বে|জরুরি|তাড়াতাড়ি|দ্রুত)/ },
  { label: 'IMMEDIATE_ACTION_DEMANDED', pattern: /\b(ekhoni|ekhon\s*i|druto|taratari|urgent)\b/i },
  { label: 'DEADLINE_PRESSURE', pattern: /\bwithin\s+\d+\s*(min|minute|minutes|hour|hours)\b/i },
  { label: 'DEADLINE_PRESSURE', pattern: /\d+\s*(মিনিটের|ঘণ্টার)\s*মধ্যে/ },
  { label: 'SECRECY_PRESSURE', pattern: /\b(don'?t\s+tell|keep\s+(it\s+)?secret|without\s+telling)\b/i },
  { label: 'SECRECY_PRESSURE', pattern: /(কাউকে\s*(বলবেন|জানাবেন)\s*না|গোপন\s*রাখ)/ }
];

const SCAM_INDICATOR_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'CREDENTIAL_REQUEST', pattern: /\b(otp|pin|password|cvv|verification\s*code|one[\s-]*time\s*password)\b/i },
  { label: 'CREDENTIAL_REQUEST', pattern: /(ওটিপি|পিন|পাসওয়ার্ড|গোপন\s*কোড)/ },
  { label: 'AUTHORITY_IMPERSONATION', pattern: /\b(customer\s*care|head\s*office|helpline|support\s*team|security\s*team|police|cid|bank\s*officer)\b/i },
  { label: 'AUTHORITY_IMPERSONATION', pattern: /(কাস্টমার\s*কেয়ার|হেড\s*অফিস|হেল্পলাইন|পুলিশ|সিআইডি|ব্যাংক\s*কর্মকর্তা|কাস্টমার\s*কেয়ার)/ },
  { label: 'AUTHORITY_IMPERSONATION', pattern: /\b(customer\s*care|head\s*office)\s*(seje|shejhe|theke|porichoy\s*die)/i },
  { label: 'REWARD_PROMISE', pattern: /\b(cashback|lottery|prize|reward|bonus|won|winner|gift)\b/i },
  { label: 'REWARD_PROMISE', pattern: /(ক্যাশব্যাক|লটারি|পুরস্কার|প্রাইজ|বোনাস|জিতেছেন|উপহার)/ },
  { label: 'ACCOUNT_SUSPENSION_THREAT', pattern: /\b(account\s+(will\s+be\s+)?(blocked|closed|suspended|frozen|deactivated))\b/i },
  { label: 'ACCOUNT_SUSPENSION_THREAT', pattern: /(অ্যাকাউন্ট|একাউন্ট)\s*(বন্ধ|ব্লক|স্থগিত|বাতিল)/ },
  { label: 'SUSPICIOUS_LINK_OR_APK', pattern: /\b(apk|install\s+this|click\s+(this\s+)?link|t\.me\/|bit\.ly\/)/i },
  { label: 'INVESTMENT_PROMISE', pattern: /\b(invest|investment|double\s+your\s+money|guaranteed\s+return|profit)\b/i },
  { label: 'INVESTMENT_PROMISE', pattern: /(বিনিয়োগ|ইনভেস্ট|গ্যারান্টেড\s*লাভ|দ্বিগুণ)/ },
  { label: 'EMERGENCY_STORY', pattern: /\b(accident|hospital|emergency|operation|blood)\b/i },
  { label: 'EMERGENCY_STORY', pattern: /(দুর্ঘটনা|হাসপাতাল|জরুরি\s*চিকিৎসা|অপারেশন|রক্ত)/ }
];

const TXN_TYPE_HINTS: Array<{ type: string; pattern: RegExp }> = [
  { type: 'CASH_OUT', pattern: /\b(cash[\s-]*out|withdraw(al)?)\b/i },
  { type: 'CASH_OUT', pattern: /(ক্যাশ\s*আউট|টাকা\s*তোলা|উত্তোলন)/ },
  { type: 'CASH_IN', pattern: /\b(cash[\s-]*in|deposit)\b/i },
  { type: 'CASH_IN', pattern: /(ক্যাশ\s*ইন|জমা\s*দিয়েছি)/ },
  { type: 'MERCHANT_PAY', pattern: /\b(merchant\s*pay|paid\s+(the\s+)?(shop|store|merchant)|qr\s*(code\s*)?(pay|scan))\b/i },
  { type: 'MERCHANT_PAY', pattern: /(মার্চেন্ট\s*পে|দোকানে\s*পেমেন্ট|কিউআর\s*স্ক্যান)/ },
  { type: 'BILL_PAY', pattern: /\b(bill\s*pay|electricity\s*bill|gas\s*bill|utility)\b/i },
  { type: 'BILL_PAY', pattern: /(বিল\s*পে|বিদ্যুৎ\s*বিল|গ্যাস\s*বিল)/ },
  { type: 'MOBILE_RECHARGE', pattern: /\b(recharge|top[\s-]*up|flexiload)\b/i },
  { type: 'MOBILE_RECHARGE', pattern: /(রিচার্জ|ফ্লেক্সিলোড|টপ\s*আপ)/ },
  { type: 'P2P_SEND', pattern: /\b(send\s*money|sent\s+money|transfer(red)?|p2p)\b/i },
  { type: 'P2P_SEND', pattern: /(সেন্ড\s*মানি|টাকা\s*পাঠ|ট্রান্সফার)/ },
  { type: 'P2P_SEND', pattern: /\b(send\s*money|taka\s*patha(isi|ichi|ilam|no|in))/i }
];

export class ClaimExtractor {
  /**
   * Extract a structured claim from untrusted complaint text.
   *
   * @param rawComplaint verbatim customer text (retained for audit, never executed)
   * @param options.reportedAt reference instant for relative/partial times
   *                           (defaults to now); all windows are resolved against it
   */
  extract(
    rawComplaint: string,
    options?: {
      incidentId?: string;
      reportedAt?: string;
      reporterWallet?: string;
      reporterPhone?: string;
      /** IANA-style UTC offset in minutes for wall-clock resolution. Dhaka = +360. */
      utcOffsetMinutes?: number;
    }
  ): IncidentClaim {
    const incidentId = options?.incidentId || `INC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const reportedAt = options?.reportedAt || new Date().toISOString();
    const offsetMinutes = options?.utcOffsetMinutes ?? 360; // Asia/Dhaka

    // 1. Redact credential digits BEFORE anything else reads, stores or logs the text.
    //    Victims routinely type the OTP or PIN they were tricked into sharing straight
    //    into the complaint. Those digits must never be persisted, and they must not be
    //    mistaken for a money amount by the entity extractor.
    const redaction = this.redactCredentialDigits(rawComplaint || '');

    // 2. Untrusted input guard — downstream extraction reads only sanitised text.
    const guard = untrustedInputGuard.inspect(redaction.text);
    const sanitized = guard.sanitized_text;

    // 3. Reuse the existing complaint parser for language + entities.
    const language = complaintActionIntelligenceService.detectLanguage(sanitized) as IncidentLanguage;
    const entities = complaintActionIntelligenceService.extractEntities(sanitized);
    const asciiDigits = complaintActionIntelligenceService.convertBengaliDigitsToAscii(sanitized);

    // 4. Claim type.
    const { claimType, confidence: claimTypeConfidence } = this.classifyClaimType(asciiDigits);

    // 5. Amounts — the existing extractor returns every plausible amount; the
    //    largest is the usual loss figure, but all are kept as candidates so the
    //    matcher can test each one rather than guessing.
    const candidateAmounts = [...entities.amounts_bdt].sort((a, b) => b - a);
    const primaryAmount = candidateAmounts.length > 0 ? candidateAmounts[0] : undefined;

    // 6. Time windows.
    const { primary, alternates } = this.resolveTimeWindows(asciiDigits, reportedAt, offsetMinutes);

    // 7. Transaction type hint.
    const transactionType = this.detectTransactionType(asciiDigits);

    // 8. Counterparty / merchant / agent / reference.
    const counterpartyWallet = entities.wallets.find(w => w !== options?.reporterWallet);
    const counterpartyPhone = entities.phone_numbers.find(p => p !== options?.reporterPhone);
    const merchantId = entities.merchant_ids[0];
    const agentId = entities.agent_ids[0];
    const transactionReference = entities.txn_refs[0];

    // 9. Social-engineering indicators and urgency.
    const scamIndicators = this.matchLabels(asciiDigits, SCAM_INDICATOR_PATTERNS);
    const urgencyIndicators = this.matchLabels(asciiDigits, URGENCY_PATTERNS);

    const deniesAuthorisation = claimType === 'unauthorized_transaction';
    const claimedStatus = this.detectClaimedStatus(asciiDigits, claimType);

    // 10. Discriminators — what makes this claim testable against the ledger.
    const discriminators: string[] = [];
    if (transactionReference) discriminators.push('transaction_reference');
    if (primaryAmount !== undefined) discriminators.push('amount');
    if (counterpartyWallet || counterpartyPhone || merchantId || agentId) discriminators.push('counterparty');
    if (primary && primary.precision !== 'UNKNOWN' && primary.precision !== 'DAY') discriminators.push('time');
    if (transactionType) discriminators.push('transaction_type');

    return {
      incident_id: incidentId,
      claim_type: claimType,
      claim_type_confidence: claimTypeConfidence,
      amount_bdt: primaryAmount,
      candidate_amounts_bdt: candidateAmounts,
      currency: 'BDT',
      time_window: primary,
      alternate_time_windows: alternates,
      transaction_type: transactionType,
      counterparty_wallet: counterpartyWallet,
      counterparty_phone: counterpartyPhone,
      merchant_id: merchantId,
      agent_id: agentId,
      transaction_reference: transactionReference,
      claimed_status: claimedStatus,
      denies_authorisation: deniesAuthorisation,
      scam_indicators: scamIndicators,
      credential_request_claimed: scamIndicators.includes('CREDENTIAL_REQUEST'),
      authority_impersonation_claimed: scamIndicators.includes('AUTHORITY_IMPERSONATION'),
      urgency_indicators: urgencyIndicators,
      language,
      raw_complaint: redaction.text,
      credential_digits_redacted: redaction.redacted,
      sanitized_complaint: sanitized,
      injection_attempt_detected: guard.injection_detected,
      injection_patterns_matched: guard.patterns_matched,
      discriminators_present: discriminators,
      extracted_at: new Date().toISOString()
    };
  }

  // ─── Credential redaction ─────────────────────────────────────────────────
  /**
   * Remove credential values a customer has pasted into their own complaint.
   *
   * Two problems are solved at once:
   *   1. PRIVACY — an OTP/PIN must never reach the database or the audit log, and
   *      the complaint record is persisted in full.
   *   2. CORRECTNESS — a 6-digit OTP sits inside the plausible BDT range, so the
   *      entity extractor would otherwise report it as the disputed amount.
   *
   * Only digit runs that sit close to a credential keyword are removed, so a genuine
   * amount mentioned elsewhere in the same sentence survives.
   */
  private redactCredentialDigits(text: string): { text: string; redacted: boolean } {
    if (!text) return { text: '', redacted: false };

    const CREDENTIAL_WORD = /(?:otp|o\.?t\.?p|pins?|pin\s*code|passwords?|passcode|cvv|cvc|verification\s*code|security\s*code|ওটিপি|পিন|পাসওয়ার্ড|পাসকোড|গোপন\s*কোড|সিভিভি)/gi;
    const MONEY_MARKER = /(?:৳|\btk\b|\bbdt\b|টাকা|\btaka\b)/i;
    const GAP_LIMIT = 20;

    // A redaction candidate must look like a credential VALUE, not an amount and not
    // part of an identifier such as W-SYN-091177 or TXN-INV-A-DISPUTED.
    const isCredentialValue = (whole: string, start: number, end: number): boolean => {
      const run = whole.slice(start, end);
      if (run.length < 4 || run.length > 8) return false;

      const before = whole.slice(Math.max(0, start - 6), start);
      const after = whole.slice(end, end + 8);

      // Part of a larger token (wallet id, txn ref, phone, decimal, thousands group).
      if (/[\w-]$/.test(before)) return false;
      if (/^[\w-]/.test(after) && !/^\s/.test(after)) return false;
      // Carries a currency marker on either side — that is money, not a credential.
      if (MONEY_MARKER.test(before)) return false;
      if (MONEY_MARKER.test(after.slice(0, 7))) return false;
      if (/^\s*(?:k\b|হাজার)/i.test(after)) return false;

      return true;
    };

    // Reject a keyword→value pairing whose gap mentions money or crosses an identifier.
    const gapIsClean = (gap: string): boolean => !MONEY_MARKER.test(gap) && !/[A-Za-z]-|-[A-Za-z]/.test(gap);

    const digitRunAt = (whole: string, from: number): { start: number; end: number } | null => {
      const rx = /[0-9০-৯]+/g;
      rx.lastIndex = from;
      const m = rx.exec(whole);
      return m ? { start: m.index, end: m.index + m[0].length } : null;
    };

    let working = text;
    let redacted = false;

    // Pass 1 — keyword followed by its value ("OTP 445566", "পিন ১২৩৪").
    const keywordMatches: Array<{ index: number; length: number }> = [];
    CREDENTIAL_WORD.lastIndex = 0;
    let km: RegExpExecArray | null;
    while ((km = CREDENTIAL_WORD.exec(working)) !== null) {
      keywordMatches.push({ index: km.index, length: km[0].length });
    }

    // Apply from the end so earlier indices stay valid.
    for (const kw of keywordMatches.reverse()) {
      const searchFrom = kw.index + kw.length;
      const run = digitRunAt(working, searchFrom);
      if (!run) continue;
      const gap = working.slice(searchFrom, run.start);
      if (gap.length > GAP_LIMIT || !gapIsClean(gap)) continue;
      if (!isCredentialValue(working, run.start, run.end)) continue;

      working = working.slice(0, run.start) + '[REDACTED_CREDENTIAL]' + working.slice(run.end);
      redacted = true;
    }

    // Pass 2 — value followed by the keyword ("445566 OTP", "১২৩৪ পিন দিয়েছি").
    const trailing = new RegExp(`([0-9০-৯]{4,8})([^0-9০-৯\\n]{0,12}?)${CREDENTIAL_WORD.source}`, 'gi');
    working = working.replace(trailing, (match, value: string, gap: string, offset: number) => {
      if (!gapIsClean(gap)) return match;
      if (!isCredentialValue(working, offset, offset + value.length)) return match;
      redacted = true;
      return `[REDACTED_CREDENTIAL]${gap}${match.slice(value.length + gap.length)}`;
    });

    return { text: working, redacted };
  }

  // ─── Claim type ───────────────────────────────────────────────────────────
  private classifyClaimType(text: string): { claimType: IncidentClaimType; confidence: number } {
    for (const rule of CLAIM_TYPE_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          return { claimType: rule.type, confidence: rule.confidence };
        }
      }
    }
    return { claimType: 'other', confidence: 0.3 };
  }

  private detectTransactionType(text: string): string | undefined {
    for (const hint of TXN_TYPE_HINTS) {
      if (hint.pattern.test(text)) return hint.type;
    }
    return undefined;
  }

  private detectClaimedStatus(
    text: string,
    claimType: IncidentClaimType
  ): IncidentClaim['claimed_status'] {
    if (claimType === 'unauthorized_transaction') return 'not_initiated';
    if (/\b(failed|declined|unsuccessful)\b/i.test(text) || /(ব্যর্থ|ফেইল|হয়নি)/.test(text)) return 'failed';
    if (/\b(pending|processing|stuck)\b/i.test(text) || /(পেন্ডিং|প্রক্রিয়াধীন|আটকে)/.test(text)) return 'pending';
    if (
      /\b(sent|transferred|paid|completed|went|gone|deducted|debited)\b/i.test(text) ||
      /(পাঠিয়েছি|পাঠাইছি|চলে\s*গেছে|কেটে\s*নিয়েছে|সম্পন্ন)/.test(text) ||
      /\b(pathaisi|pathaichi|pathiyechi|chole\s*ge(se|che))\b/i.test(text)
    ) {
      return 'completed';
    }
    return 'unknown';
  }

  private matchLabels(text: string, defs: Array<{ label: string; pattern: RegExp }>): string[] {
    const found: string[] = [];
    for (const def of defs) {
      if (def.pattern.test(text) && !found.includes(def.label)) {
        found.push(def.label);
      }
    }
    return found;
  }

  // ─── Time resolution ──────────────────────────────────────────────────────
  /**
   * Resolve the claimed time into one primary window plus alternates.
   *
   * Ambiguity is modelled, not guessed away:
   *   - "2tar dike" with no daypart → primary 14:00 (Bangladeshi colloquial default),
   *     alternate 02:00. The matcher scores alternates at reduced strength.
   *   - a bare daypart ("in the evening") → a window spanning that daypart.
   *   - no time at all → no window; the claim simply has no time discriminator.
   */
  private resolveTimeWindows(
    text: string,
    reportedAtIso: string,
    offsetMinutes: number
  ): { primary?: ClaimTimeWindow; alternates: ClaimTimeWindow[] } {
    const reportedAt = new Date(reportedAtIso);
    if (Number.isNaN(reportedAt.getTime())) {
      return { alternates: [] };
    }

    // (a) Relative: "15 minutes ago", "২ ঘণ্টা আগে", "2 hours ago"
    const relative = this.matchRelativeTime(text);
    if (relative) {
      const centre = new Date(reportedAt.getTime() - relative.minutesAgo * 60_000);
      return {
        primary: this.windowAround(centre, relative.toleranceMinutes, 'RELATIVE', relative.span),
        alternates: []
      };
    }

    // (b) Day anchor (today / yesterday / a weekday-free date reference).
    const dayOffset = this.matchDayAnchor(text);

    // (c) Daypart, used both as a window and to disambiguate a bare hour.
    const daypart = DAYPARTS.find(d => d.patterns.some(p => p.test(text)));

    // (d) Explicit clock time.
    const clock = this.matchClockTime(text);

    if (clock) {
      const windows: ClaimTimeWindow[] = [];
      const candidateHours = this.resolveHourCandidates(clock, daypart);

      for (let i = 0; i < candidateHours.length; i++) {
        const hour = candidateHours[i];
        const centre = this.atWallClock(reportedAt, dayOffset ?? 0, hour, clock.minute ?? 0, offsetMinutes);
        const precision: ClaimTimePrecision = clock.minute !== undefined && clock.explicitMeridiem
          ? 'EXACT'
          : clock.minute !== undefined
            ? 'EXACT'
            : 'APPROXIMATE';
        windows.push(this.windowAround(centre, precision === 'EXACT' ? 15 : 60, precision, clock.span));
      }

      return { primary: windows[0], alternates: windows.slice(1) };
    }

    if (daypart) {
      const start = this.atWallClock(reportedAt, dayOffset ?? 0, daypart.startHour, 0, offsetMinutes);
      const end = this.atWallClock(reportedAt, dayOffset ?? 0, daypart.endHour, 0, offsetMinutes);
      const span = (text.match(daypart.patterns.find(p => p.test(text))!) || [''])[0];
      return {
        primary: {
          start_ts: start.toISOString(),
          end_ts: end.toISOString(),
          precision: 'DAYPART',
          evidence_span: span
        },
        alternates: []
      };
    }

    if (dayOffset !== undefined) {
      const start = this.atWallClock(reportedAt, dayOffset, 0, 0, offsetMinutes);
      const end = this.atWallClock(reportedAt, dayOffset, 24, 0, offsetMinutes);
      return {
        primary: {
          start_ts: start.toISOString(),
          end_ts: end.toISOString(),
          precision: 'DAY',
          evidence_span: dayOffset === 0 ? 'today' : 'previous day'
        },
        alternates: []
      };
    }

    return { alternates: [] };
  }

  private matchRelativeTime(text: string): { minutesAgo: number; toleranceMinutes: number; span: string } | null {
    const patterns: Array<{ rx: RegExp; unitMinutes: number; tolerance: number }> = [
      { rx: /(\d{1,4})\s*(?:min|mins|minute|minutes)\s*(?:ago|before|earlier)/i, unitMinutes: 1, tolerance: 15 },
      { rx: /(\d{1,3})\s*(?:hr|hrs|hour|hours)\s*(?:ago|before|earlier)/i, unitMinutes: 60, tolerance: 45 },
      { rx: /(\d{1,4})\s*মিনিট\s*আগে/, unitMinutes: 1, tolerance: 15 },
      { rx: /(\d{1,3})\s*(?:ঘণ্টা|ঘন্টা)\s*আগে/, unitMinutes: 60, tolerance: 45 },
      { rx: /(\d{1,4})\s*(?:minute|min)\s*age/i, unitMinutes: 1, tolerance: 15 }
    ];
    for (const p of patterns) {
      const m = text.match(p.rx);
      if (m) {
        const value = parseInt(m[1], 10);
        if (!Number.isNaN(value)) {
          return { minutesAgo: value * p.unitMinutes, toleranceMinutes: p.tolerance, span: m[0] };
        }
      }
    }
    return null;
  }

  /** 0 = today, -1 = yesterday. undefined when the complaint names no day. */
  private matchDayAnchor(text: string): number | undefined {
    if (/\b(yesterday)\b/i.test(text) || /গতকাল/.test(text) || /\b(gotokal|kalke|kal)\b/i.test(text)) return -1;
    if (/\b(today)\b/i.test(text) || /আজকে|আজ\b/.test(text) || /\b(ajke|aj|aaj)\b/i.test(text)) return 0;
    return undefined;
  }

  private matchClockTime(text: string): {
    hour: number;
    minute?: number;
    meridiem?: 'am' | 'pm';
    explicitMeridiem: boolean;
    span: string;
  } | null {
    // "14:08", "2:08 pm", "02.08pm"
    const hhmm = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*(am|pm)?\b/i);
    if (hhmm) {
      let hour = parseInt(hhmm[1], 10);
      const minute = parseInt(hhmm[2], 10);
      const meridiem = hhmm[3] ? (hhmm[3].toLowerCase() as 'am' | 'pm') : undefined;
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      return { hour, minute, meridiem, explicitMeridiem: Boolean(meridiem), span: hhmm[0] };
    }

    // "around 2 pm", "at 9 am"
    const hourMeridiem = text.match(/\b(?:around|about|approx\.?|at|near)?\s*(\d{1,2})\s*(am|pm)\b/i);
    if (hourMeridiem) {
      let hour = parseInt(hourMeridiem[1], 10);
      const meridiem = hourMeridiem[2].toLowerCase() as 'am' | 'pm';
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      return { hour, meridiem, explicitMeridiem: true, span: hourMeridiem[0].trim() };
    }

    // Bangla / Banglish "N টার দিকে", "N tar dike", "N ta'r somoy"
    const banglaHour = text.match(/(\d{1,2})\s*(?:টার|টায়|ta'?r|tar|tay|tar\s*)\s*(?:দিকে|সময়|dike|shomoy|somoy)?/i);
    if (banglaHour) {
      const hour = parseInt(banglaHour[1], 10);
      if (hour >= 0 && hour <= 23) {
        return { hour, explicitMeridiem: false, span: banglaHour[0].trim() };
      }
    }

    // Bare "around 2" / "about 9"
    const bare = text.match(/\b(?:around|about|approx\.?)\s*(\d{1,2})\b(?!\s*(?:k|hazar|হাজার|taka|টাকা|tk|bdt))/i);
    if (bare) {
      const hour = parseInt(bare[1], 10);
      if (hour >= 0 && hour <= 23) {
        return { hour, explicitMeridiem: false, span: bare[0].trim() };
      }
    }

    return null;
  }

  /**
   * Turn a stated hour into candidate wall-clock hours.
   * Primary first; any genuinely plausible alternative follows.
   */
  private resolveHourCandidates(
    clock: { hour: number; explicitMeridiem: boolean },
    daypart?: { startHour: number; endHour: number; pmBias: boolean }
  ): number[] {
    if (clock.explicitMeridiem || clock.hour >= 13) return [clock.hour];

    if (daypart) {
      // Pick the reading that falls inside the stated daypart.
      const pmReading = clock.hour === 12 ? 12 : clock.hour + 12;
      const amReading = clock.hour;
      const inDaypart = (h: number) => h >= daypart.startHour && h < daypart.endHour;
      if (inDaypart(pmReading) && !inDaypart(amReading)) return [pmReading];
      if (inDaypart(amReading) && !inDaypart(pmReading)) return [amReading];
      return daypart.pmBias ? [pmReading, amReading] : [amReading, pmReading];
    }

    // No daypart: hours 1-6 colloquially mean afternoon/evening in Bangladesh.
    // The AM reading is kept as a scored alternate rather than discarded.
    if (clock.hour >= 1 && clock.hour <= 6) return [clock.hour + 12, clock.hour];
    if (clock.hour >= 7 && clock.hour <= 11) return [clock.hour, clock.hour + 12];
    if (clock.hour === 12) return [12, 0];
    return [clock.hour];
  }

  /** Build a window centred on `centre`, widened by `toleranceMinutes` either side. */
  private windowAround(
    centre: Date,
    toleranceMinutes: number,
    precision: ClaimTimePrecision,
    span: string
  ): ClaimTimeWindow {
    return {
      start_ts: new Date(centre.getTime() - toleranceMinutes * 60_000).toISOString(),
      end_ts: new Date(centre.getTime() + toleranceMinutes * 60_000).toISOString(),
      precision,
      evidence_span: span
    };
  }

  /**
   * Compose an instant from a local wall-clock hour/minute on the day that is
   * `dayOffset` days from the reporting instant, in the given UTC offset.
   */
  private atWallClock(
    reference: Date,
    dayOffset: number,
    hour: number,
    minute: number,
    offsetMinutes: number
  ): Date {
    const localRef = new Date(reference.getTime() + offsetMinutes * 60_000);
    const y = localRef.getUTCFullYear();
    const m = localRef.getUTCMonth();
    const d = localRef.getUTCDate() + dayOffset;
    const localTarget = Date.UTC(y, m, d, hour, minute, 0, 0);
    return new Date(localTarget - offsetMinutes * 60_000);
  }
}

export const claimExtractor = new ClaimExtractor();
