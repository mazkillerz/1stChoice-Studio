# r6-align: alignment and consistency pass

## What's New card (type: improve)
**Title:** Everything lines up
**Note:** One row less on Saved (Sort joins the collection chips), Templates and Saved share the same back arrow, Ideas and Goals on Home match the Calendar row, and corners, icon sizes and edges follow one system on every page.
Screenshots (390, light): `assets/whatsnew/r6-align-{saved,templates,home,plan,goals,whatsnew}-{before,after}.jpg` (whatsnew is 360 wide).

## Every fix (screen: what)
- Saved: the Sort button no longer sits alone on its own row. It is a 48px icon button at the end of the chip row (label "Sort: Recent" kept as aria-label; the word shows again when there are no collections). One row less; first chip and first card share the 16px gutter.
- Templates: the back button is the same bare 22px arrow as Saved/Plan (no boxed circle); the arrow starts at the 16px gutter like the title, chips and cards.
- Home: Ideas/Goals tiles use the Calendar row's corner (26), inset (18), icon size (20) and title size (15); Calendar row icon 22 to 20 to match the other Home rows; section headings (Your tools, Saved designs) 18 to 17 on phones.
- Plan: Feed keeps the same 44px title row under the Week/Month/Feed switch as Month (heading no longer touches the switch); month arrows put their icons at the page gutters; Goals "Add numbers" ends where the cards end.
- What's New: "Earlier versions" heading starts at the card edge (was 4px right); filter chips use the 13px step (were 14px at 390).
- Corners from the tokens (--r-s 10, --r-m 14, --r-l 20, --r-xl 26, pill): Saved/Templates cards 16 to 14; thumbnails 8/11/12 to 10 (Saved, search, welcome, calendar, ideas, install icon); tab bar 24 to 26 with 18 to 20 inside; selection bar, + menu 28 to 26; pop menus 18 to 20, items 12 to 14; switches and count badges are pills.
- Font steps: count chips 11.5 to 12, Feed badge 11 to 12, Goals big numbers 34 to 30.

## Files
- `assets/studio.css` (`/* r6-align */` block at the end), `assets/whatsnew.css` (small `r6-align` block at the end). No new files for the sw.js shell.
- Tests: new `tests/r6-align.mjs` (needs a MAP row, e.g. areas `studio.css|whatsnew.css|templates|calendar|saved` -> `r6-align`; add it to `--quick` only if cheap, it takes about 40 s).
- Changed old tests (intentional): `tests/templates.mjs` measures the back arrow's edge (`.tp-back svg`) instead of the button box, in the LTR and RTL edge checks.

## Results
taste 35/0, contrast no findings, tapscan clean, r6-align all pass (light + dark), polish71-saved 189/0, home7-saved 54/0, templates 80/0, calendar 111/0, simplify45, simplify215, home7-hub 93/0, polish71-bar, ideas, kpis, whatsnew 171/0, search, welcome all green.

## Decisions / left
- Saved title stays 20px (the header has Back + Search + Select; 24px would squeeze at 360); sheet padding 20 inside sheets/dialogs left alone (not in the 4-8-12-16-24-32 scale but used everywhere in dialogs; a global change is risky).
- Not touched (other builders' files): tool-page editor sheets (`.sheet`, 28px top corners), `.view/.drop` 22px previews, Create.
- Settings group headings sit 3px left of the row icons (taste check passes at +-3 tolerance of the rules it has); worth a look in a later pass.
- Team assets empty state shows two "Add" buttons (header and centre); left as is.
