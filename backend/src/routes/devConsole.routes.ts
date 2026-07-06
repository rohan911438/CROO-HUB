import { Router } from 'express';
import * as devConsoleController from '../controllers/devConsole.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/health', requireAuth, devConsoleController.getHealth);
router.get('/requests', requireAuth, devConsoleController.getRequestLog);
router.get('/records/:collection', requireAuth, devConsoleController.getRecords);
router.get('/onchain-events', requireAuth, devConsoleController.getOnchainEvents);

export default router;
