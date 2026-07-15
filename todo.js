#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const FILE_PATH = path.join(__dirname, 'tasks.json');

// --- Helper Functions to Load and Save ---

function loadTasks() {
    if (!fs.existsSync(FILE_PATH)) {
        return [];
    }
    try {
        const rawData = fs.readFileSync(FILE_PATH, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.log("⚠️ Error reading saved tasks, starting fresh.");
        return [];
    }
}

function saveTasks(tasks) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

// --- Display Function ---

function printTasks(tasks, filter = 'all') {
    let count = 0;
    console.log(`\n📋 --- ${filter.toUpperCase()} TASKS ---`);
    
    for (const task of tasks) {
        if (filter === 'completed' && !task.completed) continue;
        if (filter === 'pending' && task.completed) continue;

        console.log(`[ID: ${task.id}]  "${task.text}"  - ${task.completed ? " Completed" : " Pending"}`);
        count++;
    }

    if (count === 0) {
        console.log(`No ${filter !== 'all' ? filter : ''} tasks found.`);
    }
    console.log("-------------------------\n");
}

// --- Help / Usage Guide ---

function printUsage() {
    console.log(`
💡 Usage Guide:
  node todo.js add "Task Name"      - Add a new pending task
  node todo.js list                 - List all tasks
  node todo.js list completed       - List only completed tasks
  node todo.js list pending         - List only pending tasks
  node todo.js delete <id>          - Delete a task by its ID
  node todo.js toggle <id>          - Toggle completion status of a task
    `);
}

// --- Main CLI Router ---

const tasks = loadTasks();

// process.argv[0] is 'node'
// process.argv[1] is 'todo.js'
// process.argv[2] is our command (add, list, delete, toggle)
const command = process.argv[2];
const argument = process.argv[3];
const subArgument = process.argv[4];

switch (command) {
    case 'add':
        if (!argument) {
            console.log("❌ Error: Please specify a task name. E.g., node todo.js add \"Buy milk\"");
            break;
        }
        
        const nextId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        tasks.push({
            id: nextId,
            text: argument,
            completed: false // default new tasks to pending
        });
        
        saveTasks(tasks);
        console.log(`\n➕ Added task: "${argument}" (ID: ${nextId})`);
        break;

    case 'list':
        // Supports: 'list', 'list completed', 'list pending'
        const filter = argument ? argument.toLowerCase() : 'all';
        if (['all', 'completed', 'pending'].includes(filter)) {
            printTasks(tasks, filter);
        } else {
            console.log("❌ Error: Invalid filter. Use 'completed' or 'pending'.");
        }
        break;

    case 'delete':
        const deleteId = Number(argument);
        if (isNaN(deleteId)) {
            console.log("❌ Error: Please provide a valid task ID to delete.");
            break;
        }

        const deleteIndex = tasks.findIndex(t => t.id === deleteId);
        if (deleteIndex !== -1) {
            const removed = tasks.splice(deleteIndex, 1);
            saveTasks(tasks);
            console.log(`\n🗑️ Deleted task: "${removed[0].text}"`);
        } else {
            console.log(`❌ Error: Task ID ${deleteId} not found.`);
        }
        break;

    case 'toggle':
        const toggleId = Number(argument);
        if (isNaN(toggleId)) {
            console.log("❌ Error: Please provide a valid task ID to toggle.");
            break;
        }

        const taskToToggle = tasks.find(t => t.id === toggleId);
        if (taskToToggle) {
            taskToToggle.completed = !taskToToggle.completed;
            saveTasks(tasks);
            console.log(`\n🔄 Status updated for "${taskToToggle.text}" to: ${taskToToggle.completed ? " Completed" : " Pending"}`);
        } else {
            console.log(`❌ Error: Task ID ${toggleId} not found.`);
        }
        break;

    default:
        printUsage();
}