/* Create (tools/create.html): start sheet, sizes, every template builds, elements, words that re-fit, photo spots,
   pages, drafts in Continue editing, saving full-size PNGs, saving to the team and team templates. Phone + computer. */
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
const ready=pg=>pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0&&document.getElementById('crPages')&&!document.getElementById('crPages').hidden||!document.getElementById('crSheet').hidden,null,{timeout:15000});

/* ---------- phone ---------- */
{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,'phone');
  await pg.goto(BASE+'tools/create.html'); await ready(pg); await pg.waitForTimeout(800);
  ok('opens with the start sheet (sizes + templates)',await pg.evaluate(()=>!document.getElementById('crSheet').hidden&&document.querySelectorAll('.cr-size').length===5&&document.querySelectorAll('[data-tpl]').length>0));
  ok('nothing is a draft yet',await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:1stchoice:create:'))&&!location.search.includes('draft')));
  await pg.tap('[data-size="carousel"]'); await pg.waitForTimeout(500);
  ok('Carousel = 3 pages of 1080×1350',await pg.evaluate(()=>{ const f=BD.util.frames(); return f.length===3&&f.every(x=>{ const s=BD.util.fsize(x); return s.w===1080&&s.h===1350; }); }));
  ok('page strip shows 3 pages and +',await pg.evaluate(()=>document.querySelectorAll('#crPages .cr-pg').length===4));
  ok('first change makes a draft',await pg.evaluate(()=>location.search.includes('draft=')));
  await pg.tap('#crPages [data-pg="+"]'); await pg.waitForTimeout(300); ok('+ adds a page',await pg.evaluate(()=>BD.util.frames().length===4));
  await pg.tap('#crPages .cr-pg >> nth=0'); await pg.waitForTimeout(400);
  /* Add → Elements → Map in bio */
  await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(400);
  ok('Add opens the add sheet',await pg.evaluate(()=>document.getElementById('left').classList.contains('open')&&!document.getElementById('addPane').hidden));
  const sheetBox=await pg.locator('#left').boundingBox(); ok('as a bottom sheet above the bar',sheetBox.y>200&&sheetBox.width>=380,sheetBox);
  await pg.tap('[data-cat="elements"]'); await pg.waitForTimeout(400);
  ok('Elements tray has previews',await pg.evaluate(()=>document.querySelectorAll('.cr-el img').length>=10));
  await pg.tap('[data-crel="bio"]'); await pg.waitForTimeout(400);
  const pill=await pg.evaluate(()=>{ const n=BD.S.sel[0]; return n&&{el:n.getAttr('el'),inFrame:BD.util.isFrame(n.getParent()),w:n.findOne(c=>c.getAttr('role')==='bg').width()}; });
  ok('Map in bio added as a smart pill in the page',pill&&pill.el==='pill'&&pill.inFrame,pill);
  ok('quick bar offers Words',await pg.isVisible('.qbar [data-q="crEdit"]'));
  await pg.tap('.qbar [data-q="crEdit"]'); await pg.waitForTimeout(250); await pg.keyboard.press('Control+a'); await pg.keyboard.type('الخريطة في البايو الخريطة'); await pg.waitForTimeout(100);
  await pg.evaluate(()=>BD.commitEdit()); await pg.waitForTimeout(300);
  const w2=await pg.evaluate(()=>{ let n=BD.S.sel[0]; while(n&&!n.getAttr('el')) n=n.getParent(); return n&&n.findOne(c=>c.getAttr('role')==='bg').width(); });
  ok('the pill grows with its words',w2>pill.w+60,[pill.w,w2]);
  /* photo spot */
  await pg.evaluate(()=>CR.addElement('slot')); await pg.waitForTimeout(300);
  ok('photo spot selected shows Add photo',await pg.isVisible('.qbar [data-q="crSlot"]'));
  const [fc]=await Promise.all([pg.waitForEvent('filechooser'),pg.tap('.qbar [data-q="crSlot"]')]); await fc.setFiles(SAMPLES+'pair.jpg'); await pg.waitForTimeout(1200);
  const ph=await pg.evaluate(()=>{ const n=BD.S.sel[0]; return n&&{k:BD.util.kind(n),img:!!n.image(),r:n.cornerRadius(),w:Math.round(n.width())}; });
  ok('the photo takes the spot (size and corners)',ph&&ph.k==='image'&&ph.img&&ph.r===40&&ph.w===756,ph);
  /* Text */
  await pg.tap('#crBar [data-cr="text"]'); await pg.waitForTimeout(300); await pg.keyboard.type('يسرسح ثلج'); await pg.evaluate(()=>BD.commitEdit()); await pg.waitForTimeout(300);
  ok('Text adds words and edits them',await pg.evaluate(()=>BD.main.find('Text').some(t=>t.text()==='يسرسح ثلج'&&t.direction()==='rtl')));
  /* Layers */
  await pg.tap('#crBar [data-cr="layers"]'); await pg.waitForTimeout(300); ok('Layers opens the layer list',await pg.evaluate(()=>document.getElementById('left').classList.contains('open')&&!document.getElementById('layersPane').hidden&&document.querySelectorAll('#layers [data-id]').length>3));
  await pg.tap('#crBar [data-cr="layers"]'); await pg.waitForTimeout(300); ok('tapping it again closes it',await pg.evaluate(()=>!document.getElementById('left').classList.contains('open')));
  /* draft survives a reload */
  await pg.waitForTimeout(2600); const url=pg.url();
  await pg.reload(); await ready(pg); await pg.waitForTimeout(1500);
  ok('reload keeps the draft (pages, photo, words)',await pg.evaluate(()=>BD.util.frames().length===4&&BD.main.find('Image').some(n=>BD.util.kind(n)==='image'&&n.image())&&BD.main.find('Text').some(t=>t.text()==='يسرسح ثلج'))&&pg.url()===url);
  /* hub: Continue editing */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1500);
  ok('the hub lists Create in Continue editing',await pg.evaluate(()=>[...document.querySelectorAll('#continueList .ccard a')].some(a=>/create\.html\?draft=/.test(a.href))));
  ok('the hub lists the Create tool',await pg.evaluate(()=>[...document.querySelectorAll('#toolGrid a')].some(a=>/create\.html$/.test(a.href))));
  await pg.goto(url); await ready(pg); await pg.waitForTimeout(1200);
  /* save to the team, then reopen */
  await pg.tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(400);
  ok('Save opens the save sheet with page picker',await pg.evaluate(()=>document.getElementById('crSheet').dataset.name==='save'&&document.querySelectorAll('#crPP input').length===4));
  await pg.tap('#crTeamOn'); await pg.fill('#crName','Test carousel'); await pg.tap('#crTeamOnly');
  await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('crSt').textContent),null,{timeout:15000});
  const id=await pg.evaluate(()=>new URLSearchParams(location.search).get('design'));
  ok('saved to the team (URL is the design, draft gone)',!!id&&await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:1stchoice:create:'))));
  await pg.evaluate(()=>CR.closeSheet&&CR.closeSheet());
  await pg.goto(BASE+'tools/create.html?design='+id); await ready(pg); await pg.waitForTimeout(1500);
  ok('reopen the saved design with its photo',await pg.evaluate(()=>BD.util.frames().length===4&&BD.main.find('Image').some(n=>BD.util.kind(n)==='image'&&n.image())));
  ok('a saved design is not a draft',await pg.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:1stchoice:create:'))));
  await ctx.close(); }

/* ---------- computer ---------- */
{ const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,'desk');
  await pg.goto(BASE+'tools/create.html?size=story'); await ready(pg); await pg.waitForTimeout(800);
  ok('computer: panels open, Templates + Save in the top bar, no bottom bar',await pg.evaluate(()=>document.getElementById('left').classList.contains('open')&&document.getElementById('right').classList.contains('open')&&getComputedStyle(document.getElementById('crSaveTop')).display!=='none'&&getComputedStyle(document.getElementById('crBar')).display==='none'));
  /* every brand template builds without errors and stays inside its pages */
  const list=await pg.evaluate(()=>CR.templates().map(d=>d.id));
  ok('brand has templates',list.length>=1,list);
  const bad=[];
  for(const id of list){ const r=await pg.evaluate(async id=>{ BD.select([]); BD.main.destroyChildren(); const made=await CR.buildTemplate(id,{at:{x:0,y:0}}); const out={pages:made.length,outside:[]};
      made.forEach(f=>{ const s=BD.util.fsize(f); BD.util.items(f).forEach(n=>{ if(n.getAttr('isBg')) return; const r=n.getClientRect({relativeTo:f}); if(r.x<-2||r.y<-2||r.x+r.width>s.w+2||r.y+r.height>s.h+2) out.outside.push(n.getAttr('label')||BD.util.kind(n)); }); }); return out; },id);
    if(!r.pages||r.outside.length) bad.push({id,...r}); }
  ok('every template builds inside its pages',!bad.length,bad);
  /* save images: full size PNG */
  await pg.goto(BASE+'tools/create.html?tpl='+list[0]); await ready(pg); await pg.waitForTimeout(1500);
  await pg.click('#crSaveTop'); await pg.waitForTimeout(300);
  const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#crGo')]); const f=OUT+'/'+dl.suggestedFilename(); await dl.saveAs(f);
  ok('Save image = 2160×3840 lossless PNG',JSON.stringify(pngSize(f))==='[2160,3840]'&&/\.png$/.test(f),pngSize(f));
  /* save as a team template, then it shows in Templates */
  await pg.click('#crAsTpl'); await pg.waitForFunction(()=>/team template/.test(document.getElementById('crSt').textContent),null,{timeout:15000});
  await pg.click('#crSheetX'); await pg.click('#crTplTop'); await pg.waitForTimeout(800);
  ok('the team template is listed in Templates',await pg.evaluate(()=>document.querySelectorAll('#crTeamT [data-team]').length===1));
  await ctx.close(); }

console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);
