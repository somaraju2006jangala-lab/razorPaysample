import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  // Never expose sensitive internal details or secret keys to clients
  const sanitizedMessage =
    err.isOperational || config.nodeEnv === 'development'
      ? err.message
      : 'An unexpected internal payment processing error occurred.';

  res.status(statusCode).json({
    success: false,
    error: sanitizedMessage,
    code: err.code || 'PAYMENT_GATEWAY_ERROR',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}

