#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const FILE_PATH = path.join(__dirname, 'tasks.json');

// Get the actual command name used to run this script (e.g., "todo" or "todo.js")
const BIN_NAME = path.basename(process.argv[1], '.js') === 'todoapp' ? 'todo' : path.basename(process.argv[1]);

// --- Helper Functions to Load and Save ---

function loadTasks() {
    if (!fs.existsSync(FILE_PATH)) {
        return [];
    }
    try {
        const rawData = fs.readFileSync(FILE_PATH, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error("⚠️ Error reading saved tasks, starting fresh.");
        return [];
    }
}

function saveTasks(tasks) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

// --- Display Function ---

function printTasks(tasksList, filter) {
    console.log("\n📋 --- ALL TASKS ---");
    
    const RESET = "\x1b[0m";
    const GREEN = "\x1b[32m";
    const RED = "\x1b[31m";

    const filtered = tasksList.filter(t => {
        if (filter === 'completed') return t.completed;
        if (filter === 'pending') return !t.completed;
        return true;
    });

    if (filtered.length === 0) {
        console.log("No tasks found.");
        return;
    }

    filtered.forEach(t => {
        const idStr = ` ${t.id}`.padEnd(6);
        const formattedTask = formatTaskText(`"${t.text}"`, 45);
        const statusColor = t.completed ? GREEN : RED;
        const statusText = t.completed ? "Completed" : "Pending";
        const coloredStatus = `${statusColor}${statusText}${RESET}`;

        console.log(`${idStr} ${formattedTask}  -  ${coloredStatus}`);
    });
    
    console.log("---------------------------------------");
}

function formatTaskText(text, length = 60) {
    if (text.length > length) {
        return text.substring(0, length - 3).concat('...').padEnd(length);
    }
    return text.padEnd(length);
}

// --- Help / Usage Guide ---

function printUsage() {
    console.log(`
💡 Usage Guide:
  ${BIN_NAME} add "Task Name"       - Add a new pending task
  ${BIN_NAME} list                  - List all tasks
  ${BIN_NAME} list completed        - List only completed tasks
  ${BIN_NAME} list pending          - List only pending tasks
  ${BIN_NAME} delete <id>           - Delete a task by its ID
  ${BIN_NAME} toggle <id>           - Toggle completion status of a task
    `);
}

// --- Main CLI Router ---

const tasks = loadTasks();

const command = process.argv[2];
const argument = process.argv[3];

// Support standard help flags globally
if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
}

switch (command) {
    case 'add':
        if (!argument) {
            console.error(`❌ Error: Please specify a task name. E.g., ${BIN_NAME} add "Buy milk"`);
            process.exit(1); // Exit with error
        }
        
        const nextId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        tasks.push({
            id: nextId,
            text: argument,
            completed: false
        });
        
        saveTasks(tasks);
        console.log(`\n➕ Added task: "${argument}" (ID: ${nextId})`);
        break;

    case 'list':
        const filter = argument ? argument.toLowerCase() : 'all';
        if (['all', 'completed', 'pending'].includes(filter)) {
            printTasks(tasks, filter);
        } else {
            console.error("❌ Error: Invalid filter. Use 'completed' or 'pending'.");
            process.exit(1);
        }
        break;

    case 'delete':
        const deleteId = Number(argument);
        if (isNaN(deleteId)) {
            console.error("❌ Error: Please provide a valid task ID to delete.");
            process.exit(1);
        }

        const deleteIndex = tasks.findIndex(t => t.id === deleteId);
        if (deleteIndex !== -1) {
            const removed = tasks.splice(deleteIndex, 1);
            saveTasks(tasks);
            console.log(`\n🗑️ Deleted task: "${removed[0].text}"`);
        } else {
            console.error(`❌ Error: Task ID ${deleteId} not found.`);
            process.exit(1);
        }
        break;

    case 'toggle':
        const toggleId = Number(argument);
        if (isNaN(toggleId)) {
            console.error("❌ Error: Please provide a valid task ID to toggle.");
            process.exit(1);
        }

        const taskToToggle = tasks.find(t => t.id === toggleId);
        if (taskToToggle) {
            taskToToggle.completed = !taskToToggle.completed;
            saveTasks(tasks);
            console.log(`\n🔄 Status updated for "${taskToToggle.text}" to: ${taskToToggle.completed ? "Completed" : "Pending"}`);
        } else {
            console.error(`❌ Error: Task ID ${toggleId} not found.`);
            process.exit(1);
        }
        break;

    default:
        console.error(`❌ Error: Unknown command "${command}"`);
        printUsage();
        process.exit(1);
}