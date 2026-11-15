# Post now (2.8.0)

## What's New card draft
- Title: Post it now
- type: feature
- Text: A planned post can now go out in three taps. On Home, tap Post on today's item, tap Share picture (the caption is copied for you, and the picture is the same full-quality one as Save), then tap Mark as posted once it is on Instagram. The same Post now sheet is the first row of any calendar item's ⋯ menu. On a computer it downloads the picture instead (several pages come as one ZIP).
- Taps before: open calendar, open the item, find the design in Saved, open it, Save, share, go back for the caption and copy it, back to the calendar, ⋯, Mark as posted (about 10+). After: Home Post, Share picture, Mark as posted = 3.
- Images: assets/whatsnew/post-now-before.jpg (old item menu), post-now-after.jpg (Post now sheet).

## New shipped files for the sw.js shell
None new (assets/calendar.js, assets/calendar.css, assets/studio.js, assets/studio.css changed; assets/render.js and assets/batch.js are lazy-loaded as before).

## tests/run.mjs rows added
- MAP: `[/assets\/studio\.js|assets\/calendar\./,['post-now']]` and `post-now` added to the calendar/captions/campaigns row.
- HUB_SUITES: `post-now` (after `calendar`). TOOL_SUITES: none.

## README lines
- Calendar: ⋯ menu starts with Post now (unposted items with a design or caption): picture + caption + Share picture, then Mark as posted / Not yet.
- Home: the calendar row shows a small Post button when today's next item has a design.

## Notes / lessons
- Home cache `studio:home:plan:<brand>` today[] items now also carry `id`, `day`, `dz` (1 when a design is linked). Old caches without them just show no Post button.
- `StudioCalendar.postNow({id,day})` loads its own item/designs/thumbnails, so Home does not need the calendar page open. `onPosted` in the init options lets Home refresh its row.
- A shared box: the Home row button and its pill live in `.cal-home-line` (position:relative) so the pill sits inside the button's edges.
- Share needs a fresh tap after a slow draw on a phone: the drawn files are kept, a second tap on Share picture shares at once.
- Only cloud write: the status via the same `saveCalendarItem` path as the menu's Mark as posted. Designs are never touched.

## Wording needing owner approval
All wording is app UI, none lands in a picture: "Post now", "Share picture", "Caption copied: paste it in Instagram", "Did you post it?", "Mark as posted", "Not yet", "Post" (Home pill), error notes ("The picture could not be made. The caption is copied, so you can still paste it in Instagram.", "Not shared yet. Tap Share picture when you are ready.").
