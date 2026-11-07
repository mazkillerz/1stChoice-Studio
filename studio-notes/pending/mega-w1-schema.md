# w1-schema (4.0 Supabase schema + "Who's using Studio?")

## What's New card draft
**Who's using Studio?** Pick your name once and it goes on the designs you save, so the team knows who made what.
Settings has a new row to change it, and an "I'm the owner" switch for owner-only buttons.

## New shipped files for the sw.js shell
- `assets/who.js` (lazy-loaded by studio.js; fetched on first Settings > Change or first team save on a device)
- `supabase/` is NOT shipped (migration only).

## run.mjs MAP rows
- `[/assets\/who\./,['who']]`
- `[/assets\/cloud\.js|tests\/fakecloud\.js/,['cloud-api']]`  (keep the existing rows that map cloud.js to hub suites)
- new suites: `cloud-api` (~10 s, no server needed beyond index.html), `who` (~40 s)

## README lines
- Settings: "Who's using Studio" (name on saved designs) and "I'm the owner" switch (no password; only shows owner buttons).
- Saved designs keep their last 20 versions (Wave 1 UI will list them).

## SQL for the lead to review (NOT applied): `supabase/migrations/20261107120000_mega_wave1.sql`
Additive and idempotent. New tables `campaigns`, `design_versions`, `calendar_items`, `comments`, `phrases` (RLS on, one policy
`members all <table>` exactly like `designs`); nullable columns on `designs`: author, review (check in_review/approved/changes),
review_by, review_at, caption, hashtags text[], campaign_id (fk campaigns, on delete set null). Review: `calendar_items.status` and
`phrases.status` have check constraints; `comments.x/y` real 0..1; `design_versions.design_id` cascades.
Before applying: nothing breaks. After applying: nothing else to do (cloud.js reads the new columns when present).

## Behaviour notes
- Before the migration: `designs()` retries without the new columns; versions/calendar/comments/phrases/campaigns return [];
  `saveDesign` retries the upsert without `author`; no version is kept (table missing) and the tidy step works as before.
- saveDesign on update: keeps the previous row as a version BEFORE the upsert (deleted again if the save then fails), prunes to 20,
  tidy keeps every file any kept version references. restoreVersion restores recipe/thumb/photos only (the name stays); setThumb
  uploads a new `thumb-xxxx.jpg` and removes the old file unless a version points at it.
- `designs.author` = the last person who saved; a version's author = who made that state (the previous row's author).
- studio.js (marked "who (mega)"): `author:whoName()` on team saves; the first team save on a device asks once (`studio:who:asked`; never under webdriver).
- `StudioWho.ask()` returns null without opening under `navigator.webdriver`; pass `{user:true}` when a person tapped (Settings does).
- fakecloud: a design's first save still uses `thumb.jpg`; later saves use `thumb-<id>.jpg` so versions keep their picture.

## Arabic wording
None new.
