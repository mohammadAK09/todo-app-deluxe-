import { eq, and, isNull, isNotNull, asc, gt, count, inArray } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { tasks, type Task, type NewTask } from './schema.js';
import { taskAccess } from '../task-access/schema.js';

export type TaskFilter = 'all' | 'completed' | 'pending' | 'deleted';

function buildFilterCondition(filter: TaskFilter) {
    if (filter === 'deleted') return isNotNull(tasks.deletedAt);
    if (filter === 'completed') return and(isNull(tasks.deletedAt), eq(tasks.completed, true));
    if (filter === 'pending') return and(isNull(tasks.deletedAt), eq(tasks.completed, false));
    return isNull(tasks.deletedAt);
}

// NEW: figures out every owner ID a given user is allowed to see (themselves + anyone who granted access)
async function getVisibleOwnerIds(userId: number): Promise<number[]> {
    const grants = await db.select({ ownerId: taskAccess.ownerId })
        .from(taskAccess)
        .where(eq(taskAccess.viewerId, userId));
    return [userId, ...grants.map((g) => g.ownerId)];
}

export async function insert(task: NewTask): Promise<Task> {
    const [inserted] = await db.insert(tasks).values(task).returning();
    return inserted;
}

// UPDATED: now checks createdBy matches the requesting user
export async function findActiveById(id: number, userId: number): Promise<Task | null> {
    const ownerIds = await getVisibleOwnerIds(userId);
    const [task] = await db.select().from(tasks)
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt), inArray(tasks.createdBy, ownerIds)));
    return task ?? null;
}

export async function countByFilter(filter: TaskFilter, userId: number): Promise<number> {
    const ownerIds = await getVisibleOwnerIds(userId);
    const [result] = await db.select({ value: count() }).from(tasks)
        .where(and(buildFilterCondition(filter), inArray(tasks.createdBy, ownerIds)));
    return result.value;
}

// UPDATED: only allows updates on tasks the user owns (not just "visible")
export async function updateFields(id: number, userId: number, fields: Partial<NewTask>): Promise<number> {
    const result = await db.update(tasks).set(fields)
        .where(and(eq(tasks.id, id), eq(tasks.createdBy, userId)))
        .returning({ id: tasks.id });
    return result.length;
}

export async function softDelete(id: number, userId: number): Promise<boolean> {
    const result = await db.update(tasks)
        .set({ deletedAt: new Date() })
        .where(and(eq(tasks.id, id), eq(tasks.createdBy, userId), isNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
    return result.length > 0;
}

export async function restore(id: number, userId: number): Promise<boolean> {
    const result = await db.update(tasks)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(and(eq(tasks.id, id), eq(tasks.createdBy, userId), isNotNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
    return result.length > 0;
}

export async function findByCursor(filter: TaskFilter, userId: number, afterId: number | null, limit: number): Promise<Task[]> {
    const ownerIds = await getVisibleOwnerIds(userId);
    const filterCond = buildFilterCondition(filter);
    const cursorCond = afterId !== null ? gt(tasks.id, afterId) : undefined;

    return db.select()
        .from(tasks)
        .where(and(filterCond, inArray(tasks.createdBy, ownerIds), cursorCond))
        .orderBy(asc(tasks.id))
        .limit(limit);
}

export async function findByFilter(filter: TaskFilter, userId: number, skip: number, limit: number): Promise<Task[]> {
    const ownerIds = await getVisibleOwnerIds(userId);
    return db.select().from(tasks)
        .where(and(buildFilterCondition(filter), inArray(tasks.createdBy, ownerIds)))
        .orderBy(asc(tasks.id))
        .offset(skip)
        .limit(limit);
}