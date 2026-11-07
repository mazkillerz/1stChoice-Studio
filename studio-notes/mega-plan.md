# Studio mega plan (Nov 2026): take Studio to the next level

Written 8 Nov 2026 with the owner (Mazoon). A lead Claude Code session reads this file, splits the work into parallel agents and ships it in waves. Read `CLAUDE.md` first: every hard rule there still applies.

## The owner's answers (decided)
- All five areas below are in scope.
- New Supabase tables are OK (use migrations with row-level security; the publishable key stays public).
- AI: **free only** for now: on-device models or plain code. No paid APIs, no API keys.
- Users: **3 people** (Mazoon + 2 partners) on the one shared team login. Approvals need to know who is who: add a **"Who's using Studio?" picker** (name chosen once per device, changeable in Settings, stored with every save/approval/comment). Do NOT create accounts or type passwords; individual logins can come later (the owner creates them in the Supabase dashboard).
- The brand rules check must **never block** (details in 2.3).
- Wording: the owner edits words himself in Studio; new Arabic still comes only from `brand.js` phrases or the in-app phrasebook (owner-approved).

## How the work is run (for the lead session)
- **Lead = the main model** (planning, architecture, UI/UX decisions, reviews, merges, version numbers, changelog). **Builders = `sonnet` subagents** with precise briefs. **Haiku** for grepping, running tests and reporting, screenshots + short visual notes, README/changelog drafts (see CLAUDE.md "Saving usage").
- **Every builder works in its own git worktree** (`Agent` with `isolation: "worktree"`, or `git worktree add ../studio-<topic> -b claude/<topic>`) and **its own http-server port** (8081, 8082…, pass `BASE=http://127.0.0.1:<port>/` to tests). Never two agents in one working tree: a `git stash` by one agent once reverted another agent's files.
- Each builder owns a clear set of files (map below). Shared hot files (`assets/studio.js`, `assets/studio.css`, `brands/1stchoice/brand.js`, `sw.js`, `studio-notes/changelog.md`) are touched in small, clearly separated blocks; **only the lead bumps the version, the sw cache and writes the changelog**, at merge time.
- Merge order: one branch at a time into an integration branch `claude/mega-integration`, run `node tests/run.mjs --changed` (with `JOBS`), fix, then the next. `main` gets the integration branch at the end of each wave **only when all tests pass** (Pages publishes `main` immediately). Big redesigns ship **behind a toggle, off by default**, until the owner approves (CLAUDE.md workflow 3).
- Ask each builder for a short report (files, tests, doubts), never file dumps.
- Known pre-existing failures at the time of writing (fix them in Wave 1, then expect zero): `taste` 360×740 (Create size buttons 61>59), `templates` "Arabic titles…" ×2, `create-fixes` "360px all five sizes fit", and flaky-under-load `draw-edges`, `create-render`, `share`, `peek`.
- Sandbox notes: Google Fonts may fail in a sandbox (false failure until fonts are self-hosted, see 1.2). The test runner needs `node_modules`: `ln -sfn /home/claude/scratch-tests/node_modules node_modules` if that folder exists, otherwise `npm i playwright` in a scratch folder (Chromium is preinstalled; do not run `playwright install`). Remove the symlink before committing.

## Waves
- **Wave 0, lead only (short):** read CLAUDE.md, README, `studio-notes/backlog.md`, `lessons.md`, this plan; run the full suite once for a baseline; write the file-ownership map and the briefs; create the integration branch.
- **Wave 1, foundation (parallel):** 1.1, 1.2, 1.3, 1.4, 2.1 (tokens only), 4.0 (schema).
- **Wave 2, features (parallel):** 2.1 (components), 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3.
- **Wave 3, power and polish (parallel):** 3.4, 3.5, 4.4, a Simplify pass over everything new, What's New entries with screenshots, README, the studio-improver skill's Testing map, and the owner checklist.

---

## 1. Fixes and foundation
### 1.1 Saved designs: covers, updates and versions
- Owner report: "When I upload something it doesn't show a cover; I go inside, save and update, but it saves another version, not that version." It wasn't reproduced on 7 Nov (Restock and Create both updated in place with a cover in the fake cloud). Reproduce against real flows: every tool, Save sheet switch states, "Only save to the team", "Save as a team template", designs opened from Templates vs Saved, `?go=1`, offline/slow upload, two phones editing the same design. Check the real thumbs in Supabase storage for blank/black covers (the tool thumb fills `#000` before drawing; a not-yet-decoded photo gives a black cover).
- Make the choice unmissable: **Update "<name>"** (default when a saved design is open) vs **Save as new**. Create's sheet currently says "Also save to the team / Save & add to team" for an opened team template even though it updates; fix the labels.
- **Version history** for team designs (new table, 4.0): every update keeps the previous recipe + thumb (cap ~20 per design); the design menu gets "Versions" with picture, who, when, and Restore (restore = a new version, nothing lost). Never delete storage files of kept versions.
- A cover that failed to make is redrawn automatically the next time the design is opened (and a "Redraw cover" action in the menu).

### 1.2 Self-hosted fonts
- Serve Lalezar, Cairo (600/800, Arabic + Latin) and Modak from the repo (woff2, `font-display: swap`), precached by the service worker; brand fonts declared in the brand kit by file. Google Fonts stays only as a fallback for the "More fonts" picker. Fixes the hanging-stylesheet blank page (backlog note 1.43.0) and makes offline first use correct. Check Arabic punctuation (! : …) and Latin digits still render in every tool.

### 1.3 Tests: fast and steady
- Full suite under ~10 minutes: shard across workers, reuse one browser per worker, share page setups, cut fixed sleeps for proper waits. Map `studio.js` lines outside `tool()`/`home()` to tool suites too (backlog 1.43.0). Fix the flaky suites listed above (deterministic waits for the service worker, animations, fonts).
- Add **visual goldens** for every Create template (thumbnail-size pixel compare with a tolerance) so a drawing change can't silently alter templates.

### 1.4 Small fixes sweep
- Create size buttons clipped at 360 px; the open "UX audit findings" in `studio-notes/backlog.md` that are clear bugs; anything the baseline run shows. Check 390×844 touch and 1280×800, light and dark, Arabic RTL in every input.

## 2. Design system
### 2.1 One brand system for every tool
- **Tokens** in the brand kit: colours (already there), type scale (headline / sub / body / small with sizes per format), spacing steps, corner radii, shadows, safe zones per format. Engine reads tokens; no brand values in `assets/` or `tools/`.
- **Shared components** used by Restock, Offer, Carousel, Photo story, Create and Board: pill/button (with icon), panel, sticker badge (rotated, with words), step number, logo block, handle (Modak + Instagram icon), map-in-bio pill. One implementation each; tools and Create templates call them. Changing a token or component restyles everything (check with the visual goldens).
- The flat 2D can icon, coffee-filled type and crayon pieces become component-ready assets.

### 2.2 Occasion packs
- A pack = one folder `brands/<id>/packs/<pack>/` with `pack.js` (name, dates active, palette add-ons, text fills, assets, Create templates, optional reels), its assets and its template documents. The engine loads packs listed in the brand kit; Home shows an occasion banner when a pack is in season; Templates gets a chip per pack.
- Move **National Day 2026** (today: `assets/nd26/`, `templates/nd26/`, `textFills`, `templateCats`) into the first pack without breaking existing saved designs (keep the old asset ids working: alias map).
- Pack scaffold + docs so the next occasion (Ramadan, Eid, Winter camp…) is "drop files, list them".

### 2.3 Brand rules check (soft, never blocks)
- Rules live in the brand kit (data, owner-editable): phrases outside the approved list/phrasebook (flag only new Arabic lines, not edits of approved ones), banned words (خوي/خويك, غرشة/غرشتك/غرش, وايد, مو بعد, cheers words such as كاسك), "25+"/"٢٥+" next to Passion, White and Cream looks on one design, text inside Instagram's covered zones (story top 250 / bottom 300), text too small for a phone (by format), low contrast text, a can image that isn't an HD cut-out.
- UX: clean design = **no change at all** to the Save sheet. Otherwise one quiet line per finding inside the Save sheet with **Fix** (when a safe automatic fix exists: move into the safe zone, swap a word for the approved one) or **Ignore** (remembered per design). Never stops a save. A Settings switch turns it off. Rules engine is brand-agnostic; rule data per brand.

### 2.4 Phrasebook inside Studio
- Supabase table (4.0): approved lines with category (headline, small line, button, caption, poll…), plus suggestions. Partners suggest a line; the owner approves/edits/rejects in Studio (owner role = the "Who's using" name set as owner in Settings, protected by a simple confirm, not a password). Approved lines join the word pickers in every tool and the rules check. `brand.js` phrases stay as the built-in base.

## 3. Making designs faster
### 3.1 Import from Claude Design
- Drop or pick an exported Claude Design board (`.dc.html`, a self-contained HTML, or a zip with its images) and it opens in Create with **every piece as its own layer**: pictures (art as assets, photos as replaceable photo layers), shapes (backgrounds, borders, radii, shadows, gradient shades), and text (font, size, weight, colour, alignment, line height, rotation; mixed-colour lines split into runs; crayon-filled words get the crayon text fill; a white copy under a crayon word becomes "crayon on white"). Clipped groups (overflow hidden) become one picture.
- The working reference is in `studio-notes/reference/claude-design-import/` (`layers.js` = the DOM walk that produced the 29 National Day templates; `layers_build.py` = turning that into Create documents). Port the logic to run **in the browser** (sandboxed iframe, same-origin blob URLs), with the same fixes learned there: load pictures before rebuilding layers, give single-line text boxes slack so Konva doesn't re-wrap, keep text boxes inside the page unless rotated, nudge tight-line-height numbers into their circles, wrap Latin runs (handles, URLs) in Unicode isolates (U+2066…U+2069) inside Arabic text, rasterise SVG pictures to PNG (Konva canvas can't draw these SVGs), mark off-page pieces `bleed`. Pictures from the file become draft photos (IndexedDB) until saved to the team.
- Test with the boards in `brands/1stchoice/templates/nd26/` (compare against the shipped thumbnails) and a few new boards.

### 3.2 One-tap resize
- Any Create design (and tool designs where it makes sense): Story ↔ Post ↔ Square ↔ Highlight. Re-lay out by roles (headline, sub, product, button, logo, background art, bleed art) and the format's safe zones; result opens as a new page next to the original for the user to tweak. Templates may carry hints per format.

### 3.3 Campaign sets
- Group several designs (story, post, carousel, highlight) as one campaign: shared words (change the headline once, every design follows unless a design overrides it), shared look, one-tap "Save all" (PNG ZIP at full quality) and "Add all to the team". Works with the calendar (4.1).

### 3.4 Moving stories (MP4)
- Export a Create design as a 5–8 s 1080×1920 MP4 (30 fps, H.264 via WebCodecs; fall back gracefully where unsupported): per-layer entrance presets (pop, slide, fade, crayon wipe, cat peek-in), optional sound from the approved library already in the repo (loudness target mean ≈ −28 dB, peaks ≤ −9 dB; no fizz, no glass ping). Reuse `assets/reel-export.js` / `reel-audio.js` where possible.

### 3.5 Background removal on the phone (free)
- On-device, lazy-loaded segmentation (an open model running in WebGPU/WASM, loaded only when asked; check size and speed on a mid-range Android first, backlog #7). Use: can photos and people photos → cut-out layer. If no model is good enough on phones, ship it desktop-only behind a toggle and say so.

## 4. Team workflow
### 4.0 Supabase schema (Wave 1, one builder)
- Migrations + RLS (team members only, like `designs`): `profiles_local` is NOT needed (names live on the device); add `design_versions`, `calendar_items` (date, status draft → in review → approved → posted, caption, hashtags, design ids, campaign id, who), `comments` (design id, author name, text, resolved), `phrases` (line, category, status suggested/approved/rejected, author, approved_by), `campaigns`. Store the author **name** chosen in "Who's using". Keep the fake cloud (`tests/fakecloud.js`) in step so tests run offline.

### 4.1 Content calendar
- Month and week views (phone-first: a vertical week list), each item with date/time, status, caption, linked designs (thumbs), campaign. Drag to move dates on desktop, long-press menu on phone. "Posted" replaces the old POSTED_LOG; posting day shows on Home.

### 4.2 Approvals and comments
- Send for review → the owner sees a review queue on Home; approve, or comment on the design (pinned to a spot on the picture). Approved designs go to an "Approved" collection; the creator sees the result. Who did what is shown by name.

### 4.3 Captions with the design
- Caption + hashtags stored with a design or calendar item; a Copy button on the design sheet and after Save; phrase suggestions from the phrasebook (Arabic, casual Omani; no invented claims, no "25+" for Passion, no sale-point types).

### 4.4 Live stock on restock stories (only if readable)
- Investigate `https://location.1stchoice.cloud` for a public, read-only data source (JSON/API) of sale points and stock per flavour. If one exists: pick a sale point in Restock and the place name + stock fill in (refreshed on the day). If not: write down what the owner would need to expose, and skip.

## Owner checklist (the lead writes the final version at the end)
- Set your name (and partners' names) in "Who's using Studio?" on each device; mark yourself as the owner.
- Approve or reject the toggled features (they ship off by default).
- Review new phrasebook suggestions.
- Optional later: create individual logins in the Supabase dashboard.
