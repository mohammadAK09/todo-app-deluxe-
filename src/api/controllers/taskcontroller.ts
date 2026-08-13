import type { Request, Response } from 'express';
import * as service from '../../core/modules/todo-items/service.ts';
import type { TaskFilter } from '../../core/modules/todo-items/repository.ts';

export async function createTask(req: Request, res: Response): Promise<void> {
    try {
        const task = await service.addTask(req.body.text);
        res.status(201).json(task);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
}

export async function getTask(req: Request, res: Response): Promise<void> {
    const task = await service.getTask(Number(req.params.id));
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
}



export async function toggleTask(req: Request, res: Response): Promise<void> {
    const task = await service.toggleTask(Number(req.params.id));
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
    const success = await service.softDeleteTask(Number(req.params.id));
    if (!success) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(204).send();
}

export async function restoreTask(req: Request, res: Response): Promise<void> {
    const success = await service.restoreTask(Number(req.params.id));
    if (!success) {
        res.status(404).json({ error: 'Task not found in trash' });
        return;
    }
    res.status(200).json({ restored: true });
}

export async function listTasksByCursor(req: Request, res: Response): Promise<void> {
    const filter = (req.query.filter as TaskFilter) ?? 'all';
    // Parse 'after' safely (ignore NaN)
    const rawAfter = req.query.after ? Number(req.query.after) : null;
    const after = rawAfter !== null && !isNaN(rawAfter) ? rawAfter : null;

    // Parse 'limit' safely and cap it (e.g., between 1 and 100)
    const rawLimit = Number(req.query.limit);
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    
    res.status(200).json(await service.listTasksByCursor(filter, after, limit));
}


export async function listTasks(req: Request, res: Response): Promise<void> {
    const filter = (req.query.filter as TaskFilter) ?? 'all';
    const start = Number(req.query.start ?? 1);
    const end = Number(req.query.end ?? 10);
    res.status(200).json(await service.listTasks(filter, start, end));
}