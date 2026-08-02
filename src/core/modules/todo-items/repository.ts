import { db, Task } from '../../../config/db.ts';



export function getTaskById(taskId: number): Task | undefined {
    return db.data.tasks.find(task => task.id === taskId);
}

export async function addTask(newTask: Task): Promise<void> {
    db.data.tasks.push(newTask);
    await db.write(); // Persists synchronously or asynchronously to the JSON file
     
}
  
  
// export class TodoRepository {
//     async findNextId(): Promise<number> {
//         const tasks = await db.findAsync<Task>({}).sort({ id: -1 }).limit(1);
//         return tasks.length > 0 ? tasks[0].id + 1 : 1;
//     }

//     async insert(task: Task): Promise<Task> {
//         return db.insertAsync<Task>(task);
//     }

//     async findOne(query: TaskQuery): Promise<Task | null> {
//         return db.findOneAsync<Task>(query);
//     }

//     async find(query: TaskQuery, skip: number, limit: number): Promise<Task[]> {
//         return db.findAsync<Task>(query).sort({ id: 1 }).skip(skip).limit(limit);
//     }

//     async count(query: TaskQuery): Promise<number> {
//         return db.countAsync(query);
//     }

//     async update(query: TaskQuery, updateData: TaskUpdate): Promise<number> {
//         const result = await db.updateAsync(query, updateData, {});
//         return result.numAffected;
//     }
// }