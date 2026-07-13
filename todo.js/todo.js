let taskNum = Number(prompt("How many tasks do you want to add?")); 

const todo = [];
const id = [];
const completed =[];
while (taskNum > 0) {
    const userInput = prompt(`Enter a task (${taskNum} remaining):`);
    
    if (userInput !== null && userInput.trim() !== "") {
        todo.push(userInput);
        id.push(todo.length);
        const isCompleted = confirm(`Is the task "${userInput}" already completed? \n\n(Click OK for True, Cancel for False)`);

        completed.push(isCompleted);

        taskNum -= 1; 
  } else {
    alert("enter a valid task name");
  }
}
console.log(" YOUR TO-DO LIST ");
for (let i = 0; i < todo.length; i++) {
    console.log(`Task = ${todo[i]}, ID = ${id[i]}, Completed = ${completed[i]}`);
}


