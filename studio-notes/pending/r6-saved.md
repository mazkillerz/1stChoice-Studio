# r6-saved

## What's New cards
- **Saved cards are easier to read** (improve): the ⋯ button now sits next to the name under each picture instead of on top of it, and names show on two lines instead of being cut. The same goes for Team assets, Create's template names, the calendar picker, Continue editing and the Video lists.
- **Campaigns removed** (improve): the Campaigns button, Select > Campaign and the design menu's Campaign row are gone (nothing was using them). Saved designs and calendar items are untouched.

## Files
- Archived (git mv + add -f): `_archive/campaigns (2026-11-16)/` holds campaigns.js, campaigns.css, tests/campaigns.mjs and `removed-code.txt` (snippets removed from studio.js and calendar.js).
- Remove `assets/campaigns.js` and `assets/campaigns.css` from the sw.js shell list (grep `campaigns` in sw.js). No new shell files.
- New suite `tests/r6-saved.mjs`. MAP row needed in tests/run.mjs: `[/assets\/teamassets\.|assets\/studio\.css|assets\/studio\.js/, [..., 'r6-saved']]` (add to the Saved/studio rows and HUB_SUITES).
- Edited: tests/run.mjs (campaigns dropped from MAP/HUB_SUITES), tests/polish71.mjs (long title now 2 lines, intended).

## Decisions
- `campaignRecipe` / `campaignStamp` stay on `Studio` but return the recipe unchanged; `campaign_id` stays in cloud column lists; cloud.js campaign API, fakecloud and tests/cloud-api.mjs untouched.
- Saved/Home cards: ⋯ is absolutely placed at the bottom corner of the card (44px hit area, 28px icon, muted), caption reserves 32px on the page's side. Home row cards 112 -> 128px wide to keep room for names.
- Templates page, Create picker stars, calendar items, Feed tiles, Brand kit already kept controls off the picture; Feed's small status badges on tiles (no names) left as is.
- Left: README still mentions campaigns (lines ~122, 134) and the team-flag text; lead owns docs. Supabase tables left in place.
