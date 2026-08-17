import { eq, and, isNull, isNotNull, asc, gt, lt, count } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { tasks, type Task, type NewTask } from './schema.js';

export type TaskFilter = 'all' | 'completed' | 'pending' | 'deleted';

function buildFilterCondition(filter: TaskFilter) {
    if (filter === 'deleted') return isNotNull(tasks.deletedAt);
    if (filter === 'completed') return and(isNull(tasks.deletedAt), eq(tasks.completed, true));
    if (filter === 'pending') return and(isNull(tasks.deletedAt), eq(tasks.completed, false));
    return isNull(tasks.deletedAt);
}

export async function insert(task: NewTask): Promise<Task> {
    const [inserted] = await db.insert(tasks).values(task).returning();
    return inserted;
}

export async function findActiveById(id: number): Promise<Task | null> {
    const [task] = await db.select().from(tasks)
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
    return task ?? null;
}



export async function countByFilter(filter: TaskFilter): Promise<number> {
    const [result] = await db.select({ value: count() }).from(tasks)
        .where(buildFilterCondition(filter));
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




export async function findByCursor(filter: TaskFilter, afterId: number | null, limit: number): Promise<Task[]> {
    const filterCond = buildFilterCondition(filter);
    const cursorCond = afterId !== null ? gt(tasks.id, afterId) : undefined;

    return db.select()
        .from(tasks)
        .where(and(filterCond, cursorCond))
        .orderBy(asc(tasks.id))
        .limit(limit);
}

export async function findByFilter(filter: TaskFilter, skip: number, limit: number): Promise<Task[]> {
    return db.select().from(tasks)
        .where(buildFilterCondition(filter))
        .orderBy(asc(tasks.id))
        .offset(skip)
        .limit(limit);
}
