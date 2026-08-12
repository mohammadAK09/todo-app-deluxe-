import { Router } from 'express';
import {
    createTask,
    getTask,
    listTasks,
    toggleTask,
    deleteTask,
    restoreTask,
} from '../controllers/taskcontroller.ts';

export const tasksRouter = Router();

tasksRouter.post('/', createTask);
tasksRouter.get('/', listTasks);
tasksRouter.get('/:id', getTask);
tasksRouter.patch('/:id/toggle', toggleTask);
tasksRouter.delete('/:id', deleteTask);
tasksRouter.post('/:id/restore', restoreTask);