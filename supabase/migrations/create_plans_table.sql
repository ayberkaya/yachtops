-- Create plans table for pricing & plans module
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  min_loa INTEGER NOT NULL DEFAULT 0,
  max_loa INTEGER,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_plans_loa ON plans(min_loa, max_loa);

-- Add RLS policies (if using RLS)
-- ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Insert default plans (optional seed data)
INSERT INTO plans (name, price, currency, min_loa, max_loa, features) VALUES
  (
    'Essentials',
    299.00,
    'USD',
    0,
    30,
    ARRAY[
      'Core expense tracking',
      'Basic document management',
      'Crew management',
      'Task management',
      'Email support'
    ]
  ),
  (
    'Professional',
    599.00,
    'USD',
    30,
    60,
    ARRAY[
      'Everything in Essentials',
      'Advanced reporting',
      'Inventory management',
      'Voyage planning',
      'Priority support',
      'Custom integrations'
    ]
  ),
  (
    'Enterprise',
    0.00,
    'USD',
    60,
    NULL,
    ARRAY[
      'Everything in Professional',
      'Dedicated account manager',
      'Custom features',
      '24/7 support',
      'On-site training',
      'API access'
    ]
  )
ON CONFLICT DO NOTHING;

