import { Review } from '../models/Review';
import { Agent } from '../models/Agent';
import { AppError } from '../utils/AppError';
import { recomputeReputationScore } from './reputationAnalytics.service';

export async function listReviewsForAgent(agentSlug: string) {
  const agent = await Agent.findOne({ slug: agentSlug });
  if (!agent) throw AppError.notFound('Agent not found');
  return Review.find({ agent: agent._id }).populate('author', 'name avatarUrl').sort({ createdAt: -1 });
}

export async function createReview(
  agentSlug: string,
  author: string,
  input: { rating: number; title: string; body: string },
) {
  const agent = await Agent.findOne({ slug: agentSlug });
  if (!agent) throw AppError.notFound('Agent not found');

  const review = await Review.create({ agent: agent._id, author, ...input });
  await recomputeReputationScore(agent);

  return review;
}
