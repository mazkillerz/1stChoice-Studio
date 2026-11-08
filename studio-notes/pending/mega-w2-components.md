# mega-w2-components (plan 2.1, shared components, Wave 2)

## What's New card draft
- Title: One button, one card, everywhere
- Note: Buttons, cards, number circles and badges are now drawn by one shared piece of code. Change a corner or shadow in the brand kit and every tool follows. Nothing looks different today.
- type: (behind the scenes; or skip the card)

## Shipped files for the sw.js shell
- NEW `assets/components.js` (loaded by tool(), and by tools/create.html and lab/board.html). Bump the cache version.
- Changed: assets/studio.js, tools/{restock,offer,carousel,photo-story,collage,split,create-lib,create-templates,create}.js/html, lab/board.html (one script tag), brands/1stchoice/brand.js (`component:` tags).

## run.mjs MAP rows
- `components.mjs` for `assets/components.js`, `assets/studio.js`, `tools/*.js`, `tests/fixtures/brands/**`

## README lines
- Shared components: `Studio.comp.pill / panel / tile / step / badge / logo / handle / bio (h or ctx, opts)` draw one piece and return its box; radii and shadows come from the brand tokens (`radius.pill`, `radius.sm|md|lg`, `shadow.soft|lift`). Create builders: `Studio.comp.pillDoc / bioDoc / stepDoc / badgeDoc / panelDoc / handleDoc`.

## What moved onto components (zero pixel change, checked old vs new on 119 tool states + all 73 Create goldens)
- `h.pill`, `h.tags`, `h.tile` (engine) now draw through `Studio.comp` (pill outline = token radius.pill, 999 = fully round, same pixels).
- Offer tiles, Restock Cans panel, Carousel counter + cream panel, Split label band, Photo story card/poster card shadows, Collage frames/prints: `comp.panel` / `comp.tile`. Elements bio/handle: `comp.bio` / `comp.handle`. Restock/Offer logo: `comp.logo`.
- Create: map-in-bio pills -> `bioDoc`, number circles -> `stepDoc`, panels -> `panelDoc` (default corner = token radius.md = 56 for 1st Choice), Instagram handle -> `handleDoc`; pill corner = token.
- Tool copies kept exactly via options (listed): Photo story card shadow uses token `shadow.lift` (equal to the old literals for 1st Choice; another brand's lift now applies); Photo story poster card shadow 56/20/.2 and Collage prints shadow 34/12/.3 passed explicitly; Collage shadow stays unscaled (`scale:false`, as before: its saved shadow is proportionally smaller than the preview, a pre-existing quirk, not fixed); Offer tile radius 40 = token `sm`, Restock panel 64 = token `lg`.
- Not moved (different shapes, left as is): Highlight discs/rings, Restock photo outlines (arch/circle), Split/New place blob frames (even-odd cut-outs), Carousel dots, Cinematic/New place buttons (already `h.pill`).

## Brand kit
- `component:` tags on the flat 2D can icons (`icon`), coffee-filled type (`type`) and crayon pieces (`crayon`); no visual change.

## Lessons / bugs
- Port 8081 can be held by a stale server of an old worktree: check `curl .../assets/components.js` before trusting a pixel comparison (a "same" result against the wrong tree is meaningless).
- Collage print shadow is not scaled with the save size (unlike Photo story); left as is.

## Arabic wording
None.
