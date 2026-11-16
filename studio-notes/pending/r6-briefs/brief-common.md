# Round 6 — common rules for every builder

You are a builder in an overnight improvement round of **Studio** (phone-first static web app, no build step, for the 1st Choice cold brew team).
The owner is asleep and gave full autonomy: make good decisions yourself, never stop to ask; note decisions in your pending file.

## Read first
- `CLAUDE.md` (hard rules + brand rules) and the **Repo notes** of `.claude/skills/studio-improver/SKILL.md` relevant to your area (grep it for your module names). Don't read all of it.
- `studio-notes/taste.md` first 60 lines (owner's taste: calm, clean, native-app feel, one blue button per state, 44–48px targets, RTL right).

## Your tree
- Work ONLY in your own worktree (given in your topic brief), on its branch. Never touch other worktrees, never `git stash`, never push, never merge.
- Serve your tree on your own port: `cd <tree> && npx http-server -p <port> -c-1 . >/dev/null 2>&1 &` and run suites with `BASE=http://127.0.0.1:<port>/`.
- Commit every working step (small commits, clear messages). End every commit message with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Do not bump `VERSION`, do not edit `sw.js`, `studio-notes/changelog.md`, or the skill: the lead owns those. Instead write `studio-notes/pending/r6-<topic>.md` with: what changed (plain words for a What's New card: title + 1–2 sentence note, type feature/improve/fix), new files that must go in the sw.js shell, new suites + the `tests/run.mjs` MAP rows they need, decisions you made, anything left.

## Rules
- The owner's notes are **examples, not limits**: find every place in Studio with the same problem and fix it there too.
- Every change must make Studio simpler and easier, never more confusing. Keep the current design language (tokens in the `:root` block of `assets/studio.css`, spacing 4-8-12-16-24-32, weights 400/500/600, Lucide-style icons). Improve, don't replace.
- Never delete files: move replaced files to `_archive/<what> (2026-11-16)/` and `git add -f` them (the folder is git-ignored).
- Hot shared files (`assets/studio.js`, `assets/studio.css`): edit only what your topic needs; when you append CSS, append inside a block marked `/* r6-<topic> */ … /* /r6-<topic> */` at the very END of studio.css. Mark JS hunks with a short `/* r6-<topic> */` comment.
- Never lower save quality, never change how saved designs are stored in a breaking way (new optional fields are fine), never touch Supabase (if you need a table or column, write the migration file in `supabase/migrations/` and say so; the lead applies it).
- Brand-agnostic engine: no 1st Choice words/colours in `assets/` or `tools/`.
- Phone first: check 390×844 touch, light AND dark, and 1280×800. Targets ≥ 44px (goal 48). Arabic: `dir="auto"` on text wrappers, numbers/times in `<bdi>`.
- Back/overlays: any new overlay that is not a `dialog()` must use `Studio.nav` (`push/drop/back`) — see the "Back stack" repo note.
- Tests: write `tests/r6-<topic>.mjs` (Playwright, reads `BASE`, phone 390×844 touch, uses `tests/fakecloud.js` like other suites — copy the setup pattern from a similar existing suite) that locks in each fix. Run your suite plus the existing suites for your area (test map in the skill's **Testing** section) with `JOBS=1 node tests/run.mjs <suite> <suite> …` . A suite that fails because of your change: fix the app or update the test if the old behaviour was intentionally changed (say so in the pending file). Google Fonts failing in the sandbox is a known false failure.
- Take at most a few screenshots, only to check your visual change (deviceScaleFactor 1). Kill your http-server when done.
- Report back in **under 250 words**: what you built, commits, suites run with pass/fail, anything the lead must do.
