import * as service from '../core/modules/todo-items/service.js';
import type { TaskFilter } from '../core/modules/todo-items/repository.js';
import path from 'node:path';
import fs from 'node:fs';

function formatTaskText(text: string, length = 35): string {
    return text.length > length ? text.substring(0, length - 3).concat('...').padEnd(length) : text.padEnd(length);
}

export function printVersion(): void {
    const packageJsonPath = path.join(import.meta.dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(`todo v${packageJson.version}`);
}

export function printUsage(binName: string): void {
    console.log(`
💡 Usage Guide:
  ${binName} add "Task Name"             - Add a new task
  ${binName} list                        - List active tasks (Default 1-10)
  ${binName} list <start> <end>          - Range list (e.g., ${binName} list 5 15)
  ${binName} list <filter> <start> <end> - Filtered list (completed, pending, deleted)
  ${binName} get <id>                    - Get single task by ID
  ${binName} delete <id>                 - Soft delete task
  ${binName} restore <id>                - Restore soft-deleted task
  ${binName} toggle <id>                 - Toggle task status
  ${binName} version                     - Show app version
    `);
}

export async function addTask(taskText: string | undefined): Promise<void> {
    if (!taskText) {
        console.error(`❌ Error: Specify a task name.`);
        process.exitCode = 1;
        return;
    }
    try {
        const doc = await service.addTask(taskText);
        console.log(`\n➕ Added task: "${doc.text}" (ID: ${doc.id})`);
    } catch (err: any) {
        console.error(`❌ Error: ${err.message}`);
        process.exitCode = 1;
    }
}

export async function getTask(idArg: string | undefined): Promise<void> {
    const fetchId = Number(idArg);
    if (isNaN(fetchId)) {
        console.error("❌ Error: Valid ID required.");
        process.exitCode = 1;
        return;
    }
    const task = await service.getTask(fetchId);
    if (task) {
        console.log(`\n📌 Task Details:\n  ID: ${task.id}\n  Text: "${task.text}"\n  Status: ${task.completed ? "Completed" : "Pending"}`);
    } else {
        console.error(`❌ Active task ID ${fetchId} not found.`);
        process.exitCode = 1;
    }
}

export async function listTasks(args: string[], binName: string): Promise<void> {
    const validFilters = ['all', 'completed', 'pending', 'deleted'];
    let filter: TaskFilter = 'all', start = 1, end = 10;

    if (args.length > 0) {
        if (validFilters.includes(args[0].toLowerCase())) {
            filter = args[0].toLowerCase() as TaskFilter;
            if (args[1] && !isNaN(Number(args[1]))) start = Number(args[1]);
            if (args[2] && !isNaN(Number(args[2]))) end = Number(args[2]);
        } else if (!isNaN(Number(args[0]))) {
            start = Number(args[0]);
            if (args[1] && !isNaN(Number(args[1]))) end = Number(args[1]);
        }
    }

    const { totalCount, tasks } = await service.listTasks(filter, start, end);
    const headerText = filter === 'deleted' ? '🗑️ --- DELETED TASKS ---' : '📋 --- TASKS ---';

    const showingStart = totalCount > 0 && start <= totalCount ? start : 0;
    const showingEnd = Math.min(end, totalCount);

    console.log(`\n${headerText} (Showing ${showingStart} to ${showingEnd} of ${totalCount})`);

    tasks.forEach(task => {
        const idStr = ` ${task.id}`.padEnd(6);
        const textFormatted = formatTaskText(`"${task.text}"`);
        console.log(`${idStr} ${textFormatted} - ${task.completed ? "Completed" : "Pending"}`);
    });
    console.log("---------------------------------------");

    if (totalCount > end) {
        console.log(`💡 ${totalCount - end} more task(s) remaining. Run: ${binName} list ${filter !== 'all' ? filter + ' ' : ''}${end + 1} ${end + 10}`);
    }
}

export async function deleteTask(idArg: string | undefined): Promise<void> {
    const id = Number(idArg);
    if (isNaN(id)) {
        console.error("❌ Error: Valid ID required.");
        process.exitCode = 1;
        return;
    }
    const success = await service.softDeleteTask(id);
    if (success) {
        console.log(`\n🗑️ Soft deleted task ID ${id}`);
    } else {
        console.error(`❌ Active task ID ${id} not found.`);
        process.exitCode = 1;
    }
}

export async function restoreTask(idArg: string | undefined): Promise<void> {
    const id = Number(idArg);
    if (isNaN(id)) {
        console.error("❌ Error: Valid ID required.");
        process.exitCode = 1;
        return;
    }
    const success = await service.restoreTask(id);
    if (success) {
        console.log(`\n♻️ Restored task ID ${id}`);
    } else {
        console.error(`❌ Task ID ${id} not found in trash.`);
        process.exitCode = 1;
    }
}

export async function toggleTask(idArg: string | undefined): Promise<void> {
    const id = Number(idArg);
    if (isNaN(id)) {
        console.error("❌ Error: Valid ID required.");
        process.exitCode = 1;
        return;
    }
    const task = await service.toggleTask(id);
    if (task) {
        console.log(`\n🔄 Status updated to: ${task.completed ? "Completed" : "Pending"}`);
    } else {
        console.error(`❌ Active task ID ${id} not found.`);
        process.exitCode = 1;
    }
}