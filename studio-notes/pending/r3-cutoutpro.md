# r3-cutoutpro: Cutout Pro (logo-grade background remover)

## What's New card draft
Title: Cleaner cut-outs for logos. Type: new.
Remove background now has a logo mode that traces thin strokes and letter holes exactly and leaves no white fringe. It works instantly on your phone, with no download. Photos still use the on-device model, now with a crisper outline.

## API (window.StudioCutoutPro, assets/cutout-pro.js)
analyse(source), run(source,{mode,tolerance,holes,onProgress}), trim(canvas,pad), supported(mode). Load with Studio.lazy('cutout-pro',{global:'StudioCutoutPro'}).

## New files for the sw.js shell
assets/cutout-pro.js, assets/cutout-pro-worker.js (photo mode reuses assets/vendor/cutout/*, already cached). Not shell: lab/cutout-pro-test.html, tests/fixtures/cutout/cases.js.

## tests/run.mjs MAP rows
assets/cutout-pro*.js, lab/cutout-pro-test.html, tests/fixtures/cutout/* -> cutout-pro.mjs (about 60 s, 72 checks)

## Rules (documented)
- Ground: robust planes over the border ring (1 or 2 colours) plus a coarse residual grid grown from the smooth border-connected region (follows gradients and uneven light). Distance in OKLab.
- Holes (holes:true): an enclosed ground-coloured area is cleared when the ink around it is not much thicker than the hole (hole radius x 4.5 >= ink thickness), or when it is a hairline (radius <= 0.35% of the long side). Thick ink around a larger hole (white text on a badge) is kept. holes:false keeps all.
- Soft alpha: projection onto ground->nearest strong ink colour in sRGB, then F=(C-(1-a)B)/a. Smooth, evenly darkened ground (drop shadow) becomes translucent black.
- No new vendored libraries.

## Lessons
- Chamfer distance: divide after both passes. Math.hypot and Math.cbrt are slow in hot loops (fast cbrt used).

## Not finished / weak
- Coloured glows and soft coloured shadows stay as pale opaque halos.
- A ground nearly the same colour as part of the logo (cream label on cream wall) is eaten; auto sends those photos to photo mode.
- Photo mode on low-contrast edges (silver rim against a grey-green wall) cuts about 2 px inside.
- Hard 3+ colour grounds are not modelled (2 are).
- Drop shadow / logo colour on paper is not corrected for uneven light.
