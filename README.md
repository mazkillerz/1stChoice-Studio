# 1st Choice Studio

Small on-brand story makers for the 1st Choice team. Open `index.html`, pick a tool, add a photo, pick the words, save.

## Tools
- **New place**: new sale point photo, place name with a pin, white / black / photo-on-top.
- **Photo story**: tall photo full screen, headline + small line + logo.
- **Cinematic bars**: wide photo shown whole, black bars, text below.
- **Collage**: 2, 3 or 4 whole photos, several layouts, no text.
- **Two-photo split**: close-up on top, wide below, words on the cut.

## How it is built
- `assets/studio.js`: the shared engine (steps, preview, dragging, saving) plus the approved phrase lists from the Omani phrasebook. Change a phrase or colour here and every tool updates.
- `assets/studio.css`: the look of the site.
- `tools/*.html`: one file per tool; each only says how its story is drawn.
- `assets/logo.png`, `assets/samples/`, `assets/thumbs/`: logo, example photos, home-page pictures.

Fonts (Lalezar, Cairo) load from Google Fonts, so the site needs internet.
Saved stories are 2160×3840 (double size) so they stay sharp; Instagram scales them down cleanly.
Hosting: GitHub Pages (Settings > Pages > Deploy from branch > main / root).
