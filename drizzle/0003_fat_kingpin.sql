ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "created_at";