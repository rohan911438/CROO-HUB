import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { discoverAgents } from '../services/discovery.service';
import { DiscoveryLog } from '../models/DiscoveryLog';

export const discover = asyncHandler(async (req: Request, res: Response) => {
  const matches = await discoverAgents(req.body);
  await DiscoveryLog.create({
    requestedBy: req.user?.sub,
    taskDescription: req.body.taskDescription ?? '',
    resultCount: matches.length,
    topMatchScore: matches[0]?.matchScore,
  });
  return ok(res, matches, { engine: 'heuristic-v1' });
});
