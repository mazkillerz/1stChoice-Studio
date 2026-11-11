# r3-assets: team assets (shared library)

## What's New card draft
**Title:** Your team's own assets · **Type:** new
Add a partner's logo or any picture once and everyone on the team can use it. Studio can clear the background for you (Logo or Photo), and you can name, tag and sort pictures into folders. Find them under Asset in any tool, in Create, or in Settings.

## sw.js shell: new files
- assets/teamassets.js, assets/teamassets.css (lazy)
(assets/cutout-pro.js is the cutout builder's.)

## tests/run.mjs MAP rows
- `assets/teamassets.js`, `assets/teamassets.css`, `assets/cloud.js` (team asset functions), `tests/fakecloud.js` -> `teamassets.mjs`, `cloud-api.mjs`
- `assets/studio.js` team asset block (`r3-assets`) -> `teamassets.mjs`, `stickers.mjs`, `full.mjs`
- `tools/create.js` (Team assets button) -> `teamassets.mjs`, `create.mjs`

## Notes for the lead
- Needs the `team_assets` table (migration `20261111120000_team_assets.sql`); until applied the library says "Team assets are switched on by the owner once" and nothing breaks.
- Layer: `{type:'asset',ref:'team:<id>',path,name,...}`. `teamDef()` in studio.js registers it from the layer itself (drawing, `fontsOf`, add), so opened designs/drafts/render frames never need the row. A team file that failed to load is retried a few seconds later (not cached as missing forever).
- `Studio.lazy('teamassets',...)` needs `{global:'StudioTeamAssets'}` (the default global would be `StudioTeamassets`).
- Entry points: tool Asset sheet (Team group + "Add or browse"), Create Add sheet (Brand row: "Team assets", added as an ordinary image layer), Settings row + search action "Team assets" (manage mode).
- Library edit is one sheet (name, folder, tags, remove) behind the tile's ⋯ (pick mode: press-and-hold also opens it).
- fakecloud flags: `fakecloud-noassets=1` (table missing), `fakecloud-signedout=1` (not signed in).
- tests/teamassets.mjs uses `tests/fixtures/cutout-pro-stub.js` (routed over assets/cutout-pro.js). Re-run it with the real cutout-pro once merged: Logo mode result must still have a see-through corner and hole (the test checks both).
- The Save step in the test follows the current Save sheet; it also taps `#saveWhere [data-where="team"]` if the save builder's choice exists.

## Not done / lessons
- Press-and-hold and paste-an-image are coded but not covered by the test.
- Photo mode's 15 MB note comes from cutout-pro's `onProgress` text; the stub only fakes it.
- The add flow relies on `StudioCutoutPro.analyse/run/trim`; if the module fails to load, only "Keep" is offered with a note.
