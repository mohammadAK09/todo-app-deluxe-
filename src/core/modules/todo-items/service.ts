import { TodoRepository, type Task } from './repository.ts';
import { LegacyMigrator } from './legacyMigrator.ts';
import { OLD_JSON_PATH } from '../../../config/env.ts';

export class TodoService {
    private repository: TodoRepository;   // step 1: declare the field
    constructor(repository: TodoRepository = new TodoRepository()) {
        this.repository = repository;      // step 2: assign it yourself
    }
    async migrateLegacyData(): Promise<{ migrated: boolean; count: number }> {
        if (!LegacyMigrator.hasLegacyFile(OLD_JSON_PATH)) return { migrated: false, count: 0 };
    
        const oldTasks = LegacyMigrator.readLegacyTasks(OLD_JSON_PATH);
        if (oldTasks.length === 0) return { migrated: false, count: 0 };
    
        const migrationDate = new Date().toISOString();
        for (const task of oldTasks) {
            const doc = LegacyMigrator.normalizeTask(task, migrationDate);
            await this.repository.update({ id: doc.id }, { $set: doc });
        }
        LegacyMigrator.archiveLegacyFile(OLD_JSON_PATH);
    
        return { migrated: true, count: oldTasks.length };
    }

    // service.ts
async addTask(text: string | undefined): Promise<Task> {
    const trimmed = text?.trim();
    if (!trimmed) {
        throw new Error('Task text cannot be empty');
    }

    const nextId = await this.repository.findNextId();
    const newTask: Task = {
        id: nextId,
        text: trimmed,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        deletedAt: null
    };
    return this.repository.insert(newTask);
}

    async getTask(id: number): Promise<Task | null> {
        return this.repository.findOne({ id, deletedAt: null });
    }

    async listTasks(filter: string, start: number, end: number) {
        let query: any = {};
        if (filter === 'deleted') {
            query = { deletedAt: { $ne: null } };
        } else {
            query.deletedAt = null;
            if (filter === 'completed') query.completed = true;
            if (filter === 'pending') query.completed = false;
        }

        const skipCount = start - 1;
        const limitCount = end - start + 1;

        const totalCount = await this.repository.count(query);
        const tasks = await this.repository.find(query, skipCount, limitCount);

        return { totalCount, tasks };
    }

    async softDeleteTask(id: number): Promise<boolean> {
        const updated = await this.repository.update(
            { id, deletedAt: null },
            { $set: { deletedAt: new Date().toISOString() } }
        );
        return updated > 0;
    }

    async restoreTask(id: number): Promise<boolean> {
        const updated = await this.repository.update(
            { id, deletedAt: { $ne: null } },
            { $set: { deletedAt: null, updatedAt: new Date().toISOString() } }
        );
        return updated > 0;
    }

    async toggleTask(id: number): Promise<Task | null> {
        const task = await this.repository.findOne({ id, deletedAt: null });
        if (!task) return null;

        const newStatus = !task.completed;
        const updateTimestamp = new Date().toISOString();

        await this.repository.update(
            { id },
            { $set: { completed: newStatus, updatedAt: updateTimestamp } }
        );

        return { ...task, completed: newStatus };
    }
}