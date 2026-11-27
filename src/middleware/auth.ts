// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  [key: string]: any;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = (req.headers as any)?.authorization || req.header?.('authorization');
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}