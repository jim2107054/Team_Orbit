import { Router, Request, Response } from 'express';
import { customerSafetyModeService } from '../../services/safety-mode-service.js';

export const customerSafetyRouter = Router();

// ================= CUSTOMER SAFETY MODE ENDPOINTS =================
customerSafetyRouter.get('/customer/safety-mode/:walletId', (req: Request, res: Response) => {
  try {
    const record = customerSafetyModeService.getSafetyMode(req.params.walletId);
    const thresholds = customerSafetyModeService.getPolicyThresholds(req.params.walletId);
    return res.status(200).json({
      success: true,
      message: `Safety mode status retrieved for wallet ${req.params.walletId}`,
      safety_mode: record,
      thresholds
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve safety mode status',
      error: { code: 'GET_SAFETY_MODE_FAILED', details: err.message }
    });
  }
});

customerSafetyRouter.post('/customer/safety-mode/activate', async (req: Request, res: Response) => {
  try {
    const { wallet_id, reason, duration_minutes, source } = req.body;
    if (!wallet_id) {
      return res.status(400).json({
        success: false,
        message: 'Field wallet_id is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await customerSafetyModeService.activateSafetyMode(
      wallet_id,
      reason || 'SUSPICIOUS_CALL',
      duration_minutes || 120,
      source || 'CUSTOMER_APP'
    );

    return res.status(200).json({
      success: true,
      message: result.message || 'Safety Mode activated successfully for your protection',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to activate Safety Mode',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

customerSafetyRouter.post('/customer/safety-mode/extend', async (req: Request, res: Response) => {
  try {
    const { wallet_id, additional_minutes } = req.body;
    if (!wallet_id) {
      return res.status(400).json({
        success: false,
        message: 'Field wallet_id is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await customerSafetyModeService.extendSafetyMode(
      wallet_id,
      additional_minutes || 120
    );

    return res.status(200).json({
      success: true,
      message: result.message || 'Safety Mode extended successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to extend Safety Mode duration',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

customerSafetyRouter.post('/customer/safety-mode/disable', async (req: Request, res: Response) => {
  try {
    const { wallet_id, step_up_pin } = req.body;
    if (!wallet_id) {
      return res.status(400).json({
        success: false,
        message: 'Field wallet_id is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = await customerSafetyModeService.disableSafetyMode(
      wallet_id,
      step_up_pin || '1234'
    );

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message || 'Incorrect PIN or verification failed to disable Safety Mode',
        error: { code: 'VERIFICATION_FAILED' }
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'Safety Mode has been successfully disabled',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to disable Safety Mode',
      error: { code: 'SERVER_ERROR', details: err.message }
    });
  }
});

customerSafetyRouter.get('/customer/safety-mode-config', (req: Request, res: Response) => {
  try {
    const config = customerSafetyModeService.getConfig();
    return res.status(200).json({
      success: true,
      message: 'Safety Mode policy configuration retrieved',
      config
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Safety Mode configuration',
      error: { code: 'GET_CONFIG_FAILED', details: err.message }
    });
  }
});

customerSafetyRouter.get('/customer/safety-mode-audits/:walletId?', (req: Request, res: Response) => {
  try {
    const audits = customerSafetyModeService.getAuditHistory(req.params.walletId);
    return res.status(200).json({
      success: true,
      message: `Retrieved ${audits.length} safety mode audit events`,
      count: audits.length,
      audits
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve safety mode audit logs',
      error: { code: 'GET_AUDITS_FAILED', details: err.message }
    });
  }
});
