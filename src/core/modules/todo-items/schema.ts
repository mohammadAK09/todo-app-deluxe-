import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const users = pgTable ('users', {
    id: serial('id').primaryKey(),
    text: text('name').notNull(),
}
)

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;