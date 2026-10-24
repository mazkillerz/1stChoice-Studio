# Studio

A small set of story makers: pick a tool, add photos, choose the words, save a full-quality 2160×3840 PNG (lossless, same on iPhone and Android).
Installable as an app (Add to Home Screen on iPhone, Install on Android).
Built so any brand can plug in. The first brand kit is **1st Choice**.

## Tools
### Create
The tool that can make anything: its own simple editor made for phones (one page on screen at a time).
- **Selecting:** tap a thing to select it; tap empty space or **✓** to deselect. Handles are finger-sized: drag a corner to resize, the top circle to turn. Two fingers on a selected thing size and turn it; two fingers elsewhere zoom. Double-tap to change words or crop a photo.
- **Several at once:** drag across empty space to box-select, long-press a thing to add it, or **Select several** in the edit bar (then tap things). On a computer, Shift-click. Then Align, Group, Colour, Duplicate or Delete them together.
- **Edit bar** (above the bottom bar): Words, Colour (brand palette + custom), Font, Size (size, turn, opacity, corners), Arrange (align, layer order, flip), Duplicate, Delete, More (lock, hide, group/ungroup, fill the page). With nothing selected: Page, Background, Select several, Select all.
- **Start:** "What are you making?" Blank Story (1080×1920), Post (1080×1350), Square (1080×1080), Carousel (3 slides at 1080×1350, add more with +) or Highlight cover (square, with the circle Instagram keeps shown as a dashed guide). Or pick a template.
- **Templates:** 21 ready layouts, white look (Bingo and Occasion one word are cream). The words come only from approved phrases; spots marked «اكتب هنا» are for your own words. A template can replace the design or be added as new pages.
- **Add:** Elements (button, map-in-bio pill, place + pin, Instagram handle, flavour pills, offer tile, dates line, logo, chat bubbles, typing dots, number circle, dividers and more), Brand (logo, HD cans), Text, Photos & files (also SVG and PDF), Shapes, Lines, Icons, Emoji, Barcode & QR, Frame sizes. Elements are normal layers grouped together. Pills and bubbles re-fit when you change the words (double-tap or the Words button). Ungroup to edit one part.
- **Photo spots:** tap a spot, then Add photo (or the Photo button). The photo takes the spot's size and rounded corners, then crop, zoom or replace it like any photo. Several photos fill the empty spots in order.
- **Pages:** the strip above the edit bar jumps between pages; + adds one after the current page; tap the current page's number (or Page) to change its size, copy it as a story/post/square, duplicate, move or delete it.
- **Save:** full-quality 2× PNG (2160×3840 for a story) of every page you tick. Save to the team too, or **Save as a team template** (words and layout; your photos become empty photo spots). Team templates show in Templates for everyone on the team. The PNG falls back to 1.5× or 1× with a message only if the phone runs out of memory.
- **Drafts:** an unfinished design waits in Continue editing on the hub, one per design. A design saved to the team leaves that list.

The bottom bar has **Add, Text, Photo, Templates, Layers, Save** on phone and computer. Sheets open from the bottom on a phone and as a panel on the right on a computer; the page moves so a sheet never covers it. Layers lists the page's layers (top first) with hide and lock.

| Tool | What it makes |
| --- | --- |
| Create | The free canvas: any size or layout, started blank, from a template, or built from elements. |
| New place | A new sale point: photo in a window, place name with a pin, button. White / black / photo-on-top / cream. |
| Photo story | One tall photo, headline, small line, logo. Full photo / cream frame / black frame; words in any of 9 places (top/middle/bottom × right/centre/left). |
| Cinematic bars | A wide photo shown whole (no crop), logo and words on black, cream or white bars. |
| Collage | 2 to 9 photos: whole-photo layouts (2–4), edge-to-edge grids and mosaics (2×2, 3×3, Big + 3, L-shape, Bento, Hero + frame, Mosaic, Top hero + grid…) and **Scattered prints** (replaces Polaroids). Controls: Gap 0–60 px (0 = photos touch), gap and background colour, outer margin on or off (off = full-bleed), corner radius, show the logo. Grid photos can be dragged and zoomed; drag one photo onto another to swap. |
| Two-photo split | Close-up on top, wide below, words + logo on a label across the cut. White / black / gold label, cut in the middle, higher or lower. |
| Restock | Back in stock: cans photo, approved headline, flavour pills, button. Cream / white / full photo. |
| Offer | Discount story: offer tiles (e.g. ×3 / ٢٠٪), dates line, product photo, button. Cream / black / full photo. |
| Carousel | 1080×1350 Instagram carousel, 2–10 slides: Cover, Photo + words, Full photo, Two photos, Words only, Big number, Panorama (one wide photo across 2–3 slides), End slide. Filmstrip to switch / reorder (long-press), See all, swipe the preview edges. Saves numbered PNGs (2160×2700) or just one slide. |
| Highlight covers | A set of round covers for Instagram story highlights, 1–12 covers, one PNG each (1080×1920; the circle Instagram shows is the middle). Each cover is an **icon** (24 line icons, optional small word under it), a **word**, or a **photo**. The look is shared so the set matches: White / Cream / Black, circle / ring / nothing behind the icon, line weight, background and icon colours. A dashed circle (preview only) shows what Instagram crops to. |

Every tool has a **White** look (the main look, now first) and a **Cream** look. Each also has a **Background colour** from the brand palette (Split: "Label colour"; Photo story: "Frame colour").

## On a phone
The preview fills the screen. The bottom bar has **Photo, Words, Style, Layers, Save**; each opens a sheet over the preview so you see every change.
Save makes the full-quality PNG in one tap and opens the share sheet (choose “Save Image”). The Save sheet then shows the picture and an **Also save to the team** switch with the name filled in; turn it on and tap **Add to the team** (no second picture is made). The switch starts off every time, so nothing is saved to the team by accident. Edit the story after saving and the next Save makes a fresh picture. On a computer the same panels sit beside the preview.

**Search** (top of the hub): one box finds everything in Studio: tools, templates (the brand's Create templates and team templates), saved designs and collections, unfinished stories, and settings and actions (All tools, Sign in / Account, What's new, Install Studio, list or grid, the fresh look, Experimental). Arabic matches with or without harakat and alef/teh marbuta forms. Before you type it shows your last 6 searches (kept on this phone) and shortcuts (the first pinned tool from a photo, Continue, All tools, Templates, Saved designs, What's new). On a phone it opens full screen and Back closes it; on a computer it is a dropdown (arrows + Enter, Esc). Built in `assets/search.js/.css`; the hub hands it the data (`searchEntries` in `home()`).

**Your tools** (hub): only the tools pinned on this phone. **All tools** lists every tool in its group with a star to pin or unpin it (also the star in search results). Pins live in this phone's storage (`studio:pins`), not with the team login. A new phone starts with Restock; a phone that used Studio before 0.6.0 keeps Restock, Photo story and Collage.

**Start from a photo** (top of the hub): one button per pinned tool that can start from a photo (Restock, Photo story, Collage). Take or pick the photo(s) and the tool opens with them already in (Collage takes 2–9 and sets the number of boxes). It starts a new draft, so it is in Continue editing at once.

**Fresh look (preview, off by default)**: livelier motion (press and spring back, pages fade into each other, the home page settles in), soft shadows, one bold blue accent, a big tick and a short haptic when you save (Android buzz; iPhone iOS 18+ switch tick). Per phone: switch it on the What's New card, by searching "fresh look", or with `?look=fresh` (`?look=classic` turns it off). Lives in `studio.css` under `:root[data-look="fresh"]`; `setLook`, `haptic`, `celebrate` in `studio.js`.

**What's new** (✦ button at the top of the hub, and the version line at the bottom): a page with a card for every Studio update, with before/after screenshots. A dot on the button means there is an update you haven't opened yet. The cards come from `studio-notes/changelog.md`; the version is `VERSION` in `assets/studio.js`.

Continue editing (hub) is a list of your unfinished stories. Every one is kept, several per tool. **Start fresh** starts a new one and keeps the old ones; a reload continues the same draft; tap ✕ to remove one (Studio asks first). Drafts saved to the team leave the list. Over 20 drafts of one tool shows a reminder; nothing is deleted on its own. The "New" labels on the hub are gone. A saved design you open never goes there: if you change it and leave, Studio asks to Update it or Discard the changes.

All tools lists tools in three groups (Stories, Posts and covers, Make anything), most used first. The hub remembers per phone how you like Your tools (list / grid) and Saved (list / photo grid, sort). Long-press or ⋯ on a saved design for its options. The chips in Saved are only your team's collections; filter by tool with the menu next to Saved.

## Editing on the preview
- Tap any layer to select it. On a phone a slim bar opens (Edit, Size, Rotate, Colour, Font, More) and the preview stays big; it fades away while you drag.
- Rotate text, buttons, the logo and assets with two fingers (twist), the Rotate slider or ±15° buttons; it settles on straight and right angles. With a layer selected, a two-finger pinch or twist anywhere on the preview acts on it. On a computer: [ and ] (Shift = 15°).
- Tap outside a pop-up to close it, or an empty spot beside the preview to close the open panel.
- Drag to move. Guide lines show when things line up and the safe zones (top 250px, bottom 300px) show while you drag. The magnet button (top bar) turns gentle snapping on or off; it starts off. Pinch or scroll to resize. Arrow keys nudge the selected item.
- **Add text** puts your own text on the story. **Add asset** adds the logo, the HD can cut-outs or a shape as a movable layer. **Layers → Put everything back where it started** resets the layout (Undo brings it back).
- **Layers → Element** adds any piece to any tool as a normal layer: Button, Map in bio (pill with pin), Place + pin, Flavour pills, Offer tile (top line + big line; type them on two lines), Dates line, Small line, Instagram handle, Logo. The words come from the brand kit.
- Every colour picker shows the same brand palette (White, Ink, Grey, Panel, Cream, Brown, Blob, Gold, Passion yellow, Passion berry) plus **Custom** (colour wheel or #hex). Custom colours you pick show after the brand swatches as **recent colours** (last 6, kept on this phone, in every tool and in Create). Every layer has **Opacity** (Colour tab).
- **Text layers** (Font tab): several lines (Enter = new line), align right / centre / left, line height, letter spacing (browsers that support it), soft shadow, and a background pill with its own colour.
- **Shapes** (Asset → Shapes): a new **Rounded panel** (the soft #F3F3F1 card behind cans) and **Blob**. Shapes have Fill (or none), Outline colour and width, Corners (panel, rectangle, soft box, line) and Opacity. Panel and Rectangle have free Width and Height.
- Added layers can be duplicated: **More → Duplicate**.
- Photos: drag to move, pinch / slider to zoom. With two or more photos, hold one and drop it on another to swap them (in Collage a plain drag swaps). The same works with the boxes in the Photo sheet.
- iPhone HEIC photos work everywhere: a HEIC reader (`assets/vendor/heic-to.js`, LGPL) loads the first time one is picked; Safari opens them itself.

## Lab (experimental)
A small **Experimental** button at the end of the home page opens the lab after the passcode. The device remembers it; **Lock the lab** forgets it.
The passcode only hides the area from everyday use; it is not security. Nothing in the lab changes the studio tools or the team's saved designs.

**Board** (`lab/board.html`) is a free canvas editor, made for a computer (works on a phone/tablet for simple edits):
- **Moving around:** scroll or Space+drag (or the Hand tool) to move, pinch or Ctrl/⌘+scroll to zoom (2%–800%), mini map, Fit. Rulers along the top and left (Shift+R) measure from the frame you're in; drag from a ruler to add a guide, drag it back to remove it.
- **Tools** sit in a floating bar at the bottom: Move/Hand, Frame, Shapes (rectangle, ellipse, triangle, star, line, arrow), Text (and curved text), Draw (pen, highlighter, eraser), Upload, Brand kit, and More (barcode, QR code, mask, repeat, find and replace, replace a colour, versions). The small arrow on a tool, or tapping it again, shows its options. **Ctrl/⌘ K** finds any tool or action by typing.
- **Quick-edit bar** above whatever is selected: font, size, colour, bold, alignment; fill and outline; crop and photo looks; size; group, mask, duplicate, delete.
- **Real sizes for print:** pick px, mm, cm, in or pt (top bar). Print frames know their DPI (150/300/600), so a can label typed as 205 × 85 mm is exactly that. Bleed and a safe margin show as pink and green dashed lines; layout grids (columns, gap, margin) and guides snap.
- **Frames** of any size: social sizes, print sizes (A3–A6, Letter, business card, postcard, DL, labels, stickers) or custom. Copy a frame to another size with its content fitted.
- **Opening files:** photos (HEIC too); **SVG** files open as layers you can change (groups, shapes, paths, gradients, clip masks, text and embedded pictures, layer names; Canva text that was turned into shapes stays shapes); **PDF** pages (also .ai) become print frames at their real size, with the page artwork underneath and the text editable where the file has real text; board files.
- **Editing:** snapping to edges, centres, guides, grid columns and equal gaps; Alt to measure; Alt+drag to copy; groups; masks (a photo inside any shape); outline inside/centre/outside; corners one by one; layer blur; shadows; blend modes; gradients; text background boxes; saved text styles and colours; eyedropper on the design.
- **Photos:** crop/move inside the box, zoom, corners or a circle, fill the frame, make background, replace, 10 looks and 11 adjustments, spread across frames.
- **Combine shapes** (idea from [Penpot](https://github.com/penpot/penpot)): union, subtract, intersect or exclude two or more shapes. They stay editable (double-click to move one); the bottom shape gives the colour; Release gives them back. Quick bar › Combine, right-click, or the Design panel.
- **Components** (also from Penpot): make anything a main component, add copies (Design panel, right-click, More › Components…), and every copy follows changes to the main. Words typed into a copy stay that copy's own; Reset words, Go to main, Detach. Copies can be sized on their own.
- **Barcodes (EAN-13, UPC-A, check digit added for you) and QR codes** are made as sharp shapes.
- **Export:** PNG (lossless, see-through possible), JPG, WebP, **PDF** (every frame as a page at its exact size; print frames keep mm and DPI, with bleed and crop marks), **SVG** (layers kept, opens again in Board, Figma, Illustrator), one **ZIP** of many frames. Print PNG/JPG files carry their DPI so printers read the real size. Screen frames save at 2× (falling back to 1.5× then 1× only if the device can't make it that big).
- Layers panel with frames list (thumbnails, drag to reorder), hide, lock, rename, drag to reorder; folding Design / Effects / Export panels; right-click menu; copy/paste between boards; undo/redo; versions; find and replace; keyboard shortcuts (press ?).
- Boards autosave on this device (IndexedDB). Download a `.board` file (with its photos) to move a board. Uses Konva 9.3.22 (`assets/vendor/konva.min.js`, MIT), pdf.js 3.11.174 (`assets/vendor/pdfjs/`, Apache-2.0, loaded only when a PDF is opened) and qrcode-generator 1.4.4 (`assets/vendor/qrcode.js`, MIT).

## How it is built
```
index.html                 home page: search, Start from a photo, Continue editing, Your tools (pinned) + All tools, Saved
assets/search.js/.css      the hub's universal search (brand-agnostic; the hub passes in the entries)
whats-new.html             What's New (assets/whatsnew.js/.css) built from studio-notes/changelog.md; screenshots in assets/whatsnew/
studio-notes/              backlog.md, lessons.md, changelog.md (the studio-improver skill's memory, .claude/skills/studio-improver)
assets/studio.js           the engine: steps, live preview, layers, photo handling, saving (no brand inside)
assets/studio.css          the look of the site
tools/<tool>.html + .js    one tool each; the .js only describes how its story is laid out
tools/create.html/.js/.css the Create page; create-core.js (its editor); create-lib.js (elements), create-templates.js (layouts);
                           its template words are in brands/<brand>/brand.js under create.templates; tests/create.mjs
brands/brands.js           the list of brand kits (first = default)
brands/<brand>/brand.js    logo, fonts, colours, palette (picker order), Instagram handle, writing direction, approved wording (incl. `phrases.bio`), example photos
brands/<brand>/samples/    example photos the tools open with
brands/<brand>/assets/     files for Add asset (HD can cut-outs…), listed in brand.js 'assets'
brands/<brand>/assets/prev/  light copies (~1000px WebP, ~100 KB) of the HD files, listed as `prev:` in brand.js 'assets'
manifest.webmanifest, sw.js  installable app; the service worker caches the app shell, never Supabase
_archive/                  old files kept for reference (never deleted)
assets/thumbs/<brand>/     home page pictures for that brand
lab/                       experimental area (passcode): lab home + Board editor — board.js (canvas engine), board-tools.js (mask, curved text,
                           barcode, QR, repeat, versions…), board-comp.js (combine shapes, components), board-io.js (SVG/PDF in, PDF/SVG/ZIP out), board-ui.js (bars, layers, assets),
                           board-panel.js (Design/Effects/Export panel), board-dialogs.js (export and other dialogs), board-lib.js (sizes, shapes, icons)
```

### Add a brand
1. Copy `brands/1stchoice` to `brands/<new-id>` and change `brand.js` (logo file, fonts, colours, `dir`, phrases, samples).
2. Add `'<new-id>'` to `brands/brands.js`.
Tools never name a brand: they ask the kit for `phrases.headlines`, `colors.ink`, the logo, and so on.

### Add a tool
Copy a tool's `.html` and `.js`, give it a new `id`, and write its `draw(h, o)`:
`h.photo()`, `h.text(id,label,…)`, `h.pill()`, `h.pin()`, `h.logo()`, `h.tags()`, `h.block()` each create a layer people can move and edit. `h.isLight(hex)` tells whether a colour is light.
Then add it to `TOOLS` in `assets/studio.js` (the hub is built from that list), add a thumb in `assets/thumbs/<brand>/<id>.jpg` plus a 320px-wide `<id>-sm.jpg` for the hub,
sample photos in `brand.js`, and its two files to `SHELL` in `sw.js`.
Options: `size:{w,h}` for another canvas size, `pages:{min,max}` for slides, field types `chips`, `text`, `seg`, `toggle`, `multi`, `tiles`, `dates`, `place`, `range` (slider), `color` (palette picker; `null` = the style's own colour)
(`in:'style'` puts a field in the Style sheet).

### Speed
- Big brand pictures have a light copy (`prev:` in brand.js). Pickers, template previews and on-screen editing use it, so a page opens with about 1 MB instead of 40 MB. The HD file loads quietly behind it and replaces it; **Save always waits for the HD file**, so saved quality is the same. To add a light copy for a new asset: a ~1000px WebP of the PNG in `assets/prev/`, then `prev:'assets/prev/<name>.webp'` on its line.
- Create keeps its template previews on the phone (IndexedDB) after the first visit, so the start sheet fills at once. If you change how templates are drawn (create-templates.js / create-lib.js), change `TPL_LOOK` in create.js so phones redraw them.
- HEIC reader, PDF reader and QR maker load only the first time they're needed.

Fonts load from Google Fonts, so the site needs internet. Hosted with GitHub Pages (main branch, root).
