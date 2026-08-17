import { loadEnvFile } from 'node:process';
import path from 'node:path';
const envPath = path.join(import.meta.dirname, '../../.env');
try {
    loadEnvFile(envPath);
}
catch (err) {
    const isMissingFile = err instanceof Error && 'code' in err && err.code === 'ENOENT';
    if (!isMissingFile)
        throw err;
    // no .env file found — assume env vars are supplied another way (e.g. a host)
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env');
}
export const DATABASE_URL = databaseUrl;
export const API_PORT = Number(process.env.API_PORT ?? 3000);
