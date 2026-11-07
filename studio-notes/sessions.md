# Parallel sessions: 1.41.0 → 1.50.0 (5 Nov 2026)

One **lead** session coordinates ten version sessions (owner: "Improve studio 10 sessions bug improvements please"). The owner named the work, so every session is a **bug-fix + improvement** session in its own area: first hunt and fix bugs there (tap through on a phone at 390×844 and 360px, then a computer at 1280×800, both themes, Arabic names), then one small improvement that makes that area easier. No big new features. 1.45.0 and 1.50.0 are Simplify sessions (pattern review + full sweep). The previous round is in `_archive/sessions 1.36-1.40 (4 Nov 2026)/`.

Each version session builds on its own branch; only the lead merges to `main` and releases, in version order, so `main` never breaks. **At most 4 at once** (lessons 1.13.0).

- Wave 1: 1.41, 1.42, 1.43, 1.44
- 1.45 (Simplify) starts when the first wave-1 session reports done; cleanup at once, full sweep only after 1.41–1.44 are on `main`.
- Wave 2: 1.46, 1.47, 1.48, 1.49 start as slots free up (after 1.45 is running, keep ≤ 4 at once).
- 1.50 (Simplify) last; full sweep only after 1.46–1.49 are on `main`.

| Version | Area | Branch | Work | Scope (files it may change) | Port |
|---|---|---|---|---|---|
| 1.41.0 | Test reliability + save engine | `claude/v1.41-flakes` | Fix the known flakes at their cause: `batch-saved` "pixel identity: <tool> Save == batch" fails under 4-way load (a font/photo not yet decoded in one render? if the app can render before fonts/photos are ready, that is an app bug: fix it in `assets/render.js` / the render path, so a batch PNG can never come out wrong); `share` service-worker wait; `peek` "fits the screen" timing. Then bug-hunt the Save sheet, team save and Save pictures on a phone (both themes). | `assets/render.js`, `assets/batch.js`, the save engine part of `tool()` only if a real render bug is found (tell the lead), `tests/batch*.mjs`, `tests/share.mjs`, `tests/peek.mjs`, `tests/quicksave.mjs`, `tests/draft-pictures.mjs`, new `tests/<name>.mjs` | 8081 |
| 1.42.0 | Board (lab) | `claude/v1.42-board-fixes` | Board bugs: Shapes / Icons grid tiles 43.8px on a phone (#47, make them ≥ 44, goal 48); "Use on all text" in a Board text style's ⋯ (#48); panel headings still weight 800 (taste: 400/500/600 only); run `tests/tapscan.mjs`-style check on Board at 390 and 360 px and fix what is under 44px; any Board bug found tapping through (add, move, undo, layers, save, stickers). | `lab/**`, `tests/lab*.mjs`, `tests/board-*.mjs`, new `tests/<name>.mjs` | 8082 |
| 1.43.0 | Tool pages (inspector, sheets, layers) | `claude/v1.43-tool-fixes` | Bug-hunt every tool page (`tools/*.html` except Create and Video) at 390 and 360 px and a computer: clipped labels, sideways scroll, under-44px controls (`node tests/tapscan.mjs`), RTL in every text input, sheets that do not fit, layer bar issues. Audit finding: on a computer the photo tools show Add photo twice (Photo card tile + "Add your photo" under the preview): keep one. The More tab is up to five rows on a phone: check at 360px and make it fit without hiding the preview. | `tool()` in `assets/studio.js`, `tools/*.js|html` (not `create*`, `video*`), new rules in `studio.css` before the fresh-look block, `tests/full.mjs`, `tests/v5.mjs`, `tests/polish.mjs`, `tests/simplify40.mjs`, new `tests/<name>.mjs` | 8083 |
| 1.44.0 | Video editor | `claude/v1.44-video-fixes` | Video bugs: the blank white preview the owner saw (check every load path and the `?debug=1` panel; make a failed load show a clear message instead of white), the Mix sheet should grow taller when dragged up on a phone, any bug found tapping through (add clips, trim, text, sound, export) at 390/360 px and a computer, both themes. | `tools/video*`, `assets/reel-*.js`, `tests/video*.mjs`, `tests/reel*.mjs`, `tests/reels-hub.mjs`, new `tests/<name>.mjs` | 8084 |
| 1.45.0 | Simplify | `claude/v1.45-simplify` | Simplify session + pattern review per the skill (walk the common jobs on phone and computer, cut taps, shorten sheets, open audit findings outside the other rows' scopes); lessons sessions 32–39 move to `_archive/` like 16–31. Full sweep only once 1.41–1.44 are on `main` (rebase onto it first). | anything not in another running row's scope; coordinate through the lead | 8085 |
| 1.46.0 | Hub: Home, Saved, search | `claude/v1.46-hub-fixes` | Bug-hunt Home, Saved (collections, menus, Peek, select, swipe), search, All tools, Settings at 390/360 px and a computer, both themes, Arabic names. Friendly states when the cloud is slow or offline (sign-in lost, save to team fails, Saved list fails to load): clear message + retry, never a blank page or a stuck spinner. The collection ⋯ under the row's end fade; All tools drag edge auto-scroll if cheap. | `home()` in `assets/studio.js`, `assets/search.*`, `assets/cloud.js` (no schema change), `index.html`, new rules in `studio.css`, `tests/home7*.mjs`, `tests/polish71*.mjs`, `tests/saved-find.mjs`, `tests/select*.mjs`, `tests/peek.mjs`, `tests/pins.mjs`, `tests/search.mjs`, new `tests/<name>.mjs` | 8086 |
| 1.47.0 | Create + Templates | `claude/v1.47-create-fixes` | Bug-hunt Create (start sheet, templates, text, stickers, emoji, save, drafts, render) and the Templates page (favourites, Recently used, team templates, search) on phone and computer, both themes, RTL. Long Arabic phrases that overflow a template; empty and loading states. | `tools/create*`, `assets/templates.*`, `tests/create*.mjs`, `tests/templates.mjs`, `tests/tplfav.mjs`, `tests/tplteam.mjs`, `tests/postpresets.mjs`, new `tests/<name>.mjs` | 8087 |
| 1.48.0 | Drafts, queue, Quick start | `claude/v1.48-queue-fixes` | Bug-hunt drafts (Continue editing, leave mid-edit, reload, two tabs), the photo queue (Next photo, Skip, reload, `?queue=1`, "N waiting"), Quick start for one-photo and paged tools, shared photos (share target). Fix what breaks; one improvement that saves a tap in these flows. | the drafts / queue / Quick start parts of `tool()` and `home()` (tell the lead which functions; 1.43 and 1.46 own the rest), `sw.js` only via the lead, `tests/queue*.mjs`, `tests/quicksave.mjs`, `tests/quickpages.mjs`, `tests/waiting-tag.mjs`, `tests/continue-clear.mjs`, `tests/share.mjs`, new `tests/<name>.mjs` | 8088 |
| 1.49.0 | Tool drawing: Restock, Photo story, Offer, Carousel, Collage, Highlight | `claude/v1.49-draw-fixes` | Edge cases in each tool's drawing: long Arabic and English words, empty fields, many photos, very wide/tall photos, every style in both looks (White / Cream). Fix overflow or clipping in the drawing; old designs must stay pixel-identical (the `*-styles` suites compare them). | `tools/restock.js`, `tools/photo-story.js`, `tools/offer.js`, `tools/carousel.js`, `tools/collage.js`, `tools/highlight*.js` (not `tool()`), `tests/*-styles.mjs`, `tests/collage-grids.mjs`, `tests/highlight*.mjs`, new `tests/<name>.mjs` | 8089 |
| 1.50.0 | Simplify | `claude/v1.50-simplify` | Simplify session + pattern review again, after the whole round: fold this round's lessons into the skill, settle taste rows, full sweep (every suite, contrast, tapscan, look8, desktop pass) once 1.46–1.49 are on `main`. | anything; coordinate through the lead | 8090 |

## Rules for every version session
1. Read `CLAUDE.md` and the `studio-improver` skill, then `studio-notes/taste.md` and `studio-notes/backlog.md`. Their rules apply (save quality, brand-agnostic engine, never delete, weights 400/500/600, RTL, 48px targets, tap budget, ≤2 filled buttons, approved Arabic only).
2. Work only on your branch and only in your scope. Branch from the lead branch `ccr-a1e90015-i7vnsq` (it holds this file; check `git log -1 -- studio-notes/sessions.md`). **Do not touch** (the lead owns them): `VERSION` in `studio.js`, `sw.js`, `studio-notes/changelog.md`, `backlog.md`, `lessons.md`, `taste.md`, `sessions.md`, `tests/run.mjs`, `README.md`. Never merge or push to `main`.
3. Instead write `studio-notes/pending/<version>.md` with: the What's New card(s) in the changelog format (with before/after image paths; `type: fix` for bug fixes), new files for the `sw.js` shell, `run.mjs` MAP rows for your suite, README lines, backlog/lessons/taste notes (every bug you found, fixed or not), a scoreboard row, and any Arabic wording that needs the owner's approval.
4. What's New shots go in `assets/whatsnew/<version>-<name>-before|after.jpg` (take "before" first; 390px at 2×, JPEG ~72, < 80 KB). One card per fix the owner would notice; small fixes can share one "Small fixes" card.
5. Tests: every fix gets a check in a suite (new `tests/<name>.mjs` or the suite that owns the screen) that fails without the fix. Your new suite + `node tests/run.mjs --quick` + the suites the skill's test map lists for the areas you touched must be green before your final push. Use your own port (`npx http-server -p 808x -c-1 .`, `BASE=http://127.0.0.1:808x/`). A suite red on the base too: say so.
6. Push early and often. When done, message the lead session `session_01Y65H7ac7hnqYNUVqbydksT` (`send_message`) with: branch, last commit, bugs fixed, suites run (pass/fail counts), and anything risky for the merge. If you need a file outside your scope, message the lead first. Use subagents per CLAUDE.md's model split (sonnet for building from a written brief, haiku for runs/shots).

## Merge order (lead)
1.41 → 1.42 → 1.43 → 1.44 → 1.45 → 1.46 → 1.47 → 1.48 → 1.49 → 1.50. Before each merge the lead merges `main` into the branch, bumps `VERSION` + `sw.js`, folds in the pending notes, runs `node tests/run.mjs --changed`, then merges to `main`.

## Overlaps to watch
- `tool()` in `studio.js`: 1.43 owns it; 1.41 (save path) and 1.48 (drafts/queue) must name the functions they touch to the lead before editing.
- `home()` in `studio.js`: 1.46 owns it; 1.48 only the queue/Continue editing parts.
- `studio.css`: everyone adds new rules only, before the fresh-look block; conflicts there are "keep both".
- `tests/peek.mjs`: 1.41 (timing) and 1.46 (Saved) — 1.41 first; 1.46 rebases.
- `tests/share.mjs`: 1.41 (timing) and 1.48 (share target) — same.

## Session ids
- Lead: `session_01Y65H7ac7hnqYNUVqbydksT` (branch `ccr-a1e90015-i7vnsq`)
- 1.41.0: `session_01Y65H7YCpSk3kAvVxNkPUHR` · 1.42.0: `session_01Y65H7X5DG3UeovTN7ARQQm` · 1.43.0: `session_01Y65H7WP9zYRrERVhiuaJhj` · 1.44.0: `session_01Y65H7Yqzpu6Btz6a7vCMvb` (all started 20:25 UTC)
- 1.45.0: `session_01Y65H7ZD84jGKKctLkzZxZy` (started 20:48 after 1.42.0 reported done at 20:48)
- 1.46.0: `session_01Y65H7WQmUZs5qBnp3qy1f6` (started 20:49 after 1.44.0 reported done)
- 1.47.0: `session_01Y65H7WtiEquro15H42k9Ww` (started 20:58 after 1.45.0's cleanup reported done; 1.45 waits for the sweep)
- 1.49.0: `session_01Y65H7ZpZYD9ntgPqbqmJLT` (started 20:58 after 1.43.0 reported done; 1.48.0 waits for 1.41.0, both touch share/save tests)
- Lead to-do at the 1.46.0 release: in `tool()`, `checkTeam()` uses `C.isMember()` and caches false offline, so "Add to the team" with no signal opens sign-in. Use 1.46's `C.checkMember` and leave `teamMember` null on error (+ a check in hub-offline).

## Renumbered (7 Nov 2026)
On 5 Nov the shared 5-hour usage limit stopped 1.41, 1.47 and 1.49 mid-turn (1.41 and 1.47 had pushed finished work). Meanwhile another session shipped its own 1.41.0 (can icon) and 1.42.0 (five feed layouts) to `main`. Releases from this round therefore use new numbers, Simplify still at 1.45 and 1.50:
| Release | From branch(es) |
|---|---|
| 1.43.0 | `claude/v1.41-flakes` (fonts before Save, team retry) — released 7 Nov; lead added one 12 s font cap and kept Home from waiting on fonts |
| 1.44.0 | `claude/v1.42-board-fixes` + `claude/v1.44-video-fixes` |
| 1.45.0 | `claude/v1.45-simplify` + `claude/v1.43-tool-fixes` (tool page fixes are simplifications) |
| 1.46.0 | `claude/v1.46-hub-fixes` |
| 1.47.0 | `claude/v1.47-create-fixes` |
| 1.48.0 | `claude/v1.48-queue-fixes` (started 7 Nov 08:42: `session_01Y65H7ZRuWsGmaSM4FEgHo8`) |
| 1.49.0 | `claude/v1.49-draw-fixes` (resumed 7 Nov) |
| 1.50.0 | `claude/v1.50-simplify` (last) |
At most **two** helper sessions at once from now on.
