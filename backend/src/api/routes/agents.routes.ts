import { Router, Request, Response } from 'express';
import { agentGuard } from '../../services/agent-guard.js';

export const agentsRouter = Router();

// ================= AGENT GUARD & LIQUIDITY SEPARATION (M8) =================
agentsRouter.get('/agents', (req: Request, res: Response) => {
  try {
    const agents = agentGuard.getAllAgentProfiles();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${agents.length} agent profiles`,
      count: agents.length,
      agents
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agents',
      error: { code: 'GET_AGENTS_FAILED', details: err.message }
    });
  }
});

agentsRouter.get('/agents/:id/dual-profile', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const profile = agentGuard.getAgentProfile(id) || agentGuard.evaluateDualProfile(id);
    return res.status(200).json({
      success: true,
      message: `Dual risk profile retrieved for agent ${id}`,
      profile
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent dual profile',
      error: { code: 'GET_AGENT_PROFILE_FAILED', details: err.message }
    });
  }
});

agentsRouter.get('/agents/:id/risk', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const profile = agentGuard.getAgentProfile(id) || agentGuard.evaluateDualProfile(id);
    const legacy = {
      agent_id: profile.agent_id,
      name: profile.name,
      division: profile.division,
      cashout_ratio: profile.liquidity_signals.cash_out_volume_bdt / Math.max(1, profile.liquidity_signals.total_volume_bdt),
      peer_avg_cashout_ratio: profile.peer_benchmark.peer_avg_cashout_ratio,
      structured_txn_count: profile.fraud_signals.structured_amounts_count,
      shared_device_count: profile.fraud_signals.shared_device_count,
      risk_score: profile.fraud_risk_score,
      risk_tier: profile.fraud_risk_score >= 0.60 ? 'HIGH_ALERT' : profile.fraud_risk_score >= 0.40 ? 'ELEVATED' : 'NORMAL',
      active_warnings: profile.active_warnings,
      coached_victim_prompts_bn: profile.coached_victim_prompts_bn,
      dual_profile: profile
    };
    return res.status(200).json({
      success: true,
      message: `Risk evaluation for agent ${id} completed`,
      ...legacy
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent risk evaluation',
      error: { code: 'GET_AGENT_RISK_FAILED', details: err.message }
    });
  }
});

agentsRouter.post('/agents/:id/actions', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action, analyst_id, notes } = req.body;
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = agentGuard.executeAnalystAction(
      id,
      action,
      analyst_id || 'ANALYST-101',
      notes
    );

    return res.status(200).json({
      ...result,
      success: result.success ?? true,
      message: result.message || `Action ${action} executed successfully on agent ${id}`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to execute agent action',
      error: { code: 'ACTION_FAILED', details: err.message }
    });
  }
});
