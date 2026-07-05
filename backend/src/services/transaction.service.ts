import { Transaction } from '../models/Transaction';
import { Agent } from '../models/Agent';
import { AppError } from '../utils/AppError';

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
}

export async function listTransactions(initiator: string, status?: string) {
  const filter: Record<string, unknown> = { initiator };
  if (status) filter.status = status;
  return Transaction.find(filter).populate('agent', 'name avatarUrl slug').sort({ createdAt: -1 });
}

/**
 * Placeholder settlement service. Creates a transaction record with
 * settlementMethod = 'placeholder_offchain'. Once CROO CAP / on-chain
 * settlement is available, this becomes the integration seam.
 */
export async function createMockTransaction(input: {
  initiator: string;
  agentSlug: string;
  amount: number;
  description: string;
  isEscrow?: boolean;
}) {
  const agent = await Agent.findOne({ slug: input.agentSlug });
  if (!agent) throw AppError.notFound('Agent not found');

  return Transaction.create({
    initiator: input.initiator,
    agent: agent._id,
    amount: input.amount,
    description: input.description,
    invoiceNumber: generateInvoiceNumber(),
    status: input.isEscrow ? 'escrow_hold' : 'processing',
    escrow: {
      isEscrow: !!input.isEscrow,
      releaseCondition: input.isEscrow ? 'Job completion confirmed by initiator' : undefined,
      heldAt: input.isEscrow ? new Date() : undefined,
    },
  });
}

export async function markTransactionCompleted(id: string, initiator: string) {
  const tx = await Transaction.findOne({ _id: id, initiator });
  if (!tx) throw AppError.notFound('Transaction not found');
  tx.status = 'completed';
  if (tx.escrow.isEscrow) tx.escrow.releasedAt = new Date();
  await tx.save();
  return tx;
}
