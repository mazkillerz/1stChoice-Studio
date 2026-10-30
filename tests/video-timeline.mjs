/* Video editor, phase 2 (tools/video.html): the timeline editor. Phone 390×844 (touch) in light AND dark, then 360×740 and 1280×800.
   Add a video + a photo (clips lane: 3 blocks, widths follow lengths), scrolling the timeline scrubs, select → context bar, Split, trim the
   photo with its right handle (touch drag), Move later, Delete, Add text (layer bar + Edit sheet), Arabic text (rtl, preview changes),
   drag the text on the preview, animation chips, add sound (bar + waveform), fades, volume/mute, reel Words (2 taps), reel Mix, pinch zoom,
   empty state (?new=1), team save (v2 recipe) and reopen, missing media, export of a 6 s project (frames = 180), no sideways scroll.
   Needs the server on :8080 (npx http-server -p 8080 -c-1 .) and the fixtures in tests/fixtures/reels (vclip.mp4, photo.jpg, music.mp3).
   Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const FX=new URL('fixtures/reels/',import.meta.url).pathname;
const VID=FX+'vclip.mp4', PHOTO=FX+'photo.jpg', MUSIC=FX+'music.mp3';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); process.exit(1); });
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function newPage(vp,scheme,touch){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',acceptDownloads:true,colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); }catch(e){}`});
  const pg=await ctx.newPage(), errs=[];
  pg.on('pageerror',e=>errs.push(String(e.message||e)));
  pg.on('console',m=>{ if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  return {ctx,pg,errs};
}
const ready=async pg=>{ await pg.waitForFunction(()=>window.__video&&window.__video().ready,null,{timeout:60000}); await pg.waitForTimeout(300); };
const V=(pg)=>pg.evaluate(()=>window.__video());
const recipe=async pg=>(await V(pg)).recipe;
const nClips=pg=>pg.evaluate(()=>document.querySelectorAll('#vtClips .vt-clip').length);
const waitClips=(pg,n)=>pg.waitForFunction(n=>document.querySelectorAll('#vtClips .vt-clip').length===n,n,{timeout:30000});
const T=(pg,touch,s)=>touch?pg.tap(s):pg.click(s);
const seek=(pg,t)=>pg.evaluate(t=>{ VD.setT(t); },t);
const filledIn=(pg,root)=>pg.evaluate(root=>{ const probe=document.createElement('i'); probe.style.background='var(--accent)'; document.body.appendChild(probe); const acc=getComputedStyle(probe).backgroundColor; probe.remove();
  return [...document.querySelectorAll(root+' button, '+root+' label.btn')].filter(b=>{ const r=b.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(b).backgroundColor===acc&&!b.hasAttribute('aria-pressed'); }).length; },root);
/* a hash of the preview where a centred text sits (reel px → canvas px) */
const band=pg=>pg.evaluate(()=>{ const c=document.getElementById('vdCv'), k=c.width/1080, d=c.getContext('2d').getImageData(100*k|0,880*k|0,880*k|0,160*k|0).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]*3+d[i+1]*5+d[i+2]*7; return s; });
const touchSeq=async(cdp,pts)=>{ // pts: [[{x,y,id}...] per step]
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts[0]});
  for(let i=1;i<pts.length;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts[i]}); await wait(20); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); };
const dragTouch=(cdp,x1,y1,x2,y2)=>touchSeq(cdp,Array.from({length:9},(_,i)=>[{x:x1+(x2-x1)*i/8,y:y1+(y2-y1)*i/8,id:1}]));
const box=(pg,sel)=>pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2}; },sel);
const blockOf=(pg,kind)=>pg.evaluate(k=>{ const e=document.querySelector('#vtClips .vt-clip.k-'+k); return e?e.dataset.id:null; },kind);
const selectClip=async(pg,touch,id)=>{ const l=await pg.evaluate(id=>{ const L=VD.lay().find(x=>x.c.id===id); return L?(L.start+L.end)/2:0; },id); await seek(pg,l); await pg.waitForTimeout(80); await T(pg,touch,`#vtClips .vt-clip[data-id="${id}"]`); await pg.waitForTimeout(120); };
const geo=pg=>pg.evaluate(()=>{ const pv=document.getElementById('vdPv').getBoundingClientRect(), bar=document.getElementById('bar').getBoundingClientRect(), tl=document.getElementById('vdTl').getBoundingClientRect();
  return {pvh:pv.height/innerHeight,sw:document.documentElement.scrollWidth<=innerWidth,bw:document.body.scrollWidth<=innerWidth,barB:bar.bottom<=innerHeight+1,tlH:tl.height}; });

for(const scheme of ['light','dark']){
  const N=scheme+' phone: ';
  const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
  const cdp=await ctx.newCDPSession(pg);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  const g0=await geo(pg);
  ok(N+'opens ready on the first reel template: one clip, preview ≥ 42% of the height, no sideways scroll',(await nClips(pg))===1&&g0.pvh>=.42&&g0.sw&&g0.bw&&g0.barB,g0);
  const bar0=await pg.$$eval('#bar [data-open]',l=>l.map(b=>b.dataset.open+':'+b.getBoundingClientRect().height));
  ok(N+'the bar has Add, Text, Sound (≥ 48px)',bar0.map(x=>x.split(':')[0]).join()==='add,text,sound'&&bar0.every(x=>+x.split(':')[1]>=48),bar0);
  ok(N+'Save is the only filled button',(await filledIn(pg,'body'))===1,await filledIn(pg,'body'));

  /* add a video and a photo */
  await T(pg,true,'#bar [data-open="add"]'); await pg.waitForSelector('#vdShB input[data-f="media"]',{state:'attached'});
  const addTxt=await pg.evaluate(()=>document.getElementById('vdShB').innerText);
  ok(N+'Add sheet: Clips and photos, Reel template, Music or sound',/Clips and photos/.test(addTxt)&&/Reel template/.test(addTxt)&&/Music or sound/.test(addTxt),addTxt.replace(/\s+/g,' ').slice(0,90));
  const gs=await geo(pg); ok(N+'with a sheet open the preview is still ≥ 40% and the bar stays',gs.pvh>=.4&&gs.barB,gs);
  await pg.setInputFiles('#vdShB input[data-f="media"]',[VID,PHOTO]);
  await waitClips(pg,3); await pg.waitForTimeout(400);
  const r1=await recipe(pg), v1=await V(pg);
  ok(N+'a video and a photo are added after the reel: 3 clips, kinds reel/video/photo, sheet closed',r1.clips.map(c=>c.kind).join()==='reel,video,photo'&&!(await pg.isVisible('#vdSheet'))&&Math.abs(v1.duration-17)<.3,{kinds:r1.clips.map(c=>c.kind),d:v1.duration});
  ok(N+'media is in the recipe (names, types, no file contents)',Object.keys(r1.media).length===2&&Object.values(r1.media).some(m=>m.type==='video'&&m.name==='vclip.mp4')&&JSON.stringify(r1).length<3000);
  const ws=await pg.$$eval('#vtClips .vt-clip',l=>l.map(e=>({w:e.getBoundingClientRect().width,id:e.dataset.id})));
  const lens=await pg.evaluate(()=>VD.lay().map(x=>x.end-x.start)), pps=(await V(pg)).pps;
  ok(N+'the clips lane shows 3 blocks with widths ∝ length (width ≈ length × px/s − 2)',ws.length===3&&ws.every((w,i)=>Math.abs(w.w-(lens[i]*pps-2))<2),{ws:ws.map(w=>Math.round(w.w)),lens,pps});
  await pg.waitForTimeout(800);
  /* thumbnails are made lazily: only for blocks in view, so scroll to each block in turn (the playhead at its middle) */
  const th=[]; for(const l of await pg.evaluate(()=>VD.lay().map(x=>({id:x.c.id,mid:(x.start+x.end)/2})))){ await seek(pg,l.mid); await pg.waitForTimeout(1100);
    th.push(await pg.evaluate(id=>{ const b=document.querySelector('#vtClips .vt-clip[data-id="'+id+'"]'), c=b&&b.querySelector('canvas.vt-th'); if(!c) return -1; const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=40) if(d[i]>0) n++; return n; },l.id)); }
  await seek(pg,0);
  ok(N+'each block is filled with thumbnails once it is in view',th.every(n=>n>20),th);

  /* scrolling scrubs */
  await seek(pg,0); await pg.waitForTimeout(100);
  const tb=await box(pg,'#vtTexts');
  await dragTouch(cdp,tb.x+300,tb.cy,tb.x+100,tb.cy); await pg.waitForTimeout(400);
  const sc1=await pg.evaluate(()=>({t:window.__video().t,sl:document.getElementById('vtScroll').scrollLeft,pps:window.__video().pps,now:document.getElementById('vdNow').textContent}));
  ok(N+'scrolling the timeline changes the time (t = scrollLeft / px per s)',sc1.t>1.2&&Math.abs(sc1.t-sc1.sl/sc1.pps)<.05&&sc1.now!=='0:00.0',sc1);
  await seek(pg,0); await pg.waitForTimeout(100);
  ok(N+'time 0 puts the start under the playhead (scrollLeft 0)',(await pg.evaluate(()=>document.getElementById('vtScroll').scrollLeft))<2);
  await pg.evaluate(()=>VD.setT(VD.dur())); await pg.waitForTimeout(100);
  const endSl=await pg.evaluate(()=>({sl:document.getElementById('vtScroll').scrollLeft,max:document.getElementById('vtScroll').scrollWidth-document.getElementById('vtScroll').clientWidth,add:document.getElementById('vtAdd').getBoundingClientRect().right<=innerWidth+1}));
  ok(N+'the end reaches the playhead and the + button is on screen',Math.abs(endSl.sl-endSl.max)<3&&endSl.add,endSl);
  ok(N+'the ruler shows second ticks',(await pg.$$eval('#vtRuler i',l=>l.length))>=10);
  await seek(pg,0);

  /* select the video → context bar */
  const vid=await blockOf(pg,'video'), pho=await blockOf(pg,'photo'), reel=await blockOf(pg,'reel');
  await selectClip(pg,true,vid);
  const cb=await pg.evaluate(()=>({labels:[...document.querySelectorAll('#bar .vd-bb')].map(b=>b.innerText.trim()),h:[...document.querySelectorAll('#bar .vd-bb')].map(b=>Math.round(b.getBoundingClientRect().height)),sel:!!document.querySelector('#vtClips .vt-clip.sel'),hs:[...document.querySelectorAll('#vtClips .sel .vt-h')].map(h=>{ const r=h.getBoundingClientRect(), a=getComputedStyle(h,'::before'); return {w:Math.round(r.width),hit:Math.round(r.width+Math.abs(parseFloat(a.left))+Math.abs(parseFloat(a.right)))}; }),ov:document.getElementById('bar').scrollWidth>document.getElementById('bar').clientWidth}));
  ok(N+'selecting the video: accent outline, two edge handles (16px, hit ≥ 44px), context bar: Done, Volume, Split, Earlier, Later, Delete',cb.sel&&cb.hs.length===2&&cb.hs.every(h=>h.w===16&&h.hit>=44)&&cb.labels.join()==='Done,Volume,Split,Earlier,Later,Delete'&&cb.h.every(h=>h>=48),cb);
  ok(N+'Split is off while the playhead is at the clip middle? no: on (inside), Earlier is on',await pg.evaluate(()=>!document.querySelector('[data-do="split"]').disabled&&!document.querySelector('[data-do="earlier"]').disabled));
  await seek(pg,10.1); await pg.waitForTimeout(60);
  ok(N+'Split is disabled within 0.2 s of the clip start',await pg.evaluate(()=>{ VD.renderBar(); return document.querySelector('[data-do="split"]').disabled; }));

  /* volume */
  await T(pg,true,'#bar [data-open="vol"]'); await pg.waitForSelector('#vdShB [data-r="db"]');
  await pg.evaluate(()=>{ const s=document.querySelector('#vdShB [data-r="db"]'); s.value='-6'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  await pg.tap('#vdShB [data-mute]'); await pg.waitForTimeout(150);
  const vr=(await recipe(pg)).clips.find(c=>c.id===vid);
  ok(N+'video Volume sheet: slider −24..+6 changes db, Mute sets mute',vr.db===-6&&vr.mute===true&&await pg.evaluate(()=>document.querySelector('#vdShB [data-r="db"]').min==='-24'&&document.querySelector('#vdShB [data-r="db"]').max==='6'),vr);
  await pg.tap('#vdShX'); await pg.waitForTimeout(150);
  ok(N+'Done closes the sheet and keeps the selection',!(await pg.isVisible('#vdSheet'))&&await pg.evaluate(()=>!!document.querySelector('#vtClips .vt-clip.sel')));

  /* split at the playhead */
  const d0=(await V(pg)).duration;
  await seek(pg,12); await pg.waitForTimeout(60);
  await pg.evaluate(()=>VD.renderBar()); await pg.tap('#bar [data-do="split"]'); await pg.waitForTimeout(300);
  ok(N+'Split at the playhead: 4 blocks, duration unchanged',(await nClips(pg))===4&&Math.abs((await V(pg)).duration-d0)<.01,{n:await nClips(pg),d0,d:(await V(pg)).duration});
  const kinds4=(await recipe(pg)).clips.map(c=>c.kind+(c.in!=null?':'+(+c.in).toFixed(1)+'-'+(+c.out).toFixed(1):''));
  ok(N+'the two halves play 0–2 s and 2–4 s of the same file',kinds4[1]==='video:0.0-2.0'&&kinds4[2]==='video:2.0-4.0',kinds4);

  /* trim the photo with its right handle (touch drag) */
  const phoId=(await recipe(pg)).clips[3].id;
  await selectClip(pg,true,phoId);
  const dBefore=(await recipe(pg)).clips[3].dur, h=await box(pg,`#vtClips .vt-clip[data-id="${phoId}"] .vt-h.r`);
  await dragTouch(cdp,h.cx,h.cy,h.cx-70,h.cy); await pg.waitForTimeout(400);
  const dAfter=(await recipe(pg)).clips[3].dur, dTot=(await V(pg)).duration;
  ok(N+'dragging the photo’s right handle left makes it shorter (≈ 70 px ÷ px/s) and the video shorter',dAfter<dBefore-.3&&dAfter>=.5&&Math.abs(dTot-(d0-(dBefore-dAfter)))<.05,{dBefore,dAfter,dTot});
  await T(pg,true,'#bar [data-open="len"]'); await pg.waitForSelector('#vdShB [data-r="dur"]');
  await pg.evaluate(()=>{ const s=document.querySelector('#vdShB [data-r="dur"]'); s.value='4.5'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  const lenR=(await recipe(pg)).clips[3].dur; ok(N+'photo Length sheet (0.5–15 s) sets the length',lenR===4.5&&await pg.evaluate(()=>document.querySelector('#vdShB [data-r="dur"]').min==='0.5'&&document.querySelector('#vdShB [data-r="dur"]').max==='15'),lenR);
  await pg.tap('#vdShX'); await T(pg,true,'#bar [data-open="zoom"]'); await pg.waitForSelector('#vdShB .switch');
  const z0=(await recipe(pg)).clips[3].motion; await pg.tap('#vdShB .switch'); const z1=(await recipe(pg)).clips[3].motion;
  ok(N+'photo Zoom: Slow zoom switch toggles the motion',z0==='zoom'&&z1==='none',[z0,z1]);
  await pg.tap('#vdShX');

  /* move later */
  const before=(await recipe(pg)).clips.map(c=>c.id);
  await selectClip(pg,true,before[1]); await pg.tap('#bar [data-do="later"]'); await pg.waitForTimeout(300);
  const after=(await recipe(pg)).clips.map(c=>c.id);
  ok(N+'Move later swaps the clip with the next one',after[1]===before[2]&&after[2]===before[1],{before,after});
  /* long-press then drag reorders (touch) */
  const idA=after[2]; for(let i=0;i<3;i++) await pg.tap('#vdZoomOut'); await selectClip(pg,true,idA);
  const bx=await box(pg,`#vtClips .vt-clip[data-id="${idA}"]`), ord0=after.join();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bx.cx,y:bx.cy,id:1}]}); await wait(520);
  for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bx.cx-bx.w*1.3*i/8,y:bx.cy,id:1}]}); await wait(25); }
  const lifted=await pg.evaluate(()=>!!document.querySelector('.vt-clip.lift')&&!document.querySelector('.vt-snap').hidden);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(300);
  const ord1=(await recipe(pg)).clips.map(c=>c.id).join();
  ok(N+'press-and-hold, drag: the block lifts with a drop line and the clip moves earlier',lifted&&ord1!==ord0&&ord1.split(',').indexOf(idA)<ord0.split(',').indexOf(idA),{lifted,ord0,ord1});

  /* delete */
  await selectClip(pg,true,(await recipe(pg)).clips[3].id); await pg.tap('#bar [data-do="del"]'); await pg.waitForTimeout(300);
  const n3=await nClips(pg), toast=await pg.evaluate(()=>{ const t=document.getElementById('vdToast'); return t&&!t.hidden?t.innerText.replace(/\s+/g,' '):''; });
  ok(N+'Delete removes the clip (3 blocks), the bar returns to Add/Text/Sound, a toast offers Undo',n3===3&&/Undo/.test(toast)&&await pg.$$eval('#bar [data-open]',l=>l.length)===3,{n3,toast});
  await pg.tap('#vdToast [data-undo]'); await pg.waitForTimeout(300);
  ok(N+'Undo brings the clip back',(await nClips(pg))===4);
  await selectClip(pg,true,(await recipe(pg)).clips[3].id); await pg.tap('#bar [data-do="del"]'); await pg.waitForTimeout(300);

  /* Add text: a layer bar and the Edit sheet */
  await seek(pg,2); await pg.waitForTimeout(80);
  await T(pg,true,'#bar [data-open="text"]'); await pg.waitForSelector('#vdShB [data-addtxt]');
  const ts=await pg.evaluate(()=>({inputs:document.querySelectorAll('#vdShB .vd-slot input').length,addLink:document.querySelector('[data-addtxt]').className}));
  ok(N+'Text sheet: the reel’s words first, then Add text as a link',ts.inputs>=1&&/link/.test(ts.addLink),ts);
  await pg.tap('[data-addtxt]'); await pg.waitForSelector('#vdTx'); await pg.waitForTimeout(250);
  const tx0=(await recipe(pg)).texts[0], tbar=await pg.$$eval('#vtTexts .vt-text',l=>l.map(e=>e.innerText));
  ok(N+'Add text: a 2.5 s layer at the playhead (size 96, display font, pop in, fade out) with a bar on the Text lane and the Edit sheet open',tx0&&Math.abs(tx0.start-2)<.05&&Math.abs(tx0.end-tx0.start-2.5)<.05&&tx0.size===96&&tx0.font==='display'&&tx0.in==='pop'&&tx0.out==='fade'&&tbar.length===1&&await pg.isVisible('#vdTx'),{tx0,tbar});
  const sh=await pg.evaluate(()=>({labels:[...document.querySelectorAll('#vdShB h3')].map(h=>h.textContent),btns:[...document.querySelectorAll('#vdShB [data-at]')].map(b=>b.textContent),times:[...document.querySelectorAll('#vdShB bdi')].map(b=>b.textContent),sw:document.querySelectorAll('#vdShB .vd-sw').length}));
  ok(N+'Edit sheet: colour, font, size, box, animations in/out, timing with Start/End at playhead',['Colour','Font','Animation in','Animation out','Timing'].every(x=>sh.labels.includes(x))&&sh.btns.join()==='Start at playhead,End at playhead'&&sh.sw>=6,sh);
  const gE=await geo(pg); ok(N+'Edit sheet open: preview still ≥ 38% of the height',gE.pvh>=.38,gE);
  await seek(pg,2.7); await pg.waitForTimeout(250);
  const bBefore=await band(pg);
  await pg.fill('#vdTx','أهلاً بكم في كولد برو'); await pg.waitForTimeout(300);
  const ar=await pg.evaluate(()=>{ const t=document.getElementById('vdTx'); return {rtl:t.matches(':dir(rtl)'),dir:t.getAttribute('dir'),bar:document.querySelector('#vtTexts .vt-t').matches(':dir(rtl)')}; });
  const bAfter=await band(pg);
  ok(N+'Arabic text: the box is dir=auto and right to left, the bar label too, the preview changes at the layer',ar.rtl&&ar.dir==='auto'&&ar.bar&&bBefore!==bAfter,{ar,bBefore,bAfter});
  ok(N+'the recipe holds the Arabic words',(await recipe(pg)).texts[0].value==='أهلاً بكم في كولد برو');
  /* animation chips */
  await pg.tap('#vdShB [data-chip="in"][data-v="slide"]'); await pg.tap('#vdShB [data-chip="out"][data-v="pop"]'); await pg.waitForTimeout(100);
  const tr=(await recipe(pg)).texts[0]; ok(N+'animation chips change the recipe (in slide, out pop) and show the pressed state',tr.in==='slide'&&tr.out==='pop'&&await pg.evaluate(()=>document.querySelector('[data-chip="in"][data-v="slide"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-chip="in"][data-v="pop"]').getAttribute('aria-pressed')==='false'),tr);
  await pg.tap('#vdShB [data-chip="font"][data-v="body"]'); await pg.tap('#vdShB [data-chip="in"][data-v="none"]'); await pg.tap('#vdShB [data-chip="out"][data-v="none"]');
  await pg.evaluate(()=>{ const s=document.querySelector('#vdShB [data-r="size"]'); s.value='140'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  await pg.tap('#vdShB .vd-sw[data-sw="color"]:nth-child(3)');
  const t2=(await recipe(pg)).texts[0]; ok(N+'font chip, size slider and colour swatch change the recipe',t2.font==='body'&&t2.size===140&&/^#/.test(t2.color)&&t2.color!==tx0.color,t2);
  await pg.tap('#vdShB .vd-sw[data-sw="color"]:nth-child(2)');
  await pg.evaluate(()=>{ document.getElementById('vdShB').scrollTop=9999; }); await pg.tap('#vdBoxSec .switch'); await pg.waitForTimeout(100);
  ok(N+'Box behind switch sets a colour (and shows colours)',!!(await recipe(pg)).texts[0].box&&await pg.isVisible('#vdBoxCols'),(await recipe(pg)).texts[0].box);
  await seek(pg,3.2); await pg.tap('#vdShB [data-at="end"]'); await pg.waitForTimeout(80);
  const t3=(await recipe(pg)).texts[0]; ok(N+'End at playhead sets the end to the playhead',Math.abs(t3.end-3.2)<.05,t3);
  await pg.tap('#vdShX');

  /* drag the text on the preview */
  await seek(pg,2.8); await pg.waitForTimeout(250);
  const info=await pg.evaluate(()=>{ const P=VD.st.P, tx=VD.st.R.texts[0], b=P.textBox(tx.id), r=document.getElementById('vdPv').getBoundingClientRect(); return {x:tx.x,y:tx.y,k:r.width/1080,l:r.left,t:r.top,cx:r.left+(b.x+b.w/2)*r.width/1080,cy:r.top+(b.y+b.h/2)*r.height/1920}; });
  await T(pg,true,`#vdOver`).catch(()=>{});
  await dragTouch(cdp,info.cx,info.cy,info.cx+50,info.cy+80); await pg.waitForTimeout(300);
  const m1=(await recipe(pg)).texts[0];
  ok(N+'dragging the text on the preview moves it (x/y change by the drag ÷ scale)',Math.abs((m1.x-info.x)-50/info.k)<25&&Math.abs((m1.y-info.y)-80/info.k)<25&&m1.x!==info.x,{from:[info.x,info.y],to:[m1.x,m1.y]});
  ok(N+'a text selected on the preview shows its outline and the bar switches to Edit/Duplicate/Delete',await pg.evaluate(()=>!document.getElementById('vdSelBox').hidden)&&(await pg.$$eval('#bar .vd-bb',l=>l.map(b=>b.innerText.trim()))).join()==='Done,Edit,Duplicate,Delete');
  /* snapping to the centre lines */
  const info2=await pg.evaluate(()=>{ const tx=VD.st.R.texts[0], b=VD.st.P.textBox(tx.id), r=document.getElementById('vdPv').getBoundingClientRect(); return {x:tx.x,y:tx.y,k:r.width/1080,cx:r.left+(b.x+b.w/2)*r.width/1080,cy:r.top+(b.y+b.h/2)*r.height/1920}; });
  let guideSeen=false; const dxs=(540-info2.x)*info2.k+2.5, dys=(960-info2.y)*info2.k-2.5;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:info2.cx,y:info2.cy,id:1}]});
  for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:info2.cx+dxs*i/8,y:info2.cy+dys*i/8,id:1}]}); await wait(20); }
  guideSeen=await pg.evaluate(()=>!document.getElementById('vdGx').hidden&&!document.getElementById('vdGy').hidden);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(250);
  const m2=(await recipe(pg)).texts[0]; ok(N+'moving within 8 px of the middle snaps to x=540 and y=960 and shows both guide lines',m2.x===540&&m2.y===960&&guideSeen,{m2:[m2.x,m2.y],guideSeen});
  /* double tap opens Edit */
  await seek(pg,2.8); await pg.waitForTimeout(250);
  const c2=await pg.evaluate(()=>{ const tx=VD.st.R.texts[0], b=VD.st.P.textBox(tx.id), r=document.getElementById('vdPv').getBoundingClientRect(); return {cx:r.left+(b.x+b.w/2)*r.width/1080,cy:r.top+(b.y+b.h/2)*r.height/1920}; });
  await pg.touchscreen.tap(c2.cx,c2.cy); await pg.waitForTimeout(80); await pg.touchscreen.tap(c2.cx,c2.cy); await pg.waitForTimeout(300);
  ok(N+'double-tapping the text on the preview opens the Edit sheet',await pg.isVisible('#vdTx'));
  await pg.tap('#vdShX');
  /* text bar: drag the body when selected, trim with the handle */
  await selectClip(pg,true,(await recipe(pg)).clips[0].id); await pg.evaluate(()=>VD.select({kind:'text',id:VD.st.R.texts[0].id})); await pg.waitForTimeout(100);
  const tbx=await pg.evaluate(()=>{ const t=VD.st.R.texts[0]; VD.setT((t.start+t.end)/2); return t; }); await pg.waitForTimeout(100);
  const tbb=await box(pg,'#vtTexts .vt-text.sel'); await dragTouch(cdp,tbb.cx,tbb.cy,tbb.cx+40,tbb.cy); await pg.waitForTimeout(300);
  const tm=(await recipe(pg)).texts[0]; ok(N+'dragging a selected text bar moves it in time, keeping its length',tm.start>tbx.start+.1&&Math.abs((tm.end-tm.start)-(tbx.end-tbx.start))<.02,{from:tbx.start,to:tm.start});
  const th2=await box(pg,'#vtTexts .vt-text.sel .vt-h.r'); const e0=tm.end; await dragTouch(cdp,th2.cx,th2.cy,th2.cx-30,th2.cy); await pg.waitForTimeout(300);
  ok(N+'the text bar’s right handle trims its end',(await recipe(pg)).texts[0].end<e0-.1,{e0,e1:(await recipe(pg)).texts[0].end});

  /* sound */
  await pg.evaluate(()=>VD.select(null)); await seek(pg,1);
  await T(pg,true,'#bar [data-open="sound"]'); await pg.waitForSelector('#vdShB input[data-f="audio"]',{state:'attached'});
  await pg.setInputFiles('#vdShB input[data-f="audio"]',[MUSIC]); await pg.waitForSelector('#vtAudios .vt-audio',{timeout:20000}); await pg.waitForTimeout(1200);
  const au=await pg.evaluate(()=>{ const a=VD.st.R.audio[0], c=document.querySelector('#vtAudios .vt-audio canvas.vt-th'); let n=0; if(c){ const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=16) if(d[i]>0) n++; } return {a,n,w:document.querySelector('#vtAudios .vt-audio').getBoundingClientRect().height,media:VD.st.R.media[a.media]}; });
  ok(N+'Add music: an audio bar (28px) with a waveform, placed at the playhead, name kept',au.a&&Math.abs(au.a.start-1)<.05&&au.n>30&&au.w===28&&au.media.name==='music.mp3'&&au.media.type==='audio',au);
  await T(pg,true,'#bar [data-open="sound"]'); await pg.waitForSelector('#vdShB [data-tmute]');
  ok(N+'the Sound sheet lists your sound (mute + volume) and the reel mix',await pg.evaluate(()=>!!document.querySelector('#vdShB [data-tmute]')&&!!document.querySelector('#vdShB [data-tdb]')),'');
  await pg.waitForSelector('#vdShB .vd-row[data-id="hood"]',{timeout:15000});
  await pg.tap('#vdShB .vd-row[data-id="hood"] [data-mute]'); await pg.waitForTimeout(100);
  ok(N+'reel Mix in the Sound sheet: muting Hood slap is saved on the reel clip',(await recipe(pg)).clips[0].mix.hood&&(await recipe(pg)).clips[0].mix.hood.mute===true);
  await pg.tap('#vdShB .vd-row[data-id="hood"] [data-mute]');
  await pg.evaluate(()=>{ const s=document.querySelector('#vdShB [data-tdb]'); s.value='-9'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  await pg.tap('#vdShB [data-tmute]'); await pg.waitForTimeout(100);
  const a1=(await recipe(pg)).audio[0]; ok(N+'your sound: volume −9 dB and mute from the Sound sheet',a1.db===-9&&a1.mute===true,a1); await pg.tap('#vdShB [data-tmute]'); await pg.tap('#vdShX');
  /* select the audio bar → Fades, Volume, Split */
  const aid=a1.id; await pg.evaluate(id=>{ const a=VD.st.R.audio[0]; VD.setT(a.start+(a.out-a.in)/2); },aid); await pg.waitForTimeout(100);
  await T(pg,true,`#vtAudios .vt-audio[data-id="${aid}"]`); await pg.waitForTimeout(150);
  const ab=await pg.$$eval('#bar .vd-bb',l=>l.map(b=>b.innerText.trim()));
  ok(N+'selecting the audio bar: Done, Volume, Fades, Split, Delete',ab.join()==='Done,Volume,Fades,Split,Delete',ab);
  await pg.tap('#bar [data-open="fades"]'); await pg.waitForSelector('#vdShB [data-r="fadeIn"]');
  await pg.evaluate(()=>{ for(const [k,v] of [['fadeIn','1.5'],['fadeOut','2']]){ const s=document.querySelector(`#vdShB [data-r="${k}"]`); s.value=v; s.dispatchEvent(new Event('input',{bubbles:true})); } });
  const fa=(await recipe(pg)).audio[0]; ok(N+'Fades sliders (0–3 s) change fadeIn and fadeOut',fa.fadeIn===1.5&&fa.fadeOut===2&&await pg.evaluate(()=>document.querySelector('[data-r="fadeIn"]').max==='3'),fa);
  await pg.tap('#vdShX'); await pg.tap('#bar [data-open="vol"]'); await pg.waitForSelector('#vdShB [data-r="db"]');
  await pg.evaluate(()=>{ const s=document.querySelector('#vdShB [data-r="db"]'); s.value='-12'; s.dispatchEvent(new Event('input',{bubbles:true})); }); await pg.tap('#vdShB [data-mute]');
  const va=(await recipe(pg)).audio[0]; ok(N+'sound Volume sheet: slider and mute change the recipe',va.db===-12&&va.mute===true,va); await pg.tap('#vdShB [data-mute]'); await pg.tap('#vdShX');
  await pg.evaluate(()=>{ const a=VD.st.R.audio[0]; VD.setT(a.start+(a.out-a.in)/2); }); await pg.evaluate(()=>VD.renderBar()); await pg.tap('#bar [data-do="split"]'); await pg.waitForTimeout(250);
  ok(N+'Split on a sound makes two bars; the fade-out moves to the second',(await pg.$$eval('#vtAudios .vt-audio',l=>l.length))===2&&(await recipe(pg)).audio[1].fadeOut===2&&(await recipe(pg)).audio[0].fadeOut===0,'');
  /* trim audio with handle: right handle shorter */
  const a0=(await recipe(pg)).audio[0]; await pg.evaluate(()=>VD.select({kind:'audio',id:VD.st.R.audio[0].id})); await pg.evaluate(()=>{ const a=VD.st.R.audio[0]; VD.setT(a.start+(a.out-a.in)/2); }); await pg.waitForTimeout(100);
  const ah=await box(pg,'#vtAudios .vt-audio.sel .vt-h.r'); if(ah){ await dragTouch(cdp,ah.cx,ah.cy,ah.cx-20,ah.cy); await pg.waitForTimeout(300); }
  ok(N+'the audio bar’s right handle trims its out point',ah&&(await recipe(pg)).audio[0].out<a0.out-.05,{a0:a0.out,a:(await recipe(pg)).audio[0].out});

  /* zoom */
  const p0=(await V(pg)).pps; await pg.tap('#vdZoomIn'); await pg.waitForTimeout(100); const p1=(await V(pg)).pps; await pg.tap('#vdZoomOut'); await pg.tap('#vdZoomOut'); const p2=(await V(pg)).pps;
  ok(N+'Zoom in / out buttons change the scale within 20–240 px/s, the playhead time stays',p1>p0&&p2<p1&&p2>=20&&p1<=240,{p0,p1,p2});
  const t0z=(await V(pg)).t, tl=await box(pg,'#vtScroll'), y=tl.y+tl.h-14;
  await touchSeq(cdp,[[{x:tl.cx-40,y,id:1},{x:tl.cx+40,y,id:2}],[{x:tl.cx-60,y,id:1},{x:tl.cx+60,y,id:2}],[{x:tl.cx-90,y,id:1},{x:tl.cx+90,y,id:2}],[{x:tl.cx-120,y,id:1},{x:tl.cx+120,y,id:2}]]);
  await pg.waitForTimeout(200); const p3=(await V(pg)).pps;
  ok(N+'pinching the timeline zooms in',p3>p2*1.5&&Math.abs((await V(pg)).t-t0z)<.1,{p2,p3});
  await pg.evaluate(()=>document.getElementById('bar').scrollWidth);
  ok(N+'no errors so far',errs.length===0,errs.slice(0,3));
  const gF=await geo(pg); ok(N+'a full project: no sideways page scroll, bar inside the screen',gF.sw&&gF.bw&&gF.barB,gF);

  /* team save: v2 recipe */
  await pg.evaluate(()=>VD.select(null)); await pg.fill('#vdName','Timeline test'); await pg.tap('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo');
  const note=await pg.evaluate(()=>document.querySelector('dialog[open]').innerText);
  ok(N+'Save sheet notes that your clips and sounds stay on this phone',/Your clips, photos and sounds stay on this phone; the team gets your edits/.test(note),note.replace(/\s+/g,' ').slice(0,200));
  await pg.tap('#vsTeam'); await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('vsSt').textContent),null,{timeout:15000});
  const saved=await pg.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{}}').designs; const id=Object.keys(d)[0]; return {id,tool:d[id].tool,name:d[id].name,r:d[id].recipe,thumb:!!JSON.parse(localStorage.getItem('fakecloud')).files[d[id].thumb_path]}; });
  ok(N+'team save stores a v2 video recipe with clips, text, audio and media names',saved.tool==='video'&&saved.r.v===2&&saved.r.kind==='video'&&saved.r.clips.length===3&&saved.r.texts.length===1&&saved.r.audio.length===2&&Object.keys(saved.r.media).length===3&&saved.thumb,{v:saved.r.v,c:saved.r.clips.length,t:saved.r.texts.length,a:saved.r.audio.length});
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  const was=await recipe(pg);

  /* reopen */
  await pg.goto(BASE+'tools/video.html?design='+saved.id); await ready(pg); await pg.waitForTimeout(800);
  const re=await recipe(pg), reN=await pg.evaluate(()=>({clips:document.querySelectorAll('#vtClips .vt-clip').length,texts:document.querySelectorAll('#vtTexts .vt-text').length,audio:document.querySelectorAll('#vtAudios .vt-audio').length,miss:document.querySelectorAll('.vt-blk.missing').length,name:document.getElementById('vdName').value,st:document.getElementById('vdStatus').textContent}));
  ok(N+'reopening ?design= restores the clips, text and sounds (files are on this device: nothing missing)',reN.clips===3&&reN.texts===1&&reN.audio===2&&reN.miss===0&&reN.name==='Timeline test'&&JSON.stringify(re.clips.map(c=>c.id))===JSON.stringify(was.clips.map(c=>c.id))&&re.texts[0].value===was.texts[0].value,reN);

  /* missing media */
  const ids=Object.keys(re.media);
  await pg.evaluate(async ids=>{ for(const id of ids) await StudioMedia.remove(id); },ids);
  await pg.goto(BASE+'tools/video.html?design='+saved.id); await ready(pg); await pg.waitForTimeout(800);
  const mi=await pg.evaluate(()=>({n:document.querySelectorAll('#vtClips .vt-blk.missing').length,txt:[...document.querySelectorAll('.vt-miss')].map(e=>e.textContent),bg:getComputedStyle(document.querySelector('.vt-clip.missing')).backgroundImage.slice(0,40),a:document.querySelectorAll('#vtAudios .vt-audio.missing').length,err:window.__video().drawErr}));
  ok(N+'missing files: striped “Missing on this phone” blocks, the rest still loads',mi.n===2&&mi.txt.every(t=>t==='Missing on this phone')&&/gradient/.test(mi.bg)&&mi.a===2&&!mi.err,mi);
  const mid=await pg.evaluate(()=>VD.st.R.clips.find(c=>c.kind==='video').id); await selectClip(pg,true,mid);
  const ag=await pg.$$eval('#bar .vd-bb',l=>l.map(b=>b.innerText.trim()));
  ok(N+'the missing clip’s context bar has Add again',ag.includes('Add again'),ag);
  await pg.setInputFiles('#bar input[data-again]',[VID]); await pg.waitForFunction(()=>document.querySelectorAll('#vtClips .vt-blk.missing').length===0,null,{timeout:20000});
  const fixed=await recipe(pg); const nm=Object.values(fixed.media).map(m=>m.name);
  ok(N+'Add again replaces the file for every clip that used it (both halves) and keeps the name',nm.includes('vclip.mp4')&&fixed.clips.filter(c=>c.kind==='video').every(c=>fixed.media[c.media]),nm);
  await ctx.close();

  /* empty state */
  {
    const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
    await pg.goto(BASE+'tools/video.html?new=1'); await ready(pg);
    const em=await pg.evaluate(()=>({vis:!document.getElementById('vdEmpty').hidden,h:document.querySelector('#vdEmpty h2').textContent,save:document.getElementById('vdSave').disabled,link:document.getElementById('vdEmptyReel').className,sv:getComputedStyle(document.getElementById('vdSave')).backgroundColor,play:document.getElementById('vdPlay').disabled,n:document.querySelectorAll('#vtClips .vt-clip').length}));
    const probe=await pg.evaluate(()=>{ const i=document.createElement('i'); i.style.background='var(--accent)'; document.body.appendChild(i); const c=getComputedStyle(i).backgroundColor; i.remove(); return c; });
    ok(N+'?new=1: "Start your video" card, Save disabled and quiet, no clips',em.vis&&em.h==='Start your video'&&em.save&&em.sv!==probe&&em.n===0&&em.play,em);
    const fl=await filledIn(pg,'body'); ok(N+'the empty state has exactly one filled button (Add clips or photos) and a Start-from-a-reel-template link',fl===1&&/link/.test(em.link),fl);
    ok(N+'the New video menu item is in the name menu',await (async()=>{ await pg.tap('#vdMenu'); const t=await pg.evaluate(()=>document.getElementById('vdMenuBox').innerText); await pg.keyboard.press('Escape'); return /New video/.test(t); })());
    await pg.tap('#vdEmptyReel'); await waitClips(pg,1); await pg.waitForTimeout(300);
    const r=await recipe(pg); ok(N+'Start from a reel template adds the reel; the empty card goes and Save works',r.clips.length===1&&r.clips[0].kind==='reel'&&!(await pg.isVisible('#vdEmpty'))&&!(await pg.evaluate(()=>document.getElementById('vdSave').disabled)),r.clips.map(c=>c.kind));
    await selectClip(pg,true,r.clips[0].id); await pg.tap('#bar [data-do="del"]'); await pg.waitForTimeout(300);
    ok(N+'deleting the last clip brings the empty state back',await pg.isVisible('#vdEmpty')&&await pg.evaluate(()=>document.getElementById('vdSave').disabled));
    await pg.setInputFiles('#vdEmptyFile',[VID,PHOTO]); await waitClips(pg,2); await pg.waitForTimeout(500);
    ok(N+'Add clips or photos from the empty state adds both',!(await pg.isVisible('#vdEmpty'))&&(await recipe(pg)).clips.map(c=>c.kind).join()==='video,photo');
    /* New video: an unfinished video is kept on this device, so it just opens an empty project (a saved design asks first) */
    await pg.tap('#vdMenu'); await pg.tap('#vdMenuBox [data-i="0"]'); await pg.waitForFunction(()=>/new=1/.test(location.search),null,{timeout:10000}).catch(()=>{});
    ok(N+'New video keeps the unfinished video as a draft on this device and opens an empty project',/new=1/.test(await pg.evaluate(()=>location.search))&&(await pg.evaluate(()=>Object.keys(localStorage).filter(k=>/^studio:draft:[^:]+:video:[^:]+$/.test(k)).length))===1);
    ok(N+'empty state: no errors',errs.length===0,errs.slice(0,3));
    await ctx.close();
  }

  /* reel template: Words are 2 taps from opening; Mix */
  {
    const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
    await pg.goto(BASE+'tools/video.html'); await ready(pg);
    await pg.tap('#bar [data-open="text"]'); const inp=pg.locator('#vdShB .vd-slot input').first(); await inp.waitFor();
    await inp.fill('Cold all winter'); await pg.waitForTimeout(200);
    const wr=(await recipe(pg)).clips[0].texts.headline;
    ok(N+'changing the template headline: Text → type (2 taps from opening), saved on the reel clip',wr==='Cold all winter',wr);
    const dirs=await inp.evaluate(el=>({dir:el.getAttribute('dir'),sz:parseFloat(getComputedStyle(el).fontSize),max:el.maxLength,eh:el.getAttribute('enterkeyhint')}));
    ok(N+'the words box: dir=auto, 17px+, maxlength 60, enterkeyhint done',dirs.dir==='auto'&&dirs.sz>=17&&dirs.max===60&&dirs.eh==='done',dirs);
    await pg.tap('#vdShX');
    await selectClip(pg,true,(await recipe(pg)).clips[0].id);
    const rb=await pg.$$eval('#bar .vd-bb',l=>l.map(b=>b.innerText.trim()));
    ok(N+'selecting the reel clip: Done, Words, Mix, Split, Earlier, Later, Delete',rb.join()==='Done,Words,Mix,Split,Earlier,Later,Delete',rb);
    await pg.tap('#bar [data-open="mix"]'); await pg.waitForSelector('#vdShB .vd-row[data-id="hood"]',{timeout:15000});
    await pg.tap('#vdShB .vd-row[data-id="hood"] [data-mute]'); await pg.evaluate(()=>{ const s=document.querySelector('#vdShB .vd-row[data-id="music"] [data-db]'); s.value='-6'; s.dispatchEvent(new Event('input',{bubbles:true})); });
    await pg.tap('#vdShB [data-duck]').catch(()=>{});
    const mx=(await recipe(pg)).clips[0]; ok(N+'reel Mix: mute a sound, music −6 dB, duck switch — kept on the clip',mx.mix.hood.mute===true&&mx.mix.music.db===-6&&mx.duck===false,{mix:mx.mix,duck:mx.duck});
    await pg.tap('#vdReset'.replace('#vdReset','#vdShB [data-reset]'));
    ok(N+'Reset to original mix puts the clip back',await pg.evaluate(()=>{ const c=VD.st.R.clips[0]; return Object.keys(c.mix).length===0&&c.duck===true; }));
    await pg.tap('#vdShX'); await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(200);
    ok(N+'Words from the context bar shows the reel’s words',await pg.isVisible('#vdShB .vd-slot input'));
    await pg.tap('#vdShX');
    ok(N+'reel run: no errors',errs.length===0,errs.slice(0,3));
    await ctx.close();
  }

  /* export a 6 s project: video + photo + text */
  {
    const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
    await pg.goto(BASE+'tools/video.html?new=1'); await ready(pg);
    await pg.setInputFiles('#vdEmptyFile',[VID,PHOTO]); await waitClips(pg,2); await pg.waitForTimeout(500);
    await pg.evaluate(()=>{ VD.st.R.clips[1].dur=2; VD.touch({fit:true,bar:true}); }); await pg.waitForTimeout(400);
    await seek(pg,1); await pg.tap('#bar [data-open="text"]'); await pg.tap('[data-addtxt]'); await pg.fill('#vdTx','Cold brew'); await pg.tap('#vdShX');
    const d6=(await V(pg)).duration; ok(N+'the export project is 6 s (4 s video + 2 s photo) with a text layer',Math.abs(d6-6)<.02&&(await recipe(pg)).texts.length===1,d6);
    await pg.tap('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo'); const noMiss=await pg.evaluate(()=>!document.getElementById('vsGo').disabled);
    const f0=await filledIn(pg,'dialog[open]'); ok(N+'Save sheet of a project: one filled button, Save video enabled, MP4 · 1080×1920 · 6 s',noMiss&&f0===1&&/MP4 · 1080×1920 · 6 s/.test(await pg.evaluate(()=>document.querySelector('dialog[open]').innerText)),f0);
    await pg.tap('#vsGo'); await pg.waitForFunction(()=>!!window.__videoLast,null,{timeout:240000});
    const last=await pg.evaluate(()=>window.__videoLast); await pg.waitForSelector('#vsOut',{timeout:15000});
    ok(N+'the export finishes: frames = duration × 30 (180), a real MP4',last.frames===Math.round(last.duration*30)&&last.frames===180&&last.size>50000&&/mp4/.test(last.type),last);
    ok(N+'done: one filled "Share or save" button',await pg.evaluate(()=>document.getElementById('vsOut').textContent)==='Share or save'&&(await filledIn(pg,'dialog[open]'))===1);
    ok(N+'export run: no errors',errs.length===0,errs.slice(0,3));
    await ctx.close();
  }
}

/* small phone and computer */
{
  const {ctx,pg,errs}=await newPage({width:360,height:740},'light',true);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.tap('#bar [data-open="add"]'); await pg.setInputFiles('#vdShB input[data-f="media"]',[VID,PHOTO]); await waitClips(pg,3); await pg.waitForTimeout(300);
  await pg.tap('#bar [data-open="text"]'); await pg.tap('[data-addtxt]'); await pg.waitForSelector('#vdTx'); await pg.tap('#vdShX');
  const id=(await recipe(pg)).clips[1].id;
  for(const step of ['main','clip','text','sheet']){
    if(step==='clip') await selectClip(pg,true,id);
    if(step==='text'){ await pg.evaluate(()=>VD.select({kind:'text',id:VD.st.R.texts[0].id})); }
    if(step==='sheet'){ await pg.tap('#bar [data-open="edit"]'); await pg.waitForTimeout(200); }
    await pg.waitForTimeout(150);
    const o=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,bw:document.body.scrollWidth,pv:document.getElementById('vdPv').getBoundingClientRect().height/innerHeight,over:[...document.querySelectorAll('.vd-top *,.vd-trans *,.vd-sheet *:not(input)')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&(r.right>innerWidth+1||r.left<-1)&&!e.closest('.vd-bar'); }).map(e=>e.className||e.tagName).slice(0,4)}));
    ok('360px '+step+': no sideways scroll, nothing outside the screen, preview ≥ 36%',o.sw<=o.iw&&o.bw<=o.iw&&!o.over.length&&o.pv>=.36,o);
  }
  ok('360px: no errors',errs.length===0,errs.slice(0,3));
  await ctx.close();
}
{
  const {ctx,pg,errs}=await newPage({width:1280,height:800},'light',false);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.click('#bar [data-open="add"]'); await pg.setInputFiles('#vdShB input[data-f="media"]',[VID,PHOTO]); await waitClips(pg,3); await pg.waitForTimeout(300);
  await pg.evaluate(()=>VD.setT(0));
  const dk=await pg.evaluate(()=>{ const pv=document.getElementById('vdPv').getBoundingClientRect(), sh=document.getElementById('vdSheet').getBoundingClientRect(), tl=document.getElementById('vdTl').getBoundingClientRect(), bar=document.getElementById('bar').getBoundingClientRect();
    return {sheetLeft:sh.left>=pv.right,sheetW:Math.round(sh.width),tlUnder:tl.top>=pv.bottom-1&&tl.right<=sh.left+1,barUnder:bar.top>=tl.bottom-1,sw:document.documentElement.scrollWidth<=innerWidth,pvh:Math.round(pv.height),idle:/Tap a clip/.test(document.getElementById('vdShB').innerText)}; });
  ok('1280×800: preview left, timeline under it, panel on the right (380px), no sideways scroll',dk.sheetLeft&&Math.abs(dk.sheetW-380)<3&&dk.tlUnder&&dk.barUnder&&dk.sw&&dk.pvh>=420,dk);
  await pg.click('#bar [data-open="text"]'); await pg.click('[data-addtxt]'); await pg.waitForSelector('#vdTx');
  const dk2=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth<=innerWidth,tl:document.getElementById('vdTl').getBoundingClientRect().height>100}));
  ok('1280×800: Edit text in the right panel keeps the timeline and the preview',dk2.sw&&dk2.tl);
  await pg.click('#vdPlay'); await pg.waitForTimeout(900);
  const pp=await V(pg); await pg.click('#vdPlay');
  ok('1280×800: mouse Play works and the timeline follows the playhead',pp.playing&&pp.t>.4&&Math.abs(await pg.evaluate(()=>document.getElementById('vtScroll').scrollLeft)-pp.t*pp.pps)<pp.pps*.6,{t:pp.t});
  ok('1280×800: no errors',errs.length===0,errs.slice(0,3));
  await ctx.close();
}
await b.close();
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-fails} passed, ${fails} failed`);
process.exit(fails?1:0);
