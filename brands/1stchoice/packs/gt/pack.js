/* Content line: 1st Choice Got Talent (monthly best follower photos). Listed in brand.js packs. Always in season, no banner. */
Studio.registerPack({
  id:'gt',
  name:'Got Talent',
  dates:{from:'01-01',to:'12-31'},
  templateCat:{id:'gottalent',label:'Got Talent'},
  palette:[],
  textFills:[],
  assets:[
    {"id": "gt-lockup", "label": "Got Talent logo", "file": "packs/gt/assets/lockup.png", "prev": "packs/gt/prev/lockup.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-film-tl", "label": "Film strip · top", "file": "packs/gt/assets/film-tl.png", "prev": "packs/gt/prev/film-tl.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-film-br", "label": "Film strip · bottom", "file": "packs/gt/assets/film-br.png", "prev": "packs/gt/prev/film-br.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-qmarks", "label": "Question marks", "file": "packs/gt/assets/qmarks.png", "prev": "packs/gt/prev/qmarks.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-podium", "label": "Podium", "file": "packs/gt/assets/podium.png", "prev": "packs/gt/prev/podium.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-frame", "label": "Frame", "file": "packs/gt/assets/frame.png", "prev": "packs/gt/prev/frame.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-medal", "label": "Medal", "file": "packs/gt/assets/medal.png", "prev": "packs/gt/prev/medal.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-cat10", "label": "Cat with 10 card", "file": "packs/gt/assets/cat10.png", "prev": "packs/gt/prev/cat10.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-flag", "label": "Crayon flag", "file": "packs/gt/assets/flag.png", "prev": "packs/gt/prev/flag.webp", "group": "Got Talent", "noFlip": true},
    {"id": "gt-photo-sample", "label": "Follower photo", "file": "packs/gt/assets/photo-sample.jpg", "group": "Got Talent", "noFlip": true, "hidden": true}
  ],
  templates:[
    {"id": "gt-launch-carousel", "label": "Launch carousel", "sub": "Got Talent · 3 slides · Post", "layout": "doc", "doc": "packs/gt/templates/gt-launch-carousel.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين launch announce how it works podium", "pages": 3},
    {"id": "gt-results-carousel", "label": "Monthly results carousel", "sub": "Got Talent · 7 slides · Post", "layout": "doc", "doc": "packs/gt/templates/gt-results-carousel.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين results winners month", "pages": 7},
    {"id": "gt-story-announce", "label": "Story · Announce", "sub": "Got Talent · launch · Story", "layout": "doc", "doc": "packs/gt/templates/gt-story-announce.json", "size": "story", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "},
    {"id": "gt-story-winner", "label": "Story · Winner", "sub": "Got Talent · winner · Story", "layout": "doc", "doc": "packs/gt/templates/gt-story-winner.json", "size": "story", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "},
    {"id": "gt-story-results-out", "label": "Story · Results are out", "sub": "Got Talent · results · Story", "layout": "doc", "doc": "packs/gt/templates/gt-story-results-out.json", "size": "story", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "}
  ],
  reels:[],
  aliases:{}
});
