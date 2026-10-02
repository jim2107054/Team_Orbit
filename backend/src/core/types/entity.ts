import type {
  UserSegment, DistrictType, KycLevel, OnboardingChannel,
  TypologyId, ChannelType, DeviceCapability, NetworkContext
} from './common.js';

import type { TxnType } from './common.js';

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  segment: UserSegment;
  division: string;
  district_type: DistrictType;
  age_band: '18-24' | '25-34' | '35-49' | '50+';
  gender: 'female' | 'male' | 'other';
  onboarding_channel: OnboardingChannel;
  kyc_level: KycLevel;
  created_at: string;
}

export interface Wallet {
  wallet_id: string;
  customer_id: string;
  phone: string;
  status: 'active' | 'suspended' | 'frozen' | 'closed';
  balance: number;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  is_mule_candidate?: boolean;
}

export interface Device {
  device_id: string;
  os_family: 'android' | 'ios' | 'kaios' | 'web';
  first_seen: string;
  linked_wallet_count: number;
  is_emulator?: boolean;
}

export interface Agent {
  agent_id: string;
  name: string;
  phone: string;
  division: string;
  district_type: DistrictType;
  tenure_days: number;
  size_tier: 'tier_1' | 'tier_2' | 'tier_3';
  trained_flag: boolean;
  cashout_velocity_score: number;
  risk_status: 'normal' | 'watchlist' | 'investigating';
}

export interface Merchant {
  merchant_id: string;
  name: string;
  category: string;
  division: string;
  created_at: string;
}

export interface Transaction {
  txn_id: string;
  ts: string;
  sender_wallet: string;
  receiver_wallet: string;
  type: TxnType;
  amount_bdt: number;
  channel: ChannelType;
  device_id: string;
  geo_cell: string;
  fee_bdt: number;
  status: 'SUCCESS' | 'PENDING' | 'BLOCKED' | 'CANCELLED_BY_USER';
  label_fraud: boolean;
  typology_id?: TypologyId;
  ring_id?: string;
  device_capability?: DeviceCapability;
  network_context?: NetworkContext;
  created_at: string;
}

export interface SessionEvent {
  event_id: string;
  ts: string;
  wallet_id: string;
  type: 'LOGIN' | 'DEVICE_CHANGE' | 'SIM_SWAP' | 'PIN_RESET' | 'FAILED_PIN' | 'APP_INSTALL';
  device_id: string;
  metadata_json?: string;
}

export interface CommunityReport {
  report_id: string;
  ts: string;
  reporter_wallet: string;
  reported_number: string;
  category: 'IMPERSONATION' | 'PRIZE_SCAM' | 'REFUND_FRAUD' | 'GAMBLING' | 'OTHER';
  text: string;
  language: 'bn' | 'en' | 'banglish';
  trust_weight: number;
  analyst_verified: boolean;
}
