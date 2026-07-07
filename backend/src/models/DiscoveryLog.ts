import { Schema, model, Document, Types } from 'mongoose';

/** One row per POST /discovery call - powers the Analytics "discovery trends" chart with real,
 *  accumulating history instead of the in-memory request log (which resets on server restart). */
export interface IDiscoveryLog extends Document {
  requestedBy?: Types.ObjectId;
  taskDescription: string;
  resultCount: number;
  topMatchScore?: number;
  createdAt: Date;
}

const discoveryLogSchema = new Schema<IDiscoveryLog>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    taskDescription: { type: String, required: true },
    resultCount: { type: Number, required: true },
    topMatchScore: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

discoveryLogSchema.index({ createdAt: -1 });

export const DiscoveryLog = model<IDiscoveryLog>('DiscoveryLog', discoveryLogSchema);
