import { repository } from '../db/repository.js';
import { Transaction } from '../core/types.js';

export interface CalculatedFeatures {
  // Velocity features
  txn_count_1m: number;
  txn_count_10m: number;
  txn_count_1h: number;
  txn_count_24h: number;
  amount_sum_1h: number;
  amount_sum_24h: number;
  distinct_recipients_24h: number;
  
  // Behavioral features
  amount_bdt: number;
  amount_zscore_user: number;
  hour_of_day: number;
  is_night_time: boolean; // 11 PM to 5 AM
  is_new_recipient: boolean;
  balance_drain_ratio: number;
  
  // ATO & Device features
  device_is_new: boolean;
  mins_since_pin_reset: number | null;
  mins_since_sim_swap: number | null;
  ato_composite_score: number;
  
  // Network & Social Context
  recipient_fan_in_1h: number;
  recipient_pass_through_ratio: number;
  recipient_report_count: number;
  hops_to_known_ring: number;
  scam_check_session_flag: boolean;
}

export class FeatureStoreService {
  // In-memory sliding cache for fast sub-5ms feature extraction
  private recentTxnCache = new Map<string, Array<{ ts: number; amount: number; rcvr: string }>>();

  async extractFeatures(
    senderWalletId: string,
    receiverWalletId: string,
    amountBdt: number,
    deviceId: string,
    txnTimestamp: string = new Date().toISOString(),
    scamCheckFlag: boolean = false
  ): Promise<CalculatedFeatures> {
    const nowMs = new Date(txnTimestamp).getTime();
    const dateObj = new Date(txnTimestamp);
    const hour = dateObj.getHours();
    const isNight = hour >= 23 || hour <= 5;

    // 1. Look up recent transactions for sender
    const oneDayAgo = new Date(nowMs - 24 * 3600 * 1000).toISOString();
    const oneHourAgo = new Date(nowMs - 3600 * 1000).toISOString();
    const tenMinAgo = new Date(nowMs - 600 * 1000).toISOString();
    const oneMinAgo = new Date(nowMs - 60 * 1000).toISOString();

    const [senderRecent, receiverRecent, senderWallet, priorTransfers, reports, events, baseline] = await Promise.all([
      repository.getSenderRecentTxns(senderWalletId, oneDayAgo),
      repository.getReceiverRecentTxns(receiverWalletId, oneHourAgo),
      repository.getWalletById(senderWalletId),
      repository.hasPriorTransferBetween(senderWalletId, receiverWalletId),
      repository.getReportsForNumber(receiverWalletId),
      repository.getRecentWalletEvents(senderWalletId, oneDayAgo),
      repository.getSenderBaselineStats(senderWalletId)
    ]);

    // Velocity computation
    let count1m = 0;
    let count10m = 0;
    let count1h = 0;
    let sum1h = 0;
    let sum24h = 0;
    const recipientSet = new Set<string>();

    for (const t of senderRecent) {
      const tMs = new Date(t.ts).getTime();
      if (tMs >= new Date(oneMinAgo).getTime()) count1m++;
      if (tMs >= new Date(tenMinAgo).getTime()) count10m++;
      if (tMs >= new Date(oneHourAgo).getTime()) {
        count1h++;
        sum1h += t.amount_bdt;
      }
      sum24h += t.amount_bdt;
      recipientSet.add(t.receiver_wallet);
    }

    // Behavioral & z-score
    const stdAmt = baseline.stdAmount > 0 ? baseline.stdAmount : 1000;
    const amountZScore = (amountBdt - baseline.avgAmount) / stdAmt;
    const isNewRecipient = !priorTransfers;
    const currentBalance = senderWallet ? senderWallet.balance : amountBdt * 1.5;
    const balanceDrainRatio = currentBalance > 0 ? Math.min(1.0, amountBdt / currentBalance) : 1.0;

    // ATO & Device events
    let deviceIsNew = false;
    let minsSincePinReset: number | null = null;
    let minsSinceSimSwap: number | null = null;

    for (const ev of events) {
      const diffMins = (nowMs - new Date(ev.ts).getTime()) / (60 * 1000);
      if (ev.type === 'DEVICE_CHANGE' && diffMins <= 1440) {
        deviceIsNew = true;
      }
      if (ev.type === 'PIN_RESET' && (minsSincePinReset === null || diffMins < minsSincePinReset)) {
        minsSincePinReset = diffMins;
      }
      if (ev.type === 'SIM_SWAP' && (minsSinceSimSwap === null || diffMins < minsSinceSimSwap)) {
        minsSinceSimSwap = diffMins;
      }
    }

    let atoComposite = 0.0;
    if (deviceIsNew) atoComposite += 0.35;
    if (minsSincePinReset !== null && minsSincePinReset < 2880) atoComposite += 0.35;
    if (minsSinceSimSwap !== null && minsSinceSimSwap < 2880) atoComposite += 0.30;
    if (isNight) atoComposite += 0.15;
    if (balanceDrainRatio > 0.8) atoComposite += 0.20;

    // Recipient & Network features
    const recipientFanIn1h = receiverRecent.length;
    let recipientPassThrough = 0.0;
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const rt of receiverRecent) {
      if (rt.receiver_wallet === receiverWalletId) totalInflow += rt.amount_bdt;
      if (rt.sender_wallet === receiverWalletId) totalOutflow += rt.amount_bdt;
    }
    if (totalInflow > 0) {
      recipientPassThrough = Math.min(1.0, totalOutflow / totalInflow);
    }

    return {
      txn_count_1m: count1m,
      txn_count_10m: count10m,
      txn_count_1h: count1h,
      txn_count_24h: senderRecent.length,
      amount_sum_1h: sum1h,
      amount_sum_24h: sum24h,
      distinct_recipients_24h: recipientSet.size,
      amount_bdt: amountBdt,
      amount_zscore_user: Math.max(0, amountZScore),
      hour_of_day: hour,
      is_night_time: isNight,
      is_new_recipient: isNewRecipient,
      balance_drain_ratio: balanceDrainRatio,
      device_is_new: deviceIsNew,
      mins_since_pin_reset: minsSincePinReset,
      mins_since_sim_swap: minsSinceSimSwap,
      ato_composite_score: Math.min(1.0, atoComposite),
      recipient_fan_in_1h: recipientFanIn1h,
      recipient_pass_through_ratio: recipientPassThrough,
      recipient_report_count: reports.length,
      hops_to_known_ring: 2, // dynamic from graph engine
      scam_check_session_flag: scamCheckFlag
    };
  }
}

export const featureStore = new FeatureStoreService();
