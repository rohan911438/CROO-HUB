import { Router } from 'express';
import * as capController from '../controllers/cap.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { linkCapAgentSchema, capListQuerySchema } from '../validators/cap.validators';

const router = Router();

router.get('/status', capController.getStatus);
router.get('/my-agents', requireAuth, capController.getMyAgents);
router.get('/orders', requireAuth, validate(capListQuerySchema), capController.listOrders);
router.get('/negotiations', requireAuth, validate(capListQuerySchema), capController.listNegotiations);
router.get('/agents/:slug/registration-guide', requireAuth, capController.getRegistrationGuide);
router.post('/agents/:slug/link', requireAuth, validate(linkCapAgentSchema), capController.linkAgent);
router.post('/agents/:slug/unlink', requireAuth, capController.unlinkAgent);

export default router;
