import type { Request, Response, NextFunction } from 'express';
import * as service from '../../core/modules/todo-items/service.ts';
import type { TaskFilter } from '../../core/modules/todo-items/repository.ts';
 
// If service.ts doesn't already export this, add it there and have
// addTask (and any other validating logic) throw it instead of a plain Error.
// class ValidationError extends Error {}
// import { ValidationError } from '../../core/modules/todo-items/errors.ts';
 
/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * next(err) instead of hanging the request (needed on Express 4;
 * harmless no-op on Express 5, which does this natively).
 */
function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        fn(req, res, next).catch(next);
    };
}
 
function parseId(req: Request, res: Response): number | null {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid task id' });
        return null;
    }
    return id;
}
 
export const createTask = asyncHandler(async (req, res) => {
    const { text } = req.body ?? {};
 
    if (typeof text !== 'string' || text.trim() === '') {
        res.status(400).json({ error: 'text is required and must be a non-empty string' });
        return;
    }
 
    try {
        const task = await service.addTask(text);
        res.status(201).json(task);
    } catch (err: any) {
        // Swap this for `if (err instanceof ValidationError)` once
        // service.ts throws a distinguishable error type. Until then,
        // everything falls through to 500, which is the safer default —
        // it's better to over-report server errors than mislabel a real
        // server failure as the client's fault.
        throw err;
    }
});
 
export const getTask = asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
 
    const task = await service.getTask(id);
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
});
 
export const toggleTask = asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
 
    const task = await service.toggleTask(id);
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(200).json(task);
});
 
export const deleteTask = asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
 
    const success = await service.softDeleteTask(id);
    if (!success) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.status(204).send();
});
 
export const restoreTask = asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
 
    const success = await service.restoreTask(id);
    if (!success) {
        res.status(404).json({ error: 'Task not found in trash' });
        return;
    }
    res.status(200).json({ restored: true });
});
 
export const listTasksByCursor = asyncHandler(async (req, res) => {
    const filter = (req.query.filter as TaskFilter) ?? 'all';
 
    const rawAfter = req.query.after ? Number(req.query.after) : null;
    const after = rawAfter !== null && !isNaN(rawAfter) ? rawAfter : null;
 
    const rawLimit = Number(req.query.limit);
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
 
    res.status(200).json(await service.listTasksByCursor(filter, after, limit));
});
 
export const listTasks = asyncHandler(async (req, res) => {
    const filter = (req.query.filter as TaskFilter) ?? 'all';
 
    const rawStart = Number(req.query.start ?? 1);
    const rawEnd = Number(req.query.end ?? 10);
 
    if (isNaN(rawStart) || isNaN(rawEnd) || rawStart < 1 || rawEnd < rawStart) {
        res.status(400).json({ error: 'Invalid start/end range' });
        return;
    }
 
    res.status(200).json(await service.listTasks(filter, rawStart, rawEnd));
});