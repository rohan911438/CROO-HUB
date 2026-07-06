import { isNotFound } from '@croo-network/sdk';
import { IAgentOrder } from '../../models/AgentOrder';
import { getCapClient } from '../cap/capClient';
import { appendEvent, setStatus, wait } from './orderContext';

/**
 * Drives an order through the REAL CAP SDK as a requester, targeting a real `serviceId` supplied
 * by the caller (there is no discovery/search API to find one automatically - see
 * CROO_CAP_COMPATIBILITY_REPORT.md §1/§5). This path requires an independently operated CROO
 * Agent actively listening for negotiations on that service; as of this integration the entire
 * CROO Network has zero registered services, so this code is implemented against the documented
 * SDK contract but has not been exercised against a live counterparty. It fails loudly and
 * quickly (bounded polling, no infinite waits) rather than hanging a demo.
 */

const POLL_INTERVAL_MS = 3000;
const NEGOTIATION_TIMEOUT_MS = 45_000;
const ORDER_TIMEOUT_MS = 60_000;

export class LiveExecutionUnavailable extends Error {}

export async function runLiveExecution(order: IAgentOrder): Promise<void> {
  if (!order.targetServiceId) {
    throw new LiveExecutionUnavailable(
      'No targetServiceId supplied - CAP has no service discovery API, so a real CROO Network service id must be provided explicitly to attempt live execution.',
    );
  }

  const client = getCapClient();

  await appendEvent(order, 'negotiation_started', `Sending a real CAP negotiation for service ${order.targetServiceId}.`);
  let negotiation;
  try {
    negotiation = await client.negotiateOrder({
      serviceId: order.targetServiceId,
      requirements: order.taskDescription,
    });
  } catch (err) {
    if (isNotFound(err)) {
      throw new LiveExecutionUnavailable(`Service ${order.targetServiceId} was not found on CROO Network.`);
    }
    throw err;
  }

  await setStatus(order, 'negotiating', {
    cap: { ...order.cap, negotiationId: negotiation.negotiationId },
  } as Partial<IAgentOrder>);

  const negotiationDeadline = Date.now() + NEGOTIATION_TIMEOUT_MS;
  let accepted = false;
  while (Date.now() < negotiationDeadline) {
    const current = await client.getNegotiation(negotiation.negotiationId);
    if (current.status === 'accepted') {
      accepted = true;
      break;
    }
    if (current.status === 'rejected' || current.status === 'expired') {
      await appendEvent(order, 'negotiation_ended', `Negotiation ${current.status} by the provider.`, 'warning');
      await setStatus(order, current.status === 'rejected' ? 'rejected' : 'expired');
      return;
    }
    await wait(POLL_INTERVAL_MS);
  }

  if (!accepted) {
    throw new LiveExecutionUnavailable(
      `No provider accepted the negotiation within ${NEGOTIATION_TIMEOUT_MS / 1000}s. Live CAP execution requires an active counterparty agent listening for orders on this service.`,
    );
  }

  await appendEvent(order, 'negotiation_accepted', 'Provider accepted the negotiation on-chain.', 'success');
  await setStatus(order, 'accepted', { acceptedAt: new Date() } as Partial<IAgentOrder>);

  const orders = await client.listOrders({ role: 'buyer' });
  const matched = orders.find((o) => o.negotiationId === negotiation.negotiationId);
  if (!matched) {
    throw new LiveExecutionUnavailable('Provider accepted the negotiation but no matching order was found via listOrders.');
  }

  await setStatus(order, order.status, {
    cap: { ...order.cap, orderId: matched.orderId, chainOrderId: matched.chainOrderId },
  } as Partial<IAgentOrder>);

  const payResult = await client.payOrder(matched.orderId);
  await appendEvent(order, 'payment_sent', `Payment tx submitted: ${payResult.txHash}`, 'success');
  await setStatus(order, 'paid', {
    paidAt: new Date(),
    settlement: { ...order.settlement, payTxHash: payResult.txHash, amountUsdc: Number(matched.price) / 1e6 },
  } as Partial<IAgentOrder>);

  const orderDeadline = Date.now() + ORDER_TIMEOUT_MS;
  while (Date.now() < orderDeadline) {
    const current = await client.getOrder(matched.orderId);
    if (current.status === 'completed') {
      const delivery = await client.getDelivery(matched.orderId);
      const completedAt = new Date();
      await appendEvent(order, 'order_completed', 'Delivery verified and settlement cleared on-chain.', 'success');
      await setStatus(order, 'completed', {
        completedAt,
        latencyMs: completedAt.getTime() - order.createdAt.getTime(),
        result: {
          deliverableType: delivery.deliverableType,
          deliverableText: delivery.deliverableText,
          contentHash: delivery.contentHash,
        },
        settlement: {
          ...order.settlement,
          deliverTxHash: current.deliverTxHash || undefined,
          clearTxHash: current.clearTxHash || undefined,
          feeUsdc: current.feeAmount ? Number(current.feeAmount) / 1e6 : undefined,
        },
      } as Partial<IAgentOrder>);
      return;
    }
    if (current.status === 'rejected' || current.status === 'expired') {
      await appendEvent(order, 'order_ended', `Order ${current.status}.`, 'warning');
      await setStatus(order, current.status === 'rejected' ? 'rejected' : 'expired');
      return;
    }
    await wait(POLL_INTERVAL_MS);
  }

  throw new LiveExecutionUnavailable(`Order did not complete within ${ORDER_TIMEOUT_MS / 1000}s.`);
}
