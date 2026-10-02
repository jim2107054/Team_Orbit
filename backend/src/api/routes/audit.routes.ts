import { Router, Request, Response } from 'express';
import { repository } from '../../db/repository.js';
import { auditService } from '../../services/audit-service.js';

export const auditRouter = Router();

// ================= AUDIT LOGS (M17) =================
auditRouter.get('/audit/logs', async (req: Request, res: Response) => {
  try {
    const logs = await repository.getAuditLogs(50);
    return res.status(200).json({
      success: true,
      message: `Retrieved ${logs.length} cryptographic audit logs`,
      count: logs.length,
      logs
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: { code: 'GET_AUDIT_LOGS_FAILED', details: err.message }
    });
  }
});

auditRouter.post('/audit/verify', async (req: Request, res: Response) => {
  try {
    const result = await auditService.verifyAuditChainIntegrity();
    return res.status(200).json({
      success: true,
      message: 'Audit ledger cryptographic chain verification completed',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Audit verification failed',
      error: { code: 'AUDIT_VERIFY_FAILED', details: err.message }
    });
  }
});
