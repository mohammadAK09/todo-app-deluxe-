import * as repository from './repository.js';
export async function addTask(text) {
    const trimmed = text?.trim();
    if (!trimmed)
        throw new Error('Task text cannot be empty');
    return repository.insert({ text: trimmed, completed: false });
}
export async function getTask(id) {
    return repository.findActiveById(id);
}
export async function softDeleteTask(id) {
    return repository.softDelete(id);
}
export async function restoreTask(id) {
    return repository.restore(id);
}
export async function toggleTask(id) {
    const task = await repository.findActiveById(id);
    if (!task)
        return null;
    const newStatus = !task.completed;
    await repository.updateFields(id, { completed: newStatus, updatedAt: new Date() });
    return { ...task, completed: newStatus };
}
export async function listTasksByCursor(filter, afterId, limit) {
    const rows = await repository.findByCursor(filter, afterId, limit + 1);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return { items, nextCursor };
}
export async function listTasks(filter, start, end) {
    const skipCount = start - 1;
    const limitCount = end - start + 1;
    const totalCount = await repository.countByFilter(filter);
    const tasks = await repository.findByFilter(filter, skipCount, limitCount);
    return { totalCount, tasks };
}
