# r6-editor: one consistent editor

## What's New card
- **One editor, the same panels everywhere** (improve): Create's Add and Layers panels now open like the ones on every tool page: they sit on the bottom bar, the design stays visible above them, the header (handle, title, grey Done) is identical and you can swipe them down. Elements, assets, shapes, stickers and emoji use the same tiles and the same group names as the tool pages.
- **Steadier panel headers** (fix): on tool pages a long list could squeeze the panel header; the Done button is now the same 48px everywhere.

## Audit (390x844, touch, light): differences found
| Job | Tool page | Create (before) | Now |
| --- | --- | --- | --- |
| Add asset/element/sticker | 3 half sheets (45dvh, on the bar, design visible) | one Add sheet, 88dvh, scrim over the design, bar covered | Add is a half sheet on the bar (45dvh), design fits above it |
| Layers | 52dvh on the bar | above the edit bar, 46dvh | on the bar, 52dvh |
| Header | handle 40x5, title 17px, grey Done 48px (40px on Asset/Element/Sticker), swipe down | handle 36x4, Done 44px, no swipe | same values, swipe added; tool pages: all Done 48px, header no longer shrinks |
| Group labels | 13px/600 "Team, Logo, Cans…, Shapes", "Drawn", "Emoji" | 11px uppercase "Elements, Brand, Shapes, Lines, Icons, Stickers, Emoji" | same label style; Create lists Elements, Team, brand groups, Shapes, Lines, Icons, Drawn, Emoji |
| Tiles | comp-tile (2 per row), asset-tile 114x96, sticker-tile 4 per row with names | 3 per row 92px, icons 6 per row | same classes: comp-tile, asset-tile, sticker-tile |
| Pick behaviour | phone: sheet becomes the layer inspector | closes, layer selected | same (closes, layer selected) |
| Bottom bar | icons/labels/height 52px | same icons for Photo, Layers, Save; height same | unchanged (already equal; Words vs Text are different actions) |
| Desktop | side cards | right panel | unchanged (both a side panel) |
| Save sheet | 76dvh max, design above | 88dvh modal | 76dvh |
| Back | child returns to parent | closes | same: Back/Escape/swipe/Done close it |

## Decisions
- Create's "Your photos" tile in Add was removed: the bar's Photo does the same (one way).
- Create's single Add sheet stays one scrolling panel (jump chips: Elements, Assets, Shapes, Lines, Icons, Stickers, Emoji) instead of three bar entries; sections now match the tool pages' three panels. Lines and Icons are Create-only.
- "Drawn" (tool page name) is used for stickers; the chip says Stickers.
- Templates sheet stays tall (88dvh, browsing); Save sheets match. Selection sheets (Words, Colour, Size...) stay above the edit bar at 46dvh as the tool pages' inspector.
- `padForSheet()` now reads the sheet's own box (it read the sliding box mid-animation and under-fitted the design).
- Create lets Add/Layers cover the edit bar while open (as the tool page's sheet covers its bar); Done or a pick brings it back.

## New files / sw.js / run.mjs
- New suite `tests/r6-editor.mjs`. MAP rows: `^tools/create|^assets/studio\.(js|css)` -> add `r6-editor` (also `^assets/stickers.js`).
- No new shell files.

## Left for later
- Inspector: tool pages use tabs (Size/Move/Font/Colour/More) in a sheet, Create uses an edit bar with one sheet per job (Words, Colour, Font, Size, Arrange). Same content, different navigation; unifying would be a larger redesign.
- Tool-page sheets cannot be dragged up taller (nor can Create's), so nothing to match there.
