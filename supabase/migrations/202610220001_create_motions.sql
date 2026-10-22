-- MUN Helper: private Motions Library
-- Run this migration in Supabase Dashboard -> SQL Editor.
-- Every row belongs to exactly one authenticated user. RLS is the security boundary.

create table if not exists public.motions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  explanation text not null check (char_length(trim(explanation)) between 1 and 8000),
  category text not null default 'General Procedure'
    check (category in ('General Procedure', 'Debate', 'Caucus', 'Voting', 'Resolution', 'Points', 'Other')),
  motion_text text check (motion_text is null or char_length(motion_text) <= 4000),
  speaking_time_seconds integer check (speaking_time_seconds is null or speaking_time_seconds between 1 and 3600),
  voting_threshold text check (voting_threshold is null or char_length(voting_threshold) <= 120),
  precedence text check (precedence is null or char_length(precedence) <= 120),
  source_url text check (source_url is null or (char_length(source_url) <= 2000 and source_url ~* '^https?://')),
  personal_notes text check (personal_notes is null or char_length(personal_notes) <= 8000),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at accurate for inserts/updates.
create or replace function public.set_motions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists motions_set_updated_at on public.motions;
create trigger motions_set_updated_at
before update on public.motions
for each row execute function public.set_motions_updated_at();

create index if not exists motions_user_updated_idx
  on public.motions (user_id, updated_at desc);
create index if not exists motions_user_category_idx
  on public.motions (user_id, category);
create index if not exists motions_user_favorites_idx
  on public.motions (user_id, is_favorite) where is_favorite = true;

alter table public.motions enable row level security;

-- Remove prior policies with these names so the script can safely be rerun.
drop policy if exists "Users can read their own motions" on public.motions;
drop policy if exists "Users can create their own motions" on public.motions;
drop policy if exists "Users can update their own motions" on public.motions;
drop policy if exists "Users can delete their own motions" on public.motions;

create policy "Users can read their own motions"
  on public.motions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own motions"
  on public.motions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own motions"
  on public.motions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own motions"
  on public.motions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Explicit grants complement RLS. Anonymous users receive no table access.
revoke all on table public.motions from anon;
grant select, insert, update, delete on table public.motions to authenticated;
