import { Router } from 'express';
import { registerShop, login, getMe, logout } from '../controllers/auth.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/register-shop', registerShop);
router.post('/login', login);
router.get('/me', authGuard, getMe);
router.post('/logout', authGuard, logout);

export default router;
