import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  bulkImportProducts,
  updateProduct,
  deleteProduct,
  generateInternalBarcode
} from '../controllers/product.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/', getProducts);
router.get('/generate-barcode', requireRole('owner', 'manager'), generateInternalBarcode);
router.post('/bulk-import', requireRole('owner', 'manager'), bulkImportProducts);
router.get('/:id', getProductById);
router.post('/', requireRole('owner', 'manager'), createProduct);
router.patch('/:id', requireRole('owner', 'manager'), updateProduct);
router.delete('/:id', requireRole('owner'), deleteProduct);

export default router;
