# Backlog

Ranked ideas and bugs. Score = team impact + Mazoon impact + wow − effort (each 1–5). Highest first.

**Last session:** 9 (0.8.0) was a **Mazoon** session (select several saved designs: Collection / Take out / Delete in one go; 7 designs a row on a computer). The next one (0.9.0) is a **team** session.
**Simplify session:** every 5th version. The next one is 0.10.0.

## Next up
| # | Idea | Team | Mazoon | Wow | Effort | Score | Notes |
|---|------|-----:|-------:|----:|-------:|------:|-------|
| 23 | Saved page: a bigger peek when you press and hold (the picture large, swipe to the next) before the actions | 2 | 3 | 4 | 2 | 7 | |
| 24 | + menu: show the tool you used last first, and Templates as a third choice | 3 | 2 | 2 | 1 | 6 | Watch what the team taps. |
| 18 | Fresh look on Board / the lab pages (they load studio.css but have their own bars) | 1 | 3 | 3 | 2 | 5 | After approval. |
| 19 | Reorder pinned tools (drag in All tools, or "Move up") | 3 | 3 | 2 | 2 | 6 | Today pins follow the TOOLS order. |
| 20 | Search: real template previews (reuse Create's kept previews in IndexedDB, `TPL_LOOK`) and the Create template picker opening straight to a search hit | 2 | 3 | 3 | 2 | 6 | Search rows show an icon for brand templates today. |
| 21 | Check haptics on a real iPhone (iOS 18 switch tick) and a real Android; the save tick fires after an async save, which iOS may not allow outside a tap | 2 | 2 | 2 | 1 | 5 | Needs a device. |
| 3 | Post maker presets (1080×1350) for Did-you-know / Your-choice / Ice cold as one-tap tools on the hub | 3 | 4 | 3 | 2 | 8 | Templates exist in Create; surface them. |
| 4 | Share target: share photos from the phone's gallery straight into Studio (PWA `share_target`) | 5 | 3 | 5 | 4 | 9 | Needs a service-worker POST handler; Android only, iPhone no. |
| 5 | Batch export: save every slide/page or several drafts in one go (ZIP or share sheet with many files) | 3 | 4 | 3 | 3 | 7 | |
| 6 | Template search and collections in Create (search by word, favourites) | 2 | 4 | 3 | 3 | 6 | Hub search finds templates since 0.6.0; inside Create there is still no search box. |
| 7 | Background removal for can photos (on-device model, lazy-loaded) | 3 | 4 | 5 | 5 | 7 | Check size/speed on a mid-range Android first. |
| 8 | Text styles (saved headline/small-line presets) | 2 | 3 | 2 | 2 | 5 | |
| 9 | Stickers pack (brand-approved shapes, arrows, sparkles) | 2 | 3 | 3 | 2 | 6 | Wording must come from brand.js. |
| 10 | Highlight covers: a **Product** cover type that puts a brand asset (HD can cut-out) in the circle; emoji covers | 2 | 4 | 3 | 2 | 7 | Follow-up to 0.2.0. Use the brand's `assets` list, never a drawn can. |
| 12 | Quick start for Highlight covers / Carousel (several photos → one page each) | 3 | 3 | 3 | 2 | 7 | Ready bar from 0.3.0 works for any tool with `quick`. |
| 14 | Board: component overrides beyond words (swap a photo or colour in one copy), and copies that follow the main's size | 1 | 4 | 3 | 3 | 5 | Follow-up to 0.4.0 components. Today only typed words are kept per copy. |
| 15 | Board: Penpot-style **flex layout** (a frame or group that stacks its items in a row/column with gap and padding, and grows with text) | 2 | 4 | 4 | 4 | 6 | Biggest remaining Penpot idea; great for price lists and menus. Ship behind a toggle. |
| 16 | Board: outline (stroke) on Union/Exclude combined shapes; today only Subtract/Intersect keep the bottom shape's outline | 1 | 2 | 1 | 3 | 1 | Needs a real outline path (vector boolean library) — only if asked. |
| 11 | Second brand kit plumbing check (a dummy brand to prove brand-agnostic) | 1 | 3 | 2 | 2 | 4 | |

## UX audit findings (open)
- Saved cards align their caption with the name's direction (Arabic names on the right). A grid that mixes both has captions on both sides; watch whether the team prefers one side for all.
- The Quick start note fades after 3.2 s: check on a real phone that it is long enough to read, and that Save's pulse is noticed.
- Board and the lab pages now get the interface font (IBM Plex Sans Arabic) through studio.css but keep their own 800 weights (drawn as 700); align them with the 400/500/600 scale with backlog #18.
- Old CSS left unused since 0.7.1: `.col-tools`, `.banner.ready` rules, `.link` in col tools. Remove in the next Simplify session (0.10.0) with the 0.5/0.6 leftovers below.
- A saved design opened on a phone shows no "Saved design" label (`#designBar` is hidden on phones by `.panel>.banner{display:none}`); the Save sheet's switch says "Update “name” in the team" instead. Check whether the team misses the label.
- Picture-only save when signed in is now 3 taps (Save, switch off, Save); picture + team is 2 (was 3–5). Watch whether the team wants a direct picture-only button; if so add it under the Save button.
- Select mode (0.8.0): on a phone, check whether the team finds **Select** at the top right or only through press and hold → Select more. Swipe-to-tick across several cards (like Photos) would be faster for long lists.
- Select mode: Save the pictures of several designs in one go would fit the same bar (needs each tool to render offscreen: see #5 Batch export).
- Old hub CSS left from 0.5/0.6 (`.qbtn`, `.quick*`, `.dgrid`, `.dcard`, `.rcard`, `.recent`, `#saved .sec-head`) is unused since 0.7.0: remove it in the next Simplify session (0.10.0).
- tapscan still reports the custom-colour `input[type=color]` (38px) inside `.sw-btn`: its parent's `::after` gives the hit area. Teach tapscan to check the parent's `::after` too.
- Team-only save (no picture) on a phone now means: Save, cancel the share sheet, then "Only save to the team". Watch whether the team misses a direct way; if so, add it under a "More" in the sheet.
- Inspector (layer editor) Done is still 40px tall visually; since 0.2.0 every Done has an invisible 48px hit area. Only enlarge it visibly if full.mjs stays green.
- Create: Templates already show a shimmer while loading (checked 0.2.0); only pre-rendered thumbnails would improve it further.
- Create top bar: the "Untitled design" title gets little room on a phone; check long names.
- What's New screenshots: consider WebP (smaller) once Safari support is confirmed for the team's phones (it is on iOS 14+).
- Check contrast of muted text (`--muted` #5f5b55 on #f5f4f1 ≈ 6:1, OK) on cream backgrounds in sheets.

## Done
- 0.8.0 (Mazoon): Saved page select mode (Select / Select all / Clear; Collection adds the ticked designs to an existing or new collection, keeping their others; Take out while a collection is chosen; Delete many with one confirm; ✕ / Escape / Back stop; press and hold → Select more), 7 designs a row on a computer (#22 and the desktop tiles audit finding).
- 0.7.1 (owner-directed polish): chosen collection chip readable in both themes with its full shadow; Rename / Delete collection in a ⋯ menu on the chosen chip (Delete asks first); design cards framed with the name (2 lines, `dir="auto"`) and time grouped; search clear ✕ at the end and magnifier at the start; Arabic search rows and the design menu header right to left; Quick start note fades in ~3 s (swipe / tap the photo), no second Save, bar Save one tap until the first edit; Snap labelled; Lucide bar icons, filled for the current tab; IBM Plex Sans Arabic with 400/500/600; one spacing rhythm; layered dark surfaces; friendly empty states, New design card and tip on sparse Saved; contrast + RTL sweep script.
- 0.7.0 (owner-directed): Fresh look is the default (switch removed) and more polished (wash, button light, sheets slide up, chip pop, greeting); + button (Restock / Photo story / Collage from a photo, New design) and a camera button on photo-first rows instead of the Start from a photo block; Saved designs row on home + Saved page (picture grid, type + collection filters, press and hold / ⋯ actions with confirmed delete); one-tap save sheet (team on for new designs when signed in, name filled, last collection); Looks good · Save adds to the team too (#13); scroll lock for pop-ups, sheets and search; bottom bar Home + Saved with a centred highlight; What's New: latest as a big card, grouped older versions, type filters.
- 0.6.0 (owner-directed): universal search at the top of the hub (tools, templates, saved designs, collections, unfinished stories, settings and actions; recent searches + shortcuts; Arabic-aware), pinned home + All tools library with stars (per device; Restock on a new device, the three photo-first tools on a device that used Studio before), Fresh look preview behind a switch (motion, soft depth, one bold blue accent, save tick + haptics), white "Saved!" tick for everyone.
- 0.5.0 (Simplify): one-tap Save on a phone (two taps → one; sheet then offers Add to the team, no second picture), hub tools grouped (Stories / Posts and covers / Make anything) with Restock first, two tool views instead of three, shorter hub intro, tapscan counts `::after` hit areas and skips screen-reader-only inputs.
- 0.4.0: Board gets two Penpot ideas: Combine shapes (union/subtract/intersect/exclude, live and editable, Combine in the quick bar) and Components (main + copies that follow it, words kept per copy, detach/reset/go to main).
- 0.3.0: Quick start ready bar ("Looks good · Save" saves in one tap; Change words), bigger Text place pad on phones (cells 30 → 45px).
- 0.2.0: Highlight covers tool (icon / word / photo, shared look, one PNG per cover), pager wording per tool (`pageNoun`), `cols` on seg fields, bigger Done on the main sheets + 48px hit area on every Done, hex box 44px.
- 0.1.0: Quick start from a photo (Restock / Photo story / Collage), What's New page + badge, tap targets (hub view switch, Experimental, Create back / Design menu / page + / Done).
