# Lessons

What worked, what failed, and process tweaks. Newest session first.

## Scoreboard (self-score at the end of every session; see the skill's Reflect step)
| Session | Version | Quality (1–5) | Speed (1–5) | Owner-reported issues after the previous release | Taste checks | Do better next time |
|---|---|---|---|---|---|---|
| 52 | 1.43.0 | 4 (font-ready 8/0 incl. a new hanging-fonts check; the pixel flake was an app bug: Save drew before the font stylesheet was in) | 3 (the shared usage limit stopped three sessions mid-round; main moved on meanwhile, so the round was renumbered) | 0 | pass | Run at most two helper sessions at once; one 12 s cap for a whole wait, not one per step |
| 51 | 1.40.0 | 5 (full sweep 80 runs: 79 then 80 green after a test-side video fix; contrast + tapscan clean; simplify40 34/0 new; three cuts) | 4 (the 19-min sweep waited for wave 1) | 0 | pass | Open sheets with a real tap in shot scripts; take "before" shots from the base |
| 50 | 1.39.0 | 5 (select-swipe 38/0; 38 suites green at release) | 5 (first to finish, ~13 min) | 0 | pass | Repaint state, never the list, while a finger is down on it |
| 49 | 1.38.0 | 5 (highlight-product 63/0 with a pixel hash against the old file; 27 suites green) | 4 (one test decision needed the lead) | 0 | pass | A template that needs lazy data loads it in the start sheet's previews: check the lazy-load tests when adding one |
| 48 | 1.37.0 | 4 (create-render 47/0; one code bug and one timing flake fixed before the report; the suite had its own port hard-coded) | 5 | 0 | pass | Default every new suite's BASE to :8080, whatever port you test on |
| 47 | 1.36.0 | 5 (board-stickers 57/0; found and fixed an old Board paste bug) | 4 | 0 | pass | Shoot the first build sooner (the sticker tile blow-up showed only in the shot) |
| 46 | 1.35.0 | 5 (full sweep: 65 suites, contrast clean, tapscan clean; new suite simplify35 23/0; fixed the flaky stickers pixel check, red once on main) | 4 (the 2-at-a-time sweep was too slow and was restarted at 4 at a time on the branch head) | 0 | pass | Start the full sweep with JOBS=4 on the branch head once the cuts are in, not on main first |
| 45 | 1.34.0 | 5 (new suite tplteam 24/0 by a sonnet helper on the first run; `--changed` at release) | 5 (both items in one pass; notes and the pattern review written while the helper tested) | 0 (no owner reports since 1.33.0 known) | pass | Read a truncated line in full before calling it a bug (a `cut -c` made run.mjs look broken) |
| 44 | 1.33.0 | 5 (flip 72/0 incl. old designs pixel-identical; emoji-stickers 32/0 with a held-back file proving Save waits) | 5 (parallel; fit 1.31's loader on the first try after one lead note) | 0 | pass | Name the globals another session reads before changing how a file loads |
| 43 | 1.32.0 | 5 (continue-clear 32/0 new; saved-find 65/0, alltools-cam 89/0) | 5 (first of the round to finish, ~12 min) | 0 | pass | Propose Arabic words in the notes and leave brand.js alone until the owner approves |
| 42 | 1.31.0 | 5 (create-stickers 56/0; found two Create bugs by tapping through for the before shots) | 5 (parallel) | 0 | pass | Check new tap areas in the Add sheet at 360px by eye too |
| 41 | 1.30.0 | 5 (full sweep 65/65 green, 3252 checks; contrast + tapscan clean; simplify30 27/0 and fails 16 on main; two flaky suites fixed) | 5 (cuts shipped while the main baseline ran in the background) | 0 | pass | Grep every place that draws a control when a rule about it lands (hub dialogs missed the quiet Done for 15 versions) |
| 40 | 1.29.0 | 5 (backgrounds 66/0, Plain proven pixel-identical against the base; `--changed` 22 suites green) | 5 (one parallel session, done in ~25 min) | 0 | 35/35 pass | Check that a save flow needs a real photo before writing the save test |
| 39 | 1.28.0 | 4 (new suite emoji-stickers 23/0; stickers 72/0 after updating it for the new tiles; `--changed` 45 suites green except stickers, fixed and rerun with the tool-page suites) | 5 (both items in one pass; suite by a sonnet helper while shots and notes went on) | 0 | 35/35 pass | When a sheet grows, check it on a computer too: the taller sticker card opened below the fold there |
| 38 | 1.27.0 | 4 (new suite saved-find; video-polish/timeline rerun on the new rows; taste) | 5 (both items in one pass; suite by a sonnet helper while notes went on) | 0 | see release | Check a global input rule before styling a new input: `input[type=search]` + the global focus ring gave a double ring at first |
| 37 | 1.26.0 | 4 (video-polish 122/0; reels-hub 71/0; full sweep at release) | 4 (two helpers in parallel; the owner's phone bug could not be reproduced) | 1 (blank preview on the githack preview link) | see release | Test a preview link the way the owner opens it: cross-origin hosting taints canvases; add a ?debug=1 panel from day one |
| 36 | 1.25.0 | 4 (video-timeline 173/0, video-project 48/0) | 5 (engine + UI helpers on a written contract) | – | 35/35 | A new text layer must show fully while editing (its entrance hid it at first) |
| 35 | 1.24.0 | 4 (scene port strict diff 0.06–0.48/255 vs the DOM original; mix correlation 1.00 with the owner's MUSIC/SFX mixes at -14.06/-16.02 LUFS; video 100/100) | 5 (three sonnet helpers in parallel on one written contract, docs/reels.md; no integration rework) | 0 | see release | Write the contract (format + API names) before starting parallel helpers: it made three pieces fit on the first try |
| 34 | 1.23.0 | 4 (new suite draft-pictures 39/0; `--changed` 40 suites green; found and guarded two side effects of a render frame on a draft before any test: rewriting the draft, taking the queue) | 5 (both items in one pass; suite by a sonnet helper while shots and notes went on) | 0 | 35/35 pass | Before reusing a page in a hidden frame for a new input, list what that page writes on load and on leave, and guard it |
| 33 | 1.22.0 | 4 (backgrounds 37/0 with a Carousel part: Plain = no value pixel-identical; waiting-tag 57/0; found and fixed a stale banner on queue continue) | 5 (both items in one pass; dropped Highlight covers after one look at the shot) | 0 | see release | Shoot a tool's real preview before adding a visual option to it: the Highlight shot showed the finish had no room |
| 32 | 1.21.0 | 4 (old designs pixel-identical in restock-styles 56/0 and photostory-styles 16/0 before the commit; new suite backgrounds 31/0) | 5 (feature + audit fix in one pass; suite written by a sonnet helper while shots and notes went on) | 0 | see release | Look at a new finish at phone-preview size, not only zoomed: Glow on white was invisible in the preview at first |
| 31 | 1.20.0 | 4 (full sweep 49/49 green; new suite brandkit; Offer/Restock start lines now chosen by the kit, not by matching 1st Choice text) | 4 (lean: one sweep at the end; two proposals dropped after checking their cost) | 0 | 35/35 pass | Test plumbing with a second brand at every major version, not only when the backlog says so |




## 1.36.0–1.39.0 (sessions 47–50, parallel round of five with a lead)
- Worked: four sessions at once plus the Simplify one started when the first finished; all four reported within ~25 min, releases one after another in order with one `--changed` each (9, 42, 27, 38 suites).
- Worked: scopes by file kept merges conflict-free (only `home()` was shared, by two distant blocks).
- Failed: a suite written on a helper port (`create-render`, :8082) failed in the lead's run on :8080. Rule: every suite defaults to :8080 and reads `BASE`.
- Failed: `contrast.mjs` read its URL only from argv, so inside `run.mjs` on another port it reported 0/0 (fixed in 1.40.0).
- Lesson: a hidden render frame of an autosaving editor must drop its draft id after opening, not only skip its own save (1.37.0).
- Lesson: a name clash inside one IIFE breaks the whole Board script; `node --check lab/<file>.js` catches it in a second (1.36.0).
- 1.40.0: measure each sheet's scroll height at 390 first (one number per sheet): it pointed straight at the longest (Collage 1522, Highlight 1363, Carousel 1292).
- 1.40.0: shot scripts open sheets with `pg.tap`, not `el.click()` from `evaluate` (a programmatic click leaves keyboard-style focus, and the focus ring looks like a bug).
- 1.40.0 sweep: `video` arrow-key check failed alone too; the touch drag before it left the timeline coasting (test-side, fixed by waiting for time to settle).
- Lesson: in Board, Escape after a colour pop has closed clears the selection; tests must not press Escape "to be safe" (1.36.0).

## 1.35.0 (session 46, Simplify + pattern review)
- Worked: shooting the tool and hub screens at 390 and 360 first; the cuts came from the shots (More tab one row shorter, the list/grid switch with one tool), not from the backlog.
- Worked: "before" shots straight from the sweep's worktree of `main` on :8081 while it ran.
- Didn't work: the sweep at JOBS=2 did 9 suites in 20 min (would pass the 2-hour limit); at JOBS=4 the other 58 took 17 min. Only `share` failed under load, as before.
- Watch out: hiding a block's only content (Text styles with nothing saved) leaves an empty flex item with a gap: hide the block itself.
- Pattern review: lessons for sessions 16–31 and scoreboard rows 11–30 moved to `_archive/lessons sessions 16-31 (2026-11-04)/`; five durable rules went into the skill's test tips; the test-map gap line found `continue-clear` and `create-stickers` missing from the skill table (added).

## 1.34.0 (session 45, team: team template stars, search → Recently used, Skip wording)
- Worked: a search entry can carry its own `opened()` hook (search.js calls it before navigating, also for a new-tab open), so the hub marks Recently used without search.js knowing about templates.
- Worked: keeping `data-star` for brand templates and adding `data-tstar` for team ones left tplfav untouched.
- Watch out: Create's template search walks every `.cr-tw`; a wrapper without `[data-tpl]` (team cards) must be skipped, or a search hides it.

## Round 1.29.0–1.33.0 (30 Oct 2026, lead)
- Four sessions at once + the Simplify one started after 1.29.0 shipped: no usage pause (the 5-hour limit showed a warning near the end). Wave 1 finished in 12–32 min; 1.30.0's full sweep took ~80 min and set the pace.
- Test-merging the finished branches on top of `main` while 1.30.0 ran meant the final release was mechanical: one predicted one-line conflict (TOOLS rows: 1.30 blurbs + 1.32 `quick`), resolved by a script prepared in advance.
- Passing one session's contract to another (1.31's `CR.stickersReady()` globals → 1.33's lazy loader) before either finished avoided the only real cross-session risk.
- Never `pkill -f http-server` from a shell whose command line contains the same words: it killed the release shell once (skill tip, still easy to forget).
- The combined run caught the one thing no single branch could: 1.32's camera button on New place / Cinematic rows cut 1.30's new one-line descriptions at 360px (simplify30). Fixed by shortening the two lines. Always run the combined `--changed` after the last merge, not only per branch.
- A session that sends "done" before reading the lead's answer to its own question: fold the answer in at merge, don't wait.

## 1.28.0 (session 39, Mazoon: emoji stickers + 3 + 2 rows)
- Reusing the Highlight emoji list as stickers needed only an `emoji:true` flag: drawShape passes no colour (null) for 'Original', so every other sticker path stayed the same.
- A sheet that doubles in height can break desktop checks (`r.bottom<=innerHeight`) and the desktop scroll (`block:'nearest'` left a card taller than the screen below the fold). Desktop now scrolls such a card to its top.
- A helper shot script in `tests/` is picked up as a suite by `run.mjs`: add it to `SKIP`.

## 1.27.0 (session 38, team: Saved search + compact sound rows)
- A search box inside a pill: the global `input[type=search]` (border, padding, pill radius) and `:is(input…):focus-visible` ring both apply; override them on the inner input and put the focus ring on the box (`:focus-within`), or you get two rings.
- Changing a list row to one line: grid on the row with the old children as direct items kept every data attribute, so the handlers and existing tests needed no change.

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

## Older sessions (1–31)
Sessions 16–31 (1.5.0–1.20.0) and their scoreboard rows were moved to `_archive/lessons sessions 16-31 (2026-11-04)/lessons.md` at the 1.35.0 pattern review; their durable rules are in the skill. Sessions 1–15:
Folded into the skill (Repo notes, Testing, Engine gotchas) and `taste.md` at the 1.10.0 pattern review. The full text is in `_archive/lessons sessions 1-15 (2026-10-28)/lessons.md`. Still worth a line here:
- Check that a backlog finding still holds before picking it (0.2.0, 1.11.0: #20 had been handled since 1.4.0).
- Board: panel/seg clicks within 250 ms merge into one undo step; wait ≥ 400 ms in tests (0.4.0).
