# Mega round (Nov 2026): lead notes

Plan: `studio-notes/mega-plan.md`. This file is the lead's live log: who owns what, the contracts builders code against, and what each wave shipped. A stopped round resumes from here (see "Resume").

## Branches, worktrees, ports
- Integration: `claude/mega-integration` (branched from the plan commit 1537955). Lead tests it in the main checkout on :8080.
- Each builder: `git worktree add /home/user/studio-<topic> -b claude/<topic> claude/mega-integration`, server `npx http-server -p <port> -c-1 .` inside that folder, tests with `BASE=http://127.0.0.1:<port>/`.
- Release numbers: current 1.53.0. Wave 1 → **1.54.0**, Wave 2 → **1.55.0** (a Simplify slot: this wave's new features count as owner-directed; the Wave 3 Simplify pass covers the rule), Wave 3 → **2.0.0** (milestone). Only the lead bumps `VERSION`, `sw.js` cache and `changelog.md`.

## Wave 1 ownership map
| Topic | Branch / worktree / port | Owns (only these; shared hot files in a marked block) |
| --- | --- | --- |
| 1.1 Saved designs | `claude/w1-saved` · `/home/user/studio-w1-saved` · 8081 | `tool()` save path in studio.js (`thumbBlob`, `teamSave`, Save sheet labels), `tools/create.js` save sheet (`thumbBlob`, the team save, `crGo` labels), the design menu "Versions"/"Redraw cover" rows in `home()`; new `tests/saved-versions.mjs` |
| 1.2 Fonts | `claude/w1-fonts` · `/home/user/studio-w1-fonts` · 8082 | new `assets/fonts/` (woff2 + `fonts.css`), `brands/1stchoice/fonts/` + the `fonts` block of brand.js, `useBrand`/`fontLink`/`fontsReady`/`ensureFont` in studio.js, the `@import` line of studio.css, `<link rel=preconnect>` lines in pages, `lab/board-io.js` font CSS; new `tests/fonts-local.mjs` |
| 1.3 Tests | `claude/w1-tests` · `/home/user/studio-w1-tests` · 8083 | `tests/run.mjs`, the flaky suites (`draw-edges`, `create-render`, `share`, `peek`, `batch-saved`), new `tests/goldens.mjs` + `tests/goldens/` |
| 1.4 Small fixes | `claude/w1-fixes` · `/home/user/studio-w1-fixes` · 8084 | `tools/create.css`/the size-button markup, `taste.mjs`, `templates.mjs`, `create-fixes.mjs` and the code they point at |
| 2.1 Tokens | `claude/w1-tokens` · `/home/user/studio-w1-tokens` · 8085 | the new `tokens` block in brand.js, `Studio.tokens` reader (new block after `useBrand` in studio.js), `tests/fixtures/brands/testbrand/` tokens, new `tests/tokens.mjs` |
| 4.0 Schema + Who's using | `claude/w1-schema` · `/home/user/studio-w1-schema` · 8086 | `supabase/migrations/*.sql`, `assets/cloud.js`, `tests/fakecloud.js`, new `assets/who.js` (the picker), the Settings row for it in `assets/welcome.js`, new `tests/who.mjs`, `tests/cloud-api.mjs` |

Shared hot files: add only inside your own block with a `/* <topic> (mega 1.x) */` comment. `studio.css`: new rules go just above the fresh-look block, in one block per topic.

## Contracts (code against these; the 4.0 builder implements them)
`StudioCloud` (real `assets/cloud.js` and `tests/fakecloud.js`, same API):
- `saveDesign(o)`: new optional `o.author` (the "Who's using" name). On an **update** of an existing id it first keeps the current row as a version (`design_versions`: design_id, recipe, thumb_path, photo_paths, name, author, created_at). Thumb files already have unique names, so a version points at the old thumb; the tidy step keeps every file a kept version references. Cap 20 versions per design (oldest rows dropped first; only then can their files go).
- `versions(designId)` → `[{id,design_id,name,recipe,thumb_path,photo_paths,author,created_at}]`, newest first.
- `restoreVersion(designId,versionId,author)` → keeps the current state as a new version, then puts the old recipe/thumb/photos back. Nothing is lost.
- `setThumb(designId,blob)` → replaces only the cover (for "Redraw cover"), keeps the recipe.
- Rows for Wave 2 (functions added by the 4.0 builder now so Wave 2 can use them): `calendar(brand,{from,to})`, `saveCalendarItem(item)`, `deleteCalendarItem(id)`; `comments(designId)`, `addComment({design_id,author,text,x,y})`, `resolveComment(id,on)`; `phrases(brand)`, `suggestPhrase({brand,line,category,author})`, `setPhraseStatus(id,status,by,line?)`; `campaigns(brand)`, `saveCampaign(c)`, `deleteCampaign(id)`; `designs()` rows gain `review` (null | 'in_review' | 'approved' | 'changes'), `caption`, `hashtags`, `author`, `campaign_id`; `setReview(id,status,by)`, `setCaption(id,caption,hashtags)`.
- Every new table: RLS on, one policy `members all <table>` for `authenticated` using `(select private.is_team_member())` like `designs`. Additive only: no change to existing columns' meaning, new `designs` columns nullable.

Who's using Studio (`assets/who.js`, `window.StudioWho`): `get()` → `{name, owner:boolean}|null` from `localStorage['studio:who']`; `ask()` opens the picker (names already used on this team listed first + type a new one), `set(name)`, `setOwner(on)` (a confirm, no password). The engine reads `StudioWho.get()?.name` as `author` when saving.

## Resume
Read this file, `git branch --list 'claude/*'`, `git worktree list`; re-run the baseline (`node tests/run.mjs <all>` with JOBS=4); continue from the first wave whose branches are not merged into `claude/mega-integration`.

## Log
- Wave 0 (7 Nov): baseline run, this map, integration branch.
- Wave 1 released as **1.54.0** on 8 Nov (main 658e395, branch `claude/release-1.54`): w1-schema (migration applied to live Supabase), w1-tokens, w1-fonts, w1-fixes, w1-saved, w1-tests + lead's preview flags. Full sweep 100 suites 16 min 38 s on a quiet box (was 27 min / 93 suites under load).
- Usage: 6 builders + tests used the 5-hour limit in ~4 h; from now **3 builders at once**.
- Wave 2 status: merged w2-calendar into integration. Paused at the limit and resumed (3 at a time): w2-rules, w2-packs, w2-components; waiting: w2-import, w2-phrases, w2-resize (all started, work saved in their worktrees); not started: 3.3 campaigns, 4.2 approvals, 4.3 captions.
- Wave 2 released as **1.55.0** on 8 Nov (main 252df07): calendar, packs, import, rules, components, phrasebook, resize, captions, review, campaigns (+ w3-mp4 behind `motion`). Full sweep 111 suites, 110 green + brandkit fixed (a brand hex in review.css).
- Wave 3 (→ 2.0.0): merged w3-cutout (flag `cutout`, model u2netp 14.7 MB vendored, cached on first use by sw). Running: w3-stock (feed `/api/public/locations` exists but has no CORS header: owner must add one), w3-simplify. Then: What's New shots, README, owner checklist, backlog/lessons, final skill pass, release 2.0.0 (milestone).
- Environment: this repo now has its own cloud environment `1stChoice-Studio` (allows location.1stchoice.cloud).
- Wave 3 released as **2.0.0** on 8 Nov: w3-cutout, w3-stock, w3-simplify, w3-docs (README), What's New shots, owner checklist (`studio-notes/owner-checklist.md`), backlog/lessons, final skill pass. Full sweep 113 suites all green, 19 min 19 s. Round finished.
