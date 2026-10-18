# Studio

A small set of story makers: pick a tool, add photos, choose the words, save a full-quality 2160×3840 PNG (lossless, same on iPhone and Android).
Installable as an app (Add to Home Screen on iPhone, Install on Android).
Built so any brand can plug in. The first brand kit is **1st Choice**.

## Tools
| Tool | What it makes |
| --- | --- |
| New place | A new sale point: photo in a window, place name with a pin, button. White / black / photo-on-top / cream. |
| Photo story | One tall photo, headline, small line, logo. Full photo / cream frame / black frame; text top, middle or bottom. |
| Cinematic bars | A wide photo shown whole (no crop), logo and words on black, cream or white bars. |
| Collage | 2, 3 or 4 whole photos in 7 layouts, black / white / cream, optional rounded corners. |
| Two-photo split | Close-up on top, wide below, words + logo on a label across the cut. White / black / gold label, cut in the middle, higher or lower. |
| Restock | Back in stock: cans photo, approved headline, flavour pills, button. Cream / white / full photo. |
| Offer | Discount story: offer tiles (e.g. ×3 / ٢٠٪), dates line, product photo, button. Cream / black / full photo. |
| Carousel | 1080×1350 Instagram carousel, 2–8 slides with page dots; saves numbered PNGs (2160×2700). |

## On a phone
The preview fills the screen. The bottom bar has **Photo, Words, Style, Layers, Save**; each opens a sheet over the preview so you see every change.
Save makes the PNG and opens the share sheet (choose “Save Image”). On a computer the same panels sit beside the preview.

## Editing on the preview
- Tap any text, button or logo to select it: edit the words, change size and colour, centre, reset or hide it.
- Drag to move: it snaps to the centre and edges, to other layers, and to the story's safe zones (top 250px, bottom 300px), which show while you drag. Pinch or scroll to resize. Arrow keys nudge the selected item.
- **Add text** puts your own text on the story. **Add asset** adds the logo, the HD can cut-outs or a shape as a movable layer. **Reset layout** puts everything back.
- Photos: drag to move, pinch / slider to zoom.

## How it is built
```
index.html                 home page with the tool cards
assets/studio.js           the engine: steps, live preview, layers, photo handling, saving (no brand inside)
assets/studio.css          the look of the site
tools/<tool>.html + .js    one tool each; the .js only describes how its story is laid out
brands/brands.js           the list of brand kits (first = default)
brands/<brand>/brand.js    logo, fonts, colours, writing direction, approved wording, example photos
brands/<brand>/samples/    example photos the tools open with
brands/<brand>/assets/     files for Add asset (HD can cut-outs…), listed in brand.js 'assets'
manifest.webmanifest, sw.js  installable app; the service worker caches the app shell, never Supabase
_archive/                  old files kept for reference (never deleted)
assets/thumbs/<brand>/     home page pictures for that brand
```

### Add a brand
1. Copy `brands/1stchoice` to `brands/<new-id>` and change `brand.js` (logo file, fonts, colours, `dir`, phrases, samples).
2. Add `'<new-id>'` to `brands/brands.js`.
Tools never name a brand: they ask the kit for `phrases.headlines`, `colors.ink`, the logo, and so on.

### Add a tool
Copy a tool's `.html` and `.js`, give it a new `id`, and write its `draw(h, o)`:
`h.photo()`, `h.text(id,label,…)`, `h.pill()`, `h.pin()`, `h.logo()`, `h.tags()`, `h.block()` each create a layer people can move and edit.
Then add it to `TOOLS` in `assets/studio.js` (the hub is built from that list), add a thumb in `assets/thumbs/<brand>/<id>.jpg`,
sample photos in `brand.js`, and its two files to `SHELL` in `sw.js`.
Options: `size:{w,h}` for another canvas size, `pages:{min,max}` for slides, field types `chips`, `text`, `seg`, `toggle`, `multi`, `tiles`, `dates`
(`in:'style'` puts a field in the Style sheet).

Fonts load from Google Fonts, so the site needs internet. Hosted with GitHub Pages (main branch, root).
