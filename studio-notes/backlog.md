# Backlog

Ranked ideas and bugs. Score = team impact + Mazoon impact + wow − effort (each 1–5). Highest first.

**Last session:** 16 (1.5.0, 26 Oct 2026) was an owner-directed **Simplify** session (Mazoon's six-point list): All tools drag ordering (pinned on top, each tool once), a 3-tool + menu with More tools, a Studio sort sheet, one chip row on Saved, 3:4 cards with the Template badge in its own corner and one-line names, no New design tile. The next session, 1.6.0, is a **team** session.
**Simplify session:** every 5th minor version. The next one is 1.10.0 (with a pattern review).

## Next up
| # | Idea | Team | Mazoon | Wow | Effort | Score | Notes |
|---|------|-----:|-------:|----:|-------:|------:|-------|
| 18 | Fresh look on Board / the lab pages (they load studio.css but have their own bars) | 1 | 3 | 3 | 2 | 5 | After approval. |
| 20 | Search: real template previews (reuse Create's kept previews in IndexedDB, `TPL_LOOK`) and the Create template picker opening straight to a search hit | 2 | 3 | 3 | 2 | 6 | Search rows show an icon for brand templates today. |
| 21 | Check haptics on a real iPhone (iOS 18 switch tick) and a real Android; the save tick fires after an async save, which iOS may not allow outside a tap | 2 | 2 | 2 | 1 | 5 | Needs a device. |
| 3 | Post maker presets (1080×1350) for Did-you-know / Your-choice / Ice cold as one-tap tools on the hub | 3 | 4 | 3 | 2 | 8 | Templates exist in Create; surface them. |
| 5 | Batch export: save every slide/page or several drafts in one go (ZIP or share sheet with many files) | 3 | 4 | 3 | 3 | 7 | |
| 6 | Template collections in Create (favourites, recently used) | 2 | 3 | 2 | 3 | 4 | Search box shipped in 1.4.0. |
| 7 | Background removal for can photos (on-device model, lazy-loaded) | 3 | 4 | 5 | 5 | 7 | Check size/speed on a mid-range Android first. |
| 8 | Text styles (saved headline/small-line presets) | 2 | 3 | 2 | 2 | 5 | |
| 9 | Stickers pack (brand-approved shapes, arrows, sparkles) | 2 | 3 | 3 | 2 | 6 | Wording must come from brand.js. |
| 10 | Highlight covers: emoji covers; Product covers with a size/position slider | 1 | 3 | 2 | 2 | 4 | Product type shipped in 1.4.0. |
| 14 | Board: component overrides beyond words (swap a photo or colour in one copy), and copies that follow the main's size | 1 | 4 | 3 | 3 | 5 | Follow-up to 0.4.0 components. Today only typed words are kept per copy. |
| 15 | Board: Penpot-style **flex layout** (a frame or group that stacks its items in a row/column with gap and padding, and grows with text) | 2 | 4 | 4 | 4 | 6 | Biggest remaining Penpot idea; great for price lists and menus. Ship behind a toggle. |
| 16 | Board: outline (stroke) on Union/Exclude combined shapes; today only Subtract/Intersect keep the bottom shape's outline | 1 | 2 | 1 | 3 | 1 | Needs a real outline path (vector boolean library) — only if asked. |
| 11 | Second brand kit plumbing check (a dummy brand to prove brand-agnostic) | 1 | 3 | 2 | 2 | 4 | |

## UX audit findings (open)
- 1.5.0: one-line card names cut English dates on a phone ("Restock – 24 …"); watch whether the team misses the date. An idea: show the date as the card's second line (it is in the name today) or two lines only when the name has one script.
- 1.5.0: Saved: the chosen collection's ⋯ can sit under the row's end fade on a narrow phone; the row scrolls it into view, but check on a real phone.
- 1.5.0 full sweep: tapscan lists tick boxes (24px) and colour wells (38px) on tool Style/Words sheets; they sit inside larger rows (taste passes), same as 1.4.0. Confirm each row is the hit area.
- 1.5.0: drag in All tools has no auto-scroll; fine for up to ~8 pinned tools (the pinned list is at the top of the sheet). Add edge auto-scroll if someone pins most tools.
- 1.3.0: Peek opens from the picture in a design's menu (press and hold → picture). Watch whether the team finds it; a quicker way would be press and hold straight into Peek with the actions under it (changes a familiar gesture: ask first).
- 1.3.0: test time: `home7` (~145 s) and `polish71` (~135 s) run for any hub or CSS change; split them by area in the 1.5.0 Simplify session so a small hub change runs a part.
- 1.0.0 follow-ups: Collage's logo at default settings sits at y≈1700–1780, below the story safe line (1620); kept so old designs stay identical; decide with Mazoon whether new collages move it up. Create's story templates put the logo at the bottom 1740 too.
- 1.1.0: Carousel from photos makes slide 1 a Cover and the rest Photo + words; consider adding an End slide automatically when there are 3+ photos (ask Mazoon).
- 1.0.0: the welcome tour only opens on devices that never used Studio (owner's words: "for new devices"). Ask whether the current team should see it once too.
- 1.4.0: `tests/taste.mjs` now covers Carousel, Highlight covers and Create (first view); the note/toast monitor still only watches Restock, and the lab is not covered yet.
- 1.4.0: Create has its own Arabic normaliser for template search (`normQ` in create.js); share one with `assets/search.js` in the Simplify session.
- 1.0.0: on a computer the tool page shows the Save card right after Photo (above Style and Words); check whether that order is what Mazoon wants.
- 1.0.0: Templates library ideas: favourites (star a template), "recently used", and team templates with real previews in the Team row (they use the saved thumbnail today).
- Share target (0.9.0): check on a real Android phone with Studio installed (Share → Studio appears, the sheet opens, HEIC from Samsung galleries opens in the tool). Chrome only picks up the new manifest after the installed app updates (can take a day); reinstalling forces it.
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
- 1.5.0: + menu slimmed to 3 photo tools + New design + More tools (was the 1.1.0 audit note); All tools ordering by drag; sort sheet; Saved filters in one row; card fixes.
- 1.4.0 (Mazoon, 3 parallel helpers): Highlight covers **Product** type (the brand kit's HD can pictures in the circle, picker in Style); Create template search (English + Arabic, empty state, ✕) and `?tpl=` on an open design shows the picker on that template; taste checks for Carousel, Highlight, Create + labels on icon-only controls; checkbox rows aligned with their sheet heading (4px).
- 1.3.0 (team): Peek, a saved design big with swipe to the next (#23); the shared photo waits on Home ("Your photo is in", Pick / ✕); `tests/run.mjs --quick`, `--dry`, origin/main as base, studio.js mapped by tool()/home(), slowest first (26 → 13 suites, 487 → 193 s). Hub tool thumbnails checked: kept (a fresh render was worse).
- 1.2.0 (owner-directed, Mazoon): Studio's own logo (the dragon from the owner: app icons 180/192/256/512, a separate maskable icon, the mark next to the brand logo on Home, inverted in dark; old "1st" icons in `_archive/app icons 1st mark (2026-10-25)/`); pins keep the order you set, All tools › Order on your home moves one up (#19).
- Idea: the dragon in the welcome tour and on the What's New page header; a higher-resolution source of the dragon would sharpen the 512px icon (the owner's picture is ~400px across).
- 1.1.0 (team): Carousel (up to 10) and Highlight covers (up to 12) start from photos in +, camera rows and the share sheet, one slide/cover per photo (#12); Collage drops on a photo's border swap it (audit finding); own icons for both tools.
- 1.0.0 (owner-directed milestone, preview branch): first-run welcome (3 swipes, once per new device, Settings → Welcome tour), Templates library (Home · Templates · Saved; restock, stories, posts, highlights, team; real previews; one tap opens a preset `?preset=` or a Create template), 8 new Create templates, Restock (Cans with no photo + one-tap Save, Split, Big words, photo shape, headline size, button colour), Photo story (Whole photo, Caption, Poster, Arch, headline size, shade, words colour, logo switch), Collage (more grids for 2–9, border + colour, gap to 80, edge space), photo looks + Light for every photo, Move tab (nudge, centre, middle, rotate), Swap two / Shuffle, + menu on one inset with an icon per tool + Templates, Settings sheet, one-line notes, What's New milestone banner + bold; #24 (Templates in +) and #20 partly (search shows template previews for presets).
- 0.9.0 (team): share photos from the phone's gallery into Studio (Android, installed: manifest `share_target`, sw.js POST handler → IndexedDB → hub pick-a-tool sheet → Quick start), Last time tag on the photo tool used last in + and the share sheet (#4, part of #24); Android install hint mentions sharing.
- 0.8.0 (Mazoon): Saved page select mode (Select / Select all / Clear; Collection adds the ticked designs to an existing or new collection, keeping their others; Take out while a collection is chosen; Delete many with one confirm; ✕ / Escape / Back stop; press and hold → Select more), 7 designs a row on a computer (#22 and the desktop tiles audit finding).
- 0.7.1 (owner-directed polish): chosen collection chip readable in both themes with its full shadow; Rename / Delete collection in a ⋯ menu on the chosen chip (Delete asks first); design cards framed with the name (2 lines, `dir="auto"`) and time grouped; search clear ✕ at the end and magnifier at the start; Arabic search rows and the design menu header right to left; Quick start note fades in ~3 s (swipe / tap the photo), no second Save, bar Save one tap until the first edit; Snap labelled; Lucide bar icons, filled for the current tab; IBM Plex Sans Arabic with 400/500/600; one spacing rhythm; layered dark surfaces; friendly empty states, New design card and tip on sparse Saved; contrast + RTL sweep script.
- 0.7.0 (owner-directed): Fresh look is the default (switch removed) and more polished (wash, button light, sheets slide up, chip pop, greeting); + button (Restock / Photo story / Collage from a photo, New design) and a camera button on photo-first rows instead of the Start from a photo block; Saved designs row on home + Saved page (picture grid, type + collection filters, press and hold / ⋯ actions with confirmed delete); one-tap save sheet (team on for new designs when signed in, name filled, last collection); Looks good · Save adds to the team too (#13); scroll lock for pop-ups, sheets and search; bottom bar Home + Saved with a centred highlight; What's New: latest as a big card, grouped older versions, type filters.
- 0.6.0 (owner-directed): universal search at the top of the hub (tools, templates, saved designs, collections, unfinished stories, settings and actions; recent searches + shortcuts; Arabic-aware), pinned home + All tools library with stars (per device; Restock on a new device, the three photo-first tools on a device that used Studio before), Fresh look preview behind a switch (motion, soft depth, one bold blue accent, save tick + haptics), white "Saved!" tick for everyone.
- 0.5.0 (Simplify): one-tap Save on a phone (two taps → one; sheet then offers Add to the team, no second picture), hub tools grouped (Stories / Posts and covers / Make anything) with Restock first, two tool views instead of three, shorter hub intro, tapscan counts `::after` hit areas and skips screen-reader-only inputs.
- 0.4.0: Board gets two Penpot ideas: Combine shapes (union/subtract/intersect/exclude, live and editable, Combine in the quick bar) and Components (main + copies that follow it, words kept per copy, detach/reset/go to main).
- 0.3.0: Quick start ready bar ("Looks good · Save" saves in one tap; Change words), bigger Text place pad on phones (cells 30 → 45px).
- 0.2.0: Highlight covers tool (icon / word / photo, shared look, one PNG per cover), pager wording per tool (`pageNoun`), `cols` on seg fields, bigger Done on the main sheets + 48px hit area on every Done, hex box 44px.
- 0.1.0: Quick start from a photo (Restock / Photo story / Collage), What's New page + badge, tap targets (hub view switch, Experimental, Create back / Design menu / page + / Done).
