# r6-whatsnew

## What's New cards
- **A calmer What's new page** (improve): The Jump to row is gone. One row of filters (All, New, Improved, Fixed) stays at the top, with quiet counts. Version rows are tidier and Back returns to the page you came from.

## Files
- No new shipped files, so nothing to add to the sw.js shell (changed: whats-new.html, assets/whatsnew.js, assets/whatsnew.css).
- New suite: `tests/r6-whatsnew.mjs`. Add a `tests/run.mjs` MAP row: `whats-new.html`, `assets/whatsnew.*`, `studio-notes/changelog.md` -> `whatsnew`, `r6-whatsnew`.

## Decisions
- Removed the Jump bar and the All versions sheet entirely (jump-only). The older-version rows are the list; `#v-<version>` links still open and scroll to that version.
- Back uses history.back() when the referrer is another Studio page, else the normal link to the hub.
- Added a friendly empty state ("Nothing here yet. Pick All...") for a filter with no result.
- tests/whatsnew.mjs: dropped the jump bar / sheet checks, added a "no Jump to bar" check.
- Counts in chips are plain muted numbers (not pills); chip contrast >= 4.5 in light and dark (taste passes).

## For the lead
- `studio-notes/changelog.md` line 3-14 intro still mentions the **Jump to** bar and **All versions** sheet (line ~14); please reword. Older entry text (e.g. line 175) is history, leave it.
