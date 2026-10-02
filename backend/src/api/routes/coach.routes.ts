import { Router, Request, Response } from 'express';
import { humanScamCoach } from '../../services/human-scam-coach.js';
import { copilotService } from '../../services/copilot-service.js';

export const coachRouter = Router();

// ================= HUMAN SCAM COACH (PROMPT 12) =================

// 1. Evaluate transaction context & determine whether to intervene with 1-4 questions
coachRouter.post('/coach/evaluate', (req: Request, res: Response) => {
  try {
    const { customer_wallet, recipient_wallet, amount_bdt, risk_score, risk_tier, reasons, is_new_recipient, scam_conversation_typology, safety_mode_active, channel } = req.body;
    
    if (!customer_wallet || !recipient_wallet || !amount_bdt) {
      return res.status(400).json({
        success: false,
        message: 'customer_wallet, recipient_wallet, and amount_bdt are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = humanScamCoach.evaluateIntervention({
      customer_wallet,
      recipient_wallet,
      amount_bdt: Number(amount_bdt),
      risk_score: risk_score !== undefined ? Number(risk_score) : undefined,
      risk_tier,
      reasons,
      is_new_recipient: is_new_recipient !== undefined ? Boolean(is_new_recipient) : undefined,
      scam_conversation_typology,
      safety_mode_active: Boolean(safety_mode_active),
      channel
    });

    return res.status(200).json({
      success: true,
      message: result.should_intervene 
        ? 'Human scam coach intervention triggered' 
        : 'Transaction cleared without coach intervention',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Human Scam Coach evaluation failed',
      error: { code: 'COACH_EVALUATION_FAILED', details: err.message }
    });
  }
});

// 2. Record customer answer & fetch next question or final explanation
coachRouter.post('/coach/answer', (req: Request, res: Response) => {
  try {
    const { session_id, question_id, answer } = req.body;

    if (!session_id || !question_id || !answer) {
      return res.status(400).json({
        success: false,
        message: 'session_id, question_id, and answer are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = humanScamCoach.recordAnswer(session_id, question_id, answer);
    return res.status(200).json({
      success: true,
      message: result.completed ? 'Coach session completed' : 'Next coaching question ready',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record coach answer',
      error: { code: 'COACH_ANSWER_FAILED', details: err.message }
    });
  }
});

// 3. Record customer's final safety decision (Cancel, Review, Continue)
coachRouter.post('/coach/choice', (req: Request, res: Response) => {
  try {
    const { session_id, choice } = req.body;

    if (!session_id || !choice) {
      return res.status(400).json({
        success: false,
        message: 'session_id and choice are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = humanScamCoach.recordCustomerChoice(session_id, choice);
    return res.status(200).json({
      success: true,
      message: `Customer safety decision recorded: ${choice}`,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record customer choice',
      error: { code: 'COACH_CHOICE_FAILED', details: err.message }
    });
  }
});

// 4. Get Human Scam Coach session for investigator case review
coachRouter.get('/coach/session/:id', (req: Request, res: Response) => {
  try {
    const session = humanScamCoach.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Coach session not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Coach session ${req.params.id} retrieved`,
      session
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coach session',
      error: { code: 'COACH_SESSION_FAILED', details: err.message }
    });
  }
});

// 5. Copilot Human Coach Query Endpoint
coachRouter.post('/copilot/coach-query', (req: Request, res: Response) => {
  try {
    const { session_id, question, language } = req.body;
    if (!session_id || !question) {
      return res.status(400).json({
        success: false,
        message: 'session_id and question are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = copilotService.queryCoachCopilot(session_id, question, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Coach Copilot answered successfully',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Coach Copilot query failed',
      error: { code: 'COPILOT_COACH_ERROR', details: err.message }
    });
  }
});
