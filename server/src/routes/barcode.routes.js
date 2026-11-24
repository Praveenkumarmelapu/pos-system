import { Router } from 'express';
import {
  generateBarcode,
  bulkGenerateBarcodes,
  recordPrint,
  getBarcodeRegistry
} from '../controllers/barcode.controller.js';
import { lookupProductByBarcode } from '../controllers/product.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(authGuard, tenantContext);

// Barcode Lookup (Hardware scanner / Camera)
router.get('/lookup/:barcode', lookupProductByBarcode);

// Internal Barcode Generation & Registry Management
router.get('/registry', requireRole('owner', 'manager'), getBarcodeRegistry);
router.post('/generate', requireRole('owner', 'manager'), generateBarcode);
router.post('/bulk-generate', requireRole('owner', 'manager'), bulkGenerateBarcodes);
router.post('/record-print', recordPrint);

export default router;
