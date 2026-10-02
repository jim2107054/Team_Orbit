import { repository } from '../db/repository.js';
import { Customer, Wallet, Agent, Merchant, Transaction, SessionEvent, CommunityReport, AlertCase, RingCase } from '../core/types.js';
import { graphEngine } from '../services/graph-engine.js';
import { auditService } from '../services/audit-service.js';

export async function generateSyntheticWorld(): Promise<{
  customersCount: number;
  walletsCount: number;
  txnsCount: number;
  ringsCount: number;
  casesCount: number;
}> {
  console.log('Generating synthetic financial world for upay Shield...');

  const divisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Sylhet', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];
  const segments = ['salaried', 'student', 'farmer', 'gig', 'merchant_owner', 'remittance_recipient'] as const;

  // 1. Seed Customer: Rahima (Scenario A Victim)
  const rahimaCustomer: Customer = {
    customer_id: 'C-SYN-004512',
    name: 'Rahima Begum',
    phone: '01799-100234',
    segment: 'salaried',
    division: 'Dhaka',
    district_type: 'urban',
    age_band: '35-49',
    gender: 'female',
    onboarding_channel: 'app',
    kyc_level: 'standard',
    created_at: '2025-01-10T10:00:00Z'
  };
  await repository.insertCustomer(rahimaCustomer);

  const rahimaWallet: Wallet = {
    wallet_id: 'W-SYN-004512',
    customer_id: 'C-SYN-004512',
    phone: '01799-100234',
    status: 'active',
    balance: 24500,
    daily_limit: 50000,
    monthly_limit: 200000,
    created_at: '2025-01-10T10:00:00Z'
  };
  await repository.insertWallet(rahimaWallet);

  // 2. Seed Recipient: W-SYN-091177 (Primary Mule Collector in Ring-12)
  const muleCustomer: Customer = {
    customer_id: 'C-SYN-091177',
    name: 'Tanvir Hossain (Mule)',
    phone: '01399-991823',
    segment: 'gig',
    division: 'Dhaka',
    district_type: 'urban',
    age_band: '18-24',
    gender: 'male',
    onboarding_channel: 'agent',
    kyc_level: 'basic',
    created_at: '2026-09-15T12:00:00Z'
  };
  await repository.insertCustomer(muleCustomer);

  const muleWallet: Wallet = {
    wallet_id: 'W-SYN-091177',
    customer_id: 'C-SYN-091177',
    phone: '01399-991823',
    status: 'active',
    balance: 6200,
    daily_limit: 50000,
    monthly_limit: 200000,
    created_at: '2026-09-15T12:00:00Z',
    is_mule_candidate: true
  };
  await repository.insertWallet(muleWallet);

  // 3. Seed Agents
  const agents: Agent[] = [
    {
      agent_id: 'AGT-DH-8821',
      name: 'Rahman Telecom & Flexiload',
      phone: '01799-330192',
      division: 'Dhaka',
      district_type: 'urban',
      tenure_days: 420,
      size_tier: 'tier_1',
      trained_flag: true,
      cashout_velocity_score: 0.88,
      risk_status: 'watchlist'
    },
    {
      agent_id: 'AGT-CTG-1044',
      name: 'Chittagong Digital Corner',
      phone: '01899-771239',
      division: 'Chittagong',
      district_type: 'urban',
      tenure_days: 610,
      size_tier: 'tier_2',
      trained_flag: true,
      cashout_velocity_score: 0.45,
      risk_status: 'normal'
    }
  ];
  for (const agent of agents) {
    await repository.insertAgent(agent);
  }

  // 4. Seed Merchants
  const merchants: Merchant[] = [
    {
      merchant_id: 'M-DHK-9921',
      name: 'Gulshan Mega Electronics',
      category: 'ELECTRONICS',
      division: 'Dhaka',
      created_at: '2025-02-14T08:00:00Z'
    },
    {
      merchant_id: 'M-CTG-4412',
      name: 'Agrabad Wholesale Mart',
      category: 'WHOLESALE',
      division: 'Chittagong',
      created_at: '2025-05-10T11:00:00Z'
    }
  ];
  for (const merchant of merchants) {
    await repository.insertMerchant(merchant);
  }

  // Insert 20 more realistic synthetic customers & wallets for baseline activity
  const banglaNames = [
    'Abul Kalam', 'Fatema Khatun', 'Mohammad Ali', 'Nasreen Sultana', 'Kamal Uddin',
    'Ruma Akter', 'Tariqul Islam', 'Sultana Razia', 'Mahmudul Hasan', 'Rokeya Begum',
    'Faruk Hossain', 'Salma Parvin', 'Jashim Uddin', 'Khaleda Akhter', 'Anisur Rahman',
    'Sharmin Sultana', 'Zillur Rahman', 'Shamima Nasrin', 'Habibur Rahman', 'Sabina Yasmin'
  ];

  for (let i = 0; i < banglaNames.length; i++) {
    const custId = `C-SYN-${String(1000 + i).padStart(6, '0')}`;
    const walId = `W-SYN-${String(1000 + i).padStart(6, '0')}`;
    const phone = `01799-${String(200000 + i)}`;

    await repository.insertCustomer({
      customer_id: custId,
      name: banglaNames[i],
      phone: phone,
      segment: segments[i % segments.length],
      division: divisions[i % divisions.length],
      district_type: i % 3 === 0 ? 'rural' : 'urban',
      age_band: '25-34',
      gender: i % 2 === 0 ? 'male' : 'female',
      onboarding_channel: 'app',
      kyc_level: 'standard',
      created_at: '2025-06-01T00:00:00Z'
    });

    await repository.insertWallet({
      wallet_id: walId,
      customer_id: custId,
      phone: phone,
      status: 'active',
      balance: 15000 + (i * 1200),
      daily_limit: 50000,
      monthly_limit: 200000,
      created_at: '2025-06-01T00:00:00Z'
    });

    // Baseline historical transactions for Rahima
    if (i < 5) {
      await repository.insertTransaction({
        txn_id: `TXN-BASE-${i}`,
        ts: new Date(Date.now() - (i + 1) * 7 * 86400000).toISOString(),
        sender_wallet: 'W-SYN-004512',
        receiver_wallet: walId,
        type: 'P2P_SEND',
        amount_bdt: 1200 + i * 300,
        channel: 'APP',
        device_id: 'D-SYN-33210',
        geo_cell: 'GEO-DH-01',
        fee_bdt: 0,
        status: 'SUCCESS',
        label_fraud: false,
        created_at: new Date(Date.now() - (i + 1) * 7 * 86400000).toISOString()
      });
    }
  }

  // 4. Seed Ring-12 (Mule & Gambling Ring - Scenario B)
  const ring12Wallets: string[] = [
    'W-SYN-091177', 'W-SYN-044219', 'W-SYN-033108', 'W-SYN-088312', 'W-SYN-099411',
    'W-SYN-077520', 'W-SYN-066190', 'W-SYN-055412', 'W-SYN-044819', 'W-SYN-033921'
  ];
  const ring12Agents: string[] = ['AGT-DH-8821', 'AGT-CTG-1044'];

  const ring12Txns = [
    { from: 'W-SYN-091177', to: 'W-SYN-044219', amount: 13500, ts: '2026-10-02T23:43:00Z' },
    { from: 'W-SYN-091177', to: 'W-SYN-033108', amount: 5000, ts: '2026-10-02T23:44:00Z' },
    { from: 'W-SYN-044219', to: 'W-SYN-088312', amount: 6000, ts: '2026-10-02T23:46:00Z' },
    { from: 'W-SYN-044219', to: 'W-SYN-099411', amount: 7500, ts: '2026-10-02T23:47:00Z' },
    { from: 'W-SYN-033108', to: 'AGT-CTG-1044', amount: 5000, ts: '2026-10-02T23:50:00Z' },
    { from: 'W-SYN-088312', to: 'AGT-DH-8821', amount: 1000, ts: '2026-10-02T23:52:00Z' }
  ];

  const ring12 = graphEngine.analyzeRingStructure(
    'RING-2026-0012',
    'Ring-12 (Night Gambling & Mule Collector Hub)',
    'T5_MULE_COLLECTOR',
    ring12Wallets,
    ring12Agents,
    ring12Txns
  );
  await repository.insertRing(ring12);

  // 5. Seed Community Reports against W-SYN-091177
  await repository.insertReport({
    report_id: 'REP-2026-0091',
    ts: '2026-10-01T15:20:00Z',
    reporter_wallet: 'W-SYN-001002',
    reported_number: 'W-SYN-091177',
    category: 'IMPERSONATION',
    text: 'এই নম্বর থেকে ফোন দিয়ে জরুরি চিকিৎসার কথা বলে টাকা চাওয়া হয়েছিল।',
    language: 'bn',
    trust_weight: 1.0,
    analyst_verified: true
  });

  // 6. Seed Case-00417 (Scenario A Flagged Alert)
  const initialAlert: AlertCase = {
    case_id: 'CASE-2026-00417',
    txn_id: 'TXN-20261002-884102',
    sender_wallet: 'W-SYN-004512',
    receiver_wallet: 'W-SYN-091177',
    amount_bdt: 18500,
    risk_score: 0.91,
    risk_tier: 'T3',
    action_recommended: 'HOLD_ASSIST',
    reasons: [
      {
        code: 'RC01',
        label_en: 'Large first-time send to a new recipient',
        label_bn: 'নতুন প্রাপকের কাছে প্রথমবার বড় অঙ্কের টাকা',
        weight: 0.32
      },
      {
        code: 'RC04',
        label_en: 'Recipient is 2 hops from a flagged ring',
        label_bn: 'প্রাপক সন্দেহজনক মানি লন্ডারিং চক্রের কাছাকাছি',
        weight: 0.35
      },
      {
        code: 'RC02',
        label_en: 'Unusual hour for this user',
        label_bn: 'এই ব্যবহারকারীর জন্য অস্বাভাবিক সময় (রাত ১১:৪১)',
        weight: 0.18
      }
    ],
    rule_trace: [
      { rule: 'NEW_RCPT_5X_BASELINE_NIGHT', fired: true },
      { rule: 'FLAGGED_RING_PROXIMITY_HOP2', fired: true }
    ],
    status: 'NEW',
    four_eyes_required: true,
    four_eyes_approved: false,
    created_at: '2026-10-02T23:41:07Z',
    updated_at: '2026-10-02T23:41:07Z'
  };
  await repository.insertAlertCase(initialAlert);

  // 7. Audit Log Genesis
  await auditService.logAction('SYSTEM_ENGINE', 'WORLD_SEED', 'GENESIS', {
    seed: 42,
    customers: banglaNames.length + 2,
    rings: 1,
    cases: 1
  });

  return {
    customersCount: banglaNames.length + 2,
    walletsCount: banglaNames.length + 2,
    txnsCount: 15,
    ringsCount: 1,
    casesCount: 1
  };
}
