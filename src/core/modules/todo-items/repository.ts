import { eq, and, or, isNull, isNotNull, asc, gt, count, inArray, type SQL } from 'drizzle-orm';
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

// Tasks a user may READ: their own, plus anything covered by a grant.
// Blanket grants (task_id IS NULL) cover every task of that owner.
// Per-task grants cover exactly one task id.
async function buildVisibilityCondition(userId: number): Promise<SQL> {
    const grants = await db
        .select({ ownerId: taskAccess.ownerId, taskId: taskAccess.taskId })
        .from(taskAccess)
        .where(eq(taskAccess.viewerId, userId));

    const blanketOwnerIds = [userId, ...grants.filter((g) => g.taskId === null).map((g) => g.ownerId)];
    const grantedTaskIds = grants.filter((g) => g.taskId !== null).map((g) => g.taskId as number);

    const byOwner = inArray(tasks.createdBy, blanketOwnerIds);
    if (grantedTaskIds.length === 0) return byOwner;

    return or(byOwner, inArray(tasks.id, grantedTaskIds))!;
}

// Tasks a user may WRITE: their own, plus anything covered by a 'write' grant.
export async function canWrite(taskId: number, userId: number): Promise<boolean> {
    const [task] = await db.select({ createdBy: tasks.createdBy }).from(tasks)
        .where(eq(tasks.id, taskId));
    if (!task) return false;
    if (task.createdBy === userId) return true;

    const [grantRow] = await db.select({ id: taskAccess.id }).from(taskAccess)
        .where(and(
            eq(taskAccess.viewerId, userId),
            eq(taskAccess.ownerId, task.createdBy),
            eq(taskAccess.permission, 'write'),
            or(isNull(taskAccess.taskId), eq(taskAccess.taskId, taskId)),
        ));
    return Boolean(grantRow);
}

export async function insert(task: NewTask): Promise<Task> {
    const [inserted] = await db.insert(tasks).values(task).returning();
    return inserted;
}

export async function findActiveById(id: number, userId: number): Promise<Task | null> {
    const visible = await buildVisibilityCondition(userId);
    const [task] = await db.select().from(tasks)
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt), visible));
    return task ?? null;
}

export async function countByFilter(filter: TaskFilter, userId: number): Promise<number> {
    const visible = await buildVisibilityCondition(userId);
    const [result] = await db.select({ value: count() }).from(tasks)
        .where(and(buildFilterCondition(filter), visible));
    return result.value;
}

// Authorization happens in the service via canWrite — these are scoped by id only.
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
    const visible = await buildVisibilityCondition(userId);
    const cursorCond = afterId !== null ? gt(tasks.id, afterId) : undefined;

    return db.select().from(tasks)
        .where(and(buildFilterCondition(filter), visible, cursorCond))
        .orderBy(asc(tasks.id))
        .limit(limit);
}

export async function findByFilter(
    filter: TaskFilter, userId: number, skip: number, limit: number,
): Promise<Task[]> {
    const visible = await buildVisibilityCondition(userId);
    return db.select().from(tasks)
        .where(and(buildFilterCondition(filter), visible))
        .orderBy(asc(tasks.id))
        .offset(skip)
        .limit(limit);
}