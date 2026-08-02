import path from 'path';
import process from 'process';

export const DB_PATH = path.join(process.cwd(), 'todo.db');
export const OLD_JSON_PATH = path.join(process.cwd(), 'tasks.json');