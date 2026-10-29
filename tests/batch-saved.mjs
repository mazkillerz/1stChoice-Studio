/* Studio 1.18.0: "Save pictures" for several saved designs at once (Saved page, select mode).
   1. Select bar: #selSave "Save pictures" shows, disabled until a design is ticked, >= 44px, no filled .btn in the bar, label not clipped (390 and 360 wide, with Take out also showing).
   2. Phone: Restock + Photo story + Carousel + a template -> ONE share with Shelf-day.png, Window-light.png (2160x3840), Four-slides-01..04.png (2160x2700);
      "Saving n of 3", "Saved!", "1 template skipped", no iframe left, select mode ends.
   3. Pixel identity: each design saved from its own tool page (Save) has the same bytes as the batch picture.
   4. Duplicate names -> Shelf-day.png and Shelf-day-2.png.   5. A design with a missing photo is skipped with a note.
   6. Only a template -> toast, no dialog.   7. 21 picked -> "Pick up to 20 designs at a time."
   8. Phone that needs a fresh tap: "Ready!" + "Save to Photos" -> "Saved!".   9. Cancel -> "Stopped. Nothing was saved.", nothing shared, no iframe left.
   10. Computer: one ZIP (1stchoice-pictures-YYYYMMDD-HHMM.zip) of the PNGs; a single design -> a single PNG.
   11. Dark: dialog heading readable.   12. No page errors.
   Run: server on :8080, then node tests/batch-saved.mjs (BASE=... to change). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import crypto from 'crypto';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const jpg=n=>'data:image/jpeg;base64,'+fs.readFileSync(S+n+'.jpg').toString('base64');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const pngWH=buf=>buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
function readZip(buf){ const out=[]; let p=0;
  while(buf.readUInt32LE(p)===0x04034b50){ const size=buf.readUInt32LE(p+18), nl=buf.readUInt16LE(p+26), xl=buf.readUInt16LE(p+28);
    out.push({name:buf.slice(p+30,p+30+nl).toString('utf8'),data:buf.slice(p+30+nl+xl,p+30+nl+xl+size)}); p+=30+nl+xl+size; } return out; }

/* ---- seed: real recipes from each tool page ---- */
const PHONE={width:390,height:844}, DESK={width:1280,height:800};
const mk=async(vp,{touch=true,scheme='light',seed,init}={})=>{
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(seed) await ctx.addInitScript(s=>{ try{ if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',s); }catch(e){} },JSON.stringify(seed));
  if(init) await ctx.addInitScript(init);
  return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e)); return pg; };
const db={designs:{},files:{},cols:{Restocks:{id:'Restocks',name:'Restocks',brand:'1stchoice'}}};
{ const ctx=await mk(PHONE); const pg=await newPage(ctx); const pics=['shelf','closeup','hand','pair','window','tall','vase','foam'];
  const rec={};
  for(const tool of ['restock','photo-story','carousel']){ await pg.goto(BASE+'tools/'+tool+'.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug); rec[tool]=await pg.evaluate(()=>Studio.debug.recipe()); }
  const add=(id,tool,name,kind='design',cols=[],missing=false)=>{ const r=JSON.parse(JSON.stringify(rec[tool])); const paths=[];
    if(!missing) r.photos.forEach((p,i)=>{ const k='1stchoice/'+id+'/photo-'+i+'.jpg'; db.files[k]=jpg(pics[i%pics.length]); paths.push(k); });
    r.photos=r.photos.map(p=>({...p,has:true})); db.files['1stchoice/'+id+'/thumb.jpg']=jpg('shelf');
    db.designs[id]={id,brand:'1stchoice',tool,name,kind,recipe:{...r,photoPaths:paths},thumb_path:'1stchoice/'+id+'/thumb.jpg',cols,updated_at:new Date(Date.now()-Object.keys(db.designs).length*3600e3).toISOString()}; };
  add('sRestock','restock','Shelf day','design',['Restocks']); add('sPhoto','photo-story','Window light'); add('sCar','carousel','Four slides','design',['Restocks']);
  add('sRestock2','restock','Shelf day'); add('sTpl','restock','Shelf template','template'); add('sMiss','restock','No photo day','design',[],true);
  await ctx.close(); }
const dbMany=JSON.parse(JSON.stringify(db));
for(let i=0;i<21;i++){ const id='x'+i; dbMany.designs[id]={id,brand:'1stchoice',tool:'restock',name:'Extra '+i,kind:'design',recipe:{photoPaths:[]},thumb_path:'1stchoice/sRestock/thumb.jpg',cols:[],updated_at:new Date(Date.now()-(10+i)*3600e3).toISOString()}; }

/* ---- page helpers ---- */
const SHARE=(mode='ok')=>`window.__shared=null; window.__shareN=0; window.__prog=[]; navigator.canShare=()=>true;
  navigator.share=async o=>{ window.__shareN++; if(${JSON.stringify(mode)}==='needtap'&&window.__shareN===1) throw new DOMException('tap first','NotAllowedError'); window.__shared=o.files; };
  new MutationObserver(()=>{ const t=document.getElementById('bsTxt'); if(t&&window.__prog[window.__prog.length-1]!==t.textContent) window.__prog.push(t.textContent); }).observe(document,{subtree:true,childList:true,characterData:true});`;
const card=id=>`#savedGrid .sv-card[data-id="${id}"] .sv-open`;
const openSaved=async(pg,tap)=>{ await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200); await tap('[data-see-all]'); await pg.waitForTimeout(600); await tap('#selBtn'); await pg.waitForTimeout(300); };
const pick=async(pg,tap,ids)=>{ for(const i of ids) await tap(card(i)); await pg.waitForTimeout(200); };
const hText=pg=>pg.evaluate(()=>(document.getElementById('bsH')||{}).textContent||'');
const waitH=(pg,re,ms=90000)=>pg.waitForFunction(r=>new RegExp(r).test((document.getElementById('bsH')||{}).textContent||''),re.source,{timeout:ms});
const info=pg=>pg.evaluate(async()=>{ const o=[]; for(const f of window.__shared||[]){ const bm=await createImageBitmap(f); o.push({name:f.name,type:f.type,wh:bm.width+'x'+bm.height}); } return o; });
const hashes=pg=>pg.evaluate(async()=>{ const o={}; for(const f of window.__shared||[]){ const h=await crypto.subtle.digest('SHA-256',await f.arrayBuffer()); o[f.name]=[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join(''); } return o; });
const toastText=pg=>pg.evaluate(()=>{ const t=document.getElementById('hubToast'); return t&&!t.hidden?t.textContent:''; });
const GOOD=['sRestock','sPhoto','sCar'];

/* ===== phone, light ===== */
tag='phone: ';
let batchHash={}, batchNames=[];
{ const ctx=await mk(PHONE,{seed:db,init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap);
  /* 1. select bar */
  ok('Save pictures shows in select mode',await pg.isVisible('#selSave'));
  const lab=await pg.$eval('#selSave',e=>({t:e.textContent.trim(),cls:e.className,h:e.getBoundingClientRect().height,dis:e.disabled}));
  ok('label is "Save pictures", a sel-act button, 44px+',lab.t==='Save pictures'&&/sel-act/.test(lab.cls)&&lab.h>=44,lab);
  ok('disabled with nothing ticked',lab.dis);
  ok('no filled .btn inside the select bar',await pg.$$eval('#selBar .btn',l=>l.filter(x=>x.getClientRects().length).length)===0);
  await pick(pg,tap,['sPhoto']); ok('enabled once one is ticked',!(await pg.$eval('#selSave',e=>e.disabled)));
  const clip=()=>pg.$eval('#selSave span',e=>({sw:e.scrollWidth,cw:e.clientWidth}));
  let c=await clip(); ok('label not clipped at 390',c.sw<=c.cw+1,c);
  await tap('#selBtn'); await tap('#selBtn'); /* all -> clear */ await tap('#selBtn');
  await pg.setViewportSize({width:360,height:740}); await tap('#savedBack').catch(()=>{}); await pg.waitForTimeout(300);
  await tap('#colChips [data-f="c:Restocks"]'); await pg.waitForTimeout(300); await tap('#selBtn'); await pg.waitForTimeout(300);
  await pick(pg,tap,['sRestock']);
  ok('Take out shows beside Save pictures (collection chosen)',await pg.isVisible('#selOut')&&await pg.isVisible('#selSave'));
  c=await clip(); ok('label not clipped at 360 with Take out showing',c.sw<=c.cw+1,c);
  ok('360: no filled .btn in the bar',await pg.$$eval('#selBar .btn',l=>l.filter(x=>x.getClientRects().length).length)===0);
  await pg.setViewportSize(PHONE);
  /* 2. the save */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200); await tap('[data-see-all]'); await pg.waitForTimeout(500); await tap('#selBtn');
  await pick(pg,tap,[...GOOD,'sTpl']); await tap('#selSave');
  await pg.waitForSelector('dialog[open] .bs-dlg',{timeout:10000}).catch(()=>{});
  ok('a dialog opens with a hidden render frame',await pg.$('dialog[open] .bs-dlg')!==null);
  await waitH(pg,/Saved!|Ready!|Not saved|Nothing saved/);
  const h=await hText(pg), files=await info(pg), prog=await pg.evaluate(()=>window.__prog), n=await pg.evaluate(()=>window.__shareN);
  ok('share called exactly once',n===1,n);
  const exp={'Shelf-day.png':'2160x3840','Window-light.png':'2160x3840','Four-slides-01.png':'2160x2700','Four-slides-02.png':'2160x2700','Four-slides-03.png':'2160x2700','Four-slides-04.png':'2160x2700'};
  const got=Object.fromEntries(files.map(f=>[f.name,f.wh]));
  ok('files and sizes are exactly right',JSON.stringify(Object.keys(got).sort())===JSON.stringify(Object.keys(exp).sort())&&Object.keys(exp).every(k=>got[k]===exp[k]),got);
  ok('all files are image/png',files.length>0&&files.every(f=>f.type==='image/png'),files.map(f=>f.type).join());
  ok('progress said "Saving n of 3"',prog.some(t=>/Saving \d of 3/.test(t)),prog);
  ok('heading says Saved!',h==='Saved!',h);
  ok('note mentions the skipped template',/1 template skipped/.test(await pg.textContent('#bsNote')),(await pg.textContent('#bsNote')).trim());
  ok('no render iframe left',await pg.$$eval('iframe',l=>l.length)===0);
  ok('select mode ended',!(await pg.evaluate(()=>document.body.classList.contains('selecting'))));
  batchHash=await hashes(pg); batchNames=Object.keys(batchHash);
  /* 3. pixel identity */
  for(const [id,tool,pre] of [['sRestock','restock','Shelf-day'],['sPhoto','photo-story','Window-light'],['sCar','carousel','Four-slides']]){
    const p2=await newPage(ctx); await p2.goto(BASE+'tools/'+tool+'.html?design='+id); await p2.waitForFunction(()=>window.Studio&&Studio.debug); await p2.waitForTimeout(1500);
    await p2.tap('#barSave'); await p2.waitForTimeout(500); await p2.tap('#save'); await p2.waitForFunction(()=>window.__shared,null,{timeout:90000});
    const single=await p2.evaluate(async()=>{ const o=[]; for(const f of window.__shared){ const h=await crypto.subtle.digest('SHA-256',await f.arrayBuffer()); o.push([...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')); } return o; });
    const want=Object.keys(batchHash).filter(k=>k.startsWith(pre)).sort().map(k=>batchHash[k]);
    const same=single.length===want.length&&single.every((x,i)=>x===want[i]);
    let diff=''; if(!same&&want.length===single.length&&single.length) diff='hashes differ; files '+single.length+' vs '+want.length;
    ok('pixel identity: '+tool+' tool Save == batch ('+want.length+' picture'+(want.length===1?'':'s')+')',same&&want.length>0,diff||(want.length?'':'no batch files')); await p2.close(); }
  await ctx.close(); }

/* 4/5/6. names, missing photo, template only */
{ const ctx=await mk(PHONE,{seed:db,init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await pick(pg,tap,['sRestock','sRestock2','sPhoto']); await tap('#selSave'); await waitH(pg,/Saved!|Ready!|Not saved|Nothing saved/);
  ok('duplicate names get -2',(await info(pg)).map(f=>f.name).sort().join()==='Shelf-day-2.png,Shelf-day.png,Window-light.png',(await info(pg)).map(f=>f.name).join());
  await ctx.close(); }
{ const ctx=await mk(PHONE,{seed:db,init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await pick(pg,tap,['sMiss','sPhoto']); await tap('#selSave'); await waitH(pg,/Saved!|Ready!|Not saved|Nothing saved/);
  const f=await info(pg), note=await pg.textContent('#bsNote');
  ok('missing-photo design skipped: one file, note says so',f.length===1&&f[0].name==='Window-light.png'&&/has a photo missing/.test(note),{f:f.map(x=>x.name),note:note.trim()});
  await ctx.close(); }
{ const ctx=await mk(PHONE,{seed:db,init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await pick(pg,tap,['sTpl']); await tap('#selSave'); await pg.waitForTimeout(800);
  ok('template only: a toast, no dialog',(await toastText(pg)).length>0&&await pg.$('dialog[open]')===null&&(await pg.evaluate(()=>window.__shareN))===0,await toastText(pg));
  await ctx.close(); }
/* 7. too many */
{ const ctx=await mk(PHONE,{seed:dbMany,init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await tap('#selBtn'); await tap('#selSave'); await pg.waitForTimeout(700);
  ok('21+ picked: "Pick up to 20 designs at a time."',/Pick up to 20 designs at a time\./.test(await toastText(pg))&&(await pg.evaluate(()=>window.__shareN))===0&&await pg.$('dialog[open]')===null,await toastText(pg));
  await ctx.close(); }
/* 8. needtap */
{ const ctx=await mk(PHONE,{seed:db,init:SHARE('needtap')}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await pick(pg,tap,['sPhoto','sRestock']); await tap('#selSave'); await waitH(pg,/Ready!|Saved!|Not saved/);
  const st=await pg.evaluate(()=>{ const g=document.getElementById('bsGo'); const vis=g&&!g.hidden&&g.getClientRects().length>0;
    const filled=[...document.querySelectorAll('dialog[open] .btn')].filter(x=>x.getClientRects().length&&!x.hidden).map(x=>x.id);
    return {h:document.getElementById('bsH').textContent,vis,t:g&&g.textContent.trim(),filled,n:window.__shareN}; });
  ok('needs a tap: "Ready!" and a Save to Photos button',st.h==='Ready!'&&st.vis&&st.t==='Save to Photos',st);
  ok('Save to Photos is the only filled button',st.filled.join()==='bsGo',st.filled);
  await tap('#bsGo'); await waitH(pg,/Saved!/,20000).catch(()=>{});
  const after=await pg.evaluate(()=>({h:document.getElementById('bsH').textContent,n:window.__shareN,got:!!window.__shared}));
  ok('tapping it shares and ends on "Saved!"',after.h==='Saved!'&&after.n===2&&after.got,after);
  await ctx.close(); }
/* 9. cancel */
{ const ctx=await mk(PHONE,{seed:db,init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await pick(pg,tap,GOOD); await tap('#selSave'); await pg.waitForSelector('#bsCancel',{timeout:10000}); await tap('#bsCancel'); await pg.waitForTimeout(3000);
  ok('Cancel: toast "Stopped. Nothing was saved."',/Stopped\. Nothing was saved\./.test(await toastText(pg)) || await pg.evaluate(()=>/Stopped\. Nothing was saved\./.test(document.getElementById('hubToast').textContent)),await toastText(pg));
  const st=await pg.evaluate(()=>({n:window.__shareN,fr:document.querySelectorAll('iframe.render-frame').length,dlg:document.querySelectorAll('dialog[open]').length}));
  ok('Cancel: nothing shared, no render frame, no dialog',st.n===0&&st.fr===0&&st.dlg===0,st);
  await ctx.close(); }
/* 11. dark */
tag='dark: ';
{ const ctx=await mk(PHONE,{seed:db,scheme:'dark',init:SHARE()}); const pg=await newPage(ctx); const tap=s=>pg.tap(s);
  await openSaved(pg,tap); await pick(pg,tap,['sPhoto']); await tap('#selSave'); await pg.waitForSelector('#bsH',{timeout:10000});
  const c=await pg.evaluate(()=>{ const cv=document.createElement('canvas').getContext('2d'); const rgb=s=>{ cv.clearRect(0,0,1,1); cv.fillStyle='#000'; cv.fillStyle=s; cv.fillRect(0,0,1,1); const d=cv.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
    const h=document.getElementById('bsH'); let bgEl=h, bg=[0,0,0,0]; while(bgEl){ bg=rgb(getComputedStyle(bgEl).backgroundColor); if(bg[3]>0.9) break; bgEl=bgEl.parentElement; }
    const fg=rgb(getComputedStyle(h).color); const L=a=>{ const f=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(a[0])+0.7152*f(a[1])+0.0722*f(a[2]); };
    const l1=L(fg), l2=L(bg); return {fg,bg,ratio:(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05),opaque:bg[3]>0.9}; });
  ok('dark: dialog text differs from its background and is readable (>= 4.5)',c.opaque&&c.fg.join()!==c.bg.join()&&c.ratio>=4.5,c);
  await ctx.close(); }
/* 10. computer */
tag='desktop: ';
{ const ctx=await mk(DESK,{touch:false,seed:db}); const pg=await newPage(ctx); const tap=s=>pg.click(s);
  await openSaved(pg,tap); await pick(pg,tap,['sRestock','sCar']);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:120000}),tap('#selSave')]);
  const name=dl.suggestedFilename(); ok('one ZIP download with a dated name',/^1stchoice-pictures-\d{8}-\d{4}\.zip$/.test(name),name);
  const z=readZip(fs.readFileSync(await dl.path())); const got=Object.fromEntries(z.map(e=>[e.name,pngWH(e.data)]));
  const exp={'Shelf-day.png':'2160x3840','Four-slides-01.png':'2160x2700','Four-slides-02.png':'2160x2700','Four-slides-03.png':'2160x2700','Four-slides-04.png':'2160x2700'};
  ok('ZIP holds the 5 PNGs at the right sizes',JSON.stringify(Object.keys(got).sort())===JSON.stringify(Object.keys(exp).sort())&&Object.keys(exp).every(k=>got[k]===exp[k]),got);
  ok('ZIP pictures match the phone batch bytes',['Shelf-day.png','Four-slides-01.png'].every(k=>{ const e=z.find(x=>x.name===k); return e&&batchHash[k]&&crypto.createHash('sha256').update(e.data).digest('hex')===batchHash[k]; }),'compared with the phone run');
  await pg.waitForTimeout(500);
  await openSaved(pg,tap); await pick(pg,tap,['sRestock']);
  const [d2]=await Promise.all([pg.waitForEvent('download',{timeout:120000}),tap('#selSave')]);
  const b2=fs.readFileSync(await d2.path()); ok('one design -> a single PNG named Shelf-day.png',d2.suggestedFilename()==='Shelf-day.png'&&pngWH(b2)==='2160x3840',d2.suggestedFilename()+' '+pngWH(b2));
  await ctx.close(); }
tag='';
ok('no page errors',!errs.length,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`batch-saved: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-t0)/1000)} s`); process.exit(f?1:0);
