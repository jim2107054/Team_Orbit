import { Router, Request, Response } from 'express';
import { simulatorService } from '../../services/simulator-service.js';
import { monitoringService } from '../../services/monitoring-service.js';
import { repository } from '../../db/repository.js';
import { investigationMetrics } from '../../services/investigation/investigation-metrics.js';
import { dashboardCache, listCache } from '../middleware/index.js';

export const metricsRouter = Router();

// Apply caching to dashboard-critical GET endpoints
metricsRouter.get('/metrics/summary', dashboardCache);
metricsRouter.get('/metrics/fairness', listCache);
metricsRouter.get('/metrics/drift', listCache);

// ================= API-11: IMPACT SIMULATOR =================
metricsRouter.post('/simulate', (req: Request, res: Response) => {
  try {
    const params = req.body;
    const result = simulatorService.simulateImpact(params);
    return res.status(200).json({
      success: true,
      message: 'Risk threshold simulation completed successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Simulation execution failed',
      error: { code: 'SIMULATION_FAILED', details: err.message }
    });
  }
});

// ================= API-12: METRICS & FAIRNESS =================
metricsRouter.get('/metrics/fairness', (req: Request, res: Response) => {
  try {
    const slices = monitoringService.getFairnessSlices();
    return res.status(200).json({
      success: true,
      message: 'Fairness slice metrics retrieved',
      slices
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fairness metrics',
      error: { code: 'FAIRNESS_METRICS_FAILED', details: err.message }
    });
  }
});

metricsRouter.get('/metrics/drift', (req: Request, res: Response) => {
  try {
    const drift = monitoringService.getDriftMetrics();
    return res.status(200).json({
      success: true,
      message: 'Model drift metrics retrieved',
      drift
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve drift metrics',
      error: { code: 'DRIFT_METRICS_FAILED', details: err.message }
    });
  }
});

metricsRouter.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const stats = await repository.getSummaryStats();
    // Incident investigation counters are folded into the existing summary rather
    // than exposed through a separate monitoring surface.
    return res.status(200).json({
      success: true,
      message: 'Summary metrics retrieved successfully',
      ...stats,
      investigation: investigationMetrics.snapshot()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system summary metrics',
      error: { code: 'SUMMARY_METRICS_FAILED', details: err.message }
    });
  }
});
