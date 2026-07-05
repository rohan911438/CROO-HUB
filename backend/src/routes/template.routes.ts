import { Router } from 'express';
import * as templateController from '../controllers/template.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', templateController.listTemplates);
router.get('/:slug', templateController.getTemplate);
router.post('/:slug/duplicate', requireAuth, templateController.duplicateTemplate);

export default router;
