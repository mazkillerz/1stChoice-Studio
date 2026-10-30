/* Video editor, phase 3 (tools/video.html): Undo / Redo, the draft kept on this device, a lighter preview while playing, the save-time estimate,
   the empty state and the lane hints. Phone 390×844 (touch) in light AND dark, then 360×740 and 1280×800 (Ctrl+Z).
   Undo/redo after: trim (one step), add text + type (merged steps), delete clip (and the toast's Undo), reel word, reel mix mute; redo; the disabled
   states. Autosave: edit -> 1 s -> localStorage draft with the recipe + a JPEG picture in IndexedDB; ?draft= restores; a fresh open offers
   "Continue"; pagehide writes at once; ?render=1 writes nothing; a team save keeps the link. Save sheet: "About N s", the amber note for a heavy
   reel. While playing the canvas is at most 540 px wide, paused it is sharp again. Needs the server on :8080 (npx http-server -p 8080 -c-1 .). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); process.exit(1); });
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function newPage(vp,scheme,touch,o){
  o=o||{};
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:o.dpr||(touch?2:1),isMobile:touch,hasTouch:touch,serviceWorkers:'block',acceptDownloads:true,colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(o.heavy) await ctx.route(/reels\/[^/]+\/reel\.json/,async r=>{ const resp=await r.fetch(), j=await resp.json(); j.heavy=true; r.fulfill({response:resp,json:j}); });
  await ctx.addInitScript({content:`try{ if(!sessionStorage.getItem('pol:init')){ localStorage.setItem('studio:welcome','1'); sessionStorage.setItem('pol:init','1'); } }catch(e){}`});
  const pg=await ctx.newPage(), errs=[];
  pg.on('pageerror',e=>errs.push(String(e.message||e)));
  pg.on('console',m=>{ if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  return {ctx,pg,errs};
}
const ready=async pg=>{ await pg.waitForFunction(()=>window.__video&&window.__video().ready,null,{timeout:60000}); await pg.waitForTimeout(300); };
const V=pg=>pg.evaluate(()=>window.__video());
const recipe=async pg=>(await V(pg)).recipe;
const T=(pg,touch,s)=>touch?pg.tap(s):pg.click(s);
const dis=(pg,id)=>pg.evaluate(id=>document.getElementById(id).disabled,id);
const dragTouch=async(cdp,x1,y1,x2,y2)=>{ const pts=Array.from({length:9},(_,i)=>[{x:x1+(x2-x1)*i/8,y:y1+(y2-y1)*i/8,id:1}]);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts[0]});
  for(let i=1;i<pts.length;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts[i]}); await wait(20); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); };
const box=(pg,sel)=>pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2}; },sel);
const filledIn=(pg,root)=>pg.evaluate(root=>{ const probe=document.createElement('i'); probe.style.background='var(--accent)'; document.body.appendChild(probe); const acc=getComputedStyle(probe).backgroundColor; probe.remove();
  return [...document.querySelectorAll(root+' button, '+root+' label.btn')].filter(b=>{ const r=b.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(b).backgroundColor===acc&&!b.hasAttribute('aria-pressed'); }).length; },root);
const draftKeys=pg=>pg.evaluate(()=>Object.keys(localStorage).filter(k=>/^studio:draft:[^:]+:video:[^:]+$/.test(k)));
const draftOf=(pg,k)=>pg.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const sideways=pg=>pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.body.scrollWidth<=innerWidth);
const openBar=async(pg,touch,name)=>{ await T(pg,touch,'#bar [data-open="'+name+'"]'); await pg.waitForTimeout(250); };

for(const scheme of ['light','dark']){
  const N=scheme+' phone: ';
  const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
  const cdp=await ctx.newCDPSession(pg);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);

  /* ---- undo / redo ---- */
  const tb=await pg.evaluate(()=>{ const u=document.getElementById('vdUndo'), r=document.getElementById('vdRedo'), s=document.getElementById('vdSave'); const bx=e=>e.getBoundingClientRect();
    return {ul:u.getAttribute('aria-label'),ut:u.title,rl:r.getAttribute('aria-label'),rt:r.title,ud:u.disabled,rd:r.disabled,uw:bx(u).width,uh:bx(u).height,order:bx(u).left<bx(r).left&&bx(r).right<=bx(s).left+1,name:bx(document.getElementById('vdName')).width,sw:document.documentElement.scrollWidth<=innerWidth}; });
  ok(N+'top bar: Undo and Redo icon buttons (labels, tooltips, ≥ 48px, left of Save), both disabled at the start',tb.ul==='Undo'&&tb.ut==='Undo (Ctrl+Z)'&&tb.rl==='Redo'&&tb.rt==='Redo (Ctrl+Shift+Z)'&&tb.ud&&tb.rd&&tb.uw>=47.5&&tb.uh>=47.5&&tb.order&&tb.sw,tb);
  ok(N+'the name field keeps room beside the buttons (≥ 90px)',tb.name>=90,tb.name);

  const dur=(await V(pg)).duration, out0=(await recipe(pg)).clips[0].out;
  await pg.evaluate(()=>VD.setT(5)); await pg.waitForTimeout(100); await pg.tap('#vtClips .vt-clip'); await pg.waitForTimeout(200);
  await pg.evaluate(d=>VD.setT(d),dur); await pg.waitForTimeout(250);
  const h=await box(pg,'#vtClips .vt-clip.sel .vt-h.r');
  await dragTouch(cdp,h.cx,h.cy,h.cx-60,h.cy); await pg.waitForTimeout(900);
  const trimmed=(await recipe(pg)).clips[0].out, v1=await V(pg);
  ok(N+'trim by dragging the handle: the clip got shorter and Undo is enabled, Redo is not',trimmed<out0-0.2&&!(await dis(pg,'vdUndo'))&&(await dis(pg,'vdRedo')),{out0,trimmed,hist:v1.hist});
  const tBefore=(await V(pg)).t;
  await pg.tap('#vdUndo'); await pg.waitForTimeout(300);
  const u1=await V(pg);
  ok(N+'Undo after a whole drag: ONE step puts the length back, the playhead stays, Undo is now disabled, Redo enabled',Math.abs(u1.recipe.clips[0].out-out0)<1e-6&&Math.abs(u1.t-Math.min(tBefore,u1.duration))<.05&&(await dis(pg,'vdUndo'))&&!(await dis(pg,'vdRedo')),{out:u1.recipe.clips[0].out,t:u1.t,tBefore,hist:u1.hist});
  await pg.tap('#vdRedo'); await pg.waitForTimeout(300);
  const r1=await V(pg);
  ok(N+'Redo brings the trim back; Redo is disabled again',Math.abs(r1.recipe.clips[0].out-trimmed)<1e-6&&(await dis(pg,'vdRedo'))&&!(await dis(pg,'vdUndo')),{out:r1.recipe.clips[0].out,trimmed});
  await pg.tap('#vdUndo'); await pg.waitForTimeout(250);   // back to the start for the next steps
  await pg.evaluate(()=>VD.select(null)); await pg.evaluate(()=>VD.setT(1)); await pg.waitForTimeout(150);

  /* a reel word */
  await openBar(pg,true,'text'); await pg.waitForSelector('#vdShB .vd-slot input');
  const w0=await pg.inputValue('#vdShB .vd-slot input');
  await pg.fill('#vdShB .vd-slot input','Cold all winter'); await pg.waitForTimeout(900);
  const wc=(await recipe(pg)).clips[0].texts, wid=Object.keys(wc)[0];
  ok(N+'a reel word is a step: the recipe has it and Undo is enabled',wid&&Object.values(wc)[0]==='Cold all winter'&&!(await dis(pg,'vdUndo')),wc);
  await pg.tap('#vdUndo'); await pg.waitForTimeout(350);
  const wu=await pg.evaluate(()=>({t:JSON.stringify(VD.st.R.clips[0].texts),inp:document.querySelector('#vdShB .vd-slot input')&&document.querySelector('#vdShB .vd-slot input').value}));
  ok(N+'Undo of a reel word: the original words are back in the recipe and in the open sheet',wu.t==='{}'&&wu.inp===w0,wu);
  await pg.tap('#vdRedo'); await pg.waitForTimeout(300);
  ok(N+'Redo of the reel word',(await recipe(pg)).clips[0].texts[wid]==='Cold all winter');
  await pg.tap('#vdUndo'); await pg.waitForTimeout(250); await pg.tap('#vdShX'); await pg.waitForTimeout(150);

  /* add text + type: merged steps */
  const n0=(await V(pg)).hist.i;
  await openBar(pg,true,'text'); await pg.tap('[data-addtxt]'); await pg.waitForSelector('#vdTx'); await pg.waitForTimeout(900);
  await pg.keyboard.type('Hello',{delay:50}); await pg.waitForTimeout(900);
  await pg.keyboard.type(' there',{delay:50}); await pg.waitForTimeout(900);
  const tv=await V(pg), tx=tv.recipe.texts[0];
  ok(N+'add text, then type in two bursts: 3 steps (added, burst 1, burst 2), not one per key',tv.recipe.texts.length===1&&/Hello there$/.test(tx.value)&&tv.hist.i-n0===3,{n0,hist:tv.hist,value:tx.value});
  await pg.tap('#vdUndo'); await pg.waitForTimeout(300);
  const t1=(await recipe(pg)).texts[0];
  ok(N+'Undo once: the second burst is gone, the first stays',t1&&/Hello$/.test(t1.value)&&!/there/.test(t1.value),t1&&t1.value);
  await pg.tap('#vdUndo'); await pg.waitForTimeout(300);
  const t2=(await recipe(pg)).texts[0];
  ok(N+'Undo twice: the text is back to its first words',t2&&!/Hello/.test(t2.value),t2&&t2.value);
  await pg.tap('#vdUndo'); await pg.waitForTimeout(300);
  const v3=await V(pg);
  ok(N+'Undo three times: the text layer is gone, the sheet that was about it closed',v3.recipe.texts.length===0&&!v3.sheet&&!(await pg.isVisible('#vdSheet')),{sheet:v3.sheet});
  for(let i=0;i<3;i++){ await pg.tap('#vdRedo'); await pg.waitForTimeout(200); }
  ok(N+'Redo three times: the text is back with all its words',/Hello there$/.test((await recipe(pg)).texts[0].value)&&(await dis(pg,'vdRedo')));
  for(let i=0;i<3;i++){ await pg.tap('#vdUndo'); await pg.waitForTimeout(200); }
  ok(N+'a new edit after Undo drops the Redo steps',true);   // below, after the mix change

  /* a mix mute */
  await pg.evaluate(()=>{ VD.select({kind:'clip',id:VD.st.R.clips[0].id}); }); await pg.waitForTimeout(200);
  await pg.tap('#bar [data-open="mix"]'); await pg.waitForSelector('#vdShB .vd-row[data-id="hood"]',{timeout:20000});
  await pg.tap('#vdShB .vd-row[data-id="hood"] [data-mute]'); await pg.waitForTimeout(900);
  const mm=(await recipe(pg)).clips[0].mix;
  ok(N+'mix: muting a sound is a step',mm.hood&&mm.hood.mute===true&&!(await dis(pg,'vdUndo'))&&(await dis(pg,'vdRedo')),mm);
  await pg.tap('#vdUndo'); await pg.waitForTimeout(500);
  const mu=await pg.evaluate(()=>({m:JSON.stringify(VD.st.R.clips[0].mix),p:document.querySelector('#vdShB .vd-row[data-id="hood"] [data-mute]')&&document.querySelector('#vdShB .vd-row[data-id="hood"] [data-mute]').getAttribute('aria-pressed')}));
  ok(N+'Undo of the mute: the recipe and the open Mix sheet show it unmuted',!/"mute":true/.test(mu.m)&&mu.p==='false',mu);
  await pg.tap('#vdRedo'); await pg.waitForTimeout(400);
  ok(N+'Redo of the mute',(await recipe(pg)).clips[0].mix.hood.mute===true);
  await pg.tap('#vdUndo'); await pg.waitForTimeout(300); await pg.tap('#vdShX'); await pg.waitForTimeout(200);

  /* delete a clip: toast Undo uses the same history */
  await pg.evaluate(()=>{ VD.select({kind:'clip',id:VD.st.R.clips[0].id}); }); await pg.waitForTimeout(200);
  const hbefore=(await V(pg)).hist;
  await pg.tap('#bar [data-do="del"]'); await pg.waitForTimeout(300);
  const dl=await pg.evaluate(()=>({n:VD.st.R.clips.length,toast:(document.getElementById('vdToast')||{}).innerText,hid:(document.getElementById('vdToast')||{hidden:true}).hidden,empty:!document.getElementById('vdEmpty').hidden}));
  const hdel=(await V(pg)).hist;
  ok(N+'delete clip: one history step, the toast says "Clip deleted" with an Undo link, the empty state shows',dl.n===0&&/Clip deleted/.test(dl.toast)&&/Undo/.test(dl.toast)&&!dl.hid&&dl.empty&&hdel.i===hbefore.i+1,{dl,hbefore,hdel});
  await pg.tap('#vdToast [data-undo]'); await pg.waitForTimeout(500);
  const du=await V(pg);
  ok(N+'the toast’s Undo brings the clip back (same history), the sheet and empty state are right',du.recipe.clips.length===1&&du.duration>9&&!(await pg.isVisible('#vdEmpty'))&&du.hist.i===hbefore.i,{n:du.recipe.clips.length,hist:du.hist});
  await pg.tap('#vdRedo'); await pg.waitForTimeout(300);
  ok(N+'Redo deletes it again; Undo again restores it',(await recipe(pg)).clips.length===0);
  await pg.tap('#vdUndo'); await pg.waitForTimeout(400);
  ok(N+'…and a new edit after Undo clears Redo',(await recipe(pg)).clips.length===1&&!(await dis(pg,'vdRedo')));
  await pg.evaluate(()=>VD.select(null)); await pg.tap('#bar [data-open="sound"]'); await pg.waitForSelector('#vdShB .vd-row[data-id="hood"]',{timeout:20000}); await pg.tap('#vdShB .vd-row[data-id="hood"] [data-mute]'); await pg.waitForTimeout(900);
  ok(N+'a new edit makes Redo disabled',await dis(pg,'vdRedo'));
  ok(N+'no console errors in the undo/redo run',errs.length===0,errs.slice(0,3));
  await ctx.close();
}

/* ---- the draft kept on this device (phone, light then dark) ---- */
for(const scheme of ['light','dark']){
  const N=scheme+' draft: ';
  const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  ok(N+'a fresh open with no draft: no banner, nothing written yet',(await pg.evaluate(()=>document.getElementById('vdResume').hidden))&&(await draftKeys(pg)).length===0);
  await openBar(pg,true,'text'); await pg.tap('[data-addtxt]'); await pg.waitForSelector('#vdTx'); await pg.keyboard.type('Draft words',{delay:30}); await pg.waitForTimeout(1300);
  const keys=await draftKeys(pg), rec=keys[0]&&await draftOf(pg,keys[0]);
  const th=await pg.evaluate(async k=>await Studio.lab.idb.get(k+':thumb'),keys[0]);
  ok(N+'1 s after an edit the draft is in localStorage: recipe (v2), name, at, design null, pfx = its own key',keys.length===1&&/^studio:draft:1stchoice:video:/.test(keys[0])&&rec.video.v===2&&rec.video.texts.length===1&&/Draft words$/.test(rec.video.texts[0].value)&&rec.pfx===keys[0]&&rec.design===null&&typeof rec.name==='string'&&rec.at>0,{keys,pfx:rec&&rec.pfx,design:rec&&rec.design});
  ok(N+'a small JPEG picture is kept in IndexedDB at <key>:thumb (a data URL)',typeof th==='string'&&/^data:image\/jpeg;base64,/.test(th)&&th.length>800,th&&th.slice(0,30)+' '+(th&&th.length));
  ok(N+'the recipe in the draft holds no file contents (small)',JSON.stringify(rec).length<6000,JSON.stringify(rec).length);
  const id=keys[0].split(':').pop();
  ok(N+'the address now has ?draft=<id> (a reload continues the same draft)',(await pg.evaluate(()=>location.search))==='?draft='+id);
  await pg.reload(); await ready(pg);
  const rs=await V(pg);
  ok(N+'?draft= restores the recipe, the playhead is 0, the same draft id',rs.recipe.texts.length===1&&/Draft words$/.test(rs.recipe.texts[0].value)&&rs.t===0&&rs.draftId===id&&(await dis(pg,'vdUndo')),{t:rs.t,draftId:rs.draftId,n:rs.recipe.texts.length});
  /* a name and a pagehide */
  await pg.fill('#vdName','سلسلة الشتاء'); await pg.waitForTimeout(1200);
  ok(N+'the name is kept in the draft',(await draftOf(pg,keys[0])).name==='سلسلة الشتاء');
  await openBar(pg,true,'text'); await pg.tap('[data-addtxt]'); await pg.waitForSelector('#vdTx');
  await pg.evaluate(()=>dispatchEvent(new Event('pagehide')));
  const ph=await draftOf(pg,keys[0]);
  ok(N+'pagehide writes at once (the second text is there without waiting)',ph.video.texts.length===2,ph.video.texts.length);
  /* a fresh open offers Continue */
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.waitForFunction(()=>!document.getElementById('vdResume').hidden,null,{timeout:5000}).catch(()=>{});
  const bn=await pg.evaluate(()=>{ const r=document.getElementById('vdResume'), p=document.getElementById('vdPv'), rb=r.getBoundingClientRect(), pb=p.getBoundingClientRect(), g=document.getElementById('vdResumeGo').getBoundingClientRect(), x=document.getElementById('vdResumeX').getBoundingClientRect();
    return {vis:!r.hidden&&rb.height>0,txt:r.innerText.replace(/\s+/g,' ').trim(),frac:rb.height/pb.height,link:document.getElementById('vdResumeGo').className,gh:g.height,xh:x.height,xw:x.width,inside:rb.top>=pb.top-1&&rb.bottom<=pb.bottom+1,clips:VD.st.R.clips.length,kind:VD.st.R.clips[0].kind,draft:VD.st.draftId}; });
  ok(N+'a fresh open starts as before (the first reel) and shows "You have an unfinished video. Continue" as a link',bn.vis&&/You have an unfinished video\.\s*Continue/.test(bn.txt)&&/link/.test(bn.link)&&bn.clips===1&&bn.kind==='reel'&&bn.draft===null,bn);
  ok(N+'the banner covers at most 15% of the preview and its targets are ≥ 44px',bn.frac<=.151&&bn.inside&&bn.gh>=44&&bn.xh>=44&&bn.xw>=44,bn);
  ok(N+'the banner does not make a draft or write anything by itself',(await draftKeys(pg)).length===1);
  await pg.tap('#vdResumeGo'); await pg.waitForFunction(()=>location.search.startsWith('?draft=')&&window.__video&&window.__video().ready,null,{timeout:30000}); await pg.waitForTimeout(500);
  const cont=await V(pg);
  ok(N+'Continue opens the draft (two texts, the Arabic name)',cont.recipe.texts.length===2&&(await pg.inputValue('#vdName'))==='سلسلة الشتاء',{n:cont.recipe.texts.length});
  const nameDir=await pg.evaluate(()=>{ const e=document.getElementById('vdName'); return {auto:e.getAttribute('dir'),rtl:e.matches(':dir(rtl)')}; });
  ok(N+'the Arabic name in the name field is right-to-left',nameDir.auto==='auto'&&nameDir.rtl,nameDir);
  /* dismiss */
  await pg.goto(BASE+'tools/video.html'); await ready(pg); await pg.waitForFunction(()=>!document.getElementById('vdResume').hidden);
  await pg.tap('#vdResumeX'); await pg.waitForTimeout(150);
  ok(N+'the banner can be dismissed',await pg.evaluate(()=>document.getElementById('vdResume').hidden));
  /* New video starts a new draft */
  await pg.goto(BASE+'tools/video.html?draft='+id); await ready(pg);
  await pg.tap('#vdMenu'); await pg.tap('#vdMenuBox [data-i="0"]'); await pg.waitForFunction(()=>/new=1/.test(location.search)&&window.__video&&window.__video().ready,null,{timeout:30000}); await pg.waitForTimeout(300);
  ok(N+'New video (no question, the old one is kept) opens an empty project with the Continue offer hidden',(await V(pg)).recipe.clips.length===0&&await pg.evaluate(()=>document.getElementById('vdResume').hidden));
  /* team save keeps the draft linked */
  await pg.goto(BASE+'tools/video.html?draft='+id); await ready(pg);
  await pg.tap('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo');
  await pg.tap('#vsTeam'); await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('vsSt').textContent),null,{timeout:15000});
  const linked=await draftOf(pg,keys[0]), sid=await pg.evaluate(()=>VD.st.design&&VD.st.design.id);
  ok(N+'a team save keeps the draft and links it to the design id; Save video does not remove it',linked&&linked.design===sid&&!!sid&&(await draftKeys(pg)).length===1,{design:linked&&linked.design,sid});
  await pg.tap('#vsClose'); await pg.waitForTimeout(150);
  await pg.goto(BASE+'tools/video.html?draft='+id); await ready(pg);
  ok(N+'?draft= of a linked draft reopens with the saved design link ("Saved to the team" when nothing changed)',(await V(pg)).design===sid);
  ok(N+'no console errors in the draft run',errs.length===0,errs.slice(0,3));
  await ctx.close();
}
{ /* ?render=1 never writes */
  const {ctx,pg}=await newPage({width:390,height:844},'light',true);
  await pg.goto(BASE+'tools/video.html?render=1'); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{ dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); });
  ok('?render=1 writes no draft',(await draftKeys(pg)).length===0&&(await pg.evaluate(()=>Object.keys(localStorage).filter(k=>/draft/.test(k)).length))===0);
  await ctx.close();
}

/* ---- save sheet: estimate, amber note, a slow device ---- */
for(const heavy of [false,true]){
  const N=(heavy?'heavy reel':'normal reel')+' save sheet: ';
  const {ctx,pg,errs}=await newPage({width:390,height:844},heavy?'dark':'light',true,{heavy});
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.tap('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo');
  await pg.waitForFunction(()=>/About \d+ (s|min)/.test((document.getElementById('vsEst')||{}).textContent||''),null,{timeout:30000});
  const s=await pg.evaluate(()=>{ const h=document.getElementById('vsHeavy'), cs=h&&getComputedStyle(h), d=document.querySelector('dialog[open]'); const probe=document.createElement('i'); probe.style.background='var(--vd-warn-bg)'; document.body.appendChild(probe); const warn=getComputedStyle(probe).backgroundColor; probe.remove();
    return {est:document.getElementById('vsEst').textContent,heavyHidden:h.hidden||h.getBoundingClientRect().height===0,heavyTxt:h.textContent,amber:cs&&cs.backgroundColor===warn,bench:window.__videoBench,sw:d.scrollWidth<=d.clientWidth+1,txt:d.innerText}; });
  ok(N+'the estimate shows under Save video ("About N s|min on this phone")',/^About \d+ (s|min) on this phone$/.test(s.est),s.est);
  ok(N+(heavy?'the heavy note shows, amber':'no heavy note for a light reel'),heavy?(!s.heavyHidden&&s.heavyTxt==='This video takes longer to save (3D). Keep Studio open.'&&s.amber):(s.heavyHidden||s.heavyTxt==='This video takes a while to save. Keep Studio open.'),{hidden:s.heavyHidden,amber:s.amber,t:s.heavyTxt});
  ok(N+'exactly one filled button, nothing clipped sideways',(await filledIn(pg,'dialog[open]'))===1&&s.sw);
  ok(N+'the benchmark measured real draw times',s.bench&&s.bench.draw>0&&s.bench.sub===(s.bench.draw>250?2:4),s.bench);
  if(!heavy){
    /* progress shows time left */
    await pg.tap('#vsGo'); await pg.waitForSelector('dialog[open] .progress',{timeout:15000});
    let left='';
    for(let i=0;i<300&&!left;i++){ left=await pg.evaluate(()=>{ const e=document.getElementById('vsTxt'); const m=e&&e.textContent.match(/Frame \d+ of \d+ · About \d+ (s|min) left/); return m?m[0]:''; }); if(!left) await wait(150); }
    ok(N+'while making: "Frame N of M · About N s left"',!!left,left);
    await pg.tap('#vsCancel').catch(()=>{}); await pg.waitForTimeout(800);
  }
  ok(N+'no console errors',errs.length===0,errs.slice(0,3));
  await ctx.close();
}

/* ---- playing: at most 540 px wide; paused: sharp again ---- */
{
  const {ctx,pg}=await newPage({width:390,height:844},'light',true,{dpr:3});
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  const w0=await pg.evaluate(()=>({cw:document.getElementById('vdCv').width,css:document.getElementById('vdPv').getBoundingClientRect().width,dpr:devicePixelRatio}));
  await pg.tap('#vdPlay'); await pg.waitForTimeout(700);
  const wp=await pg.evaluate(()=>({cw:document.getElementById('vdCv').width,playing:VD.st.playing,t:VD.st.t,blank:(()=>{ const c=document.getElementById('vdCv'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; const s=new Set(); for(let i=0;i<d.length;i+=4*97) s.add(d[i]>>4); return s.size; })()}));
  ok('playing: the preview canvas is at most 540 px wide (was '+w0.cw+' paused) and is drawn',w0.cw>540&&wp.playing&&wp.cw<=540&&wp.cw>=400&&wp.t>0.2&&wp.blank>3,{w0,wp});
  await pg.tap('#vdPlay'); await pg.waitForTimeout(500);
  const w1=await pg.evaluate(()=>({cw:document.getElementById('vdCv').width,playing:VD.st.playing}));
  ok('paused: the canvas is back to full device sharpness (min(1080, css × dpr))',!w1.playing&&Math.abs(w1.cw-Math.min(1080,Math.round(w0.css*w0.dpr)))<=1,{w0,w1});
  await pg.evaluate(()=>VD.setT(2)); await pg.waitForTimeout(300);
  ok('scrubbing keeps the sharp canvas',(await pg.evaluate(()=>document.getElementById('vdCv').width))===w1.cw);
  await ctx.close();
}

/* ---- empty state, lane hints, small phone, desktop ---- */
for(const scheme of ['light','dark']){
  const N=scheme+' 360×740 empty: ';
  const {ctx,pg,errs}=await newPage({width:360,height:740},scheme,true);
  await pg.goto(BASE+'tools/video.html?new=1'); await ready(pg);
  const e=await pg.evaluate(()=>{ const a=getComputedStyle(document.getElementById('vtTexts'),'::after'), b=getComputedStyle(document.getElementById('vtAudios'),'::after'), l=document.getElementById('vtTexts').getBoundingClientRect(), s=document.getElementById('vtScroll').getBoundingClientRect();
    return {t:a.content,s:b.content,fs:a.fontSize,col:a.color,col2:b.color,pos:a.position,inView:l.width>0,sw:document.documentElement.scrollWidth<=innerWidth,name:document.getElementById('vdName').getBoundingClientRect().width,
      h2:document.querySelector('#vdEmpty h2').getBoundingClientRect(),hid:document.getElementById('vdEmpty').hidden,undoD:document.getElementById('vdUndo').disabled}; });
  ok(N+'empty Text and Sound lanes say what they are (11px, muted)',e.t==='"Text"'&&e.s==='"Sound"'&&e.fs==='11px'&&e.pos==='sticky',e);
  ok(N+'the lane hint is readable: not the same colour as the lane tint',e.col!=='rgba(0, 0, 0, 0)'&&e.col===e.col2);
  ok(N+'empty state: shown, exactly one filled button, no sideways scroll, name field ≥ 80px, Undo disabled',!e.hid&&(await filledIn(pg,'body'))===1&&e.sw&&e.name>=80&&e.undoD,{filled:await filledIn(pg,'body'),name:e.name});
  const al=await pg.evaluate(()=>{ const em=document.getElementById('vdEmpty').getBoundingClientRect(), pv=document.getElementById('vdPv').getBoundingClientRect(); return {inside:em.left>=pv.left-1&&em.right<=pv.right+1,clipped:[...document.querySelectorAll('#vdEmpty h2,#vdEmpty p,#vdEmpty .btn,#vdEmpty .link')].filter(x=>x.scrollWidth>x.clientWidth+1).length}; });
  ok(N+'empty state texts and buttons are inside the preview, nothing clipped',al.inside&&al.clipped===0,al);
  /* every sheet: no sideways scroll, no clipped labels */
  for(const sh of ['add','text','sound']){ await T(pg,true,'#bar [data-open="'+sh+'"]'); await pg.waitForTimeout(300);
    const o=await pg.evaluate(()=>{ const b=document.getElementById('vdShB'); const cl=[...document.querySelectorAll('#vdSheet .vd-item b,#vdSheet h3,#vdSheet h2,#vdSheet .link')].filter(x=>x.scrollWidth>x.clientWidth+1&&getComputedStyle(x).textOverflow!=='ellipsis').length; return {sw:document.documentElement.scrollWidth<=innerWidth,bw:b.scrollWidth<=b.clientWidth+1,cl}; });
    ok(N+'the '+sh+' sheet: no sideways scroll, no clipped labels',o.sw&&o.bw&&o.cl===0,o); await pg.tap('#vdShX'); await pg.waitForTimeout(150); }
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.fill('#vdName','تجربة'); await openBar(pg,true,'text'); await pg.tap('[data-addtxt]'); await pg.waitForSelector('#vdTx'); await pg.fill('#vdTx','حتى في البرد'); await pg.waitForTimeout(300); await pg.tap('#vdShX'); await pg.waitForTimeout(200);
  const ar=await pg.evaluate(()=>{ const t=document.querySelector('#vtTexts .vt-t'); const cs=getComputedStyle(t); return {ub:cs.unicodeBidi,dir:t.getAttribute('dir'),rtl:t.matches(':dir(rtl)'),txt:t.textContent}; });
  ok(N+'an Arabic text bar on the timeline reads right-to-left (dir=auto, plaintext bidi)',ar.dir==='auto'&&ar.rtl&&/plaintext/.test(ar.ub),ar);
  await pg.tap('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo'); await pg.waitForFunction(()=>/About/.test((document.getElementById('vsEst')||{}).textContent||''),null,{timeout:30000});
  const sv=await pg.evaluate(()=>{ const d=document.querySelector('dialog[open]'); return {sw:d.scrollWidth<=d.clientWidth+1,page:document.documentElement.scrollWidth<=innerWidth}; });
  ok(N+'the Save sheet fits 360px, one filled button',sv.sw&&sv.page&&(await filledIn(pg,'dialog[open]'))===1,sv);
  ok(N+'no console errors',errs.length===0,errs.slice(0,3));
  await ctx.close();
}
{ /* desktop: Ctrl+Z / Ctrl+Shift+Z, 1280×800 */
  const {ctx,pg,errs}=await newPage({width:1280,height:800},'light',false);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  await pg.click('#bar [data-open="text"]'); await pg.waitForSelector('[data-addtxt]'); await pg.click('[data-addtxt]'); await pg.waitForSelector('#vdTx'); await pg.waitForTimeout(900);
  await pg.keyboard.press('Escape'); await pg.evaluate(()=>document.activeElement&&document.activeElement.blur());
  ok('desktop: a text was added',(await recipe(pg)).texts.length===1);
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
  ok('desktop: Ctrl+Z undoes it',(await recipe(pg)).texts.length===0&&(await dis(pg,'vdUndo')));
  await pg.keyboard.press('Control+Shift+z'); await pg.waitForTimeout(300);
  ok('desktop: Ctrl+Shift+Z redoes it',(await recipe(pg)).texts.length===1&&(await dis(pg,'vdRedo')));
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(200); await pg.keyboard.press('Control+y'); await pg.waitForTimeout(200);
  ok('desktop: Ctrl+Y also redoes',(await recipe(pg)).texts.length===1);
  ok('desktop: no sideways scroll, no errors',(await sideways(pg))&&errs.length===0,errs.slice(0,3));
  await ctx.close();
}

await b.close();
console.log(res.join('\n'));
const bad=res.filter(r=>r.startsWith('FAIL')).length;
console.log('\n'+(bad?bad+' FAILED of '+res.length:'ALL PASSED ('+res.length+')'));
process.exit(bad?1:0);
