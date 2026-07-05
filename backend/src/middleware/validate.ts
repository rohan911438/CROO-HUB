import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(AppError.badRequest('Validation failed', error.flatten()));
      }
      return next(error);
    }
  };
}
