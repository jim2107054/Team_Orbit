import { persistence } from '../db/persistence.js';
import { complaintActionIntelligenceService } from './complaint-action-intelligence.js';
import { scamCampaignService } from './scam-campaign-service.js';
import { agentGuard } from './agent-guard.js';
import { merchantScamShield } from './merchant-scam-shield.js';
import { customerSafetyModeService } from './safety-mode-service.js';
import { humanScamCoach } from './human-scam-coach.js';
import { communityPropagationService } from './community-propagation.js';
import { recoveryRouteOptimizer } from './recovery-route-optimizer.js';
import { scamKnowledgeGraph } from './scam-knowledge-graph.js';

export interface HydrationReport {
  enabled: boolean;
  hydrated: string[];
  failed: Array<{ service: string; error: string }>;
}

/**
 * Restore durable domain state before the server accepts traffic.
 *
 * Each service seeds its demo baseline in its constructor and then either
 * publishes those seeds (first boot, empty tables) or replaces them with what
 * is actually stored. One service failing to hydrate must not stop boot — it
 * falls back to its in-memory seeds and is reported as degraded.
 */
export async function hydrateAllServices(): Promise<HydrationReport> {
  const report: HydrationReport = { enabled: persistence.isEnabled(), hydrated: [], failed: [] };

  if (!persistence.isEnabled()) {
    return report;
  }

  // The knowledge graph hydrates first because the recovery optimizer reads it
  // while rebuilding routes.
  const targets: Array<{ name: string; hydrate: () => Promise<void> }> = [
    { name: 'knowledge-graph', hydrate: () => scamKnowledgeGraph.hydrate() },
    { name: 'complaints', hydrate: () => complaintActionIntelligenceService.hydrate() },
    { name: 'campaigns', hydrate: () => scamCampaignService.hydrate() },
    { name: 'agent-guard', hydrate: () => agentGuard.hydrate() },
    { name: 'merchants', hydrate: () => merchantScamShield.hydrate() },
    { name: 'safety-mode', hydrate: () => customerSafetyModeService.hydrate() },
    { name: 'coach-sessions', hydrate: () => humanScamCoach.hydrate() },
    { name: 'propagation', hydrate: () => communityPropagationService.hydrate() },
    { name: 'recovery-plans', hydrate: () => recoveryRouteOptimizer.hydrate() }
  ];

  for (const target of targets) {
    try {
      await target.hydrate();
      report.hydrated.push(target.name);
    } catch (err: any) {
      const message = String(err?.message || err);
      report.failed.push({ service: target.name, error: message });
      console.warn(`[Hydration] ${target.name} failed, using in-memory seeds: ${message}`);
    }
  }

  return report;
}
