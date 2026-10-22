/* Create: the element library. Every element is built from normal Board layers (text, rounded boxes, circles, icons)
   inside one group, so it moves, sizes, turns, recolours, hides and ungroups like anything else.
   "Smart" groups (attr el) re-fit themselves when their words change: a pill grows with its text, a chat bubble wraps.
   Brand-agnostic: words, colours, fonts and pictures all come from the active brand kit. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util;
const CR=window.CR=window.CR||{};
const uid=()=>U.uid();

/* ---------- brand bits ---------- */
const B=()=>BD.B||{};
const C=()=>{ const c=(B().colors)||{}; return {ink:c.ink||'#161210',paper:c.paper||'#FFFFFF',muted:c.muted||'#5f5c57',grey:c.grey||'#6E6E6E',panel:c.panel||'#F3F3F1',cream:c.cream||'#F3EADC',
  brown:c.brown||'#7A563A',blob:c.blob||'#E5D5C0',accent:c.accent||'#D6B078',yellow:c.yellow||'#F6C040',berry:c.berry||'#BE2C5C',bubble:'#E9E9EB',soft:'#C9C9C9'}; };
const rtl=()=>B().dir==='rtl';
const ph=()=>B().phrases||{};
const write=()=>ph().write||'Text';
/* numbers in the brand's digits (e.g. ٠١٢٣٤٥٦٧٨٩ and ٪) */
function num(v){ const s=String(v); if(B().digits!=='arabic') return s; return s.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]).replace(/%/g,'٪'); }
function dateLine(from,days){ const a=from||new Date(), b=new Date(a.getTime()+(days==null?6:days)*864e5), loc=B().locale||undefined;
  try{ const f=new Intl.DateTimeFormat(loc,{day:'numeric',month:'long'}); const sm=a.getMonth()===b.getMonth(); const d=new Intl.DateTimeFormat(loc,{day:'numeric'});
    return sm?d.format(a)+' – '+f.format(b):f.format(a)+' – '+f.format(b); }catch(_){ return a.toDateString()+' – '+b.toDateString(); } }
CR.num=num; CR.dateLine=dateLine; CR.colors=C; CR.write=write;

/* ---------- icons: a small stroke set (24×24), plus the Board's own ---------- */
const PIN_FILL='M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88Zm0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32Z';
CR.ICONS=[
  ['instagram','M7 2H17A5 5 0 0 1 22 7V17A5 5 0 0 1 17 22H7A5 5 0 0 1 2 17V7A5 5 0 0 1 7 2Z M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12Z M17.5 6.5L17.6 6.5'],
  ['whatsapp','M3 21L4.65 16.2A9 9 0 1 1 7.8 19.4Z M9.2 8.2C9 11.6 12.4 15 15.8 14.8L16.6 13.4L14.6 12.4L13.6 13.3C12.3 12.8 11.2 11.7 10.7 10.4L11.6 9.4L10.6 7.4Z'],
  ['send','M22 2L11 13 M22 2L15 22L11 13L2 9Z'],
  ['battery','M3 7H18A1 1 0 0 1 19 8V16A1 1 0 0 1 18 17H3A1 1 0 0 1 2 16V8A1 1 0 0 1 3 7Z M22 11V13'],
  ['battery-low','M3 7H18A1 1 0 0 1 19 8V16A1 1 0 0 1 18 17H3A1 1 0 0 1 2 16V8A1 1 0 0 1 3 7Z M22 11V13 M5.5 10V14'],
  ['battery-full','M3 7H18A1 1 0 0 1 19 8V16A1 1 0 0 1 18 17H3A1 1 0 0 1 2 16V8A1 1 0 0 1 3 7Z M22 11V13 M5.5 10V14 M9 10V14 M12.5 10V14 M16 10V14'],
  ['arrow-left','M19 12H5M11 6L5 12L11 18'],
  ['dm','M21 11.5A8.5 8.5 0 0 1 8.4 19L3 21L5 15.6A8.5 8.5 0 1 1 21 11.5Z M8 13L11 10L13.5 12L16 9.5'],
  ['wifi','M2 8.8A15 15 0 0 1 22 8.8 M5 12.5A10 10 0 0 1 19 12.5 M8.5 16.1A5 5 0 0 1 15.5 16.1 M12 20L12.01 20'],
  ['signal','M4 20V16 M9 20V12 M14 20V8 M19 20V4'],
  ['lock','M5 11H19A1 1 0 0 1 20 12V20A1 1 0 0 1 19 21H5A1 1 0 0 1 4 20V12A1 1 0 0 1 5 11Z M8 11V7A4 4 0 0 1 16 7V11'],
  ['dots','M6 12L6.01 12 M12 12L12.01 12 M18 12L18.01 12']
].map(([id,d])=>({id,d}));
/* the set the plan asks for, first, then everything else the Board has */
CR.ICON_ORDER=['pin','instagram','whatsapp','chat','dm','send','clock','calendar','star','check','arrow-right','arrow-left','sparkles','snowflake','sun','heart','bolt','truck','store','phone','gift','tag','percent','battery-low','battery-full','bell','lock','wifi','signal','smile','fire','coffee','crown','thumb','map','user','camera','music'];
function iconDef(id){ return CR.ICONS.find(x=>x.id===id)||(BD.ICONS||[]).find(x=>x.id===id)||null; }
CR.iconDef=iconDef;
function allIcons(){ const seen=new Set(), out=[]; CR.ICON_ORDER.forEach(id=>{ const d=iconDef(id); if(d&&!seen.has(id)){ seen.add(id); out.push(d); } }); [...CR.ICONS,...(BD.ICONS||[])].forEach(d=>{ if(!seen.has(d.id)){ seen.add(d.id); out.push(d); } }); return out; }
CR.allIcons=allIcons;

/* ---------- building blocks (all are normal Board layers) ---------- */
function group(el,label,attrs){ return new Konva.Group(Object.assign({id:uid(),name:'obj',kind:'group',el,label},attrs||{})); }
function text(str,o){ o=o||{}; const n=BD.make.text(String(str),Object.assign({fontFamily:BD.bodyFont(),fontStyle:'800',fontSize:40,fill:C().ink,align:'center',lineHeight:1.2},o)); return n; }
function box(o){ return new Konva.Rect(Object.assign({id:uid(),name:'obj',kind:'rect'},o)); }
function circle(o){ const r=o.r||40; const n=new Konva.Ellipse(Object.assign({id:uid(),name:'obj',kind:'ellipse',radiusX:r,radiusY:r},o)); delete n.attrs.r; return n; }
function icon(id,size,color,o){ if(id==='pin-fill') return new Konva.Path(Object.assign({id:uid(),name:'obj',kind:'path',data:PIN_FILL,fill:color,scaleX:size/256,scaleY:size/256,strokeScaleEnabled:false,label:'Pin',iconId:'pin-fill'},o||{}));
  const d=iconDef(id); if(!d) return null; const n=BD.make.icon(d,size,color); n.setAttr('label',id.replace(/-/g,' ')); if(o) n.setAttrs(o); return n; }
CR.make={group,text,box,circle,icon};
const role=(g,r)=>g.getChildren(c=>c.getAttr('role')===r)[0]||null;
const kidsBy=(g,r)=>g.getChildren(c=>c.getAttr('role')===r);
/* the drawn size of a text (or any node) in its parent's units, before any turn */
function tsize(n){ const r=n.getClientRect({skipTransform:true,skipShadow:true}); return {w:r.width*Math.abs(n.scaleX()||1),h:r.height*Math.abs(n.scaleY()||1)}; }
function iconSize(n){ if(!n) return {w:0,h:0}; const r=n.getSelfRect(); const box=n.getAttr('iconId')==='pin-fill'?{w:176,h:224,ox:40,oy:16}:{w:24,h:24,ox:0,oy:0}; return {w:box.w*Math.abs(n.scaleX()),h:box.h*Math.abs(n.scaleY()),ox:box.ox*Math.abs(n.scaleX()),oy:box.oy*Math.abs(n.scaleY()),r}; }

/* ---------- smart layout: re-fit an element after its words change ---------- */
function keepCentre(g,fn){ const before=g.getClientRect({skipTransform:true}); fn(); const after=g.getClientRect({skipTransform:true});
  const dx=(before.x+before.width/2)-(after.x+after.width/2), dy=(before.y+before.height/2)-(after.y+after.height/2);
  if(Math.abs(dx)>.01||Math.abs(dy)>.01){ const t=g.getTransform().copy(), o=t.point({x:0,y:0}), p=t.point({x:dx,y:dy}); g.x(g.x()+p.x-o.x); g.y(g.y()+p.y-o.y); } }
/* pill: a rounded box around a line of words, with an optional icon on the reading-start side */
function layPill(g){ const bg=role(g,'bg'), t=role(g,'text'), ic=role(g,'icon'); if(!bg||!t) return;
  const h=g.getAttr('h')||76, pad=g.getAttr('padX')||44, gap=ic?Math.round(h*.16):0;
  t.width(undefined); t.setAttr('autoW',true); BD.prepText(t);
  const ts=tsize(t), is=ic?iconSize(ic):{w:0,h:0,ox:0,oy:0}, w=Math.round(ts.w+is.w+gap+pad*2);
  bg.setAttrs({x:0,y:0,width:w,height:h,cornerRadius:g.getAttr('r')!=null?g.getAttr('r'):h/2});
  const iconFirst=!rtl(), x0=pad;
  const tx=iconFirst?x0+is.w+gap:x0, ix=iconFirst?x0:x0+ts.w+gap;
  t.setAttrs({x:Math.round(tx),y:Math.round((h-ts.h)/2)});
  if(ic) ic.setAttrs({x:Math.round(ix-is.ox),y:Math.round((h-is.h)/2-is.oy)}); }
/* icon + words on one line, no box (place line with pin, Instagram handle) */
function layLine(g){ const t=role(g,'text'), ic=role(g,'icon'); if(!t) return; t.width(undefined); t.setAttr('autoW',true); BD.prepText(t);
  const ts=tsize(t), is=ic?iconSize(ic):{w:0,h:0,ox:0,oy:0}, gap=ic?Math.round(ts.h*.28):0, iconFirst=!rtl(), h=Math.max(ts.h,is.h);
  t.setAttrs({x:Math.round(iconFirst?is.w+gap:0),y:Math.round((h-ts.h)/2)});
  if(ic) ic.setAttrs({x:Math.round((iconFirst?0:ts.w+gap)-is.ox),y:Math.round((h-is.h)/2-is.oy)}); }
/* row: children side by side with a gap (flavour pills, number rows) */
function layRow(g){ const gap=g.getAttr('gap')||20; let x=0; const kids=g.getChildren(c=>c.visible()); const order=rtl()&&!g.getAttr('ltr')?kids.slice().reverse():kids;
  order.forEach(k=>{ if(k.getAttr('el')) layout(k,true); const r=k.getClientRect({relativeTo:g,skipShadow:true}); k.x(k.x()+x-r.x); x+=r.width+gap; });
  const H=Math.max(0,...kids.map(k=>k.getClientRect({relativeTo:g}).height)); kids.forEach(k=>{ const r=k.getClientRect({relativeTo:g}); k.y(k.y()+(H-r.height)/2-r.y); }); }
/* chat bubble: words wrap at a max width; the box hugs them */
function layBubble(g){ const bg=role(g,'bg'), t=role(g,'text'); if(!bg||!t) return; const max=g.getAttr('maxW')||620, px=g.getAttr('padX')||38, py=g.getAttr('padY')||26;
  t.width(undefined); t.setAttr('autoW',true); t.wrap('word'); BD.prepText(t); let ts=tsize(t);
  if(ts.w>max){ t.width(max); t.setAttr('autoW',false); ts=tsize(t); }
  const w=Math.round(ts.w+px*2), h=Math.round(ts.h+py*2), side=g.getAttr('side')||'start', r=g.getAttr('r')||46, tail=Math.round(r*.28);
  const right=(side==='end')!==rtl();   // where the little tail corner is
  bg.setAttrs({width:w,height:h,cornerRadius:right?[r,r,tail,r]:[r,r,r,tail]});
  /* the bubble stays pinned to its side of the screen */
  const old=g.getAttr('_w'); if(old!=null&&right) g.x(g.x()+(old-w)*g.scaleX());
  g.setAttr('_w',w);
  t.setAttrs({x:px,y:py}); t.align(rtl()?'right':'left'); if(!t.getAttr('autoW')) t.width(max); }
/* number circle: the digit stays centred */
function layNum(g){ const c=role(g,'bg'), t=role(g,'text'); if(!c||!t) return; t.width(undefined); t.setAttr('autoW',true); BD.prepText(t); const ts=tsize(t); t.setAttrs({x:Math.round(-ts.w/2),y:Math.round(-ts.h/2+ts.h*.04)}); }
/* icon on a round badge: the icon stays centred */
function layBadge(g){ const c=role(g,'bg'), ic=role(g,'icon'); if(!c||!ic) return; const is=iconSize(ic); ic.setAttrs({x:Math.round(-is.w/2-is.ox),y:Math.round(-is.h/2-is.oy)}); }
/* tile: small line on top, big number below, box hugs both */
function layTile(g){ const bg=role(g,'bg'), a=role(g,'small'), b=role(g,'text'); if(!bg||!b) return; const pad=g.getAttr('pad')||34, minW=g.getAttr('minW')||300;
  [a,b].forEach(t=>{ if(t){ t.width(undefined); t.setAttr('autoW',true); BD.prepText(t); } });
  const as=a&&a.visible()&&a.text().trim()?tsize(a):{w:0,h:0}, bs=tsize(b), gap=as.h?10:0, w=Math.round(Math.max(minW,as.w+pad*2,bs.w+pad*2)), h=Math.round(pad*1.2+as.h+gap+bs.h+pad*.9);
  bg.setAttrs({width:w,height:h}); if(a) a.setAttrs({x:Math.round((w-as.w)/2),y:Math.round(pad*1.1)}); b.setAttrs({x:Math.round((w-bs.w)/2),y:Math.round(pad*1.1+as.h+gap)}); }
const LAY={pill:layPill,line:layLine,row:layRow,bubble:layBubble,num:layNum,badge:layBadge,tile:layTile};
function layout(g,inner){ const f=g&&LAY[g.getAttr('el')]; if(!f) return; if(inner) f(g); else keepCentre(g,()=>f(g)); }
CR.layout=layout;
/* after any change, re-fit the smart groups (and the smart groups they sit in) */
function relayoutAll(root){ (root||BD.main).find(n=>!!n.getAttr('el')&&!!LAY[n.getAttr('el')]).reverse().forEach(g=>layout(g)); }
CR.relayoutAll=relayoutAll;
function relayoutAround(n){ let p=n; const list=[]; while(p&&p!==BD.main){ if(p.getAttr&&LAY[p.getAttr('el')]) list.push(p); p=p.getParent(); } list.forEach(g=>layout(g)); return list.length>0; }
CR.relayoutAround=relayoutAround;

/* ---------- the elements ---------- */
function pill(str,o){ o=o||{}; const c=C(), h=o.h||76, g=group('pill',o.label||'Button',{h,padX:o.padX||Math.round(h*.58)});
  g.add(box({role:'bg',fill:o.bg||c.ink,label:'Background'}));
  if(o.icon){ const sz=Math.round(h*.46); const ic=o.icon==='pin'?icon('pin-fill',sz,o.fg||c.paper):icon(o.icon,sz,o.fg||c.paper); if(ic){ ic.setAttr('role','icon'); if(o.icon!=='pin') ic.strokeWidth(2.2); g.add(ic); } }
  g.add(text(str,{role:'text',fontSize:o.size||Math.round(h*.46),fill:o.fg||c.paper,fontFamily:o.font||BD.bodyFont(),fontStyle:o.weight||'800',label:'Words'}));
  layPill(g); return g; }
function iconLine(str,o){ o=o||{}; const c=C(), size=o.size||44, g=group('line',o.label||'Line');
  const ic=o.icon==='pin'?icon('pin-fill',Math.round(size*.95),o.color||c.muted):icon(o.icon,Math.round(size*.95),o.color||c.ink); if(ic){ ic.setAttr('role','icon'); if(o.icon!=='pin') ic.strokeWidth(2.2); g.add(ic); }
  g.add(text(str,{role:'text',fontSize:size,fill:o.color||c.muted,label:'Words'})); layLine(g); return g; }
function row(items,o){ o=o||{}; const g=group('row',o.label||'Row',{gap:o.gap||20}); items.forEach(i=>i&&g.add(i)); layRow(g); return g; }
function bubble(str,o){ o=o||{}; const c=C(), mine=o.side==='end', g=group('bubble',o.label||(mine?'Bubble (you)':'Bubble'),{side:mine?'end':'start',maxW:o.maxW||620,r:o.r||46});
  g.add(box({role:'bg',fill:o.bg||(mine?c.ink:c.bubble),label:'Bubble'}));
  g.add(text(str,{role:'text',fontSize:o.size||42,fontStyle:'600',fill:o.fg||(mine?c.paper:c.ink),lineHeight:1.35,label:'Message'}));
  layBubble(g); return g; }
function numCircle(n,o){ o=o||{}; const c=C(), r=o.r||46, g=group('num',o.label||'Number');
  g.add(circle({role:'bg',r,fill:o.bg||c.ink,label:'Circle'})); g.add(text(num(n),{role:'text',fontFamily:BD.displayFont(),fontStyle:'normal',fontSize:o.size||Math.round(r*1.1),fill:o.fg||c.paper,label:'Number'})); layNum(g); return g; }
function badge(iconId,o){ o=o||{}; const c=C(), r=o.r||56, g=group('badge',o.label||'Round icon');
  g.add(circle({role:'bg',r,fill:o.bg||c.ink,label:'Circle'})); const ic=icon(iconId,Math.round(r*1.05),o.fg||c.paper); if(ic){ ic.setAttr('role','icon'); ic.strokeWidth(2); g.add(ic); } layBadge(g); return g; }
function tile(small,big,o){ o=o||{}; const c=C(), g=group('tile',o.label||'Offer tile',{pad:o.pad||34,minW:o.minW||300});
  g.add(box({role:'bg',fill:o.bg||c.ink,cornerRadius:o.r||44,label:'Tile'}));
  g.add(text(small||'',{role:'small',fontSize:o.smallSize||38,fill:o.fg2||c.accent,label:'Small words',visible:!!small}));
  g.add(text(big,{role:'text',fontFamily:BD.displayFont(),fontStyle:'normal',fontSize:o.size||140,fill:o.fg||c.paper,lineHeight:1,label:'Big number'})); layTile(g); return g; }
function dots(n,active,o){ o=o||{}; const c=C(), r=o.r||9, gap=o.gap||28, g=group('dots',o.label||'Page dots');
  for(let i=0;i<n;i++) g.add(circle({r:i===active?r*1.15:r,x:i*gap,y:0,fill:i===active?(o.on||c.ink):(o.off||c.soft),label:'Dot '+(i+1)})); return g; }
function typing(o){ o=o||{}; const c=C(), g=group('typing',o.label||'Typing…'); g.add(box({width:170,height:96,cornerRadius:[46,46,46,13],fill:o.bg||c.bubble,label:'Bubble'}));
  [0,1,2].forEach(i=>g.add(circle({r:11,x:50+i*35,y:48,fill:o.dot||'#8E8E93',opacity:[1,.7,.45][i],label:'Dot'}))); if(rtl()) g.getChildren()[0].cornerRadius([46,46,13,46]); return g; }
function slot(w,h,o){ o=o||{}; const c=C(), g=group('slot',o.label||'Photo spot',{slot:1,slotR:o.r||0,slotW:w,slotH:h});
  g.add(box({role:'bg',width:w,height:h,cornerRadius:o.r||0,fill:o.fill||c.panel,label:'Photo spot'}));
  const s=Math.round(Math.min(w,h)*.22); const ic=icon('camera',s,o.ink||c.grey,{x:Math.round(w/2-s/2),y:Math.round(h/2-s/2),opacity:.55,role:'mark'}); if(ic){ ic.strokeWidth(1.6); g.add(ic); }
  return g; }
function panel(w,h,o){ o=o||{}; return box({width:w,height:h,cornerRadius:o.r!=null?o.r:56,fill:o.fill||C().panel,label:o.label||'Panel'}); }
function blob(w,h,o){ o=o||{}; const d=(BD.SHAPES.find(s=>s.id==='blob')||{}).path; return new Konva.Path({id:uid(),name:'obj',kind:'path',data:d,fill:o.fill||C().blob,scaleX:w/100,scaleY:h/100,strokeScaleEnabled:false,label:o.label||'Blob'}); }
function divider(w,o){ o=o||{}; return new Konva.Line({id:uid(),name:'obj',kind:'line',points:[0,0,w,0],stroke:o.color||C().soft,strokeWidth:o.width||4,lineCap:'round',hitStrokeWidth:30,dash:o.dash||undefined,label:o.label||'Divider'}); }
function flavourPills(o){ o=o||{}; const fl=B().flavours||[]; if(!fl.length) return null; return row(fl.map(f=>pill(f.name,{bg:f.bg,fg:f.fg,h:o.h||72,label:'Flavour'})),{label:'Flavour pills',gap:o.gap||20}); }
CR.el={pill,iconLine,row,bubble,numCircle,badge,tile,dots,typing,slot,panel,blob,divider,flavourPills};

/* what the Elements tray offers (each makes a fresh layer; w = the frame width it's going into) */
CR.ELEMENTS=[
  {id:'button',label:'Button',make:()=>pill((ph().buttons||[])[0]||write())},
  {id:'bio',label:'Map in bio',make:()=>pill(ph().bio||(ph().buttons||[])[0]||write(),{icon:'pin',label:'Map in bio'})},
  {id:'place',label:'Place + pin',make:()=>iconLine(ph().placeName||write(),{icon:'pin',label:'Place + pin'})},
  {id:'handle',label:'Instagram handle',when:()=>!!B().handle,make:()=>iconLine(B().handle,{icon:'instagram',color:C().ink,size:42,label:'Instagram handle'})},
  {id:'flavours',label:'Flavour pills',when:()=>(B().flavours||[]).length>0,make:()=>flavourPills()},
  {id:'tile',label:'Offer tile',make:()=>tile('×'+num(3),num('20%'))},
  {id:'dates',label:'Dates line',make:()=>text(dateLine(),{fill:C().muted,label:'Dates line'})},
  {id:'small',label:'Small line',make:()=>text((ph().small||[])[0]||write(),{fontSize:38,fill:C().muted,label:'Small line'})},
  {id:'logo',label:'Logo',asset:'logo'},
  {id:'panel',label:'Rounded panel',make:w=>panel(Math.round(w*.8),Math.round(w*.8))},
  {id:'blob',label:'Blob',make:w=>blob(Math.round(w*.6),Math.round(w*.5))},
  {id:'slot',label:'Photo spot',make:w=>slot(Math.round(w*.7),Math.round(w*.7),{r:40})},
  {id:'bubble',label:'Chat bubble',make:()=>bubble(write())},
  {id:'bubble-me',label:'Chat bubble (you)',make:()=>bubble(write(),{side:'end'})},
  {id:'typing',label:'Typing dots',make:()=>typing()},
  {id:'num',label:'Number circle',make:()=>numCircle(1)},
  {id:'badge',label:'Round icon',make:()=>badge('chat')},
  {id:'dots',label:'Page dots',make:()=>dots(5,0)},
  {id:'divider',label:'Divider',make:w=>divider(Math.round(w*.6))},
  {id:'divider-dash',label:'Dashed divider',make:w=>divider(Math.round(w*.6),{dash:[2,22],width:8,color:C().ink,label:'Dotted divider'})}
];
CR.element=id=>CR.ELEMENTS.find(e=>e.id===id)||null;
/* make an element and put it in the frame you're working in */
CR.addElement=async function(id,at){ const e=CR.element(id); if(!e) return null;
  if(e.asset){ const a=L.brandAssets().find(x=>x.id===e.asset); if(!a) return null; return BD.addAsset(a,at); }
  await Promise.all([BD.ensureFont(BD.bodyFont(),'800'),BD.ensureFont(BD.bodyFont(),'600'),BD.ensureFont(BD.displayFont(),'')]);
  const f=at?BD.frameAt(at):BD.targetFrame(), w=f?U.fsize(f).w:1080; const n=e.make(w); if(!n) return null;
  /* elements are made for a 1080-wide design; smaller or bigger frames scale them */
  if(w!==1080&&!['panel','blob','slot','divider','divider-dash'].includes(id)){ const k=w/1080; n.scale({x:k,y:k}); }
  return BD.place(n,{frame:f,at}); };

/* ---------- photo spots: a photo dropped in takes the spot's place, size and corners ---------- */
CR.isSlot=n=>!!(n&&n.getAttr&&n.getAttr('slot'));
CR.fillSlot=async function(g,file){ if(!CR.isSlot(g)) return null; const id=await BD.addPhotoFile(file); return CR.fillSlotWith(g,id); };
CR.fillSlotWith=function(g,imgId){ const w=g.getAttr('slotW'), h=g.getAttr('slotH'), r=g.getAttr('slotR')||0;
  const n=BD.make.image(imgId,w,h); n.setAttrs({x:g.x(),y:g.y(),rotation:g.rotation(),scaleX:g.scaleX(),scaleY:g.scaleY(),cornerRadius:r,label:'Photo',fromSlot:{w,h,r,label:g.getAttr('label')}});
  const p=g.getParent(), z=g.zIndex(); p.add(n); n.zIndex(z); g.destroy(); BD.applyCrop(n); BD.applyFx(n); BD.select([n]); BD.changed(); BD.emitDoc(); return n; };
/* a photo that came from a spot can go back to an empty spot (used when saving a team template) */
CR.slotFromImage=function(n){ const s=n.getAttr('fromSlot')||{w:Math.round(n.width()),h:Math.round(n.height()),r:n.cornerRadius()||0};
  const g=slot(s.w,s.h,{r:s.r,label:s.label||'Photo spot'}); g.setAttrs({x:n.x(),y:n.y(),rotation:n.rotation(),scaleX:n.scaleX(),scaleY:n.scaleY()}); return g; };
CR.emptySlot=function(frame){ const fs=frame?[frame]:U.frames(); for(const f of fs){ const s=f.find(n=>CR.isSlot(n)&&n.visible())[0]; if(s) return s; } return null; };

/* ---------- previews of elements and icons for the trays (drawn once, kept) ---------- */
const PREV=new Map();
CR.preview=function(id){ if(PREV.has(id)) return PREV.get(id); const e=CR.element(id); if(!e||e.asset) return null;
  try{ const n=e.make(1080); const lay=new Konva.Layer(); lay.add(n); const r=n.getClientRect({skipShadow:true}); const k=Math.min(1,220/Math.max(r.width,1),110/Math.max(r.height,1));
    const url=n.toDataURL({x:r.x-4,y:r.y-4,width:r.width+8,height:r.height+8,pixelRatio:k*2}); lay.destroy(); PREV.set(id,url); return url; }catch(_){ return null; } };
})();
