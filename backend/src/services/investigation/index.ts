/**
 * Evidence-Driven Scam Incident Investigation — service barrel.
 *
 * Owns the UNDERSTAND / INVESTIGATE / EXPLAIN layer. It composes the existing
 * Astha engines (risk, graph, campaign, recovery) and adds no second
 * fraud engine of its own.
 */
export { untrustedInputGuard, INJECTION_PATTERNS } from './untrusted-input-guard.js';
export type { UntrustedInputResult, InjectionPattern } from './untrusted-input-guard.js';

export { claimExtractor, ClaimExtractor } from './claim-extractor.js';

export { transactionMatcher, TransactionMatcher } from './transaction-matcher.js';

export { evidenceCollector, EvidenceCollector } from './evidence-collector.js';
export type { CollectedEvidence } from './evidence-collector.js';

export { evidenceVerdictEngine, EvidenceVerdictEngine } from './evidence-verdict.js';
export type { VerdictInput } from './evidence-verdict.js';

export { responseSafetyValidator, ResponseSafetyValidator } from './response-safety-validator.js';
export { safeResponseBuilder, SafeResponseBuilder } from './safe-response-builder.js';

export { investigationMetrics, InvestigationMetricsCollector } from './investigation-metrics.js';

export {
  incidentInvestigationService,
  IncidentInvestigationService
} from './incident-investigation-service.js';
export type { InvestigationRequest } from './incident-investigation-service.js';
