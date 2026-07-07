export type Verification = 'unverified' | 'community' | 'verified' | 'enterprise';
export type Availability = 'online' | 'busy' | 'offline';

export interface AgentPricing {
  model: 'per_call' | 'per_token' | 'subscription' | 'free';
  amount: number;
  currency: string;
  unit?: string;
}

export interface AgentPerformance {
  successRate: number;
  averageLatencyMs: number;
  completedJobs: number;
  uptime: number;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string;
  tagline: string;
  description: string;
  category: string;
  capabilities: string[];
  tools: string[];
  mcpServers: string[];
  supportedProtocols: string[];
  supportedChains: string[];
  supportedWorkflows: string[];
  dependencies: string[];
  pricing: AgentPricing;
  performance: AgentPerformance;
  reputationScore: number;
  verification: Verification;
  availability: Availability;
  version: string;
  versionHistory: { version: string; notes: string; releasedAt: string }[];
  apiEndpoints: { method: string; path: string; description: string }[];
  usageExamples: { title: string; code: string }[];
  featured: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  author: { name: string; avatarUrl: string };
  rating: number;
  title: string;
  body: string;
  helpfulVotes: number;
  createdAt: string;
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

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  agentSlug?: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'saved' | 'archived';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  runCount: number;
  lastRunAt?: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  usageCount: number;
  featured: boolean;
}

export interface Transaction {
  id: string;
  agent: { name: string; avatarUrl: string; slug: string };
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'escrow_hold';
  description: string;
  invoiceNumber: string;
  settlementMethod: 'placeholder_offchain' | 'on_chain_pending' | 'on_chain_settled';
  escrow: { isEscrow: boolean; releaseCondition?: string };
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'system' | 'workflow' | 'transaction' | 'reputation' | 'agent' | 'security';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// --- Agent Commerce / Planner (backend/src/models/AgentOrder.ts) ---

export type OrderStatus =
  | 'planning' | 'negotiating' | 'accepted' | 'paid' | 'running' | 'delivering'
  | 'completed' | 'rejected' | 'expired' | 'failed' | 'cancelled';

export interface OrderEvent {
  timestamp: string;
  type: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  meta?: Record<string, unknown>;
}

export interface ReasoningFactor {
  label: string;
  detail: string;
  weight: number;
  score: number;
}

export interface ReasoningReport {
  confidenceScore: number;
  factors: ReasoningFactor[];
  workflowCompatible: boolean;
  workflowCompatibilityNote: string;
  summary: string;
}

export interface OrderCandidate {
  slug: string;
  name: string;
  avatarUrl?: string;
  matchScore: number;
  trustScore: number;
  estimatedCostUsd: number;
  reasoning: string;
  chosen: boolean;
  reasoningReport?: ReasoningReport;
}

export interface ExecutionPlanStep {
  label: string;
  agentSlug: string;
  estimatedDurationMs: number;
  estimatedCostUsd: number;
}

export interface ExecutionPlan {
  steps: ExecutionPlanStep[];
  totalEstimatedDurationMs: number;
  totalEstimatedCostUsd: number;
  computedAt: string;
}

export interface AgentOrder {
  _id: string;
  taskDescription: string;
  budget?: number;
  executionMode: 'live' | 'simulated';
  requestedMode: 'auto' | 'live' | 'simulated';
  status: OrderStatus;
  candidates: OrderCandidate[];
  executionPlan?: ExecutionPlan;
  cap: { negotiationId?: string; orderId?: string; protocolVersion: string };
  settlement: { amountUsdc?: number; feeUsdc?: number; payTxHash?: string; deliverTxHash?: string; clearTxHash?: string };
  result?: { deliverableType: string; deliverableText?: string; contentHash?: string };
  onchainProof?: { network: string; contractAddress: string; executionId: string; txHash: string; explorerUrl: string; recordedAt: string };
  events: OrderEvent[];
  retryCount: number;
  maxRetries: number;
  latencyMs?: number;
  createdAt: string;
}

export interface ApiKey {
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsedAt?: string;
}
