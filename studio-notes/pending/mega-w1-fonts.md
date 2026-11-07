# w1-fonts (mega 1.2): self-hosted fonts

## What's New card
- title: Fonts load from Studio itself
- type: fix
- note: Pages no longer wait on Google for their fonts, so Studio opens fast on a slow line and the fonts are right offline.

## sw.js shell: new shipped files
assets/fonts/fonts.css
assets/fonts/ibm-plex-sans-arabic-{400,500,600}-{arabic,latin,latin-ext}.woff2  (9 files)
brands/1stchoice/fonts/fonts.css
brands/1stchoice/fonts/cairo-{arabic,latin,latin-ext}.woff2
brands/1stchoice/fonts/lalezar-400-{arabic,latin,latin-ext}.woff2
brands/1stchoice/fonts/modak-400-{latin,latin-ext}.woff2
(licences, not precached: assets/fonts/OFL-IBM-Plex.txt, brands/1stchoice/fonts/OFL-{cairo,lalezar,modak}.txt)
Cache: ~510 KB of woff2 in total. Bump the cache version. Tip: sw.js FONT_HOSTS (Google) still needed for More fonts.

## run.mjs MAP rows
fonts-local: assets/fonts/, assets/studio.css, assets/studio.js (useBrand/fontLink), brands/*/fonts/, brands/*/brand.js, lab/board.html

## README lines
- Fonts are self-hosted (assets/fonts for the interface, brands/<id>/fonts for the brand kit; `fonts.css` per folder). Google Fonts is used only for the "More fonts" picks.
- A brand kit declares `fonts.css:'fonts/fonts.css'` (relative to its folder); `fonts.google` stays as fallback for a kit without it.

## Notes / lessons
- studio.css `@import url("fonts/fonts.css")`: one local line covers every page (incl. whats-new, lab) with no per-page edits; local so no hang risk.
- Plex 700 dropped (no CSS uses it; headings set 400/600). Elements left at the browser default bold (whats-new h1/h2, lab h1, a few <b>) now show weight 600 instead of 700.
- Cairo 600 and 800 are the same variable-font file on Google; shipped once, two @font-face rules (kept two so 700 still resolves to 800 as before).
- Modak ships no Arabic glyphs (same as on Google). Kept only arabic + latin + latin-ext subsets.
- tests/font-ready.mjs "slow fonts" mode only delayed Google, so with local fonts the "test is real" check failed; it now also delays the local brand fonts.css and woff2.
- tests/photostory-styles.mjs fails "the comparison page runs the previous file (4 looks)" (old:8): it finds the old file via git log; unrelated to fonts, likely red on base.
- Preconnects removed on whats-new.html and lab/index.html only; kept everywhere More fonts can be picked. lab/board-io.js SVG export @import left on Google.
- No Arabic wording added.
