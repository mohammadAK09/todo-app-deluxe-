import { Router } from 'express';
import {
    createTask,
    getTask,
    listTasks,
    toggleTask,
    deleteTask,
    restoreTask,
    listTasksByCursor,
} from '../controllers/taskcontroller.ts';

export const tasksRouter = Router();

tasksRouter.post('/', createTask);
tasksRouter.patch('/:id/toggle', toggleTask);
tasksRouter.delete('/:id', deleteTask);
tasksRouter.post('/:id/restore', restoreTask);
tasksRouter.get('/cursor', listTasksByCursor); 
tasksRouter.get('/', listTasks);
tasksRouter.get('/:id', getTask);