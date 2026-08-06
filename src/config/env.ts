import { loadEnvFile } from 'node:process';
import path from 'node:path';

const envPath = path.join(import.meta.dirname, '../../.env');
loadEnvFile(envPath);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env');
}

export const DATABASE_URL = databaseUrl;