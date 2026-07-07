import { IAgent } from '../../models/Agent';
import { IExecutionPlan } from '../../models/AgentOrder';
import { DiscoveryMatch } from '../discovery.service';

/** Matches simulatedExecutor's own step cadence, so the estimate is in the right ballpark. */
const NEGOTIATION_SETTLEMENT_OVERHEAD_MS = 2500;

/**
 * Packages numbers discovery.service.ts already computes (estimatedCostUsd,
 * estimatedCompletionMinutes) plus the agent's own stored average latency into a small
 * per-step + total breakdown. No new estimation model - just surfacing figures that already
 * existed but were previously discarded once the winning candidate was chosen.
 */
export function buildExecutionPlan(match: DiscoveryMatch, agent: IAgent): IExecutionPlan {
  const capabilities = match.matchedCapabilities.length
    ? match.matchedCapabilities.slice(0, 4)
    : ['Execute task end-to-end'];

  const perStepDurationMs = Math.round(agent.performance.averageLatencyMs / capabilities.length) || 1000;
  const perStepCostUsd = Number((match.estimatedCostUsd / capabilities.length).toFixed(2));

  const steps = capabilities.map((label) => ({
    label: match.matchedCapabilities.length ? `Handle "${label}"` : label,
    agentSlug: agent.slug,
    estimatedDurationMs: perStepDurationMs,
    estimatedCostUsd: perStepCostUsd,
  }));

  steps.push({
    label: 'Negotiation & settlement overhead',
    agentSlug: agent.slug,
    estimatedDurationMs: NEGOTIATION_SETTLEMENT_OVERHEAD_MS,
    estimatedCostUsd: 0,
  });

  return {
    steps,
    totalEstimatedDurationMs: agent.performance.averageLatencyMs + NEGOTIATION_SETTLEMENT_OVERHEAD_MS,
    totalEstimatedCostUsd: match.estimatedCostUsd,
    computedAt: new Date(),
  };
}
