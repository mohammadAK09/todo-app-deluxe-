import { createContext } from 'react';
import type { User } from '../api/types';

// 'checking' is the state on page load, while /auth/me is in flight.
// Without it the app would flash the login screen before realising the
// user is already signed in.
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
    status: AuthStatus;
    user: User | null;
    signIn: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);