# r3-next: "New Studio look" preview (flag `next`, off by default)

## What's New card draft
**Title:** Try the New Studio look. **Type:** preview (Settings, Previews).
A bottom bar with five places: Home, Saved, a + in the middle, Plan and Templates. Saved is now a big page: search is always there, your collections sit on a shelf, designs are bigger with their full names, and the page appears at once. Home opens on "Jump back in" (your unfinished stories and newest designs), then Create, then Today.

## Why familiar things moved
- Saved is the second tab (the most used place after Home, easiest thumb reach); the floating + now sits in the bar so it no longer covers the last card.
- Plan (the calendar) gets its own tab; it used to be a row on Home. Home keeps a "Today" card.
- Home: Continue editing and Saved designs rows are merged into "Jump back in" ("Save pictures" and "See all" are in its header). The big headline shrank to a greeting. Your tools row is now "Create" (always the big-tile grid; the list/grid switch is hidden under the preview).
- Saved: the sort button is icon-only; the design menu shows Open / Save picture / Duplicate / Collection as big buttons.

## Files
New shipped files for the `sw.js` shell: `assets/next.js` (lazy, only with the flag on), `assets/next.css` (already in main's shell). Hooks in `assets/studio.js` are marked `r3-next`; `index.html` has a tiny head script (no flash) and the css link.

## tests/run.mjs MAP rows
`assets/next.js`, `assets/next.css` -> `next.mjs`; `assets/studio.js` hooks -> `next.mjs` (flag off suites: smoke, home7-hub, home7-saved, select, hub-offline).

## Tested
next.mjs 51/51; flag off: smoke 19/19, home7-hub 93, home7-saved 54, select 55, hub-offline, nav 75 all pass; Home/Saved/Templates flag-off screenshots are pixel-identical before and after.

## Lessons
- `let` state used by an early callback (paintCont) must be declared at the top of home().
- Draft entries need `json` to count as drafts when seeding tests.

## Not done / notes
- Kept list is per brand in localStorage (`studio:next:saved:<brand>`), cleared on sign-out; picture links reused only while fresh (40 min).
- Plan view keeps its own "New" button; Saved cards use one fixed 9:16 backing so posts show with soft bars (no cropping).
- Desktop: the bar is a floating pill at the bottom centre (no top nav).
- Screenshots: scratchpad/next/ (p2-*, p3-*, p4-*, p5-*, desk-*).
