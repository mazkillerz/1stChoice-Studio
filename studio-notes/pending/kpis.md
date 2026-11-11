# Goals (assets/kpis.js, kpis.css), behind the "plan" flag

## What's New card draft
- Title: Goals, a simple place to track your month
- type: feature
- Set how many posts, stories, reels and giveaways you want each month. Anything marked as posted in the Calendar counts by itself ("12 of 15 posts"). Type in your Instagram numbers (reach, likes, saves, followers) and see at a glance whether you are growing against last month.

## README lines
- **Goals** (Home > Goals, or the Goals tab next to Calendar): monthly cards for Posts, Stories, Reels and Giveaways with a goal, progress bar and "+3 vs Oct"; "Edit goals" (steppers, "Same as last month"); "Your numbers" (Update numbers, % change vs last month, entered by hand); "Last 6 months" bar chart for Posts, Stories, Reels, Followers or Reach.

## Lessons
- kpis.js adds calendar.css itself (id `lz-calendar`, same as studio.js) because the header and sheets reuse the calendar styles and Goals can open first.
- Opening `#goals` straight from a URL runs `show()` before studio.js reaches `const netDown` (line ~3210), so `ctx.netDown` throws a ReferenceError (temporal dead zone). kpis.js retries after 400 ms; the lead may want to hoist `netDown` or define planCtx later (same for Ideas).
- Counting: posted calendar items by month (null format = post); giveaways = ideas type giveaway, stage posted, month of its calendar item (else updated_at).
- Wording invented (owner to approve): "Set this month's goals", "Goals are for your team", "Goals are switched on by the owner once", "Entered by hand", "From Instagram".

## Phase 2: Instagram numbers (data model note)
`kpi_months.engagement` is `{reach|likes|saves|followers: {v:Number, src:'manual'|'instagram', at:ISO}}`. A Supabase Edge Function can upsert it daily with `src:'instagram'`; the page already shows "From Instagram" for those and never overwrites an entry unless the person types a different value.
Needed:
- An Instagram business or creator account linked to a Facebook Page.
- A Meta app with permissions `instagram_basic`, `instagram_manage_insights`, `pages_show_list` (and `pages_read_engagement`).
- A long-lived token, refreshed by the function about every 50 days, stored as a Supabase secret (never in config.js).
- Metrics: `reach` (account insights, day/month), `likes` and `saves` summed per media posted that month, `follower_count` (daily snapshot; the last value of the month is the month's followers).
