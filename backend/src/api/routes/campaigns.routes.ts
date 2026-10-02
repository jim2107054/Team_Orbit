import { Router, Request, Response } from 'express';
import { scamCampaignService } from '../../services/scam-campaign-service.js';

export const campaignsRouter = Router();

// ================= SCAM CAMPAIGN INTELLIGENCE ROUTES =================
// 1. Get all discovered scam campaigns
campaignsRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = scamCampaignService.getAllCampaigns();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${campaigns.length} scam campaigns`,
      count: campaigns.length,
      campaigns
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scam campaigns',
      error: { code: 'GET_CAMPAIGNS_FAILED', details: err.message }
    });
  }
});

// 2. Get specific scam campaign with graph and complaints
campaignsRouter.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const campaign = scamCampaignService.getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `Campaign ${id} not found`,
        error: { code: 'CAMPAIGN_NOT_FOUND' }
      });
    }
    const complaints = scamCampaignService.getCampaignComplaints(id);
    return res.status(200).json({
      success: true,
      message: `Campaign ${id} retrieved successfully`,
      campaign,
      complaints
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve campaign details',
      error: { code: 'GET_CAMPAIGN_FAILED', details: err.message }
    });
  }
});

// 3. Discover coordinated scam campaigns across recent complaints
campaignsRouter.post('/campaigns/discover', async (req: Request, res: Response) => {
  try {
    const result = scamCampaignService.discoverCampaigns();

    // Re-score each campaign's cohesion with embedding similarity, which sees
    // paraphrased and code-switched retellings of one script that token overlap
    // misses. The method actually used is reported per campaign.
    const rescored = await Promise.all(
      result.campaigns.map(async campaign => {
        const complaints = scamCampaignService.getCampaignComplaints(campaign.campaign_id);
        const { breakdown, similarity_method } = await scamCampaignService.calculateCampaignScoreSemantic(
          complaints,
          campaign.affected_wallets,
          campaign.shared_devices,
          campaign.linked_rings
        );
        return {
          campaign_id: campaign.campaign_id,
          campaign_name: campaign.campaign_name,
          previous_score: campaign.campaign_score,
          rescored_breakdown: breakdown,
          similarity_method
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Coordinated scam campaign discovery completed successfully',
      ...result,
      semantic_rescoring: rescored
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to run campaign discovery algorithm',
      error: { code: 'DISCOVER_CAMPAIGNS_FAILED', details: err.message }
    });
  }
});

// 4. Generate 50-complaint synthetic demo scenario
campaignsRouter.post('/campaigns/demo/generate-50', async (req: Request, res: Response) => {
  try {
    const complaints = scamCampaignService.generateSyntheticComplaintsBatch(50, 'CAMP_FAKE_CUSTOMER_CARE', 'CAMP-2026-001');
    return res.status(200).json({
      success: true,
      message: 'Generated 50 semantically correlated synthetic complaints linked to 8 wallets, 2 devices, 3 agents, and Ring-12',
      complaint_count: complaints.length,
      sample_complaints: complaints.slice(0, 5),
      target_wallets: ['W-SYN-091177', 'W-SYN-091178', 'W-SYN-091179', 'W-SYN-091180', 'W-SYN-091181', 'W-SYN-091182', 'W-SYN-091183', 'W-SYN-091184'],
      linked_ring: 'RING-2026-0012'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate synthetic demo complaints batch',
      error: { code: 'DEMO_GENERATE_FAILED', details: err.message }
    });
  }
});

// 5. Execute analyst actions on campaign (Add note, link ring, update lifecycle, mark related/unrelated)
campaignsRouter.post('/campaigns/:id/actions', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action_type, analyst_id, details } = req.body;
    if (!action_type) {
      return res.status(400).json({
        success: false,
        message: 'Field action_type is required',
        error: { code: 'MISSING_ACTION_TYPE' }
      });
    }

    const updated = await scamCampaignService.recordAnalystAction(
      id,
      action_type,
      analyst_id || 'ANALYST-101',
      details || {}
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Campaign ${id} not found`,
        error: { code: 'CAMPAIGN_NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      campaign: updated,
      message: `Analyst action ${action_type} executed and logged to SHA-256 audit ledger.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to execute analyst action on campaign',
      error: { code: 'CAMPAIGN_ACTION_FAILED', details: err.message }
    });
  }
});
