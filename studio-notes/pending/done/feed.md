# Pending: feed (2.9.0)

## What's New card
- Title: See your Instagram grid before you post
- type: feature
- Text: The Calendar has a new Feed choice next to Week and Month. It shows your planned and posted posts and reels as a 3-column grid, newest first, like your profile. Planned ones carry their date; tap any tile to edit it. Stories are left out.
- Shots: assets/whatsnew/feed-before.jpg / feed-after.jpg
- Taps: Home > Calendar > Feed (3 taps; the choice is remembered on the device).

## New shipped files for the sw.js shell
assets/feed.js, assets/feed.css, assets/whatsnew/feed-before.jpg, assets/whatsnew/feed-after.jpg (assets/calendar.js changed, bump the cache)

## tests/run.mjs rows
- MAP: `[/assets\/feed\./,['feed','calendar']]`
- HUB_SUITES: added `feed`
- taste.mjs has no calendar screen, so no `feed` screen was added there.

## README lines
- Calendar > Feed: a profile-style 3-column grid (tiles 3:4) of posts and reels from 60 days back to 90 days ahead, newest top-left; planned tiles show a date badge; tap to edit. No reordering yet.

## Lessons
- `document.currentScript` is null once a script's top-level has finished: read it at the top of the IIFE (calendar.js FEEDBASE), not inside make().

## Follow-ups
- Reordering tiles / drag to rearrange the planned order (not in this version).
- Stories could show as a row of rings above the grid.

## Wording needing owner approval
- "Profile preview" (title in the bar), "Nothing planned for your feed yet", "Add a post or a reel and it shows up here, like on your profile.", "Add a post" (interface text only, not in pictures).
