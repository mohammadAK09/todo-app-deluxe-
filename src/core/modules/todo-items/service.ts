import * as repository from './repository.ts';
import type { Task } from './schema.ts';
import type { TaskFilter } from './repository.ts';

export async function addTask(text: string): Promise<Task> {
    const trimmed = text?.trim();
    if (!trimmed) throw new Error('Task text cannot be empty');
    return repository.insert({ text: trimmed, completed: false });
}

export async function getTask(id: number): Promise<Task | null> {
    return repository.findActiveById(id);
}

export async function listTasks(filter: TaskFilter, start: number, end: number) {
    const skipCount = start - 1;
    const limitCount = end - start + 1;
    const totalCount = await repository.countByFilter(filter);
    const tasks = await repository.findByFilter(filter, skipCount, limitCount);
    return { totalCount, tasks };
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