# r3-extras: more backgrounds, calendar picker on All

## What's New card (draft)
Title: More backgrounds
Type: New
Eight new finishes join Plain, Fade, Glow, Dots, Lines and Grain: Sweep, Spot and Mesh gradients, Grid, Waves and Rings patterns, and Paper and Linen textures. They sit in three small rows (Gradients, Patterns, Textures) you can swipe. Pick Soft, Medium or Strong to set how loud a finish is. In the calendar, Link designs now opens on All your saved designs, with a count on All, Stories and Posts.

## sw.js shell
No new files (all edits are in existing files: assets/studio.js, assets/studio.css, assets/calendar.js, assets/calendar.css, tools/*.js).

## tests/run.mjs MAP
- assets/studio.js groundFx / groundField, tools/{restock,photo-story,carousel,cinematic,offer,collage,new-place}.js -> backgrounds.mjs, restock-styles.mjs, photostory-styles.mjs, draw-edges.mjs, smoke.mjs
- assets/calendar.js, assets/calendar.css -> calendar.mjs

## Notes
- Engine: `groundFx(ctx,kind,color,W,H,strength)`; `h.ground(color,kind,strength)`. Strength soft .6 / medium 1 / strong 1.6 multiplies the alpha; Medium and a missing value are the exact old drawing (backgrounds.mjs compares hashes taken before the change). Gradients (sweep, spot, mesh) add a tiny seeded dither tile against banding. Paper uses its own seeded fibres (GRAIN untouched).
- Picker: `Studio.groundField()` now returns the gfx field plus `more:[gfxs]`; `tool()` flattens `more` into real fields (inherits `global`). Options carry `g` (group); a seg with grouped options renders as `.gsegs` with sideways `.grow` rows. The seg click handler uses `closest('[data-seg]')`.
- Dropped: Checks (weakest of the pattern ideas, never added).
- Tools with the field already (1.21 to 1.29): restock, photo-story, carousel, cinematic, offer, collage, new-place; all now pass the strength. Split has no flat ground (photo split) and Highlight covers stay out on purpose: neither got it.
- Picker height: Style sheet about +90px with Plain chosen (rows scroll sideways); Strength adds one row when a finish is on.
- Calendar: picker opens on All; chips All, Stories, Posts with counts; if designs fail to load the empty state says "Could not load your saved designs." with Try again. `designs()` already returns templates and designs with no collection.
- Lesson: the preview canvas is 1080x1920 story units, so patterns drawn in story units look the same in preview and save.
