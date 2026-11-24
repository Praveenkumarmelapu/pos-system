import { Router } from 'express';
import { getStockMovements, adjustStock, createPurchase } from '../controllers/inventory.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/movements', requireRole('owner', 'manager'), getStockMovements);
router.post('/adjust', requireRole('owner', 'manager'), adjustStock);
router.post('/purchases', requireRole('owner', 'manager'), createPurchase);

export default router;
