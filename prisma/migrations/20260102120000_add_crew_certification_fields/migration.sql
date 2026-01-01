-- Add document date fields to users table
ALTER TABLE "public"."users" 
ADD COLUMN "wallet_date" TIMESTAMP(3),
ADD COLUMN "license_date" TIMESTAMP(3),
ADD COLUMN "radio_date" TIMESTAMP(3),
ADD COLUMN "passport_date" TIMESTAMP(3),
ADD COLUMN "health_report_date" TIMESTAMP(3);

-- Create crew_certificates table
CREATE TABLE "public"."crew_certificates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "yacht_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "is_indefinite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crew_certificates_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "crew_certificates_user_id_idx" ON "public"."crew_certificates"("user_id");
CREATE INDEX "crew_certificates_yacht_id_idx" ON "public"."crew_certificates"("yacht_id");
CREATE INDEX "crew_certificates_expiry_date_idx" ON "public"."crew_certificates"("expiry_date");

-- Add foreign key constraints
ALTER TABLE "public"."crew_certificates" ADD CONSTRAINT "crew_certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."crew_certificates" ADD CONSTRAINT "crew_certificates_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "public"."yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

