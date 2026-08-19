import { Router } from 'express';
import {
    createTask,
    getTask,
    listTasks,
    toggleTask,
    deleteTask,
    restoreTask,
    listTasksByCursor,
} from '../controllers/taskcontroller.js';

export const tasksRouter = Router();

tasksRouter.post('/', createTask);
tasksRouter.get('/cursor', listTasksByCursor); 

tasksRouter.patch('/:id/toggle', toggleTask);
tasksRouter.delete('/:id', deleteTask);
tasksRouter.post('/:id/restore', restoreTask);
tasksRouter.get('/', listTasks);
tasksRouter.get('/:id', getTask);