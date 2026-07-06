import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import { Agent } from '../models/Agent';
import * as capService from '../services/cap.service';
import { isCapConfigured } from '../services/cap/capClient';

export const getStatus = asyncHandler(async (_req: Request, res: Response) => {
  const status = await capService.getCapStatus();
  return ok(res, status);
});

export const getMyAgents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const agents = await capService.listMyAgentsForCap(req.user.sub);
  return ok(res, agents);
});

export const getRegistrationGuide = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const agent = await Agent.findOne({ slug: req.params.slug });
  if (!agent) throw AppError.notFound('Agent not found');
  if (agent.owner?.toString() !== req.user.sub) throw AppError.forbidden('You do not own this agent');

  const guide = capService.buildRegistrationGuide(agent);
  return ok(res, guide);
});

export const linkAgent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const agent = await Agent.findOne({ slug: req.params.slug });
  if (!agent) throw AppError.notFound('Agent not found');
  if (agent.owner?.toString() !== req.user.sub) throw AppError.forbidden('You do not own this agent');

  const updated = await capService.linkCapAgent(req.params.slug, req.body);
  return ok(res, updated);
});

export const unlinkAgent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const agent = await Agent.findOne({ slug: req.params.slug });
  if (!agent) throw AppError.notFound('Agent not found');
  if (agent.owner?.toString() !== req.user.sub) throw AppError.forbidden('You do not own this agent');

  const updated = await capService.unlinkCapAgent(req.params.slug);
  return ok(res, updated);
});

// CAP's live API requires `role` on list endpoints despite the SDK typing it optional.
// 'provider' is the default since CROO Hub's configured CROO identity sells services.
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!isCapConfigured()) throw AppError.badRequest('CAP is not configured on this deployment');
  const { status, page, pageSize, role, agentId } = req.query;
  const orders = await capService.listCapOrders({
    status: status as string,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    role: (role as string) ?? 'provider',
    agentId: agentId as string,
  });
  return ok(res, orders);
});

export const listNegotiations = asyncHandler(async (req: Request, res: Response) => {
  if (!isCapConfigured()) throw AppError.badRequest('CAP is not configured on this deployment');
  const { status, page, pageSize, role, agentId } = req.query;
  const negotiations = await capService.listCapNegotiations({
    status: status as string,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    role: (role as string) ?? 'provider',
    agentId: agentId as string,
  });
  return ok(res, negotiations);
});
