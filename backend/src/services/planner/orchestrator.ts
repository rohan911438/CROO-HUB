import { Agent, IAgent } from '../../models/Agent';
import { IAgentOrder } from '../../models/AgentOrder';
import { DiscoveryMatch } from '../discovery.service';
import { appendEvent } from './orderContext';

/** How many ranked candidates to try before giving up on dispatch. */
export const MAX_DISPATCH_ATTEMPTS = 3;
/** Allow a candidate's estimated cost to drift up to 15% over budget before rejecting it. */
const BUDGET_TOLERANCE = 1.15;

export interface DispatchResult {
  agent: IAgent;
  matchIndex: number;
}

/**
 * Re-validates the Planner's ranked candidates immediately before dispatch and walks down the
 * list (already computed by discovery.service.ts and persisted on order.candidates) if the
 * top pick is no longer viable, instead of trusting the discovery-time snapshot blindly. Mutates
 * the SAME `order` document instance the caller already holds - never re-fetches - so the
 * appendEvent() calls inside this function don't race a second in-memory copy of the order.
 */
export async function selectDispatchCandidate(
  order: IAgentOrder,
  matches: DiscoveryMatch[],
): Promise<DispatchResult | null> {
  const attempts = Math.min(MAX_DISPATCH_ATTEMPTS, matches.length, order.candidates.length);
  let lastFailedName = '';
  let lastFailureReasons: string[] = [];

  for (let i = 0; i < attempts; i++) {
    const match = matches[i];
    const candidateDoc = order.candidates[i];
    const agent = await Agent.findById(match.agentId);
    const reasons: string[] = [];

    if (!agent) {
      reasons.push('agent no longer exists');
    } else {
      if (agent.availability === 'offline') reasons.push('agent went offline before dispatch');
      if (order.budget && match.estimatedCostUsd > order.budget * BUDGET_TOLERANCE) {
        reasons.push('estimated cost now exceeds budget tolerance');
      }
      if (candidateDoc?.reasoningReport?.workflowCompatible === false) {
        reasons.push(candidateDoc.reasoningReport.workflowCompatibilityNote);
      }
    }

    if (agent && reasons.length === 0) {
      if (i > 0) {
        order.candidates.forEach((c, idx) => {
          c.chosen = idx === i;
        });
        order.selectedAgent = agent._id;
        await appendEvent(
          order,
          'candidate_rerouted',
          `"${lastFailedName}" unavailable (${lastFailureReasons.join('; ')}) - rerouted to "${agent.name}".`,
          'warning',
          { fromSlug: order.candidates[i - 1]?.slug, toSlug: match.slug, attempt: i + 1 },
        );
      }
      return { agent, matchIndex: i };
    }

    lastFailedName = match.name;
    lastFailureReasons = reasons;
    await appendEvent(
      order,
      'candidate_validation_failed',
      `"${match.name}" failed pre-dispatch validation: ${reasons.join('; ')}.`,
      'warning',
      { slug: match.slug, reasons },
    );
  }

  return null;
}
