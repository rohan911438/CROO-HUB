import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema, listOrdersSchema } from '../validators/order.validators';

const router = Router();

router.post('/', requireAuth, validate(createOrderSchema), orderController.createOrder);
router.get('/', requireAuth, validate(listOrdersSchema), orderController.listOrders);
router.get('/:id', requireAuth, orderController.getOrder);
router.post('/:id/retry', requireAuth, orderController.retryOrder);
router.post('/:id/cancel', requireAuth, orderController.cancelOrder);

export default router;
