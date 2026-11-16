# Topic: whatsnew — Part 7, What's New page
Tree: `/home/user/studio-whatsnew` (branch `claude/r6-whatsnew`), port **8083**. Read `brief-common.md` in this folder first.
You own `whats-new.html`, `assets/whatsnew.js`, `assets/whatsnew.css`, `tests/whatsnew.mjs` and your new suite. Do NOT edit `studio-notes/changelog.md` content (read-only for you; you may only fix its intro text describing the page if it mentions Jump to — tell the lead instead, the lead owns that file).

## Owner's words
"Remove the 'Jump to' versions row. Keep only one filter row: All / New / Improved / Fixed. Improve the page's UI/UX overall. Keep all existing entries and version history."

## Build
- Remove the Jump to bar (and the "All versions" sheet if it only exists for jumping — if it's useful keep a quiet way to reach any version, e.g. the list of version rows itself is enough; `#v-<version>` deep links must keep working: open and scroll to that version).
- Exactly one filter row: All / New / Improved / Fixed (chips, one selected; counts optional and quiet). Filtering applies to every version (latest hero + older rows): versions with no matching change are hidden or collapse; the empty result says so kindly.
- Improve UI/UX overall, in the current design language (tokens from `assets/studio.css`; calm, clean, native-app feel; light + dark; 390 phone first, nice on 1280 too). Ideas: a clear page header with Back (top-left back must go back to where the person came from — use `history.back()` when the referrer is a Studio page, else the hub), the newest version as a calm hero, older versions as tidy one-line rows with date + chips, smooth expand, screenshots that open large on tap, good spacing rhythm, sticky filter row that doesn't take much room, nothing cut off at 360 px, readable contrast, `prefers-reduced-motion` respected. Fast: render lazily (230+ versions).
- Keep every entry and all history (it all comes from `studio-notes/changelog.md`). Keep `[flag:<id>]` switches, milestone banners, before/after shots, `type:` grouping.
- The hub badge / "seen" logic for the What's New dot must keep working (grep `whatsnew` / `seenVersion` in `assets/studio.js`; don't change it unless broken).

## Tests
Update `tests/whatsnew.mjs` for the removed Jump to (derive expectations from the data, never from a fixed version). Add `tests/r6-whatsnew.mjs`: no Jump to bar; exactly one chip row with All/New/Improved/Fixed; Fixed shows only fix changes; deep link `#v-2.30.0` opens that version; no horizontal scroll at 360; light + dark contrast of chips (selected and not). Run `whatsnew r6-whatsnew taste` (taste with BASE).
