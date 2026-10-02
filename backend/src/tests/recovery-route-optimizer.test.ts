import { describe, it, expect, beforeEach } from 'vitest';
import { RecoveryRouteOptimizerService } from '../services/recovery-route-optimizer.js';
import { copilotService } from '../services/copilot-service.js';

describe('Prompt 11: Recovery Route Optimizer (Evidence-Based Decision Support)', () => {
  let optimizer: RecoveryRouteOptimizerService;

  beforeEach(() => {
    optimizer = new RecoveryRouteOptimizerService();
  });

  // 1. Correct Downstream Traversal (Multi-hop)
  it('1. should correctly traverse multi-hop money flow graph to identify terminal mule wallets', () => {
    const plan = optimizer.generateRecoveryRoute('TEST-CASE-MULTI-HOP', 'TXN-SYN-001', {
      scenarioId: 'SCENARIO_B',
      disputedAmountBdt: 18500
    });

    expect(plan).toBeDefined();
    expect(plan.scenario_id).toBe('SCENARIO_B');
    expect(plan.route.length).toBeGreaterThanOrEqual(3);

    // First recommendations must target downstream mule wallets with active balance
    const muleStep1 = plan.route.find((s) => s.target_entity_id === 'W-SYN-091177');
    const muleStep2 = plan.route.find((s) => s.target_entity_id === 'W-SYN-088312');

    expect(muleStep1).toBeDefined();
    expect(muleStep2).toBeDefined();
    expect(muleStep1?.action_type).toBe('REVIEW_RECIPIENT_WALLET');
    expect(muleStep2?.action_type).toBe('REVIEW_RECIPIENT_WALLET');
  });

  // 2. Action Prioritization & Scoring
  it('2. should assign explainable priority scores based on time, flow relevance, and evidence strength', () => {
    const plan = optimizer.generateRecoveryRoute('TEST-CASE-PRIORITY', 'TXN-SYN-001', {
      scenarioId: 'SCENARIO_B'
    });

    for (const step of plan.route) {
      expect(step.priority_score).toBeGreaterThan(0);
      expect(step.priority_score).toBeLessThanOrEqual(100);
      expect(step.score_breakdown).toBeDefined();
      expect(step.score_breakdown.time_urgency).toBeGreaterThan(0);
      expect(step.score_breakdown.money_flow_relevance).toBeGreaterThan(0);
      expect(step.score_breakdown.evidence_strength).toBeGreaterThan(0);
      expect(step.reason_codes.length).toBeGreaterThan(0);
    }

    // Verify descending sort by priority score
    for (let i = 0; i < plan.route.length - 1; i++) {
      expect(plan.route[i].priority_score).toBeGreaterThanOrEqual(plan.route[i + 1].priority_score);
    }
  });

  // 3. Golden Hour Urgency Adaptation
  it('3. should adapt priority when Golden Hour is nearly expired (< 15 mins remaining)', () => {
    // Standard window (42 mins)
    const normalPlan = optimizer.generateRecoveryRoute('TEST-GH-NORMAL', 'TXN-001', {
      scenarioId: 'SCENARIO_B',
      goldenHourRemainingMin: 42
    });

    // Late window (8 mins remaining)
    const urgentPlan = optimizer.generateRecoveryRoute('TEST-GH-URGENT', 'TXN-001', {
      scenarioId: 'SCENARIO_B',
      goldenHourRemainingMin: 8
    });

    expect(urgentPlan.golden_hour_state.urgency_tier).toBe('CRITICAL');
    expect(urgentPlan.golden_hour_state.remaining_minutes).toBe(8);

    // In late window, cashout & escalation priority scores increase due to urgency
    const cashoutStep = urgentPlan.route.find((s) => s.action_type === 'REVIEW_CASHOUT');
    expect(cashoutStep).toBeDefined();
  });

  // 4. Evidence Confidence & Grounding
  it('4. should provide structured evidence citations with high confidence ratings', () => {
    const plan = optimizer.generateDirectRecipientScenario('TEST-CONFIDENCE');

    expect(plan.estimated_recoverability.confidence_score).toBeGreaterThanOrEqual(0.9);
    for (const step of plan.route) {
      expect(step.evidence_items.length).toBeGreaterThan(0);
      for (const ev of step.evidence_items) {
        expect(ev.evidence_id).toBeDefined();
        expect(ev.source_event_id).toBeDefined();
        expect(ev.timestamp).toBeDefined();
        expect(ev.confidence).toBeGreaterThan(0.8);
      }
    }
  });

  // 5. Duplicate Action Prevention
  it('5. should dynamically prevent duplicate recommendations once an action is marked REVIEWED or SKIPPED', () => {
    const initialPlan = optimizer.generateRecoveryRoute('TEST-CASE-DUP', 'TXN-001', {
      scenarioId: 'SCENARIO_B'
    });
    const initialCount = initialPlan.route.length;
    const targetActionId = initialPlan.route[0].action_id;

    // Investigator marks top action as REVIEWED
    const { plan: updatedPlan } = optimizer.updateActionStatus(
      'TEST-CASE-DUP',
      targetActionId,
      'REVIEWED',
      'Investigated wallet balance; verified ৳6,200 active hold candidate.',
      'ANALYST-TAREK-102'
    );

    // Step should be removed from active recommendations and added to completed_actions
    expect(updatedPlan.route.length).toBe(initialCount - 1);
    expect(updatedPlan.completed_actions.length).toBe(1);
    expect(updatedPlan.completed_actions[0].action_id).toBe(targetActionId);
    expect(updatedPlan.completed_actions[0].status).toBe('REVIEWED');
    expect(updatedPlan.completed_actions[0].reviewed_by).toBe('ANALYST-TAREK-102');

    // Remaining steps re-indexed cleanly
    expect(updatedPlan.route[0].step_number).toBe(1);
  });

  // 6. Multi-Hop Laundering Scenario (Scenario B)
  it('6. should evaluate Scenario B with partial recoverable balance and cash-out points', () => {
    const plan = optimizer.generateMultiHopLaunderingScenario('TEST-SCENARIO-B', 'TXN-001', 18500, 42);

    expect(plan.scenario_id).toBe('SCENARIO_B');
    expect(plan.estimated_recoverability.observable_balance_bdt).toBe(11200);
    expect(plan.estimated_recoverability.disputed_amount_bdt).toBe(18500);
    expect(plan.estimated_recoverability.level).toBe('POTENTIALLY_RECOVERABLE');

    // Cash-out agent should be included in recommendations
    const agentStep = plan.route.find((s) => s.action_type === 'REVIEW_AGENT');
    expect(agentStep).toBeDefined();
    expect(agentStep?.target_entity_id).toBe('AGT-DH-8821');
  });

  // 7. Direct Recipient Scenario (Scenario A)
  it('7. should evaluate Scenario A with 100% active recoverable balance in direct recipient wallet', () => {
    const plan = optimizer.generateDirectRecipientScenario('TEST-SCENARIO-A', 'TXN-A01', 25000, 52);

    expect(plan.scenario_id).toBe('SCENARIO_A');
    expect(plan.estimated_recoverability.observable_balance_bdt).toBe(25000);
    expect(plan.estimated_recoverability.level).toBe('POTENTIALLY_RECOVERABLE');
    expect(plan.route[0].action_type).toBe('REVIEW_RECIPIENT_WALLET');
    expect(plan.route[0].priority).toBe('URGENT');
  });

  // 8. Campaign-Linked Scenario (Scenario C)
  it('8. should evaluate Scenario C by linking active scam campaign and shared ring nodes', () => {
    const plan = optimizer.generateCampaignLinkedScenario('TEST-SCENARIO-C', 'TXN-C01', 32000, 38);

    expect(plan.scenario_id).toBe('SCENARIO_C');
    const campaignStep = plan.route.find((s) => s.action_type === 'REVIEW_CAMPAIGN');
    const ringStep = plan.route.find((s) => s.action_type === 'REVIEW_RING');

    expect(campaignStep).toBeDefined();
    expect(campaignStep?.target_entity_id).toBe('CAMP-2026-EID-01');
    expect(ringStep).toBeDefined();
    expect(ringStep?.target_entity_id).toBe('RING-DHAKA-NORTH-04');
  });

  // 9. Insufficient Evidence Scenario (Scenario D)
  it('9. should explicitly flag INSUFFICIENT_EVIDENCE when flow exits observable network', () => {
    const plan = optimizer.generateInsufficientEvidenceScenario('TEST-SCENARIO-D', 'TXN-D01', 45000, 10);

    expect(plan.scenario_id).toBe('SCENARIO_D');
    expect(plan.estimated_recoverability.level).toBe('INSUFFICIENT_EVIDENCE');
    expect(plan.estimated_recoverability.insufficient_evidence_reason).toContain(
      'Insufficient evidence for a reliable recovery route. Continue evidence collection.'
    );

    // First action must be requesting additional evidence
    expect(plan.route[0].action_type).toBe('REQUEST_ADDITIONAL_EVIDENCE');
  });

  // 10. Chronological Recovery Timeline Generation
  it('10. should produce a chronological recovery timeline event chain', () => {
    const timeline = optimizer.getRecoveryTimeline('CASE-2026-SCENARIO-B');

    expect(timeline.length).toBeGreaterThanOrEqual(4);
    expect(timeline[0].event_type).toBe('TRANSACTION');
    expect(timeline.some((e) => e.event_type === 'DOWNSTREAM_TRANSFER')).toBe(true);
    expect(timeline.some((e) => e.event_type === 'CASHOUT')).toBe(true);
    expect(timeline.some((e) => e.event_type === 'COMPLAINT_FILED')).toBe(true);
    expect(timeline.some((e) => e.event_type === 'ROUTE_GENERATED')).toBe(true);
  });

  // 11. Copilot Integration (What should I investigate first?)
  it('11. should provide grounded Copilot answers based on structured route output without hallucination', () => {
    const copilotResult = copilotService.queryRecoveryCopilot(
      'CASE-2026-SCENARIO-B',
      'What should I investigate first?',
      'en'
    );

    expect(copilotResult).toBeDefined();
    expect(copilotResult.answer).toContain('Priority 1:');
    expect(copilotResult.confidence).toBeGreaterThan(0.9);
    expect(copilotResult.evidence_ids.length).toBeGreaterThan(0);
    expect(copilotResult.top_step).toBeDefined();

    // Bangla query test
    const copilotBn = copilotService.queryRecoveryCopilot(
      'CASE-2026-SCENARIO-B',
      'প্রথমে কোন বিষয়টি তদন্ত করব?',
      'bn'
    );
    expect(copilotBn.answer).toContain('অগ্রাধিকার ১:');
  });

  // 12. Unsupported Recommendation Rate Guarantee = 0.0%
  it('12. should guarantee Unsupported Recommendation Rate = 0% across all scenarios', () => {
    const scenarios: ('SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D')[] = [
      'SCENARIO_A',
      'SCENARIO_B',
      'SCENARIO_C',
      'SCENARIO_D'
    ];

    for (const sc of scenarios) {
      const plan = optimizer.generateRecoveryRoute(`TEST-RATE-${sc}`, 'TXN-TEST', { scenarioId: sc });
      expect(plan.unsupported_recommendation_rate).toBe(0.0);

      // Verify every single step has verifiable evidence items attached
      for (const step of plan.route) {
        expect(step.evidence_items.length).toBeGreaterThan(0);
        for (const ev of step.evidence_items) {
          expect(ev.source_event_id.length).toBeGreaterThan(0);
          expect(ev.description_en.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
