import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { taskAccess, type TaskAccess } from './schema.js';

export type Permission = 'read' | 'write';

export async function grant(
    ownerId: number,
    viewerId: number,
    permission: Permission,
    taskId: number | null,
): Promise<TaskAccess> {
    const [row] = await db.insert(taskAccess)
        .values({ ownerId, viewerId, permission, taskId })
        .onConflictDoUpdate({
            target: [taskAccess.ownerId, taskAccess.viewerId, taskAccess.taskId],
            set: { permission },
        })
        .returning();
    return row;
}

export async function revoke(
    ownerId: number,
    viewerId: number,
    taskId: number | null,
): Promise<boolean> {
    const rows = await db.delete(taskAccess)
        .where(and(
            eq(taskAccess.ownerId, ownerId),
            eq(taskAccess.viewerId, viewerId),
            taskId === null ? isNull(taskAccess.taskId) : eq(taskAccess.taskId, taskId),
        ))
        .returning({ id: taskAccess.id });
    return rows.length > 0;
}

export async function findByOwner(ownerId: number): Promise<TaskAccess[]> {
    return db.select().from(taskAccess).where(eq(taskAccess.ownerId, ownerId));
}

export async function findByViewer(viewerId: number): Promise<TaskAccess[]> {
    return db.select().from(taskAccess).where(eq(taskAccess.viewerId, viewerId));
}