/* Create: template layouts. A template = a layout here (brand-agnostic: positions, sizes, which elements)
   + an entry in the brand kit (brand.js → create.templates: its name, size, look, words and pictures).
   Every piece is a normal layer, so a template is only a starting point: change anything.
   Layouts work on a 1080-wide frame; stories are 1080×1920 (keep words out of the top 250 px and bottom 300 px),
   posts and carousel slides 1080×1350. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, CR=window.CR;

/* ---------- the helper every layout gets ---------- */
function helper(opt){
  opt=opt||{}; const C=CR.colors(), B=BD.B||{};
  const t={C,B,el:CR.el,num:CR.num,write:CR.write,dateLine:CR.dateLine,display:BD.displayFont(),body:BD.bodyFont(),rtl:B.dir==='rtl',frames:[]};
  /* a new frame (page) to the right of what's already there */
  t.frame=function(w,h,o){ o=o||{}; let x=0,y=0; const last=t.frames[t.frames.length-1], fs=U.frames();
    if(last){ x=Math.round(last.x()+U.fsize(last).w+(o.gap||120)); y=last.y(); }
    else if(opt.at){ x=opt.at.x; y=opt.at.y; }
    else if(fs.length){ const r=U.unionRect(fs); x=Math.round(r.x+r.width+(o.gap||120)); y=Math.round(r.y); }
    const f=BD.makeFrame(x,y,w,h,{label:o.label||'Page '+(t.frames.length+1),fill:o.fill||C.paper}); t.frames.push(f); return f; };
  /* put a node in a frame. at: {x,y} top-left | {cx,cy} centre | {cx,y} centred across, top at y | {x,cy} | {right,y} (right edge) */
  t.add=function(f,n,at){ if(!n) return null; f.add(n); at=at||{}; const r=n.getClientRect({relativeTo:f,skipShadow:true});
    let dx=0, dy=0;
    if(at.cx!=null) dx=at.cx-(r.x+r.width/2); else if(at.right!=null) dx=at.right-(r.x+r.width); else if(at.x!=null) dx=at.x-r.x;
    if(at.cy!=null) dy=at.cy-(r.y+r.height/2); else if(at.bottom!=null) dy=at.bottom-(r.y+r.height); else if(at.y!=null) dy=at.y-r.y;
    n.x(Math.round(n.x()+dx)); n.y(Math.round(n.y()+dy)); return n; };
  /* words: display font for headlines, body font for the rest */
  t.text=function(str,o){ return CR.make.text(str,Object.assign({fontFamily:t.body,fontStyle:'800',fontSize:40,fill:C.ink},o||{})); };
  t.head=function(str,o){ return CR.make.text(str,Object.assign({fontFamily:t.display,fontStyle:'normal',fontSize:150,fill:C.ink,lineHeight:1.1,label:'Headline'},o||{})); };
  /* a brand picture (logo, can cut-outs) by width, placed like t.add */
  t.asset=async function(f,id,w,at,o){ const a=L.brandAssets().find(x=>x.id===id); if(!a) return null; const im=await BD.getImg('brand:'+id); if(!im) return null;
    const h=Math.round(im.h*w/im.w), n=BD.make.image('brand:'+id,Math.round(w),h,'asset'); n.setAttrs(Object.assign({label:a.label},o||{})); t.add(f,n,at); BD.applyFx(n); return n; };
  /* the logo (light=true: white, for dark backgrounds) */
  t.logo=async function(f,w,at,light){ const n=await t.asset(f,'logo',w,at); if(n&&light){ n.setAttr('fx',{invert:1}); BD.applyFx(n); } return n; };
  t.box=o=>CR.make.box(o); t.circle=o=>CR.make.circle(o); t.icon=(id,s,c,o)=>CR.make.icon(id,s,c,o);
  t.group=(label,kids)=>{ const g=CR.make.group(null,label); g.setAttr('el',undefined); (kids||[]).forEach(k=>k&&g.add(k)); return g; };
  return t;
}
CR.templateHelper=helper;

/* ---------- layouts ---------- */
const LAYOUTS={};
CR.LAYOUTS=LAYOUTS;

/* A saved Create document shipped in the brand kit (brand entry: doc:'<json path inside the brand folder>').
   Each frame in it is placed like t.frame does; pictures load by id, fonts are waited for. Works off-screen for previews. */
LAYOUTS['doc']=async function(t,w,def){
  const res=await fetch(L.assetUrl({file:def.doc})); if(!res.ok) throw new Error('template file '+def.doc);
  const doc=await res.json(), ids=new Set(), made=[];
  (doc.nodes||[]).forEach(o=>BD.collectImgs(o,ids));   // pictures (and text textures) first, so every layer is built with its picture
  await Promise.all([...ids].map(id=>BD.getImg(id)));
  const nodes=(doc.nodes||[]).map(o=>BD.rebuild(o,true));
  for(const f of nodes){
    let x=0,y=0; const last=t.frames[t.frames.length-1], fs=U.frames();
    if(last){ x=Math.round(last.x()+U.fsize(last).w+120); y=last.y(); }
    else if(t.at){ x=t.at.x; y=t.at.y; }
    else if(fs.length){ const r=U.unionRect(fs); x=Math.round(r.x+r.width+120); y=Math.round(r.y); }
    f.x(x); f.y(y); BD.main.add(f); t.frames.push(f); made.push(f);
  }
  made.forEach(f=>f.find('Image').forEach(n=>BD.applyFx(n)));
  const fams=new Set(); made.forEach(f=>f.find('Text').forEach(tx=>fams.add(tx.fontFamily()+'|'+tx.fontStyle())));
  await Promise.all([...fams].map(k=>{ const [fa,st]=k.split('|'); return BD.ensureFont(fa,st); }));
  made.forEach(f=>f.find('Text').forEach(tx=>{ if(tx._setTextData) tx._setTextData(); }));
  BD.main.batchDraw();
  return made; };

/* Headline, a small line, the product on a soft rounded panel, a pill with a pin, the logo.  (e.g. "Ice cold") */
LAYOUTS['hero-panel']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(w.head,{fontSize:170}),{cx:540,y:290});
  if(w.small) t.add(f,t.text(w.small,{fontSize:46,fill:C.muted,label:'Small line'}),{cx:540,y:520});
  t.add(f,t.el.panel(880,860,{fill:w.panel||C.panel,r:64}),{cx:540,y:640});
  await t.asset(f,(def.assets&&def.assets.product)||'cans-pair',720,{cx:540,cy:1080});
  if(w.pill) t.add(f,t.el.pill(w.pill,{icon:'pin',h:88,label:'Map in bio'}),{cx:540,y:1546});
  await t.logo(f,210,{cx:540,bottom:1720});
  return [f];
};

/* ---------- small shared helpers for the layouts below ---------- */
const AS=(def,k,fb)=>(def.assets&&def.assets[k])||fb;
const WD=(t,w,k)=>(w[k]!=null&&w[k]!==''?w[k]:t.write());
const START=t=>t.rtl?'right':'left';     // the reading-start side
/* a brand picture that fits inside maxW × maxH (keeps its shape), placed like t.add */
async function fit(t,f,id,maxW,maxH,at){ const im=await BD.getImg('brand:'+id); if(!im) return null;
  const k=Math.min(maxW/im.w,maxH/im.h); return t.asset(f,id,Math.round(im.w*k),at); }
/* a straight rounded line between two points of the frame */
function seg(f,x1,y1,x2,y2,color,wd){ const n=new Konva.Line({id:U.uid(),name:'obj',kind:'line',points:[x1,y1,x2,y2],stroke:color,strokeWidth:wd,lineCap:'round',hitStrokeWidth:30,label:'Line'}); f.add(n); return n; }
/* a paragraph of words with a set width */
function para(t,str,o){ return t.text(str,Object.assign({width:o.width,autoW:false,align:'center',wrap:'word'},o)); }
function hh(f,n){ return n.getClientRect({relativeTo:f,skipShadow:true}).height; }

/* "Did you know": a can on a card, three numbered lines. */
LAYOUTS['did-you-know']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper}), rtl=t.rtl;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const top=560, H=780, cw=380;
  t.add(f,t.el.panel(cw,H,{fill:w.panel||C.panel,r:64}),rtl?{x:72,y:top}:{right:1008,y:top});
  await fit(t,f,AS(def,'product','can-classic-shadow'),cw-70,H-100,{cx:rtl?72+cw/2:1008-cw/2,cy:top+H/2});
  const edge=rtl?1008:480, r=52, tw=300;
  for(let i=0;i<3;i++){ const cy=top+130+i*260;
    const n=t.el.numCircle(i+1,{r,size:62}); t.add(f,n,{cx:rtl?edge-r:edge+r,cy});
    const x=para(t,WD(t,w,'line'+(i+1)),{width:tw,fontSize:46,align:START(t),label:'Line '+(i+1)});
    t.add(f,x,{cy,[rtl?'right':'x']:rtl?edge-2*r-26:edge+2*r+26}); }
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:92,label:'Button'}),{cx:540,y:1480});
  await t.logo(f,210,{cx:540,bottom:1740});
  return [f];
};

/* "Your choice": two cards side by side, one flavour each. */
LAYOUTS['your-choice']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper}), fl=(t.B.flavours||[]).slice(0,2);
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const cw=440, gap=40, top=560, H=800, ids=[AS(def,'one','can-classic'),AS(def,'two','can-passion')];
  const order=t.rtl?[1,0]:[0,1];   // first flavour sits at the reading start
  for(let s=0;s<2;s++){ const i=order[s], x=(1080-cw*2-gap)/2+s*(cw+gap), cx=x+cw/2;
    t.add(f,t.el.panel(cw,H,{fill:w.panel||C.panel,r:64}),{x,y:top});
    t.add(f,t.text(fl[i]?fl[i].name:t.write(),{fontSize:56,label:'Flavour'}),{cx,y:top+50});
    await fit(t,f,ids[i],cw-90,H-230,{cx,cy:top+H/2+60}); }
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:92,label:'Button'}),{cx:540,y:1480});
  await t.logo(f,210,{cx:540,bottom:1740});
  return [f];
};

/* ---------- feed-post (1080×1350) versions of the three above: the same pieces, fitted to a 4:5 post.
   Shared shape: headline at the top, a card band 290–970, a pill at 1020, the logo at the bottom (like "Restock post"). ---------- */
const POST={top:290,H:680,pill:1020,logoW:190,logoB:1270};

/* "Ice cold" post: headline, a small line, the product on a soft panel, the map pill, the logo. */
LAYOUTS['hero-panel-post']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper}), small=!!w.small, top=small?350:POST.top, H=970-top;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:small?70:90});
  if(small) t.add(f,t.text(w.small,{fontSize:44,fill:C.muted,label:'Small line'}),{cx:540,y:262});
  t.add(f,t.el.panel(920,H,{fill:w.panel||C.panel,r:64}),{cx:540,y:top});
  await fit(t,f,AS(def,'product','cans-pair'),800,H-120,{cx:540,cy:top+H/2});
  if(w.pill) t.add(f,t.el.pill(w.pill,{icon:'pin',h:88,label:'Map in bio'}),{cx:540,y:POST.pill});
  await t.logo(f,POST.logoW,{cx:540,bottom:POST.logoB});
  return [f];
};

/* "Did you know" post: the can on a card at one side, three numbered lines at the other. */
LAYOUTS['did-you-know-post']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper}), rtl=t.rtl, {top,H}=POST, cw=340;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:90});
  t.add(f,t.el.panel(cw,H,{fill:w.panel||C.panel,r:64}),rtl?{x:72,y:top}:{right:1008,y:top});
  await fit(t,f,AS(def,'product','can-classic-shadow'),cw-70,H-90,{cx:rtl?72+cw/2:1008-cw/2,cy:top+H/2});
  const edge=rtl?1008:440, r=48, tw=320;
  for(let i=0;i<3;i++){ const cy=top+110+i*230;
    t.add(f,t.el.numCircle(i+1,{r,size:56}),{cx:rtl?edge-r:edge+r,cy});
    const x=para(t,WD(t,w,'line'+(i+1)),{width:tw,fontSize:46,align:START(t),label:'Line '+(i+1)});
    t.add(f,x,{cy,[rtl?'right':'x']:rtl?edge-2*r-24:edge+2*r+24}); }
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:88,label:'Button'}),{cx:540,y:POST.pill});
  await t.logo(f,POST.logoW,{cx:540,bottom:POST.logoB});
  return [f];
};

/* "Your choice" post: two cards side by side, one flavour each, a pill to tag a friend. */
LAYOUTS['your-choice-post']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper}), fl=(t.B.flavours||[]).slice(0,2);
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:90});
  const cw=440, gap=40, {top,H}=POST, ids=[AS(def,'one','can-classic'),AS(def,'two','can-passion')];
  const order=t.rtl?[1,0]:[0,1];   // first flavour sits at the reading start
  for(let s=0;s<2;s++){ const i=order[s], x=(1080-cw*2-gap)/2+s*(cw+gap), cx=x+cw/2;
    t.add(f,t.el.panel(cw,H,{fill:w.panel||C.panel,r:64}),{x,y:top});
    t.add(f,t.text(fl[i]?fl[i].name:t.write(),{fontSize:52,label:'Flavour'}),{cx,y:top+40});
    await fit(t,f,ids[i],cw-100,H-190,{cx,cy:top+H/2+50}); }
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:88,label:'Button'}),{cx:540,y:POST.pill});
  await t.logo(f,POST.logoW,{cx:540,bottom:POST.logoB});
  return [f];
};

/* "Chat": a late-night chat with a friend, three slides. */
LAYOUTS['chat']=async function(t,w,def){
  const C=t.C, rtl=t.rtl, W=1080, H=1350, M=64;
  const frames=[t.frame(W,H,{label:def.label+' 1',fill:w.bg||C.paper}),t.frame(W,H,{label:def.label+' 2',fill:w.bg||C.paper}),t.frame(W,H,{label:def.label+' 3',fill:w.bg||C.paper})];
  const msg=(n)=>Array(n).fill(t.write()).join(' ');
  /* mine = the owner's messages; in this reading direction they sit opposite the friend's */
  const put=(f,g,mine,y)=>{ const left=(mine===rtl); t.add(f,g,left?{x:M,y}:{right:W-M,y}); return y+hh(f,g)+22; };
  async function header(f){
    const s=rtl?W-M:M, dir=rtl?-1:1;
    t.add(f,t.icon(rtl?'arrow-right':'arrow-left',52,C.ink,{strokeWidth:2.4}),{cx:s,cy:130});
    const ac=s+dir*112; f.add(t.circle({r:54,x:ac,y:130,fill:C.panel,label:'Avatar'}));
    await t.logo(f,64,{cx:ac,cy:130});
    const nm=t.text(WD(t,w,'name'),{fontSize:48,label:'Name',align:rtl?'right':'left'}); const sub=t.text(WD(t,w,'status'),{fontSize:32,fill:C.grey,fontStyle:'600',label:'Last seen',align:rtl?'right':'left'});
    const tx=ac+dir*(54+28); t.add(f,nm,rtl?{right:tx,y:84}:{x:tx,y:84}); t.add(f,sub,rtl?{right:tx,y:140}:{x:tx,y:140});
    f.add(CR.el.divider(W-M*2,{color:C.bubble,width:3})); const dv=f.getChildren().slice(-1)[0]; dv.position({x:M,y:210}); }
  const stamp=(f,y)=>t.add(f,t.text(t.num('9:41'),{fontSize:34,fill:C.grey,fontStyle:'600',label:'Time'}),{cx:W/2,y});
  const dots=(f,i)=>t.add(f,t.el.dots(3,i),{cx:W/2,bottom:H-56});
  // page 1
  let f=frames[0], y=260; await header(f); stamp(f,y); y+=84;
  y=put(f,t.el.bubble(msg(1),{}),false,y); y=put(f,t.el.bubble(msg(3),{side:'end'}),true,y);
  y=put(f,t.el.bubble(msg(2),{}),false,y); y=put(f,t.el.bubble(msg(1),{side:'end'}),true,y);
  y=put(f,t.el.bubble(msg(4),{}),false,y); dots(f,0);
  // page 2
  f=frames[1]; y=260; await header(f);
  y=put(f,t.el.bubble(msg(2),{side:'end'}),true,y);
  const pw=500, ph=540, ph1=t.el.panel(pw,ph,{fill:C.panel,r:46}); const pg=t.group('Photo bubble',[ph1]);
  t.add(f,pg,(true===rtl)?{x:M,y}:{right:W-M,y});
  await fit(t,f,AS(def,'photo','cans-pair'),pw-80,ph-80,{cx:(true===rtl)?M+pw/2:W-M-pw/2,cy:y+ph/2});
  y+=ph+22; y=put(f,t.el.bubble(msg(2),{}),false,y); t.add(f,t.el.typing(),(false===rtl)?{x:M,y}:{right:W-M,y}); dots(f,1);
  // page 3
  f=frames[2]; y=260; await header(f);
  y=put(f,t.el.bubble(msg(2),{}),false,y); y=put(f,t.el.bubble(msg(3),{side:'end'}),true,y); y=put(f,t.el.bubble(msg(1),{}),false,y);
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:92,label:'Button'}),{cx:W/2,y:y+50});
  await t.logo(f,170,{cx:W/2,bottom:H-110}); dots(f,2);
  return frames;
};

/* "Bingo": a 4×4 grid of soft cells. */
LAYOUTS['bingo']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.cream});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:130}),{cx:540,y:70});
  const cell=214, gap=14, gw=cell*4+gap*3, x0=(1080-gw)/2, y0=270, mark=5;
  for(let r=0;r<4;r++) for(let c=0;c<4;c++){ const x=x0+c*(cell+gap), y=y0+r*(cell+gap), i=r*4+c;
    t.add(f,t.box({width:cell,height:cell,cornerRadius:34,fill:w.cell||C.blob,label:'Cell '+(i+1)}),{x,y});
    if(i===mark) await fit(t,f,AS(def,'product','can-classic'),cell-60,cell-36,{cx:x+cell/2,cy:y+cell/2});
    else t.add(f,para(t,t.write(),{width:cell-30,fontSize:32,label:'Cell text'}),{cx:x+cell/2,cy:y+cell/2}); }
  await t.logo(f,180,{cx:540,bottom:1300});
  return [f];
};

/* "Spot the difference": two cards, one above the other. */
LAYOUTS['spot']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const ph=430;
  for(let i=0;i<2;i++){ const y=520+i*(ph+36);
    t.add(f,t.el.panel(880,ph,{fill:w.panel||C.panel,r:64}),{cx:540,y});
    await fit(t,f,AS(def,'product','cans-pair'),600,ph-70,{cx:540,cy:y+ph/2}); }
  t.add(f,t.text(WD(t,w,'small'),{fontSize:46,fill:C.muted,label:'Small line'}),{cx:540,y:1500});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "Tic-tac-toe": big grid, a can in each played cell. */
LAYOUTS['tictactoe']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1080,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:120}),{cx:540,y:44});
  const s=810, cell=s/3, x0=(1080-s)/2, y0=222;
  for(let i=1;i<3;i++){ seg(f,x0+i*cell,y0+14,x0+i*cell,y0+s-14,C.ink,16); seg(f,x0+14,y0+i*cell,x0+s-14,y0+i*cell,C.ink,16); }
  const played=[[0,0,'x'],[1,0,'o'],[1,1,'x'],[2,0,'o'],[2,2,'x']];
  for(const [r,c,m] of played){ await fit(t,f,m==='x'?AS(def,'x','can-classic'):AS(def,'o','can-passion'),cell*.52,cell*.78,{cx:x0+(c+.5)*cell,cy:y0+(r+.5)*cell}); }
  return [f];
};

/* "Rate 1–10": a can and two rows of number circles. */
LAYOUTS['rate']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  t.add(f,t.el.panel(880,560,{fill:w.panel||C.panel,r:64}),{cx:540,y:520});
  await fit(t,f,AS(def,'product','can-classic-shadow'),500,470,{cx:540,cy:800});
  const sel=w.selected||8;
  for(let r=0;r<2;r++){ const items=[]; for(let i=1;i<=5;i++){ const n=r*5+i; const on=n===sel;
      items.push(t.el.numCircle(n,{r:62,bg:on?C.ink:C.panel,fg:on?C.paper:C.ink,size:n===10?58:70,label:'Rating '+n})); }
    t.add(f,t.el.row(items,{gap:26,label:'Ratings'}),{cx:540,y:1150+r*160}); }
  t.add(f,t.text(WD(t,w,'small'),{fontSize:46,fill:C.muted,label:'Small line'}),{cx:540,y:1500});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "Mood grid": four photo spots, numbered. */
LAYOUTS['mood']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper}), rtl=t.rtl;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:130}),{cx:540,y:64});
  const sw=448, sh=360, gx=40;
  for(let i=0;i<4;i++){ const col=i%2, row=Math.floor(i/2), x=(col===0)===rtl?560:72, y=250+row*450;
    t.add(f,t.el.slot(sw,sh,{r:44}),{x,y});
    t.add(f,t.el.numCircle(i+1,{r:40,size:48}),{cx:rtl?x+sw-52:x+52,cy:y+52});
    t.add(f,t.text(t.write(),{fontSize:42,label:'Caption'}),{cx:x+sw/2,y:y+sh+18}); }
  await t.logo(f,170,{cx:540,bottom:1296});
  return [f];
};

/* "Equation": photo + photo + photo = the can. */
LAYOUTS['equation']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const s=230, gap=84, x0=(1080-(s*3+gap*2))/2, cy=640;
  for(let i=0;i<3;i++){ t.add(f,t.el.slot(s,s,{r:40}),{x:x0+i*(s+gap),cy});
    if(i<2){ const px=x0+s*(i+1)+gap*i+gap/2;
      t.add(f,t.box({width:46,height:10,cornerRadius:5,fill:C.ink,label:'Plus'}),{cx:px,cy});
      t.add(f,t.box({width:10,height:46,cornerRadius:5,fill:C.ink,label:'Plus'}),{cx:px,cy}); } }
  t.add(f,t.box({width:96,height:14,cornerRadius:7,fill:C.ink,label:'Equals'}),{cx:540,cy:858});
  t.add(f,t.box({width:96,height:14,cornerRadius:7,fill:C.ink,label:'Equals'}),{cx:540,cy:896});
  t.add(f,t.el.panel(880,520,{fill:w.panel||C.panel,r:64}),{cx:540,y:970});
  await fit(t,f,AS(def,'product','can-passion-shadow'),420,440,{cx:540,cy:1230});
  t.add(f,t.text(WD(t,w,'small'),{fontSize:46,fill:C.muted,label:'Small line'}),{cx:540,y:1520});
  return [f];
};

/* "Lockscreen": a dark phone screen with notification cards. */
LAYOUTS['lockscreen']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.ink}), rtl=t.rtl;
  t.add(f,t.icon('lock',84,'#FFFFFF',{strokeWidth:2}),{cx:540,y:270});
  t.add(f,t.head(t.num('9:41'),{fontSize:270,fill:'#FFFFFF',label:'Time'}),{cx:540,y:390});
  let d=w.date; if(!d){ try{ d=new Date().toLocaleDateString(t.B.locale||undefined,{weekday:'long',day:'numeric',month:'long'}); d=t.num(d); }catch(_){ d=t.write(); } }
  t.add(f,t.text(d,{fontSize:50,fill:'#FFFFFF',opacity:.85,label:'Date'}),{cx:540,y:700});
  const cw=920, ch=180, x0=80, ids=3;
  for(let i=0;i<ids;i++){ const y=850+i*(ch+30);
    t.add(f,t.box({width:cw,height:ch,cornerRadius:48,fill:'#FFFFFF',opacity:.92,label:'Notification'}),{x:x0,y});
    const bx=rtl?x0+cw-30-52:x0+30+52;
    f.add(t.circle({r:52,x:bx,y:y+ch/2,fill:C.panel,label:'Badge'})); await t.logo(f,72,{cx:bx,cy:y+ch/2});
    const edge=rtl?bx-52-26:bx+52+26, al=rtl?'right':'left';
    t.add(f,t.text(t.B.name||t.write(),{fontSize:42,align:al,label:'Title'}),rtl?{right:edge,y:y+34}:{x:edge,y:y+34});
    t.add(f,t.text(t.write(),{fontSize:38,fontStyle:'600',fill:C.muted,align:al,label:'Message'}),rtl?{right:edge,y:y+96}:{x:edge,y:y+96});
    t.add(f,t.text(t.num('9:4'+i),{fontSize:30,fill:C.grey,fontStyle:'600',label:'Time'}),rtl?{x:x0+34,y:y+38}:{right:x0+cw-34,y:y+38}); }
  await t.logo(f,200,{cx:540,bottom:1740},true);
  return [f];
};

/* a battery drawn from boxes: outline, cap and an inner bar (level 0–1) */
function battery(t,f,cx,top,bw,bh,level,color){ const C=t.C, sw=14, pad=24;
  t.add(f,t.box({width:130,height:44,cornerRadius:14,fill:C.ink,label:'Battery cap'}),{cx,y:top});
  const y=top+36; f.add(t.box({x:cx-bw/2,y,width:bw,height:bh,cornerRadius:70,stroke:C.ink,strokeWidth:sw,fill:C.paper,label:'Battery'}));
  const ih=Math.round((bh-pad*2-sw)*level), iw=bw-pad*2-sw;
  f.add(t.box({x:cx-iw/2,y:y+bh-pad-sw/2-ih,width:iw,height:ih,cornerRadius:46,fill:color,label:'Charge'})); }
LAYOUTS['battery']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper}), rtl=t.rtl;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const bw=290, bh=440, top=540, a=rtl?790:290, b=rtl?290:790;   // first (low) sits at the reading start
  battery(t,f,a,top,bw,bh,.15,C.berry); battery(t,f,b,top,bw,bh,1,C.ink);
  t.add(f,t.head(t.num('10%'),{fontSize:100,fill:C.berry,label:'Low'}),{cx:a,y:top+bh+70});
  t.add(f,t.head(t.num('100%'),{fontSize:100,label:'Full'}),{cx:b,y:top+bh+70});
  t.add(f,t.icon(rtl?'arrow-left':'arrow-right',110,C.ink,{strokeWidth:2.2}),{cx:540,cy:top+36+bh/2});
  await fit(t,f,AS(def,'product','can-classic-shadow'),300,330,{cx:540,cy:1340});
  t.add(f,t.text(WD(t,w,'small'),{fontSize:48,fill:C.muted,label:'Small line'}),{cx:540,y:1540});
  await t.logo(f,190,{cx:540,bottom:1740});
  return [f];
};

/* "Offer": number tiles, dates, the product, a button. */
LAYOUTS['offer']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const tiles=(w.tiles||['20%','×3','50%']).map(s=>t.el.tile('',t.num(s),{minW:270,size:104,pad:30}));
  t.add(f,t.el.row(tiles,{gap:24,label:'Offers'}),{cx:540,y:540});
  t.add(f,t.text(t.dateLine(),{fontSize:44,fill:C.muted,label:'Dates'}),{cx:540,y:830});
  await fit(t,f,AS(def,'product','cans-pair-shadow'),760,520,{cx:540,cy:1190});
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:92,label:'Button'}),{cx:540,y:1500});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "How to order": three icon rows. */
LAYOUTS['order-steps']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper}), rtl=t.rtl;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  const rows=[['dm',WD(t,w,'step1')],['whatsapp',t.num(w.phone||'0000 0000')],['truck',WD(t,w,'step3')]];
  const x0=130, x1=950, r=62;
  rows.forEach(([ic,str],i)=>{ const cy=620+i*190;
    t.add(f,t.el.badge(ic,{r}),{cx:rtl?x1-r:x0+r,cy});
    const e=rtl?x1-2*r-34:x0+2*r+34;
    t.add(f,t.text(str,{fontSize:56,align:START(t),label:'Step '+(i+1)}),rtl?{right:e,cy}:{x:e,cy}); });
  await fit(t,f,AS(def,'product','cans-pair-shadow'),620,420,{cx:540,cy:1330});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "One word": a single big word on a soft shape. */
LAYOUTS['one-word']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.cream});
  t.add(f,t.el.blob(940,780,{fill:w.blob||C.blob}),{cx:540,cy:880});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:340,fill:C.ink}),{cx:540,cy:880});
  t.add(f,t.text(WD(t,w,'small'),{fontSize:50,fill:C.brown,label:'Small line'}),{cx:540,y:1320});
  await t.logo(f,210,{cx:540,bottom:1740});
  return [f];
};

/* "Restock": back in stock. */
LAYOUTS['restock']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  t.add(f,t.text(WD(t,w,'small'),{fontSize:46,fill:C.muted,label:'Small line'}),{cx:540,y:520});
  t.add(f,t.el.panel(880,780,{fill:w.panel||C.panel,r:64}),{cx:540,y:620});
  await fit(t,f,AS(def,'product','cans-pair-shadow'),720,520,{cx:540,cy:930});
  const fp=t.el.flavourPills({h:72}); if(fp) t.add(f,fp,{cx:540,y:1230});
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:92,label:'Button'}),{cx:540,y:1480});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "New place": a photo, the place with a pin, the map button. */
LAYOUTS['new-place']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:290});
  t.add(f,t.el.slot(880,780,{r:64}),{cx:540,y:490});
  t.add(f,t.el.iconLine(WD(t,w,'place'),{icon:'pin',size:54,label:'Place'}),{cx:540,y:1330});
  t.add(f,t.el.pill(WD(t,w,'pill'),{icon:'pin',h:92,label:'Map in bio'}),{cx:540,y:1470});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "Stock alert": a can and a bar that is nearly full. */
LAYOUTS['stock-alert']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper}), rtl=t.rtl;
  t.add(f,t.head(WD(t,w,'head'),{fontSize:160}),{cx:540,y:290});
  t.add(f,t.el.panel(880,740,{fill:w.panel||C.panel,r:64}),{cx:540,y:520});
  await fit(t,f,AS(def,'product','can-classic-shadow'),460,620,{cx:540,cy:890});
  const bw=760, bh=56, x=(1080-bw)/2, y=1330, lv=w.level||.8;
  t.add(f,t.box({width:bw,height:bh,cornerRadius:bh/2,fill:C.panel,label:'Stock track'}),{x,y});
  t.add(f,t.box({width:Math.round(bw*lv),height:bh,cornerRadius:bh/2,fill:C.ink,label:'Stock level'}),rtl?{right:x+bw,y}:{x,y});
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:92,label:'Button'}),{cx:540,y:1470});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "Highlight cover": a round cover with one big icon or emoji (the frame is round). Tap the icon, then Swap, for an emoji. */
LAYOUTS['highlight']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1080,{label:def.label,fill:w.bg||C.paper}); f.setAttr('round',1);
  f.add(t.circle({r:500,x:540,y:540,fill:w.panel||C.panel,label:'Circle'}));
  /* emoji: an emoji id from tools/highlight-emoji.js (1.31.0); otherwise one icon */
  let n=null; if(def.emoji&&CR.makeSticker){ await CR.stickersReady(); n=CR.makeSticker('sticker:emoji-'+def.emoji,560); }
  if(!n){ const id=def.icon||'pin'; n=id==='pin'?t.icon('pin-fill',520,C.ink):t.icon(id,500,C.ink,{strokeWidth:1.5}); }
  t.add(f,n,{cx:540,cy:540});
  return [f];
};

/* ---------- feed-post and story layouts added for the Templates library ---------- */
/* a flavour (from the brand kit) as a pill in its own colours */
const flavourPill=(t,fl,h)=>fl?t.el.pill(fl.name,{bg:fl.bg,fg:fl.fg,h:h||80,label:'Flavour'}):null;
/* two soft cards side by side, one can each (the first flavour sits at the reading start).
   o: top, H (card height), canH (biggest can), canY (can centre, from the card's top), name (flavour pill under the can), mark (1 / 2 circle) */
async function twoCards(t,f,def,o){ const C=t.C, fl=(t.B.flavours||[]).slice(0,2), cw=o.cw||440, gap=o.gap||40, x0=(1080-cw*2-gap)/2, order=t.rtl?[1,0]:[0,1];
  const ids=[AS(def,'one',(fl[0]&&fl[0].can)||'can-classic-shadow'),AS(def,'two',(fl[1]&&fl[1].can)||'can-passion-shadow')];
  for(let s=0;s<2;s++){ const i=order[s], x=x0+s*(cw+gap), cx=x+cw/2;
    t.add(f,t.el.panel(cw,o.H,{fill:o.fill||C.panel,r:64}),{x,y:o.top});
    await fit(t,f,ids[i],cw-60,o.canH,{cx,cy:o.top+o.canY});
    if(o.name){ const p=flavourPill(t,fl[i],84); if(p) t.add(f,p,{cx,bottom:o.top+o.H-56}); }
    if(o.mark){ const n=t.el.numCircle(i+1,{r:40,size:48}); t.add(f,n,{cx:t.rtl?x+cw-62:x+62,cy:o.top+62}); } } }

/* "Restock post": a feed post, back in stock. */
LAYOUTS['restock-post']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:90});
  t.add(f,t.el.panel(920,680,{fill:w.panel||C.panel,r:64}),{cx:540,y:290});
  await fit(t,f,AS(def,'product','cans-pair-shadow'),800,520,{cx:540,cy:630});
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:88,label:'Button'}),{cx:540,y:1020});
  await t.logo(f,190,{cx:540,bottom:1270});
  return [f];
};

/* "Both flavours": a story with two cards, one can and its flavour name each. */
LAYOUTS['both-flavours']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:290});
  await twoCards(t,f,def,{top:560,H:940,canH:660,canY:430,name:true,fill:w.panel});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* "This or that": a feed post with two cards and a pill to tag a friend. */
LAYOUTS['this-or-that']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:90});
  await twoCards(t,f,def,{top:290,H:680,canH:560,canY:340,mark:true,fill:w.panel});
  t.add(f,t.el.pill(WD(t,w,'pill'),{h:88,label:'Button'}),{cx:540,y:1020});
  await t.logo(f,190,{cx:540,bottom:1270});
  return [f];
};

/* "One word post": one big word on a soft shape, cream look. */
LAYOUTS['one-word-post']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.cream});
  t.add(f,t.el.blob(900,720,{fill:w.blob||C.blob}),{cx:540,cy:610});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:340,fill:C.ink}),{cx:540,cy:630});
  await t.logo(f,200,{cx:540,bottom:1270});
  return [f];
};

/* "Map in bio post": a pin on a soft card, the map button. */
LAYOUTS['map-post']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1350,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{cx:540,y:90});
  t.add(f,t.el.panel(920,680,{fill:w.panel||C.panel,r:64}),{cx:540,y:290});
  f.add(t.circle({r:290,x:540,y:630,fill:C.paper,opacity:.55,label:'Ring'}));
  f.add(t.circle({r:190,x:540,y:630,fill:C.paper,label:'Disc'}));
  t.add(f,t.icon('pin-fill',340,C.ink),{cx:540,cy:630});
  t.add(f,t.el.pill(WD(t,w,'pill'),{icon:'pin',h:88,label:'Map in bio'}),{cx:540,y:1020});
  await t.logo(f,190,{cx:540,bottom:1270});
  return [f];
};

/* "Good morning": a small line, the can on a card with a soft sun behind it. */
LAYOUTS['good-morning']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1920,{label:def.label,fill:w.bg||C.paper});
  t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:290});
  t.add(f,t.text(WD(t,w,'small'),{fontSize:46,fill:C.muted,label:'Small line'}),{cx:540,y:520});
  t.add(f,t.el.panel(880,900,{fill:w.panel||C.panel,r:64}),{cx:540,y:620});
  f.add(t.circle({r:330,x:540,y:1070,fill:C.paper,label:'Sun'}));
  await fit(t,f,AS(def,'product','can-classic-shadow'),460,700,{cx:540,cy:1070});
  await t.logo(f,200,{cx:540,bottom:1740});
  return [f];
};

/* ---------- feed layouts (1.42.0): cover, closeup, one-of-many, podium, type-photo; each as a post (1080×1350) and a story (1080×1920) ---------- */
const LATIN=t=>(t.B.fonts&&t.B.fonts.latin)||t.display;
const GROUND=2717/2994;   // the ground line of a "+ shadow" can cut-out, as a share of its height
/* a brand picture by height (keeps its shape), placed like t.add */
async function byH(t,f,id,h,at,o){ const im=await BD.getImg('brand:'+id); if(!im) return null; return t.asset(f,id,Math.round(h*im.w/im.h),at,o); }
/* a "+ shadow" can by height, standing with its ground line on `base`, centred on cx */
const onBase=(t,f,id,h,cx,base,o)=>byH(t,f,id,h,{cx,y:Math.round(base-h*GROUND)},o);
const ruleLine=(f,x1,y,x2,color,wd,label)=>{ const n=seg(f,x1,y,x2,y,color,wd); n.setAttr('label',label||'Rule'); return n; };
const softShadow=(t,n)=>n.setAttrs({shadowEnabled:true,shadowOn:true,shadowColor:t.C.ink,shadowBlur:24,shadowOpacity:.55,shadowOffsetX:0,shadowOffsetY:0});
/* turn a picture about its own centre (top-left of the turned picture computed, so no offsets are stored) */
function turnAbout(n,cx,cy,deg){ const w=n.width(), h=n.height(), a=deg*Math.PI/180, c=Math.cos(a), s=Math.sin(a), px=w/2, py=h/2;
  n.rotation(deg); n.x(Math.round(cx-(px*c-py*s))); n.y(Math.round(cy-(px*s+py*c))); }
const pinFor=def=>def.size==='story'?'pin':undefined;   // story pills point to the map; post pills are plain buttons
/* layers that bleed out of the page on purpose (the frame clips them) are marked, so checks know it is by design */
function markBleed(f){ const S=U.fsize(f); U.items(f).forEach(n=>{ if(n.hasName('frame-bg')) return; const r=U.prect(n,f); if(r.x<-2||r.y<-2||r.x+r.width>S.w+2||r.y+r.height>S.h+2) n.setAttr('bleed',1); }); }
const frameFor=(t,w,def)=>t.frame(1080,def.size==='story'?1920:1350,{label:def.label,fill:w.bg||t.C.paper});

/* "Magazine cover": the can as the cover star, three numbered cover lines, a stamp, a footer row. */
LAYOUTS['cover']=async function(t,w,def){
  const C=t.C, st=def.size==='story', f=frameFor(t,w,def), lat=LATIN(t); await BD.ensureFont(lat,'');
  const P=st?{row:232,mast:282,h:1180,cx:297,base:1560,ly:560,step:210,lx:672,sx:470,sy:1200,ss:220,rule:1600}
           :{row:54,mast:100,h:1060,cx:300,base:1268,ly:370,step:190,lx:668,sx:470,sy:930,ss:210,rule:1270};
  t.add(f,t.text(w.kicker||t.write(),{fontFamily:lat,fontStyle:'normal',fontSize:30,label:'Kicker'}),{x:72,y:P.row});
  if(w.small) t.add(f,t.text(w.small,{fontSize:24,fill:C.muted,label:'Small line'}),{right:1008,y:P.row});
  await t.asset(f,'logo',936,{x:72,y:P.mast},{label:'Masthead'});
  await onBase(t,f,AS(def,'product','can-classic-shadow'),P.h,P.cx,P.base);
  for(let i=0;i<3;i++){ const y=P.ly+i*P.step;
    ruleLine(f,P.lx,y,1008,C.ink,3,'Cover line rule '+(i+1));
    t.add(f,t.text(String(i+1).padStart(2,'0'),{fontFamily:lat,fontStyle:'normal',fontSize:72,label:'Cover number '+(i+1)}),{x:P.lx,y:y+14});
    t.add(f,t.head(WD(t,w,'line'+(i+1)),{fontSize:56,label:'Cover line '+(i+1),align:'right'}),{right:1008,y:y+14}); }
  const sid=AS(def,'stamp'); if(sid){ const sn=await t.asset(f,sid,P.ss,{x:P.sx,y:P.sy},{label:'Stamp'}); if(sn) turnAbout(sn,P.sx+P.ss/2,P.sy+sn.height()/2,-12); }
  ruleLine(f,72,P.rule,1008,C.ink,3,'Footer rule');
  const h=(t.B.handle||'').replace(/^@/,'');
  if(h){ const g=t.el.iconLine(h,{icon:'instagram',size:30,color:C.ink,label:'Instagram handle'}); const tx=g.findOne(n=>n.getAttr('role')==='text'); if(tx){ tx.setAttr('fontFamily',lat); tx.setAttr('fontStyle','normal'); CR.layout(g,true); } t.add(f,g,{x:72,y:P.rule+14}); }
  if(w.foot) t.add(f,t.text(w.foot,{fontSize:26,label:'Footer line'}),{right:1008,y:P.rule+14});
  markBleed(f); return [f];
};

/* "Close-up": the can fills the frame and bleeds out of it; the headline sits over it. */
LAYOUTS['closeup']=async function(t,w,def){
  const C=t.C, st=def.size==='story', f=frameFor(t,w,def), pid=AS(def,'product','can-classic');
  if(!st){
    await byH(t,f,pid,2000,{x:-153,y:87});
    await t.logo(f,200,{x:72,y:64});
    if(w.small) t.add(f,t.text(w.small,{fontSize:32,fill:C.muted,label:'Small line'}),{right:1008,y:58});
    softShadow(t,t.add(f,t.head(WD(t,w,'head'),{fontSize:140,fill:C.paper}),{cx:540,y:368}));
  } else {
    await byH(t,f,pid,2700,{x:-395,y:-146});
    softShadow(t,t.add(f,t.head(WD(t,w,'head'),{fontSize:160,fill:C.paper}),{cx:540,y:288}));
    t.add(f,t.el.panel(1080,700,{fill:C.paper,r:64,label:'White sheet'}),{x:0,y:1330});
    const fl=(t.B.flavours||[]), fv=fl.find(x=>x.id===def.flavour)||fl[0]||{};
    const chip=t.el.pill(WD(t,w,'chip'),{bg:fv.bg,fg:fv.fg,size:32,h:70,label:'Flavour'}); t.add(f,chip,{right:1008,y:1386});
    const cr=chip.getClientRect({relativeTo:f,skipShadow:true});
    if(w.small) t.add(f,t.text(w.small,{fontSize:38,fontStyle:'600',fill:C.muted,label:'Small line'}),{right:Math.round(cr.x-18),cy:Math.round(cr.y+cr.height/2)});
    const pill=t.el.pill(WD(t,w,'pill'),{icon:pinFor(def),h:88,label:'Map in bio'}); t.add(f,pill,{right:1008,y:1460});
    const pr=pill.getClientRect({relativeTo:f,skipShadow:true});
    await t.logo(f,220,{x:72,cy:Math.round(pr.y+pr.height/2)});
  }
  markBleed(f); return [f];
};

/* the logo, headline and small line that open "One of many" and "Podium" */
async function topBlock(t,f,w,st,sz){ const C=t.C;
  if(!st){ await t.logo(f,211,{x:72,y:76});
    t.add(f,t.head(WD(t,w,'head'),{fontSize:150}),{right:1008,y:96});
    if(w.small) t.add(f,t.text(w.small,{fontSize:36,fill:C.muted,label:'Small line'}),{right:1004,y:292});
  } else { await t.logo(f,233,{cx:540,y:250});
    t.add(f,t.head(WD(t,w,'head'),{fontSize:sz||160}),{cx:540,y:sz?300:310});
    if(w.small) t.add(f,t.text(w.small,{fontSize:sz?42:40,fill:C.muted,label:'Small line'}),{cx:540,y:sz?500:508}); } }

/* "One of many": a grid of outline can icons; one real can on a soft panel takes four cells. */
LAYOUTS['one-of-many']=async function(t,w,def){
  const C=t.C, st=def.size==='story', f=frameFor(t,w,def), ox=100, oy=st?640:400, cell=280, gap=20, step=cell+gap;
  await topBlock(t,f,w,st);
  const iconId=AS(def,'icon','can-icon-outline'), hx=ox+step, hy=oy;
  const hero=(c,r)=>c>=1&&r<=1;
  for(let r=0;r<3;r++) for(let c=0;c<3;c++){ if(hero(c,r)) continue; const x=ox+c*step, y=oy+r*step;
    t.add(f,t.box({width:cell,height:cell,cornerRadius:30,stroke:C.soft,strokeWidth:3,label:'Grid cell'}),{x,y});
    await t.asset(f,iconId,154,{cx:x+cell/2,cy:y+cell/2},{opacity:.22,label:'Can icon'}); }
  t.add(f,t.el.panel(cell*2+gap,cell*2+gap,{r:36,label:'Hero panel'}),{x:hx,y:hy});
  const mid=AS(def,'mark'); if(mid) await t.asset(f,mid,100,{x:hx+cell*2+gap-130,y:hy+30},{label:'Mark'});
  await onBase(t,f,AS(def,'product','can-classic-shadow'),520,hx+(cell*2+gap)/2,hy+546);
  if(st&&w.pill) t.add(f,t.el.pill(w.pill,{icon:pinFor(def),h:88,label:'Map in bio'}),{cx:540,y:1556});
  return [f];
};

/* "Podium": the can stands on the first step of three. */
LAYOUTS['podium']=async function(t,w,def){
  const C=t.C, st=def.size==='story', H=st?1920:1350, f=frameFor(t,w,def), lat=LATIN(t); await BD.ensureFont(lat,'');
  await topBlock(t,f,w,st,st?170:0);
  if(st&&w.pill) t.add(f,t.el.pill(w.pill,{icon:pinFor(def),h:88,label:'Map in bio'}),{cx:540,y:580});
  const cw=st?420:400, sw=300, gap=10, x0=Math.round((1080-(cw+sw*2+gap*2))/2), ns=st?240:210;
  const tops=st?{l:1490,c:1360,r:1580}:{l:1080,c:960,r:1160};
  const blocks=[['l','2',x0,sw],['c','1',x0+sw+gap,cw],['r','3',x0+sw+gap+cw+gap,sw]];
  for(const [k,n,x,bw] of blocks){ const top=tops[k], first=k==='c';
    t.add(f,t.box({width:bw,height:H-top+40,cornerRadius:[28,28,0,0],fill:first?C.ink:C.panel,label:'Step '+n}),{x,y:top});
    t.add(f,t.text(n,{fontFamily:lat,fontStyle:'normal',fontSize:ns,fill:first?C.paper:C.soft,label:'Step number '+n}),{cx:x+bw/2,y:Math.round(top+ns*.12)}); }
  await onBase(t,f,AS(def,'product','can-classic-shadow'),st?760:660,540,tops.c);
  markBleed(f); return [f];
};

/* "Coffee type": big coffee-filled letters (a picture) with a headline and a button. */
LAYOUTS['type-photo']=async function(t,w,def){
  const C=t.C, st=def.size==='story', f=frameFor(t,w,def), tid=AS(def,'type');
  if(!st){ await t.logo(f,211,{x:72,y:76});
    t.add(f,t.head(WD(t,w,'head'),{fontSize:130}),{right:1008,y:90});
    if(tid) await t.asset(f,tid,1020,{cx:540,y:360},{label:'Coffee type'});
    if(w.small) t.add(f,t.text(w.small,{fontSize:38,fill:C.muted,label:'Small line'}),{cx:540,y:1104});
    if(w.pill) t.add(f,t.el.pill(w.pill,{icon:pinFor(def),h:88,label:'Button'}),{cx:540,y:1200});
  } else { await t.logo(f,233,{cx:540,y:250});
    if(tid) await t.asset(f,tid,980,{cx:540,y:470},{label:'Coffee type'});
    t.add(f,t.head(WD(t,w,'head'),{fontSize:170}),{cx:540,y:960});
    if(w.small) t.add(f,t.text(w.small,{fontSize:42,fill:C.muted,label:'Small line'}),{cx:540,y:1170});
    if(w.pill) t.add(f,t.el.pill(w.pill,{icon:pinFor(def),h:88,label:'Map in bio'}),{cx:540,y:1260}); }
  return [f];
};

/* ---------- building a template from the brand kit ---------- */
function brandTemplates(){ const B=BD.B||{}; return ((B.create&&B.create.templates)||[]).filter(d=>LAYOUTS[d.layout]); }
CR.templates=brandTemplates;
const SIZES={story:[1080,1920],post:[1080,1350],square:[1080,1080]};
CR.templateSize=d=>{ const s=SIZES[d.size||'story']||SIZES.story; return {w:s[0],h:s[1],pages:d.pages||1}; };
/* build one: makes its frame(s) to the right of the current ones (or at opt.at) and returns them */
CR.buildTemplate=async function(id,opt){ const def=brandTemplates().find(d=>d.id===id); if(!def) return [];
  await Promise.all([BD.ensureFont(BD.displayFont(),''),BD.ensureFont(BD.bodyFont(),'800'),BD.ensureFont(BD.bodyFont(),'600')]);
  const t=helper(opt), words=Object.assign({},def.words||{}); t.at=opt&&opt.at;
  const made=await LAYOUTS[def.layout](t,words,def);
  made.forEach(f=>{ f.setAttr('tpl',def.id); U.frameBg(f).moveToBottom(); });
  return made; };
})();
