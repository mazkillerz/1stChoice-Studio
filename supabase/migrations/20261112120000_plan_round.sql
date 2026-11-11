-- Studio 2.4.0 (Plan round): Ideas board, monthly KPIs, Reel in the calendar, a design's real shape (post / story).
-- Additive and idempotent. No row is deleted; existing rows only gain a value in the NEW designs.format column.
-- RLS on every new table with ONE policy like `designs` (members only).

-- 0. backup of the two tables this touches (private schema, not reachable from the app)
create table if not exists private.backup_designs_20261112 as select * from public.designs;
create table if not exists private.backup_calendar_items_20261112 as select * from public.calendar_items;

-- 1. what shape a saved design is: 'post' (1080x1350), 'story' (1080x1920), 'square', 'cover' (highlight)
alter table public.designs add column if not exists format text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'designs_format_check') then
    alter table public.designs add constraint designs_format_check check (format is null or format in ('post','story','square','cover'));
  end if;
end $$;
-- backfill: tools that only make one shape, then Create boards by their first frame, then planned layouts by their file name
update public.designs set format = 'cover' where format is null and tool = 'highlight';
update public.designs set format = 'post' where format is null and tool = 'carousel';
update public.designs set format = case
    when (recipe->'doc'->'nodes'->0->'a'->>'fh')::numeric = (recipe->'doc'->'nodes'->0->'a'->>'fw')::numeric then 'square'
    when (recipe->'doc'->'nodes'->0->'a'->>'fh')::numeric / nullif((recipe->'doc'->'nodes'->0->'a'->>'fw')::numeric,0) < 1.5 then 'post'
    else 'story' end
  where format is null and tool = 'create' and recipe->'doc'->'nodes'->0->'a'->>'fh' is not null;
update public.designs set format = case when recipe->>'docSite' ~ '/p[0-9][^/]*\.json$' then 'post' else 'story' end
  where format is null and tool = 'create' and recipe->>'docSite' is not null;
update public.designs set format = 'story' where format is null and tool in ('restock','photo-story','collage','new-place','split','cinematic','offer','video');

-- 2. the calendar takes Reels too
alter table public.calendar_items drop constraint if exists calendar_items_format_check;
alter table public.calendar_items add constraint calendar_items_format_check check (format is null or format in ('post','story','reel'));

-- 3. ideas: inbox first (stage 'inbox'), then the board (idea, planned, progress, posted)
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  title text not null default '',
  note text not null default '',
  type text not null default 'post' check (type in ('reel','post','story','giveaway','other')),
  stage text not null default 'inbox' check (stage in ('inbox','idea','planned','progress','posted')),
  link text,
  image_path text,
  audio_path text,
  audio_secs integer,
  design_id uuid references public.designs(id) on delete set null,
  calendar_id uuid references public.calendar_items(id) on delete set null,
  sort double precision not null default 0,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ideas_brand_idx on public.ideas (brand, stage, sort);
alter table public.ideas enable row level security;
drop policy if exists "members all ideas" on public.ideas;
create policy "members all ideas" on public.ideas for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- 4. monthly KPIs: targets per kind, engagement numbers. Each engagement value is {"v":number,"src":"manual"|"instagram","at":iso}
--    so an Instagram import (phase 2, a Supabase function) can fill the same month row without a schema change.
create table if not exists public.kpi_months (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  targets jsonb not null default '{}'::jsonb,
  engagement jsonb not null default '{}'::jsonb,
  note text not null default '',
  author text,
  updated_at timestamptz not null default now(),
  unique (brand, month)
);
alter table public.kpi_months enable row level security;
drop policy if exists "members all kpi_months" on public.kpi_months;
create policy "members all kpi_months" on public.kpi_months for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- 5. voice notes in the private bucket (short, compressed audio)
update storage.buckets set allowed_mime_types = (
  select array(select distinct unnest(coalesce(allowed_mime_types,'{}') || array['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/aac']))
) where id = 'studio';
