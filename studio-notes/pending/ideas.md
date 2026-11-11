# Ideas (2.4.0, preview flag "plan")

## What's New card draft
Title: A home for every idea
type: feature
Catch an idea in seconds: type it, paste a link, add a screenshot or record a voice note (up to 2 minutes, the whole team can play it). New ideas land in the Inbox; sort them later onto the Board (Idea, Planned, In progress, Posted) by Reel, Post, Story or Giveaway, and link each one to a design and a calendar slot.

## README lines
- Ideas: Inbox + Board, quick capture (text, link, picture, voice note), filters and search, link an idea to a design and the calendar. Computer: drag cards between columns.

## Lessons
- Never put `data-new` on a button in the hub: studio.js has a global handler that opens the + menu for it (Ideas uses `data-idea-new`).
- Ideas page needs calendar.css loaded for `.plan-tabs` (lead owns it); ideas.css does not style the tabs.
- Tests use Chromium's fake microphone (`--use-fake-device-for-media-stream`) so the real MediaRecorder runs end to end.
- Wording invented (owner to approve): "Inbox is clear", "Your board is empty", "Saved to your inbox.", "Moved to the board.", "What's the idea?", "Save to inbox".
