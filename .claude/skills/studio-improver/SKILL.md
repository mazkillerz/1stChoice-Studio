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

Everything else in this skill can be rewritten by the skill itself.

## Repo notes (how this skill maps onto this repo; added by the skill, editable)

- **Read `CLAUDE.md` first.** Its hard rules and brand rules apply on top of this skill.
- **Archive folder:** in this repo `/archive` means `_archive/<what> (<date>)/` (CLAUDE.md). `_archive/` is in `.gitignore`, so add moved files with `git add -f`.
- **Tap targets:** CLAUDE.md asks for 48px (`--tap`). Treat 44px as the absolute floor, 48px as the goal.
- **Branches and merging:** work on the session's assigned branch (or `claude/<topic>`), then **merge to `main` at the end of every session** once every test passes (Mazoon's standing instruction, 24 Oct 2026: "Merge always"). Pages publishes `main` immediately. Because everything merges, big redesigns or experiments ship behind a toggle that is off by default (locked core rule 3) until Mazoon approves them.
- **Version:** `VERSION` at the top of `assets/studio.js` (shown on the hub and used for the What's New dot). Also bump the cache name in `sw.js` whenever shipped files change.
- **What's New:** `whats-new.html` + `assets/whatsnew.js/.css` read `studio-notes/changelog.md` directly (format in that file's intro). Screenshots go in `assets/whatsnew/<version>-<name>-before|after.jpg`, 390px-wide phone crops at 2×, JPEG quality ~72 (keep each under ~80 KB). Take the "before" shots **before** changing anything.
- **Tests:** `npx http-server -p 8080 -c-1 .`, then `node tests/full.mjs`, `v5.mjs`, `create.mjs`, `extra.mjs`, `whatsnew.mjs`, `highlight.mjs` (and `lab.mjs` / `lab-pro.mjs` when Board changes). In a cloud sandbox Playwright is global: if ESM can't find it, link it: `mkdir -p node_modules && ln -s /opt/node-tools/node_modules/playwright node_modules/ && ln -s /opt/node-tools/node_modules/playwright-core node_modules/` (node_modules is git-ignored).
- **Audit + screenshot helpers:** `node tests/tapscan.mjs tools/a.html,tools/b.html` lists every control under 44px per sheet; `node tests/shot.mjs <page> <sheet|-> <out.jpg> [selector]` takes the What's New phone shots. Add `tests/<feature>.mjs` for each feature and to the suite list above.
- **New paged tools** (a set of covers, slides…): use `pages`, `pagePhotos` and `pageNoun` in `Studio.tool` instead of new engine code; the hub list is `TOOLS` in `studio.js`, its thumbnails are `assets/thumbs/<brand>/<id>.jpg` + `-sm.jpg` (320×569), and both tool files go in the `sw.js` shell.
- **Wording in test data:** anything a test types that can end up in a shipped image (thumbnails, screenshots) must be an approved phrase from `brand.js`.
- **Model split:** CLAUDE.md asks for routine building to go to a `sonnet` subagent with a precise brief, and lookups/test runs to `haiku`. Give a subagent files that nobody else is editing at the same time.

## Design system

- Studio has its own neutral look, not tied to any one brand. It should be able to grow beyond 1st Choice.
- Keep the design tokens (colours, fonts, spacing, radius, shadows) in a single file and use them everywhere. In this repo that file is the `:root` block at the top of `assets/studio.css` (light + dark). New pages link `studio.css` and use only those tokens.
- You're free to experiment with new UI/UX ideas, like motion, gestures, layouts and micro-interactions, as long as big experiments follow the preview rule.

## Session loop

1. **Load context.** Read `studio-notes/backlog.md`, `studio-notes/lessons.md` and the latest entry in the changelog.
2. **Audit.** Do a mobile-first UX audit of the live site using the checklist below. Add any findings to the backlog. (A quick Playwright script that lists every visible control under 44px at 390×844 finds most tap-target problems in seconds.)
3. **Pick work.** Choose one UI/UX improvement plus one feature. Alternate the feature each session (the last session's type is at the top of `backlog.md`):
   - Team session: speed up restock photos and other team workflows, and make it easier for the team to adopt more tools.
   - Mazoon session: power tools like post makers, story makers, highlight covers, and anything else useful.
4. **Build.** Keep the scope small enough to finish and test in one session.
5. **Quality gates.**
   - Everything that worked before still works.
   - It looks right and works well at phone size, then at desktop size.
   - Saved designs in Supabase still load, save and delete correctly.
   - Nothing loads noticeably slower than before.
6. **Release.** Bump the version, update the What's New page, then commit, push and merge to `main` (see Repo notes).
7. **Reflect and self-improve.** Record what worked and what didn't in `lessons.md`. Add new ideas to the backlog. Edit this skill to work better next time, without touching the locked core.

## Mobile-first UX checklist

- Tap targets are at least 44px, and the main actions can be reached with one thumb.
- Pages load fast on mobile data, with compressed images and lazy loading.
- Loading, empty and error states are clear and friendly.
- Text contrast is readable, and labels make sense without explanation.
- The number of taps needed for common jobs keeps going down, especially for restock photos.
- Exports come out at the correct Instagram sizes (post 1080×1350, story 1080×1920, highlight cover).
- Animations feel smooth and never get in the way.

## Feature engine

- Study tools like Canva, Instagram's editor, CapCut and Unfold for ideas.
- Rank ideas by team impact, Mazoon's impact, effort and how much they wow.
- Starting idea pool: one-tap restock templates, post maker, highlight cover maker, carousel maker, brand kits for multiple brands, text styles, stickers, background removal, batch export, template collections and search.

## Versioning and What's New

- Use semantic versions starting at 0.1.0. Fixes bump the last number (0.1.1), features bump the middle number (0.2.0), and 1.0.0 is for when Studio feels complete.
- The What's New page lives inside Studio and must look beautiful. Each version gets cards with a title, a short note and before/after screenshots. Show a badge on the icon when there's something new.

## Memory files

- `studio-notes/backlog.md`: ranked ideas and bugs.
- `studio-notes/lessons.md`: what worked, what failed and process tweaks.
- `studio-notes/changelog.md`: the source for the What's New page.
