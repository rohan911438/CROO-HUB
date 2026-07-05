import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/apiResponse';
import * as templateService from '../services/template.service';
import { AppError } from '../utils/AppError';

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = await templateService.listTemplates(req.query.category as string);
  return ok(res, templates);
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await templateService.getTemplate(req.params.slug);
  return ok(res, template);
});

export const duplicateTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const workflow = await templateService.duplicateTemplateAsWorkflow(
    req.params.slug,
    req.user.sub,
    req.body?.name,
  );
  return created(res, workflow);
});
