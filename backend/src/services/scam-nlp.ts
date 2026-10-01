import { TypologyId } from '../core/types.js';

export interface ScamCheckResult {
  verdict: 'LIKELY_SCAM' | 'SUSPICIOUS' | 'LOOKS_OK';
  confidence: number;
  typology_matched?: TypologyId;
  matched_reasons_en: string[];
  matched_reasons_bn: string[];
  highlighted_phrases: string[];
  advice_en: string;
  advice_bn: string;
  extracted_numbers: string[];
  is_injection_attempt: boolean;
}

export class ScamNLPService {
  // Regex patterns for prompt injection attempts (RAI-04)
  private injectionPatterns = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /disregard the above/i,
    /you are now a/i,
    /drop table/i,
    /<script>/i
  ];

  // Pattern categories for Bangla, English, and Banglish scam triggers
  private scamSignatures: Array<{
    typology: TypologyId;
    keywords: string[];
    reason_en: string;
    reason_bn: string;
    weight: number;
  }> = [
    {
      typology: 'T1_EMERGENCY_IMPERSONATION',
      keywords: [
        'hospital', 'accident', 'police', 'arrest', 'bail', 'bidesh', 'emergency',
        'হাসপাতাল', 'দুর্ঘটনা', 'পুলিশ', 'আটক', 'জরুরি', 'বিপদ', 'অসুস্থ', 'টাকা পাঠাও'
      ],
      reason_en: 'Emergency medical or official distress claim demanding urgent money',
      reason_bn: 'জরুরি বিপদ, হাসপাতাল বা পুলিশি আটকের কথা বলে তাৎক্ষণিক টাকা চাওয়া',
      weight: 0.85
    },
    {
      typology: 'T2_ATO_DRAIN',
      keywords: [
        'otp', 'pin', 'verification code', 'upay customer care', 'account blocked',
        'ওটিপি', 'পিন', 'কোড', 'উপায় হেল্পলাইন', 'অ্যাকাউন্ট বন্ধ', 'ভেরিফাই'
      ],
      reason_en: 'Request for secret OTP / PIN or fake account block threat',
      reason_bn: 'গোপন পিন বা ওটিপি চাওয়া কিংবা অ্যাকাউন্ট বন্ধের ভুয়া হুমকি',
      weight: 0.95
    },
    {
      typology: 'T3_REFUND_MISTAKE',
      keywords: [
        'mistake', 'wrong number', 'sent by mistake', 'refund', 'return money',
        'ভুল করে', 'টাকা চলে গেছে', 'ফেরত দিন', 'ভুল নম্বর', 'টাকা ব্যাক'
      ],
      reason_en: 'Fake accidental transfer refund request',
      reason_bn: 'ভুল করে টাকা আসার ভুয়া দাবি ও ফেরত পাঠানোর চাপ',
      weight: 0.75
    },
    {
      typology: 'T4_PRIZE_LOTTERY',
      keywords: [
        'lottery', 'winner', 'won prize', 'congratulations', 'gift', 'processing fee',
        'লটারি', 'জিতেছেন', 'পুরস্কার', 'উপহার', 'অভিনন্দন', 'রেজিস্ট্রেশন ফি'
      ],
      reason_en: 'Prize/Lottery claim requesting advance fee/tax',
      reason_bn: 'লটারি বা পুরস্কারের কথা বলে অগ্রিম ফি দাবি',
      weight: 0.90
    },
    {
      typology: 'T6_STAGED_INVESTMENT',
      keywords: [
        'invest', 'double money', 'daily profit', 'task income', 'telegram group', 'crypto',
        'বিনিয়োগ', 'দ্বিগুণ লাভ', 'দৈনিক আয়', 'টাস্ক পূরণ', 'টেলিগ্রাম', 'ঘরে বসে আয়'
      ],
      reason_en: 'High-yield investment or task-income scheme',
      reason_bn: 'অস্বাভাবিক বেশি লাভের প্রলোভন ও টাস্ক ইনকামের প্রতারণা',
      weight: 0.80
    }
  ];

  analyzeText(rawText: string): ScamCheckResult {
    // 1. Untrusted tagging & Prompt injection defense (RAI-04, FR-M6-06)
    const sanitized = rawText.trim();
    let isInjection = false;
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(sanitized)) {
        isInjection = true;
        break;
      }
    }

    if (isInjection) {
      return {
        verdict: 'LIKELY_SCAM',
        confidence: 0.99,
        matched_reasons_en: ['Adversarial prompt injection pattern detected in text'],
        matched_reasons_bn: ['বার্তায় ক্ষতিকর নির্দেশাবলী বা আক্রমণমূলক প্যাটার্ন শনাক্ত হয়েছে'],
        highlighted_phrases: ['[SECURITY TRIGGER DETECTED]'],
        advice_en: 'Do not interact with this sender. This message has malicious intent.',
        advice_bn: 'এই প্রেরকের সাথে কোনো লেনদেন করবেন না। এটি ক্ষতিকর উদ্দেশ্যে পাঠানো।',
        extracted_numbers: [],
        is_injection_attempt: true
      };
    }

    // 2. Extract phone numbers / wallet patterns
    const numberMatches = sanitized.match(/(?:\+?880|0)?1[3-9]\d{8}/g) || [];
    const extractedNumbers = Array.from(new Set(numberMatches));

    // 3. Match scam signatures
    const lower = sanitized.toLowerCase();
    const matchedPhrases: string[] = [];
    const matchedReasonsEn: string[] = [];
    const matchedReasonsBn: string[] = [];
    let topScore = 0.0;
    let topTypology: TypologyId | undefined;

    for (const sig of this.scamSignatures) {
      let hits = 0;
      for (const kw of sig.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          hits++;
          matchedPhrases.push(kw);
        }
      }

      if (hits > 0) {
        const score = Math.min(0.98, sig.weight + (hits - 1) * 0.05);
        if (score > topScore) {
          topScore = score;
          topTypology = sig.typology;
        }
        matchedReasonsEn.push(sig.reason_en);
        matchedReasonsBn.push(sig.reason_bn);
      }
    }

    // 4. Determine Verdict
    let verdict: 'LIKELY_SCAM' | 'SUSPICIOUS' | 'LOOKS_OK' = 'LOOKS_OK';
    let adviceEn = 'This text does not contain common known scam triggers. Always exercise standard caution.';
    let adviceBn = 'এই বার্তায় পরিচিত কোনো প্রতারণার লক্ষণ পাওয়া যায়নি। সাধারণ সতর্কতা বজায় রাখুন।';

    if (topScore >= 0.75) {
      verdict = 'LIKELY_SCAM';
      adviceEn = 'Do not send money or share any PIN/OTP. Call the person directly on a known trusted phone number.';
      adviceBn = 'টাকা পাঠাবেন না বা কোনো পিন/ওটিপি শেয়ার করবেন না। ওই ব্যক্তির পূর্বপরিচিত নম্বরে ফোন করে যাচাই করুন।';
    } else if (topScore >= 0.35 || matchedPhrases.length > 0) {
      verdict = 'SUSPICIOUS';
      adviceEn = 'Contains urgency or unverified claims. Please verify independently before taking action.';
      adviceBn = 'বার্তায় তাড়াহুড়া বা সন্দেহজনক দাবি রয়েছে। নিশ্চিত হওয়ার আগে কোনো টাকা পাঠাবেন না।';
    }

    return {
      verdict,
      confidence: topScore > 0 ? Number(topScore.toFixed(2)) : 0.15,
      typology_matched: topTypology,
      matched_reasons_en: Array.from(new Set(matchedReasonsEn)),
      matched_reasons_bn: Array.from(new Set(matchedReasonsBn)),
      highlighted_phrases: Array.from(new Set(matchedPhrases)),
      advice_en: adviceEn,
      advice_bn: adviceBn,
      extracted_numbers: extractedNumbers,
      is_injection_attempt: false
    };
  }
}

export const scamNLP = new ScamNLPService();
