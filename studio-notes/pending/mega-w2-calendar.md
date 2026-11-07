# w2-calendar (plan 4.1), behind preview flag `team`

## What's New card draft
Title: Content calendar (preview)
Note: Plan your posts by week or month, link saved designs, set a status and drag a post to a new day. Turn on Team workflow in Settings > Previews.

## sw.js shell: new files
assets/calendar.js, assets/calendar.css

## run.mjs MAP rows
- /^assets\/calendar\.(js|css)$/ -> ['calendar','home7-hub','hub-offline']
- /^tests\/calendar\.mjs$/ is picked up by name ("suite changed").
(studio.js changes inside home() already map to the hub suites.)

## README lines
- Calendar (preview, Settings > Previews > Team workflow): Home gets a Calendar row ("Posting today: ..." when a post is due). Week list on phones (swipe or arrows, Month toggle, tap a day for its week), month grid on computers (drag a post to move it). Press and hold a post for Move to date, Change status, Edit, Delete.

## Notes
- Entry point: one quiet Home row under Saved (not a 4th bottom tab: the bar stays at 3 while this is a preview) + a hub-search action "Calendar". The Home tab stays lit on the calendar page.
- Old POSTED_LOG: no `POSTED_LOG` (or any posted log) exists in the repo code. assets/calendar.js reads, read-only and once per load, a list of {day|date, title|name|text} under localStorage keys POSTED_LOG, studio:postedLog, studio:posted, studio:posted-log and shows each as a posted item. Nothing is migrated or deleted. If the owner's PC copy used another key, add it to LEGACY_KEYS.
- Hashtags are stored with a leading "#" ("#cold"). 4.3 (captions) should read the same shape.
- New marks go to calendar_items only. Status "posted" is set via Change status or the edit sheet.
- No new flag; no cloud.js / fakecloud.js changes. Port 8085 was already taken by the w1-tokens server, so this was tested on 8095.
- Author: the StudioWho name; the edit sheet asks once per device (never under automation) when unset.
- No new Arabic wording shipped (test data only).
