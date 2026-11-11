# Instagram numbers in Goals (phase 2: plan only, not built)

Goals (2.4.0) stores each month in `kpi_months` (brand, month 'YYYY-MM', targets, engagement, note). Every engagement number is
`{"v": Number, "src": "manual" | "instagram", "at": ISO time}`, so an import can fill the same row without a schema change; the page
already shows "From Instagram" when `src` is `instagram`, and a number typed by hand wins until the next import.

## What the owner needs to set up (once)
1. Switch @1stchoice.om to an Instagram **business or creator** account and link it to a **Facebook Page** (Instagram app → Settings → Account type; then Accounts Center → link the Page).
2. Create a **Meta app** (developers.facebook.com, type Business), add the **Instagram Graph API** (Instagram API with Facebook Login) product.
3. Permissions: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`. For our own account only, the app can stay in development mode (no App Review) with the owner as admin.
4. Generate a **long-lived user token** (60 days) with those permissions; Claude stores it as a Supabase secret (never in `config.js`).

## What Claude builds then
- A Supabase **Edge Function** `instagram-sync` (scheduled daily with pg_cron): reads the token secret, finds the Instagram business account id via the Page, calls
  - `GET /{ig-user-id}/insights?metric=reach,follower_count&period=day` (sum reach per month; followers = last daily value of the month),
  - `GET /{ig-user-id}/media?fields=id,timestamp,like_count,media_type` + `/{media-id}/insights?metric=saved` for posts of the month (likes and saves summed),
  and upserts `kpi_months.engagement` with `src:'instagram'`.
- Token refresh: the function exchanges the long-lived token for a new one when it is older than ~50 days (`/oauth/access_token?grant_type=fb_exchange_token`) and saves it back as the secret (or in a private table only the service role can read).
- Optional later: match Instagram media to calendar items by day + caption to mark them Posted automatically.
