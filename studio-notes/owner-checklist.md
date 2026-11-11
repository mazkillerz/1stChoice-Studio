# Owner checklist (round 3, Studio 2.3.0, 11 Nov 2026)

1. ~~Approve the new table~~ done: `team_assets` is live (you approved it on 11 Nov; nothing existing changed).
2. **Try the New Studio look.** What's New → the last card → switch it on (only your phone changes). Tell Claude: keep it, change it, or drop it.
3. **Save a story both ways** on your phone: My phone, then Phone + Team with a collection. Check it lands where the button said.
4. **Add a partner's logo**: a story → Layers → Asset → Add or browse → Add. Try Logo on a real logo and tell Claude where the edges are not clean.
5. **Back gesture**: Layers → Asset → Back should return to Layers, then to the story.

---

# Owner checklist (mega round, Studio 2.0.0, 8 Nov 2026)

## On each phone (yours and your 2 partners')
1. Save one design to the team: Studio asks "Who's using Studio?" once. Each person types their own name (it can be changed in Settings).
2. On **your** phone only: Settings → **I'm the owner** (you'll see the review queue and the phrasebook approvals).

## Try the previews (Settings → Previews, off by default, per phone)
Tell Claude which to switch on for everyone:
- [ ] **Team workflow**: calendar, Send for review + your review queue + pinned comments, Approved collection, captions + hashtags, campaign sets, phrasebook.
- [ ] **Import a Claude Design board** (Create): try one of your own new exports (.html or .zip).
- [ ] **Moving stories** (Create → design menu): a 5–8 s video of a story.
- [ ] **Remove background** (Photo sheet / Create photo layer): try a can photo on your Android; first use downloads ~15 MB.
- [ ] **Live stock in Restock**: works once step 4 below is done.

## Wording to approve
- Brand check swap **خويك → ربيعك** (the rest of the banned list is your own rule list from CLAUDE.md; edit any of it in `brands/1stchoice/brand.js` → `rules`).
- Optional: words the brand check should flag for "never name the types of sale points" (`rules.sale.words`). Nothing is checked until you add them.
- Review new phrasebook suggestions when partners send them (Phrasebook → Waiting for your OK).

## Live stock (one change on the locations site)
`https://location.1stchoice.cloud/api/public/locations` is public and read-only, but browsers on GitHub Pages can't read it until it sends a CORS header. Add to that site's `next.config.js` and deploy:
```js
async headers(){ return [{ source:'/api/public/locations', headers:[
  {key:'Access-Control-Allow-Origin',value:'https://mazkillerz.github.io'},
  {key:'Access-Control-Allow-Methods',value:'GET'},
  {key:'Vary',value:'Origin'} ] }]; }
```
Studio only reads place names and flavour counts; it never shows the sale-point type.

## Already done for you
- The new Supabase tables (versions, calendar, comments, phrases, campaigns) are live, with the same team-only access rule as saved designs (you approved it on 8 Nov).

## Optional, later
- Individual logins: create them in the Supabase dashboard when you want (Claude never creates accounts); Studio would then use the signed-in name instead of "Who's using".
- More occasion packs (Ramadan, Eid, Winter camp): send the designs or a Claude Design board; see `brands/PACKS.md`.
