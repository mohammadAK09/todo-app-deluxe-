import type { Request, Response } from 'express';
import * as userService from '../../core/modules/users/service.js';

export async function signup(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const { user, token } = await userService.signup(email, password);
        res.status(201).json({ id: user.id, email: user.email, token });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const { user, token } = await userService.login(email, password);
        res.status(200).json({ id: user.id, email: user.email, token });
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
}