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

/* "Highlight cover": a round cover with one big icon (the frame is round). */
LAYOUTS['highlight']=async function(t,w,def){
  const C=t.C, f=t.frame(1080,1080,{label:def.label,fill:w.bg||C.paper}); f.setAttr('round',1);
  f.add(t.circle({r:500,x:540,y:540,fill:w.panel||C.panel,label:'Circle'}));
  const id=def.icon||'pin', n=id==='pin'?t.icon('pin-fill',520,C.ink):t.icon(id,500,C.ink,{strokeWidth:1.5});
  t.add(f,n,{cx:540,cy:540});
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
  const t=helper(opt), words=Object.assign({},def.words||{});
  const made=await LAYOUTS[def.layout](t,words,def);
  made.forEach(f=>{ f.setAttr('tpl',def.id); U.frameBg(f).moveToBottom(); });
  return made; };
})();
