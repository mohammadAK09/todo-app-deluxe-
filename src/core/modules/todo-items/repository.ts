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

// task_access is the single source of truth. A user sees exactly the tasks
// they have a row for — including their own, which is inserted on create.
function accessibleTaskIds(userId: number) {
    return db.select({ id: taskAccess.taskId }).from(taskAccess)
        .where(eq(taskAccess.userId, userId));
}

function visibleTo(userId: number) {
    return inArray(tasks.id, accessibleTaskIds(userId));
}

// Access is all-or-nothing, so reading and writing use the same check.
export async function hasAccess(taskId: number, userId: number): Promise<boolean> {
    const [row] = await db.select({ id: taskAccess.id }).from(taskAccess)
        .where(and(eq(taskAccess.taskId, taskId), eq(taskAccess.userId, userId)));
    return Boolean(row);
}

/** Creates the task and the owner's access row together, or neither. */
export async function insert(task: NewTask): Promise<Task> {
    return db.transaction(async (tx) => {
        const [inserted] = await tx.insert(tasks).values(task).returning();
        await tx.insert(taskAccess).values({ taskId: inserted.id, userId: inserted.createdBy });
        return inserted;
    });
}

export async function findActiveById(id: number, userId: number): Promise<Task | null> {
    const [task] = await db.select().from(tasks)
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt), visibleTo(userId)));
    return task ?? null;
}

export async function findAnyById(id: number, userId: number): Promise<Task | null> {
    const [task] = await db.select().from(tasks)
        .where(and(eq(tasks.id, id), visibleTo(userId)));
    return task ?? null;
}

export async function countByFilter(filter: TaskFilter, userId: number): Promise<number> {
    const [result] = await db.select({ value: count() }).from(tasks)
        .where(and(buildFilterCondition(filter), visibleTo(userId)));
    return result.value;
}

export async function updateFields(id: number, fields: Partial<NewTask>): Promise<number> {
    const result = await db.update(tasks).set(fields)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id });
    return result.length;
}

export async function softDelete(id: number): Promise<boolean> {
    const result = await db.update(tasks)
        .set({ deletedAt: new Date() })
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
    return result.length > 0;
}

export async function restore(id: number): Promise<boolean> {
    const result = await db.update(tasks)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(and(eq(tasks.id, id), isNotNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
    return result.length > 0;
}

export async function findByCursor(
    filter: TaskFilter, userId: number, afterId: number | null, limit: number,
): Promise<Task[]> {
    const cursorCond = afterId !== null ? gt(tasks.id, afterId) : undefined;
    return db.select().from(tasks)
        .where(and(buildFilterCondition(filter), visibleTo(userId), cursorCond))
        .orderBy(asc(tasks.id))
        .limit(limit);
}

export async function findByFilter(
    filter: TaskFilter, userId: number, skip: number, limit: number,
): Promise<Task[]> {
    return db.select().from(tasks)
        .where(and(buildFilterCondition(filter), visibleTo(userId)))
        .orderBy(asc(tasks.id))
        .offset(skip)
        .limit(limit);
}