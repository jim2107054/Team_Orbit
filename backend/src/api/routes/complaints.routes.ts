import { Router, Request, Response } from 'express';
import { complaintActionIntelligenceService } from '../../services/complaint-action-intelligence.js';

export const complaintsRouter = Router();

// ================= COMPLAINT-TO-ACTION INTELLIGENCE ENDPOINTS =================
complaintsRouter.get('/complaints', (req: Request, res: Response) => {
  try {
    const complaints = complaintActionIntelligenceService.getAllComplaints();
    const { priority, classification, status, duplicate_group_id } = req.query;

    let filtered = complaints;
    if (priority && priority !== 'ALL') {
      filtered = filtered.filter(c => c.priority === priority);
    }
    if (classification && classification !== 'ALL') {
      filtered = filtered.filter(c => c.classification === classification);
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter(c => c.status === status);
    }
    if (duplicate_group_id) {
      filtered = filtered.filter(c => c.duplicate_group_id === duplicate_group_id);
    }

    return res.status(200).json({
      success: true,
      message: `Retrieved ${filtered.length} complaints`,
      total: complaints.length,
      count: filtered.length,
      complaints: filtered
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints',
      error: { code: 'GET_COMPLAINTS_FAILED', details: err.message }
    });
  }
});

complaintsRouter.get('/complaints/stats', (req: Request, res: Response) => {
  try {
    const stats = complaintActionIntelligenceService.getStats();
    return res.status(200).json({
      success: true,
      message: 'Complaint intelligence statistics retrieved',
      stats
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint statistics',
      error: { code: 'GET_COMPLAINT_STATS_FAILED', details: err.message }
    });
  }
});

complaintsRouter.get('/complaints/duplicate-groups', (req: Request, res: Response) => {
  try {
    const groups = complaintActionIntelligenceService.getAllDuplicateGroups();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${groups.length} duplicate complaint clusters`,
      count: groups.length,
      groups
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve duplicate complaint clusters',
      error: { code: 'GET_DUPLICATE_GROUPS_FAILED', details: err.message }
    });
  }
});

complaintsRouter.get('/complaints/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const cmp = complaintActionIntelligenceService.getComplaintById(id);
    if (!cmp) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Complaint ${id} details retrieved`,
      complaint: cmp
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint details',
      error: { code: 'GET_COMPLAINT_FAILED', details: err.message }
    });
  }
});

complaintsRouter.post('/complaints/process', async (req: Request, res: Response) => {
  try {
    const { raw_text, reporter_wallet, reporter_phone, reporter_name, elapsed_minutes } = req.body;
    if (!raw_text || typeof raw_text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field raw_text is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const complaint = complaintActionIntelligenceService.processComplaint({
      raw_text,
      reporter_wallet,
      reporter_phone,
      reporter_name,
      elapsed_minutes: elapsed_minutes !== undefined ? Number(elapsed_minutes) : 15
    });

    // Second pass: model triage grounded in the typology corpus, plus semantic
    // near-duplicate search against previously indexed complaints.
    const enrichment = await complaintActionIntelligenceService.enrichComplaint(complaint);

    return res.status(200).json({
      success: true,
      message: `Complaint analyzed and classified as ${enrichment.complaint.classification} (${enrichment.complaint.priority} priority)`,
      complaint: enrichment.complaint,
      intelligence: {
        llm_used: enrichment.llm_used,
        llm_unavailable_reason: enrichment.llm_unavailable_reason,
        escalated_by_model: enrichment.escalated_by_model,
        model_summary_en: enrichment.model_summary_en,
        model_summary_bn: enrichment.model_summary_bn,
        model_next_steps: enrichment.model_next_steps,
        rules_classification: enrichment.rules_classification,
        model_classification: enrichment.model_classification,
        model_classification_confidence: enrichment.model_classification_confidence,
        semantic_duplicates: enrichment.semantic_duplicates,
        duplicate_threshold: enrichment.duplicate_threshold,
        // False means the active embedder is lexical, so a complaint written in
        // Bangla will not match the same scam reported in English.
        cross_language_matching: enrichment.cross_language_matching,
        indexed_for_retrieval: enrichment.indexed_for_retrieval,
        retrieved_context: enrichment.retrieved_context
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process customer complaint',
      error: { code: 'PROCESSING_ERROR', details: err.message }
    });
  }
});

complaintsRouter.post('/complaints/demo-5-scams', (req: Request, res: Response) => {
  try {
    const demo = complaintActionIntelligenceService.generate5ComplaintDemoScenario();
    return res.status(200).json({
      success: true,
      message: 'Demo 5-scam complaints scenario generated successfully',
      ...demo
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate demo complaints scenario',
      error: { code: 'DEMO_ERROR', details: err.message }
    });
  }
});

complaintsRouter.post('/complaints/:id/override-link', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { target_type, target_id, analyst_id, notes } = req.body;
    if (!target_type || !target_id) {
      return res.status(400).json({
        success: false,
        message: 'target_type and target_id are required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const updated = complaintActionIntelligenceService.overrideLink(
      id,
      target_type,
      target_id,
      analyst_id || 'ANALYST-101',
      notes
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        error: { code: 'NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Complaint link successfully updated to ${target_type}: ${target_id}`,
      complaint: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to override complaint linkage',
      error: { code: 'OVERRIDE_ERROR', details: err.message }
    });
  }
});

complaintsRouter.post('/complaints/:id/priority', (req: Request, res: Response) => {
  try {
    const { priority, analyst_id, reason } = req.body;
    if (!priority) {
      return res.status(400).json({
        success: false,
        message: 'Priority parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const updated = complaintActionIntelligenceService.changePriority(
      req.params.id as string,
      priority,
      analyst_id || 'ANALYST-101',
      reason || 'Analyst triage review'
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        error: { code: 'NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Complaint priority updated to ${priority}`,
      complaint: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint priority',
      error: { code: 'PRIORITY_ERROR', details: err.message }
    });
  }
});

complaintsRouter.post('/complaints/:id/emergency-hold', (req: Request, res: Response) => {
  try {
    const { wallet_id, analyst_id } = req.body;
    const result = complaintActionIntelligenceService.triggerEmergencyHold(
      req.params.id as string,
      wallet_id || 'W-SYN-881920',
      analyst_id || 'ANALYST-101'
    );
    return res.status(200).json({
      ...result,
      success: result.success ?? true,
      message: result.message || 'Emergency hold triggered successfully on target wallet'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger emergency hold',
      error: { code: 'HOLD_ERROR', details: err.message }
    });
  }
});

complaintsRouter.post('/complaints/:id/dispatch-advisory', (req: Request, res: Response) => {
  try {
    const { phone, advisory_text, analyst_id } = req.body;
    const result = complaintActionIntelligenceService.dispatchCustomerAdvisory(
      req.params.id as string,
      phone || '01711-998822',
      advisory_text || 'উপায় নিরাপত্তা সতর্কতা: কারো প্ররোচনায় ওটিপি বা পিন শেয়ার করবেন না।',
      analyst_id || 'ANALYST-101'
    );
    return res.status(200).json({
      ...result,
      success: result.success ?? true,
      message: result.message || 'Customer safety advisory SMS dispatched'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch customer advisory SMS',
      error: { code: 'ADVISORY_ERROR', details: err.message }
    });
  }
});
