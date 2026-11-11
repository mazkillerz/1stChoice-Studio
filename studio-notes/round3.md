# Round 3: the 2.3.0 upgrade round (11 Nov 2026)

Owner brief: upgrades, not testing (smoke + data-safety checks only; the full sweep comes in a later round).
Lead = main model (plan, UI/UX decisions, review, merge, VERSION, sw.js, changelog, skill). Builders = sonnet, one worktree + port each.

## Walkthrough (phone, 390×844) — what a phone user hits
1. **Back leaves the tool.** Tool pages keep no history for sheets: with Layers → Asset open, the Back gesture goes straight to Home, and Done closes the whole stack. Dialogs on the hub (design menu, Settings, All tools) also ignore Back.
2. **Save goes to the team by itself.** A signed-in phone has the team switch on by default, the one-tap Quick start save adds to the team too, and the collection is optional, so stories land in Saved with no collection.
3. **Assets are fixed.** Only what the brand kit ships; nobody can add a partner's logo. Remove background is a preview that is soft on logo edges.
4. **Saved is two taps and small.** Home → Saved (third tab), 3 tiny columns, names cut ("Restock – 24 …"), search behind an icon, every action behind ⋯.
5. **Bottom bar:** Home / Templates / Saved + a floating +. The calendar (the first thing on Home) has no tab.
6. Calendar: Plan a post already has day, time, caption and a picker with every saved design (2.1.x). Backgrounds: five tone-on-tone finishes exist (1.21.0).

## Ranked plan
| # | What | Ships | Builder |
|---|------|-------|---------|
| 1 | Save flow: choose Phone or Phone + Team first; a collection is required for the team; the button names the collection | live | save |
| 2 | Navigation: one back stack for sheets, dialogs, menus and views; Back and Done go one step back everywhere | live | nav |
| 3 | Team assets: add, name, tag, sort; shared with the team; a dedicated logo-grade background remover | live (needs the `team_assets` table) | assets + cutoutpro |
| 4 | Bottom bar + Saved redesign + Home rethink ("New Studio look") | preview flag `next` | next |
| 5 | More backgrounds (gradients, patterns, textures); after-save shortcuts; calendar picker opens on all shapes | live | extras |
| 6 | What's New 2.3.0, skill, notes | live | lead |

## Contracts (builders code against these)
- **Studio.nav** (studio.js, module level): `push(key,onBack)`, `back()`, `drop(key)`, `depth()`. One history entry per open layer; popstate pops the top and calls its `onBack`. `dialog()` registers itself. State objects carry the fields already in `history.state` (`sp`, `sel`).
- **Save**: `#saveWhere` radiogroup (`data-where="me|team"`), default `me`; `#teamOn` stays as the hidden state; team needs ≥ 1 collection (`teamPicked.size`), main button `aria-disabled` + label "Pick a collection" until then.
- **Team assets**: table `team_assets` (migration `20261111120000_team_assets.sql`), files in `<brand>/assets/<id>/full.png|prev.png`. cloud.js: `teamAssets(brand)`, `saveTeamAsset(o)`, `updateTeamAsset(id,patch)`, `removeTeamAsset(id)` (row only; files stay so old designs keep loading), `teamAssetsReady()`. A layer keeps `ref:'team:<id>'` + `path`. UI module `assets/teamassets.js` = `StudioTeamAssets`.
- **StudioCutoutPro** (`assets/cutout-pro.js`): `analyse(source)`, `run(source,{mode:'auto'|'logo'|'photo',tolerance,holes,onProgress})` → canvas, `trim(canvas)`.
- **Flag `next`**: `:root[data-next]` set early (index.html head + studio.js); everything new on the hub checks `flags.on('next')`.
