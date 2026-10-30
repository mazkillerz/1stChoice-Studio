# Lessons

What worked, what failed, and process tweaks. Newest session first.

## Scoreboard (self-score at the end of every session; see the skill's Reflect step)
| Session | Version | Quality (1–5) | Speed (1–5) | Owner-reported issues after the previous release | Taste checks | Do better next time |
|---|---|---|---|---|---|---|
| 37 | 1.26.0 | 4 (video-polish 122/0; reels-hub 71/0; full sweep at release) | 4 (two helpers in parallel; the owner's phone bug could not be reproduced) | 1 (blank preview on the githack preview link) | see release | Test a preview link the way the owner opens it: cross-origin hosting taints canvases; add a ?debug=1 panel from day one |
| 36 | 1.25.0 | 4 (video-timeline 173/0, video-project 48/0) | 5 (engine + UI helpers on a written contract) | – | 35/35 | A new text layer must show fully while editing (its entrance hid it at first) |
| 35 | 1.24.0 | 4 (scene port strict diff 0.06–0.48/255 vs the DOM original; mix correlation 1.00 with the owner's MUSIC/SFX mixes at -14.06/-16.02 LUFS; video 100/100) | 5 (three sonnet helpers in parallel on one written contract, docs/reels.md; no integration rework) | 0 | see release | Write the contract (format + API names) before starting parallel helpers: it made three pieces fit on the first try |
| 34 | 1.23.0 | 4 (new suite draft-pictures 39/0; `--changed` 40 suites green; found and guarded two side effects of a render frame on a draft before any test: rewriting the draft, taking the queue) | 5 (both items in one pass; suite by a sonnet helper while shots and notes went on) | 0 | 35/35 pass | Before reusing a page in a hidden frame for a new input, list what that page writes on load and on leave, and guard it |
| 33 | 1.22.0 | 4 (backgrounds 37/0 with a Carousel part: Plain = no value pixel-identical; waiting-tag 57/0; found and fixed a stale banner on queue continue) | 5 (both items in one pass; dropped Highlight covers after one look at the shot) | 0 | see release | Shoot a tool's real preview before adding a visual option to it: the Highlight shot showed the finish had no room |
| 32 | 1.21.0 | 4 (old designs pixel-identical in restock-styles 56/0 and photostory-styles 16/0 before the commit; new suite backgrounds 31/0) | 5 (feature + audit fix in one pass; suite written by a sonnet helper while shots and notes went on) | 0 | see release | Look at a new finish at phone-preview size, not only zoomed: Glow on white was invisible in the preview at first |
| 31 | 1.20.0 | 4 (full sweep 49/49 green; new suite brandkit; Offer/Restock start lines now chosen by the kit, not by matching 1st Choice text) | 4 (lean: one sweep at the end; two proposals dropped after checking their cost) | 0 | 35/35 pass | Test plumbing with a second brand at every major version, not only when the backlog says so |
| 30 | 1.19.0 | 4 (new suite textstyles; release run green) | 5 (both items in one pass) | 0 | pass | Shoot the More tab at 360px too before release |
| 29 | 1.18.0 | 5 (new suite batch-saved 36/0, byte-identical PNGs vs open + Save for three tools) | 5 (reused the tool page in a hidden frame instead of a second renderer) | 0 | pass | Reuse the existing renderer; prove identical output |
| 28 | 1.17.0 | 4 (new suite board-flex; behind a toggle, old boards unchanged) | 5 (one session; the engine hooks into `changed()` once) | 0 | pass | Write the "old boards unchanged" check first |
| 27 | 1.16.0 | 4 (new suite tplfav 63/0; templates 80/0; taste 33/0; it caught a shadowed helper that stopped hub favourites saving) | 5 (one session; shots before code) | 0 | pass | Check a new control's place against every preview shape (story/post/square/circle) before writing the test |
| 26 | 1.15.0 | 4 (baseline sweep of every suite green on main; new suite simplify15 39/0; taste 35/35 with two new checks; found a copied-id bug of my own before any test) | 5 (phase 1 in one pass while the sweep ran from a worktree) | 0 | pass | Give every "rejected" rule in taste.md a check, not just the recurring rows |
| 25 | 1.14.0 | 4 (new suites flip 44/0 and highlight-emoji 40/0) | 4 (Flip + Emoji covers in one session) | 0 | pass | Check brand-asset implications (mirrored can labels) before building, ask early |
| 24 | 1.13.0 | 4 (queue 46/0; `--changed` 29 suites green) | 4 (root cause found in one loaded run) | 0 | pass | Read the printed leftover first, then instrument create/write/clear |
| 23 | 1.12.0 | 4 (new suite stickers 72/0; release run green; one CSS merge conflict, both sides kept) | 5 (riding on the asset layer gave move/colour/undo/recipe for free) | 0 | 33/33 pass | New layer types: reuse an existing layer kind with a new `ref` prefix instead of a new recipe type |
| 22 | 1.11.0 | 4 (new suite postpresets 88/0; release run green) | 5 (first of the five to finish; a 5-minute probe showed #20 was already half done) | 0 | 33/33 pass | Probe the real behaviour before building a backlog item |
| 21 | 1.10.0 | 4 (38/38 suites one at a time, contrast + tapscan clean; found two suites red on main since 1.5.0 and a taste check pointing at a missing file) | 4 (both phases done; the one-at-a-time sweep hit the 30-min background limit once) | 0 reported after 1.7.0 | 33/33 pass | Start the full sweep with a 2-hour background limit; run every suite once at the start of a Simplify session, not only at the end |
| 20 | 1.9.0 | 4 (new suite batch 99/0; release run green) | 5 (parallel session; the engine already saved every page, so the work was count, Cancel, names and ZIP) | 0 | 33/33 pass | Read the current engine before building a backlog item |
| 19 | 1.8.0 | 4 (new suite queue-keep 63/0; release run green; one known draft-timer flake under load) | 5 (built in a parallel session, merged clean with 1.9.0) | 0 reported after 1.7.0 | 33/33 pass | Give parallel sessions a lead-owned file list up front: no conflicts on VERSION/sw.js/notes |
| 18 | 1.7.0 | 4 (new suite 58/58, search +6 checks; gates green) | 5 (both items in one pass) | 0 reported after 1.6.0 | see release | In shot scripts recompute the preview's box AND scale after any sheet changes size |
| 17 | 1.6.0 | 4 (two new suites 42/42 and 19/19, gates green; my own shot caught three filled buttons in the Save sheet, fixed before release) | 5 (both items in one pass, no rework) | 0 reported after 1.5.0 | see release | Count filled buttons on every new state of a sheet (after save, not only the first view) |
| 16 | 1.5.0 | 4 (all six asks shipped; three taste findings of my own caught by taste.mjs and fixed before release: handle 40px, pinned thumbs off the line, More tools off the icon line) | 4 (one pass; test updates by a helper in parallel) | 0 reported after 1.4.0 (this list was new work, not fixes) | see release | Run taste.mjs right after the first visual pass, before screenshots for What's New |
| 15 | 1.4.0 | 4 (all suites green; two slips caught by the lead in review: weight 700, Arabic under ✕) | 5 (3 items in one pass with 3 parallel helpers) | 0 reported after 1.3.0 | 33/33 pass | Brief helpers with the taste rules (weights, RTL with an icon in the box) and that worktrees may start from an old main |
| 14 | 1.3.0 | 4 (new suite 90/90, 13 suites green; shots checked in both themes) | 4 (both items shipped; one dead end on thumbnails, reverted) | 0 reported after 1.2.0; mid-session: tests too slow (fixed in run.mjs + skill) | 32/32 pass | Check `--changed --dry` before a long run; compare a regenerated asset with the old one before replacing it |
| 13 | 1.2.0 | 4 (new suite 25/25, gates green; shots checked in both themes) | 5 (logo + one backlog feature in one pass) | 0 reported after 1.1.0 | see release | Ask for a larger source picture when the owner sends a logo |
| 12 | 1.1.0 | 4 (every gate green, new suite 13/13; no visual surprises in the shots) | 5 (both items shipped in one pass, no rework) | 0 reported after 1.0.0 | 32/32 pass | Plan multi-image cards: What's New keeps only one before and one after per card |
| 11 | 1.0.0 | 4 (every gate green; full.mjs caught one regression of my own before release; 8 taste findings fixed) | 3 (shipped all 8 asks in one session, but three helpers hit the usage limit and their work was finished by hand) | 2 (+ menu title left of its icons; three tools with one camera icon), both fixed | 32/32 pass | Brief helpers to save and report progress early; grow tap areas with `::after`, never by resizing controls in a bar |



## 1.24.0 (session 35, Mazoon, owner-directed: Video editor phase 1)
- Asked for the reel files before building (owner's instruction); the zip had pictures/fonts, a second zip had the sound pack with a cue sheet and the mix script: porting the script 1:1 gave a bit-exact match, so ask for the mix script, not just the files.
- A DOM/SVG reel ports to canvas closely when the test compares against the original page with its filters switched off (strict) and on (loose); the wobble can never match feTurbulence exactly, so judge it loosely.
- Linux Chromium has H.264 but no AAC encoder: the sandbox exports Opus-in-MP4; AAC must be checked on a real phone.
- A tool page outside `tool()` must be kept out of Save pictures (render.js) and of the broad `^tools/` suite map in run.mjs.

## 1.23.0 (session 34, team)
- Worked: reusing render.js for drafts was a 3-line change (`?draft=` instead of `?design=`, `ok` true when a draft loaded); the hub only builds the list.
- Watch out: a tool page opened with `?draft=` in a hidden frame would rewrite the draft on pagehide (new `at`, reorders Continue editing) and could take over the photo queue (`here` matches the draft). `RENDER` in `tool()` now makes `saveDraft()` a no-op and skips the queue block.
- Watch out: a 44px `.link` in a `.sec-head` is taller than the h2, so a "same line" check compares centres, not tops.

## 1.22.0 (session 33, Mazoon)
- Worked: `{...Studio.groundField(),global:true}` + `h.ground()` gave Carousel backgrounds in two lines, the same on every slide.
- Worked: shooting the tool before building made the call on Highlight covers easy (the finish only shows in a ring that a 60px cover can't show).
- Watch out: rows in All tools are drawn from the templates (`toolRow`/`libRow`), not through `paintWaitTags()`; anything that depends on `waitN` must be in the template too (`rowHref`).
- Watch out: a phone save of several pages goes to the share sheet; tests set `navigator.canShare=()=>false` to get downloads, and every slide needs its photo (set kinds to Words only).

## 1.21.0 (session 32, team)
- Worked: drawing the finish in story units (shapes in one path, seeded speckles) keeps preview and the 2× save identical with no cache; `h.ground()` makes adding it to a tool a two-line change.
- Worked: running the pixel-compare suites (restock-styles, photostory-styles) BEFORE committing, since they compare against HEAD; a shallow clone breaks photostory-styles (it looks back in history): `git fetch --depth=400 origin main` first.
- Missed at first: alphas tuned on a zoomed crop were too faint at preview size on white. Judge a visual effect in the real phone preview.

## Session 31 · 1.20.0 · 29 Oct 2026 (Simplify, wave 2)

**Worked**
- A made-up brand loaded by routing `brands/brands.js` in the test (no repo change), plus recording `fillText`/`font`/`fillStyle` on the canvas, proves brand-agnostic drawing without reading any picture.

**Didn't work / watch out**
- "Pick the approved line by its text" (`phrases.x.find(x=>x==='…')`) is a hidden brand dependency: it passed every 1st Choice test for months and silently ignored another brand's choice. Engine defaults that choose brand wording go through a brand-kit key.
- A Simplify wave the same day as seven feature versions found every budget kept; the cuts left are in features the owner hasn't seen yet, so they wait for his first look.
- `whatsnew.mjs` assumed the newest card has a screenshot; a text-only card (1.20.0) broke it at release. Tests should not assume optional content.
## Sessions 24–30 · 1.13.0–1.19.0 · 29 Oct 2026 (parallel round)

Seven version sessions (1.13.0 team, 1.14.0 Mazoon, 1.15.0 Simplify, 1.16.0 team, 1.17.0 Mazoon, 1.18.0 team, 1.19.0 Mazoon) plus 1.20.0 (Simplify) and a lead, eight sessions at once.

**Worked**
- A flaky check that "never fails alone" can be a timing-dependent outcome, not a slow one (1.13.0: load made a pending draft write succeed). Log create/write/clear with a stack before touching timeouts; prove a race fix with a check that fails deterministically on the old code (leave at once, expect the draft), not only with N green loaded runs.
- Riding on data the engine already keeps: Flip is `S.layers[id].flip` (absent = not flipped), so undo, drafts, the recipe and Duplicate got it free, and old designs draw exactly as before (1.14.0).
- Running a long sweep from a `git worktree` of origin/main on :8081 (`BASE=http://127.0.0.1:8081/`, `contrast.mjs <base>`) let 1.15.0 keep editing while the 35-minute sweep ran: no waiting, no mixed results.
- Reusing the tool page in a hidden same-origin frame (`?design=…&render=1`) for Save pictures, and moving the canvas part of `save()` into one `renderPage()` that both paths call: "same pixels" is true by construction (byte-identical PNGs in the test) (1.18.0).
- Hooking Board's flex engine into `changed()` once so every edit path re-flows for free (1.17.0).
- For a "many layers at once" action, `flush()` first and render once at the end: one undo step for free (1.19.0).

**Didn't work / watch out**
- A copied button (`el.innerHTML=other.innerHTML`) copies the ids inside it; `getElementById` then finds the copy first. Strip ids when mirroring markup (1.15.0).
- A rule in taste.md without a check drifts: "underlined links" was rejected in 0.7.1 but `.link` stayed underlined for 8 versions; "≤ 2 filled buttons in every state of a sheet" had no check and the phone Save sheet showed three. Both have checks in `taste.mjs` now (`links:underline`, `clutter:states`).
- A function declaration inside a closure hoists and silently shadows a module-level one of the same name (`mark()` for chips vs the new `mark(store,…)` helper): the page looked right (redraw + "Added to favourites") but nothing was saved. Give module-level helpers distinct names and assert what was written to storage, not only what the UI shows (1.16.0).
- Cans were flippable as built, so a flipped can showed its label mirrored; check brand-asset implications before building and ask early (1.14.0). Cans got `noFlip:true` at release.
- (Lead) **Eight sessions at once used up the shared 5-hour usage limit in about 30 minutes; four sessions stopped mid-turn.** Next time run at most 3–4 at once or stagger them, and tell each session to push early.
- (Lead) A test-merge of all finished branches in a scratch worktree, with one combined `run.mjs --changed` on a second port (`BASE=http://127.0.0.1:8081/`), let the lead release five versions (1.15.0–1.19.0) in one go safely. Keep doing it.
- (Lead) `share.mjs` still fails under parallel load and passes alone (known; service-worker wait).

## Session 20 · 1.9.0 · 28 Oct 2026 (Mazoon, parallel)

**Worked**
- Reading the engine first: paged tools already saved every page into one share sheet, so Save all was a label, progress + Cancel, file names and a desktop ZIP, not a new renderer.

**Didn't work / watch out**
- Chrome blocks a page's automatic downloads after the first one: several files on a computer must be one ZIP.
- `quickpages.mjs` was also red on `main` since 1.5.0 (it tapped Carousel in the + menu). Two suites hid failures for four versions: the lead now runs every suite a session's report says is red on `main` and fixes it before the release.

## Session 21 · 1.10.0 · 28 Oct 2026 (Simplify, parallel, two phases)

**Worked**
- Starting the Simplify session at once, away from the areas the earlier versions were changing (old CSS, normaliser, test parts), then merging `main` and running the full sweep after them: no waiting, and the sweep still covered 1.8.0 + 1.9.0.
- A computed-style diff over 72 states (36k elements) proved the 79-line CSS cut changed nothing.

**Didn't work / watch out**
- The full sweep one suite at a time takes ~33 min: give it a 2-hour background limit.
- A taste row pointed at `saved15.mjs`, which never existed: the pattern review must open every check a row names.

## Session 19 · 1.8.0 · 28 Oct 2026 (team, parallel)

**Worked**
- Five version sessions in parallel (1.8.0–1.12.0) with one lead: each session builds on its own branch and writes `studio-notes/pending/<version>.md`; only the lead touches VERSION, `sw.js`, changelog, notes, `run.mjs`, README and merges in version order. A trial merge of the first two branches before either was released caught nothing, which is the point of the scopes.
- A restored queue keeps one-tap Save (`quickReady=true`); without it the first save after a reload quietly became 2 taps. `queue-keep` checks it.

**Didn't work / watch out**
- `simplify.mjs` had been red on `main` since 1.5.0 (it counted the "On your home" heading as a group) and nobody noticed because it only runs for save-engine changes. A suite that is red on main hides new failures: fix it the day it turns red.

## Session 18 · 1.7.0 · 28 Oct 2026 (Mazoon)

**Worked**
- Picking a feature that rides on data the inspector already keeps (`S.layers[id]` + the extra's own fields) made Copy/Paste style ~30 lines with undo for free (history snapshots on render).
- Search previews were a two-line change: the thumbnails already existed for the Templates page (`tplThumb`); a `shape` field + three CSS rules keep posts 4:5 and covers round on one left edge.

**Didn't work / watch out**
- The desktop inspector is long and the page scrolls: a test that taps the preview after tapping a button low in the panel must scroll `#view` back into view first.
- A colour-mix() hover background breaks a simple rgb() contrast parser: move the mouse away before measuring on desktop.
- The More part had no column gap on desktop (rows touched): give every inspector part `insp-col`.

## Session 17 · 1.6.0 · 28 Oct 2026 (team)

**Worked**
- Reusing the engine's own pieces (Quick start's IndexedDB hand-off, `setPhoto`, `resetSaveSheet`, `startHistory`, the ready note) made "a story from each photo" about 30 lines in `tool()`: no offscreen rendering, no new page.
- Testing the whole loop (3 photos → save → Next → save → Next → save) in one suite on phone and desktop, counting team designs in fakecloud, proved each story is a new design and no drafts are left.
- "Before" shots from a `git worktree` of origin/main on :8081 with the same seeded data as the "after" shots.

**Didn't work / watch out**
- The first build left three filled buttons in the Save sheet after saving (Done, Next photo, Save again): the taste rule applies to every state of a sheet, not just its first view. Save again now goes ghost while Next is the main step.
- What's New pictures of a whole Saved page are ~120 KB at quality 72: crop to the part that shows the change.

## Session 16 · 1.5.0 · 26 Oct 2026 (owner-directed Simplify: hub and Saved)

**Worked**
- Before shots first, from a seeded script in the scratchpad; the "before" for What's New came from a `git worktree` of the previous release on port 8081.
- taste.mjs caught three slips the eye missed (a 40px handle, a handle that pushed thumbnails off the shared left edge, a centred link off the menu's icon line). Putting the drag handle at the row's end (like iOS) fixed alignment without special cases.
- A touch drag can be tested with CDP `Input.dispatchTouchEvent` (touchStart, ~10 touchMoves, touchEnd); Playwright's mouse does not fire touch pointers.

**Didn't work / watch out**
- Test-only Arabic names (made up) nearly went into What's New pictures: shots that ship use the plain seed names or approved phrases only.
- A sort sheet that focuses its chosen option on open must not leave a ring on the button after close: style `:focus:not(:focus-visible)` off on every new button.

## Older sessions (1–15)
Folded into the skill (Repo notes, Testing, Engine gotchas) and `taste.md` at the 1.10.0 pattern review. The full text is in `_archive/lessons sessions 1-15 (2026-10-28)/lessons.md`. Still worth a line here:
- Check that a backlog finding still holds before picking it (0.2.0, 1.11.0: #20 had been handled since 1.4.0).
- Board: panel/seg clicks within 250 ms merge into one undo step; wait ≥ 400 ms in tests (0.4.0).
