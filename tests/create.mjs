/* Create (tools/create.html, its own editor in tools/create-core.js): start sheet, sizes, every template builds inside
   its pages, selecting (tap, tap empty / Done to deselect, box-select, long-press to add, Shift-click), elements whose
   words re-fit, photo spots, colour, layers, pages, drafts in Continue editing, 2× lossless PNG, team save + team templates. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SAMPLES=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const OUT=fs.mkdtempSync('/tmp/createtest-');
const pngSize=f=>{ const x=fs.readFileSync(f); return [x.readUInt32BE(16),x.readUInt32BE(20)]; };
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(tag+' '+m.text()); }); };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400); };
/* screen point of a page point / of a node's centre */
const at=async(pg,x,y)=>{ const r=await pg.locator('#crStage').boundingBox(); const p=await pg.evaluate(([x,y])=>{ const f=BD.activeFrame(), t=BD.stage.getAbsoluteTransform(); return t.point({x:f.x()+x,y:f.y()+y}); },[x,y]); return {x:r.x+p.x,y:r.y+p.y}; };
const centre=async(pg,expr)=>{ const r=await pg.locator('#crStage').boundingBox(); const p=await pg.evaluate(e=>{ const n=eval(e); const c=n.getClientRect(); return {x:c.x+c.width/2,y:c.y+c.height/2}; },expr); return {x:r.x+p.x,y:r.y+p.y}; };
const selLabels=pg=>pg.evaluate(()=>BD.S.sel.map(n=>n.getAttr('label')||BD.util.kind(n)));

/* ---------- phone ---------- */
{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,'phone');
  const cdp=await ctx.newCDPSession(pg);
  const drag=async(a,c,hold)=>{ const pts=(x,y)=>[{x,y,id:1}]; await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(a.x,a.y)}); if(hold) await pg.waitForTimeout(hold);
    for(let i=1;i<=10;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(a.x+(c.x-a.x)*i/10,a.y+(c.y-a.y)*i/10)}); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(250); };
  await pg.goto(BASE+'tools/create.html'); await ready(pg);
  ok('opens with the start sheet (sizes + templates)',await pg.evaluate(()=>!document.getElementById('crSheet').hidden&&document.querySelectorAll('.cr-size').length===5&&document.querySelectorAll('[data-tpl]').length>=20));
  ok('nothing is a draft yet',await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:1stchoice:create:'))&&!location.search.includes('draft')));
  await pg.tap('[data-size="carousel"]'); await pg.waitForTimeout(500);
  ok('Carousel = 3 pages of 1080×1350, one shown at a time',await pg.evaluate(()=>{ const f=BD.util.frames(); return f.length===3&&f.every(x=>{ const s=BD.util.fsize(x); return s.w===1080&&s.h===1350; })&&f.filter(x=>x.visible()).length===1; }));
  ok('page strip shows 3 pages and +',await pg.evaluate(()=>document.querySelectorAll('#crPages .cr-pg').length===4));
  ok('first change makes a draft',await pg.evaluate(()=>location.search.includes('draft=')));
  await pg.tap('#crPages [data-pg="+"]'); await pg.waitForTimeout(300); ok('+ adds a page right after this one and shows it',await pg.evaluate(()=>BD.util.frames().length===4&&BD.util.frames().indexOf(BD.activeFrame())===1));
  await pg.tap('#crPages .cr-pg >> nth=0'); await pg.waitForTimeout(300); ok('tap a page number to go there',await pg.evaluate(()=>BD.util.frames().indexOf(BD.activeFrame())===0));
  /* Add → Map in bio */
  await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(400);
  ok('Add opens with element previews',await pg.evaluate(()=>document.getElementById('crSheet').dataset.name==='add'&&document.querySelectorAll('.cr-el img').length>=15));
  await pg.tap('[data-el="bio"]'); await pg.waitForTimeout(400);
  const pill=await pg.evaluate(()=>{ const n=BD.S.sel[0]; return n&&{el:n.getAttr('el'),inPage:n.getParent()===BD.activeFrame(),w:n.findOne(c=>c.getAttr('role')==='bg').width()}; });
  ok('Map in bio added to the page and selected',pill&&pill.el==='pill'&&pill.inPage,pill);
  ok('handles are finger-sized',await pg.evaluate(()=>BD.tr.anchorSize()>=20));
  ok('edit bar: Done, Words, Colour, Font, Size, Arrange, Duplicate, Delete',await pg.evaluate(()=>['done','words','color','font','size','arrange','dup','del'].every(a=>document.querySelector(`#crCtx [data-x="${a}"]`))));
  await pg.tap('#crCtx [data-x="words"]'); await pg.waitForTimeout(300);
  await pg.fill('#crW0','الخريطة في البايو الخريطة'); await pg.waitForTimeout(200);
  const w2=await pg.evaluate(()=>BD.S.sel[0].findOne(c=>c.getAttr('role')==='bg').width());
  ok('Words sheet: the pill grows with its words',w2>pill.w+60,[pill.w,w2]);
  await pg.tap('#crSheetX'); await pg.waitForTimeout(250);
  /* deselect: tap empty space; Done */
  let p=await at(pg,60,1300); await pg.touchscreen.tap(p.x,p.y); await pg.waitForTimeout(200);
  ok('tap empty space deselects',(await selLabels(pg)).length===0);
  p=await centre(pg,"BD.main.find(n=>n.getAttr('el')==='pill')[0]"); await pg.touchscreen.tap(p.x,p.y); await pg.waitForTimeout(200);
  ok('tap a thing selects it',JSON.stringify(await selLabels(pg))==='["Map in bio"]',await selLabels(pg));
  await pg.tap('#crCtx [data-x="done"]'); await pg.waitForTimeout(200); ok('Done ✓ deselects',(await selLabels(pg)).length===0);
  /* text */
  await pg.tap('#crBar [data-cr="text"]'); await pg.waitForTimeout(400);
  ok('Text adds words and opens the Words sheet',await pg.evaluate(()=>document.getElementById('crSheet').dataset.name==='words'&&BD.util.kind(BD.S.sel[0])==='text'));
  await pg.fill('#crW0','يسرسح ثلج'); await pg.tap('#crSheetX'); await pg.waitForTimeout(250);
  ok('the words are on the page, right-to-left',await pg.evaluate(()=>BD.main.find('Text').some(t=>t.text()==='يسرسح ثلج'&&t.direction()==='rtl')));
  /* drag to move, snapping to the page centre */
  await pg.evaluate(()=>{ const t=BD.main.find('Text').find(t=>t.text()==='يسرسح ثلج'); t.x(100); t.y(300); BD.select([t]); BD.main.batchDraw(); });
  const tc=await pg.evaluate(()=>{ const r=BD.util.prect(BD.S.sel[0]); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  await drag(await at(pg,tc.x,tc.y),await at(pg,537,tc.y+200));
  ok('drag moves it and snaps to the page centre',await pg.evaluate(()=>{ const r=BD.util.prect(BD.S.sel[0]); return Math.abs(r.x+r.width/2-540)<1&&r.y>400; }),await pg.evaluate(()=>BD.util.prect(BD.S.sel[0])));
  /* box-select several by dragging on empty space */
  await pg.tap('#crCtx [data-x="done"]'); await pg.waitForTimeout(150);
  await drag(await at(pg,20,20),await at(pg,1060,1330));
  ok('drag on empty space selects several',(await selLabels(pg)).length===2,await selLabels(pg));
  ok('edit bar shows how many and Group',await pg.evaluate(()=>/2 selected/.test(document.getElementById('crCtx').textContent)&&!!document.querySelector('#crCtx [data-x="group"]')));
  await pg.tap('#crCtx [data-x="group"]'); await pg.waitForTimeout(200); ok('Group makes one layer',await pg.evaluate(()=>BD.S.sel.length===1&&BD.util.kind(BD.S.sel[0])==='group'));
  await pg.evaluate(()=>BD.act.ungroup()); await pg.waitForTimeout(150); ok('Ungroup gives them back',await pg.evaluate(()=>BD.S.sel.length===2));
  await pg.tap('#crCtx [data-x="done"]'); await pg.waitForTimeout(150);
  /* long-press adds to the selection */
  await pg.evaluate(()=>{ const t=BD.main.find('Text').find(t=>t.text()==='يسرسح ثلج'); t.y(120); BD.main.batchDraw(); });
  p=await centre(pg,"BD.main.find(n=>n.getAttr('el')==='pill')[0]"); await pg.touchscreen.tap(p.x,p.y); await pg.waitForTimeout(150);
  const q=await centre(pg,"BD.main.find('Text').find(t=>t.text()==='يسرسح ثلج')");
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x,y:q.y,id:1}]}); await pg.waitForTimeout(650); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(200);
  ok('long-press adds to the selection',(await selLabels(pg)).length===2,{sel:await selLabels(pg),q,hit:await pg.evaluate(([x,y])=>{ const r=document.getElementById('crStage').getBoundingClientRect(); const h=BD.hitAt({x:x-r.left,y:y-r.top}); return h.node?h.node.getAttr('label')||BD.util.kind(h.node):h; },[q.x,q.y])});
  await pg.tap('#crCtx [data-x="done"]'); await pg.waitForTimeout(150);
  /* colour */
  p=await centre(pg,"BD.main.find('Text').find(t=>t.text()==='يسرسح ثلج')"); await pg.touchscreen.tap(p.x,p.y); await pg.waitForTimeout(150);
  await pg.tap('#crCtx [data-x="color"]'); await pg.waitForTimeout(300); await pg.tap('#crSheetB .cr-sw[data-c="#BE2C5C"]'); await pg.waitForTimeout(150);
  ok('Colour: the brand palette recolours the words',await pg.evaluate(()=>BD.S.sel[0].fill()==='#BE2C5C'));
  await pg.tap('#crSheetX'); await pg.waitForTimeout(200);
  /* photo spot */
  await pg.evaluate(()=>CR.addElement('slot')); await pg.waitForTimeout(300);
  ok('a photo spot offers Add photo',await pg.isVisible('#crCtx [data-x="slot"]'));
  const [fc]=await Promise.all([pg.waitForEvent('filechooser'),pg.tap('#crCtx [data-x="slot"]')]); await fc.setFiles(SAMPLES+'pair.jpg'); await pg.waitForTimeout(1200);
  const ph=await pg.evaluate(()=>{ const n=BD.S.sel[0]; return n&&{k:BD.util.kind(n),img:!!n.image(),r:n.cornerRadius(),w:Math.round(n.width())}; });
  ok('the photo takes the spot (size and corners)',ph&&ph.k==='image'&&ph.img&&ph.r===40&&ph.w===756,ph);
  ok('a photo offers Crop and Replace',await pg.evaluate(()=>!!document.querySelector('#crCtx [data-x="crop"]')&&!!document.querySelector('#crCtx [data-x="replace"]')));
  /* layers */
  await pg.tap('#crBar [data-cr="layers"]'); await pg.waitForTimeout(300);
  ok('Layers lists this page',await pg.evaluate(()=>document.querySelectorAll('#crLy .cr-ly').length===3));
  await pg.tap('#crLy .cr-ly >> nth=2'); await pg.waitForTimeout(150); ok('tap a layer row selects it',(await selLabels(pg)).length===1);
  await pg.tap('#crBar [data-cr="layers"]'); await pg.waitForTimeout(200); ok('tap Layers again closes it',await pg.evaluate(()=>document.getElementById('crSheet').hidden));
  /* undo */
  const n0=await pg.evaluate(()=>BD.activeFrame().getChildren().length); await pg.tap('#crCtx [data-x="del"]'); await pg.waitForTimeout(400); await pg.tap('#crUndo'); await pg.waitForTimeout(600);
  ok('delete then undo brings it back',await pg.evaluate(n=>BD.activeFrame().getChildren().length===n,n0));
  /* draft survives a reload */
  await pg.waitForTimeout(1600); const url=pg.url();
  await pg.reload(); await ready(pg); await pg.waitForTimeout(800);
  ok('reload keeps the draft (pages, photo, words)',await pg.evaluate(()=>BD.util.frames().length===4&&BD.main.find('Image').some(n=>BD.util.kind(n)==='image'&&n.image())&&BD.main.find('Text').some(t=>t.text()==='يسرسح ثلج'))&&pg.url()===url);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1500);
  ok('the hub lists Create in Continue editing',await pg.evaluate(()=>[...document.querySelectorAll('#continueList .ccard a')].some(a=>/create\.html\?draft=/.test(a.href))));
  await pg.click('#allTools'); await pg.waitForTimeout(300);
  ok('All tools lists the Create tool',await pg.evaluate(()=>[...document.querySelectorAll('.lib-row a')].some(a=>/create\.html$/.test(a.href))));
  await pg.click('#libDone'); await pg.waitForTimeout(200);
  await pg.goto(url); await ready(pg);
  /* team save, reopen */
  await pg.tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(400);
  ok('Save sheet with a page picker',await pg.evaluate(()=>document.getElementById('crSheet').dataset.name==='save'&&document.querySelectorAll('#crPP input').length===4));
  await pg.tap('#crTeamOn'); await pg.fill('#crTName','Test carousel'); await pg.tap('#crTeamOnly');
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('crSt').textContent),null,{timeout:15000});
  const id=await pg.evaluate(()=>new URLSearchParams(location.search).get('design'));
  ok('saved to the team (URL is the design, draft gone)',!!id&&await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:1stchoice:create:'))));
  await pg.goto(BASE+'tools/create.html?design='+id); await ready(pg); await pg.waitForTimeout(600);
  ok('reopen the saved design with its photo',await pg.evaluate(()=>BD.util.frames().length===4&&BD.main.find('Image').some(n=>BD.util.kind(n)==='image'&&n.image())));
  ok('a saved design is not a draft',await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:1stchoice:create:'))));
  await ctx.close(); }

/* ---------- computer ---------- */
{ const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,'desk');
  await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg);
  const list=await pg.evaluate(()=>CR.templates().map(d=>d.id));
  ok('brand has templates',list.length>=20,list.length);
  const bad=[];
  for(const id of list){ const r=await pg.evaluate(async id=>{ BD.select([]); BD.main.destroyChildren(); const made=await CR.buildTemplate(id,{at:{x:0,y:0}}); const out={pages:made.length,outside:[]};
      made.forEach(f=>{ f.visible(true); const s=BD.util.fsize(f); BD.util.items(f).forEach(n=>{ if(n.hasName('frame-bg')) return; const r=BD.util.prect(n,f); if(r.x<-2||r.y<-2||r.x+r.width>s.w+2||r.y+r.height>s.h+2) out.outside.push(n.getAttr('label')||BD.util.kind(n)); }); }); return out; },id);
    if(!r.pages||r.outside.length) bad.push({id,...r}); }
  ok('every template builds inside its pages',!bad.length,bad);
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg); await pg.waitForTimeout(800);
  /* mouse: click selects, Shift-click adds, Escape deselects */
  const p=await centre(pg,"BD.main.find(n=>n.getAttr('label')==='Headline')[0]"); await pg.mouse.click(p.x,p.y);
  const p2=await centre(pg,"BD.main.find(n=>n.getAttr('label')==='Small line')[0]"); await pg.keyboard.down('Shift'); await pg.mouse.click(p2.x,p2.y); await pg.keyboard.up('Shift');
  ok('computer: click + Shift-click selects two',(await selLabels(pg)).length===2,await selLabels(pg));
  await pg.keyboard.press('Escape'); ok('Escape deselects',(await selLabels(pg)).length===0);
  await pg.click('#crBar [data-cr="save"]'); await pg.waitForTimeout(300);
  const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#crGo')]); const f=OUT+'/'+dl.suggestedFilename(); await dl.saveAs(f);
  ok('Save image = 2160×3840 lossless PNG',JSON.stringify(pngSize(f))==='[2160,3840]'&&/\.png$/.test(f),pngSize(f));
  await pg.click('#crAsTpl'); await pg.waitForFunction(()=>/team template/.test(document.getElementById('crSt').textContent),null,{timeout:15000});
  await pg.click('#crSheetX'); await pg.click('#crBar [data-cr="templates"]'); await pg.waitForTimeout(900);
  ok('the team template is listed in Templates',await pg.evaluate(()=>document.querySelectorAll('#crTeamT [data-team]').length===1));
  await ctx.close(); }

console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);
