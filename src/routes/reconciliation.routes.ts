import { Router } from 'express';
import { compareReconciliation } from '../controllers/reconciliation.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requireRole('admin', 'analyst'));
router.post('/compare', compareReconciliation);

export default router;
