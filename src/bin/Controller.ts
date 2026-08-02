import { Task } from '../config/db.ts';
import { TodoService } from '../core/modules/todo-items/service.ts';

function formatTaskText(text: string, length = 35): string {
    return text.length > length ? text.substring(0, length - 3).concat('...').padEnd(length) : text.padEnd(length);
}




export class TodoController {
    private service: TodoService;
    private binName: string;

    constructor(binName: string, service: TodoService = new TodoService()) {
        this.service = service;
        this.binName = binName;
    }




    printUsage(): void {
        console.log(`
💡 Usage Guide:
  ${this.binName} add "Task Name"             - Add a new task
  ${this.binName} list                        - List active tasks (Default 1-10)
  ${this.binName} list <start> <end>          - Range list (e.g., ${this.binName} list 5 15)
  ${this.binName} list <filter> <start> <end> - Filtered list (completed, pending, deleted)
  ${this.binName} get <id>                    - Get single task by ID
  ${this.binName} delete <id>                 - Soft delete task
  ${this.binName} restore <id>                - Restore soft-deleted task
  ${this.binName} toggle <id>                 - Toggle task status
        `);
    }

    // todoController.ts
    async runMigration(): Promise<void> {
        try {
            const result = await this.service.migrateLegacyData();
            if (result.migrated) {
                console.log(`🔄 Migrated ${result.count} legacy task(s) into todo.db...`);
                console.log("✅ Migration complete!\n");
            }
        } catch (err: any) {
            console.error("⚠️ Failed to migrate tasks.json:", err.message);
        }
    }

    async add(taskText: string | undefined): Promise<void> {
       
        try {
            const doc = await this.service.addTask(taskText);
            console.log(`\n➕ Added task: "${doc.text}" (ID: ${doc.id})`);
        } catch (err: any) {
            console.error(`❌ Error: ${err.message}`);
            process.exit(1);
        }
    }

    async get(idArg: string | undefined): Promise<void> {
        const fetchId = Number(idArg);
        if (isNaN(fetchId)) {
            console.error("❌ Error: Valid ID required.");
            process.exit(1);
        }
        const task = await this.service.getTask(fetchId);
        if (task) {
            console.log(`\n📌 Task Details:\n  ID: ${task.id}\n  Text: "${task.text}"\n  Status: ${task.completed ? "Completed" : "Pending"}`);
        } else {
            console.error(`❌ Active task ID ${fetchId} not found.`);
            process.exit(1);
        }
    }

    async list(args: string[]): Promise<void> {
        const validFilters = ['all', 'completed', 'pending', 'deleted'];
        let filter = 'all', start = 1, end = 10;

        if (args.length > 0) {
            if (validFilters.includes(args[0].toLowerCase())) {
                filter = args[0].toLowerCase();
                if (args[1] && !isNaN(Number(args[1]))) start = Number(args[1]);
                if (args[2] && !isNaN(Number(args[2]))) end = Number(args[2]);
            } else if (!isNaN(Number(args[0]))) {
                start = Number(args[0]);
                if (args[1] && !isNaN(Number(args[1]))) end = Number(args[1]);
            }
        }

        const { totalCount, tasks } = await this.service.listTasks(filter, start, end);
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
            console.log(`💡 ${totalCount - end} more task(s) remaining. Run: ${this.binName} list ${filter !== 'all' ? filter + ' ' : ''}${end + 1} ${end + 10}`);
        }
    }

    async delete(idArg: string | undefined): Promise<void> {
        const id = Number(idArg);
        if (isNaN(id)) {
            console.error("❌ Error: Valid ID required.");
            process.exit(1);
        }
        const success = await this.service.softDeleteTask(id);
        if (success) {
            console.log(`\n🗑️ Soft deleted task ID ${id}`);
        } else {
            console.error(`❌ Active task ID ${id} not found.`);
            process.exit(1);
        }
    }

    async restore(idArg: string | undefined): Promise<void> {
        const id = Number(idArg);
        if (isNaN(id)) {
            console.error("❌ Error: Valid ID required.");
            process.exit(1);
        }
        const success = await this.service.restoreTask(id);
        if (success) {
            console.log(`\n♻️ Restored task ID ${id}`);
        } else {
            console.error(`❌ Task ID ${id} not found in trash.`);
            process.exit(1);
        }
    }

    async toggle(idArg: string | undefined): Promise<void> {
        const id = Number(idArg);
        if (isNaN(id)) {
            console.error("❌ Error: Valid ID required.");
            process.exit(1);
        }
        const task = await this.service.toggleTask(id);
        if (task) {
            console.log(`\n🔄 Status updated to: ${task.completed ? "Completed" : "Pending"}`);
        } else {
            console.error(`❌ Active task ID ${id} not found.`);
            process.exit(1);
        }
    }
}