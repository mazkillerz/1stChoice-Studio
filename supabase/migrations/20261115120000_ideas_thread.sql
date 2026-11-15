-- Studio ideas thread (Session 3/4): no Inbox, a "new" dot, a discussion thread (text + voice replies) on every idea,
-- and archive instead of delete. Additive and idempotent: nothing is removed; the only data change moves stage 'inbox' to 'idea'.

-- 0. backup of the table this touches (private schema, not reachable from the app)
create table if not exists private.backup_ideas_20261115 as select * from public.ideas;

-- 1. who opened an idea first, and the archive marks
alter table public.ideas add column if not exists seen_at timestamptz;
alter table public.ideas add column if not exists seen_by text;
alter table public.ideas add column if not exists deleted_at timestamptz;
alter table public.ideas add column if not exists deleted_by text;

-- 2. the discussion thread: one row per reply (text and/or a voice note)
create table if not exists public.idea_notes (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  author text,
  body text not null default '',
  audio_path text,
  audio_secs integer,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
create index if not exists idea_notes_idea_idx on public.idea_notes (idea_id, created_at);
alter table public.idea_notes enable row level security;
drop policy if exists "members all idea_notes" on public.idea_notes;
create policy "members all idea_notes" on public.idea_notes for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- 3. the Inbox is gone: everything in it is now an Idea on the board
update public.ideas set stage = 'idea' where stage = 'inbox';
