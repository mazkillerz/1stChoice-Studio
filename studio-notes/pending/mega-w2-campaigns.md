# w2-campaigns (preview flag `team`)

## What's New card (draft)
**Campaigns** · Group a story, a post and a carousel as one campaign. Change the headline once and every design follows when opened, save them all in one tap, and plan them in the calendar. (Team preview.)

## New shipped files (for the sw.js shell)
`assets/campaigns.js`, `assets/campaigns.css` (lazy, only with the `team` flag).

## run.mjs MAP rows
`tests/campaigns.mjs` -> areas: `assets/campaigns.js`, `assets/campaigns.css`, `assets/render.js`, `assets/calendar.js`, Saved/select/design-menu blocks in `assets/studio.js` (grep "campaigns (mega w2)"), `tools/create.js` openDesign/teamSave1.

## Hooks (all marked `campaigns (mega w2)`)
- `assets/studio.js`: top-level `campaignRecipe(d)` / `campaignStamp(tool,r)` (exported on `Studio`), used at the tool `openDesign` and tool team save; home(): `campApi` block (Campaign button in the select bar, Campaigns row in Saved via `campPaint()` in `paint()`, `designRow` in the design menu), one line in `paintSel`.
- `tools/create.js`: `openDesign` reads the recipe through `Studio.campaignRecipe`, `teamSave1` stamps through `Studio.campaignStamp`.
- `assets/calendar.js`: loads `C.campaigns`, shows the campaign name (`.ci-camp`) on items. `assets/calendar.css`: one rule.
- **New cloud function** `C.setCampaign(designId,campaignId)` in BOTH `assets/cloud.js` and `tests/fakecloud.js` (marked blocks): `saveDesign` does not pass `campaign_id` through, and an update must keep it (it does: the upsert row never mentions the column).

## How it works
- Campaign = `campaigns` row {name, words:{headline,sub,button,small}, look:'white'|'cream'|null}; designs carry `campaign_id`.
- Words reach a design when it is opened (so also in Save all, which opens each design in the hidden render frame) via `StudioCampaigns.openRecipe`. The design's recipe keeps `camp:{id,applied:{role:text},over:{role:true}}`: `applied` is what the campaign last put there; on save, a role whose text no longer matches `applied` was edited inside the design and becomes an override (never touched again). Drafts and undo are unaffected.
- Create: roles read from layer attr `role` or by reading the layer (biggest words headline, next words sub, a pill group button). Tools: fields head -> headline, small -> small, pill -> button (a button that is off stays off).
- Look: applies where the recipe's style is `white` or `cream` (Restock, Offer, and any tool with those styles). Create templates are free-form and do not take a look.
- Save all = `StudioRender.saveDesigns` (identical to Saved's Save pictures: 2x lossless PNG, the 2x->1.5x->1x fallback and message, ZIP on a computer / phone download). Max 20 designs.
- Plan this campaign: one draft calendar item per design (title = design name, day picked per design, default tomorrow onward), `campaign_id` set; then opens `#calendar`.

## Decisions / doubts for the lead
- **"Add all to the team"**: a campaign can only hold designs that are already saved to the team (campaign_id is a column on `designs`), so there is nothing unsaved to add. The button reports "All n designs are already with the team" (or names templates that still need photos). Drafts that live only on a phone cannot join a campaign. If the owner wants drafts in campaigns, a tool-side "Save to the team into campaign X" is the next step (needs a hook in each tool's Save sheet).
- Headline/sub changes show on a design's cover only after it is opened and saved again (the cover is the saved thumbnail); Save all always uses the new words.
- Arabic wording: none added. The campaign words are typed by the person (not invented by Studio).

## README lines
Campaigns (team preview): Saved -> Select -> Campaign, or a design's menu -> Add to campaign. Campaigns row in Saved opens a campaign: shared words and look, Save all (full-quality ZIP), Plan this campaign (calendar).
