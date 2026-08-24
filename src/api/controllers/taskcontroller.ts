import type { Response } from 'express';
import * as service from '../../core/modules/todo-items/service.js';
import * as accessService from '../../core/modules/task-access/service.js';
import { ForbiddenError, ValidationError } from '../../core/errors.js';
import type { TaskFilter } from '../../core/modules/todo-items/repository.js';
import type { AuthedRequest } from '../middleware/auth.js';

function handleError(err: unknown, res: Response): void {
    if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
    }
    if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong' });
}

function parseId(raw: unknown): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function createTask(req: AuthedRequest, res: Response): Promise<void> {
    try {
        const task = await service.addTask(req.body?.text, req.userId!);
        res.status(201).json(task);
    } catch (err) {
        handleError(err, res);
    }
}

export async function getTask(req: AuthedRequest, res: Response): Promise<void> {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'Valid task id required' });
        return;
    }
    const task = await service.getTask(id, req.userId!);
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
}

export async function toggleTask(req: AuthedRequest, res: Response): Promise<void> {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'Valid task id required' });
        return;
    }
    try {
        const task = await service.toggleTask(id, req.userId!);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.status(200).json(task);
    } catch (err) {
        handleError(err, res);
    }
}

export async function deleteTask(req: AuthedRequest, res: Response): Promise<void> {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'Valid task id required' });
        return;
    }
    try {
        const success = await service.softDeleteTask(id, req.userId!);
        if (!success) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.status(204).send();
    } catch (err) {
        handleError(err, res);
    }
}

export async function restoreTask(req: AuthedRequest, res: Response): Promise<void> {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'Valid task id required' });
        return;
    }
    try {
        const success = await service.restoreTask(id, req.userId!);
        if (!success) {
            res.status(404).json({ error: 'Task not found in trash' });
            return;
        }
        res.status(200).json({ restored: true });
    } catch (err) {
        handleError(err, res);
    }
}

export async function listTasksByCursor(req: AuthedRequest, res: Response): Promise<void> {
    const filter = (req.query.filter as TaskFilter) ?? 'all';
    const rawAfter = req.query.after ? Number(req.query.after) : null;
    const after = rawAfter !== null && !isNaN(rawAfter) ? rawAfter : null;
    const rawLimit = Number(req.query.limit);
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;

    res.status(200).json(await service.listTasksByCursor(filter, req.userId!, after, limit));
}

export async function listTasks(req: AuthedRequest, res: Response): Promise<void> {
    const filter = (req.query.filter as TaskFilter) ?? 'all';
    const start = Number(req.query.start ?? 1);
    const end = Number(req.query.end ?? 10);
    res.status(200).json(await service.listTasks(filter, req.userId!, start, end));
}

// --- Sharing ---

export async function shareTask(req: AuthedRequest, res: Response): Promise<void> {
    const taskId = parseId(req.params.id);
    const targetUserId = parseId(req.body?.userId);
    if (taskId === null) {
        res.status(400).json({ error: 'Valid task id required' });
        return;
    }
    if (targetUserId === null) {
        res.status(400).json({ error: 'Valid userId required in body' });
        return;
    }
    try {
        const result = await accessService.shareTask(taskId, targetUserId, req.userId!);
        if (result === null) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.status(201).json(result);
    } catch (err) {
        handleError(err, res);
    }
}

export async function unshareTask(req: AuthedRequest, res: Response): Promise<void> {
    const taskId = parseId(req.params.id);
    const targetUserId = parseId(req.params.userId);
    if (taskId === null || targetUserId === null) {
        res.status(400).json({ error: 'Valid task id and userId required' });
        return;
    }
    try {
        const result = await accessService.unshareTask(taskId, targetUserId, req.userId!);
        if (result === null) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        if (!result) {
            res.status(404).json({ error: 'That user does not have access' });
            return;
        }
        res.status(204).send();
    } catch (err) {
        handleError(err, res);
    }
}

export async function listTaskAccess(req: AuthedRequest, res: Response): Promise<void> {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
        res.status(400).json({ error: 'Valid task id required' });
        return;
    }
    try {
        const result = await accessService.listAccess(taskId, req.userId!);
        if (result === null) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.status(200).json(result);
    } catch (err) {
        handleError(err, res);
    }
}

export async function listSharedWithMe(req: AuthedRequest, res: Response): Promise<void> {
    res.status(200).json(await accessService.listSharedWithMe(req.userId!));
}