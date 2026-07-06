import { IAgentOrder, OrderStatus, IOrderEvent } from '../../models/AgentOrder';

/** Small helpers shared by both executors so every state transition is logged and persisted the
 *  same way, regardless of which adapter (live/simulated) is driving the order. */

export async function appendEvent(
  order: IAgentOrder,
  type: string,
  message: string,
  level: IOrderEvent['level'] = 'info',
  meta?: Record<string, unknown>,
): Promise<void> {
  order.events.push({ timestamp: new Date(), type, level, message, meta });
  await order.save();
}

export async function setStatus(
  order: IAgentOrder,
  status: OrderStatus,
  extra: Partial<IAgentOrder> = {},
): Promise<void> {
  order.status = status;
  Object.assign(order, extra);
  await order.save();
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
