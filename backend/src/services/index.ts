/**
 * Services Barrel — Centralized access to all domain services.
 */

// 1. Risk Engine & Feature Computation
export { riskEngine } from './risk-engine.js';
export { featureStore } from './feature-store.js';
export { channelRiskService } from './channel-risk-service.js';
export { temporalRiskIntelligence } from './temporal-risk-intelligence.js';

// 2. Intelligence & NLP Layer
export { scamNLP } from './scam-nlp.js';
export { conversationScamIntelligence } from './conversation-scam-intelligence.js';
export { scamCampaignService } from './scam-campaign-service.js';
export { communityPropagationService } from './community-propagation.js';

// 3. Graph & Investigation
export { graphEngine } from './graph-engine.js';
export { scamKnowledgeGraph } from './scam-knowledge-graph.js';
export { complaintActionIntelligenceService } from './complaint-action-intelligence.js';
export { copilotService } from './copilot-service.js';

// 3b. Evidence-Driven Scam Incident Investigation (UNDERSTAND / INVESTIGATE / EXPLAIN)
export { incidentInvestigationService } from './investigation/incident-investigation-service.js';
export { claimExtractor } from './investigation/claim-extractor.js';
export { transactionMatcher } from './investigation/transaction-matcher.js';
export { evidenceCollector } from './investigation/evidence-collector.js';
export { evidenceVerdictEngine } from './investigation/evidence-verdict.js';
export { responseSafetyValidator } from './investigation/response-safety-validator.js';
export { safeResponseBuilder } from './investigation/safe-response-builder.js';
export { untrustedInputGuard } from './investigation/untrusted-input-guard.js';
export { investigationMetrics } from './investigation/investigation-metrics.js';

// 4. Protection & Prevention
export { customerSafetyModeService } from './safety-mode-service.js';
export { humanScamCoach } from './human-scam-coach.js';
export { agentGuard } from './agent-guard.js';
export { merchantScamShield } from './merchant-scam-shield.js';

// 5. Recovery & Tracing
export { recoveryTracer } from './recovery-tracer.js';
export { recoveryRouteOptimizer } from './recovery-route-optimizer.js';

// 6. Monitoring, Policy & Governance
export { auditService } from './audit-service.js';
export { monitoringService } from './monitoring-service.js';
export { policyEngine } from './policy-engine.js';
export { simulatorService } from './simulator-service.js';
