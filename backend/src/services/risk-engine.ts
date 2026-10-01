import { CalculatedFeatures } from './feature-store.js';
import { ReasonCodeDetail, RiskTier, PolicyAction } from '../core/types.js';
import { REASON_CODES } from '../core/constants.js';

export interface RiskEvaluationResult {
  risk_score: number; // 0.0 to 1.0 calibrated
  risk_tier: RiskTier;
  action_recommended: PolicyAction;
  reasons: ReasonCodeDetail[];
  rule_trace: Array<{ rule: string; fired: boolean }>;
  model_scores: {
    supervised_tabular: number;
    anomaly_isolation: number;
    network_ring_score: number;
    ato_signal_score: number;
    scam_context_score: number;
    temporal_adjusted_score: number;
    baseline_unadjusted_score: number;
  };
  latency_ms: number;
  model_version: string;
  rules_version: string;
}

export class RiskEngineService {
  private modelVersion = 'shield-ensemble-v1.4.2';
  private rulesVersion = 'policy-yaml-v0.9.1';

  evaluateRisk(features: CalculatedFeatures, recipientRingRisk: number = 0.0): RiskEvaluationResult {
    const startMs = performance.now();
    const ruleTrace: Array<{ rule: string; fired: boolean }> = [];
    const triggeredReasons: Array<{ code: string; weight: number }> = [];

    const temporal = features.temporal_features;
    const isHighSeasonalAlignment = temporal && temporal.temporal_behavior_similarity >= 0.75;
    const isATOThreat = features.device_is_new || features.ato_composite_score >= 0.40;

    // 1. Supervised Tabular Scoring Model (Baseline vs Temporal Adjusted)
    let baselineTabular = 0.05;
    let tabularScore = 0.05;

    // Effective amount z-score (temporal adjusted vs baseline unadjusted)
    const effectiveZScore = (isHighSeasonalAlignment && !isATOThreat)
      ? temporal.seasonal_amount_zscore
      : features.amount_zscore_user;

    // Compute baseline unadjusted
    if (features.is_new_recipient && features.amount_zscore_user >= 2.5) {
      baselineTabular += 0.35;
    }
    if (features.is_night_time && features.amount_zscore_user >= 1.5) {
      baselineTabular += 0.18;
    }

    // Compute temporal-adjusted tabular score
    if (features.is_new_recipient && effectiveZScore >= 2.5) {
      tabularScore += 0.35;
      triggeredReasons.push({ code: 'RC01', weight: 0.32 });
      ruleTrace.push({ rule: 'FIRST_TIME_LARGE_SEND', fired: true });
    }

    if (features.is_night_time && effectiveZScore >= 1.5) {
      tabularScore += 0.18;
      triggeredReasons.push({ code: 'RC02', weight: 0.18 });
      ruleTrace.push({ rule: 'UNUSUAL_OFF_HOURS_ACTIVITY', fired: true });
    }

    if (features.balance_drain_ratio >= 0.85) {
      tabularScore += 0.20;
      baselineTabular += 0.20;
      triggeredReasons.push({ code: 'RC09', weight: 0.20 });
      ruleTrace.push({ rule: 'HIGH_BALANCE_DRAIN_RATIO', fired: true });
    }

    // Temporal Intelligence Rule Triggers
    if (isHighSeasonalAlignment && !isATOThreat && recipientRingRisk < 0.4) {
      triggeredReasons.push({ code: 'RC12', weight: -0.25 });
      ruleTrace.push({ rule: 'TEMPORAL_SEASONAL_BASELINE_ALIGNMENT', fired: true });
    } else if (temporal && temporal.seasonal_amount_zscore >= 4.0) {
      triggeredReasons.push({ code: 'RC13', weight: 0.38 });
      ruleTrace.push({ rule: 'PERSISTENT_TEMPORAL_ANOMALY', fired: true });
    }

    // 2. Anomaly & ATO Composite Model
    let atoScore = features.ato_composite_score;
    if (features.device_is_new && features.mins_since_pin_reset !== null && features.mins_since_pin_reset < 2880) {
      triggeredReasons.push({ code: 'RC03', weight: 0.40 });
      ruleTrace.push({ rule: 'NEW_DEVICE_RECENT_PIN_RESET', fired: true });
    }

    // 3. Network & Ring Exposure Model (M7)
    let networkScore = recipientRingRisk;
    if (features.hops_to_known_ring <= 2 || recipientRingRisk > 0.6) {
      triggeredReasons.push({ code: 'RC04', weight: 0.35 });
      ruleTrace.push({ rule: 'FLAGGED_RING_PROXIMITY', fired: true });
    }

    if (features.recipient_pass_through_ratio >= 0.75) {
      triggeredReasons.push({ code: 'RC05', weight: 0.28 });
      ruleTrace.push({ rule: 'RAPID_PASS_THROUGH_FORWARDING', fired: true });
    }

    if (features.recipient_fan_in_1h >= 6) {
      triggeredReasons.push({ code: 'RC06', weight: 0.25 });
      ruleTrace.push({ rule: 'HIGH_FAN_IN_COLLECTOR_PATTERN', fired: true });
    }

    if (features.recipient_report_count >= 2) {
      triggeredReasons.push({ code: 'RC10', weight: 0.26 });
      ruleTrace.push({ rule: 'COMMUNITY_NEGATIVE_REPORTS', fired: true });
    }

    // 4. Scam Context (M6 - Single Message & Conversational Call Intelligence)
    const conversationScamScore = features.scam_conversation_context_score || 0.0;
    let scamContextScore = Math.max(features.scam_check_session_flag ? 0.35 : 0.0, conversationScamScore);
    
    if (features.scam_check_session_flag || conversationScamScore > 0.4) {
      triggeredReasons.push({ code: 'RC07', weight: conversationScamScore > 0.7 ? 0.45 : 0.30 });
      ruleTrace.push({ 
        rule: conversationScamScore > 0.6 ? 'SCAM_CONVERSATION_CONTEXT_FLAGGED' : 'SCAM_CHECK_MATCHED_IN_SESSION', 
        fired: true 
      });
    }

    // 5. Calibrated Multi-Model Blend (ML-05)
    // weights: 0.35 tabular + 0.25 ato + 0.25 network + 0.15 scam
    const rawBlend = 
      (0.35 * Math.min(1.0, tabularScore)) +
      (0.25 * Math.min(1.0, atoScore)) +
      (0.25 * Math.min(1.0, networkScore)) +
      (0.15 * Math.min(1.0, scamContextScore));

    const baselineRawBlend = 
      (0.35 * Math.min(1.0, baselineTabular)) +
      (0.25 * Math.min(1.0, atoScore)) +
      (0.25 * Math.min(1.0, networkScore)) +
      (0.15 * Math.min(1.0, scamContextScore));

    // Sigmoid / Isotonic Calibration curve
    const calibratedScore = Math.min(0.99, Math.max(0.01, Number((1 / (1 + Math.exp(-6 * (rawBlend - 0.45)))).toFixed(2))));
    const baselineCalibrated = Math.min(0.99, Math.max(0.01, Number((1 / (1 + Math.exp(-6 * (baselineRawBlend - 0.45)))).toFixed(2))));

    // Determine Risk Tier & Action Band (M10 Policy Engine)
    let tier: RiskTier = 'T0';
    let action: PolicyAction = 'ALLOW';

    if (calibratedScore >= 0.85 || atoScore >= 0.8 || (features.is_new_recipient && effectiveZScore >= 4.0 && features.is_night_time)) {
      tier = 'T3';
      action = 'HOLD_ASSIST';
    } else if (calibratedScore >= 0.60 || features.recipient_report_count >= 2 || (features.is_new_recipient && effectiveZScore >= 2.0)) {
      tier = 'T2';
      action = 'PAUSE_VERIFY';
    } else if (calibratedScore >= 0.30) {
      tier = 'T1';
      action = 'NUDGE';
    } else {
      tier = 'T0';
      action = 'ALLOW';
    }

    // Map top-k unique reason codes by highest weight
    triggeredReasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const uniqueReasonCodes = Array.from(new Set(triggeredReasons.map(r => r.code)));
    const reasons: ReasonCodeDetail[] = uniqueReasonCodes.map(code => {
      const def = REASON_CODES[code] || {
        code,
        label_en: 'Elevated transaction anomaly detected',
        label_bn: 'লেনদেনে সন্দেহজনক অস্বাভাবিকতা পাওয়া গেছে',
        weight: 0.2
      };
      return def;
    }).slice(0, 3);

    // If no reasons triggered but score elevated, assign baseline notice
    if (reasons.length === 0 && tier !== 'T0') {
      reasons.push(REASON_CODES['RC01']);
    }

    const latencyMs = Number((performance.now() - startMs).toFixed(1));

    return {
      risk_score: calibratedScore,
      risk_tier: tier,
      action_recommended: action,
      reasons,
      rule_trace: ruleTrace,
      model_scores: {
        supervised_tabular: Number(tabularScore.toFixed(2)),
        anomaly_isolation: Number((features.amount_zscore_user > 2 ? 0.65 : 0.15).toFixed(2)),
        network_ring_score: Number(networkScore.toFixed(2)),
        ato_signal_score: Number(atoScore.toFixed(2)),
        scam_context_score: Number(scamContextScore.toFixed(2)),
        temporal_adjusted_score: calibratedScore,
        baseline_unadjusted_score: baselineCalibrated
      },
      latency_ms: latencyMs,
      model_version: this.modelVersion,
      rules_version: this.rulesVersion
    };
  }
}

export const riskEngine = new RiskEngineService();
