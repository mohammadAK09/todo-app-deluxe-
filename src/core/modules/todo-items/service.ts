import { TodoRepository, type TaskFilter } from './repository.ts';
import type { Task } from './schema.ts'; 

export class TodoService {
    private repository: TodoRepository;

    constructor(repository: TodoRepository = new TodoRepository()) {
        this.repository = repository;
    }

    async addTask(text: string): Promise<Task> {
        const trimmed = text?.trim();
        if (!trimmed) throw new Error('Task text cannot be empty');

        return this.repository.insert({ text: trimmed, completed: false });
    }

    async getTask(id: number): Promise<Task | null> {
        return this.repository.findActiveById(id);
    }

    async listTasks(filter: TaskFilter, start: number, end: number) {
        const skipCount = start - 1;
        const limitCount = end - start + 1;

        const totalCount = await this.repository.countByFilter(filter);
        const tasks = await this.repository.findByFilter(filter, skipCount, limitCount);

        return { totalCount, tasks };
    }

    async softDeleteTask(id: number): Promise<boolean> {
        return this.repository.softDelete(id);
    }

    async restoreTask(id: number): Promise<boolean> {
        return this.repository.restore(id);
    }

    async toggleTask(id: number): Promise<Task | null> {
        const task = await this.repository.findActiveById(id);
        if (!task) return null;

        const newStatus = !task.completed;
        await this.repository.updateFields(id, { completed: newStatus, updatedAt: new Date() });

        return { ...task, completed: newStatus };
    }
}