import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AdminUserPayload {
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUserPayload;
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Authorization header missing.',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Invalid authorization format. Expected Bearer <token>.',
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.admin.secretKey) as AdminUserPayload;
    req.adminUser = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired session token.',
    });
  }
}

