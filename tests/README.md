# Tests
End-to-end check of every tool on a phone (390×844, touch) and a computer (1280×800):
bottom bar + sheets, tapping/dragging layers, adding an asset, photos on every slide,
saving full-size PNGs, saving a design and reopening it, and no console errors.
Saved designs use `fakecloud.js` (same API as `assets/cloud.js`, stored in the browser), so no Supabase login is needed.

    npx http-server -p 8080 -c-1 .      # from the repo root
    node tests/full.mjs                 # needs Playwright (npm i -g playwright)

    node tests/extra.mjs                # HEIC photos, swapping photos, Saved collection chips

    node tests/lab.mjs                  # Lab: passcode gate and the Board editor (drawing, text, photos, snapping, undo, export, board files, phone)
