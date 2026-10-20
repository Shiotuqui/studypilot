-- StudyPilot — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  course      text not null default 'General' check (char_length(course) <= 80),
  kind        text not null default 'assignment' check (kind in ('assignment', 'exam', 'reading', 'project')),
  due_date    date,
  priority    smallint not null default 2 check (priority between 1 and 3),
  done        boolean not null default false,
  notes       text check (char_length(notes) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);

-- Explicit API grants (newer Supabase projects no longer auto-grant on new tables).
grant select, insert, update, delete on public.tasks to authenticated;

-- Row Level Security: each user only sees and changes their own rows.
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own" on public.tasks
  for select to authenticated using (user_id = auth.uid());

create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (user_id = auth.uid());

create policy "tasks_update_own" on public.tasks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (user_id = auth.uid());
