# w2-packs (2.2 Occasion packs)
## What's New card
Title: Occasion packs
Note: National Day now lives in its own pack, and Home shows a small card while an occasion is in season, with a button straight to its templates.
Dismiss it and it stays away for that season. Adding the next occasion is "drop files, list them".

## Shell (sw.js)
New shipped files: brands/1stchoice/packs/nd26/pack.js (scaffold packs/_template/pack.js is not shipped/listed). No image or template files moved.

## run.mjs MAP rows
packs.mjs: areas assets/studio.js (loadPacks, banner), brands/*/brand.js, brands/*/packs/**, assets/templates.js. Helper tests/kit.mjs (loadKit: brand.js + packs, used by nd-templates, tplthumbs, reelthumbs, packs).
Fixture tests/fixtures/packs/brand-before.js = brand.js before the move (pixel compare).

## README lines
- Occasion packs: brands/<id>/packs/<pack>/pack.js; Home banner in season; Templates chip per pack. See brands/PACKS.md.

## Notes / lessons
- Port 8082 was held by a stale Wave 1 server (serving studio-w1-fonts); I used 8092. Check `ps` before trusting a port.
- Any test reading brand.js directly must use tests/kit.mjs loadKit, or it misses pack content.
- Engine additions: Studio.registerPack, Studio.packSeason, BRAND.packList, BRAND.aliases (assetDef falls back to aliases). No new flag.
- Banner copy is English UI text in pack.js ("29 ready-made stories and posts for 18 November."). No new Arabic.
