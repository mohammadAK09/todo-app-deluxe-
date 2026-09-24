import type { Request, Response } from 'express';
import * as userService from '../../core/modules/users/service.js';
import { ValidationError, UnauthorizedError } from '../../core/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';

function handleError(err: unknown, res: Response): void {
    if (err instanceof UnauthorizedError) {
        res.status(401).json({ error: err.message });
        return;
    }
    if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
    }
    console.error('Unhandled auth error:', err);
    res.status(500).json({ error: 'Something went wrong' });
}

export async function signup(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const { user, token } = await userService.signup(email, password);
        res.status(201).json({ id: user.id, email: user.email, token });
    } catch (err) {
        handleError(err, res);
    }
}

export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const { user, token } = await userService.login(email, password);
        res.status(200).json({ id: user.id, email: user.email, token });
    } catch (err) {
        handleError(err, res);
    }
}

export async function me(req: AuthedRequest, res: Response): Promise<void> {
    try {
        const user = await userService.getById(req.userId!);
        if (!user) {
            res.status(401).json({ error: 'User no longer exists' });
            return;
        }
        res.status(200).json({ id: user.id, email: user.email });
    } catch (err) {
        handleError(err, res);
    }
}