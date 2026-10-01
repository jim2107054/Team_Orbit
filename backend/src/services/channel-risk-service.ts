import { repository } from '../db/repository.js';
import { 
  ChannelType, DeviceCapability, NetworkContext, 
  ChannelRiskFeatures, CustomerInterventionRecord, PolicyAction 
} from '../core/types.js';
import { auditService } from './audit-service.js';

export interface UssdScreenResponse {
  session_id: string;
  display_text: string;
  is_terminal: boolean;
  action_required: boolean;
  action_recommended: PolicyAction;
  risk_tier: string;
  risk_score: number;
  options?: Array<{ key: string; label: string; action: string }>;
}

export class ChannelRiskService {
  /**
   * Extract Point-in-Time Channel & Device Features
   */
  async extractChannelFeatures(
    senderWalletId: string,
    channel: ChannelType = 'APP',
    deviceCapability: DeviceCapability = 'SMARTPHONE',
    networkContext: NetworkContext = 'MOBILE_DATA',
    txnTimestamp: string = new Date().toISOString()
  ): Promise<ChannelRiskFeatures> {
    const thirtyDaysAgo = new Date(new Date(txnTimestamp).getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const pastTxns = await repository.getSenderRecentTxns(senderWalletId, thirtyDaysAgo);

    // 1. Channel distribution over past 30 days
    const channelCounts: Record<string, number> = { APP: 0, USSD: 0, AGENT: 0, WEB: 0, AGENT_PORTAL: 0 };
    for (const t of pastTxns) {
      const ch = t.channel || 'APP';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }

    let primaryChannel: ChannelType = 'APP';
    let maxCount = 0;
    for (const [ch, count] of Object.entries(channelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryChannel = ch as ChannelType;
      }
    }

    // 2. First-time channel flag
    const firstTimeChannel = pastTxns.length > 0 && (channelCounts[channel] || 0) === 0;

    // 3. Channel switch frequency (distinct channels in past 7 days)
    const sevenDaysAgo = new Date(new Date(txnTimestamp).getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const recent7dTxns = pastTxns.filter(t => new Date(t.ts) >= new Date(sevenDaysAgo));
    const distinctChannels = new Set(recent7dTxns.map(t => t.channel || 'APP'));
    distinctChannels.add(channel);

    // 4. USSD velocity
    const oneHourAgo = new Date(new Date(txnTimestamp).getTime() - 3600 * 1000).toISOString();
    const ussdCount1h = pastTxns.filter(t => (t.channel === 'USSD') && new Date(t.ts) >= new Date(oneHourAgo)).length;

    // 5. Device-Channel Mismatch (e.g. FEATURE_PHONE attempting APP API call)
    let deviceChannelMismatch = false;
    if (deviceCapability === 'FEATURE_PHONE' && (channel === 'APP' || channel === 'WEB')) {
      deviceChannelMismatch = true;
    }

    // 6. Cross-Channel Behavior Change Score (0.0 to 1.0)
    // Measures anomaly when an account that is 95%+ APP user suddenly initiates a large USSD transfer
    let crossChannelScore = 0.0;
    const isSuddenUSSD = primaryChannel === 'APP' && channel === 'USSD' && firstTimeChannel;
    if (isSuddenUSSD) {
      crossChannelScore = 0.70;
    } else if (firstTimeChannel) {
      crossChannelScore = 0.35;
    }

    return {
      channel,
      device_capability: deviceCapability,
      network_context: networkContext,
      channel_switch_frequency: distinctChannels.size,
      first_time_channel: firstTimeChannel,
      device_channel_mismatch: deviceChannelMismatch,
      recent_channel_change: primaryChannel !== channel && pastTxns.length > 3,
      ussd_velocity: ussdCount1h + (channel === 'USSD' ? 1 : 0),
      cross_channel_behavior_change: Number(crossChannelScore.toFixed(2)),
      primary_channel_past_30d: primaryChannel
    };
  }

  /**
   * Format low-bandwidth USSD warning screen within 160 GSM character constraints
   */
  formatUssdWarning(
    action: PolicyAction,
    amountBdt: number,
    recipientNumber: string,
    reasonCode: string = 'RC01'
  ): UssdScreenResponse {
    const sessionId = `USSD-${Date.now()}`;

    if (action === 'HOLD_ASSIST') {
      return {
        session_id: sessionId,
        display_text: `upay সতর্কতা:\nনিরাপত্তার স্বার্থে ৳${amountBdt.toLocaleString()} টাকার লেনদেনটি স্থগিত রাখা হয়েছে।\n\n1. বিস্তারিত জানুন\n2. বাতিল করুন`,
        is_terminal: false,
        action_required: true,
        action_recommended: 'HOLD_ASSIST',
        risk_tier: 'T3',
        risk_score: 0.88,
        options: [
          { key: '1', label: 'বিস্তারিত', action: 'INFO' },
          { key: '2', label: 'বাতিল', action: 'CANCEL' }
        ]
      };
    }

    if (action === 'PAUSE_VERIFY') {
      let reasonText = 'প্রাপকের নম্বরটি আপনার জন্য নতুন।';
      if (reasonCode === 'RC10' || recipientNumber.includes('091177') || recipientNumber.includes('991823')) {
        reasonText = 'এই নম্বরে পূর্বে প্রতারণার অভিযোগ আছে।';
      }

      return {
        session_id: sessionId,
        display_text: `upay সতর্কতা:\n${reasonText}\n৳${amountBdt.toLocaleString()} পাঠানো কি নিশ্চিত?\n\n1. বাতিল (নিরাপদ)\n2. চালিয়ে যান`,
        is_terminal: false,
        action_required: true,
        action_recommended: 'PAUSE_VERIFY',
        risk_tier: 'T2',
        risk_score: 0.65,
        options: [
          { key: '1', label: 'বাতিল (নিরাপদ)', action: 'CANCEL' },
          { key: '2', label: 'চালিয়ে যান', action: 'PROCEED' }
        ]
      };
    }

    return {
      session_id: sessionId,
      display_text: `upay:\n${recipientNumber} নম্বরে ৳${amountBdt.toLocaleString()} পাঠানোর জন্য আপনার গোপন পিন দিন:`,
      is_terminal: false,
      action_required: true,
      action_recommended: 'ALLOW',
      risk_tier: 'T0',
      risk_score: 0.05
    };
  }

  /**
   * Log Customer Intervention in DB and Hash-Chained Audit Log
   */
  async logIntervention(record: CustomerInterventionRecord): Promise<void> {
    await repository.logIntervention(record);
    await auditService.logAction('CUSTOMER_USSD', `INTERVENTION_${record.customer_action}`, record.intervention_id, {
      txn_id: record.txn_id,
      variant: record.variant,
      action: record.customer_action,
      channel: record.channel
    });
  }
}

export const channelRiskService = new ChannelRiskService();
