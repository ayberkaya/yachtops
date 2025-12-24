-- Add name field to yacht_invites table
ALTER TABLE public.yacht_invites 
ADD COLUMN IF NOT EXISTS name TEXT;

