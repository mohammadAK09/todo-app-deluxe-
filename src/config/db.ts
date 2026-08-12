import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_URL } from './env.ts';

const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool);

export async function closeDb(): Promise<void> {
    await pool.end();
}