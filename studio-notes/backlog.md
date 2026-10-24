# Backlog

Ranked ideas and bugs. Score = team impact + Mazoon impact + wow − effort (each 1–5). Highest first.

**Last session:** 5 (0.5.0) was a **Simplify** session. Session 4 (0.4.0) was a Mazoon session → the next one (0.6.0) is a **team** session.
**Simplify session:** every 5th version. The next one is 0.10.0.

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
| 14 | Board: component overrides beyond words (swap a photo or colour in one copy), and copies that follow the main's size | 1 | 4 | 3 | 3 | 5 | Follow-up to 0.4.0 components. Today only typed words are kept per copy. |
| 15 | Board: Penpot-style **flex layout** (a frame or group that stacks its items in a row/column with gap and padding, and grows with text) | 2 | 4 | 4 | 4 | 6 | Biggest remaining Penpot idea; great for price lists and menus. Ship behind a toggle. |
| 16 | Board: outline (stroke) on Union/Exclude combined shapes; today only Subtract/Intersect keep the bottom shape's outline | 1 | 2 | 1 | 3 | 1 | Needs a real outline path (vector boolean library) — only if asked. |
| 11 | Second brand kit plumbing check (a dummy brand to prove brand-agnostic) | 1 | 3 | 2 | 2 | 4 | |

## UX audit findings (open)
- tapscan still reports the custom-colour `input[type=color]` (38px) inside `.sw-btn`: its parent's `::after` gives the hit area. Teach tapscan to check the parent's `::after` too.
- Save sheet: the green check in "Saved!" is faint (dark green tick on a green circle); raise its contrast.
- Team-only save (no picture) on a phone now means: Save, cancel the share sheet, then "Only save to the team". Watch whether the team misses a direct way; if so, add it under a "More" in the sheet.
- Inspector (layer editor) Done is still 40px tall visually; since 0.2.0 every Done has an invisible 48px hit area. Only enlarge it visibly if full.mjs stays green.
- Create: Templates already show a shimmer while loading (checked 0.2.0); only pre-rendered thumbnails would improve it further.
- Create top bar: the "Untitled design" title gets little room on a phone; check long names.
- What's New screenshots: consider WebP (smaller) once Safari support is confirmed for the team's phones (it is on iOS 14+).
- Check contrast of muted text (`--muted` #5f5b55 on #f5f4f1 ≈ 6:1, OK) on cream backgrounds in sheets.

## Done
- 0.5.0 (Simplify): one-tap Save on a phone (two taps → one; sheet then offers Add to the team, no second picture), hub tools grouped (Stories / Posts and covers / Make anything) with Restock first, two tool views instead of three, shorter hub intro, tapscan counts `::after` hit areas and skips screen-reader-only inputs.
- 0.4.0: Board gets two Penpot ideas: Combine shapes (union/subtract/intersect/exclude, live and editable, Combine in the quick bar) and Components (main + copies that follow it, words kept per copy, detach/reset/go to main).
- 0.3.0: Quick start ready bar ("Looks good · Save" saves in one tap; Change words), bigger Text place pad on phones (cells 30 → 45px).
- 0.2.0: Highlight covers tool (icon / word / photo, shared look, one PNG per cover), pager wording per tool (`pageNoun`), `cols` on seg fields, bigger Done on the main sheets + 48px hit area on every Done, hex box 44px.
- 0.1.0: Quick start from a photo (Restock / Photo story / Collage), What's New page + badge, tap targets (hub view switch, Experimental, Create back / Design menu / page + / Done).
