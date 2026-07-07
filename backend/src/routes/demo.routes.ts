import { Router } from 'express';
import * as demoController from '../controllers/demo.controller';

const router = Router();

// Intentionally unauthenticated - a fresh judge/reviewer session has no account yet. Access is
// instead gated by demoService.resetDemoData() checking env.demoModeEnabled, and the shared
// apiRateLimiter already applied at /api limits abuse.
router.post('/reset', demoController.resetDemo);

export default router;
