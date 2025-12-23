-- ============================================================================
-- RBAC Infrastructure Migration
-- ============================================================================
-- This migration adds:
-- 1. New UserRole enum values: CHEF, STEWARDESS, DECKHAND, ENGINEER
-- 2. InviteStatus enum for tracking invitation states
-- 3. YachtInvite model for managing team invitations
-- ============================================================================

-- ============================================================================
-- Step 1: Add new UserRole enum values
-- ============================================================================

-- Add new enum values to UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CHEF';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STEWARDESS';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DECKHAND';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ENGINEER';

-- ============================================================================
-- Step 2: Create InviteStatus enum (if not exists)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InviteStatus') THEN
        CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');
    END IF;
END $$;

-- ============================================================================
-- Step 3: Create YachtInvite table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "yacht_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "yacht_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yacht_invites_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Step 4: Create indexes and constraints (if not exists)
-- ============================================================================

-- Unique token for invite links
CREATE UNIQUE INDEX IF NOT EXISTS "yacht_invites_token_key" ON "yacht_invites"("token");

-- Unique constraint: one pending invite per email per yacht
CREATE UNIQUE INDEX IF NOT EXISTS "yacht_invites_yacht_id_email_status_key" ON "yacht_invites"("yacht_id", "email", "status");

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "yacht_invites_yacht_id_status_idx" ON "yacht_invites"("yacht_id", "status");
CREATE INDEX IF NOT EXISTS "yacht_invites_email_status_idx" ON "yacht_invites"("email", "status");
CREATE INDEX IF NOT EXISTS "yacht_invites_expires_at_idx" ON "yacht_invites"("expires_at");

-- ============================================================================
-- Step 5: Add foreign key constraint (if not exists)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'yacht_invites_yacht_id_fkey'
    ) THEN
        ALTER TABLE "yacht_invites" 
        ADD CONSTRAINT "yacht_invites_yacht_id_fkey" 
        FOREIGN KEY ("yacht_id") 
        REFERENCES "yachts"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

