import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../auth/auth.service.js';
import { dbGet } from '../db/index.js';
import type { User } from '../db/types.js';

export interface AuthRequest extends Request {
  user?: User;
  tokenPayload?: TokenPayload;
}

// Authentication middleware
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }

  // Verify session is still valid
  const session = dbGet<{ id: number; expires_at: string }>(
    'SELECT id, expires_at FROM sessions WHERE id = ? AND user_id = ?',
    [payload.sessionId, payload.userId]
  );

  if (!session) {
    return res.status(401).json({ success: false, message: '会话已失效' });
  }

  if (new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ success: false, message: '会话已过期' });
  }

  // Get user
  const user = dbGet<User>('SELECT * FROM users WHERE id = ?', [payload.userId]);

  if (!user) {
    return res.status(401).json({ success: false, message: '用户不存在' });
  }

  req.user = user;
  req.tokenPayload = payload;

  next();
}

// Optional auth - doesn't fail if not logged in
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);

  if (payload) {
    const user = dbGet<User>('SELECT * FROM users WHERE id = ?', [payload.userId]);

    if (user) {
      req.user = user;
      req.tokenPayload = payload;
    }
  }

  next();
}
