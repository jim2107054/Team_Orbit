import { Router, Request, Response } from 'express';
import { repository } from '../../db/repository.js';
import { auditService } from '../../services/audit-service.js';

export const reportsRouter = Router();

// ================= API-04: COMMUNITY REPORT =================
reportsRouter.post('/reports/number', async (req: Request, res: Response) => {
  try {
    const { reporter_wallet, reported_number, category, text, language } = req.body;
    if (!reported_number) {
      return res.status(400).json({
        success: false,
        message: 'Reported phone number or wallet is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const reportId = `REP-${Date.now()}`;
    await repository.insertReport({
      report_id: reportId,
      ts: new Date().toISOString(),
      reporter_wallet: reporter_wallet || 'W-SYN-UNKNOWN',
      reported_number,
      category: category || 'IMPERSONATION',
      text: text || '',
      language: language || 'bn',
      trust_weight: 1.0,
      analyst_verified: false
    });

    await auditService.logAction('COMMUNITY', 'REPORT_NUMBER', reportId, { reported_number, category });
    return res.status(200).json({
      success: true,
      message: 'Scam report submitted and logged for verification',
      report_id: reportId
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit scam report',
      error: { code: 'REPORT_FAILED', details: err.message }
    });
  }
});

// ================= API-05: COARSE TRUST BADGE =================
reportsRouter.get('/recipients/:id/trust', async (req: Request, res: Response) => {
  try {
    const reports = await repository.getReportsForNumber(req.params.id);
    const isReported = reports.length > 0;
    const isKnownMule = req.params.id.includes('091177');

    let badge: 'SAFE' | 'NEW_RECIPIENT' | 'REPORTED' = 'SAFE';
    if (isReported || isKnownMule) badge = 'REPORTED';

    return res.status(200).json({
      success: true,
      message: `Trust status evaluated for recipient ${req.params.id}`,
      recipient_id: req.params.id,
      trust_badge: badge,
      total_reports: reports.length
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate recipient trust badge',
      error: { code: 'TRUST_BADGE_FAILED', details: err.message }
    });
  }
});
