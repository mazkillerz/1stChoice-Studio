# Round 5 (15 Nov 2026): 15 sessions, one prompt

Owner's sessions 1–6, then 7–15 chosen by the lead. Lead = main model (plans, Plan shell, reviews, merges, releases); builders = sonnet subagents in worktrees (`/home/user/studio-<topic>`, ports 8081–8084); integration copy `/home/user/studio-int` (:8090) so release tests never run on a tree that is being edited.

| # | Version | What | Who |
|---|---|---|---|
| 1 | 2.18.0 | Calendar · Ideas · Goals as one page with swipeable top tabs (`swipeTabs()`, `#planView`), floating strip removed, panes kept drawn | lead |
| 2 | 2.19.0 | Calendar: one cached window (−60…+120 days), instant Week/Month/Feed + arrows, sliding pill, clean fade, feed preloaded | builder calspeed |
| 6 | 2.19.1 | What's New one level: open latest, one-tap rows, Jump to + All versions | builder whatsnew1 |
| 3 | 2.20.0 | Ideas: no inbox, "new" dot, discussion thread (text + voice), archive with restore (migration `20261115120000_ideas_thread.sql`, applied) | builder ideas2 |
| 4 | 2.20.1 | Voice notes: 48 kHz mono, NS + AGC on, EC off, Opus 96k / AAC 128k | builder ideas2 |
| 5 | 2.21.0 | Tools always a list, "+ Idea" tile gone; New Home preview (flag `home2`) | builder home2 |

## Sessions 7–15, ranked by impact (lead's choice)
1. **7 · 2.22.0 Instant Plan** — Calendar, Ideas and Goals paint from the last data at once (this device, offline too); the shell never shows a loading state on a second visit. Why: speed is the owner's top ask, and the Plan page is now a daily screen.
2. **8 · 2.23.0 Ideas: discussion first + unread** — the idea sheet opens on the idea and its thread (editing behind one tap), and "N new" replies/ideas since your last visit show on the Ideas tab and cards. Why: the thread only works if people see replies.
3. **9 · 2.24.0 Search finds ideas and planned posts** — Studio's search lists matching ideas and calendar posts. Why: one search box for everything was a loved feature.
4. **10 · 2.25.0 Simplify** — pattern review; leftovers of the old strip and the interim shell CSS; page headers consistent across Saved / Templates / Plan; full sweep, contrast, tapscan.
5. **11 · 2.26.0 Faster start** — measure Home's cold start on a slow phone network and cut what blocks it (scripts not needed for the first paint, old font preconnects, early plan code).
6. **12 · 2.27.0 Voice playback** — play speed (1×, 1.5×, 2×), seek by tapping the bar, one player at a time across the thread. Why: long voice notes are the team's main way to discuss.
7. **13 · 2.28.0 Today stays fresh** — Home's Today/Calendar row refresh when you come back to Studio (visibility) and after posting, without flicker.
8. **14 · 2.29.0 Polish pass** — shots of every changed screen at 390/360/1280 in both themes and Arabic; fix what looks average.
9. **15 · 2.30.0 Simplify + full sweep** — the round's second Simplify, skill upgrade, final summary.
