import { Router } from 'express';
import {
    createTask,
    getTask,
    listTasks,
    toggleTask,
    deleteTask,
    restoreTask,
    listTasksByCursor,
    shareAccess,
    revokeShare,
    listSharedWithMe,
} from '../controllers/taskcontroller.js';
import { requireAuth } from '../middleware/auth.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.post('/share', shareAccess);
tasksRouter.delete('/share/:viewerId', revokeShare);
tasksRouter.get('/shared-with-me', listSharedWithMe);

tasksRouter.post('/', createTask);
tasksRouter.patch('/:id/toggle', toggleTask);
tasksRouter.delete('/:id', deleteTask);
tasksRouter.post('/:id/restore', restoreTask);
tasksRouter.get('/cursor', listTasksByCursor);
tasksRouter.get('/', listTasks);
tasksRouter.get('/:id', getTask);