import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/apiResponse';
import * as reviewService from '../services/review.service';
import { AppError } from '../utils/AppError';

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await reviewService.listReviewsForAgent(req.params.slug);
  return ok(res, reviews);
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const review = await reviewService.createReview(req.params.slug, req.user.sub, req.body);
  return created(res, review);
});
