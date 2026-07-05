import { FilterQuery } from 'mongoose';
import { Agent, IAgent } from '../models/Agent';
import { AppError } from '../utils/AppError';

export interface AgentQueryParams {
  search?: string;
  category?: string;
  verification?: string;
  availability?: string;
  minReputation?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function listAgents(params: AgentQueryParams) {
  const filter: FilterQuery<IAgent> = {};

  if (params.search) {
    filter.$text = { $search: params.search };
  }
  if (params.category) filter.category = params.category;
  if (params.verification) filter.verification = params.verification;
  if (params.availability) filter.availability = params.availability;
  if (params.minReputation) filter.reputationScore = { $gte: params.minReputation };

  const page = params.page ?? 1;
  const limit = params.limit ?? 12;

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    reputation: { reputationScore: -1 },
    price_asc: { 'pricing.amount': 1 },
    price_desc: { 'pricing.amount': -1 },
    latency: { 'performance.averageLatencyMs': 1 },
    newest: { createdAt: -1 },
  };
  const sort = sortMap[params.sort ?? 'reputation'] ?? sortMap.reputation;

  const [items, total] = await Promise.all([
    Agent.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Agent.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getAgentBySlug(slug: string) {
  const agent = await Agent.findOne({ slug });
  if (!agent) throw AppError.notFound('Agent not found');
  return agent;
}

export async function toggleBookmark(slug: string, userId: string) {
  const agent = await Agent.findOne({ slug });
  if (!agent) throw AppError.notFound('Agent not found');

  const idx = agent.bookmarkedBy.findIndex((id) => id.toString() === userId);
  if (idx >= 0) {
    agent.bookmarkedBy.splice(idx, 1);
  } else {
    agent.bookmarkedBy.push(userId as never);
  }
  await agent.save();
  return agent;
}

export async function compareAgents(slugs: string[]) {
  return Agent.find({ slug: { $in: slugs } });
}
