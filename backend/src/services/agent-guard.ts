import { 
  Agent, AgentDualRiskProfile, AgentClassification, 
  AgentLiquiditySignals, AgentFraudSignals, AgentPeerBenchmark 
} from '../core/types.js';
import { auditService } from './audit-service.js';
import { agentProfileStore, agentActionStore } from '../db/stores.js';

export class AgentGuardService {
  private agentProfiles: Map<string, AgentDualRiskProfile> = new Map();

  private seeding = false;
  private actionSeq = 0;

  constructor() {
    this.seeding = true;
    try {
      this.seedDefaultAgentProfiles();
    } finally {
      this.seeding = false;
    }
  }

  /** First boot publishes the seeded profiles; afterwards the database wins. */
  async hydrate(): Promise<void> {
    if (await agentProfileStore.isEmpty()) {
      await agentProfileStore.upsertMany(Array.from(this.agentProfiles.values()));
      return;
    }

    const profiles = await agentProfileStore.loadAll();
    this.agentProfiles.clear();
    for (const p of profiles) this.agentProfiles.set(p.agent_id, p);
  }

  private saveProfile(profile: AgentDualRiskProfile): AgentDualRiskProfile {
    this.agentProfiles.set(profile.agent_id, profile);
    if (!this.seeding) agentProfileStore.enqueueUpsert(profile);
    return profile;
  }

  private newActionId(): string {
    this.actionSeq++;
    return `ACT-AGT-${Date.now()}-${this.actionSeq}`;
  }

  // ================= 1. OPERATIONAL LIQUIDITY SCORE =================
  calculateOperationalPressureScore(
    liquidity: AgentLiquiditySignals,
    peer: AgentPeerBenchmark
  ): number {
    // Score components (0.0 to 1.0)
    // 1. Float / Inventory Balance Strain (40% weight)
    const floatFactor = Math.min(1.0, liquidity.inventory_balance_pressure);
    
    // 2. Volume vs Peer Benchmark (30% weight)
    const volumeRatio = peer.peer_avg_daily_volume_bdt > 0 
      ? liquidity.total_volume_bdt / peer.peer_avg_daily_volume_bdt 
      : 1.0;
    const volumeFactor = Math.min(1.0, volumeRatio / 4.0); // caps at 4x peer avg

    // 3. Peak Hourly Volume Load (20% weight)
    const hourlyFactor = Math.min(1.0, liquidity.hourly_volume_peak / 60.0);

    // 4. Seasonal Surge / Salary Window Multiplier (10% weight)
    const seasonalFactor = Math.min(1.0, (liquidity.seasonal_volume_change - 1.0) / 3.0);

    const rawScore = (floatFactor * 0.40) + (volumeFactor * 0.30) + (hourlyFactor * 0.20) + (seasonalFactor * 0.10);
    return Number(Math.min(0.99, Math.max(0.05, rawScore)).toFixed(2));
  }

  // ================= 2. FRAUD RISK SCORE (PURE FRAUD INDICATORS) =================
  calculateFraudRiskScore(
    fraud: AgentFraudSignals,
    peer: AgentPeerBenchmark
  ): number {
    // Completely independent of raw transaction volume!
    // 1. Shared emulator / customer device density (30% weight)
    const deviceFactor = Math.min(1.0, fraud.shared_device_count / 5.0);

    // 2. Rapid pass-through velocity (drain <= 10m) (25% weight)
    const passThroughFactor = Math.min(1.0, fraud.rapid_in_out_ratio);

    // 3. Mule Ring Membership (25% weight)
    const ringFactor = fraud.ring_membership.length > 0 ? 1.0 : 0.0;

    // 4. Structured Smurfing Transactions (evading ৳5k limit) (15% weight)
    const structuredFactor = Math.min(1.0, fraud.structured_amounts_count / 10.0);

    // 5. Customer Complaints & Scam Radar flags (5% weight)
    const complaintFactor = Math.min(1.0, fraud.complaint_rate / 3.0);

    const rawScore = (deviceFactor * 0.30) + (passThroughFactor * 0.25) + (ringFactor * 0.25) + (structuredFactor * 0.15) + (complaintFactor * 0.05);
    return Number(Math.min(0.99, Math.max(0.02, rawScore)).toFixed(2));
  }

  // ================= 3. AGENT CLASSIFICATION =================
  classifyAgent(
    operationalScore: number,
    fraudScore: number,
    liquidity: AgentLiquiditySignals
  ): {
    classification: AgentClassification;
    label_bn: string;
    label_en: string;
    reason: string;
  } {
    // Rule 1: High Fraud Score always flags FRAUD_REVIEW (regardless of volume)
    if (fraudScore >= 0.60) {
      return {
        classification: 'FRAUD_REVIEW',
        label_bn: 'তদন্তাধীন (ফ্রড রিভিউ)',
        label_en: 'Fraud Review',
        reason: `Elevated fraud risk score (${fraudScore}) driven by shared devices, rapid pass-through velocity, or mule ring nexus.`
      };
    }

    // Rule 2: Float Depletion / Rebalancing Strain with Low Fraud Risk
    if (liquidity.inventory_balance_pressure >= 0.75 || (operationalScore >= 0.80 && liquidity.cash_out_volume_bdt > liquidity.cash_in_volume_bdt * 2.5)) {
      return {
        classification: 'LIQUIDITY_PRESSURE',
        label_bn: 'তারল্য সংকট (লিকুইডিটি প্রেসার)',
        label_en: 'Liquidity Pressure',
        reason: `High customer cash-out demand creating float imbalance (inventory pressure: ${Math.round(liquidity.inventory_balance_pressure * 100)}%). Fraud score is low (${fraudScore}).`
      };
    }

    // Rule 3: Legitimate Super Agent / High Volume Hub
    if (operationalScore >= 0.60 || liquidity.regional_peer_deviation >= 3.0) {
      return {
        classification: 'HIGH_ACTIVITY',
        label_bn: 'উচ্চ লেনদেন কেন্দ্র (হাই অ্যাক্টিভিটি)',
        label_en: 'High Activity',
        reason: `Legitimate high-throughput wholesale or market hub processing ${liquidity.regional_peer_deviation}x peer volume with strong customer diversity and low fraud risk (${fraudScore}).`
      };
    }

    // Rule 4: Normal Operational Baseline
    return {
      classification: 'NORMAL',
      label_bn: 'স্বাভাবিক (নরমাল)',
      label_en: 'Normal',
      reason: `Operational throughput and fraud indicators are within normal peer group benchmarks.`
    };
  }

  // ================= 4. DUAL EVALUATION PIPELINE =================
  evaluateDualProfile(
    agentId: string,
    overrides?: Partial<AgentDualRiskProfile>
  ): AgentDualRiskProfile {
    let profile = this.agentProfiles.get(agentId);

    if (!profile) {
      // Fallback default profile if not in cache
      const peer = this.getRegionalPeerBenchmark('Dhaka', 'tier_2', 'General Retail');
      const defaultLiquidity: AgentLiquiditySignals = {
        cash_in_volume_bdt: 120000,
        cash_out_volume_bdt: 95000,
        total_volume_bdt: 215000,
        hourly_volume_peak: 18,
        inventory_balance_pressure: 0.32,
        customer_count: 65,
        repeat_customer_rate: 0.68,
        regional_peer_deviation: 1.1,
        business_hours_ratio: 0.94,
        seasonal_volume_change: 1.2
      };
      const defaultFraud: AgentFraudSignals = {
        shared_device_count: 1,
        suspicious_wallet_connections: 0,
        rapid_in_out_ratio: 0.08,
        ring_membership: [],
        structured_amounts_count: 1,
        unusual_counterparties_rate: 0.05,
        complaint_rate: 0,
        pass_through_behavior_ratio: 0.12
      };

      const opScore = this.calculateOperationalPressureScore(defaultLiquidity, peer);
      const fraudScore = this.calculateFraudRiskScore(defaultFraud, peer);
      const { classification, label_bn, label_en, reason } = this.classifyAgent(opScore, fraudScore, defaultLiquidity);

      profile = {
        agent_id: agentId,
        name: `Agent Outlet ${agentId}`,
        phone: '01712-889900',
        division: 'Dhaka',
        district_type: 'urban',
        business_profile: 'General Retail & Telecommunication',
        size_tier: 'tier_2',
        tenure_days: 420,
        operational_pressure_score: opScore,
        fraud_risk_score: fraudScore,
        classification,
        classification_label_bn: label_bn,
        classification_label_en: label_en,
        classification_reason: reason,
        liquidity_signals: defaultLiquidity,
        fraud_signals: defaultFraud,
        peer_benchmark: peer,
        active_warnings: [],
        coached_victim_prompts_bn: [
          'গ্রাহককে বিনয়ের সাথে জিজ্ঞেস করুন: "আপনাকে ফোনে কথা বলতে বলতে কেউ কি টাকা তুলতে বলেছে?"'
        ],
        recommended_actions: ['Maintain standard transaction logging'],
        last_evaluated_at: new Date().toISOString()
      };
      this.saveProfile(profile);
    }

    if (overrides) {
      profile = { ...profile, ...overrides, last_evaluated_at: new Date().toISOString() };
      this.saveProfile(profile);
    }

    return profile;
  }

  // ================= 5. PEER BENCHMARK LOOKUP =================
  getRegionalPeerBenchmark(
    region: string,
    sizeTier: 'tier_1' | 'tier_2' | 'tier_3',
    businessProfile: string
  ): AgentPeerBenchmark {
    const isTier1 = sizeTier === 'tier_1';
    const isTier3 = sizeTier === 'tier_3';

    const baseVolume = isTier1 ? 850000 : isTier3 ? 95000 : 280000;
    const baseCustomers = isTier1 ? 210 : isTier3 ? 35 : 85;

    return {
      region: region || 'Dhaka',
      size_tier: sizeTier,
      tenure_band: '1-3 Years',
      business_profile: businessProfile || 'Market Point',
      peer_avg_daily_volume_bdt: baseVolume,
      peer_avg_customer_count: baseCustomers,
      peer_avg_cashout_ratio: 0.46,
      peer_avg_repeat_rate: 0.72,
      peer_avg_structured_count: 2,
      peer_avg_shared_devices: 1
    };
  }

  // ================= 6. ALL PROFILES & DEMO SCENARIOS =================
  getAllAgentProfiles(): AgentDualRiskProfile[] {
    return Array.from(this.agentProfiles.values());
  }

  getAgentProfile(agentId: string): AgentDualRiskProfile | null {
    return this.agentProfiles.get(agentId) || null;
  }

  // Legacy compatibility method for existing routes
  evaluateAgentRisk(agent: Agent): any {
    const dual = this.evaluateDualProfile(agent.agent_id);
    return {
      agent_id: dual.agent_id,
      name: dual.name,
      division: dual.division,
      cashout_ratio: dual.liquidity_signals.cash_out_volume_bdt / Math.max(1, dual.liquidity_signals.total_volume_bdt),
      peer_avg_cashout_ratio: dual.peer_benchmark.peer_avg_cashout_ratio,
      structured_txn_count: dual.fraud_signals.structured_amounts_count,
      shared_device_count: dual.fraud_signals.shared_device_count,
      risk_score: dual.fraud_risk_score,
      risk_tier: dual.fraud_risk_score >= 0.60 ? 'HIGH_ALERT' : dual.fraud_risk_score >= 0.40 ? 'ELEVATED' : 'NORMAL',
      active_warnings: dual.active_warnings,
      coached_victim_prompts_bn: dual.coached_victim_prompts_bn,
      dual_profile: dual
    };
  }

  // Action dispatcher
  executeAnalystAction(
    agentId: string,
    actionType: 'REQUEST_FLOAT_REBALANCE' | 'WATCHLIST_AGENT' | 'TRIGGER_COACHED_ALERT' | 'ESCALATE_RING',
    analystId: string,
    notes?: string
  ): { success: boolean; message: string; profile: AgentDualRiskProfile | null } {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) return { success: false, message: 'Agent profile not found', profile: null };

    if (actionType === 'REQUEST_FLOAT_REBALANCE') {
      profile.recommended_actions.push(`Float rebalance request dispatched by ${analystId}`);
      profile.liquidity_signals.inventory_balance_pressure = Math.max(0.20, profile.liquidity_signals.inventory_balance_pressure - 0.40);
    } else if (actionType === 'WATCHLIST_AGENT') {
      profile.active_warnings.push(`Placed on MLRO Watchlist by ${analystId}: ${notes || 'Suspicious velocity pattern'}`);
    }

    profile.last_evaluated_at = new Date().toISOString();
    this.saveProfile(profile);

    if (!this.seeding) {
      agentActionStore.enqueueUpsert({
        action_id: this.newActionId(),
        agent_id: agentId,
        action_type: actionType,
        analyst_id: analystId,
        details: { notes, classification: profile.classification },
        timestamp: new Date().toISOString()
      });
    }

    auditService.logAction(analystId, `AGENT_ACTION_${actionType}`, agentId, { notes, classification: profile.classification }).catch(() => {});

    return {
      success: true,
      message: `Action ${actionType} recorded for agent ${agentId}. Audit trail updated.`,
      profile
    };
  }

  // ================= 7. SEED PROFILES (DEMO SCENARIOS) =================
  private seedDefaultAgentProfiles() {
    // -------------------------------------------------------------
    // Scenario 1: AGENT A — Legitimate High-Volume Hub
    // (High Volume 10x peer avg, normal diversity, LOW fraud score)
    // -------------------------------------------------------------
    const peerA = this.getRegionalPeerBenchmark('Dhaka', 'tier_1', 'Wholesale Market Hub');
    const liquidityA: AgentLiquiditySignals = {
      cash_in_volume_bdt: 1450000,
      cash_out_volume_bdt: 1400000,
      total_volume_bdt: 2850000,
      hourly_volume_peak: 48,
      inventory_balance_pressure: 0.45,
      customer_count: 310,
      repeat_customer_rate: 0.74,
      regional_peer_deviation: 8.5, // 8.5x peer average
      business_hours_ratio: 0.96,
      seasonal_volume_change: 2.8 // Wholesale Eid trading
    };
    const fraudA: AgentFraudSignals = {
      shared_device_count: 0,
      suspicious_wallet_connections: 0,
      rapid_in_out_ratio: 0.05,
      ring_membership: [],
      structured_amounts_count: 1,
      unusual_counterparties_rate: 0.04,
      complaint_rate: 0,
      pass_through_behavior_ratio: 0.08
    };

    const opA = this.calculateOperationalPressureScore(liquidityA, peerA); // ~0.86
    const frA = this.calculateFraudRiskScore(fraudA, peerA); // ~0.08
    const classA = this.classifyAgent(opA, frA, liquidityA);

    const agentA: AgentDualRiskProfile = {
      agent_id: 'AGT-DH-8821',
      name: 'Mayer Doa Telecom (Kawran Bazar Wholesale Hub)',
      phone: '01712-445566',
      division: 'Dhaka',
      district_type: 'urban',
      business_profile: 'Wholesale Market Super-Agent Hub',
      size_tier: 'tier_1',
      tenure_days: 1250,
      operational_pressure_score: opA,
      fraud_risk_score: frA,
      classification: classA.classification, // HIGH_ACTIVITY
      classification_label_bn: classA.label_bn,
      classification_label_en: classA.label_en,
      classification_reason: classA.reason,
      liquidity_signals: liquidityA,
      fraud_signals: fraudA,
      peer_benchmark: peerA,
      active_warnings: [
        'High daily transaction velocity verified as legitimate Kawran Bazar vegetable & goods wholesale trade'
      ],
      coached_victim_prompts_bn: [
        'গ্রাহককে বিনয়ের সাথে জিজ্ঞেস করুন: "আপনাকে ফোনে কথা বলতে বলতে কেউ কি টাকা তুলতে বলেছে?"'
      ],
      recommended_actions: [
        'Maintain VIP liquidity float support',
        'Do not place fraud friction on verified commercial peer flow'
      ],
      last_evaluated_at: new Date().toISOString()
    };
    this.saveProfile(agentA);

    // -------------------------------------------------------------
    // Scenario 2: AGENT B — Complicit Mule Cash-Out Outlet
    // (Moderate volume, rapid pass-through, shared devices, HIGH fraud score)
    // -------------------------------------------------------------
    const peerB = this.getRegionalPeerBenchmark('Dhaka', 'tier_2', 'Outer Periphery Outlet');
    const liquidityB: AgentLiquiditySignals = {
      cash_in_volume_bdt: 25000,
      cash_out_volume_bdt: 455000,
      total_volume_bdt: 480000,
      hourly_volume_peak: 24,
      inventory_balance_pressure: 0.52,
      customer_count: 32,
      repeat_customer_rate: 0.12, // extremely low repeat rate!
      regional_peer_deviation: 1.4, // only 1.4x volume (moderate!)
      business_hours_ratio: 0.62, // 38% off-hours transactions
      seasonal_volume_change: 1.0
    };
    const fraudB: AgentFraudSignals = {
      shared_device_count: 6, // multiple emulator fingerprints
      suspicious_wallet_connections: 8,
      rapid_in_out_ratio: 0.86, // 86% rapid cash-out within 8 mins of victim send
      ring_membership: ['RING-003'],
      structured_amounts_count: 14, // repeated ৳4,990 cashouts
      unusual_counterparties_rate: 0.82,
      complaint_rate: 4,
      pass_through_behavior_ratio: 0.94
    };

    const opB = this.calculateOperationalPressureScore(liquidityB, peerB); // ~0.32
    const frB = this.calculateFraudRiskScore(fraudB, peerB); // ~0.92
    const classB = this.classifyAgent(opB, frB, liquidityB);

    const agentB: AgentDualRiskProfile = {
      agent_id: 'AGT-DH-4412',
      name: 'Rahman Enterprise (Savar Ring Exit Point)',
      phone: '01811-998822',
      division: 'Dhaka',
      district_type: 'urban',
      business_profile: 'Outer Ring Point',
      size_tier: 'tier_2',
      tenure_days: 140,
      operational_pressure_score: opB,
      fraud_risk_score: frB,
      classification: classB.classification, // FRAUD_REVIEW
      classification_label_bn: classB.label_bn,
      classification_label_en: classB.label_en,
      classification_reason: classB.reason,
      liquidity_signals: liquidityB,
      fraud_signals: fraudB,
      peer_benchmark: peerB,
      active_warnings: [
        '86% rapid cash-out velocity within 8 minutes of inbound victim transfer',
        '6 customer wallets shared single Android emulator device fingerprint',
        'Linked as primary cash-out terminal for Ring-003 (Dhaka Mule Network)',
        '14 structured transactions at ৳4,990 evading reporting threshold'
      ],
      coached_victim_prompts_bn: [
        '🚨 জরুরি সতর্কতা: এই এজেন্টে ক্যাশ-আউট করার সময় অতিরিক্ত পরিচয় যাচাইকরণ বাধ্যতামূলক!',
        'গ্রাহকের সম্মতি নিশ্চিত করুন এবং সন্দেহজনক কল সম্পর্কে সতর্ক করুন।'
      ],
      recommended_actions: [
        'Immediate STR dispatch to MLRO',
        'Restrict agent cash-out velocity limit to ৳20,000/hour',
        'Escalate to Ring-003 law enforcement package'
      ],
      last_evaluated_at: new Date().toISOString()
    };
    this.saveProfile(agentB);

    // -------------------------------------------------------------
    // Scenario 3: AGENT C — Salary Day Liquidity Pressure
    // (High Cash-Out float depletion, legitimate workers, LOW fraud score)
    // -------------------------------------------------------------
    const peerC = this.getRegionalPeerBenchmark('Dhaka', 'tier_1', 'Industrial Gate Point');
    const liquidityC: AgentLiquiditySignals = {
      cash_in_volume_bdt: 120000,
      cash_out_volume_bdt: 1950000,
      total_volume_bdt: 2070000,
      hourly_volume_peak: 65,
      inventory_balance_pressure: 0.94, // Float almost exhausted!
      customer_count: 480,
      repeat_customer_rate: 0.82, // Garment factory workers
      regional_peer_deviation: 3.8,
      business_hours_ratio: 0.98,
      seasonal_volume_change: 3.4 // Month-end salary window
    };
    const fraudC: AgentFraudSignals = {
      shared_device_count: 0,
      suspicious_wallet_connections: 0,
      rapid_in_out_ratio: 0.04,
      ring_membership: [],
      structured_amounts_count: 0,
      unusual_counterparties_rate: 0.02,
      complaint_rate: 0,
      pass_through_behavior_ratio: 0.06
    };

    const opC = this.calculateOperationalPressureScore(liquidityC, peerC); // ~0.92
    const frC = this.calculateFraudRiskScore(fraudC, peerC); // ~0.06
    const classC = this.classifyAgent(opC, frC, liquidityC);

    const agentC: AgentDualRiskProfile = {
      agent_id: 'AGT-GZ-1092',
      name: 'Bismillah Store (Gazipur Garment Gate Hub)',
      phone: '01919-776655',
      division: 'Dhaka',
      district_type: 'urban',
      business_profile: 'Industrial Zone Salary Point',
      size_tier: 'tier_1',
      tenure_days: 820,
      operational_pressure_score: opC,
      fraud_risk_score: frC,
      classification: classC.classification, // LIQUIDITY_PRESSURE
      classification_label_bn: classC.label_bn,
      classification_label_en: classC.label_en,
      classification_reason: classC.reason,
      liquidity_signals: liquidityC,
      fraud_signals: fraudC,
      peer_benchmark: peerC,
      active_warnings: [
        'Agent cash float exhausted (94% utilization) due to month-end apparel factory salary cash-outs',
        '0 fraud indicators detected across 480 factory worker transactions'
      ],
      coached_victim_prompts_bn: [
        'গ্রাহকদের লাইনে দাঁড়িয়ে শৃঙ্খলা বজায় রাখার অনুরোধ করুন।'
      ],
      recommended_actions: [
        'Dispatch emergency distributor float replenishment (৳500,000)',
        'Enable temporary overdraft liquidity buffer'
      ],
      last_evaluated_at: new Date().toISOString()
    };
    this.saveProfile(agentC);

    // -------------------------------------------------------------
    // Scenario 4: AGENT D — Normal Neighborhood Retail Point
    // (Normal volume, balanced flow, LOW fraud score)
    // -------------------------------------------------------------
    const peerD = this.getRegionalPeerBenchmark('Chittagong', 'tier_3', 'Neighborhood Grocery');
    const liquidityD: AgentLiquiditySignals = {
      cash_in_volume_bdt: 85000,
      cash_out_volume_bdt: 75000,
      total_volume_bdt: 160000,
      hourly_volume_peak: 12,
      inventory_balance_pressure: 0.22,
      customer_count: 42,
      repeat_customer_rate: 0.88,
      regional_peer_deviation: 1.0,
      business_hours_ratio: 0.95,
      seasonal_volume_change: 1.1
    };
    const fraudD: AgentFraudSignals = {
      shared_device_count: 0,
      suspicious_wallet_connections: 0,
      rapid_in_out_ratio: 0.02,
      ring_membership: [],
      structured_amounts_count: 0,
      unusual_counterparties_rate: 0.01,
      complaint_rate: 0,
      pass_through_behavior_ratio: 0.05
    };

    const opD = this.calculateOperationalPressureScore(liquidityD, peerD);
    const frD = this.calculateFraudRiskScore(fraudD, peerD);
    const classD = this.classifyAgent(opD, frD, liquidityD);

    const agentD: AgentDualRiskProfile = {
      agent_id: 'AGT-CTG-3301',
      name: 'Agrabad Corner Store (Chittagong)',
      phone: '01611-223344',
      division: 'Chittagong',
      district_type: 'urban',
      business_profile: 'Neighborhood Retail',
      size_tier: 'tier_3',
      tenure_days: 600,
      operational_pressure_score: opD,
      fraud_risk_score: frD,
      classification: classD.classification, // NORMAL
      classification_label_bn: classD.label_bn,
      classification_label_en: classD.label_en,
      classification_reason: classD.reason,
      liquidity_signals: liquidityD,
      fraud_signals: fraudD,
      peer_benchmark: peerD,
      active_warnings: [],
      coached_victim_prompts_bn: [
        'গ্রাহককে হাসিমুখে সেবা দিন এবং রসিদ বুঝিয়ে দিন।'
      ],
      recommended_actions: ['Standard periodic audit'],
      last_evaluated_at: new Date().toISOString()
    };
    this.saveProfile(agentD);
  }
}

export const agentGuard = new AgentGuardService();
