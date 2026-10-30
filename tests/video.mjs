/* Video editor (tools/video.html): the screen, not the engine (reel-scene / reel-audio / reel-export have their own suites).
   Phone 390×844 (touch) in light AND dark, then 360×740 and 1280×800.
   Loads to ready with no errors and a drawn preview; Play/Pause and the clock; a touch drag on the timeline; Text (RTL input, live headline,
   too-long warning with readable contrast, original words, phrases); Sound (mute, +3 dB, reset, play-alone); Safe zones; the Save sheet
   (exactly one filled button per state, the real MP4); saving to the team and reopening ?design=; the hub (All tools, search, Saved's
   Save pictures skips a video). Needs the server on :8080 (npx http-server -p 8080 -c-1 .) or BASE=...  Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const ORIG='حتى في البرد...', LONG='حتى في البرد حتى في البرد حتى في البرد حتى في البرد';
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
const lum=c=>{ const m=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };
/* a hash of the canvas area where the headline sits (reel px box -> canvas px) */
const band=pg=>pg.evaluate(()=>{ const c=document.getElementById('vdCv'), k=c.width/1080, x=40*k,y=430*k,w=1000*k,h=200*k, d=c.getContext('2d').getImageData(x|0,y|0,w|0,h|0).data; let s=0,n=0; for(let i=0;i<d.length;i+=4){ s+=d[i]*3+d[i+1]*5+d[i+2]*7; if(d[i]<200) n++; } return {s,n}; });
const canvasStats=pg=>pg.evaluate(()=>{ const c=document.getElementById('vdCv'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; const seen=new Set(); let dark=0; for(let i=0;i<d.length;i+=4*7){ seen.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4)); if(d[i]+d[i+1]+d[i+2]<600) dark++; } return {colours:seen.size,dark,w:c.width,h:c.height}; });
const tapOrClick=(pg,touch,s)=>touch?pg.tap(s):pg.click(s);
/* filled accent buttons inside the open dialog (background = --accent, visible, not disabled) */
const filled=pg=>pg.evaluate(()=>{ const d=document.querySelector('dialog[open]'); if(!d) return -1;
  const probe=document.createElement('i'); probe.style.background='var(--accent)'; document.body.appendChild(probe); const acc=getComputedStyle(probe).backgroundColor; probe.remove();
  return [...d.querySelectorAll('button')].filter(b=>{ const r=b.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(b).backgroundColor===acc; }).length; });
const dragTouch=async(cdp,x1,x2,y)=>{ const pt=x=>[{x,y,id:1}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pt(x1)});
  for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pt(x1+(x2-x1)*i/8)}); await wait(20); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); };

const first={};   // the saved design id per scheme

for(const scheme of ['light','dark']){
  const N=scheme+' phone: ';
  const {ctx,pg,errs}=await newPage({width:390,height:844},scheme,true);
  const cdp=await ctx.newCDPSession(pg);
  await pg.goto(BASE+'tools/video.html'); await ready(pg);
  ok(N+'loads to ready, no console errors',errs.length===0,errs.slice(0,3));
  ok(N+'the title is the tool name',/Video editor/.test(await pg.title()));
  const cs=await canvasStats(pg);
  ok(N+'the preview canvas is drawn, not blank, and sharp (device pixels)',cs.colours>12&&cs.dark>50&&cs.w>=400,cs);
  const geo=await pg.evaluate(()=>{ const r=document.getElementById('vdPv').getBoundingClientRect(), t=document.querySelector('.vd-top').getBoundingClientRect(), s=document.querySelector('.vd-side').getBoundingClientRect(), cv=document.getElementById('vdCv');
    return {h:r.height/innerHeight,ratio:r.width/r.height,hs:document.documentElement.scrollWidth<=innerWidth,cssW:r.width,cw:cv.width,dpr:devicePixelRatio,sideBottom:s.bottom<=innerHeight+1,topH:t.height}; });
  ok(N+'the preview keeps at least 45% of the height and is 9:16',geo.h>=.45&&Math.abs(geo.ratio-9/16)<.01,geo);
  ok(N+'canvas size = CSS size × device pixel ratio (capped at 1080)',Math.abs(geo.cw-Math.min(1080,Math.round(geo.cssW*geo.dpr)))<=1,geo);
  const dur=await pg.evaluate(()=>document.getElementById('vdDur').textContent);
  ok(N+'time shows the length',dur==='0:10.0',dur);

  /* play, pause */
  await pg.tap('#vdPlay'); await pg.waitForTimeout(1100);
  const p1=await pg.evaluate(()=>({...window.__video(),label:document.getElementById('vdPlay').getAttribute('aria-label')}));
  ok(N+'Play: the time advances with the clock and the button says Pause',p1.playing&&p1.t>.6&&p1.t<2.2&&p1.label==='Pause',p1);
  await pg.tap('#vdPlay'); await pg.waitForTimeout(250);
  const p2=await pg.evaluate(()=>({...window.__video(),label:document.getElementById('vdPlay').getAttribute('aria-label'),txt:document.getElementById('vdNow').textContent}));
  await pg.waitForTimeout(400); const p3=await pg.evaluate(()=>window.__video().t);
  ok(N+'Pause: it stops where it is',!p2.playing&&p2.label==='Play'&&Math.abs(p3-p2.t)<.001,{t:p2.t,after:p3,txt:p2.txt});

  /* timeline: touch drag */
  const tb=await pg.evaluate(()=>{ const r=document.getElementById('vdTrack').getBoundingClientRect(); return {x:r.left,w:r.width,y:r.top+r.height/2,h:r.height}; });
  await dragTouch(cdp,tb.x+tb.w*.1,tb.x+tb.w*.6,tb.y);
  const d1=await pg.evaluate(()=>({t:window.__video().t,vt:document.getElementById('vdTrack').getAttribute('aria-valuetext')}));
  ok(N+'a touch drag on the timeline moves the time (~6 s) and updates the slider text',d1.t>5.4&&d1.t<6.6&&/seconds of 10/.test(d1.vt),d1);
  ok(N+'the timeline is at least 48px tall and is a slider',tb.h>=48&&await pg.getAttribute('#vdTrack','role')==='slider',tb.h);
  const segs=await pg.$$eval('#vdSegs .vd-seg',l=>l.map(s=>s.title));
  ok(N+'scenes are segments with titles',segs.length>=5&&segs.every(Boolean),segs.length);
  await pg.focus('#vdTrack'); await pg.keyboard.press('Home'); await pg.keyboard.press('ArrowRight');
  const k1=await pg.evaluate(()=>window.__video().t); await pg.keyboard.press('Shift+ArrowRight'); const k2=await pg.evaluate(()=>window.__video().t);
  ok(N+'arrow keys: one frame, Shift one second',Math.abs(k1-1/30)<.002&&Math.abs(k2-k1-1)<.002,{k1,k2});
  await pg.keyboard.press('Space'); await pg.waitForTimeout(500); const sp=await pg.evaluate(()=>window.__video()); await pg.keyboard.press('Space');
  ok(N+'Space plays and pauses',sp.playing&&!(await pg.evaluate(()=>window.__video().playing)));
  await pg.evaluate(()=>document.getElementById('vdTrack').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))); await pg.tap('#vdPlay'); await pg.waitForTimeout(300);
  const again=await pg.evaluate(()=>window.__video()); await pg.tap('#vdPlay');
  ok(N+'Play at the end starts again from 0',again.playing&&again.t<1,again.t);

  /* Text tab */
  const inp=pg.locator('#paneText input').first();
  const dirs=await inp.evaluate(el=>({rtl:el.matches(':dir(rtl)'),dir:el.getAttribute('dir'),val:el.value,sz:parseFloat(getComputedStyle(el).fontSize),max:el.maxLength,eh:el.getAttribute('enterkeyhint'),inlineEnd:(()=>{ const c=el.parentElement.querySelector('[data-clear]').getBoundingClientRect(), r=el.getBoundingClientRect(); return c.left>=r.left-1&&c.right<=r.right+1&&c.left<r.left+r.width/2; })()}));
  ok(N+'the Arabic default is right to left, 17px+, maxlength 60, enterkeyhint done, dir=auto',dirs.rtl&&dirs.dir==='auto'&&dirs.val===ORIG&&dirs.sz>=17&&dirs.max===60&&dirs.eh==='done',dirs);
  const clr=await pg.evaluate(()=>{ const i=document.querySelector('#paneText input'), c=document.querySelector('#paneText [data-clear]').getBoundingClientRect(), r=i.getBoundingClientRect(); const s=getComputedStyle(i); return {clearOnLeft:c.right<=r.left+r.width/2+1,padEnd:parseFloat(s.paddingLeft)>=40||parseFloat(s.paddingRight)>=40,w:c.width,h:c.height}; });
  ok(N+'in RTL the clear ✕ sits at the left (inline-end) with room for it, 48px target',clr.clearOnLeft&&clr.padEnd&&clr.w>=44&&clr.h>=44,clr);
  await inp.tap(); await pg.waitForTimeout(400);
  const fo=await pg.evaluate(()=>({t:window.__video().t,playing:window.__video().playing}));
  ok(N+'focusing the box pauses and jumps to where the words show',!fo.playing&&Math.abs(fo.t-9)<.05,fo);
  const b0=await band(pg);
  await inp.fill('Cold all winter'); await pg.waitForTimeout(200);
  const b1=await band(pg);
  ok(N+'typing English redraws the headline band',b0.s!==b1.s&&b1.n>0,{b0,b1});
  const w0=await pg.evaluate(()=>document.querySelector('#paneText [data-warn]').textContent.trim());
  ok(N+'a short line has no warning',w0==='',w0);
  await inp.fill(LONG); await pg.waitForTimeout(200);
  const w1=await pg.evaluate(()=>{ const w=document.querySelector('#paneText [data-warn]'), s=getComputedStyle(w), vis=w.getBoundingClientRect().height>0; return {txt:w.textContent.trim(),vis,role:w.getAttribute('role'),fg:s.color,bg:s.backgroundColor,icon:!!w.querySelector('svg')}; });
  const L1=lum(w1.fg), L2=lum(w1.bg), cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  ok(N+'a long line shows the amber warning (role=status, icon, 4.5:1)',w1.vis&&/Too long for its spot/.test(w1.txt)&&w1.role==='status'&&w1.icon&&cr>=4.5,{txt:w1.txt.slice(0,40),cr:+cr.toFixed(1)});
  await inp.fill(''); const hint=await pg.evaluate(()=>({h:document.querySelector('#paneText [data-hint]').textContent,clear:document.querySelector('#paneText [data-clear]').hidden}));
  ok(N+'an empty box shows a hint and hides ✕',/empty/.test(hint.h)&&hint.clear,hint);
  await pg.evaluate(()=>document.querySelector('#paneText input').blur());
  await inp.fill('Cold all winter'); await pg.tap('#paneText [data-orig]'); await pg.waitForTimeout(200);
  const o1=await pg.evaluate(()=>({v:document.querySelector('#paneText input').value,h:document.querySelector('#paneText [data-orig]').hidden}));
  ok(N+'Use the original words resets (and hides itself)',o1.v===ORIG&&o1.h,o1);
  await pg.tap('#paneText [data-phrase]'); await pg.waitForSelector('dialog[open] .vd-phr button');
  const ph=await pg.$$eval('dialog[open] .vd-phr button',l=>l.map(x=>x.textContent));
  ok(N+'Pick a phrase lists the template words first, then the brand phrases',ph.length>5&&ph[0].includes('حتى في البرد'),ph.length);
  await pg.tap('dialog[open] .vd-phr button:nth-child(3)'); await pg.waitForTimeout(300);
  const ph2=await inp.inputValue();
  ok(N+'tapping a phrase fills the box',ph2===ph[2].replace(/Original$/,'')&&!(await pg.isVisible('dialog[open]')),ph2);
  await pg.tap('#paneText [data-orig]');

  /* Sound tab */
  await pg.tap('#tabSound'); await pg.waitForTimeout(200);
  const sd=await pg.evaluate(()=>({sel:document.getElementById('tabSound').getAttribute('aria-selected'),rows:[...document.querySelectorAll('.vd-row')].map(r=>r.dataset.id),marks:document.querySelectorAll('#vdMarks i').length,
    marksVis:!document.getElementById('vdMarks').hidden,duck:document.getElementById('vdDuck').checked,credits:!!document.querySelector('.vd-credits'),reset:document.getElementById('vdReset').disabled}));
  ok(N+'Sound tab: duck on, music row first, markers on the timeline, credits, Reset disabled',sd.sel==='true'&&sd.duck&&sd.rows[0]==='music'&&sd.rows.length>=18&&sd.marksVis&&sd.marks>15&&sd.credits&&sd.reset,sd);
  await pg.tap('.vd-row[data-id="hood"] [data-mute]'); await pg.waitForTimeout(150);
  const mu=await pg.evaluate(()=>{ const r=document.querySelector('.vd-row[data-id="hood"]'), b=r.querySelector('[data-mute]'), s=r.querySelector('[data-db]'); return {p:b.getAttribute('aria-pressed'),label:b.getAttribute('aria-label'),dis:s.disabled,grey:r.classList.contains('muted'),val:r.querySelector('[data-val]').textContent,op:getComputedStyle(r.querySelector('.n')).opacity,w:b.getBoundingClientRect().width}; });
  ok(N+'mute Hood slap: aria-pressed, greyed, slider disabled, "Muted"',mu.p==='true'&&mu.label==='Mute Hood slap'&&mu.dis&&mu.grey&&mu.val==='Muted'&&+mu.op<1&&mu.w>=48,mu);
  await pg.tap('.vd-row[data-id="hood"] [data-mute]');
  await pg.evaluate(()=>{ const s=document.querySelector('.vd-row[data-id="land"] [data-db]'); s.value='3'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  const db=await pg.evaluate(()=>{ const r=document.querySelector('.vd-row[data-id="land"]'); return {v:r.querySelector('[data-val]').textContent,a:r.querySelector('[data-db]').getAttribute('aria-valuetext'),reset:document.getElementById('vdReset').disabled,min:r.querySelector('[data-db]').min,max:r.querySelector('[data-db]').max}; });
  ok(N+'slider +3: value text "+3 dB", Reset becomes available',db.v==='+3 dB'&&db.a==='+3 dB'&&!db.reset&&db.min==='-24'&&db.max==='6',db);
  await pg.tap('#vdReset'); await pg.waitForTimeout(200);
  const rs=await pg.evaluate(()=>({v:document.querySelector('.vd-row[data-id="land"] [data-val]').textContent,reset:document.getElementById('vdReset').disabled}));
  ok(N+'Reset to original mix puts it back and disables itself',rs.v==='0 dB'&&rs.reset,rs);
  await pg.tap('.vd-row[data-id="hood"] [data-name], .vd-row[data-id="hood"] [data-jump]'); await pg.waitForTimeout(200);
  const jt=await pg.evaluate(()=>window.__video().t);
  ok(N+'tapping a sound name jumps 0.3 s before its first hit',Math.abs(jt-0.6)<.05,jt);
  await pg.tap('.vd-row[data-id="hood"] [data-solo]'); await pg.waitForTimeout(300);
  ok(N+'the play-alone button turns on (and not the main playback)',await pg.evaluate(()=>document.querySelector('.vd-row[data-id="hood"] [data-solo]').classList.contains('on')&&!window.__video().playing));
  await pg.tap('.vd-row[data-id="hood"] [data-solo]');
  await pg.tap('#tabText');
  ok(N+'switching back to Text hides the markers',await pg.evaluate(()=>document.getElementById('vdMarks').hidden));

  /* safe zones */
  await pg.tap('#vdSafeBtn'); await pg.waitForTimeout(100);
  const sz=await pg.evaluate(()=>{ const s=document.getElementById('vdSafe'), pv=document.getElementById('vdPv').getBoundingClientRect(), bx=s.querySelector('.sz-box').getBoundingClientRect(), b=document.getElementById('vdSafeBtn');
    return {vis:s.getBoundingClientRect().height>0,pressed:b.getAttribute('aria-pressed'),pe:getComputedStyle(s).pointerEvents,top:(bx.top-pv.top)/pv.height*1920,bottom:(pv.bottom-bx.bottom)/pv.height*1920,right:(pv.right-bx.right)/pv.width*1080,left:(bx.left-pv.left)/pv.width*1080,ls:localStorage.getItem('studio:video:safe'),bw:b.getBoundingClientRect().width}; });
  ok(N+'Safe zones: overlay shows the unsafe areas (250/560/140/40), remembered, never blocks taps',sz.vis&&sz.pressed==='true'&&sz.pe==='none'&&Math.abs(sz.top-250)<4&&Math.abs(sz.bottom-560)<4&&Math.abs(sz.right-140)<4&&Math.abs(sz.left-40)<4&&sz.ls==='true'&&sz.bw>=44,sz);
  await pg.reload(); await ready(pg);
  ok(N+'Safe zones stays on after a reload',await pg.evaluate(()=>!document.getElementById('vdSafe').hidden&&document.getElementById('vdSafeBtn').getAttribute('aria-pressed')==='true'));
  await pg.tap('#vdSafeBtn');
  ok(N+'Safe zones off again',await pg.evaluate(()=>document.getElementById('vdSafe').hidden));

  /* edits for the team save */
  await pg.locator('#paneText input').first().fill('Cold all winter'); await pg.evaluate(()=>document.querySelector('#paneText input').blur());
  await pg.tap('#tabSound'); await pg.tap('.vd-row[data-id="hood"] [data-mute]');
  await pg.evaluate(()=>{ const s=document.querySelector('.vd-row[data-id="music"] [data-db]'); s.value='-6'; s.dispatchEvent(new Event('input',{bubbles:true})); });
  await pg.fill('#vdName','Winter test');

  /* Save sheet */
  await pg.tap('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo');
  const s0=await pg.evaluate(()=>({txt:document.querySelector('dialog[open]').innerText,go:document.getElementById('vsGo').disabled,filled:0}));
  const f0=await filled(pg);
  ok(N+'Save sheet: Save video (MP4 · 1080×1920 · 10 s), team save, exactly one filled button',/Save video/.test(s0.txt)&&/MP4 · 1080×1920 · 10 s/.test(s0.txt)&&/Save edits to the team/.test(s0.txt)&&/Keeps your words and your mix, not the video/.test(s0.txt)&&f0===1,{f0});
  /* team save from the sheet */
  await pg.tap('#vsTeam'); await pg.waitForFunction(()=>/Saved to the team/.test(document.getElementById('vsSt').textContent),null,{timeout:15000});
  const saved=await pg.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{}}').designs; const id=Object.keys(d)[0]; return {n:Object.keys(d).length,id,tool:d[id]&&d[id].tool,name:d[id]&&d[id].name,r:d[id]&&d[id].recipe,url:location.search,status:document.getElementById('vdStatus').textContent}; });
  ok(N+'team save stores tool video with the reel, words and mix; URL has ?design=; status "Saved to the team"',saved.n===1&&saved.tool==='video'&&saved.name==='Winter test'&&saved.r.kind==='reel'&&saved.r.reel==='winter-cat'&&saved.r.texts.headline==='Cold all winter'&&saved.r.mix.hood.mute===true&&saved.r.mix.music.db===-6&&saved.r.duck===true&&/design=/.test(saved.url)&&saved.status==='Saved to the team',{...saved,r:undefined});
  first[scheme]=saved.id;

  /* Save video: the real MP4 */
  await pg.tap('#vsGo'); await pg.waitForSelector('dialog[open] .progress',{timeout:15000});
  const f1=await filled(pg);
  const txts=new Set(); let lastTxt='';
  for(let i=0;i<600;i++){ const t=await pg.evaluate(()=>{ const e=document.getElementById('vsTxt'); return e?e.textContent:(document.querySelector('dialog[open] h3')||{}).textContent; }); if(t&&t!==lastTxt){ txts.add(t); lastTxt=t; }
    if(await pg.evaluate(()=>!!window.__videoLast)) break; await wait(200); }
  await pg.waitForFunction(()=>!!window.__videoLast,null,{timeout:240000});
  const last=await pg.evaluate(()=>window.__videoLast); await pg.waitForSelector('#vsOut',{timeout:15000});
  const f2=await filled(pg), dn=await pg.evaluate(()=>({h:document.querySelector('dialog[open] h3').textContent,btn:document.getElementById('vsOut').textContent,txt:document.querySelector('dialog[open]').innerText}));
  ok(N+'while making: progress text changes ("Frame N of M"), no filled button',[...txts].some(t=>/Frame \d+ of \d+/.test(t))&&txts.size>=3&&f1===0,{f1,sample:[...txts].slice(0,4)});
  ok(N+'the MP4 is real: >100 kB, video/mp4, frames, mode',last.size>100000&&/mp4/.test(last.type)&&last.frames>=290&&/webcodecs|recorder/.test(last.mode),last);
  ok(N+'done: "Your video is ready", one filled "Share or save" (touch), the file name',dn.h==='Your video is ready'&&dn.btn==='Share or save'&&f2===1&&/Winter-test \d{8}-\d{4}\.mp4/.test(dn.txt),{f2,btn:dn.btn,txt:dn.txt.slice(0,80)});
  await pg.tap('#vsClose');
  ok(N+'no errors during the whole run',errs.length===0,errs.slice(0,3));

  /* reopen the saved design */
  await pg.goto(BASE+'tools/video.html?design='+saved.id); await ready(pg);
  const re=await pg.evaluate(()=>({v:document.querySelector('#paneText input').value,name:document.getElementById('vdName').value,st:document.getElementById('vdStatus').textContent,ph:document.getElementById('vdName').placeholder}));
  await pg.tap('#tabSound');
  const re2=await pg.evaluate(()=>({m:document.querySelector('.vd-row[data-id="hood"] [data-mute]').getAttribute('aria-pressed'),music:document.querySelector('.vd-row[data-id="music"] [data-val]').textContent,reset:document.getElementById('vdReset').disabled}));
  ok(N+'reopening ?design= restores the words, the name, the mute and the music level',re.v==='Cold all winter'&&re.name==='Winter test'&&re.st==='Saved to the team'&&re2.m==='true'&&re2.music==='−6 dB'&&!re2.reset,{re,re2});
  await pg.locator('#paneText').evaluate(()=>{}); await pg.tap('#tabText'); await pg.locator('#paneText input').fill('x');
  ok(N+'a changed saved design says "Not saved to the team"',await pg.evaluate(()=>document.getElementById('vdStatus').textContent)==='Not saved to the team');
  await pg.tap('#vdBack');
  await pg.waitForSelector('dialog[open] #lvUpd',{timeout:5000}).catch(()=>{});
  const lv=await pg.evaluate(()=>({open:!!document.querySelector('dialog[open] #lvUpd'),url:location.pathname}));
  ok(N+'leaving a changed saved design asks first (one filled Update button)',lv.open&&/video\.html/.test(lv.url)&&await filled(pg)===1,lv);
  await pg.tap('#lvKeep');

  /* hub */
  await pg.evaluate(()=>{ try{ localStorage.setItem('studio:pins',JSON.stringify(['restock'])); }catch(e){} });
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  await pg.tap('#allTools'); await pg.waitForSelector('dialog[open] .lib-row',{timeout:5000});
  const at=await pg.evaluate(()=>{ const r=document.querySelector('dialog[open] .lib-row[data-id="video"]'); return r?{pinned:r.classList.contains('pinned'),txt:r.textContent.replace(/\s+/g,' ').trim(),home:!!document.querySelector('#toolGrid [data-id="video"], #toolGrid a[href*="video.html"]')}:null; });
  ok(N+'All tools lists "Video editor" (not pinned, not on Home)',!!at&&/Video editor/.test(at.txt)&&!at.pinned&&!at.home,at);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  await pg.goto(BASE+'index.html?s=1'); await pg.waitForTimeout(900); await pg.tap('#uq'); await pg.fill('#uq','video'); await pg.waitForTimeout(700);
  const sr=await pg.$$eval('#usPanel .us-row .us-t',l=>l.map(x=>x.textContent));
  ok(N+'search "video" finds the Video editor and the saved video',sr.includes('Video editor')&&sr.includes('Winter test'),sr.slice(0,6));
  await pg.goto(BASE+'index.html?o=1#saved'); await pg.waitForTimeout(1500);
  await pg.tap('#selBtn'); await pg.tap(`#savedGrid .sv-card[data-id="${saved.id}"] .sv-open`); await pg.tap('#selSave');
  await pg.waitForSelector('dialog[open] #bsNote:not([hidden])',{timeout:20000});
  const sk=await pg.evaluate(()=>({n:document.getElementById('bsNote').textContent,h:document.getElementById('bsH').textContent,frames:document.querySelectorAll('iframe.render-frame').length}));
  ok(N+'Saved → Save pictures on a video: skipped with a clear reason, no frame opened',/is a video: open it to save the MP4/.test(sk.n)&&sk.frames===0,sk);
  await ctx.close();
}

/* small phone and computer */
for(const scheme of ['light']){
  {
    const {ctx,pg,errs}=await newPage({width:360,height:740},scheme,true);
    await pg.goto(BASE+'tools/video.html'); await ready(pg);
    for(const tab of ['#tabText','#tabSound']){ await pg.tap(tab); await pg.waitForTimeout(150);
      const o=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,bw:document.body.scrollWidth,over:[...document.querySelectorAll('.vd-top *,.vd-trans *,.vd-side *')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&(r.right>innerWidth+1||r.left<-1); }).map(e=>e.className||e.tagName).slice(0,4)}));
      ok('360px '+tab+': no sideways scroll, nothing outside the screen',o.sw<=o.iw&&o.bw<=o.iw&&!o.over.length,o); }
    ok('360px: no errors',errs.length===0,errs.slice(0,3));
    await ctx.close();
  }
  {
    const {ctx,pg,errs}=await newPage({width:1280,height:800},scheme,false);
    await pg.goto(BASE+'tools/video.html'); await ready(pg);
    const dk=await pg.evaluate(()=>{ const st=document.querySelector('.vd-stage').getBoundingClientRect(), sd=document.querySelector('.vd-side').getBoundingClientRect(), tabs=document.querySelector('.vd-tabs').getBoundingClientRect(), pn=document.querySelector('.vd-panes').getBoundingClientRect(), pv=document.getElementById('vdPv').getBoundingClientRect();
      return {two:sd.left>=st.right-1&&sd.width>=370&&sd.width<=390,tabsTop:tabs.top<pn.top&&Math.abs(tabs.top-sd.top)<2,sw:document.documentElement.scrollWidth<=innerWidth,pvh:pv.height,bigPv:pv.height>=500,labels:[...document.querySelectorAll('.vd-seg span')].filter(s=>!s.hidden).length,bar:getComputedStyle(document.querySelector('.vd-back .back-txt')).display}; });
    ok('1280×800: preview left, panel right (~380px) with the tabs on top, no sideways scroll',dk.two&&dk.tabsTop&&dk.sw&&dk.bigPv,dk);
    ok('1280×800: scene labels show only where they fit',dk.labels>=2&&dk.labels<=7,dk.labels);
    await pg.focus('#paneText input'); await pg.waitForTimeout(200);
    await pg.click('#vdPlay'); await pg.waitForTimeout(700);
    const dp=await pg.evaluate(()=>window.__video());
    ok('1280×800: mouse Play works',dp.playing&&dp.t>.3,dp.t);
    await pg.click('#vdPlay');
    await pg.click('#vdSave'); await pg.waitForSelector('dialog[open] #vsGo'); const fd=await filled(pg);
    ok('1280×800: Save sheet has one filled button',fd===1,fd);
    await pg.keyboard.press('Escape');
    ok('1280×800: no errors',errs.length===0,errs.slice(0,3));
    await ctx.close();
  }
}
await b.close();
console.log(res.join('\n'));
const fails=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-fails} passed, ${fails} failed`);
process.exit(fails?1:0);
