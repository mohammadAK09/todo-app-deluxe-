import { eq, and } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { tasks } from '../todo-items/schema.js';
import * as repository from './repository.js';
import type { Permission } from './repository.js';
import type { TaskAccess } from './schema.js';

export class ForbiddenError extends Error {
    constructor(message = 'Not allowed') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

export async function grantAccess(
    ownerId: number,
    viewerId: number,
    permission: Permission,
    taskId: number | null,
): Promise<TaskAccess> {
    if (ownerId === viewerId) {
        throw new Error('Cannot share with yourself');
    }

    if (taskId !== null) {
        const [task] = await db.select({ id: tasks.id }).from(tasks)
            .where(and(eq(tasks.id, taskId), eq(tasks.createdBy, ownerId)));
        if (!task) {
            throw new ForbiddenError('You do not own that task');
        }
    }

    return repository.grant(ownerId, viewerId, permission, taskId);
}

export async function revokeAccess(
    ownerId: number,
    viewerId: number,
    taskId: number | null,
): Promise<boolean> {
    return repository.revoke(ownerId, viewerId, taskId);
}

export async function listGrantsIMade(ownerId: number): Promise<TaskAccess[]> {
    return repository.findByOwner(ownerId);
}

export async function listGrantsIReceived(viewerId: number): Promise<TaskAccess[]> {
    return repository.findByViewer(viewerId);
}