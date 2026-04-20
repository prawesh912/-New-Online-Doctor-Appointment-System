import express from 'express';
import { login } from '../controller/auth_controller.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, login);

export default router;