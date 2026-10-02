import type { RiskTier, PolicyAction, ReasonCodeDetail, TypologyId } from './common.js';

// ================= ALERT CASE =================
export interface CopilotBrief {
  language: 'en' | 'bn';
  case_id: string;
  summary: string;
  sections: Array<{
    title: string;
    sentences: Array<{
      text: string;
      evidence_ids: string[];
      verified: boolean;
    }>;
  }>;
  total_claims: number;
  verified_claims: number;
  confidence: number;
  suggested_actions: string[];
  open_questions: string[];
  str_draft?: string;
  generated_at: string;
}

export interface AlertCase {
  case_id: string;
  txn_id: string;
  sender_wallet: string;
  receiver_wallet: string;
  amount_bdt: number;
  risk_score: number;
  risk_tier: RiskTier;
  action_recommended: PolicyAction;
  reasons: ReasonCodeDetail[];
  rule_trace: Array<{ rule: string; fired: boolean }>;
  // 'OPEN' is what a reopened case becomes; both the reopen route and the
  // analyst console already use it, it was just missing from this union.
  status: 'NEW' | 'OPEN' | 'UNDER_REVIEW' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'RECOVERED' | 'CLOSED';
  analyst_id?: string;
  analyst_notes?: string;
  copilot_brief?: CopilotBrief;
  four_eyes_required: boolean;
  four_eyes_approved?: boolean;
  second_analyst_id?: string;
  created_at: string;
  updated_at: string;
}

// ================= RING CASE =================
export interface RingCase {
  ring_id: string;
  ring_name: string;
  typology: TypologyId;
  member_wallets: string[];
  member_agents: string[];
  total_volume_bdt: number;
  ring_score: number;
  density: number;
  pass_through_ratio: number;
  shared_device_count: number;
  burst_synchrony: number;
  seed_proximity: number;
  status: 'DETECTED' | 'CONFIRMED_RING' | 'DISMISSED' | 'REPORTED_STR';
  created_at: string;
  nodes: Array<{ id: string; label: string; type: 'wallet' | 'agent' | 'merchant' | 'seed'; role: string; risk: number }>;
  edges: Array<{ source: string; target: string; weight: number; amount: number; count: number }>;
}

// ================= AUDIT LOG =================
export interface AuditLogEntry {
  seq: number;
  ts: string;
  actor: string;
  action: string;
  target_id: string;
  payload_hash: string;
  prev_hash: string;
  payload_json: string;
}

// ================= MONEY FLOW =================
export interface MoneyFlowHop {
  wallet_id: string;
  customer_name: string;
  phone: string;
  hop_level: number;
  received_bdt: number;
  current_balance_bdt: number;
  forwarded_bdt: number;
  cashed_out_bdt: number;
  cashout_agent_id?: string;
  is_terminal: boolean;
  hold_recommended: boolean;
  collateral_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  children: MoneyFlowHop[];
}

export interface HoldCandidate {
  wallet_id: string;
  customer_name: string;
  phone: string;
  hop: number;
  current_balance: number;
  estimated_recoverable_bdt: number;
  confidence: number;
  collateral_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING_APPROVAL' | 'HOLD_PLACED' | 'REJECTED';
}
