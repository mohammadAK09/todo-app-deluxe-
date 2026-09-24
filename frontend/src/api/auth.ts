import { request } from './client';
import type { AuthResponse, User } from './types';

export function signup(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: { email, password },
        auth: false,
    });
}

export function login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
    });
}

/** Validates the stored token and returns who it belongs to. */
export function me(): Promise<User> {
    return request<User>('/auth/me');
}