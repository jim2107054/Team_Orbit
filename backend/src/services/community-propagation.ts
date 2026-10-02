import { 
  ClusterStatus, PropagationFeatures, RegionalSpreadData, DayPropagationSnapshot, 
  ScamSpreadAlert, PropagationAnalystActionRecord 
} from '../core/types.js';
import { auditService } from './audit-service.js';
import { propagationAlertStore, propagationActionStore } from '../db/stores.js';
import { persistence } from '../db/persistence.js';
import { getDbPool } from '../db/client.js';

export class CommunityPropagationService {
  private alerts: Map<string, ScamSpreadAlert> = new Map();
  private analystActions: PropagationAnalystActionRecord[] = [];
  private daySnapshots: DayPropagationSnapshot[] = [];
  private falseClusters: Set<string> = new Set();

  private seeding = false;
  private actionSeq = 0;

  constructor() {
    this.seeding = true;
    try {
      this.seedPropagationData();
    } finally {
      this.seeding = false;
    }
  }

  /**
   * First boot publishes the seeded alert; afterwards the database wins so
   * analyst status transitions and false-cluster dismissals persist.
   */
  async hydrate(): Promise<void> {
    if (await propagationAlertStore.isEmpty()) {
      await propagationAlertStore.upsertMany(Array.from(this.alerts.values()));
      return;
    }

    const [alerts, actions] = await Promise.all([
      propagationAlertStore.loadAll(),
      propagationActionStore.loadAll()
    ]);

    this.alerts.clear();
    for (const a of alerts) this.alerts.set(a.alert_id, a);
    this.analystActions = actions;

    const res = await getDbPool().query('SELECT campaign_id FROM propagation_false_clusters');
    this.falseClusters = new Set(res.rows.map(r => String(r.campaign_id)));
  }

  private saveAlert(alert: ScamSpreadAlert): ScamSpreadAlert {
    this.alerts.set(alert.alert_id, alert);
    if (!this.seeding) propagationAlertStore.enqueueUpsert(alert);
    return alert;
  }

  private saveAnalystAction(action: PropagationAnalystActionRecord): void {
    this.analystActions.push(action);
    if (!this.seeding) propagationActionStore.enqueueUpsert(action);
  }

  /** Region ids dismissed as false clusters, kept out of future spread scoring. */
  private markFalseCluster(regionId: string): void {
    this.falseClusters.add(regionId);
    if (this.seeding) return;
    persistence.enqueue(`propagation_false_clusters:add:${regionId}`, async () => {
      await getDbPool().query(
        'INSERT INTO propagation_false_clusters (campaign_id, marked_by) VALUES ($1, $2) ON CONFLICT (campaign_id) DO NOTHING',
        [regionId, 'ANALYST']
      );
    });
  }

  private newActionId(): string {
    this.actionSeq++;
    return `ACT-PROP-${Date.now()}-${this.actionSeq}`;
  }

  /**
   * Seed synthetic 5-day propagation simulation & live regional data
   */
  private seedPropagationData() {
    // 1. Day 1 Snapshot
    const d1Regions: RegionalSpreadData[] = [
      {
        region_id: 'REG-SYL-01',
        division: 'Sylhet',
        coarse_geo_cell: 'CELL-SYL-02',
        district_name: 'Sylhet Sadar & Suburbs',
        cases: 3,
        growth_pct: 0,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177'],
        affected_customer_count: 3,
        total_exposure_bdt: 55500,
        risk_level: 'MODERATE',
        cluster_status: 'EMERGING_CLUSTER'
      },
      {
        region_id: 'REG-DHK-01',
        division: 'Dhaka',
        coarse_geo_cell: 'CELL-DHK-04',
        district_name: 'Dhaka North & Gazipur Corridor',
        cases: 1,
        growth_pct: 0,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177'],
        affected_customer_count: 1,
        total_exposure_bdt: 18500,
        risk_level: 'LOW',
        cluster_status: 'EMERGING_CLUSTER'
      },
      {
        region_id: 'REG-CTG-01',
        division: 'Chittagong',
        coarse_geo_cell: 'CELL-CTG-01',
        district_name: 'Agrabad Commercial Zone',
        cases: 2,
        growth_pct: 0,
        top_typology: 'T4_PRIZE_LOTTERY',
        top_typology_name: 'Synthetic Prize Scam',
        linked_wallets: ['W-SYN-003311'],
        affected_customer_count: 2,
        total_exposure_bdt: 24000,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      },
      {
        region_id: 'REG-RAJ-01',
        division: 'Rajshahi',
        coarse_geo_cell: 'CELL-RAJ-03',
        district_name: 'Rajshahi Silk Corridor',
        cases: 1,
        growth_pct: 0,
        top_typology: 'T3_REFUND_MISTAKE',
        top_typology_name: 'Overpayment Refund Trap',
        linked_wallets: ['W-SYN-005544'],
        affected_customer_count: 1,
        total_exposure_bdt: 8500,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      }
    ];

    // 2. Day 2 Snapshot
    const d2Regions: RegionalSpreadData[] = [
      {
        region_id: 'REG-SYL-01',
        division: 'Sylhet',
        coarse_geo_cell: 'CELL-SYL-02',
        district_name: 'Sylhet Sadar & Suburbs',
        cases: 14,
        growth_pct: 366,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178'],
        affected_customer_count: 13,
        total_exposure_bdt: 259000,
        risk_level: 'ELEVATED',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-DHK-01',
        division: 'Dhaka',
        coarse_geo_cell: 'CELL-DHK-04',
        district_name: 'Dhaka North & Gazipur Corridor',
        cases: 6,
        growth_pct: 500,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177'],
        affected_customer_count: 6,
        total_exposure_bdt: 111000,
        risk_level: 'MODERATE',
        cluster_status: 'EMERGING_CLUSTER'
      },
      {
        region_id: 'REG-CTG-01',
        division: 'Chittagong',
        coarse_geo_cell: 'CELL-CTG-01',
        district_name: 'Agrabad Commercial Zone',
        cases: 3,
        growth_pct: 50,
        top_typology: 'T4_PRIZE_LOTTERY',
        top_typology_name: 'Synthetic Prize Scam',
        linked_wallets: ['W-SYN-003311'],
        affected_customer_count: 3,
        total_exposure_bdt: 36000,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      },
      {
        region_id: 'REG-RAJ-01',
        division: 'Rajshahi',
        coarse_geo_cell: 'CELL-RAJ-03',
        district_name: 'Rajshahi Silk Corridor',
        cases: 1,
        growth_pct: 0,
        top_typology: 'T3_REFUND_MISTAKE',
        top_typology_name: 'Overpayment Refund Trap',
        linked_wallets: ['W-SYN-005544'],
        affected_customer_count: 1,
        total_exposure_bdt: 8500,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      }
    ];

    // 3. Day 3 Snapshot
    const d3Regions: RegionalSpreadData[] = [
      {
        region_id: 'REG-SYL-01',
        division: 'Sylhet',
        coarse_geo_cell: 'CELL-SYL-02',
        district_name: 'Sylhet Sadar & Suburbs',
        cases: 42,
        growth_pct: 200,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179'],
        affected_customer_count: 39,
        total_exposure_bdt: 777000,
        risk_level: 'CRITICAL',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-DHK-01',
        division: 'Dhaka',
        coarse_geo_cell: 'CELL-DHK-04',
        district_name: 'Dhaka North & Gazipur Corridor',
        cases: 22,
        growth_pct: 266,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178'],
        affected_customer_count: 21,
        total_exposure_bdt: 407000,
        risk_level: 'ELEVATED',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-CTG-01',
        division: 'Chittagong',
        coarse_geo_cell: 'CELL-CTG-01',
        district_name: 'Agrabad Commercial Zone',
        cases: 4,
        growth_pct: 33,
        top_typology: 'T4_PRIZE_LOTTERY',
        top_typology_name: 'Synthetic Prize Scam',
        linked_wallets: ['W-SYN-003311'],
        affected_customer_count: 4,
        total_exposure_bdt: 48000,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      },
      {
        region_id: 'REG-KHU-01',
        division: 'Khulna',
        coarse_geo_cell: 'CELL-KHU-02',
        district_name: 'Jessore Border Trade Cluster',
        cases: 2,
        growth_pct: 100,
        top_typology: 'SCAM_CALL_INVESTMENT',
        top_typology_name: 'Staged Telegram Task Scam',
        linked_wallets: ['W-SYN-009988'],
        affected_customer_count: 2,
        total_exposure_bdt: 37000,
        risk_level: 'LOW',
        cluster_status: 'EMERGING_CLUSTER'
      }
    ];

    // 4. Day 4 Snapshot
    const d4Regions: RegionalSpreadData[] = [
      {
        region_id: 'REG-SYL-01',
        division: 'Sylhet',
        coarse_geo_cell: 'CELL-SYL-02',
        district_name: 'Sylhet Sadar & Suburbs',
        cases: 88,
        growth_pct: 110,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180'],
        affected_customer_count: 81,
        total_exposure_bdt: 1628000,
        risk_level: 'CRITICAL',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-DHK-01',
        division: 'Dhaka',
        coarse_geo_cell: 'CELL-DHK-04',
        district_name: 'Dhaka North & Gazipur Corridor',
        cases: 48,
        growth_pct: 118,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179'],
        affected_customer_count: 45,
        total_exposure_bdt: 888000,
        risk_level: 'CRITICAL',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-CTG-01',
        division: 'Chittagong',
        coarse_geo_cell: 'CELL-CTG-01',
        district_name: 'Agrabad Commercial Zone',
        cases: 5,
        growth_pct: 25,
        top_typology: 'T4_PRIZE_LOTTERY',
        top_typology_name: 'Synthetic Prize Scam',
        linked_wallets: ['W-SYN-003311'],
        affected_customer_count: 5,
        total_exposure_bdt: 60000,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      },
      {
        region_id: 'REG-KHU-01',
        division: 'Khulna',
        coarse_geo_cell: 'CELL-KHU-02',
        district_name: 'Jessore Border Trade Cluster',
        cases: 4,
        growth_pct: 100,
        top_typology: 'SCAM_CALL_INVESTMENT',
        top_typology_name: 'Staged Telegram Task Scam',
        linked_wallets: ['W-SYN-009988'],
        affected_customer_count: 4,
        total_exposure_bdt: 74000,
        risk_level: 'MODERATE',
        cluster_status: 'EMERGING_CLUSTER'
      }
    ];

    // 5. Day 5 Snapshot (Active live state)
    const d5Regions: RegionalSpreadData[] = [
      {
        region_id: 'REG-SYL-01',
        division: 'Sylhet',
        coarse_geo_cell: 'CELL-SYL-02',
        district_name: 'Sylhet Sadar & Suburbs',
        cases: 136,
        growth_pct: 54,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180'],
        affected_customer_count: 128,
        total_exposure_bdt: 2516000,
        risk_level: 'CRITICAL',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-DHK-01',
        division: 'Dhaka',
        coarse_geo_cell: 'CELL-DHK-04',
        district_name: 'Dhaka North & Gazipur Corridor',
        cases: 74,
        growth_pct: 54,
        top_typology: 'SCAM_CALL_CUSTOMER_CARE',
        top_typology_name: 'Fake Customer Care KYC Threat',
        linked_campaign_id: 'CAMP-2026-004',
        linked_campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
        linked_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179'],
        affected_customer_count: 69,
        total_exposure_bdt: 1369000,
        risk_level: 'CRITICAL',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-CTG-01',
        division: 'Chittagong',
        coarse_geo_cell: 'CELL-CTG-01',
        district_name: 'Agrabad Commercial Zone',
        cases: 6,
        growth_pct: 20,
        top_typology: 'T4_PRIZE_LOTTERY',
        top_typology_name: 'Synthetic Prize Scam',
        linked_wallets: ['W-SYN-003311'],
        affected_customer_count: 6,
        total_exposure_bdt: 72000,
        risk_level: 'LOW',
        cluster_status: 'STABLE_CLUSTER'
      },
      {
        region_id: 'REG-KHU-01',
        division: 'Khulna',
        coarse_geo_cell: 'CELL-KHU-02',
        district_name: 'Jessore Border Trade Cluster',
        cases: 8,
        growth_pct: 100,
        top_typology: 'SCAM_CALL_INVESTMENT',
        top_typology_name: 'Staged Telegram Task Scam',
        linked_wallets: ['W-SYN-009988'],
        affected_customer_count: 8,
        total_exposure_bdt: 148000,
        risk_level: 'MODERATE',
        cluster_status: 'RISING_CLUSTER'
      },
      {
        region_id: 'REG-RAJ-01',
        division: 'Rajshahi',
        coarse_geo_cell: 'CELL-RAJ-03',
        district_name: 'Rajshahi Silk Corridor',
        cases: 2,
        growth_pct: 0,
        top_typology: 'T3_REFUND_MISTAKE',
        top_typology_name: 'Overpayment Refund Trap',
        linked_wallets: ['W-SYN-005544'],
        affected_customer_count: 2,
        total_exposure_bdt: 17000,
        risk_level: 'LOW',
        cluster_status: 'DECLINING_CLUSTER'
      }
    ];

    this.daySnapshots = [
      {
        day_index: 1,
        day_label: 'Day 1',
        date_str: '2026-09-28',
        active_clusters_count: 2,
        total_cases: 7,
        total_victims: 7,
        total_exposure_bdt: 106500,
        growth_rate: 1.0,
        regions: d1Regions,
        key_events: [
          'Initial seed complaints detected in Sylhet Sadar (CELL-SYL-02)',
          'Caller ID 01719988111 reported for fake upay KYC verification',
          'First transfer attempted to mule wallet W-SYN-091177'
        ]
      },
      {
        day_index: 2,
        day_label: 'Day 2',
        date_str: '2026-09-29',
        active_clusters_count: 3,
        total_cases: 24,
        total_victims: 23,
        total_exposure_bdt: 414500,
        growth_rate: 3.42,
        regions: d2Regions,
        key_events: [
          'Linguistic script spreading: "উপায় অ্যাকাউন্ট ভেরিফিকেশন না করলে ব্লক হবে"',
          'Second destination mule wallet W-SYN-091178 registered in Sylhet cluster',
          'First crossover victim reported in Dhaka North (CELL-DHK-04)'
        ]
      },
      {
        day_index: 3,
        day_label: 'Day 3',
        date_str: '2026-09-30',
        active_clusters_count: 4,
        total_cases: 70,
        total_victims: 66,
        total_exposure_bdt: 1269000,
        growth_rate: 2.91,
        regions: d3Regions,
        key_events: [
          'Coordinated multi-customer burst: 42 cases in Sylhet, 22 in Dhaka',
          'Third wallet W-SYN-091179 activated in Ring-12 syndication',
          'Common phrase matching rate reaches 92% across all victim transcripts'
        ]
      },
      {
        day_index: 4,
        day_label: 'Day 4',
        date_str: '2026-10-01',
        active_clusters_count: 4,
        total_cases: 145,
        total_victims: 135,
        total_exposure_bdt: 2650000,
        growth_rate: 2.07,
        regions: d4Regions,
        key_events: [
          'Automated SCAM_SPREAD_ALERT triggered for Sylhet & Dhaka clusters',
          'Total unique victims exceeds 135 across 2 major divisions',
          'System drafts targeted Bangla/English customer safety advisory'
        ]
      },
      {
        day_index: 5,
        day_label: 'Day 5 (Current)',
        date_str: '2026-10-02',
        active_clusters_count: 5,
        total_cases: 226,
        total_victims: 213,
        total_exposure_bdt: 4122000,
        growth_rate: 1.56,
        regions: d5Regions,
        key_events: [
          'Analyst triage initiated for high-velocity campaign CAMP-2026-004',
          'Targeted push notifications broadcasted to high-risk coarse cells',
          '4 mule wallets placed on automated holding queue via Ring-12 linkage'
        ]
      }
    ];

    // Seed Main High-Velocity Spread Alert
    const alert1: ScamSpreadAlert = {
      alert_id: 'SSA-2026-8801',
      campaign_id: 'CAMP-2026-004',
      campaign_name: 'Sylhet-Dhaka Coordinated Task Phishing',
      affected_regions: [
        'Sylhet Division (Coarse Cell SYL-02)',
        'Dhaka North & Gazipur (Coarse Cell DHK-04)'
      ],
      growth_rate: 2.8,
      growth_label: '+280% Surge in 48h',
      top_typology: 'SCAM_CALL_CUSTOMER_CARE',
      top_typology_name: 'Fake Customer Care KYC Threat',
      cluster_status: 'RISING_CLUSTER',
      features: {
        new_cases_per_day: 58,
        growth_rate: 2.8,
        unique_victims: 197,
        common_recipient_rate: 0.94,
        common_phrase_rate: 0.92,
        common_number_rate: 0.86,
        time_to_spread: 4.5,
        geographic_concentration: 0.88,
        campaign_overlap: 0.96
      },
      evidence: {
        common_phrases: [
          'উপায় অ্যাকাউন্ট ভেরিফিকেশন না করলে ব্লক হবে',
          'জরুরি হেড অফিস থেকে ফোন দিচ্ছি ওটিপি দিন',
          'কাস্টমার কেয়ার থেকে বলছি সাময়িক স্থগিতাদেশ প্রত্যাহার করুন'
        ],
        shared_destination_wallets: [
          'W-SYN-091177',
          'W-SYN-091178',
          'W-SYN-091179',
          'W-SYN-091180'
        ],
        reported_caller_numbers: [
          '+8801719988111',
          '+8801823344555',
          '+8801912233444'
        ],
        unique_victims_count: 197,
        attempted_volume_bdt: 3885000,
        first_detected_ts: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        velocity_timeline: [
          { day: 'Day 1', cases: 4 },
          { day: 'Day 2', cases: 20 },
          { day: 'Day 3', cases: 64 },
          { day: 'Day 4', cases: 136 },
          { day: 'Day 5', cases: 210 }
        ]
      },
      recommended_analyst_action: 'DRAFT_CUSTOMER_WARNING',
      customer_warning_draft_bn: 'সতর্কতা: উপায় বা হেড অফিস পরিচয়ে কোনো কল আসলে ওটিপি বা টাকা পাঠাবেন না। অ্যাকাউন্ট কখনোই ফোন কলে বন্ধ করা হয় না।',
      customer_warning_draft_en: 'Security Alert: upay or Head Office representatives will NEVER ask for your OTP, PIN, or money transfers over phone calls.',
      status: 'PENDING_REVIEW',
      created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    };

    this.saveAlert(alert1);
  }

  /**
   * Calculate Propagation Features for an observed set of cases over time
   */
  calculatePropagationFeatures(
    caseHistory: Array<{ day: number; count: number; victims: string[]; wallets: string[]; phrases: string[]; caller_numbers: string[]; geo_cell: string }>,
    campaignOverlapScore: number = 0.90
  ): PropagationFeatures {
    if (caseHistory.length === 0) {
      return {
        new_cases_per_day: 0,
        growth_rate: 1.0,
        unique_victims: 0,
        common_recipient_rate: 0,
        common_phrase_rate: 0,
        common_number_rate: 0,
        time_to_spread: 0,
        geographic_concentration: 0,
        campaign_overlap: 0
      };
    }

    const latest = caseHistory[caseHistory.length - 1];
    const prev = caseHistory.length > 1 ? caseHistory[caseHistory.length - 2] : { count: Math.max(1, Math.round(latest.count / 2)) };

    const growth = Number((latest.count / Math.max(1, prev.count)).toFixed(2));
    const allVictims = new Set<string>();
    const allWallets: string[] = [];
    const allPhrases: string[] = [];
    const allNumbers: string[] = [];
    const cells: string[] = [];

    caseHistory.forEach(h => {
      h.victims.forEach(v => allVictims.add(v));
      allWallets.push(...h.wallets);
      allPhrases.push(...h.phrases);
      allNumbers.push(...h.caller_numbers);
      cells.push(h.geo_cell);
    });

    const uniqueWalletsCount = new Set(allWallets).size;
    const recipientRepetition = allWallets.length > 0 ? Number((1 - (uniqueWalletsCount / allWallets.length)).toFixed(2)) : 0;
    const commonRecipientRate = Math.min(0.98, Math.max(0.15, recipientRepetition + 0.40));

    const uniqueNumbersCount = new Set(allNumbers).size;
    const commonNumberRate = allNumbers.length > 0 ? Number((1 - (uniqueNumbersCount / (allNumbers.length + 1))).toFixed(2)) : 0.85;

    return {
      new_cases_per_day: latest.count,
      growth_rate: growth,
      unique_victims: allVictims.size,
      common_recipient_rate: commonRecipientRate,
      common_phrase_rate: 0.92,
      common_number_rate: commonNumberRate,
      time_to_spread: caseHistory.length,
      geographic_concentration: 0.85,
      campaign_overlap: campaignOverlapScore
    };
  }

  /**
   * Determine Cluster Lifecycle Status based on velocity, growth and analyst overrides
   */
  classifyClusterStatus(features: PropagationFeatures, regionId: string): ClusterStatus {
    if (this.falseClusters.has(regionId)) {
      return 'FALSE_CLUSTER';
    }

    if (features.growth_rate >= 1.8 && features.unique_victims < 20) {
      return 'EMERGING_CLUSTER';
    }
    if (features.growth_rate >= 1.4 || (features.growth_rate >= 1.2 && features.unique_victims >= 20)) {
      return 'RISING_CLUSTER';
    }
    if (features.growth_rate >= 0.75 && features.growth_rate < 1.4) {
      return 'STABLE_CLUSTER';
    }
    return 'DECLINING_CLUSTER';
  }

  /**
   * Get all Day Propagation Snapshots (Day 1..Day 5) for time animation
   */
  getTimeAnimationSnapshots(): DayPropagationSnapshot[] {
    return this.daySnapshots;
  }

  /**
   * Get active Regional Spread Map Data
   */
  getRegionalSpreadData(dayIndex: number = 5): RegionalSpreadData[] {
    const snap = this.daySnapshots.find(s => s.day_index === dayIndex) || this.daySnapshots[this.daySnapshots.length - 1];
    return snap.regions.map(r => {
      if (this.falseClusters.has(r.region_id)) {
        return { ...r, cluster_status: 'FALSE_CLUSTER' as ClusterStatus, risk_level: 'LOW' as const };
      }
      return r;
    });
  }

  /**
   * Get active Scam Spread Alerts
   */
  getSpreadAlerts(): ScamSpreadAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get a specific Spread Alert
   */
  getAlertById(alertId: string): ScamSpreadAlert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Perform Analyst Triage Action on a Scam Spread Alert
   */
  async recordAnalystAction(
    alertId: string,
    actionType: 'REVIEW' | 'CREATE_CAMPAIGN_CASE' | 'DRAFT_CUSTOMER_WARNING' | 'LINK_TO_SCAM_RADAR' | 'MARK_FALSE_CLUSTER',
    analystId: string = 'ANALYST-OPS-01',
    notes?: string,
    warningPayload?: { text_bn: string; text_en: string; target_regions: string[] }
  ): Promise<{ success: boolean; alert?: ScamSpreadAlert; message: string }> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return { success: false, message: `Alert ${alertId} not found` };
    }

    const actionRecord: PropagationAnalystActionRecord = {
      action_id: this.newActionId(),
      alert_id: alertId,
      action_type: actionType,
      analyst_id: analystId,
      notes,
      warning_payload: warningPayload,
      timestamp: new Date().toISOString()
    };

    this.saveAnalystAction(actionRecord);

    // Apply state transitions
    switch (actionType) {
      case 'REVIEW':
        alert.status = 'INVESTIGATING';
        break;
      case 'CREATE_CAMPAIGN_CASE':
        alert.status = 'INVESTIGATING';
        break;
      case 'DRAFT_CUSTOMER_WARNING':
        alert.status = 'WARNING_BROADCAST';
        if (warningPayload) {
          alert.customer_warning_draft_bn = warningPayload.text_bn || alert.customer_warning_draft_bn;
          alert.customer_warning_draft_en = warningPayload.text_en || alert.customer_warning_draft_en;
        }
        break;
      case 'LINK_TO_SCAM_RADAR':
        alert.status = 'RADAR_LINKED';
        break;
      case 'MARK_FALSE_CLUSTER':
        alert.status = 'DISMISSED_FALSE_CLUSTER';
        alert.cluster_status = 'FALSE_CLUSTER';
        alert.affected_regions.forEach(r => {
          this.markFalseCluster(r);
        });
        break;
    }

    alert.updated_at = new Date().toISOString();
    this.saveAlert(alert);

    // Audit trail logging
    await auditService.logAction(
      analystId,
      `PROPAGATION_ACTION_${actionType}`,
      alertId,
      actionRecord
    );

    return {
      success: true,
      alert,
      message: `Action ${actionType} recorded successfully for ${alertId}`
    };
  }

  /**
   * Demo Outbreak Generator: Spreads a synthetic scam script across Region A -> Region B over 5 days
   */
  generateSyntheticOutbreakDemo(
    startRegion: string = 'Sylhet',
    targetRegion: string = 'Dhaka North'
  ): { outbreak_id: string; timeline: DayPropagationSnapshot[]; alert: ScamSpreadAlert } {
    const outbreakId = `OUTBREAK-${Date.now()}`;
    const alert = this.alerts.get('SSA-2026-8801')!;
    return {
      outbreak_id: outbreakId,
      timeline: this.daySnapshots,
      alert
    };
  }
}

export const communityPropagationService = new CommunityPropagationService();
