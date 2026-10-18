/* Brand kit: 1st Choice cold brew (Oman).
   Everything brand-specific lives here: logo, fonts, colours, writing direction, approved wording and example photos.
   To add another brand, copy this folder, change the values, and list it in brands/brands.js. */
Studio.registerBrand({
  id:'1stchoice',
  name:'1st Choice',
  logo:'logo.png',             // dark logo on a transparent background; a light copy is made automatically
  icon:'icon.png',
  lang:'ar', dir:'rtl',
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
    cream:'#F3EADC'
  },
  /* Wording from the owner's Omani phrasebook. Only approved lines go here. */
  phrases:{
    headlines:['يسرسح ثلج','جربته؟','ترا فنان','ما يتفوت','عالميييي','تعرف ويش؟','مشتهيه؟','صبر شوي...','اطلب الحين','وين تلقانا؟','رجع متوفر','وفرنا كمية جديدة','خذلك كولد برو','هذا ولا هذا؟','أنت أي واحد؟','اختيارك؟','منشن ربعك','صباح الخير','روّق','الجو حرّ اليوم؟'],
    small:['خذلك كولد برو','الرابط في البايو','شوف أقرب نقطة بيع لك','راسلنا خاص','كولد برو','كلاسيك / باشن فروت','يسرسح ثلج','ما مر','منعش','يصحصحك','الكمية محدودة','اختيارك الأول، دائماً'],
    buttons:['الرابط في البايو','راسلنا خاص','اطلب الحين','شوف أقرب نقطة بيع لك'],
    newPlace:['نقطة بيع جديدة','وين تلقانا؟ هنا','صرنا متوفرين هنا'],
    cut:['وين تلقانا؟','يسرسح ثلج','صبر شوي...','لا تعدّي قبل لا تشوف هذا','ياخذ وقته...','هذا ولا هذا؟','ترا فنان','أنت أي واحد؟','تعرف ويش؟','خذلك كولد برو'],
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
    'collage':['beans','foam','passion','window'], 'split':['closeup','shelf']
  }
});
