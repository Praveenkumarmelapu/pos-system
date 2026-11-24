import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  mergeCategoriesHandler,
  bulkReassignHandler,
  suggestCategoryHandler
} from '../controllers/category.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/', getCategories);
router.post('/', requireRole('owner', 'manager'), createCategory);
router.get('/suggest', suggestCategoryHandler);
router.post('/merge', requireRole('owner', 'manager'), mergeCategoriesHandler);
router.post('/bulk-reassign', requireRole('owner', 'manager'), bulkReassignHandler);
router.put('/:id', requireRole('owner', 'manager'), updateCategory);
router.delete('/:id', requireRole('owner', 'manager'), deleteCategory);

export default router;
