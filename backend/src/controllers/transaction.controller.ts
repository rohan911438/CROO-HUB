import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/apiResponse';
import * as transactionService from '../services/transaction.service';
import { AppError } from '../utils/AppError';

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const transactions = await transactionService.listTransactions(
    req.user.sub,
    req.query.status as string,
  );
  return ok(res, transactions);
});

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const transaction = await transactionService.createMockTransaction({
    ...req.body,
    initiator: req.user.sub,
  });
  return created(res, transaction);
});

export const completeTransaction = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const transaction = await transactionService.markTransactionCompleted(req.params.id, req.user.sub);
  return ok(res, transaction);
});
