import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { tasksRouter } from './routes/tasks.js';
import { closeDb } from '../config/db.js';
import { API_PORT } from '../config/env.js';
// Read version from package.json
const packageJsonPath = path.join(import.meta.dirname, '../../package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const app = express();
app.use(express.json());
// Version endpoint
app.get('/version', (req, res) => {
    res.json({ version });
});
app.use('/tasks', tasksRouter);
app.use('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
});
const server = app.listen(API_PORT, () => console.log(`API listening on http://localhost:${API_PORT}`));
process.on('SIGINT', async () => {
    server.close();
    await closeDb();
    process.exit(0);
});
