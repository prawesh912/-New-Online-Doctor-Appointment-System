import express from 'express';
import { login, verifyEmail, resendVerificationEmail, sendForgotPasswordOTP, resendForgotPasswordOTP, verifyOTP, resetPassword } from '../controller/auth_controller.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/send-otp", sendForgotPasswordOTP);
router.post("/resend-otp", resendForgotPasswordOTP);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

export default router;