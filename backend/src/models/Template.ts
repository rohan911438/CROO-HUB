import { Schema, model, Document } from 'mongoose';
import { IWorkflowEdge, IWorkflowNode } from './Workflow';

export interface ITemplate extends Document {
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  usageCount: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    icon: { type: String, default: 'workflow' },
    nodes: [{ type: Schema.Types.Mixed }],
    edges: [{ type: Schema.Types.Mixed }],
    usageCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Template = model<ITemplate>('Template', templateSchema);
