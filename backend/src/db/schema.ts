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

-- Evidence-Driven Scam Incident Investigations
-- One row per investigation run. Sub-structures (claim, evidence, timeline, contexts)
-- are stored as JSON text, consistent with the existing alert_cases/ring_cases style.
CREATE TABLE IF NOT EXISTS incident_investigations (
  investigation_id VARCHAR(80) PRIMARY KEY,
  case_id VARCHAR(64),
  complaint_id VARCHAR(64),
  reporter_wallet VARCHAR(64),
  reporter_phone VARCHAR(32),
  claim_type VARCHAR(64) NOT NULL,
  detected_language VARCHAR(16) NOT NULL,
  claimed_amount_bdt DOUBLE PRECISION,
  evidence_verdict VARCHAR(32) NOT NULL,
  verdict_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  matched_txn_id VARCHAR(64),
  match_confidence DOUBLE PRECISION,
  fraud_risk VARCHAR(16),
  fraud_risk_score DOUBLE PRECISION,
  routing_department VARCHAR(48) NOT NULL,
  priority VARCHAR(8) NOT NULL DEFAULT 'P3',
  human_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW',
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  final_decision VARCHAR(64),
  injection_attempt_detected BOOLEAN NOT NULL DEFAULT FALSE,
  response_safety_fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  linked_campaign_id VARCHAR(64),
  linked_ring_ids_json TEXT NOT NULL DEFAULT '[]',
  reason_codes_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL,
  weights_version VARCHAR(64) NOT NULL,
  policy_version VARCHAR(64) NOT NULL,
  total_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- HIGH-PERFORMANCE COMPOSITE & COVERING INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_txns_sender_ts ON transactions(sender_wallet, ts DESC);
CREATE INDEX IF NOT EXISTS idx_txns_receiver_ts ON transactions(receiver_wallet, ts DESC);
CREATE INDEX IF NOT EXISTS idx_txns_sender_rcvr ON transactions(sender_wallet, receiver_wallet);
CREATE INDEX IF NOT EXISTS idx_txns_fraud_typology ON transactions(label_fraud, typology_id);
CREATE INDEX IF NOT EXISTS idx_txns_ring ON transactions(ring_id) WHERE ring_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txns_device ON transactions(device_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_customer ON wallets(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallets_mule ON wallets(is_mule_candidate) WHERE is_mule_candidate = TRUE;
CREATE INDEX IF NOT EXISTS idx_wallets_phone ON wallets(phone);

CREATE INDEX IF NOT EXISTS idx_agents_risk_div ON agents(risk_status, division);
CREATE INDEX IF NOT EXISTS idx_agents_phone ON agents(phone);

CREATE INDEX IF NOT EXISTS idx_events_wallet_type_ts ON session_events(wallet_id, type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_reports_number ON community_reports(reported_number, ts DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON community_reports(reporter_wallet, ts DESC);

CREATE INDEX IF NOT EXISTS idx_cases_status_score ON alert_cases(status, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_cases_created ON alert_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_sender_rcvr ON alert_cases(sender_wallet, receiver_wallet);

CREATE INDEX IF NOT EXISTS idx_audit_seq ON audit_logs(seq ASC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_ts ON audit_logs(actor, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_id);

CREATE INDEX IF NOT EXISTS idx_interventions_txn ON customer_interventions(txn_id, shown_ts DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_created ON incident_investigations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_verdict ON incident_investigations(evidence_verdict, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_review ON incident_investigations(human_review_required, review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_case ON incident_investigations(case_id);
CREATE INDEX IF NOT EXISTS idx_investigations_complaint ON incident_investigations(complaint_id);
CREATE INDEX IF NOT EXISTS idx_investigations_reporter ON incident_investigations(reporter_wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_matched_txn ON incident_investigations(matched_txn_id) WHERE matched_txn_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txns_amount_ts ON transactions(amount_bdt, ts DESC);

--------------------------------------------------------------------------------
-- DURABLE DOMAIN STATE
--
-- These tables back the services that previously held all state in process
-- memory. Each row keeps the full domain object in payload_json (JSONB) plus
-- the scalar columns the API actually filters and sorts on. Services hydrate
-- from these tables at boot and write through on every mutation, so a restart
-- no longer reverts to the hardcoded seed objects.
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id VARCHAR(64) PRIMARY KEY,
  reporter_wallet VARCHAR(64),
  reporter_phone VARCHAR(32),
  classification VARCHAR(64) NOT NULL,
  typology VARCHAR(64),
  priority VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  detected_language VARCHAR(16),
  is_golden_hour BOOLEAN NOT NULL DEFAULT FALSE,
  potential_loss_bdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  duplicate_group_id VARCHAR(64),
  linked_txn_id VARCHAR(64),
  linked_case_id VARCHAR(64),
  linked_campaign_id VARCHAR(64),
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_duplicate_groups (
  group_id VARCHAR(64) PRIMARY KEY,
  primary_complaint_id VARCHAR(64) NOT NULL,
  linked_campaign_id VARCHAR(64),
  linked_ring_id VARCHAR(64),
  total_exposure_bdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_analyst_actions (
  action_id VARCHAR(64) PRIMARY KEY,
  complaint_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(48) NOT NULL,
  analyst_id VARCHAR(64) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scam_campaigns (
  campaign_id VARCHAR(64) PRIMARY KEY,
  campaign_name VARCHAR(255) NOT NULL,
  typology VARCHAR(64) NOT NULL,
  lifecycle_status VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  campaign_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  complaint_count INTEGER NOT NULL DEFAULT 0,
  estimated_exposure_bdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  first_seen_ts TIMESTAMP WITH TIME ZONE,
  latest_seen_ts TIMESTAMP WITH TIME ZONE,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_complaints (
  complaint_id VARCHAR(64) PRIMARY KEY,
  assigned_campaign_id VARCHAR(64),
  sender_number VARCHAR(64),
  target_wallet VARCHAR(64),
  target_amount DOUBLE PRECISION,
  source_channel VARCHAR(48),
  is_manually_linked BOOLEAN NOT NULL DEFAULT FALSE,
  is_unrelated BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_analyst_actions (
  action_id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(48) NOT NULL,
  analyst_id VARCHAR(64) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_dual_profiles (
  agent_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255),
  division VARCHAR(64),
  district_type VARCHAR(32),
  size_tier VARCHAR(16),
  classification VARCHAR(48) NOT NULL,
  operational_pressure_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  fraud_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL,
  last_evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_analyst_actions (
  action_id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(48) NOT NULL,
  analyst_id VARCHAR(64) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_risk_profiles (
  merchant_id VARCHAR(64) PRIMARY KEY,
  qr_code_id VARCHAR(64),
  name VARCHAR(255),
  category VARCHAR(64),
  division VARCHAR(64),
  trust_badge VARCHAR(16) NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_suspicious_drain BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_txn_history (
  entry_id VARCHAR(80) PRIMARY KEY,
  merchant_id VARCHAR(64) NOT NULL,
  sender_wallet VARCHAR(64) NOT NULL,
  amount_bdt DOUBLE PRECISION NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_safety_modes (
  wallet_id VARCHAR(64) PRIMARY KEY,
  state VARCHAR(16) NOT NULL,
  reason VARCHAR(48),
  activation_source VARCHAR(48),
  active_since TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_mode_audit_events (
  event_id VARCHAR(64) PRIMARY KEY,
  wallet_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  previous_state VARCHAR(16),
  new_state VARCHAR(16),
  actor VARCHAR(64),
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  txn_id VARCHAR(64),
  wallet_id VARCHAR(64),
  outcome VARCHAR(48),
  risk_tier VARCHAR(16),
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propagation_alerts (
  alert_id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64),
  campaign_name VARCHAR(255),
  cluster_status VARCHAR(32),
  status VARCHAR(40) NOT NULL,
  growth_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  top_typology VARCHAR(64),
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propagation_analyst_actions (
  action_id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(48) NOT NULL,
  analyst_id VARCHAR(64) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propagation_false_clusters (
  campaign_id VARCHAR(64) PRIMARY KEY,
  marked_by VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recovery_plans (
  plan_id VARCHAR(80) PRIMARY KEY,
  case_id VARCHAR(64),
  victim_wallet VARCHAR(64),
  status VARCHAR(40),
  recoverable_bdt DOUBLE PRECISION NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recovery_timeline_events (
  event_id VARCHAR(80) PRIMARY KEY,
  case_id VARCHAR(64) NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
  node_id VARCHAR(80) PRIMARY KEY,
  node_type VARCHAR(48) NOT NULL,
  label VARCHAR(255),
  payload_json JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
  edge_id VARCHAR(120) PRIMARY KEY,
  from_node_id VARCHAR(80) NOT NULL,
  to_node_id VARCHAR(80) NOT NULL,
  relation VARCHAR(64) NOT NULL,
  payload_json JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- RETRIEVAL-AUGMENTED GENERATION (RAG) CORPUS
--
-- Embeddings are stored as a JSONB float array plus their dimension and source
-- model, which keeps the store independent of any single embedding provider.
-- Cosine similarity is computed in the retrieval service. For corpora of this
-- size (hundreds to low thousands of chunks) that is sub-millisecond; pgvector
-- with an HNSW index is the scale-up path if the corpus grows by orders of
-- magnitude.
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rag_documents (
  doc_id VARCHAR(96) PRIMARY KEY,
  collection VARCHAR(48) NOT NULL,
  title VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  typology VARCHAR(64),
  content TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  content_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  chunk_id VARCHAR(128) PRIMARY KEY,
  doc_id VARCHAR(96) NOT NULL,
  collection VARCHAR(48) NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  embedding_json JSONB,
  embedding_dim INTEGER,
  embedding_model VARCHAR(96),
  embedding_provider VARCHAR(32),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (doc_id) REFERENCES rag_documents(doc_id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- LLM CALL OBSERVABILITY
-- One row per model invocation: which provider actually served it, latency,
-- token usage, whether the deterministic rule engine had to take over, and
-- whether retrieved context was attached. This is what makes the hybrid
-- LLM/rules behaviour auditable instead of invisible.
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS llm_invocations (
  invocation_id VARCHAR(80) PRIMARY KEY,
  task VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  model VARCHAR(96) NOT NULL,
  status VARCHAR(24) NOT NULL,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_reason VARCHAR(255),
  rag_used BOOLEAN NOT NULL DEFAULT FALSE,
  rag_chunk_count INTEGER NOT NULL DEFAULT 0,
  latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  target_id VARCHAR(80),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- INDEXES FOR THE DURABLE DOMAIN STATE, RAG CORPUS AND LLM OBSERVABILITY
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_priority_status ON complaints(priority, status);
CREATE INDEX IF NOT EXISTS idx_complaints_classification ON complaints(classification);
CREATE INDEX IF NOT EXISTS idx_complaints_group ON complaints(duplicate_group_id) WHERE duplicate_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_actions_complaint ON complaint_analyst_actions(complaint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_score ON scam_campaigns(campaign_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_lifecycle ON scam_campaigns(lifecycle_status, latest_seen_ts DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_complaints_campaign ON campaign_complaints(assigned_campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_complaints_number ON campaign_complaints(sender_number);
CREATE INDEX IF NOT EXISTS idx_campaign_actions_campaign ON campaign_analyst_actions(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_class ON agent_dual_profiles(classification, fraud_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_division ON agent_dual_profiles(division, district_type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent ON agent_analyst_actions(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_profiles_badge ON merchant_risk_profiles(trust_badge, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_qr ON merchant_risk_profiles(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_merchant_history_merchant ON merchant_txn_history(merchant_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_safety_modes_state ON customer_safety_modes(state, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_audit_wallet ON safety_mode_audit_events(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_sessions_wallet ON coach_sessions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_txn ON coach_sessions(txn_id);

CREATE INDEX IF NOT EXISTS idx_propagation_alerts_status ON propagation_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_propagation_alerts_campaign ON propagation_alerts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_propagation_actions_alert ON propagation_analyst_actions(alert_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recovery_plans_case ON recovery_plans(case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_timeline_case ON recovery_timeline_events(case_id, seq ASC);

CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON knowledge_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_kg_edges_from ON knowledge_graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_to ON knowledge_graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_relation ON knowledge_graph_edges(relation);

CREATE INDEX IF NOT EXISTS idx_rag_docs_collection ON rag_documents(collection, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_docs_hash ON rag_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_docs_typology ON rag_documents(typology) WHERE typology IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc ON rag_chunks(doc_id, chunk_index ASC);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_collection ON rag_chunks(collection);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_model ON rag_chunks(embedding_model, embedding_dim);

CREATE INDEX IF NOT EXISTS idx_llm_invocations_task ON llm_invocations(task, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_invocations_created ON llm_invocations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_invocations_provider ON llm_invocations(provider, status);
`;
