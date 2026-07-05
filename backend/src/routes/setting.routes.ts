import { Router } from 'express';
import * as settingController from '../controllers/setting.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', settingController.getSettings);
router.patch('/', settingController.updateSettings);
router.post('/api-keys', settingController.createApiKey);

export default router;
