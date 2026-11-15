# remover-pick (backlog #65, Studio 2.12.0)

## What's New card
- Title: Pick the background colour
- type: improve
- Text: When the background remover gets a photo of a printed logo wrong (a shadow, a gradient, a coloured frame), tap "Pick the background" and then tap the background on the picture. The cut-out redraws at once. Pick up to 3 colours (a swatch for each, tap x to drop one), tap inside a letter like O to clear it, and Reset goes back to automatic.
- Shots: assets/whatsnew/remover-pick-before.jpg / remover-pick-after.jpg (Team assets > Add > Logo).
- Taps: before, no way to fix a wrong estimate (move the Strength slider and hope); after, 3 taps (Pick the background, tap the picture).

## sw.js shell
No new files. Changed: assets/cutout-pro.js, assets/cutout-pro-worker.js, assets/teamassets.js, assets/teamassets.css (cache version bump only).

## tests/run.mjs
MAP: `assets/teamassets.|assets/cutout-pro` -> + `cutout-pick`; new row `tests/fixtures/cutout/|tests/cutout-pick` -> `['cutout-pick','cutout-pro']`. Not a tool page, so nothing in TOOL_SUITES/HUB_SUITES.

## README lines
- Team assets, Logo remover: "Pick the background": tap the background on the preview (up to 3 colours, x to remove, Reset for automatic); tap inside a letter to clear it.
- Dev: `StudioCutoutPro.run(src,{mode:'logo',ground:[r,g,b] | [[r,g,b],..up to 3],seeds:[[fx,fy],..]})`; automatic output unchanged when no ground is given; ground with mode auto runs logo mode.

## Lessons
- While the pick toggle is on the preview is the untrimmed result, so a tap maps straight to the source by fraction; trim again on toggle off and on Next.
- Fixtures where automatic fails: framed (frame is the border), threeTone (3 horizontal bands, auto models only 2), plug (small holes in thick ink are kept as design). Three vertical bands are NOT a failure for auto.
- `.ta-opts` children need `flex:none`, or the hint and swatch row overlap when the body is taller than the screen.

## Wording needing owner approval
None: "Pick the background", "Tap the background on the picture.", "Up to 3 colours. Remove one to pick another.", "Reset" are UI text, not in pictures.
