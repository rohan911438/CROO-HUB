import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/overview', requireAuth, analyticsController.getOverview);

export default router;
