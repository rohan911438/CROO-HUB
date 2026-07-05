import { Router } from 'express';
import * as organizationController from '../controllers/organization.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/:id', organizationController.getOrganization);
router.patch('/:id', organizationController.updateOrganization);

export default router;
