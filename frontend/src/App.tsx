import { useAuth } from './auth/useAuth';
import { LoginPage } from './pages/LoginPage';
import { TasksPage } from './pages/TasksPage';

export default function App() {
    const { status } = useAuth();

    if (status === 'checking') {
        return <div className="boot">Loading…</div>;
    }

    return status === 'authenticated' ? <TasksPage /> : <LoginPage />;
}