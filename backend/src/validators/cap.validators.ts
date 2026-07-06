import { z } from 'zod';

export const linkCapAgentSchema = z.object({
  body: z.object({
    crooAgentId: z.string().min(1),
    crooServiceId: z.string().min(1).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ slug: z.string().min(1) }),
});

export const capListQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    role: z.string().optional(),
    agentId: z.string().optional(),
  }),
  params: z.object({}).optional(),
});
