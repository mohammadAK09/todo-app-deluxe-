import { defineConfig } from 'drizzle-kit';
import { loadEnvFile } from 'node:process';

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env');
}

export default defineConfig({
    schema: './src/core/modules/**/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: databaseUrl,
    },
});