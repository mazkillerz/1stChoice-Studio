/* Brand kit: 1st Choice cold brew (Oman).
   Everything brand-specific lives here: logo, fonts, colours, writing direction, approved wording and example photos.
   To add another brand, copy this folder, change the values, and list it in brands/brands.js. */
Studio.registerBrand({
  id:'1stchoice',
  name:'1st Choice',
  logo:'logo.png',             // dark logo on a transparent background; a light copy is made automatically
  icon:'icon.png',
  lang:'ar', dir:'rtl',
  locale:'ar-OM',              // dates in Arabic (Oman)
  digits:'arabic',             // numbers are written ٠١٢٣٤٥٦٧٨٩ and ٪ (Lalezar has no Latin digits)
  fonts:{
    display:'Lalezar',         // big headlines
    body:'Cairo',              // small lines, buttons, place names
    latin:'Modak',             // the brand's Latin display face (numbers, kicker, handle)
    google:'family=Cairo:wght@600;800&family=Lalezar&family=Modak',
    /* fonts offered first in the Font menu; new text always starts in display/body above */
    choices:[
      {family:'Lalezar',label:'Lalezar (headlines)',wt:''},
      {family:'Cairo',label:'Cairo (body)',wt:'800'},
      {family:'Modak',label:'Modak (English, logo style)',wt:''}
    ]
  },
  colors:{
    ink:'#161210',             // text and buttons on light
    paper:'#FFFFFF',
    night:'#000000',
    muted:'#5f5c57',           // secondary text on light
    mutedOnDark:'#cfcdc8',
    accent:'#D6B078',          // gold, for dark grounds
    cream:'#F3EADC',
    brown:'#7A563A',           // secondary text on cream
    blob:'#E5D5C0',            // soft shape behind products
    panel:'#F3F3F1',           // the soft card behind cans in posts
    grey:'#6E6E6E',
    yellow:'#F6C040',          // Passion fruit yellow
    berry:'#BE2C5C'            // Passion fruit berry
  },
  /* One palette for every colour picker (text, pills, shapes, panels, backgrounds, collage gaps), in this order.
     Every picker also offers "Custom…" for any other colour. */
  palette:[
    {id:'white',name:'White',hex:'#FFFFFF'},{id:'ink',name:'Ink',hex:'#161210'},{id:'grey',name:'Grey',hex:'#6E6E6E'},
    {id:'panel',name:'Panel',hex:'#F3F3F1'},{id:'cream',name:'Cream',hex:'#F3EADC'},{id:'brown',name:'Brown',hex:'#7A563A'},
    {id:'blob',name:'Blob',hex:'#E5D5C0'},{id:'gold',name:'Gold',hex:'#D6B078'},{id:'yellow',name:'Passion yellow',hex:'#F6C040'},
    {id:'berry',name:'Passion berry',hex:'#BE2C5C'}
  ],
  handle:'@1stchoice.om',      // Instagram handle (the "Instagram handle" component)
  /* The two flavours (names as on the approved line "كلاسيك / باشن فروت"). Pill colours for each. */
  flavours:[
    {id:'classic',name:'كلاسيك',bg:'#161210',fg:'#FFFFFF',can:'can-classic-shadow'},
    {id:'passion',name:'باشن فروت',bg:'#F6C040',fg:'#161210',can:'can-passion-shadow'}
  ],
  /* the product pictures tools draw without a photo (Restock "Cans"): one can per flavour above, and both together
     (the pair cut-out keeps a gap between the cans: cans never touch) */
  products:{both:'cans-pair-shadow'},
  /* which approved line a tool starts with (tools fall back to the first line of each list) */
  defaults:{offer:{head:'ما يتفوت',pill:'اطلب الحين'},restock:{small:'الكمية محدودة'}},
  /* Wording from the owner's Omani phrasebook. Only approved lines go here. */
  phrases:{
    headlines:['يسرسح ثلج','جربته؟','ترا فنان','ما يتفوت','عالميييي','تعرف ويش؟','مشتهيه؟','صبر شوي...','اطلب الحين','وين تلقانا؟','رجع متوفر','وفرنا كمية جديدة','خذلك كولد برو','هذا ولا هذا؟','أنت أي واحد؟','اختيارك؟','منشن ربعك','صباح الخير','روّق','الجو حرّ اليوم؟'],
    small:['خذلك كولد برو','الرابط في البايو','شوف أقرب نقطة بيع لك','راسلنا خاص','كولد برو','كلاسيك / باشن فروت','يسرسح ثلج','ما مر','منعش','يصحصحك','الكمية محدودة','اختيارك الأول، دائماً'],
    buttons:['الرابط في البايو','راسلنا خاص','اطلب الحين','شوف أقرب نقطة بيع لك'],
    /* the "map in bio" pill (with a pin icon); wording from the owner's PLAN.md template notes */
    bio:'الخريطة في البايو',
    newPlace:['نقطة بيع جديدة','وين تلقانا؟ هنا','صرنا متوفرين هنا'],
    cut:['وين تلقانا؟','يسرسح ثلج','صبر شوي...','لا تعدّي قبل لا تشوف هذا','ياخذ وقته...','هذا ولا هذا؟','ترا فنان','أنت أي واحد؟','تعرف ويش؟','خذلك كولد برو'],
    restock:['رجع متوفر','وفرنا كمية جديدة'],
    /* Offer wording is still waiting for the owner's approval, so the Offer tool starts with headlines above
       and offer tiles made of numbers only (e.g. ٢٠٪ / ×٣); people type their own words. */
    placeName:'اسم المكان',
    write:'اكتب هنا'
  },
  /* Assets people can add to any story as movable layers (Add asset). Files live in this folder.
     Cans: always the HD cut-outs (transparent PNG). A file that isn't here yet shows as "Not added yet".
     No cat mascot stickers unless the owner asks for them.
     noFlip: the Move tab's Flip is hidden (a mirrored can would show its label backwards). */
  /* prev: a light copy (~1000px WebP) for previews and on-screen editing; saving always uses the HD file */
  assets:[
    {id:'logo',label:'Logo',file:'logo.png',group:'Logo',tint:true},
    {id:'can-classic',label:'Classic can',file:'assets/classic_can.png',prev:'assets/prev/classic_can.webp',group:'Cans (HD cut-outs)',noFlip:true},
    {id:'can-classic-shadow',label:'Classic + shadow',file:'assets/classic_can_shadow.png',prev:'assets/prev/classic_can_shadow.webp',group:'Cans (HD cut-outs)',noFlip:true},
    {id:'can-passion',label:'Passion Fruit can',file:'assets/passion_can.png',prev:'assets/prev/passion_can.webp',group:'Cans (HD cut-outs)',noFlip:true},
    {id:'can-passion-shadow',label:'Passion + shadow',file:'assets/passion_can_shadow.png',prev:'assets/prev/passion_can_shadow.webp',group:'Cans (HD cut-outs)',noFlip:true},
    {id:'cans-pair',label:'Both cans',file:'assets/cans_pair.png',prev:'assets/prev/cans_pair.webp',group:'Cans (HD cut-outs)',noFlip:true},
    {id:'cans-pair-shadow',label:'Both + shadow',file:'assets/cans_pair_shadow.png',prev:'assets/prev/cans_pair_shadow.webp',group:'Cans (HD cut-outs)',noFlip:true},
    /* the flat one-colour can icon (approved 6 Nov 2026, "A+B": real-can look with "1ST" on the label). SVG + 2048px PNG in assets/icon/.
       Solid and Outline take any colour (tint); the flavour ones keep their label colour (Classic taupe, Passion berry / yellow on dark). */
    {id:'can-icon',label:'Can icon',file:'assets/icon/can-icon-solid.png',prev:'assets/prev/can_icon_solid.webp',group:'Can icon (2D)',tint:true},
    {id:'can-icon-outline',label:'Can icon · outline',file:'assets/icon/can-icon-outline.png',prev:'assets/prev/can_icon_outline.webp',group:'Can icon (2D)',tint:true},
    {id:'can-icon-classic',label:'Can icon · Classic',file:'assets/icon/can-icon-classic.png',prev:'assets/prev/can_icon_classic.webp',group:'Can icon (2D)',noFlip:true},
    {id:'can-icon-passion',label:'Can icon · Passion',file:'assets/icon/can-icon-passion.png',prev:'assets/prev/can_icon_passion.webp',group:'Can icon (2D)',noFlip:true},
    {id:'can-icon-passion-yellow',label:'Can icon · Passion (on dark)',file:'assets/icon/can-icon-passion-yellow.png',prev:'assets/prev/can_icon_passion_yellow.webp',group:'Can icon (2D)',noFlip:true},
    {id:'can-stamp',label:'Stamp · 1ST CHOICE',file:'assets/icon/can-stamp.png',prev:'assets/prev/can_stamp.webp',group:'Can icon (2D)',noFlip:true},
    {id:'mark-1st',label:'1ST mark',file:'assets/icon/mark-1st.png',prev:'assets/prev/mark_1st.webp',group:'Logo',tint:true},
    {id:'type-coldbrew',label:'COLD BREW · coffee-filled',file:'assets/type/type-coldbrew.png',prev:'assets/prev/type_coldbrew.webp',group:'Type (coffee-filled)',noFlip:true},
    {id:'type-1st',label:'1ST · coffee-filled',file:'assets/type/type-1st.png',prev:'assets/prev/type_1st.webp',group:'Type (coffee-filled)',noFlip:true},
    /* the cat in the can-label style (from the winter cat reel, Oct 2026). The owner's rule: the cat only when asked. */
    {id:'cat-wink',label:'Cat · wink with can',file:'reels/winter-cat/img/L4b.webp',prev:'assets/prev/winter_cat_wink.webp',group:'Cat · winter camp (only when asked)'},
    {id:'cat-can',label:'Cat · holding can',file:'reels/winter-cat/img/L4.webp',prev:'assets/prev/winter_cat_can.webp',group:'Cat · winter camp (only when asked)'},
    {id:'cat-calm',label:'Cat · calm',file:'reels/winter-cat/img/L1.webp',prev:'assets/prev/winter_cat_calm.webp',group:'Cat · winter camp (only when asked)'},
    {id:'cat-shiver',label:'Cat · hood up, cold',file:'reels/winter-cat/img/L2.webp',prev:'assets/prev/winter_cat_shiver.webp',group:'Cat · winter camp (only when asked)'},
    {id:'cat-deadpan',label:'Cat · deadpan stare',file:'reels/winter-cat/img/S3.webp',prev:'assets/prev/winter_cat_deadpan.webp',group:'Cat · winter camp (only when asked)'},
    {id:'winter-camp',label:'Desert camp (ink)',file:'assets/winter/camp.webp',prev:'assets/prev/winter_camp.webp',group:'Cat · winter camp (only when asked)'},
    {id:'winter-campfire',label:'Campfire',file:'assets/winter/campfire.webp',prev:'assets/prev/winter_campfire.webp',group:'Cat · winter camp (only when asked)'},
    {id:'winter-moon',label:'Moon',file:'reels/winter-cat/img/moon.webp',prev:'assets/prev/winter_moon.webp',group:'Cat · winter camp (only when asked)'},
    {id:'winter-cloud',label:'Cloud',file:'reels/winter-cat/img/cloud1.webp',prev:'assets/prev/winter_cloud.webp',group:'Cat · winter camp (only when asked)'},
    {id:'winter-star',label:'Star',file:'reels/winter-cat/img/star1.webp',prev:'assets/prev/winter_star.webp',group:'Cat · winter camp (only when asked)'},
    /* National Day 2026: pieces + hidden template backgrounds (hidden:true never shows in Add asset) */
    {id:"nd26-bg-nd-pfp",label:"Profile picture · background",file:"assets/nd26/bg/nd-pfp.webp",prev:"assets/prev/nd26/nd-pfp.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-countdown-3",label:"Countdown · 3 days · background",file:"assets/nd26/bg/nd-countdown-3.webp",prev:"assets/prev/nd26/nd-countdown-3.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-countdown-2",label:"Countdown · 2 days · background",file:"assets/nd26/bg/nd-countdown-2.webp",prev:"assets/prev/nd26/nd-countdown-2.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-countdown-1",label:"Countdown · 1 day · background",file:"assets/nd26/bg/nd-countdown-1.webp",prev:"assets/prev/nd26/nd-countdown-1.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-greeting",label:"Greeting story · background",file:"assets/nd26/bg/nd-greeting.webp",prev:"assets/prev/nd26/nd-greeting.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-the-day",label:"The day story · background",file:"assets/nd26/bg/nd-the-day.webp",prev:"assets/prev/nd26/nd-the-day.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-thanks",label:"Thank you story · background",file:"assets/nd26/bg/nd-thanks.webp",prev:"assets/prev/nd26/nd-thanks.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-teaser-post",label:"Teaser post · background",file:"assets/nd26/bg/nd-teaser-post.webp",prev:"assets/prev/nd26/nd-teaser-post.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-discount-post",label:"Discount post · background",file:"assets/nd26/bg/nd-discount-post.webp",prev:"assets/prev/nd26/nd-discount-post.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-giveaway-post",label:"Giveaway post · background",file:"assets/nd26/bg/nd-giveaway-post.webp",prev:"assets/prev/nd26/nd-giveaway-post.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-greeting-post",label:"Greeting post · background",file:"assets/nd26/bg/nd-greeting-post.webp",prev:"assets/prev/nd26/nd-greeting-post.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-nd-highlight",label:"Highlight cover · background",file:"assets/nd26/bg/nd-highlight.webp",prev:"assets/prev/nd26/nd-highlight.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-t1-poll",label:"Label · What are we printing? (poll) · background",file:"assets/nd26/bg/lr-t1-poll.webp",prev:"assets/prev/nd26/lr-t1-poll.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-t2-guess",label:"Label · Guess under the scribble · background",file:"assets/nd26/bg/lr-t2-guess.webp",prev:"assets/prev/nd26/lr-t2-guess.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-t3-guesses",label:"Label · Your guesses · background",file:"assets/nd26/bg/lr-t3-guesses.webp",prev:"assets/prev/nd26/lr-t3-guesses.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-t4-tonight",label:"Label · Reveal tonight · background",file:"assets/nd26/bg/lr-t4-tonight.webp",prev:"assets/prev/nd26/lr-t4-tonight.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-r1-reveal",label:"Label · The reveal · background",file:"assets/nd26/bg/lr-r1-reveal.webp",prev:"assets/prev/nd26/lr-r1-reveal.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-r3-printing",label:"Label · Printing story · background",file:"assets/nd26/bg/lr-r3-printing.webp",prev:"assets/prev/nd26/lr-r3-printing.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-r4-where",label:"Label · Where to get it · background",file:"assets/nd26/bg/lr-r4-where.webp",prev:"assets/prev/nd26/lr-r4-where.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-e1-poll",label:"Label · Classic or Passion? (poll) · background",file:"assets/nd26/bg/lr-e1-poll.webp",prev:"assets/prev/nd26/lr-e1-poll.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-e2-hunt",label:"Label · Find our cat · background",file:"assets/nd26/bg/lr-e2-hunt.webp",prev:"assets/prev/nd26/lr-e2-hunt.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-c1-cover",label:"Label carousel · 1 Cover · background",file:"assets/nd26/bg/lr-c1-cover.webp",prev:"assets/prev/nd26/lr-c1-cover.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-c2-closeup",label:"Label carousel · 2 Close-up · background",file:"assets/nd26/bg/lr-c2-closeup.webp",prev:"assets/prev/nd26/lr-c2-closeup.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-c3-printing",label:"Label carousel · 3 Printing · background",file:"assets/nd26/bg/lr-c3-printing.webp",prev:"assets/prev/nd26/lr-c3-printing.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-c4-flavours",label:"Label carousel · 4 Two flavours · background",file:"assets/nd26/bg/lr-c4-flavours.webp",prev:"assets/prev/nd26/lr-c4-flavours.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-bg-lr-c5-where",label:"Label carousel · 5 Where to get it · background",file:"assets/nd26/bg/lr-c5-where.webp",prev:"assets/prev/nd26/lr-c5-where.webp",group:"National Day 2026",hidden:true,noFlip:true},
    {id:"nd26-cat-upper",label:"Omani cat · kumma",file:"assets/nd26/parts/cat-upper.png",prev:"assets/prev/nd26/cat-upper.webp",group:"National Day 2026",noFlip:true},
    {id:"nd26-cat-upper-wink",label:"Omani cat · wink",file:"assets/nd26/parts/cat-upper-wink.png",prev:"assets/prev/nd26/cat-upper-wink.webp",group:"National Day 2026",noFlip:true},
    {id:"nd26-cat-head",label:"Omani cat · head",file:"assets/nd26/parts/cat-head.png",prev:"assets/prev/nd26/cat-head.webp",group:"National Day 2026",noFlip:true},
    {id:"nd26-flag",label:"Crayon flag",file:"assets/nd26/parts/crayon-flag.png",prev:"assets/prev/nd26/crayon-flag.webp",group:"National Day 2026",noFlip:true},
    {id:"nd26-fw-red",label:"Crayon firework · red",file:"assets/nd26/parts/fw-red.png",prev:"assets/prev/nd26/fw-red.webp",group:"National Day 2026",noFlip:true},
    {id:"nd26-fw-green",label:"Crayon firework · green",file:"assets/nd26/parts/fw-green.png",prev:"assets/prev/nd26/fw-green.webp",group:"National Day 2026",noFlip:true},
    {id:"nd26-sweep",label:"Grey crayon sweep",file:"assets/nd26/parts/sweep-band.png",prev:"assets/prev/nd26/sweep-band.webp",group:"National Day 2026",noFlip:true}
  ],
  /* Coded reels the Video editor opens (tools/video.html): one folder each in reels/<id>/ (format: docs/reels.md).
     The first one opens when the editor starts fresh. Their default words are the owner's own reel wording. */
  reels:[
    {id:'winter-cat'},
    {id:'label-reveal'}
  ],
  /* Templates library (Home → Templates): ready-made starts made of a tool, one of its styles and approved words.
     cat: restock | story | post | highlight. Previews: assets/thumbs/<brand>/tpl/<id>.jpg (node tests/tplthumbs.mjs makes them).
     Words come only from the approved phrases above. A tap opens the tool with these settings, as a new story. */
  presets:[
    {id:'rs-cans',tool:'restock',cat:'restock',label:'Cans, no photo',sub:'Restock · ready in one tap',style:'cans',badge:'New',values:{head:'رجع متوفر'}},
    {id:'rs-glow',tool:'restock',cat:'restock',label:'Cans with a glow',sub:'Restock · cans, no photo',style:'cans',badge:'New',values:{head:'رجع متوفر',gfx:'glow'}},
    {id:'rs-white',tool:'restock',cat:'restock',label:'White card',sub:'Restock · your photo',style:'white',values:{head:'رجع متوفر'}},
    {id:'rs-classic',tool:'restock',cat:'restock',label:'Classic is back',sub:'Restock · cans, no photo',style:'cans',badge:'New',values:{head:'رجع متوفر',flav:['classic']}},
    {id:'rs-passion',tool:'restock',cat:'restock',label:'Passion fruit is back',sub:'Restock · cans, no photo',style:'cans',badge:'New',values:{head:'رجع متوفر',flav:['passion'],bg:'#F3EADC'}},
    {id:'rs-split',tool:'restock',cat:'restock',label:'Split',sub:'Restock · your photo',style:'split',badge:'New',values:{head:'رجع متوفر'}},
    {id:'rs-poster',tool:'restock',cat:'restock',label:'Big words',sub:'Restock · your photo',style:'poster',badge:'New',values:{head:'وفرنا كمية جديدة'}},
    {id:'rs-cream',tool:'restock',cat:'restock',label:'Cream card',sub:'Restock · your photo',style:'cream',values:{head:'وفرنا كمية جديدة'}},
    {id:'rs-photo',tool:'restock',cat:'restock',label:'Full photo',sub:'Restock · your photo',style:'photo',values:{head:'رجع متوفر'}},
    {id:'rs-limited',tool:'restock',cat:'restock',label:'Limited stock',sub:'Restock · your photo',style:'white',values:{head:'وفرنا كمية جديدة',small:'الكمية محدودة',pill:'راسلنا خاص'}},
    {id:'ps-full',tool:'photo-story',cat:'story',label:'Photo story',sub:'Words on your photo',style:'full',values:{head:'يسرسح ثلج'}},
    {id:'ps-whole',tool:'photo-story',cat:'story',label:'Whole photo',sub:'Photo story · wide photos',style:'whole',badge:'New',values:{head:'جربته؟'}},
    {id:'ps-caption',tool:'photo-story',cat:'story',label:'Caption',sub:'Photo story · words below',style:'caption',badge:'New',values:{head:'خذلك كولد برو'}},
    {id:'ps-poster',tool:'photo-story',cat:'story',label:'Poster',sub:'Photo story · big words',style:'poster',badge:'New',values:{head:'ما يتفوت'}},
    {id:'ps-arch',tool:'photo-story',cat:'story',label:'Arch',sub:'Photo story · cream',style:'arch',badge:'New',values:{head:'روّق'}},
    {id:'ps-frame',tool:'photo-story',cat:'story',label:'White frame',sub:'Photo story',style:'white',values:{head:'صباح الخير'}},
    {id:'co-grid',tool:'collage',cat:'story',label:'Collage 2 × 2',sub:'Collage · 4 photos',count:4,values:{lay4:'g-2-2'}},
    {id:'co-border',tool:'collage',cat:'story',label:'With borders',sub:'Collage · 3 photos',count:3,style:'cream',badge:'New',values:{lay3:'g-3-rows',border:16,gap:24}},
    {id:'co-mosaic',tool:'collage',cat:'story',label:'Mosaic',sub:'Collage · 6 photos',count:6,values:{lay6:'g-mosaic'}},
    {id:'co-prints',tool:'collage',cat:'story',label:'Scattered prints',sub:'Collage · 4 photos',count:4,values:{lay4:'scatter'}},
    {id:'co-film',tool:'collage',cat:'story',label:'Film strip',sub:'Collage · 4 photos',count:4,style:'black',values:{lay4:'film'}},
    {id:'np-new',tool:'new-place',cat:'story',label:'New place',sub:'A new sale point',style:'A'},
    {id:'sp-two',tool:'split',cat:'story',label:'Two-photo split',sub:'Close-up and wide',style:'white'},
    {id:'ci-bars',tool:'cinematic',cat:'story',label:'Cinematic bars',sub:'A wide photo, shown whole',style:'black'},
    {id:'of-offer',tool:'offer',cat:'story',label:'Offer',sub:'Tiles, dates and a button',style:'white'},
    {id:'of-dots',tool:'offer',cat:'story',label:'Offer with dots',sub:'Offer · white with a dot finish',style:'white',badge:'New',values:{gfx:'dots'}},
    {id:'ca-white',tool:'carousel',cat:'post',label:'Feed carousel',sub:'Carousel · several slides',style:'white'},
    {id:'hl-white',tool:'highlight',cat:'highlight',label:'White covers',sub:'Highlight covers · a set',style:'white',values:{shape:'disc'}},
    {id:'hl-cream',tool:'highlight',cat:'highlight',label:'Cream covers',sub:'Highlight covers · a set',style:'cream',values:{shape:'ring'}},
    {id:'hl-ink',tool:'highlight',cat:'highlight',label:'Black covers',sub:'Highlight covers · a set',style:'black',values:{shape:'plain'}}
  ],
  /* Create: the templates offered for this brand. Layouts live in tools/create-templates.js (no wording there);
     the words here come only from the approved phrases above. `write` (اكتب هنا) marks a spot for your own words.
     `sub` = the English line under the title in Templates (otherwise "Story · Create"). */
  /* categories for the hub Templates page, inserted after All */
  templateCats:[{id:'nationalday',label:'National Day'}],
  create:{
    templates:[
      {id:'ice-cold',label:'Ice cold',sub:'Story · both cans',layout:'hero-panel',size:'story',words:{head:'يسرسح ثلج',small:'خذلك كولد برو',pill:'الخريطة في البايو'},assets:{product:'cans-pair-shadow'}},
      {id:'did-you-know',label:'Did you know',sub:'Story · three facts',layout:'did-you-know',size:'story',words:{head:'تعرف ويش؟',pill:'جربته؟'},assets:{product:'can-classic-shadow'}},
      {id:'your-choice',label:'Your choice',sub:'Story · pick a flavour',layout:'your-choice',size:'story',words:{head:'اختيارك؟',pill:'منشن ربعك'},assets:{one:'can-classic',two:'can-passion'}},
      /* one-tap feed posts (1080×1350): the three above, ready to save as they open. keys = extra search words */
      {id:'ice-cold-post',label:'Ice cold post',sub:'Post · ready in one tap',badge:'New',cat:'post',layout:'hero-panel-post',size:'post',keys:'feed instagram',words:{head:'يسرسح ثلج',small:'خذلك كولد برو',pill:'الخريطة في البايو'},assets:{product:'cans-pair-shadow'}},
      {id:'did-you-know-post',label:'Did you know post',sub:'Post · ready in one tap',badge:'New',cat:'post',layout:'did-you-know-post',size:'post',keys:'feed instagram facts',words:{head:'تعرف ويش؟',line1:'كولد برو',line2:'منعش',line3:'يصحصحك',pill:'جربته؟'},assets:{product:'can-classic-shadow'}},
      {id:'your-choice-post',label:'Your choice post',sub:'Post · ready in one tap',badge:'New',cat:'post',layout:'your-choice-post',size:'post',keys:'feed instagram flavours',words:{head:'اختيارك؟',pill:'منشن ربعك'},assets:{one:'can-classic',two:'can-passion'}},
      {id:'chat',label:'Chat (late friend)',sub:'Post · 3 pages, a chat',layout:'chat',size:'post',pages:3,words:{name:'ربيعي',pill:'اطلب الحين'},assets:{photo:'cans-pair'}},
      {id:'bingo',label:'Bingo 4×4',sub:'Post · a game',layout:'bingo',size:'post',look:'cream',words:{},assets:{product:'can-classic'}},
      {id:'spot',label:'Spot the difference',sub:'Story · a game',layout:'spot',size:'story',words:{head:'صبر شوي...'},assets:{product:'cans-pair'}},
      {id:'tictactoe',label:'Tic-tac-toe',sub:'Square · a game',layout:'tictactoe',size:'square',words:{},assets:{x:'can-classic',o:'can-passion'}},
      {id:'rate',label:'Rate 1–10',sub:'Story · ask for a score',layout:'rate',size:'story',words:{head:'جربته؟'},assets:{product:'can-classic-shadow'}},
      {id:'mood',label:'Mood grid 2×2',sub:'Post · a 2×2 grid',layout:'mood',size:'post',words:{head:'أنت أي واحد؟'}},
      {id:'equation',label:'Equation',sub:'Story · with your photo',layout:'equation',size:'story',words:{},assets:{product:'can-passion-shadow'}},
      {id:'lockscreen',label:'Lockscreen',sub:'Story · a phone screen',layout:'lockscreen',size:'story',words:{}},
      {id:'battery',label:'Before / after battery',sub:'Story · before and after',layout:'battery',size:'story',words:{small:'يصحصحك'},assets:{product:'can-classic-shadow'}},
      {id:'offer',label:'Offer',sub:'Story · your offer',layout:'offer',size:'story',words:{head:'ما يتفوت',pill:'اطلب الحين'},assets:{product:'cans-pair-shadow'}},
      {id:'order-steps',label:'How to order',sub:'Story · steps to order',layout:'order-steps',size:'story',words:{head:'اطلب الحين',step1:'راسلنا خاص'},assets:{product:'cans-pair-shadow'}},
      {id:'one-word',label:'Occasion: one word',sub:'Story · one big word',layout:'one-word',size:'story',look:'cream',words:{head:'روّق'}},
      {id:'restock',label:'Restock',sub:'Story · cans, no photo',cat:'restock',layout:'restock',size:'story',words:{head:'رجع متوفر',small:'وفرنا كمية جديدة',pill:'اطلب الحين'},assets:{product:'cans-pair-shadow'}},
      {id:'new-place',label:'New place',sub:'Story · photo and place name',layout:'new-place',size:'story',words:{head:'نقطة بيع جديدة',place:'اسم المكان',pill:'الخريطة في البايو'}},
      {id:'stock-alert',label:'Stock alert',sub:'Story · only a few left',cat:'restock',layout:'stock-alert',size:'story',words:{head:'الكمية محدودة',pill:'راسلنا خاص'},assets:{product:'can-classic-shadow'}},
      {id:'restock-post',label:'Restock post',sub:'Post · ready in one tap',badge:'New',cat:'restock',layout:'restock-post',size:'post',words:{head:'رجع متوفر',pill:'اطلب الحين'},assets:{product:'cans-pair-shadow'}},
      {id:'both-flavours',label:'Both flavours',sub:'Story · both flavours',badge:'New',cat:'restock',layout:'both-flavours',size:'story',words:{head:'وفرنا كمية جديدة'},assets:{one:'can-classic-shadow',two:'can-passion-shadow'}},
      {id:'this-or-that',label:'This or that',sub:'Post · pick one',badge:'New',cat:'post',layout:'this-or-that',size:'post',words:{head:'هذا ولا هذا؟',pill:'منشن ربعك'},assets:{one:'can-classic-shadow',two:'can-passion-shadow'}},
      {id:'one-word-post',label:'One word post',sub:'Post · one big word',badge:'New',cat:'post',layout:'one-word-post',size:'post',look:'cream',words:{head:'روّق'}},
      {id:'map-post',label:'Map in bio post',sub:'Post · where to find us',badge:'New',cat:'post',layout:'map-post',size:'post',words:{head:'وين تلقانا؟',pill:'الخريطة في البايو'}},
      {id:'good-morning',label:'Good morning',sub:'Story · ready in one tap',badge:'New',cat:'story',layout:'good-morning',size:'story',words:{head:'صباح الخير',small:'يصحصحك'},assets:{product:'can-classic-shadow'}},
      /* five feed layouts (1.42.0), each as a post and a story */
      {id:'cover-post',label:'Magazine cover',sub:'Post · the can as cover star',badge:'New',cat:'post',layout:'cover',size:'post',keys:'feed instagram magazine',words:{kicker:'COLD BREW',small:'كلاسيك / باشن فروت',line1:'يسرسح ثلج',line2:'ما مر',line3:'منعش',foot:'الخريطة في البايو'},assets:{product:'can-classic-shadow',stamp:'can-stamp'}},
      {id:'cover-story',label:'Magazine cover story',sub:'Story · the can as cover star',badge:'New',layout:'cover',size:'story',keys:'feed instagram magazine',words:{kicker:'COLD BREW',small:'باشن فروت',line1:'يسرسح ثلج',line2:'منعش',line3:'ترا فنان',foot:'متوفر في نقاط بيع مختارة'},assets:{product:'can-passion-shadow',stamp:'can-stamp'}},
      {id:'closeup-post',label:'Close-up',sub:'Post · the can fills the frame',badge:'New',cat:'post',layout:'closeup',size:'post',keys:'feed instagram big can',words:{head:'ترا فنان...',small:'ما مر'},assets:{product:'can-classic'}},
      {id:'closeup-story',label:'Close-up story',sub:'Story · the can fills the frame',badge:'New',layout:'closeup',size:'story',flavour:'passion',keys:'feed instagram big can',words:{head:'منعش...',chip:'باشن فروت',small:'متوفر في نقاط بيع مختارة',pill:'الخريطة في البايو'},assets:{product:'can-passion'}},
      {id:'many-post',label:'One of many',sub:'Post · one real can among icons',badge:'New',cat:'post',layout:'one-of-many',size:'post',keys:'feed instagram grid icons',words:{head:'اختيارك؟',small:'اختيارك الأول، دائماً'},assets:{product:'can-classic-shadow',icon:'can-icon-outline',mark:'mark-1st'}},
      {id:'many-story',label:'One of many story',sub:'Story · one real can among icons',badge:'New',layout:'one-of-many',size:'story',keys:'feed instagram grid icons',words:{head:'اختيارك؟',small:'اختيارك الأول، دائماً',pill:'الخريطة في البايو'},assets:{product:'can-passion-shadow',icon:'can-icon-outline',mark:'mark-1st'}},
      {id:'podium-post',label:'Podium',sub:'Post · the can on the first step',badge:'New',cat:'post',layout:'podium',size:'post',keys:'feed instagram winner first',words:{head:'اختيارك؟',small:'اختيارك الأول، دائماً'},assets:{product:'can-classic-shadow'}},
      {id:'podium-story',label:'Podium story',sub:'Story · the can on the first step',badge:'New',layout:'podium',size:'story',keys:'feed instagram winner first',words:{head:'اختيارك؟',small:'اختيارك الأول، دائماً',pill:'الخريطة في البايو'},assets:{product:'can-passion-shadow'}},
      {id:'type-post',label:'Coffee type',sub:'Post · big coffee-filled letters',badge:'New',cat:'post',layout:'type-photo',size:'post',keys:'feed instagram lettering',words:{head:'يسرسح ثلج...',small:'كلاسيك / باشن فروت',pill:'اطلب الحين'},assets:{type:'type-coldbrew'}},
      {id:'type-story',label:'Coffee type story',sub:'Story · big coffee-filled letters',badge:'New',layout:'type-photo',size:'story',keys:'feed instagram lettering',words:{head:'اختيارك؟',small:'اختيارك الأول، دائماً',pill:'الخريطة في البايو'},assets:{type:'type-1st'}},
      {id:'highlight-places',label:'Highlight: places',sub:'Cover · one icon',layout:'highlight',size:'square',icon:'pin',words:{}},
      {id:'highlight-chat',label:'Highlight: chat',sub:'Cover · one icon',layout:'highlight',size:'square',icon:'chat',words:{}},
      {id:'highlight-reviews',label:'Highlight: reviews',sub:'Cover · one icon',layout:'highlight',size:'square',icon:'star',words:{}},
      {id:'highlight-order',label:'Highlight: order',sub:'Cover · one icon',badge:'New',cat:'highlight',layout:'highlight',size:'square',icon:'cart',words:{}},
      {id:'highlight-new',label:'Highlight: new',sub:'Cover · one icon',badge:'New',cat:'highlight',layout:'highlight',size:'square',icon:'sparkles',words:{}},
      /* emoji covers (1.38.0): the same round layout with one emoji from tools/highlight-emoji.js (no words) */
      {id:'highlight-places-emoji',label:'Highlight: places emoji',sub:'Cover · one emoji',badge:'New',cat:'highlight',layout:'highlight',size:'square',emoji:'places',keys:'emoji pin location',words:{}},
      {id:'highlight-order-emoji',label:'Highlight: order emoji',sub:'Cover · one emoji',badge:'New',cat:'highlight',layout:'highlight',size:'square',emoji:'cart',keys:'emoji cart shop',words:{}},
      /* National Day 2026 + new label reveal: each one is a saved Create document (doc = JSON in this folder), backgrounds are hidden assets */
      {id:"nd-pfp",label:"Profile picture",sub:"National Day · Square",layout:"doc",doc:"templates/nd26/nd-pfp.json",size:"square",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-countdown-3",label:"Countdown · 3 days",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-countdown-3.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-countdown-2",label:"Countdown · 2 days",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-countdown-2.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-countdown-1",label:"Countdown · 1 day",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-countdown-1.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-greeting",label:"Greeting story",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-greeting.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-the-day",label:"The day story",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-the-day.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-thanks",label:"Thank you story",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-thanks.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-teaser-post",label:"Teaser post",sub:"National Day · Post",layout:"doc",doc:"templates/nd26/nd-teaser-post.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-discount-post",label:"Discount post",sub:"National Day · Post",layout:"doc",doc:"templates/nd26/nd-discount-post.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-giveaway-post",label:"Giveaway post",sub:"National Day · Post",layout:"doc",doc:"templates/nd26/nd-giveaway-post.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-greeting-post",label:"Greeting post",sub:"National Day · Post",layout:"doc",doc:"templates/nd26/nd-greeting-post.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"nd-highlight",label:"Highlight cover",sub:"National Day · Story",layout:"doc",doc:"templates/nd26/nd-highlight.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-t1-poll",label:"Label · What are we printing? (poll)",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-t1-poll.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-t2-guess",label:"Label · Guess under the scribble",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-t2-guess.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-t3-guesses",label:"Label · Your guesses",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-t3-guesses.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-t4-tonight",label:"Label · Reveal tonight",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-t4-tonight.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-r1-reveal",label:"Label · The reveal",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-r1-reveal.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-r3-printing",label:"Label · Printing story",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-r3-printing.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-r4-where",label:"Label · Where to get it",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-r4-where.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-e1-poll",label:"Label · Classic or Passion? (poll)",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-e1-poll.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-e2-hunt",label:"Label · Find our cat",sub:"New label reveal · Story",layout:"doc",doc:"templates/nd26/lr-e2-hunt.json",size:"story",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-c1-cover",label:"Label carousel · 1 Cover",sub:"New label reveal · Post",layout:"doc",doc:"templates/nd26/lr-c1-cover.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-c2-closeup",label:"Label carousel · 2 Close-up",sub:"New label reveal · Post",layout:"doc",doc:"templates/nd26/lr-c2-closeup.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-c3-printing",label:"Label carousel · 3 Printing",sub:"New label reveal · Post",layout:"doc",doc:"templates/nd26/lr-c3-printing.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-c4-flavours",label:"Label carousel · 4 Two flavours",sub:"New label reveal · Post",layout:"doc",doc:"templates/nd26/lr-c4-flavours.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"},
      {id:"lr-c5-where",label:"Label carousel · 5 Where to get it",sub:"New label reveal · Post",layout:"doc",doc:"templates/nd26/lr-c5-where.json",size:"post",cat:"nationalday",keys:"national day oman 18 november label reveal نوفمبر العيد الوطني"}
    ]
  },
  /* Example photos each tool opens with (files in samples/). */
  samples:{
    'new-place':['shelf'], 'photo-story':['tall'], 'cinematic':['pair'],
    'collage':['beans','foam','passion','window'], 'split':['closeup','shelf'],
    'restock':['pair'], 'offer':['hands'], 'carousel':['pair','closeup','hand','window']
  }
});
