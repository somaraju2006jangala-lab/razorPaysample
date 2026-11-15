import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes
    max: config.rateLimit.max, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again after 15 minutes.',
    },
});
// Stricter rate limiter for sensitive payment creation / verification
export const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 requests per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Payment rate limit reached. Please wait a few minutes before trying again.',
    },
});
// Admin authentication rate limiter (brute force protection)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 login attempts per 15 min
    message: {
        success: false,
        error: 'Too many login attempts. Please try again after 15 minutes.',
    },
});
