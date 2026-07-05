import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', transactionController.listTransactions);
router.post('/', transactionController.createTransaction);
router.post('/:id/complete', transactionController.completeTransaction);

export default router;
