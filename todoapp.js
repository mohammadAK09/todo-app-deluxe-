#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

// ============================================================================
// 1. DATABASE & INDEX SETUP (NoSQL for low RAM usage)
// ============================================================================
// process.cwd() ensures todo.db is stored in the folder where the user executes the command
const DB_PATH = path.join(process.cwd(), 'todo.db');
const OLD_JSON_PATH = path.join(process.cwd(), 'tasks.json');

const db = new Datastore({ 
    filename: DB_PATH, 
    autoload: true 
});

// NEW CHANGE: B-Tree Index on 'id' guarantees O(1) / O(log N) lookup speed
// fetching a single ID loads ONLY that task from disk into RAM, not the full dataset.
db.ensureIndex({ fieldName: 'id', unique: true });

const BIN_NAME = path.basename(process.argv[1], '.js') === 'todoapp' ? 'todo' : path.basename(process.argv[1]);

// ============================================================================
// 2. AUTO-MIGRATION (Imports legacy tasks.json data automatically)
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
                    // NEW TIMESTAMPS: Default missing values for old records
                    createdAt: task.createdAt || migrationDate,
                    updatedAt: task.updatedAt || null,
                    deletedAt: task.deletedAt || null
                };

                // Upsert to avoid duplicate key errors if partially migrated
                db.update({ id: doc.id }, doc, { upsert: true }, () => {
                    pendingInserts--;
                    if (pendingInserts === 0) {
                        // Backup old file so migration only runs once
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
  ${BIN_NAME} add "Task Name"       - Add a new task
  ${BIN_NAME} list                  - List active tasks
  ${BIN_NAME} list completed        - List completed tasks
  ${BIN_NAME} list pending          - List pending tasks
  ${BIN_NAME} get <id>              - Fetch task directly by ID (Loads only 1 record into RAM)
  ${BIN_NAME} delete <id>           - Soft delete task by setting deletedAt timestamp
  ${BIN_NAME} toggle <id>           - Toggle completion status and set updatedAt timestamp
    `);
}

// ============================================================================
// 4. MAIN CLI ROUTER
// ============================================================================
migrateLegacyJsonData(() => {
    const command = process.argv[2];
    const argument = process.argv[3];

    if (!command || command === '--help' || command === '-h') {
        printUsage();
        process.exit(0);
    }

    switch (command) {
        case 'add': {
            if (!argument) {
                console.error(`❌ Error: Please specify a task name. E.g., ${BIN_NAME} add "Buy milk"`);
                process.exit(1);
            }

            // Find max ID to safely assign auto-increment ID
            db.find({}).sort({ id: -1 }).limit(1).exec((err, docs) => {
                const nextId = docs.length > 0 ? docs[0].id + 1 : 1;

                // NEW CHANGE: Full timestamp schema on task creation
                const newTask = {
                    id: nextId,
                    text: argument,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: null,
                    deletedAt: null // Explicitly null when active
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

        // NEW FEATURE: Fast, memory-efficient direct lookup by ID
        case 'get': {
            const fetchId = Number(argument);
            if (isNaN(fetchId)) {
                console.error("❌ Error: Please provide a valid task ID.");
                process.exit(1);
            }

            // Indexed query: Reads ONLY this single record from disk
            db.findOne({ id: fetchId, deletedAt: null }, (err, task) => {
                if (task) {
                    console.log("\n Task Details:");
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
            const filter = argument ? argument.toLowerCase() : 'all';
            if (!['all', 'completed', 'pending'].includes(filter)) {
                console.error("❌ Error: Invalid filter. Use 'completed' or 'pending'.");
                process.exit(1);
            }

            // Build query object: Exclude soft-deleted tasks
            const query = { deletedAt: null };
            if (filter === 'completed') query.completed = true;
            if (filter === 'pending') query.completed = false;

            db.find(query).sort({ id: 1 }).exec((err, tasks) => {
                console.log("\n📋 --- TASKS ---");
                const RESET = "\x1b[0m";
                const GREEN = "\x1b[32m";
                const RED = "\x1b[31m";

                if (tasks.length === 0) {
                    console.log("No tasks found.");
                } else {
                    tasks.forEach(task => {
                        const idStr = ` ${task.id}`.padEnd(6);
                        const formattedTask = formatTaskText(`"${task.text}"`, 35);
                        const statusColor = task.completed ? GREEN : RED;
                        const statusText = task.completed ? "Completed" : "Pending";
                        const coloredStatus = `${statusColor}${statusText}${RESET}`;
                        const dateStr = new Date(task.createdAt).toLocaleDateString();

                        console.log(`${idStr} ${formattedTask}  -  ${coloredStatus}  (Created: ${dateStr})`);
                    });
                }
                console.log("---------------------------------------");
            });
            break;
        }

        // NEW CHANGE: Soft Delete (sets deletedAt instead of removing from DB)
        case 'delete': {
            const deleteId = Number(argument);
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

        // NEW CHANGE: Updates status AND sets updatedAt timestamp
        case 'toggle': {
            const toggleId = Number(argument);
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