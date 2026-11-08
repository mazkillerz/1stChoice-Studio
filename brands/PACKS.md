# Occasion packs

A pack is one occasion (National Day, Ramadan, Eid, Winter camp) as a folder the brand kit lists. Home shows a quiet banner while it is in
season, Templates gets a chip for it, and everything inside (pictures, text fills, Create templates, colours, reels) joins the brand.

## Add the next occasion
1. Copy `brands/<id>/packs/_template/` to `brands/<id>/packs/<pack-id>/` (short id, never changed later: saved designs may point at it).
2. Drop the files in that folder: pictures in `assets/` (plus small `prev/*.webp` for the Add asset grid), Create documents in `templates/`.
   Paths in `pack.js` are relative to the brand folder, e.g. `packs/ramadan/assets/lantern.png`. (National Day 2026 predates this and keeps its
   files in `assets/nd26`, `assets/prev/nd26` and `templates/nd26`, because saved designs may store those paths: never move files that shipped.)
3. Edit `pack.js`: `id`, `name`, `dates` (`{from:'MM-DD',to:'MM-DD'}` every year, or full ranges per year for occasions that move), `banner`,
   `templateCat` (the chip), `assets`, `textFills`, `templates` (give each `cat` = the chip id), `palette`, `reels`.
   Dates live here, not in code. Ids must be unique across the whole kit: prefix them with the pack (`rm27-lantern`).
4. List it in `brand.js`: `packs:['nd26','<pack-id>']`.
5. Make the Templates previews: `node tests/tplthumbs.mjs <template ids>` (server on :8080 first). Thumbnails land in `assets/thumbs/<brand>/tpl/<id>.jpg`.
6. Wording: Arabic in a pack comes only from approved phrases; list any new line for the owner to approve.
7. Add the new files to the service worker shell if they should work offline, then run `node tests/packs.mjs` and `node tests/nd-templates.mjs`.

## Rules
- A pack never changes an existing asset: renaming one needs `aliases:{old:'new'}` so saved designs keep opening.
- A season is a date range on the person's phone (its own clock), remembered dismissal is per pack and per year (`studio:packBanner:<brand>:<pack>:<year>`).
- With no pack in season, Home is exactly as without packs.
