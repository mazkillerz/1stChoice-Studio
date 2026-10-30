# Parallel sessions: 1.29.0 → 1.33.0 (30 Oct 2026)

One **lead** session coordinates five version sessions. Each version session builds on its own branch; only the lead merges to `main` and releases, in version order, so `main` never breaks. The previous round (1.13.0 → 1.20.0) is in `_archive/sessions 1.13-1.20 (30 Oct 2026)/`.

**At most 4 at once** (lessons 1.13.0: eight at once used the shared usage limit up in ~30 min). Wave 1 = 1.29, 1.31, 1.32, 1.33. Wave 2 = 1.30 (Simplify), started by the lead once 1.29.0 is on `main`. 1.31–1.33 may finish first; they wait for 1.30 in the merge order.

| Version | Type | Branch | Work | Scope (files it may change) | Wave |
|---|---|---|---|---|---|
| 1.29.0 | Team | `claude/v1.29-backgrounds` | Backgrounds (#39) in Cinematic, New place, Offer and Collage's gaps: `Studio.groundField()` + `h.ground()`; Plain / no value must stay pixel-identical. Background finishes as starting points (#40): one or two brand presets that use a finish (approved words only), shown in Templates. UX: the Restock / Photo story / Offer Style sheet shows the finish row only for styles where it is visible (check each style's shot). | `tools/cinematic.js`, `tools/new-place.js`, `tools/offer.js`, `tools/collage.js`, `presets` in `brands/1stchoice/brand.js`, `tests/backgrounds.mjs` (extend), `tests/postpresets.mjs` / `templates.mjs` only if a preset count changes | 1 |
| 1.30.0 | Simplify | `claude/v1.30-simplify` | Simplify session + pattern review per the skill (walk restock / photo story / offer / carousel / save / find a saved design on phone and computer, cut taps, shorten sheets, tidy leftovers, open audit findings outside other scopes), full sweep (level 3). | anything not in another row's scope; coordinate through the lead | 2 |
| 1.31.0 | Mazoon | `claude/v1.31-create-stickers` | Stickers in Create (#26) incl. emoji stickers, and emoji in Create's highlight layout (#33), reusing `STUDIO_STICKERS` (`emoji:true` entries) and `hlEmoji()`; text styles in Create (#35) if it fits (same `studio:textstyles` store as tool pages). | `tools/create*.js`, `tools/create.html`, new `tests/create-stickers.mjs`, `tests/create*.mjs` | 1 |
| 1.32.0 | Team | `claude/v1.32-continue` | After Save pictures in Continue editing, offer "Remove these N from Continue editing" (#41, one confirm, never automatic). Saved search also matches date words (today / yesterday / this week, Arabic too via `normText`) in `findHit()` (1.27.0 audit). New place and Cinematic get `quick` in `TOOLS` (#37, camera in All tools like Offer). | Continue editing + Save pictures parts of `home()`, `assets/render.js`, `findHit()`, `TOOLS` entries for new-place / cinematic only, new `tests/continue-clear.mjs`, `tests/saved-find.mjs`, `tests/draft-pictures.mjs`, `tests/alltools-cam.mjs` | 1 |
| 1.33.0 | Mazoon | `claude/v1.33-photoflip` | Flip for the tool's own photo boxes (#32): a Flip control in the Photo sheet (`p.flip`, saved in the recipe, absent = not flipped, old designs pixel-identical). Load `tools/highlight-emoji.js` only when needed (1.28.0 audit: Sticker sheet opens, or a design has an emoji sticker) instead of on every tool page. | the Photo sheet + photo drawing in `tool()` in `assets/studio.js`, the sticker loading path (`assets/stickers.js`, script tags in `tools/*.html`), `tests/flip.mjs`, `tests/stickers.mjs`, `tests/emoji-stickers.mjs` | 1 |

## Rules for every version session
1. Read `CLAUDE.md` and the `studio-improver` skill, then `studio-notes/taste.md`. Their rules apply (save quality, brand-agnostic engine, never delete, weights 400/500/600, RTL, 48px targets, tap budget, ≤2 filled buttons, approved Arabic only).
2. Work only on your branch and only in your scope. Check your base includes this file (branch from `ccr-1402b6e7-l5nkk1` or `main` after the lead says). **Do not touch** (the lead owns them): `VERSION` in `studio.js`, `sw.js`, `studio-notes/changelog.md`, `backlog.md`, `lessons.md`, `taste.md`, `sessions.md`, `tests/run.mjs`, `README.md`. Never merge or push to `main`.
3. Instead write `studio-notes/pending/<version>.md` with: the What's New card(s) in the changelog format (with before/after image paths), new files for the `sw.js` shell, `run.mjs` MAP rows for your suite, README lines, backlog/lessons/taste notes, a scoreboard row, and any Arabic wording that needs the owner's approval.
4. What's New shots go in `assets/whatsnew/<version>-<name>-before|after.jpg` (take "before" first; 390px at 2×, JPEG ~72, < 80 KB).
5. Tests: your new suite + `node tests/run.mjs --quick` + the suites the skill's test map lists for the areas you touched must be green before your final push. Use your own port (1.29 → 8081, 1.31 → 8083, 1.32 → 8084, 1.33 → 8085, 1.30 → 8082; `BASE=http://127.0.0.1:808x/`). A suite red on `main` too: say so in your report.
6. Push early and often. When done, message the lead session (`send_message`) with: branch, last commit, suites run (pass/fail counts), and anything risky for the merge. If you need a file outside your scope, message the lead first. Use subagents per CLAUDE.md's model split (sonnet for building from a written brief, haiku for runs/shots).

## Merge order (lead)
1.29.0 → 1.30.0 → 1.31.0 → 1.32.0 → 1.33.0. Before each merge the lead merges `main` into the branch, bumps `VERSION` + `sw.js`, folds in the pending notes, runs `node tests/run.mjs --changed`, then merges to `main`. Finished branches waiting behind 1.30 are test-merged together in a scratch worktree with one combined run on a second port.

## Overlaps to watch
- `tool()` in `studio.js`: only 1.33.0 (Photo sheet, sticker loading); 1.30.0 stays out of it until 1.33 is merged or coordinates.
- `home()`: 1.32.0 (Continue editing, findHit, TOOLS rows); 1.30.0 tidies the hub after asking.
- Stickers: 1.31.0 reads `STUDIO_STICKERS` / `hlEmoji()` from Create; 1.33.0 changes when `highlight-emoji.js` loads. Create must load it itself (its own script tag or the same lazy loader); both sessions check the other's result at merge.
- `studio.css`: everyone adds new rules only, before the fresh-look block; conflicts there are "keep both".

## Session ids
- Lead: `session_01Y65H7Wmzfj9M4oAbDh9sET`
