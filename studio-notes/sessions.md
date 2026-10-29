# Parallel sessions: 1.13.0 → 1.20.0 (29 Oct 2026)

One **lead** session coordinates eight version sessions. Each version session builds on its own branch; only the lead merges to `main` and releases, in version order, so `main` never breaks. The previous round (1.8.0 → 1.12.0) is in `_archive/sessions 1.8-1.12 (29 Oct 2026)/`.

| Version | Type | Branch | Work | Scope (files it may change) | Wave |
|---|---|---|---|---|---|
| 1.13.0 | Team | `claude/v1.13-queue` | Fix the open `queue.mjs` leftover-draft race (backlog audit, top item: read the check's printed output first); a small "N waiting" tag on Restock / Photo story rows in Your tools and All tools (1.8.0 idea); the low-memory fallback says "device" not "phone" on a computer (1.9.0 finding). | queue parts of `tool()` + the save engine's fallback message in `assets/studio.js`, the tool rows in `home()`, `assets/studio.css` (new rules only, before the fresh-look block), `tests/queue*.mjs`, new `tests/waiting-tag.mjs` | 1 |
| 1.14.0 | Mazoon | `claude/v1.14-flip` | Flip (mirror) in the Move tab for stickers, shapes, photos and cans (#25), saved in the recipe; Highlight covers: emoji covers (#10, brand-neutral emoji, no words). | the Move tab / layer drawing in `tool()` in `assets/studio.js`, `tools/highlight.js`, `tests/flip.mjs`, `tests/highlight*.mjs` | 1 |
| 1.15.0 | Simplify | `claude/v1.15-simplify` | Simplify session per the skill: walk the common jobs (phone + computer), cut taps, shorten sheets/labels, tidy leftovers, fix open audit findings that are outside other sessions' scopes. Phase 1 now (away from queue, Move tab, highlight, templates, lab, Saved select, copy style); **phase 2 (merge `main`, full sweep) only after the lead says 1.13.0 and 1.14.0 are on `main`.** Pattern-review proposals go in the pending file (the lead owns the notes). | anything not in another row's scope; coordinate through the lead | 1 + 2 |
| 1.16.0 | Team | `claude/v1.16-favourites` | Template favourites (star) and Recently used on Templates and in Create's template picker (#6 + 1.0.0 idea); fix the "New" badge sitting on the headline in post previews (1.11.0 finding); a brand-kit `sub` for Create templates in `tplEntries()` (1.11.0 idea). | `assets/templates.*`, `tplEntries()` in `home()`, `tools/create*.js` picker, `brands/1stchoice/brand.js` (subs only, approved words), new `tests/tplfav.mjs` | 1 |
| 1.17.0 | Mazoon | `claude/v1.17-flex` | Board: Penpot-style flex layout (#15): a frame or group stacks its items in a row/column with gap and padding and grows with text. **Behind a toggle, off by default** (big change). | `lab/` only, new `tests/board-flex.mjs` | 1 |
| 1.18.0 | Team | `claude/v1.18-batchsaved` | Batch export from Saved select mode (#5 second half): Save the pictures of several saved designs in one go (full 2160×3840 quality each, one share sheet / ZIP on a computer, progress + Cancel). | Saved select bar in `home()`, `assets/batch.js`, an offscreen render path (new file preferred), new `tests/batch-saved.mjs` | 1 |
| 1.19.0 | Mazoon | `claude/v1.19-textstyles` | Text styles (#8): a short named list of saved text styles in the inspector's More tab (kept per device, brand-neutral), and Paste style on every text layer at once (#22). | copy/paste style + inspector More tab in `tool()` in `assets/studio.js`, `tests/copystyle.mjs`, new `tests/textstyles.mjs` | 1 |
| 1.20.0 | Simplify | `claude/v1.20-simplify` | Simplify + pattern review over the whole round: walk every common job again after 1.13–1.19, tidy what they added, second brand-kit plumbing check (#11: a dummy brand under `tests/fixtures/` proves no 1st Choice names/colours leak from `assets/` or `tools/`), full sweep (level 3). **Read-only audit until the lead says 1.13.0–1.19.0 are on `main`; then branch from `main`.** | anything, after the go | 2 |

## Rules for every version session
1. Read `CLAUDE.md` and the `studio-improver` skill, then `studio-notes/taste.md`. Their rules apply (save quality, brand-agnostic engine, never delete, weights 400/500/600, RTL, 48px targets, tap budget, ≤2 filled buttons, approved Arabic only).
2. Work only on your branch and only in your scope. **Do not touch** (the lead owns them): `VERSION` in `studio.js`, `sw.js`, `studio-notes/changelog.md`, `backlog.md`, `lessons.md`, `taste.md`, `sessions.md`, `tests/run.mjs`, `README.md`. Never merge or push to `main`.
3. Instead write `studio-notes/pending/<version>.md` with: the What's New card(s) in the changelog format (with before/after image paths), new files for the `sw.js` shell, `run.mjs` MAP rows for your suite, README lines, backlog/lessons/taste notes, a scoreboard row, and any Arabic wording that needs the owner's approval.
4. What's New shots go in `assets/whatsnew/<version>-<name>-before|after.jpg` (take "before" first; 390px at 2×, JPEG ~72, < 80 KB).
5. Tests: your new suite + `node tests/run.mjs --quick` + the suites the skill's test map lists for the areas you touched must be green before your final push. A suite red on `main` too: say so in your report (the lead fixes it).
6. Push your branch, then message the lead session (`send_message`) with: branch, last commit, suites run (pass/fail counts), and anything risky for the merge. If you need to change a file outside your scope, message the lead first.

## Merge order (lead)
1.13.0 → 1.14.0 → 1.15.0 → 1.16.0 → 1.17.0 → 1.18.0 → 1.19.0 → 1.20.0. A version that finishes early waits for the ones before it. Before each merge the lead merges `main` into the branch, bumps `VERSION` + `sw.js`, folds in the pending notes, runs `node tests/run.mjs --changed`, then merges to `main`.

## Overlaps to watch
- `tool()` in `studio.js`: 1.13.0 (queue), 1.14.0 (Move tab), 1.19.0 (More tab / copy style) touch different parts; the lead merges them in order and re-runs `full`, `v5`, `polish`.
- `home()`: 1.13.0 (tool rows), 1.16.0 (`tplEntries`), 1.18.0 (Saved select bar).
- `studio.css`: everyone adds new rules only, before the fresh-look block; conflicts there are "keep both".

## Session ids
- Lead: `session_01Y65H7Wuh2MRbSPB87xQhDz`
- 1.13.0: `session_01Y65H7YirTuwUdsknVbPpiw` · 1.14.0: `session_01Y65H7aJ2XiFQnKcaS1Nv8Q` · 1.15.0: `session_01Y65H7Y3YamwVUuAfYhtBmx` · 1.16.0: `session_01Y65H7Z1Rs4mq7DVFdXM2gt`
- 1.17.0: `session_01Y65H7ZXbKivBgV4PeZk2Ap` · 1.18.0: `session_01Y65H7XE6Jk4StQgFKHxr4g` · 1.19.0: `session_01Y65H7XBdERgM26pQvEu9Wu` · 1.20.0: `session_01Y65H7aFromajhvCh8BmNkb` (read-only until the lead's "go")
