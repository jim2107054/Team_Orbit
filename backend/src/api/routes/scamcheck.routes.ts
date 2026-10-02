import { Router, Request, Response } from 'express';
import { scamNLP } from '../../services/scam-nlp.js';
import { auditService } from '../../services/audit-service.js';

export const scamcheckRouter = Router();

// ================= API-03: SCAM CHECK & CONVERSATIONAL INTELLIGENCE =================
scamcheckRouter.post('/scamcheck', async (req: Request, res: Response) => {
  try {
    const { text, conversation } = req.body;
    const rawInput = conversation || text;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field text or conversation is required',
        error: { code: 'MISSING_TEXT' }
      });
    }
    const result = await scamNLP.analyze(rawInput);

    await auditService.logAction('SCAM_INTEL', 'ANALYZE_CONVERSATION', `SCAM-${Date.now()}`, {
      verdict: result.verdict,
      typology: result.typology_matched,
      extracted_entities: result.conversation_risk_profile?.extracted_entities
    });

    return res.status(200).json({
      success: true,
      message: result.verdict === 'SCAM' 
        ? `High scam likelihood detected (${result.typology_matched})` 
        : 'Scam check analysis completed successfully',
      ...result
    });
  } catch (err: any) {
    console.error('Scam Check Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Scam check analysis failed',
      error: { code: 'SCAM_CHECK_FAILED', details: err.message }
    });
  }
});

scamcheckRouter.post('/scamcheck/conversation', async (req: Request, res: Response) => {
  try {
    const { conversation, text } = req.body;
    const rawInput = conversation || text;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field conversation is required',
        error: { code: 'MISSING_CONVERSATION' }
      });
    }
    const result = await scamNLP.analyze(rawInput);
    return res.status(200).json({
      success: true,
      message: 'Conversation intelligence analysis completed successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Conversation analysis failed',
      error: { code: 'CONVERSATION_ANALYSIS_FAILED', details: err.message }
    });
  }
});
