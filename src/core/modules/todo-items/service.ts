import * as repository from './repository.js';
import type { Task } from './schema.js';
import type { TaskFilter } from './repository.js';

export async function addTask(text: string): Promise<Task> {
    const trimmed = text?.trim();
    if (!trimmed) throw new Error('Task text cannot be empty');
    return repository.insert({ text: trimmed, completed: false });
}

export async function getTask(id: number): Promise<Task | null> {
    return repository.findActiveById(id);
}



export async function softDeleteTask(id: number): Promise<boolean> {
    return repository.softDelete(id);
}

export async function restoreTask(id: number): Promise<boolean> {
    return repository.restore(id);
}

export async function toggleTask(id: number): Promise<Task | null> {
    const task = await repository.findActiveById(id);
    if (!task) return null;
    const newStatus = !task.completed;
    await repository.updateFields(id, { completed: newStatus, updatedAt: new Date() });
    return { ...task, completed: newStatus };
}


export async function listTasksByCursor(filter: TaskFilter, afterId: number | null, limit: number) {
    const rows = await repository.findByCursor(filter, afterId, limit + 1);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor };
}



export async function listTasks(filter: TaskFilter, start: number, end: number) {
    const skipCount = start - 1;
    const limitCount = end - start + 1;
    const totalCount = await repository.countByFilter(filter);
    const tasks = await repository.findByFilter(filter, skipCount, limitCount);
    return { totalCount, tasks };
}