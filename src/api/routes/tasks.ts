import { Router } from 'express';
import {
    createTask,
    getTask,
    listTasks,
    toggleTask,
    deleteTask,
    restoreTask,
    listTasksByCursor,
    shareTask,
    unshareTask,
    listTaskAccess,
    listSharedWithMe,
} from '../controllers/taskcontroller.js';
import { requireAuth } from '../middleware/auth.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth); // every route below this line now requires a valid token

// Static paths first, so ':id' does not swallow them.
tasksRouter.get('/cursor', listTasksByCursor);
tasksRouter.get('/shared-with-me', listSharedWithMe);

tasksRouter.post('/', createTask);
tasksRouter.get('/', listTasks);

tasksRouter.post('/:id/share', shareTask);
tasksRouter.delete('/:id/share/:userId', unshareTask);
tasksRouter.get('/:id/access', listTaskAccess);

tasksRouter.patch('/:id/toggle', toggleTask);
tasksRouter.post('/:id/restore', restoreTask);
tasksRouter.delete('/:id', deleteTask);
tasksRouter.get('/:id', getTask);