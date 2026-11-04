# Parallel sessions: 1.36.0 → 1.40.0 (4 Nov 2026)

One **lead** session coordinates five version sessions (owner: "Improve studio 5 sessions together working"). Each version session builds on its own branch; only the lead merges to `main` and releases, in version order, so `main` never breaks. The previous round (1.29.0 → 1.33.0) is in `_archive/sessions 1.29-1.33 (30 Oct 2026)/`.

**At most 4 at once** (lessons 1.13.0: eight at once used the shared usage limit up in ~30 min). Wave 1 = 1.36, 1.37, 1.38, 1.39. Wave 2 = 1.40 (Simplify), started by the lead as soon as the first wave-1 session reports done; it runs its cleanup at once and its full sweep only after 1.36–1.39 are on `main`.

| Version | Type | Branch | Work | Scope (files it may change) | Port |
|---|---|---|---|---|---|
| 1.36.0 | Mazoon | `claude/v1.36-board-stickers` | Board gets the stickers + emoji (#26) and text styles (#35) the tool pages and Create already have: reuse `STUDIO_STICKERS` (`assets/stickers.js`), `HL_EMOJI` / the lazy loader (`tools/highlight-emoji.js`), and the same `studio:textstyles` store (`[{id,name,st,at}]`, up to 8, same `styleOf()` shape where it maps). Board's own panels; old boards open unchanged. | `lab/board*.js`, `lab/board.css`, `lab/board.html`, new `tests/board-stickers.mjs`, `tests/lab*.mjs`, `tests/board-*.mjs` | 8081 |
| 1.37.0 | Team | `claude/v1.37-create-drafts` | Save pictures covers Create drafts too (#42): give Create a `render=1` renderer (no draft writes, exposes the same `Studio.renderer`-style hook `assets/render.js` uses, PNG at the same 2× quality as Create's own save), so Continue editing's Save pictures no longer lists them as skipped. Create's Recently used row shows team templates too (#46; fills in after `paintTeam`). | `tools/create*.js`, `tools/create.html`, `assets/render.js`, the Continue editing / Save pictures part of `home()` only, `tests/draft-pictures.mjs`, `tests/continue-clear.mjs`, `tests/tplteam.mjs`, `tests/create*.mjs` (not `create-stickers`' sticker code), new `tests/create-render.mjs` | 8082 |
| 1.38.0 | Mazoon | `claude/v1.38-highlight-product` | Highlight covers, Product type (#10): a Size and a Position control for the can in the circle (fields in `tools/highlight.js`; defaults = today's look, so old covers stay pixel-identical). Brand template entries for emoji highlight covers (#44): if Create's highlight layout can take an emoji, add one or two `create.templates` entries in `brands/1stchoice/brand.js` (approved words only; no new Arabic). | `tools/highlight.js`, `tools/highlight.html`, `create.templates` + highlight `presets` in `brands/1stchoice/brand.js`, `tools/create-templates.js` only for the emoji highlight layout (tell the lead first: 1.37 owns the rest of Create), `tests/highlight*.mjs`, `tests/templates.mjs`, `tests/postpresets.mjs` | 8083 |
| 1.39.0 | Team | `claude/v1.39-saved-select` | Saved select mode: swipe across cards to tick several (like Photos; touch drag after press and hold or in Select mode; mouse drag on a computer), never scrolls away by accident. On a computer, the Studio search placeholder shows the `/` key once (#45; quiet, like a key hint, hidden on touch). | the Saved select-mode part of `home()` in `assets/studio.js`, `assets/search.js` / `assets/search.css` (placeholder only), new rules in `studio.css` before the fresh-look block, `tests/select.mjs`, new `tests/select-swipe.mjs`, `tests/search.mjs` | 8084 |
| 1.40.0 | Simplify | `claude/v1.40-simplify` | Simplify session + pattern review per the skill: walk restock / photo story / offer / carousel / save / find a saved design on phone and computer, count and cut taps, shorten sheets, tidy leftovers, open audit findings outside the other rows' scopes; full sweep (level 3) once 1.36–1.39 are on `main`. | anything not in another row's scope; coordinate through the lead | 8085 |

## Rules for every version session
1. Read `CLAUDE.md` and the `studio-improver` skill, then `studio-notes/taste.md`. Their rules apply (save quality, brand-agnostic engine, never delete, weights 400/500/600, RTL, 48px targets, tap budget, ≤2 filled buttons, approved Arabic only).
2. Work only on your branch and only in your scope. Branch from `ccr-9c2f6ba7-pohcld` (it holds this file; check `git log -1 -- studio-notes/sessions.md`). **Do not touch** (the lead owns them): `VERSION` in `studio.js`, `sw.js`, `studio-notes/changelog.md`, `backlog.md`, `lessons.md`, `taste.md`, `sessions.md`, `tests/run.mjs`, `README.md`. Never merge or push to `main`.
3. Instead write `studio-notes/pending/<version>.md` with: the What's New card(s) in the changelog format (with before/after image paths), new files for the `sw.js` shell, `run.mjs` MAP rows for your suite, README lines, backlog/lessons/taste notes, a scoreboard row, and any Arabic wording that needs the owner's approval.
4. What's New shots go in `assets/whatsnew/<version>-<name>-before|after.jpg` (take "before" first; 390px at 2×, JPEG ~72, < 80 KB).
5. Tests: your new suite + `node tests/run.mjs --quick` + the suites the skill's test map lists for the areas you touched must be green before your final push. Use your own port from the table (`npx http-server -p 808x -c-1 .`, `BASE=http://127.0.0.1:808x/`). A suite red on `main` too: say so in your report.
6. Push early and often. When done, message the lead session (`send_message`) with: branch, last commit, suites run (pass/fail counts), and anything risky for the merge. If you need a file outside your scope, message the lead first. Use subagents per CLAUDE.md's model split (sonnet for building from a written brief, haiku for runs/shots).

## Merge order (lead)
1.36.0 → 1.37.0 → 1.38.0 → 1.39.0 → 1.40.0. Before each merge the lead merges `main` into the branch, bumps `VERSION` + `sw.js`, folds in the pending notes, runs `node tests/run.mjs --changed`, then merges to `main`. Finished branches waiting in the order are test-merged together in a scratch worktree with one combined run on a second port.

## Overlaps to watch
- `home()` in `studio.js`: 1.37.0 (Continue editing / Save pictures) and 1.39.0 (Saved select mode) touch different parts; keep edits local, conflicts are "keep both".
- Create: 1.37.0 owns `tools/create*`; 1.38.0 may only touch the emoji part of the highlight layout in `tools/create-templates.js`, after telling the lead.
- Stickers / emoji: 1.36.0 only reads `assets/stickers.js` and `tools/highlight-emoji.js`; if it needs a change there, ask the lead (tool pages and Create depend on them).
- `brands/1stchoice/brand.js`: only 1.38.0 (create.templates + highlight presets).
- `studio.css`: everyone adds new rules only, before the fresh-look block; conflicts there are "keep both".
- `tool()` in `studio.js`: nobody in wave 1; 1.40.0 may tidy it.

## Session ids
- Lead: `session_01Y65H7YqEgcneCKbnnyebNr` (branch `ccr-9c2f6ba7-pohcld`)
