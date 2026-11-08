# w2-captions (4.3): captions with the design, behind preview flag `team`

**What's New card draft** — title: Captions with your designs. Note: Write a caption and hashtags in the Save sheet, find them again in Saved, and copy them in one tap. Tap an approved line to add it; unusual wording gets a quiet warning.

**New shipped files for the sw.js shell:** `assets/captions.js`, `assets/captions.css`.

**run.mjs MAP rows:** `captions.mjs` for `assets/captions.js`, `assets/captions.css`, the `/* captions (mega ...) */` blocks in studio.js, `checkText` in rules.js, the captions blocks in calendar.js.

**README lines:** Save sheet (team): a collapsed Caption row (caption, hashtag chips, approved-line chips, Copy); after Save a quiet "Copy caption". Saved > design menu > Caption / Copy caption. Calendar: an item with no caption shows its design's caption; the item sheet offers "Use the design's caption".

**Hooks (all marked `captions (mega)`):** studio.js: the block before `#teamOnly` (Save sheet row + Copy), `capSave` after `C.saveDesign` in teamSave1, `capLoad` in openDesign, `capDoneSync` in `done()` and `teamLine()`, `capRows`/`capSheet` before `versionsSheet` plus one `act==='cap'` line and the rows in `designSheet`. calendar.js: `dCap`, card caption fallback, `#calUseCap`. rules.js: `checkText` + export.

**Behaviour notes**
- A picture-only save keeps the caption on this phone (localStorage `studio:cap:<brand>:<tool>`) until a team save stores it with `C.setCaption`; the draft is cleared then. An update never touches the caption unless it was edited (a save as new copies it).
- Hashtags are stored with a leading `#`. Suggestions are only hashtags the team already used on its designs/calendar items (no approved list exists in the brand kit, none invented).
- Warnings (quiet, never blocking) come from `StudioRules.checkText`: banned words, "25+" with Passion, optional `rules.sale.words` (sale-point types; the kit has no such list yet, so nothing is checked until the owner supplies words), and Arabic lines that are not approved yet.
- Calendar fallback is display only: opening and saving an item never copies the design's caption silently.

**Arabic wording for the owner:** none new. The tests use a made-up line only inside the test database. For the "no sale-point types" rule the owner must list the words (add `rules.sale:{words:[...]}` to brand.js).

**Lessons:** a lazy module that needs the brand's rules should receive `B` from the caller; the Save sheet's teamBox is a good place for an optional row because it is already hidden when the team switch is off.
