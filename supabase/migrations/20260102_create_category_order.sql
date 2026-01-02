-- Create category_order table
CREATE TABLE IF NOT EXISTS public.category_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense')),
    ordered_categories JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_type)
);

-- Enable RLS
ALTER TABLE public.category_order ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own category order"
    ON public.category_order FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category order"
    ON public.category_order FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category order"
    ON public.category_order FOR UPDATE
    USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_category_order_updated_at
    BEFORE UPDATE ON public.category_order
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
