# mega-w1-saved (1.1 Saved designs: covers, updates, versions)

## What's New card draft
- title: Update or Save as new, always clear
- type: fix
- note: Open a saved design and the main button now reads Update "name", with Save as new under it; a team template starts as a new design. Covers wait for photos and fonts, a blank cover is redrawn by itself (or with Redraw cover), and Versions lets you restore an earlier update.

## Reproduction (7 Nov, fakecloud): which flow made a NEW design when an update was expected
1. Root cause of the confusing behaviour (every tool): a design opened from Saved left the team switch OFF (`resetSaveSheet`: `teamOn.checked = member && !design`) and the button said "Save story". Tapping the main Save only saved the PICTURE; the design was not updated at all. Updating needed finding the switch, and after each team save the switch was turned off again. "Save as a new design" hid inside More options. Fixed: the switch is on, the button reads Update "name", Save as new is a visible text button.
2. Two taps during a slow upload (or Save then "Only save to the team" before the first upload ended): `design` was only set after the first save returned, so the second call made a SECOND new design. Fixed: team saves run one at a time (`teamQ`), the second becomes an update. Same in Create.
3. A save tapped while `?design=` was still opening (photos downloading) had `design === null` and made a new design; and if the design never opened (offline, not found) a later save made a copy. Fixed: saves wait for `designOpen`; if it failed they refuse with a clear message (`designLost`).
4. Create: an opened design whose photos were all removed (or "Keep the photos" off) became a new TEMPLATE (`kindOut !== st.design.kind` forced `asNew`); an opened team template saved with photos silently became a new design while the sheet said "Save & update". Fixed: kind stays; the labels follow the real result.
5. Team template opened from Templates (tool): "keep photos" defaulted off, so a template + a new photo + Save made another template without photos. Now the template defaults to a new design with the photos; "Update the template" keeps the old behaviour.
6. Not a bug: two tabs on the same design both update the one design (verified); `?go=1` (Save the picture again) never touches the team design.

## New / changed files
- `tests/saved-versions.mjs` (new). No new shipped files.
- sw.js shell: nothing new. Bump the cache version (assets/studio.js, assets/studio.css and tools/create.js changed).
- run.mjs MAP rows: `[/^tests\/saved-versions\.mjs$/,'saved-versions']` is covered by the changed-tests rule; add `assets/studio.js` tool() changes -> `saved-versions`, `tools/create.js` -> `saved-versions`.

## README lines
- Saved designs: opened from Saved, the Save button says Update "name" (Save as new is under it). A team template starts as a new design (Update the template is the other choice).
- Saved, a design's menu: Redraw cover (redraws it from the design) and Versions (who, when, Restore; an update always keeps the one before).
- A blank cover is redrawn by itself the next time the design is opened.

## Lessons
- `design` (the open saved design) must never be read before the previous team save has finished: serialise saves.
- A cover drawn straight after a photo is set can be black: always `await img.decode()` and the fonts before drawing a thumb.
- Saved's design menu rows are driven by feature detection (`C.setThumb`, `C.versions`), so an old cloud.js never shows a dead row.

## Notes / doubts
- Heal-on-open downloads the stored cover each time a design opens (small JPEG); templates are not healed. Healing and Redraw need `C.setThumb`.
- Redraw cover uses the hidden render frame (`StudioRender.design`), so it is not offered for templates (the renderer refuses them).
- `who.js`'s name (`studio:who`) is used for `author` (merged from claude/w1-schema; `whoName()`); Restore passes `StudioWho.author()`.
- No new Arabic wording.
