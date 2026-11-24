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

const router = Router();

router.use(authGuard, tenantContext);

router.get('/', getCategories);
router.post('/', createCategory);
router.get('/suggest', suggestCategoryHandler);
router.post('/merge', mergeCategoriesHandler);
router.post('/bulk-reassign', bulkReassignHandler);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
