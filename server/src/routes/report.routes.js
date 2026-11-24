import { Router } from 'express';
import { getDashboardStats, getSalesTrends, getPaymentSummaryReport } from '../controllers/report.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/dashboard', requireRole('owner', 'manager'), getDashboardStats);
router.get('/sales-trends', requireRole('owner', 'manager'), getSalesTrends);
router.get('/payment-summary', requireRole('owner', 'manager'), getPaymentSummaryReport);

export default router;
