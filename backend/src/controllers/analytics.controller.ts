import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import * as analyticsService from '../services/analytics.service';

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const overview = await analyticsService.getAnalyticsOverview(req.user.sub);
  return ok(res, overview);
});
