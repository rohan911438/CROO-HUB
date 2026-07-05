import { Schema, model, Document, Types } from 'mongoose';

export interface IAgentPricing {
  model: 'per_call' | 'per_token' | 'subscription' | 'free';
  amount: number;
  currency: string;
  unit?: string;
}

export interface IAgentPerformance {
  successRate: number;
  averageLatencyMs: number;
  completedJobs: number;
  uptime: number;
}

export interface IAgent extends Document {
  owner: Types.ObjectId;
  name: string;
  slug: string;
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
  pricing: IAgentPricing;
  performance: IAgentPerformance;
  reputationScore: number;
  verification: 'unverified' | 'community' | 'verified' | 'enterprise';
  availability: 'online' | 'busy' | 'offline';
  version: string;
  versionHistory: { version: string; notes: string; releasedAt: Date }[];
  apiEndpoints: { method: string; path: string; description: string }[];
  usageExamples: { title: string; code: string }[];
  bookmarkedBy: Types.ObjectId[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    avatarUrl: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    capabilities: [{ type: String }],
    tools: [{ type: String }],
    mcpServers: [{ type: String }],
    supportedProtocols: [{ type: String }],
    supportedChains: [{ type: String }],
    supportedWorkflows: [{ type: String }],
    dependencies: [{ type: String }],
    pricing: {
      model: { type: String, enum: ['per_call', 'per_token', 'subscription', 'free'], default: 'per_call' },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USDC' },
      unit: { type: String },
    },
    performance: {
      successRate: { type: Number, default: 0 },
      averageLatencyMs: { type: Number, default: 0 },
      completedJobs: { type: Number, default: 0 },
      uptime: { type: Number, default: 99.9 },
    },
    reputationScore: { type: Number, default: 0 },
    verification: {
      type: String,
      enum: ['unverified', 'community', 'verified', 'enterprise'],
      default: 'community',
    },
    availability: { type: String, enum: ['online', 'busy', 'offline'], default: 'online' },
    version: { type: String, default: '1.0.0' },
    versionHistory: [
      {
        version: String,
        notes: String,
        releasedAt: Date,
      },
    ],
    apiEndpoints: [
      {
        method: String,
        path: String,
        description: String,
      },
    ],
    usageExamples: [
      {
        title: String,
        code: String,
      },
    ],
    bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

agentSchema.index({ name: 'text', description: 'text', tagline: 'text', capabilities: 'text' });

export const Agent = model<IAgent>('Agent', agentSchema);
