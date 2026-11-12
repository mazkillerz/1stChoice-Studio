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
    {"id": "gt-launch-cover", "label": "Launch · Cover", "sub": "Got Talent · launch 1 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-launch-cover.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "},
    {"id": "gt-launch-how", "label": "Launch · How it works", "sub": "Got Talent · launch 2 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-launch-how.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين how steps"},
    {"id": "gt-launch-whos-first", "label": "Launch · Who is first?", "sub": "Got Talent · launch 3 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-launch-whos-first.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين podium"},
    {"id": "gt-results-cover", "label": "Results · Cover", "sub": "Got Talent · results 1 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-results-cover.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين results month"},
    {"id": "gt-winner-1", "label": "Results · Winner 1", "sub": "Got Talent · winner 1 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-winner-1.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين winner"},
    {"id": "gt-winner-2", "label": "Results · Winner 2", "sub": "Got Talent · winner 2 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-winner-2.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين winner"},
    {"id": "gt-winner-3", "label": "Results · Winner 3", "sub": "Got Talent · winner 3 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-winner-3.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين winner"},
    {"id": "gt-winner-4", "label": "Results · Winner 4", "sub": "Got Talent · winner 4 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-winner-4.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين winner"},
    {"id": "gt-winner-5", "label": "Results · Winner 5", "sub": "Got Talent · winner 5 · Post", "layout": "doc", "doc": "packs/gt/templates/gt-winner-5.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين winner"},
    {"id": "gt-results-your-turn", "label": "Results · Your turn", "sub": "Got Talent · results end · Post", "layout": "doc", "doc": "packs/gt/templates/gt-results-your-turn.json", "size": "post", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين next month"},
    {"id": "gt-story-announce", "label": "Story · Announce", "sub": "Got Talent · launch · Story", "layout": "doc", "doc": "packs/gt/templates/gt-story-announce.json", "size": "story", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "},
    {"id": "gt-story-winner", "label": "Story · Winner", "sub": "Got Talent · winner · Story", "layout": "doc", "doc": "packs/gt/templates/gt-story-winner.json", "size": "story", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "},
    {"id": "gt-story-results-out", "label": "Story · Results are out", "sub": "Got Talent · results · Story", "layout": "doc", "doc": "packs/gt/templates/gt-story-results-out.json", "size": "story", "cat": "gottalent", "keys": "got talent 1st choice talent followers photos monthly winners مسابقة صور المتابعين "}
  ],
  reels:[],
  aliases:{}
});
