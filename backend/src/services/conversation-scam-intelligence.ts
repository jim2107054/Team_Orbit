import { 
  TypologyId, SignalCode, SignalExtractionResult, 
  ConversationTurn, ExtractedEntities, CampaignLinkingResult, 
  ConversationRiskProfile 
} from '../core/types.js';
import { TYPOLOGY_META, BANGLISH_NORMALIZATION_MAP } from '../core/constants.js';
import { repository } from '../db/repository.js';
import { analyzeConversationWithLlm, mergeWithRules } from './llm/scam-analysis.js';
import { retrievalService } from './rag/retrieval-service.js';

interface SignalDefinition {
  code: SignalCode;
  name: string;
  weight: number;
  banglaKeywords: string[];
  banglishPatterns: RegExp[];
  englishKeywords: string[];
  semanticRegexes: RegExp[];
}

export class ConversationScamIntelligenceService {
  // In-memory active session cache to link recent Scam Check analyses to upcoming transactions
  private analyzedEntitiesCache = new Map<string, {
    riskScore: number;
    typology: TypologyId;
    timestamp: number;
    signals: string[];
  }>();

  // Prompt injection security patterns (RAI-04 / Untrusted Input Guard)
  private injectionPatterns: RegExp[] = [
    /ignore (all )?(previous|prior) instructions/i,
    /system prompt/i,
    /disregard (the above|all)/i,
    /you are now (an?|a developer|in jailbreak)/i,
    /drop\s+table/i,
    /<script[\s\S]*?>/i,
    /override (risk|policy|decision)/i,
    /admin\s+mode/i,
    /set\s+risk_score\s*=/i,
    /eval\s*\(/i
  ];

  // Structured Social Engineering & Threat Signals
  private signalDefinitions: SignalDefinition[] = [
    {
      code: 'SIG_URGENCY',
      name: 'Time Pressure & Urgent Action',
      weight: 0.75,
      banglaKeywords: ['এখনই', 'দ্রুত', 'তাড়াতাড়ি', 'জরুরি', '১০ মিনিটের মধ্যে', 'দেরি করলে', 'দেরি হলে', 'অবিলম্বে'],
      banglishPatterns: [/\bekhon(i)?\b/i, /\bdruto\b/i, /\btaratari\b/i, /\burgent(ly)?\b/i, /\bemergency\b/i, /\bimmediate(ly)?\b/i],
      englishKeywords: ['immediately', 'right now', 'within 10 minutes', 'hurry', 'urgent', 'asap', 'fast'],
      semanticRegexes: [/(এখনই|urgent|immediately|quick|within\s+\d+\s+(min|minute|hour))/i]
    },
    {
      code: 'SIG_SECRECY',
      name: 'Secrecy & Isolation Request',
      weight: 0.80,
      banglaKeywords: ['কাউকে বলবেন না', 'গোপন রাখুন', 'কাউকে জানাবেন না', 'পরিবারকে বলবেন না', 'ফোন কাটবেন না', 'লাইনে থাকুন'],
      banglishPatterns: [/\bkaoke bolben na\b/i, /\bgopon\b/i, /\bphone katben na\b/i, /\bline e thakun\b/i, /\bdont tell\b/i],
      englishKeywords: ['do not tell anyone', 'keep it secret', 'stay on the line', 'do not hang up', 'confidential'],
      semanticRegexes: [/(কাউকে (বলবেন|জানাবেন) না|secret|confidential|do not (tell|share|hang up)|stay on (the )?line)/i]
    },
    {
      code: 'SIG_AUTHORITY_IMPERSONATION',
      name: 'Authority / Official Impersonation',
      weight: 0.85,
      banglaKeywords: ['কাস্টমার কেয়ার', 'হেড অফিস', 'বাংলাদেশ ব্যাংক', 'পুলিশ হেডকোয়ার্টার', 'ডিবি পুলিশ', 'র‍্যাব', 'আদালত', 'ম্যাজিস্ট্রেট', 'উপায় অফিসার'],
      banglishPatterns: [/\bcustomer care\b/i, /\bhead office\b/i, /\bbangladesh bank\b/i, /\bpolice\b/i, /\bdb\b/i, /\brab\b/i, /\bofficer\b/i],
      englishKeywords: ['customer care', 'head office', 'bangladesh bank', 'police department', 'investigation officer', 'upay support'],
      semanticRegexes: [/(কাস্টমার কেয়ার|head office|police|official|bank authority|helpdesk|support team)/i]
    },
    {
      code: 'SIG_CUSTOMER_CARE_IMPERSONATION',
      name: 'Customer Care Helpline Spoofing',
      weight: 0.90,
      banglaKeywords: ['কাস্টমার কেয়ার থেকে বলছি', 'উপায় হেল্পলাইন থেকে', 'সার্ভার আপডেট', 'অ্যাকাউন্ট ভেরিফিকেশন টিম', 'সিকিউরিটি ডিপার্টমেন্ট'],
      banglishPatterns: [/\bcustomer care theke\b/i, /\bupay helpline theke\b/i, /\bserver update\b/i, /\bsecurity department\b/i],
      englishKeywords: ['calling from customer care', 'upay helpline', 'verification team', 'security division'],
      semanticRegexes: [/(customer care theke|calling from (upay|customer care)|উপায় হেল্পলাইন|কাস্টমার কেয়ার থেকে)/i]
    },
    {
      code: 'SIG_FEAR_THREAT',
      name: 'Threat & Fear Induction',
      weight: 0.85,
      banglaKeywords: ['মামলা হবে', 'গ্রেফতার করা হবে', 'পুলিশ পাঠাবো', 'আদালতে চালান', 'আইনি ব্যবস্থা', 'জরিমানা হবে'],
      banglishPatterns: [/\bmamla\b/i, /\bgreftar\b/i, /\barrest\b/i, /\bpolice pathabo\b/i, /\blegal action\b/i],
      englishKeywords: ['arrest warrant', 'police case', 'legal action', 'court order', 'penalty'],
      semanticRegexes: [/(মামলা|গ্রেফতার|arrest|lawsuit|legal action|police will arrive)/i]
    },
    {
      code: 'SIG_ACCOUNT_SUSPENSION',
      name: 'Account / SIM Suspension Threat',
      weight: 0.90,
      banglaKeywords: ['অ্যাকাউন্ট বন্ধ হয়ে যাবে', 'একাউন্ট ব্লক হবে', 'সিম বন্ধ হয়ে যাবে', 'লেনদেন বন্ধ হবে', 'স্থগিত করা হবে', 'বাতিল করা হবে'],
      banglishPatterns: [/\baccount bondho\b/i, /\bblock hoye jabe\b/i, /\bsim bondho\b/i, /\bsuspend\b/i, /\bdeactivated?\b/i],
      englishKeywords: ['account will be blocked', 'account suspended', 'sim will be deactivated', 'permanent closure'],
      semanticRegexes: [/(account (bondho|block|closed|suspended)|একাউন্ট বন্ধ|সিম বন্ধ|wallet blocked)/i]
    },
    {
      code: 'SIG_PIN_REQUEST',
      name: 'Secret PIN Request',
      weight: 0.98,
      banglaKeywords: ['পিন নম্বর দিন', 'পিন বলুন', 'গোপন পিন', 'আপনার পিন', 'পিন কোড'],
      banglishPatterns: [/\bpin\s*(ta)?\s*(den|bolen|bolun|pathan|din)\b/i, /\bapnar\s*pin\b/i, /\bgopon\s*pin\b/i],
      englishKeywords: ['give your pin', 'share pin', 'enter secret pin', 'provide your pin code'],
      semanticRegexes: [/(pin\s*(den|bolen|din|code|number)|পিন (দিন|বলুন|কোড))/i]
    },
    {
      code: 'SIG_OTP_REQUEST',
      name: 'One-Time-Password (OTP) Harvesting',
      weight: 0.98,
      banglaKeywords: ['ওটিপি দিন', 'ওটিপি কোড বলুন', 'ফোনে আসা কোড', 'এসএমএস কোড', '৪ ডিজিটের কোড', '৬ ডিজিটের ওটিপি'],
      banglishPatterns: [/\botp\s*(ta)?\s*(den|bolen|bolun|pathan|din)\b/i, /\bcode\s*ta\s*bolen\b/i, /\bsms\s*code\b/i, /\bdigit\s*code\b/i],
      englishKeywords: ['share the otp', 'give me the otp', 'read the 4-digit code', 'sms verification code', 'received code'],
      semanticRegexes: [/(otp|o\.t\.p|ওটিপি|code\s*(den|bolen|din)|sms code|\d{4,6}\s*code)/i]
    },
    {
      code: 'SIG_PASSWORD_REQUEST',
      name: 'Password / Credential Request',
      weight: 0.95,
      banglaKeywords: ['পাসওয়ার্ড দিন', 'লগইন পাসওয়ার্ড', 'পাসওয়ার্ড বলুন'],
      banglishPatterns: [/\bpass(word)?\s*(den|bolen|din)\b/i, /\blogin\s*password\b/i],
      englishKeywords: ['give password', 'tell me password', 'login credential'],
      semanticRegexes: [/(pass(word)?\s*(den|bolen|din|share)|পাসওয়ার্ড)/i]
    },
    {
      code: 'SIG_VERIFICATION_REQUEST',
      name: 'Account Verification Coercion',
      weight: 0.80,
      banglaKeywords: ['অ্যাকাউন্ট ভেরিফাই করতে হবে', 'কেওয়াইসি আপডেট', 'বায়োমেট্রিক নবায়ন', 'ভেরিফিকেশন সম্পন্ন করুন'],
      banglishPatterns: [/\baccount\s*verify\b/i, /\bkyc\s*update\b/i, /\bverify\s*koren\b/i, /\bbiometric\b/i],
      englishKeywords: ['verify account', 'kyc update', 're-verify identity', 'biometric update'],
      semanticRegexes: [/(account\s*verify|ভেরিফাই|kyc update|verify koren)/i]
    },
    {
      code: 'SIG_MONEY_TRANSFER_REQUEST',
      name: 'Direct Money Transfer Demand',
      weight: 0.88,
      banglaKeywords: ['টাকা পাঠান', 'টাকা দিন', 'টাকা সেন্ড করুন', 'ক্যাশ ইন করুন', 'নম্বরে টাকা দিন', 'টাকা পাঠাতে হবে', 'পাঠান'],
      banglishPatterns: [/\btaka\s*(ta)?\s*(pathan|den|din|send\s*koren)\b/i, /\bcash\s*in\s*koren\b/i, /\btransfer\s*koren\b/i, /\btaka[\s\S]{0,30}pathan\b/i],
      englishKeywords: ['send money now', 'transfer funds', 'deposit money', 'cash in to this number'],
      semanticRegexes: [/(টাকা[\s\S]{0,35}(পাঠান|দিন|সেন্ড|ট্রান্সফার|ক্যাশ\s*ইন|পাঠাতে\s*হবে)|send[\s\S]{0,35}money|transfer[\s\S]{0,35}funds|taka[\s\S]{0,35}(pathan|den|din))/i]
    },
    {
      code: 'SIG_REFUND_REQUEST',
      name: 'Accidental Money Transfer / Fake Refund',
      weight: 0.82,
      banglaKeywords: ['ভুল করে টাকা চলে গেছে', 'ভুল নম্বরে পাঠিয়েছি', 'টাকা ফেরত দিন', 'রিফান্ড করুন', 'টাকা ব্যাক দেন'],
      banglishPatterns: [/\bbhul\s*kore\s*taka\b/i, /\btaka\s*(ferot|back)\s*(den|din)\b/i, /\bwrong\s*number\b/i, /\brefund\s*koren\b/i],
      englishKeywords: ['sent money by mistake', 'wrong number transfer', 'refund the money', 'send back'],
      semanticRegexes: [/(ভুল করে টাকা|টাকা ফেরত|sent by mistake|refund|send back)/i]
    },
    {
      code: 'SIG_EMERGENCY_STORY',
      name: 'Hospital / Accident / Relative Emergency Story',
      weight: 0.85,
      banglaKeywords: ['হাসপাতালে ভর্তি', 'দুর্ঘটনা ঘটেছে', 'অপারেশন লাগবে', 'রক্ত লাগবে', 'বিপদে আছি', 'পুলিশ ধরেছে'],
      banglishPatterns: [/\baccident\b/i, /\bhospital\b/i, /\boperation\b/i, /\brokto\b/i, /\bbipode\b/i, /\bpolice\s*dhoreche\b/i],
      englishKeywords: ['admitted to hospital', 'severe accident', 'urgent operation', 'need blood', 'arrested by police'],
      semanticRegexes: [/(হাসপাতাল|দুর্ঘটনা|অপারেশন|accident|hospital|operation|emergency surgery)/i]
    },
    {
      code: 'SIG_RELATIONSHIP_IMPERSONATION',
      name: 'Relative / Friend Impersonation',
      weight: 0.80,
      banglaKeywords: ['আমি তোমার ভাই', 'চাচাতো ভাই', 'মামা বলছি', 'বিদেশ থেকে বলছি', 'চিনতে পেরেছ', 'আমি তোমার বন্ধু'],
      banglishPatterns: [/\bamartumi\b/i, /\bchacato bhai\b/i, /\bmama bolchi\b/i, /\bbidesh theke\b/i, /\bcinte parso\b/i],
      englishKeywords: ['I am your brother', 'calling from abroad', 'recognize me', 'your cousin'],
      semanticRegexes: [/(ভাই বলছি|চাচাতো ভাই|বিদেশ থেকে বলছি|calling from abroad|cousin|relative)/i]
    },
    {
      code: 'SIG_REWARD_PROMISE',
      name: 'Prize / Lottery / Gift Promise',
      weight: 0.85,
      banglaKeywords: ['লটারি জিতেছেন', 'পুরস্কার পেয়েছেন', 'গাড়ি জিতেছেন', '২৫ লাখ টাকা পুরস্কার', 'উপহার সামগ্রী', 'বিজয়ী হয়েছেন'],
      banglishPatterns: [/\blottery\s*jitechen\b/i, /\bpuroshkar\b/i, /\bgari\s*jitechen\b/i, /\bwinner\b/i, /\bcongratulations\b/i],
      englishKeywords: ['won lottery', 'car prize', 'won 25 lakh bdt', 'gift winner', 'lucky draw'],
      semanticRegexes: [/(লটারি|পুরস্কার|won (lottery|prize|car|gift)|lucky draw)/i]
    },
    {
      code: 'SIG_INVESTMENT_PROMISE',
      name: 'High-Yield Investment / Profit Scheme',
      weight: 0.85,
      banglaKeywords: ['দ্বিগুণ লাভ', 'দৈনিক লাভ', 'বিনিয়োগ করুন', 'ঘরে বসে আয়', 'টেলিগ্রাম গ্রুপ', 'ক্রিপ্টো ট্রেডিং'],
      banglishPatterns: [/\bdigun\s*lav\b/i, /\bdaily\s*profit\b/i, /\bbinayog\b/i, /\bghore\s*boshe\s*ay\b/i, /\btelegram\b/i],
      englishKeywords: ['double your money', 'daily profit', 'guaranteed returns', 'telegram income group', 'forex investment'],
      semanticRegexes: [/(দ্বিগুণ লাভ|বিনিয়োগ|daily profit|double money|guaranteed return|telegram task)/i]
    },
    {
      code: 'SIG_GUARANTEED_RETURN',
      name: 'Zero-Risk Guaranteed Return Promise',
      weight: 0.80,
      banglaKeywords: ['১০০% নিশ্চিত লাভ', 'কোনো ঝুঁকি নেই', 'নিশ্চিত আয়', 'গ্যারান্টি রিটার্ন'],
      banglishPatterns: [/\b100%\s*nishchit\b/i, /\bguaranteed\s*return\b/i, /\bno\s*risk\b/i],
      englishKeywords: ['100% guaranteed profit', 'zero risk', 'fixed monthly income'],
      semanticRegexes: [/(নিশ্চিত লাভ|guaranteed (return|profit)|100% safe)/i]
    },
    {
      code: 'SIG_UNKNOWN_LINK',
      name: 'Suspicious / Unknown Link Request',
      weight: 0.85,
      banglaKeywords: ['লিংকে ক্লিক করুন', 'এই লিংকে যান', 'টেলিগ্রাম লিংকে ঢুকুন'],
      banglishPatterns: [/\blink\s*e\s*click\s*koren\b/i, /\bt\.me\//i, /\bbit\.ly\//i],
      englishKeywords: ['click this link', 'open the url', 'join telegram link'],
      semanticRegexes: [/(লিংকে ক্লিক|click\s+(on\s+)?(this\s+)?link|http:\/\/|https:\/\/|t\.me\/|bit\.ly\/)/i]
    },
    {
      code: 'SIG_APK_INSTALL',
      name: 'APK / Malicious App Install Request',
      weight: 0.92,
      banglaKeywords: ['অ্যাপ ইন্সটল করুন', 'এপিকে ডাউনলোড করুন', 'সাপোর্ট অ্যাপ নামান'],
      banglishPatterns: [/\bapp\s*install\s*koren\b/i, /\bapk\s*download\b/i, /\bsoftware\s*naman\b/i],
      englishKeywords: ['install this apk', 'download the app', 'install quicksupport'],
      semanticRegexes: [/(apk\s*(download|install)|অ্যাপ ইন্সটল|download (app|apk))/i]
    },
    {
      code: 'SIG_REMOTE_ACCESS',
      name: 'Remote Access / Screen Sharing Coercion',
      weight: 0.95,
      banglaKeywords: ['এনিডেস্ক', 'টিমভিউয়ার', 'স্ক্রিন শেয়ার করুন', 'রিমোট এক্সেস দিন'],
      banglishPatterns: [/\banydesk\b/i, /\bteamviewer\b/i, /\bscreen\s*share\b/i, /\bremote\s*access\b/i],
      englishKeywords: ['install anydesk', 'open teamviewer', 'share your screen', 'remote control'],
      semanticRegexes: [/(anydesk|teamviewer|screen share|remote access|স্ক্রিন শেয়ার)/i]
    }
  ];

  /**
   * 1. Detect language distribution
   */
  detectLanguage(text: string): 'bn' | 'en' | 'banglish' | 'mixed' {
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const totalLetters = (text.match(/[A-Za-z\u0980-\u09FF]/g) || []).length;

    if (totalLetters === 0) return 'en';

    const banglaRatio = banglaChars / totalLetters;
    if (banglaRatio > 0.7) return 'bn';
    if (banglaRatio < 0.1) {
      // Check for Banglish phonetic keywords in Latin text
      const lower = text.toLowerCase();
      let banglishHits = 0;
      for (const k of Object.keys(BANGLISH_NORMALIZATION_MAP)) {
        if (lower.includes(k)) banglishHits++;
      }
      return banglishHits >= 2 ? 'banglish' : 'en';
    }
    return 'mixed';
  }

  /**
   * 2. Normalize text and Banglish tokens into standard representations
   */
  normalizeText(rawText: string): { normalized: string; isInjection: boolean } {
    const trimmed = rawText.trim();

    // Security Check: Prompt injection patterns
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(trimmed)) {
        return { normalized: '[SECURITY_ALERT_INJECTION_DEFENSE_TRIGGERED]', isInjection: true };
      }
    }

    let normalized = trimmed;
    // Replace common Banglish phonetic tokens
    for (const [banglish, standard] of Object.entries(BANGLISH_NORMALIZATION_MAP)) {
      const regex = new RegExp(`\\b${banglish}\\b`, 'gi');
      normalized = normalized.replace(regex, standard);
    }

    return { normalized, isInjection: false };
  }

  /**
   * 3. Parse raw conversation transcript into structured turns
   */
  parseTurns(text: string): ConversationTurn[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const turns: ConversationTurn[] = [];

    const speakerRegex = /^(caller|receiver|scammer|victim|customer|agent|speaker\s*\d+|user|client|operator|আমি|প্রতারক|গ্রাহক|কলার):\s*(.*)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(speakerRegex);
      if (match) {
        let rawSpeaker = match[1].toLowerCase();
        let speakerRole: ConversationTurn['speaker'] = 'caller';
        if (rawSpeaker.includes('customer') || rawSpeaker.includes('victim') || rawSpeaker.includes('গ্রাহক') || rawSpeaker.includes('আমি') || rawSpeaker.includes('receiver')) {
          speakerRole = 'customer';
        } else if (rawSpeaker.includes('scammer') || rawSpeaker.includes('caller') || rawSpeaker.includes('প্রতারক') || rawSpeaker.includes('operator')) {
          speakerRole = 'scammer';
        } else if (rawSpeaker.includes('agent')) {
          speakerRole = 'agent';
        }
        turns.push({
          speaker: speakerRole,
          text: match[2]
        });
      } else {
        // Fallback: Alternate speakers if not explicitly labeled
        turns.push({
          speaker: i % 2 === 0 ? 'caller' : 'customer',
          text: line
        });
      }
    }

    return turns.length > 0 ? turns : [{ speaker: 'caller', text }];
  }

  /**
   * Convert Bengali numerals (০-৯) to ASCII digits (0-9)
   */
  convertBengaliDigitsToAscii(str: string): string {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    let res = str;
    for (let i = 0; i < bnDigits.length; i++) {
      res = res.replaceAll(bnDigits[i], String(i));
    }
    return res;
  }

  /**
   * 4. Structured Signal Extraction
   */
  extractSignals(turns: ConversationTurn[], fullText: string): SignalExtractionResult[] {
    const results: SignalExtractionResult[] = [];
    const convertedFullText = this.convertBengaliDigitsToAscii(fullText);

    // Negative context / safety warnings detector ("never share PIN", "কাউকে পিন দেবেন না")
    const isSafetyWarning = (line: string) => {
      return /(কাউকে (দেবেন|বলবেন|দিবেন) না|never (share|give)|গোপন রাখুন|don'?t share)/i.test(line);
    };

    for (const def of this.signalDefinitions) {
      let matched = false;
      let matchedSpan = '';
      let turnIdx = 0;
      let matchedSpeaker = '';
      let confidence = 0.0;

      // Check turn by turn for precise evidence span & speaker tracking
      for (let t = 0; t < turns.length; t++) {
        const turnRaw = turns[t].text;
        const turnText = this.convertBengaliDigitsToAscii(turnRaw);
        const turnLower = turnText.toLowerCase();

        // If this is a PIN/OTP check and the turn is a safety warning, skip false positive trigger
        if ((def.code === 'SIG_PIN_REQUEST' || def.code === 'SIG_OTP_REQUEST' || def.code === 'SIG_PASSWORD_REQUEST') && isSafetyWarning(turnText)) {
          continue;
        }

        // 1. Semantic regex check
        for (const rx of def.semanticRegexes) {
          const rxMatch = turnText.match(rx);
          if (rxMatch) {
            matched = true;
            matchedSpan = rxMatch[0];
            turnIdx = t;
            matchedSpeaker = turns[t].speaker;
            confidence = Math.max(confidence, def.weight);
            break;
          }
        }

        // 2. Bangla keywords
        if (!matched) {
          for (const kw of def.banglaKeywords) {
            if (turnText.includes(kw)) {
              matched = true;
              matchedSpan = kw;
              turnIdx = t;
              matchedSpeaker = turns[t].speaker;
              confidence = Math.max(confidence, def.weight);
              break;
            }
          }
        }

        // 3. Banglish patterns
        if (!matched) {
          for (const rx of def.banglishPatterns) {
            const bMatch = turnLower.match(rx);
            if (bMatch) {
              matched = true;
              matchedSpan = bMatch[0];
              turnIdx = t;
              matchedSpeaker = turns[t].speaker;
              confidence = Math.max(confidence, def.weight * 0.95);
              break;
            }
          }
        }

        // 4. English keywords
        if (!matched) {
          for (const ek of def.englishKeywords) {
            if (turnLower.includes(ek.toLowerCase())) {
              matched = true;
              matchedSpan = ek;
              turnIdx = t;
              matchedSpeaker = turns[t].speaker;
              confidence = Math.max(confidence, def.weight * 0.95);
              break;
            }
          }
        }

        if (matched) break;
      }

      if (matched) {
        results.push({
          signal_code: def.code,
          signal_name: def.name,
          detected: true,
          confidence: Number(confidence.toFixed(2)),
          evidence_span: matchedSpan || 'Signal pattern identified in dialogue',
          turn_index: turnIdx,
          speaker: matchedSpeaker
        });
      }
    }

    return results;
  }

  /**
   * 5. Extract Entities (Phones, Wallets, URLs, Trans Refs, Merchants)
   */
  extractEntities(text: string): ExtractedEntities {
    const converted = this.convertBengaliDigitsToAscii(text);

    // Bangladesh Mobile / Wallet regex: 013-019 followed by 8 digits (with optional hyphens/spaces)
    const phoneRegex = /(?:\+?880|0)?1[3-9]\d{2}[-\s]?\d{6}/g;
    const rawPhones = converted.match(phoneRegex) || [];
    const formattedPhones = rawPhones.map(p => p.replace(/[^\d]/g, '').replace(/^880/, '0'));

    // Wallet IDs e.g. W-SYN-091177
    const walletRegex = /W-SYN-\d{6}/gi;
    const rawWallets = converted.match(walletRegex) || [];

    // URLs
    const urlRegex = /(?:https?:\/\/|www\.|t\.me\/|bit\.ly\/)[a-zA-Z0-9.\-_/?&=#]+/gi;
    const rawUrls = converted.match(urlRegex) || [];

    // Merchant / Agent IDs
    const merchantRegex = /(?:AGT|M|MERCH)-[A-Z0-9-]+/gi;
    const rawMerchants = converted.match(merchantRegex) || [];

    // Transaction IDs
    const txnRegex = /TXN-[A-Z0-9-]+/gi;
    const rawTxns = converted.match(txnRegex) || [];

    return {
      phone_numbers: Array.from(new Set(formattedPhones)),
      wallets: Array.from(new Set(rawWallets)),
      urls: Array.from(new Set(rawUrls)),
      merchant_ids: Array.from(new Set(rawMerchants)),
      txn_refs: Array.from(new Set(rawTxns))
    };
  }

  private entityGraphCache = new Map<string, { reportCount: number; linkedRingId?: string; linkedWallet?: string; linkedCasesCount: number; isRisk: boolean }>();

  /**
   * 6. Graph & Campaign Linking
   */
  async linkEntitiesToGraph(entities: ExtractedEntities): Promise<CampaignLinkingResult> {
    let reportCount = 0;
    let linkedCasesCount = 0;
    let linkedRingId: string | undefined;
    let linkedWallet: string | undefined;
    let isRisk = false;

    // Check all extracted phones and wallets against DB (with in-memory memoization)
    const identifiersToCheck = [...entities.phone_numbers, ...entities.wallets];

    for (const id of identifiersToCheck) {
      if (this.entityGraphCache.has(id)) {
        const cached = this.entityGraphCache.get(id)!;
        reportCount += cached.reportCount;
        linkedCasesCount += cached.linkedCasesCount;
        if (cached.linkedRingId) linkedRingId = cached.linkedRingId;
        if (cached.linkedWallet) linkedWallet = cached.linkedWallet;
        if (cached.isRisk) isRisk = true;
        continue;
      }

      let idRisk = false;
      let idReports = 0;
      let idCases = 0;
      let idRing: string | undefined;
      let idWal: string | undefined;

      // 1. Check reports
      const reports = await repository.getReportsForNumber(id);
      if (reports.length > 0) {
        idReports = reports.length;
        reportCount += reports.length;
        idRisk = true;
        isRisk = true;
      }

      // 2. Check if part of known mule rings (e.g. Ring-12 seed W-SYN-091177 / 01399-991823)
      if (id.includes('091177') || id.includes('991823')) {
        idRing = 'RING-2026-0012';
        idWal = 'W-SYN-091177';
        linkedRingId = idRing;
        linkedWallet = idWal;
        idRisk = true;
        isRisk = true;
      }

      // 3. Check active alert cases
      const cases = await repository.getAllAlertCases();
      const matchingCases = cases.filter(c => c.receiver_wallet.includes(id) || c.sender_wallet.includes(id));
      if (matchingCases.length > 0) {
        idCases = matchingCases.length;
        linkedCasesCount += matchingCases.length;
        idRisk = true;
        isRisk = true;
      }

      this.entityGraphCache.set(id, {
        reportCount: idReports,
        linkedRingId: idRing,
        linkedWallet: idWal,
        linkedCasesCount: idCases,
        isRisk: idRisk
      });
    }

    return {
      linked_wallet: linkedWallet || (entities.wallets[0] ?? undefined),
      previous_reports_count: reportCount,
      linked_ring_id: linkedRingId,
      linked_cases_count: linkedCasesCount,
      risk_flag: isRisk,
      notes: isRisk 
        ? `Entity linked to ${reportCount} community reports and known network ring ${linkedRingId || 'Ring-12'}.`
        : 'No prior adverse fraud history found for extracted identifiers.'
    };
  }

  /**
   * 7. Classify Scam Typology
   */
  classifyTypology(signals: SignalExtractionResult[], fullText: string): {
    typology: TypologyId;
    typology_name: string;
    escalation_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    scam_probability: number;
  } {
    const signalCodes = new Set(signals.map(s => s.signal_code));

    let typology: TypologyId = 'SCAM_CALL_ACCOUNT_VERIFY';
    let rawScore = 0.15;

    const hasCreds = signalCodes.has('SIG_PIN_REQUEST') || signalCodes.has('SIG_OTP_REQUEST') || signalCodes.has('SIG_PASSWORD_REQUEST');
    const hasTransfer = signalCodes.has('SIG_MONEY_TRANSFER_REQUEST');
    const hasSuspension = signalCodes.has('SIG_ACCOUNT_SUSPENSION');
    const hasCustomerCare = signalCodes.has('SIG_CUSTOMER_CARE_IMPERSONATION') || signalCodes.has('SIG_AUTHORITY_IMPERSONATION');
    const hasEmergency = signalCodes.has('SIG_EMERGENCY_STORY') || signalCodes.has('SIG_RELATIONSHIP_IMPERSONATION');
    const hasRefund = signalCodes.has('SIG_REFUND_REQUEST');
    const hasPrize = signalCodes.has('SIG_REWARD_PROMISE');
    const hasInvest = signalCodes.has('SIG_INVESTMENT_PROMISE') || signalCodes.has('SIG_GUARANTEED_RETURN');
    const hasThreat = signalCodes.has('SIG_FEAR_THREAT');
    const hasSIM = signalCodes.has('SIG_ACCOUNT_SUSPENSION') && (fullText.includes('SIM') || fullText.includes('সিম') || fullText.includes('বায়োমেট্রিক'));

    // Typology Decision Matrix
    if (hasCustomerCare && (hasCreds || hasSuspension || hasTransfer)) {
      typology = 'SCAM_CALL_CUSTOMER_CARE';
      rawScore = 0.94;
    } else if (hasSIM && (hasCreds || hasTransfer)) {
      typology = 'SCAM_CALL_SIM_BLOCK';
      rawScore = 0.92;
    } else if (hasEmergency && (hasTransfer || signalCodes.has('SIG_URGENCY'))) {
      typology = 'SCAM_CALL_RELATIVE_EMERGENCY';
      rawScore = 0.90;
    } else if (hasRefund) {
      typology = 'SCAM_CALL_REFUND';
      rawScore = 0.88;
    } else if (hasPrize) {
      typology = 'SCAM_CALL_PRIZE';
      rawScore = 0.91;
    } else if (hasInvest) {
      typology = 'SCAM_CALL_INVESTMENT';
      rawScore = 0.89;
    } else if (hasThreat) {
      typology = 'SCAM_CALL_LEGAL_THREAT';
      rawScore = 0.93;
    } else if (hasCreds || signalCodes.has('SIG_VERIFICATION_REQUEST')) {
      typology = 'SCAM_CALL_ACCOUNT_VERIFY';
      rawScore = 0.86;
    } else if (signals.length >= 2) {
      typology = 'SCAM_CALL_CUSTOMER_CARE';
      rawScore = 0.75;
    } else if (signals.length === 1) {
      // If single signal is just customer service mention without any demands or threats, it is routine legitimate support
      if (hasCustomerCare && !hasCreds && !hasSuspension && !hasTransfer && !hasThreat && !signalCodes.has('SIG_URGENCY')) {
        rawScore = 0.12;
      } else {
        rawScore = 0.45;
      }
    } else {
      rawScore = 0.08;
    }

    // Synergy bonus for multi-signal conversation escalation
    if (signals.length >= 3) rawScore = Math.min(0.99, rawScore + 0.05);
    if (hasCreds && hasTransfer) rawScore = Math.min(0.99, rawScore + 0.08);

    // Escalation Level
    let escalation: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (rawScore >= 0.88 || (hasCreds && hasCustomerCare)) {
      escalation = 'CRITICAL';
    } else if (rawScore >= 0.70 || (signals.length >= 2 && rawScore >= 0.50)) {
      escalation = 'HIGH';
    } else if (rawScore >= 0.35) {
      escalation = 'MEDIUM';
    } else {
      escalation = 'LOW';
    }

    const meta = TYPOLOGY_META[typology] || { name: 'Suspected Scam Call', description: '' };

    return {
      typology,
      typology_name: meta.name,
      escalation_level: escalation,
      scam_probability: Number(rawScore.toFixed(2))
    };
  }

  /**
   * 8. Build Plain Bangla / English Customer Advice (Max 3 Simple Reasons)
   */
  buildCustomerRecommendations(
    signals: SignalExtractionResult[],
    typology: TypologyId,
    escalation: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    isInjection: boolean
  ) {
    if (isInjection) {
      return {
        customer_heading_bn: '⚠️ বার্তায় ক্ষতিকর নির্দেশাবলী শনাক্ত হয়েছে',
        customer_heading_en: '⚠️ Security Alert: Malicious prompt instructions detected',
        customer_reasons_bn: [
          'বার্তায় সিস্টেম বাইপাস বা ক্ষতিকর কোড রয়েছে',
          'এই ব্যক্তির সাথে লেনদেন করবেন না'
        ],
        customer_reasons_en: [
          'Adversarial instruction injection detected',
          'Do not interact with this caller or sender'
        ],
        what_to_do_bn: [
          'কলটি এখনই কেটে দিন',
          'কোনো তথ্য বা লিংক খুলবেন না',
          'নম্বরটি ব্লক ও রিপোর্ট করুন'
        ],
        what_to_do_en: [
          'Hang up the call immediately',
          'Do not click any link or share info',
          'Block and report this number'
        ],
        analyst_brief: 'RAI-04 Adversarial prompt injection defense triggered.'
      };
    }

    const isHigh = escalation === 'CRITICAL' || escalation === 'HIGH';

    const heading_bn = isHigh
      ? '⚠️ এই কথোপকথনে প্রতারণার কিছু লক্ষণ পাওয়া গেছে'
      : escalation === 'MEDIUM'
      ? '⚠️ কথোপকথনে সতর্কতামূলক লক্ষণ রয়েছে'
      : '✅ কথোপকথনে আপাতদৃষ্টিতে কোনো বড় ঝুঁকি পাওয়া যায়নি';

    const heading_en = isHigh
      ? '⚠️ Scam signals detected in this conversation'
      : escalation === 'MEDIUM'
      ? '⚠️ Suspicious patterns found in dialogue'
      : '✅ No immediate high-risk scam triggers found';

    // Formulate top 3 simple customer reasons
    const reasons_bn: string[] = [];
    const reasons_en: string[] = [];

    const signalCodes = new Set(signals.map(s => s.signal_code));

    if (signalCodes.has('SIG_PIN_REQUEST') || signalCodes.has('SIG_OTP_REQUEST')) {
      reasons_bn.push('আপনার গোপন PIN বা OTP চাওয়া হয়েছে (উপায় কখনোই তা চায় না)');
      reasons_en.push('Your secret PIN or OTP was requested (upay will never ask for this)');
    }

    if (signalCodes.has('SIG_URGENCY') || signalCodes.has('SIG_MONEY_TRANSFER_REQUEST')) {
      reasons_bn.push('আপনাকে দ্রুত বা তাড়াহুড়ো করে টাকা পাঠাতে বলা হয়েছে');
      reasons_en.push('You are being pressured to send money urgently');
    }

    if (signalCodes.has('SIG_CUSTOMER_CARE_IMPERSONATION') || signalCodes.has('SIG_AUTHORITY_IMPERSONATION')) {
      reasons_bn.push('কাস্টমার কেয়ার বা কর্মকর্তা সেজে অ্যাকাউন্ট সংক্রান্ত দাবি করা হয়েছে');
      reasons_en.push('The caller is pretending to be official customer care');
    } else if (signalCodes.has('SIG_ACCOUNT_SUSPENSION')) {
      reasons_bn.push('অ্যাকাউন্ট বা সিম বন্ধ হওয়ার ভীতি দেখানো হয়েছে');
      reasons_en.push('Threats were made about account or SIM deactivation');
    } else if (signalCodes.has('SIG_REWARD_PROMISE')) {
      reasons_bn.push('লটারি বা পুরস্কারের কথা বলে অগ্রিম অর্থ দাবি করা হয়েছে');
      reasons_en.push('Prize winnings claimed in exchange for advance payment');
    } else if (signalCodes.has('SIG_REFUND_REQUEST')) {
      reasons_bn.push('ভুল করে টাকা পাঠানোর দাবি করে ফেরত চাওয়া হয়েছে');
      reasons_en.push('Accidental money transfer claimed to demand a refund');
    }

    // Default filler if fewer than 1
    if (reasons_bn.length === 0) {
      if (isHigh) {
        reasons_bn.push('কথোপকথনে অযৌক্তিক চাপ ও সামাজিক কারসাজির লক্ষণ রয়েছে');
        reasons_en.push('High-pressure social engineering tactics identified');
      } else {
        reasons_bn.push('নিয়মিত সতর্কতা বজায় রাখুন এবং অপরিচিত কাউকে টাকা পাঠাবেন না');
        reasons_en.push('Maintain standard caution with unknown callers');
      }
    }

    // "কী করবেন?" (What to do?)
    const what_to_do_bn = [
      'টাকা পাঠাবেন না',
      'PIN / OTP কাউকে দেবেন না',
      'কথোপকথন বা নম্বরটি রিপোর্ট করুন'
    ];

    const what_to_do_en = [
      'Do not transfer any money',
      'Never share your secret PIN / OTP with anyone',
      'Report the conversation and caller number'
    ];

    return {
      customer_heading_bn: heading_bn,
      customer_heading_en: heading_en,
      customer_reasons_bn: reasons_bn.slice(0, 3),
      customer_reasons_en: reasons_en.slice(0, 3),
      what_to_do_bn,
      what_to_do_en,
      analyst_brief: `Classified as ${typology} with ${signals.length} structured social-engineering signals.`
    };
  }

  /**
   * Main Pipeline Entrypoint: Analyze conversational call transcript
   */
  async analyzeConversation(rawConversation: string): Promise<ConversationRiskProfile> {
    // 1. Untrusted input normalization & injection defense
    const { normalized, isInjection } = this.normalizeText(rawConversation);

    if (isInjection) {
      const rec = this.buildCustomerRecommendations([], 'SCAM_CALL_CUSTOMER_CARE', 'CRITICAL', true);
      return {
        scam_probability: 0.99,
        typology: 'SCAM_CALL_CUSTOMER_CARE',
        typology_name: 'Adversarial Prompt Injection Threat',
        escalation_level: 'CRITICAL',
        signals: [{
          signal_code: 'SIG_AUTHORITY_IMPERSONATION',
          signal_name: 'Prompt Injection Defense Triggered',
          detected: true,
          confidence: 0.99,
          evidence_span: '[PROMPT_INJECTION_DEFENSE_TRIGGERED]'
        }],
        evidence_spans: ['[SECURITY_TRIGGER_DETECTED]'],
        extracted_entities: { phone_numbers: [], wallets: [], urls: [], merchant_ids: [], txn_refs: [] },
        campaign_links: { previous_reports_count: 0, linked_cases_count: 0, risk_flag: true, notes: 'Malicious payload rejected.' },
        recommended_action: rec,
        detected_language: 'en',
        is_injection_attempt: true
      };
    }

    // 2. Language Detection
    const detectedLang = this.detectLanguage(rawConversation);

    // 3. Multi-turn dialogue parsing
    const turns = this.parseTurns(rawConversation);

    // 4. Structured Signal Extraction
    const signals = this.extractSignals(turns, `${rawConversation} ${normalized}`);

    // 5. Entity Extraction
    const entities = this.extractEntities(rawConversation);

    // 6. Campaign & Graph Linking
    const campaignLinks = await this.linkEntitiesToGraph(entities);

    // 7. Typology Classification & Escalation Profiling (deterministic rules)
    const rulesVerdict = this.classifyTypology(signals, rawConversation);

    // 7b. Model-based analysis, grounded in the retrieved typology corpus.
    //
    // The rules above remain the floor. This step catches paraphrased and
    // code-switched scripts that no fixed pattern matches, and `mergeWithRules`
    // only ever raises risk — a model (or text that manipulated it) cannot talk
    // the verdict down below what the rules established.
    const retrieved = await retrievalService.retrieve(rawConversation, {
      collections: ['scam_typology', 'customer_advisory'],
      topK: 4
    });

    const llmOutcome = await analyzeConversationWithLlm(rawConversation, retrieved);

    const merged = mergeWithRules(
      {
        scam_probability: rulesVerdict.scam_probability,
        escalation_level: rulesVerdict.escalation_level,
        typology: rulesVerdict.typology,
        hasSignals: signals.length > 0
      },
      llmOutcome.analysis
    );

    const typology = merged.typology;
    const escalation_level = merged.escalation_level;
    const scam_probability = merged.scam_probability;
    const typology_name =
      typology === rulesVerdict.typology
        ? rulesVerdict.typology_name
        : this.getTypologyName(typology);

    // 8. Build Customer Recommendations
    const recommended_action = this.buildCustomerRecommendations(signals, typology, escalation_level, false);

    // Model-authored reasoning and advice are added alongside the template
    // output and labelled, never silently substituted for it.
    if (merged.llm_used) {
      if (merged.llm_advice_en?.length) {
        recommended_action.what_to_do_en = Array.from(
          new Set([...recommended_action.what_to_do_en, ...merged.llm_advice_en])
        );
      }
      if (merged.llm_advice_bn?.length) {
        recommended_action.what_to_do_bn = Array.from(
          new Set([...recommended_action.what_to_do_bn, ...merged.llm_advice_bn])
        );
      }
      if (merged.llm_reasoning_en) {
        recommended_action.analyst_brief =
          `${recommended_action.analyst_brief}\n\n[Model assessment] ${merged.llm_reasoning_en}`;
      }
    }

    const evidenceSpans = signals.map(s => s.evidence_span).filter(Boolean);

    // 9. Cache entity risk for real-time M3 transaction scoring integration
    for (const phone of entities.phone_numbers) {
      this.analyzedEntitiesCache.set(phone, {
        riskScore: scam_probability,
        typology,
        timestamp: Date.now(),
        signals: signals.map(s => String(s.signal_code))
      });
    }
    for (const wallet of entities.wallets) {
      this.analyzedEntitiesCache.set(wallet, {
        riskScore: scam_probability,
        typology,
        timestamp: Date.now(),
        signals: signals.map(s => String(s.signal_code))
      });
    }

    return {
      scam_probability,
      typology,
      typology_name,
      escalation_level,
      signals,
      evidence_spans: evidenceSpans,
      extracted_entities: entities,
      campaign_links: campaignLinks,
      recommended_action,
      detected_language: detectedLang,
      is_injection_attempt: false,
      normalized_turns: turns,
      analysis_provenance: {
        rules_scam_probability: Number(rulesVerdict.scam_probability.toFixed(4)),
        rules_typology: rulesVerdict.typology,
        rules_escalation_level: rulesVerdict.escalation_level,
        rules_signal_count: signals.length,
        llm_used: merged.llm_used,
        llm_unavailable_reason: merged.llm_used ? undefined : llmOutcome.reason,
        llm_provider: llmOutcome.meta?.provider,
        llm_model: llmOutcome.meta?.model,
        llm_latency_ms: llmOutcome.meta?.latencyMs,
        llm_failover: llmOutcome.meta?.failover,
        llm_manipulation_tactics: merged.llm_manipulation_tactics,
        llm_reasoning_en: merged.llm_reasoning_en,
        llm_reasoning_bn: merged.llm_reasoning_bn,
        llm_flagged_credential_request: merged.llm_flagged_credential_request,
        retrieved_context: retrieved.map(c => ({
          doc_id: c.doc_id,
          title: c.title,
          collection: c.collection,
          score: c.score
        }))
      }
    };
  }

  /** Human-readable name for a typology the model selected. */
  private getTypologyName(typology: string): string {
    const names: Record<string, string> = {
      SCAM_CALL_CUSTOMER_CARE: 'Fake Customer Care Impersonation',
      SCAM_CALL_SIM_BLOCK: 'SIM Block / Replacement Threat',
      SCAM_CALL_ACCOUNT_VERIFY: 'Account Verification Deposit Scam',
      SCAM_CALL_RELATIVE_EMERGENCY: 'Relative Emergency Impersonation',
      SCAM_CALL_REFUND: 'Wrong-Number Refund Trick',
      SCAM_CALL_PRIZE: 'Prize / Lottery Advance Fee',
      SCAM_CALL_INVESTMENT: 'Fake Investment Scheme',
      SCAM_CALL_TASK: 'Online Task Commission Scam',
      SCAM_CALL_LEGAL_THREAT: 'Police / Legal Coercion'
    };
    return names[typology] ?? typology;
  }

  /**
   * Get Point-in-Time Conversation Scam Score for an entity in M3 Risk Evaluation
   */
  getContextScoreForEntity(identifier: string): number {
    const clean = identifier.replace(/[^\d+A-Za-z_-]/g, '');
    const hit = this.analyzedEntitiesCache.get(clean) || this.analyzedEntitiesCache.get(identifier);
    if (!hit) return 0.0;

    // Active for 24 hours
    const ageMs = Date.now() - hit.timestamp;
    if (ageMs > 24 * 3600 * 1000) {
      this.analyzedEntitiesCache.delete(identifier);
      return 0.0;
    }

    return hit.riskScore;
  }
}

export const conversationScamIntelligence = new ConversationScamIntelligenceService();
