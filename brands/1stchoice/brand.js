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
    {id:'classic',name:'كلاسيك',bg:'#161210',fg:'#FFFFFF'},
    {id:'passion',name:'باشن فروت',bg:'#F6C040',fg:'#161210'}
  ],
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
  assets:[
    {id:'logo',label:'Logo',file:'logo.png',group:'Logo',tint:true},
    {id:'can-classic',label:'Classic can',file:'assets/classic_can.png',group:'Cans (HD cut-outs)'},
    {id:'can-classic-shadow',label:'Classic + shadow',file:'assets/classic_can_shadow.png',group:'Cans (HD cut-outs)'},
    {id:'can-passion',label:'Passion Fruit can',file:'assets/passion_can.png',group:'Cans (HD cut-outs)'},
    {id:'can-passion-shadow',label:'Passion + shadow',file:'assets/passion_can_shadow.png',group:'Cans (HD cut-outs)'},
    {id:'cans-pair',label:'Both cans',file:'assets/cans_pair.png',group:'Cans (HD cut-outs)'},
    {id:'cans-pair-shadow',label:'Both + shadow',file:'assets/cans_pair_shadow.png',group:'Cans (HD cut-outs)'}
  ],
  /* Example photos each tool opens with (files in samples/). */
  samples:{
    'new-place':['shelf'], 'photo-story':['tall'], 'cinematic':['pair'],
    'collage':['beans','foam','passion','window'], 'split':['closeup','shelf'],
    'restock':['pair'], 'offer':['hands'], 'carousel':['pair','closeup','hand','window']
  }
});
