# Topic: resume — Part 1, Continue / resume system (VERY important)
Tree: `/home/user/studio-resume` (branch `claude/r6-resume`), port **8081**. Read `brief-common.md` in this folder first.

## Owner's words
"If you leave a design by mistake, you can lose your edits. Continue doesn't work on templates at all. Review and rebuild the system: every design (tools, templates, saved designs) autosaves as you edit and can always be resumed exactly where you left off. Nothing is ever lost."

## What exists (verify in code)
- Tool pages (`tool()` in `assets/studio.js`): `saveDraft()` → `writeDraft()` (~line 1620), drafts in localStorage + IndexedDB photos; `draftNow()` on pagehide. BUT line ~1623: `if(design) return;` — **a saved design never gets a draft**, so edits to an opened saved design (or a team template, which opens with `?design=`) are lost when you leave by mistake.
- Create (`tools/create.js`): `DKEY()`, `BD.onSaved` (~line 518) returns when `st.design` — same gap. Check `?tpl=` (brand templates from Templates) and `?team=` too: do they get a draft at all? Check what the Templates page links to (`tplEntries()` in studio.js, `assets/templates.js`).
- Video (`tools/video*.js`) and Board (`lab/`) — check whether they keep work; include them if there is a gap and the fix is small.
- Home's **Continue editing** row (`$('continueList')` ~line 3268 in studio.js, `listDrafts`, `draftTitle`).
- The leave prompts (`needAsk()`, `draftUnsaved`, `draftDropped`, `tool-leave` / `cr-leave` NAV entries) — owner rules in the skill's 2.5.1/2.5.2 notes; keep them working.

## Build
1. **Every editor autosaves locally while you edit**, including an opened saved design and every kind of template (team template, brand template, Create template). A draft for a saved design records the design's id, name and the design's `updated_at` when opened, so it stays linked: resuming it keeps "Update “name”" in the Save sheet (it updates the same design, never makes a copy — see the skill's "Re-save = update" rule).
2. **Resume exactly where you left off**: content, photos, the current page/frame of a paged tool or Create, and anything cheap to keep (selected sheet is not needed).
3. **Opening a saved design or template that has newer unsaved edits on this device** restores those edits automatically and shows one `.slim-bar` offer (existing class, see "Slim offers" note): "Your unsaved changes are back" with a text action to go back to the saved version (that action keeps the draft in Continue editing until the person removes it — nothing is ever lost).
4. **Continue editing on Home** lists these drafts too (title = design name, sub "Unsaved changes · 5 min ago"), and opening one restores it. Removing still needs the person (✕). Look at the whole row for other gaps (thumbnails missing, Create drafts' titles, order newest first).
5. A draft for a design is dropped only when: the person updates the design (team save), saves it as new, or chooses Discard / ✕. Saving only a picture to the phone keeps the draft (edits still not in the cloud) — decide sensibly, note it.
6. Keep `?render=1` frames draft-free (RENDER), keep the draft cap/room messages.
7. Fix any other "work lost" path you find (e.g. tab killed during the 800 ms debounce, `pagehide` on iOS, Start fresh). Note them.

## Tests
`tests/r6-resume.mjs`: (a) tool: open a saved design from fakecloud (see `tests/seed.js`), edit, leave → Continue editing shows it → open it → the edit is there and the Save sheet says Update; (b) reopen the saved design directly → edits restored + slim bar → "saved version" action works; (c) Create: a team template / brand template edit leaves a draft and resumes on the same frame; (d) a team update removes the draft. Then run: `quicksave drafts-queue continue-clear resave saveflow v5 draft-pictures smoke home7-saved` (and any suite that greps for `continueList`). Some suites count drafts: update them only if the new behaviour is intended, and say which.
