import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import * as plannerService from '../services/planner.service';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const order = await plannerService.createOrder({ ownerId: req.user.sub, ...req.body });
  return created(res, order);
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const orders = await plannerService.listOrders(req.user.sub, req.query.status as string | undefined);
  return ok(res, orders);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const order = await plannerService.getOrder(req.params.id, req.user.sub);
  return ok(res, order);
});

export const retryOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const order = await plannerService.retryOrder(req.params.id, req.user.sub);
  return ok(res, order);
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const order = await plannerService.cancelOrder(req.params.id, req.user.sub);
  return ok(res, order);
});
