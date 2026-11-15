# Round 4: ten sessions (2.8.0 → 2.17.0), started 15 Nov 2026

Owner: "Improve studio 10 sessions with a big simplify session pls". Lead = main model (plans, reviews, merges, owns VERSION, sw.js, changelog, notes, skill). Builders = sonnet subagents in their own worktrees (`/home/user/studio-<topic>`, branch `claude/<topic>`, own port), at most 3 at once.

| Release | Type | Work | Branch |
|---|---|---|---|
| 2.8.0 | team | **Post it now**: from a planned post (Home's today row, the calendar item menu) one sheet shares the picture + copies the caption, then Mark as posted | `claude/post-now` |
| 2.9.0 | Mazoon | **Feed preview**: Calendar gets a Feed view: the Instagram 3-column profile grid with planned posts (dated) before the posted ones | `claude/feed` |
| 2.10.0 | **BIG Simplify** | Pattern review, sheet heights + tap counts at 390, cuts, dead code, run.mjs mapping fix, split slow suites, full sweep + contrast + tapscan | lead + `claude/simplify210` |
| 2.11.0 | team | **Reminders**: app-icon badge with today's posts, a reminder when Studio opens near a planned time (Settings switch) | `claude/reminders` |
| 2.12.0 | Mazoon | **Remover: tap the ground colour** (backlog #65) | `claude/remover-pick` |
| 2.13.0 | team | Campaign Save all asks for one collection (#64); queued stories get distinct names (· 2, · 3) | `claude/team-fixes` |
| 2.14.0 | Mazoon | **Team assets in Board** (#66) | `claude/board-assets` |
| 2.15.0 | Simplify | Video and Board save sheets on the shared Save pieces (#70), pattern review, full sweep | `claude/simplify215` |
| 2.16.0 | team | **Saved search finds the words inside a design** | `claude/saved-words` |
| 2.17.0 | Mazoon | **Brand kit page** (read-only: colours, fonts, phrases, logos, copy hex) in Settings, a step to #69 | `claude/brandpage` |

Merge order follows the version order; small branches finished early wait for their number.
