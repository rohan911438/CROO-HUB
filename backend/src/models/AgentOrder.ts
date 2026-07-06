import { Schema, model, Document, Types } from 'mongoose';

/**
 * An Agent Commerce order: CROO Hub's own record of one Planner-orchestrated task execution,
 * whether it settled through real CROO Network CAP calls or (today, since the CROO Network has
 * zero registered services network-wide - see CROO_CAP_COMPATIBILITY_REPORT.md §5) through the
 * local simulator. Every state transition is appended to `events` so the frontend can render a
 * full timeline, and every terminal state is persisted immediately so polling clients see
 * progress without needing a socket connection.
 */

export type OrderExecutionMode = 'live' | 'simulated';

export type OrderStatus =
  | 'planning' // Planner is discovering/ranking candidates
  | 'negotiating' // negotiation request sent to the chosen provider
  | 'accepted' // provider accepted, on-chain order created (CAP) / accepted locally (simulated)
  | 'paid' // payment escrowed
  | 'running' // provider is executing the work
  | 'delivering' // provider submitted a deliverable, pending verification
  | 'completed' // terminal: delivered and settled
  | 'rejected' // terminal: provider or requester rejected
  | 'expired' // terminal: SLA/payment deadline passed
  | 'failed' // terminal: unrecoverable error
  | 'cancelled'; // terminal: cancelled by the requester before completion

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['completed', 'rejected', 'expired', 'failed', 'cancelled'];

export interface IOrderEvent {
  timestamp: Date;
  type: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  meta?: Record<string, unknown>;
}

export interface IReasoningFactor {
  label: string;
  detail: string;
  weight: number;
  score: number;
}

export interface IReasoningReport {
  confidenceScore: number;
  factors: IReasoningFactor[];
  workflowCompatible: boolean;
  workflowCompatibilityNote: string;
  summary: string;
}

export interface IOrderCandidate {
  agentId: Types.ObjectId;
  slug: string;
  name: string;
  matchScore: number;
  trustScore: number;
  estimatedCostUsd: number;
  reasoning: string;
  chosen: boolean;
  reasoningReport?: IReasoningReport;
}

export interface IAgentOrder extends Document {
  owner: Types.ObjectId;
  taskDescription: string;
  budget?: number;
  maxLatencyMs?: number;
  executionMode: OrderExecutionMode;
  requestedMode: 'auto' | 'live' | 'simulated';
  targetServiceId?: string;
  status: OrderStatus;
  candidates: IOrderCandidate[];
  selectedAgent?: Types.ObjectId;
  cap: {
    negotiationId?: string;
    orderId?: string;
    chainOrderId?: string;
    serviceId?: string;
    protocolVersion: string;
  };
  settlement: {
    amountUsdc?: number;
    feeUsdc?: number;
    payTxHash?: string;
    deliverTxHash?: string;
    clearTxHash?: string;
  };
  result?: {
    deliverableType: string;
    deliverableText?: string;
    contentHash?: string;
  };
  onchainProof?: {
    network: string;
    contractAddress: string;
    executionId: string;
    txHash: string;
    explorerUrl: string;
    recordedAt: Date;
  };
  events: IOrderEvent[];
  retryCount: number;
  maxRetries: number;
  negotiatedAt?: Date;
  acceptedAt?: Date;
  paidAt?: Date;
  completedAt?: Date;
  latencyMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderEventSchema = new Schema<IOrderEvent>(
  {
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true },
    level: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const reasoningFactorSchema = new Schema<IReasoningFactor>(
  {
    label: { type: String, required: true },
    detail: { type: String, required: true },
    weight: { type: Number, required: true },
    score: { type: Number, required: true },
  },
  { _id: false },
);

const reasoningReportSchema = new Schema<IReasoningReport>(
  {
    confidenceScore: { type: Number, required: true },
    factors: [reasoningFactorSchema],
    workflowCompatible: { type: Boolean, required: true },
    workflowCompatibilityNote: { type: String, required: true },
    summary: { type: String, required: true },
  },
  { _id: false },
);

const orderCandidateSchema = new Schema<IOrderCandidate>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    matchScore: { type: Number, required: true },
    trustScore: { type: Number, required: true },
    estimatedCostUsd: { type: Number, required: true },
    reasoning: { type: String, required: true },
    chosen: { type: Boolean, default: false },
    reasoningReport: { type: reasoningReportSchema },
  },
  { _id: false },
);

const agentOrderSchema = new Schema<IAgentOrder>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskDescription: { type: String, required: true },
    budget: { type: Number },
    maxLatencyMs: { type: Number },
    executionMode: { type: String, enum: ['live', 'simulated'], required: true },
    requestedMode: { type: String, enum: ['auto', 'live', 'simulated'], default: 'auto' },
    targetServiceId: { type: String },
    status: {
      type: String,
      enum: ['planning', 'negotiating', 'accepted', 'paid', 'running', 'delivering', 'completed', 'rejected', 'expired', 'failed', 'cancelled'],
      default: 'planning',
    },
    candidates: [orderCandidateSchema],
    selectedAgent: { type: Schema.Types.ObjectId, ref: 'Agent' },
    cap: {
      negotiationId: { type: String },
      orderId: { type: String },
      chainOrderId: { type: String },
      serviceId: { type: String },
      protocolVersion: { type: String, default: 'CAP v2 (Base mainnet, chain 8453)' },
    },
    settlement: {
      amountUsdc: { type: Number },
      feeUsdc: { type: Number },
      payTxHash: { type: String },
      deliverTxHash: { type: String },
      clearTxHash: { type: String },
    },
    result: {
      deliverableType: { type: String },
      deliverableText: { type: String },
      contentHash: { type: String },
    },
    onchainProof: {
      network: { type: String },
      contractAddress: { type: String },
      executionId: { type: String },
      txHash: { type: String },
      explorerUrl: { type: String },
      recordedAt: { type: Date },
    },
    events: [orderEventSchema],
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 2 },
    negotiatedAt: { type: Date },
    acceptedAt: { type: Date },
    paidAt: { type: Date },
    completedAt: { type: Date },
    latencyMs: { type: Number },
  },
  { timestamps: true },
);

agentOrderSchema.index({ owner: 1, createdAt: -1 });

export const AgentOrder = model<IAgentOrder>('AgentOrder', agentOrderSchema);
