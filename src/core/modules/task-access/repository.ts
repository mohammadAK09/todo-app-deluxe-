import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { users } from '../users/schema.js';
import { tasks } from '../todo-items/schema.js';
import { taskAccess, type TaskAccess } from './schema.js';

export async function grant(taskId: number, userId: number): Promise<TaskAccess | null> {
    const [row] = await db.insert(taskAccess)
        .values({ taskId, userId })
        .onConflictDoNothing({ target: [taskAccess.taskId, taskAccess.userId] })
        .returning();
    return row ?? null;
}

export async function revoke(taskId: number, userId: number): Promise<boolean> {
    const rows = await db.delete(taskAccess)
        .where(and(eq(taskAccess.taskId, taskId), eq(taskAccess.userId, userId)))
        .returning({ id: taskAccess.id });
    return rows.length > 0;
}

export async function hasAccess(taskId: number, userId: number): Promise<boolean> {
    const [row] = await db.select({ id: taskAccess.id }).from(taskAccess)
        .where(and(eq(taskAccess.taskId, taskId), eq(taskAccess.userId, userId)));
    return Boolean(row);
}

/** Everyone who can access a task, with the owner flagged. */
export async function listUsersForTask(taskId: number) {
    return db
        .select({
            userId: users.id,
            email: users.email,
            grantedAt: taskAccess.createdAt,
        })
        .from(taskAccess)
        .innerJoin(users, eq(taskAccess.userId, users.id))
        .where(eq(taskAccess.taskId, taskId));
}

/** Tasks shared with this user by someone else (excludes their own). */
export async function listSharedWithUser(userId: number) {
    return db
        .select({
            taskId: tasks.id,
            text: tasks.text,
            completed: tasks.completed,
            ownerId: tasks.createdBy,
        })
        .from(taskAccess)
        .innerJoin(tasks, eq(taskAccess.taskId, tasks.id))
        .where(and(eq(taskAccess.userId, userId), ne(tasks.createdBy, userId)));
}