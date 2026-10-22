# Studio v5 plan (owner's notes, 22 Oct 2026)

Each phase is one Claude Code session. Start every session with: *Read CLAUDE.md and PLAN.md, then do Phase N.*
Work on a branch `claude/v5-phase-N`, split work across models as CLAUDE.md says, run the tests, then stop and list what the owner must check. Merge to `main` only when the owner says so. Tick the boxes here as items land (commit PLAN.md too).
The owner's notes are the starting point, not the limit: improve anything that needs it and say what you added.

---

## Phase 1: Fixes, customizability, Collage

### 1.1 Drafts must never be lost  *(top priority, owner hit it)*
Bug: with an unfinished story in Continue editing, opening the same tool and tapping **Start fresh** deletes the old draft and the new one replaces it.
- [x] Drafts become a **list per tool**, not one slot: each draft gets its own id (`studio:draft:<brand>:<tool>:<id>`, photos in IndexedDB under that id).
- [x] **Start fresh** starts a new draft and keeps the old one in Continue editing. Nothing is ever removed except by the person (✕ with a confirm) or after it is saved to the team (current rule).
- [x] Continue editing shows every draft (thumbnail, tool, time); cap at ~20 per tool with an "oldest drafts" warning instead of silent loss.
- [x] Migrate existing single-slot drafts into the new list on first load.
- [x] Test: two drafts of the same tool survive a reload, and opening either restores the right photos.

### 1.2 Customizability across all tools
- [x] **Components available everywhere**: any element one tool has (button/pill, place line with pin, flavour pills, offer tile, dates line, small line, logo, "map in bio" pill with pin icon, Instagram handle with icon) can be added to **any** tool from an **Add** menu (next to Add text / Add asset). Each is a normal movable layer (move, size, rotate, colour, font, hide, delete) and is saved in the recipe.
- [x] **One brand palette everywhere**: every colour picker (text, pills, shapes, panels, backgrounds, collage gaps) offers the brand swatches from `brand.js` in the same order: White #FFFFFF, Ink #161210, Grey #6E6E6E, Panel #F3F3F1, Cream #F3EADC, Brown #7A563A, Blob #E5D5C0, Gold #D6B078, Passion yellow #F6C040, Passion berry #BE2C5C, plus **Custom…** (hex input). Shapes today don't match the post colours: fix.
- [x] Shapes get **fill + outline + opacity + corner radius**. Add a **rounded panel** (the soft #F3F3F1 card used behind cans in posts) and a **blob**.
- [x] Styles: review every tool's styles and add at least a **White** (main look) and a **Cream** variant to each where missing; backgrounds selectable from the palette.
- [x] Text: alignment (right/centre/left), line height, letter spacing, optional soft shadow, optional background pill.
- [x] In-depth review of every tool (new-place, photo-story, cinematic, collage, split, restock, offer, carousel): write findings in `docs/review-v5.md` (what works, what's awkward, what you changed).

### 1.3 Collage rework
- [x] **Spacing control**: gap slider 0–60 px (0 = photos touch, full-bleed, no borders), gap colour from the palette, outer margin on/off, corner radius slider.
- [x] **Remove the photo-frame look of Polaroids** (owner dislikes it). Replace with a cleaner "scattered prints" option, or drop it.
- [x] **Many more grids** (2–9 photos): 2 cols, 2 rows, 3 cols, 3 rows, 2×2, 2×3, 3×3, big + 2, big + 3, big + 4, L-shapes, mosaic/bento (mixed sizes), story-tall strips, top-hero + grid, centre-hero + frame. Show them as small layout thumbnails to pick from.
- [x] Any cell can be swapped, zoomed and moved (existing behaviour kept).

### 1.4 Small
- [x] Remove the **"New"** label from the newer tools on the hub.

---

## Phase 2: "Create": the tool that can make anything

A free story/post maker that has **everything** from all tools plus more, so the owner can build any post or story he has made with Claude.

- [x] Start from the Lab's **Board** engine (free canvas, layers, SVG/PDF import, export) but make it a first-class tool on the hub (phone-first like the others, same bottom bar and sheets).
- [x] **Sizes**: Story 1080×1920, Post 1080×1350, Square 1080×1080, Carousel (multi-page 1080×1350), Highlight cover; export at 2× lossless PNG like every tool.
- [x] **Everything addable**: photos (with crop/zoom/mask shapes), text, every component from 1.2, brand assets (logo, HD cans, pair), shapes, panels, blobs, icons (a small stroke icon set: pin, Instagram, WhatsApp, chat, clock, calendar, star, check, arrow, sparkle, snowflake, sun), dividers, page dots, chat bubbles, number circles.
- [x] **Templates** (editable starting points, white look unless noted), built from what we already made:
  - Ice cold: headline «يسرسح ثلج», small line, both cans on a #F3F3F1 rounded panel, black pill «الخريطة في البايو», logo
  - Did you know: «تعرف ويش؟», can panel left + 3 numbered rows right (black number circles), pill «جربته؟»
  - Your choice: «اختيارك؟», two panels each with a flavour name + its can, pill «منشن ربعك»
  - Chat carousel (Late friend): chat header with avatar + last seen, time stamps, black/grey bubbles, a can photo bubble, typing dots
  - Bingo grid 4×4 (cream), Spot the difference (2 panels), Tic-tac-toe, Rate 1–10, Mood grid 2×2, Equation (A + B + C = can), Lockscreen notifications, Before/after battery
  - Offer: headline + offer tiles + dates line (Women's Day style)
  - How to order story: list rows with round icons (DM, WhatsApp number, pickup/delivery)
  - Occasion one-word story, Restock, New place, Stock alert
- [x] Layers panel, guides/snapping, undo/redo, group/ungroup, duplicate, align/distribute, lock, bring forward/back.
- [x] Saved to the team like every tool (recipe JSON + photos), templates saveable by the team.

---

Done in Phase 2 (22 Oct 2026): `tools/create.html` (+ create-core.js = its own phone-first editor, replacing Board after the owner found Board's selection fiddly; create.js / create.css / create-lib.js / create-templates.js), templates' words in `brand.js → create.templates`, tests in `tests/create.mjs`. Added beyond the notes: pages strip with +, "copy as a story/post", photo spots that take a photo's place, pills/bubbles that re-fit their words, team templates keep no personal photos (they become photo spots).

---

## Phase 3: Polish everything

- [ ] Go through the whole Studio on a phone (390×844) and desktop: spacing, type scale, consistency of sheets, buttons, empty states, loading, error messages, dark mode, RTL.
- [ ] Speed: first load, photo open, save time on a mid-range Android; lazy-load heavy vendors (pdf.js, HEIC).
- [ ] Your own improvements: anything you'd add as a senior product designer (examples: recent colours, favourite templates, quick "duplicate as story/post" resize, share sheet polish). List them in the summary.
- [ ] Update README.md and the hub thumbnails; bump the service-worker cache.
- [ ] Full test run, before/after screenshots of the hub and every tool.

---

## Ideas parked for later
Stock alert tool · Occasion one-word maker · Highlight covers · Counter-card QR (print PDF) · Second brand kit
