import { 
  MerchantProfile, CustomerToMerchantFeatures, MerchantEvaluationResult, 
  MerchantTrustBadge, ReasonCodeDetail 
} from '../core/types.js';
import { auditService } from './audit-service.js';

export class MerchantScamShieldService {
  private merchants: Map<string, MerchantProfile> = new Map();
  private qrCodeMap: Map<string, string> = new Map(); // qr_code_id -> merchant_id
  private merchantTxnHistory: Map<string, Array<{ sender: string; amount: number; ts: string }>> = new Map();

  constructor() {
    this.seedSyntheticMerchants();
  }

  /**
   * Seed realistic synthetic merchants across Bangladesh MFS categories
   */
  private seedSyntheticMerchants() {
    // 1. Suspicious Merchant: Telegram Task / Fake Investment QR (M-SYN-7001)
    const m1: MerchantProfile = {
      merchant_id: 'M-SYN-7001',
      qr_code_id: 'QR-UPAY-M7001',
      name: 'Apex Digital Task & Commerce Hub',
      category: 'ONLINE_TASK',
      division: 'Dhaka',
      location_cluster: 'Virtual / Mirpur-10 Hub',
      merchant_age: 4, // 4 days old (New)
      transaction_volume: 1850000, // ৳18.5 Lakh in 4 days
      unique_customer_count: 100, // 100 unrelated customers
      refund_ratio: 0.0, // 0 refunds
      complaint_ratio: 0.18, // 18 complaints
      chargeback_like_events: 12,
      average_ticket: 18500, // Identical ৳18,500 tickets
      transaction_velocity: 25.0, // 25 txns/day
      customer_concentration: 0.05, // Highly dispersed unrelated customers
      device_count: 2, // 2 shared syndicate devices
      linked_wallet_count: 8, // 8 downstream mule wallets
      cashout_ratio: 0.94, // 94% rapid drain pass-through
      trust_badge: 'REVIEW',
      risk_score: 0.91,
      is_suspicious_drain: true,
      linked_mule_rings: ['RING-2026-0012'],
      created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    };
    this.merchants.set(m1.merchant_id, m1);
    this.qrCodeMap.set(m1.qr_code_id, m1.merchant_id);

    // 2. Legitimate Established Merchant: Shwapno Daily Dhanmondi (M-SYN-1002)
    const m2: MerchantProfile = {
      merchant_id: 'M-SYN-1002',
      qr_code_id: 'QR-UPAY-M1002',
      name: 'Shwapno Daily Super Shop - Dhanmondi',
      category: 'GROCERY',
      division: 'Dhaka',
      location_cluster: 'Dhanmondi, Dhaka',
      merchant_age: 480, // Established > 1 year
      transaction_volume: 3820000,
      unique_customer_count: 4500,
      refund_ratio: 0.02,
      complaint_ratio: 0.001,
      chargeback_like_events: 1,
      average_ticket: 850,
      transaction_velocity: 150.0,
      customer_concentration: 0.02,
      device_count: 4,
      linked_wallet_count: 1,
      cashout_ratio: 0.15, // Normal settlement
      trust_badge: 'NORMAL',
      risk_score: 0.03,
      is_suspicious_drain: false,
      linked_mule_rings: [],
      created_at: new Date(Date.now() - 480 * 24 * 3600 * 1000).toISOString()
    };
    this.merchants.set(m2.merchant_id, m2);
    this.qrCodeMap.set(m2.qr_code_id, m2.merchant_id);

    // 3. New Legitimate Merchant: Lazz Pharma Uttara (M-SYN-3003)
    const m3: MerchantProfile = {
      merchant_id: 'M-SYN-3003',
      qr_code_id: 'QR-UPAY-M3003',
      name: 'Lazz Pharma Outlet - Sector 7 Uttara',
      category: 'PHARMACY',
      division: 'Dhaka',
      location_cluster: 'Uttara, Dhaka',
      merchant_age: 12, // 12 days old
      transaction_volume: 240000,
      unique_customer_count: 140,
      refund_ratio: 0.01,
      complaint_ratio: 0.0,
      chargeback_like_events: 0,
      average_ticket: 480,
      transaction_velocity: 18.0,
      customer_concentration: 0.04,
      device_count: 1,
      linked_wallet_count: 1,
      cashout_ratio: 0.20,
      trust_badge: 'NEW',
      risk_score: 0.12,
      is_suspicious_drain: false,
      linked_mule_rings: [],
      created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
    };
    this.merchants.set(m3.merchant_id, m3);
    this.qrCodeMap.set(m3.qr_code_id, m3.merchant_id);

    // 4. Watchlist Merchant: Global Gadgets Surge (M-SYN-5004)
    const m4: MerchantProfile = {
      merchant_id: 'M-SYN-5004',
      qr_code_id: 'QR-UPAY-M5004',
      name: 'Global Luxury Gadget Import Shop',
      category: 'ELECTRONICS',
      division: 'Chittagong',
      location_cluster: 'Agrabad, Chittagong',
      merchant_age: 18,
      transaction_volume: 2400000,
      unique_customer_count: 320,
      refund_ratio: 0.005,
      complaint_ratio: 0.08, // Mild complaint surge
      chargeback_like_events: 5,
      average_ticket: 7500,
      transaction_velocity: 45.0,
      customer_concentration: 0.12,
      device_count: 3,
      linked_wallet_count: 4,
      cashout_ratio: 0.72,
      trust_badge: 'WATCH',
      risk_score: 0.65,
      is_suspicious_drain: false,
      linked_mule_rings: ['RING-2026-0008'],
      created_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString()
    };
    this.merchants.set(m4.merchant_id, m4);
    this.qrCodeMap.set(m4.qr_code_id, m4.merchant_id);
  }

  /**
   * Resolve QR code or Merchant ID
   */
  resolveMerchant(identifier: string): MerchantProfile | undefined {
    if (this.merchants.has(identifier)) {
      return this.merchants.get(identifier);
    }
    const merchantId = this.qrCodeMap.get(identifier);
    if (merchantId) {
      return this.merchants.get(merchantId);
    }
    return undefined;
  }

  /**
   * Extract Customer-to-Merchant Behavioral Features
   */
  extractCustomerMerchantFeatures(
    senderWallet: string,
    merchant: MerchantProfile,
    amountBdt: number
  ): CustomerToMerchantFeatures {
    // 1. Amount deviation relative to merchant average ticket
    const amountDev = merchant.average_ticket > 0 
      ? Number((amountBdt / merchant.average_ticket).toFixed(2)) 
      : 1.0;

    // 2. Merchant Novelty (registered within last 14 days)
    const isNovel = merchant.merchant_age <= 14;

    // 3. Customer Entropy (suspicious when high fan-in occurs on newly created accounts with uniform structured amounts)
    const isHighFanIn = merchant.unique_customer_count >= 50;
    const isNewOrRapidDrain = merchant.merchant_age <= 30 || merchant.cashout_ratio >= 0.80 || merchant.is_suspicious_drain;
    const entropy = isHighFanIn && isNewOrRapidDrain ? 0.94 : 0.22;

    return {
      first_time_merchant: true, // Default for demo transaction
      amount_deviation: amountDev,
      merchant_novelty: isNovel,
      customer_merchant_frequency: 0,
      merchant_customer_entropy: entropy,
      qr_scan_context: 'CAMERA_SCAN_DIRECT'
    };
  }

  /**
   * Evaluate Contextual Merchant Risk before Payment Confirmation
   */
  evaluateMerchantPayment(
    senderWallet: string,
    merchantIdOrQr: string,
    amountBdt: number = 18500
  ): MerchantEvaluationResult {
    const merchant = this.resolveMerchant(merchantIdOrQr) || this.merchants.get('M-SYN-7001')!;
    const customerFeatures = this.extractCustomerMerchantFeatures(senderWallet, merchant, amountBdt);

    const reasons: Array<{ code: string; label_en: string; label_bn: string; weight: number }> = [];

    // Suspicious Patterns Detection
    let riskScore = 0.03;

    // Pattern 1: Newly created merchant with volume surge
    if (merchant.merchant_age <= 7 && merchant.transaction_volume > 500000) {
      reasons.push({
        code: 'RC_MERCH_01',
        label_en: 'Newly created merchant with abnormal rapid volume surge',
        label_bn: 'মার্চেন্ট অ্যাকাউন্টটি নতুন এবং অস্বাভাবিক দ্রুত লেনদেন হচ্ছে',
        weight: 0.35
      });
      riskScore += 0.35;
    }

    // Pattern 2: Many unrelated customers sending similar amounts (e.g. 100 customers x ৳18,500)
    if (merchant.unique_customer_count >= 50 && customerFeatures.merchant_customer_entropy > 0.80 && (merchant.merchant_age <= 30 || merchant.cashout_ratio > 0.80)) {
      reasons.push({
        code: 'RC_MERCH_02',
        label_en: 'High-entropy customer fan-in with uniform structured ticket size',
        label_bn: 'বহু অপরিচিত গ্রাহকের কাছ থেকে একই অঙ্কের টাকা জমা হচ্ছে',
        weight: 0.30
      });
      riskScore += 0.30;
    }

    // Pattern 3: Rapid funds movement / pass-through drain (>90%)
    if (merchant.cashout_ratio >= 0.85) {
      reasons.push({
        code: 'RC_MERCH_03',
        label_en: 'Rapid drain pass-through to personal mule accounts (>90%)',
        label_bn: 'মার্চেন্টে টাকা ঢোকার সাথে সাথে দ্রুত অন্যত্র সরিয়ে নেওয়া হচ্ছে',
        weight: 0.25
      });
      riskScore += 0.25;
    }

    // Pattern 4: Direct graph link to flagged mule rings
    if (merchant.linked_mule_rings.length > 0) {
      reasons.push({
        code: 'RC_MERCH_04',
        label_en: 'Merchant is connected to confirmed mule ring (Ring-12 Hub)',
        label_bn: 'মার্চেন্টটি সন্দেহজনক মিউল অ্যাকাউন্টের সাথে যুক্ত',
        weight: 0.40
      });
      riskScore += 0.40;
    }

    // Pattern 5: High complaint ratio
    if (merchant.complaint_ratio >= 0.10) {
      reasons.push({
        code: 'RC_MERCH_05',
        label_en: 'Elevated community fraud complaints recorded against merchant',
        label_bn: 'এই মার্চেন্টের বিরুদ্ধে পূর্বে গ্রাহক অভিযোগ রয়েছে',
        weight: 0.28
      });
      riskScore += 0.25;
    }

    riskScore = Number(Math.min(0.98, Math.max(0.02, riskScore)).toFixed(2));

    // Determine Action & Warning
    let action: 'ALLOW' | 'PAUSE_VERIFY' | 'HOLD_ASSIST' | 'BLOCK' = 'ALLOW';
    let warningRequired = false;
    let warningBn = '';
    let warningEn = '';

    if (riskScore >= 0.75) {
      action = 'PAUSE_VERIFY';
      warningRequired = true;
      warningBn = 'এই মার্চেন্টটি নতুন এবং সাম্প্রতিক লেনদেনের ধরন অস্বাভাবিক। আপনি কি নিশ্চিত টাকা পাঠাতে চান?';
      warningEn = 'This merchant is recently registered and exhibits abnormal transaction behavior. Are you sure you want to proceed?';
    } else if (riskScore >= 0.50) {
      action = 'PAUSE_VERIFY';
      warningRequired = true;
      warningBn = 'সতর্কতা: এই মার্চেন্টে প্রথমবার লেনদেন করছেন। প্রাপক নিশ্চিত করুন।';
      warningEn = 'Caution: You are paying this merchant for the first time. Please confirm recipient.';
    }

    // Model comparison measurement (Transaction-Only baseline vs Behavioral Merchant Shield)
    const txnOnlyScore = Number(Math.min(0.55, 0.20 + (amountBdt > 15000 ? 0.25 : 0.05)).toFixed(2));
    const lift = Number((riskScore / Math.max(0.01, txnOnlyScore)).toFixed(2));

    return {
      merchant,
      customer_features: customerFeatures,
      risk_score: riskScore,
      trust_badge: merchant.trust_badge,
      action_recommended: action,
      warning_required: warningRequired,
      warning_message_bn: warningBn,
      warning_message_en: warningEn,
      reasons,
      evaluation_comparison: {
        transaction_only_score: txnOnlyScore,
        behavioral_merchant_score: riskScore,
        lift
      }
    };
  }

  /**
   * Get all merchant profiles
   */
  getAllMerchants(): MerchantProfile[] {
    return Array.from(this.merchants.values());
  }

  /**
   * Get Merchant Graph Connections (Customer -> Merchant QR -> Downstream Mule Wallets -> Ring-12 -> Agent)
   */
  getMerchantGraph(merchantId: string) {
    const merchant = this.merchants.get(merchantId) || this.merchants.get('M-SYN-7001')!;

    const nodes = [
      { id: merchant.merchant_id, label: merchant.name, type: 'merchant', category: 'Merchant QR Destination', risk: merchant.risk_score },
      { id: 'CUST-100-BURST', label: '100 Unrelated Customers', type: 'customer_group', category: 'Inbound Senders', risk: 0.50 },
      { id: 'W-SYN-091177', label: 'Mule Wallet 091177', type: 'wallet', category: 'Downstream Mule', risk: 0.92 },
      { id: 'W-SYN-091178', label: 'Mule Wallet 091178', type: 'wallet', category: 'Downstream Mule', risk: 0.90 },
      { id: 'W-SYN-091179', label: 'Mule Wallet 091179', type: 'wallet', category: 'Downstream Mule', risk: 0.88 },
      { id: 'RING-2026-0012', label: 'Ring-12 Hub', type: 'ring', category: 'Mule Ring Hub', risk: 0.95 },
      { id: 'A-SYN-8821', label: 'Agent DH-8821', type: 'agent', category: 'Cash-out OTC Agent', risk: 0.85 }
    ];

    const edges = [
      { source: 'CUST-100-BURST', target: merchant.merchant_id, label: '100x ৳18,500 Payments', amount: 1850000 },
      { source: merchant.merchant_id, target: 'W-SYN-091177', label: '94% Rapid Payout', amount: 620000 },
      { source: merchant.merchant_id, target: 'W-SYN-091178', label: 'Layering Hop', amount: 580000 },
      { source: merchant.merchant_id, target: 'W-SYN-091179', label: 'Layering Hop', amount: 540000 },
      { source: 'W-SYN-091177', target: 'RING-2026-0012', label: 'Consolidation', amount: 620000 },
      { source: 'W-SYN-091178', target: 'RING-2026-0012', label: 'Consolidation', amount: 580000 },
      { source: 'RING-2026-0012', target: 'A-SYN-8821', label: 'OTC Cash Out', amount: 1740000 }
    ];

    return { nodes, edges, merchant };
  }
}

export const merchantScamShield = new MerchantScamShieldService();
