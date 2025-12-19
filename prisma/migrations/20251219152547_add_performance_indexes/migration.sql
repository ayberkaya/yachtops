-- CreateIndex
CREATE INDEX "alcohol_stocks_yacht_id_low_stock_threshold_idx" ON "alcohol_stocks"("yacht_id", "low_stock_threshold");

-- CreateIndex
CREATE INDEX "alcohol_stocks_yacht_id_quantity_idx" ON "alcohol_stocks"("yacht_id", "quantity");

-- CreateIndex
CREATE INDEX "expenses_yacht_id_is_reimbursable_is_reimbursed_deleted_at_idx" ON "expenses"("yacht_id", "is_reimbursable", "is_reimbursed", "deleted_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_task_id_idx" ON "notifications"("task_id");
