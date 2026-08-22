import { eq } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { users, type User, type NewUser } from './schema.js';

export async function findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
}

export async function insert(user: NewUser): Promise<User> {
    const [inserted] = await db.insert(users).values(user).returning();
    return inserted;
}