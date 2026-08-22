import type { Response } from 'express';
import * as service from '../../core/modules/todo-items/service.js';
import type { TaskFilter } from '../../core/modules/todo-items/repository.js';
import type { AuthedRequest } from '../middleware/auth.js';

export async function createTask(req: AuthedRequest, res: Response): Promise<void> {
    try {
        const task = await service.addTask(req.body.text, req.userId!);
        res.status(201).json(task);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
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
    const task = await service.toggleTask(Number(req.params.id), req.userId!);
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
}

export async function deleteTask(req: AuthedRequest, res: Response): Promise<void> {
    const success = await service.softDeleteTask(Number(req.params.id), req.userId!);
    if (!success) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(204).send();
}

export async function restoreTask(req: AuthedRequest, res: Response): Promise<void> {
    const success = await service.restoreTask(Number(req.params.id), req.userId!);
    if (!success) {
        res.status(404).json({ error: 'Task not found in trash' });
        return;
    }
    res.status(200).json({ restored: true });
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