# brandpage (Studio 2.17.0): Brand kit page

## What's New card draft
**Brand kit page** (type: feature)
See your brand kit in one place: logo on light and dark, colours (tap one to copy its code), fonts, the approved words (tap a line to copy it, with a search box), assets and the two looks. Open it from Settings → Brand kit, or search "brand kit". It is read only; the owner changes the kit. Images: assets/whatsnew/brandpage-before.jpg / brandpage-after.jpg.

## New shipped files for the sw.js shell
assets/brandkit.js, assets/brandkit.css

## run.mjs rows added
MAP: `[/assets\/brandkit\./,['brandpage','brandkit']]`; HUB_SUITES: `'brandpage'`

## README line
Brand kit (Settings or search): read-only page of the active kit: logo, colours (tap to copy hex), fonts, approved words (search, tap to copy), assets, looks.

## Lessons
- Port 8087 was already used by another worktree's server; I used 8187. Check `pgrep -af http-server` / EADDRINUSE before trusting a port (a taken port silently serves the other tree).
- The page reads only the kit object (palette, fonts.choices, phrases, assets, rules.looks), so it works for the test brand with no special case.

## Wording needing owner approval
None for pictures. UI-only strings: "Brand kit", "Logo, colours, fonts and approved words", "Copied #xxxxxx", "Changes to the brand kit are made by the owner.", "No word matches."

## Merge notes
studio.js edits are marked `/* brandpage */`: bkOpen() before openSettings(), one Settings row after Team assets, one `else if(a==='brandkit')` on the dispatch line, one searchActions() line before act:team-assets.
