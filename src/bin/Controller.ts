import * as service from '../core/modules/todo-items/service.ts';
import type { TaskFilter } from '../core/modules/todo-items/repository.js';
import path from 'node:path';
import fs from 'node:fs';

function formatTaskText(text: string, length = 35): string {
    return text.length > length ? text.substring(0, length - 3).concat('...').padEnd(length) : text.padEnd(length);
}

/**
 * Resolves the acting user for this CLI invocation.
 * Reads `--user <id>` from argv, falling back to CLI_USER_ID in .env.
 * Exits on failure, so the return type narrows to `number` for callers.
 */
function resolveUserId(): number {
    const flagIndex = process.argv.indexOf('--user');
    const raw = flagIndex !== -1 ? process.argv[flagIndex + 1] : process.env.CLI_USER_ID;

    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        console.error(`❌ Error: No user specified. Pass --user <id> or set CLI_USER_ID in .env`);
        process.exit(1);
    }
    return id;
}

/** Removes `--user <id>` so it doesn't get read as a filter or range value. */
function stripUserFlag(args: string[]): string[] {
    return args.filter((arg, i) => arg !== '--user' && args[i - 1] !== '--user');
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

  Every command except version acts on one user's tasks.
  Set CLI_USER_ID in .env, or append --user <id> to any command.
    `);
}

export async function addTask(taskText: string | undefined): Promise<void> {
    if (!taskText) {
        console.error(`❌ Error: Specify a task name.`);
        process.exitCode = 1;
        return;
    }
    const userId = resolveUserId();
    try {
        const doc = await service.addTask(taskText, userId);
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
    const userId = resolveUserId();
    const task = await service.getTask(fetchId, userId);
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

    const positional = stripUserFlag(args);

    if (positional.length > 0) {
        if (validFilters.includes(positional[0].toLowerCase())) {
            filter = positional[0].toLowerCase() as TaskFilter;
            if (positional[1] && !isNaN(Number(positional[1]))) start = Number(positional[1]);
            if (positional[2] && !isNaN(Number(positional[2]))) end = Number(positional[2]);
        } else if (!isNaN(Number(positional[0]))) {
            start = Number(positional[0]);
            if (positional[1] && !isNaN(Number(positional[1]))) end = Number(positional[1]);
        }
    }

    const userId = resolveUserId();

    // Parameter order inferred from the compiler error — verify against service.ts:40.
    const { totalCount, tasks } = await service.listTasks(filter, userId, start, end);
    
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
    const userId = resolveUserId();
    const success = await service.softDeleteTask(id, userId);
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
    const userId = resolveUserId();
    const success = await service.restoreTask(id, userId);
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
    const userId = resolveUserId();
    const task = await service.toggleTask(id, userId);
    if (task) {
        console.log(`\n🔄 Status updated to: ${task.completed ? "Completed" : "Pending"}`);
    } else {
        console.error(`❌ Active task ID ${id} not found.`);
        process.exitCode = 1;
    }
}