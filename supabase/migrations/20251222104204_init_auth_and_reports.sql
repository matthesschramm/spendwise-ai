-- Create the reports table if it doesn't exist
create table if not exists public.reports (
    id text primary key,
    name text not null,
    timestamp bigint not null,
    data jsonb not null,
    user_id uuid references auth.users(id) default auth.uid(),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add user_id column if it doesn't exist (in case reports was created earlier without it)
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name='reports' and column_name='user_id') then
        alter table public.reports add column user_id uuid references auth.users(id) default auth.uid();
    end if;
end $$;

-- Enable RLS on reports
alter table public.reports enable row level security;

-- Set up RLS policies for reports
drop policy if exists "Allow public access" on public.reports;
drop policy if exists "Users can only see their own reports" on public.reports;
drop policy if exists "Users can only insert their own reports" on public.reports;
drop policy if exists "Users can only delete their own reports" on public.reports;

create policy "Users can only see their own reports"
on public.reports for select
using (auth.uid() = user_id);

create policy "Users can only insert their own reports"
on public.reports for insert
with check (auth.uid() = user_id);

create policy "Users can only delete their own reports"
on public.reports for delete
using (auth.uid() = user_id);

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Set up RLS policies for profiles
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Set up a trigger to create a profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
        create trigger on_auth_user_created
          after insert on auth.users
          for each row execute procedure public.handle_new_user();
    end if;
end $$;
