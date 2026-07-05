import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { UserRole } from '../models/User';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}
