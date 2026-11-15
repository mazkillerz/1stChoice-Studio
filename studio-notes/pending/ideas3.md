# ideas3 (Sessions 7 + 8 for Ideas)

## What's New card draft
**Ideas open on the conversation** · Improved
Tap an idea and you see the idea itself and the discussion straight away, with the reply bar waiting at the bottom. Editing is one "Edit" button away. Ideas with replies you have not read show a small "2 new" tag, and Ideas now appear instantly the second time you open them, even with no signal.

## Lead to wire
- `planCtx('ideas')`: pass `onUnread:n=>...` to show a badge on the Ideas tab (called with the number of ideas that have something new for this device; first call after the first paint, then only when it changes).
- `api.open(id)` is exposed (waits for the load if the idea is not loaded yet; call `show()` first or not, it works either way).
- No new shipped files (ideas.js / ideas.css only). New suite: `tests/ideas-unread.mjs` (already in run.mjs MAP and HUB_SUITES).

## README lines
- Idea sheet: reads first (idea, then discussion, reply bar pinned); Edit button for the form; stage chips change the stage in one tap.
- "N new" pill = replies from others since you last opened the idea on this device (`studio:ideas:seen:<brand>`, 300 ideas max).
- Instant Plan: Ideas keep their last data on the device (`studio:plan:ideas:<brand>`, up to 200 ideas / 600 replies); offline shows "Updated 5 min ago"; signing out clears it.

## Lessons
- Tests that reload the same URL with only a hash change do not reload: go through about:blank.
- A cached paint must seed `lastSig` or the first refresh redraws everything; keep stored lists in their original order or the signature differs.
- innerText of an inline-flex pill has newlines between children: match with \s.

## Wording to approve
"Edit", "Cancel", "N new", "Updated 5 min ago", "Discussion" (existing). No Arabic added.
