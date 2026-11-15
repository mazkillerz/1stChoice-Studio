# calspeed (Calendar polish and speed)

What's New card draft
- Title: A faster calendar
- Type line: Improved · Calendar
- Note: Week, Month and Feed now switch instantly, with a smooth slide and a moving highlight on the Week | Month | Feed control. Moving between weeks and months no longer waits for the internet; the calendar refreshes quietly in the background and only redraws when something changed.

New files for sw.js shell: none (feed.js / feed.css were already shipped; calendar.js now preloads them at idle).
tests/run.mjs MAP: `calspeed` added next to `calendar` (done in the branch).
README line: Calendar keeps the last 60 days to 120 days ahead in memory, so Week/Month/Feed and the arrows draw at once.
Lessons: build the frame (segmented pill, arrows) once and only swap the body; sample the DOM per frame in tests to catch overlap; localStorage keys through Studio's store are JSON-encoded.
Wording to approve: none.
