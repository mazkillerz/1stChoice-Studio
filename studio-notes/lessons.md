# Lessons

What worked, what failed, and process tweaks. Newest session first.

## Scoreboard (self-score at the end of every session; see the skill's Reflect step)
| Session | Version | Quality (1–5) | Speed (1–5) | Owner-reported issues after the previous release | Taste checks | Do better next time |
|---|---|---|---|---|---|---|
| 62 | 2.6.0 | 4 (new `lastlayout` 27/0 light + dark; `--changed` before merge; phone shots of the new banner in both themes caught a 108px banner over the design, cut to a 52px pill) | 5 (one feature + its UI in one pass, no subagents needed for a change this size) | 0 known about 2.5.3 | pass | Check how an existing pattern looks on a phone before reusing it (the draft banner already covered the preview top) |
| team notes round | 2.5.0 | 4 (`--changed` before merge; new `resave`; What's New rebuilt with its suite; shots of Home + look in both themes) | 4 (root cause of the duplicates found by reading the kind logic + the live data in minutes; 2 builders in worktrees) | 0 reported about 2.4.2; this round answers 5 team notes | pass | Read the real data first (SQL) before designing a cleanup: only 1–3 suspect rows existed |
| plan round | 2.4.0 | 4 (`--changed` before merge; new `calpick`, `ideas` 70, `kpis` 36; shots of every changed screen in both themes) | 4 (two sonnet builders on new files + lead on hub/calendar/save; everything asked shipped in one session) | 4 (Save preview, tick pill, posts as stories, second filter row) + the preview look rejected | pass | Measure sheets with Phone + Team and on small previews before release: both owner bugs only showed in that state. |
| round 3 | 2.3.0 | 4 (owner asked for light testing, but merging publishes, so `--changed` ran once before the merge: 111 suites, 11 red, then all green; 3 real bugs caught after merging: a history step cancelling a page load, Saved jumping to the top when a pop-up closed, the Team group not refreshing; the other reds were old suites still on the old Save flow or the old Done behaviour) | 3 (5 builders + lead hit the 5-hour limit after ~2.5 h; two builders cut off minutes before done, the lead finished their merges and test updates) | 2 (Back/Done in the editor; saves reaching the team with no choice) | pass (35/35) | Run 3 builders, not 5; after a flow change grep every suite for the old taps before the merge; apply Supabase migrations while the owner is in the chat |
| mega round | 1.54.0, 1.55.0, 2.0.0 | 4 (each release swept in full with `--all`: 1.54 100 suites, 1.55 111, 2.0 see release; every red traced: a hub-offline race, a brand hex in a new css, a test comparing fields the pack move changed; 17 builders, all with their own suite) | 3 (two 5-hour limit stops: 6 builders + tests at once is too many; 3 at a time worked; ~15 merge conflicts, all "both sides appended") | 1 (the "saves another version" report, fixed in 1.54) | pass | Run 3 builders at once from the start; give later builders a note when data moves (packs); one registration list per hook point (design menu, Settings, Home rows) so parallel features don't collide |
| 55–61 | 1.46.0–1.50.0 | 4 (each release `--changed` green or only known load flakes, rerun green alone; 1.50 full sweep 82 of 83 suites green, the one red = `draw-edges` load flake, tapscan clean; two app fixes by the lead: Home font wait, offline team check) | 4 (released seven versions in one lead pass after the limit reset; a Create font fix was tried, measured and reverted) | 0 | pass | Measure a suspected flake fix against the old code under the same load before keeping it (the Create font wait did not change the 1-in-8 rate) |
| 53–54 | 1.44.0 + 1.45.0 | 5 (1.44: `--changed` all green; 1.45 full sweep: 77 suites all green in 18 min, tapscan clean; simplify45 + toolfix43 new) | 4 (lead ran the sweep itself instead of waking the Simplify session, saving usage) | 0 | pass | Combine small finished branches into one release when the numbering forces it; run the sweep from the lead |
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




## 2.6.0 (14 Nov 2026, team session: Same layout as last time)
- Tools already remembered words and look per tool (`KEY`); the real gap for "repeat last" was the layout (layers, extras, photo looks). Read what the engine already stores before designing a "remember" feature.
- Layers get default entries (`{dx:0,dy:0,k:1,color:null,hidden:false}`) as soon as they are drawn, so "has the person moved anything" must ignore default values (`realLayers()`), not count keys.
- Quick start writes a draft at once (`draftId` set), so "fresh story" is `!design && !want && !preset`, not `!draftId`.
- Reusing `.banner` as-is put a 108px box over the top of the design on a phone; one phone shot found it before any test did.

## Round 1.43.0–1.50.0 (5–7 Nov 2026, lead; owner: "Improve studio 10 sessions bug improvements please", then "Continue all sessions")
- Ten version sessions planned as bug-fix rounds per area; eight helper sessions ran, the lead did the rest. Four or five at once used the shared 5-hour limit in ~55 min and three stopped mid-turn; two had pushed finished work, one had pushed nothing. Lesson: two at once, push every fix.
- `main` moved during the wait (another session shipped 1.41.0/1.42.0). The round was renumbered at release: 1.43 save fixes, 1.44 Board + video, 1.45 Simplify + tool pages, 1.46 hub, 1.47 Create, 1.48 queue, 1.49 drawing, 1.50 Simplify.
- Lead review caught two things the sessions' own suites missed: a per-step font cap that allowed 30 s, and Home waiting for brand fonts (found because `home7-saved` / `select-swipe` went red at release). Run the hub suites when module-level `studio.js` changes.
- Open load flakes for the next session (backlog): `create-render` 3880 px (1 in 8), `draw-edges` old-vs-new pixels (about 1 in 4, fonts proven identical), `batch-saved` ZIP once.

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

## Older sessions (1–39)
Sessions 32–39 (1.21.0–1.28.0) and scoreboard rows 31–39 were moved to `_archive/lessons sessions 32-39 (2026-11-05)/lessons.md` at the 1.45.0 pattern review; their durable rules are in the skill.
Sessions 16–31 (1.5.0–1.20.0) and their scoreboard rows were moved to `_archive/lessons sessions 16-31 (2026-11-04)/lessons.md` at the 1.35.0 pattern review; their durable rules are in the skill. Sessions 1–15:
Folded into the skill (Repo notes, Testing, Engine gotchas) and `taste.md` at the 1.10.0 pattern review. The full text is in `_archive/lessons sessions 1-15 (2026-10-28)/lessons.md`. Still worth a line here:
- Check that a backlog finding still holds before picking it (0.2.0, 1.11.0: #20 had been handled since 1.4.0).
- Board: panel/seg clicks within 250 ms merge into one undo step; wait ≥ 400 ms in tests (0.4.0).
