# r6-ideas (voice player + Ideas tab restructure)

## What's New cards
- **Voice notes play properly** (fix): the waveform stays on screen while a note plays and fills as it goes, the time runs (0:07 / 0:32), tap or drag the wave to jump, and there are 5 s back/forward buttons. Same player on the idea's own note, replies and the new-idea preview.
- **A calmer Ideas tab** (improve): one row under Calendar / Ideas / Goals: the four stages and a search icon. The type is a small tag on each card, the New button is gone (the + button opens New idea), and search is an icon that opens a clean field; it also finds ideas by type (try "reel").

## Files for the sw.js shell
None new.

## Tests
- New `tests/r6-ideas.mjs` (MAP row: `assets/ideas.js`, `assets/ideas.css` -> add to the "Ideas thread ..." row with `ideas`, `ideas-thread`, `ideas-unread`, `voiceplay`).
- Updated on purpose: `ideas.mjs`, `ideas-thread.mjs` (New now via `#fab`; type filter test became a "reel" search test; empty text "Tap the + button"), `voiceplay.mjs` (48 bars, wave `touch-action: pan-y`, new layout order, wave drawn from audio).
- Run: ideas ideas-thread ideas-unread voiceplay plantabs instantplan search-plan kpis r6-ideas all pass. `calendar` has 1 failure ("desktop: opens as a month grid...") that also fails on clean main, not from this work.

## Decisions
- Player: 48 bars decoded from the audio once per file (AudioContext, cached in memory), pseudo-wave from the path when decoding fails or the audio is silent; time runs on requestAnimationFrame; WebM Infinity duration fixed by seeking to 1e101 once; falls back to decoded duration then `audio_secs`. Idle note shows total, playing shows `cur / total`. Tap/drag/skip on an idle note starts playing there (as before). Arrow keys +-5 s, Home/End.
- Stage tabs hide a zero count (the row fits 390 px with the search icon); at 360 px it scrolls to the open stage.
- While searching, all stages are searched and each card shows its stage name (otherwise matches in other tabs were invisible). Search also matches the type word. Back (Studio.nav key `ideas-search`) and Escape close it.
- Small marked hunk in `studio.js` `openNew()`: on the Ideas tab the + opens New idea directly (`/* r6-ideas */`).
- Wide view: no type row; the search icon sits alone in the one header row above the columns.
- The old `.id-types` CSS and the header New button are removed (not archived: dead code, no files).

## Left / for the lead
- Calendar pane still stacks two rows (Week/Month/Feed + New, then date arrows) and has its own New button; merging them is not a small change in `calendar.js`. Goals has one row (month arrows). Not touched.
- Idea sheet checked: tidy (type pill, stage chips, thread).
- Test runs rewrote tracked screenshots in `studio-notes/pending/shots/`; I reverted them.
