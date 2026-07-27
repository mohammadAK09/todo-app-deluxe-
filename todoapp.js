#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

// ============================================================================
// 1. DATABASE & INDEX SETUP
// ============================================================================
const DB_PATH = path.join(process.cwd(), 'todo.db');
const OLD_JSON_PATH = path.join(process.cwd(), 'tasks.json');

const db = new Datastore({ 
    filename: DB_PATH, 
    autoload: true 
});

db.ensureIndex({ fieldName: 'id', unique: true });

const BIN_NAME = path.basename(process.argv[1], '.js') === 'todoapp' ? 'todo' : path.basename(process.argv[1]);

// ============================================================================
// 2. AUTO-MIGRATION
// ============================================================================
function migrateLegacyJsonData(callback) {
    if (!fs.existsSync(OLD_JSON_PATH)) {
        return callback();
    }

    try {
        const rawData = fs.readFileSync(OLD_JSON_PATH, 'utf-8');
        const oldTasks = JSON.parse(rawData);

        if (Array.isArray(oldTasks) && oldTasks.length > 0) {
            console.log("🔄 Found legacy tasks.json. Migrating tasks into todo.db...");
            
            const migrationDate = new Date().toISOString();
            let pendingInserts = oldTasks.length;

            oldTasks.forEach(task => {
                const doc = {
                    id: task.id,
                    text: task.text,
                    completed: task.completed || false,
                    createdAt: task.createdAt || migrationDate,
                    updatedAt: task.updatedAt || null,
                    deletedAt: task.deletedAt || null
                };

                db.update({ id: doc.id }, doc, { upsert: true }, () => {
                    pendingInserts--;
                    if (pendingInserts === 0) {
                        fs.renameSync(OLD_JSON_PATH, path.join(process.cwd(), 'tasks.json.bak'));
                        console.log("✅ Migration complete! Original file backed up to tasks.json.bak.\n");
                        callback();
                    }
                });
            });
        } else {
            callback();
        }
    } catch (err) {
        console.error("⚠️ Failed to migrate tasks.json:", err.message);
        callback();
    }
}

// ============================================================================
// 3. DISPLAY HELPERS
// ============================================================================
function formatTaskText(text, length = 35) {
    if (text.length > length) {
        return text.substring(0, length - 3).concat('...').padEnd(length);
    }
    return text.padEnd(length);
}

function printUsage() {
    console.log(`
💡 Usage Guide:
  ${BIN_NAME} add "Task Name"             - Add a new task
  ${BIN_NAME} list                        - List first 10 active tasks (Default)
  ${BIN_NAME} list <start> <end>          - List tasks in custom index range (e.g., ${BIN_NAME} list 5 15)
  ${BIN_NAME} list <filter>               - List first 10 filtered tasks (completed, pending, deleted)
  ${BIN_NAME} list <filter> <start> <end> - List filtered tasks in range (e.g., ${BIN_NAME} list pending 1 5)
  ${BIN_NAME} get <id>                    - Fetch task directly by ID
  ${BIN_NAME} delete <id>                 - Soft delete task by setting deletedAt timestamp
  ${BIN_NAME} toggle <id>                 - Toggle completion status and set updatedAt timestamp
    `);
}

// ============================================================================
// 4. MAIN CLI ROUTER
// ============================================================================
migrateLegacyJsonData(() => {
    const command = process.argv[2];

    if (!command || command === '--help' || command === '-h') {
        printUsage();
        process.exit(0);
    }

    switch (command) {
        case 'add': {
            const argument = process.argv[3];
            if (!argument) {
                console.error(`❌ Error: Please specify a task name. E.g., ${BIN_NAME} add "Buy milk"`);
                process.exit(1);
            }

            db.find({}).sort({ id: -1 }).limit(1).exec((err, docs) => {
                const nextId = docs.length > 0 ? docs[0].id + 1 : 1;

                const newTask = {
                    id: nextId,
                    text: argument,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: null,
                    deletedAt: null
                };

                db.insert(newTask, (err, doc) => {
                    if (err) {
                        console.error("❌ Error saving task to database:", err.message);
                        process.exit(1);
                    }
                    console.log(`\n➕ Added task: "${doc.text}" (ID: ${doc.id})`);
                });
            });
            break;
        }

        case 'get': {
            const fetchId = Number(process.argv[3]);
            if (isNaN(fetchId)) {
                console.error("❌ Error: Please provide a valid task ID.");
                process.exit(1);
            }

            db.findOne({ id: fetchId, deletedAt: null }, (err, task) => {
                if (task) {
                    console.log("\n📌 Task Details:");
                    console.log(`  ID:         ${task.id}`);
                    console.log(`  Text:       "${task.text}"`);
                    console.log(`  Status:     ${task.completed ? "Completed" : "Pending"}`);
                    console.log(`  Created At: ${new Date(task.createdAt).toLocaleString()}`);
                    console.log(`  Updated At: ${task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Never'}`);
                } else {
                    console.error(`❌ Error: Active task ID ${fetchId} not found.`);
                    process.exit(1);
                }
            });
            break;
        }

        case 'list': {
            const args = process.argv.slice(3);
            const validFilters = ['all', 'completed', 'pending', 'deleted'];

            let filter = 'all';
            let start = 1;
            let end = 10;

            // Flexible argument parsing
            if (args.length > 0) {
                if (validFilters.includes(args[0].toLowerCase())) {
                    filter = args[0].toLowerCase();
                    if (args[1] && !isNaN(Number(args[1]))) start = Number(args[1]);
                    if (args[2] && !isNaN(Number(args[2]))) end = Number(args[2]);
                } else if (!isNaN(Number(args[0]))) {
                    start = Number(args[0]);
                    if (args[1] && !isNaN(Number(args[1]))) end = Number(args[1]);
                } else {
                    console.error("❌ Error: Invalid filter or index range arguments.");
                    process.exit(1);
                }
            }

            if (start < 1) start = 1;
            if (end < start) {
                console.error("❌ Error: 'end' index must be greater than or equal to 'start' index.");
                process.exit(1);
            }

            const skipCount = start - 1;
            const limitCount = end - start + 1;

            // Build base query
            let query = {};
            if (filter === 'deleted') {
                query = { deletedAt: { $ne: null } };
            } else {
                query.deletedAt = null;
                if (filter === 'completed') query.completed = true;
                if (filter === 'pending') query.completed = false;
            }

            // Step 1: Count total matching records in DB
            db.count(query, (err, totalCount) => {
                if (err) {
                    console.error("❌ Database query error:", err.message);
                    process.exit(1);
                }

                // Step 2: Fetch the page slice
                db.find(query)
                    .sort({ id: 1 })
                    .skip(skipCount)
                    .limit(limitCount)
                    .exec((err, tasks) => {
                        if (err) {
                            console.error("❌ Database query error:", err.message);
                            process.exit(1);
                        }

                        const headerText = filter === 'deleted' ? '🗑️ --- DELETED TASKS (TRASH) ---' : '📋 --- TASKS ---';
                        console.log(`\n${headerText}`);

                        const RESET = "\x1b[0m";
                        const GREEN = "\x1b[32m";
                        const RED = "\x1b[31m";
                        const YELLOW = "\x1b[33m";

                        if (tasks.length === 0) {
                            console.log(`No tasks found in range ${start}-${end}. (Total matching: ${totalCount})`);
                            console.log("---------------------------------------");
                        } else {
                            tasks.forEach(task => {
                                const idStr = ` ${task.id}`.padEnd(6);
                                const formattedTask = formatTaskText(`"${task.text}"`, 35);
                                
                                if (filter === 'deleted') {
                                    const deletedDate = new Date(task.deletedAt).toLocaleDateString();
                                    console.log(`${idStr} ${formattedTask}  -  ${RED}Deleted: ${deletedDate}${RESET}`);
                                } else {
                                    const statusColor = task.completed ? GREEN : RED;
                                    const statusText = task.completed ? "Completed" : "Pending";
                                    const coloredStatus = `${statusColor}${statusText}${RESET}`;
                                    const dateStr = new Date(task.createdAt).toLocaleDateString();

                                    console.log(`${idStr} ${formattedTask}  -  ${coloredStatus}  (Created: ${dateStr})`);
                                }
                            });

                            console.log("---------------------------------------");

                            // Calculate actual end item index
                            const actualEnd = start + tasks.length - 1;
                            const filterCmd = filter !== 'all' ? `${filter} ` : '';

                            // Step 3: Print indicator if there are more tasks remaining
                            if (totalCount > actualEnd) {
                                const nextStart = actualEnd + 1;
                                const nextEnd = nextStart + (limitCount - 1);

                                console.log(`📊 Showing ${start}-${actualEnd} of ${totalCount} tasks.`);
                                console.log(`${YELLOW}💡 More tasks available! Run '${BIN_NAME} list ${filterCmd}${nextStart} ${nextEnd}' to view next page.${RESET}`);
                            } else {
                                console.log(`✅ Showing ${start}-${actualEnd} of ${totalCount} tasks (End of list).`);
                            }
                        }
                    });
            });
            break;
        }
        case 'delete': {
            const deleteId = Number(process.argv[3]);
            if (isNaN(deleteId)) {
                console.error("❌ Error: Please provide a valid task ID.");
                process.exit(1);
            }

            db.update(
                { id: deleteId, deletedAt: null },
                { $set: { deletedAt: new Date().toISOString() } },
                {},
                (err, numReplaced) => {
                    if (numReplaced > 0) {
                        console.log(`\n🗑️ Soft deleted task ID ${deleteId}`);
                    } else {
                        console.error(`❌ Error: Active task ID ${deleteId} not found.`);
                        process.exit(1);
                    }
                }
            );
            break;
        }

        case 'toggle': {
            const toggleId = Number(process.argv[3]);
            if (isNaN(toggleId)) {
                console.error("❌ Error: Please provide a valid task ID.");
                process.exit(1);
            }

            db.findOne({ id: toggleId, deletedAt: null }, (err, task) => {
                if (!task) {
                    console.error(`❌ Error: Active task ID ${toggleId} not found.`);
                    process.exit(1);
                    return;
                }

                const newStatus = !task.completed;
                const updateTimestamp = new Date().toISOString();

                db.update(
                    { id: toggleId },
                    { $set: { completed: newStatus, updatedAt: updateTimestamp } },
                    {},
                    () => {
                        console.log(`\n🔄 Status updated for "${task.text}" to: ${newStatus ? "Completed" : "Pending"}`);
                    }
                );
            });
            break;
        }

        default:
            console.error(`❌ Error: Unknown command "${command}"`);
            printUsage();
            process.exit(1);
    }
});