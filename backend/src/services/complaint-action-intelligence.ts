import { 
  StructuredComplaint, ComplaintCategory, ComplaintPriority, ComplaintStatus,
  CustomerResponseStatus, ExtractedComplaintEntities, ComplaintEvidenceLink,
  ComplaintDuplicateGroup, ComplaintAnalystAction, TypologyId
} from '../core/types.js';
import { BANGLISH_NORMALIZATION_MAP } from '../core/constants.js';
import { auditService } from './audit-service.js';

export class ComplaintActionIntelligenceService {
  private complaints: Map<string, StructuredComplaint> = new Map();
  private duplicateGroups: Map<string, ComplaintDuplicateGroup> = new Map();
  private analystActions: ComplaintAnalystAction[] = [];

  constructor() {
    this.seedDefaultComplaints();
  }

  // ================= 1. LANGUAGE DETECTION & NORMALIZATION =================
  detectLanguage(text: string): 'bn' | 'en' | 'banglish' | 'mixed' {
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const totalLetters = (text.match(/[A-Za-z\u0980-\u09FF]/g) || []).length;

    if (totalLetters === 0) return 'en';
    const banglaRatio = banglaChars / totalLetters;
    if (banglaRatio > 0.6) return 'bn';
    if (banglaRatio < 0.1) {
      const lower = text.toLowerCase();
      let banglishHits = 0;
      for (const k of Object.keys(BANGLISH_NORMALIZATION_MAP)) {
        if (lower.includes(k)) banglishHits++;
      }
      return banglishHits >= 2 ? 'banglish' : 'en';
    }
    return 'mixed';
  }

  convertBengaliDigitsToAscii(str: string): string {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    let res = str;
    for (let i = 0; i < bnDigits.length; i++) {
      res = res.replaceAll(bnDigits[i], String(i));
    }
    return res;
  }

  normalizeText(rawText: string): string {
    let clean = this.convertBengaliDigitsToAscii(rawText.trim().toLowerCase());
    // Normalize Bengali unicode variants (e.g. য় / য়)
    clean = clean.replace(/[\u09AF][\u09BC]/g, 'য়').replace(/\u09DF/g, 'য়');
    for (const [banglish, standard] of Object.entries(BANGLISH_NORMALIZATION_MAP)) {
      const regex = new RegExp(`\\b${banglish}\\b`, 'gi');
      clean = clean.replace(regex, standard);
    }
    return clean;
  }


  // ================= 2. ENTITY EXTRACTION =================
  extractEntities(rawText: string): ExtractedComplaintEntities {
    const converted = this.convertBengaliDigitsToAscii(rawText);

    // 1. Phone numbers (BD 11-digit mobile: 013-019 followed by 8 digits)
    const phoneRegex = /(?:\+?880|0)?1[3-9]\d{2}[-\s]?\d{6}|(?:\+?880|0)?1[3-9]\d{1}[-\s]?\d{3}[-\s]?\d{4}|(?:\+?880|0)?1[3-9]\d{8}/g;
    const rawPhones = converted.match(phoneRegex) || [];
    const phone_numbers = Array.from(new Set(rawPhones.map(p => {
      const clean = p.replace(/[^\d]/g, '').replace(/^880/, '0');
      if (clean.length === 11) {
        return `${clean.slice(0, 5)}-${clean.slice(5)}`;
      }
      return p;
    })));

    // 2. Wallets (W-SYN-..., W-..., or 11-digit numbers tagged as wallet)
    const walletRegex = /W-(?:SYN-)?[A-Z0-9]{5,10}/gi;
    const rawWallets = converted.match(walletRegex) || [];
    const wallets = Array.from(new Set(rawWallets.map(w => w.toUpperCase())));

    // 3. Merchant IDs (M-SYN-..., MERCH-..., M-...)
    const merchantRegex = /(?:MERCH|M-SYN|M)-[A-Z0-9-]+/gi;
    const rawMerchants = converted.match(merchantRegex) || [];
    const merchant_ids = Array.from(new Set(rawMerchants.map(m => m.toUpperCase())));

    // 4. Agent IDs (A-SYN-..., AGT-..., AGENT-...)
    const agentRegex = /(?:AGENT|AGT|A-SYN|A)-[A-Z0-9-]+/gi;
    const rawAgents = converted.match(agentRegex) || [];
    const agent_ids = Array.from(new Set(rawAgents.map(a => a.toUpperCase())));

    // 5. Transaction IDs (TXN-..., TRX-..., SYN-...)
    const txnRegex = /(?:TXN|TRX)-[A-Z0-9-]+/gi;
    const rawTxns = converted.match(txnRegex) || [];
    const txn_refs = Array.from(new Set(rawTxns.map(t => t.toUpperCase())));

    // 6. Amounts in BDT - Filter out phone/wallet/agent digits first
    const cleanForAmounts = converted
      .replace(/(?:\+?880|0)?1[3-9]\d{2}[-\s]?\d{6}|(?:\+?880|0)?1[3-9]\d{1}[-\s]?\d{3}[-\s]?\d{4}|(?:\+?880|0)?1[3-9]\d{8}/g, ' ')
      .replace(/W-(?:SYN-)?[A-Z0-9]{5,10}/gi, ' ')
      .replace(/(?:AGENT|AGT|A-SYN|A)-[A-Z0-9-]+/gi, ' ')
      .replace(/(?:MERCH|M-SYN|M)-[A-Z0-9-]+/gi, ' ')
      .replace(/(?:TXN|TRX)-[A-Z0-9-]+/gi, ' ');


    const amounts_bdt: number[] = [];
    // The comma-grouped branch requires at least one group, otherwise a bare "5000"
    // was matched by the 1-3 digit branch and truncated to 500.
    // The thousand shorthand ("5k", "৫ হাজার") is expanded BEFORE the range filter,
    // otherwise "5k" was discarded for being below the minimum.
    const amountRegex = /(?:৳|tk|bdt|টাকা)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(k|হাজার|টাকা|taka|tk|bdt)?/gi;
    let match;
    while ((match = amountRegex.exec(cleanForAmounts)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      let val = parseFloat(numStr);
      if (isNaN(val)) continue;

      const suffix = (match[2] || '').toLowerCase();
      if (suffix === 'k' || suffix === 'হাজার') {
        val = val * 1000;
      }

      if (val >= 100 && val <= 500000) {
        amounts_bdt.push(val);
      }
    }

    // 7. URLs
    const urlRegex = /(?:https?:\/\/|www\.|t\.me\/|bit\.ly\/)[a-zA-Z0-9.\-_/?&=#]+/gi;
    const urls = Array.from(new Set(converted.match(urlRegex) || []));

    // 8. Timestamps / relative time phrases
    const timePhrases: string[] = [];
    const timeKeywords = [
      'মিনিট আগে', 'ঘণ্টা আগে', 'আজকে', 'গতকাল', 'সকাল', 'দুপুর', 'সন্ধ্যা', 'রাত',
      'mins ago', 'hours ago', 'today', 'yesterday', 'morning', 'evening'
    ];
    for (const tk of timeKeywords) {
      if (converted.toLowerCase().includes(tk)) {
        timePhrases.push(tk);
      }
    }

    // 9. Named entities
    const named_entities: string[] = [];
    const entityTokens = [
      { name: 'upay Customer Care', regex: /(উপায়|upay)\s*(কাস্টমার\s*কে[য়াযায়ে]র|customer\s*care|head\s*office|হেড\s*অফিস|পরিচয়ে)/i },
      { name: 'bKash Security Team', regex: /(বিকাশ|bkash)\s*(সিকিউরিটি|security)/i },
      { name: 'CID Cyber Police', regex: /(পুলিশ|police|সিআইডি|cid|ডিবি|db)/i },
      { name: 'Telegram Task Group', regex: /(telegram|টেলিগ্রাম)/i },
      { name: 'Lottery Board', regex: /(লটারি|lottery|পুরস্কার|prize)/i },
      { name: 'SIM Biometric Center', regex: /(সিম\s*ব্লক|sim\s*block|বায়োমেট্রিক|biometric)/i }
    ];
    for (const et of entityTokens) {
      if (et.regex.test(converted)) {
        named_entities.push(et.name);
      }
    }

    return {
      phone_numbers,
      wallets,
      merchant_ids,
      agent_ids,
      txn_refs,
      amounts_bdt: Array.from(new Set(amounts_bdt)),
      timestamps: timePhrases,
      urls,
      named_entities
    };
  }

  // ================= 3. CLASSIFICATION & TYPOLOGY =================
  classifyComplaint(rawText: string, entities: ExtractedComplaintEntities): {
    classification: ComplaintCategory;
    category_label_bn: string;
    category_label_en: string;
    typology: TypologyId;
    typology_label_bn: string;
  } {
    const norm = this.normalizeText(rawText);
    const combined = (rawText + ' ' + norm).toLowerCase();

    // 1. PIN / OTP Coercion
    if (/(ওটিপি|পিন|পাসওয়ার্ড|otp|pin|password|verification\s*code|সিক্রেট\s*কোড|গোপন\s*পিন)/i.test(combined) && 
        (/(চাইলো|চেয়েছে|চেয়েছিল|দিতে\s*বলে|শেয়ার|চাচ্ছিলো|কোড|code|দিয়েছি|দেওয়ার|দেইনি)/i.test(combined) || combined.includes('ওটিপি') || combined.includes('পিন') || combined.includes('otp') || combined.includes('pin'))) {
      return {
        classification: 'PIN_OTP_request',
        category_label_bn: 'পিন / ওটিপি প্রতারণা (PIN/OTP Coercion)',
        category_label_en: 'PIN / OTP Request Coercion',
        typology: 'SCAM_CALL_ACCOUNT_VERIFY',
        typology_label_bn: 'অ্যাকাউন্ট ভেরিফিকেশন স্ক্যাম'
      };
    }


    // 2. Fake Customer Care Impersonation
    if (/(উপায়|উপায়|upay|বিকাশ|bkash)?\s*(হেড\s*অফিস|head\s*office|কাস্টমার\s*কে[য়াযায়ে]র|customer\s*care|অফিসার|ম্যানেজার|হেল্পলাইন|helpline)/i.test(combined) ||
        /(উপায়|উপায়|upay)\s*(কাস্টমার|সেবা|অফিস|পরিচয়ে|হেড)/i.test(combined) ||
        ((combined.includes('উপায়') || combined.includes('উপায়') || combined.includes('upay')) && (combined.includes('কাস্টমার') || combined.includes('customer') || combined.includes('কেয়ার') || combined.includes('কেয়ার') || combined.includes('হেড'))) ||
        entities.named_entities.some(e => e.includes('Customer Care') || e.includes('upay'))) {
      return {
        classification: 'fake_customer_care',
        category_label_bn: 'ভুয়া কাস্টমার কেয়ার ছদ্মবেশ (Fake Customer Care)',
        category_label_en: 'Fake Customer Care Impersonation',
        typology: 'SCAM_CALL_CUSTOMER_CARE',
        typology_label_bn: 'ভুয়া কাস্টমার কেয়ার প্রতারণা'
      };
    }


    if (/(ভুল\s*টাকা|ভুল\s*করে|ভুল\s*নাম্বারে|wrong\s*transfer|ভুল\s*ট্রান্সফার|mistaken\s*transfer)/i.test(norm)) {
      return {
        classification: 'wrong_transfer',
        category_label_bn: 'ভুল নম্বরে টাকা পাঠানো (Wrong Transfer)',
        category_label_en: 'Wrong Transfer Dispute',
        typology: 'T3_REFUND_MISTAKE',
        typology_label_bn: 'ভুল টাকা পাঠানোর ফাঁদ'
      };
    }

    if (/(অ্যাকাউন্ট\s*হ্যাক|লগইন\s*করতে\s*পারছি\s*না|পাসওয়ার্ড\s*চেঞ্জ|হ্যাক|account\s*takeover|unauthorized\s*login)/i.test(norm)) {
      return {
        classification: 'account_takeover',
        category_label_bn: 'অ্যাকাউন্ট বেদখল (Account Takeover - ATO)',
        category_label_en: 'Account Takeover (ATO)',
        typology: 'T2_ATO_DRAIN' as any,
        typology_label_bn: 'অ্যাকাউন্ট দখল ও অর্থ নিষ্কাশন'
      };
    }

    if (/(টেলিগ্রাম\s*টাস্ক|ঘরে\s*বসে\s*আয়|ডেইলি\s*ইনকাম|বিনিয়োগ|investment|daily\s*income|task\s*job|ডাবল\s*লাভ)/i.test(norm)) {
      return {
        classification: 'investment_scam',
        category_label_bn: 'ভুয়া ইনভেস্টমেন্ট ও পার্ট-টাইম জব স্ক্যাম',
        category_label_en: 'Fake Investment & Task Scam',
        typology: 'SCAM_CALL_INVESTMENT',
        typology_label_bn: 'ভুয়া বিনিয়োগ ফাঁদ'
      };
    }

    if (/(রিফান্ড|অতিরিক্ত\s*টাকা\s*ফেরত|ক্যাশব্যাক|refund|cashback|ফেরত\s*দিন)/i.test(norm)) {
      return {
        classification: 'refund_scam',
        category_label_bn: 'ভুয়া রিফান্ড স্ক্যাম (Fake Refund Trap)',
        category_label_en: 'Refund Scam Trap',
        typology: 'SCAM_CALL_REFUND',
        typology_label_bn: 'ভুয়া রিফান্ড ফাঁদ'
      };
    }

    if (entities.merchant_ids.length > 0 || /(মার্চেন্ট|দোকান|কিউআর|qr|merchant|shop\s*payment)/i.test(norm)) {
      return {
        classification: 'merchant_issue',
        category_label_bn: 'মার্চেন্ট / কিউআর প্রতারণা (Merchant Issue)',
        category_label_en: 'Merchant / QR Dispute',
        typology: 'T10_PHISHING_APK' as any,
        typology_label_bn: 'সন্দেহজনক মার্চেন্ট পেমেন্ট'
      };
    }

    if (entities.agent_ids.length > 0 || /(এজেন্ট|ক্যাশ\s*আউট|agent\s*point|কমিশন)/i.test(norm)) {
      return {
        classification: 'agent_issue',
        category_label_bn: 'এজেন্ট সংক্রান্ত অভিযোগ (Agent Issue)',
        category_label_en: 'Agent Point Issue',
        typology: 'T8_AGENT_CASH_OUT_MULE',
        typology_label_bn: 'এজেন্ট ক্যাশ-আউট সমস্যা'
      };
    }

    if (/(টাকা\s*কেটে\s*নিয়েছে|প্রতারণা|টাকা\s*নিয়ে\s*গেছে|scam|fraud|stolen|cheat|লটারি|পুরস্কার)/i.test(norm)) {
      return {
        classification: 'fraud',
        category_label_bn: 'সাধারণ আর্থিক প্রতারণা (Financial Fraud)',
        category_label_en: 'Financial Fraud',
        typology: 'T1_EMERGENCY_IMPERSONATION',
        typology_label_bn: 'আর্থিক প্রতারণা'
      };
    }

    return {
      classification: 'unknown',
      category_label_bn: 'অনির্ধারিত অভিযোগ (Unclassified Complaint)',
      category_label_en: 'Unclassified Complaint',
      typology: 'T1_EMERGENCY_IMPERSONATION',
      typology_label_bn: 'অনির্ধারিত'
    };
  }


  // ================= 4. PRIORITY & GOLDEN-HOUR EVALUATION =================
  calculatePriority(
    classification: ComplaintCategory,
    entities: ExtractedComplaintEntities,
    elapsedMinutes: number,
    rawText: string
  ): {
    priority: ComplaintPriority;
    priority_reason: string;
    is_golden_hour: boolean;
    golden_hour_remaining_mins: number;
    potential_loss_bdt: number;
  } {
    const isExplicitNoLoss = /(টাকা\s*পাঠাইনি|টাকা\s*দেইনি|পিন\s*দেইনি|no\s*money\s*sent|did\s*not\s*send|saved)/i.test(rawText);

    const potential_loss_bdt = isExplicitNoLoss ? 0 : (
      entities.amounts_bdt.length > 0 ? Math.max(...entities.amounts_bdt) : 0
    );

    const hasActiveTransfer = !isExplicitNoLoss && (potential_loss_bdt > 0 || 
      /(টাকা\s*পাঠিয়েছি|সেন্ড\s*করেছি|টাকা\s*কেটে\s*নিয়েছে|transferred|sent\s*money|debited|ক্যাশ\s*আউট\s*হয়েছে|নিয়ে\s*নিয়েছে)/i.test(rawText));

    const isGoldenHour = elapsedMinutes <= 120 && hasActiveTransfer && potential_loss_bdt > 0;
    const golden_hour_remaining_mins = isGoldenHour ? Math.max(0, 120 - elapsedMinutes) : 0;

    // Rule 1: P1 Active Financial Loss within Golden-Hour Window
    if (isGoldenHour && potential_loss_bdt > 0) {
      return {
        priority: 'P1',
        priority_reason: `Active financial loss of ৳${potential_loss_bdt.toLocaleString()} reported within Golden-Hour (${elapsedMinutes}m elapsed, ${golden_hour_remaining_mins}m remaining). High fund-recovery potential.`,
        is_golden_hour: true,
        golden_hour_remaining_mins,
        potential_loss_bdt
      };
    }

    // Rule 2: P1 High Loss or Ongoing Account Takeover
    if (classification === 'account_takeover' && elapsedMinutes <= 180) {
      return {
        priority: 'P1',
        priority_reason: `Active Account Takeover (ATO) risk within 3 hours window. Immediate session kill & wallet freeze required.`,
        is_golden_hour: true,
        golden_hour_remaining_mins: Math.max(0, 120 - elapsedMinutes),
        potential_loss_bdt: potential_loss_bdt || 50000
      };
    }

    // Rule 3: P2 Suspicious Attempted Scam (No money sent yet, or caught in time)
    if (classification === 'fake_customer_care' || classification === 'PIN_OTP_request' || isExplicitNoLoss || !hasActiveTransfer) {
      return {
        priority: 'P2',
        priority_reason: `Suspicious attempted scam reported. Scammer contact identified without confirmed completed fund transfer.`,
        is_golden_hour: false,
        golden_hour_remaining_mins: 0,
        potential_loss_bdt: 0
      };
    }

    // Rule 4: P3 Historical Complaint (>24h elapsed)
    if (elapsedMinutes > 1440 || /(গতকাল|গত\s*মাসে|days\s*ago|yesterday|last\s*week)/i.test(rawText)) {
      return {
        priority: 'P3',
        priority_reason: `Historical complaint reported after golden-hour window (${Math.round(elapsedMinutes / 60)}h elapsed). Forwarded for retrospective intelligence & mule mapping.`,
        is_golden_hour: false,
        golden_hour_remaining_mins: 0,
        potential_loss_bdt
      };
    }

    // Rule 5: P4 Informational / Wrong Transfer / General
    return {
      priority: 'P4',
      priority_reason: `Informational dispute or standard customer care request without active fraud urgency.`,
      is_golden_hour: false,
      golden_hour_remaining_mins: 0,
      potential_loss_bdt
    };
  }

  // ================= 5. DUPLICATE DETECTION & CLUSTERING =================
  detectDuplicates(
    complaintText: string, 
    entities: ExtractedComplaintEntities, 
    existingList: StructuredComplaint[]
  ): {
    duplicate_group_id?: string;
    duplicate_count: number;
    similarity_score: number;
    matched_complaint_ids: string[];
  } {
    const norm = this.normalizeText(complaintText);
    const tokens = new Set(norm.split(/\s+/).filter(t => t.length > 2));

    let bestMatchId: string | null = null;
    let maxSim = 0.0;
    const matchedIds: string[] = [];

    for (const other of existingList) {
      let sim = 0.0;
      
      // Check exact entity overlaps (Shared Scammer Phone or Shared Target Wallet)
      const sharedPhones = entities.phone_numbers.filter(p => other.extracted_entities.phone_numbers.includes(p));
      const sharedWallets = entities.wallets.filter(w => other.extracted_entities.wallets.includes(w));
      const sharedUrls = entities.urls.filter(u => other.extracted_entities.urls.includes(u));

      if (sharedWallets.length > 0) {
        sim += 0.50; // Strong entity anchor
      }
      if (sharedPhones.length > 0) {
        sim += 0.40; // Scammer number anchor
      }
      if (sharedUrls.length > 0) {
        sim += 0.35;
      }

      // Jaccard similarity on tokens
      const otherTokens = new Set(other.normalized_text.split(/\s+/).filter(t => t.length > 2));
      let intersection = 0;
      for (const t of tokens) {
        if (otherTokens.has(t)) intersection++;
      }
      const union = new Set([...tokens, ...otherTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      sim += jaccard * 0.40;

      if (sim > maxSim) {
        maxSim = sim;
        bestMatchId = other.complaint_id;
      }

      if (sim >= 0.45) {
        matchedIds.push(other.complaint_id);
      }
    }

    if (maxSim >= 0.45 && bestMatchId) {
      const best = existingList.find(c => c.complaint_id === bestMatchId);
      const groupId = best?.duplicate_group_id || `DUP-GRP-${bestMatchId.replace('CMP-', '')}`;
      return {
        duplicate_group_id: groupId,
        duplicate_count: matchedIds.length + 1,
        similarity_score: Number(Math.min(0.99, maxSim).toFixed(2)),
        matched_complaint_ids: matchedIds
      };
    }

    return {
      duplicate_group_id: undefined,
      duplicate_count: 1,
      similarity_score: 0.0,
      matched_complaint_ids: []
    };
  }

  // ================= 6. ENTITY LINKING & CASE ENRICHMENT =================
  enrichEvidenceLinks(
    complaintId: string,
    entities: ExtractedComplaintEntities,
    classification: ComplaintCategory,
    potentialLoss: number
  ): {
    evidence_links: ComplaintEvidenceLink[];
    linked_txn_id?: string;
    linked_wallet_id?: string;
    linked_recipient_wallet?: string;
    linked_agent_id?: string;
    linked_merchant_id?: string;
    linked_ring_id?: string;
    linked_campaign_id?: string;
    linked_case_id?: string;
  } {
    const links: ComplaintEvidenceLink[] = [];
    let linked_txn_id: string | undefined;
    let linked_wallet_id: string | undefined;
    let linked_recipient_wallet: string | undefined;
    let linked_agent_id: string | undefined;
    let linked_merchant_id: string | undefined;
    let linked_ring_id: string | undefined;
    let linked_campaign_id: string | undefined;
    let linked_case_id: string | undefined;

    // 1. Link Target Recipient Wallet
    if (entities.wallets.length > 0) {
      linked_recipient_wallet = entities.wallets[0];
      links.push({
        target_type: 'RECIPIENT',
        target_id: linked_recipient_wallet,
        target_label: `Destination Mule Wallet (${linked_recipient_wallet})`,
        confidence: 0.98,
        evidence_text: `Directly referenced destination wallet in customer complaint statement. Matched ৳${potentialLoss.toLocaleString()} cashout corridor.`
      });

      // Synthetic association to known high-risk mule ring
      if (linked_recipient_wallet.includes('881920') || linked_recipient_wallet.includes('091177') || linked_recipient_wallet.includes('902144')) {
        linked_ring_id = 'RING-003';
        linked_case_id = 'CASE-RING-003';
        links.push({
          target_type: 'RING',
          target_id: 'RING-003',
          target_label: 'Ring-003: Dhaka Rapid Cash-Out Mule Network',
          confidence: 0.95,
          evidence_text: `Destination wallet ${linked_recipient_wallet} is an active collector node in Ring-003 with ৳2.4M pass-through velocity.`
        });
      }
    }

    // 2. Link Campaign
    if (classification === 'fake_customer_care' || classification === 'PIN_OTP_request') {
      linked_campaign_id = 'CAMP-FAKE-CUSTOMER-CARE';
      links.push({
        target_type: 'CAMPAIGN',
        target_id: linked_campaign_id,
        target_label: 'Campaign: Fake Upay Customer Care Impersonation Wave',
        confidence: 0.92,
        evidence_text: `Identical social engineering script, emergency account freeze pretexts, and caller spoofing patterns matching Campaign CAMP-FAKE-CARE.`
      });
    } else if (classification === 'investment_scam') {
      linked_campaign_id = 'CAMP-TELEGRAM-TASK';
      links.push({
        target_type: 'CAMPAIGN',
        target_id: linked_campaign_id,
        target_label: 'Campaign: Telegram Part-Time Job Task Matrix',
        confidence: 0.89,
        evidence_text: `Telegram channel links and staged deposit instructions matching active national investment fraud cluster.`
      });
    }

    // 3. Link Agent
    if (entities.agent_ids.length > 0) {
      linked_agent_id = entities.agent_ids[0];
      links.push({
        target_type: 'AGENT',
        target_id: linked_agent_id,
        target_label: `Agent Outlet (${linked_agent_id})`,
        confidence: 0.91,
        evidence_text: `Agent outlet identified as cash-out terminal within 12 minutes of victim transfer.`
      });
    }

    // 4. Link Merchant
    if (entities.merchant_ids.length > 0) {
      linked_merchant_id = entities.merchant_ids[0];
      links.push({
        target_type: 'MERCHANT',
        target_id: linked_merchant_id,
        target_label: `Merchant Destination (${linked_merchant_id})`,
        confidence: 0.94,
        evidence_text: `QR code payment endpoint registered with abnormal customer concentration ratio (0.88).`
      });
    }

    // 5. Link Transaction Reference
    if (entities.txn_refs.length > 0) {
      linked_txn_id = entities.txn_refs[0];
      links.push({
        target_type: 'TRANSACTION',
        target_id: linked_txn_id,
        target_label: `Transaction Ref ${linked_txn_id}`,
        confidence: 1.0,
        evidence_text: `Verified against ledger transaction ID matching amount ৳${potentialLoss.toLocaleString()}.`
      });
    }

    return {
      evidence_links: links,
      linked_txn_id,
      linked_wallet_id,
      linked_recipient_wallet,
      linked_agent_id,
      linked_merchant_id,
      linked_ring_id,
      linked_campaign_id,
      linked_case_id
    };
  }

  // ================= 7. FULL COMPLAINT PROCESSING PIPELINE =================
  processComplaint(params: {
    raw_text: string;
    reporter_wallet?: string;
    reporter_phone?: string;
    reporter_name?: string;
    elapsed_minutes?: number;
    custom_created_at?: string;
  }): StructuredComplaint {
    const complaintId = `CMP-SYN-${Math.floor(100000 + Math.random() * 900000)}`;
    const detected_language = this.detectLanguage(params.raw_text);
    const normalized_text = this.normalizeText(params.raw_text);
    const extracted_entities = this.extractEntities(params.raw_text);
    
    // Fallback wallet/phone from params if not inside text
    if (params.reporter_phone && !extracted_entities.phone_numbers.includes(params.reporter_phone)) {
      extracted_entities.phone_numbers.push(params.reporter_phone);
    }
    if (params.reporter_wallet && !extracted_entities.wallets.includes(params.reporter_wallet)) {
      extracted_entities.wallets.push(params.reporter_wallet);
    }

    const { classification, category_label_bn, category_label_en, typology, typology_label_bn } = 
      this.classifyComplaint(params.raw_text, extracted_entities);

    const elapsed = params.elapsed_minutes !== undefined ? params.elapsed_minutes : 15;
    const { priority, priority_reason, is_golden_hour, golden_hour_remaining_mins, potential_loss_bdt } = 
      this.calculatePriority(classification, extracted_entities, elapsed, params.raw_text);

    const existingList = Array.from(this.complaints.values());
    const { duplicate_group_id, duplicate_count, similarity_score } = 
      this.detectDuplicates(params.raw_text, extracted_entities, existingList);

    const enrichment = this.enrichEvidenceLinks(
      complaintId,
      extracted_entities,
      classification,
      potential_loss_bdt
    );

    const createdAt = params.custom_created_at || new Date(Date.now() - elapsed * 60 * 1000).toISOString();

    const record: StructuredComplaint = {
      complaint_id: complaintId,
      raw_text: params.raw_text,
      normalized_text,
      detected_language,
      reporter_wallet: params.reporter_wallet || (extracted_entities.wallets[0] || 'W-SYN-771822'),
      reporter_phone: params.reporter_phone || (extracted_entities.phone_numbers[0] || '01712-334455'),
      reporter_name: params.reporter_name || 'Customer Statement',
      classification,
      category_label_bn,
      category_label_en,
      typology,
      typology_label_bn,
      priority,
      priority_reason,
      is_golden_hour,
      golden_hour_remaining_mins,
      potential_loss_bdt,
      extracted_entities,
      duplicate_group_id,
      duplicate_count,
      duplicate_similarity_score: similarity_score,
      linked_txn_id: enrichment.linked_txn_id,
      linked_wallet_id: enrichment.linked_wallet_id,
      linked_recipient_wallet: enrichment.linked_recipient_wallet,
      linked_agent_id: enrichment.linked_agent_id,
      linked_merchant_id: enrichment.linked_merchant_id,
      linked_ring_id: enrichment.linked_ring_id,
      linked_campaign_id: enrichment.linked_campaign_id,
      linked_case_id: enrichment.linked_case_id,
      evidence_links: enrichment.evidence_links,
      status: is_golden_hour ? 'TRIAGED' : 'NEW',
      customer_response_status: 'UNREAD',
      created_at: createdAt,
      updated_at: new Date().toISOString()
    };

    this.complaints.set(complaintId, record);

    // Update or create duplicate group
    if (duplicate_group_id) {
      let grp = this.duplicateGroups.get(duplicate_group_id);
      if (!grp) {
        grp = {
          group_id: duplicate_group_id,
          primary_complaint_id: complaintId,
          complaint_ids: [complaintId],
          common_entities: {
            phones: extracted_entities.phone_numbers,
            wallets: extracted_entities.wallets,
            urls: extracted_entities.urls
          },
          shared_phrases: ['upay head office', 'account freeze threat', 'send money immediately'],
          linked_campaign_id: enrichment.linked_campaign_id,
          linked_ring_id: enrichment.linked_ring_id,
          total_exposure_bdt: potential_loss_bdt,
          created_at: createdAt
        };
      } else {
        if (!grp.complaint_ids.includes(complaintId)) {
          grp.complaint_ids.push(complaintId);
          grp.total_exposure_bdt += potential_loss_bdt;
        }
      }
      this.duplicateGroups.set(duplicate_group_id, grp);
    }

    auditService.logAction(
      'SYSTEM_COMPLAINT_PIPELINE',
      'PROCESS_COMPLAINT',
      complaintId,
      { classification, priority, potential_loss_bdt, duplicate_group_id, linked_ring_id: enrichment.linked_ring_id }
    );

    return record;
  }

  // ================= 8. DEMO: 5-COMPLAINT COORDINATED SCAM DISCOVERY =================
  generate5ComplaintDemoScenario(): {
    complaints: StructuredComplaint[];
    duplicate_group: ComplaintDuplicateGroup;
    summary: {
      total_victims: number;
      total_exposure_bdt: number;
      p1_golden_hour_count: number;
      linked_campaign: string;
      linked_ring: string;
      shared_scammer_number: string;
      shared_destination_wallet: string;
    };
  } {
    // Clear demo cache to generate a pristine, coherent demonstration
    const demoGroupId = 'DUP-GRP-CARE-88';
    
    // 5 Coordinated Customer Complaints with different timestamps and contexts
    const demoPayloads = [
      {
        raw_text: 'আমাকে 01711-998822 নম্বর থেকে ফোন করে বললো সে উপায় হেড অফিসের ম্যানেজার। বললো আমার অ্যাকাউন্ট বন্ধ হয়ে যাবে, তাই ভেরিফিকেশনের জন্য ৳25,000 পাঠাতে হবে W-SYN-881920 নাম্বারে। আমি দ্রুত টাকা পাঠিয়ে দিয়েছি ১০ মিনিট আগে। এখন নাম্বার বন্ধ!',
        reporter_name: 'আব্দুল করিম (Karim)',
        reporter_phone: '01812-445566',
        reporter_wallet: 'W-SYN-102911',
        elapsed_minutes: 15,
        target_amount: 25000
      },
      {
        raw_text: 'Call from 01711-998822 claiming to be upay customer care officer. Said my wallet had suspicious activity and told me to transfer ৳18,500 security deposit to wallet W-SYN-881920 immediately. Transferred 35 mins ago! Please freeze the money!',
        reporter_name: 'রাশেদ চৌধুরী (Rashed)',
        reporter_phone: '01719-887711',
        reporter_wallet: 'W-SYN-204819',
        elapsed_minutes: 35,
        target_amount: 18500
      },
      {
        raw_text: '01711-998822 থেকে কল করে আমার কাছে ৬ ডিজিটের ওটিপি ও পিন কোড চাচ্ছিলো। উপায় কাস্টমার কেয়ার সেজে কথা বলছিল। আমি পিন দেইনি এবং সাথে সাথে ফোন কেটে দিয়েছি। কোনো টাকা পাঠাইনি।',
        reporter_name: 'ফারহানা ইয়াসমিন (Farhana)',
        reporter_phone: '01911-332211',
        reporter_wallet: 'W-SYN-309182',
        elapsed_minutes: 50,
        target_amount: 0
      },
      {
        raw_text: 'উপায় হেড অফিস থেকে বলছি বলে 01711-998822 থেকে ফোন আসে। একাউন্ট আনলক করার জন্য ৳32,000 টাকা W-SYN-881920 ওয়ালেটে পাঠাতে বলে এবং পরে দেখলাম এজেন্ট A-SYN-4412 থেকে ক্যাশ আউট হয়ে গেছে। ১ ঘণ্টা আগে ঘটনা ঘটেছে!',
        reporter_name: 'কামাল হোসেন (Kamal)',
        reporter_phone: '01611-990011',
        reporter_wallet: 'W-SYN-401928',
        elapsed_minutes: 65,
        target_amount: 32000
      },
      {
        raw_text: 'গতকাল বিকেলে একই স্ক্রিপ্ট: 01711-998822 থেকে কল করে বিকাশ-উপায় সিকিউরিটি আপডেটের কথা বলে W-SYN-881920 নম্বরে ৳15,000 নিয়ে গেছে। এখনও কোনো সুরাহা পাইনি।',
        reporter_name: 'তানভীর আহমেদ (Tanveer)',
        reporter_phone: '01511-778899',
        reporter_wallet: 'W-SYN-508192',
        elapsed_minutes: 2160, // 36 hours ago (Historical)
        target_amount: 15000
      }
    ];

    const generated: StructuredComplaint[] = [];
    let totalExposure = 0;
    let p1Count = 0;

    for (const p of demoPayloads) {
      const cmp = this.processComplaint({
        raw_text: p.raw_text,
        reporter_name: p.reporter_name,
        reporter_phone: p.reporter_phone,
        reporter_wallet: p.reporter_wallet,
        elapsed_minutes: p.elapsed_minutes
      });
      // Force group into coherent duplicate cluster for demo
      cmp.duplicate_group_id = demoGroupId;
      cmp.duplicate_count = 5;
      cmp.duplicate_similarity_score = 0.94;
      cmp.linked_recipient_wallet = 'W-SYN-881920';
      cmp.linked_ring_id = 'RING-003';
      cmp.linked_campaign_id = 'CAMP-FAKE-CUSTOMER-CARE';
      cmp.linked_case_id = 'CASE-RING-003';

      if (cmp.priority === 'P1') p1Count++;
      totalExposure += cmp.potential_loss_bdt;
      this.complaints.set(cmp.complaint_id, cmp);
      generated.push(cmp);
    }

    const duplicateGroup: ComplaintDuplicateGroup = {
      group_id: demoGroupId,
      primary_complaint_id: generated[0].complaint_id,
      complaint_ids: generated.map(c => c.complaint_id),
      common_entities: {
        phones: ['01711-998822'],
        wallets: ['W-SYN-881920'],
        urls: []
      },
      shared_phrases: ['upay head office', 'account freeze threat', 'verification deposit', '01711-998822', 'W-SYN-881920'],
      linked_campaign_id: 'CAMP-FAKE-CUSTOMER-CARE',
      linked_ring_id: 'RING-003',
      total_exposure_bdt: totalExposure,
      created_at: new Date().toISOString()
    };

    this.duplicateGroups.set(demoGroupId, duplicateGroup);

    auditService.logAction(
      'ANALYST-DEMO',
      'RUN_5_COMPLAINT_SCAM_DEMO',
      demoGroupId,
      { total_victims: 5, totalExposure, p1Count, linked_ring: 'RING-003' }
    );

    return {
      complaints: generated,
      duplicate_group: duplicateGroup,
      summary: {
        total_victims: 5,
        total_exposure_bdt: totalExposure,
        p1_golden_hour_count: p1Count,
        linked_campaign: 'CAMP-FAKE-CUSTOMER-CARE (Fake Upay Customer Care Impersonation)',
        linked_ring: 'RING-003 (Dhaka Rapid Cash-Out Mule Network)',
        shared_scammer_number: '01711-998822',
        shared_destination_wallet: 'W-SYN-881920'
      }
    };
  }

  // ================= 9. ANALYST OVERRIDES & ACTIONS =================
  overrideLink(
    complaintId: string, 
    targetType: ComplaintEvidenceLink['target_type'], 
    newTargetId: string, 
    analystId: string,
    notes?: string
  ): StructuredComplaint | null {
    const cmp = this.complaints.get(complaintId);
    if (!cmp) return null;

    // Check if link exists
    const existingLink = cmp.evidence_links.find(l => l.target_type === targetType);
    if (existingLink) {
      existingLink.target_id = newTargetId;
      existingLink.target_label = `${targetType}: ${newTargetId} (Analyst Verified)`;
      existingLink.is_analyst_override = true;
      existingLink.confidence = 1.0;
      existingLink.evidence_text = notes || `Manually overridden by ${analystId}`;
    } else {
      cmp.evidence_links.push({
        target_type: targetType,
        target_id: newTargetId,
        target_label: `${targetType}: ${newTargetId} (Analyst Linked)`,
        confidence: 1.0,
        evidence_text: notes || `Manually linked by ${analystId}`,
        is_analyst_override: true
      });
    }

    if (targetType === 'RING') cmp.linked_ring_id = newTargetId;
    if (targetType === 'CAMPAIGN') cmp.linked_campaign_id = newTargetId;
    if (targetType === 'RECIPIENT') cmp.linked_recipient_wallet = newTargetId;
    if (targetType === 'TRANSACTION') cmp.linked_txn_id = newTargetId;

    cmp.updated_at = new Date().toISOString();
    cmp.analyst_notes = notes ? `${cmp.analyst_notes ? cmp.analyst_notes + ' | ' : ''}${notes}` : cmp.analyst_notes;

    this.analystActions.push({
      action_id: `ACT-CMP-${Date.now()}`,
      complaint_id: complaintId,
      action_type: 'OVERRIDE_LINK',
      analyst_id: analystId,
      details: { targetType, newTargetId, notes },
      timestamp: new Date().toISOString()
    });

    auditService.logAction(
      analystId,
      'COMPLAINT_OVERRIDE_LINK',
      complaintId,
      { targetType, newTargetId, notes }
    );

    return cmp;
  }

  changePriority(complaintId: string, newPriority: ComplaintPriority, analystId: string, reason: string): StructuredComplaint | null {
    const cmp = this.complaints.get(complaintId);
    if (!cmp) return null;

    cmp.priority = newPriority;
    cmp.priority_reason = `Analyst Override (${analystId}): ${reason}`;
    cmp.updated_at = new Date().toISOString();

    this.analystActions.push({
      action_id: `ACT-PRIO-${Date.now()}`,
      complaint_id: complaintId,
      action_type: 'CHANGE_PRIORITY',
      analyst_id: analystId,
      details: { newPriority, reason },
      timestamp: new Date().toISOString()
    });

    auditService.logAction(analystId, 'COMPLAINT_CHANGE_PRIORITY', complaintId, { newPriority, reason });
    return cmp;
  }

  triggerEmergencyHold(complaintId: string, walletId: string, analystId: string): { success: boolean; message: string; complaint: StructuredComplaint | null } {
    const cmp = this.complaints.get(complaintId);
    if (!cmp) return { success: false, message: 'Complaint not found', complaint: null };

    cmp.status = 'FROZEN_RECOVERY';
    cmp.updated_at = new Date().toISOString();

    this.analystActions.push({
      action_id: `ACT-HOLD-${Date.now()}`,
      complaint_id: complaintId,
      action_type: 'TRIGGER_EMERGENCY_HOLD',
      analyst_id: analystId,
      details: { walletId, status: 'FROZEN_RECOVERY' },
      timestamp: new Date().toISOString()
    });

    auditService.logAction(analystId, 'COMPLAINT_EMERGENCY_HOLD', walletId, { complaintId, status: 'FROZEN_RECOVERY' });

    return {
      success: true,
      message: `Emergency recovery hold placed on wallet ${walletId}. Stolen funds preserved under Golden-Hour protocol.`,
      complaint: cmp
    };
  }

  dispatchCustomerAdvisory(complaintId: string, phone: string, text: string, analystId: string): { success: boolean; message: string; complaint: StructuredComplaint | null } {
    const cmp = this.complaints.get(complaintId);
    if (!cmp) return { success: false, message: 'Complaint not found', complaint: null };

    cmp.customer_response_status = 'ADVISORY_SENT';
    cmp.updated_at = new Date().toISOString();

    this.analystActions.push({
      action_id: `ACT-ADV-${Date.now()}`,
      complaint_id: complaintId,
      action_type: 'DISPATCH_ADVISORY',
      analyst_id: analystId,
      details: { phone, advisory_text: text },
      timestamp: new Date().toISOString()
    });

    auditService.logAction(analystId, 'COMPLAINT_DISPATCH_ADVISORY', phone, { complaintId, text });

    return {
      success: true,
      message: `Direct security advisory SMS successfully dispatched to customer ${phone}.`,
      complaint: cmp
    };
  }

  // ================= 10. RETRIEVAL & QUEUES =================
  getAllComplaints(): StructuredComplaint[] {
    return Array.from(this.complaints.values()).sort((a, b) => {
      // Sort P1 first, then by timestamp desc
      const pOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
      if (pOrder[a.priority] !== pOrder[b.priority]) {
        return pOrder[a.priority] - pOrder[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  getComplaintById(id: string): StructuredComplaint | null {
    return this.complaints.get(id) || null;
  }

  getDuplicateGroup(groupId: string): ComplaintDuplicateGroup | null {
    return this.duplicateGroups.get(groupId) || null;
  }

  getAllDuplicateGroups(): ComplaintDuplicateGroup[] {
    return Array.from(this.duplicateGroups.values());
  }

  getStats(): {
    total_complaints: number;
    p1_active_loss_count: number;
    p2_attempt_count: number;
    p3_historical_count: number;
    p4_info_count: number;
    total_potential_exposure_bdt: number;
    duplicate_groups_count: number;
    enriched_cases_count: number;
  } {
    const list = Array.from(this.complaints.values());
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0, totalExp = 0;
    const enrichedCases = new Set<string>();

    for (const c of list) {
      if (c.priority === 'P1') p1++;
      else if (c.priority === 'P2') p2++;
      else if (c.priority === 'P3') p3++;
      else p4++;

      totalExp += c.potential_loss_bdt;
      if (c.linked_ring_id) enrichedCases.add(c.linked_ring_id);
      if (c.linked_case_id) enrichedCases.add(c.linked_case_id);
      if (c.linked_campaign_id) enrichedCases.add(c.linked_campaign_id);
    }

    return {
      total_complaints: list.length,
      p1_active_loss_count: p1,
      p2_attempt_count: p2,
      p3_historical_count: p3,
      p4_info_count: p4,
      total_potential_exposure_bdt: totalExp,
      duplicate_groups_count: this.duplicateGroups.size,
      enriched_cases_count: enrichedCases.size
    };
  }

  // Default seed data to populate system on startup
  private seedDefaultComplaints() {
    this.generate5ComplaintDemoScenario();
  }
}

export const complaintActionIntelligenceService = new ComplaintActionIntelligenceService();
