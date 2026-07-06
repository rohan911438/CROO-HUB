import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    taskDescription: z.string().min(3).max(2000),
    budget: z.coerce.number().positive().optional(),
    maxLatencyMs: z.coerce.number().positive().optional(),
    requestedMode: z.enum(['auto', 'live', 'simulated']).optional(),
    targetServiceId: z.string().min(1).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listOrdersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({ status: z.string().optional() }),
  params: z.object({}).optional(),
});
