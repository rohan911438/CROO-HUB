import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  agent: Types.ObjectId;
  author: Types.ObjectId;
  rating: number;
  title: string;
  body: string;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    helpfulVotes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Review = model<IReview>('Review', reviewSchema);
