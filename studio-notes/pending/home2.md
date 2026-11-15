# home2 (Home restructure, Session 5)

## What's New card draft (2.21.0)
### A calmer Home
type: Improvement
Your tools are always a list now (the grid view and its switch are gone), and Home's Ideas and Goals are two equal tiles; add an idea from the + button. New in Previews: **New Home** — a slim header, search first, then Today: Calendar, Ideas and Goals as swipeable tabs, and a compact tools list.
before: assets/whatsnew/2.21.0-home-before.jpg
after: assets/whatsnew/2.21.0-home-after.jpg

## New files for the sw.js shell
None. (assets/whatsnew/2.21.0-home-after.jpg goes with the What's New images; `_archive/tools-grid (2026-11-15)/grid.css` is archive only.)

## tests/run.mjs MAP
Added by me: `[/assets\/studio\.(js|css)|index\.html/,['home2']]`. tests/simplify45 now asserts the grid view is gone (no toolsView/view-grid).

## README lines
- Home: your tools are a list (no grid). Settings → Previews → New Home: slim header, search, Today (Calendar | Ideas | Goals tabs), compact tools.

## Lessons
- Home's entrance animations swap from lk-rise to rise when body.hub-first is removed, which replays them about a second later; with home2 on, Home animations are off.
- The in-season occasion banner (pack banner) is inserted after an await in home(), so it can still shift Home once; with home2 on it sits under Today.
- A swipeTabs bar inside a hidden (display:none) section works: its ResizeObserver places the underline when the section is shown.
- dir="auto" ignores children that carry their own dir; set dir on the wrapper from the first strong letter when sibling lines must follow the title.
- tests/calendar.mjs "one compact header block" FAILS on the base (9112ba1) too (h:120): lead's Plan shell, not home2.

## Wording that needs the owner's approval
Today, Calendar, Ideas, Goals (tab names); "Nothing planned for today", "Plan a post", "Open calendar", "No ideas yet. Tap + to add one.", "Open ideas", "Set this month’s goals", "Open goals", "Any time", "x of y", flag "New Home" and its sub line.

## For the lead to wire
VERSION/sw.js/changelog/notes. The flag stays in FLAGS until approved; the "new" dot on ideas needs an ideas.seen_at column (no dot while the field is missing).
