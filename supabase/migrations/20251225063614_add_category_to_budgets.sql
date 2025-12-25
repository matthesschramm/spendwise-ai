-- Add category column
ALTER TABLE public.user_budgets ADD COLUMN category TEXT;

-- Migration: Existing budgets are treated as 'Total' monthly budgets
UPDATE public.user_budgets SET category = 'Total' WHERE category IS NULL;

-- Make it required
ALTER TABLE public.user_budgets ALTER COLUMN category SET NOT NULL;

-- Update the unique constraint
-- We drop the old one and add a new one including category
ALTER TABLE public.user_budgets DROP CONSTRAINT IF EXISTS user_budgets_user_id_month_key_key;
ALTER TABLE public.user_budgets ADD CONSTRAINT user_budgets_user_id_month_key_category_key UNIQUE (user_id, month_key, category);
