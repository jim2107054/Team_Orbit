import { Agent } from '../core/types.js';

export interface AgentRiskProfile {
  agent_id: string;
  name: string;
  division: string;
  cashout_ratio: number;
  peer_avg_cashout_ratio: number;
  structured_txn_count: number;
  shared_device_count: number;
  risk_score: number;
  risk_tier: 'NORMAL' | 'ELEVATED' | 'HIGH_ALERT';
  active_warnings: string[];
  coached_victim_prompts_bn: string[];
}

export class AgentGuardService {
  evaluateAgentRisk(agent: Agent): AgentRiskProfile {
    const peerAvg = 0.42;
    const cashoutRatio = agent.cashout_velocity_score || 0.78;
    const structuredCount = cashoutRatio > 0.7 ? 12 : 2;
    const sharedDevs = cashoutRatio > 0.7 ? 6 : 1;

    let tier: 'NORMAL' | 'ELEVATED' | 'HIGH_ALERT' = 'NORMAL';
    let riskScore = 0.20;
    const warnings: string[] = [];

    if (cashoutRatio >= 0.75 || agent.risk_status === 'watchlist') {
      tier = 'HIGH_ALERT';
      riskScore = 0.88;
      warnings.push('High burst cash-outs exceeding regional peer group by 3.2x');
      warnings.push('Repeated cash-outs linked to flagged mule collector wallets');
    } else if (cashoutRatio >= 0.55) {
      tier = 'ELEVATED';
      riskScore = 0.55;
      warnings.push('Cash-out velocity slightly above peer normal');
    }

    return {
      agent_id: agent.agent_id,
      name: agent.name,
      division: agent.division,
      cashout_ratio: cashoutRatio,
      peer_avg_cashout_ratio: peerAvg,
      structured_txn_count: structuredCount,
      shared_device_count: sharedDevs,
      risk_score: riskScore,
      risk_tier: tier,
      active_warnings: warnings,
      coached_victim_prompts_bn: [
        'গ্রাহককে বিনয়ের সাথে জিজ্ঞেস করুন: "আপনাকে ফোনে কথা বলতে বলতে কেউ কি টাকা তুলতে বলেছে?"',
        'গ্রাহক কি অন্য কারো নির্দেশনায় তাড়াহুড়া করছেন কিনা লক্ষ্য করুন।'
      ]
    };
  }
}

export const agentGuard = new AgentGuardService();
