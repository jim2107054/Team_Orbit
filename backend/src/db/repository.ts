import { getDbPool } from './client.js';
import { 
  Customer, Wallet, Device, Agent, Merchant, Transaction, 
  SessionEvent, CommunityReport, AlertCase, RingCase, AuditLogEntry,
  IncidentInvestigation
} from '../core/types.js';

export class ShieldRepository {
  private get pool() {
    return getDbPool();
  }

  // ================= CUSTOMERS & WALLETS =================
  async insertCustomer(c: Customer): Promise<void> {
    await this.pool.query(
      `INSERT INTO customers (customer_id, name, phone, segment, division, district_type, age_band, gender, onboarding_channel, kyc_level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (customer_id) DO NOTHING`,
      [c.customer_id, c.name, c.phone, c.segment, c.division, c.district_type, c.age_band, c.gender, c.onboarding_channel, c.kyc_level, c.created_at]
    );
  }

  async insertWallet(w: Wallet): Promise<void> {
    await this.pool.query(
      `INSERT INTO wallets (wallet_id, customer_id, phone, status, balance, daily_limit, monthly_limit, created_at, is_mule_candidate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (wallet_id) DO NOTHING`,
      [w.wallet_id, w.customer_id, w.phone, w.status, w.balance, w.daily_limit, w.monthly_limit, w.created_at, w.is_mule_candidate ? true : false]
    );
  }

  async getWalletById(walletId: string): Promise<Wallet | null> {
    const res = await this.pool.query(`SELECT * FROM wallets WHERE wallet_id = $1`, [walletId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      wallet_id: String(r.wallet_id),
      customer_id: String(r.customer_id),
      phone: String(r.phone),
      status: r.status as any,
      balance: Number(r.balance),
      daily_limit: Number(r.daily_limit),
      monthly_limit: Number(r.monthly_limit),
      created_at: new Date(r.created_at).toISOString(),
      is_mule_candidate: Boolean(r.is_mule_candidate)
    };
  }

  async getCustomerById(customerId: string): Promise<Customer | null> {
    const res = await this.pool.query(`SELECT * FROM customers WHERE customer_id = $1`, [customerId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      customer_id: String(r.customer_id),
      name: String(r.name),
      phone: String(r.phone),
      segment: r.segment as any,
      division: String(r.division),
      district_type: r.district_type as any,
      age_band: r.age_band as any,
      gender: r.gender as any,
      onboarding_channel: r.onboarding_channel as any,
      kyc_level: r.kyc_level as any,
      created_at: new Date(r.created_at).toISOString()
    };
  }

  // ================= AGENTS & MERCHANTS =================
  async insertAgent(a: Agent): Promise<void> {
    await this.pool.query(
      `INSERT INTO agents (agent_id, name, phone, division, district_type, tenure_days, size_tier, trained_flag, cashout_velocity_score, risk_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (agent_id) DO NOTHING`,
      [a.agent_id, a.name, a.phone, a.division, a.district_type, a.tenure_days, a.size_tier, a.trained_flag, a.cashout_velocity_score, a.risk_status]
    );
  }

  async getAllAgents(limit: number = 200): Promise<Agent[]> {
    const res = await this.pool.query(`SELECT * FROM agents ORDER BY agent_id ASC LIMIT $1`, [limit]);
    return res.rows.map(r => ({
      agent_id: String(r.agent_id),
      name: String(r.name),
      phone: String(r.phone),
      division: String(r.division),
      district_type: r.district_type as any,
      tenure_days: Number(r.tenure_days),
      size_tier: r.size_tier as any,
      trained_flag: Boolean(r.trained_flag),
      cashout_velocity_score: Number(r.cashout_velocity_score),
      risk_status: r.risk_status as any
    }));
  }

  async getAgentById(agentId: string): Promise<Agent | null> {
    const res = await this.pool.query(`SELECT * FROM agents WHERE agent_id = $1`, [agentId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      agent_id: String(r.agent_id),
      name: String(r.name),
      phone: String(r.phone),
      division: String(r.division),
      district_type: r.district_type as any,
      tenure_days: Number(r.tenure_days),
      size_tier: r.size_tier as any,
      trained_flag: Boolean(r.trained_flag),
      cashout_velocity_score: Number(r.cashout_velocity_score),
      risk_status: r.risk_status as any
    };
  }

  async insertMerchant(m: Merchant): Promise<void> {
    await this.pool.query(
      `INSERT INTO merchants (merchant_id, name, category, division, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (merchant_id) DO NOTHING`,
      [m.merchant_id, m.name, m.category, m.division, m.created_at]
    );
  }

  async getAllMerchants(limit: number = 200): Promise<Merchant[]> {
    const res = await this.pool.query(`SELECT * FROM merchants ORDER BY merchant_id ASC LIMIT $1`, [limit]);
    return res.rows.map(r => ({
      merchant_id: String(r.merchant_id),
      name: String(r.name),
      category: String(r.category),
      division: String(r.division),
      created_at: new Date(r.created_at).toISOString()
    }));
  }

  // ================= TRANSACTIONS =================
  async insertTransaction(t: Transaction): Promise<void> {
    await this.pool.query(
      `INSERT INTO transactions (txn_id, ts, sender_wallet, receiver_wallet, type, amount_bdt, channel, device_id, geo_cell, fee_bdt, status, label_fraud, typology_id, ring_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (txn_id) DO NOTHING`,
      [
        t.txn_id, t.ts, t.sender_wallet, t.receiver_wallet, t.type, t.amount_bdt,
        t.channel, t.device_id, t.geo_cell, t.fee_bdt, t.status, t.label_fraud ? true : false,
        t.typology_id || null, t.ring_id || null, t.created_at
      ]
    );
  }

  async getSenderRecentTxns(senderWallet: string, sinceTs: string): Promise<Transaction[]> {
    const res = await this.pool.query(
      `SELECT * FROM transactions WHERE sender_wallet = $1 AND ts >= $2 ORDER BY ts DESC`,
      [senderWallet, sinceTs]
    );
    return res.rows.map(r => ({
      txn_id: String(r.txn_id),
      ts: new Date(r.ts).toISOString(),
      sender_wallet: String(r.sender_wallet),
      receiver_wallet: String(r.receiver_wallet),
      type: r.type as any,
      amount_bdt: Number(r.amount_bdt),
      channel: r.channel as any,
      device_id: String(r.device_id),
      geo_cell: String(r.geo_cell),
      fee_bdt: Number(r.fee_bdt),
      status: r.status as any,
      label_fraud: Boolean(r.label_fraud),
      typology_id: r.typology_id ? String(r.typology_id) as any : undefined,
      ring_id: r.ring_id ? String(r.ring_id) : undefined,
      created_at: new Date(r.created_at).toISOString()
    }));
  }

  async getReceiverRecentTxns(receiverWallet: string, sinceTs: string): Promise<Transaction[]> {
    const res = await this.pool.query(
      `SELECT * FROM transactions WHERE receiver_wallet = $1 AND ts >= $2 ORDER BY ts DESC`,
      [receiverWallet, sinceTs]
    );
    return res.rows.map(r => ({
      txn_id: String(r.txn_id),
      ts: new Date(r.ts).toISOString(),
      sender_wallet: String(r.sender_wallet),
      receiver_wallet: String(r.receiver_wallet),
      type: r.type as any,
      amount_bdt: Number(r.amount_bdt),
      channel: r.channel as any,
      device_id: String(r.device_id),
      geo_cell: String(r.geo_cell),
      fee_bdt: Number(r.fee_bdt),
      status: r.status as any,
      label_fraud: Boolean(r.label_fraud),
      typology_id: r.typology_id ? String(r.typology_id) as any : undefined,
      ring_id: r.ring_id ? String(r.ring_id) : undefined,
      created_at: new Date(r.created_at).toISOString()
    }));
  }

  async hasPriorTransferBetween(sender: string, receiver: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM transactions WHERE sender_wallet = $1 AND receiver_wallet = $2 LIMIT 1`,
      [sender, receiver]
    );
    return res.rows.length > 0;
  }

  async getSenderBaselineStats(senderWallet: string): Promise<{ avgAmount: number; stdAmount: number; count: number }> {
    const res = await this.pool.query(
      `SELECT AVG(amount_bdt) as avg_amt, COUNT(*) as cnt FROM transactions WHERE sender_wallet = $1`,
      [senderWallet]
    );
    const avg = Number(res.rows[0]?.avg_amt || 1500);
    const cnt = Number(res.rows[0]?.cnt || 1);
    return {
      avgAmount: avg,
      stdAmount: avg * 0.45,
      count: cnt
    };
  }

  // ================= EVENTS & ATO =================
  async insertSessionEvent(e: SessionEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO session_events (event_id, ts, wallet_id, type, device_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id) DO NOTHING`,
      [e.event_id, e.ts, e.wallet_id, e.type, e.device_id, e.metadata_json || null]
    );
  }

  async getRecentWalletEvents(walletId: string, sinceTs: string): Promise<SessionEvent[]> {
    const res = await this.pool.query(
      `SELECT * FROM session_events WHERE wallet_id = $1 AND ts >= $2 ORDER BY ts DESC`,
      [walletId, sinceTs]
    );
    return res.rows.map(r => ({
      event_id: String(r.event_id),
      ts: new Date(r.ts).toISOString(),
      wallet_id: String(r.wallet_id),
      type: r.type as any,
      device_id: String(r.device_id),
      metadata_json: r.metadata_json ? String(r.metadata_json) : undefined
    }));
  }

  // ================= COMMUNITY REPORTS =================
  async insertReport(r: CommunityReport): Promise<void> {
    await this.pool.query(
      `INSERT INTO community_reports (report_id, ts, reporter_wallet, reported_number, category, text, language, trust_weight, analyst_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (report_id) DO NOTHING`,
      [r.report_id, r.ts, r.reporter_wallet, r.reported_number, r.category, r.text, r.language, r.trust_weight, r.analyst_verified ? true : false]
    );
  }

  async getReportsForNumber(numberOrWallet: string): Promise<CommunityReport[]> {
    const res = await this.pool.query(
      `SELECT * FROM community_reports WHERE reported_number = $1 ORDER BY ts DESC`,
      [numberOrWallet]
    );
    return res.rows.map(r => ({
      report_id: String(r.report_id),
      ts: new Date(r.ts).toISOString(),
      reporter_wallet: String(r.reporter_wallet),
      reported_number: String(r.reported_number),
      category: r.category as any,
      text: String(r.text),
      language: r.language as any,
      trust_weight: Number(r.trust_weight),
      analyst_verified: Boolean(r.analyst_verified)
    }));
  }

  // ================= CASES & RINGS =================
  async insertAlertCase(c: AlertCase): Promise<void> {
    await this.pool.query(
      `INSERT INTO alert_cases (case_id, txn_id, sender_wallet, receiver_wallet, amount_bdt, risk_score, risk_tier, action_recommended, reasons_json, rule_trace_json, status, analyst_id, analyst_notes, copilot_brief_json, four_eyes_required, four_eyes_approved, second_analyst_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (case_id) DO NOTHING`,
      [
        c.case_id, c.txn_id, c.sender_wallet, c.receiver_wallet, c.amount_bdt,
        c.risk_score, c.risk_tier, c.action_recommended,
        JSON.stringify(c.reasons), JSON.stringify(c.rule_trace),
        c.status, c.analyst_id || null, c.analyst_notes || null,
        c.copilot_brief ? JSON.stringify(c.copilot_brief) : null,
        c.four_eyes_required ? true : false, c.four_eyes_approved ? true : false,
        c.second_analyst_id || null, c.created_at, c.updated_at
      ]
    );
  }

  async getAllAlertCases(limit: number = 200): Promise<AlertCase[]> {
    const res = await this.pool.query(`SELECT * FROM alert_cases ORDER BY risk_score DESC, created_at DESC LIMIT $1`, [limit]);
    return res.rows.map(r => ({
      case_id: String(r.case_id),
      txn_id: String(r.txn_id),
      sender_wallet: String(r.sender_wallet),
      receiver_wallet: String(r.receiver_wallet),
      amount_bdt: Number(r.amount_bdt),
      risk_score: Number(r.risk_score),
      risk_tier: r.risk_tier as any,
      action_recommended: r.action_recommended as any,
      reasons: JSON.parse(String(r.reasons_json)),
      rule_trace: JSON.parse(String(r.rule_trace_json)),
      status: r.status as any,
      analyst_id: r.analyst_id ? String(r.analyst_id) : undefined,
      analyst_notes: r.analyst_notes ? String(r.analyst_notes) : undefined,
      copilot_brief: r.copilot_brief_json ? JSON.parse(String(r.copilot_brief_json)) : undefined,
      four_eyes_required: Boolean(r.four_eyes_required),
      four_eyes_approved: Boolean(r.four_eyes_approved),
      second_analyst_id: r.second_analyst_id ? String(r.second_analyst_id) : undefined,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString()
    }));
  }

  async getCaseById(caseId: string): Promise<AlertCase | null> {
    const res = await this.pool.query(`SELECT * FROM alert_cases WHERE case_id = $1`, [caseId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      case_id: String(r.case_id),
      txn_id: String(r.txn_id),
      sender_wallet: String(r.sender_wallet),
      receiver_wallet: String(r.receiver_wallet),
      amount_bdt: Number(r.amount_bdt),
      risk_score: Number(r.risk_score),
      risk_tier: r.risk_tier as any,
      action_recommended: r.action_recommended as any,
      reasons: JSON.parse(String(r.reasons_json)),
      rule_trace: JSON.parse(String(r.rule_trace_json)),
      status: r.status as any,
      analyst_id: r.analyst_id ? String(r.analyst_id) : undefined,
      analyst_notes: r.analyst_notes ? String(r.analyst_notes) : undefined,
      copilot_brief: r.copilot_brief_json ? JSON.parse(String(r.copilot_brief_json)) : undefined,
      four_eyes_required: Boolean(r.four_eyes_required),
      four_eyes_approved: Boolean(r.four_eyes_approved),
      second_analyst_id: r.second_analyst_id ? String(r.second_analyst_id) : undefined,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString()
    };
  }

  async updateCase(caseId: string, updates: Partial<AlertCase>): Promise<void> {
    const current = await this.getCaseById(caseId);
    if (!current) return;
    const merged = { ...current, ...updates, updated_at: new Date().toISOString() };

    await this.pool.query(
      `UPDATE alert_cases 
       SET status = $1, analyst_id = $2, analyst_notes = $3, copilot_brief_json = $4, 
           four_eyes_approved = $5, second_analyst_id = $6, updated_at = $7
       WHERE case_id = $8`,
      [
        merged.status, merged.analyst_id || null, merged.analyst_notes || null,
        merged.copilot_brief ? JSON.stringify(merged.copilot_brief) : null,
        merged.four_eyes_approved ? true : false, merged.second_analyst_id || null,
        merged.updated_at, caseId
      ]
    );
  }

  // ================= RINGS =================
  async insertRing(ring: RingCase): Promise<void> {
    await this.pool.query(
      `INSERT INTO ring_cases (ring_id, ring_name, typology, members_json, agents_json, total_volume_bdt, ring_score, density, pass_through_ratio, shared_device_count, burst_synchrony, seed_proximity, status, graph_payload_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (ring_id) DO NOTHING`,
      [
        ring.ring_id, ring.ring_name, ring.typology,
        JSON.stringify(ring.member_wallets), JSON.stringify(ring.member_agents),
        ring.total_volume_bdt, ring.ring_score, ring.density, ring.pass_through_ratio,
        ring.shared_device_count, ring.burst_synchrony, ring.seed_proximity,
        ring.status, JSON.stringify({ nodes: ring.nodes, edges: ring.edges }), ring.created_at
      ]
    );
  }

  async getAllRings(limit: number = 100): Promise<RingCase[]> {
    const res = await this.pool.query(`SELECT * FROM ring_cases ORDER BY ring_score DESC LIMIT $1`, [limit]);
    return res.rows.map(r => {
      const graph = JSON.parse(String(r.graph_payload_json));
      return {
        ring_id: String(r.ring_id),
        ring_name: String(r.ring_name),
        typology: r.typology as any,
        member_wallets: JSON.parse(String(r.members_json)),
        member_agents: JSON.parse(String(r.agents_json)),
        total_volume_bdt: Number(r.total_volume_bdt),
        ring_score: Number(r.ring_score),
        density: Number(r.density),
        pass_through_ratio: Number(r.pass_through_ratio),
        shared_device_count: Number(r.shared_device_count),
        burst_synchrony: Number(r.burst_synchrony),
        seed_proximity: Number(r.seed_proximity),
        status: r.status as any,
        nodes: graph.nodes,
        edges: graph.edges,
        created_at: new Date(r.created_at).toISOString()
      };
    });
  }

  async getRingById(ringId: string): Promise<RingCase | null> {
    const res = await this.pool.query(`SELECT * FROM ring_cases WHERE ring_id = $1`, [ringId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    const graph = JSON.parse(String(r.graph_payload_json));
    return {
      ring_id: String(r.ring_id),
      ring_name: String(r.ring_name),
      typology: r.typology as any,
      member_wallets: JSON.parse(String(r.members_json)),
      member_agents: JSON.parse(String(r.agents_json)),
      total_volume_bdt: Number(r.total_volume_bdt),
      ring_score: Number(r.ring_score),
      density: Number(r.density),
      pass_through_ratio: Number(r.pass_through_ratio),
      shared_device_count: Number(r.shared_device_count),
      burst_synchrony: Number(r.burst_synchrony),
      seed_proximity: Number(r.seed_proximity),
      status: r.status as any,
      nodes: graph.nodes,
      edges: graph.edges,
      created_at: new Date(r.created_at).toISOString()
    };
  }

  // ================= AUDIT LOGGING (M17) =================
  async appendAuditLog(actor: string, action: string, targetId: string, payload: any, prevHash: string, hash: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (ts, actor, action, target_id, payload_hash, prev_hash, payload_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [new Date().toISOString(), actor, action, targetId, hash, prevHash, JSON.stringify(payload)]
    );
  }

  async getLatestAuditEntry(): Promise<AuditLogEntry | null> {
    const res = await this.pool.query(`SELECT * FROM audit_logs ORDER BY seq DESC LIMIT 1`);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      seq: Number(r.seq),
      ts: new Date(r.ts).toISOString(),
      actor: String(r.actor),
      action: String(r.action),
      target_id: String(r.target_id),
      payload_hash: String(r.payload_hash),
      prev_hash: String(r.prev_hash),
      payload_json: String(r.payload_json)
    };
  }

  async getAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
    const res = await this.pool.query(`SELECT * FROM audit_logs ORDER BY seq DESC LIMIT $1`, [limit]);
    return res.rows.map(r => ({
      seq: Number(r.seq),
      ts: new Date(r.ts).toISOString(),
      actor: String(r.actor),
      action: String(r.action),
      target_id: String(r.target_id),
      payload_hash: String(r.payload_hash),
      prev_hash: String(r.prev_hash),
      payload_json: String(r.payload_json)
    }));
  }

  // ================= CUSTOMER INTERVENTIONS =================
  async logIntervention(record: { intervention_id: string; txn_id: string; variant: string; shown_ts: string; customer_action: string; treatment_flag?: boolean }): Promise<void> {
    await this.pool.query(
      `INSERT INTO customer_interventions (intervention_id, txn_id, variant, shown_ts, customer_action, treatment_flag)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (intervention_id) DO NOTHING`,
      [record.intervention_id, record.txn_id, record.variant, record.shown_ts, record.customer_action, record.treatment_flag !== false]
    );
  }

  async getCustomerInterventions(limit: number = 50): Promise<any[]> {
    const res = await this.pool.query(`SELECT * FROM customer_interventions ORDER BY shown_ts DESC LIMIT $1`, [limit]);
    return res.rows;
  }

  /**
   * Insert or refresh a transaction. Used by the investigation evidence ledger
   * seeder so demo scenarios stay inside the golden-hour window across restarts.
   * Does not touch rows whose txn_id is not supplied.
   */
  async upsertTransaction(t: Transaction): Promise<void> {
    await this.pool.query(
      `INSERT INTO transactions (txn_id, ts, sender_wallet, receiver_wallet, type, amount_bdt, channel, device_id, geo_cell, fee_bdt, status, label_fraud, typology_id, ring_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (txn_id) DO UPDATE SET
         ts = EXCLUDED.ts,
         amount_bdt = EXCLUDED.amount_bdt,
         status = EXCLUDED.status,
         label_fraud = EXCLUDED.label_fraud,
         ring_id = EXCLUDED.ring_id,
         created_at = EXCLUDED.created_at`,
      [
        t.txn_id, t.ts, t.sender_wallet, t.receiver_wallet, t.type, t.amount_bdt,
        t.channel, t.device_id, t.geo_cell, t.fee_bdt, t.status, t.label_fraud ? true : false,
        t.typology_id || null, t.ring_id || null, t.created_at
      ]
    );
  }

  // ================= INCIDENT INVESTIGATION LEDGER QUERIES =================
  /** Map a raw transactions row onto the domain Transaction type. */
  private mapTransactionRow(r: any): Transaction {
    return {
      txn_id: String(r.txn_id),
      ts: new Date(r.ts).toISOString(),
      sender_wallet: String(r.sender_wallet),
      receiver_wallet: String(r.receiver_wallet),
      type: r.type as any,
      amount_bdt: Number(r.amount_bdt),
      channel: r.channel as any,
      device_id: String(r.device_id),
      geo_cell: String(r.geo_cell),
      fee_bdt: Number(r.fee_bdt),
      status: r.status as any,
      label_fraud: Boolean(r.label_fraud),
      typology_id: r.typology_id ? String(r.typology_id) as any : undefined,
      ring_id: r.ring_id ? String(r.ring_id) : undefined,
      created_at: new Date(r.created_at).toISOString()
    };
  }

  async getTransactionById(txnId: string): Promise<Transaction | null> {
    const res = await this.pool.query(`SELECT * FROM transactions WHERE txn_id = $1`, [txnId]);
    if (res.rows.length === 0) return null;
    return this.mapTransactionRow(res.rows[0]);
  }

  /**
   * Candidate retrieval for complaint-to-transaction matching.
   *
   * Returns every transaction in [startTs, endTs] where the wallet is on either
   * side of the ledger entry, in ONE query (no N+1 per candidate amount or time).
   * Served by idx_txns_sender_ts / idx_txns_receiver_ts.
   */
  async getWalletTransactionsInWindow(
    walletId: string,
    startTs: string,
    endTs: string,
    limit: number = 200
  ): Promise<Transaction[]> {
    const res = await this.pool.query(
      `SELECT * FROM transactions
       WHERE (sender_wallet = $1 OR receiver_wallet = $1)
         AND ts >= $2 AND ts <= $3
       ORDER BY ts DESC
       LIMIT $4`,
      [walletId, startTs, endTs, limit]
    );
    return res.rows.map(r => this.mapTransactionRow(r));
  }

  /**
   * Point-in-time counterparty history check for RETROSPECTIVE investigation.
   *
   * `hasPriorTransferBetween` is correct for live scoring but unbounded in time, so
   * when an investigation re-scores a transaction that is already in the ledger, the
   * disputed transaction itself makes the counterparty look familiar. This variant
   * only considers transfers strictly BEFORE the given instant.
   */
  async hasPriorTransferBetweenBefore(sender: string, receiver: string, beforeTs: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM transactions
       WHERE sender_wallet = $1 AND receiver_wallet = $2 AND ts < $3
       LIMIT 1`,
      [sender, receiver, beforeTs]
    );
    return res.rows.length > 0;
  }

  /**
   * Point-in-time inflow/outflow around a receiving wallet, for a retrospective
   * pass-through and fan-in read. One query, both directions.
   */
  async getCounterpartyFlowWindow(
    walletId: string,
    windowStartTs: string,
    windowEndTs: string
  ): Promise<{ inflowBdt: number; outflowBdt: number; distinctSenders: number }> {
    const res = await this.pool.query(
      `SELECT
         COALESCE(SUM(amount_bdt) FILTER (WHERE receiver_wallet = $1), 0) AS inflow,
         COALESCE(SUM(amount_bdt) FILTER (WHERE sender_wallet = $1), 0) AS outflow,
         COUNT(DISTINCT sender_wallet) FILTER (WHERE receiver_wallet = $1) AS senders
       FROM transactions
       WHERE (sender_wallet = $1 OR receiver_wallet = $1)
         AND ts >= $2 AND ts <= $3`,
      [walletId, windowStartTs, windowEndTs]
    );
    const r = res.rows[0] || {};
    return {
      inflowBdt: Number(r.inflow || 0),
      outflowBdt: Number(r.outflow || 0),
      distinctSenders: Number(r.senders || 0)
    };
  }

  /** Outbound transactions from a wallet after an instant — downstream money-flow hops. */
  async getOutboundTransactionsAfter(
    walletId: string,
    afterTs: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    const res = await this.pool.query(
      `SELECT * FROM transactions
       WHERE sender_wallet = $1 AND ts >= $2
       ORDER BY ts ASC
       LIMIT $3`,
      [walletId, afterTs, limit]
    );
    return res.rows.map(r => this.mapTransactionRow(r));
  }

  /** Resolve a wallet from a customer-supplied phone number (either format). */
  async getWalletByPhone(phone: string): Promise<Wallet | null> {
    const digits = phone.replace(/[^\d]/g, '');
    const res = await this.pool.query(
      `SELECT * FROM wallets
       WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1
       LIMIT 1`,
      [digits]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      wallet_id: String(r.wallet_id),
      customer_id: String(r.customer_id),
      phone: String(r.phone),
      status: r.status as any,
      balance: Number(r.balance),
      daily_limit: Number(r.daily_limit),
      monthly_limit: Number(r.monthly_limit),
      created_at: new Date(r.created_at).toISOString(),
      is_mule_candidate: Boolean(r.is_mule_candidate)
    };
  }

  /** Rings whose member wallet/agent set contains the given entity. Single query. */
  async getRingsContainingEntity(entityId: string): Promise<Array<{ ring_id: string; ring_name: string; ring_score: number; status: string }>> {
    const res = await this.pool.query(
      `SELECT ring_id, ring_name, ring_score, status
       FROM ring_cases
       WHERE members_json LIKE $1 OR agents_json LIKE $1
       ORDER BY ring_score DESC
       LIMIT 10`,
      [`%${entityId}%`]
    );
    return res.rows.map(r => ({
      ring_id: String(r.ring_id),
      ring_name: String(r.ring_name),
      ring_score: Number(r.ring_score),
      status: String(r.status)
    }));
  }

  // ================= INCIDENT INVESTIGATION PERSISTENCE =================
  async insertIncidentInvestigation(inv: IncidentInvestigation): Promise<void> {
    await this.pool.query(
      `INSERT INTO incident_investigations (
         investigation_id, case_id, complaint_id, reporter_wallet, reporter_phone,
         claim_type, detected_language, claimed_amount_bdt,
         evidence_verdict, verdict_confidence, matched_txn_id, match_confidence,
         fraud_risk, fraud_risk_score, routing_department, priority,
         human_review_required, review_status,
         injection_attempt_detected, response_safety_fallback_used,
         linked_campaign_id, linked_ring_ids_json, reason_codes_json,
         payload_json, weights_version, policy_version, total_latency_ms,
         created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
       )
       ON CONFLICT (investigation_id) DO NOTHING`,
      [
        inv.investigation_id,
        inv.case_id || null,
        inv.complaint_id || null,
        inv.reporter_wallet || null,
        inv.reporter_phone || null,
        inv.claim.claim_type,
        inv.claim.language,
        inv.claim.amount_bdt ?? null,
        inv.evidence.verdict,
        inv.evidence.verdict_confidence,
        inv.evidence.relevant_transaction_id || null,
        inv.evidence.match_confidence ?? null,
        inv.risk_context.fraud_risk || null,
        inv.risk_context.fraud_risk_score ?? null,
        inv.classification.routing_department,
        inv.classification.priority,
        inv.human_review.required,
        inv.review_status,
        inv.claim.injection_attempt_detected,
        inv.customer_response.fallback_used,
        inv.campaign_context.matched_campaign_id || null,
        JSON.stringify(inv.graph_context.linked_ring_ids || []),
        JSON.stringify((inv.reason_codes || []).map(r => r.code)),
        JSON.stringify(inv),
        inv.weights_version,
        inv.policy_version,
        inv.total_latency_ms,
        inv.created_at,
        inv.created_at
      ]
    );
  }

  async getIncidentInvestigationById(investigationId: string): Promise<IncidentInvestigation | null> {
    const res = await this.pool.query(
      `SELECT payload_json FROM incident_investigations WHERE investigation_id = $1`,
      [investigationId]
    );
    if (res.rows.length === 0) return null;
    return JSON.parse(String(res.rows[0].payload_json)) as IncidentInvestigation;
  }

  async listIncidentInvestigations(filters: {
    limit?: number;
    verdict?: string;
    humanReviewRequired?: boolean;
    reviewStatus?: string;
    caseId?: string;
    complaintId?: string;
  } = {}): Promise<IncidentInvestigation[]> {
    const clauses: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (filters.verdict) { clauses.push(`evidence_verdict = $${i++}`); params.push(filters.verdict); }
    if (filters.humanReviewRequired !== undefined) { clauses.push(`human_review_required = $${i++}`); params.push(filters.humanReviewRequired); }
    if (filters.reviewStatus) { clauses.push(`review_status = $${i++}`); params.push(filters.reviewStatus); }
    if (filters.caseId) { clauses.push(`case_id = $${i++}`); params.push(filters.caseId); }
    if (filters.complaintId) { clauses.push(`complaint_id = $${i++}`); params.push(filters.complaintId); }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(Math.min(200, Math.max(1, filters.limit || 50)));

    const res = await this.pool.query(
      `SELECT payload_json FROM incident_investigations ${where} ORDER BY created_at DESC LIMIT $${i}`,
      params
    );
    return res.rows.map(r => JSON.parse(String(r.payload_json)) as IncidentInvestigation);
  }

  async updateIncidentInvestigationReview(
    investigationId: string,
    updates: {
      review_status: IncidentInvestigation['review_status'];
      reviewed_by?: string;
      review_notes?: string;
      final_decision?: string;
    }
  ): Promise<IncidentInvestigation | null> {
    const current = await this.getIncidentInvestigationById(investigationId);
    if (!current) return null;

    const reviewedAt = new Date().toISOString();
    const merged: IncidentInvestigation = {
      ...current,
      review_status: updates.review_status,
      reviewed_by: updates.reviewed_by || current.reviewed_by,
      reviewed_at: reviewedAt,
      review_notes: updates.review_notes ?? current.review_notes,
      final_decision: updates.final_decision ?? current.final_decision
    };

    await this.pool.query(
      `UPDATE incident_investigations
       SET review_status = $1, reviewed_by = $2, reviewed_at = $3, review_notes = $4,
           final_decision = $5, payload_json = $6, updated_at = $7
       WHERE investigation_id = $8`,
      [
        merged.review_status,
        merged.reviewed_by || null,
        reviewedAt,
        merged.review_notes || null,
        merged.final_decision || null,
        JSON.stringify(merged),
        reviewedAt,
        investigationId
      ]
    );
    return merged;
  }

  /** Aggregate counters for the investigation observability endpoint. */
  async getInvestigationAggregates(): Promise<{
    total: number;
    consistent: number;
    inconsistent: number;
    insufficient: number;
    matched: number;
    humanReview: number;
    campaignLinked: number;
    highRisk: number;
    injectionAttempts: number;
    safetyFallbacks: number;
    avgLatencyMs: number;
  }> {
    const res = await this.pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE evidence_verdict = 'CONSISTENT')::int AS consistent,
         COUNT(*) FILTER (WHERE evidence_verdict = 'INCONSISTENT')::int AS inconsistent,
         COUNT(*) FILTER (WHERE evidence_verdict = 'INSUFFICIENT_DATA')::int AS insufficient,
         COUNT(*) FILTER (WHERE matched_txn_id IS NOT NULL)::int AS matched,
         COUNT(*) FILTER (WHERE human_review_required)::int AS human_review,
         COUNT(*) FILTER (WHERE linked_campaign_id IS NOT NULL)::int AS campaign_linked,
         COUNT(*) FILTER (WHERE fraud_risk IN ('HIGH','CRITICAL'))::int AS high_risk,
         COUNT(*) FILTER (WHERE injection_attempt_detected)::int AS injection_attempts,
         COUNT(*) FILTER (WHERE response_safety_fallback_used)::int AS safety_fallbacks,
         COALESCE(AVG(total_latency_ms), 0) AS avg_latency_ms
       FROM incident_investigations`
    );
    const r = res.rows[0] || {};
    return {
      total: Number(r.total || 0),
      consistent: Number(r.consistent || 0),
      inconsistent: Number(r.inconsistent || 0),
      insufficient: Number(r.insufficient || 0),
      matched: Number(r.matched || 0),
      humanReview: Number(r.human_review || 0),
      campaignLinked: Number(r.campaign_linked || 0),
      highRisk: Number(r.high_risk || 0),
      injectionAttempts: Number(r.injection_attempts || 0),
      safetyFallbacks: Number(r.safety_fallbacks || 0),
      avgLatencyMs: Number(r.avg_latency_ms || 0)
    };
  }

  // ================= SUMMARY STATS =================
  async getSummaryStats(): Promise<{ totalTxns: number; totalAlerts: number; totalRings: number; totalVolume: number }> {
    const txnRes = await this.pool.query('SELECT COUNT(*) as count, COALESCE(SUM(amount_bdt), 0) as vol FROM transactions');
    const alertRes = await this.pool.query('SELECT COUNT(*) as count FROM alert_cases');
    const ringRes = await this.pool.query('SELECT COUNT(*) as count FROM ring_cases');
    return {
      totalTxns: Number(txnRes.rows[0]?.count || 0),
      totalVolume: Number(txnRes.rows[0]?.vol || 0),
      totalAlerts: Number(alertRes.rows[0]?.count || 0),
      totalRings: Number(ringRes.rows[0]?.count || 0)
    };
  }
}

export const repository = new ShieldRepository();
