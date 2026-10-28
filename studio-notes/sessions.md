# Parallel sessions: 1.8.0 → 1.12.0 (28 Oct 2026)

One **lead** session coordinates five version sessions. Each version session builds on its own branch; only the lead merges to `main` and releases, in version order, so `main` never breaks.

| Version | Type | Branch | Scope (files it may change) | Wave |
|---|---|---|---|---|
| 1.8.0 | Team | `claude/v1.8-queue` | Several shops in a row keeps waiting photos across leaving/reloading (IndexedDB `studio:queue:<brand>:<tool>`, "N photos still waiting" on return), Skip on the ready note. `assets/studio.js` (queue parts of `tool()` + the Home "waiting" row in `home()`), `assets/studio.css` (new rules only, before the fresh-look block), `tests/queue-keep.mjs` | 1 |
| 1.9.0 | Mazoon | `claude/v1.9-batch` | Batch export (#5): **Save all** for paged tools (Carousel, Highlight covers, other `pages` tools): every page at full quality in one share sheet (several files), ZIP / one-by-one download fallback on computers. Save engine + Save sheet in `assets/studio.js`, new `assets/batch.js` if needed, `tests/batch.mjs` | 1 |
| 1.10.0 | Simplify | `claude/v1.10-simplify` | Pattern review + Simplify session per the skill (old CSS leftovers, shared Arabic normaliser for Create + search, split `home7`/`polish71`, tap-count cuts, full sweep). Starts **after 1.8.0 and 1.9.0 are on `main`** | 2 |
| 1.11.0 | Team | `claude/v1.11-posts` | One-tap post presets (#3: Did you know / Your choice / Ice cold as presets on Templates + search, approved words only) and the Create template picker opening straight on a search hit (#20). `brands/1stchoice/brand.js` (presets), `assets/templates.*`, `assets/search.*`, `tools/create*.js`, `tests/postpresets.mjs` | 1 |
| 1.12.0 | Mazoon | `claude/v1.12-stickers` | Stickers pack (#9): brand-neutral shapes (arrows, sparkles, bursts, circles, underline, badge) drawn as vectors, added from the tool page's Add/layers menu, recolourable, saved in the recipe. New `assets/stickers.js`, small hook in `tool()` in `assets/studio.js`, `tests/stickers.mjs` | 1 |

## Rules for every version session
1. Read `CLAUDE.md` and the `studio-improver` skill, then `studio-notes/taste.md`. Their rules apply (save quality, brand-agnostic engine, never delete, weights 400/500/600, RTL, 48px targets, tap budget, ≤2 filled buttons).
2. Work only on your branch and only in your scope. **Do not touch** (the lead owns them): `VERSION` in `studio.js`, `sw.js`, `studio-notes/changelog.md`, `backlog.md`, `lessons.md`, `taste.md`, `tests/run.mjs`, `README.md`. Never merge or push to `main`.
3. Instead write `studio-notes/pending/<version>.md` with: the What's New card(s) in the changelog format (with before/after image paths), new files for the `sw.js` shell, `run.mjs` MAP rows for your suite, README lines, backlog/lessons/taste notes, and any Arabic wording that needs the owner's approval.
4. What's New shots go in `assets/whatsnew/<version>-<name>-before|after.jpg` (take "before" first; 390px at 2×, JPEG ~72, < 80 KB).
5. Tests: your new suite + `node tests/run.mjs --quick` + the suites the skill's test map lists for the areas you touched must be green before your final push.
6. Push your branch, then message the lead session with: branch, last commit, suites run (pass/fail counts), and anything risky for the merge.

## Merge order (lead)
1.8.0 → 1.9.0 → (start 1.10.0 from `main`) → 1.10.0 → 1.11.0 → 1.12.0. Before each merge the lead merges `main` into the branch, bumps `VERSION` + `sw.js`, folds in the pending notes, runs `node tests/run.mjs --changed`, then merges to `main`.

## Session ids
- Lead: `session_01Y65H7Xe9APNhwLbBgQTqBK`
- 1.8.0: `session_01Y65H7YqL8rr1j9hKGFxGpK` · 1.9.0: `session_01Y65H7ZmENLej2cfJpLkB6L` · 1.11.0: `session_01Y65H7aV6HQhsuLCZk8xT2U` · 1.12.0: `session_01Y65H7Wok6NumBM3nmFY5Wu`
- 1.10.0: started by the lead once 1.9.0 is on `main`.
