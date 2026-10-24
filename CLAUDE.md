# CLAUDE.md: read this first in every session

Studio is a phone-first story maker (static GitHub Pages site, no build step) for the owner's cold brew brand **1st Choice** (@1stchoice.om, Oman). It is **brand-agnostic**: everything brand-specific lives in `brands/<id>/brand.js` + that folder. `README.md` describes every tool and feature for people; this file is for you.

- Live: https://mazkillerz.github.io/1stChoice-Studio/ (Pages serves `main`)
- Owner's PC copy: `D:\AAAAAAAAAAAAAAAA\1stChoice Studio` (synced from the Claude chat, not from here)

## Code map
| Path | What |
| --- | --- |
| `assets/studio.js` | Engine: tools, layers, inspector, layers panel, guides, assets, undo/redo, drafts, save engine, hub |
| `assets/studio.css` | All shared UI (light + dark); the look (the "fresh look", default since 0.7.0) and the 0.7.0 hub/Saved/save-sheet blocks are at the end |
| `assets/search.js`, `assets/search.css` | Hub universal search; `home()` in studio.js feeds it (`searchEntries`, `searchShortcuts`) |
| `assets/cloud.js`, `assets/config.js` | Supabase: shared team login, saved designs, collections, private `studio` bucket |
| `tools/<id>.html` + `tools/<id>.js` | One pair per tool; a tool calls `Studio.tool({...})` with `draw(h,o)` |
| `brands/1stchoice/` | Brand kit: `brand.js` (fonts, colours, approved Arabic phrases, assets list, samples), logo, HD can cut-outs in `assets/` |
| `lab/` | Passcode area; `board*.js` = Board, the free canvas editor |
| `sw.js`, `manifest.webmanifest` | Installable app. Bump the cache version in `sw.js` whenever shipped files change |
| `tests/` | Playwright end-to-end suites (`full.mjs`, `lab.mjs`) with `fakecloud.js` standing in for Supabase |
| `_archive/` | Old files. Never delete anything: move it here |

## Hard rules
- **Never delete the owner's files.** Move replaced/unused files to `_archive/<what> (<date>)/`.
- **Save quality is sacred:** 1080×1920 canvas exported at 2× (2160×3840) as lossless PNG, fallback 2× → 1.5× → 1× with a message. Never lower it.
- **Brand-agnostic engine:** no 1st Choice names, colours or wording in `assets/` or `tools/`; put them in the brand kit.
- **Security:** never type passwords or create accounts. The owner creates logins in the Supabase dashboard. The publishable key in `config.js` is meant to be public (row-level security protects the data).
- Phone first: test at 390×844 (touch) and 1280×800. Targets ≥ 48px, safe areas respected, Arabic RTL correct in every input.

## Brand rules (1st Choice wording and images)
- Arabic is **casual Omani**. Use only phrases already in `brand.js`; if a new one is needed, list it for the owner to approve. Never invent.
- A can is **علبة** / your can **علبتك** / cans **علب** (since 20 Oct 2026; غرشة is out). Friend = **ربيع / ربيعي** (never خوي). Very = **واجد**.
- Flavours: **Classic** (كلاسيك) and **Passion fruit** (باشن فروت). Never "25+" for Passion. Never name the types of sale points.
- **No cheers / toasting / clinking; cans never touch.** No cat mascot unless asked. Always the HD can cut-outs.
- Main look is **White**; Cream is the second look. Never mix them on one design.

## Workflow
1. Work on a branch `claude/<topic>`; small commits that each work.
2. Run the tests before pushing: `npx http-server -p 8080 -c-1 .`, then `node tests/full.mjs` (and `tests/lab.mjs` when Board changes). Google Fonts failing inside a sandbox is a known false failure.
3. **Merge to `main` at the end of every session** once all tests pass (owner's standing instruction, 24 Oct 2026). Pages publishes `main` immediately, so never merge with a failing test. Big redesigns/experiments still ship behind a toggle (off by default) until the owner approves them.
4. End with a short list: what changed, what the owner must do, any wording that needs approval.

## Saving usage: split work across models
The owner wants the work divided by difficulty. Use subagents (Agent tool, `model` set) for the routine parts and keep the main model for decisions:
| Job | Who |
| --- | --- |
| Planning, architecture, UI/UX design, tricky bugs, final review of a change | Main model (you) |
| Writing a well-specified feature or tool from your plan, refactors | `sonnet` subagent |
| Finding code, listing files, grepping, running tests and reporting pass/fail, screenshots + short visual notes, README/changelog updates | `haiku` subagent |
Give each subagent a precise brief (files, expected result, rules above), and ask it for a short summary back, not file dumps. Run independent subagents in parallel.
- Read only the files you need; `studio.js` is large, so grep before reading it whole.
- Don't re-run the full test suite after every tiny change; run it before each push.
- Don't take screenshots unless checking a visual change.
