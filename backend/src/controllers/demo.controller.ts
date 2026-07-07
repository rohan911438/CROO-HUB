import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import * as demoService from '../services/demo.service';

export const resetDemo = asyncHandler(async (_req: Request, res: Response) => {
  const credentials = await demoService.resetDemoData();
  return ok(res, credentials);
});
