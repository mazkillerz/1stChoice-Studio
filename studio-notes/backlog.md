# Backlog

Ranked ideas and bugs. Score = team impact + Mazoon impact + wow − effort (each 1–5). Highest first.

**Last session:** 3 (0.3.0) was a **team** session → next one is a **Mazoon** session.
**Simplify session:** every 5th version. Next one is **0.5.0** (one more feature session first: 0.4.0).

## Next up
| # | Idea | Team | Mazoon | Wow | Effort | Score | Notes |
|---|------|-----:|-------:|----:|-------:|------:|-------|
| 3 | Post maker presets (1080×1350) for Did-you-know / Your-choice / Ice cold as one-tap tools on the hub | 3 | 4 | 3 | 2 | 8 | Templates exist in Create; surface them. |
| 4 | Share target: share photos from the phone's gallery straight into Studio (PWA `share_target`) | 5 | 3 | 5 | 4 | 9 | Needs a service-worker POST handler; Android only, iPhone no. |
| 5 | Batch export: save every slide/page or several drafts in one go (ZIP or share sheet with many files) | 3 | 4 | 3 | 3 | 7 | |
| 6 | Template search and collections in Create (search by word, favourites) | 2 | 4 | 3 | 3 | 6 | |
| 7 | Background removal for can photos (on-device model, lazy-loaded) | 3 | 4 | 5 | 5 | 7 | Check size/speed on a mid-range Android first. |
| 8 | Text styles (saved headline/small-line presets) | 2 | 3 | 2 | 2 | 5 | |
| 9 | Stickers pack (brand-approved shapes, arrows, sparkles) | 2 | 3 | 3 | 2 | 6 | Wording must come from brand.js. |
| 10 | Highlight covers: a **Product** cover type that puts a brand asset (HD can cut-out) in the circle; emoji covers | 2 | 4 | 3 | 2 | 7 | Follow-up to 0.2.0. Use the brand's `assets` list, never a drawn can. |
| 12 | Quick start for Highlight covers / Carousel (several photos → one page each) | 3 | 3 | 3 | 2 | 7 | Ready bar from 0.3.0 works for any tool with `quick`. |
| 13 | Ready bar: "Save to team too" toggle so the restock lands in Saved designs in the same tap | 4 | 2 | 2 | 2 | 6 | Team save needs a name; default to tool + date. |
| 11 | Second brand kit plumbing check (a dummy brand to prove brand-agnostic) | 1 | 3 | 2 | 2 | 4 | |

## UX audit findings (open)
- tapscan flags `.sw-btn` (40px) and the hex input: both already have a 48px hidden hit area / are fine; teach tapscan to count `::after` hit areas so it stops reporting them.
- Inspector (layer editor) Done is still 40px tall visually; since 0.2.0 every Done has an invisible 48px hit area. Only enlarge it visibly if full.mjs stays green.
- Hub: the tool list is long on a phone (10 rows since Highlight covers); consider grouping (Photo stories / Promotions / Free canvas) once there are more tools.
- Create: Templates already show a shimmer while loading (checked 0.2.0); only pre-rendered thumbnails would improve it further.
- Create top bar: the "Untitled design" title gets little room on a phone; check long names.
- What's New screenshots: consider WebP (smaller) once Safari support is confirmed for the team's phones (it is on iOS 14+).
- Check contrast of muted text (`--muted` #5f5b55 on #f5f4f1 ≈ 6:1, OK) on cream backgrounds in sheets.

## Done
- 0.3.0: Quick start ready bar ("Looks good · Save" saves in one tap; Change words), bigger Text place pad on phones (cells 30 → 45px).
- 0.2.0: Highlight covers tool (icon / word / photo, shared look, one PNG per cover), pager wording per tool (`pageNoun`), `cols` on seg fields, bigger Done on the main sheets + 48px hit area on every Done, hex box 44px.
- 0.1.0: Quick start from a photo (Restock / Photo story / Collage), What's New page + badge, tap targets (hub view switch, Experimental, Create back / Design menu / page + / Done).
