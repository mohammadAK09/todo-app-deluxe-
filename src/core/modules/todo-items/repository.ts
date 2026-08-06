import { eq, and, isNull, isNotNull, asc, count } from 'drizzle-orm';
import { db } from '../../../config/db.ts';
import { tasks, type Task, type NewTask } from './schema.ts';

export type TaskFilter = 'all' | 'completed' | 'pending' | 'deleted';

export class TodoRepository {
    async insert(task: NewTask): Promise<Task> {
        const [inserted] = await db.insert(tasks).values(task).returning();
        return inserted;
    }

    async findActiveById(id: number): Promise<Task | null> {
        const [task] = await db.select().from(tasks)
            .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
        return task ?? null;
    }

    async findByFilter(filter: TaskFilter, skip: number, limit: number): Promise<Task[]> {
        return db.select().from(tasks)
            .where(this.buildFilterCondition(filter))
            .orderBy(asc(tasks.id))
            .offset(skip)
            .limit(limit);
    }

    async countByFilter(filter: TaskFilter): Promise<number> {
        const [result] = await db.select({ value: count() }).from(tasks)
            .where(this.buildFilterCondition(filter));
        return result.value;
    }

    async updateFields(id: number, fields: Partial<NewTask>): Promise<number> {
        const result = await db.update(tasks).set(fields)
            .where(eq(tasks.id, id))
            .returning({ id: tasks.id });
        return result.length;
    }

    async softDelete(id: number): Promise<boolean> {
        const result = await db.update(tasks)
            .set({ deletedAt: new Date() })
            .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
            .returning({ id: tasks.id });
        return result.length > 0;
    }

    async restore(id: number): Promise<boolean> {
        const result = await db.update(tasks)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(and(eq(tasks.id, id), isNotNull(tasks.deletedAt)))
            .returning({ id: tasks.id });
        return result.length > 0;
    }

    private buildFilterCondition(filter: TaskFilter) {
        if (filter === 'deleted') return isNotNull(tasks.deletedAt);
        if (filter === 'completed') return and(isNull(tasks.deletedAt), eq(tasks.completed, true));
        if (filter === 'pending') return and(isNull(tasks.deletedAt), eq(tasks.completed, false));
        return isNull(tasks.deletedAt);
    }
}