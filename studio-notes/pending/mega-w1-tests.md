# mega w1-tests (1.3 tests: fast and steady)

## What's New card draft
Skipped: tests only, no visible change.

## sw.js shell
No new shipped files (tests/ is not in the shell).

## run.mjs MAP rows (already in tests/run.mjs, this wave owns it)
- `goldens` runs for: tools/create*, templates/, brands/, tests/goldens/ (alone), and the tool-page part of assets/studio.js (TOOL_SUITES).

## README lines
- `node tests/run.mjs --all` runs every suite (home7/polish71 run as their PART files) and prints the wall time and the 5 slowest suites.
- `node tests/goldens.mjs [ids]` compares every Create template (144 px wide) with tests/goldens/<brand>/<id>.png; `UPDATE=1 node tests/goldens.mjs [ids]` rewrites them on purpose (check `git diff --stat tests/goldens`). Diffs go to $TMPDIR/studio-goldens/<id>.diff.png.
- tests/_quiet.mjs (loaded by run.mjs; NOQUIET=1 turns it off) ends `page.waitForTimeout` early when nothing is scheduled in the page within that time.

## Lessons / bugs
- run.mjs `studioParts` (studio.js changed lines): 'other' already adds BOTH tool and hub suites. Bug fixed: lines between functions (e.g. between tool() and home()) were counted as the previous function; now only lines between a function's start and its closing `}` at column 0 count.
- draw-edges flake cause: a page keeps different glyph edges for good if a font face (Cairo weight/subset) arrives mid-draw; whole tool group failed (same bbox over every case), redraw in place never healed it. Fix in the test: load every declared font face before the first draw, and judge failed cases again on two fresh pages.
- create-render "3880 px" flake: not reproduced after the dump was added (see report); the test now dumps both PNGs + differing box into DUMP_DIR on mismatch.
- video-timeline flake: Start from a reel template tap + `waitClips` 30 s timeout under load; now waits for the control and the ready state, re-taps once after 20 s, 90 s cap.
- shallow clones: run.mjs and photostory-styles/draw-edges print `git fetch --unshallow`.
- Fixed sleeps: 1565 `waitForTimeout` calls (~977 s of sleeping across suites) are shortened by _quiet.mjs instead of edited one by one.

## Also (merge with integration)
- run.mjs rows added for the other builders' suites: fixes54 (lab css), fonts-local (assets/fonts, studio.css, brand kit fonts/brand.js, board.html), who, cloud-api, saved-versions (create.js, tool() of studio.js), tokens (brands, tool() of studio.js), flags and who (hub part of studio.js).
- hub-offline flake: part 7 clicked `[data-dmore]` before the Saved grid repainted; now waits for it.
- welcome keeps real time (run.mjs REAL_TIME): its sleeps wait for timed slide choreography, not timers.
- collage-grids is now run as collage-grids-compat + collage-grids-grids (PART).
- Still over ~120 s alone under load, not split: video-timeline, video, full, backgrounds, video-polish.
