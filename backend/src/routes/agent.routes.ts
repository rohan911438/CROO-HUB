import { Router } from 'express';
import * as agentController from '../controllers/agent.controller';
import * as reviewController from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', agentController.listAgents);
router.get('/compare', agentController.compareAgents);
router.get('/:slug', agentController.getAgent);
router.post('/:slug/bookmark', requireAuth, agentController.toggleBookmark);
router.get('/:slug/reviews', reviewController.listReviews);
router.post('/:slug/reviews', requireAuth, reviewController.createReview);

export default router;
