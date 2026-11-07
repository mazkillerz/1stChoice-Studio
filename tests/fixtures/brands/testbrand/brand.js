/* Test-only brand kit (tests/brandkit.mjs). Never shipped, never listed in brands/brands.js.
   Proves the engine works with a different brand: English, left to right, Latin digits, system fonts. */
Studio.registerBrand({
  id:'testbrand', name:'Test Brand', logo:'logo.png', icon:'icon.png',
  lang:'en', dir:'ltr', locale:'en-GB', digits:'latin',
  fonts:{ display:'Georgia', body:'Verdana',
    choices:[{family:'Georgia',label:'Georgia (headlines)',wt:''},{family:'Verdana',label:'Verdana (body)',wt:''}] },
  colors:{ ink:'#102030', paper:'#FAFAF0', night:'#0A0A14', muted:'#50566A', mutedOnDark:'#C8CCD8', accent:'#2A9D8F', cream:'#F0E6FF',
    brown:'#5A3E8C', blob:'#D9E8F5', panel:'#EEF2F6', grey:'#7A7F8C', yellow:'#E9C46A', berry:'#E76F51' },
  palette:[
    {id:'paper',name:'Paper',hex:'#FAFAF0'},{id:'ink',name:'Ink',hex:'#102030'},{id:'grey',name:'Grey',hex:'#7A7F8C'},
    {id:'panel',name:'Panel',hex:'#EEF2F6'},{id:'cream',name:'Lilac',hex:'#F0E6FF'},{id:'brown',name:'Plum',hex:'#5A3E8C'},
    {id:'blob',name:'Sky',hex:'#D9E8F5'},{id:'teal',name:'Teal',hex:'#2A9D8F'},{id:'yellow',name:'Sand',hex:'#E9C46A'},{id:'berry',name:'Coral',hex:'#E76F51'}
  ],
  handle:'@testbrand',
  flavours:[
    {id:'a',name:'Alpha',bg:'#102030',fg:'#FAFAF0',can:'can-a'},
    {id:'b',name:'Beta',bg:'#E9C46A',fg:'#102030',can:'can-b'}
  ],
  products:{both:'cans-pair'},
  defaults:{offer:{head:'Fresh today',pill:'Order now'},restock:{small:'Limited stock'}},
  phrases:{
    headlines:['Back in stock','Fresh today','New in'],
    small:['Link in bio','Limited stock','Alpha / Beta'],
    buttons:['Link in bio','Order now','Message us'],
    bio:'Map in bio',
    newPlace:['New spot','Find us here'],
    cut:['Find us','Wait for it'],
    restock:['Back in stock','Fresh stock'],
    placeName:'Place name',
    write:'Write here'
  },
  assets:[
    {id:'logo',label:'Logo',file:'logo.png',group:'Logo',tint:true},
    {id:'can-a',label:'Alpha can',file:'assets/can_a.png',group:'Cans',noFlip:true},
    {id:'can-b',label:'Beta can',file:'assets/can_b.png',group:'Cans',noFlip:true},
    {id:'cans-pair',label:'Both cans',file:'assets/cans_pair.png',group:'Cans',noFlip:true}
  ],
  tokens:{
    formats:{ story:[1080,1920], post:[1080,1350], square:[1080,1080], highlight:[1080,1080] },
    type:{ story:{ headline:{size:96,lh:1.1,font:'display',wt:'700'}, sub:{size:50,lh:1.3,font:'body',wt:'400'}, body:{size:42,lh:1.4,font:'body',wt:'400'}, small:{size:30,lh:1.3,font:'body',wt:'400'} } },
    space:[4,12,20,28,40],
    radius:{ sm:8, md:20, lg:36, pill:500 },
    shadow:{ soft:{blur:12,y:4,color:'rgba(16,32,48,.3)'}, lift:{blur:40,y:12,color:'rgba(16,32,48,.35)'} },
    safe:{ story:{top:200,bottom:340,side:60} }
  },
  create:{templates:[]},
  samples:{ 'new-place':['a'], 'photo-story':['b'], 'cinematic':['a'], 'collage':['a','b','c','d'], 'split':['a','b'], 'restock':['a'], 'offer':['c'], 'carousel':['a','b','c','d'] }
});
