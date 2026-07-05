import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkflowNode {
  id: string;
  type: string;
  label: string;
  agentSlug?: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface IWorkflow extends Document {
  owner: Types.ObjectId;
  organization?: Types.ObjectId;
  name: string;
  description: string;
  status: 'draft' | 'saved' | 'archived';
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  templateSource?: Types.ObjectId;
  lastRunAt?: Date;
  runCount: number;
  executionLogs: { timestamp: Date; level: string; message: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const nodeSchema = new Schema<IWorkflowNode>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    agentSlug: { type: String },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const edgeSchema = new Schema<IWorkflowEdge>(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    animated: { type: Boolean, default: true },
  },
  { _id: false },
);

const workflowSchema = new Schema<IWorkflow>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'saved', 'archived'], default: 'draft' },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    templateSource: { type: Schema.Types.ObjectId, ref: 'Template' },
    lastRunAt: { type: Date },
    runCount: { type: Number, default: 0 },
    executionLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        level: { type: String, default: 'info' },
        message: String,
      },
    ],
  },
  { timestamps: true },
);

export const Workflow = model<IWorkflow>('Workflow', workflowSchema);
