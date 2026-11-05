# Lessons, sessions 32–39 (1.21.0–1.28.0) and scoreboard rows 31–39
Moved out of studio-notes/lessons.md at the 1.45.0 pattern review; durable rules are in the studio-improver skill (Repo notes, Testing tips, checklist).

## Scoreboard (self-score at the end of every session; see the skill's Reflect step)
| Session | Version | Quality (1–5) | Speed (1–5) | Owner-reported issues after the previous release | Taste checks | Do better next time |
|---|---|---|---|---|---|---|
| 39 | 1.28.0 | 4 (new suite emoji-stickers 23/0; stickers 72/0 after updating it for the new tiles; `--changed` 45 suites green except stickers, fixed and rerun with the tool-page suites) | 5 (both items in one pass; suite by a sonnet helper while shots and notes went on) | 0 | 35/35 pass | When a sheet grows, check it on a computer too: the taller sticker card opened below the fold there |
| 38 | 1.27.0 | 4 (new suite saved-find; video-polish/timeline rerun on the new rows; taste) | 5 (both items in one pass; suite by a sonnet helper while notes went on) | 0 | see release | Check a global input rule before styling a new input: `input[type=search]` + the global focus ring gave a double ring at first |
| 37 | 1.26.0 | 4 (video-polish 122/0; reels-hub 71/0; full sweep at release) | 4 (two helpers in parallel; the owner's phone bug could not be reproduced) | 1 (blank preview on the githack preview link) | see release | Test a preview link the way the owner opens it: cross-origin hosting taints canvases; add a ?debug=1 panel from day one |
| 36 | 1.25.0 | 4 (video-timeline 173/0, video-project 48/0) | 5 (engine + UI helpers on a written contract) | – | 35/35 | A new text layer must show fully while editing (its entrance hid it at first) |
| 35 | 1.24.0 | 4 (scene port strict diff 0.06–0.48/255 vs the DOM original; mix correlation 1.00 with the owner's MUSIC/SFX mixes at -14.06/-16.02 LUFS; video 100/100) | 5 (three sonnet helpers in parallel on one written contract, docs/reels.md; no integration rework) | 0 | see release | Write the contract (format + API names) before starting parallel helpers: it made three pieces fit on the first try |
| 34 | 1.23.0 | 4 (new suite draft-pictures 39/0; `--changed` 40 suites green; found and guarded two side effects of a render frame on a draft before any test: rewriting the draft, taking the queue) | 5 (both items in one pass; suite by a sonnet helper while shots and notes went on) | 0 | 35/35 pass | Before reusing a page in a hidden frame for a new input, list what that page writes on load and on leave, and guard it |
| 33 | 1.22.0 | 4 (backgrounds 37/0 with a Carousel part: Plain = no value pixel-identical; waiting-tag 57/0; found and fixed a stale banner on queue continue) | 5 (both items in one pass; dropped Highlight covers after one look at the shot) | 0 | see release | Shoot a tool's real preview before adding a visual option to it: the Highlight shot showed the finish had no room |
| 32 | 1.21.0 | 4 (old designs pixel-identical in restock-styles 56/0 and photostory-styles 16/0 before the commit; new suite backgrounds 31/0) | 5 (feature + audit fix in one pass; suite written by a sonnet helper while shots and notes went on) | 0 | see release | Look at a new finish at phone-preview size, not only zoomed: Glow on white was invisible in the preview at first |
| 31 | 1.20.0 | 4 (full sweep 49/49 green; new suite brandkit; Offer/Restock start lines now chosen by the kit, not by matching 1st Choice text) | 4 (lean: one sweep at the end; two proposals dropped after checking their cost) | 0 | 35/35 pass | Test plumbing with a second brand at every major version, not only when the backlog says so |

## 1.28.0 (session 39, Mazoon: emoji stickers + 3 + 2 rows)
- Reusing the Highlight emoji list as stickers needed only an `emoji:true` flag: drawShape passes no colour (null) for 'Original', so every other sticker path stayed the same.
- A sheet that doubles in height can break desktop checks (`r.bottom<=innerHeight`) and the desktop scroll (`block:'nearest'` left a card taller than the screen below the fold). Desktop now scrolls such a card to its top.
- A helper shot script in `tests/` is picked up as a suite by `run.mjs`: add it to `SKIP`.

## 1.27.0 (session 38, team: Saved search + compact sound rows)
- A search box inside a pill: the global `input[type=search]` (border, padding, pill radius) and `:is(input…):focus-visible` ring both apply; override them on the inner input and put the focus ring on the box (`:focus-within`), or you get two rings.
- Changing a list row to one line: grid on the row with the old children as direct items kept every data attribute, so the handlers and existing tests needed no change.

## 1.24.0 (session 35, Mazoon, owner-directed: Video editor phase 1)
- Asked for the reel files before building (owner's instruction); the zip had pictures/fonts, a second zip had the sound pack with a cue sheet and the mix script: porting the script 1:1 gave a bit-exact match, so ask for the mix script, not just the files.
- A DOM/SVG reel ports to canvas closely when the test compares against the original page with its filters switched off (strict) and on (loose); the wobble can never match feTurbulence exactly, so judge it loosely.
- Linux Chromium has H.264 but no AAC encoder: the sandbox exports Opus-in-MP4; AAC must be checked on a real phone.
- A tool page outside `tool()` must be kept out of Save pictures (render.js) and of the broad `^tools/` suite map in run.mjs.

## 1.23.0 (session 34, team)
- Worked: reusing render.js for drafts was a 3-line change (`?draft=` instead of `?design=`, `ok` true when a draft loaded); the hub only builds the list.
- Watch out: a tool page opened with `?draft=` in a hidden frame would rewrite the draft on pagehide (new `at`, reorders Continue editing) and could take over the photo queue (`here` matches the draft). `RENDER` in `tool()` now makes `saveDraft()` a no-op and skips the queue block.
- Watch out: a 44px `.link` in a `.sec-head` is taller than the h2, so a "same line" check compares centres, not tops.

## 1.22.0 (session 33, Mazoon)
- Worked: `{...Studio.groundField(),global:true}` + `h.ground()` gave Carousel backgrounds in two lines, the same on every slide.
- Worked: shooting the tool before building made the call on Highlight covers easy (the finish only shows in a ring that a 60px cover can't show).
- Watch out: rows in All tools are drawn from the templates (`toolRow`/`libRow`), not through `paintWaitTags()`; anything that depends on `waitN` must be in the template too (`rowHref`).
- Watch out: a phone save of several pages goes to the share sheet; tests set `navigator.canShare=()=>false` to get downloads, and every slide needs its photo (set kinds to Words only).

## 1.21.0 (session 32, team)
- Worked: drawing the finish in story units (shapes in one path, seeded speckles) keeps preview and the 2× save identical with no cache; `h.ground()` makes adding it to a tool a two-line change.
- Worked: running the pixel-compare suites (restock-styles, photostory-styles) BEFORE committing, since they compare against HEAD; a shallow clone breaks photostory-styles (it looks back in history): `git fetch --depth=400 origin main` first.
- Missed at first: alphas tuned on a zoomed crop were too faint at preview size on white. Judge a visual effect in the real phone preview.

