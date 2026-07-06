import mongoose from 'mongoose';
import { Agent } from '../models/Agent';
import { AgentOrder } from '../models/AgentOrder';
import { Transaction } from '../models/Transaction';
import { getCapStatus } from './cap.service';
import { isAgentCommerceChainConfigured } from './chain/orchestrationClient';
import { getRequestLog, getLatencyStats } from '../middleware/requestLogger';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/** Real-data backing for the Developer Console. Every panel here reads live process/DB state -
 *  nothing is fabricated for display purposes. */

const MONGOOSE_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export async function getSystemHealth() {
  const capStatus = await getCapStatus();
  const mem = process.memoryUsage();
  const latency = getLatencyStats();

  return {
    uptimeSeconds: Math.round(process.uptime()),
    nodeEnv: env.nodeEnv,
    mongodb: {
      state: MONGOOSE_STATES[mongoose.connection.readyState] ?? 'unknown',
      database: mongoose.connection.name,
    },
    cap: { configured: capStatus.configured, connected: capStatus.connected, protocolVersion: capStatus.protocolVersion },
    onchainAnchoring: { configured: isAgentCommerceChainConfigured() },
    memory: { rssMb: Math.round(mem.rss / 1024 / 1024), heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024) },
    requestLatency: latency,
  };
}

export function getApiRequestLog() {
  return getRequestLog();
}

const ALLOWED_COLLECTIONS = ['agents', 'orders', 'transactions'] as const;
export type DevConsoleCollection = (typeof ALLOWED_COLLECTIONS)[number];

/** Only exposes collections safe for a demo/judge audience - never `users` (credentials) or
 *  anything with secrets. Bounded to the most recent N documents, read-only. */
export async function getRecentRecords(collection: string, limit = 20) {
  if (!ALLOWED_COLLECTIONS.includes(collection as DevConsoleCollection)) {
    throw AppError.badRequest(`Unknown or disallowed collection "${collection}". Allowed: ${ALLOWED_COLLECTIONS.join(', ')}`);
  }
  const boundedLimit = Math.min(Math.max(limit, 1), 100);

  switch (collection as DevConsoleCollection) {
    case 'agents':
      return Agent.find().sort({ updatedAt: -1 }).limit(boundedLimit).select('-bookmarkedBy');
    case 'orders':
      return AgentOrder.find().sort({ updatedAt: -1 }).limit(boundedLimit);
    case 'transactions':
      return Transaction.find().sort({ updatedAt: -1 }).limit(boundedLimit);
  }
}

/** On-chain anchoring events, sourced from AgentOrder.onchainProof - real transactions already
 *  confirmed on Base Sepolia, not a separate re-query of contract logs. */
export async function getOnchainEvents(limit = 20) {
  const orders = await AgentOrder.find({ onchainProof: { $exists: true } })
    .sort({ 'onchainProof.recordedAt': -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .select('taskDescription onchainProof executionMode status');

  return orders.map((o) => ({
    orderId: o.id,
    taskDescription: o.taskDescription,
    executionMode: o.executionMode,
    status: o.status,
    proof: o.onchainProof,
  }));
}
