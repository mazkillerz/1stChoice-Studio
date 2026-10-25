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
     No cat mascot stickers unless the owner asks for them. */
  /* prev: a light copy (~1000px WebP) for previews and on-screen editing; saving always uses the HD file */
  assets:[
    {id:'logo',label:'Logo',file:'logo.png',group:'Logo',tint:true},
    {id:'can-classic',label:'Classic can',file:'assets/classic_can.png',prev:'assets/prev/classic_can.webp',group:'Cans (HD cut-outs)'},
    {id:'can-classic-shadow',label:'Classic + shadow',file:'assets/classic_can_shadow.png',prev:'assets/prev/classic_can_shadow.webp',group:'Cans (HD cut-outs)'},
    {id:'can-passion',label:'Passion Fruit can',file:'assets/passion_can.png',prev:'assets/prev/passion_can.webp',group:'Cans (HD cut-outs)'},
    {id:'can-passion-shadow',label:'Passion + shadow',file:'assets/passion_can_shadow.png',prev:'assets/prev/passion_can_shadow.webp',group:'Cans (HD cut-outs)'},
    {id:'cans-pair',label:'Both cans',file:'assets/cans_pair.png',prev:'assets/prev/cans_pair.webp',group:'Cans (HD cut-outs)'},
    {id:'cans-pair-shadow',label:'Both + shadow',file:'assets/cans_pair_shadow.png',prev:'assets/prev/cans_pair_shadow.webp',group:'Cans (HD cut-outs)'}
  ],
  /* Templates library (Home → Templates): ready-made starts made of a tool, one of its styles and approved words.
     cat: restock | story | post | highlight. Previews: assets/thumbs/<brand>/tpl/<id>.jpg (node tests/tplthumbs.mjs makes them).
     Words come only from the approved phrases above. A tap opens the tool with these settings, as a new story. */
  presets:[
    {id:'rs-cans',tool:'restock',cat:'restock',label:'Cans, no photo',sub:'Restock · ready in one tap',style:'cans',badge:'New',values:{head:'رجع متوفر'}},
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
    {id:'co-border',tool:'collage',cat:'story',label:'With borders',sub:'Collage · 3 photos',count:3,badge:'New',values:{lay3:'g-3-rows',border:16,gap:24}},
    {id:'co-mosaic',tool:'collage',cat:'story',label:'Mosaic',sub:'Collage · 6 photos',count:6,values:{lay6:'g-mosaic'}},
    {id:'co-prints',tool:'collage',cat:'story',label:'Scattered prints',sub:'Collage · 4 photos',count:4,values:{lay4:'scatter'}},
    {id:'co-film',tool:'collage',cat:'story',label:'Film strip',sub:'Collage · 4 photos',count:4,style:'black',values:{lay4:'film'}},
    {id:'np-new',tool:'new-place',cat:'story',label:'New place',sub:'A new sale point',style:'A'},
    {id:'sp-two',tool:'split',cat:'story',label:'Two-photo split',sub:'Close-up and wide',style:'white'},
    {id:'ci-bars',tool:'cinematic',cat:'story',label:'Cinematic bars',sub:'A wide photo, shown whole',style:'black'},
    {id:'of-offer',tool:'offer',cat:'story',label:'Offer',sub:'Tiles, dates and a button',style:'white'},
    {id:'ca-white',tool:'carousel',cat:'post',label:'Feed carousel',sub:'Carousel · several slides',style:'white'},
    {id:'hl-white',tool:'highlight',cat:'highlight',label:'White covers',sub:'Highlight covers · a set',style:'white',values:{shape:'disc'}},
    {id:'hl-cream',tool:'highlight',cat:'highlight',label:'Cream covers',sub:'Highlight covers · a set',style:'cream',values:{shape:'ring'}},
    {id:'hl-ink',tool:'highlight',cat:'highlight',label:'Black covers',sub:'Highlight covers · a set',style:'black',values:{shape:'plain'}}
  ],
  /* Create: the templates offered for this brand. Layouts live in tools/create-templates.js (no wording there);
     the words here come only from the approved phrases above. `write` (اكتب هنا) marks a spot for your own words. */
  create:{
    templates:[
      {id:'ice-cold',label:'Ice cold',layout:'hero-panel',size:'story',words:{head:'يسرسح ثلج',small:'خذلك كولد برو',pill:'الخريطة في البايو'},assets:{product:'cans-pair-shadow'}},
      {id:'did-you-know',label:'Did you know',layout:'did-you-know',size:'story',words:{head:'تعرف ويش؟',pill:'جربته؟'},assets:{product:'can-classic-shadow'}},
      {id:'your-choice',label:'Your choice',layout:'your-choice',size:'story',words:{head:'اختيارك؟',pill:'منشن ربعك'},assets:{one:'can-classic',two:'can-passion'}},
      {id:'chat',label:'Chat (late friend)',layout:'chat',size:'post',pages:3,words:{name:'ربيعي',pill:'اطلب الحين'},assets:{photo:'cans-pair'}},
      {id:'bingo',label:'Bingo 4×4',layout:'bingo',size:'post',look:'cream',words:{},assets:{product:'can-classic'}},
      {id:'spot',label:'Spot the difference',layout:'spot',size:'story',words:{head:'صبر شوي...'},assets:{product:'cans-pair'}},
      {id:'tictactoe',label:'Tic-tac-toe',layout:'tictactoe',size:'square',words:{},assets:{x:'can-classic',o:'can-passion'}},
      {id:'rate',label:'Rate 1–10',layout:'rate',size:'story',words:{head:'جربته؟'},assets:{product:'can-classic-shadow'}},
      {id:'mood',label:'Mood grid 2×2',layout:'mood',size:'post',words:{head:'أنت أي واحد؟'}},
      {id:'equation',label:'Equation',layout:'equation',size:'story',words:{},assets:{product:'can-passion-shadow'}},
      {id:'lockscreen',label:'Lockscreen',layout:'lockscreen',size:'story',words:{}},
      {id:'battery',label:'Before / after battery',layout:'battery',size:'story',words:{small:'يصحصحك'},assets:{product:'can-classic-shadow'}},
      {id:'offer',label:'Offer',layout:'offer',size:'story',words:{head:'ما يتفوت',pill:'اطلب الحين'},assets:{product:'cans-pair-shadow'}},
      {id:'order-steps',label:'How to order',layout:'order-steps',size:'story',words:{head:'اطلب الحين',step1:'راسلنا خاص'},assets:{product:'cans-pair-shadow'}},
      {id:'one-word',label:'Occasion: one word',layout:'one-word',size:'story',look:'cream',words:{head:'روّق'}},
      {id:'restock',label:'Restock',cat:'restock',layout:'restock',size:'story',words:{head:'رجع متوفر',small:'وفرنا كمية جديدة',pill:'اطلب الحين'},assets:{product:'cans-pair-shadow'}},
      {id:'new-place',label:'New place',layout:'new-place',size:'story',words:{head:'نقطة بيع جديدة',place:'اسم المكان',pill:'الخريطة في البايو'}},
      {id:'stock-alert',label:'Stock alert',cat:'restock',layout:'stock-alert',size:'story',words:{head:'الكمية محدودة',pill:'راسلنا خاص'},assets:{product:'can-classic-shadow'}},
      {id:'restock-post',label:'Restock post',badge:'New',cat:'restock',layout:'restock-post',size:'post',words:{head:'رجع متوفر',pill:'اطلب الحين'},assets:{product:'cans-pair-shadow'}},
      {id:'both-flavours',label:'Both flavours',badge:'New',cat:'restock',layout:'both-flavours',size:'story',words:{head:'وفرنا كمية جديدة'},assets:{one:'can-classic-shadow',two:'can-passion-shadow'}},
      {id:'this-or-that',label:'This or that',badge:'New',cat:'post',layout:'this-or-that',size:'post',words:{head:'هذا ولا هذا؟',pill:'منشن ربعك'},assets:{one:'can-classic-shadow',two:'can-passion-shadow'}},
      {id:'one-word-post',label:'One word post',badge:'New',cat:'post',layout:'one-word-post',size:'post',look:'cream',words:{head:'روّق'}},
      {id:'map-post',label:'Map in bio post',badge:'New',cat:'post',layout:'map-post',size:'post',words:{head:'وين تلقانا؟',pill:'الخريطة في البايو'}},
      {id:'good-morning',label:'Good morning',badge:'New',cat:'story',layout:'good-morning',size:'story',words:{head:'صباح الخير',small:'يصحصحك'},assets:{product:'can-classic-shadow'}},
      {id:'highlight-places',label:'Highlight: places',layout:'highlight',size:'square',icon:'pin',words:{}},
      {id:'highlight-chat',label:'Highlight: chat',layout:'highlight',size:'square',icon:'chat',words:{}},
      {id:'highlight-reviews',label:'Highlight: reviews',layout:'highlight',size:'square',icon:'star',words:{}},
      {id:'highlight-order',label:'Highlight: order',badge:'New',cat:'highlight',layout:'highlight',size:'square',icon:'cart',words:{}},
      {id:'highlight-new',label:'Highlight: new',badge:'New',cat:'highlight',layout:'highlight',size:'square',icon:'sparkles',words:{}}
    ]
  },
  /* Example photos each tool opens with (files in samples/). */
  samples:{
    'new-place':['shelf'], 'photo-story':['tall'], 'cinematic':['pair'],
    'collage':['beans','foam','passion','window'], 'split':['closeup','shelf'],
    'restock':['pair'], 'offer':['hands'], 'carousel':['pair','closeup','hand','window']
  }
});
