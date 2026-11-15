# faststart (2.26.0, session 11 "Faster start")

## What's New card draft
Title: Home opens faster
Type line: Improvement
Note: Home now loads only what you see first. The Templates and Welcome pieces wait until you open them, the scripts no longer sit in front of the first paint, and the brand, packs and sign-in files load side by side instead of one after another. On a slow phone connection the tools and Calendar row show up about 20% sooner. Nothing looks different.

## sw.js (lead)
- Shell list unchanged (templates.js/css, welcome.js/css still exist; they are now loaded lazily, keep them precached so the Templates tab and the tour work offline).
- Bump the cache version.

## tests/run.mjs MAP
- add: `faststart` for changes to `index.html`, `assets/studio.js` (home start-up).

## README lines
- "Home loads Templates and the Welcome tour only when first used; search, studio and brand scripts are deferred."

## Lessons
- Measure with gzip on (GitHub Pages gzips): the raw http-server inflates studio.css/js 4x and hides the real chain.
- After studio.js runs, the Home start-up was a serial chain (brand.js, pack.js x2, brand fonts.css, config.js, cloud.js). Parallel pack/cloud loads + early home() cloud() cut about 700 ms of round trips.
- `defer` gives scripts Low priority so studio.css wins the bandwidth; preload hints for brand.js/config.js/cloud.js use fetchpriority=low for the same reason.
- index.html preloads `brands/1stchoice/brand.js` (a brand name in the root HTML, not in assets/ or tools/). If a second brand becomes the default, change that one line.

## Wording to approve
None.
