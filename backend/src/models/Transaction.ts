import { Schema, model, Document, Types } from 'mongoose';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'escrow_hold';

export interface ITransaction extends Document {
  organization?: Types.ObjectId;
  initiator: Types.ObjectId;
  agent: Types.ObjectId;
  workflow?: Types.ObjectId;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  invoiceNumber: string;
  settlementMethod: 'placeholder_offchain' | 'on_chain_pending' | 'cap_settled';
  escrow: {
    isEscrow: boolean;
    releaseCondition?: string;
    heldAt?: Date;
    releasedAt?: Date;
  };
  chainMeta?: {
    note: string;
  };
  /** Populated when settlementMethod is 'cap_settled' - see CROO_CAP_COMPATIBILITY_REPORT.md */
  capMeta?: {
    orderId: string;
    negotiationId?: string;
    chainOrderId?: string;
    status: string;
    payTxHash?: string;
    deliverTxHash?: string;
    clearTxHash?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    initiator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    workflow: { type: Schema.Types.ObjectId, ref: 'Workflow' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USDC' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'escrow_hold'],
      default: 'pending',
    },
    description: { type: String, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    settlementMethod: {
      type: String,
      enum: ['placeholder_offchain', 'on_chain_pending', 'cap_settled'],
      default: 'placeholder_offchain',
    },
    escrow: {
      isEscrow: { type: Boolean, default: false },
      releaseCondition: { type: String },
      heldAt: { type: Date },
      releasedAt: { type: Date },
    },
    chainMeta: {
      note: {
        type: String,
        default: 'Blockchain settlement will be connected via CROO CAP in a future release.',
      },
    },
    capMeta: {
      orderId: { type: String },
      negotiationId: { type: String },
      chainOrderId: { type: String },
      status: { type: String },
      payTxHash: { type: String },
      deliverTxHash: { type: String },
      clearTxHash: { type: String },
    },
  },
  { timestamps: true },
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
