import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { tasksRouter } from './routes/tasks.js';
import { authRouter } from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';   // ← verify the exported name
import { closeDb } from '../config/db.js';
import { API_PORT } from '../config/env.js';

const packageJsonPath = path.join(import.meta.dirname, '../../package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const app = express();
app.use(express.json());

// --- Public routes ---
app.get('/version', (req, res) => {
    res.json({ version });
});

app.get('/health', (req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRouter);

// --- Protected routes ---
app.use('/tasks', tasksRouter);

// --- 404 + error handling (must stay last) ---
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
});

const server = app.listen(API_PORT, () => console.log(`API listening on http://localhost:${API_PORT}`));

async function shutdown(signal: string) {
    console.log(`\n${signal} received, shutting down.`);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDb();
    process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));