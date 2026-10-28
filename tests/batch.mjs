/* Studio 1.9.0: Save all pages (Carousel, Highlight covers, any tool with `pages`).
   Phone (390x844, touch) and desktop (1280x800), light and dark:
   1. The Save sheet names the count: "Save all 4 slides" (team off) or the note "All 4 slides go to your Photos…" (team on);
      at most two filled buttons on its first view and after saving; "Save this slide only" is still one tap.
   2. Save all renders every page at full quality (carousel 2160x2700), shows "Saving n of 4…", and
      phone: hands all the files to ONE share sheet; desktop: downloads ONE ZIP holding every PNG (CRC checked), named <design>-01.png…
   3. Cancel while saving: nothing is shared or downloaded, nothing goes to the team, the sheet is back to normal.
   4. A phone that can't make the 2x picture steps down to 1.5x for every page and says so.
   5. Highlight covers: adding a cover updates the count on Save.
   Run: server on :8080, then node tests/batch.mjs (BASE=... to change). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const PICS=['pair','closeup','hand','window','tall'].map(n=>S+n+'.jpg');
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!=null&&i!==''?' ('+i+')':'')); };
const pngWH=buf=>buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
/* a stored ZIP (what assets/batch.js writes): name + bytes of every entry, CRC checked */
function readZip(buf){ const out=[]; let p=0; const crcT=new Uint32Array(256).map((_,n)=>{ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; return c>>>0; });
  const crc=b=>{ let c=0xFFFFFFFF; for(const x of b) c=crcT[(c^x)&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  while(buf.readUInt32LE(p)===0x04034b50){ const method=buf.readUInt16LE(p+8), want=buf.readUInt32LE(p+14), size=buf.readUInt32LE(p+18), nl=buf.readUInt16LE(p+26), xl=buf.readUInt16LE(p+28);
    const name=buf.slice(p+30,p+30+nl).toString('utf8'), data=buf.slice(p+30+nl+xl,p+30+nl+xl+size); out.push({name,data,method,crcOk:crc(data)===want}); p+=30+nl+xl+size; }
  const end=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06])); return {entries:out,count:end>=0?buf.readUInt16LE(end+10):-1}; }

/* phones: a fake share sheet that records what it was handed (headless Chromium has none) */
const shareStub=()=>{ window.__shares=[]; navigator.canShare=()=>true;
  navigator.share=async({files})=>{ const list=[]; for(const f of files){ const b=new Uint8Array(await f.slice(0,24).arrayBuffer()); const dv=new DataView(b.buffer); list.push({name:f.name,type:f.type,size:f.size,wh:dv.getUint32(16)+'x'+dv.getUint32(20)}); } window.__shares.push(list); }; };
/* every text the progress line shows */
const watchProgress=()=>{ window.__prog=[]; const t=document.getElementById('progressTxt'); new MutationObserver(()=>{ const s=t.textContent; if(window.__prog[window.__prog.length-1]!==s) window.__prog.push(s); }).observe(t,{childList:true,characterData:true,subtree:true}); };
/* slow every PNG down so Cancel can be tapped mid-way */
const slowPng=ms=>{ const o=HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob=function(cb,...a){ const c=this; if(c.width<1000) return o.call(c,cb,...a); setTimeout(()=>o.call(c,cb,...a),ms); }; };
/* a phone that runs out of memory at 2x: the 2x PNG comes back empty */
const no2x=()=>{ const o=HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob=function(cb,...a){ if(this.width>=2160) return cb(null); return o.call(this,cb,...a); }; };

const b=await chromium.launch(); const errs=[];
for(const [view,vp,mob] of [['phone',{width:390,height:844},true],['desktop',{width:1280,height:800},false]]) for(const scheme of ['light','dark']){
  tag=view+'/'+scheme+': ';
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:mob?2:1,isMobile:mob,hasTouch:mob,colorScheme:scheme,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(mob) await ctx.addInitScript(shareStub);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e));
  const dls=[]; pg.on('download',d=>dls.push(d));
  const tap=sel=>mob?pg.tap(sel):pg.click(sel);
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:welcome','1'); });
  /* a fresh carousel with a photo on every slide */
  const setup=async pg=>{ await pg.goto(BASE+'tools/carousel.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:15000}); await pg.waitForTimeout(1200);
    await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
    const n=await pg.evaluate(()=>Studio.debug.S.P.length);
    for(let p=0;p<n;p++){ await pg.evaluate(p=>document.querySelector(`#pager [data-pg="${p}"]`).click(),p); await pg.waitForTimeout(150); await pg.setInputFiles('#pick',[PICS[p%PICS.length]]); await pg.waitForTimeout(500); }
    await pg.evaluate(()=>document.querySelector('#pager [data-pg="0"]').click()); await pg.evaluate(watchProgress); return n; };
  const n=await setup(pg);
  const openSave=async()=>{ if(mob){ if(!(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open')))){ await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}); await pg.waitForTimeout(300); } } else await pg.evaluate(()=>document.getElementById('save').scrollIntoView({block:'center'})); };
  const filled=()=>pg.$$eval('#sh-save .btn',bs=>bs.filter(x=>x.offsetParent&&!x.classList.contains('ghost')&&getComputedStyle(x).visibility!=='hidden').map(x=>x.textContent.trim()));
  const waitDone=async()=>{ await pg.waitForFunction(()=>!document.getElementById('doneBox').hidden||/Stopped|could not/.test(document.getElementById('status').textContent),null,{timeout:60000}).catch(()=>{}); await pg.waitForTimeout(400); };

  /* 1. first view */
  await openSave();
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{});
  ok('team on: the note names every slide',(await pg.textContent('#photosRow')).includes('All '+n+' slides'),await pg.textContent('#photosRow'));
  ok('team on: the button still says Save & add to team',/Save & add to team/.test(await pg.textContent('#saveTxt')));
  await tap('#teamOn'); await pg.waitForTimeout(200);
  ok('team off: the button says "Save all '+n+' slides"',(await pg.textContent('#saveTxt')).trim()==='Save all '+n+' slides',await pg.textContent('#saveTxt'));
  ok('"Save this slide only" is there',await pg.isVisible('#saveThis'));
  const f1=await filled(); ok('first view: at most two filled buttons',f1.length<=2,f1.join(' | '));

  /* 2. save all */
  await tap('#save'); await waitDone();
  const prog=await pg.evaluate(()=>window.__prog);
  ok('progress counts "Saving n of '+n+'…"',Array.from({length:n},(_,i)=>'Saving '+(i+1)+' of '+n+'…').every(t=>prog.includes(t)),prog.filter(t=>/Saving/.test(t)).join(' / '));
  let base='';
  if(mob){ const sh=await pg.evaluate(()=>window.__shares);
    ok('one share sheet with all '+n+' slides',sh.length===1&&sh[0].length===n,sh.map(x=>x.length).join(','));
    const s0=sh[0]||[]; base=(s0[0]?.name||'').replace(/-01\.png$/,'');
    ok('every slide is a 2160x2700 PNG',s0.length===n&&s0.every(f=>f.type==='image/png'&&f.wh==='2160x2700'&&f.size>10000),s0.map(f=>f.wh).join(', '));
    ok('named <design>-01.png … in order',s0.every((f,i)=>f.name===base+'-'+String(i+1).padStart(2,'0')+'.png')&&!!base,s0.map(f=>f.name).join(' '));
    ok('no downloads on a phone that can share',!dls.length,dls.length);
  } else {
    ok('one download: a ZIP',dls.length===1&&/\.zip$/.test(dls[0].suggestedFilename()),dls.map(d=>d.suggestedFilename()).join(' '));
    const fz=dls[0]?await dls[0].path():null, z=fz?readZip(fs.readFileSync(fz)):{entries:[],count:0}; base=dls[0]?dls[0].suggestedFilename().replace(/\.zip$/,''):'';
    ok('the ZIP holds all '+n+' slides',z.entries.length===n&&z.count===n,z.entries.length+' entries, directory says '+z.count);
    ok('every slide in it is a 2160x2700 PNG, intact',z.entries.length===n&&z.entries.every(e=>e.method===0&&e.crcOk&&e.data.slice(1,4).toString()==='PNG'&&pngWH(e.data)==='2160x2700'),z.entries.map(e=>pngWH(e.data)+(e.crcOk?'':' bad crc')).join(', '));
    ok('named <design>-01.png … in order',z.entries.every((e,i)=>e.name===base+'-'+String(i+1).padStart(2,'0')+'.png'),z.entries.map(e=>e.name).join(' '));
    ok('the done note names the ZIP',/one ZIP/.test(await pg.textContent('#doneBox')),(await pg.textContent('#doneBox')).trim().slice(0,90));
  }
  ok('done: "Saved!"',(await pg.textContent('#doneTitle')).trim()==='Saved!');
  const f2=await filled(); ok('after saving: at most two filled buttons',f2.length<=2,f2.join(' | '));
  ok('after saving: "Save this slide only" is back',await pg.isVisible('#saveThis'));

  /* "Save this slide only": one tap, one file, named after its slide */
  await pg.evaluate(()=>document.querySelector('#pager [data-pg="1"]').click()); await pg.waitForTimeout(250); await openSave();
  const shares0=mob?(await pg.evaluate(()=>window.__shares.length)):dls.length;
  await pg.evaluate(()=>{ const t=document.getElementById('teamName'); t.value='Test slides'; t.dispatchEvent(new Event('input',{bubbles:true})); });   // the name typed for the design names the files
  await tap('#saveThis'); await waitDone();
  if(mob){ const sh=await pg.evaluate(()=>window.__shares); const last=sh[sh.length-1]||[];
    ok('this slide only: one file, slide 2, named after the design',sh.length===shares0+1&&last.length===1&&last[0].name==='Test-slides-02.png'&&last[0].wh==='2160x2700',last.map(f=>f.name+' '+f.wh).join(' ')); }
  else { const d=dls[dls.length-1]; ok('this slide only: one PNG download, slide 2, named after the design',dls.length===shares0+1&&d.suggestedFilename()==='Test-slides-02.png'&&pngWH(fs.readFileSync(await d.path()))==='2160x2700',d&&d.suggestedFilename()); }

  /* 3. cancel: a fresh carousel, team on, slow PNGs, stop after the first slide */
  await setup(pg); await openSave();
  await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{});
  ok('cancel run starts with the team switch on',await pg.isChecked('#teamOn'));
  await pg.evaluate(slowPng,700);
  const before={sh:mob?await pg.evaluate(()=>window.__shares.length):0,dl:dls.length,url:pg.url()};
  await tap('#save');
  await pg.waitForFunction(()=>/Saving 2 of/.test(document.getElementById('progressTxt').textContent),null,{timeout:20000}).catch(()=>{});
  const cb=await pg.$eval('#saveCancel',e=>{ const r=e.getBoundingClientRect(); return {vis:!!e.offsetParent,h:r.height,w:r.width,inView:r.bottom<=innerHeight&&r.top>=0}; });
  ok('Cancel shows while saving, ≥ 48px, on screen',cb.vis&&cb.h>=48&&cb.inView,JSON.stringify(cb));
  await tap('#saveCancel'); await waitDone(); await pg.waitForTimeout(1500);
  ok('cancel: "Stopped. Nothing was saved."',/Stopped\. Nothing was saved\./.test(await pg.textContent('#status')),await pg.textContent('#status'));
  ok('cancel: nothing shared or downloaded',(mob?await pg.evaluate(()=>window.__shares.length):0)===before.sh&&dls.length===before.dl);
  ok('cancel: nothing went to the team',pg.url()===before.url&&!/Saved to the team/.test(await pg.textContent('#teamStatus')||''),pg.url().replace(BASE,''));
  ok('cancel: the sheet is back (Save shown, progress and Cancel gone)',await pg.isVisible('#save')&&!(await pg.isVisible('#progress'))&&!(await pg.isVisible('#saveCancel')));
  const f3=await filled(); ok('after cancel: at most two filled buttons',f3.length<=2,f3.join(' | '));
  await pg.close();

  /* 4. not enough memory for 2x (phones; run once per theme on the phone, once on desktop light) */
  if(mob||scheme==='light'){
    const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push(tag+'fallback: '+e)); const d2=[]; p2.on('download',d=>d2.push(d));
    await p2.addInitScript(no2x);
    await p2.goto(BASE+'tools/highlight.html'); await p2.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:15000}); await p2.waitForTimeout(1200);
    await p2.evaluate(()=>document.getElementById('draftFresh')?.click()); await p2.evaluate(watchProgress);
    const hn=await p2.evaluate(()=>Studio.debug.S.P.length);
    if(mob){ await p2.tap('#barSave'); await p2.waitForSelector('#sh-save.open',{timeout:5000}); await p2.waitForTimeout(300); }
    await p2.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{});
    if(await p2.isChecked('#teamOn')){ mob?await p2.tap('#teamOn'):await p2.click('#teamOn'); await p2.waitForTimeout(200); }
    ok('highlight: "Save all '+hn+' covers"',(await p2.textContent('#saveTxt')).trim()==='Save all '+hn+' covers',await p2.textContent('#saveTxt'));
    await p2.evaluate(()=>document.querySelector('#pager [data-pg="add"]').click()); await p2.waitForTimeout(400);
    ok('adding a cover updates the count',(await p2.textContent('#saveTxt')).trim()==='Save all '+(hn+1)+' covers',await p2.textContent('#saveTxt'));
    mob?await p2.tap('#save'):await p2.click('#save');
    await p2.waitForFunction(()=>!document.getElementById('doneBox').hidden||/could not/.test(document.getElementById('status').textContent),null,{timeout:60000}).catch(()=>{}); await p2.waitForTimeout(600);
    let sizes=[];
    if(mob){ const sh=await p2.evaluate(()=>window.__shares); sizes=(sh[0]||[]).map(f=>f.wh); }
    else if(d2[0]){ const z=readZip(fs.readFileSync(await d2[0].path())); sizes=z.entries.map(e=>pngWH(e.data)); }
    ok('fallback: every cover steps down to 1.5x (1620x2880), none smaller',sizes.length===hn+1&&sizes.every(s=>s==='1620x2880'),sizes.join(', '));
    ok('fallback: the message says it is a little smaller',/a little smaller \(1620×2880\)/.test(await p2.textContent('#doneTxt')),(await p2.textContent('#doneTxt')).trim().slice(0,120));
    await p2.close();
  }
  await ctx.close();
}
tag=''; ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
