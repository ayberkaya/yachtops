-- AlterEnum
-- First, update any existing IN_PROGRESS tasks to TODO
UPDATE "tasks" SET "status" = 'TODO' WHERE "status" = 'IN_PROGRESS';

-- Remove IN_PROGRESS from enum
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DONE');
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus" USING ("status"::text::"TaskStatus");
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';
DROP TYPE "TaskStatus_old";

