# board-assets (backlog #66, first part)
**What's New card**: title "Team assets in Board", type: feature. Board's Assets > Brand now starts with a Team assets button: the same library as on the tool pages. Tap a logo or cut-out and it lands in the middle of your frame at a sensible size (up to 40% of the frame). It stays linked to the team file, so undo, copies and reopening the board all keep it. Taps: Assets > Brand > Team assets > the picture = 4 (was: save the picture, upload it, 4+ and no sharing).
Shots: assets/whatsnew/board-assets-before.jpg / -after.jpg
**sw.js shell**: no new files (lab/board.js, lab/board-ui.js changed; tests/board-assets.mjs not shipped).
**run.mjs**: added 'board-assets' to the `^lab/` MAP row (done in the branch).
**README**: Board > Assets > Brand: "Team assets" opens the shared picker; picks are image layers (ref team:<id>, path), re-fetched from their file on reopen (needs sign-in; signed out the picture is blank until the team login is back). Board file export skips team pictures (they are not embedded).
**Lessons**: never `git checkout -- .` in a worktree with uncommitted work. A Konva `name` attr is a class list, so use `label` for names.
**Wording to approve**: "Team assets", "Logos and cut-outs the team shares." (UI text only, not in pictures).
