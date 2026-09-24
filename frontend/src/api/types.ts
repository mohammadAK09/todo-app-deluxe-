// These mirror the shapes your API actually returns.
// If the backend changes, change these first — TypeScript will then
// point you at every component that needs updating.

export interface User {
    id: number;
    email: string;
}

export interface AuthResponse {
    id: number;
    email: string;
    token: string;
}

export interface Task {
    id: number;
    text: string;
    completed: boolean;
    createdBy: number;
    deletedAt: string | null;
    updatedAt: string | null;
}

export type TaskFilter = 'all' | 'completed' | 'pending' | 'deleted';

export interface CursorPage {
    items: Task[];
    nextCursor: number | null;
}

export interface SharedTask {
    taskId: number;
    text: string;
    completed: boolean;
    ownerId: number;
}

export interface AccessEntry {
    userId: number;
    email: string;
    grantedAt: string;
    isOwner: boolean;
}

export interface TaskAccess {
    taskId: number;
    ownerId: number;
    users: AccessEntry[];
}