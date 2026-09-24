import { useAuth } from '../auth/useAuth';

// Placeholder for now. Step 5 replaces this with the real task list.
export function TasksPage() {
    const { user, signOut } = useAuth();

    return (
        <div className="app-shell">
            <header className="app-header">
                <h1 className="app-title">Tasks</h1>
                <div className="app-header-right">
                    <span className="user-email">{user?.email}</span>
                    <button type="button" className="button-link" onClick={signOut}>
                        Sign out
                    </button>
                </div>
            </header>

            <p className="placeholder">
                Signed in. The task list goes here next.
            </p>
        </div>
    );
}