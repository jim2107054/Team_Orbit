import { TypologyId, ConversationRiskProfile } from '../core/types.js';
import { conversationScamIntelligence } from './conversation-scam-intelligence.js';

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
  conversation_risk_profile?: ConversationRiskProfile;
}

export class ScamNLPService {
  /**
   * Analyze raw text or conversation transcript
   */
  async analyze(rawText: string): Promise<ScamCheckResult> {
    const profile = await conversationScamIntelligence.analyzeConversation(rawText);

    let verdict: 'LIKELY_SCAM' | 'SUSPICIOUS' | 'LOOKS_OK' = 'LOOKS_OK';
    if (profile.scam_probability >= 0.70 || profile.is_injection_attempt) {
      verdict = 'LIKELY_SCAM';
    } else if (profile.scam_probability >= 0.35 || profile.signals.length > 0) {
      verdict = 'SUSPICIOUS';
    }

    return {
      verdict,
      confidence: profile.scam_probability,
      typology_matched: profile.typology,
      matched_reasons_en: profile.recommended_action.customer_reasons_en,
      matched_reasons_bn: profile.recommended_action.customer_reasons_bn,
      highlighted_phrases: profile.evidence_spans,
      advice_en: profile.recommended_action.what_to_do_en.join('. '),
      advice_bn: profile.recommended_action.what_to_do_bn.join('। '),
      extracted_numbers: profile.extracted_entities.phone_numbers,
      is_injection_attempt: profile.is_injection_attempt,
      conversation_risk_profile: profile
    };
  }

  /**
   * Synchronous fallback for legacy single message inspection
   */
  analyzeText(rawText: string): ScamCheckResult {
    // Basic fast check if called synchronously
    const { normalized, isInjection } = conversationScamIntelligence.normalizeText(rawText);
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

    const turns = conversationScamIntelligence.parseTurns(rawText);
    const signals = conversationScamIntelligence.extractSignals(turns, `${rawText} ${normalized}`);
    const entities = conversationScamIntelligence.extractEntities(rawText);
    const { typology, escalation_level, scam_probability } = conversationScamIntelligence.classifyTypology(signals, rawText);
    const rec = conversationScamIntelligence.buildCustomerRecommendations(signals, typology, escalation_level, false);

    let verdict: 'LIKELY_SCAM' | 'SUSPICIOUS' | 'LOOKS_OK' = 'LOOKS_OK';
    if (scam_probability >= 0.70) {
      verdict = 'LIKELY_SCAM';
    } else if (scam_probability >= 0.35 || signals.length > 0) {
      verdict = 'SUSPICIOUS';
    }

    return {
      verdict,
      confidence: scam_probability,
      typology_matched: typology,
      matched_reasons_en: rec.customer_reasons_en,
      matched_reasons_bn: rec.customer_reasons_bn,
      highlighted_phrases: signals.map(s => s.evidence_span),
      advice_en: rec.what_to_do_en.join('. '),
      advice_bn: rec.what_to_do_bn.join('। '),
      extracted_numbers: entities.phone_numbers,
      is_injection_attempt: false
    };
  }
}

export const scamNLP = new ScamNLPService();

