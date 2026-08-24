import { eq } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { tasks } from '../todo-items/schema.js';
import { ForbiddenError } from '../../errors.js';
import * as repository from './repository.js';

async function findOwner(taskId: number): Promise<number | null> {
    const [task] = await db.select({ createdBy: tasks.createdBy }).from(tasks)
        .where(eq(tasks.id, taskId));
    return task?.createdBy ?? null;
}

/** Only the owner may share. Returns null if the task does not exist. */
export async function shareTask(taskId: number, targetUserId: number, requesterId: number) {
    const ownerId = await findOwner(taskId);
    if (ownerId === null) return null;
    if (ownerId !== requesterId) {
        throw new ForbiddenError('Only the task owner can share it');
    }
    if (targetUserId === requesterId) {
        throw new ForbiddenError('You already have access to this task');
    }
    // onConflictDoNothing returns null when the grant already exists.
    return (await repository.grant(taskId, targetUserId)) ?? { taskId, userId: targetUserId, alreadyShared: true };
}

/** Only the owner may revoke, and never their own access. */
export async function unshareTask(taskId: number, targetUserId: number, requesterId: number) {
    const ownerId = await findOwner(taskId);
    if (ownerId === null) return null;
    if (ownerId !== requesterId) {
        throw new ForbiddenError('Only the task owner can revoke access');
    }
    if (targetUserId === ownerId) {
        throw new ForbiddenError('The owner cannot remove their own access');
    }
    return repository.revoke(taskId, targetUserId);
}

/** Who can access this task. Anyone with access may look. */
export async function listAccess(taskId: number, requesterId: number) {
    const ownerId = await findOwner(taskId);
    if (ownerId === null) return null;
    if (!(await repository.hasAccess(taskId, requesterId))) {
        throw new ForbiddenError('You do not have access to this task');
    }

    const rows = await repository.listUsersForTask(taskId);
    return {
        taskId,
        ownerId,
        users: rows.map((r) => ({ ...r, isOwner: r.userId === ownerId })),
    };
}

export async function listSharedWithMe(userId: number) {
    return repository.listSharedWithUser(userId);
}