import { repository } from '../db/repository.js';
import { Transaction, TxnType } from '../core/types.js';

/**
 * Investigation Evidence Ledger — synthetic transaction records that give the
 * Evidence-Driven Incident Investigation pipeline something real to match against.
 *
 * WHY THIS EXISTS: the base synthetic world seeds customers, wallets, one ring and
 * one alert case, but only five historical transactions. An evidence-driven
 * investigation is only meaningful against an actual ledger, so this module adds a
 * realistic recent transaction history for a small set of demo wallets — including
 * DECOY transactions, so complaint-to-transaction matching is a genuine
 * discrimination problem rather than a single obvious hit.
 *
 * All data here is SYNTHETIC and clearly namespaced `TXN-INV-*`. It never
 * overwrites or deletes any pre-existing transaction.
 *
 * Timestamps are expressed as offsets from a reference instant and UPSERTED on each
 * run, so a live demo always has a transaction inside the golden-hour window.
 */

/** A seeded scenario, returned so tests and demos can assert against it directly. */
export interface LedgerScenario {
  id: string;
  title: string;
  /** Wallet whose ledger the complaint would be matched against. */
  reporter_wallet: string;
  reporter_phone?: string;
  /** The transaction a correct investigation should identify, if any. */
  expected_txn_id?: string;
  expected_amount_bdt?: number;
  /** Minutes before the reference instant that the expected transaction occurred. */
  expected_minutes_ago?: number;
  /** Resolved timestamp of the expected transaction, filled in at seed time. */
  expected_ts?: string;
  /**
   * A `reported_at` value that makes this scenario's claimed time resolvable.
   * Tests and demos should pass this so wall-clock claims land in the right window.
   */
  suggested_reported_at?: string;
  /** Whether the scenario's anchor day is today in Dhaka ("ajke") or yesterday. */
  anchor_day_is_today?: boolean;
  counterparty_wallet?: string;
  description: string;
}

export interface LedgerSeedResult {
  reference_ts: string;
  transactions_written: number;
  community_reports_written: number;
  scenarios: LedgerScenario[];
}

interface LedgerEntrySpec {
  txn_id: string;
  minutes_ago: number;
  sender_wallet: string;
  receiver_wallet: string;
  type: TxnType;
  amount_bdt: number;
  channel: 'APP' | 'USSD' | 'AGENT';
  device_id: string;
  status?: 'SUCCESS' | 'FAILED';
  label_fraud?: boolean;
  ring_id?: string;
  note: string;
}

/**
 * Scenario A — Campaign-linked fake customer care loss (the flagship demo).
 *
 * Victim W-SYN-004512 (Rahima Begum, seeded by the base world) sends BDT 8,000 to
 * W-SYN-091177, which is already:
 *   - a member wallet of RING-2026-0012 (seeded ring case)
 *   - an affected wallet of CAMP-2026-001 (seeded active campaign)
 *   - the subject of a verified community report
 * so risk, graph and campaign evidence all resolve from REAL stored records.
 *
 * Decoys in the same window (BDT 500 recharge, BDT 1,200 merchant pay, BDT 2,000
 * transfer) exist specifically so the matcher has to discriminate.
 */
const SCENARIO_A_ENTRIES: LedgerEntrySpec[] = [
  {
    txn_id: 'TXN-INV-A-DECOY-1',
    minutes_ago: 95,
    sender_wallet: 'W-SYN-004512',
    receiver_wallet: 'W-SYN-001009',
    type: 'MOBILE_RECHARGE',
    amount_bdt: 500,
    channel: 'APP',
    device_id: 'D-SYN-33210',
    note: 'Decoy: small recharge shortly before the disputed transfer.'
  },
  {
    txn_id: 'TXN-INV-A-DECOY-2',
    minutes_ago: 240,
    sender_wallet: 'W-SYN-004512',
    receiver_wallet: 'M-SYN-4410',
    type: 'MERCHANT_PAY',
    amount_bdt: 1200,
    channel: 'APP',
    device_id: 'D-SYN-33210',
    note: 'Decoy: routine merchant payment the same day.'
  },
  {
    txn_id: 'TXN-INV-A-DECOY-3',
    minutes_ago: 1560,
    sender_wallet: 'W-SYN-004512',
    receiver_wallet: 'W-SYN-001007',
    type: 'P2P_SEND',
    amount_bdt: 2000,
    channel: 'APP',
    device_id: 'D-SYN-33210',
    note: 'Decoy: ordinary transfer the previous day.'
  },
  {
    txn_id: 'TXN-INV-A-DISPUTED',
    minutes_ago: 12,
    sender_wallet: 'W-SYN-004512',
    receiver_wallet: 'W-SYN-091177',
    type: 'P2P_SEND',
    amount_bdt: 8000,
    channel: 'APP',
    device_id: 'D-SYN-33210',
    label_fraud: true,
    ring_id: 'RING-2026-0012',
    note: 'The disputed transfer: inside the golden-hour window, to a known mule wallet.'
  },
  {
    txn_id: 'TXN-INV-A-HOP-1',
    minutes_ago: 8,
    sender_wallet: 'W-SYN-091177',
    receiver_wallet: 'W-SYN-044219',
    type: 'P2P_SEND',
    amount_bdt: 5000,
    channel: 'APP',
    device_id: 'D-MULE-8801',
    label_fraud: true,
    ring_id: 'RING-2026-0012',
    note: 'Downstream hop 1 — real ledger basis for the recovery trace.'
  },
  {
    txn_id: 'TXN-INV-A-HOP-2',
    minutes_ago: 6,
    sender_wallet: 'W-SYN-091177',
    receiver_wallet: 'W-SYN-033108',
    type: 'P2P_SEND',
    amount_bdt: 2800,
    channel: 'APP',
    device_id: 'D-MULE-8801',
    label_fraud: true,
    ring_id: 'RING-2026-0012',
    note: 'Downstream hop 2 — rapid pass-through split.'
  }
];

/**
 * Scenario B — Wrong-number transfer with competing candidates.
 *
 * Mirrors the worked example in the feature specification: BDT 500 at 13:50,
 * BDT 5,000 at 14:08, BDT 2,000 at 16:30 Dhaka wall-clock, where only the BDT 5,000
 * entry should be identified for a "BDT 5,000 around 2 PM" complaint.
 *
 * These are anchored to a WALL-CLOCK day rather than relative offsets, because the
 * claim "around 2 PM" resolves to a wall-clock window — relative offsets would land
 * the ledger entries outside it. `seedInvestigationEvidenceLedger` picks the most
 * recent Dhaka day on which 16:30 has already passed, and reports both the anchor day
 * and the matching `suggested_reported_at` in the scenario descriptor.
 */
interface WallClockEntrySpec extends Omit<LedgerEntrySpec, 'minutes_ago'> {
  /** Dhaka wall-clock hour and minute on the anchor day. */
  hour: number;
  minute: number;
}

const SCENARIO_B_WALL_CLOCK: WallClockEntrySpec[] = [
  {
    txn_id: 'TXN-INV-B-001',
    hour: 13,
    minute: 50,
    sender_wallet: 'W-SYN-001001',
    receiver_wallet: 'W-SYN-001012',
    type: 'P2P_SEND',
    amount_bdt: 500,
    channel: 'APP',
    device_id: 'D-SYN-40101',
    note: 'Near-miss candidate: inside the time band, wrong amount.'
  },
  {
    txn_id: 'TXN-INV-B-002',
    hour: 14,
    minute: 8,
    sender_wallet: 'W-SYN-001001',
    receiver_wallet: 'W-SYN-001013',
    type: 'P2P_SEND',
    amount_bdt: 5000,
    channel: 'APP',
    device_id: 'D-SYN-40101',
    note: 'The correct match for a BDT 5,000 "around 2 PM" wrong-number complaint.'
  },
  {
    txn_id: 'TXN-INV-B-003',
    hour: 16,
    minute: 30,
    sender_wallet: 'W-SYN-001001',
    receiver_wallet: 'W-SYN-001014',
    type: 'P2P_SEND',
    amount_bdt: 2000,
    channel: 'APP',
    device_id: 'D-SYN-40101',
    note: 'Near-miss candidate: outside the time band, wrong amount.'
  }
];

/** Dhaka is UTC+6 with no daylight saving, so a fixed offset is correct here. */
const DHAKA_UTC_OFFSET_MINUTES = 360;

/**
 * Resolve the most recent Dhaka calendar day on which the latest scenario-B entry
 * (16:30) is at least 30 minutes in the past, so no seeded transaction is in the future.
 */
function resolveWallClockAnchorDay(referenceMs: number): { dayOffset: number; isToday: boolean } {
  const latestHour = Math.max(...SCENARIO_B_WALL_CLOCK.map(e => e.hour));
  const latestMinute = Math.max(
    ...SCENARIO_B_WALL_CLOCK.filter(e => e.hour === latestHour).map(e => e.minute)
  );
  const todayLatest = wallClockToInstant(referenceMs, 0, latestHour, latestMinute);
  const isToday = todayLatest.getTime() <= referenceMs - 30 * 60_000;
  return { dayOffset: isToday ? 0 : -1, isToday };
}

/** Compose a UTC instant from a Dhaka wall-clock time on `dayOffset` days from reference. */
function wallClockToInstant(referenceMs: number, dayOffset: number, hour: number, minute: number): Date {
  const local = new Date(referenceMs + DHAKA_UTC_OFFSET_MINUTES * 60_000);
  const target = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
    hour,
    minute,
    0,
    0
  );
  return new Date(target - DHAKA_UTC_OFFSET_MINUTES * 60_000);
}

/**
 * Scenario C — Amounts that cannot support a BDT 5,000 claim.
 * The window deliberately holds only small transactions, so a BDT 5,000 claim
 * produces INCONSISTENT (contradictory records exist) rather than a false match.
 */
const SCENARIO_C_ENTRIES: LedgerEntrySpec[] = [
  {
    txn_id: 'TXN-INV-C-001',
    minutes_ago: 120,
    sender_wallet: 'W-SYN-001003',
    receiver_wallet: 'W-SYN-001016',
    type: 'P2P_SEND',
    amount_bdt: 500,
    channel: 'APP',
    device_id: 'D-SYN-40303',
    note: 'Only small transfers exist for this wallet in the window.'
  },
  {
    txn_id: 'TXN-INV-C-002',
    minutes_ago: 300,
    sender_wallet: 'W-SYN-001003',
    receiver_wallet: 'W-SYN-001017',
    type: 'P2P_SEND',
    amount_bdt: 1000,
    channel: 'APP',
    device_id: 'D-SYN-40303',
    note: 'Second small transfer.'
  },
  {
    txn_id: 'TXN-INV-C-003',
    minutes_ago: 420,
    sender_wallet: 'W-SYN-001003',
    receiver_wallet: 'W-SYN-001018',
    type: 'P2P_SEND',
    amount_bdt: 2000,
    channel: 'APP',
    device_id: 'D-SYN-40303',
    note: 'Third small transfer.'
  }
];

/**
 * Scenario D — Ambiguous duplicate amounts.
 * Two identical BDT 3,000 transfers minutes apart, so a complaint naming only the
 * amount cannot be resolved to one transaction and must escalate for human review.
 */
const SCENARIO_D_ENTRIES: LedgerEntrySpec[] = [
  {
    txn_id: 'TXN-INV-D-001',
    minutes_ago: 40,
    sender_wallet: 'W-SYN-001005',
    receiver_wallet: 'W-SYN-001019',
    type: 'P2P_SEND',
    amount_bdt: 3000,
    channel: 'APP',
    device_id: 'D-SYN-40505',
    note: 'First of two identical transfers.'
  },
  {
    txn_id: 'TXN-INV-D-002',
    minutes_ago: 34,
    sender_wallet: 'W-SYN-001005',
    receiver_wallet: 'W-SYN-001020',
    type: 'P2P_SEND',
    amount_bdt: 3000,
    channel: 'APP',
    device_id: 'D-SYN-40505',
    note: 'Second of two identical transfers — creates genuine ambiguity.'
  }
];

const RELATIVE_ENTRIES: LedgerEntrySpec[] = [
  ...SCENARIO_A_ENTRIES,
  ...SCENARIO_C_ENTRIES,
  ...SCENARIO_D_ENTRIES
];

export const INVESTIGATION_LEDGER_SCENARIOS: LedgerScenario[] = [
  {
    id: 'INV_SCENARIO_A_CAMPAIGN_LINKED',
    title: 'Campaign-linked fake customer care loss (golden hour active)',
    reporter_wallet: 'W-SYN-004512',
    reporter_phone: '01799-100234',
    expected_txn_id: 'TXN-INV-A-DISPUTED',
    expected_amount_bdt: 8000,
    expected_minutes_ago: 12,
    counterparty_wallet: 'W-SYN-091177',
    description:
      'BDT 8,000 sent to W-SYN-091177 twelve minutes ago. That wallet is already a member of ring case RING-2026-0012, ' +
      'an affected wallet of active campaign CAMP-2026-001, and the subject of a verified community report, so risk, graph ' +
      'and campaign evidence all resolve from stored records. Three decoy transactions share the search window.'
  },
  {
    id: 'INV_SCENARIO_B_WRONG_TRANSFER',
    title: 'Wrong-number transfer with competing candidates',
    reporter_wallet: 'W-SYN-001001',
    expected_txn_id: 'TXN-INV-B-002',
    expected_amount_bdt: 5000,
    expected_minutes_ago: 18 * 60,
    counterparty_wallet: 'W-SYN-001013',
    description:
      'BDT 500 / BDT 5,000 / BDT 2,000 transfers in the same afternoon. A "BDT 5,000" complaint must select the BDT 5,000 entry.'
  },
  {
    id: 'INV_SCENARIO_C_INCONSISTENT',
    title: 'Claimed amount absent from the ledger',
    reporter_wallet: 'W-SYN-001003',
    expected_amount_bdt: undefined,
    description:
      'Only BDT 500 / 1,000 / 2,000 transfers exist. A BDT 5,000 claim yields INCONSISTENT because contradictory records are present.'
  },
  {
    id: 'INV_SCENARIO_D_AMBIGUOUS',
    title: 'Two identical amounts minutes apart',
    reporter_wallet: 'W-SYN-001005',
    expected_amount_bdt: 3000,
    description:
      'Two BDT 3,000 transfers six minutes apart. An amount-only complaint cannot be resolved to one transaction and escalates.'
  },
  {
    id: 'INV_SCENARIO_E_NO_HISTORY',
    title: 'No transaction history in the searched window',
    reporter_wallet: 'W-SYN-001015',
    description:
      'This wallet has no seeded transactions, so any claim against it yields INSUFFICIENT_DATA rather than a forced answer.'
  }
];

/**
 * Seed (or refresh) the investigation evidence ledger.
 *
 * Idempotent and safe to call on every boot: each entry is upserted by its stable
 * `TXN-INV-*` id, and only the timestamp fields are refreshed so the golden-hour
 * scenario stays live.
 */
export async function seedInvestigationEvidenceLedger(referenceTs?: string): Promise<LedgerSeedResult> {
  const reference = referenceTs ? new Date(referenceTs) : new Date();
  const referenceMs = reference.getTime();
  let written = 0;

  const writeEntry = async (spec: Omit<LedgerEntrySpec, 'minutes_ago'>, ts: string) => {
    const txn: Transaction = {
      txn_id: spec.txn_id,
      ts,
      sender_wallet: spec.sender_wallet,
      receiver_wallet: spec.receiver_wallet,
      type: spec.type,
      amount_bdt: spec.amount_bdt,
      channel: spec.channel as any,
      device_id: spec.device_id,
      geo_cell: 'GEO-DH-01',
      fee_bdt: 0,
      status: (spec.status || 'SUCCESS') as any,
      label_fraud: Boolean(spec.label_fraud),
      ring_id: spec.ring_id,
      created_at: ts
    };
    await repository.upsertTransaction(txn);
    written += 1;
  };

  // Relative-offset entries (golden-hour sensitive).
  for (const spec of RELATIVE_ENTRIES) {
    await writeEntry(spec, new Date(referenceMs - spec.minutes_ago * 60_000).toISOString());
  }

  // Wall-clock entries (scenario B).
  const anchor = resolveWallClockAnchorDay(referenceMs);
  const wallClockTimestamps = new Map<string, string>();
  for (const spec of SCENARIO_B_WALL_CLOCK) {
    const ts = wallClockToInstant(referenceMs, anchor.dayOffset, spec.hour, spec.minute).toISOString();
    wallClockTimestamps.set(spec.txn_id, ts);
    await writeEntry(spec, ts);
  }

  // Community reports against the mule wallet. CAMP-2026-001 holds 50 complaints
  // against this cluster, so more than one prior report is the realistic state, and
  // the risk engine's community-report rule needs two to fire.
  const reportSpecs = [
    {
      report_id: 'REP-INV-0001',
      reporter_wallet: 'W-SYN-001008',
      minutes_ago: 180,
      text: 'এই নম্বর থেকে উপায় কাস্টমার কেয়ার পরিচয়ে ফোন দিয়ে ওটিপি চেয়েছে এবং টাকা পাঠাতে বলেছে।'
    },
    {
      report_id: 'REP-INV-0002',
      reporter_wallet: 'W-SYN-001011',
      minutes_ago: 95,
      text: 'অ্যাকাউন্ট বন্ধ হয়ে যাবে বলে ভয় দেখিয়ে এই ওয়ালেটে টাকা নিয়েছে।'
    }
  ];

  let reportsWritten = 0;
  for (const spec of reportSpecs) {
    try {
      await repository.insertReport({
        report_id: spec.report_id,
        ts: new Date(referenceMs - spec.minutes_ago * 60_000).toISOString(),
        reporter_wallet: spec.reporter_wallet,
        reported_number: 'W-SYN-091177',
        category: 'IMPERSONATION' as any,
        text: spec.text,
        language: 'bn' as any,
        trust_weight: 1.0,
        analyst_verified: true
      });
      reportsWritten += 1;
    } catch (err: any) {
      // Reports are supporting context; a failure here must not abort ledger seeding.
      console.warn(`[investigation-ledger] community report ${spec.report_id} not written:`, err?.message);
    }
  }

  const scenarios = resolveInvestigationScenarios(reference.toISOString());

  return {
    reference_ts: reference.toISOString(),
    transactions_written: written,
    community_reports_written: reportsWritten,
    scenarios
  };
}

/**
 * Resolve the scenario descriptors against a reference instant WITHOUT touching the
 * database. The seeder and the demo API both use this, so the timestamps the UI is
 * told to use are exactly the ones the seeder wrote.
 */
export function resolveInvestigationScenarios(referenceTs?: string): LedgerScenario[] {
  const reference = referenceTs ? new Date(referenceTs) : new Date();
  const referenceMs = reference.getTime();
  const anchor = resolveWallClockAnchorDay(referenceMs);

  return INVESTIGATION_LEDGER_SCENARIOS.map(scenario => {
    if (scenario.id === 'INV_SCENARIO_B_WRONG_TRANSFER') {
      const expected = SCENARIO_B_WALL_CLOCK.find(e => e.txn_id === 'TXN-INV-B-002')!;
      return {
        ...scenario,
        expected_ts: wallClockToInstant(referenceMs, anchor.dayOffset, expected.hour, expected.minute).toISOString(),
        // Early evening on the anchor day: all three candidates are then in the past,
        // and a claim of "around 2 PM today" resolves into the right window.
        suggested_reported_at: wallClockToInstant(referenceMs, anchor.dayOffset, 17, 30).toISOString(),
        anchor_day_is_today: anchor.isToday
      };
    }
    if (scenario.expected_minutes_ago !== undefined) {
      return {
        ...scenario,
        expected_ts: new Date(referenceMs - scenario.expected_minutes_ago * 60_000).toISOString(),
        suggested_reported_at: reference.toISOString(),
        anchor_day_is_today: true
      };
    }
    return { ...scenario, suggested_reported_at: reference.toISOString(), anchor_day_is_today: true };
  });
}
