import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import * as agentService from '../services/agent.service';
import { AppError } from '../utils/AppError';

export const listAgents = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, verification, availability, minReputation, sort, page, limit } = req.query;
  const result = await agentService.listAgents({
    search: search as string,
    category: category as string,
    verification: verification as string,
    availability: availability as string,
    minReputation: minReputation ? Number(minReputation) : undefined,
    sort: sort as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  return ok(res, result.items, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  });
});

export const getAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await agentService.getAgentBySlug(req.params.slug);
  return ok(res, agent);
});

export const toggleBookmark = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const agent = await agentService.toggleBookmark(req.params.slug, req.user.sub);
  return ok(res, agent);
});

export const compareAgents = asyncHandler(async (req: Request, res: Response) => {
  const slugs = String(req.query.slugs ?? '').split(',').filter(Boolean);
  const agents = await agentService.compareAgents(slugs);
  return ok(res, agents);
});
