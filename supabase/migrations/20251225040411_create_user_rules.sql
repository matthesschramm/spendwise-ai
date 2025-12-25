-- Create user_rules table
CREATE TABLE public.user_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_pattern TEXT NOT NULL,
    preferred_category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, merchant_pattern)
);

-- Enable RLS
ALTER TABLE public.user_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own rules" ON public.user_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules" ON public.user_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules" ON public.user_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules" ON public.user_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster pattern matching
CREATE INDEX idx_user_rules_pattern ON public.user_rules (merchant_pattern);
