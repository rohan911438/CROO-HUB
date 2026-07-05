import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import * as organizationService from '../services/organization.service';

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await organizationService.getOrganization(req.params.id);
  return ok(res, org);
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await organizationService.updateOrganization(req.params.id, req.body);
  return ok(res, org);
});
