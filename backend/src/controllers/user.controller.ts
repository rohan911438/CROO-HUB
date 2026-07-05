import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { name, avatarUrl } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.sub,
    { $set: { name, avatarUrl } },
    { new: true },
  );
  return ok(res, user);
});

export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await User.findByIdAndUpdate(
    req.user.sub,
    { onboardingCompleted: true },
    { new: true },
  );
  return ok(res, user);
});
