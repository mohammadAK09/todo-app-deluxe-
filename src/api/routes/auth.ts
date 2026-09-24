import { Router } from 'express';
import { signup, login, me } from '../controllers/authcontroller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);