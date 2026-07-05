import { Schema, model, Document, Types } from 'mongoose';

export interface ISetting extends Document {
  user: Types.ObjectId;
  appearance: {
    theme: 'dark' | 'light' | 'system';
    accentColor: string;
    density: 'comfortable' | 'compact';
  };
  notifications: {
    email: boolean;
    push: boolean;
    workflowAlerts: boolean;
    transactionAlerts: boolean;
    weeklyDigest: boolean;
  };
  apiSettings: {
    apiKeys: { name: string; keyPreview: string; createdAt: Date; lastUsedAt?: Date }[];
    webhookUrl?: string;
  };
  security: {
    twoFactorEnabled: boolean;
    sessions: { device: string; location: string; lastActiveAt: Date }[];
  };
  connectedServices: { name: string; connected: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    appearance: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      accentColor: { type: String, default: 'violet' },
      density: { type: String, enum: ['comfortable', 'compact'], default: 'comfortable' },
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      workflowAlerts: { type: Boolean, default: true },
      transactionAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
    },
    apiSettings: {
      apiKeys: [
        {
          name: String,
          keyPreview: String,
          createdAt: { type: Date, default: Date.now },
          lastUsedAt: Date,
        },
      ],
      webhookUrl: { type: String },
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      sessions: [
        {
          device: String,
          location: String,
          lastActiveAt: Date,
        },
      ],
    },
    connectedServices: [
      {
        name: String,
        connected: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

export const Setting = model<ISetting>('Setting', settingSchema);
