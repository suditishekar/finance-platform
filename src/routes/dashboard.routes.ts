import { Router } from 'express';
import {
  getSummary,
  getByCategory,
  getDailySummary,
  getMonthlySummary,
  getCategoryAnalysisReport,
  getTrendAnalysisReport,
  getMonthlyTrends,
  getRecentActivity,
} from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All roles can access the dashboard
router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/by-category', getByCategory);
router.get('/daily-summary', getDailySummary);
router.get('/monthly-summary', getMonthlySummary);
router.get('/category-analysis', getCategoryAnalysisReport);
router.get('/trend-analysis', getTrendAnalysisReport);
router.get('/trends', getMonthlyTrends);
router.get('/recent', getRecentActivity);

export default router;
