export const POSTGRES_DDL_SCHEMA = `
-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL UNIQUE,
  segment VARCHAR(64) NOT NULL,
  division VARCHAR(64) NOT NULL,
  district_type VARCHAR(32) NOT NULL,
  age_band VARCHAR(32) NOT NULL,
  gender VARCHAR(32) NOT NULL,
  onboarding_channel VARCHAR(32) NOT NULL,
  kyc_level VARCHAR(32) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  daily_limit DOUBLE PRECISION NOT NULL DEFAULT 50000.0,
  monthly_limit DOUBLE PRECISION NOT NULL DEFAULT 200000.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_mule_candidate BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  device_id VARCHAR(64) PRIMARY KEY,
  os_family VARCHAR(32) NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_wallet_count INTEGER NOT NULL DEFAULT 1,
  is_emulator BOOLEAN NOT NULL DEFAULT FALSE
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  agent_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL UNIQUE,
  division VARCHAR(64) NOT NULL,
  district_type VARCHAR(32) NOT NULL,
  tenure_days INTEGER NOT NULL,
  size_tier VARCHAR(32) NOT NULL,
  trained_flag BOOLEAN NOT NULL DEFAULT TRUE,
  cashout_velocity_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  risk_status VARCHAR(32) NOT NULL DEFAULT 'normal'
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  merchant_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  division VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (Normalized & heavily indexed for sub-millisecond velocity lookups)
CREATE TABLE IF NOT EXISTS transactions (
  txn_id VARCHAR(64) PRIMARY KEY,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  sender_wallet VARCHAR(64) NOT NULL,
  receiver_wallet VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  amount_bdt DOUBLE PRECISION NOT NULL,
  channel VARCHAR(32) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  geo_cell VARCHAR(64) NOT NULL,
  fee_bdt DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
  label_fraud BOOLEAN NOT NULL DEFAULT FALSE,
  typology_id VARCHAR(64),
  ring_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session & Device Events
CREATE TABLE IF NOT EXISTS session_events (
  event_id VARCHAR(64) PRIMARY KEY,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  wallet_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id) ON DELETE CASCADE
);

-- Community Reports
CREATE TABLE IF NOT EXISTS community_reports (
  report_id VARCHAR(64) PRIMARY KEY,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  reporter_wallet VARCHAR(64) NOT NULL,
  reported_number VARCHAR(64) NOT NULL,
  category VARCHAR(64) NOT NULL,
  text TEXT NOT NULL,
  language VARCHAR(32) NOT NULL,
  trust_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  analyst_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- Analyst Cases / Alerts
CREATE TABLE IF NOT EXISTS alert_cases (
  case_id VARCHAR(64) PRIMARY KEY,
  txn_id VARCHAR(64) NOT NULL,
  sender_wallet VARCHAR(64) NOT NULL,
  receiver_wallet VARCHAR(64) NOT NULL,
  amount_bdt DOUBLE PRECISION NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL,
  risk_tier VARCHAR(16) NOT NULL,
  action_recommended VARCHAR(64) NOT NULL,
  reasons_json TEXT NOT NULL,
  rule_trace_json TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'NEW',
  analyst_id VARCHAR(64),
  analyst_notes TEXT,
  copilot_brief_json TEXT,
  four_eyes_required BOOLEAN NOT NULL DEFAULT FALSE,
  four_eyes_approved BOOLEAN DEFAULT FALSE,
  second_analyst_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ring Cases
CREATE TABLE IF NOT EXISTS ring_cases (
  ring_id VARCHAR(64) PRIMARY KEY,
  ring_name VARCHAR(255) NOT NULL,
  typology VARCHAR(64) NOT NULL,
  members_json TEXT NOT NULL,
  agents_json TEXT NOT NULL,
  total_volume_bdt DOUBLE PRECISION NOT NULL,
  ring_score DOUBLE PRECISION NOT NULL,
  density DOUBLE PRECISION NOT NULL,
  pass_through_ratio DOUBLE PRECISION NOT NULL,
  shared_device_count INTEGER NOT NULL,
  burst_synchrony DOUBLE PRECISION NOT NULL,
  seed_proximity DOUBLE PRECISION NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DETECTED',
  graph_payload_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Immutable Tamper-Evident Audit Log (Hash-Chained)
CREATE TABLE IF NOT EXISTS audit_logs (
  seq BIGSERIAL PRIMARY KEY,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  payload_hash VARCHAR(128) NOT NULL,
  prev_hash VARCHAR(128) NOT NULL,
  payload_json TEXT NOT NULL
);

-- Interventions Log (for Uplift & Friction Optimizer)
CREATE TABLE IF NOT EXISTS customer_interventions (
  intervention_id VARCHAR(64) PRIMARY KEY,
  txn_id VARCHAR(64) NOT NULL,
  variant VARCHAR(64) NOT NULL,
  shown_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  customer_action VARCHAR(64) NOT NULL,
  treatment_flag BOOLEAN NOT NULL DEFAULT TRUE
);

--------------------------------------------------------------------------------
-- HIGH-PERFORMANCE COMPOSITE & COVERING INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_txns_sender_ts ON transactions(sender_wallet, ts DESC);
CREATE INDEX IF NOT EXISTS idx_txns_receiver_ts ON transactions(receiver_wallet, ts DESC);
CREATE INDEX IF NOT EXISTS idx_txns_sender_rcvr ON transactions(sender_wallet, receiver_wallet);
CREATE INDEX IF NOT EXISTS idx_txns_fraud_typology ON transactions(label_fraud, typology_id);
CREATE INDEX IF NOT EXISTS idx_txns_ring ON transactions(ring_id) WHERE ring_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_wallet_type_ts ON session_events(wallet_id, type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_reports_number ON community_reports(reported_number, ts DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status_score ON alert_cases(status, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_seq ON audit_logs(seq ASC);
`;
