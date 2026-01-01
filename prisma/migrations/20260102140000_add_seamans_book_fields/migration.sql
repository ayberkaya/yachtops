-- Add Seaman's Book (Cüzdan) fields to users table
ALTER TABLE "public"."users" 
ADD COLUMN "wallet_qualification" TEXT,
ADD COLUMN "wallet_tc_kimlik_no" TEXT,
ADD COLUMN "wallet_sicil_limani" TEXT,
ADD COLUMN "wallet_sicil_numarasi" TEXT,
ADD COLUMN "wallet_dogum_tarihi" TIMESTAMP(3),
ADD COLUMN "wallet_uyrugu" TEXT;

