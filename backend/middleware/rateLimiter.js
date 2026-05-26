import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,
    message: {
        success: false,
        message: "Too many login attempts. Try again later."
    }
});