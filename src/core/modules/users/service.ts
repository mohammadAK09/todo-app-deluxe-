import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as repository from './repository.js';
import type { User } from './schema.js';
import { JWT_SECRET } from '../../../config/env.js';
import { ValidationError, UnauthorizedError } from '../../errors.js';

const SALT_ROUNDS = 10;

export async function signup(email: string, password: string): Promise<{ user: User; token: string }> {
    const existing = await repository.findByEmail(email);
    if (existing) throw new ValidationError('Email already registered');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await repository.insert({ email, passwordHash });

    const token = signToken(user.id);
    return { user, token };
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await repository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    const token = signToken(user.id);
    return { user, token };
}

export async function getById(id: number): Promise<User | null> {
    return repository.findById(id);
}

export async function findIdByEmail(email: string): Promise<number | null> {
    const user = await repository.findByEmail(email);
    return user?.id ?? null;
}

function signToken(userId: number): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}