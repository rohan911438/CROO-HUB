import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/apiResponse';
import * as workflowService from '../services/workflow.service';
import { AppError } from '../utils/AppError';

export const listWorkflows = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const workflows = await workflowService.listWorkflows(req.user.sub);
  return ok(res, workflows);
});

export const getWorkflow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const workflow = await workflowService.getWorkflow(req.params.id, req.user.sub);
  return ok(res, workflow);
});

export const createWorkflow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const workflow = await workflowService.createWorkflow({ ...req.body, owner: req.user.sub });
  return created(res, workflow);
});

export const updateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const workflow = await workflowService.updateWorkflow(req.params.id, req.user.sub, req.body);
  return ok(res, workflow);
});

export const deleteWorkflow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await workflowService.deleteWorkflow(req.params.id, req.user.sub);
  return ok(res, { deleted: true });
});

export const runWorkflow = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await workflowService.simulateExecution(req.params.id, req.user.sub);
  return ok(res, result);
});
