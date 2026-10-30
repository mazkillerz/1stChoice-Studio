/* Studio 1.23.0: "Save pictures" on Home's Continue editing (#contSave) saves a full-quality PNG of every unfinished story.
   1. Computer 1280x800, 2 drafts: button visible, in #continueSec .sec-head, >= 44px, no underline, text "Save pictures";
      tap -> ONE ZIP with 2 PNGs of 2160x3840; dialog ends "Saved!".
   2. Drafts unchanged afterwards (same keys, same at + json); Continue editing still lists 2 cards in the same order.
   3. One draft -> a single .png (not zip), 2160x3840.
   4. A Create draft (record with board) + one real draft -> 1 picture, note says "Create design".
   5. Phone 390x844 touch, light + dark: button on the heading's line, no sideways scroll at 360, text contrast >= 4.5.
   6. Footer #footDev: "phone" on a touch phone, "device" on the computer.
   7. No drafts: #continueSec hidden.   8. No iframe.render-frame left after saving.   9. No page errors.
   Run: server on :8080, then node tests/draft-pictures.mjs (BASE=... to change). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const pngWH=buf=>buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
const isPng=buf=>buf.readUInt32BE(0)===0x89504e47;
function readZip(buf){ const out=[]; let p=0;
  while(buf.readUInt32LE(p)===0x04034b50){ const size=buf.readUInt32LE(p+18), nl=buf.readUInt16LE(p+26), xl=buf.readUInt16LE(p+28);
    out.push({name:buf.slice(p+30,p+30+nl).toString('utf8'),data:buf.slice(p+30+nl+xl,p+30+nl+xl+size)}); p+=30+nl+xl+size; } return out; }
const PHONE={width:390,height:844}, DESK={width:1280,height:800};
const mk=async(vp,{touch=true,scheme='light'}={})=>{
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e)); return pg; };
const draftsOf=pg=>pg.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('studio:draft:')).sort().map(k=>{ const v=JSON.parse(localStorage.getItem(k)); return {k,at:v.at,json:v.json,board:v.board}; }));
/* a real unfinished Restock story (Cans style: no photo needed): open the tool, change the style, wait for the draft write */
async function makeDraft(ctx,{tap=true}={}){
  const pg=await newPage(ctx); const t=s=>pg.$eval(s,e=>e.click());
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug);
  await t('#styles [data-style="photo"]'); await pg.waitForTimeout(900); await t('#styles [data-style="cans"]');
  await pg.waitForFunction(()=>Studio.debug.draftId(),null,{timeout:8000}); await pg.waitForTimeout(1500); await pg.close(); }
const home=async pg=>{ await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>window.Studio); await pg.waitForTimeout(1200); };
const waitH=(pg,re,ms=120000)=>pg.waitForFunction(r=>new RegExp(r).test((document.getElementById('bsH')||{}).textContent||''),re.source,{timeout:ms});
const frames=pg=>pg.$$eval('iframe.render-frame',l=>l.length);

/* ===== 1, 2, 8: computer, two drafts ===== */
tag='desktop: ';
let before;
{ const ctx=await mk(DESK,{touch:false}); await makeDraft(ctx,{tap:false}); await makeDraft(ctx,{tap:false});
  const pg=await newPage(ctx); await home(pg);
  ok('Continue editing shows 2 cards',await pg.$$eval('#continueList .ccard[data-draft]',c=>c.length)===2);
  before=await draftsOf(pg); const order0=await pg.$$eval('#continueList .ccard[data-draft]',c=>c.map(x=>x.dataset.draft));
  ok('two drafts are stored',before.length===2,before.map(x=>x.k));
  const bt=await pg.$eval('#contSave',e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return {t:e.textContent.trim(),h:r.height,w:r.width,u:cs.textDecorationLine,inHead:!!e.closest('#continueSec .sec-head'),tag:e.tagName}; });
  ok('#contSave visible',await pg.isVisible('#contSave'));
  ok('inside #continueSec .sec-head',bt.inHead,bt);
  ok('height >= 44px',bt.h>=44,bt.h);
  ok('no underline',!/underline/.test(bt.u),bt.u);
  ok('text is "Save pictures"',bt.t==='Save pictures',bt.t);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:150000}),pg.click('#contSave')]);
  const name=dl.suggestedFilename(); ok('one ZIP download',/\.zip$/i.test(name),name);
  const z=readZip(fs.readFileSync(await dl.path()));
  ok('ZIP holds 2 PNGs',z.length===2&&z.every(e=>/\.png$/.test(e.name)&&isPng(e.data)),z.map(e=>e.name));
  ok('each PNG is 2160x3840',z.length===2&&z.every(e=>pngWH(e.data)==='2160x3840'),z.map(e=>pngWH(e.data)));
  await waitH(pg,/Saved!/,20000).catch(()=>{});
  ok('dialog ends with "Saved!"',(await pg.textContent('#bsH')).trim()==='Saved!',(await pg.textContent('#bsH')).trim());
  ok('no render frame left (dialog still open)',await frames(pg)===0);
  const after=await draftsOf(pg);
  ok('drafts unchanged: same keys, at and json',JSON.stringify(after)===JSON.stringify(before),{before:before.map(x=>x.at),after:after.map(x=>x.at)});
  if(pg.isClosed()===false){ await pg.click('#bsCancel').catch(()=>{}); }
  await home(pg);
  ok('Continue list still 2 cards, same order',JSON.stringify(await pg.$$eval('#continueList .ccard[data-draft]',c=>c.map(x=>x.dataset.draft)))===JSON.stringify(order0));
  ok('no render frame left after reload',await frames(pg)===0);
  ok('#footDev reads "device" on the computer',(await pg.textContent('#footDev')).trim()==='device');
  await ctx.close(); }

/* ===== 3: one draft -> a single PNG ===== */
{ const ctx=await mk(DESK,{touch:false}); await makeDraft(ctx,{tap:false}); const pg=await newPage(ctx); await home(pg);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:120000}),pg.click('#contSave')]);
  const buf=fs.readFileSync(await dl.path()); const name=dl.suggestedFilename();
  ok('one draft -> a single .png (not zip)',/\.png$/i.test(name)&&isPng(buf),name);
  ok('single PNG is 2160x3840',isPng(buf)&&pngWH(buf)==='2160x3840',isPng(buf)?pngWH(buf):'not a png');
  await waitH(pg,/Saved!/,20000).catch(()=>{});
  ok('no render frame left',await frames(pg)===0);
  await ctx.close(); }

/* ===== 4: a Create draft is skipped ===== */
{ const ctx=await mk(DESK,{touch:false}); await makeDraft(ctx,{tap:false});
  const pg=await newPage(ctx); await pg.goto(BASE+'index.html');
  await pg.evaluate(()=>localStorage.setItem('studio:draft:1stchoice:create:zz1',JSON.stringify({board:'x',at:Date.now()})));
  await home(pg);
  ok('Continue lists the Create draft and the real one',await pg.$$eval('#continueList .ccard[data-draft]',c=>c.length)===2);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:120000}),pg.click('#contSave')]);
  const buf=fs.readFileSync(await dl.path());
  ok('1 picture saved (single PNG)',/\.png$/i.test(dl.suggestedFilename())&&isPng(buf)&&pngWH(buf)==='2160x3840',dl.suggestedFilename());
  await waitH(pg,/Saved!/,20000).catch(()=>{});
  const note=(await pg.textContent('#bsNote')).trim();
  ok('note mentions "Create design"',/Create design/.test(note),note);
  ok('the Create draft record is untouched',await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:draft:1stchoice:create:zz1')).board==='x'));
  await ctx.close(); }

/* ===== 7: no drafts ===== */
{ const ctx=await mk(DESK,{touch:false}); const pg=await newPage(ctx); await home(pg);
  ok('no drafts: #continueSec hidden, button not visible',!(await pg.isVisible('#continueSec'))&&!(await pg.isVisible('#contSave')));
  await ctx.close(); }

/* ===== 5, 6: phone, light + dark ===== */
for(const scheme of ['light','dark']){
  tag='phone '+scheme+': ';
  const ctx=await mk(PHONE,{scheme}); await makeDraft(ctx); const pg=await newPage(ctx); await home(pg);
  ok('#contSave visible',await pg.isVisible('#contSave'));
  const g=await pg.evaluate(()=>{ const bt=document.getElementById('contSave').getBoundingClientRect(), h=document.getElementById('continueH').getBoundingClientRect();
    const cv=document.createElement('canvas').getContext('2d'); const rgb=s=>{ cv.clearRect(0,0,1,1); cv.fillStyle='#000'; cv.fillStyle=s; cv.fillRect(0,0,1,1); const d=cv.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
    let el=document.getElementById('contSave'), bg=[0,0,0,0]; while(el){ bg=rgb(getComputedStyle(el).backgroundColor); if(bg[3]>0.9) break; el=el.parentElement; }
    if(!(bg[3]>0.9)) bg=rgb(getComputedStyle(document.body).backgroundColor);
    const fg=rgb(getComputedStyle(document.getElementById('contSave')).color);
    const L=a=>{ const f=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(a[0])+0.7152*f(a[1])+0.0722*f(a[2]); };
    const l1=L(fg), l2=L(bg);
    return {btTop:bt.top,btBot:bt.bottom,hTop:h.top,hBot:h.bottom,h:bt.height,ratio:(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05),fg,bg}; });
  ok('same line as the heading (centres within 6px, boxes overlap)',Math.abs((g.btTop+g.btBot)/2-(g.hTop+g.hBot)/2)<=6&&g.btTop<g.hBot&&g.btBot>g.hTop,g);
  ok('height >= 44px',g.h>=44,g.h);
  ok('text contrast >= 4.5',g.ratio>=4.5,{ratio:Math.round(g.ratio*100)/100,fg:g.fg,bg:g.bg});
  ok('#footDev reads "phone"',(await pg.textContent('#footDev')).trim()==='phone');
  await pg.setViewportSize({width:360,height:740}); await pg.waitForTimeout(300);
  const sc=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  ok('360 wide: no horizontal page scroll',sc.sw<=sc.cw,sc);
  ok('360 wide: button still visible and inside the screen',await pg.$eval('#contSave',e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.right<=360&&r.left>=0; }));
  await ctx.close(); }
tag='';
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`draft-pictures: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);
