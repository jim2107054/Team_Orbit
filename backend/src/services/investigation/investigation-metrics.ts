import { InvestigationMetricsSnapshot, IncidentInvestigation } from '../../core/types.js';

/**
 * Investigation observability counters.
 *
 * Process-local counters for the live instance, exposed through the existing
 * `/v1/metrics/*` surface rather than a separate monitoring stack. Durable totals
 * come from `repository.getInvestigationAggregates()`; these in-memory counters add
 * latency distribution and the per-process rejection/injection tallies that are not
 * worth a database round trip.
 *
 * Production upgrade path: same shape as the existing cache/pool stats, so these
 * can be scraped into Prometheus alongside them without changing call sites.
 */
export class InvestigationMetricsCollector {
  private investigationsTotal = 0;
  private verdictCounts = { CONSISTENT: 0, INCONSISTENT: 0, INSUFFICIENT_DATA: 0 };
  private matchedCount = 0;
  private humanReviewCount = 0;
  private campaignLinkedCount = 0;
  private highRiskCount = 0;
  private safetyRejections = 0;
  private injectionAttempts = 0;
  private ledgerUnavailable = 0;

  /** Bounded ring buffer so a long-running process cannot grow without limit. */
  private latencies: number[] = [];
  private static readonly LATENCY_WINDOW = 500;

  record(inv: IncidentInvestigation): void {
    this.investigationsTotal += 1;
    this.verdictCounts[inv.evidence.verdict] += 1;
    if (inv.evidence.relevant_transaction_id) this.matchedCount += 1;
    if (inv.human_review.required) this.humanReviewCount += 1;
    if (inv.campaign_context.matched_campaign_id) this.campaignLinkedCount += 1;
    if (inv.risk_context.fraud_risk === 'HIGH' || inv.risk_context.fraud_risk === 'CRITICAL') this.highRiskCount += 1;
    if (inv.customer_response.fallback_used) this.safetyRejections += 1;
    if (inv.claim.injection_attempt_detected) this.injectionAttempts += 1;
    if (!inv.transaction_match.ledger_available) this.ledgerUnavailable += 1;

    this.latencies.push(inv.total_latency_ms);
    if (this.latencies.length > InvestigationMetricsCollector.LATENCY_WINDOW) {
      this.latencies.shift();
    }
  }

  snapshot(): InvestigationMetricsSnapshot {
    const total = this.investigationsTotal;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const percentile = (p: number): number => {
      if (sorted.length === 0) return 0;
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
      return Number(sorted[idx].toFixed(1));
    };

    return {
      investigations_total: total,
      evidence_consistent_total: this.verdictCounts.CONSISTENT,
      evidence_inconsistent_total: this.verdictCounts.INCONSISTENT,
      evidence_insufficient_total: this.verdictCounts.INSUFFICIENT_DATA,
      transaction_match_rate: total > 0 ? Number((this.matchedCount / total).toFixed(3)) : 0,
      human_review_rate: total > 0 ? Number((this.humanReviewCount / total).toFixed(3)) : 0,
      campaign_linked_cases: this.campaignLinkedCount,
      high_risk_cases: this.highRiskCount,
      response_safety_rejections: this.safetyRejections,
      prompt_injection_attempts: this.injectionAttempts,
      investigation_latency_ms: {
        count: sorted.length,
        p50: percentile(50),
        p95: percentile(95),
        max: sorted.length > 0 ? Number(sorted[sorted.length - 1].toFixed(1)) : 0,
        avg: sorted.length > 0
          ? Number((sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1))
          : 0
      },
      ledger_unavailable_total: this.ledgerUnavailable
    };
  }

  /** Test hook. */
  reset(): void {
    this.investigationsTotal = 0;
    this.verdictCounts = { CONSISTENT: 0, INCONSISTENT: 0, INSUFFICIENT_DATA: 0 };
    this.matchedCount = 0;
    this.humanReviewCount = 0;
    this.campaignLinkedCount = 0;
    this.highRiskCount = 0;
    this.safetyRejections = 0;
    this.injectionAttempts = 0;
    this.ledgerUnavailable = 0;
    this.latencies = [];
  }
}

export const investigationMetrics = new InvestigationMetricsCollector();
