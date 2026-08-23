import { pgTable, serial, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from '../users/schema.js';
import { tasks } from '../todo-items/schema.js';

export const taskAccess = pgTable('task_access', {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    viewerId: integer('viewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    permission: text('permission', { enum: ['read', 'write'] }).notNull().default('read'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
    unique('task_access_unique').on(t.ownerId, t.viewerId, t.taskId).nullsNotDistinct(),
]);

export type TaskAccess = typeof taskAccess.$inferSelect;
export type NewTaskAccess = typeof taskAccess.$inferInsert;