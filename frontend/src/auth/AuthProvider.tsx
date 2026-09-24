import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { clearToken, setToken } from '../api/client';
import * as authApi from '../api/auth';
import type { User } from '../api/types';
import { AuthContext, type AuthStatus } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('checking');
    const [user, setUser] = useState<User | null>(null);

    // On first load, ask the server whether the stored token is still valid.
    // A failure here means anonymous — not an error worth showing.
    useEffect(() => {
        let cancelled = false;

        authApi
            .me()
            .then((found) => {
                if (cancelled) return;
                setUser(found);
                setStatus('authenticated');
            })
            .catch(() => {
                if (cancelled) return;
                clearToken();
                setUser(null);
                setStatus('anonymous');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const result = await authApi.login(email, password);
        setToken(result.token);
        setUser({ id: result.id, email: result.email });
        setStatus('authenticated');
    }, []);

    const register = useCallback(async (email: string, password: string) => {
        const result = await authApi.signup(email, password);
        setToken(result.token);
        setUser({ id: result.id, email: result.email });
        setStatus('authenticated');
    }, []);

    const signOut = useCallback(() => {
        clearToken();
        setUser(null);
        setStatus('anonymous');
    }, []);

    return (
        <AuthContext.Provider value={{ status, user, signIn, register, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}