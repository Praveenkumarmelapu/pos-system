import { Router } from 'express';
import {
  getCustomers,
  createCustomer,
  recordUdhaarPayment
} from '../controllers/customer.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.post('/:id/udhaar', recordUdhaarPayment);

export default router;
