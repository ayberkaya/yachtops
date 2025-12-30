-- CreateEnum
CREATE TYPE "WorkRequestCategory" AS ENUM ('MAINTENANCE', 'REPAIR', 'UPGRADE', 'INSPECTION', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkRequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "work_requests" ADD COLUMN "category" "WorkRequestCategory" DEFAULT 'MAINTENANCE';
ALTER TABLE "work_requests" ADD COLUMN "priority" "WorkRequestPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "work_requests" ADD COLUMN "component" TEXT;
ALTER TABLE "work_requests" ADD COLUMN "location" TEXT;
ALTER TABLE "work_requests" ADD COLUMN "requested_completion_date" TIMESTAMP(3);
ALTER TABLE "work_requests" ADD COLUMN "estimated_budget_min" DOUBLE PRECISION;
ALTER TABLE "work_requests" ADD COLUMN "estimated_budget_max" DOUBLE PRECISION;
ALTER TABLE "work_requests" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

-- CreateIndex
CREATE INDEX "work_requests_yacht_id_category_idx" ON "work_requests"("yacht_id", "category");
CREATE INDEX "work_requests_yacht_id_priority_idx" ON "work_requests"("yacht_id", "priority");

