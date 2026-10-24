# Lessons

What worked, what failed, and process tweaks. Newest session first.

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
