/* Studio 0.9.0: share photos from the phone's gallery into Studio (PWA share target, Android).
   The phone POSTs the photos to ./share-target; sw.js keeps them in IndexedDB and opens the hub with ?shared=<n>,
   where a "pick a tool" sheet (same look as +) hands them to the tool like Quick start. Also: the "Last time" tag in +.
   Needs the service worker, so this suite runs with service workers allowed. Server on :8080 (or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];
const man=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
const st=man.share_target||{};
ok('manifest: share target posts photos to ./share-target',st.action==='./share-target'&&st.method==='POST'&&st.enctype==='multipart/form-data'&&st.params.files[0].name==='photos');
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(scheme+': '+e));
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  await pg.evaluate(()=>navigator.serviceWorker.ready); await pg.reload(); await pg.waitForTimeout(600);
  ok(scheme+': the service worker controls the hub',await pg.evaluate(()=>!!navigator.serviceWorker.controller));
  /* + menu: no tag on a new device */
  await pg.tap('#fab'); await pg.waitForTimeout(500);
  ok(scheme+': + shows no "Last time" tag on a new device',(await pg.$$('dialog[open] .fi-tag')).length===0);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  /* share: post photos the way Android does (a form POST navigation) */
  const share=async n=>{ await pg.evaluate(async n=>{ const blob=await (await fetch('brands/1stchoice/samples/beans.jpg')).blob();
      const f=document.createElement('form'); f.method='POST'; f.action='share-target'; f.enctype='multipart/form-data';
      const inp=document.createElement('input'); inp.type='file'; inp.name='photos'; inp.multiple=true;
      const dt=new DataTransfer(); for(let i=0;i<n;i++) dt.items.add(new File([blob],'IMG_'+i+'.jpg',{type:'image/jpeg'})); inp.files=dt.files;
      f.appendChild(inp); document.body.appendChild(f); f.submit(); },n);
    await pg.waitForURL(/index\.html/); await pg.waitForTimeout(900); };
  await share(1);
  ok(scheme+': the address is clean after a share',!/shared=/.test(pg.url()),pg.url());
  ok(scheme+': the pick-a-tool sheet opens',await pg.$eval('dialog[open] #shareH',e=>e.textContent).catch(()=>'')==='Your photo is in');
  ok(scheme+': it shows the shared photo',await pg.$$eval('dialog[open] .share-pics img',l=>l.length&&l.every(i=>i.naturalWidth>0)).catch(()=>false));
  const items=await pg.$$eval('dialog[open] [data-share]',l=>l.map(x=>{ const r=x.getBoundingClientRect(); return {id:x.dataset.share,h:r.height}; }));
  ok(scheme+': the photo tools in the + order',items.map(x=>x.id).join()==='restock,photo-story,collage,carousel,highlight',items.map(x=>x.id).join());
  ok(scheme+': every choice is at least 48px tall',items.every(x=>x.h>=48),items.map(x=>x.h).join());
  await pg.tap('dialog[open] [data-share="restock"]');
  await pg.waitForURL(/restock\.html/); await pg.waitForTimeout(2500);
  const ph=await pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img&&!p.sample; });
  ok(scheme+': Restock opens with the shared photo in',ph);
  ok(scheme+': the shared photo is used up',await pg.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('studio',1); q.onsuccess=()=>{ const g=q.result.transaction('files').objectStore('files').get('studio:shared'); g.onsuccess=()=>r(g.result===undefined); }; })));
  /* several photos: Collage takes them all */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(600);
  await share(3);
  ok(scheme+': three photos: the title counts them',await pg.$eval('dialog[open] #shareH',e=>e.textContent).catch(()=>'')==='3 photos are in');
  ok(scheme+': Collage says it uses all 3',/Uses all 3 photos/.test(await pg.$eval('dialog[open] [data-share="collage"]',e=>e.textContent)));
  ok(scheme+': Restock last time is tagged',/Last time/.test(await pg.$eval('dialog[open] [data-share="restock"]',e=>e.textContent)));
  await pg.tap('dialog[open] [data-share="collage"]'); await pg.waitForURL(/collage\.html/); await pg.waitForTimeout(2500);
  const n=await pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p&&p.img&&!p.sample).length);
  ok(scheme+': Collage opens with the 3 photos',n===3,n);
  /* + menu now tags Collage, order unchanged */
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(600); await pg.tap('#fab'); await pg.waitForTimeout(500);
  const tags=await pg.$$eval('dialog[open] .fab-item',l=>l.map(x=>(x.querySelector('b')||{}).textContent));
  ok(scheme+': + tags the tool used last, order unchanged',tags[0]==='Restock'&&tags[2]==='Collage Last time'&&tags.filter(t=>/Last time/.test(t)).length===1,tags.join('|'));
  await pg.keyboard.press('Escape');
  /* nothing came through: a friendly message, no sheet */
  await pg.goto(BASE+'index.html?shared=0'); await pg.waitForTimeout(900);
  ok(scheme+': nothing shared: a message instead of an empty sheet',!(await pg.$('dialog[open] #shareH'))&&/did not come through/.test(await pg.$eval('#hubToast',e=>e.textContent).catch(()=>'')));
  await ctx.close();
}
await b.close();
for(const e of errs) res.push('FAIL page error: '+e);
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
