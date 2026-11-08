# w2-import (plan 3.1): notes for the lead
**What's New card:** "Import a Claude Design board" (preview, flag `import`). Drop or pick an exported board (.html, .dc.html or a .zip with its pictures) in Create and every piece becomes its own layer: pictures, shapes, text (crayon words too).
**New shipped files for sw.js shell:** `tools/create-import.js` (lazy-loaded, only with the flag on).
**run.mjs MAP rows:** `[/^tools\/create-import\.js$|tools\/create\.js/,['create-import','create','create-render','nd-templates']]`
**README:** Create: "Import a Claude Design board" (preview flag): start sheet and Add sheet, or drop a .html/.zip on a computer.
**Decisions:** iframe is `sandbox="allow-same-origin"` with no scripts + CSP (blob:/data: pictures, fonts only): scripts off because script + same-origin would let a file reach Studio; a script-only board says "came out empty". Brand hook: `importMap.texClasses` in brand.js maps board class names to textFills. Clipped groups are drawn once with Konva (no foreignObject); only flattened when something really pokes out of the clip. Inline <svg> elements are not read (only <img>/CSS url pictures). Zip64 unsupported.
**Lessons:** port 8084 was held by a stale w1-fixes server (used 8184). Some shipped nd26 docs flag `bleed` on pieces inside the page.
**Arabic wording:** none new.
