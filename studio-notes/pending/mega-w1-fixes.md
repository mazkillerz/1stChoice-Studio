# w1-fixes (mega 1.4)
What's New card draft (type: fix): "Board text weights" - Board's last heavy text style (800) now uses the 600 weight like the rest of the interface.

Findings
- On the base (claude/mega-integration) `taste` (incl. 360x740 Create size buttons), `templates` (Arabic titles x2) and `create-fixes` (360px all five sizes) all PASS alone; the earlier failures were load-related timing, not app bugs. Nothing to fix in create.js/create.css.
- Fixed: `lab/board.css` `.ta-h2` weight 800 -> 600 (Board panel headings were already 600).
- Walk at 390x844, 360x740 (no sideways scroll, every text input has dir auto/rtl; only `#hex` is deliberately ltr), tapscan (no control under 44px on all tools + hub), contrast.mjs (no findings): clean.
- Left (owner decisions / watch-notes, not bugs): Collage + Create story logo below the safe line, End slide for 3+ photos, welcome tour, flaky-suite notes (owned by 1.3).

New suite: tests/fixes54.mjs (no shipped files). run.mjs MAP row: `lab/board.css`, `lab/lab.css` -> fixes54. README/sw.js: nothing.
