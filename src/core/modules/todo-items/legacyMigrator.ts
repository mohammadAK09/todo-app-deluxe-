import fs from 'fs';
import path from 'path';
import type { Task } from './repository.ts';

export class LegacyMigrator {
    static hasLegacyFile(jsonPath: string): boolean {
        return fs.existsSync(jsonPath);
    }

    static readLegacyTasks(jsonPath: string): any[] {
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(rawData);
        return Array.isArray(parsed) ? parsed : [];
    }

    static archiveLegacyFile(jsonPath: string): void {
        fs.renameSync(jsonPath, path.join(process.cwd(), 'tasks.json.bak'));
    }

    static normalizeTask(task: any, migrationDate: string): Task {
        return {
            id: task.id,
            text: task.text,
            completed: task.completed || false,
            createdAt: task.createdAt || migrationDate,
            updatedAt: task.updatedAt || null,
            deletedAt: task.deletedAt || null,
        };
    }
}