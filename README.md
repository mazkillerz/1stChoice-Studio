# Studio

A small set of story makers: pick a tool, add photos, choose the words, save a full-quality 2160×3840 PNG (lossless, same on iPhone and Android).
Built so any brand can plug in. The first brand kit is **1st Choice**.

## Tools
| Tool | What it makes |
| --- | --- |
| New place | A new sale point: photo in a window, place name with a pin, button. White / black / photo-on-top. |
| Photo story | One tall photo full screen, headline, small line, logo. |
| Cinematic bars | A wide photo shown whole (no crop), logo and words on black bars. |
| Collage | 2, 3 or 4 whole photos in 7 layouts. No text. |
| Two-photo split | Close-up on top, wide below, words + logo on a label across the cut. |

## Editing on the preview
- Tap any text, button or logo to select it: edit the words, change size and colour, centre, reset or hide it.
- Drag to move (it snaps to the centre line), pinch or scroll to resize. Arrow keys nudge the selected item.
- **+ Add text** puts your own text on the story. **Reset layout** puts everything back.
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
assets/thumbs/<brand>/     home page pictures for that brand
```

### Add a brand
1. Copy `brands/1stchoice` to `brands/<new-id>` and change `brand.js` (logo file, fonts, colours, `dir`, phrases, samples).
2. Add `'<new-id>'` to `brands/brands.js`.
Tools never name a brand: they ask the kit for `phrases.headlines`, `colors.ink`, the logo, and so on.

### Add a tool
Copy a tool's `.html` and `.js`, give it a new `id`, and write its `draw(h, o)`:
`h.photo()`, `h.text(id,label,…)`, `h.pill()`, `h.pin()`, `h.logo()` each create a layer people can move and edit.

Fonts load from Google Fonts, so the site needs internet. Hosted with GitHub Pages (main branch, root).
