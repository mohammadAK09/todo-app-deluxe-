import { useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/useAuth';

type Mode = 'login' | 'signup';

export function LoginPage() {
    const { signIn, register } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        if (!email.trim() || !password) {
            setError('Enter an email and password.');
            return;
        }

        setBusy(true);
        try {
            if (mode === 'login') {
                await signIn(email.trim(), password);
            } else {
                await register(email.trim(), password);
            }
        } catch (err) {
            // 400 and 401 messages come from the server and are safe to show.
            // Anything else is a server problem, so show something generic.
            if (err instanceof ApiError && (err.status === 400 || err.status === 401 || err.status === 0)) {
                setError(err.message);
            } else {
                setError('Something went wrong. Try again in a moment.');
            }
            setBusy(false);
        }
    }

    function switchMode() {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError(null);
    }

    return (
        <main className="auth-screen">
            <form className="auth-card" onSubmit={handleSubmit}>
                <h1 className="auth-title">
                    {mode === 'login' ? 'Sign in' : 'Create an account'}
                </h1>

                <label className="field">
                    <span className="field-label">Email</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        disabled={busy}
                    />
                </label>

                <label className="field">
                    <span className="field-label">Password</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        disabled={busy}
                    />
                </label>

                {error && <p className="error" role="alert">{error}</p>}

                <button type="submit" className="button-primary" disabled={busy}>
                    {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>

                <button type="button" className="button-link" onClick={switchMode} disabled={busy}>
                    {mode === 'login'
                        ? 'No account yet? Create one'
                        : 'Already have an account? Sign in'}
                </button>
            </form>
        </main>
    );
}