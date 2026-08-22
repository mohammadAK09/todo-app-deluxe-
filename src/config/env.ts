import { loadEnvFile } from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

const envPath = path.join(import.meta.dirname, '../../.env');

if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env');
}
export const DATABASE_URL = databaseUrl;

export const API_PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET in .env');
}
export const JWT_SECRET = jwtSecret;