/* Occasion pack scaffold. Copy this folder to brands/<id>/packs/<new-id>/, edit it, then list the id in brand.js: packs:['nd26','<new-id>'].
   This copy is NOT listed in the kit, so it never loads. Full steps: brands/PACKS.md.
   Everything below is merged into the brand exactly as if it were written in brand.js, so Add asset, Create templates, the Templates chips,
   the text fill sheet and search pick it up without any other change. File paths are relative to the brand folder (brands/<id>/). */
Studio.registerPack({
  id:'example',                                  // folder name; keep it short and never change it once designs are saved
  name:'Example occasion',                       // shown in the banner and by default as the Templates chip
  /* when it is in season (the page's own clock). Yearly dates:  {from:'MM-DD',to:'MM-DD'}  (may cross the new year: from '12-20' to '01-05').
     Moving occasions (Ramadan, Eid): one full range per year:  [{from:'2027-02-08',to:'2027-03-09'},{from:'2028-01-28',to:'2028-02-26'}] */
  dates:{from:'03-01',to:'03-31'},
  /* Home card under the search while in season, dismissible per season. "Open templates" goes to this pack's chip. Leave out for no banner. */
  banner:{title:'Example occasion',sub:'Ready-made stories and posts for the occasion.'},
  templateCat:{id:'example',label:'Example'},      // the Templates chip; give every template below cat:'example'
  palette:[],                                      // extra colours for every picker, e.g. {id:'moss',name:'Moss',hex:'#4A5D3A'}
  textFills:[],                                    // e.g. {id:'crayon-red',label:'Crayon red',asset:'example-crayon-red',color:'#DA291C'}
  assets:[                                         // same shape as brand.js assets; hidden:true = loads by id but never listed in Add asset
    // {id:'example-flag',label:'Flag',file:'packs/example/assets/flag.png',prev:'packs/example/prev/flag.webp',group:'Example occasion',noFlip:true},
  ],
  templates:[                                      // Create templates; a saved Create document gives layout:'doc'
    // {id:'ex-greeting',label:'Greeting',sub:'Greeting story · Story',layout:'doc',doc:'packs/example/templates/ex-greeting.json',size:'story',cat:'example',keys:'example occasion'},
  ],
  reels:[],                                        // coded reels (folder names in reels/), like brand.js reels
  aliases:{}                                       // {oldAssetId:'newAssetId'} when an id had to be renamed (saved designs keep opening)
});
