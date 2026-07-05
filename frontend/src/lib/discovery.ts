import { Agent, DiscoveryMatch } from '@/types';
import { mockAgents } from './mock-data';

export function discoverAgentsMock(taskDescription: string): DiscoveryMatch[] {
  const keywords = taskDescription
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

  const agents = mockAgents.filter((a) => a.availability !== 'offline');

  const scored = agents.map((agent: Agent) => {
    const haystack = [agent.name, agent.tagline, agent.description, agent.category, ...agent.capabilities, ...agent.tools]
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
    const estimatedCompletionMinutes = Math.max(1, Math.round(agent.performance.averageLatencyMs / 1000 / 10 + Math.random() * 5));

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

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 8);
}
