import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/apiResponse';
import * as settingService from '../services/setting.service';
import { AppError } from '../utils/AppError';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const settings = await settingService.getSettings(req.user.sub);
  return ok(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const settings = await settingService.updateSettings(req.user.sub, req.body);
  return ok(res, settings);
});

export const createApiKey = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { settings, rawKey } = await settingService.createApiKey(req.user.sub, req.body.name);
  return created(res, { settings, rawKey });
});
