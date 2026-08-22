import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/env.js';

export interface AuthedRequest extends Request {
    userId?: number;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}