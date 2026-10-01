export interface SimulationParameters {
  total_txns: number;
  fraud_prevalence_pct: number; // e.g. 0.5%
  mean_fraud_amount_bdt: number; // e.g. 9000
  alert_budget_pct: number; // e.g. 0.8%
  operating_threshold: number; // e.g. 0.60
  intervention_cancel_rate_pct: number; // e.g. 60%
  friction_cost_per_legit_bdt: number; // e.g. 2.0
  analyst_cost_per_minute_bdt: number; // e.g. 4.0
  analyst_time_per_alert_mins: number; // e.g. 3.0
  golden_hour_recovery_rate_pct: number; // e.g. 25%
}

export interface SimulationResult {
  total_txns: number;
  fraud_txns_count: number;
  fraud_value_at_risk_bdt: number;
  detected_fraud_count: number;
  recall_pct: number;
  precision_pct: number;
  loss_prevented_bdt: number;
  recovery_gain_bdt: number;
  total_customer_friction_count: number;
  false_positive_friction_rate_pct: number;
  friction_cost_bdt: number;
  analyst_alerts_count: number;
  analyst_cost_bdt: number;
  net_benefit_bdt: number;
  roi_multiple: number;
  operating_curve: Array<{
    threshold: number;
    recall_pct: number;
    fpr_pct: number;
    net_benefit_bdt: number;
  }>;
}

export class SimulatorService {
  simulateImpact(params: SimulationParameters): SimulationResult {
    const totalTxns = params.total_txns || 1000000;
    const fraudRate = (params.fraud_prevalence_pct || 0.5) / 100;
    const meanAmount = params.mean_fraud_amount_bdt || 9000;
    const fraudCount = Math.round(totalTxns * fraudRate);
    const fraudValue = fraudCount * meanAmount;

    // Recall curve based on threshold
    const threshold = params.operating_threshold || 0.60;
    const recall = Math.max(0.40, Math.min(0.98, 1.15 - threshold * 0.7));
    const detectedFraud = Math.round(fraudCount * recall);

    // Customer cancellation uplift
    const cancelRate = (params.intervention_cancel_rate_pct || 60) / 100;
    const lossPrevented = detectedFraud * meanAmount * cancelRate;

    // Golden-Hour recovery uplift
    const recoveryRate = (params.golden_hour_recovery_rate_pct || 25) / 100;
    const recoveryGain = (detectedFraud * meanAmount * (1 - cancelRate)) * recoveryRate;

    // False positives & friction
    const legitTxns = totalTxns - fraudCount;
    const fpr = Math.max(0.001, (1 - threshold) * 0.025);
    const frictionCount = Math.round(legitTxns * fpr);
    const frictionCost = frictionCount * (params.friction_cost_per_legit_bdt || 2.0);

    // Analyst load
    const alertBudget = (params.alert_budget_pct || 0.8) / 100;
    const analystAlerts = Math.round(totalTxns * alertBudget);
    const analystCost = analystAlerts * (params.analyst_time_per_alert_mins || 3.0) * (params.analyst_cost_per_minute_bdt || 4.0);

    const netBenefit = lossPrevented + recoveryGain - frictionCost - analystCost;
    const totalCosts = frictionCost + analystCost + 50000; // Platform baseline
    const roiMultiple = Number((netBenefit / totalCosts).toFixed(1));

    // Operating curve points
    const operatingCurve = [0.2, 0.4, 0.6, 0.7, 0.8, 0.9].map(t => {
      const rec = Math.max(0.35, Math.min(0.98, 1.15 - t * 0.7));
      const f = Math.max(0.001, (1 - t) * 0.025);
      const lp = fraudCount * rec * meanAmount * cancelRate;
      const fc = legitTxns * f * 2.0;
      const nb = lp - fc - analystCost;
      return {
        threshold: t,
        recall_pct: Number((rec * 100).toFixed(1)),
        fpr_pct: Number((f * 100).toFixed(2)),
        net_benefit_bdt: Math.round(nb)
      };
    });

    return {
      total_txns: totalTxns,
      fraud_txns_count: fraudCount,
      fraud_value_at_risk_bdt: fraudValue,
      detected_fraud_count: detectedFraud,
      recall_pct: Number((recall * 100).toFixed(1)),
      precision_pct: Number(((detectedFraud / (detectedFraud + frictionCount * 0.2)) * 100).toFixed(1)),
      loss_prevented_bdt: Math.round(lossPrevented),
      recovery_gain_bdt: Math.round(recoveryGain),
      total_customer_friction_count: frictionCount,
      false_positive_friction_rate_pct: Number((fpr * 100).toFixed(2)),
      friction_cost_bdt: Math.round(frictionCost),
      analyst_alerts_count: analystAlerts,
      analyst_cost_bdt: Math.round(analystCost),
      net_benefit_bdt: Math.round(netBenefit),
      roi_multiple: roiMultiple,
      operating_curve: operatingCurve
    };
  }
}

export const simulatorService = new SimulatorService();
