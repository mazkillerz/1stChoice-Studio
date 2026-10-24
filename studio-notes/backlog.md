# Backlog

Ranked ideas and bugs. Score = team impact + Mazoon impact + wow − effort (each 1–5). Highest first.

**Last session:** 1 (0.1.0) was a **team** session → next one is a **Mazoon** session.

## Next up
| # | Idea | Team | Mazoon | Wow | Effort | Score | Notes |
|---|------|-----:|-------:|----:|-------:|------:|-------|
| 1 | Highlight cover maker (own tool: icon/emoji or word in a circle, brand colours, batch of 6–8 covers, 1080×1920 with the safe circle) | 2 | 5 | 4 | 2 | 9 | Mazoon session. Create already has a Highlight size; this is a fast dedicated tool. |
| 2 | Restock "Save right away": after Quick start, a big "Looks good · Save" button that saves the PNG with no sheet | 5 | 2 | 3 | 2 | 8 | Next team session. Builds on Quick start. |
| 3 | Post maker presets (1080×1350) for Did-you-know / Your-choice / Ice cold as one-tap tools on the hub | 3 | 4 | 3 | 2 | 8 | Templates exist in Create; surface them. |
| 4 | Share target: share photos from the phone's gallery straight into Studio (PWA `share_target`) | 5 | 3 | 5 | 4 | 9 | Needs a service-worker POST handler; Android only, iPhone no. |
| 5 | Batch export: save every slide/page or several drafts in one go (ZIP or share sheet with many files) | 3 | 4 | 3 | 3 | 7 | |
| 6 | Template search and collections in Create (search by word, favourites) | 2 | 4 | 3 | 3 | 6 | |
| 7 | Background removal for can photos (on-device model, lazy-loaded) | 3 | 4 | 5 | 5 | 7 | Check size/speed on a mid-range Android first. |
| 8 | Text styles (saved headline/small-line presets) | 2 | 3 | 2 | 2 | 5 | |
| 9 | Stickers pack (brand-approved shapes, arrows, sparkles) | 2 | 3 | 3 | 2 | 6 | Wording must come from brand.js. |
| 10 | Second brand kit plumbing check (a dummy brand to prove brand-agnostic) | 1 | 3 | 2 | 2 | 4 | |

## UX audit findings (open)
- Tool sheets: the inspector's Done (`.done`, 40px) is under 48px. Raising `.done` to 44px globally broke `tests/full.mjs` (phone Collage: the inspector closed before Done could be tapped, twice in a row). Fix it per sheet and re-run full.mjs.
- Hub: the tool list is long on a phone (9 rows); consider grouping (Photo stories / Promotions / Free canvas) once there are more tools.
- Create: the Templates start sheet shows blank thumbnails for templates further down until they render. Add a skeleton shimmer or real pre-rendered thumbnails.
- Create top bar: the "Untitled design" title gets little room on a phone; check long names.
- What's New screenshots: consider WebP (smaller) once Safari support is confirmed for the team's phones (it is on iOS 14+).
- Check contrast of muted text (`--muted` #5f5b55 on #f5f4f1 ≈ 6:1, OK) on cream backgrounds in sheets.

## Done
- 0.1.0: Quick start from a photo (Restock / Photo story / Collage), What's New page + badge, tap targets (hub view switch, Experimental, Create back / Design menu / page + / Done).
