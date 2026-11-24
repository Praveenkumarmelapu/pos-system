import { Router } from 'express';
import { getAllShops, toggleShopStatus, getPlatformMetrics } from '../controllers/admin.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { requireSuperAdmin } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, requireSuperAdmin);

router.get('/shops', getAllShops);
router.patch('/shops/:id/status', toggleShopStatus);
router.get('/metrics', getPlatformMetrics);

export default router;
