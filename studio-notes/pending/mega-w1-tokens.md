# mega-w1-tokens (plan 2.1, tokens only, Wave 1)

## What's New card draft
- Title: One source for the look
- Note: Fonts sizes, corners, shadows and safe zones now live in one place in the brand kit, ready for the shared components. Nothing looks different today.
- type: (feature, behind the scenes; or skip the card)

## Shipped files for the sw.js shell
No new shipped files (`assets/studio.js`, `brands/1stchoice/brand.js` changed; bump the cache version).

## run.mjs MAP rows
- `tokens.mjs` for changes in `assets/studio.js`, `brands/*/brand.js`, `tests/fixtures/brands/**`

## README lines
- Brand kit `tokens` block: `type` per format (headline/sub/body/small: size, lh, font, wt), `space`, `radius`, `shadow`, `safe`, `formats`. Engine: `Studio.tokens(format)` (neutral defaults under the brand's values), `Studio.tokens.raw()`, and `h.tok` inside a tool's `draw`.

## Survey (input for Wave 2 components)  canvas px, lh = 1.2 everywhere (engine default `l.lh||1.2`)
| Item | Story 1080x1920 | Post 1080x1350 (Carousel) | Highlight cover |
| --- | --- | --- | --- |
| Headline (display) | Restock 150 (hsize S .8 / L 1.22; Big words 230), Offer 140, Cinematic 130, New place 130, Split label 72 (shrinks to 44), Photo story = user size | cover 170, photo/text slides 110-120, big number 460 | word 230 |
| Sub / dates (body 800) | Offer dates 40 | small line 40-46 | sub 84 |
| Body | Offer tile top 44 | number slide 44 | - |
| Small line | 38 (Restock, Offer, Photo story, Cinematic; 600 wt in Cinematic) | 40-46, counter 30 | - |
| Pill button | text 36, h 76, pad 88, radius h/2 (Carousel 40) | same | - |
| Tags (flavours) | text 36, h 72, pad 56, gap 18 | - | - |
| Spacing steps seen | 22, 26, 28, 30, 34, 40, 44, 56, 60, 110; side margin 70 (maxW 940) | margin 80 | - |
| Radius | photo card 44 (+g grow), Photo story card 36/40, Split/New place C bottom corners 56, Cans panel 64, Offer tile 40, Create templates mostly 64 (then 40), pills h/2 | panel 62, dots pill 24 | circle |
| Shadow | text 24 blur / y2 / rgba(0,0,0,.45) (engine); Photo story card 64/22/.42 (light card 56/20/.2); Collage tile 34/12, frame 24 | - | - |
| Safe lines | top 250 (logo y 250), bottom 300 (words end <= 1620; Restock/Photo story choosePlan limit 1620) | cfg safe 0/0 | cfg safe 0/0 (story canvas) |

Notes: Highlight tool draws on the story-size canvas (no cfg.size); Create's highlight cover is 1080x1080 round. Token `highlight` uses [1080,1920] for 1st Choice; the test brand sets [1080,1080]. `Studio.tokens()` maps a canvas to a format by height (>=1900 story, >=1300 post, else square); a highlight tool therefore reports `story` in `h.tok`.
Values in `brand.js` = most common today; real per-tool differences are listed in its comment. Weights: body text is canvas weight 800 (the 400/500/600 UI rule is for the interface, not the saved picture).

## Lessons / bugs
- None found. Nothing is wired to tokens yet (Wave 2), so no pixel changes (restock-styles, photostory-styles, full, smoke, taste, brandkit run).

## Arabic wording
None.
