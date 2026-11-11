-- Team assets (Studio 2.3.0): pictures the team adds to the asset library (a partner's logo, a cut-out), shared by everyone.
-- Additive only and idempotent: one NEW table, no existing table or row is touched. RLS on, ONE policy like `designs`.
-- The files live in the private `studio` bucket under <brand>/assets/<id>/ (the bucket's member-only policies already cover them).
create table if not exists public.team_assets (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  tags text[] not null default '{}',
  folder text,
  path text not null,
  prev_path text,
  w integer,
  h integer,
  cutout boolean not null default false,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_assets_brand_idx on public.team_assets (brand, created_at desc);
alter table public.team_assets enable row level security;
drop policy if exists "members all team_assets" on public.team_assets;
create policy "members all team_assets" on public.team_assets for all to authenticated using ((select private.is_team_member())) with check ((select private.is_team_member()));
