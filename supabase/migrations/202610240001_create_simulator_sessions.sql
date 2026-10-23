create table if not exists public.simulator_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null check (scenario_id in ('climate', 'humanitarian', 'security')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists simulator_sessions_user_updated_idx
  on public.simulator_sessions (user_id, updated_at desc);

alter table public.simulator_sessions enable row level security;

drop policy if exists "Users can view their own simulator sessions" on public.simulator_sessions;
create policy "Users can view their own simulator sessions"
  on public.simulator_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own simulator sessions" on public.simulator_sessions;
create policy "Users can create their own simulator sessions"
  on public.simulator_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own simulator sessions" on public.simulator_sessions;
create policy "Users can update their own simulator sessions"
  on public.simulator_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own simulator sessions" on public.simulator_sessions;
create policy "Users can delete their own simulator sessions"
  on public.simulator_sessions for delete
  using (auth.uid() = user_id);
