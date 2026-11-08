# calendar-simple (pending What's New cards)

## Card 1 (type: fix)
**Calendar: the Home row looks right, and Link designs shows every design**
The Calendar row on Home was drawing as one big grey block. Picking a design for a post now opens a full screen with every saved design, search, and collection chips.

## Card 2 (type: feature)
**Plan a post, the simple way**
Tap +, choose Post or Story, pick a design, add a caption and tap Save. Times are one tap (9:00, 12:00, 7:00 pm, 9:00 pm), hashtags are read from your caption, and every card has Copy caption and a visible ⋯ menu (Mark as posted, Move to tomorrow, Delete).

## Taps to add a post with a design and a caption
- Before: + (1), type a title (required), Link designs (2), scroll the small inner box and tap a design (3, often hidden below the fold), type caption + hashtag chips (or "Use the design's caption", +1), Add to calendar (4). 4 to 5 taps plus 3 typed fields, only the newest design reachable on a phone.
- After: + (1), Post (2), Pick a design (3), a design (4), Save (5); caption typed (or auto-filled from the design); 7:00 pm is already chosen (a different time = +1 tap). 5 taps, no title, no hashtag chips.

## Other
- New migration: supabase/migrations/20261108120000_calendar_item_format.sql (the lead already applied it live). cloud.js retries a save without `format` if the column is missing.
- Items without a stored format show the shape of their linked design (carousel/highlight = post, otherwise story).
- Removed: long-press menu on touch (the ⋯ replaces it), title and hashtag fields, "Use the design's caption" button (picking a design fills an empty caption), 4-way status list (In review is read-only text; Draft/Ready/Posted; Ready is stored as `approved`).
- tests: captions.mjs section 5 changed for the new caption behaviour. No new files for the sw.js shell, no new run.mjs rows. No new Arabic wording.
