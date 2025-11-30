-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CREW',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "yacht_id" TEXT,
    CONSTRAINT "users_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yachts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "flag" TEXT,
    "length" REAL,
    "registration_number" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "departure_port" TEXT,
    "arrival_port" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by_user_id" TEXT,
    CONSTRAINT "trips_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trips_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" TEXT,
    "due_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "expense_categories_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "approved_by_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "date" DATETIME NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "exchange_rate_to_base" REAL,
    "base_amount" REAL,
    "payment_method" TEXT NOT NULL,
    "paid_by" TEXT NOT NULL,
    "vendor_name" TEXT,
    "invoice_number" TEXT,
    "vat_rate" REAL,
    "vat_amount" REAL,
    "total_amount_with_vat" REAL,
    "is_reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "expenses_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expense_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_receipts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_yacht_id_name_key" ON "expense_categories"("yacht_id", "name");
