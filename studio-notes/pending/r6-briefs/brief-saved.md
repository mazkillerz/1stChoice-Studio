# Topic: saved — Part 6, Saved designs + every grid in Studio
Tree: `/home/user/studio-saved` (branch `claude/r6-saved`), port **8085**. Read `brief-common.md` in this folder first.
Before you start: `git merge --no-edit claude/kind-rubin-o2srxm` in your tree (the lead's newest work).

## Owner's words
"The standalone 'Campaigns' button looks out of place, and I've never used Campaigns. Review it: if it's useful, fold it in simply (e.g. into collections). If not, archive it.
The '...' buttons cover the design previews, and titles get cut off. Fix both, and check every grid in Studio for the same problems."

## Decision already made by the lead: archive Campaigns
Supabase has 0 campaigns and 0 designs/calendar items linked to one. So:
- Move `assets/campaigns.js` + `assets/campaigns.css` (and `tests/campaigns.mjs`) to `_archive/campaigns (2026-11-16)/` (`git mv`, then `git add -f`).
- Remove every Campaigns entry point in `assets/studio.js` (Saved's Campaigns button/row, select mode's "Campaign" button `selCamp`, the design menu's Campaign row under Team, search actions, `campaignRecipe` / `campaignStamp` → make them return the recipe unchanged, no lazy load; keep `campaign_id` in the column lists of cloud reads so nothing breaks), the tool page / Create hooks that lazy-load campaigns (grep `campaign` in `tools/`, `assets/`), the calendar's campaign bits if any (grep `assets/calendar.js`), and the "campaigns" word in the `team` flag's sub label. Keep `cloud.js` campaign API functions (harmless; data stays). Put the removed code snippets in `_archive/campaigns (2026-11-16)/removed-code.txt`.
- `tests/run.mjs`: drop `campaigns` from MAP/HUB_SUITES; grep other suites for `selCamp`/`campaign` and update them.

## "⋯" buttons over previews, cut-off titles — every grid
- Saved grid cards (`svCard` in studio.js, `.sv-card` CSS): the ⋯ button must not cover the design picture. Proposed: put the ⋯ in the caption row under the picture, at the end of the title line (title on the left with up to 2 lines, ⋯ 44px tap target on the right, visually ~28px icon) — like Instagram/Files apps. Long-press / right-click menus still work.
- Titles: show the full name on up to 2 lines (`-webkit-line-clamp:2`), never cut to a few characters; the second meta line (time / collection) stays one line with ellipsis. Arabic: `dir="auto"`, right-aligned when Arabic.
- Check EVERY grid / card list in Studio for the same two problems and fix them the same way, with one shared pattern (class) rather than many one-offs: Saved (all its views: All, collections, select mode, search results `findRow`), Home's Saved row, Continue editing row (`.ccard`), Templates page (`assets/templates.js` `.tp-card`, team templates with ⋯ if any), Create's template picker (`tools/create.js` `.cr-tpl`, star button over the thumb?), Team assets (`assets/teamassets.js`), the Brand kit page, the calendar's design picker (`assets/calendar.js` pick), Feed (`assets/feed.js`), Video's reel list. Leave star/favourite badges if they don't cover the important part, but the rule is: controls never cover the preview; titles readable.
- Phone 390 and 360, light + dark, and 1280 (7 per row on wide screens is the owner's liking).

## Tests
`tests/r6-saved.mjs`: (a) no Campaigns button/row anywhere on Saved, in select mode or the design menu, and `assets/campaigns.js` never requested; (b) for each grid you changed: the ⋯ button's box does not overlap the preview image's box; (c) a long name (use an approved phrase from `brands/1stchoice/brand.js` repeated, or a long English name like "Restock story for the weekend market") shows on two lines, not cut after one; (d) the menu still opens from ⋯. Then run: `home7-saved polish71-saved extra select select-swipe peek cardnames batch-saved saved-find saved-versions templates tplfav tplteam teamassets calpick feed review captions hub-fixes simplify45 taste`.
