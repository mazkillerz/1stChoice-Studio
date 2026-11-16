# r6-nav: Back always returns to exactly where you came from

## What's New cards
- **Back goes back to where you were** (improve): the top-left Back button and the phone's back gesture now return to the same screen, Templates category, Saved collection and scroll place. Before, a design opened from a collection brought you back to Home.
- **Collections have their own Back step** (improve): opening a category in Templates or a collection in Saved is one step. Back shows the full list at the same place; Back again goes Home.
- **The Back button says "Back"** (improve): on every tool, Create, Video, Board, the Lab and What's New. It goes to the hub only when there is nowhere to go back to (a link opened fresh).

## What changed (for the lead)
- New `assets/back.js`: tiny standalone `window.StudioBack` (`canBack`, `go`, `target`). Loaded before studio.js on every tool page, Create, Video, Board, Lab index and What's New. Marks "came from a Studio page" (same-origin referrer, or a sessionStorage breadcrumb `studio:crumb` written on `pagehide`, 20 s). Links marked `data-back` keep their href (new tab still works).
- `studio.js`: `Studio.goBack(href)` and `Studio.leaveTo(href)` (also on `Studio.lab`). The leave prompts (tool, Create, Video: Leave, Discard, Update) and the phone-Back prompt now use `leaveTo`, so the same back logic runs after the prompt. NAV got `adopt`, `exit`, `unwind`, `go`, `has`, `quiet`, `hold`.
- Hub memory: view, Templates category, Saved collection and scroll are kept in `history.state.hub` and `sessionStorage studio:hub:<hash>` (written throttled, on pagehide and when hidden). On return the hub restores them after the content has drawn (up to 1.5 s, stops when touched). `history.scrollRestoration` stays manual on the hub (`NAV.hold()`).
- Templates (`assets/templates.js`): `init({nav})`; a category opened from All pushes `Studio.nav` key `tpl-cat`; new API `allY`, `restore(cat,y,layer)`. Saved: `setFilter()` pushes `sv-col`. Both are dropped when you switch tab or go Home (`dropViewLayers`).
- A link tapped on the hub while a menu or sheet is open first closes them in step (`NAV.go`), so Back from the page lands on the hub and not on a stale sheet entry (also calendar.js design links, Settings > What's new).
- What's New: its own Back handler removed (shared `data-back` now). No `unload` listener anywhere (bfcache fine).

## sw.js shell
Add `assets/back.js`. Bump the cache version.

## Tests
- New `tests/r6-nav.mjs` (50 checks). MAP rows needed: `[/assets\/back\.js|assets\/templates\.js|assets\/whatsnew\.js|tools\/[^/]+\.html|whats-new\.html|lab\/(index|board)\.html/,['r6-nav']]`, and add `r6-nav` to the `assets/studio.(js|css)|index.html` row.
- Existing suites unchanged.

## Decisions
- Fallback for a page with no history: the hub at the view last shown in this tab (`studio:view`), else Home.
- Tool "All tools" label replaced by "Back" everywhere (aria-label too).
- Leaving Saved/Templates through a tab drops the open collection's entry; Saved resets to All, Templates keeps its category (as before).
- A category persisted from an earlier visit (no entry) gives no extra Back step.

## Left
- After returning from a tool without bfcache, tapping the All chip (not Back) while the restored collection entry is on top takes a cross-document step (a reload at the previous entry). Rare, same result as Back.
- Plan panes keep their own scroll in the snapshot (`py`) but only Calendar/Ideas/Goals pane scrollTop is checked by eye, not by a test.
