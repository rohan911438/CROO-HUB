import { randomBytes, createHash } from 'crypto';
import { IAgentOrder } from '../../models/AgentOrder';
import { IAgent } from '../../models/Agent';
import { appendEvent, setStatus, wait } from './orderContext';

/**
 * Drives an order through a realistic CAP-shaped lifecycle entirely locally. Used whenever there
 * is no real counterparty/service to negotiate against on CROO Network - which, as of this
 * integration, is *always* the case, since the entire network has zero registered services (see
 * CROO_CAP_COMPATIBILITY_REPORT.md §5). Every event and field is labeled so nothing here can be
 * mistaken for genuine CAP network activity; the "sim_" prefix on all fabricated ids makes this
 * unambiguous even outside the UI.
 */

function fakeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

const STEP_DELAY_MS = 900;

export async function runSimulatedExecution(order: IAgentOrder, provider: IAgent): Promise<void> {
  await appendEvent(
    order,
    'negotiation_started',
    `Simulated negotiation opened with "${provider.name}" (no real CROO Network service available to target - see compatibility report).`,
    'info',
  );
  await setStatus(order, 'negotiating', {
    cap: { ...order.cap, negotiationId: fakeId('sim_neg') },
  } as Partial<IAgentOrder>);

  await wait(STEP_DELAY_MS);
  await appendEvent(order, 'negotiation_accepted', `"${provider.name}" accepted the simulated negotiation.`, 'success');
  await setStatus(order, 'accepted', {
    acceptedAt: new Date(),
    cap: { ...order.cap, orderId: fakeId('sim_ord') },
  } as Partial<IAgentOrder>);

  await wait(STEP_DELAY_MS);
  const amountUsdc = order.budget ?? provider.pricing.amount ?? 1;
  await appendEvent(order, 'payment_escrowed', `Payment of $${amountUsdc.toFixed(2)} escrowed (simulated CAPVault lock).`, 'success');
  await setStatus(order, 'paid', {
    paidAt: new Date(),
    settlement: { ...order.settlement, amountUsdc, payTxHash: fakeId('sim_tx') },
  } as Partial<IAgentOrder>);

  await wait(STEP_DELAY_MS);
  await appendEvent(order, 'execution_started', `"${provider.name}" is executing the task.`, 'info');
  await setStatus(order, 'running');

  await wait(STEP_DELAY_MS * 1.3);
  const deliverableText = JSON.stringify({
    task: order.taskDescription,
    performedBy: provider.name,
    result: `Simulated deliverable for: ${order.taskDescription}`,
    generatedAt: new Date().toISOString(),
  });
  const contentHash = `0x${createHash('sha256').update(deliverableText).digest('hex')}`;
  await appendEvent(order, 'delivery_submitted', `"${provider.name}" submitted a deliverable for verification.`, 'info');
  await setStatus(order, 'delivering', {
    result: { deliverableType: 'schema', deliverableText, contentHash },
  } as Partial<IAgentOrder>);

  await wait(STEP_DELAY_MS * 0.6);
  const completedAt = new Date();
  await appendEvent(order, 'order_completed', 'Delivery verified and settlement cleared (simulated).', 'success');
  await setStatus(order, 'completed', {
    completedAt,
    latencyMs: completedAt.getTime() - order.createdAt.getTime(),
    settlement: {
      ...order.settlement,
      feeUsdc: Number((amountUsdc * 0.03).toFixed(2)),
      deliverTxHash: fakeId('sim_tx'),
      clearTxHash: fakeId('sim_tx'),
    },
  } as Partial<IAgentOrder>);
}
