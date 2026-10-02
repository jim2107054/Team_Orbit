import {
  RecoveryRoutePlan,
  RecoveryRouteStep,
  RecoveryTimelineEvent,
  RecoverabilityAssessment,
  GoldenHourState,
  RecoveryActionType,
  RecoveryActionPriority,
  RecoveryActionStatus,
  RecoveryEvidenceItem
} from '../core/types.js';
import { recoveryTracer } from './recovery-tracer.js';
import { scamKnowledgeGraph } from './scam-knowledge-graph.js';
import { scamCampaignService } from './scam-campaign-service.js';
import { recoveryPlanStore } from '../db/stores.js';
import { persistence } from '../db/persistence.js';
import { getDbPool } from '../db/client.js';

export class RecoveryRouteOptimizerService {
  private activePlans: Map<string, RecoveryRoutePlan> = new Map();
  private caseTimelines: Map<string, RecoveryTimelineEvent[]> = new Map();

  private seeding = false;

  constructor() {
    this.seeding = true;
    try {
      this.seedDefaultScenarios();
    } finally {
      this.seeding = false;
    }
  }

  /**
   * First boot publishes the seeded demo scenarios; afterwards stored plans win,
   * so a recovery route an analyst has already worked through is not rebuilt
   * from scratch with its completed actions discarded.
   */
  async hydrate(): Promise<void> {
    if (await recoveryPlanStore.isEmpty()) {
      await recoveryPlanStore.upsertMany(Array.from(this.activePlans.values()));
      await this.persistAllTimelinesNow();
      return;
    }

    const plans = await recoveryPlanStore.loadAll();
    this.activePlans.clear();
    for (const plan of plans) this.activePlans.set(plan.case_id, plan);

    const res = await getDbPool().query(
      'SELECT case_id, payload_json FROM recovery_timeline_events ORDER BY case_id, seq ASC'
    );
    this.caseTimelines.clear();
    for (const row of res.rows) {
      const caseId = String(row.case_id);
      const event = (typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json) as RecoveryTimelineEvent;
      const list = this.caseTimelines.get(caseId) ?? [];
      list.push(event);
      this.caseTimelines.set(caseId, list);
    }
  }

  private savePlan(caseId: string, plan: RecoveryRoutePlan): RecoveryRoutePlan {
    this.activePlans.set(caseId, plan);
    if (!this.seeding) recoveryPlanStore.enqueueUpsert(plan);
    return plan;
  }

  /**
   * Timelines are replaced wholesale per case, so the durable write deletes the
   * case's rows and reinserts them in order rather than trying to diff.
   */
  private saveTimeline(caseId: string, events: RecoveryTimelineEvent[]): void {
    this.caseTimelines.set(caseId, events);
    if (this.seeding) return;
    persistence.enqueue(`recovery_timeline_events:replace:${caseId}`, () =>
      this.writeTimeline(caseId, events)
    );
  }

  private async writeTimeline(caseId: string, events: RecoveryTimelineEvent[]): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM recovery_timeline_events WHERE case_id = $1', [caseId]);
      for (const [index, event] of events.entries()) {
        await client.query(
          'INSERT INTO recovery_timeline_events (event_id, case_id, seq, payload_json) VALUES ($1, $2, $3, $4) ' +
          'ON CONFLICT (event_id) DO UPDATE SET case_id = EXCLUDED.case_id, seq = EXCLUDED.seq, payload_json = EXCLUDED.payload_json',
          [`${caseId}::${event.event_id}`, caseId, index, JSON.stringify(event)]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  private async persistAllTimelinesNow(): Promise<void> {
    for (const [caseId, events] of this.caseTimelines) {
      await this.writeTimeline(caseId, events);
    }
  }

  /**
   * Seed synthetic demo scenarios (A, B, C, D)
   */
  private seedDefaultScenarios(): void {
    // Scenario A: Direct Recipient (Single-hop, high recoverability in recipient wallet)
    this.generateDirectRecipientScenario('CASE-2026-SCENARIO-A');

    // Scenario B: Multi-hop Laundering Flow (Victim -> Mule 1 -> Layering A -> Mule 2 / Cashout)
    this.generateMultiHopLaunderingScenario('CASE-2026-SCENARIO-B');

    // Scenario C: Existing Scam Campaign Link (Mule connected to Eid Campaign & Ring)
    this.generateCampaignLinkedScenario('CASE-2026-SCENARIO-C');

    // Scenario D: Insufficient Evidence (Stolen funds transferred to unobservable node)
    this.generateInsufficientEvidenceScenario('CASE-2026-SCENARIO-D');
  }

  /**
   * Main Optimizer Method: Generate an explainable, evidence-backed recovery route
   */
  public generateRecoveryRoute(
    caseId: string,
    transactionId: string = 'TXN-SYN-2026-00417',
    options?: {
      scenarioId?: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D' | 'CUSTOM';
      goldenHourRemainingMin?: number;
      disputedAmountBdt?: number;
      victimWalletId?: string;
      customHops?: any;
    }
  ): RecoveryRoutePlan {
    const scenario = options?.scenarioId || 'SCENARIO_B';
    const amount = options?.disputedAmountBdt || 18500;
    const remainingMin = options?.goldenHourRemainingMin !== undefined ? options.goldenHourRemainingMin : 42;
    const elapsedMin = Math.max(0, 60 - remainingMin);

    // If pre-seeded scenario matches and exists, fetch baseline and adjust golden hour if requested
    if (this.activePlans.has(caseId)) {
      const existing = this.activePlans.get(caseId)!;
      if (options?.goldenHourRemainingMin !== undefined) {
        existing.golden_hour_state = this.calculateGoldenHourState(remainingMin);
        this.recalculateStepPriorities(existing);
      }
      return existing;
    }

    // Build specific scenario
    switch (scenario) {
      case 'SCENARIO_A':
        return this.generateDirectRecipientScenario(caseId, transactionId, amount, remainingMin);
      case 'SCENARIO_C':
        return this.generateCampaignLinkedScenario(caseId, transactionId, amount, remainingMin);
      case 'SCENARIO_D':
        return this.generateInsufficientEvidenceScenario(caseId, transactionId, amount, remainingMin);
      case 'SCENARIO_B':
      default:
        return this.generateMultiHopLaunderingScenario(caseId, transactionId, amount, remainingMin);
    }
  }

  /**
   * Scenario A: Direct Recipient (Victim -> Scam Wallet)
   */
  public generateDirectRecipientScenario(
    caseId: string = 'CASE-2026-SCENARIO-A',
    transactionId: string = 'TXN-SYN-2026-A01',
    amountBdt: number = 25000,
    remainingMin: number = 52
  ): RecoveryRoutePlan {
    const ghState = this.calculateGoldenHourState(remainingMin);
    const recipientWallet = 'W-SYN-091177';
    const victimWallet = 'W-SYN-004512';

    const evidence1: RecoveryEvidenceItem = {
      evidence_id: 'EVD-TXN-001',
      evidence_type: 'DIRECT_TRANSACTION',
      source_event_id: transactionId,
      timestamp: new Date(Date.now() - (60 - remainingMin) * 60000).toISOString(),
      description_en: `Direct P2P transfer of ৳${amountBdt.toLocaleString()} from victim ${victimWallet} to unverified recipient ${recipientWallet}.`,
      description_bn: `ক্ষতিগ্রস্ত ${victimWallet} থেকে সরাসরি ৳${amountBdt.toLocaleString()} প্রাপক ${recipientWallet}-এ পাঠানো হয়েছে।`,
      confidence: 0.98,
      amount_bdt: amountBdt,
      raw_data: { sender: victimWallet, receiver: recipientWallet, channel: 'APP' }
    };

    const evidence2: RecoveryEvidenceItem = {
      evidence_id: 'EVD-ACT-002',
      evidence_type: 'RECENT_TRANSFER',
      source_event_id: 'ACT-SYN-091177',
      timestamp: new Date(Date.now() - (60 - remainingMin - 3) * 60000).toISOString(),
      description_en: `Recipient account ${recipientWallet} retains ৳${amountBdt.toLocaleString()} active balance without immediate outbound transfers.`,
      description_bn: `প্রাপক অ্যাকাউন্ট ${recipientWallet}-এ সম্পূর্ণ ৳${amountBdt.toLocaleString()} এখনও জমা রয়েছে, তাৎক্ষণিক ফরোয়ার্ড করা হয়নি।`,
      confidence: 0.95,
      amount_bdt: amountBdt
    };

    const evidence3: RecoveryEvidenceItem = {
      evidence_id: 'EVD-CMPL-003',
      evidence_type: 'LINKED_COMPLAINT',
      source_event_id: 'CMPL-2026-0412',
      timestamp: new Date(Date.now() - (60 - remainingMin - 5) * 60000).toISOString(),
      description_en: `Victim complaint filed citing lottery prize impersonation fee.`,
      description_bn: `লটারি পুরস্কারের প্রলোভনে পাঠানো ফি দাবি করে ভিকটিম অভিযোগ দাখিল করেছেন।`,
      confidence: 0.92
    };

    const step1: RecoveryRouteStep = {
      step_number: 1,
      action_id: `ACT-${caseId}-01`,
      action_type: 'REVIEW_RECIPIENT_WALLET',
      target_entity_id: recipientWallet,
      target_entity_type: 'WALLET',
      target_entity_label: 'Tanvir Hossain (Recipient Wallet)',
      priority: 'URGENT',
      priority_score: 96,
      status: 'PENDING',
      reason_codes: ['PRIMARY_RECIPIENT', 'FUNDS_CURRENTLY_HELD', 'HIGH_RECOVERABILITY'],
      reason_en: `Primary recipient of disputed ৳${amountBdt.toLocaleString()}. Entire funds remain unspent in wallet balance. Immediate administrative review recommended.`,
      reason_bn: `বিতর্কিত ৳${amountBdt.toLocaleString()} এর সরাসরি প্রাপক। সম্পূর্ণ অর্থ এখনও ওয়ালেটে সংরক্ষিত। দ্রুত পর্যালোচনার সুপারিশ করা হচ্ছে।`,
      evidence_confidence: 0.98,
      evidence_items: [evidence1, evidence2],
      score_breakdown: {
        time_urgency: 0.95,
        money_flow_relevance: 1.0,
        evidence_strength: 0.98,
        recoverability_potential: 0.95,
        golden_hour_decay: 0.05
      },
      evidence_version: 1
    };

    const step2: RecoveryRouteStep = {
      step_number: 2,
      action_id: `ACT-${caseId}-02`,
      action_type: 'REVIEW_TRANSACTION',
      target_entity_id: transactionId,
      target_entity_type: 'TRANSACTION',
      target_entity_label: `Disputed Transfer (${transactionId})`,
      priority: 'HIGH',
      priority_score: 82,
      status: 'PENDING',
      reason_codes: ['ORIGINATING_DISPUTED_TXN', 'OFF_HOURS_HIGH_VALUE'],
      reason_en: `Audit transaction metadata, device signature, and telemetry to verify whether customer session was hijacked.`,
      reason_bn: `গ্রাহক সেশন হাইজ্যাক হয়েছিল কিনা তা যাচাই করতে লেনদেনের মেটাডাটা এবং ডিভাইস সিগনেচার অডিট করুন।`,
      evidence_confidence: 0.96,
      evidence_items: [evidence1],
      score_breakdown: {
        time_urgency: 0.85,
        money_flow_relevance: 0.80,
        evidence_strength: 0.96,
        recoverability_potential: 0.70,
        golden_hour_decay: 0.05
      },
      evidence_version: 1
    };

    const step3: RecoveryRouteStep = {
      step_number: 3,
      action_id: `ACT-${caseId}-03`,
      action_type: 'REVIEW_COMPLAINT',
      target_entity_id: 'CMPL-2026-0412',
      target_entity_type: 'COMPLAINT',
      target_entity_label: 'Victim Complaint (CMPL-2026-0412)',
      priority: 'MEDIUM',
      priority_score: 68,
      status: 'PENDING',
      reason_codes: ['COMPLAINT_NARRATIVE_VERIFICATION'],
      reason_en: `Examine victim narrative statement and caller phone logs to classify scam typology.`,
      reason_bn: `প্রতারণার ধরন নির্ণয়ের জন্য ভিকটিমের জবানবন্দি ও ফোন রেকর্ড পরীক্ষা করুন।`,
      evidence_confidence: 0.92,
      evidence_items: [evidence3],
      score_breakdown: {
        time_urgency: 0.60,
        money_flow_relevance: 0.70,
        evidence_strength: 0.92,
        recoverability_potential: 0.60,
        golden_hour_decay: 0.05
      },
      evidence_version: 1
    };

    const assessment: RecoverabilityAssessment = {
      level: 'POTENTIALLY_RECOVERABLE',
      level_bn: 'সম্ভাব্য পুনরুদ্ধারযোগ্য (উচ্চ সম্ভাবনা)',
      confidence_score: 0.95,
      reasons_en: [
        'Disputed funds remain 100% inside observable recipient wallet balance',
        'No onward forwarding or agent cash-out detected within 8 minutes of transfer',
        'Golden hour window remains wide (52 minutes remaining)'
      ],
      reasons_bn: [
        'বিতর্কিত অর্থ এখনও শতভাগ প্রাপক ওয়ালেটের ব্যালেন্সে বিদ্যমান',
        'লেনদেনের পর ৮ মিনিটের মধ্যে কোনো ক্যাশ-আউট বা ফরোয়ার্ডিং ঘটেনি',
        'গোল্ডেন আওয়ার সময় এখনও পর্যাপ্ত (৫২ মিনিট অবশিষ্ট)'
      ],
      observable_balance_bdt: amountBdt,
      disputed_amount_bdt: amountBdt,
      current_downstream_reach: `Recipient Wallet ${recipientWallet}`,
      last_hop_type: 'ACTIVE_WALLET_BALANCE'
    };

    const plan: RecoveryRoutePlan = {
      case_id: caseId,
      transaction_id: transactionId,
      disputed_amount_bdt: amountBdt,
      scenario_id: 'SCENARIO_A',
      scenario_name: 'Direct Single-Hop Recipient',
      overall_priority: 'HIGH',
      golden_hour_state: ghState,
      route: [step1, step2, step3],
      completed_actions: [],
      estimated_recoverability: assessment,
      evidence_count: 3,
      unsupported_recommendation_rate: 0.0,
      generated_at: new Date().toISOString(),
      version: 1
    };

    this.savePlan(caseId, plan);
    this.buildTimelineForScenario(caseId, 'SCENARIO_A', amountBdt, recipientWallet);
    return plan;
  }

  /**
   * Scenario B: Multi-hop Laundering Flow (Victim -> Mule 1 -> Layering Node A -> Mule 2 / Cashout)
   */
  public generateMultiHopLaunderingScenario(
    caseId: string = 'CASE-2026-SCENARIO-B',
    transactionId: string = 'TXN-SYN-2026-00417',
    amountBdt: number = 18500,
    remainingMin: number = 42
  ): RecoveryRoutePlan {
    const ghState = this.calculateGoldenHourState(remainingMin);

    const evd1: RecoveryEvidenceItem = {
      evidence_id: 'EVD-TX-001',
      evidence_type: 'DIRECT_TRANSACTION',
      source_event_id: transactionId,
      timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
      description_en: `Victim W-SYN-004512 sent ৳18,500 to initial collector W-SYN-091177 at 23:41:07.`,
      description_bn: `ভিকটিম W-SYN-004512 রাত ২৩:৪১:০৭ মিনিটে প্রাথমিক সংগ্রাহক W-SYN-091177-এ ৳১৮,৫০০ পাঠিয়েছেন।`,
      confidence: 0.99,
      amount_bdt: 18500
    };

    const evd2: RecoveryEvidenceItem = {
      evidence_id: 'EVD-HOP-02',
      evidence_type: 'RECENT_TRANSFER',
      source_event_id: 'TXN-SYN-044219',
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
      description_en: `Collector forwarded ৳13,500 to Layering Node W-SYN-044219 within 2 minutes of receipt.`,
      description_bn: `সংগ্রাহক টাকা পাওয়ার ২ মিনিটের মধ্যে লেয়ারিং ওয়ালেট W-SYN-044219-এ ৳১৩,৫০০ স্থানান্তর করেন।`,
      confidence: 0.96,
      amount_bdt: 13500
    };

    const evd3: RecoveryEvidenceItem = {
      evidence_id: 'EVD-HOP-03A',
      evidence_type: 'DOWNSTREAM_HOP',
      source_event_id: 'TXN-SYN-088312',
      timestamp: new Date(Date.now() - 17 * 60000).toISOString(),
      description_en: `Layering Node split ৳6,000 to Terminal Mule 2 (W-SYN-088312), where ৳5,000 active balance remains.`,
      description_bn: `লেয়ারিং নোড থেকে টার্মিনাল মিউল ওয়ালেট W-SYN-088312-এ ৳৬,০০০ পাঠানো হয়, যার মধ্যে ৳৫,০০০ এখনও ব্যালেন্সে আছে।`,
      confidence: 0.94,
      amount_bdt: 5000
    };

    const evd4: RecoveryEvidenceItem = {
      evidence_id: 'EVD-HOP-03B',
      evidence_type: 'DOWNSTREAM_HOP',
      source_event_id: 'TXN-SYN-091177-RET',
      timestamp: new Date(Date.now() - 16 * 60000).toISOString(),
      description_en: `Terminal Mule 1 (W-SYN-091177) holds ৳6,200 active uncashed balance.`,
      description_bn: `টার্মিনাল মিউল ওয়ালেট W-SYN-091177-এ ৳৬,২০০ সক্রিয় আনক্যাশড ব্যালেন্স রয়েছে।`,
      confidence: 0.95,
      amount_bdt: 6200
    };

    const evd5: RecoveryEvidenceItem = {
      evidence_id: 'EVD-CSH-01',
      evidence_type: 'AGENT_LINK',
      source_event_id: 'CSH-AGT-CTG-1044',
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      description_en: `৳5,000 cashed out at Agent AGT-CTG-1044 (Agrabad, Chattogram) shortly after receipt.`,
      description_bn: `প্রাপ্তির কিছুক্ষণ পরই এজেন্ট AGT-CTG-1044 (আগ্রাবাদ, চট্টগ্রাম) থেকে ৳৫,০০০ ক্যাশ-আউট সম্পন্ন হয়।`,
      confidence: 0.97,
      amount_bdt: 5000
    };

    const evd6: RecoveryEvidenceItem = {
      evidence_id: 'EVD-CSH-02',
      evidence_type: 'AGENT_LINK',
      source_event_id: 'CSH-AGT-DH-8821',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      description_en: `৳2,300 partial cash-out split across Mule 1 & Mule 2 at Agent AGT-DH-8821 (Mirpur, Dhaka).`,
      description_bn: `এজেন্ট AGT-DH-8821 (মিরপুর, ঢাকা) থেকে মোট ৳২,৩০০ ক্যাশ-আউট হয়েছে।`,
      confidence: 0.95,
      amount_bdt: 2300
    };

    const step1: RecoveryRouteStep = {
      step_number: 1,
      action_id: `ACT-${caseId}-01`,
      action_type: 'REVIEW_RECIPIENT_WALLET',
      target_entity_id: 'W-SYN-091177',
      target_entity_type: 'WALLET',
      target_entity_label: 'Tanvir Hossain (Terminal Mule 1)',
      priority: 'URGENT',
      priority_score: 95,
      status: 'PENDING',
      reason_codes: ['TERMINAL_MULE_HOLD_CANDIDATE', 'HIGH_RECOVERABLE_BALANCE'],
      reason_en: `Holds ৳6,200 active recoverable balance from downstream split. Rapid action required before full cash-out occurs.`,
      reason_bn: `ডাউনস্ট্রিম স্প্লিটের ৳৬,২০০ সক্রিয় ব্যালেন্স জমা রয়েছে। সম্পূর্ণ ক্যাশ-আউট হওয়ার পূর্বে দ্রুত পর্যালোচনা প্রয়োজন।`,
      evidence_confidence: 0.95,
      evidence_items: [evd1, evd4],
      score_breakdown: {
        time_urgency: 0.92,
        money_flow_relevance: 0.98,
        evidence_strength: 0.95,
        recoverability_potential: 0.95,
        golden_hour_decay: 0.12
      },
      evidence_version: 1
    };

    const step2: RecoveryRouteStep = {
      step_number: 2,
      action_id: `ACT-${caseId}-02`,
      action_type: 'REVIEW_RECIPIENT_WALLET',
      target_entity_id: 'W-SYN-088312',
      target_entity_type: 'WALLET',
      target_entity_label: 'Rashedul Islam (Terminal Mule 2)',
      priority: 'URGENT',
      priority_score: 93,
      status: 'PENDING',
      reason_codes: ['TERMINAL_MULE_HOLD_CANDIDATE', 'RAPID_FUND_MOVEMENT'],
      reason_en: `Holds ৳5,000 active recoverable balance. Received via Layering Node W-SYN-044219.`,
      reason_bn: `লেয়ারিং নোড হয়ে ৳৫,০০০ সক্রিয় ব্যালেন্স জমা রয়েছে। অবিলম্বে পর্যালোচনার সুপারিশ করা হচ্ছে।`,
      evidence_confidence: 0.94,
      evidence_items: [evd2, evd3],
      score_breakdown: {
        time_urgency: 0.90,
        money_flow_relevance: 0.95,
        evidence_strength: 0.94,
        recoverability_potential: 0.92,
        golden_hour_decay: 0.12
      },
      evidence_version: 1
    };

    const step3: RecoveryRouteStep = {
      step_number: 3,
      action_id: `ACT-${caseId}-03`,
      action_type: 'REVIEW_CASHOUT',
      target_entity_id: 'CSH-AGT-CTG-1044',
      target_entity_type: 'TRANSACTION',
      target_entity_label: 'Cash-out Event (AGT-CTG-1044)',
      priority: 'HIGH',
      priority_score: 79,
      status: 'PENDING',
      reason_codes: ['RECENT_TERMINAL_CASHOUT', 'LOCATION_LEAD'],
      reason_en: `Review terminal ৳5,000 cash-out at Agent AGT-CTG-1044 (Agrabad). Verify CCTV/agent log for physical perpetrator identity.`,
      reason_bn: `এজেন্ট AGT-CTG-1044 (আগ্রাবাদ)-এ ৳৫,০০০ ক্যাশ-আউট পর্যালোচনা করুন। প্রতারকের সিসিটিভি/লগ যাচাই করুন।`,
      evidence_confidence: 0.97,
      evidence_items: [evd5],
      score_breakdown: {
        time_urgency: 0.75,
        money_flow_relevance: 0.82,
        evidence_strength: 0.97,
        recoverability_potential: 0.60,
        golden_hour_decay: 0.15
      },
      evidence_version: 1
    };

    const step4: RecoveryRouteStep = {
      step_number: 4,
      action_id: `ACT-${caseId}-04`,
      action_type: 'REVIEW_AGENT',
      target_entity_id: 'AGT-DH-8821',
      target_entity_type: 'AGENT',
      target_entity_label: 'M/S Mirpur Telecom (AGT-DH-8821)',
      priority: 'MEDIUM',
      priority_score: 65,
      status: 'PENDING',
      reason_codes: ['SUSPICIOUS_AGENT_CONCENTRATION', 'MULTIPLE_MULE_CASHOUTS'],
      reason_en: `Agent processed cash-outs for both Mule 1 and Mule 2 within 6 minutes. Cross-reference with Agent Guard fraud profile.`,
      reason_bn: `উভয় মিউলের ক্যাশ-আউট এই এজেন্টের মাধ্যমে ৬ মিনিটের ব্যবধানে সম্পন্ন হয়েছে। এজেন্ট গার্ড প্রোফাইল যাচাই করুন।`,
      evidence_confidence: 0.95,
      evidence_items: [evd6],
      score_breakdown: {
        time_urgency: 0.60,
        money_flow_relevance: 0.65,
        evidence_strength: 0.95,
        recoverability_potential: 0.40,
        golden_hour_decay: 0.15
      },
      evidence_version: 1
    };

    const step5: RecoveryRouteStep = {
      step_number: 5,
      action_id: `ACT-${caseId}-05`,
      action_type: 'ESCALATE_CASE',
      target_entity_id: caseId,
      target_entity_type: 'CASE',
      target_entity_label: `Case ${caseId} MLRO Escalation`,
      priority: 'MEDIUM',
      priority_score: 55,
      status: 'PENDING',
      reason_codes: ['MULTI_JURISDICTIONAL_LAUNDERING'],
      reason_en: `Disputed funds moved across Dhaka and Chattogram divisions. Prepare dual four-eyes recovery authorization.`,
      reason_bn: `ঢাকা ও চট্টগ্রাম বিভাগের মধ্যে মানি লন্ডারিং প্যাটার্ন দেখা গেছে। ফোর-আইজ অনুমোদনের জন্য প্রস্তুত করুন।`,
      evidence_confidence: 0.98,
      evidence_items: [evd1, evd2, evd5],
      score_breakdown: {
        time_urgency: 0.50,
        money_flow_relevance: 0.60,
        evidence_strength: 0.98,
        recoverability_potential: 0.50,
        golden_hour_decay: 0.15
      },
      evidence_version: 1
    };

    const assessment: RecoverabilityAssessment = {
      level: 'POTENTIALLY_RECOVERABLE',
      level_bn: 'সম্ভাব্য আংশিক পুনরুদ্ধারযোগ্য (৳১১,২০০ / ৬০.৫%)',
      confidence_score: 0.94,
      reasons_en: [
        '৳11,200 (60.5%) remains active across two downstream mule wallets (W-SYN-091177 & W-SYN-088312)',
        '৳7,300 (39.5%) has already exited via physical cash-out at Agents AGT-CTG-1044 & AGT-DH-8821',
        'Golden hour remaining: 42 minutes with low collateral risk on downstream wallets'
      ],
      reasons_bn: [
        'দুটি ডাউনস্ট্রিম মিউল ওয়ালেটে মোট ৳১১,২০০ (৬০.৫%) সক্রিয় ব্যালেন্স এখনও অক্ষত রয়েছে',
        '৳৭,৩০০ (৩৯.৫%) এজেন্টদের মাধ্যমে ইতোমধ্যে ক্যাশ-আউট সম্পন্ন হয়েছে',
        'গোল্ডেন আওয়ার সময় এখনও ৪২ মিনিট বাকি এবং কোলাটেরাল ঝুঁকি কম'
      ],
      observable_balance_bdt: 11200,
      disputed_amount_bdt: 18500,
      current_downstream_reach: 'Terminal Mules W-SYN-091177 / W-SYN-088312',
      last_hop_type: 'ACTIVE_WALLET_BALANCE'
    };

    const plan: RecoveryRoutePlan = {
      case_id: caseId,
      transaction_id: transactionId,
      disputed_amount_bdt: amountBdt,
      scenario_id: 'SCENARIO_B',
      scenario_name: 'Multi-Hop Laundering Network',
      overall_priority: 'CRITICAL',
      golden_hour_state: ghState,
      route: [step1, step2, step3, step4, step5],
      completed_actions: [],
      estimated_recoverability: assessment,
      evidence_count: 6,
      unsupported_recommendation_rate: 0.0,
      generated_at: new Date().toISOString(),
      version: 1
    };

    this.savePlan(caseId, plan);
    this.buildTimelineForScenario(caseId, 'SCENARIO_B', amountBdt, 'W-SYN-091177');
    return plan;
  }

  /**
   * Scenario C: Scam Campaign & Ring Link
   */
  public generateCampaignLinkedScenario(
    caseId: string = 'CASE-2026-SCENARIO-C',
    transactionId: string = 'TXN-SYN-2026-C01',
    amountBdt: number = 32000,
    remainingMin: number = 38
  ): RecoveryRoutePlan {
    const ghState = this.calculateGoldenHourState(remainingMin);

    const evd1: RecoveryEvidenceItem = {
      evidence_id: 'EVD-TX-C01',
      evidence_type: 'DIRECT_TRANSACTION',
      source_event_id: transactionId,
      timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
      description_en: `Transaction of ৳32,000 sent to collector wallet W-SYN-091177.`,
      description_bn: `সংগ্রাহক ওয়ালেট W-SYN-091177-এ ৳৩২,০০০ স্থানান্তর।`,
      confidence: 0.99,
      amount_bdt: 32000
    };

    const evd2: RecoveryEvidenceItem = {
      evidence_id: 'EVD-CAMP-01',
      evidence_type: 'KNOWN_SCAM_CAMPAIGN',
      source_event_id: 'CAMP-2026-EID-01',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      description_en: `Recipient wallet strongly linked to Campaign "Eid Lottery Cashback Syndicate" (CAMP-2026-EID-01) with 14 active victims.`,
      description_bn: `প্রাপক ওয়ালেটটি "ঈদ লটারি ক্যাশব্যাক সিন্ডিকেট" ক্যাম্পেইনের সাথে জড়িত এবং ১৪ জন ভিকটিম রিপোর্ট করেছেন।`,
      confidence: 0.96
    };

    const evd3: RecoveryEvidenceItem = {
      evidence_id: 'EVD-RING-01',
      evidence_type: 'KNOWN_RING',
      source_event_id: 'RING-DHAKA-NORTH-04',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      description_en: `Recipient device and SIM hardware are part of Ring-12 (Dhaka North Coordinated Ring).`,
      description_bn: `প্রাপক ডিভাইস ও সিম মানি লন্ডারিং রিং-১২ (ঢাকা উত্তর) এর অংশ।`,
      confidence: 0.93
    };

    const evd4: RecoveryEvidenceItem = {
      evidence_id: 'EVD-CMPL-C02',
      evidence_type: 'LINKED_COMPLAINT',
      source_event_id: 'CMPL-2026-0881',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      description_en: `Linked complaint filed 10 minutes ago describing exact same SMS script and fake customer care number.`,
      description_bn: `১০ মিনিট আগে দায়ের করা অভিযোগে একই ভুয়া কাস্টমার কেয়ার স্ক্রিপ্ট ও নম্বরের উল্লেখ পাওয়া গেছে।`,
      confidence: 0.95
    };

    const step1: RecoveryRouteStep = {
      step_number: 1,
      action_id: `ACT-${caseId}-01`,
      action_type: 'REVIEW_RECIPIENT_WALLET',
      target_entity_id: 'W-SYN-091177',
      target_entity_type: 'WALLET',
      target_entity_label: 'Tanvir Hossain (Hub Wallet)',
      priority: 'URGENT',
      priority_score: 94,
      status: 'PENDING',
      reason_codes: ['PRIMARY_RECIPIENT', 'SYNDICATE_COLLECTOR_HUB'],
      reason_en: `Recipient is a central collector hub for an active coordinated scam campaign. Remaining balance review urgent.`,
      reason_bn: `প্রাপক একটি সক্রিয় প্রতারক সিন্ডিকেটের কেন্দ্রীয় হাব। অবশিষ্ট ব্যালেন্স অবিলম্বে পর্যালোচনা প্রয়োজন।`,
      evidence_confidence: 0.98,
      evidence_items: [evd1, evd2],
      score_breakdown: {
        time_urgency: 0.90,
        money_flow_relevance: 0.95,
        evidence_strength: 0.98,
        recoverability_potential: 0.85,
        golden_hour_decay: 0.10
      },
      evidence_version: 1
    };

    const step2: RecoveryRouteStep = {
      step_number: 2,
      action_id: `ACT-${caseId}-02`,
      action_type: 'REVIEW_CAMPAIGN',
      target_entity_id: 'CAMP-2026-EID-01',
      target_entity_type: 'CAMPAIGN',
      target_entity_label: 'Eid Lottery Cashback Syndicate',
      priority: 'HIGH',
      priority_score: 84,
      status: 'PENDING',
      reason_codes: ['KNOWN_COORDINATED_CAMPAIGN', 'MULTI_VICTIM_SPREAD'],
      reason_en: `Campaign links 14 complaints and 6 mule wallets with aggregate disputed volume exceeding ৳480,000.`,
      reason_bn: `ক্যাম্পেইনটির সাথে ১৪টি অভিযোগ ও ৬টি মিউল ওয়ালেটের মোট ৳৪,৮০,০০০ এর বেশি বিরোধপূর্ণ অর্থ যুক্ত রয়েছে।`,
      evidence_confidence: 0.96,
      evidence_items: [evd2, evd4],
      score_breakdown: {
        time_urgency: 0.80,
        money_flow_relevance: 0.85,
        evidence_strength: 0.96,
        recoverability_potential: 0.75,
        golden_hour_decay: 0.10
      },
      evidence_version: 1
    };

    const step3: RecoveryRouteStep = {
      step_number: 3,
      action_id: `ACT-${caseId}-03`,
      action_type: 'REVIEW_COMPLAINT',
      target_entity_id: 'CMPL-2026-0881',
      target_entity_type: 'COMPLAINT',
      target_entity_label: 'Linked Complaint (CMPL-2026-0881)',
      priority: 'HIGH',
      priority_score: 76,
      status: 'PENDING',
      reason_codes: ['IDENTICAL_MODUS_OPERANDI'],
      reason_en: `Complaint provides caller audio recording and phishing URL pointing to fake recharge portal.`,
      reason_bn: `অভিযোগে প্রতারকের কল রেকর্ডিং ও ভুয়া রিচার্জ পোর্টালের ফিশিং লিংক সংযুক্ত রয়েছে।`,
      evidence_confidence: 0.95,
      evidence_items: [evd4],
      score_breakdown: {
        time_urgency: 0.70,
        money_flow_relevance: 0.75,
        evidence_strength: 0.95,
        recoverability_potential: 0.65,
        golden_hour_decay: 0.10
      },
      evidence_version: 1
    };

    const step4: RecoveryRouteStep = {
      step_number: 4,
      action_id: `ACT-${caseId}-04`,
      action_type: 'REVIEW_RING',
      target_entity_id: 'RING-DHAKA-NORTH-04',
      target_entity_type: 'RING',
      target_entity_label: 'Money Laundering Ring-12',
      priority: 'MEDIUM',
      priority_score: 64,
      status: 'PENDING',
      reason_codes: ['SYNDICATE_INFRASTRUCTURE'],
      reason_en: `Inspect shared IMEI and SIM swap hardware nodes linked to Ring-12.`,
      reason_bn: `রিং-১২ এর সাথে সংযুক্ত শেয়ার্ড আইএমইআই ও সিম সোয়াপ হার্ডওয়্যার নোডগুলো পরীক্ষা করুন।`,
      evidence_confidence: 0.93,
      evidence_items: [evd3],
      score_breakdown: {
        time_urgency: 0.55,
        money_flow_relevance: 0.65,
        evidence_strength: 0.93,
        recoverability_potential: 0.50,
        golden_hour_decay: 0.10
      },
      evidence_version: 1
    };

    const assessment: RecoverabilityAssessment = {
      level: 'MODERATE_RECOVERY_EFFORT',
      level_bn: 'মধ্যম পুনরুদ্ধার প্রচেষ্টা (সিন্ডিকেট স্প্লিট)',
      confidence_score: 0.88,
      reasons_en: [
        'Recipient wallet is an established collector with partial funds forwarded to campaign mules',
        'Corroborated across 14 related complaints with known campaign typology',
        'Observable uncashed network balance: ৳14,500'
      ],
      reasons_bn: [
        'প্রাপক ওয়ালেটটি একটি পরিচিত সংগ্রাহক যার আংশিক অর্থ ক্যাম্পেইন মিউলে পাঠানো হয়েছে',
        '১৪টি সংশ্লিষ্ট অভিযোগের সাথে মোডাস অপারেন্ডি শতভাগ মিলে গেছে',
        'নেটওয়ার্কে দৃশ্যমান আনক্যাশড ব্যালেন্স: ৳১৪,৫০০'
      ],
      observable_balance_bdt: 14500,
      disputed_amount_bdt: 32000,
      current_downstream_reach: 'Campaign Syndicate Node W-SYN-091177',
      last_hop_type: 'ACTIVE_WALLET_BALANCE'
    };

    const plan: RecoveryRoutePlan = {
      case_id: caseId,
      transaction_id: transactionId,
      disputed_amount_bdt: amountBdt,
      scenario_id: 'SCENARIO_C',
      scenario_name: 'Coordinated Campaign & Ring Syndicate',
      overall_priority: 'HIGH',
      golden_hour_state: ghState,
      route: [step1, step2, step3, step4],
      completed_actions: [],
      estimated_recoverability: assessment,
      evidence_count: 4,
      unsupported_recommendation_rate: 0.0,
      generated_at: new Date().toISOString(),
      version: 1
    };

    this.savePlan(caseId, plan);
    this.buildTimelineForScenario(caseId, 'SCENARIO_C', amountBdt, 'W-SYN-091177');
    return plan;
  }

  /**
   * Scenario D: Insufficient Evidence / Unobservable Flow
   */
  public generateInsufficientEvidenceScenario(
    caseId: string = 'CASE-2026-SCENARIO-D',
    transactionId: string = 'TXN-SYN-2026-D01',
    amountBdt: number = 45000,
    remainingMin: number = 10
  ): RecoveryRoutePlan {
    const ghState = this.calculateGoldenHourState(remainingMin);

    const evd1: RecoveryEvidenceItem = {
      evidence_id: 'EVD-TX-D01',
      evidence_type: 'DIRECT_TRANSACTION',
      source_event_id: transactionId,
      timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
      description_en: `Transaction completed 50 minutes ago to external unmapped routing gateway.`,
      description_bn: `লেনদেনটি ৫০ মিনিট পূর্বে সম্পন্ন হয়ে বহিরাগত আনম্যাপড রাউটিং গেটওয়েতে চলে গেছে।`,
      confidence: 0.85,
      amount_bdt: 45000
    };

    const step1: RecoveryRouteStep = {
      step_number: 1,
      action_id: `ACT-${caseId}-01`,
      action_type: 'REQUEST_ADDITIONAL_EVIDENCE',
      target_entity_id: caseId,
      target_entity_type: 'CASE',
      target_entity_label: `Case Evidence Inquest (${caseId})`,
      priority: 'HIGH',
      priority_score: 75,
      status: 'PENDING',
      reason_codes: ['INSUFFICIENT_OBSERVABLE_DATA', 'EXTERNAL_GATEWAY_EXIT'],
      reason_en: `Funds exited observable MFS network into unmapped external channel. Request partner bank clearing logs or additional customer proof.`,
      reason_bn: `অর্থ দৃশ্যমান এমএফএস নেটওয়ার্ক থেকে বহিরাগত চ্যানেলে চলে গেছে। পার্টনার ব্যাংকের ক্লিয়ারিং লগ বা অতিরিক্ত প্রমাণের অনুরোধ করুন।`,
      evidence_confidence: 0.85,
      evidence_items: [evd1],
      score_breakdown: {
        time_urgency: 0.80,
        money_flow_relevance: 0.50,
        evidence_strength: 0.85,
        recoverability_potential: 0.10,
        golden_hour_decay: 0.85
      },
      evidence_version: 1
    };

    const step2: RecoveryRouteStep = {
      step_number: 2,
      action_id: `ACT-${caseId}-02`,
      action_type: 'ESCALATE_CASE',
      target_entity_id: caseId,
      target_entity_type: 'CASE',
      target_entity_label: 'Legal & LEA Escalation',
      priority: 'HIGH',
      priority_score: 70,
      status: 'PENDING',
      reason_codes: ['EXPIRED_GOLDEN_HOUR', 'LAW_ENFORCEMENT_REQUIRED'],
      reason_en: `Golden hour window almost expired (10 mins left) and internal recovery route exhausted. Escalate to Law Enforcement / BFIU.`,
      reason_bn: `গোল্ডেন আওয়ার সময় প্রায় শেষ (১০ মিনিট বাকি) এবং অভ্যন্তরীণ রিকভারি রুট অপ্রাপ্য। আইনশৃঙ্খলা বাহিনী / বিএফআইইউতে পাঠান।`,
      evidence_confidence: 0.90,
      evidence_items: [evd1],
      score_breakdown: {
        time_urgency: 0.90,
        money_flow_relevance: 0.40,
        evidence_strength: 0.90,
        recoverability_potential: 0.10,
        golden_hour_decay: 0.85
      },
      evidence_version: 1
    };

    const assessment: RecoverabilityAssessment = {
      level: 'INSUFFICIENT_EVIDENCE',
      level_bn: 'অপর্যাপ্ত তথ্যপ্রমাণ (পুনরুদ্ধার রুট তৈরি সম্ভব নয়)',
      confidence_score: 0.20,
      reasons_en: [
        'Insufficient evidence for a reliable recovery route. Continue evidence collection.',
        'Downstream transaction exited observable upay MFS ledger into external channel',
        'Golden Hour nearly expired with zero observable active balance'
      ],
      reasons_bn: [
        'নির্ভরযোগ্য রিকভারি রুট তৈরির জন্য পর্যাপ্ত তথ্যপ্রমাণ নেই। তথ্য সংগ্রহ অব্যাহত রাখুন।',
        'ডাউনস্ট্রিম অর্থ দৃশ্যমান উপায় এমএফএস লেজার থেকে বহিরাগত চ্যানেলে চলে গেছে',
        'গোল্ডেন আওয়ার প্রায় সমাপ্ত এবং কোনো সক্রিয় ব্যালেন্স দৃশ্যমান নয়'
      ],
      observable_balance_bdt: 0,
      disputed_amount_bdt: amountBdt,
      current_downstream_reach: 'Unobservable External Outflow',
      last_hop_type: 'EXTERNAL_OUTFLOW',
      insufficient_evidence_reason: 'Insufficient evidence for a reliable recovery route. Continue evidence collection.',
      insufficient_evidence_reason_bn: 'নির্ভরযোগ্য রিকভারি রুট তৈরির জন্য পর্যাপ্ত তথ্যপ্রমাণ নেই। তথ্য সংগ্রহ অব্যাহত রাখুন।'
    };

    const plan: RecoveryRoutePlan = {
      case_id: caseId,
      transaction_id: transactionId,
      disputed_amount_bdt: amountBdt,
      scenario_id: 'SCENARIO_D',
      scenario_name: 'Insufficient Evidence / External Outflow',
      overall_priority: 'MEDIUM',
      golden_hour_state: ghState,
      route: [step1, step2],
      completed_actions: [],
      estimated_recoverability: assessment,
      evidence_count: 1,
      unsupported_recommendation_rate: 0.0,
      generated_at: new Date().toISOString(),
      version: 1
    };

    this.savePlan(caseId, plan);
    this.buildTimelineForScenario(caseId, 'SCENARIO_D', amountBdt, 'W-SYN-UNKNOWN');
    return plan;
  }

  /**
   * Action Status Update: Handles 'Mark Reviewed', 'Skip', 'Escalate', etc.
   * Dynamically updates route sequence and prevents duplicate recommendations!
   */
  public updateActionStatus(
    caseId: string,
    actionId: string,
    status: RecoveryActionStatus,
    notes?: string,
    analystId: string = 'ANALYST-101'
  ): { success: boolean; plan: RecoveryRoutePlan } {
    let plan = this.activePlans.get(caseId);
    if (!plan) {
      plan = this.generateRecoveryRoute(caseId);
    }

    const stepIndex = plan.route.findIndex((s) => s.action_id === actionId);
    if (stepIndex === -1) {
      // Check if already completed
      const completedStep = plan.completed_actions.find((s) => s.action_id === actionId);
      if (completedStep) {
        completedStep.status = status;
        if (notes) completedStep.analyst_notes = notes;
        completedStep.reviewed_by = analystId;
        completedStep.reviewed_at = new Date().toISOString();
        return { success: true, plan };
      }
      throw new Error(`Action ${actionId} not found in case ${caseId}`);
    }

    // Update the step
    const [actionStep] = plan.route.splice(stepIndex, 1);
    actionStep.status = status;
    actionStep.reviewed_by = analystId;
    actionStep.reviewed_at = new Date().toISOString();
    if (notes) actionStep.analyst_notes = notes;

    // Move to completed actions (Duplicate Action Prevention)
    plan.completed_actions.push(actionStep);

    // Re-index and dynamically re-rank remaining route steps
    plan.route.forEach((step, idx) => {
      step.step_number = idx + 1;
    });
    this.recalculateStepPriorities(plan);

    plan.version += 1;
    this.savePlan(caseId, plan);

    // Add timeline event for investigator action
    const timeline = this.caseTimelines.get(caseId) || [];
    timeline.push({
      event_id: `EVT-ACT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      relative_time_min: Math.floor((Date.now() - new Date(plan.generated_at).getTime()) / 60000),
      event_type: status === 'ESCALATED' ? 'CASE_ESCALATED' : 'ACTION_REVIEWED',
      title_en: `Investigator Action: ${actionStep.action_type} marked as ${status}`,
      title_bn: `তদন্তকারী পদক্ষেপ: ${actionStep.action_type} চিহ্নিত করা হয়েছে ${status} হিসেবে`,
      description_en: notes || `Action on ${actionStep.target_entity_label} handled by ${analystId}.`,
      description_bn: notes || `${actionStep.target_entity_label} এর ওপর তদন্তকারী ${analystId} পদক্ষেপ নিয়েছেন।`,
      entity_id: actionStep.target_entity_id,
      entity_type: actionStep.target_entity_type,
      evidence_id: actionStep.evidence_items[0]?.evidence_id || 'EVD-MANUAL'
    });
    this.saveTimeline(caseId, timeline);

    return { success: true, plan };
  }

  /**
   * Get Recovery Timeline for a given case
   */
  public getRecoveryTimeline(caseId: string): RecoveryTimelineEvent[] {
    if (!this.caseTimelines.has(caseId)) {
      this.generateRecoveryRoute(caseId);
    }
    return this.caseTimelines.get(caseId) || [];
  }

  /**
   * Calculate dynamic Golden Hour state based on remaining minutes
   */
  private calculateGoldenHourState(remainingMinutes: number): GoldenHourState {
    const totalWindow = 60;
    const elapsed = Math.max(0, totalWindow - remainingMinutes);
    let tier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'EXPIRED' = 'HIGH';

    if (remainingMinutes <= 10) tier = 'CRITICAL';
    else if (remainingMinutes <= 25) tier = 'HIGH';
    else if (remainingMinutes <= 60) tier = 'MODERATE';
    else tier = 'EXPIRED';

    return {
      elapsed_minutes: elapsed,
      remaining_minutes: remainingMinutes,
      total_window_minutes: totalWindow,
      urgency_tier: tier,
      time_since_transaction: `${elapsed} minutes ago`,
      time_since_last_transfer: `${Math.max(0, elapsed - 4)} minutes ago`,
      time_since_cashout: `${Math.max(0, elapsed - 10)} minutes ago`
    };
  }

  /**
   * Recalculate priority scores & re-rank when time or evidence changes
   */
  private recalculateStepPriorities(plan: RecoveryRoutePlan): void {
    const isLateWindow = plan.golden_hour_state.remaining_minutes <= 15;

    for (const step of plan.route) {
      let timeUrgency = step.score_breakdown.time_urgency;
      let flowRel = step.score_breakdown.money_flow_relevance;
      let evdStr = step.score_breakdown.evidence_strength;
      let recovPot = step.score_breakdown.recoverability_potential;

      // Late window boost for immediate cash-outs & escalation
      if (isLateWindow) {
        if (step.action_type === 'REVIEW_CASHOUT' || step.action_type === 'ESCALATE_CASE') {
          timeUrgency = Math.min(1.0, timeUrgency + 0.20);
        } else if (step.action_type === 'REVIEW_CAMPAIGN' || step.action_type === 'REVIEW_RING') {
          timeUrgency = Math.max(0.3, timeUrgency - 0.25);
        }
      }

      // Priority Formula: 35% time + 30% flow + 20% evidence + 15% recoverability
      const combinedScore = (timeUrgency * 35) + (flowRel * 30) + (evdStr * 20) + (recovPot * 15);
      step.priority_score = Math.round(combinedScore);

      if (step.priority_score >= 80) step.priority = 'URGENT';
      else if (step.priority_score >= 60) step.priority = 'HIGH';
      else if (step.priority_score >= 40) step.priority = 'MEDIUM';
      else step.priority = 'LOW';
    }

    // Sort descending by priority score
    plan.route.sort((a, b) => b.priority_score - a.priority_score);
    plan.route.forEach((s, idx) => (s.step_number = idx + 1));
  }

  /**
   * Build chronological synthetic recovery timeline
   */
  private buildTimelineForScenario(
    caseId: string,
    scenario: 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D',
    amount: number,
    recipient: string
  ): void {
    const now = Date.now();
    const events: RecoveryTimelineEvent[] = [];

    if (scenario === 'SCENARIO_A') {
      events.push({
        event_id: 'EVT-01',
        timestamp: new Date(now - 12 * 60000).toISOString(),
        relative_time_min: 0,
        event_type: 'TRANSACTION',
        title_en: 'Disputed Transaction Initiated',
        title_bn: 'বিতর্কিত লেনদেন শুরু হয়েছে',
        description_en: `Victim initiated ৳${amount.toLocaleString()} P2P transfer to ${recipient}.`,
        description_bn: `ভিকটিম ${recipient} নম্বরে ৳${amount.toLocaleString()} পাঠানো শুরু করেন।`,
        entity_id: 'TXN-SYN-2026-A01',
        entity_type: 'TRANSACTION',
        amount_bdt: amount,
        evidence_id: 'EVD-TXN-001'
      });
      events.push({
        event_id: 'EVT-02',
        timestamp: new Date(now - 9 * 60000).toISOString(),
        relative_time_min: 3,
        event_type: 'RECIPIENT_RECEIVED',
        title_en: 'Recipient Wallet Received Funds',
        title_bn: 'প্রাপক ওয়ালেটে টাকা জমা হয়েছে',
        description_en: `Funds credited to ${recipient}. 100% balance currently intact.`,
        description_bn: `টাকা ${recipient} ওয়ালেটে সফলভাবে জমা হয়েছে। ব্যালেন্স অক্ষত আছে।`,
        entity_id: recipient,
        entity_type: 'WALLET',
        amount_bdt: amount,
        evidence_id: 'EVD-ACT-002'
      });
      events.push({
        event_id: 'EVT-03',
        timestamp: new Date(now - 6 * 60000).toISOString(),
        relative_time_min: 6,
        event_type: 'COMPLAINT_FILED',
        title_en: 'Victim Complaint Filed',
        title_bn: 'ভিকটিম অভিযোগ দাখিল করেছেন',
        description_en: 'Customer reported unauthorized lottery prize fee demand via app support.',
        description_bn: 'গ্রাহক প্রতারণামূলক লটারি ফি দাবির বিষয়ে অভিযোগ দাখিল করেছেন।',
        entity_id: 'CMPL-2026-0412',
        entity_type: 'COMPLAINT',
        evidence_id: 'EVD-CMPL-003'
      });
      events.push({
        event_id: 'EVT-04',
        timestamp: new Date(now - 2 * 60000).toISOString(),
        relative_time_min: 10,
        event_type: 'ROUTE_GENERATED',
        title_en: 'Recovery Route Generated',
        title_bn: 'রিকভারি রুট প্রস্তুত করা হয়েছে',
        description_en: 'Optimizer recommended immediate hold review on recipient wallet.',
        description_bn: 'অপটিমাইজার প্রাপক ওয়ালেটের ওপর অবিলম্বে পর্যালোচনার সুপারিশ করেছে।',
        entity_id: caseId,
        entity_type: 'CASE',
        evidence_id: 'EVD-OPT-01'
      });
    } else if (scenario === 'SCENARIO_B') {
      events.push({
        event_id: 'EVT-01',
        timestamp: new Date(now - 22 * 60000).toISOString(),
        relative_time_min: 0,
        event_type: 'TRANSACTION',
        title_en: 'Victim Transfer Initiated',
        title_bn: 'ভিকটিম লেনদেন শুরু করেছেন',
        description_en: 'Disputed transfer of ৳18,500 from W-SYN-004512 to W-SYN-091177.',
        description_bn: 'W-SYN-004512 থেকে W-SYN-091177-এ ৳১৮,৫০০ স্থানান্তর।',
        entity_id: 'TXN-SYN-2026-00417',
        entity_type: 'TRANSACTION',
        amount_bdt: 18500,
        evidence_id: 'EVD-TX-001'
      });
      events.push({
        event_id: 'EVT-02',
        timestamp: new Date(now - 20 * 60000).toISOString(),
        relative_time_min: 2,
        event_type: 'DOWNSTREAM_TRANSFER',
        title_en: 'Downstream Hop: Layering Transfer',
        title_bn: 'ডাউনস্ট্রিম হপ: লেয়ারিং স্থানান্তর',
        description_en: 'Primary collector forwarded ৳13,500 to Layering Node W-SYN-044219.',
        description_bn: 'প্রাথমিক সংগ্রাহক ৳১৩,৫০০ লেয়ারিং নোড W-SYN-044219-এ পাঠিয়েছেন।',
        entity_id: 'W-SYN-044219',
        entity_type: 'WALLET',
        amount_bdt: 13500,
        evidence_id: 'EVD-HOP-02'
      });
      events.push({
        event_id: 'EVT-03',
        timestamp: new Date(now - 17 * 60000).toISOString(),
        relative_time_min: 5,
        event_type: 'DOWNSTREAM_TRANSFER',
        title_en: 'Mule Split (Hop 3)',
        title_bn: 'মিউল স্প্লিট (হপ ৩)',
        description_en: 'Split into Mule 1 (৳6,200 balance) and Mule 2 (৳5,000 balance).',
        description_bn: 'মিউল ১ (৳৬,২০০ ব্যালেন্স) এবং মিউল ২ (৳৫,০০০ ব্যালেন্স)-এ বিভক্ত।',
        entity_id: 'W-SYN-088312',
        entity_type: 'WALLET',
        amount_bdt: 11200,
        evidence_id: 'EVD-HOP-03A'
      });
      events.push({
        event_id: 'EVT-04',
        timestamp: new Date(now - 12 * 60000).toISOString(),
        relative_time_min: 10,
        event_type: 'CASHOUT',
        title_en: 'Cash-out at Agent Point (Terminal)',
        title_bn: 'এজেন্ট পয়েন্টে ক্যাশ-আউট সম্পন্ন',
        description_en: '৳5,000 cashed out at Agent AGT-CTG-1044 (Agrabad, Chattogram).',
        description_bn: 'এজেন্ট AGT-CTG-1044 (চট্টগ্রাম)-এ ৳৫,০০০ ক্যাশ-আউট হয়েছে।',
        entity_id: 'AGT-CTG-1044',
        entity_type: 'AGENT',
        amount_bdt: 5000,
        evidence_id: 'EVD-CSH-01'
      });
      events.push({
        event_id: 'EVT-05',
        timestamp: new Date(now - 7 * 60000).toISOString(),
        relative_time_min: 15,
        event_type: 'COMPLAINT_FILED',
        title_en: 'Customer Complaint Logged',
        title_bn: 'গ্রাহক অভিযোগ রেকর্ড করা হয়েছে',
        description_en: 'Victim lodged hotline fraud complaint. Golden Hour protocol activated.',
        description_bn: 'গ্রাহক হটলাইনে প্রতারণার অভিযোগ দিয়েছেন। গোল্ডেন আওয়ার প্রটোকল চালু।',
        entity_id: 'CMPL-2026-00417',
        entity_type: 'COMPLAINT',
        evidence_id: 'EVD-CMPL-01'
      });
      events.push({
        event_id: 'EVT-06',
        timestamp: new Date(now - 2 * 60000).toISOString(),
        relative_time_min: 20,
        event_type: 'ROUTE_GENERATED',
        title_en: 'Recovery Route Optimized',
        title_bn: 'রিকভারি রুট অপটিমাইজ করা হয়েছে',
        description_en: 'Top priority: Review active balance in Mule 1 (W-SYN-091177) & Mule 2 (W-SYN-088312).',
        description_bn: 'শীর্ষ অগ্রাধিকার: মিউল ১ ও মিউল ২ ওয়ালেটের সক্রিয় ব্যালেন্স পর্যালোচনা।',
        entity_id: caseId,
        entity_type: 'CASE',
        evidence_id: 'EVD-OPT-02'
      });
    } else if (scenario === 'SCENARIO_C') {
      events.push({
        event_id: 'EVT-01',
        timestamp: new Date(now - 28 * 60000).toISOString(),
        relative_time_min: 0,
        event_type: 'TRANSACTION',
        title_en: 'Disputed Transaction',
        title_bn: 'বিতর্কিত লেনদেন',
        description_en: 'Victim sent ৳32,000 to hub wallet W-SYN-091177.',
        description_bn: 'ভিকটিম হাব ওয়ালেট W-SYN-091177-এ ৳৩২,০০০ পাঠিয়েছেন।',
        entity_id: 'TXN-SYN-2026-C01',
        entity_type: 'TRANSACTION',
        amount_bdt: 32000,
        evidence_id: 'EVD-TX-C01'
      });
      events.push({
        event_id: 'EVT-02',
        timestamp: new Date(now - 22 * 60000).toISOString(),
        relative_time_min: 6,
        event_type: 'CAMPAIGN_DETECTED',
        title_en: 'Scam Campaign Fingerprint Matched',
        title_bn: 'প্রতারক ক্যাম্পেইন ফিঙ্গারপ্রিন্ট ম্যাচ করেছে',
        description_en: 'Recipient linked to "Eid Lottery Cashback Syndicate" (CAMP-2026-EID-01).',
        description_bn: 'প্রাপক "ঈদ লটারি ক্যাশব্যাক সিন্ডিকেট" ক্যাম্পেইনের সাথে শনাক্ত হয়েছে।',
        entity_id: 'CAMP-2026-EID-01',
        entity_type: 'CAMPAIGN',
        evidence_id: 'EVD-CAMP-01'
      });
      events.push({
        event_id: 'EVT-03',
        timestamp: new Date(now - 15 * 60000).toISOString(),
        relative_time_min: 13,
        event_type: 'COMPLAINT_FILED',
        title_en: 'Corroborating Complaint Inflow',
        title_bn: 'সংশ্লিষ্ট অভিযোগের সমাগম',
        description_en: 'Matching complaint CMPL-2026-0881 received citing exact fake helpline number.',
        description_bn: 'একই ভুয়া হেল্পলাইন নম্বরের অভিযোগ CMPL-2026-0881 পাওয়া গেছে।',
        entity_id: 'CMPL-2026-0881',
        entity_type: 'COMPLAINT',
        evidence_id: 'EVD-CMPL-C02'
      });
      events.push({
        event_id: 'EVT-04',
        timestamp: new Date(now - 2 * 60000).toISOString(),
        relative_time_min: 26,
        event_type: 'ROUTE_GENERATED',
        title_en: 'Recovery Route Generated',
        title_bn: 'রিকভারি রুট প্রস্তুত করা হয়েছে',
        description_en: 'Prioritizing hub wallet review followed by syndicate campaign analysis.',
        description_bn: 'হাব ওয়ালেট পর্যালোচনার পর সিন্ডিকেট ক্যাম্পেইন বিশ্লেষণের অগ্রাধিকার।',
        entity_id: caseId,
        entity_type: 'CASE',
        evidence_id: 'EVD-OPT-03'
      });
    } else {
      events.push({
        event_id: 'EVT-01',
        timestamp: new Date(now - 50 * 60000).toISOString(),
        relative_time_min: 0,
        event_type: 'TRANSACTION',
        title_en: 'External Gateway Transfer',
        title_bn: 'বহিরাগত গেটওয়েতে স্থানান্তর',
        description_en: 'Disputed amount of ৳45,000 exited to unmapped clearing bridge.',
        description_bn: 'বিতর্কিত ৳৪৫,০০০ আনম্যাপড ক্লিয়ারিং ব্রিজে চলে গেছে।',
        entity_id: 'TXN-SYN-2026-D01',
        entity_type: 'TRANSACTION',
        amount_bdt: 45000,
        evidence_id: 'EVD-TX-D01'
      });
      events.push({
        event_id: 'EVT-02',
        timestamp: new Date(now - 8 * 60000).toISOString(),
        relative_time_min: 42,
        event_type: 'COMPLAINT_FILED',
        title_en: 'Delayed Complaint Received',
        title_bn: 'বিলম্বিত অভিযোগ দাখিল',
        description_en: 'Complaint filed with insufficient downstream destination records.',
        description_bn: 'ডাউনস্ট্রিম গন্তব্যের পর্যাপ্ত রেকর্ড ছাড়াই অভিযোগ দাখিল করা হয়েছে।',
        entity_id: 'CMPL-2026-0999',
        entity_type: 'COMPLAINT',
        evidence_id: 'EVD-CMPL-D02'
      });
      events.push({
        event_id: 'EVT-03',
        timestamp: new Date(now - 2 * 60000).toISOString(),
        relative_time_min: 48,
        event_type: 'ROUTE_GENERATED',
        title_en: 'Insufficient Evidence Advisory',
        title_bn: 'অপর্যাপ্ত তথ্যপ্রমাণ বিজ্ঞপ্তি',
        description_en: 'Route optimizer flagged unobservable flow: Request additional evidence & escalate.',
        description_bn: 'অপটিমাইজার প্রবাহ অপ্রাপ্য ঘোষণা করেছে: অতিরিক্ত প্রমাণ সংগ্রহ ও এসকেলেট করুন।',
        entity_id: caseId,
        entity_type: 'CASE',
        evidence_id: 'EVD-OPT-04'
      });
    }

    this.saveTimeline(caseId, events);
  }
}

export const recoveryRouteOptimizer = new RecoveryRouteOptimizerService();
