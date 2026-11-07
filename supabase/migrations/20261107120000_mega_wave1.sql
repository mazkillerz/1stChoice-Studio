-- Studio mega round, wave 1: versions, campaigns, calendar, comments, phrases, review + caption columns.
-- Additive only and idempotent. Every new table: RLS on, ONE policy like `designs`.

-- campaigns first (designs and calendar_items point at it)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  words jsonb not null default '{}'::jsonb,
  look text,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_brand_idx on public.campaigns (brand, updated_at desc);

alter table public.designs add column if not exists author text;
alter table public.designs add column if not exists review text;
alter table public.designs add column if not exists review_by text;
alter table public.designs add column if not exists review_at timestamptz;
alter table public.designs add column if not exists caption text;
alter table public.designs add column if not exists hashtags text[];
alter table public.designs add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='designs_review_check') then
    alter table public.designs add constraint designs_review_check check (review in ('in_review','approved','changes'));
  end if;
end $$;

create table if not exists public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid references public.designs(id) on delete cascade,
  name text,
  recipe jsonb,
  thumb_path text,
  photo_paths text[] default '{}',
  author text,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
create index if not exists design_versions_design_idx on public.design_versions (design_id, created_at desc);

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  day date not null,
  at time,
  status text not null default 'draft' check (status in ('draft','in_review','approved','posted')),
  title text,
  caption text,
  hashtags text[] default '{}',
  design_ids uuid[] default '{}',
  campaign_id uuid references public.campaigns(id) on delete set null,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_items_brand_day_idx on public.calendar_items (brand, day);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  design_id uuid references public.designs(id) on delete cascade,
  author text,
  text text,
  x real,   -- 0..1 spot on the picture (null = a note on the whole design)
  y real,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_design_idx on public.comments (design_id, created_at);

create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  line text not null,
  category text,
  status text not null default 'suggested' check (status in ('suggested','approved','rejected')),
  author text,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phrases_brand_idx on public.phrases (brand, status);

-- row level security: the same single policy as `designs`
alter table public.design_versions enable row level security;
alter table public.campaigns enable row level security;
alter table public.calendar_items enable row level security;
alter table public.comments enable row level security;
alter table public.phrases enable row level security;

drop policy if exists "members all design_versions" on public.design_versions;
create policy "members all design_versions" on public.design_versions for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));
drop policy if exists "members all campaigns" on public.campaigns;
create policy "members all campaigns" on public.campaigns for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));
drop policy if exists "members all calendar_items" on public.calendar_items;
create policy "members all calendar_items" on public.calendar_items for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));
drop policy if exists "members all comments" on public.comments;
create policy "members all comments" on public.comments for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));
drop policy if exists "members all phrases" on public.phrases;
create policy "members all phrases" on public.phrases for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));
