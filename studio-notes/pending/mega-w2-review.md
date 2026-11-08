# w2-review (plan 4.2): approvals and comments, behind preview flag `team`

## What's New card draft
Title: Reviews and comments (preview)
Note: Send a saved design for review; the owner approves it or asks for changes, and anyone can pin a note to a spot on the picture.
Approved designs join an "Approved" collection and the creator sees the result on Home.

## New shipped files for the sw.js shell
assets/review.js, assets/review.css

## run.mjs MAP rows
review: assets/review.js, assets/review.css, assets/studio.js (home hooks), tests/review.mjs

## README lines
- Reviews (Experimental, "team" preview): Saved menu / Save sheet "Send for review"; the owner's Home row "N waiting for your review"; Approve or Ask for changes; numbered pins and notes ("Comments" in a design's menu); Approved collection; status chips on cards; a one-time Home note for the creator.

## Notes
- Hooks in studio.js (all marked "review (mega)"): svCard chip, paint() -> rvHome(), design menu rows + rvAct, Save sheet button #rvSend + rvSaved(). Flag off: no chip, row, button, file request.
- Calendar items linked to the design follow via the cloud API directly (draft -> in review -> approved; changes -> back to draft), not through calendar.js (no hook exists).
- Owner = StudioWho owner switch (localStorage studio:who); the creator note matches the design's `author` to the device's name and is remembered per change in `studio:rvSeen:<id>`.
- The big picture is the saved cover (thumb), not a fresh render.
- No new Arabic wording. No new flag. cloud.js / fakecloud.js untouched.
