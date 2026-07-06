import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { discoverAgents } from '../services/discovery.service';

export const discover = asyncHandler(async (req: Request, res: Response) => {
  const matches = await discoverAgents(req.body);
  return ok(res, matches, { engine: 'heuristic-v1' });
});
