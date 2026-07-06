import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import * as devConsoleService from '../services/devConsole.service';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const health = await devConsoleService.getSystemHealth();
  return ok(res, health);
});

export const getRequestLog = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, devConsoleService.getApiRequestLog());
});

export const getRecords = asyncHandler(async (req: Request, res: Response) => {
  const { collection } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const records = await devConsoleService.getRecentRecords(collection, limit);
  return ok(res, records);
});

export const getOnchainEvents = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const events = await devConsoleService.getOnchainEvents(limit);
  return ok(res, events);
});
