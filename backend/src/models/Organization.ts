import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  logoUrl?: string;
  plan: 'free' | 'pro' | 'scale' | 'enterprise';
  members: Types.ObjectId[];
  seats: number;
  billingEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logoUrl: { type: String },
    plan: { type: String, enum: ['free', 'pro', 'scale', 'enterprise'], default: 'free' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    seats: { type: Number, default: 1 },
    billingEmail: { type: String },
  },
  { timestamps: true },
);

export const Organization = model<IOrganization>('Organization', organizationSchema);
