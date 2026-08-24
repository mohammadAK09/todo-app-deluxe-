import type { Response } from 'express';
import * as service from '../../core/modules/todo-items/service.js';
import * as accessService from '../../core/modules/task-access/service.js';
import { ForbiddenError, ValidationError } from '../../core/errors.js';
import type { TaskFilter } from '../../core/modules/todo-items/repository.js';
import type { Permission } from '../../core/modules/task-access/repository.js';
import type { AuthedRequest } from '../middleware/auth.js';


function handleError(err: unknown, res: Response): void {
    if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
        return;
    }

    // Errors we raise deliberately are safe to show; anything else is not.
    if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong' });
}

export async function createTask(req: AuthedRequest, res: Response): Promise<void> {
    try {
        const task = await service.addTask(req.body.text, req.userId!);
        res.status(201).json(task);
    } catch (err) {
        handleError(err, res);
    }
}

export async function getTask(req: AuthedRequest, res: Response): Promise<void> {
    const task = await service.getTask(Number(req.params.id), req.userId!);
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
}

export async function toggleTask(req: AuthedRequest, res: Response): Promise<void> {
    try {
        const task = await service.toggleTask(Number(req.params.id), req.userId!);
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
    try {
        const success = await service.softDeleteTask(Number(req.params.id), req.userId!);
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
    try {
        const success = await service.restoreTask(Number(req.params.id), req.userId!);
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

export async function shareAccess(req: AuthedRequest, res: Response): Promise<void> {
    const viewerId = Number(req.body?.viewerId);
    const permission = (req.body?.permission ?? 'read') as Permission;
    const rawTaskId = req.body?.taskId;
    const taskId = rawTaskId === undefined || rawTaskId === null ? null : Number(rawTaskId);

    if (!Number.isInteger(viewerId) || viewerId <= 0) {
        res.status(400).json({ error: 'Valid viewerId required' });
        return;
    }
    if (permission !== 'read' && permission !== 'write') {
        res.status(400).json({ error: "permission must be 'read' or 'write'" });
        return;
    }
    if (taskId !== null && (!Number.isInteger(taskId) || taskId <= 0)) {
        res.status(400).json({ error: 'taskId must be a positive integer' });
        return;
    }

    try {
        const row = await accessService.grantAccess(req.userId!, viewerId, permission, taskId);
        res.status(201).json(row);
    } catch (err) {
        handleError(err, res);
    }
}

export async function revokeShare(req: AuthedRequest, res: Response): Promise<void> {
    const viewerId = Number(req.params.viewerId);
    const rawTaskId = req.query.taskId;
    const taskId = rawTaskId === undefined ? null : Number(rawTaskId);

    if (!Number.isInteger(viewerId) || viewerId <= 0) {
        res.status(400).json({ error: 'Valid viewerId required' });
        return;
    }
    if (taskId !== null && (!Number.isInteger(taskId) || taskId <= 0)) {
        res.status(400).json({ error: 'taskId must be a positive integer' });
        return;
    }

    const removed = await accessService.revokeAccess(req.userId!, viewerId, taskId);
    if (!removed) {
        res.status(404).json({ error: 'No matching grant found' });
        return;
    }
    res.status(204).send();
}

export async function listSharedWithMe(req: AuthedRequest, res: Response): Promise<void> {
    res.status(200).json(await accessService.listGrantsIReceived(req.userId!));
}