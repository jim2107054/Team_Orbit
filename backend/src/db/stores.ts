import { JsonStore } from './persistence.js';
import {
  StructuredComplaint,
  ComplaintDuplicateGroup,
  ComplaintAnalystAction,
  ScamCampaign,
  ScamComplaintRecord,
  CampaignAnalystActionRecord,
  AgentDualRiskProfile,
  MerchantProfile,
  CustomerSafetyModeRecord,
  SafetyModeAuditEvent,
  HumanCoachSession,
  ScamSpreadAlert,
  PropagationAnalystActionRecord,
  RecoveryRoutePlan,
  KnowledgeNode,
  KnowledgeEdge
} from '../core/types.js';

/**
 * One store per durable domain collection. The scalar columns declared here are
 * the ones the API filters and sorts on; the full object always round-trips
 * through payload_json, so adding a field to a domain type needs no migration.
 */

export const complaintStore = new JsonStore<StructuredComplaint>({
  table: 'complaints',
  pk: 'complaint_id',
  id: c => c.complaint_id,
  hasUpdatedAt: true,
  orderBy: 'created_at DESC',
  columns: [
    { name: 'reporter_wallet', value: c => c.reporter_wallet },
    { name: 'reporter_phone', value: c => c.reporter_phone },
    { name: 'classification', value: c => c.classification },
    { name: 'typology', value: c => c.typology },
    { name: 'priority', value: c => c.priority },
    { name: 'status', value: c => c.status },
    { name: 'detected_language', value: c => c.detected_language },
    { name: 'is_golden_hour', value: c => c.is_golden_hour },
    { name: 'potential_loss_bdt', value: c => c.potential_loss_bdt },
    { name: 'duplicate_group_id', value: c => c.duplicate_group_id },
    { name: 'linked_txn_id', value: c => c.linked_txn_id },
    { name: 'linked_case_id', value: c => c.linked_case_id },
    { name: 'linked_campaign_id', value: c => c.linked_campaign_id }
  ]
});

export const complaintGroupStore = new JsonStore<ComplaintDuplicateGroup>({
  table: 'complaint_duplicate_groups',
  pk: 'group_id',
  id: g => g.group_id,
  hasUpdatedAt: true,
  orderBy: 'created_at DESC',
  columns: [
    { name: 'primary_complaint_id', value: g => g.primary_complaint_id },
    { name: 'linked_campaign_id', value: g => g.linked_campaign_id },
    { name: 'linked_ring_id', value: g => g.linked_ring_id },
    { name: 'total_exposure_bdt', value: g => g.total_exposure_bdt }
  ]
});

export const complaintActionStore = new JsonStore<ComplaintAnalystAction>({
  table: 'complaint_analyst_actions',
  pk: 'action_id',
  id: a => a.action_id,
  orderBy: 'created_at ASC',
  columns: [
    { name: 'complaint_id', value: a => a.complaint_id },
    { name: 'action_type', value: a => a.action_type },
    { name: 'analyst_id', value: a => a.analyst_id }
  ]
});

export const campaignStore = new JsonStore<ScamCampaign>({
  table: 'scam_campaigns',
  pk: 'campaign_id',
  id: c => c.campaign_id,
  hasUpdatedAt: true,
  orderBy: 'campaign_score DESC',
  columns: [
    { name: 'campaign_name', value: c => c.campaign_name },
    { name: 'typology', value: c => c.typology },
    { name: 'lifecycle_status', value: c => c.lifecycle_status },
    { name: 'status', value: c => c.status },
    { name: 'campaign_score', value: c => c.campaign_score },
    { name: 'complaint_count', value: c => c.complaint_count },
    { name: 'estimated_exposure_bdt', value: c => c.estimated_exposure_bdt },
    { name: 'first_seen_ts', value: c => c.first_seen_ts },
    { name: 'latest_seen_ts', value: c => c.latest_seen_ts }
  ]
});

export const campaignComplaintStore = new JsonStore<ScamComplaintRecord>({
  table: 'campaign_complaints',
  pk: 'complaint_id',
  id: c => c.complaint_id,
  hasUpdatedAt: true,
  orderBy: 'created_at DESC',
  columns: [
    { name: 'assigned_campaign_id', value: c => c.assigned_campaign_id },
    { name: 'sender_number', value: c => c.sender_number },
    { name: 'target_wallet', value: c => c.target_wallet },
    { name: 'target_amount', value: c => c.target_amount },
    { name: 'source_channel', value: c => c.source_channel },
    { name: 'is_manually_linked', value: c => Boolean(c.is_manually_linked) },
    { name: 'is_unrelated', value: c => Boolean(c.is_unrelated) }
  ]
});

export const campaignActionStore = new JsonStore<CampaignAnalystActionRecord>({
  table: 'campaign_analyst_actions',
  pk: 'action_id',
  id: a => a.action_id,
  orderBy: 'created_at ASC',
  columns: [
    { name: 'campaign_id', value: a => a.campaign_id },
    { name: 'action_type', value: a => a.action_type },
    { name: 'analyst_id', value: a => a.analyst_id }
  ]
});

export const agentProfileStore = new JsonStore<AgentDualRiskProfile>({
  table: 'agent_dual_profiles',
  pk: 'agent_id',
  id: a => a.agent_id,
  hasUpdatedAt: true,
  orderBy: 'fraud_risk_score DESC',
  columns: [
    { name: 'name', value: a => a.name },
    { name: 'division', value: a => a.division },
    { name: 'district_type', value: a => a.district_type },
    { name: 'size_tier', value: a => a.size_tier },
    { name: 'classification', value: a => a.classification },
    { name: 'operational_pressure_score', value: a => a.operational_pressure_score },
    { name: 'fraud_risk_score', value: a => a.fraud_risk_score },
    { name: 'last_evaluated_at', value: a => a.last_evaluated_at }
  ]
});

/** Analyst actions on agents are recorded ad hoc; the shape stays open. */
export interface AgentAnalystActionRecord {
  action_id: string;
  agent_id: string;
  action_type: string;
  analyst_id: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export const agentActionStore = new JsonStore<AgentAnalystActionRecord>({
  table: 'agent_analyst_actions',
  pk: 'action_id',
  id: a => a.action_id,
  orderBy: 'created_at ASC',
  columns: [
    { name: 'agent_id', value: a => a.agent_id },
    { name: 'action_type', value: a => a.action_type },
    { name: 'analyst_id', value: a => a.analyst_id }
  ]
});

export const merchantProfileStore = new JsonStore<MerchantProfile>({
  table: 'merchant_risk_profiles',
  pk: 'merchant_id',
  id: m => m.merchant_id,
  hasUpdatedAt: true,
  orderBy: 'risk_score DESC',
  columns: [
    { name: 'qr_code_id', value: m => m.qr_code_id },
    { name: 'name', value: m => m.name },
    { name: 'category', value: m => m.category },
    { name: 'division', value: m => m.division },
    { name: 'trust_badge', value: m => m.trust_badge },
    { name: 'risk_score', value: m => m.risk_score },
    { name: 'is_suspicious_drain', value: m => Boolean(m.is_suspicious_drain) }
  ]
});

export const safetyModeStore = new JsonStore<CustomerSafetyModeRecord>({
  table: 'customer_safety_modes',
  pk: 'wallet_id',
  id: r => r.wallet_id,
  hasUpdatedAt: true,
  orderBy: 'updated_at DESC',
  columns: [
    { name: 'state', value: r => r.state },
    { name: 'reason', value: r => r.reason },
    { name: 'activation_source', value: r => r.activation_source },
    { name: 'active_since', value: r => r.active_since },
    { name: 'expires_at', value: r => r.expires_at },
    { name: 'duration_minutes', value: r => Math.round(r.duration_minutes || 0) }
  ]
});

export const safetyAuditStore = new JsonStore<SafetyModeAuditEvent>({
  table: 'safety_mode_audit_events',
  pk: 'event_id',
  id: e => e.event_id,
  orderBy: 'created_at ASC',
  columns: [
    { name: 'wallet_id', value: e => e.wallet_id },
    { name: 'event_type', value: e => e.event_type },
    { name: 'previous_state', value: e => e.previous_state },
    { name: 'new_state', value: e => e.new_state },
    { name: 'actor', value: e => e.actor }
  ]
});

export const coachSessionStore = new JsonStore<HumanCoachSession>({
  table: 'coach_sessions',
  pk: 'session_id',
  id: s => s.session_id,
  hasUpdatedAt: true,
  orderBy: 'created_at DESC',
  columns: [
    { name: 'txn_id', value: s => s.transaction_id },
    { name: 'wallet_id', value: s => s.customer_wallet },
    { name: 'outcome', value: s => s.customer_final_choice || s.status }
  ]
});

export const propagationAlertStore = new JsonStore<ScamSpreadAlert>({
  table: 'propagation_alerts',
  pk: 'alert_id',
  id: a => a.alert_id,
  hasUpdatedAt: true,
  orderBy: 'created_at DESC',
  columns: [
    { name: 'campaign_id', value: a => a.campaign_id },
    { name: 'campaign_name', value: a => a.campaign_name },
    { name: 'cluster_status', value: a => a.cluster_status },
    { name: 'status', value: a => a.status },
    { name: 'growth_rate', value: a => a.growth_rate },
    { name: 'top_typology', value: a => a.top_typology }
  ]
});

export const propagationActionStore = new JsonStore<PropagationAnalystActionRecord>({
  table: 'propagation_analyst_actions',
  pk: 'action_id',
  id: a => a.action_id,
  orderBy: 'created_at ASC',
  columns: [
    { name: 'alert_id', value: a => a.alert_id },
    { name: 'action_type', value: a => a.action_type },
    { name: 'analyst_id', value: a => a.analyst_id }
  ]
});

export const recoveryPlanStore = new JsonStore<RecoveryRoutePlan>({
  table: 'recovery_plans',
  pk: 'plan_id',
  id: p => p.case_id,
  hasUpdatedAt: true,
  orderBy: 'updated_at DESC',
  columns: [
    { name: 'case_id', value: p => p.case_id },
    { name: 'victim_wallet', value: p => p.route?.[0]?.target_entity_id },
    { name: 'status', value: p => p.golden_hour_state?.urgency_tier || p.overall_priority },
    { name: 'recoverable_bdt', value: p => p.estimated_recoverability?.observable_balance_bdt ?? 0 }
  ]
});

export const knowledgeNodeStore = new JsonStore<KnowledgeNode>({
  table: 'knowledge_graph_nodes',
  pk: 'node_id',
  id: n => n.id,
  hasUpdatedAt: true,
  columns: [
    { name: 'node_type', value: n => n.type },
    { name: 'label', value: n => n.label }
  ]
});

export const knowledgeEdgeStore = new JsonStore<KnowledgeEdge>({
  table: 'knowledge_graph_edges',
  pk: 'edge_id',
  id: e => e.id,
  hasUpdatedAt: true,
  columns: [
    { name: 'from_node_id', value: e => e.source },
    { name: 'to_node_id', value: e => e.target },
    { name: 'relation', value: e => e.type }
  ]
});
