import { Router } from 'express';
import {
  getKhataSummary,
  getKhataCustomers,
  getCustomerLedger,
  receiveKhataPayment,
  addKhataAdjustment,
  recordKhataReminder
} from '../controllers/khata.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();

router.use(authGuard, tenantContext);

router.get('/summary', getKhataSummary);
router.get('/customers', getKhataCustomers);
router.get('/customers/:customerId/ledger', getCustomerLedger);
router.post('/payments', receiveKhataPayment);
router.post('/customers/:customerId/adjustment', addKhataAdjustment);
router.post('/customers/:customerId/reminder', recordKhataReminder);

export default router;
