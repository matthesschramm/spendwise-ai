-- Create category_settings table
CREATE TABLE IF NOT EXISTS public.category_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    is_discretionary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_name)
);

-- Enable RLS
ALTER TABLE public.category_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own category settings"
    ON public.category_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category settings"
    ON public.category_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category settings"
    ON public.category_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_category_settings_updated_at
    BEFORE UPDATE ON public.category_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
