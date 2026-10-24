# Tests
End-to-end check of every tool on a phone (390×844, touch) and a computer (1280×800):
bottom bar + sheets, tapping/dragging layers, adding an asset, photos on every slide,
saving full-size PNGs, saving a design and reopening it, and no console errors.
Saved designs use `fakecloud.js` (same API as `assets/cloud.js`, stored in the browser), so no Supabase login is needed.

    npx http-server -p 8080 -c-1 .      # from the repo root
    node tests/full.mjs                 # needs Playwright (npm i -g playwright)

    node tests/extra.mjs                # HEIC photos, swapping photos, Saved collection chips

    node tests/lab.mjs                  # Lab: passcode gate and the Board editor (drawing, text, photos, snapping, undo, export, board files, phone)
    node tests/lab-pro.mjs              # Lab: SVG and PDF files in, print sizes (mm, bleed, guides), PDF/SVG/PNG/ZIP out, masks, barcode, QR and other tools
    node tests/board-penpot.mjs         # Board: combine shapes (union, subtract, intersect, exclude) and components (copies follow the main)

    node tests/v5.mjs   # Phase 1 of v5: drafts list, elements in every tool, palette, shapes, text options, Collage grids

    node tests/create.mjs   # Phase 2: Create — start sheet, sizes, every template, elements, photo spots, pages, drafts, PNG 2×, team save + team templates
    node tests/polish.mjs   # Phase 3: light WebP copies (HD swaps in, saves stay 2×), kept template previews, even option grids, Reset layout, recent colours, dark-mode element previews

    node tests/whatsnew.mjs   # 0.1.0: Quick start from a photo (hub → tool with the photo in, as a draft), What's New page + badge
    node tests/highlight.mjs  # Highlight covers: covers per page, icon/word/photo, + adds a cover, 2× PNG per cover, team save + reopen
    node tests/quicksave.mjs  # Quick start ready bar: one-tap "Looks good · Save" (2× PNG), Change words, hides on edit; text-place pad size
    node tests/tapscan.mjs    # (helper) lists visible controls under 44px at 390×844, per sheet
    node tests/shot.mjs       # (helper) phone screenshot for What's New
