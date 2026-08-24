import { pgTable, serial, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from '../users/schema.js';
import { tasks } from '../todo-items/schema.js';

// One row = one user may fully access one task.
// The task's owner gets a row automatically when the task is created.
export const taskAccess = pgTable('task_access', {
    id: serial('id').primaryKey(),
    taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
    unique('task_access_task_user_unique').on(t.taskId, t.userId),
]);

export type TaskAccess = typeof taskAccess.$inferSelect;
export type NewTaskAccess = typeof taskAccess.$inferInsert;