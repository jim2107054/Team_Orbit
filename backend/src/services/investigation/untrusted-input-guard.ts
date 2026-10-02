/**
 * Untrusted Input Guard (RAI-04 extension for the investigation pipeline).
 *
 * Customer complaint text is UNTRUSTED DATA. It is never concatenated into a
 * privileged instruction, and it can never change a policy outcome. This guard:
 *
 *   1. detects instruction-injection patterns in English, Bangla and Banglish;
 *   2. neutralises the matched spans so downstream extractors cannot read them
 *      as directives (the raw text is still retained verbatim for audit);
 *   3. reports the attempt so the investigation escalates for human review
 *      instead of silently absorbing it.
 *
 * The complaint is NOT rejected on detection — a genuine victim may paste a
 * scammer's script that happens to contain such phrases. The investigation
 * continues with the sanitised text and the attempt recorded.
 *
 * This complements (and does not replace) `conversation-scam-intelligence`'s
 * injection patterns, which guard the Scam Check path.
 */

export interface InjectionPattern {
  id: string;
  /** Short description of the manipulation being attempted. */
  intent: string;
  pattern: RegExp;
}

export interface UntrustedInputResult {
  /** Text with injection spans replaced by an inert marker. */
  sanitized_text: string;
  injection_detected: boolean;
  /** Pattern ids that fired, for audit and metrics. */
  patterns_matched: string[];
  /** Verbatim spans that were neutralised, for investigator display. */
  neutralised_spans: string[];
}

const INERT_MARKER = ' [REDACTED_EMBEDDED_INSTRUCTION] ';

/**
 * Patterns are intentionally span-scoped (they match the directive, not the whole
 * complaint) so that neutralisation removes the instruction and keeps the victim's
 * actual account of events intact.
 */
export const INJECTION_PATTERNS: InjectionPattern[] = [
  // ─── Instruction override (EN) ───────────────────────────────────────────
  {
    id: 'INJ_IGNORE_INSTRUCTIONS',
    intent: 'Override prior instructions',
    pattern: /\b(ignore|disregard|forget)\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|messages?)/gi
  },
  {
    id: 'INJ_ROLE_REASSIGNMENT',
    intent: 'Reassign the assistant role / privilege escalation',
    pattern: /\byou\s+are\s+now\s+(an?\s+)?(admin|administrator|developer|supervisor|root|system|the\s+admin)/gi
  },
  {
    id: 'INJ_ADMIN_MODE',
    intent: 'Claim elevated mode',
    pattern: /\b(admin|developer|debug|god|jailbreak)\s*mode\b/gi
  },
  {
    id: 'INJ_REVEAL_SYSTEM_PROMPT',
    intent: 'Exfiltrate system prompt or internal rules',
    pattern: /\b(reveal|show|print|output|repeat|disclose|tell\s+me)\s+(me\s+)?(your\s+|the\s+)?(system\s*prompt|internal\s+(fraud\s+)?rules?|instructions?|guidelines?|prompt|configuration|risk\s+(rules?|thresholds?))/gi
  },
  {
    id: 'INJ_FORCE_SAFE_VERDICT',
    intent: 'Force a favourable fraud determination',
    // The filler group allows "mark IT as safe" / "flag THAT ONE as clean", which a
    // noun-only pattern missed.
    pattern: /\b(mark|set|flag|treat|classify|declare)\s+(it|this|that|the)?\s*(one|transaction|txn|case|account|complaint|incident)?\s*(as\s+)?(safe|clean|legitimate|not\s+fraud|low\s*risk|verified|resolved)/gi
  },
  {
    id: 'INJ_OVERRIDE_SCORE',
    intent: 'Directly set risk score or policy decision',
    pattern: /\b(override|bypass|skip|set|force)\s+(the\s+)?(risk[_\s]*(score|engine|check)?|policy|decision|verdict|review|kyc|limit)s?\b/gi
  },
  {
    id: 'INJ_ASSIGN_RISK_VALUE',
    intent: 'Assign a literal risk value',
    pattern: /\b(risk[_\s]*score|risk[_\s]*level|fraud[_\s]*risk)\s*(=|:|is|to)\s*(0|zero|low|none|safe)/gi
  },
  {
    id: 'INJ_DEMAND_CREDENTIAL_PROMPT',
    intent: 'Make the system solicit credentials from a customer',
    pattern: /\b(ask|request|prompt|tell)\s+(the\s+)?(customer|user|victim|client|me)\s+(for|to\s+(share|give|send|provide))\s+(the\s+|their\s+|my\s+)?(otp|pin|password|cvv|card\s*number|passcode|one[\s-]*time)/gi
  },
  {
    id: 'INJ_FORCE_REFUND',
    intent: 'Force an unauthorised financial action',
    pattern: /\b(confirm|approve|process|issue|authorise|authorize|guarantee)\s+(the\s+|my\s+|a\s+)?(refund|reversal|chargeback|payout|unblock)\s*(immediately|now|right\s+now)?/gi
  },
  {
    id: 'INJ_CODE_OR_SQL',
    intent: 'Code / SQL / markup injection',
    pattern: /(<script[\s\S]*?>|drop\s+table\s+\w+|;\s*delete\s+from\s+\w+|eval\s*\(|\{\{[\s\S]*?\}\})/gi
  },
  {
    id: 'INJ_FAKE_SYSTEM_TURN',
    intent: 'Forge a system/assistant turn inside user content',
    pattern: /^\s*(system|assistant|developer)\s*:/gim
  },

  // ─── Instruction override (Bangla) ───────────────────────────────────────
  {
    id: 'INJ_BN_IGNORE_INSTRUCTIONS',
    intent: 'Override prior instructions (Bangla)',
    pattern: /(আগের|পূর্বের|সব)\s*(সব\s*)?(নির্দেশ|নির্দেশনা|ইনস্ট্রাকশন)\s*(গুলো\s*)?(বাতিল|উপেক্ষা|ভুলে\s*যাও|ভুলে\s*যান|মানবেন\s*না)/g
  },
  {
    id: 'INJ_BN_FORCE_SAFE_VERDICT',
    intent: 'Force a favourable fraud determination (Bangla)',
    pattern: /(এই\s*)?(লেনদেন|ট্রানজেকশন|অ্যাকাউন্ট|কেস)\s*(টি\s*|টা\s*)?(নিরাপদ|সেইফ|ঠিক\s*আছে|ভালো)\s*(হিসেবে\s*)?(চিহ্নিত|মার্ক|ধরে)\s*(কর|করুন|করো|নাও)/g
  },
  {
    id: 'INJ_BN_DEMAND_CREDENTIAL_PROMPT',
    intent: 'Make the system solicit credentials (Bangla)',
    pattern: /(গ্রাহকের?|ব্যবহারকারীর?|আমার)\s*(কাছে\s*)?(থেকে\s*)?(ওটিপি|পিন|পাসওয়ার্ড|কোড)\s*(চাও|চান|চাইতে\s*বল|জিজ্ঞেস\s*কর)/g
  },
  {
    id: 'INJ_BN_REVEAL_RULES',
    intent: 'Exfiltrate internal rules (Bangla)',
    pattern: /(সিস্টেম\s*প্রম্পট|অভ্যন্তরীণ\s*(নিয়ম|রুল)|ফ্রড\s*রুল)\s*(গুলো\s*)?(দেখাও|বল|প্রকাশ\s*কর|জানাও)/g
  },
  {
    id: 'INJ_BN_FORCE_REFUND',
    intent: 'Force an unauthorised refund (Bangla)',
    pattern: /(রিফান্ড|ফেরত|টাকা\s*ফেরত|রিভার্সাল)\s*(এখনই\s*|তাৎক্ষণিক\s*)?(নিশ্চিত|অনুমোদন|কনফার্ম|approve)\s*(কর|করুন|করো)/g
  },

  // ─── Instruction override (Banglish) ─────────────────────────────────────
  {
    id: 'INJ_BANGLISH_IGNORE_INSTRUCTIONS',
    intent: 'Override prior instructions (Banglish)',
    pattern: /\b(ager|puber|sob)\s+(sob\s+)?(nirdesh|instruction)(gulo)?\s+(batil|bad\s*dao|vule\s*jao|manbe\s*na)/gi
  },
  {
    id: 'INJ_BANGLISH_FORCE_SAFE_VERDICT',
    intent: 'Force a favourable fraud determination (Banglish)',
    pattern: /\b(ei\s+)?(transaction|lenden|txn|account|case)\s*(ta|ti)?\s+(safe|nirapod|thik\s*ache)\s+(hisebe\s+)?(mark|chihnito)\s*(koro|korun|kor)/gi
  },
  {
    id: 'INJ_BANGLISH_DEMAND_CREDENTIAL_PROMPT',
    intent: 'Make the system solicit credentials (Banglish)',
    pattern: /\b(amake|customer\s*ke|user\s*ke|grahok\s*ke)\s+(otp|pin|password|code)\s*(ta|ti)?\s*(chao|chaw|chan|jiggesh\s*koro|ask)/gi
  },
  {
    id: 'INJ_BANGLISH_ADMIN_CLAIM',
    intent: 'Claim elevated privilege (Banglish)',
    pattern: /\b(ami|tumi|apni)\s+(ekhon\s+)?(admin|administrator|system)\s*(hoiche|hoyeche|hocche|ho)/gi
  }
];

export class UntrustedInputGuard {
  /**
   * Inspect and neutralise untrusted customer text.
   * Returns the sanitised text that downstream extraction is allowed to read.
   */
  inspect(rawText: string): UntrustedInputResult {
    if (!rawText || typeof rawText !== 'string') {
      return {
        sanitized_text: '',
        injection_detected: false,
        patterns_matched: [],
        neutralised_spans: []
      };
    }

    const matchedIds: string[] = [];
    const spans: string[] = [];
    let working = rawText;

    for (const def of INJECTION_PATTERNS) {
      // Fresh regex per pass so lastIndex from the global flag never leaks between calls.
      const rx = new RegExp(def.pattern.source, def.pattern.flags);
      const found = working.match(rx);
      if (found && found.length > 0) {
        matchedIds.push(def.id);
        for (const span of found) {
          const trimmed = span.trim();
          if (trimmed && !spans.includes(trimmed)) spans.push(trimmed);
        }
        working = working.replace(new RegExp(def.pattern.source, def.pattern.flags), INERT_MARKER);
      }
    }

    // Collapse repeated markers and whitespace introduced by redaction.
    const sanitized = working
      .replace(/(\s*\[REDACTED_EMBEDDED_INSTRUCTION\]\s*)+/g, INERT_MARKER)
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    return {
      sanitized_text: sanitized,
      injection_detected: matchedIds.length > 0,
      patterns_matched: matchedIds,
      neutralised_spans: spans
    };
  }

  /**
   * Wrap untrusted content for any downstream consumer that renders or forwards it
   * (including a future LLM explanation step). The delimiters make the data/instruction
   * boundary explicit; the content is never interpolated into a privileged string.
   */
  isolate(label: string, untrustedText: string): string {
    const safeLabel = label.replace(/[^A-Za-z0-9_\- ]/g, '');
    return [
      `<<<UNTRUSTED_${safeLabel.toUpperCase().replace(/\s+/g, '_')}_BEGIN>>>`,
      untrustedText,
      `<<<UNTRUSTED_${safeLabel.toUpperCase().replace(/\s+/g, '_')}_END>>>`
    ].join('\n');
  }
}

export const untrustedInputGuard = new UntrustedInputGuard();
