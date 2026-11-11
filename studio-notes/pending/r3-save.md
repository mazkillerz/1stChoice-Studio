# r3-save: choose where it goes before saving (2.3.0)

## What's New card (draft)
- Title: Choose where Save goes
- Type: change
- Text: Save now asks where your story goes first: My phone, or Phone + Team. My phone is always the default, so nothing reaches the team by accident. For the team you pick a collection, and the big button tells you exactly where it will go, like Save to “Restocks”. Create and Video work the same way.

## What changed
- Tool pages (`assets/studio.js`, `/* r3-save */` blocks): `#saveWhere` radiogroup (`data-where="me|team"`, `#teamOn` is now the hidden state), a team panel with Name + Collection (required), main button `Save to my phone` / `Pick a collection` (aria-disabled + quiet, a tap pulses the chips, hint "Pick a collection first, then save.") / `Save to “X”` / `Save to N collections` / `Update “name”` / `Add to “X”`.
- Removed every auto-on path (teamMember in resetSaveSheet, the 1200 ms timer, `asked`). Quick start's one tap saves the picture only.
- After a picture-only save: `Also save to the team…` (`#alsoTeam`); after a team save: `See it in Saved` (`#seeSaved`).
- Engine guard: `teamSave1` (studio.js, create.js, video.js) refuses a team save with no collection ("Pick a collection first."). The leave-page "Update" passes `keepCols:true` so a legacy design with no collection can still be kept (note for the lead: this is the one exception to "also required").
- Opened saved design starts on Phone + Team with its own collections. An opened template starts on My phone; "Update the template" brings in the template's own collections.
- Create (`tools/create.js`): `#crWhere`, `#crCols` chips + `#crCol` typed name, `#crGo` names the destination. Video (`tools/video.js`): `#vsWhere`, `#vsCols`, `#vsCol`; Phone + Team saves the edits first, then makes the video; "Only save the edits to the team (no video)" is `#vsTeam`; a design opened in Video now carries its collections.
- New `.sw-seg` / `.save-where` / `.lbl-req` / `.is-need` / `.tb-hint.need` CSS in the `r3-save` block at the end of `studio.css` (plus a short block in `tools/video.css`). New icons `device`, `users`.
- `Studio.debug.teamSave` exposed for the engine-guard test.

## sw.js shell
No new shipped files. (tests/_saveflow-helpers.mjs is test-only.) Bump the cache version as usual.

## tests/run.mjs MAP rows
- `assets/studio.js`, `assets/studio.css`, `tools/create.js`, `tools/video.js`, `tools/video.css` -> `saveflow`, `home7-save`, `simplify`, `team-retry`, `collections-save`, `saved-versions`, `quicksave`, `smoke`
- new suite: `tests/saveflow.mjs` (tool pages, Create, Video)
- helper (not a suite): `tests/_saveflow-helpers.mjs` (`chooseTeam`, `chooseMe`)

## Tests updated to the new flow
smoke, quicksave, home7 (save part), simplify, team-retry, batch-saved, saved-versions, collections-save, create, campaigns, video-polish, video-timeline, full, highlight, batch, captions, extra, queue, highlight-emoji. `taste` unchanged (picture <= 2 taps still holds; Phone + Team = Save, Phone + Team, a collection, Save = 4, on purpose).

## Lessons
- Playwright treats `aria-disabled="true"` as not enabled: use `tap(sel,{force:true})` to test a tap on the quiet button.
- The fresh-look `.btn` rule outranks a plain `.btn.is-need`; the quiet look needs `:root .btn.is-need`.
- `.chips` has its own pill background; the collection rows need `.chips.tb-cols{background:none}` outside the Save sheet.
- A saved design now refreshes the collection list (`teamCols=null`) so a collection made by the save shows as a chip next time.

## Not done / for the lead
- Other writers of NEW team designs without the Save sheet were not changed: campaigns "Save all", review "Send for review" (needs an existing saved design), templates (`Studio` team templates from Templates open as a template and use the sheet), Saved's Duplicate (copies the source's collections, left alone on purpose). Only campaigns "Save all" is worth a look: it writes new designs with no collection picker.
- Board (`lab/`) has its own save and was not touched.
