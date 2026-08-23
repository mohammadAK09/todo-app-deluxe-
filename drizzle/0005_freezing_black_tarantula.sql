ALTER TABLE "task_access" DROP CONSTRAINT "task_access_owner_id_viewer_id_unique";--> statement-breakpoint
ALTER TABLE "task_access" DROP CONSTRAINT "task_access_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "task_access" DROP CONSTRAINT "task_access_viewer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "task_access" ADD COLUMN "task_id" integer;--> statement-breakpoint
ALTER TABLE "task_access" ADD CONSTRAINT "task_access_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_access" ADD CONSTRAINT "task_access_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_access" ADD CONSTRAINT "task_access_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_access" ADD CONSTRAINT "task_access_unique" UNIQUE NULLS NOT DISTINCT("owner_id","viewer_id","task_id");