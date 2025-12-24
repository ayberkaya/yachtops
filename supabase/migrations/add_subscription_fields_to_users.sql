-- Add subscription_status and trial_ends_at columns to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'TRIAL',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on subscription status
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status) WHERE subscription_status IS NOT NULL;

-- Add index for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON public.users(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

