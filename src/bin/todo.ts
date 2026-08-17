#!/usr/bin/env node
import path from 'node:path';
import {
    printUsage,
    printVersion,
    addTask,
    getTask,
    listTasks,
    deleteTask,
    restoreTask,
    toggleTask
} from '../bin/controller.ts';
import { closeDb } from '../config/db.ts';

const BIN_NAME = path.basename(process.argv[1]).replace(/\.(ts|js)$/, '');

async function main() {
    const command = process.argv[2];

    if (!command || command === '--help' || command === '-h') {
        printUsage(BIN_NAME);
        return;
    }

    if (command === '--version' || command === '-v') {
        printVersion();
        return;
    }

    switch (command) {
        case 'add':
            await addTask(process.argv[3]);
            break;
        case 'get':
            await getTask(process.argv[3]);
            break;
        case 'list':
            await listTasks(process.argv.slice(3), BIN_NAME);
            break;
        case 'delete':
            await deleteTask(process.argv[3]);
            break;
        case 'restore':
            await restoreTask(process.argv[3]);
            break;
        case 'toggle':
            await toggleTask(process.argv[3]);
            break;
        default:
            printUsage(BIN_NAME);
            process.exitCode = 1;
    }
}

main()
    .catch(console.error)
    .finally(() => closeDb());