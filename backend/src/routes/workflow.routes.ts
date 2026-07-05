import { Router } from 'express';
import * as workflowController from '../controllers/workflow.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', workflowController.listWorkflows);
router.post('/', workflowController.createWorkflow);
router.get('/:id', workflowController.getWorkflow);
router.patch('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);
router.post('/:id/run', workflowController.runWorkflow);

export default router;
