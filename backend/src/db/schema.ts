export const DDL_SCHEMA = `
-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  segment TEXT NOT NULL,
  division TEXT NOT NULL,
  district_type TEXT NOT NULL,
  age_band TEXT NOT NULL,
  gender TEXT NOT NULL,
  onboarding_channel TEXT NOT NULL,
  kyc_level TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  balance REAL NOT NULL DEFAULT 0.0,
  daily_limit REAL NOT NULL DEFAULT 50000.0,
  monthly_limit REAL NOT NULL DEFAULT 200000.0,
  created_at TEXT NOT NULL,
  is_mule_candidate INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  os_family TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  linked_wallet_count INTEGER NOT NULL DEFAULT 1,
  is_emulator INTEGER NOT NULL DEFAULT 0
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  division TEXT NOT NULL,
  district_type TEXT NOT NULL,
  tenure_days INTEGER NOT NULL,
  size_tier TEXT NOT NULL,
  trained_flag INTEGER NOT NULL DEFAULT 1,
  cashout_velocity_score REAL NOT NULL DEFAULT 0.0,
  risk_status TEXT NOT NULL DEFAULT 'normal'
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  merchant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  division TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Transactions table (Normalized & heavily indexed for velocity queries)
CREATE TABLE IF NOT EXISTS transactions (
  txn_id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  sender_wallet TEXT NOT NULL,
  receiver_wallet TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_bdt REAL NOT NULL,
  channel TEXT NOT NULL,
  device_id TEXT NOT NULL,
  geo_cell TEXT NOT NULL,
  fee_bdt REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  label_fraud INTEGER NOT NULL DEFAULT 0,
  typology_id TEXT,
  ring_id TEXT,
  created_at TEXT NOT NULL
);

-- Session & Device Events
CREATE TABLE IF NOT EXISTS session_events (
  event_id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL,
  device_id TEXT NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)
);

-- Community Reports
CREATE TABLE IF NOT EXISTS community_reports (
  report_id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  reporter_wallet TEXT NOT NULL,
  reported_number TEXT NOT NULL,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  trust_weight REAL NOT NULL DEFAULT 1.0,
  analyst_verified INTEGER NOT NULL DEFAULT 0
);

-- Analyst Cases / Alerts
CREATE TABLE IF NOT EXISTS alert_cases (
  case_id TEXT PRIMARY KEY,
  txn_id TEXT NOT NULL,
  sender_wallet TEXT NOT NULL,
  receiver_wallet TEXT NOT NULL,
  amount_bdt REAL NOT NULL,
  risk_score REAL NOT NULL,
  risk_tier TEXT NOT NULL,
  action_recommended TEXT NOT NULL,
  reasons_json TEXT NOT NULL,
  rule_trace_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  analyst_id TEXT,
  analyst_notes TEXT,
  copilot_brief_json TEXT,
  four_eyes_required INTEGER NOT NULL DEFAULT 0,
  four_eyes_approved INTEGER DEFAULT 0,
  second_analyst_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Ring Cases
CREATE TABLE IF NOT EXISTS ring_cases (
  ring_id TEXT PRIMARY KEY,
  ring_name TEXT NOT NULL,
  typology TEXT NOT NULL,
  members_json TEXT NOT NULL,
  agents_json TEXT NOT NULL,
  total_volume_bdt REAL NOT NULL,
  ring_score REAL NOT NULL,
  density REAL NOT NULL,
  pass_through_ratio REAL NOT NULL,
  shared_device_count INTEGER NOT NULL,
  burst_synchrony REAL NOT NULL,
  seed_proximity REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'DETECTED',
  graph_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Immutable Tamper-Evident Audit Log (Hash-Chained)
CREATE TABLE IF NOT EXISTS audit_logs (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

-- Interventions Log (for Uplift & Friction Optimizer)
CREATE TABLE IF NOT EXISTS customer_interventions (
  intervention_id TEXT PRIMARY KEY,
  txn_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  shown_ts TEXT NOT NULL,
  customer_action TEXT NOT NULL,
  treatment_flag INTEGER NOT NULL DEFAULT 1
);

--------------------------------------------------------------------------------
-- HIGH-PERFORMANCE COMPOSITE & COVERING INDEXES
--------------------------------------------------------------------------------
-- 1. Velocity & point-in-time sender transaction lookups (p95 < 5ms)
CREATE INDEX IF NOT EXISTS idx_txns_sender_ts ON transactions(sender_wallet, ts DESC);

-- 2. Fan-in recipient velocity & counterparty analysis
CREATE INDEX IF NOT EXISTS idx_txns_receiver_ts ON transactions(receiver_wallet, ts DESC);

-- 3. Pairwise transaction history lookup (First-time large send check RC01)
CREATE INDEX IF NOT EXISTS idx_txns_sender_rcvr ON transactions(sender_wallet, receiver_wallet);

-- 4. Fraud & typology slicing index
CREATE INDEX IF NOT EXISTS idx_txns_fraud_typology ON transactions(label_fraud, typology_id);

-- 5. Ring member transaction aggregation
CREATE INDEX IF NOT EXISTS idx_txns_ring ON transactions(ring_id) WHERE ring_id IS NOT NULL;

-- 6. ATO event checking index (New device + PIN reset/SIM swap window)
CREATE INDEX IF NOT EXISTS idx_events_wallet_type_ts ON session_events(wallet_id, type, ts DESC);

-- 7. Community report quick lookup
CREATE INDEX IF NOT EXISTS idx_reports_number ON community_reports(reported_number, ts DESC);

-- 8. Analyst case triage queue indexing
CREATE INDEX IF NOT EXISTS idx_cases_status_score ON alert_cases(status, risk_score DESC);

-- 9. Audit log hash verification index
CREATE INDEX IF NOT EXISTS idx_audit_seq ON audit_logs(seq ASC);
`;
