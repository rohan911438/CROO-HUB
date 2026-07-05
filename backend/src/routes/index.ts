import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import agentRoutes from './agent.routes';
import discoveryRoutes from './discovery.routes';
import workflowRoutes from './workflow.routes';
import templateRoutes from './template.routes';
import transactionRoutes from './transaction.routes';
import notificationRoutes from './notification.routes';
import organizationRoutes from './organization.routes';
import settingRoutes from './setting.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/agents', agentRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/workflows', workflowRoutes);
router.use('/templates', templateRoutes);
router.use('/transactions', transactionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/organizations', organizationRoutes);
router.use('/settings', settingRoutes);

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', timestamp: new Date() }));

export default router;
