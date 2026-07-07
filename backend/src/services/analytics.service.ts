import { Agent } from '../models/Agent';
import { Transaction } from '../models/Transaction';
import { Workflow } from '../models/Workflow';
import { AgentOrder, OrderStatus } from '../models/AgentOrder';
import { DiscoveryLog } from '../models/DiscoveryLog';
import { getLatencyStats } from '../middleware/requestLogger';

/** Real-data backing for the Analytics dashboard. Revenue/workflow/order figures are scoped to the
 *  requesting user (matches how transactions/orders/workflows are scoped everywhere else in the
 *  API); category/latency/top-agent figures are marketplace-wide, matching what the page actually
 *  shows ("marketplace activity ... across all agents"). Nothing here is fabricated for display. */

const MONTHS_BACK = 6;
const WEEKS_BACK = 8;
const DAY_MS = 86400000;
const HIRED_STATUSES: OrderStatus[] = ['accepted', 'paid', 'running', 'delivering', 'completed'];

function monthBucket(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(bucket: string): string {
  const [y, m] = bucket.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short' });
}

function weekBucket(date: Date): string {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start.toISOString().slice(0, 10);
}

export async function getAnalyticsOverview(userId: string) {
  const now = new Date();

  const since6mo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1), 1));
  const since8wk = new Date(now.getTime() - WEEKS_BACK * 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);

  const [transactions, agents, workflows, orders, discoveryLogs, discoveryQueries30d] = await Promise.all([
    Transaction.find({ initiator: userId, createdAt: { $gte: since6mo } }).select('amount status createdAt'),
    Agent.find().select('category name performance'),
    Workflow.find({ owner: userId }).select('runCount'),
    AgentOrder.find({ owner: userId, createdAt: { $gte: since8wk } }).select('createdAt status'),
    DiscoveryLog.find({ createdAt: { $gte: since8wk } }).select('createdAt'),
    DiscoveryLog.countDocuments({ createdAt: { $gte: since30d } }),
  ]);

  const monthBuckets: string[] = [];
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    monthBuckets.push(monthBucket(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  const revenueByBucket = new Map(monthBuckets.map((b) => [b, 0]));
  let revenueProcessed = 0;
  for (const tx of transactions) {
    if (tx.status !== 'completed') continue;
    revenueProcessed += tx.amount;
    const b = monthBucket(tx.createdAt);
    if (revenueByBucket.has(b)) revenueByBucket.set(b, (revenueByBucket.get(b) ?? 0) + tx.amount);
  }
  const revenueTrend = monthBuckets.map((b) => ({
    month: monthLabel(b),
    revenue: Math.round((revenueByBucket.get(b) ?? 0) * 100) / 100,
  }));

  const categoryStats = new Map<string, { jobs: number; latencySum: number; count: number }>();
  for (const a of agents) {
    const s = categoryStats.get(a.category) ?? { jobs: 0, latencySum: 0, count: 0 };
    s.jobs += a.performance.completedJobs;
    s.latencySum += a.performance.averageLatencyMs;
    s.count += 1;
    categoryStats.set(a.category, s);
  }
  const categoryUsage = [...categoryStats.entries()].map(([category, s]) => ({ category, jobs: s.jobs }));
  const latencyByCategory = [...categoryStats.entries()].map(([category, s]) => ({
    category,
    latency: Math.round(s.latencySum / s.count),
  }));

  const topAgents = [...agents]
    .sort((a, b) => b.performance.completedJobs - a.performance.completedJobs)
    .slice(0, 5)
    .map((a) => ({ id: a.id, name: a.name, completedJobs: a.performance.completedJobs }));

  const weekBuckets: string[] = [];
  for (let i = WEEKS_BACK - 1; i >= 0; i--) {
    weekBuckets.push(weekBucket(new Date(now.getTime() - i * 7 * DAY_MS)));
  }
  const queriesMap = new Map(weekBuckets.map((w) => [w, 0]));
  for (const log of discoveryLogs) {
    const w = weekBucket(log.createdAt);
    if (queriesMap.has(w)) queriesMap.set(w, (queriesMap.get(w) ?? 0) + 1);
  }
  const hiresMap = new Map(weekBuckets.map((w) => [w, 0]));
  for (const o of orders) {
    if (!HIRED_STATUSES.includes(o.status)) continue;
    const w = weekBucket(o.createdAt);
    if (hiresMap.has(w)) hiresMap.set(w, (hiresMap.get(w) ?? 0) + 1);
  }
  const discoveryTrends = weekBuckets.map((w, i) => ({
    week: `W${i + 1}`,
    queries: queriesMap.get(w) ?? 0,
    hires: hiresMap.get(w) ?? 0,
  }));

  const workflowExecutions = workflows.reduce((sum, w) => sum + w.runCount, 0);
  const avgAgentLatencyMs = agents.length
    ? Math.round(agents.reduce((s, a) => s + a.performance.averageLatencyMs, 0) / agents.length)
    : 0;

  return {
    stats: {
      discoveryQueries30d,
      workflowExecutions,
      revenueProcessed: Math.round(revenueProcessed * 100) / 100,
      avgAgentLatencyMs,
      apiLatency: getLatencyStats(),
    },
    revenueTrend,
    categoryUsage,
    latencyByCategory,
    discoveryTrends,
    topAgents,
  };
}
