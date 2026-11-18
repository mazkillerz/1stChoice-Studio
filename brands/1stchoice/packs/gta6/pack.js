/* Content line: GTA VI (the game's launch, Nov 2026). The Omani cat's customer mission: find the cold brew, pick it up, mission passed.
   Listed in brand.js packs. Always in season, no banner. Text is Anton (Google Fonts, OFL) so every word stays editable in Create. */
Studio.registerPack({
  id:'gta6',
  name:'GTA VI',
  dates:{from:'01-01',to:'12-31'},
  templateCat:{id:'gta6',label:'GTA VI'},
  palette:[],
  textFills:[],
  assets:[
    {"id": "gta6-bg-most-wanted", "label": "Scene · Most wanted aisle", "file": "packs/gta6/assets/bg-most-wanted.jpg", "prev": "packs/gta6/prev/bg-most-wanted.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-bg-fridge", "label": "Scene · Fridge pickup", "file": "packs/gta6/assets/bg-fridge.jpg", "prev": "packs/gta6/prev/bg-fridge.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-bg-mission", "label": "Scene · Mission passed", "file": "packs/gta6/assets/bg-mission.jpg", "prev": "packs/gta6/prev/bg-mission.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-bg-collage", "label": "Scene · Customer mission collage", "file": "packs/gta6/assets/bg-collage.jpg", "prev": "packs/gta6/prev/bg-collage.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-star", "label": "Wanted star", "file": "packs/gta6/assets/star.png", "prev": "packs/gta6/prev/star.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-logo-white", "label": "Logo · white", "file": "packs/gta6/assets/logo-white.png", "prev": "packs/gta6/prev/logo-white.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-can-classic", "label": "Drawn can · Classic", "file": "packs/gta6/assets/can-classic.png", "prev": "packs/gta6/prev/can-classic.webp", "group": "GTA VI", "noFlip": true},
    {"id": "gta6-can-passion", "label": "Drawn can · Passion", "file": "packs/gta6/assets/can-passion.png", "prev": "packs/gta6/prev/can-passion.webp", "group": "GTA VI", "noFlip": true}
  ],
  templates:[
    {"id": "gta6-customer-mission", "label": "Customer mission collage", "sub": "GTA VI · collage · Post", "layout": "doc", "doc": "packs/gta6/templates/gta6-customer-mission.json", "size": "post", "cat": "gta6", "keys": "gta 6 gta vi game mission passed respect collage comic customer journey shop fridge pay cat"},
    {"id": "gta6-most-wanted", "label": "Most wanted", "sub": "GTA VI · Post", "layout": "doc", "doc": "packs/gta6/templates/gta6-most-wanted.json", "size": "post", "cat": "gta6", "keys": "gta 6 gta vi game most wanted stars wanted level aisle fridge cat"},
    {"id": "gta6-fridge-pickup", "label": "Item collected", "sub": "GTA VI · Post", "layout": "doc", "doc": "packs/gta6/templates/gta6-fridge-pickup.json", "size": "post", "cat": "gta6", "keys": "gta 6 gta vi game item collected +1 cold brew fridge pickup cat"},
    {"id": "gta6-mission-passed", "label": "Mission passed", "sub": "GTA VI · Post", "layout": "doc", "doc": "packs/gta6/templates/gta6-mission-passed.json", "size": "post", "cat": "gta6", "keys": "gta 6 gta vi game mission passed respect shop exit sunset bag cat"}
  ],
  reels:[],
  aliases:{}
});
