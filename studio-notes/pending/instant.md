# Session 7: Instant Plan (Calendar + Goals)

## What's New card draft
Title: Calendar and Goals open instantly
Type line: Faster
Note: Calendar and Goals now show what you saw last time the moment you open them, then update quietly in the background. Offline, they still show your last data with a small "Updated 5 min ago" line. Nothing flickers when nothing changed.

## sw.js shell
No new files (assets/calendar.js, calendar.css, kpis.js, kpis.css changed).

## Tests
tests/instantplan.mjs (75 checks). run.mjs MAP: calendar and kpis rows now include instantplan.
tests/kpis.mjs: added a 150 ms settle before filling the numbers sheet (the sheet focuses Reach after 60 ms; Playwright fill raced it).

## For the lead
- Cache keys: studio:plan:cal:<brand> = {v:1,at,from,to,items,designs(slim)}; studio:plan:kpi:<brand> = {v:1,at,month,rows,cal(slim),ideas(slim giveaways)}.
- Search jump: api.show({day:'YYYY-MM-DD'}) on the object init() returns (also StudioCalendar.api()). Feed mode switches to Week.
- tests/post-now.mjs fails "Home: Post pill >= 44px" on the untouched base too (pre-existing).

## Lessons
- A cached paint means state is "ok" before lazy scripts load: the Feed view needs feed.js, so draw shows the skeleton only until it arrives.
