import { loadEnvFile } from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

const envPath = path.join(import.meta.dirname, '../../.env');

// Only load .env locally — it won't exist on Render, which injects env vars directly
if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env');
}

export const DATABASE_URL = databaseUrl;

export const API_PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);