import { Router, Request, Response } from 'express';
import { repository } from '../../db/repository.js';
import { heavyQueryCache } from '../middleware/index.js';

export const ringsRouter = Router();

// Rings are expensive to parse (JSON graph payloads) — cache for 60s
ringsRouter.get('/rings', heavyQueryCache);

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
    const id = req.params.id as string;
    const ring = await repository.getRingById(id);
    if (!ring) {
      return res.status(404).json({
        success: false,
        message: `Ring ${id} not found`,
        error: { code: 'NOT_FOUND' }
      });
    }
    return res.status(200).json({
      success: true,
      message: `Ring ${id} details retrieved`,
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
