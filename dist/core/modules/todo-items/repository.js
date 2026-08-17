import { eq, and, isNull, isNotNull, asc, gt, count } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { tasks } from './schema.js';
function buildFilterCondition(filter) {
    if (filter === 'deleted')
        return isNotNull(tasks.deletedAt);
    if (filter === 'completed')
        return and(isNull(tasks.deletedAt), eq(tasks.completed, true));
    if (filter === 'pending')
        return and(isNull(tasks.deletedAt), eq(tasks.completed, false));
    return isNull(tasks.deletedAt);
}
export async function insert(task) {
    const [inserted] = await db.insert(tasks).values(task).returning();
    return inserted;
}
export async function findActiveById(id) {
    const [task] = await db.select().from(tasks)
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
    return task ?? null;
}
export async function countByFilter(filter) {
    const [result] = await db.select({ value: count() }).from(tasks)
        .where(buildFilterCondition(filter));
    return result.value;
}
export async function updateFields(id, fields) {
    const result = await db.update(tasks).set(fields)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id });
    return result.length;
}
export async function softDelete(id) {
    const result = await db.update(tasks)
        .set({ deletedAt: new Date() })
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
    return result.length > 0;
}
export async function restore(id) {
    const result = await db.update(tasks)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(and(eq(tasks.id, id), isNotNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
    return result.length > 0;
}
export async function findByCursor(filter, afterId, limit) {
    const filterCond = buildFilterCondition(filter);
    const cursorCond = afterId !== null ? gt(tasks.id, afterId) : undefined;
    return db.select()
        .from(tasks)
        .where(and(filterCond, cursorCond))
        .orderBy(asc(tasks.id))
        .limit(limit);
}
export async function findByFilter(filter, skip, limit) {
    return db.select().from(tasks)
        .where(buildFilterCondition(filter))
        .orderBy(asc(tasks.id))
        .offset(skip)
        .limit(limit);
}
