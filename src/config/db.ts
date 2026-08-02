import { JSONFilePreset } from 'lowdb/node';
import { DB_PATH } from './env.js';


export interface Task {
    _id?: string;
    id: number;
    text: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string | null;
    deletedAt: string | null;
}

interface User {

}

export type TaskQuery = Omit<Partial<Task>, 'deletedAt'> & {
    deletedAt?: string | null | { $ne: null };
};

export type TaskUpdate = { $set: Partial<Task> };
export interface Data {
  tasks: Task[];
  user: User[];
}

// Lowdb creates the file automatically and binds full autocomplete tracking
export const db = await JSONFilePreset<Data>(DB_PATH, { tasks: [], user: [] });
