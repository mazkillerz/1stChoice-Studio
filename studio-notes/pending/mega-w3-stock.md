# w3-stock: live stock in Restock (behind preview flag `stock`)

## What's New card draft
```
### Pick a sale point in Restock (preview)
type: feature
Turn on "Live stock in Restock" in Settings, Previews. In Restock, Words has "Pick a sale point": search a place name and the flavours that are in stock there are picked for you.
```

## Owner must do (the feed has no CORS header today)
`GET https://location.1stchoice.cloud/api/public/locations` is public and read-only, but sends no `Access-Control-Allow-Origin`, so a browser on mazkillerz.github.io cannot read it and Studio says "The stock site doesn't let Studio read it yet." Add this to that route (GET only; nothing is written; Studio only reads place names and flavour counts, and ignores the sale-point type field):
```js
// next.config.js
async headers(){ return [{ source:'/api/public/locations', headers:[
  {key:'Access-Control-Allow-Origin',value:'https://mazkillerz.github.io'},
  {key:'Access-Control-Allow-Methods',value:'GET'},
  {key:'Vary',value:'Origin'} ] }]; }
```
No credentials, no other methods. Once it is live Studio works with no further change.

## Files
- New: `assets/stock.js` (lazy, brand-agnostic), `tests/stock.mjs`, `tests/fixtures/stock/locations.json` (label, id, stockLines, lastStockUpdatedAt only).
- Shell for `sw.js`: add `assets/stock.js`.
- Edited: `assets/studio.js` (one `FLAGS` line + one marked block before `function value(id)` in tool()), `tools/restock.js` (`stock:{field:'flav'}`), `brands/1stchoice/brand.js` (`stock:{feed,products,ignore}`).
- `run.mjs` MAP rows: `[/assets\/stock|tools\/restock|fixtures\/stock/,['stock','restock-styles']]`.

## README lines
- Restock (preview "Live stock in Restock"): Words, Pick a sale point. Search by place name; picking one fills the flavours that have stock (0 left = not shown as back). Stock is read once a day and kept on the phone; Refresh in the sheet reads it again.

## Notes
- Restock has no place-name field and no style prints quantities, so only flavour availability is filled; the place name shows on the button, not on the design. No new Arabic wording.
- Never uses or shows `tagIconId` (test checks the page and the recipe).
- Lesson: Playwright `route.fulfill` skips CORS, so a "no CORS header" test needs a real cross-origin server (tests/stock.mjs starts one).
