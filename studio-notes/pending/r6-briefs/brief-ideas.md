# Topic: ideas — Part 4 (voice notes player) + Part 5 (Ideas tab restructure)
Tree: `/home/user/studio-ideas` (branch `claude/r6-ideas`), port **8082**. Read `brief-common.md` in this folder first.
You own `assets/ideas.js`, `assets/ideas.css` (and the matching tests). Avoid `studio.js` unless unavoidable (then a marked small hunk).
Skill notes to read: "Ideas (2.20–2.23, 2.28)", "Plan page" (ctx.shell contract: no own Back/title/tabs inside the Plan shell, pane scrolls itself, no horizontal swipe gestures), "Plan caches".

## Part 4 — Voice notes player (owner's words)
"While a voice note plays, the waveform disappears and the time stays at 0:00. You can't seek forward or back. Rebuild the player: visible waveform with progress while playing, running time, tap or drag to seek, and skip back/forward buttons. Works the same on every voice note, including replies."
- Find every voice player in Studio (the idea's own voice note, replies in the thread, the composer's preview before sending, Home/Today if any, search results). One shared player component used everywhere.
- Waveform: computed from the audio (decode with `AudioContext.decodeAudioData` once, ~40–56 bars, cached per URL/path in memory) with a fallback of a stable pseudo-waveform from the id when decoding fails. The played part is accent-coloured, the rest muted; the waveform stays visible while playing (current bug: it disappears).
- Running time: `0:07 / 0:32` (or remaining) updating with `requestAnimationFrame` while playing; correct duration even for WebM/Opus files that report `Infinity` duration (known Chrome issue: seek to a huge time once to get the real duration, or use `audio_secs` stored with the note).
- Seek: tap anywhere on the waveform jumps there; drag scrubs (pointer events with capture, works with touch, does not scroll the pane while dragging horizontally: `touch-action: pan-y` on the wave). Skip back 5 s / forward 5 s buttons (44px targets, labelled). Keep: speed button (`studio:voiceRate`), one player at a time, continuation rule (same author ≤ 3 min).
- Play/pause button 44px+, accessible (`aria-label`, `role="slider"` on the waveform with aria-valuenow/valuetext and arrow keys).
- Light + dark, RTL-safe (the waveform progresses left→right always, like WhatsApp; the time in `<bdi>`).

## Part 5 — Ideas tab restructure (owner's words)
"Too many stacked bars: Calendar/Ideas/Goals tabs, search plus New, a type row (Reel/Post/Story/Giveaway), then stage tabs (Idea/Planned/In progress/Posted). It looks bad, and the search UI is broken.
- Make type just a tag on each idea card, not a filter row.
- Keep one row only: the stage tabs.
- Search becomes a small icon that expands into a clean search field (it can also match types, e.g. typing 'reel').
- Remove the separate 'New' button; the main plus button handles new ideas."
- So under the Plan tabs (Calendar · Ideas · Goals) there is exactly ONE row: the stage tabs (Idea / Planned / In progress / Posted with counts) plus a small search icon button at its end. Tapping search expands a clean search field in place of (or over) that row with a close ×; Escape/Back closes it (use `Studio.nav` / ctx nav if available — check how ideas.js handles Back today). Search matches title, note and type words (e.g. "reel", "giveaway", Arabic via `Studio.normText`).
- Type: a small tag on each card (keep the existing type colours/icons if any). Remove the type filter row (`id-types`) entirely, and the `New` button (`data-idea-new`). New ideas come from the main + button (the hub fab's "New idea" exists already: make sure the + on the Plan page / Ideas pane opens New idea directly or offers it first — check `newIdea()` in studio.js and the fab on plan views; if the + on the Ideas pane opens the general menu, make it open the New idea sheet directly when the Ideas tab is current; this may need a tiny marked hunk in studio.js).
- Empty state text currently says "Tap New…": update it to point at the + button.
- Wide (desktop) columns view: same rule (no type row; search icon in the header row).
- Apply the same "too many stacked bars" rule to the **Calendar** and **Goals** panes: if they stack more than one control row under the Plan tabs, simplify the same way (but calendar.js/kpis.js are other files — only change them if clearly needed and small; note it).
- Check the Idea sheet (opened idea) for the same clutter.

## Tests
`tests/r6-ideas.mjs`: one control row under the tabs; no `.id-types`, no `[data-idea-new]`; type tag on cards; search icon expands, typing "reel" filters to reel ideas, × closes; player: play → waveform still visible, time advances past 0:00, tap at 75% seeks (currentTime ≈ 0.75×duration), skip ±5 s works, same on a reply. Use a generated WAV/Opus blob in fakecloud (see how `tests/voiceplay.mjs` does it). Then run: `ideas ideas-thread ideas-unread voiceplay plantabs instantplan search-plan calendar kpis`.
