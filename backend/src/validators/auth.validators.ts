import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(72),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({ token: z.string().min(10), password: z.string().min(8).max(72) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(10) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address');

export const walletNonceSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({ address: ethAddress }),
  params: z.object({}).optional(),
});

export const walletVerifySchema = z.object({
  body: z.object({ address: ethAddress, signature: z.string().min(1) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
