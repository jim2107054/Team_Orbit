import { Router, Request, Response } from 'express';
import { repository } from '../../db/repository.js';

export const ringsRouter = Router();

// ================= API-08: RINGS & GRAPHS =================
ringsRouter.get('/rings', async (req: Request, res: Response) => {
  try {
    const rings = await repository.getAllRings();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${rings.length} mule rings`,
      count: rings.length,
      rings
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve mule rings',
      error: { code: 'GET_RINGS_FAILED', details: err.message }
    });
  }
});

ringsRouter.get('/rings/:id', async (req: Request, res: Response) => {
  try {
    const ring = await repository.getRingById(req.params.id);
    if (!ring) {
      return res.status(404).json({
        success: false,
        message: `Ring ${req.params.id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Ring ${req.params.id} details retrieved`,
      ring
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ring details',
      error: { code: 'GET_RING_FAILED', details: err.message }
    });
  }
});
