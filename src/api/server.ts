import express from 'express';
import { tasksRouter } from './routes/tasks.ts';
import { closeDb } from '../config/db.ts';
import { API_PORT } from '../config/env.ts';

const app = express();
app.use(express.json());
app.use('/tasks', tasksRouter);


app.use('/health', (req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok' });
});


const server = app.listen(API_PORT, () => console.log(`API listening on http://localhost:${API_PORT}`));

process.on('SIGINT', async () => {
    server.close();
    await closeDb();
    process.exit(0);
});




app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Somthing wenet wrong' });
});