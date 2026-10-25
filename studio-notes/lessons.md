# Lessons

What worked, what failed, and process tweaks. Newest session first.

## Scoreboard (self-score at the end of every session; see the skill's Reflect step)
| Session | Version | Quality (1–5) | Speed (1–5) | Owner-reported issues after the previous release | Taste checks | Do better next time |
|---|---|---|---|---|---|---|
| 11 | 1.0.0 | _filled at release_ | _filled at release_ | 1 (+ menu title left of its icons; 3 tools with one camera icon) | _at release_ | _at release_ |

## Session 11 · 1.0.0 · 25 Oct 2026 (owner-directed milestone, preview branch)

**Worked**
- Engine first, then helpers: the shared pieces (photo looks, styles with no photo, `?preset=`, Move tab, `h.backdrop`) went in and were committed before three Sonnet helpers each took one tool file. Nobody waited on anybody and no file had two editors.
- Self-contained modules with a written contract (welcome tour, Templates page) were built and tested by helpers on a harness page while the hub wiring was done in parallel; plugging them in took minutes.
- Mining past sessions (`list_sessions` / `list_events`) gave `taste.md` real evidence: 15 sessions, the owner's own words, counts per recurring issue. The new `tests/taste.mjs` then found 8 real problems on its first run (All tools headings 5px left of the rows, the Saved back arrow 3px off, sub-44px links/sliders, hex fields without a direction) that screenshots had not shown.
- Pixel-hash compatibility tests (new tool file vs the old one served through `ctx.route`) proved every old style still draws exactly the same, so saved designs are safe.
- A real bug from 0.9.0 surfaced while testing Restock: the single-choice chip handler (`.chip`) caught the multi-choice flavour chips, so tapping a flavour threw and did nothing. Scope delegated handlers to their own container (`[data-f] .chip`).
- `.dlg p{margin:0}` beat `.fab-h{margin}` (specificity again): the + menu title sat 10px left of its icons. Fix by scoping (`.fab-menu .fab-h`), and check alignment numerically (Range on the text vs the icon box).

**Didn't work / watch out**
- The usage limit stopped three helpers at once (Restock, README, taste suite). Their files were on disk and nearly done; the main agent finished them. Brief helpers to save progress early and often, and check `git status` before restarting work.
- A taste fix that made the layer bar's ✓ 44px made the bar 4px taller, which covered a Collage logo at the bottom of the preview (full.mjs caught it). Grow tap areas with an invisible `::after`, never by resizing a control in a bar (the 0.2.0 lesson, again).
- A `//` comment inside a one-line function swallowed the rest of the line; `node --check` caught it within seconds, but helpers were running tests against the live file. Use `/* */` in one-line code and check before saving.
- Two template previews (white and cream carousel) looked identical: a library must never show two cards that look the same. Check the contact sheet for near-duplicates.
- A white photo border on the Cream look mixes the two looks; automatic colours must follow the look (warm on Cream).

**Process tweaks**
- New: `studio-notes/taste.md` (read first), `tests/taste.mjs` (every session, with smoke), the self-score scoreboard above, and the pattern review at Simplify sessions and major versions (skill).
- New suites: `welcome`, `templates`, `restock-styles`, `photostory-styles`, `collage-grids`, `taste`; previews: `node tests/tplthumbs.mjs [ids | --tool=x | --create]`.

## Session 10 · 0.9.0 · 25 Oct 2026 (team session)

**Worked**
- The share target needed no new tool code: the service worker drops the files in the same IndexedDB store studio.js uses, and the hub hands them on with the existing Quick start key, so tools treat a shared photo exactly like a picked one.
- A Playwright form POST (DataTransfer files + `form.submit()`) goes through the real service worker, so the whole Android path (POST → IndexedDB → 303 → sheet → tool) is tested end to end, not mocked.
- Tagging the last-used tool instead of reordering kept the simplicity gate (familiar buttons stay put) and still gives the repeat-job hint.

**Didn't work / watch out**
- A test fetched a sample that does not exist (`samples/restock.jpg`); list the folder before naming test files.
- A dialog opened from code focuses its first button, which draws a focus ring nobody asked for; focus the dialog itself (`tabIndex=-1`) and hide its own outline.

## Session 9 · 0.8.0 · 25 Oct 2026 (Mazoon session)

**Worked**
- A select mode built as one `sel` Set plus a `body.selecting` class: the grid re-renders as before, `paintSel()` only flips classes, labels and the bar, and CSS hides ⋯, the + button and the bottom bar. No new page, no new engine code.
- Giving select mode its own history step (`pushState({sel:1})`) made the phone's Back stop selecting instead of leaving the page; ending it any other way calls `history.back()` so no extra step is left behind.
- Pruning the selection to the designs on screen whenever the filter changes means Delete never touches a design you can't see.
- Bulk actions as one call per design with a running count ("Deleting 2 of 3…"), stopping at the first error and saying how far it got, needed no change to `cloud.js` or the database.

**Didn't work / watch out**
- `fakecloud.collections()` keeps insertion order while the real one sorts by name: compare sorted lists in tests.
- A synthetic touch press (CDP touchStart) did not start the press-and-hold timer; dispatching `pointerdown`/`pointerup` with `pointerType:'touch'` (home7's way) does.
- `page.click` on cards scrolls them into view, which moves the header out of a screenshot; click from `page.evaluate` for What's New shots.

**Process tweaks**
- New Saved page features: add the suite to the Saved row of the skill's test map (done: `select`).

## Session 8 · 0.7.1 · 25 Oct 2026 (owner-directed: 10 fixes + visual polish)

**Worked**
- A contrast scan (`tests/contrast.mjs`: blend each text's ancestor backgrounds, WCAG ratio, plus "Arabic text that runs left-to-right") proved both the bug and the fix: 26 findings on the old commit (served from a `git worktree` on :8081), 0 after. Run a new checker on the old code first, so "no findings" means something.
- The unreadable chosen collection chip was specificity order again (`.chip.col{background}` came after `.chip[aria-pressed="true"]` with equal specificity), like the 0.6.0 tick. A variant class that sets colours needs its own selected-state rule.
- `dir="auto"` on the caption group (not on each line) lines up an Arabic name and its time on the same side; `dir=auto` skips descendants that carry their own `dir`, so put it on the wrapper only. A time that starts with a digit ("1 h ago") turned into "h ago 1" inside an RTL line: wrap it in `<bdi>`.
- Removing a duplicate button without adding a tap: the main button takes over the shortcut's job while the state is fresh (`quickReady`, cleared by the first undo-history commit; `flush()` the Quick start's own commit before setting it). Restock from a photo stays two taps.
- Search (two files) went to a Sonnet helper in parallel with the engine work and the test updates to another; no file had two editors.

**Didn't work / watch out**
- The new interface font did nothing at first: `useBrand()` wrote the brand's body font into `--sans` at runtime. A CSS token is not the final value; grep the JS for `setProperty('--`. The engine now writes `--brand-sans`.
- Playwright adds `<-loopback>` to the proxy bypass list, so with a proxy (needed for real Google Fonts in the sandbox) local pages went through the proxy and showed its error page. Set `PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK=1` and `bypass:'127.0.0.1,localhost'`.
- A scrolling chip row (`overflow-x:auto`) also clips vertically: shadows need `padding-block` with a matching negative margin.
- A visible label in the tool top bar squeezes the title on 360px phones; measure `.ttl` with the real font (fallback fonts are narrower).

**Process tweaks**
- `tests/look8.mjs <outDir> [base] [names]` shoots every screen the owner flagged in light and dark with Arabic names seeded (approved phrases only); `scratchpad/pair.py` puts light and dark side by side. Take the "before" set first.
- New suites: `tests/polish71.mjs`, `tests/contrast.mjs`.
- Testing is now three levels (skill → Testing): `tests/smoke.mjs` every session (core flows, light + dark, ~30 s), the suites mapped to what changed, and every suite + contrast + every-screen shots only in Simplify sessions. For scale: `full.mjs` alone takes ~3 min, every suite ~25 min.

## Session 7 · 0.7.0 · 25 Oct 2026 (owner-directed: fresh look default, + button, Saved, one-tap save, What's New)

**Worked**
- Making the fresh look the default by dropping its `[data-look]` scope was checked with a computed-style diff (every element on home, tools, Create, lab, Board, before vs after): zero differences except one rule that lost to `create.css` because the selector got less specific. A diff beats screenshots for "nothing changed" claims.
- What's New (its own three files) and the test-suite updates (only `tests/`) went to Sonnet helpers while the engine work stayed in one hand; no file was edited by two agents at once.
- The usage limit stopped a helper mid-way; a `send_later` check-in and `SendMessage` to the same helper resumed it with its context.
- A tiny `look.mjs` (seeded designs + one step: fab / saved / sheet / dark / desktop) gave a screenshot after every change in seconds.

**Didn't work / watch out**
- A `const` helper (`skel`) used by init code that runs earlier (opening #saved on load) hit the temporal dead zone. Helpers that early code can reach must be function declarations, or the state must be declared at the top of `home()`.
- `@view-transition` added from JS is too late for the page being opened ("InvalidStateError"); each page opts in with an inline `<style>` in its `<head>`.
- Turning a switch on by default changes what a tap does to data: "Save to the team" on for an opened saved design would overwrite the team's copy. Defaults that write data need a separate look at new vs existing items.
- `:focus-within` on a label that wraps a file input lights up when a dialog opens (it focuses the first input). Use `:has(:focus-visible)`.

**Process tweaks**
- `tests/seed.js` seeds fakecloud with 8 saved designs using the tool thumbnails; use it for Saved tests and shots.
- New suite `tests/home7.mjs`.

## Session 6 · 0.6.0 · 24 Oct 2026 (owner-directed: search, pins, Fresh look)

**Worked**
- Putting search in its own files (`assets/search.js/.css`) with a written data contract (entries, shortcuts, init/refresh) let a Sonnet subagent build it in parallel with no file conflicts; the hub only hands it data.
- One root attribute (`:root[data-look="fresh"]`) for the whole new look, plus three ways to switch it (What's New card `[try:fresh]`, a search action, `?look=fresh|classic`), made a big visual change safe to merge (off by default) and one tap for Mazoon to try.
- Reading the owner's words literally solved a clash with the simplicity gate: "new devices start with Restock" left room for devices that already used Studio to keep their Start-from-a-photo tools, so Photo story and Collage stayed one tap there.
- The faint "Saved!" tick was a specificity bug (`.done-box span` beat `.done-ic`), not a colour choice. Check computed styles before redesigning.

**Didn't work / watch out**
- A filled entrance animation (`animation-fill-mode:both` with a transform) on an ancestor made the full-screen search (`position:fixed`) a box inside the hero, so taps hit the page behind. Use `backwards` for entrance animations and never animate an ancestor of a fixed layer. Only the end-to-end test on the real page caught it, not the subagent's harness.
- An early `<head>` snippet that sets an attribute must be undone by the engine when a URL switch turns it off (`?look=classic` failed first).
- The search star and the page's pin code both buzzed on one tap. When a module and the page react to the same action, only one gives the feedback.
- The tool page removes `?quick=1` after loading the photo: check the ready bar, not the URL.
- Three old suites expected every tool on the home page (`#toolGrid`). A home-page change means grepping every suite for `#toolGrid`, `.tgroup`, `.qbtn`.
- `whatsnew.mjs` broke twice for reasons outside the code: Collage's Quick start button only exists when Collage is pinned, and old screenshots far down the growing page are lazy-loaded. Tests now pin the photo-first tools and scroll through What's New before checking images.

**Process tweaks**
- Screenshots with real fonts in the sandbox: launch Chromium with `proxy:{server:process.env.HTTPS_PROXY}` and the context with `ignoreHTTPSErrors:true`.
- New suites: `tests/pins.mjs`, `tests/search.mjs`, `tests/fresh.mjs`.

## Session 4 · 0.4.0 · 24 Oct 2026 (Mazoon session)

**Worked**
- "Use this ready repo" (Penpot) did not mean embedding it: Penpot needs its own servers (Clojure backend, Postgres, Redis) and can't run on GitHub Pages. Porting its two signature ideas into the existing Konva Board gave the value with no new library and no server.
- Combine shapes as a live group: only the bottom shape draws, using canvas clips (subtract = evenodd clip with a huge rect, intersect = nested clips, exclude = one evenodd clip). Hit-testing stays normal by checking `ctx.canvas.hitCanvas`. Exports, undo and saving worked with no extra code because the result is drawn, not stored.
- Components synced in `commit()` (just before each undo step) by comparing a JSON signature of main vs copy children, so every way of editing (panel, drag, find & replace, undo) is covered by one hook.
- A pixel test on the exported frame (`BD.exportFrame(...,{canvas:true})`) checks drawing results exactly.

**Didn't work / watch out**
- My first union check used a point outside the circle; check test geometry before doubting the code.
- Panel/seg clicks within 250 ms merge into one undo step (debounced commit). Tests that undo must wait ≥400 ms between steps.
- `scrollIntoView` on the phone panel scrolls the whole page in a screenshot; don't use it in shot scripts.
- Touch wording: say "double-tap" on coarse pointers (`matchMedia('(pointer:coarse)')`).

**Process tweaks**
- `tests/board-penpot.mjs` added to the suite.

## Session 3 · 0.3.0 · 24 Oct 2026 (team session)

**Worked**
- Reusing the existing `.banner` + `.mini` pieces for the ready bar meant no new look to design; one CSS rule moved it from the top to the bottom (near the thumb, clear of the headline).
- Calling the existing `resetSaveSheet()` + `doSave()` from the new button kept every save rule (missing-photo check, 2× PNG, fallbacks) in one place.
- A throwaway screenshot script in the scratchpad gave the before/after shots for a flow `tests/shot.mjs` can't reach (Quick start needs a file upload).

**Didn't work / watch out**
- A button label with an icon wrapped to two lines at 390px; drop the icon or shorten the text and check the shot.
- Desktop has no bottom tab bar, so "hide when they tap a tab" does nothing there; also hide on the first `input` event.
- tapscan reports controls that already have a hidden `::after` hit area (swatches). Check the CSS before "fixing" a finding.

**Process tweaks**
- Count taps in the What's New note (two → one) so the gain is visible to the team.

## Session 5 · 0.5.0 · 24 Oct 2026 (Simplify session)

**Worked**
- Comparing the phone and computer flows found the biggest cut: the computer already saved in one tap, the phone needed two. Making the phone match the computer is an easy reason to give in What's New.
- Keeping the order of work "image first, then team" let the team step become a follow-up on the same sheet (switch + "Add to the team") without a second picture, so the one-tap change didn't remove anything.
- A single `imgDone` flag, cleared on the next edit (commit/undo) and when the sheet is reopened, was enough to switch the button between Save again / Add to the team.
- Moving the hub order into `TOOLS` (with a `group` per tool) kept the hub code one map; other lists (tool filter) follow the same order for free.

**Didn't work / watch out**
- A `let` used by a function that init code calls early (`syncSaveOpts` via `showDesignBar`) must be declared above that function, or it hits the temporal dead zone. Declare shared flags next to their first reader.
- Four suites tapped Save twice (bar, then sheet). A flow change means grepping every test for the old taps (`#barSave`, `#save`, `#teamOnly`) before running them.
- Don't `git stash` for "before" shots while a background test run uses the working tree; take before shots first (as the skill says) or wait for the run to end.

**Process tweaks**
- For a Simplify session, walk each common job on both phone and computer and list where they differ; the extra steps are usually on the phone.

## Session 2 · 0.2.0 · 24 Oct 2026 (Mazoon session)

**Worked**
- A new tool built on the existing page engine (Carousel's `pages`) came almost free: filmstrip, reorder, numbered PNGs, drafts and team save all worked with no engine changes beyond wording.
- Making the engine's hard-coded "slide/carousel" words a tool option (`pageNoun`) instead of copying the pager kept the engine brand- and tool-agnostic.
- An invisible `::after` hit area grows a button's tap target without moving the layout, so it can't break tests that tap at fixed spots (the inspector Done that broke full.mjs last time).
- Building the hub thumbnail from the test's own exported PNGs (PIL) gave a real preview in seconds.

**Didn't work / watch out**
- A word typed in a test ended up in a shipped thumbnail. Test data that can reach an image must use approved phrases from `brand.js` too.
- Some backlog findings were stale (Create already had a template shimmer). Check a finding still holds before picking it.
- The draft toast ("Your unfinished stories…") covers the preview for ~3s after `draftFresh`; `tests/shot.mjs` waits it out.

**Process tweaks**
- `tests/tapscan.mjs` (tap-target scan per sheet) and `tests/shot.mjs` (phone screenshot) are now in the repo; use them for the audit and the What's New shots.

## Session 1 · 0.1.0 · 24 Oct 2026 (team session)

**Worked**
- Taking the "before" screenshots first, then writing the changelog entry before building, fixed the scope and gave the What's New page a real format to parse.
- Splitting off a self-contained page (What's New: three new files, no shared files) to a Sonnet subagent ran in parallel with the engine work and caused no conflicts.
- Handing photos from the hub to a tool through IndexedDB (`studio:quick:<brand>:<tool>`) plus `?quick=1` reuses the tool's own `setPhoto` and draft logic, so the photo is saved as a normal draft at once.
- A tap-target scan (every visible control under 44px at 390×844) found the real problems in one run.

**Didn't work / watch out**
- `node tests/*.mjs` failed with "Cannot find package 'playwright'": ESM ignores the global install. Link it into `node_modules/` (see the skill's Repo notes).
- The first Quick start design was a sideways scroller that hid Restock, the team's main job, off-screen. Put the most-used action first and make every option visible without scrolling.
- A page that does not load studio.js does not get the web fonts (the engine adds them from the brand kit). Neutral Studio pages must link Cairo + Lalezar themselves.
- Changing a shared class (`.done`) for tap size broke the phone Collage flow in `full.mjs`. Scope size fixes to one component and run full.mjs after any shared-CSS change.
- The skill text says `/archive` and 44px; this repo uses `_archive/` and 48px. Repo conventions win; noted in the skill.

**Process tweaks**
- `main` moved during the session (another branch merged Phase 3). Before merging: fetch `main`, merge it into the branch, bump `sw.js` past both cache names, re-run every suite, then fast-forward `main`.
- Keep the changelog format strict (`## version · date`, `### title`, note, `![before]`/`![after]`). The page parses it directly.
- Write a small Playwright test for every feature (`tests/whatsnew.mjs` is the pattern) and run it with the old suites before pushing.
