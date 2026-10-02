import type { DistrictType } from './common.js';

// ================= AGENT GUARD & LIQUIDITY TYPES =================
export type AgentClassification = 'NORMAL' | 'HIGH_ACTIVITY' | 'LIQUIDITY_PRESSURE' | 'FRAUD_REVIEW';

export interface AgentLiquiditySignals {
  cash_in_volume_bdt: number;
  cash_out_volume_bdt: number;
  total_volume_bdt: number;
  hourly_volume_peak: number;
  inventory_balance_pressure: number; // 0.0 to 1.0 (float depletion / rebalance urgency)
  customer_count: number;
  repeat_customer_rate: number; // 0.0 to 1.0
  regional_peer_deviation: number; // e.g. 1.2x or 8.5x
  business_hours_ratio: number; // 0.0 to 1.0 (txns inside 08:00 - 22:00)
  seasonal_volume_change: number; // e.g. 2.4x during Eid/Salary
}

export interface AgentFraudSignals {
  shared_device_count: number;
  suspicious_wallet_connections: number;
  rapid_in_out_ratio: number; // 0.0 to 1.0 (cashouts within 10m of victim transfer)
  ring_membership: string[]; // e.g. ['RING-003']
  structured_amounts_count: number; // txns just below threshold e.g. ৳4,950
  unusual_counterparties_rate: number; // out-of-district / unknown counterparties
  complaint_rate: number; // direct complaints or Scam Check hits
  pass_through_behavior_ratio: number; // 0.0 to 1.0
}

export interface AgentPeerBenchmark {
  region: string;
  size_tier: 'tier_1' | 'tier_2' | 'tier_3';
  tenure_band: string;
  business_profile: string;
  peer_avg_daily_volume_bdt: number;
  peer_avg_customer_count: number;
  peer_avg_cashout_ratio: number;
  peer_avg_repeat_rate: number;
  peer_avg_structured_count: number;
  peer_avg_shared_devices: number;
}

export interface AgentDualRiskProfile {
  agent_id: string;
  name: string;
  phone: string;
  division: string;
  district_type: DistrictType;
  business_profile: string;
  size_tier: 'tier_1' | 'tier_2' | 'tier_3';
  tenure_days: number;
  
  // Two Independent Scores
  operational_pressure_score: number; // 0.0 to 1.0 (Liquidity & volume load)
  fraud_risk_score: number; // 0.0 to 1.0 (Pure fraud & complicity signals)
  
  classification: AgentClassification;
  classification_label_bn: string;
  classification_label_en: string;
  classification_reason: string;
  
  liquidity_signals: AgentLiquiditySignals;
  fraud_signals: AgentFraudSignals;
  peer_benchmark: AgentPeerBenchmark;
  
  active_warnings: string[];
  coached_victim_prompts_bn: string[];
  recommended_actions: string[];
  last_evaluated_at: string;
}

// ================= MERCHANT TYPES =================
export type MerchantTrustBadge = 'NEW' | 'NORMAL' | 'WATCH' | 'REVIEW';

export interface MerchantProfile {
  merchant_id: string;
  name: string;
  category: string;
  division: string;
  created_at: string;
  qr_code_id: string;
  location_cluster: string;
  merchant_age: number; // in days
  transaction_volume: number; // 30-day BDT
  unique_customer_count: number;
  refund_ratio: number;
  complaint_ratio: number;
  chargeback_like_events: number;
  average_ticket: number;
  transaction_velocity: number; // txns per day
  customer_concentration: number; // top customer volume ratio
  device_count: number;
  linked_wallet_count: number;
  cashout_ratio: number; // pass-through ratio
  trust_badge: MerchantTrustBadge;
  risk_score: number;
  is_suspicious_drain: boolean;
  linked_mule_rings: string[];
}

export interface CustomerToMerchantFeatures {
  first_time_merchant: boolean;
  amount_deviation: number;
  merchant_novelty: boolean;
  customer_merchant_frequency: number;
  merchant_customer_entropy: number;
  qr_scan_context: string;
}

export interface MerchantEvaluationResult {
  merchant: MerchantProfile;
  customer_features: CustomerToMerchantFeatures;
  risk_score: number;
  trust_badge: MerchantTrustBadge;
  action_recommended: 'ALLOW' | 'PAUSE_VERIFY' | 'HOLD_ASSIST' | 'BLOCK';
  warning_required: boolean;
  warning_message_bn: string;
  warning_message_en: string;
  reasons: Array<{ code: string; label_en: string; label_bn: string; weight: number }>;
  evaluation_comparison: {
    transaction_only_score: number;
    behavioral_merchant_score: number;
    lift: number;
  };
}
