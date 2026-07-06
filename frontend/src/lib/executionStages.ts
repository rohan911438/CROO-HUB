import { AgentOrder, OrderEvent } from '@/types';
import { StageStatus } from '@/components/agent-commerce/stage-node';

export interface ExecutionStage {
  key: string;
  label: string;
  status: StageStatus;
  timestamp?: string;
  durationLabel?: string;
  detail: string;
  link?: string;
}

function findEvent(events: OrderEvent[], types: string[]): OrderEvent | undefined {
  return [...events].reverse().find((e) => types.includes(e.type));
}

function durationLabel(fromIso?: string, toIso?: string): string | undefined {
  if (!fromIso || !toIso) return undefined;
  const seconds = (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000;
  return seconds < 1 ? undefined : `${seconds.toFixed(1)}s`;
}

/**
 * Derives the 9-stage Agent Commerce execution graph (Planner -> Discovery -> Candidate Ranking
 * -> Negotiation -> Selected Agent -> Execution -> Settlement -> On-chain Proof -> Reputation
 * Update) purely from an order's persisted event log - no separate state machine to keep in
 * sync, so the graph can never drift from what actually happened.
 */
export function computeExecutionStages(order: AgentOrder): ExecutionStage[] {
  const events = order.events;
  const discoveryFailed = findEvent(events, ['discovery_failed']);
  const discoveryDone = findEvent(events, ['discovery_completed']);
  const negStarted = findEvent(events, ['negotiation_started']);
  const negAccepted = findEvent(events, ['negotiation_accepted']);
  const negEnded = findEvent(events, ['negotiation_ended', 'live_unavailable']);
  const execStarted = findEvent(events, ['execution_started']);
  const delivered = findEvent(events, ['delivery_submitted']);
  const paid = findEvent(events, ['payment_escrowed', 'payment_sent']);
  const completed = findEvent(events, ['order_completed']);
  const anchored = findEvent(events, ['onchain_anchor_recorded']);
  const anchorSkippedOrFailed = findEvent(events, ['onchain_anchor_failed', 'onchain_anchor_skipped']);
  const reputationUpdated = findEvent(events, ['reputation_updated']);
  const chosenCandidate = order.candidates.find((c) => c.chosen);

  const stages: ExecutionStage[] = [];

  stages.push({
    key: 'planner',
    label: 'Planner',
    status: 'done',
    timestamp: order.createdAt,
    detail: `Task received: "${order.taskDescription}"`,
  });

  stages.push({
    key: 'discovery',
    label: 'Discovery',
    status: discoveryFailed ? 'error' : discoveryDone ? 'done' : 'active',
    timestamp: (discoveryFailed ?? discoveryDone)?.timestamp,
    detail: (discoveryFailed ?? discoveryDone)?.message ?? 'Ranking candidate agents against live MongoDB data…',
  });

  stages.push({
    key: 'ranking',
    label: 'Candidate Ranking',
    status: discoveryDone ? 'done' : discoveryFailed ? 'error' : 'pending',
    timestamp: discoveryDone?.timestamp,
    detail: order.candidates.length
      ? `${order.candidates.length} candidate(s) ranked. Top pick: "${chosenCandidate?.name}" (${chosenCandidate?.reasoningReport?.confidenceScore ?? chosenCandidate?.matchScore}% confidence).`
      : 'Awaiting discovery results.',
  });

  stages.push({
    key: 'negotiation',
    label: 'Negotiation',
    status: negAccepted ? 'done' : negEnded ? 'warning' : negStarted ? 'active' : 'pending',
    timestamp: (negAccepted ?? negEnded ?? negStarted)?.timestamp,
    detail: (negAccepted ?? negEnded ?? negStarted)?.message ?? 'Not started yet.',
  });

  stages.push({
    key: 'selected',
    label: 'Selected Agent',
    status: chosenCandidate ? 'done' : 'pending',
    timestamp: discoveryDone?.timestamp,
    detail: chosenCandidate ? `"${chosenCandidate.name}" selected as provider (${order.executionMode} mode).` : 'No agent selected yet.',
  });

  stages.push({
    key: 'execution',
    label: 'Execution',
    status: delivered ? 'done' : execStarted ? 'active' : 'pending',
    timestamp: (delivered ?? execStarted)?.timestamp,
    detail: (delivered ?? execStarted)?.message ?? 'Waiting for payment before execution starts.',
  });

  stages.push({
    key: 'settlement',
    label: 'Settlement',
    status: completed ? 'done' : paid ? 'active' : 'pending',
    timestamp: (completed ?? paid)?.timestamp,
    detail:
      (completed ?? paid)?.message ??
      (order.settlement.amountUsdc ? `$${order.settlement.amountUsdc.toFixed(2)} pending escrow.` : 'Awaiting payment escrow.'),
  });

  stages.push({
    key: 'onchain',
    label: 'On-chain Proof',
    status: anchored ? 'done' : anchorSkippedOrFailed ? 'warning' : completed ? 'active' : 'pending',
    timestamp: (anchored ?? anchorSkippedOrFailed)?.timestamp,
    detail: (anchored ?? anchorSkippedOrFailed)?.message ?? 'Anchoring runs after settlement completes.',
    link: order.onchainProof?.explorerUrl,
  });

  stages.push({
    key: 'reputation',
    label: 'Reputation Update',
    status: reputationUpdated ? (reputationUpdated.level === 'warning' ? 'warning' : 'done') : completed ? 'active' : 'pending',
    timestamp: reputationUpdated?.timestamp,
    detail: reputationUpdated?.message ?? 'Pending order outcome.',
  });

  // Attach durations relative to the previous stage's timestamp for stages that completed.
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1];
    const cur = stages[i];
    if (prev.timestamp && cur.timestamp && cur.status !== 'pending') {
      cur.durationLabel = durationLabel(prev.timestamp, cur.timestamp);
    }
  }

  return stages;
}
