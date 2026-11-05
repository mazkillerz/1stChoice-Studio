/* Board on a phone (1.42.0): every control a finger can reach is at least 44px (taste row 7), in light and dark at 390 and 360 px:
   top bar, dock, zoom, Layers (rows, Lock/Hide), Assets (every category), quick bar + Design / Effects / Export for text, shape and frame,
   the menus (Board menu, More tools, a context menu), the colour and brand pop-overs, quick find and the text style dialog.
   Also: Lock and Hide can't be tapped by mistake on a row you didn't choose; on a narrow phone Frame moves from the dock into More
   tools; Board's interface text uses weights 400/500/600 only; "Use on all text" in a text style's dialog (backlog #48). */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch(); let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const STYLE={id:'tsA',name:'Gold',st:{color:'#c8a24a',font:'Cairo',align:'center',lh:1.2,shadow:false},at:1};
async function page(o){ const ctx=await b.newContext({viewport:o.vp,serviceWorkers:'block',hasTouch:!!o.touch,isMobile:!!o.touch,colorScheme:o.dark?'dark':'light'});
  await ctx.addInitScript(s=>{ localStorage.setItem('studio:lab','"1"'); if(!sessionStorage.getItem('seeded')){ localStorage.setItem('studio:textstyles',s); sessionStorage.setItem('seeded','1'); } },JSON.stringify([STYLE]));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto(BASE+'lab/board.html?preset=story'); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0&&BD.UI); await pg.waitForTimeout(500); return {pg,ctx}; }
/* every visible control under 44px (an invisible ::after hit area counts, like tapscan.mjs); in scrolling panels too */
const small=pg=>pg.evaluate(()=>[...document.querySelectorAll('button,a[href],input:not([type=file]),select,[role=button],label.tg')].filter(e=>{
  const r=e.getBoundingClientRect(), cs=getComputedStyle(e); if(!r.width||!r.height||cs.visibility==='hidden'||+cs.opacity===0||cs.pointerEvents==='none'||e.classList.contains('sr-only')) return false;
  if(r.right<=0||r.left>=innerWidth) return false;
  let w=r.width, h=r.height; const px=v=>parseFloat(v)||0, a=getComputedStyle(e,'::after');
  if(a.content!=='none'&&a.position==='absolute'){ const aw=a.width==='auto'?r.width-px(a.left)-px(a.right):px(a.width), ah=a.height==='auto'?r.height-px(a.top)-px(a.bottom):px(a.height); w=Math.max(w,aw); h=Math.max(h,ah); }
  const lb=e.tagName==='INPUT'&&e.closest('label'); if(lb){ const q=lb.getBoundingClientRect(); w=Math.max(w,q.width); h=Math.max(h,q.height); }
  return w<43.5||h<43.5; }).map(e=>`${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} "${(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,18)}"`));
const T=ms=>new Promise(r=>setTimeout(r,ms));
const closeAll=pg=>pg.evaluate(()=>{ BD.UI.closeMenu(); BD.UI.closePop(); document.querySelectorAll('dialog[open]').forEach(d=>d.close()); });
const panel=(pg,side,on)=>pg.evaluate(([s,o])=>{ const b=document.getElementById('panel'+s); if((b.getAttribute('aria-pressed')==='true')!==o) b.click(); },[side,on]);

for(const [W,dark] of [[390,false],[360,true]]){
  const tag=`${W}px ${dark?'dark':'light'}`; const {pg,ctx}=await page({vp:{width:W,height:844},touch:true,dark});
  const bad={}; const scan=async name=>{ const s=await small(pg); if(s.length) bad[name]=s; };
  await scan('main');
  await panel(pg,'L',true); await T(250); await scan('layers');
  for(const c of [null,'brand','text','photos','shapes','lines','icons','stickers','emoji','templates']){ await pg.evaluate(c=>BD.UI.openAssets(c),c); await pg.waitForTimeout(c==='stickers'||c==='emoji'?900:250); await scan('assets '+(c||'list')); }
  // shapes / icons tiles: at least 48px (backlog #47)
  await pg.evaluate(()=>BD.UI.openAssets('icons')); await T(250);
  const tile=await pg.evaluate(()=>{ const r=document.querySelector('#addList .sg').getBoundingClientRect(); return Math.min(r.width,r.height); });
  ok(`${tag}: Shapes / Icons tiles are at least 48px`,tile>=48,tile);
  await panel(pg,'L',false);
  // a text: quick bar, Design / Effects / Export
  await pg.evaluate(()=>{ const n=BD.make.text('Text',{fontSize:90}); BD.place(n); }); await T(300);
  ok(`${tag}: a chosen text shows the quick bar`,await pg.evaluate(()=>!document.getElementById('qbar').hidden));
  await scan('text quick bar');
  await panel(pg,'R',true); await T(250);
  for(const t of ['design','effects','export']){ await pg.click(`[data-rtab="${t}"]`); await T(250); await scan('text '+t); }
  await pg.click('[data-rtab="design"]'); await T(150);
  const wt=await pg.evaluate(()=>{ const s=document.querySelector('#props select[data-k="weight"]'); const out=[]; for(const o of s.options){ s.value=o.value; const c=document.createElement('canvas').getContext('2d'); c.font=getComputedStyle(s).font; out.push([o.text,Math.ceil(c.measureText(o.text).width)+22,s.clientWidth]); } return out.filter(([t,need,have])=>need>have); });
  ok(`${tag}: every Weight name fits its box`,!wt.length,wt);
  // colour pop-over from the Design panel
  const sw=pg.locator('#props .swb').first(); if(await sw.count()){ await sw.click(); await T(300); await scan('colour pop'); await closeAll(pg); }
  await panel(pg,'R',false);
  // Layers with a text chosen: its Lock / Hide show; on another row they can't be tapped
  await panel(pg,'L',true); await pg.evaluate(()=>BD.UI.openAssets&&document.getElementById('tabLayers').click()); await T(250);
  await scan('layers, text chosen');
  const top=await pg.evaluate(()=>{ const q=document.getElementById('qbar'); if(q.hidden) return 'qbar hidden'; const r=q.getBoundingClientRect(), p=document.getElementById('left').getBoundingClientRect(); const x=Math.min(r.right,p.right)-8, y=r.top+r.height/2; const e=document.elementFromPoint(x,y); return e&&e.closest('#left')?'panel':e&&e.closest('#qbar')?'qbar':String(e&&e.className); });
  ok(`${tag}: an open Layers panel sits above the quick bar`,top==='panel'||top==='qbar hidden',top);
  const lr=await pg.evaluate(()=>{ const rows=[...document.querySelectorAll('#layers .lr')]; const on=rows.find(r=>r.getAttribute('aria-selected')==='true'), off=rows.find(r=>r.getAttribute('aria-selected')!=='true'&&!r.querySelector('.lr-b.on'));
    const st=r=>r&&[...r.querySelectorAll('.lr-b')].map(x=>getComputedStyle(x).pointerEvents+'/'+getComputedStyle(x).opacity); return {on:st(on),off:st(off)}; });
  ok(`${tag}: Lock / Hide on the chosen row can be tapped, on other rows they can't`,lr.on&&lr.on.every(v=>v==='auto/1')&&lr.off&&lr.off.every(v=>v.startsWith('none/')),lr);
  // tapping the end of another row selects it, never hides it
  const hid=await pg.evaluate(()=>{ const rows=[...document.querySelectorAll('#layers .lr')]; const off=rows.find(r=>r.getAttribute('aria-selected')!=='true'&&!r.querySelector('.lr-b.on')); const b=off.querySelector('[data-eye]').getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2,n:BD.main.find(n=>n.visible()===false).length}; });
  await pg.touchscreen.tap(hid.x,hid.y); await T(300);
  ok(`${tag}: a tap where a hidden Hide button sits hides nothing`,await pg.evaluate(n=>BD.main.find(x=>x.visible()===false).length===n,hid.n));
  await panel(pg,'L',false);
  // a shape and a frame
  await pg.evaluate(()=>{ const n=BD.make.shape('rect',200); BD.place(n); window._shape=n; }); await T(300); await scan('shape quick bar');
  await panel(pg,'R',true); await T(250); await scan('shape design'); await panel(pg,'R',false);
  await pg.evaluate(()=>BD.select([BD.util.frames()[0]])); await T(300); await scan('frame quick bar');
  await panel(pg,'R',true); await T(250); await scan('frame design'); await panel(pg,'R',false);
  // menus
  await pg.click('#fileMenu'); await T(250); await scan('Board menu'); await closeAll(pg);
  await pg.click('#dock [data-dk="more"]'); await T(250); await scan('More tools');
  ok(`${tag}: menus leave out keyboard shortcuts on a phone`,await pg.evaluate(()=>[...document.querySelectorAll('#menu kbd')].every(k=>!k.offsetParent)));
  const more=await pg.evaluate(()=>[...document.querySelectorAll('#menu .m-l')].map(x=>x.textContent));
  const dockFrame=await pg.evaluate(()=>{ const f=document.querySelector('#dock [data-dk="frame"]'); return f?f.getBoundingClientRect().width:0; });
  ok(`${tag}: Frame is in More tools, not in the dock`,more[0]==='Frame'&&more.includes('Frame sizes…')&&dockFrame===0,{more:more.slice(0,3),dockFrame});
  await pg.evaluate(()=>{ const b=[...document.querySelectorAll('#menu button')].find(x=>x.textContent.trim().startsWith('Frame')); b.click(); }); await T(150);
  ok(`${tag}: More tools › Frame turns the frame tool on`,await pg.evaluate(()=>BD.S.tool==='frame'));
  await pg.evaluate(()=>BD.setTool('select')); await T(100);
  const dw=await pg.evaluate(()=>{ const d=document.getElementById('dock'); return {sw:d.scrollWidth,cw:d.clientWidth,right:d.getBoundingClientRect().right}; });
  ok(`${tag}: the dock fits without scrolling`,dw.sw<=dw.cw&&dw.right<=W,dw);
  await pg.click('#dock [data-dk="brand"]'); await T(300); await scan('brand pop'); await closeAll(pg);
  await pg.evaluate(()=>BD.select([window._shape])); await T(250);
  await pg.click('#qbar [data-q="menu"]'); await T(250); await scan('context menu'); await closeAll(pg);
  await pg.evaluate(()=>BD.UI.openPalette?BD.UI.openPalette():document.getElementById('findB').click()); await T(250);
  if(await pg.evaluate(()=>!document.getElementById('palette').hidden)) await scan('quick find');
  await pg.keyboard.press('Escape'); await T(150);
  await pg.evaluate(()=>BD.UI.tsMenu('tsA')); await T(250); await scan('text style dialog'); await closeAll(pg);
  ok(`${tag}: no control under 44px in any state`,!Object.keys(bad).length,bad);
  const name=await pg.evaluate(()=>document.getElementById('bName').getBoundingClientRect().width);
  ok(`${tag}: the board name keeps room in the top bar`,name>=52,name);
  await ctx.close();
}

/* weights: Board's interface text is 400/500/600 (a text style sample, the "Subheading" sample and design text keep their own) */
{ const {pg,ctx}=await page({vp:{width:1280,height:800}});
  const heavy=[]; const chk=async n=>{ const h=await pg.evaluate(()=>[...document.querySelectorAll('.board-app *')].filter(e=>{ if(!e.offsetParent||!e.childNodes.length||![...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())) return false;
      if(e.closest('.ta-h2,[style*="font-family"],.ed-text')) return false; return +getComputedStyle(e).fontWeight>600; }).map(e=>e.tagName.toLowerCase()+'.'+[...e.classList].join('.')+' '+getComputedStyle(e).fontWeight+' "'+e.textContent.trim().slice(0,16)+'"'));
    heavy.push(...h.map(x=>n+': '+x)); };
  await chk('main');
  await pg.evaluate(()=>{ const n=BD.make.text('Text',{fontSize:90}); BD.place(n); }); await T(300); await chk('text');
  for(const t of ['effects','export','design']){ await pg.click(`[data-rtab="${t}"]`); await T(200); await chk(t); }
  for(const c of [null,'text','shapes']){ await pg.evaluate(c=>BD.UI.openAssets(c),c); await T(250); await chk('assets '+(c||'list')); }
  await pg.click('#fileMenu'); await T(200); await chk('menu'); await closeAll(pg);
  ok('computer: Board text weights are 400/500/600 only',!heavy.length,[...new Set(heavy)].slice(0,12));
  /* the lab page too */
  await pg.goto(BASE+'lab/index.html'); await T(600);
  const lab=await pg.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.offsetParent&&[...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())&&+getComputedStyle(e).fontWeight>600).map(e=>e.tagName+'.'+e.className+' '+getComputedStyle(e).fontWeight));
  ok('the lab page text weights are 400/500/600 only',!lab.length,lab.slice(0,8));
  await ctx.close(); }

/* "Use on all text" in a text style's dialog (#48): every text in the frame takes the style in one undo step; Undo in the note */
{ const {pg,ctx}=await page({vp:{width:1280,height:800}});
  await pg.evaluate(()=>{ ['One','Two','Three'].forEach((t,i)=>{ const n=BD.make.text(t,{fontSize:80,fill:'#123456',fontFamily:'Lalezar'}); BD.place(n); n.y(200+i*300); }); BD.changed(); }); await T(700);
  const before=await pg.evaluate(()=>BD.util.frames()[0].find(n=>n.getAttr('kind')==='text').map(n=>n.fill()));
  await pg.evaluate(()=>BD.UI.openAssets('text')); await T(250);
  await pg.click('#addList [data-tsmore="tsA"]'); await T(250);
  ok('the text style dialog has "Use on all text"',await pg.locator('dialog[open] [data-tsact="all"]').innerText().then(t=>t.trim()==='Use on all text').catch(()=>false));
  await pg.click('dialog[open] [data-tsact="all"]'); await T(700);
  const after=await pg.evaluate(()=>BD.util.frames()[0].find(n=>n.getAttr('kind')==='text').map(n=>({f:n.fill(),fam:n.fontFamily(),al:n.align()})));
  ok('every text in the frame takes the style',after.length===before.length&&after.length>=3&&after.every(a=>a.f==='#c8a24a'&&a.fam==='Cairo'&&a.al==='center'),after);
  const note=await pg.evaluate(()=>{ const t=document.getElementById('bToast'); return t.hidden?'':t.textContent; });
  ok('a note says how many texts, with Undo',/Gold.*on \d+ texts in this frame/.test(note)&&/Undo/.test(note),note);
  await pg.click('#tUndo'); await T(700);
  const undone=await pg.evaluate(()=>BD.util.frames()[0].find(n=>n.getAttr('kind')==='text').map(n=>n.fill()));
  ok('one Undo brings every old look back',JSON.stringify(undone)===JSON.stringify(before),{before,undone});
  /* locked text is left alone; with no text in the frame the action is not offered */
  await pg.evaluate(()=>{ const t=BD.util.frames()[0].find(n=>n.getAttr('kind')==='text'); t[0].setAttr('locked',true); }); await T(100);
  ok('a locked text is not counted',await pg.evaluate(()=>BD.UI.frameTexts().length===BD.util.frames()[0].find(n=>n.getAttr('kind')==='text').length-1));
  await pg.evaluate(()=>{ BD.util.frames()[0].find(n=>n.getAttr('kind')==='text').forEach(n=>n.destroy()); BD.select([]); BD.changed(); }); await T(300);
  await pg.evaluate(()=>BD.UI.tsMenu('tsA')); await T(250);
  ok('with no text in the frame there is no "Use on all text"',await pg.locator('dialog[open] [data-tsact="all"]').count()===0&&await pg.locator('dialog[open] [data-tsact="del"]').count()===1);
  await ctx.close(); }

ok('no page errors',!errs.length,errs.slice(0,4));
await b.close(); console.log(fails?`\n${fails} FAILED`:'\nALL PASS'); process.exit(fails?1:0);
