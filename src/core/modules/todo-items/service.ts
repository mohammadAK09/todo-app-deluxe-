import * as repository from './repository.js';
import type { Task } from './schema.js';
import type { TaskFilter } from './repository.js';
import { ValidationError } from '../../errors.js';

export async function addTask(text: string, userId: number): Promise<Task> {
    const trimmed = text?.trim();
    if (!trimmed) throw new ValidationError('Task text cannot be empty');
    return repository.insert({ text: trimmed, completed: false, createdBy: userId });
}

export async function getTask(id: number, userId: number): Promise<Task | null> {
    return repository.findActiveById(id, userId);
}

// Access is all-or-nothing now: if findActiveById returns a task, the user
// may also change it. No separate write check is needed.
export async function softDeleteTask(id: number, userId: number): Promise<boolean> {
    const task = await repository.findActiveById(id, userId);
    if (!task) return false;
    return repository.softDelete(id);
}

export async function restoreTask(id: number, userId: number): Promise<boolean> {
    const task = await repository.findAnyById(id, userId);
    if (!task || task.deletedAt === null) return false;
    return repository.restore(id);
}

export async function toggleTask(id: number, userId: number): Promise<Task | null> {
    const task = await repository.findActiveById(id, userId);
    if (!task) return null;

    const newStatus = !task.completed;
    const updated = await repository.updateFields(id, { completed: newStatus, updatedAt: new Date() });
    if (updated === 0) return null;
    return { ...task, completed: newStatus };
}

export async function listTasksByCursor(
    filter: TaskFilter, userId: number, afterId: number | null, limit: number,
) {
    const rows = await repository.findByCursor(filter, userId, afterId, limit + 1);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return { items, nextCursor };
}

export async function listTasks(filter: TaskFilter, userId: number, start: number, end: number) {
    const skipCount = start - 1;
    const limitCount = end - start + 1;
    const totalCount = await repository.countByFilter(filter, userId);
    const tasks = await repository.findByFilter(filter, userId, skipCount, limitCount);
    return { totalCount, tasks };
}