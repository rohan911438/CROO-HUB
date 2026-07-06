import { IAgent } from '../../models/Agent';
import { DiscoveryMatch } from '../discovery.service';

/**
 * Builds a fully explainable reasoning report for one candidate the Planner considered.
 * Every factor below is derived from real, stored data (Discovery Engine's match score,
 * MongoDB reputation/performance fields) - nothing here is fabricated after the fact to justify
 * a decision; the same weighted factors are what `discoverAgents()` used to rank the candidate
 * in the first place, expanded into a human-readable, per-factor breakdown for the UI.
 */

export interface ReasoningFactor {
  label: string;
  detail: string;
  weight: number; // relative importance in the confidence calculation, 0-1
  score: number; // 0-100 normalized score for this factor alone
}

export interface AgentReasoningReport {
  confidenceScore: number; // 0-100, dampened by how much track record backs the other factors
  factors: ReasoningFactor[];
  workflowCompatible: boolean;
  workflowCompatibilityNote: string;
  summary: string;
}

const FACTOR_WEIGHTS = {
  capability: 0.3,
  reputation: 0.2,
  performance: 0.15,
  latency: 0.1,
  cost: 0.15,
  availability: 0.1,
} as const;

/** Number of completed jobs at which confidence in the other factors is no longer dampened. */
const CONFIDENCE_VOLUME_CAP = 20;

export function buildReasoningReport(
  match: DiscoveryMatch,
  agent: IAgent,
  budget?: number,
  maxLatencyMs?: number,
): AgentReasoningReport {
  const capabilityScore = match.matchedCapabilities.length > 0 ? Math.min(100, match.matchedCapabilities.length * 30 + 40) : 35;
  const reputationScore = agent.reputationScore;
  const performanceScore = agent.performance.successRate;
  const latencyScore = Math.max(0, Math.round(100 - (agent.performance.averageLatencyMs / 8000) * 100));
  const costScore = budget
    ? Math.max(0, Math.round(100 - (Math.max(0, match.estimatedCostUsd - budget) / budget) * 100))
    : 70;
  const availabilityScore = agent.availability === 'online' ? 100 : agent.availability === 'busy' ? 55 : 0;

  const factors: ReasoningFactor[] = [
    {
      label: 'Capability match',
      detail: match.matchedCapabilities.length
        ? `Matched capabilities: ${match.matchedCapabilities.join(', ')}`
        : 'No direct capability keyword overlap - ranked on reputation/reliability instead',
      weight: FACTOR_WEIGHTS.capability,
      score: capabilityScore,
    },
    {
      label: 'Reputation',
      detail: `${agent.reputationScore}/100 platform reputation score`,
      weight: FACTOR_WEIGHTS.reputation,
      score: reputationScore,
    },
    {
      label: 'Previous performance',
      detail: `${agent.performance.completedJobs} completed job(s), ${agent.performance.successRate}% success rate`,
      weight: FACTOR_WEIGHTS.performance,
      score: performanceScore,
    },
    {
      label: 'Estimated latency',
      detail: `~${Math.round(agent.performance.averageLatencyMs / 1000)}s average response time`,
      weight: FACTOR_WEIGHTS.latency,
      score: latencyScore,
    },
    {
      label: 'Estimated cost',
      detail: budget
        ? `~$${match.estimatedCostUsd.toFixed(2)} vs. $${budget.toFixed(2)} budget`
        : `~$${match.estimatedCostUsd.toFixed(2)} (no budget constraint given)`,
      weight: FACTOR_WEIGHTS.cost,
      score: costScore,
    },
    {
      label: 'Availability',
      detail: `Currently ${agent.availability}`,
      weight: FACTOR_WEIGHTS.availability,
      score: availabilityScore,
    },
  ];

  const weightedScore = factors.reduce((sum, f) => sum + f.weight * f.score, 0);
  const volumeConfidence = Math.min(agent.performance.completedJobs, CONFIDENCE_VOLUME_CAP) / CONFIDENCE_VOLUME_CAP;
  // A perfect-looking score backed by zero job history is reported as less confident than the
  // same score backed by a real track record - mirrors the volume-confidence dampening already
  // used on-chain in Reputation.sol and in reputationAnalytics.service.ts, for consistency.
  const confidenceScore = Math.round(weightedScore * (0.5 + volumeConfidence * 0.5));

  const latencyOk = !maxLatencyMs || agent.performance.averageLatencyMs <= maxLatencyMs * 1.5;
  const workflowCompatible = agent.availability !== 'offline' && latencyOk;
  const workflowCompatibilityNote = !latencyOk
    ? 'Average latency exceeds the requested maxLatencyMs constraint by a wide margin.'
    : agent.availability === 'offline'
      ? 'Agent is currently offline - selected as the best available match, but execution may be delayed.'
      : 'Meets workflow constraints (availability and latency budget).';

  const summary = `Selected "${agent.name}" with ${confidenceScore}% confidence. ${match.reasoning} ${workflowCompatibilityNote}`;

  return { confidenceScore, factors, workflowCompatible, workflowCompatibilityNote, summary };
}
