import express from 'express';
import { login, verifyEmail, resendVerificationEmail } from '../controller/auth_controller.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

export default router;