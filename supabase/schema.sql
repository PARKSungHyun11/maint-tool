create table if not exists public.flight_log_drafts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ecam_msg text not null default '',
  fault_code text not null default '',
  action text not null default '',
  ref_manual text not null default '',
  full_log_override text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.flight_log_drafts enable row level security;

create policy "Users can read their own flight logs"
  on public.flight_log_drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own flight logs"
  on public.flight_log_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own flight logs"
  on public.flight_log_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own flight logs"
  on public.flight_log_drafts for delete
  using (auth.uid() = user_id);
