import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  walletNonceSchema,
  walletVerifySchema,
} from '../validators/auth.validators';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 */
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate and receive access/refresh tokens
 *     tags: [Auth]
 */
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @openapi
 * /auth/wallet/nonce:
 *   get:
 *     summary: Get a one-time message to sign with a connected wallet (SIWE-style)
 *     tags: [Auth]
 */
router.get('/wallet/nonce', authRateLimiter, validate(walletNonceSchema), authController.walletNonce);

/**
 * @openapi
 * /auth/wallet/verify:
 *   post:
 *     summary: Verify a signed wallet message and receive access/refresh tokens - auto-provisions a User on first sign-in
 *     tags: [Auth]
 */
router.post('/wallet/verify', authRateLimiter, validate(walletVerifySchema), authController.walletVerify);

export default router;
