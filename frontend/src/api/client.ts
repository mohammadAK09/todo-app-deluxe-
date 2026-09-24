// Every call to the backend goes through this file. Nothing else uses fetch
// directly. That way the base URL, the auth header, and error handling all
// live in one place.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'todo-app-token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Thrown for any non-2xx response. `status` lets callers react to the kind of
 * failure; `message` is the server's own text, safe to show for 400s.
 */
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    /** Set false for signup and login, which have no token yet. */
    auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true } = options;

    const headers: Record<string, string> = {};
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    if (auth) {
        const token = getToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        // fetch only rejects when the request never completed: the server is
        // down, the network dropped, or the browser blocked it (CORS).
        throw new ApiError(0, 'Could not reach the server. Is the API running?');
    }

    // 204 No Content — delete and unshare return this, with an empty body.
    if (response.status === 204) {
        return undefined as T;
    }

    let data: unknown = null;
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        const message =
            data && typeof data === 'object' && 'error' in data
                ? String((data as { error: unknown }).error)
                : `Request failed (${response.status})`;
        throw new ApiError(response.status, message);
    }

    return data as T;
}