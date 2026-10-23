-- MUNly private workspace records: conferences, notes, papers, research, resolutions, speeches and passport entries.
-- Apply in Supabase SQL Editor or with your normal migration workflow.
create table if not exists public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('conference','passport','note','paper','research','resolution','speech')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_workspace_items_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workspace_items_set_updated_at on public.workspace_items;
create trigger workspace_items_set_updated_at
before update on public.workspace_items
for each row execute function public.set_workspace_items_updated_at();

create index if not exists workspace_items_user_kind_updated_idx
  on public.workspace_items (user_id, kind, updated_at desc);

alter table public.workspace_items enable row level security;

drop policy if exists "Users can read their own workspace items" on public.workspace_items;
drop policy if exists "Users can create their own workspace items" on public.workspace_items;
drop policy if exists "Users can update their own workspace items" on public.workspace_items;
drop policy if exists "Users can delete their own workspace items" on public.workspace_items;

create policy "Users can read their own workspace items"
  on public.workspace_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own workspace items"
  on public.workspace_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own workspace items"
  on public.workspace_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own workspace items"
  on public.workspace_items for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.workspace_items from anon;
grant select, insert, update, delete on table public.workspace_items to authenticated;
