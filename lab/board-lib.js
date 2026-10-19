/* Board (experimental): built-in library — frame sizes, shapes, icons, emoji, fonts and starter templates.
   Brand-agnostic: brand wording, colours, fonts and pictures come from the active brand kit. */
(function(){
const BD=window.BD=window.BD||{};

/* frame sizes (pixels) */
BD.PRESETS=[
  {id:'story',label:'Story / Reel',w:1080,h:1920,group:'Social'},
  {id:'post45',label:'Post 4:5',w:1080,h:1350,group:'Social'},
  {id:'square',label:'Square post',w:1080,h:1080,group:'Social'},
  {id:'portrait34',label:'Portrait 3:4',w:1080,h:1440,group:'Social'},
  {id:'landscape',label:'Landscape 16:9',w:1920,h:1080,group:'Social'},
  {id:'yt',label:'YouTube thumbnail',w:1280,h:720,group:'Social'},
  {id:'xpost',label:'X post',w:1600,h:900,group:'Social'},
  {id:'fbcover',label:'Facebook cover',w:1640,h:624,group:'Social'},
  {id:'a4',label:'A4 (print, 300 dpi)',w:2480,h:3508,group:'Print'},
  {id:'a5',label:'A5 (print, 300 dpi)',w:1748,h:2480,group:'Print'},
  {id:'card',label:'Business card',w:1050,h:600,group:'Print'},
  {id:'poster',label:'Poster 2:3',w:2000,h:3000,group:'Print'},
  {id:'menu',label:'Menu board 16:9',w:3840,h:2160,group:'Screens'}
];

/* print sizes in millimetres (frames are made at the chosen DPI, 300 by default) */
BD.PRINT=[
  {id:'a4',label:'A4',w:210,h:297},{id:'a5',label:'A5',w:148,h:210},{id:'a6',label:'A6',w:105,h:148},{id:'a3',label:'A3',w:297,h:420},
  {id:'letter',label:'US Letter',w:215.9,h:279.4},{id:'card',label:'Business card',w:85,h:55},{id:'postcard',label:'Postcard',w:148,h:105},
  {id:'dl',label:'DL flyer',w:99,h:210},{id:'sticker50',label:'Sticker 50 × 50',w:50,h:50},{id:'label100',label:'Label 100 × 70',w:100,h:70}
];
/* filled shapes drawn in a 100×100 box (Konva.Path) */
function poly(n,r1,r2,rot){ let d=''; for(let i=0;i<n*2;i++){ const a=(i/(n*2))*Math.PI*2+(rot||-Math.PI/2), r=i%2?r2:r1; d+=(i?'L':'M')+(50+Math.cos(a)*r).toFixed(2)+' '+(50+Math.sin(a)*r).toFixed(2); } return d+'Z'; }
BD.SHAPES=[
  {id:'rect',label:'Rectangle',make:'rect'},
  {id:'rounded',label:'Rounded box',make:'rect',radius:40},
  {id:'ellipse',label:'Circle',make:'ellipse'},
  {id:'triangle',label:'Triangle',make:'poly',sides:3},
  {id:'diamond',label:'Diamond',path:'M50 0L100 50L50 100L0 50Z'},
  {id:'pentagon',label:'Pentagon',make:'poly',sides:5},
  {id:'hexagon',label:'Hexagon',make:'poly',sides:6},
  {id:'star',label:'Star',make:'star',points:5},
  {id:'star8',label:'Star 8',make:'star',points:8,inner:.72},
  {id:'ring',label:'Ring',make:'ring'},
  {id:'heart',label:'Heart',path:'M50 92C22 70 2 52 2 30C2 14 14 3 29 3C39 3 46 9 50 16C54 9 61 3 71 3C86 3 98 14 98 30C98 52 78 70 50 92Z'},
  {id:'bubble',label:'Speech bubble',path:'M12 6H88Q96 6 96 14V60Q96 68 88 68H42L22 90L26 68H12Q4 68 4 60V14Q4 6 12 6Z'},
  {id:'cloud',label:'Cloud',path:'M27 84H75A21 21 0 0 0 79 42A29 29 0 0 0 23 36A24 24 0 0 0 27 84Z'},
  {id:'blob',label:'Blob',path:'M58 5C81 9 97 30 93 55C89 79 66 97 41 93C17 89 2 68 7 43C12 19 35 1 58 5Z'},
  {id:'blob2',label:'Blob 2',path:'M50 3C64 3 70 14 82 20C95 27 99 41 95 55C91 70 96 84 82 92C68 100 56 93 43 95C29 97 14 93 8 80C2 67 9 55 6 41C3 27 8 13 21 8C32 4 38 3 50 3Z'},
  {id:'badge',label:'Badge',path:poly(16,50,43)},
  {id:'burst',label:'Burst',path:poly(12,50,34)},
  {id:'sparkle',label:'Sparkle',path:'M50 0Q55 45 100 50Q55 55 50 100Q45 55 0 50Q45 45 50 0Z'},
  {id:'arrowfat',label:'Arrow',path:'M0 36H60V12L100 50L60 88V64H0Z'},
  {id:'chevron',label:'Chevron',path:'M8 10H60L92 50L60 90H8L40 50Z'},
  {id:'plus',label:'Plus',path:'M37 0H63V37H100V63H63V100H37V63H0V37H37Z'},
  {id:'arch',label:'Arch',path:'M0 100V50A50 50 0 0 1 100 50V100Z'},
  {id:'half',label:'Half circle',path:'M0 75A50 50 0 0 1 100 75Z'},
  {id:'ribbon',label:'Ribbon',path:'M0 22H100L86 50L100 78H0L14 50Z'},
  {id:'ticket',label:'Ticket',path:'M6 15H94V38A12 12 0 0 0 94 62V85H6V62A12 12 0 0 0 6 38Z'},
  {id:'drop',label:'Drop',path:'M50 2C50 2 86 42 86 64A36 36 0 0 1 14 64C14 42 50 2 50 2Z'},
  {id:'leaf',label:'Leaf',path:'M10 90C10 40 40 10 90 10C90 60 60 90 10 90Z'},
  {id:'moon',label:'Moon',path:'M64 4A46 46 0 1 0 96 70A38 38 0 1 1 64 4Z'}
];
/* lines drawn with a stroke only (100×100 box) */
BD.STROKES=[
  {id:'line',label:'Line',make:'line'},
  {id:'arrow',label:'Arrow line',make:'arrow'},
  {id:'squiggle',label:'Squiggle',path:'M0 50Q12.5 25 25 50T50 50T75 50T100 50'},
  {id:'swoosh',label:'Swoosh',path:'M4 70Q50 30 96 58'},
  {id:'circle-mark',label:'Hand circle',path:'M70 14C40 4 8 22 6 50C4 78 40 94 70 86C94 78 100 50 86 30C78 18 60 12 44 14'},
  {id:'underline2',label:'Double underline',path:'M4 40Q50 30 96 38M10 60Q50 52 90 58'},
  {id:'zigzag',label:'Zigzag',path:'M0 60L12.5 40L25 60L37.5 40L50 60L62.5 40L75 60L87.5 40L100 60'}
];
/* outline icons (24×24 box) */
BD.ICONS=[
  ['check','M20 6L9 17L4 12'],['close','M18 6L6 18M6 6L18 18'],['arrow-right','M5 12H19M13 6L19 12L13 18'],['arrow-down','M12 5V19M6 13L12 19L18 13'],
  ['arrow-up-right','M7 17L17 7M8 7H17V16'],['heart','M20.8 4.6A5.5 5.5 0 0 0 13 4.6L12 5.7L11 4.6A5.5 5.5 0 0 0 3.2 12.4L4.2 13.5L12 21L19.8 13.5L20.8 12.4A5.5 5.5 0 0 0 20.8 4.6Z'],
  ['star','M12 2L15.1 8.3L22 9.3L17 14.1L18.2 21L12 17.8L5.8 21L7 14.1L2 9.3L8.9 8.3Z'],['pin','M20 10C20 16 12 22 12 22C12 22 4 16 4 10A8 8 0 0 1 20 10Z M15 10A3 3 0 1 1 9 10A3 3 0 1 1 15 10Z'],
  ['phone','M22 16.9V19.9A2 2 0 0 1 19.8 21.9A19.8 19.8 0 0 1 11.2 18.8A19.5 19.5 0 0 1 5.2 12.8A19.8 19.8 0 0 1 2.1 4.2A2 2 0 0 1 4.1 2H7.1A2 2 0 0 1 9.1 3.7C9.2 4.6 9.5 5.5 9.8 6.4A2 2 0 0 1 9.3 8.5L8 9.8A16 16 0 0 0 14 15.8L15.3 14.5A2 2 0 0 1 17.4 14.1C18.3 14.4 19.2 14.7 20.1 14.8A2 2 0 0 1 22 16.9Z'],
  ['camera','M7 2H17A5 5 0 0 1 22 7V17A5 5 0 0 1 17 22H7A5 5 0 0 1 2 17V7A5 5 0 0 1 7 2Z M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12Z M17.5 6.5L17.6 6.5'],
  ['coffee','M17 8H18A4 4 0 0 1 18 16H17 M3 8H17V17A4 4 0 0 1 13 21H7A4 4 0 0 1 3 17Z M6 2V4 M10 2V4 M14 2V4'],
  ['snowflake','M12 2V22 M2 12H22 M4.9 4.9L19.1 19.1 M19.1 4.9L4.9 19.1 M9 3L12 6L15 3 M9 21L12 18L15 21 M3 9L6 12L3 15 M21 9L18 12L21 15'],
  ['sun','M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12Z M12 2V4 M12 20V22 M4.9 4.9L6.3 6.3 M17.7 17.7L19.1 19.1 M2 12H4 M20 12H22 M6.3 17.7L4.9 19.1 M19.1 4.9L17.7 6.3'],
  ['clock','M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M12 6V12L16 14'],['chat','M21 11.5A8.5 8.5 0 0 1 8.4 19L3 21L5 15.6A8.5 8.5 0 1 1 21 11.5Z'],
  ['cart','M3 3H5L7.6 15H18.4L21 7H6 M10 20A1 1 0 1 1 8 20A1 1 0 1 1 10 20Z M19 20A1 1 0 1 1 17 20A1 1 0 1 1 19 20Z'],
  ['tag','M20.6 13.4L13.4 20.6A2 2 0 0 1 10.6 20.6L2 12V2H12L20.6 10.6A2 2 0 0 1 20.6 13.4Z M7.5 7.5L7.6 7.5'],
  ['gift','M3 8H21V12H3Z M5 12V21H19V12 M12 8V21 M12 8C10 4 7 4 7 6C7 8 12 8 12 8 M12 8C14 4 17 4 17 6C17 8 12 8 12 8'],
  ['bolt','M13 2L3 14H12L11 22L21 10H12Z'],['sparkles','M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1Z M19 15L19.8 17.2L22 18L19.8 18.8L19 21L18.2 18.8L16 18L18.2 17.2Z'],
  ['calendar','M5 4H19A2 2 0 0 1 21 6V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V6A2 2 0 0 1 5 4Z M16 2V6 M8 2V6 M3 10H21'],
  ['music','M9 18V5L21 3V16 M9 18A3 3 0 1 1 3 18A3 3 0 1 1 9 18Z M21 16A3 3 0 1 1 15 16A3 3 0 1 1 21 16Z'],['play','M6 3L20 12L6 21Z'],
  ['search','M19 11A8 8 0 1 1 3 11A8 8 0 1 1 19 11Z M21 21L16.7 16.7'],['home','M3 10L12 3L21 10V20A1 1 0 0 1 20 21H15V14H9V21H4A1 1 0 0 1 3 20Z'],
  ['link','M10 13A5 5 0 0 0 17.5 13.5L20.5 10.5A5 5 0 0 0 13.5 3.5L11.8 5.2 M14 11A5 5 0 0 0 6.5 10.5L3.5 13.5A5 5 0 0 0 10.5 20.5L12.2 18.8'],
  ['mail','M4 4H20A2 2 0 0 1 22 6V18A2 2 0 0 1 20 20H4A2 2 0 0 1 2 18V6A2 2 0 0 1 4 4Z M22 6L12 13L2 6'],
  ['truck','M1 3H16V16H1Z M16 8H20L23 11V16H16 M7.5 18.5A2.5 2.5 0 1 1 2.5 18.5A2.5 2.5 0 1 1 7.5 18.5Z M20.5 18.5A2.5 2.5 0 1 1 15.5 18.5A2.5 2.5 0 1 1 20.5 18.5Z'],
  ['percent','M19 5L5 19 M9 6.5A2.5 2.5 0 1 1 4 6.5A2.5 2.5 0 1 1 9 6.5Z M20 17.5A2.5 2.5 0 1 1 15 17.5A2.5 2.5 0 1 1 20 17.5Z'],
  ['smile','M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M8 14C9 16 15 16 16 14 M9 9L9.1 9 M15 9L15.1 9'],
  ['fire','M12 22C7 22 4 18.5 4 14.5C4 10 8 7 9 2C12 4 13 7 12.5 9.5C14 8.5 15 7 15 5.5C18 8 20 11 20 14.5C20 18.5 17 22 12 22Z'],
  ['store','M3 9L4.5 3H19.5L21 9 M3 9H21V10A3 3 0 0 1 15 10A3 3 0 0 1 9 10A3 3 0 0 1 3 10Z M5 12V21H19V12 M10 21V15H14V21'],
  ['map','M9 4L3 6V20L9 18L15 20L21 18V4L15 6Z M9 4V18 M15 6V20'],['user','M20 21V19A4 4 0 0 0 16 15H8A4 4 0 0 0 4 19V21 M16 7A4 4 0 1 1 8 7A4 4 0 1 1 16 7Z'],
  ['globe','M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M2 12H22 M12 2C15 5 16 9 16 12C16 15 15 19 12 22C9 19 8 15 8 12C8 9 9 5 12 2Z'],
  ['info','M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M12 16V12 M12 8L12.1 8'],['bell','M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8 M13.7 21A2 2 0 0 1 10.3 21'],
  ['thumb','M7 10V21H4V10Z M7 10L11 2A3 3 0 0 1 14 5V9H19.5A2 2 0 0 1 21.5 11.3L20.1 19.3A2 2 0 0 1 18.1 21H7'],
  ['crown','M2 18L4 7L9 11L12 4L15 11L20 7L22 18Z M2 21H22']
].map(([id,d])=>({id,d}));

BD.EMOJI='☕ 🧊 ❄️ 🔥 ✨ ⭐ 🌟 💛 🤍 🖤 🤎 🧡 🥤 🍹 🍊 🥭 🍋 🌴 ☀️ 🌙 📍 📞 📸 🎉 🎁 💯 ✅ ❌ ➡️ ⬅️ ⬇️ ⬆️ 👇 👉 👈 🛒 🏷️ ⏰ 📅 💬 ❤️ 😍 😋 🤤 😎 👀 🙌 👌 💪 🫶 🏃 🚚 🛍️ 💸 🆕 🔝 ⚡ 🌊 🌈 🎶 📣 🗓️ 🕒'.split(' ');

/* fonts: the brand's first, then Arabic, then Latin. w = weights to load from Google Fonts */
BD.FONTS_EXTRA=[
  {family:'Rubik',w:'400;700;900',tag:'ar'},{family:'IBM Plex Sans Arabic',w:'400;700',tag:'ar'},{family:'Aref Ruqaa',w:'400;700',tag:'ar'},
  {family:'Noto Naskh Arabic',w:'400;700',tag:'ar'},{family:'Kufam',w:'400;700;900',tag:'ar'},
  {family:'Inter',w:'400;600;800'},{family:'Poppins',w:'400;600;800'},{family:'Montserrat',w:'400;700;900'},{family:'Bebas Neue',w:'400'},
  {family:'Oswald',w:'400;700'},{family:'Anton',w:'400'},{family:'Archivo Black',w:'400'},{family:'Space Grotesk',w:'400;700'},
  {family:'Playfair Display',w:'400;700;900'},{family:'DM Serif Display',w:'400'},{family:'Abril Fatface',w:'400'},{family:'Roboto Slab',w:'400;700'},
  {family:'Righteous',w:'400'},{family:'Lobster',w:'400'},{family:'Pacifico',w:'400'},{family:'Caveat',w:'400;700'},{family:'Permanent Marker',w:'400'}
];

/* photo looks: values for the Adjust filter */
BD.LOOKS=[
  {id:'none',label:'Original',fx:{}},
  {id:'warm',label:'Warm',fx:{temp:28,sat:8}},
  {id:'cool',label:'Cool',fx:{temp:-26,sat:-4}},
  {id:'punch',label:'Punch',fx:{contrast:24,sat:28}},
  {id:'bw',label:'B&W',fx:{gray:100,contrast:14}},
  {id:'vintage',label:'Vintage',fx:{sepia:55,fade:25,contrast:-6}},
  {id:'fade',label:'Fade',fx:{fade:42,contrast:-12,sat:-10}},
  {id:'moody',label:'Moody',fx:{bright:-10,contrast:22,sat:-22,vignette:45}},
  {id:'bright',label:'Bright',fx:{bright:12,contrast:6,sat:6}},
  {id:'golden',label:'Golden',fx:{temp:40,bright:6,sat:12,vignette:20}}
];

/* starter templates. Each returns frames built from the brand kit (approved wording only). */
BD.TEMPLATES=[
  {id:'headline',label:'Headline story',w:1080,h:1920},
  {id:'product',label:'Product post',w:1080,h:1350},
  {id:'square',label:'Square promo',w:1080,h:1080},
  {id:'carousel',label:'Carousel (3 slides)',w:1080,h:1350},
  {id:'menu',label:'Landscape banner',w:1920,h:1080}
];
})();
