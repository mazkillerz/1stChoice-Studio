# reminders (Studio 2.11.0, backlog #67)

## What's New card draft
- Title: Reminders for planned posts
- type: feature
- Turn on Settings → "Remind me about planned posts" and Studio shows a badge with how many posts are planned for today. While Studio is open it also tells you 15 minutes before each planned time, with a Post button that opens Post now. It is off by default and set per phone. Nothing is sent from a server, so it only works while Studio is open on that phone.
- Shots: assets/whatsnew/reminders-before.jpg / reminders-after.jpg (Settings).

## New shipped files for the sw.js shell
- assets/remind.js (lazy; assets/studio.css gained a small `.remind-bar` block at the end)
- sw.js: ONLY a marked `notificationclick` block was appended at the end (builder-added; VERSION and shell list untouched). Lead: bump VERSION as usual.

## run.mjs
- MAP: `[/assets\/remind\.js|assets\/studio\.js|sw\.js/,['reminders']]`; HUB_SUITES += 'reminders'.

## README lines
- Settings: "Remind me about planned posts" (per device, off by default): app badge with today's not-posted count, an in-app note 15 min before a planned time (or up to 2 h late when opened), and a system notification if allowed. Search: "Turn on post reminders".

## Lessons
- Ports: 8081 was already held by another server; used 8091. 
- The test hook `window.__remindSpeed` only shrinks the wait; do not use it in production.
- A browser cannot notify when Studio is closed without a push server; this is in-app + badge only.

## Wording for owner approval (UI text, not in pictures)
- "Remind me about planned posts", "A badge and a note before today’s planned posts", "<title> is planned for <time>", "Notifications are blocked in the browser. You still get the badge and notes in Studio."
