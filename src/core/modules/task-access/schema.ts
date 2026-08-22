import { pgTable, serial, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from '../users/schema.ts';

export const taskAccess = pgTable('task_access', {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().references(() => users.id),
    viewerId: integer('viewer_id').notNull().references(() => users.id),
    permission: text('permission').notNull().default('read'), // 'read' for now, room to grow
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    uniqueGrant: unique().on(table.ownerId, table.viewerId),
}));

export type TaskAccess = typeof taskAccess.$inferSelect;
export type NewTaskAccess = typeof taskAccess.$inferInsert;