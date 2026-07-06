import { EventType, type EventStream, type Order } from '@croo-network/sdk';
import { env } from '../../config/env';
import { getCapClient, isCapConfigured } from './capClient';
import { Agent } from '../../models/Agent';
import { Transaction, TransactionStatus } from '../../models/Transaction';

/**
 * Mirrors CAP order lifecycle events into our own Transaction collection so the CROO Hub
 * dashboard shows a unified view of revenue regardless of which rail (our own EscrowCommerce
 * contract vs. CROO's CAP) actually settled the payment. This is a read-side sync only - it
 * never calls payOrder/deliverOrder/etc; CROO Hub does not act as a CAP provider or requester
 * on anyone's behalf here, it just listens and records.
 *
 * Only orders whose providerAgentId matches a CROO-Hub agent that has been linked via
 * POST /cap/agents/:slug/link are recorded - unrelated CAP network activity is ignored.
 */

let activeStream: EventStream | null = null;

const CAP_STATUS_MAP: Record<string, TransactionStatus> = {
  creating: 'pending',
  created: 'pending',
  paying: 'pending',
  paid: 'escrow_hold',
  delivering: 'escrow_hold',
  completed: 'completed',
  rejecting: 'refunded',
  rejected: 'refunded',
  expired: 'refunded',
  create_failed: 'failed',
  pay_failed: 'failed',
  deliver_failed: 'failed',
};

function mapCapStatus(status: string): TransactionStatus {
  return CAP_STATUS_MAP[status] ?? 'pending';
}

async function syncOrder(order: Order): Promise<void> {
  const localAgent = await Agent.findOne({ crooAgentId: order.providerAgentId });
  if (!localAgent) return; // not one of our synced agents - ignore

  const priceUsdc = Number(order.price || '0') / 1e6;

  await Transaction.findOneAndUpdate(
    { 'capMeta.orderId': order.orderId },
    {
      $set: {
        agent: localAgent._id,
        initiator: localAgent.owner,
        amount: priceUsdc,
        currency: 'USDC',
        description: `CROO Agent Store order for ${localAgent.name}`,
        invoiceNumber: `CAP-${order.orderId}`,
        settlementMethod: 'cap_settled',
        status: mapCapStatus(order.status),
        escrow: {
          isEscrow: true,
          releaseCondition: 'CAP: CAPVault releases on verified delivery',
          heldAt: order.paidAt ? new Date(order.paidAt) : undefined,
          releasedAt: order.deliveredAt ? new Date(order.deliveredAt) : undefined,
        },
        capMeta: {
          orderId: order.orderId,
          negotiationId: order.negotiationId,
          chainOrderId: order.chainOrderId,
          status: order.status,
          payTxHash: order.payTxHash || undefined,
          deliverTxHash: order.deliverTxHash || undefined,
          clearTxHash: order.clearTxHash || undefined,
        },
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

async function handleOrderEvent(orderId?: string): Promise<void> {
  if (!orderId) return;
  try {
    const order = await getCapClient().getOrder(orderId);
    await syncOrder(order);
  } catch (err) {
    console.error(`[cap] failed to sync order ${orderId}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Starts the CAP WebSocket listener. Never throws - a misconfigured or unreachable CROO API
 * must not prevent the rest of CROO Hub's backend from starting.
 */
export async function startCapEventListener(): Promise<void> {
  if (!isCapConfigured()) {
    console.log('[cap] CROO_SDK_KEY not set - CAP event listener disabled');
    return;
  }

  try {
    const client = getCapClient();
    const stream = await client.connectWebSocket();
    activeStream = stream;

    stream.on(EventType.OrderPaid, (e) => void handleOrderEvent(e.order_id));
    stream.on(EventType.OrderCompleted, (e) => void handleOrderEvent(e.order_id));
    stream.on(EventType.OrderRejected, (e) => void handleOrderEvent(e.order_id));
    stream.on(EventType.OrderExpired, (e) => void handleOrderEvent(e.order_id));
    stream.onAny((e) => console.log(`[cap] event received: ${e.type}`));

    console.log(`[cap] WebSocket listener connected to ${env.croo.wsUrl}`);
  } catch (err) {
    console.error('[cap] failed to start WebSocket listener:', err instanceof Error ? err.message : err);
  }
}

export function stopCapEventListener(): void {
  activeStream?.close();
  activeStream = null;
}
