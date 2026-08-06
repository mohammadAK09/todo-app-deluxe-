#!/usr/bin/env node
import path from 'path';
import { TodoController } from './Controller.ts';

const BIN_NAME = path.basename(process.argv[1], '.ts') === 'todo' ? 'todo' : 'node dist/bin/todo.js';
const controller = new TodoController(BIN_NAME);


async function main() {
    

    const command = process.argv[2];
    if (!command || command === '--help' || command === '-h') {
        controller.printUsage();
        process.exit(0);
    }

    switch (command) {
        case 'add':
            await controller.add(process.argv[3]);
            break;
        case 'get':
            await controller.get(process.argv[3]);
            break;
        case 'list':
            await controller.list(process.argv.slice(3));
            break;
        case 'delete':
            await controller.delete(process.argv[3]);
            break;
        case 'restore':
            await controller.restore(process.argv[3]);
            break;
        case 'toggle':
            await controller.toggle(process.argv[3]);
            break;
        default:
            controller.printUsage();
    }
}

main().catch(console.error);