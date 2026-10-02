import { Router, Request, Response } from 'express';
import { communityPropagationService } from '../../services/community-propagation.js';

export const propagationRouter = Router();

// ================= COMMUNITY SCAM PROPAGATION INTELLIGENCE =================
propagationRouter.get('/propagation/timeline', (req: Request, res: Response) => {
  try {
    const timeline = communityPropagationService.getTimeAnimationSnapshots();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${timeline.length} propagation timeline frames`,
      count: timeline.length,
      timeline
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation timeline',
      error: { code: 'GET_PROPAGATION_TIMELINE_FAILED', details: err.message }
    });
  }
});

propagationRouter.get('/propagation/clusters', (req: Request, res: Response) => {
  try {
    const day = req.query.day ? parseInt(req.query.day as string, 10) : 5;
    const regions = communityPropagationService.getRegionalSpreadData(day);
    return res.status(200).json({
      success: true,
      message: `Retrieved regional spread data for day ${day}`,
      day,
      count: regions.length,
      regions
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation clusters',
      error: { code: 'GET_PROPAGATION_CLUSTERS_FAILED', details: err.message }
    });
  }
});

propagationRouter.get('/propagation/alerts', (req: Request, res: Response) => {
  try {
    const alerts = communityPropagationService.getSpreadAlerts();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${alerts.length} active propagation alerts`,
      count: alerts.length,
      alerts
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation alerts',
      error: { code: 'GET_PROPAGATION_ALERTS_FAILED', details: err.message }
    });
  }
});

propagationRouter.get('/propagation/alerts/:id', (req: Request, res: Response) => {
  try {
    const alert = communityPropagationService.getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Spread alert not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Spread alert ${req.params.id} details retrieved`,
      alert
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve propagation alert',
      error: { code: 'GET_ALERT_FAILED', details: err.message }
    });
  }
});

propagationRouter.post('/propagation/alerts/:id/action', async (req: Request, res: Response) => {
  try {
    const { action_type, analyst_id, notes, warning_payload } = req.body;
    if (!action_type) {
      return res.status(400).json({
        success: false,
        message: 'Field action_type is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await communityPropagationService.recordAnalystAction(
      req.params.id,
      action_type,
      analyst_id || 'ANALYST-OPS-01',
      notes,
      warning_payload
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Action failed on propagation alert',
        error: { code: 'ACTION_FAILED' }
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'Analyst action executed on spread alert',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record action on propagation alert',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

propagationRouter.post('/propagation/simulate-demo', (req: Request, res: Response) => {
  try {
    const { start_region, target_region } = req.body || {};
    const demo = communityPropagationService.generateSyntheticOutbreakDemo(start_region, target_region);
    return res.status(200).json({
      success: true,
      message: 'Synthetic outbreak demo scenario generated successfully',
      demo
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to simulate propagation demo',
      error: { code: 'SIMULATION_ERROR', details: err.message }
    });
  }
});
