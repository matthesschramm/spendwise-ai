-- Enable UPDATE on reports table for the owner
create policy "Users can only update their own reports"
on public.reports for update
using (auth.uid() = user_id);
