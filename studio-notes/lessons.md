# Lessons

What worked, what failed, and process tweaks. Newest session first.

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
