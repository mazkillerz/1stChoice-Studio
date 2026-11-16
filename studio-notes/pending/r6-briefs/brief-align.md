# Topic: align — Part 9, Alignment and consistency pass (whole app, phones first)
Tree: `/home/user/studio-align` (branch `claude/r6-align`), port **8087**. Read `brief-common.md` in this folder first.

## Owner's words
"A full pass on every screen: perfect alignment, consistent spacing, sizes, corner radius, fonts and icon sizes. Everything lined up and polished on phones." Keep the current design language; small careful fixes, no redesigns.

## Scope now (other builders own these files right now — do NOT edit them): `tools/create.*` and the tool-page editor sheets (`.sheet`, inspector, layer bar in `tool()`), and the hub's history/back code. Everything else is yours: Home, Saved (header, chips, sort, cards), Templates page (`assets/templates.*`), Plan page (Calendar `assets/calendar.*`, Ideas `assets/ideas.*`, Goals `assets/kpis.*`, Feed), Settings sheet, + menu, search overlay (`assets/search.*`), design menu sheet, dialogs, What's New (`assets/whatsnew.*`), Brand kit page (`assets/brandkit.*`), Team assets, welcome tour, toasts/banners.

## How
1. Measure, don't eyeball: write a scratch script that, at 390×844 touch (and 360×780), light + dark, opens each screen/state above and dumps for visible elements: left edges of headings vs content (same gutter), gaps between sections, button/chip heights, border-radius values, font-size/weight, icon (svg) sizes per group. List outliers (values off the system: spacing 4-8-12-16-24-32, radii from the `--r-*` tokens, weights 400/500/600, one icon size per context, 44px+ targets). Also run `node tests/taste.mjs`, `node tests/contrast.mjs` and `node tests/tapscan.mjs` (BASE set) and fix what they report on your screens.
2. Fix outliers with tokens (no new one-off values), in the files that own each screen; shared fixes go in `assets/studio.css` inside `/* r6-align */ … /* /r6-align */` at the very end.
3. Known items from the lead's look: Saved's header stacks the "Recent" sort alone on its own row under Search/Select (wasted row: fold the sort into the header or the chip row so the page has one row less); the Home "Ideas"/"Goals" tiles; What's New filter chips at 360 px; check the Plan page header rows (stage tabs + search icon; Calendar seg + arrows) align with the tab bar edges.
4. Take before/after screenshots of the 4–6 screens you changed most (390, light; jpg q72 into `assets/whatsnew/r6-align-<name>-before|after.jpg`, ≤ 80 KB each) — take the before shots FIRST.
5. Pending file: list every fix (screen → what) so the lead can write one What's New card.

## Tests
`tests/r6-align.mjs`: lock the measurable rules you fixed (e.g. Saved header one row; headings share the gutter on each hub page; icon sizes equal within groups; no radius/spacing outliers on the screens you fixed). Then run: `taste contrast-free? (skip contrast.mjs in run.mjs if not mapped) simplify45 simplify215 home7-hub home7-saved polish71-saved polish71-bar templates calendar ideas kpis whatsnew search welcome`.
