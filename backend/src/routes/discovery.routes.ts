import { Router } from 'express';
import { discover } from '../controllers/discovery.controller';

const router = Router();

/**
 * @openapi
 * /discovery:
 *   post:
 *     summary: Get intelligently ranked agent matches for a described task (real heuristic engine over live MongoDB agent data)
 *     tags: [Discovery]
 */
router.post('/', discover);

export default router;
