# w2-resize (plan 3.2, one-tap resize)
**What's New card:** "Resize to… in one tap" — Page sheet → Resize to… (Story, Post, Square, Highlight) makes a new page next to your design with everything laid out again for that size (words in the safe zone, logo in its corner, art still bleeding, photos still filling). The first page is not touched.

**New shipped file for sw.js shell:** `tools/create-resize.js` (lazy-loaded by Create on first use).
**Changed:** `tools/create.js` (Page sheet: "Copy this page as" row replaced by "Resize to…", `rzRun`).
**run.mjs MAP rows:** `tools/create-resize.js` and `tools/create.js` (Page sheet) -> `create-resize`; add `create-resize` to the Create group.
**README line:** Create → Page → "Resize to…" makes a re-laid-out copy as a Story, Post, Square or Highlight; templates can carry `hints:{post:{x,y,w,size}}` on a layer to fix one layer for one format.
**Notes:** roles = layer attr `role` (headline|sub|product|button|logo|handle|bg|bleed|photo) else inferred (full-frame rect = bg, full-frame photo = photo, `bleed`, imgId containing "logo", Latin @handle/instagram line). No hints were needed on shipped templates. Test grids: `SHOTS` dir (default /tmp/studio-resize-shots). Original Create "Make this page a…" (in-place resize) is unchanged.
**Lessons:** `toObj` of an Image gains cropX/Y/Width/Height after first render, so "unchanged" comparisons must ignore them. No new Arabic.
