# Taste
Mazoon's design taste and the issues he keeps raising. Read at the start of every session; update at the end (Reflect step). Newest evidence wins.
_Last reviewed: 2026-10-29 (1.21.0: no owner fix requests known after 1.20.0; built his chosen backlog item, built-in backgrounds; earlier: 1.20.0: no owner fix requests known after 1.13–1.19; earlier: 1.15.0 pattern review: no fix requests after 1.12.0; rows 2, 4, 5, 12 settled (no report since 1.5.0); two rejected things were back on screen, underlined links and three blue buttons in the phone Save sheet, and now have checks `links:underline` and `clutter:states`; earlier: 2026-10-28, 1.10.0 pattern review: no fix requests after 1.7.0, 1.8.0 or 1.9.0; rows 3, 6, 7, 8, 9, 10, 11 settled (fixed for 3+ releases, checks kept); row 12's check moved to home7-saved (saved15.mjs never existed); earlier: 1.7.0: no fix requests after 1.6.0; 1.6.0: no fix requests after 1.5.0; earlier: 1.3.0: no fix requests after 1.2.0; asked for faster tests mid-session; earlier: 1.1.0: no new fix requests after 1.0.0; earlier: 1.0.0, after the release: rows 4 and 10 raised again in the 1.0.0 brief and fixed; rows 1–8 and 10 are now checked automatically by tests/taste.mjs, rows 9 and 11 by the suites named in the table)_

Evidence key: **[S]** his own words in a session or brief. **[C]** taken from an owner-directed session's changelog, commit or notes (his exact words not visible). **(inferred)** my reading; ask before leaning on it.
Built from 15 past Studio sessions (first prompt read in 8; only the newest part of 7 long ones, so their early briefs are known through changelog, PLAN and commits), plus lessons, changelog, backlog, PLAN, docs/review-v5 and git log.

## How he likes Studio to look and feel
- Calm and clean, not busy. 0.7.1 "calmer, cleaner look": lighter titles, only weights 400/500/600, one spacing rhythm (4-8-12-16-24-32). [C 25 Oct]
- One blue button per screen state: sheet Done buttons are quiet (grey) since 1.15.0, so Save is the only blue one; secondary actions are blue text buttons, never underlined. [C 1.15.0, inferred from rows 2 and 10]
- Simple beats clever: "every change must make Studio easier, never more confusing". [S 24 Oct] New things hide behind a tap, a sheet or More.
- One bold accent, blue #3d5afe, on the main button of every screen; the rest is neutral. Kept as the default one day after its preview (0.6.0 to 0.7.0). [C]
- Feels like a native phone app, close to Apple's (inferred): springy taps, sheets that slide up, page fades, filled icon on the current tab, haptic buzz and a big tick on save.
- Motion must be smooth and never in the way: "make animations smooth everywhere". [S 25 Oct] One easing curve; reduced motion respected; nothing delays a tap.
- Dark mode has layers, not flat black: page < cards < sheets/menus/bars. [C 0.7.1] The Android bottom strip matches the theme. [C 18 Oct]
- Type: IBM Plex Sans Arabic for Studio's own UI; designs keep the brand fonts (Cairo, Lalezar). Arabic and English sit side by side as equals. [C 0.7.1]
- Icons come from one set (Lucide style): same size, same stroke, current tab filled. Each tool gets its own icon: "Give Restock, Photo story and Collage their own distinct icons". [S 25 Oct]
- Alignment is noticed at the pixel: icon and label centred in the highlight, headings start where the icons below start. [S 25 Oct, C 0.7.0]
- Empty and sparse pages are friendly: say what to do, one button, never a bare page. [C 0.7.1]
- Brand in designs: White is the main look, Cream the second, never mixed on one design; HD can cut-outs only; no cheers or clinking; no cat mascot unless asked. [S CLAUDE.md]
- Photos: no Polaroid frame look (dropped 22 Oct); clean grids, adjustable gaps, edge to edge allowed. [S PLAN]
- Phone decides the layout; wide screens just show more per row (7 designs a row). [C 0.8.0]

## How he likes to work
- Starts from his phone with a few words: "Improve Studio" (4 sessions, 24-25 Oct). You pick the work. When he sends a numbered list, do that list first. [S]
- Merge always: "Merge always". [S 24 Oct] Big redesigns still ship behind a toggle or on a preview branch: "Use a preview branch for my approval before shipping". [S 25 Oct]
- He wants to try work on his phone before it ships: "how can I try it from branch". [S 22 Oct] End with a link or steps.
- End note is short: what changed, what he must do, wording to approve. [S CLAUDE.md]
- Every change gets a What's New card with before/after screenshots and tap counts. It must "look beautiful"; 1.0.0 gets a special entry. [S 24-25 Oct]
- Fewer taps is the scoreboard. Count restock, photo story and save before and after, and say it.
- Catch it before he sees it: "so it's caught before I see it". [S 25 Oct] Run the checks, fix, then report. Do not hand him bugs.
- The skill must learn: this file, an auto-check per recurring issue, pattern review at every Simplify session and major version, a self-score per session. [S 25 Oct]
- Saves usage: cheap models run routine tests; smoke test + targeted suites every session; full sweep only in Simplify sessions. [S 25 Oct] Tests must be quick: "Still suite tests taking too long lets adjust the skill" [S 25 Oct, 1.3.0]: `--quick` while working, `--changed` once before merging.
- Sessions get cut by usage limits (he set auto-resume tasks 24 Oct, inferred). Commit small and often.
- Trusts a reasoned call: "do whats best accordingly" (Penpot, 24 Oct). [S] We ported its ideas instead of embedding it.
- Other sessions can run at once: "keeping in mind another session ongoing". [S 24 Oct] Fetch main and merge it in before release.
- No AI features in 1.0.0. [S 25 Oct]
- Answers choice questions fast (22 Oct, Create). Offer a recommended option, ask at most two questions.
- The team uses Studio on phones for restock stories. Team jobs come before his power tools.

## Recurring issues (he had to report these more than once)
Counts = separate versions or briefs where the issue was raised. "Exists" = already automated; "New" = still to build. "Settled" = fixed for 3+ releases; the check keeps running.

| # | Issue | Times raised (versions/dates) | Example | Check that catches it |
|---|-------|------|---------|------|
| 1 | Too many steps or taps | 8: 0.1.0, 0.3.0, 0.5.0, 0.7.0, 0.7.1, 0.9.0 (all 24-25 Oct), gate 24 Oct, 1.0.0 brief | Save was two taps on a phone, then one (0.5.0). Save with collection was five, then two (0.7.0). | Tap budget in smoke.mjs: Restock photo to saved <= 2 taps, Photo story <= 2, Save + team <= 2. A change may not raise a count. (Exists: smoke.mjs tap budget + taste.mjs + simplify15 for Offer) |
| 2 | Clutter, more on screen than the job needs **(settled 1.15.0)** | 8: 0.5.0, 0.6.0, 0.7.0, 0.7.1, Phase 3 (22 Oct), gate 24 Oct, 1.0.0 brief, 1.5.0 brief (tools listed twice, two chip rows, + menu too long) | Big Start-from-a-photo buttons became one + button. Home shows only pinned tools. | First view of home and of each tool: at most one filled primary button, no two visible controls with the same label or action; every state of a screen, open sheets included, <= 2 accent-filled buttons (chosen chips aside): taste.mjs `clutter:states` (1.15.0); the Save sheet: simplify15. (Exists: taste.mjs) |
| 3 | Pop-ups, notes and sheets in the way **(settled 1.10.0)** | 6: 18 Oct (invisible design pop-up, tap-outside), 0.3.0, 0.7.0, 0.7.1, 1.0.0 brief | "Your photo is in" note stayed over the design with a second Save button. Page scrolled behind All tools. | No toast or note covers more than 15% of the preview or stays longer than 3.5 s; it can be dismissed by tap or swipe; every dialog fully inside the viewport (also 1280x800); page scrollY unchanged while one is open. (Exists in part: quicksave, home7 scroll lock) |
| 4 | Edges and sizes that do not line up **(settled 1.15.0)** | 5: Phase 3 (22 Oct), 0.7.0, 0.7.1, 1.0.0 brief (25 Oct), 1.5.0 brief (Template badge under ⋯; posts with a grey gap in cards) | "Start from a photo" title sits further left than the icons below it (+ menu). Home icon taller than Saved icon. | Every heading in a menu or sheet starts at the same x as the icons of its rows (+/-1px); sibling icons have equal rendered size (+/-1px); bar highlight centres icon and label (<=2px). (Exists: taste.mjs) |
| 5 | RTL and Arabic layout **(settled 1.15.0)** | 4 plus hard rule: 18 Oct (inputs), 0.7.1, 1.0.0 brief, 1.5.0 brief (mixed Arabic/English names wrapping messily: now one line) | Arabic name and its time on opposite sides; "1 h ago" read "h ago 1"; search icon over the clear button. | Seed approved Arabic names. No Arabic text runs left-to-right; rows with Arabic are :dir(rtl) with chevrons mirrored; times and numbers inside bdi; start/end icons never overlap. Run in light and dark. (Exists: contrast.mjs, polish71) |
| 6 | Contrast in light and dark **(settled 1.10.0)** | 4: Phase 3 (22 Oct), 0.6.0, 0.7.1, 1.0.0 brief | Grey tick on green. Chosen chip blank in light, dark on dark in dark. | Text >= 4.5:1 (large text 3:1) on every screen in both themes, including aria-pressed/selected, pressed and disabled states; icons and ticks >= 3:1; a selected state must differ from the unselected one. (Exists: contrast.mjs. Selected states New) |
| 7 | Tap targets and fiddly touch **(settled 1.10.0)** | 6: 18 Oct, 22 Oct (Create handles), 0.1.0, 0.2.0, 0.3.0, 0.7.1 | Done buttons too small; 9-spot pad cells; Create handles "too small / fiddly". | Every visible control >= 44px (goal 48px) or has a >= 48px hit area; 8px between neighbours; handles >= 44px hit area; tap picks the top layer, empty tap deselects. (Exists: tapscan.mjs) |
| 8 | Hidden, cut off or squeezed on small phones **(settled 1.10.0)** | 6, mostly [C]: 18 Oct x2, 0.1.0, 0.3.0, 0.7.1, 0.7.1 tests | Restock hidden in a sideways scroller. Chip shadow cut in a hard line. Title squeezed at 360px. Desktop ready card below the fold. | At 360, 390, 412 and 1280x800: no horizontal page scroll; no clipped text (scrollWidth <= clientWidth + 1 unless a clamp is intended); 12px+ room under chip rows; last row clear of the fixed bar. (Exists: taste.mjs) |
| 9 | Work lost or overwritten by accident **(settled 1.10.0)** | 4: 18 Oct x2, 22 Oct (drafts), 0.7.0 | Start fresh deleted a draft ("owner hit it"). Team switch left on. | Start fresh adds a draft (count +1); deleting always asks; opening a saved design never turns "save to team" on. (Exists: v5, home7, simplify) |
| 10 | Controls that do not say what they do **(settled 1.10.0)** | 3: 0.7.1 x2, 1.0.0 brief | Magnet icon (Snap) with no word; three tools sharing one camera icon; underlined text links. | Icon-only controls have a visible label or a tooltip; no two tools share an icon; secondary actions sit in a menu; no button or link is underlined: taste.mjs `links:underline` (1.15.0). (Exists: taste.mjs) |
| 11 | Shared-CSS slip makes a control look wrong **(settled 1.10.0)** | 2: 0.6.0 (tick), 0.7.1 (chip), both specificity | `.chip.col{background}` beat `.chip[aria-pressed]`. | Compare computed styles, not only screenshots; a variant class that sets colours needs its own selected-state rule. (Exists: contrast.mjs after a CSS change) |
| 12 | Browser-native controls and stuck focus rings **(settled 1.15.0)** | 1: 1.5.0 brief (the native Sort dropdown; a blue ring stuck on it) | The Sort `<select>` | Use Studio sheets, not `<select>`, on hub pages; `:focus:not(:focus-visible){outline:none}` on new buttons; home7 (Saved part) checks the sort button has no outline after a tap. (Exists: home7-saved) |

## Things he rejected (never do again)
- Losing or overwriting work: Start fresh deleting a draft; team save on by default for an opened design. [S/C 22 Oct, 25 Oct]
- Polaroid frames; the "New" label on hub tools. [S 22 Oct PLAN]
- The engine choosing a 1st Choice word, colour or font by itself: everything brand-specific comes from the brand kit. [S CLAUDE.md; checked by brandkit.mjs since 1.20.0]
- Board's fiddly selection as the base of Create; he chose an own phone-first editor. [S 22 Oct]
- A page that scrolls behind a pop-up. [C 0.7.0]
- A lingering note with its own second Save button over the design. [C 0.7.1]
- Icon-only buttons with no word; underlined links for secondary actions. [C 0.7.1] (They were back on screen for 8 versions until 1.15.0 added `links:underline`; three blue buttons in a sheet likewise, now `clutter:states`.)
- Weight-800 bold, one flat black in dark mode. [C 0.7.1]
- A sideways scroller that hides the team's main tool. [C 0.1.0 lesson]
- New features on the first screen; moving familiar buttons without a reason (the + menu order stays fixed). [S 24 Oct]
- Big redesigns shipped straight to main without a toggle or preview. [S locked core]
- AI features in 1.0.0. [S 25 Oct]
- Brand slips: invented Arabic, غرشة, خوي, cheers or clinking, cat mascot, Cream mixed with White, drawn cans. [S CLAUDE.md]

## Things he loved (do more)
- Press-and-drag to reorder (asked for it by name, 1.5.0) over arrow buttons. [S 26 Oct]
- A + menu with only the three photo tools and New design, with More for the rest. [S 26 Oct]
- One-tap flows: Quick start from a photo, one-tap Save, share from the gallery. He kept asking for fewer steps. (inferred from repeat asks)
- The fresh look (blue accent, spring taps, soft depth, save tick plus buzz): made the default after one preview day. [C 24-25 Oct]
- Search at the top that finds everything, Arabic with or without harakat; a home that shows only his pinned tools. (inferred)
- The + button in the thumb zone; the Saved grid with filters; select several. (inferred)
- Power tools with depth: Create, Board with Penpot ideas, Highlight covers. [C]
- What's New with before/after pictures and plain "one tap instead of two" notes. [S format]
- Tests that catch problems for him (contrast scan, tap scan, smoke). [S 25 Oct]

- His own Studio logo: the black dragon (25 Oct 2026, 1.2.0). Studio's mark, not the brand's: it never goes on designs. [C 25 Oct]

## Open questions to ask him
- Backgrounds (1.21.0): are the finishes strong enough on white on a real phone? Carousel has them since 1.22.0; Highlight covers left out on purpose (no room on a small cover). Which other tools want them (Cinematic, New place, Offer, Collage gaps)?
- Saved cards align captions with each name's direction, so a mixed grid has captions on both sides. One side for all?
- The "Your photo is in" note fades after about 3 s. Long enough to read and notice the Save pulse?
- Does the team miss a "Saved design" label on a phone (hidden today)?
- Want a direct picture-only Save button and a direct team-only save, now that Save is 3 and 2 taps?
- Select mode: Select at top right, or swipe-to-tick like Photos?
- Welcome intro (1.0.0): is 3 swipes the ceiling, and should it also show on devices that already use Studio?
- Should Studio's own labels ever be Arabic, or English UI with Arabic content only?
- Is one blue accent right for the Cream look too, or should the UI stay neutral there?
- Haptics and share target: confirmed on a real Android phone and an iPhone?
