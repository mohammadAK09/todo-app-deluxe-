ALTER TABLE "tasks" RENAME TO "task";--> statement-breakpoint
ALTER TABLE "task_access" DROP CONSTRAINT "task_access_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "tasks_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "task_access" ADD CONSTRAINT "task_access_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;