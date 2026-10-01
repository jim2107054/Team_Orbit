import { PolicyAction, RiskTier } from '../core/types.js';

export interface PolicyRule {
  id: string;
  conditionName: string;
  action: PolicyAction;
  priority: number;
}

export class PolicyEngineService {
  private rulesVersion = 'rules-yaml-v1.0.0';

  evaluatePolicy(
    riskScore: number,
    tier: RiskTier,
    hasHardBlock: boolean = false,
    isRingMember: boolean = false
  ): {
    action: PolicyAction;
    ruleTrace: string[];
    fourEyesRequired: boolean;
  } {
    const trace: string[] = [];

    if (hasHardBlock) {
      trace.push('RULE_HARD_BLOCK_CONFIRMED_BAD_RECIPIENT');
      return { action: 'HOLD_ASSIST', ruleTrace: trace, fourEyesRequired: true };
    }

    if (isRingMember || riskScore >= 0.88) {
      trace.push('RULE_HIGH_RISK_RING_MEMBER_HOLD');
      return { action: 'HOLD_ASSIST', ruleTrace: trace, fourEyesRequired: true };
    }

    if (riskScore >= 0.60 || tier === 'T2') {
      trace.push('RULE_ELEVATED_RISK_PAUSE_AND_VERIFY');
      return { action: 'PAUSE_VERIFY', ruleTrace: trace, fourEyesRequired: false };
    }

    if (riskScore >= 0.30 || tier === 'T1') {
      trace.push('RULE_MILD_RISK_SOFT_NUDGE');
      return { action: 'NUDGE', ruleTrace: trace, fourEyesRequired: false };
    }

    trace.push('RULE_LOW_RISK_STANDARD_ALLOW');
    return { action: 'ALLOW', ruleTrace: trace, fourEyesRequired: false };
  }
}

export const policyEngine = new PolicyEngineService();
