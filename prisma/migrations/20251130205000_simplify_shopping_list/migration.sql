-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_unit" TEXT NOT NULL DEFAULT 'PIECE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "products_yacht_id_name_key" ON "products"("yacht_id", "name");

-- Drop table shopping_stores (data will be lost)
DROP TABLE IF EXISTS "shopping_stores";

-- AlterTable: Remove storeId from shopping_lists
-- First, make it nullable if it exists
-- Then we'll drop it in a separate step
-- Note: This will lose data in store_id column

-- AlterTable: Add new columns to shopping_items
ALTER TABLE "shopping_items" ADD COLUMN "product_id" TEXT;
ALTER TABLE "shopping_items" ADD COLUMN "store_id" TEXT;
ALTER TABLE "shopping_items" ADD COLUMN "store_name" TEXT;

-- CreateIndex
CREATE INDEX "shopping_items_product_id_idx" ON "shopping_items"("product_id");

-- AddForeignKey
-- Note: We need to check if the column exists first
-- For SQLite, we'll recreate the table
CREATE TABLE "shopping_items_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "list_id" TEXT NOT NULL,
    "product_id" TEXT,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "store_id" TEXT,
    "store_name" TEXT,
    "is_completed" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shopping_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "shopping_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shopping_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "shopping_items_new" SELECT 
    id, list_id, NULL as product_id, name, quantity, unit, NULL as store_id, NULL as store_name, is_completed, notes, created_at, updated_at
FROM "shopping_items";

-- Drop old table
DROP TABLE "shopping_items";

-- Rename new table
ALTER TABLE "shopping_items_new" RENAME TO "shopping_items";

-- Recreate shopping_lists without store_id
CREATE TABLE "shopping_lists_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shopping_lists_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shopping_lists_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data (without store_id)
INSERT INTO "shopping_lists_new" SELECT 
    id, yacht_id, name, description, status, created_by_user_id, created_at, updated_at
FROM "shopping_lists";

-- Drop old table
DROP TABLE "shopping_lists";

-- Rename new table
ALTER TABLE "shopping_lists_new" RENAME TO "shopping_lists";

