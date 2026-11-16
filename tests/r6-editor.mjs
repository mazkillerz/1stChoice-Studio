/* Round 6, one consistent editor: Create's panels open like the tool pages' (phone 390x844, touch).
   Same sheet geometry (it sits on the bar, the design stays visible), same header and Done, same tile sizes
   and group names, Back closes the panel (and returns to a parent) in both. Desktop: both editors keep a side panel. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch(); const errs=[]; let fails=0, passes=0;
const ok=(n,c,i)=>{ if(c) passes++; else fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const mk=async(o)=>{ const ctx=await b.newContext(Object.assign({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'},o||{}));
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(m.text()); }); return pg; };
const tool=async(pg)=>{ await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); };
const create=async(pg)=>{ await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:25000}); await pg.waitForTimeout(900); };
/* geometry of a panel: its sheet, header, Done, and the design above it */
const geo=(pg,sh,designSel)=>pg.evaluate(([sh,ds])=>{ const s=document.querySelector(sh), h=s.querySelector('.sheet-head,.cr-sh-head'), d=h.querySelector('.done'), r=s.getBoundingClientRect(), hr=h.getBoundingClientRect(), dr=d.getBoundingClientRect();
  const dz=document.querySelector(ds).getBoundingClientRect(); const cs=getComputedStyle(d), g=h.querySelector('.grab').getBoundingClientRect();
  return {top:Math.round(r.top),bottom:Math.round(r.bottom),hh:Math.round(hr.height),dh:Math.round(dr.height),dbg:cs.backgroundColor,dfw:cs.fontWeight,dtop:Math.round(dr.top-r.top),gw:Math.round(g.width),designBottom:Math.round(dz.bottom),cls:d.className.replace(/\bdone\b/,'').trim()}; },[sh,designSel]);
const tiles=(pg,sel)=>pg.evaluate(s=>{ const t=document.querySelector(s); if(!t) return null; const r=t.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}; },sel);
const lbls=(pg,sel)=>pg.evaluate(s=>[...document.querySelectorAll(s)].map(x=>x.textContent.trim()),sel);
const near=(a,b,t)=>Math.abs(a-b)<=t;
const same=(a,b)=>a&&b&&near(a.w,b.w,2)&&near(a.h,b.h,2);

const T={}, C={};
/* ---------- tool page (the reference) ---------- */
{ const pg=await mk(); await tool(pg);
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(500); T.layers=await geo(pg,'#sh-layers','#phone');
  await pg.tap('#addAsset'); await pg.waitForTimeout(600); T.assets=await geo(pg,'#sh-assets','#phone');
  T.assetTile=await tiles(pg,'#assetList .asset-tile[data-asset]'); T.assetLbls=await lbls(pg,'#assetList .lbl');
  ok('tool: Back from an asset sheet opened in Layers returns to Layers',await (async()=>{ await pg.goBack().catch(()=>{}); await pg.waitForTimeout(500); return pg.evaluate(()=>document.getElementById('sh-layers').classList.contains('open')&&!document.getElementById('sh-assets').classList.contains('open')); })());
  await pg.tap('#addComp'); await pg.waitForTimeout(500); T.comps=await geo(pg,'#sh-comps','#phone'); T.compTile=await tiles(pg,'#compList .comp-tile');
  await pg.tap('#sh-comps .done'); await pg.waitForTimeout(400);
  await pg.tap('#addSticker'); await pg.waitForTimeout(900); T.stickers=await geo(pg,'#sh-stickers','#phone'); T.stkTile=await tiles(pg,'#stickerList .sticker-tile:not(.emoji-tile)'); T.emoTile=await tiles(pg,'#stickerList .emoji-tile'); T.stkLbls=await lbls(pg,'#stickerList .lbl');
  await pg.tap('#sh-stickers .done'); await pg.tap('#sh-layers .done').catch(()=>{}); await pg.waitForTimeout(300);
  await pg.tap('#barSave'); await pg.waitForTimeout(700); T.save=await pg.evaluate(()=>{ const s=document.querySelector('.sheet.save-sheet')||document.getElementById('sh-save'); const r=s.getBoundingClientRect(); return {top:Math.round(r.top),h:Math.round(r.height)}; }).catch(()=>null);
}
/* ---------- Create ---------- */
{ const pg=await mk(); await create(pg);
  await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(800); C.add=await geo(pg,'#crSheet','#crMain'.replace('#crMain','#crStage'));
  C.compTile=await tiles(pg,'.comp-grid .comp-tile'); C.assetTile=await tiles(pg,'.asset-grid .asset-tile[data-asset]');
  await pg.evaluate(()=>CR.stickersReady&&CR.stickersReady()); await pg.waitForTimeout(500);
  C.stkTile=await tiles(pg,'#crStk .sticker-tile'); C.emoTile=await tiles(pg,'#crEmo .emoji-tile'); C.lbls=await lbls(pg,'#crSheetB .lbl');
  C.frame=await pg.evaluate(()=>{ const r=BD.activeFrame().getClientRect(); const s=document.getElementById('crStage').getBoundingClientRect(); return {fb:Math.round(s.top+r.y+r.height)}; });
  await pg.tap('#crBar [data-cr="layers"]'); await pg.waitForTimeout(700); C.layers=await geo(pg,'#crSheet','#crStage');
  ok('create: Back closes a panel',await (async()=>{ await pg.goBack().catch(()=>{}); await pg.waitForTimeout(500); return pg.evaluate(()=>document.getElementById('crSheet').hidden); })());
  await pg.tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(800); C.save=await pg.evaluate(()=>{ const r=document.getElementById('crSheet').getBoundingClientRect(); return {top:Math.round(r.top),h:Math.round(r.height)}; });
  await pg.evaluate(()=>CRUI.closeSheet(true)); await pg.waitForTimeout(700);
  /* a swipe down on the header closes the sheet, like a tool page's */
  await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(700);
  const hb=await pg.evaluate(()=>{ const r=document.querySelector('.cr-sh-head').getBoundingClientRect(); return {x:r.left+r.width/2-40,y:r.top+8}; });
  const cdp=await pg.context().newCDPSession(pg); const touch=(type,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:hb.x,y}]});
  await touch('touchStart',hb.y); for(let i=1;i<=6;i++) await touch('touchMove',hb.y+i*25); await touch('touchEnd');
  await pg.waitForTimeout(500); ok('create: swiping the sheet header down closes it',await pg.evaluate(()=>document.getElementById('crSheet').hidden));
  /* choosing something keeps the design visible and the new layer selected */
  await pg.evaluate(()=>document.querySelector('#crBar [data-cr="add"]').click()); await pg.waitForTimeout(700);   // (a tap after a hand-made CDP touch is not delivered)
  await pg.evaluate(()=>document.querySelector('#crSheetB .asset-tile[data-shape]').click()); await pg.waitForTimeout(600);
  ok('create: picking a shape closes the panel and selects it',await pg.evaluate(()=>document.getElementById('crSheet').hidden&&BD.S.sel.length===1));
}
console.log(JSON.stringify({T,C}));
/* ---------- compare ---------- */
ok('geometry: Add panel top matches the Asset panel (±16px)',near(C.add.top,T.assets.top,16),[C.add.top,T.assets.top]);
ok('geometry: Layers panel top matches (±16px)',near(C.layers.top,T.layers.top,16),[C.layers.top,T.layers.top]);
ok('geometry: both panels end on the bottom bar (bottom 779±2)',[C.add,C.layers,T.assets,T.layers].every(g=>near(g.bottom,779,2)),[C.add.bottom,C.layers.bottom,T.assets.bottom,T.layers.bottom]);
ok('header: same height (Add vs Asset)',near(C.add.hh,T.assets.hh,2),[C.add.hh,T.assets.hh]);
ok('header: Done is a quiet grey chip, same height, weight and place',C.add.dbg===T.assets.dbg&&C.add.dh===T.assets.dh&&C.add.dfw===T.assets.dfw&&near(C.add.dtop,T.assets.dtop,3),[C.add,T.assets]);
ok('header: drag handle same width',C.add.gw===T.assets.gw,[C.add.gw,T.assets.gw]);
ok('design stays visible: the page ends above the panel',C.frame&&C.frame.fb<=C.add.top+16,[C.frame,C.add.top]);
ok('tile: element tiles equal',same(C.compTile,T.compTile),[C.compTile,T.compTile]);
ok('tile: asset tiles equal',same(C.assetTile,T.assetTile),[C.assetTile,T.assetTile]);
ok('tile: drawn sticker tiles equal',same(C.stkTile,T.stkTile),[C.stkTile,T.stkTile]);
ok('tile: emoji tiles equal',same(C.emoTile,T.emoTile),[C.emoTile,T.emoTile]);
const idx=(a,x)=>a.indexOf(x);
ok('groups: Create lists the tool page\'s asset groups in the same order (Team, brand groups, Shapes)',(()=>{ const t=T.assetLbls, c=C.lbls; let last=-1; return t.every(x=>{ const i=idx(c,x); if(i<=last) return false; last=i; return true; }); })(),[T.assetLbls,C.lbls]);
ok('groups: sticker headings Drawn then Emoji in both',T.stkLbls.join()==='Drawn,Emoji'&&idx(C.lbls,'Drawn')>-1&&idx(C.lbls,'Drawn')<idx(C.lbls,'Emoji'),[T.stkLbls,C.lbls]);
ok('save: both Save sheets are at most 76dvh (and the design shows above)',C.save.h<=Math.ceil(844*.76)+1&&C.save.top>=844*.24-2,[C.save,T.save]);
ok('no page errors',errs.length===0,errs.slice(0,3));

/* ---------- desktop: still a side panel in both ---------- */
{ const pg=await mk({viewport:{width:1280,height:800},isMobile:false,hasTouch:false}); await create(pg);
  await pg.click('#crBar [data-cr="add"]'); await pg.waitForTimeout(600);
  const d=await pg.evaluate(()=>{ const r=document.getElementById('crSheet').getBoundingClientRect(); return {l:Math.round(r.left),w:Math.round(r.width),bad:document.documentElement.scrollWidth>innerWidth}; });
  ok('desktop: the Add panel is a panel at the right, page not scrolled sideways',d.l>=1280-390-24&&d.w<=400&&!d.bad,d);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); ok('desktop: Escape closes it',await pg.evaluate(()=>document.getElementById('crSheet').hidden));
}
await b.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails?1:0);
