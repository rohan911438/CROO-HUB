import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/apiResponse';
import * as authService from '../services/auth.service';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, emailVerificationToken } = await authService.registerUser(req.body);
  const tokens = authService.issueTokens(user.id, user.email, user.role);

  return created(res, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
    // Exposed here only because there is no email provider wired up yet.
    devOnlyEmailVerificationToken: emailVerificationToken,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const tokens = await authService.loginUser(email, password);
  return ok(res, tokens);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  return ok(res, tokens);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await User.findById(req.user.sub);
  if (!user) throw AppError.notFound('User not found');
  return ok(res, user);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const user = await authService.verifyEmailToken(token);
  return ok(res, { verified: true, email: user.email });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const { token } = await authService.requestPasswordReset(email);
  return ok(res, {
    message: 'If an account exists for this email, a reset link has been sent.',
    devOnlyResetToken: token,
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  return ok(res, { message: 'Password has been reset successfully.' });
});
