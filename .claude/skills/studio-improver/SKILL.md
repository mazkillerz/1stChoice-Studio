---
name: studio-improver
description: Keeps improving 1st Choice Studio on its own. Use when the user says "improve Studio", "work on Studio", or anything similar. Audits the UI/UX, ships new tools and features, updates the versioned What's New page, and improves this skill itself.
---

# Studio Improver

## Mission

Make Studio the best mobile-first design toolkit for the 1st Choice team and for Mazoon. UI/UX comes first, then new tools and features, then bug fixes. Be bold and creative.

## Locked core (never change these without Mazoon's approval)

1. Protect data. Never break, migrate or delete saved designs, images or the Supabase schema without asking.
2. Never delete files. Move old or unused files into `/archive`.
3. Preview big changes. Major redesigns or experiments go on a preview branch or behind a toggle until Mazoon approves. Small polish can ship directly.
4. Simplicity gate. Every change must make Studio easier, never more confusing (see Quality gates). This gate can't be removed or weakened.

Everything else in this skill can be rewritten by the skill itself.

## Repo notes (how this skill maps onto this repo; added by the skill, editable)

- **Read `CLAUDE.md` first.** Its hard rules and brand rules apply on top of this skill.
- **Archive folder:** in this repo `/archive` means `_archive/<what> (<date>)/` (CLAUDE.md). `_archive/` is in `.gitignore`, so add moved files with `git add -f`.
- **Tap targets:** CLAUDE.md asks for 48px (`--tap`). Treat 44px as the absolute floor, 48px as the goal.
- **Branches and merging:** work on the session's assigned branch (or `claude/<topic>`), then **merge to `main` at the end of every session** once every test passes (Mazoon's standing instruction, 24 Oct 2026: "Merge always"). Pages publishes `main` immediately. Because everything merges, big redesigns or experiments ship behind a toggle that is off by default (locked core rule 3) until Mazoon approves them.
- **Version:** `VERSION` at the top of `assets/studio.js` (shown on the hub and used for the What's New dot). Also bump the cache name in `sw.js` whenever shipped files change.
- **What's New cards** hold one `before` and one `after` image (the last line of each wins).
- **What's New:** `whats-new.html` + `assets/whatsnew.js/.css` read `studio-notes/changelog.md` directly (format in that file's intro). Screenshots go in `assets/whatsnew/<version>-<name>-before|after.jpg`, 390px-wide phone crops at 2×, JPEG quality ~72 (keep each under ~80 KB). Take the "before" shots **before** changing anything.
- **Hub thumbnails:** the tool pictures (`assets/thumbs/<brand>/<id>.jpg`) are hand-picked shots, not the tool's default view; a fresh render was worse (1.3.0: Collage showed beans, Highlight lost its grid). Keep them unless a tool's look really changes.
- **Tests:** serve with `npx http-server -p 8080 -c-1 .`, then follow **Testing** below (smoke every session, targeted suites for what changed, the full sweep only in Simplify sessions). In a cloud sandbox Playwright is global: if ESM can't find it, link it: `mkdir -p node_modules && ln -s /opt/node-tools/node_modules/playwright node_modules/ && ln -s /opt/node-tools/node_modules/playwright-core node_modules/` (node_modules is git-ignored).
- **Audit + screenshot helpers:** `node tests/tapscan.mjs tools/a.html,tools/b.html` lists every control under 44px per sheet; `node tests/shot.mjs <page> <sheet|-> <out.jpg> [selector]` takes the What's New phone shots.
- **Contrast, RTL and real-font shots** (full sweep, or when colours, tokens or Arabic text handling change): `node tests/contrast.mjs` scans every main screen in light and dark for text below WCAG AA and Arabic text running left-to-right (run it on the old commit too, so a clean result means something). `node tests/look8.mjs <outDir> [base] [names]` shoots the owner-flagged screens in both themes with Arabic names seeded. For real Google Fonts in the sandbox, launch with `proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}` and set `PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK=1` (otherwise local pages go through the proxy).
- **One-photo tools that take several photos (since 1.6.0):** `queue:true` in `TOOLS` makes Quick start keep the extra photos (up to `QUEUE_MAX`) and offer **Next photo** in the Save sheet; a new story each time (new draft, `design` cleared). Use it instead of a batch renderer for "one story per photo" jobs. Since 1.8.0 the waiting photos live in IndexedDB (`studio:queue:<brand>:<tool>` = `{files,total,at}`, `…:pos` = `{pos,saved,draft,design,at}`, written by `syncQueue()` → `keepQueue()`, cleared by `dropQueue()`); a reload on the same story restores it silently, `?queue=1` (the Home row) continues at once, any other visit shows `#queueBar`.
- **New paged tools** (a set of covers, slides…): use `pages`, `pagePhotos` and `pageNoun` in `Studio.tool` instead of new engine code (since 1.1.0 `quickKind` + `quick`/`multi`/`max`/`qi` in `TOOLS` give it Quick start, one photo per page); the hub list is `TOOLS` in `studio.js`, its thumbnails are `assets/thumbs/<brand>/<id>.jpg` + `-sm.jpg` (320×569), and both tool files go in the `sw.js` shell.
- **Wording in test data:** anything a test types that can end up in a shipped image (thumbnails, screenshots) must be an approved phrase from `brand.js`.
- **Owner-directed sessions:** when Mazoon names the work, do that instead of the backlog pick. The gates still apply, and the session still counts in the team/Mazoon rotation (by who it helps most).
- **Service-worker features** (share target, offline): most suites block the service worker (`serviceWorkers:'block'`); a suite that needs it waits for `navigator.serviceWorker.ready` and reloads so the page is controlled (`tests/share.mjs`).
- **Seeded data:** `tests/seed.js` (`seedDesigns()` + `seedScript()`) fills fakecloud with 8 saved designs that use the tool thumbnails; use it for Saved tests and What's New shots. For a "before" shot after code already changed, check out the previous commit with `git worktree add <scratch>/old <sha>` and serve it on another port.
- **The look:** the fresh look is the default since 0.7.0 (no `data-look` attribute any more); its rules sit at the end of `studio.css` and must stay last. Each page opts in to page transitions with an inline `<style>@view-transition{navigation:auto}</style>` in its `<head>` (from JS it is too late). Pop-ups use `dialog()` (it locks the page behind with `lockScroll`); a new overlay that is not a `<dialog>` must call `lockScroll(key,true/false)` itself.
- **Type and RTL (since 0.7.1):** the interface font is IBM Plex Sans Arabic (`@import` at the top of `studio.css`, token `--sans`; `studio.js` passes the brand's fonts as `--display` / `--brand-sans`, never `--sans`). Weights 400/500/600 only. Spacing 4-8-12-16-24-32, sections 24px apart. Dark layers: `--bg` < `--surface` (cards) < `--raised` (sheets, menus, bars). Text that may be Arabic: `dir="auto"` on the wrapper that holds a name and its details (not on each line), and `<bdi>` around times/numbers that start a line.
- **Proving "nothing changed":** for a CSS refactor, dump computed styles of every element on the main pages before and after and diff them (a scratch script did this in 0.7.0); it finds specificity slips that screenshots miss.
- **Preview toggles (big visual changes):** scope the whole change under one root attribute (e.g. `:root[data-look="fresh"]` in studio.css, set early in index.html's `<head>` and by studio.js), off by default, per device. Give three ways to switch it: a changelog card line `[try:fresh] label` (whats-new.js draws a switch), a search action, and a URL switch (`?look=fresh|classic`). Never animate an ancestor of a `position:fixed` layer, and use `animation-fill-mode:backwards` for entrance motion.
- **Hub data for search:** new tools, templates or settings show up in the hub search automatically if they are in `TOOLS` (add `keys` for extra words), the brand kit's `create.templates`, or `searchActions()` in `home()`.
- **Pins:** the home page shows `getPins()` (per device, `studio:pins`); every tool is in All tools. A new tool is not pinned anywhere by default, so mention in What's New where to find it (All tools or search).
- **Outside repos:** when the owner points at another project (e.g. Penpot), check whether it can actually run on static Pages first; usually the right move is to port its best ideas into the existing code and credit it in README and What's New.
- **1.0.0 engine pieces (use them, don't rebuild them):** a tool can have styles that need no photo (`photosFor(o)` → 0, `photoStyle`, `noPhotoNote`, `noPhotoHint`: no photo box, one-tap Save when opened fresh); every photo can take a look (`p.fx` = {look, light}, saved in the recipe; `PHOTO_LOOKS` + `photoFx()` draw it as blend layers, the same at any size); `h.backdrop()` is a blurred copy of a photo that works on iPhones (no canvas `filter`); the layer bar's Move tab nudges, centres and rotates; the Photo sheet has Swap two / Shuffle for 2+ photos; `?preset=<id>` opens a tool with a brand-kit preset (`presets` in brand.js: tool, style, count, values by field id, approved words only).
- **Hub views since 1.0.0:** Home, Templates (`#templates`, `assets/templates.js` renders it from `tplEntries()`), Saved (`#saved`); `openView(v)` gives a page its own Back entry and `goHome()` returns. Settings is the gear (`openSettings()`); the welcome tour (`assets/welcome.js`) opens once on a device that never used Studio, never under automation (`navigator.webdriver`), and again from Settings or `?welcome=1`.
- **What's New milestones:** a `milestone: <title>` line under a version heading draws the big-number banner (1.0.0). Keep it for real milestones.
- **Parallel helpers (since 1.4.0):** when asked for parallel sessions, give each helper a worktree (`isolation: worktree`), its own files and its own port (`BASE=http://127.0.0.1:808x/`); tell it to check its base is the session branch (worktrees can start from an old `main`) and to follow the taste rules (weights 400/500/600, RTL with an icon inside an input). The lead keeps VERSION, `sw.js`, changelog, notes and `run.mjs`, then merges, shoots and releases.
- **Shot scripts and tests that tap the preview:** recompute `#view`'s box and the scale (`box.width/1080`) after anything that changes a sheet's height, and on desktop scroll `#view` into view first (the inspector is long and the page scrolls).
- **Parallel version sessions (since 1.8.0):** when asked for several sessions/versions at once, the lead writes `studio-notes/sessions.md` (version, type, branch, file scope, merge order), starts one remote session per version, and keeps VERSION, `sw.js`, changelog, backlog/lessons/taste, README and `run.mjs` to itself. Each session writes `studio-notes/pending/<version>.md` (cards, run.mjs rows, sw.js files, README lines, notes, wording to approve) and messages the lead. The lead releases strictly in version order (merge the branch, `VERSION` + `sw.js`, fold in the pending notes, `run.mjs --changed`, merge to `main`), and passes overlap warnings between sessions as they report. A Simplify version starts its cleanup at once but runs its full sweep only after the earlier versions are on `main`.
- **Engine gotchas (folded in from lessons.md at the 1.10.0 pattern review):** a `let`/`const` that init code reaches early must be declared above its first reader, or it hits the temporal dead zone (0.5.0, 0.7.0); grow a tap area with an invisible `::after`, never by resizing a control in a bar (0.2.0, 1.0.0); scope delegated click handlers to their own container (`[data-f] .chip`, 1.0.0); a variant class that sets colours needs its own selected-state rule (specificity slips 0.6.0, 0.7.1, 1.0.0); `:focus-within` on a label that wraps a file input lights up when a dialog opens, use `:has(:focus-visible)`, and new buttons get `:focus:not(:focus-visible){outline:none}`; a page that does not load studio.js gets no brand web fonts; a dialog opened from code focuses its first button, so focus the dialog itself (`tabIndex=-1`).
- **Shared text matching (since 1.10.0):** `Studio.normText(s)` / `Studio.normMap(s)` in `studio.js` fold Arabic (harakat, tatweel, alef/yeh/teh marbuta/waw/kaf forms, Arabic digits) and case; hub search (`assets/search.js`) and Create's template search use them. A new search box uses the same function, never its own regex.
- **Model split:** CLAUDE.md asks for routine building to go to a `sonnet` subagent with a precise brief, and lookups/test runs to `haiku` (see **Testing → Who runs the tests**). Give a subagent files that nobody else is editing at the same time.

## Design system

- Studio has its own neutral look, not tied to any one brand. It should be able to grow beyond 1st Choice.
- Keep the design tokens (colours, fonts, spacing, radius, shadows) in a single file and use them everywhere. In this repo that file is the `:root` block at the top of `assets/studio.css` (light + dark). New pages link `studio.css` and use only those tokens.
- You're free to experiment with new UI/UX ideas, like motion, gestures, layouts and micro-interactions, as long as big experiments follow the preview rule.

## Session loop

1. **Load context.** Read `studio-notes/taste.md` (Mazoon's taste and the issues he keeps raising: design for it, and never hand him one of those issues again), `studio-notes/backlog.md`, the scoreboard and newest session in `studio-notes/lessons.md`, and the latest entry in the changelog.
2. **Audit.** Run the smoke test (`tests/smoke.mjs`) and the taste checks (`tests/taste.mjs`), via a `haiku` helper, and look at the screens you are about to change with the checklist below. Add findings to the backlog. The audit of every screen is part of the full sweep in Simplify sessions and major versions.
3. **Pick work.** First check the session count at the top of `backlog.md`: if this release's minor number is a multiple of 5 (1.5.0, 1.10.0, 2.5.0…), it's a **Simplify session** (see below) and there's no new feature; a major version (2.0.0) also runs the full sweep and the pattern review. Otherwise choose one UI/UX improvement plus one feature. Alternate the feature each session (the last session's type is at the top of `backlog.md`):
   - Team session: speed up restock photos and other team workflows, and make it easier for the team to adopt more tools.
   - Mazoon session: power tools like post makers, story makers, highlight covers, and anything else useful.
4. **Build.** Keep the scope small enough to finish and test in one session. After the first working version of a visual change, run `node tests/taste.mjs` and look at one phone shot in each theme before writing tests or What's New (every late slip in 1.4.0–1.7.0 was found at release). Write `tests/<feature>.mjs` alongside each new feature or fix and add it to the test map (see Testing).
5. **Quality gates.**
   - **Taste checks are green** (`tests/taste.mjs`): alignment, contrast incl. selected states, notes that cover content, tap budget, clutter, RTL, small phones, tap targets. A new screen gets added to it in the same session.
   - Everything that worked before still works: the smoke test and the targeted suites are green (Testing levels 1 and 2). The full sweep proves it for every screen each 5th version.
   - The changed screens look right and work well at phone size, then at desktop size.
   - Saved designs in Supabase still load, save and delete correctly.
   - Nothing loads noticeably slower than before.
   - **Simplicity gate (locked core):** every change makes Studio easier, never more confusing.
     - New features stay out of the way until they're needed (behind a tap, a sheet or a "More", not on the first screen).
     - Common tasks never take more taps than before (count them before and after: restock story, photo story, save).
     - Familiar buttons don't move without a good reason, and the reason goes in the What's New card.
     - If a change adds complexity, simplify it or move it to the backlog instead of shipping it.
6. **Release.** Bump the version, update the What's New page, run the smoke test and the targeted suites one last time, then commit, push and merge to `main` (see Repo notes).
7. **Reflect and self-improve.** Record what worked and what didn't in `lessons.md`. Add new ideas to the backlog. Edit this skill to work better next time, without touching the locked core.
   - **Feedback memory.** Every fix Mazoon asks for goes into `taste.md`: a new row in "Recurring issues" (or +1 on an existing row, with the version), and anything he liked or rejected under those headings. A row raised twice must have an automatic check in `tests/taste.mjs` (or the suite that owns that screen) before the session ends.
   - **Self-score.** End every session with a scoreboard row at the top of `lessons.md`: Quality (1–5: gates green, nothing visibly off in the shots), Speed (1–5: shipped what was asked in one session, no rework), Owner-reported issues (how many fixes he asked for about the PREVIOUS release, filled in at the start of the next session), Taste checks (pass/fail at release), and one line on what to do better. Compare with the last three rows; if a score drops, the first process tweak targets it.

## Testing (fast by default)

Test what changed, fully; test the core flows quickly; test everything only every 5th version. Decide the scope from the diff (`git diff --stat main`), not from habit.

**Run them in parallel (since 1.2.0), and only what changed (since 1.3.0):** two runs per session, no more:
- **While you work:** `node tests/run.mjs --quick` = smoke + taste + the suites in `tests/` you added or changed (about 1 min). Run your new suite on its own (`node tests/<feature>.mjs`) while fixing it.
- **Once, before the merge:** `node tests/run.mjs --changed` = smoke + taste + the suites mapped to the files changed since `origin/main` (it fetches it first: a stale local `main` once made it run all 26 suites for 8 min). Run it again only if app code changed after it.
- `--dry` prints which suites it would run and why, in a second; check it before a long run. `studio.js` is mapped by where the lines changed: inside `tool()` → tool-page suites, inside `home()` → hub suites, only the `VERSION` line → `whatsnew`. The slowest suites start first.
- Keep `MAP`, `TOOL_SUITES`, `HUB_SUITES` and `SLOW` in `tests/run.mjs` in step with the table below when you add a suite.
- 4 at a time by default (`JOBS=n`). Long poles: `collage-grids` ~210 s, `full` ~180 s. `home7` and `polish71` run in parts since 1.10.0 (`home7-hub`, `home7-saved`, `home7-save`, `polish71-saved`, `polish71-search`, `polish71-bar`: each sets `PART` and imports the whole file); the whole files still run by name and in the full sweep. Split the next suite that passes ~120 s the same way. Never `pkill -f` a pattern that is also in your own command line (it kills the shell running it).

**Level 1: smoke, every session (about 30 s).** `node tests/smoke.mjs` runs the core flows at phone size (390×844, touch) in light and dark mode: home, Restock from a photo, Save in one tap (2160×3840 PNG + team), Save after an edit (Save sheet), search (English and Arabic, the Arabic row right to left), and opening a saved design from Saved with its photo back. Run it at the start (audit) and right before merging. It replaces checking these flows by hand. Keep it small: core flows only, under a minute. If a core flow changes on purpose, update `smoke.mjs` in the same session; a new feature gets its own suite instead.

**Level 2: targeted, every session.** Test fully only the screens and features that changed:
- Every new feature or fix gets `tests/<feature>.mjs` (phone first; light and dark when colours or surfaces change; desktop when its layout differs). Add it to the map below.
- Run the suites mapped to every area the diff touches. Shared foundations count as areas: tokens or shared classes in `studio.css`, `dialog()`, the save engine, `useBrand`, `sw.js`.
- A flow change can break tests that tap the old way: grep every suite for the old selectors and taps; the suites that use them are in scope too.
- Screenshots (both themes) only of the changed screens, and only when the change is visual.

| Area changed | Suites |
| --- | --- |
| Tool pages: layers, inspector, sheets, photos, drafts (`tool()` in studio.js, `tools/*.js`) | `full`, `v5`, `polish` |
| Save engine, Save sheet, team save, Save all (`assets/batch.js`) | `quicksave`, `simplify`, `home7-save`, `batch` |
| Quick start, "Your photo is in", several photos in a row (`queue` tools) | `quicksave`, `queue`, `queue-keep`, `whatsnew` |
| Hub home: pins, + menu, Saved row, bottom bar | `home7-hub`, `pins`, `pinorder`, `fresh` |
| Saved page, collections, a design's menu, Peek, select mode, card names | `home7-saved`, `polish71-saved`, `extra`, `select`, `peek`, `cardnames` |
| Search (`assets/search.*`, `searchEntries` in `home()`, `normText`) | `search`, `polish71-search`, `create-search` |
| Copy / Paste style, the inspector's More tab | `copystyle` |
| Stickers (`assets/stickers.js`, the Sticker sheet in `tool()`) | `stickers`, `copystyle`, `full` |
| Highlight covers, paged tools, Quick start for paged tools (`quickPages`, `quickKind`) | `highlight`, `highlight-product`, `quickpages`, `batch` |
| Create (`tools/create*`) | `create`, `create-search` |
| What's New, changelog | `whatsnew` |
| Share target, `sw.js`, manifest, the + menu, the shared-photo row on Home | `share` (runs with the service worker on), `peek` |
| Colours, tokens, type, Arabic text handling | `contrast`, `polish71-saved`, `polish71-bar`, `fresh` |
| Board, lab (`lab/`) | `lab`, `lab-pro`, `board-penpot` |
| Templates library (`assets/templates.*`, brand `presets`, `?preset=`), previews, Create post templates | `templates`, `postpresets`, `taste` (regenerate previews: `node tests/tplthumbs.mjs [ids]`) |
| Welcome tour, Settings sheet (`assets/welcome.*`) | `welcome`, `taste` |
| Restock / Photo story / Collage drawing (`tools/restock.js`, `photo-story.js`, `collage.js`) | `restock-styles`, `photostory-styles`, `collage-grids` (each compares the old styles pixel for pixel) |
| Photo looks, Swap two / Shuffle, Move tab, styles with no photo (`tool()`) | `full`, `restock-styles`, `taste` |
| Any screen (the owner's recurring issues) | `taste` (every session, with smoke) |

**Test-writing tips (folded in from lessons.md):** a touch press-and-hold needs `pointerdown`/`pointerup` with `pointerType:'touch'` (CDP touchStart does not start the timer); a touch drag needs CDP `Input.dispatchTouchEvent` (touchStart, ~10 touchMoves, touchEnd); `fakecloud.collections()` keeps insertion order while the real one sorts, so compare sorted lists; `page.click` scrolls the target into view (click from `page.evaluate` in shot scripts); Board merges panel clicks within 250 ms into one undo step, so wait ≥ 400 ms between steps that undo.

**Level 3: full sweep, Simplify sessions and major versions** (1.5.0, 1.10.0, 2.0.0…), or when Mazoon asks for a check of every screen. Every suite in `tests/` (one at a time; they share the server), `tests/contrast.mjs`, shots of every screen in light and dark with Arabic names seeded (the `tests/look8.mjs` pattern), `tests/tapscan.mjs` over every tool, and a desktop pass. Fix what it finds or add it to the backlog. Other sessions skip it.

**Who runs the tests.** The main model plans the scope, writes the checks a new suite must make, reads the results and decides. Routine testing goes to cheaper helpers:
- `haiku`: runs suites and reports, takes screenshots of the changed screens with short notes. Brief: "Server on :8080 (start it if it is down). Run one at a time: `node tests/smoke.mjs`, `node tests/<suite>.mjs` … Do not edit any file. Reply with one line per suite: name, PASS count, FAIL count, time, and the first 3 FAIL lines word for word."
- `sonnet`: writes or updates `tests/<feature>.mjs` from a precise list of checks (selectors, expected values, themes, viewports), then runs it.
- Prefer `tests/run.mjs` over a helper for a plain pass/fail run: it is already parallel and its report is short. A helper only for screenshots or writing a suite.
- Start helpers in the background and keep planning or writing notes meanwhile. The server serves the working tree, so make no app edits while a helper is testing (commit first, or wait for its report).
- A helper's failure is a claim: reproduce the failing check before changing app code.

## Simplify session (every 5th version)

Every 5th minor version (0.5.0 and 1.0.0 happened; next 1.5.0, 1.10.0…) skips new features unless Mazoon names the work. It starts with the **Pattern review** (below). The whole session is a pass to make Studio cleaner, simpler and more convenient for the team and Mazoon:
- Walk the common jobs on a phone (restock story, photo story, offer, carousel, saving, finding a saved design) and count taps; cut every one that isn't needed.
- Walk the same jobs on a computer too and list where the two differ: the extra steps are usually on the phone, and "now it works like on the computer" is an easy reason to give in What's New.
- A flow change breaks tests that tap the old way: grep every suite for the old taps before running them.
- Merge or hide rarely used options, shorten long sheets and labels, remove duplicate ways to do the same thing, and make defaults match what people actually pick.
- Tidy the hub (grouping, order by use) and fix the open UX audit findings in `backlog.md`.
- Clean up code and CSS that the cuts leave unused (move removed files to `_archive/`, never delete).
- Still follow the locked core: nothing that changes saved designs, and big layout changes ship behind a toggle until Mazoon approves.
- Run the full sweep (Testing, level 3): it is the one session that checks every screen, both themes and RTL.
- What's New gets one card per simplification, with before/after screenshots and the tap counts.

## Pattern review (every Simplify session and every major version: 1.5.0, 2.0.0 …)

Before picking work, spend a few minutes improving the process itself:
- Read `lessons.md` and `taste.md` end to end. Merge lessons that say the same thing, drop the ones that no longer apply (code that is gone, a tool that changed), and move durable rules into this skill (Repo notes, Testing or the checklist) so `lessons.md` stays a short log, not a rulebook.
- In `taste.md`, update the counts, mark issues that have stayed fixed for 3+ releases as "settled" (keep their check), and add new rows from the latest fix requests.
- Look at the scoreboard: what lowered the scores? Rewrite the step of the Session loop that caused it (e.g. a missing check, a late screenshot, a helper brief that was too vague).
- Make sure every recurring issue has a check that runs automatically, and that the test map below still matches the suites in `tests/`.

## Mobile-first UX checklist

- Tap targets are at least 44px, and the main actions can be reached with one thumb.
- Pages load fast on mobile data, with compressed images and lazy loading.
- Loading, empty and error states are clear and friendly.
- Text contrast is readable, and labels make sense without explanation.
- The number of taps needed for common jobs keeps going down, especially for restock photos.
- Exports come out at the correct Instagram sizes (post 1080×1350, story 1080×1920, highlight cover).
- Animations feel smooth and never get in the way.
- From `taste.md` (automated in `tests/taste.mjs`; check them by eye too on the screens you change):
  - Alignment: a heading in a menu or sheet starts at the same x as the icons of its rows; titles, chips and cards on a page share one left edge; sibling icons are the same size.
  - Contrast ≥ 4.5:1 in light AND dark, including selected, pressed and disabled states; a selected state must look different from the unselected one.
  - Notes and pop-ups never block the design: a note covers ≤ 15% of the preview, is one or two lines, and goes away in ≤ 4 s or with a tap; dialogs fit inside the screen at 390×844 and 1280×800 and lock the page behind.
  - Tap budget: Restock from a photo ≤ 2 taps to a saved picture, Photo story ≤ 2, a no-photo Restock ≤ 1 after opening, Save + team ≤ 2. A change may never raise a count.
  - Clutter: at most two filled accent buttons on a first view (plus +), and in every later state of a sheet too (e.g. the Save sheet after saving); no two controls with the same label, new options behind a tap.
  - RTL: Arabic text runs right to left (dir="auto" on the wrapper), times and numbers in `<bdi>`, every text input takes Arabic correctly.
  - Small phones (360px): no sideways scrolling, no clipped labels, the last row scrolls clear of the bottom bar.
  - Every icon-only control has a label or a tooltip; no two tools share an icon.

## Feature engine

- Study tools like Canva, Instagram's editor, CapCut and Unfold for ideas.
- Rank ideas by team impact, Mazoon's impact, effort and how much they wow.
- Starting idea pool: one-tap restock templates, post maker, highlight cover maker, carousel maker, brand kits for multiple brands, text styles, stickers, background removal, batch export, template collections and search.

## Versioning and What's New

- Use semantic versions starting at 0.1.0. Fixes bump the last number (0.1.1), features bump the middle number (0.2.0), and 1.0.0 is for when Studio feels complete (shipped 25 Oct 2026). After 1.0.0: 1.1.0, 1.2.0…; Simplify sessions at 1.5.0, 1.10.0…; 2.0.0 only for a big new chapter, with a `milestone:` banner like 1.0.0.
- The What's New page lives inside Studio and must look beautiful. Each version gets cards with a title, a short note and before/after screenshots. Show a badge on the icon when there's something new.

## Memory files
- `studio-notes/taste.md`: Mazoon's design taste, how he likes to work, and the issues he keeps raising, each with the check that catches it. Read first, update every session.

- `studio-notes/backlog.md`: ranked ideas and bugs.
- `studio-notes/lessons.md`: what worked, what failed and process tweaks.
- `studio-notes/changelog.md`: the source for the What's New page.
