import { IAgent } from '../models/Agent';
import { Review } from '../models/Review';

/**
 * Single source of truth for MongoDB-side `Agent.reputationScore`/`performance` analytics.
 *
 * This intentionally does NOT call the on-chain Reputation.sol contract - that contract only
 * accepts writes from EscrowCommerce (RECORDER_ROLE), as the direct consequence of a settled
 * on-chain escrow, by design (see blockchain/README.md §5 "Security assumptions"). Agent Commerce
 * orders and star reviews never touch EscrowCommerce, so recording them there would either
 * require weakening that contract's access control or fabricating an escrow that never happened -
 * both worse than keeping this analytics layer explicitly off-chain. Reputation.sol remains the
 * single source of truth for CROO-Hub-native, on-chain-escrow-settled reputation; this is a
 * separate, faster, off-chain signal for the marketplace/dashboard.
 *
 * The blend mirrors the on-chain contract's own formula for consistency across the platform:
 * 100% success-rate driven until the agent has at least one review, then a 60/40 blend of
 * success rate and average rating, dampened by a volume-confidence multiplier so a handful of
 * jobs/reviews can't outrank a longer track record.
 *
 * Both order completions (recordOrderOutcome) and star reviews (review.service.ts) call this one
 * function rather than each computing their own ad-hoc score - previously they didn't, and could
 * silently overwrite each other's result.
 */

const VOLUME_CONFIDENCE_CAP = 50;
const SUCCESS_WEIGHT = 0.6;
const RATING_WEIGHT = 0.4;

export async function recomputeReputationScore(agent: IAgent): Promise<void> {
  const reviews = await Review.find({ agent: agent._id }).select('rating');
  const successRate = agent.performance.successRate;

  let blended: number;
  if (reviews.length === 0) {
    blended = successRate;
  } else {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length; // 1-5
    const avgRatingPct = (avgRating / 5) * 100;
    blended = successRate * SUCCESS_WEIGHT + avgRatingPct * RATING_WEIGHT;
  }

  const volumeConfidence = Math.min(agent.performance.completedJobs, VOLUME_CONFIDENCE_CAP) / VOLUME_CONFIDENCE_CAP;
  // Reviews alone (no completed jobs yet) still count fully - volume confidence only dampens the
  // success-rate side's influence when there's little job history to back it.
  agent.reputationScore = Math.round(
    agent.performance.completedJobs === 0 ? blended : blended * (0.5 + volumeConfidence * 0.5),
  );

  await agent.save();
}

/** Updates order-completion performance stats, then recomputes the blended reputation score. */
export async function recordOrderOutcome(agent: IAgent, success: boolean, latencyMs: number): Promise<void> {
  const perf = agent.performance;
  const priorJobs = perf.completedJobs;
  const priorSuccesses = Math.round((perf.successRate / 100) * priorJobs);

  const totalJobs = priorJobs + 1;
  const totalSuccesses = priorSuccesses + (success ? 1 : 0);

  perf.completedJobs = totalJobs;
  perf.successRate = Math.round((totalSuccesses / totalJobs) * 100);
  perf.averageLatencyMs = Math.round((perf.averageLatencyMs * priorJobs + latencyMs) / totalJobs);

  await recomputeReputationScore(agent);
}
