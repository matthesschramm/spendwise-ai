-- Create user_budgets table
CREATE TABLE public.user_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- Format: "January 2024"
    budget_amount NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, month_key)
);

-- Enable RLS
ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own budgets" ON public.user_budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON public.user_budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON public.user_budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON public.user_budgets
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster month lookup
CREATE INDEX idx_user_budgets_month ON public.user_budgets (user_id, month_key);
