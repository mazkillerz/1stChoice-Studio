/* Studio 1.13.0: "N waiting" on the Restock / Photo story rows. Photos waiting in a tool's row (several photos picked,
   left before the last one) show a small calm tag on that tool's row in Your tools and in All tools; it goes when the
   photos are cleared. Light and dark, phone (list and grid view) and computer; contrast, not a filled button, RTL-safe.
   Also: the low-memory fallback message says "device" on a computer and "phone" on a phone (1.9.0 finding).
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const b=await chromium.launch(); const errs=[];

/* text contrast of an element against its own (opaque) background, colours resolved through a canvas (handles color-mix) */
const contrastOf=el=>{ const cs=getComputedStyle(el), cv=document.createElement('canvas'); cv.width=cv.height=1; const x=cv.getContext('2d',{willReadFrequently:true});
  const rgb=c=>{ x.clearRect(0,0,1,1); x.fillStyle='#fff'; x.fillRect(0,0,1,1); x.fillStyle=c; x.fillRect(0,0,1,1); return [...x.getImageData(0,0,1,1).data].slice(0,3); };
  const lum=([r,g,b])=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  let bgEl=el, bg=cs.backgroundColor; while(bgEl&&/rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(bgEl).backgroundColor)) bgEl=bgEl.parentElement;
  bg=bgEl?getComputedStyle(bgEl).backgroundColor:'#fff';
  const a=lum(rgb(cs.color)), c=lum(rgb(bg)); return +((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2); };

for(const vp of [{name:'phone light',width:390,height:844,touch:true,scheme:'light'},{name:'phone dark',width:390,height:844,touch:true,scheme:'dark'},{name:'desktop',width:1280,height:800,scheme:'light'}]){
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,isMobile:!!vp.touch,hasTouch:!!vp.touch,colorScheme:vp.scheme,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+': '+e));
  const N=vp.name+': ';
  const home=async()=>{ await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>document.querySelector('#toolGrid .tool-item'),null,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(700); };
  const openLib=async()=>{ await pg.evaluate(()=>[...document.querySelectorAll('button,a')].find(e=>/^\s*All tools/.test(e.textContent))?.click()); await pg.waitForSelector('dialog[open] .lib-list',{timeout:5000}).catch(()=>{}); await pg.waitForTimeout(500); };
  const quick=async(tool,files)=>{ await home(); if(!(await pg.$('#toolGrid input[data-quick="'+tool+'"]'))) await openLib();
    await Promise.all([pg.waitForURL(new RegExp(tool+'\\.html')),pg.setInputFiles(`input[data-quick="${tool}"]`,files.map(f=>S+f))]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(400); };
  const tags=sel=>pg.$$eval(sel,l=>l.map(r=>{ const t=r.querySelector('.wait-tag'); return {id:r.dataset.id,txt:t?t.textContent.trim():null}; }));
  const tagOf=async(sel,id)=>((await tags(sel)).find(x=>x.id===id)||{}).txt||null;

  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await home();
  ok(N+'nothing waiting: no tag on any row',(await tags('#toolGrid .tool-item')).every(x=>!x.txt));

  /* three photos for Restock: one in, two waiting */
  await quick('restock',['pair.jpg','shelf.jpg','hands.jpg']);
  await home();
  ok(N+'Your tools: Restock says "2 waiting"',await tagOf('#toolGrid .tool-item','restock')==='2 waiting',JSON.stringify(await tags('#toolGrid .tool-item')));
  const st=await pg.evaluate(contrast=>{ const t=document.querySelector('#toolGrid [data-id="restock"] .wait-tag'), cs=getComputedStyle(t), r=t.getBoundingClientRect(),
      row=t.closest('.tool-item').getBoundingClientRect(), title=t.closest('b').firstChild, rg=document.createRange(); rg.selectNodeContents(title); const tr=rg.getBoundingClientRect();
      const cam=t.closest('.tool-item').querySelector('.row-cam'), cr=cam?cam.getBoundingClientRect():null;
      const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      return {h:Math.round(r.height),w:Math.round(r.width),weight:cs.fontWeight,size:parseFloat(cs.fontSize),bidi:cs.unicodeBidi,ws:cs.whiteSpace,
        tag:t.tagName,inside:r.left>=row.left&&r.right<=row.right,afterTitle:Math.round(r.left)>=Math.round(tr.right)-1&&Math.abs((r.top+r.bottom)/2-(tr.top+tr.bottom)/2)<6,
        clearOfCam:!cr||r.right<=cr.left||r.bottom<=cr.top||r.top>=cr.bottom, bg:cs.backgroundColor, accent, contrast:eval('('+contrast+')')(t), title:t.title}; },contrastOf.toString());
  ok(N+'the tag is small and calm: under 24px tall, weight 400-600, 11-13px text, not a button',st.h<=24&&st.size>=11&&st.size<=13&&+st.weight>=400&&+st.weight<=600&&st.tag==='EM',JSON.stringify(st));
  ok(N+'not filled with the accent (a tint, like the row camera)',!/rgb\(61, 90, 254\)|rgb\(140, 158, 255\)/.test(st.bg),st.bg);
  ok(N+'text contrast >= 4.5:1 on its tint',st.contrast>=4.5,String(st.contrast));
  ok(N+'sits right after the title, inside the row, clear of the camera button',st.inside&&st.afterTitle&&st.clearOfCam,JSON.stringify(st));
  ok(N+'one line, isolated from the text around it (RTL-safe)',st.ws==='nowrap'&&/isolate/.test(st.bidi),st.ws+' '+st.bidi);
  ok(N+'says "2 photos still waiting" on hover / to a reader',st.title==='2 photos still waiting',st.title);

  /* RTL: with the page right to left the tag still reads "2 waiting" and stays inside the title line */
  const rtl=await pg.evaluate(()=>{ document.documentElement.dir='rtl'; const t=document.querySelector('#toolGrid [data-id="restock"] .wait-tag'), r=t.getBoundingClientRect(), row=t.closest('.tool-item').getBoundingClientRect();
    const o={txt:t.textContent, inside:r.left>=row.left&&r.right<=row.right, oneLine:r.height<=24}; document.documentElement.dir=''; return o; });
  ok(N+'right to left: still "2 waiting", one line, inside the row',rtl.txt==='2 waiting'&&rtl.inside&&rtl.oneLine,JSON.stringify(rtl));

  if(vp.touch){
    /* grid view: the tag wraps under the title in the narrow card instead of pushing out of it */
    await pg.evaluate(()=>document.querySelector('[data-view="tools"] button[data-v="grid"]')?.click()); await pg.waitForTimeout(400);
    const g=await pg.evaluate(()=>{ const t=document.querySelector('#toolGrid [data-id="restock"] .wait-tag'), it=t.closest('.tool-item'), r=t.getBoundingClientRect(), c=it.getBoundingClientRect(), b=t.closest('b');
      return {grid:document.getElementById('toolGrid').classList.contains('view-grid'),inside:r.left>=c.left-1&&r.right<=c.right+1,over:b.scrollWidth>b.clientWidth+1,h:Math.round(r.height)}; });
    ok(N+'grid view: the tag stays inside the card, nothing overflows',g.grid&&g.inside&&!g.over&&g.h<=24,JSON.stringify(g));
    await pg.evaluate(()=>document.querySelector('[data-view="tools"] button[data-v="list"]')?.click()); await pg.waitForTimeout(200);
  }

  /* Photo story too (not pinned): two photos, one waiting; it shows in All tools */
  await quick('photo-story',['pair.jpg','shelf.jpg']);
  await home();
  await openLib();
  const lib=await tags('dialog[open] .lib-row');
  ok(N+'All tools: Restock "2 waiting", Photo story "1 waiting", no other tool tagged',(lib.find(x=>x.id==='restock')||{}).txt==='2 waiting'&&(lib.find(x=>x.id==='photo-story')||{}).txt==='1 waiting'&&lib.filter(x=>x.txt).length===2,JSON.stringify(lib.filter(x=>x.txt)));
  const lc=await pg.evaluate(contrast=>{ const t=document.querySelector('dialog[open] .lib-row[data-id="photo-story"] .wait-tag'); return eval('('+contrast+')')(t); },contrastOf.toString());
  ok(N+'All tools: contrast >= 4.5:1 there too',lc>=4.5,String(lc));
  /* pinning a tool redraws the list: the tag comes back with it */
  await pg.evaluate(()=>document.querySelector('dialog[open] [data-pin="photo-story"]').click()); await pg.waitForTimeout(400);
  ok(N+'pinned Photo story: still "1 waiting" in All tools and now on Home',(await tagOf('dialog[open] .lib-row','photo-story'))==='1 waiting'&&(await tagOf('#toolGrid .tool-item','photo-story'))==='1 waiting');
  await pg.evaluate(()=>document.querySelector('dialog[open] [data-pin="photo-story"]').click()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>document.querySelector('#libDone')?.click()); await pg.waitForTimeout(400);

  /* clearing the waiting photos (✕ on the waiting row) takes the tag away at once */
  await pg.evaluate(()=>document.querySelector('.queue-wait[data-queue="restock"] button')?.click()); await pg.waitForTimeout(300);
  ok(N+'✕ on the waiting row: the Restock tag goes',!(await tagOf('#toolGrid .tool-item','restock')));
  await home();
  ok(N+'after a reload: still gone',!(await tagOf('#toolGrid .tool-item','restock')));

  /* 1.22.0: a row with photos waiting continues them in one tap (?queue=1); other rows open the tool as before */
  const hrefs=async sel=>pg.$$eval(sel,l=>l.map(r=>({id:r.dataset.id,href:(r.querySelector('a.tool-row,a.lib-open')||{}).getAttribute?.('href')||''})));
  ok(N+'cleared Restock row opens the tool plainly again (no ?queue=1)',((await hrefs('#toolGrid .tool-item')).find(x=>x.id==='restock')||{}).href.endsWith('restock.html'),JSON.stringify(await hrefs('#toolGrid .tool-item')));
  await openLib();
  const lh=await hrefs('dialog[open] .lib-row');
  ok(N+'All tools: only Photo story (1 waiting) links with ?queue=1',lh.filter(x=>/\?queue=1$/.test(x.href)).map(x=>x.id).join()==='photo-story'&&lh.filter(x=>x.href).every(x=>!/\?.*\?/.test(x.href)),JSON.stringify(lh.filter(x=>/queue/.test(x.href))));
  const went=[]; pg.on('framenavigated',f=>{ if(f===pg.mainFrame()) went.push(f.url()); });
  await pg.evaluate(()=>document.querySelector('dialog[open] .lib-row[data-id="photo-story"] a.lib-open').click());
  await pg.waitForURL(/photo-story\.html/,{timeout:8000}).catch(()=>{}); await pg.waitForTimeout(1800);
  const cont=await pg.evaluate(()=>({url:location.search,bar:document.getElementById('queueBar').hidden,draftBar:document.getElementById('draftBar').hidden}));
  ok(N+'tapping the Photo story row continues the waiting photo at once (no Continue banner, a new story)',went.some(u=>/photo-story\.html\?queue=1$/.test(u))&&cont.bar&&cont.draftBar&&/^\?draft=/.test(cont.url),JSON.stringify({went,cont}));

  /* the low-memory fallback: the full size fails once, the save steps down and says why; "device" on a computer */
  await pg.goto(BASE+'tools/photo-story.html'); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>document.getElementById('draftFresh')?.click());
  await pg.setInputFiles('#pick',S+'pair.jpg'); await pg.waitForTimeout(900);
  await pg.evaluate(()=>{ const tb=HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob=function(cb,...a){ if(this.width>2000) return cb(null); return tb.call(this,cb,...a); }; });
  await pg.evaluate(()=>{ const t=document.getElementById('teamOn'); if(t.checked){ t.checked=false; t.dispatchEvent(new Event('change',{bubbles:true})); } });
  if(vp.touch) await pg.evaluate(()=>{ navigator.canShare=()=>false; });
  await pg.evaluate(()=>document.getElementById('save').click());   // the Save sheet's button (a phone's bar opens the sheet first)
  await pg.waitForFunction(()=>!document.getElementById('doneBox').hidden,null,{timeout:20000}).catch(()=>{});
  const msg=await pg.textContent('#doneTxt').catch(()=>'');
  const want=vp.touch?'This phone was low on memory':'This device was low on memory';
  ok(N+'low memory: the save steps down to 1620×2880 and says "'+(vp.touch?'phone':'device')+'"',msg.includes(want)&&msg.includes('1620×2880'),msg);
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
res.forEach(l=>console.log(l)); const f=res.filter(l=>l.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
