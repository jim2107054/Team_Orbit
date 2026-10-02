import { ResponseSafetyReport, SafetyViolationCode } from '../../core/types.js';
import { SAFETY_VALIDATOR_VERSION } from '../../core/constants/investigation-policy.js';

/**
 * Response Safety Validator.
 *
 * Every customer-facing string produced by the investigation pipeline is scanned
 * here before it leaves the system. A response that fails validation is REJECTED
 * and replaced with a vetted safe template — it is never patched up and shipped.
 *
 * The hard prohibitions are:
 *   - requesting a PIN, OTP, password, or full card number
 *   - directing the customer to contact an unverified third party
 *   - promising a refund, reversal or account unblock the system cannot authorise
 *   - over-claiming AI certainty about fraud
 *
 * CRITICAL NUANCE: a safe response legitimately needs to SAY the words "PIN" and
 * "OTP" in order to warn the customer never to share them. The validator therefore
 * distinguishes a REQUEST from a WARNING, in English, Bangla and Banglish. A naive
 * keyword block would make it impossible to give correct safety advice.
 */

interface SafetyCheck {
  code: SafetyViolationCode;
  name: string;
  detail: string;
  /** Patterns that indicate the prohibited act. */
  violations: RegExp[];
  /**
   * Patterns that, when they cover the same sentence, show the mention is a
   * warning or a reassurance rather than the prohibited act.
   */
  exemptions: RegExp[];
}

/** Negation / warning framing that makes a credential mention safe. */
const CREDENTIAL_WARNING_FRAMES: RegExp[] = [
  // English
  /\bnever\s+(share|give|send|disclose|reveal|tell|provide|enter)\b/i,
  /\b(do\s*n[o']?t|don't|dont|do\s+not)\s+(share|give|send|disclose|reveal|tell|provide|enter)\b/i,
  /\bwill\s+never\s+ask\b/i,
  /\b(we|upay|our\s+(staff|team|agents?))\s+(will\s+)?never\s+(ask|request|need)\b/i,
  /\bno\s+(upay\s+)?(staff|agent|employee|representative)\s+(will\s+)?(ever\s+)?ask/i,
  /\bnot\s+(be\s+)?asked\s+(for|to\s+share)\b/i,
  /\bif\s+(anyone|someone|any\s+caller)\s+asks\b/i,
  /\bbeware\b/i,
  // Bangla
  /কাউকে\s*(কখনো\s*)?(দেবেন|দিবেন|বলবেন|শেয়ার\s*করবেন|জানাবেন)\s*না/,
  /(কখনো|কখনই)\s*(শেয়ার|প্রকাশ)\s*করবেন\s*না/,
  /(উপায়|আমরা|আমাদের\s*(কর্মী|প্রতিনিধি|টিম))\s*(কখনো|কখনই)\s*(চাইবে|চাইবো|চায়)\s*না/,
  /কেউ\s*(চাইলে|চাইলেও)/,
  /সতর্ক\s*(থাকুন|হোন)/,
  // Banglish
  /\b(karoke|karo\s*kache|kauke)\s+(kokhono\s+)?(diben|dibena|share\s*korben)\s*na\b/i,
  /\b(amra|upay)\s+(kokhono|kokhonoi)\s+(chaibo|chai)\s*na\b/i
];

const SAFETY_CHECKS: SafetyCheck[] = [
  {
    code: 'CREDENTIAL_REQUEST_PIN',
    name: 'pin_request',
    detail: 'The response must never ask the customer for their PIN.',
    violations: [
      /\b(share|send|give|provide|enter|type|confirm|tell\s+us|reply\s+with)\b[^.!?\n]{0,40}\b(pin|pin\s*code|pin\s*number)\b/i,
      /\b(pin|pin\s*code)\b[^.!?\n]{0,30}\b(share|send|give|provide|enter|type|confirm|needed|required)\b/i,
      /\b(what(?:'s| is)\s+your\s+pin)\b/i,
      /(পিন)\s*(টি\s*|নম্বর\s*|কোড\s*)?(দিন|দেন|পাঠান|বলুন|শেয়ার\s*করুন|জানান|লিখুন|প্রয়োজন)/,
      /\b(pin)\s*(ta|ti)?\s*(den|dien|pathan|bolun|share\s*korun)\b/i
    ],
    exemptions: CREDENTIAL_WARNING_FRAMES
  },
  {
    code: 'CREDENTIAL_REQUEST_OTP',
    name: 'otp_request',
    detail: 'The response must never ask the customer for an OTP or verification code.',
    violations: [
      /\b(share|send|give|provide|enter|type|confirm|tell\s+us|reply\s+with|forward)\b[^.!?\n]{0,40}\b(otp|o\.?t\.?p|one[\s-]*time\s*(password|code|pin)|verification\s*code|sms\s*code)\b/i,
      /\b(otp|one[\s-]*time\s*(password|code)|verification\s*code)\b[^.!?\n]{0,30}\b(share|send|give|provide|enter|type|confirm|needed|required)\b/i,
      /(ওটিপি|ভেরিফিকেশন\s*কোড|এসএমএস\s*কোড)\s*(টি\s*|কোড\s*)?(দিন|দেন|পাঠান|বলুন|শেয়ার\s*করুন|জানান|লিখুন|প্রয়োজন)/,
      /\b(otp|code)\s*(ta|ti)?\s*(den|dien|pathan|bolun|share\s*korun)\b/i
    ],
    exemptions: CREDENTIAL_WARNING_FRAMES
  },
  {
    code: 'CREDENTIAL_REQUEST_PASSWORD',
    name: 'password_request',
    detail: 'The response must never ask the customer for a password.',
    violations: [
      /\b(share|send|give|provide|enter|type|confirm|tell\s+us|reply\s+with)\b[^.!?\n]{0,40}\b(password|passcode|login\s*credentials?)\b/i,
      /\b(password|passcode)\b[^.!?\n]{0,30}\b(share|send|give|provide|confirm|needed|required)\b/i,
      /(পাসওয়ার্ড|পাসকোড)\s*(টি\s*)?(দিন|দেন|পাঠান|বলুন|শেয়ার\s*করুন|জানান|প্রয়োজন)/
    ],
    exemptions: CREDENTIAL_WARNING_FRAMES
  },
  {
    code: 'CREDENTIAL_REQUEST_CARD',
    name: 'card_number_request',
    detail: 'The response must never ask the customer for a full card number or CVV.',
    violations: [
      /\b(share|send|give|provide|enter|type|confirm)\b[^.!?\n]{0,40}\b(full\s+)?(card\s*number|debit\s*card|credit\s*card|cvv|cvc|card\s*details)\b/i,
      /\b(card\s*number|cvv|cvc)\b[^.!?\n]{0,30}\b(share|send|give|provide|confirm|needed|required)\b/i,
      /(কার্ড\s*(নম্বর|নাম্বার)|সিভিভি)\s*(টি\s*)?(দিন|দেন|পাঠান|বলুন|শেয়ার\s*করুন|প্রয়োজন)/
    ],
    exemptions: CREDENTIAL_WARNING_FRAMES
  },
  {
    code: 'THIRD_PARTY_CONTACT',
    name: 'third_party_contact',
    detail: 'The response must never direct the customer to an unverified third party, link or channel.',
    violations: [
      /\b(call|contact|whatsapp|message|text|dial|reach\s+out\s+to)\b[^.!?\n]{0,25}\b(01[3-9]\d{2}[-\s]?\d{6}|\+?8801[3-9]\d{8})\b/i,
      // ANY URL is a violation unless the sentence is covered by the allow-list
      // exemption below. A substring check such as "contains upay" is not safe: a
      // lookalike host like https://upay-verify.example.net would pass it.
      /https?:\/\/[^\s)]+/i,
      /\b(t\.me\/|bit\.ly\/|tinyurl|wa\.me\/)[^\s)]*/i,
      /\b[\w.-]+\.apk\b/i,
      /\b(telegram|whatsapp)\s*(group|channel|number)\b/i,
      /(এই\s*)?(নম্বরে|নাম্বারে)\s*(কল|ফোন|যোগাযোগ)\s*(করুন|করবেন|কর)/,
      /(টেলিগ্রাম|হোয়াটসঅ্যাপ)\s*(গ্রুপ|চ্যানেল|নম্বর)/
    ],
    exemptions: [
      // Allow-list: the official short code, the app by name, and exact upay hosts.
      // Hosts are anchored on the registrable domain so lookalikes do not match.
      /https?:\/\/(?:[a-z0-9-]+\.)*upay\.com\.bd(?:[/?#]|\b)/i,
      /\b(16268|\*268#|upay\s*app|official\s+upay\s+(app|helpline|hotline))\b/i,
      /(১৬২৬৮|উপায়\s*অ্যাপ|অফিসিয়াল\s*উপায়)/,
      /\bnever\s+(call|contact|click|install|join)\b/i,
      /\b(do\s*n[o']?t|don't|dont)\s+(call|contact|click|install|join)\b/i,
      /(কল|ক্লিক|ইনস্টল)\s*করবেন\s*না/
    ]
  },
  {
    code: 'UNAUTHORIZED_REFUND_PROMISE',
    name: 'refund_promise',
    detail: 'The response must never promise a refund the investigation has not authorised.',
    violations: [
      /\b(you\s+will\s+(get|receive)|we\s+will\s+(refund|return|credit|pay)|will\s+be\s+refunded|guaranteed\s+refund|refund\s+is\s+(confirmed|approved|guaranteed)|your\s+money\s+will\s+be\s+returned)\b/i,
      /\b(100%|fully|definitely|certainly)\s+(refund|recovered|returned)\b/i,
      /(টাকা\s*(ফেরত|ফিরিয়ে)\s*(পাবেন|দেওয়া\s*হবে|দিব|দেব))/,
      /(রিফান্ড\s*(নিশ্চিত|অনুমোদিত|গ্যারান্টেড))/
    ],
    exemptions: [
      /\b(may|might|could|cannot\s+be\s+guaranteed|is\s+not\s+guaranteed|subject\s+to|if\s+(the\s+)?(funds|review|investigation))\b/i,
      /\b(we\s+cannot\s+(guarantee|promise))\b/i,
      /(নিশ্চয়তা\s*দেওয়া\s*যাচ্ছে\s*না|সম্ভাবনা\s*রয়েছে|পর্যালোচনার\s*ওপর\s*নির্ভর)/
    ]
  },
  {
    code: 'UNAUTHORIZED_REVERSAL_PROMISE',
    name: 'reversal_promise',
    detail: 'The response must never promise a transaction reversal the investigation has not authorised.',
    violations: [
      /\b(we\s+(have\s+)?(reversed|will\s+reverse)|transaction\s+(has\s+been|will\s+be)\s+reversed|reversal\s+(is\s+)?(done|confirmed|approved|complete))\b/i,
      /(লেনদেন\s*(বাতিল|রিভার্স)\s*(করা\s*হয়েছে|করে\s*দেব|হবে))/
    ],
    exemptions: [
      /\b(cannot|can\s*not|may\s+not|is\s+not\s+always|not\s+guaranteed|request(ed)?\s+for\s+review)\b/i,
      /(সম্ভব\s*নয়|নিশ্চয়তা\s*নেই)/
    ]
  },
  {
    code: 'UNAUTHORIZED_UNBLOCK_PROMISE',
    name: 'unblock_promise',
    detail: 'The response must never promise that an account or wallet will be unblocked.',
    violations: [
      /\b(we\s+(have\s+)?(unblocked|will\s+unblock)|account\s+(has\s+been|will\s+be)\s+(unblocked|reactivated|restored)|block\s+(has\s+been|will\s+be)\s+(removed|lifted))\b/i,
      /(অ্যাকাউন্ট|একাউন্ট)\s*(খুলে\s*দেব|সচল\s*করে\s*দেব|আনব্লক\s*(করা\s*হয়েছে|করে\s*দেব))/
    ],
    exemptions: [
      /\b(cannot|can\s*not|only\s+after|subject\s+to|pending\s+review)\b/i,
      /(সম্ভব\s*নয়|পর্যালোচনার\s*পর)/
    ]
  },
  {
    code: 'OVERCLAIMED_AI_CERTAINTY',
    name: 'ai_overclaim',
    detail: 'The response must not assert AI-determined certainty about fraud.',
    violations: [
      /\b(ai|the\s+system|our\s+model|the\s+algorithm)\s+(knows|has\s+(determined|confirmed|proven)|confirms|proves)\s+[^.!?\n]{0,30}\bfraud\b/i,
      /\b(this|it)\s+is\s+(definitely|certainly|100%)\s+(a\s+)?(fraud|scam)\b/i,
      /\b(we\s+have\s+)?(confirmed|proven)\s+(that\s+)?(you|this)\s+(were|was|is)\s+(defrauded|scammed)\b/i,
      /(এআই|সিস্টেম)\s*(নিশ্চিত\s*করেছে|প্রমাণ\s*করেছে)\s*(যে\s*)?(এটি\s*)?(প্রতারণা|জালিয়াতি)/
    ],
    exemptions: [
      /\b(evidence\s+(indicates|suggests|is\s+consistent|does\s+not|is\s+insufficient))\b/i,
      /\b(under\s+review|being\s+reviewed|may\s+be|appears|possible)\b/i,
      /(তথ্য\s*(ইঙ্গিত|অনুযায়ী)|পর্যালোচনাধীন)/
    ]
  }
];

/** Split into sentence-ish units so an exemption in one sentence cannot excuse another. */
function splitUnits(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export class ResponseSafetyValidator {
  /**
   * Validate one or more customer-facing strings.
   * All supplied fragments are checked independently and the report is combined.
   */
  validate(fragments: Array<string | undefined | null>): ResponseSafetyReport {
    const violations: ResponseSafetyReport['violations'] = [];
    const checksRun = SAFETY_CHECKS.map(c => c.name);

    const texts = fragments.filter((f): f is string => typeof f === 'string' && f.trim().length > 0);

    for (const text of texts) {
      for (const unit of splitUnits(text)) {
        for (const check of SAFETY_CHECKS) {
          // A warning/reassurance frame in the SAME sentence makes the mention safe.
          const exempt = check.exemptions.some(rx => rx.test(unit));
          if (exempt) continue;

          for (const rx of check.violations) {
            const m = unit.match(rx);
            if (m) {
              const already = violations.some(v => v.code === check.code && v.matched_span === m[0]);
              if (!already) {
                violations.push({
                  code: check.code,
                  matched_span: m[0].slice(0, 160),
                  detail: check.detail
                });
              }
              break;
            }
          }
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      checks_run: checksRun,
      validator_version: SAFETY_VALIDATOR_VERSION
    };
  }
}

export const responseSafetyValidator = new ResponseSafetyValidator();
