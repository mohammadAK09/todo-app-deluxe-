import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from '../users/schema.js';



export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    completed: boolean('completed').notNull().default(false),
    createdBy: integer('created_by').notNull().references(() => users.id),
    deletedAt: timestamp('deleted_at'),
    updatedAt: timestamp('updated_at'),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;