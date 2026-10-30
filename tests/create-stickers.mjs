/* Create: stickers + emoji + text styles (1.31). Add sheet, on-demand loading, trace fidelity, Swap, emoji colour,
   highlight cover, saved format round trip, 2× export, text styles, dark theme, small phone, desktop. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const T0=Date.now();
const b=await chromium.launch(); const errs=[]; let fails=0, passes=0;
const ok=(n,c,i)=>{ if(c) passes++; else fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(tag+' '+m.text()); }); };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400); };
const mk=async(o,init)=>{ const ctx=await b.newContext(Object.assign({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'},o||{}));
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(init) await ctx.addInitScript(init.fn,init.arg);
  const pg=await ctx.newPage(); watch(pg,(o&&o.tag)||'phone'); return {ctx,pg}; };
const start=async(pg,sel,wait)=>{ await pg.goto(BASE+'tools/create.html'); await ready(pg); if(sel){ await pg.tap(sel); await pg.waitForTimeout(wait||600); } };
const tap=async(pg,s,w)=>{ await pg.tap(s); await pg.waitForTimeout(w||500); };
const openAdd=async pg=>{ await tap(pg,'#crBar [data-cr="add"]',700); };
const nLayers=pg=>pg.evaluate(()=>BD.activeFrame().getChildren(c=>BD.util.isObj(c)).length);
const rel=(pg)=>pg.evaluate(()=>{ const n=BD.S.sel[0], f=BD.activeFrame(), r=n.getClientRect({relativeTo:f,skipShadow:true}); return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}; });
const near=(a,b,t)=>Math.abs(a-b)<=t;

/* ---------- phone ---------- */
{ const {ctx,pg}=await mk(); await start(pg,'[data-size="story"]');
  /* 1 on-demand loading */
  const pre=await pg.evaluate(()=>({s:typeof window.STUDIO_STICKERS,h:typeof window.HL_EMOJI,tags:[...document.scripts].map(s=>s.getAttribute('src')||'').filter(x=>/(^|\/)(stickers|highlight-emoji)\.js/.test(x))}));
  ok('1a before Add: stickers + emoji data not loaded, no script tag',pre.s==='undefined'&&pre.h==='undefined'&&pre.tags.length===0,pre);
  const html=await (await ctx.request.get(BASE+'tools/create.html')).text();
  ok('1b create.html has no <script> for stickers.js / highlight-emoji.js',!/<script[^>]+[\/\"'](stickers|highlight-emoji)\.js/.test(html));
  await openAdd(pg); await pg.waitForFunction(()=>window.STUDIO_STICKERS&&window.HL_EMOJI,null,{timeout:8000}).catch(()=>{});
  ok('1c after opening Add they are loaded',await pg.evaluate(()=>!!window.STUDIO_STICKERS&&!!window.HL_EMOJI));
  /* 2 sheet contents */
  const sh=await pg.evaluate(()=>{ const q=s=>[...document.querySelectorAll(s)]; const tiles=q('#crStk button[data-sticker], #crEmo button[data-sticker]');
    return {stk:q('#crStk button[data-sticker]').length,drawn:CR.drawnStickers().length,emo:q('#crEmo button[data-sticker]').length,kbd:q('.cr-kbd button').length,comma:q('.cr-kbd button').some(x=>x.textContent.includes(',')),
      small:tiles.filter(t=>{ const r=t.getBoundingClientRect(); return r.width<44||r.height<44; }).length,svgs:tiles.filter(t=>t.querySelector('svg')).length,tiles:tiles.length}; });
  ok('2a sticker tiles === CR.drawnStickers() (14)',sh.stk===sh.drawn&&sh.drawn===14,sh);
  ok('2b 24 emoji tiles',sh.emo===24,sh);
  ok('2c phone emoji: one button each (>30), no commas',sh.kbd>30&&!sh.comma,sh);
  ok('2d every sticker/emoji tile >= 44x44 and has an svg',sh.small===0&&sh.svgs===sh.tiles,sh);
  await pg.tap('[data-j="stickers"]'); await pg.waitForTimeout(1200);
  const jd=await pg.evaluate(()=>{ const B=document.getElementById('crSheetB').getBoundingClientRect(), t=document.getElementById('j-stickers').getBoundingClientRect(); return {top:t.top-B.top,scroll:document.getElementById('crSheetB').scrollTop}; });
  ok('2e jump chip Stickers scrolls #j-stickers near the top',jd.scroll>100&&jd.top>=-30&&jd.top<=120,jd);
  /* 4 add heart */
  await tap(pg,'#crSheetX',300);
  const before=await nLayers(pg);
  await openAdd(pg); await tap(pg,'[data-sticker="sticker:heart"]',700);
  const h=await pg.evaluate(()=>{ const n=BD.S.sel[0], d=CR.drawnStickers().find(s=>s.id==='sticker:heart'); return n&&{cn:n.getClassName(),kind:BD.util.kind(n),sid:n.getAttr('stickerId'),want:CR.stickerSize('sticker:heart',1080),box:Math.max(d.w,d.h)*n.scaleX()}; });
  const hr=await rel(pg);
  ok('4a heart: one new layer, selected, Path/path/stickerId',(await nLayers(pg))===before+1&&h&&h.cn==='Path'&&h.kind==='path'&&h.sid==='sticker:heart',h);
  ok('4b heart centred on the page (+-3) and sized to CR.stickerSize (+-2%)',near(hr.cx,540,3)&&near(hr.cy,960,3)&&near(h.box,h.want,h.want*.02)&&Math.max(hr.w,hr.h)<=h.want*1.02&&Math.max(hr.w,hr.h)>=h.want*.5,[hr,h]);
  await openAdd(pg); await tap(pg,'[data-sticker="sticker:arrow-loop"]',700);
  const al=await pg.evaluate(()=>{ const n=BD.S.sel[0], d=CR.drawnStickers().find(s=>s.id==='sticker:arrow-loop'); return {kind:BD.util.kind(n),sid:n.getAttr('stickerId'),stroke:n.stroke(),fill:n.fill(),want:CR.stickerSize('sticker:arrow-loop',1080),box:Math.max(d.w,d.h)*n.scaleX()}; });
  const ar=await rel(pg);
  ok('4c arrow-loop: kind icon, stroked, no fill',al.kind==='icon'&&al.sid==='sticker:arrow-loop'&&!!al.stroke&&!al.fill,al);
  ok('4d arrow-loop centred and sized',near(ar.cx,540,3)&&near(ar.cy,960,3)&&near(al.box,al.want,al.want*.02)&&Math.max(ar.w,ar.h)<=al.want*1.1&&Math.max(ar.w,ar.h)>=al.want*.5,[ar,al]);
  /* 5 trace fidelity */
  const tr=await pg.evaluate(()=>CR.drawnStickers().map(s=>{ const t=CR.traceSticker(s), W=Math.ceil(s.w*2+40), H=Math.ceil(s.h*2+40);
    const mkc=()=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.translate(20,20); x.scale(2,2); return [c,x]; };
    const [ca,xa]=mkc(), [cb,xb]=mkc(); s.draw(xa,'#000');
    const p=new Path2D(t.d); if(t.mode==='stroke'){ xb.lineWidth=t.lw; xb.lineCap='round'; xb.lineJoin='round'; xb.strokeStyle='#000'; xb.stroke(p); } else { xb.fillStyle='#000'; if(t.rule) xb.fill(p,t.rule); else xb.fill(p); }
    const A=ca.getContext('2d').getImageData(0,0,W,H).data, B=cb.getContext('2d').getImageData(0,0,W,H).data; let set=0,diff=0;
    for(let i=3;i<A.length;i+=4){ if(A[i]>0) set++; if(Math.abs(A[i]-B[i])>128) diff++; }
    return {id:s.id,mode:t.mode,set,diff,ratio:set?diff/set:1}; }));
  ok('5 trace fidelity: there are drawn stickers',tr.length>0&&tr.every(x=>x.set>0),tr.filter(x=>!x.set));
  for(const x of tr) ok('5 trace fidelity '+x.id+' ('+x.mode+')',x.ratio<0.015,{id:x.id,ratio:+x.ratio.toFixed(4),set:x.set,diff:x.diff});
  await ctx.close(); }

/* 3 handler leak */
{ const {ctx,pg}=await mk(); await start(pg,'[data-size="story"]');
  for(let i=0;i<3;i++){ await openAdd(pg); await tap(pg,'#crSheetX',300); }
  const n0=await nLayers(pg); await openAdd(pg); await tap(pg,'[data-icon="heart"]',700);
  ok('3 Add opened/closed 3x, one icon tap = exactly one new layer',(await nLayers(pg))===n0+1,[n0,await nLayers(pg)]);
  await ctx.close(); }

/* 6,7,8,9 emoji / colour / swap / undo */
{ const {ctx,pg}=await mk(); await start(pg,'[data-size="story"]');
  await openAdd(pg); await tap(pg,'[data-sticker="sticker:emoji-places"]',800);
  const e=await pg.evaluate(()=>{ const n=BD.S.sel[0], d=window.HL_EMOJI.find(x=>'sticker:emoji-'+x[0]==='sticker:emoji-places'), parts=d[3];
    return {cn:n&&n.getClassName(),kind:n&&BD.util.kind(n),sid:n&&n.getAttr('stickerId'),kids:n.getChildren().length,parts:parts.length,fills:n.getChildren().map(c=>c.fill()),pf:parts.map(p=>p[0])}; });
  ok('6 emoji-places: selected Group, stickerId, children === parts, fills in order',e.cn==='Group'&&e.kind==='group'&&e.sid==='sticker:emoji-places'&&e.kids===e.parts&&JSON.stringify(e.fills)===JSON.stringify(e.pf),e);
  /* 7 colour */
  await tap(pg,'#crCtx [data-x="color"]',600);
  const c0=await pg.evaluate(()=>({sheet:document.getElementById('crSheet').dataset.name,lbl:(document.querySelector('#crSheetB .lbl')||{}).textContent,orig:(document.querySelector('.cr-sw.orig')||{getAttribute(){return null;}}).getAttribute('aria-pressed'),lbls:document.querySelectorAll('#crSheetB .lbl').length}));
  ok('7a colour sheet: first label Emoji, Original pressed',c0.sheet==='color'&&/^emoji$/i.test((c0.lbl||'').trim())&&c0.orig==='true',c0);
  const col=await pg.evaluate(()=>[...document.querySelectorAll('.cr-sw[data-c]')].map(x=>x.dataset.c).find(x=>x&&x!==''));
  await pg.tap(`.cr-sw[data-c="${col}"]`); await pg.waitForTimeout(400);
  const t1=await pg.evaluate(c=>{ const n=BD.S.sel[0]; return {col:c,ok:n.getChildren().every(k=>String(k.fill()).toLowerCase()===c.toLowerCase()&&k.opacity()===1),tint:n.getAttr('tint'),fills:n.getChildren().map(k=>k.fill()).slice(0,3)}; },col);
  ok('7b picking a colour: every child that colour, opacity 1, tint set',t1.ok&&!!t1.tint,t1);
  await pg.tap('.cr-sw.orig'); await pg.waitForTimeout(400);
  const t2=await pg.evaluate(()=>{ const n=BD.S.sel[0], parts=window.HL_EMOJI.find(x=>x[0]==='places')[3]; return {ok:n.getChildren().every((k,i)=>k.fill()===parts[i][0]&&k.opacity()===(parts[i][2]==null?1:parts[i][2])),tint:n.getAttr('tint')}; });
  ok('7c Original: fills + opacities restored, tint unset',t2.ok&&!t2.tint,t2);
  await tap(pg,'#crSheetX',300);
  /* 14 save quality, before other nodes */
  const q=await pg.evaluate(()=>{ const f=BD.activeFrame(), n=BD.S.sel[0]||BD.main.find(x=>x.getAttr&&x.getAttr('stickerId'))[0], r=n.getClientRect({relativeTo:f,skipShadow:true});
    const c=BD.renderFrame(f,2), x=c.getContext('2d'), px=Math.round((r.x+r.width/2)*2), py=Math.round((r.y+.25*r.height)*2), d=x.getImageData(px,py,1,1).data; return {w:c.width,h:c.height,px:[...d],r}; });
  ok('14a 2x export is 2160x3840',q.w===2160&&q.h===3840,q);
  ok('14b emoji red ball pixel is reddish',q.px[0]>180&&q.px[1]<90&&q.px[2]<100,q);
  /* 8 swap */
  await openAdd(pg); await tap(pg,'[data-sticker="sticker:arrow-curve"]',700);
  const o=await rel(pg), cnt=await nLayers(pg);
  await tap(pg,'#crCtx [data-x="swap"]',800);
  ok('8a Swap opens the swap sheet',await pg.evaluate(()=>document.getElementById('crSheet').dataset.name==='swap'));
  await tap(pg,'#crSwE [data-sticker="sticker:emoji-chat"]',900);
  const s=await pg.evaluate(()=>({sid:BD.S.sel[0]&&BD.S.sel[0].getAttr('stickerId'),cn:BD.S.sel[0]&&BD.S.sel[0].getClassName(),old:BD.activeFrame().find(n=>n.getAttr&&n.getAttr('stickerId')==='sticker:arrow-curve').length,
    sheet:document.getElementById('crSheet').dataset.name,hidden:document.getElementById('crSheet').hidden,pressed:(document.querySelector('#crSwE [data-sticker="sticker:emoji-chat"]')||{getAttribute(){return null;}}).getAttribute('aria-pressed')}));
  const nr=await rel(pg);
  ok('8b swap: selection is the emoji group at the same centre (+-3), layer count same, old gone',s.sid==='sticker:emoji-chat'&&s.cn==='Group'&&near(nr.cx,o.cx,3)&&near(nr.cy,o.cy,3)&&(await nLayers(pg))===cnt&&s.old===0,[s,o,nr,cnt]);
  ok('8c swap sheet stays open, tapped tile aria-pressed true',s.sheet==='swap'&&!s.hidden&&s.pressed==='true',s);
  /* 9 undo / redo */
  await tap(pg,'#crSheetX',300);
  const n1=await nLayers(pg); await openAdd(pg); await tap(pg,'[data-sticker="sticker:star"]',700); const n2=await nLayers(pg);
  await pg.evaluate(()=>BD.undo()); await pg.waitForTimeout(500); const n3=await nLayers(pg);
  await pg.evaluate(()=>BD.redo()); await pg.waitForTimeout(500); const n4=await nLayers(pg);
  ok('9 add sticker, undo removes it, redo brings it back',n2===n1+1&&n3===n1&&n4===n2,[n1,n2,n3,n4]);
  await ctx.close(); }

/* 10 highlight cover swap, 11 layout */
{ const {ctx,pg}=await mk(); await start(pg,'[data-tpl="highlight-places"]',1800);
  await pg.evaluate(()=>{ const n=BD.activeFrame().getChildren(c=>BD.util.isObj(c)).slice(-1)[0]; BD.select([n]); }); await pg.waitForTimeout(400);
  ok('10a pin selected: Swap button visible in the edit bar',await pg.evaluate(()=>{ const b=document.querySelector('#crCtx [data-x="swap"]'); return !!b&&b.getBoundingClientRect().width>0; }));
  await tap(pg,'#crCtx [data-x="swap"]',800); await tap(pg,'[data-sticker="sticker:emoji-places"]',900);
  const hc=await pg.evaluate(()=>{ const f=BD.activeFrame(), g=f.find(n=>n.getAttr&&n.getAttr('stickerId')==='sticker:emoji-places')[0]; if(!g) return null; const r=g.getClientRect({relativeTo:f,skipShadow:true}); return {cx:r.x+r.width/2,cy:r.y+r.height/2,round:f.getAttr('round')}; });
  ok('10b pin swapped to emoji-places at (540,540 +-4), frame still round',hc&&near(hc.cx,540,4)&&near(hc.cy,540,4)&&!!hc.round,hc);
  const lay=await pg.evaluate(async()=>{ let f=await CR.LAYOUTS.highlight(CR.templateHelper(),{},{label:'T',emoji:'star'}); if(Array.isArray(f)) f=f[0]; const r=f&&f.find&&f.find(n=>n.getAttr&&n.getAttr('stickerId')==='sticker:emoji-star').length; try{ f.destroy(); }catch(_){} return {r,ok:!!f}; });
  ok('11 CR.LAYOUTS.highlight with emoji:star has a sticker:emoji-star node',lay.ok&&lay.r>=1,lay);
  await ctx.close(); }

/* 12 round trip, 13 old designs */
{ const {ctx,pg}=await mk(); await start(pg,'[data-size="story"]');
  await openAdd(pg); await tap(pg,'[data-sticker="sticker:heart"]',700);
  await openAdd(pg); await tap(pg,'[data-sticker="sticker:emoji-star"]',800);
  const r=await pg.evaluate(async()=>{ const j=BD.docJson(); const a=BD.renderFrame(BD.activeFrame(),0.5).toDataURL(); await BD.loadDocJson(j); await new Promise(r=>setTimeout(r,500)); const b2=BD.renderFrame(BD.activeFrame(),0.5).toDataURL(); return {has:j.includes('"stickerId":"sticker:heart"'),emo:j.includes('"stickerId":"sticker:emoji-star"'),sf:j.includes('sceneFunc'),same:a===b2,j2:BD.docJson()===j,len:a.length}; });
  ok('12a saved JSON has stickerIds and no sceneFunc',r.has&&r.emo&&!r.sf,r);
  ok('12b reload renders identically and docJson is stable',r.same&&r.j2&&r.len>2000,r);
  const t=await pg.evaluate(async()=>{ const ids=CR.templates().map(d=>d.id); const id=ids.includes('ice-cold-post')?'ice-cold-post':ids.find(i=>!/highlight/.test(i)); await CR.buildTemplate(id); await new Promise(r=>setTimeout(r,800)); const j1=BD.docJson(); await BD.loadDocJson(j1); await new Promise(r=>setTimeout(r,500)); return {id,same:BD.docJson()===j1,len:j1.length}; });
  ok('13 old design (template) round-trips unchanged',t.same&&t.len>500,t);
  await ctx.close(); }

/* 15 text styles */
{ const seed=[{id:'tsA',name:'Big red',st:{color:'#BE2C5C',font:'Cairo',bg:'#111111'},at:1}];
  const {ctx,pg}=await mk({},{fn:s=>{ try{ if(!localStorage.getItem('studio:textstyles')) localStorage.setItem('studio:textstyles',JSON.stringify(s)); }catch(_){} },arg:seed});
  await start(pg,'[data-size="story"]');
  await tap(pg,'#crBar [data-cr="text"]',700); await tap(pg,'#crSheetX',300); await tap(pg,'#crCtx [data-x="font"]',900);
  const store=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')||'[]'));
  ok('15a Font sheet: one saved style chip',await pg.evaluate(()=>document.querySelectorAll('.cr-tsc').length)===1);
  await tap(pg,'[data-ts="tsA"]',1200);
  const a=await pg.evaluate(()=>{ const t=BD.S.sel[0]; return {fill:t.fill(),ff:t.fontFamily(),tbg:t.getAttr('tbg'),pr:document.querySelector('[data-ts="tsA"]').getAttribute('aria-pressed'),toast:document.getElementById('crToast').textContent}; });
  ok('15b apply style: fill, font, tbg, chip pressed, toast names it',a.fill==='#BE2C5C'&&a.ff==='Cairo'&&a.tbg==='#111111'&&a.pr==='true'&&a.toast.includes('Big red'),a);
  await tap(pg,'#fTSave',500);
  ok('15c Save on an identical style: "Already saved" and store unchanged',(await pg.evaluate(()=>document.getElementById('crToast').textContent))==='Already saved as “Big red”.'&&(await store()).length===1,await pg.evaluate(()=>document.getElementById('crToast').textContent));
  await pg.evaluate(()=>{ BD.S.sel[0].fill('#123456'); BD.main.batchDraw(); });
  await tap(pg,'#crSheetX',300); await tap(pg,'#crCtx [data-x="font"]',800); await tap(pg,'#fTSave',600);
  const st=await store(), ne=st[1];
  ok('15d Save new style: store 2, name Style 1, color #123456, valid shape',st.length===2&&ne&&ne.name==='Style 1'&&ne.st.color==='#123456'&&st.every(x=>typeof x.id==='string'&&typeof x.name==='string'&&x.st&&typeof x.st==='object'&&typeof x.at==='number'),st);
  await tap(pg,`[data-tsm="${ne.id}"]`,500);
  const items=await pg.evaluate(()=>({vis:!document.getElementById('crMenuBox').hidden&&document.getElementById('crMenuBox').getBoundingClientRect().height>0,t:[...document.querySelectorAll('#crMenuBox button[data-i]')].map(x=>x.textContent.trim())}));
  ok('15e ⋯ menu visible with Use on all / Remove',items.vis&&items.t.some(x=>/Use on all text on this page/.test(x))&&items.t.includes('Remove'),items);
  await pg.evaluate(()=>[...document.querySelectorAll('#crMenuBox button[data-i]')].find(x=>x.textContent.trim()==='Remove').click()); await pg.waitForTimeout(500);
  const st2=await store();
  ok('15f Remove: store back to 1, still valid',st2.length===1&&st2[0].id==='tsA'&&typeof st2[0].at==='number',st2);
  await ctx.close(); }

/* 16 dark */
{ const {ctx,pg}=await mk({colorScheme:'dark'}); await start(pg,'[data-size="story"]'); await openAdd(pg);
  const d=await pg.evaluate(()=>{ const bt=document.querySelector('#crStk button'), cs=getComputedStyle(bt), p=bt.querySelector('svg path'); return {color:cs.color,bg:cs.backgroundColor,fill:p.getAttribute('fill'),stroke:p.getAttribute('stroke')}; });
  ok('16a dark: sticker button colour differs from its background',d.color!==d.bg,d);
  ok('16b dark: sticker svg path uses currentColor',d.fill==='currentColor'||d.stroke==='currentColor',d);
  await ctx.close(); }

/* 17 small phone */
{ const seed=[1,2,3].map(i=>({id:'s'+i,name:'Style number '+i+' long name',st:{color:'#'+i+'e2c5c',font:'Cairo'},at:i}));
  const {ctx,pg}=await mk({viewport:{width:360,height:780}},{fn:s=>{ try{ localStorage.setItem('studio:textstyles',JSON.stringify(s)); }catch(_){} },arg:seed});
  await start(pg,'[data-size="story"]'); await openAdd(pg);
  const o=await pg.evaluate(()=>{ const B=document.getElementById('crSheetB'); return {doc:document.documentElement.scrollWidth,iw:innerWidth,b:B.scrollWidth,bc:B.clientWidth}; });
  ok('17a 360px: Add sheet no horizontal overflow',o.doc<=o.iw&&o.b<=o.bc,o);
  await tap(pg,'#crSheetX',300); await tap(pg,'#crBar [data-cr="text"]',700); await tap(pg,'#crSheetX',300); await tap(pg,'#crCtx [data-x="font"]',900);
  const f=await pg.evaluate(()=>{ const B=document.getElementById('crSheetB'); return {chips:document.querySelectorAll('.cr-tsc').length,doc:document.documentElement.scrollWidth,iw:innerWidth,b:B.scrollWidth,bc:B.clientWidth}; });
  ok('17b 360px: Font sheet with 3 styles no horizontal overflow',f.chips===3&&f.doc<=f.iw&&f.b<=f.bc,f);
  await ctx.close(); }

/* 18 desktop */
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800},deviceScaleFactor:1,isMobile:false,hasTouch:false,tag:'desktop'});
  await pg.goto(BASE+'tools/create.html'); await ready(pg); await pg.click('[data-size="story"]'); await pg.waitForTimeout(600);
  await pg.click('#crBar [data-cr="add"]'); await pg.waitForTimeout(700); const n0=await nLayers(pg);
  await pg.click('[data-sticker="sticker:star"]'); await pg.waitForTimeout(700);
  ok('18 desktop: click a sticker tile adds and selects it',(await nLayers(pg))===n0+1&&await pg.evaluate(()=>BD.S.sel.length===1&&BD.S.sel[0].getAttr('stickerId')==='sticker:star'));
  await ctx.close(); }

ok('no page errors',errs.length===0,errs);
await b.close();
console.log(`\n${passes} passed, ${fails} failed in ${((Date.now()-T0)/1000).toFixed(1)}s`);
process.exit(fails?1:0);
