# Pending: ideas2 (Ideas thread, archive, voice quality)

## What's New card draft
**Ideas: talk it through** · New + Improved
No more Inbox: a new idea goes straight onto the Board. Every idea now has a discussion, so the team can reply by text or voice, and an idea can hold many voice notes. A small dot shows an idea nobody has opened yet. Nothing is deleted any more: ideas, voice notes and replies move to Archive, and Restore brings them back. Voice notes are recorded at higher quality for clearer speech.

## Files
Changed: assets/ideas.js, assets/ideas.css, assets/cloud.js (ideas block + exports), tests/fakecloud.js, tests/ideas.mjs, tests/run.mjs (MAP: ideas + ideas-thread, HUB_SUITES).
New: supabase/migrations/20261115120000_ideas_thread.sql (NOT applied; lead applies), tests/ideas-thread.mjs. No new shell files for sw.js.

## For the lead
- Apply the migration (it also moves stage 'inbox' to 'idea'; the UI already shows old 'inbox' rows as 'idea').
- Until it is applied: reads give [], replies/archive say "This switches on once the owner updates the database."; no dots.
- Cloud API added: ideaNotes, addIdeaNote, archiveIdeaNote, restoreIdeaNote, archivedIdeas, archiveIdea, restoreIdea, markIdeaSeen, archiveIdeaVoice. deleteIdea now archives (no file removal).
- Shell: ideas.js adds class `is-shell` on its pane; the shell's pane padding wins over `.ideas-view` padding. `.chip[aria-pressed]` re-pop animation is off inside Ideas (the board redraws on tap and Playwright never saw the chip as stable).
- README line: "Ideas: one Board, a discussion on each idea (text and voice), Archive with Restore."
- Lesson: a stage/chip that redraws on tap must not carry a pop animation (taps wait for "stable").

## Voice note quality: owner must try on a real phone
The sandbox has no microphone, so only the settings are tested (stubbed getUserMedia/MediaRecorder).
Settings: mono, 48 kHz, 16 bit, noise suppression on, auto gain on, echo cancellation off. Android Chrome: Opus (webm) at 96 kbit/s. iPhone Safari: AAC (mp4) at 128 kbit/s. Data every second; 2-minute cap; no re-encoding.
Check: record a 20 s note in a quiet room and in a noisy one on an Android phone and on an iPhone, add it as a reply, play it back on another phone. Speech should be clear, not tinny or pumping. Expected size: about 0.7 MB per minute (Opus), about 1 MB per minute (AAC); a full 2-minute note is about 1.4 MB or 2 MB. If a phone sounds worse, tell me which one and what it sounded like.

## Wording to approve
"Move this voice note to the archive?" / "You can restore it any time from Archive." / buttons "Move to archive", "Keep it"; "Move this idea to the archive?"; "Capture an idea in a few seconds. It lands here, ready to plan."; "No replies yet. Write one, or leave a voice note."
