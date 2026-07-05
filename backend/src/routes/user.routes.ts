import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.patch('/profile', userController.updateProfile);
router.post('/onboarding/complete', userController.completeOnboarding);

export default router;
