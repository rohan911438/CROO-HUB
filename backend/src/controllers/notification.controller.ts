import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import * as notificationService from '../services/notification.service';
import { AppError } from '../utils/AppError';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const notifications = await notificationService.listNotifications(
    req.user.sub,
    req.query.unread === 'true',
  );
  return ok(res, notifications);
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const notification = await notificationService.markAsRead(req.params.id, req.user.sub);
  return ok(res, notification);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await notificationService.markAllAsRead(req.user.sub);
  return ok(res, result);
});
