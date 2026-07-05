import { Agent } from '../models/Agent';

export interface DiscoveryRequest {
  taskDescription: string;
  budget?: number;
  maxLatencyMs?: number;
  preferredCapabilities?: string[];
}

export interface DiscoveryMatch {
  agentId: string;
  slug: string;
  name: string;
  avatarUrl: string;
  matchScore: number;
  trustScore: number;
  estimatedCostUsd: number;
  estimatedCompletionMinutes: number;
  matchedCapabilities: string[];
  reasoning: string;
}

/**
 * Mocked recommendation engine. Ranks agents using a deterministic heuristic
 * derived from keyword overlap + stored reputation/performance data so the
 * UI can be built against realistic-looking output. Replace with a real
 * embedding/LLM-based matcher when the CROO CAP recommendation service ships.
 */
export async function discoverAgents(request: DiscoveryRequest): Promise<DiscoveryMatch[]> {
  const keywords = request.taskDescription
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

  const agents = await Agent.find({ availability: { $ne: 'offline' } }).limit(50);

  const scored = agents.map((agent) => {
    const haystack = [
      agent.name,
      agent.tagline,
      agent.description,
      agent.category,
      ...agent.capabilities,
      ...agent.tools,
    ]
      .join(' ')
      .toLowerCase();

    const matchedCapabilities = agent.capabilities.filter((cap) =>
      keywords.some((kw) => cap.toLowerCase().includes(kw)),
    );

    const overlap = keywords.filter((kw) => haystack.includes(kw)).length;
    const keywordScore = keywords.length > 0 ? overlap / keywords.length : 0.4;

    const reputationScore = agent.reputationScore / 100;
    const successScore = agent.performance.successRate / 100;
    const latencyScore = Math.max(0, 1 - agent.performance.averageLatencyMs / 8000);

    const matchScore = Math.min(
      99,
      Math.round((keywordScore * 0.5 + reputationScore * 0.25 + successScore * 0.15 + latencyScore * 0.1) * 100),
    );

    const trustScore = Math.round(reputationScore * 60 + successScore * 40);

    const estimatedCostUsd = Number((agent.pricing.amount * (1 + Math.random() * 0.4)).toFixed(2));
    const estimatedCompletionMinutes = Math.max(
      1,
      Math.round(agent.performance.averageLatencyMs / 1000 / 10 + Math.random() * 5),
    );

    const reasoning = matchedCapabilities.length
      ? `Matched on ${matchedCapabilities.slice(0, 3).join(', ')} with a ${agent.performance.successRate}% historical success rate and ${agent.reputationScore}/100 reputation.`
      : `Ranked by reputation (${agent.reputationScore}/100) and reliability (${agent.performance.successRate}% success rate) since no direct capability keywords matched.`;

    return {
      agentId: agent.id,
      slug: agent.slug,
      name: agent.name,
      avatarUrl: agent.avatarUrl,
      matchScore,
      trustScore,
      estimatedCostUsd,
      estimatedCompletionMinutes,
      matchedCapabilities,
      reasoning,
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}
