import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'system'
  | 'workflow'
  | 'transaction'
  | 'reputation'
  | 'agent'
  | 'security';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['system', 'workflow', 'transaction', 'reputation', 'agent', 'security'],
      default: 'system',
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true },
);

export const Notification = model<INotification>('Notification', notificationSchema);
