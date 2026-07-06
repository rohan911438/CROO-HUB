import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { AgentOrder, IAgentOrder, OrderExecutionMode, TERMINAL_ORDER_STATUSES } from '../models/AgentOrder';
import { Agent, IAgent } from '../models/Agent';
import { discoverAgents } from './discovery.service';
import { appendEvent, setStatus } from './planner/orderContext';
import { runSimulatedExecution } from './planner/simulatedExecutor';
import { runLiveExecution, LiveExecutionUnavailable } from './planner/liveExecutor';
import { recordOrderOutcome } from './reputationAnalytics.service';
import {
  anchorExecution,
  getAnchorSignerAddress,
  isAgentCommerceChainConfigured,
  OnchainExecutionStatus,
} from './chain/orchestrationClient';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * The Planner Agent: coordinates, never executes directly. Given a task, it (1) ranks candidate
 * CROO-Hub agents via the existing Discovery Engine (services/discovery.service.ts - unchanged),
 * (2) hands the chosen candidate to whichever CAP executor adapter applies (live vs simulated -
 * see services/planner/{live,simulated}Executor.ts), and (3) records the outcome into MongoDB and
 * (best-effort) as an on-chain proof. The Planner itself never talks to CAP or the chain directly
 * - that isolation is the point, so either side can change without touching this file.
 */

export interface CreateOrderInput {
  ownerId: string;
  taskDescription: string;
  budget?: number;
  maxLatencyMs?: number;
  requestedMode?: 'auto' | 'live' | 'simulated';
  targetServiceId?: string;
}

function decideExecutionMode(input: CreateOrderInput): OrderExecutionMode {
  if (input.requestedMode === 'simulated') return 'simulated';
  if (input.requestedMode === 'live') return 'live';
  // auto: only attempt live if the caller supplied a real service id to target - CAP has no
  // discovery API, so there is nothing to attempt live execution against otherwise.
  return input.targetServiceId ? 'live' : 'simulated';
}

export async function createOrder(input: CreateOrderInput): Promise<IAgentOrder> {
  const executionMode = decideExecutionMode(input);

  const order = await AgentOrder.create({
    owner: input.ownerId,
    taskDescription: input.taskDescription,
    budget: input.budget,
    maxLatencyMs: input.maxLatencyMs,
    executionMode,
    requestedMode: input.requestedMode ?? 'auto',
    targetServiceId: input.targetServiceId,
    status: 'planning',
    events: [
      {
        timestamp: new Date(),
        type: 'order_created',
        level: 'info',
        message: `Planner received task in ${executionMode} mode: "${input.taskDescription}"`,
      },
    ],
  });

  void runOrder(order.id);
  return order;
}

async function runOrder(orderId: string): Promise<void> {
  const order = await AgentOrder.findById(orderId);
  if (!order) return;

  try {
    const matches = await discoverAgents({
      taskDescription: order.taskDescription,
      budget: order.budget,
      maxLatencyMs: order.maxLatencyMs,
    });

    if (matches.length === 0) {
      await appendEvent(order, 'discovery_failed', 'No CROO-Hub agents matched this task.', 'error');
      await setStatus(order, 'failed');
      return;
    }

    order.candidates = matches.map((m, i) => ({
      agentId: new Types.ObjectId(m.agentId),
      slug: m.slug,
      name: m.name,
      matchScore: m.matchScore,
      trustScore: m.trustScore,
      estimatedCostUsd: m.estimatedCostUsd,
      reasoning: m.reasoning,
      chosen: i === 0,
    }));
    order.selectedAgent = new Types.ObjectId(matches[0].agentId);
    await order.save();
    await appendEvent(
      order,
      'discovery_completed',
      `Found ${matches.length} candidate agent(s); selected "${matches[0].name}" (${matches[0].matchScore}% match) - ${matches[0].reasoning}`,
      'success',
      { candidates: matches.map((m) => ({ slug: m.slug, matchScore: m.matchScore })) },
    );

    const provider = await Agent.findById(matches[0].agentId);
    if (!provider) throw new Error('Selected candidate agent no longer exists');

    if (order.executionMode === 'live') {
      try {
        await runLiveExecution(order);
      } catch (err) {
        if (err instanceof LiveExecutionUnavailable) {
          await appendEvent(
            order,
            'live_unavailable',
            `Live CAP execution unavailable (${err.message}). Falling back to simulated mode for this order.`,
            'warning',
          );
          order.executionMode = 'simulated';
          await order.save();
          await runSimulatedExecution(order, provider);
        } else {
          throw err;
        }
      }
    } else {
      await runSimulatedExecution(order, provider);
    }

    const finalOrder = await AgentOrder.findById(orderId);
    if (!finalOrder) return;

    if (finalOrder.status === 'completed') {
      await recordOrderOutcome(provider, true, finalOrder.latencyMs ?? 0);
      await tryAnchorExecution(finalOrder);
    } else if (finalOrder.status === 'rejected' || finalOrder.status === 'expired') {
      await recordOrderOutcome(provider, false, finalOrder.latencyMs ?? 0);
    }
  } catch (err) {
    console.error('[planner] order failed', orderId, err);
    const failed = await AgentOrder.findById(orderId);
    if (failed) {
      await appendEvent(failed, 'execution_error', err instanceof Error ? err.message : 'Unknown error', 'error');
      await setStatus(failed, 'failed');
    }
  }
}

/**
 * Best-effort on-chain anchoring via the already-deployed OrchestrationMetadata contract (Base
 * Sepolia). Never throws to its caller - failing to anchor must never fail the underlying order,
 * which has already completed successfully by the time this runs.
 *
 * Limitation: OrchestrationMetadata.recordExecution's `participatingAgents` field expects real
 * EVM addresses, but CROO Hub's MongoDB Users/Agents have no linked wallet address in this build.
 * Rather than fabricate one, every anchored execution records CROO Hub's own signer address as
 * the sole participant - an honest "the Planner recorded this" proof, not a claim that a
 * specific end-user wallet participated on-chain.
 */
async function tryAnchorExecution(order: IAgentOrder): Promise<void> {
  if (!isAgentCommerceChainConfigured()) {
    await appendEvent(order, 'onchain_anchor_skipped', 'On-chain anchoring is not configured on this deployment.', 'warning');
    return;
  }

  try {
    const workflowRef = `0x${createHash('sha256').update(order.id).digest('hex')}`;
    const executionProofHash = `0x${createHash('sha256').update(JSON.stringify(order.events)).digest('hex')}`;
    const completionHash = order.result?.contentHash ?? workflowRef;

    const result = await anchorExecution({
      workflowRef,
      participatingAgents: [getAnchorSignerAddress()],
      agentIds: [],
      executionProofHash,
      completionHash,
      version: '1.0.0',
      startedAt: Math.floor(order.createdAt.getTime() / 1000),
      completedAt: Math.floor((order.completedAt ?? new Date()).getTime() / 1000),
      status: OnchainExecutionStatus.Completed,
    });

    order.onchainProof = {
      network: 'Base Sepolia',
      contractAddress: env.agentCommerceChain.orchestrationMetadataAddress,
      executionId: result.executionId,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      recordedAt: new Date(),
    };
    await order.save();
    await appendEvent(
      order,
      'onchain_anchor_recorded',
      `Execution proof anchored on Base Sepolia (executionId ${result.executionId}, tx ${result.txHash}).`,
      'success',
      { executionId: result.executionId, txHash: result.txHash },
    );
  } catch (err) {
    await appendEvent(
      order,
      'onchain_anchor_failed',
      `On-chain anchoring failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      'warning',
    );
  }
}

export async function listOrders(ownerId: string, status?: string) {
  const filter: Record<string, unknown> = { owner: ownerId };
  if (status) filter.status = status;
  return AgentOrder.find(filter).sort({ createdAt: -1 }).limit(100);
}

export async function getOrder(orderId: string, ownerId: string) {
  const order = await AgentOrder.findOne({ _id: orderId, owner: ownerId });
  if (!order) throw AppError.notFound('Order not found');
  return order;
}

export async function retryOrder(orderId: string, ownerId: string) {
  const order = await AgentOrder.findOne({ _id: orderId, owner: ownerId });
  if (!order) throw AppError.notFound('Order not found');
  if (order.status === 'completed' || !TERMINAL_ORDER_STATUSES.includes(order.status)) {
    throw AppError.badRequest('Only failed, rejected, expired, or cancelled orders can be retried');
  }
  if (order.retryCount >= order.maxRetries) {
    throw AppError.badRequest(`Max retries (${order.maxRetries}) exceeded for this order`);
  }

  order.retryCount += 1;
  order.status = 'planning';
  await appendEvent(order, 'retry_started', `Retry ${order.retryCount}/${order.maxRetries} initiated by requester.`);

  void runOrder(order.id);
  return order;
}

export async function cancelOrder(orderId: string, ownerId: string) {
  const order = await AgentOrder.findOne({ _id: orderId, owner: ownerId });
  if (!order) throw AppError.notFound('Order not found');
  if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
    throw AppError.badRequest('Order has already finished and cannot be cancelled');
  }
  await appendEvent(order, 'cancelled', 'Order cancelled by requester.', 'warning');
  await setStatus(order, 'cancelled');
  return order;
}
