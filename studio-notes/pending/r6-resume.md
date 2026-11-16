# r6-resume: Continue / resume system

## What's New cards
- **Nothing is lost when you leave a saved design** (fix): edits to an opened saved design or team template are kept on this phone as you work. Open it again (or tap it in Continue editing) and your changes are back, still updating the same design.
- **Unsaved changes are back** (feature): one small bar tells you your edits were restored, with "Saved version" to go back to the saved look. The edits stay in Continue editing until you remove them.
- **Continue editing shows saved designs too** (improve): "Unsaved changes · 5 min ago" under the design's own name; Create stories show the name you gave them.
- **Create keeps the page you were on** (improve): leaving and coming back lands on the same page.

## Files
- `assets/studio.js`: saveDraft/writeDraft/loadDraft (linked drafts), `resumeDesign()`, `#resumeBar`, start flow (`?draft=` of a linked draft opens through the design; offline/deleted design falls back to the draft), leave prompt (new "Leave, keep my changes here"; Discard drops the draft), Continue row (`draftTitle/draftHref/draftSub`), Home search entries.
- `tools/create.js`, `tools/create.html`: same for Create (`touch`, `BD.onSaved`, `resumeDesign`, `#resumeBar`), visibilitychange save, current page re-saved on page change, `CRUI.teamSave` exported for tests.
- `assets/studio.css`: `/* r6-resume */` block at the end.
- No new shell files for sw.js (nothing new under assets/ or tools/). No migration.

## Tests
- New: `tests/r6-resume.mjs` (tool + Create + brand template + team template + discard + render frames). MAP row: `assets/studio.js`, `tools/create.js`, `tools/create.html` -> `r6-resume`.

## Data model
Draft record gets optional `link:{id,name,kind,collections,at}` (design id, name, `updated_at` when opened) and `paths` (cloud photo paths, so a restored photo is not uploaded again). Draft id for a design is always `d-<design id>` (one draft per design). Video drafts already link by `design` (string), left as is. Board (lab) autosaves every board already.

## Decisions
- Edited back to exactly the saved version: the draft is removed (nothing to keep).
- "Saved version" reloads the design with `&saved=1` (skips the restore once); the draft stays until the person removes it or the next edit overwrites it. Opening the design again restores it again.
- If the saved design was updated by someone else since the draft was made, the edits still come back, with "(the saved version was updated since)" in the bar.
- Saving only a picture to the phone keeps the draft (edits are still not in the cloud). Update, Save as a copy/new, Discard and the Continue ✕ drop it.
- Leave prompt for a changed saved design gets a third way out, "Leave, keep my changes here".
- Create also saves on `visibilitychange` (iOS often skips pagehide); tool pages already did.
- Brand templates (`?preset=`, `?tpl=`) and `?team=` already left drafts after the first edit/apply; now locked by the test.

## Left / not done
- Board (lab) and Video not changed (already autosave / linked).
- The 800 ms debounce is still there, covered by pagehide + visibilitychange writes.
