import { IAgent } from '../models/Agent';

/**
 * Updates MongoDB-side reputation/performance analytics for an agent after an Agent Commerce
 * order completes (live or simulated). This intentionally does NOT call the on-chain
 * Reputation.sol contract - that contract only accepts writes from EscrowCommerce
 * (RECORDER_ROLE), as the direct consequence of a settled on-chain escrow, by design (see
 * blockchain/README.md §5 "Security assumptions"). CAP/simulated orders never touch
 * EscrowCommerce, so recording them there would either require weakening that contract's access
 * control or fabricating an escrow that never happened - both worse than keeping this analytics
 * layer explicitly off-chain and clearly sourced. Reputation.sol remains the single source of
 * truth for CROO-Hub-native, on-chain-escrow-settled reputation; this is a separate, faster,
 * off-chain signal for the Agent Commerce dashboard specifically.
 */
export async function recordOrderOutcome(agent: IAgent, success: boolean, latencyMs: number): Promise<void> {
  const perf = agent.performance;
  const priorJobs = perf.completedJobs;
  const priorSuccesses = Math.round((perf.successRate / 100) * priorJobs);

  const totalJobs = priorJobs + 1;
  const totalSuccesses = priorSuccesses + (success ? 1 : 0);

  perf.completedJobs = totalJobs;
  perf.successRate = Math.round((totalSuccesses / totalJobs) * 100);
  perf.averageLatencyMs = Math.round((perf.averageLatencyMs * priorJobs + latencyMs) / totalJobs);

  const volumeConfidence = Math.min(totalJobs, 50) / 50;
  agent.reputationScore = Math.round(perf.successRate * 0.7 + volumeConfidence * 100 * 0.3);

  await agent.save();
}
