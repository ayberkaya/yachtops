-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "credit_cards" (
    "id" TEXT NOT NULL,
    "yacht_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "last_four_digits" TEXT NOT NULL,
    "billing_cycle_end_date" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "credit_cards_deleted_at_idx" ON "credit_cards"("deleted_at");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "credit_cards_yacht_id_deleted_at_idx" ON "credit_cards"("yacht_id", "deleted_at");

-- AddForeignKey (idempotent - check if constraint exists first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'credit_cards_yacht_id_fkey'
    ) THEN
        ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_yacht_id_fkey" 
        FOREIGN KEY ("yacht_id") REFERENCES "yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable - Add billing_cycle_end_date to credit_cards (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_cards' AND column_name = 'billing_cycle_end_date'
    ) THEN
        ALTER TABLE "credit_cards" ADD COLUMN "billing_cycle_end_date" INTEGER;
    END IF;
END $$;

-- AlterTable (idempotent - check if column exists first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'credit_card_id'
    ) THEN
        ALTER TABLE "expenses" ADD COLUMN "credit_card_id" TEXT;
    END IF;
END $$;

-- AddForeignKey (idempotent - check if constraint exists first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expenses_credit_card_id_fkey'
    ) THEN
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_credit_card_id_fkey" 
        FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

