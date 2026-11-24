import { Router } from 'express';
import { createSale, getSales, getSaleById, returnSaleItems, previewOldSalesArchive, exportOldSalesArchive, clearOldSalesArchive } from '../controllers/sale.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/archive/preview', requireRole('owner'), previewOldSalesArchive);
router.post('/archive/export', requireRole('owner'), exportOldSalesArchive);
router.post('/archive/clear', requireRole('owner'), clearOldSalesArchive);

router.post('/', requireRole('owner', 'manager', 'cashier'), createSale);
router.get('/', requireRole('owner', 'manager', 'cashier'), getSales);
router.get('/:id', requireRole('owner', 'manager', 'cashier'), getSaleById);
router.post('/:id/return', requireRole('owner', 'manager', 'cashier'), returnSaleItems);

export default router;
