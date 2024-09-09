ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'in progress';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "deadline" SET NOT NULL;