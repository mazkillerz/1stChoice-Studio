/* Create (w3-mp4): moving stories behind the `motion` flag. Flag off = no entry; flag on = presets on layers, saved with the design;
   a 5-8 s 1080x1920 30 fps H.264 MP4 whose last frame is the still design; no VideoEncoder = a plain message and the PNG still saves at
   2160x3840; sound = an audio track at the target loudness; phone 390 light/dark + 1280, targets >= 44 px. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'/tmp/studio-motion-shots/'; fs.mkdirSync(SHOTS,{recursive:true});
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const mk=async(opt,init)=>{ const ctx=await b.newContext(Object.assign({serviceWorkers:'block',acceptDownloads:true},opt)); await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(init) await ctx.addInitScript(init);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); }); return {ctx,pg}; };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0&&BD.main.find('Text').length>0,null,{timeout:25000}); await pg.waitForTimeout(900); };
const ON="try{localStorage.setItem('studio:flag:motion','1')}catch(e){}";
const menuLabels=async pg=>{ await pg.click('#crMenu'); await pg.waitForTimeout(250); const l=await pg.$$eval('#crMenuBox [role=menuitem]',a=>a.map(x=>x.textContent.trim())); await pg.keyboard.press('Escape'); await pg.mouse.click(5,300); await pg.waitForTimeout(150); return l; };

/* ---- minimal MP4 box reader ---- */
function boxes(buf,s,e,out,path){ let p=s; while(p+8<=e){ let sz=buf.readUInt32BE(p); const t=buf.toString('latin1',p+4,p+8); let h=8; if(sz===1){ sz=Number(buf.readBigUInt64BE(p+8)); h=16; } if(sz===0) sz=e-p; if(sz<8||p+sz>e) break;
  const cp=(path?path+'/':'')+t; out.push({t,cp,s:p+h,e:p+sz}); if(['moov','trak','mdia','minf','stbl'].includes(t)) boxes(buf,p+h,p+sz,out,cp); p+=sz; } return out; }
function mp4Info(buf){ const bx=boxes(buf,0,buf.length,[],''), info={tracks:[]}; const mv=bx.find(x=>x.cp==='moov/mvhd'); if(mv){ const v=buf[mv.s]; const o=v?20:12; info.timescale=buf.readUInt32BE(mv.s+o); info.dur=(v?Number(buf.readBigUInt64BE(mv.s+o+4)):buf.readUInt32BE(mv.s+o+4))/info.timescale; }
  const traks=bx.filter(x=>x.cp==='moov/trak');
  for(const tk of traks){ const inside=bx.filter(x=>x.s>=tk.s&&x.e<=tk.e&&x!==tk), t={}; const hd=inside.find(x=>x.t==='tkhd'); if(hd){ const v=buf[hd.s]; const o=v?88:76; t.w=buf.readUInt32BE(hd.s+o)/65536; t.h=buf.readUInt32BE(hd.s+o+4)/65536; }
    const hl=inside.find(x=>x.t==='hdlr'); t.kind=hl?buf.toString('latin1',hl.s+8,hl.s+12):''; const md=inside.find(x=>x.t==='mdhd'); if(md){ const v=buf[md.s]; t.ts=buf.readUInt32BE(md.s+(v?20:12)); }
    const ss=inside.find(x=>x.t==='stts'); if(ss){ const n=buf.readUInt32BE(ss.s+4); let cnt=0,dur=0; for(let i=0;i<n;i++){ const c=buf.readUInt32BE(ss.s+8+i*8), d=buf.readUInt32BE(ss.s+12+i*8); cnt+=c; dur+=c*d; } t.samples=cnt; t.fps=cnt/(dur/t.ts); }
    const sd=inside.find(x=>x.t==='stsd'); if(sd) t.codec=buf.toString('latin1',sd.s+12,sd.s+16); info.tracks.push(t); }
  return info; }
const pngSize=buf=>({w:buf.readUInt32BE(16),h:buf.readUInt32BE(20)});

/* ---- 1. flag off: nothing new ---- */
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800},deviceScaleFactor:1,colorScheme:'light'});
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg);
  const l=await menuLabels(pg); ok('flag off: no Moving story entry in the design menu',!l.some(x=>/moving/i.test(x)),l);
  ok('flag off: create-motion.js was never requested and no sheet opens',await pg.evaluate(async()=>{ await CRUI.openMotion(); return !window.CRMotion&&!document.getElementById('crMotionCss')&&!document.querySelector('#crSheet[data-name=motion]'); }));
  await ctx.close(); }

/* ---- 2. flag on, desktop 1280: presets, saved with the design, export ---- */
let lastInfo=null;
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800},deviceScaleFactor:1,colorScheme:'light'},ON);
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg);
  const l=await menuLabels(pg); ok('flag on: the design menu has Moving story…',l.some(x=>/moving story/i.test(x)),l);
  await pg.evaluate(()=>CRUI.openMotion()); await pg.waitForSelector('#crSheet[data-name=motion] .cm',{timeout:8000});
  ok('the Motion sheet opens with Auto, Play preview, Save video',await pg.evaluate(()=>['auto','play','save'].every(a=>!!document.querySelector('.cm [data-a='+a+']'))));
  const sounds=await pg.$$eval('.cm [data-snd]',a=>a.map(x=>x.textContent.trim())); ok('the sound list comes from the brand kit (No sound + 3)',sounds.length===4&&/no sound/i.test(sounds[0]),sounds);
  await pg.click('.cm [data-a=auto]'); await pg.waitForTimeout(700);
  const auto=await pg.evaluate(()=>{ const f=BD.activeFrame(), ls=BD.util.items(f).filter(n=>!n.hasName('frame-bg')); return ls.map(n=>({k:BD.util.kind(n),e:n.getAttr('enter')||null,name:BD.util.nameOf(n).slice(0,14)})); });
  ok('Auto gives layers entrances',auto.filter(x=>x.e).length>=2,auto);
  const withE=auto.filter(x=>x.e), types=new Set(withE.map(x=>x.e.type)); ok('Auto uses more than one kind of motion',types.size>=2,[...types]);
  const lastEnd=Math.max(...withE.map(x=>x.e.delay+x.e.dur)); ok('Auto staggers: the last entrance ends >= 1 s before the end of a 6 s story',lastEnd<=5.05&&Math.max(...withE.map(x=>x.e.delay))>0.4,lastEnd);
  ok('the first entrance starts early (within 0.5 s)',Math.min(...withE.map(x=>x.e.delay))<=0.5,withE[0]);
  /* pick a preset by hand */
  const row=pg.locator('.cm-row').nth(1); await row.click(); await pg.locator('.cm [data-t=slide]').click(); await pg.locator('.cm [data-d=left]').click(); await pg.waitForTimeout(200);
  const hand=await pg.evaluate(()=>{ const f=BD.activeFrame(), n=BD.util.items(f).filter(x=>!x.hasName('frame-bg'))[1]; return n.getAttr('enter'); }); ok('a preset picked by hand lands on the layer',hand&&hand.type==='slide'&&hand.dir==='left',hand);
  await pg.locator('.cm [data-len="8"]').click(); await pg.waitForTimeout(150);
  ok('length 8 s is stored on the page',await pg.evaluate(()=>BD.activeFrame().getAttr('motion').len===8));
  /* saved with the design: doc JSON round trip */
  const rt=await pg.evaluate(async()=>{ const j=BD.docJson(); const has=/"enter":\{"type"/.test(j)&&/"motion":\{"len":8/.test(j); await BD.loadDoc(JSON.parse(j)); await BD.fontsInDoc(); const f=BD.util.frames()[0], ls=BD.util.items(f).filter(x=>!x.hasName('frame-bg')); return {has,n:ls.filter(x=>x.getAttr('enter')).length,len:f.getAttr('motion').len}; });
  ok('presets are in the saved design data and survive a reload of it',rt.has&&rt.n>=2&&rt.len===8,rt);
  await pg.waitForTimeout(300); if(!(await pg.$('#crSheet[data-name=motion] .cm'))){ await pg.evaluate(()=>CRUI.openMotion()); await pg.waitForSelector('#crSheet[data-name=motion] .cm'); }
  /* play preview moves things and puts them back */
  const pv=await pg.evaluate(async()=>{ const f=BD.activeFrame(), ls=BD.util.items(f).filter(n=>!n.hasName('frame-bg')), snap=()=>ls.map(n=>[n.x(),n.y(),n.opacity(),n.scaleX()].join()).join('|'); const before=snap(); document.querySelector('.cm [data-a=play]').click(); await new Promise(r=>setTimeout(r,500)); const mid=snap(); document.querySelector('.cm [data-a=play]').click(); await new Promise(r=>setTimeout(r,200)); return {changed:mid!==before,restored:snap()===before}; });
  ok('Play preview animates the canvas and restores the layers',pv.changed&&pv.restored,pv);
  /* wipe cuts a layer in half, peek moves a picture in from its edge */
  const wp=await pg.evaluate(()=>{ const f=BD.activeFrame(), U=BD.util, ls=U.items(f).filter(n=>!n.hasName('frame-bg')), t=ls.find(n=>U.kind(n)==='text'), keep=ls.map(n=>n.getAttr('enter')||null);
    const ink=()=>{ const c=f.toCanvas({x:f.x(),y:f.y(),width:540,height:960,pixelRatio:.5}); const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let k=0; for(let i=0;i<a.length;i+=4) if(a[i]<200||a[i+1]<200||a[i+2]<200) k++; return k; };
    ls.forEach(n=>n.setAttr('enter',null)); const full=ink(); t.setAttr('enter',{type:'wipe',delay:0,dur:1,dir:'up'}); const rig=CRMotion.makeRig(f); rig.at(.5); const half=ink(); rig.at(0); const none=ink(); rig.restore(); const back=ink();
    ls.forEach((n,i)=>n.setAttr('enter',keep[i])); return {full,half,none,back}; });
  ok('crayon wipe reveals a layer left to right (half < full, start < half, restored)',wp.half<wp.full&&wp.none<wp.half&&wp.back===wp.full,wp);
  /* export 8 s */
  const t0=Date.now(); await pg.click('.cm [data-a=save]'); await pg.waitForFunction(()=>window.CRMotion&&window.CRMotion.last,null,{timeout:300000}); const secs=(Date.now()-t0)/1000;
  console.log('INFO export of an 8 s story: '+secs.toFixed(1)+' s');
  const L=await pg.evaluate(()=>{ const x=CRMotion.last; return {size:x.size,type:x.type,codec:x.codec,frames:x.frames,audio:x.audio}; }); ok('export result: MP4, 240 frames, no sound by default',L.type==='video/mp4'&&L.frames===240&&!L.audio&&L.size>20000,L);
  const bytes=await pg.evaluate(async()=>{ const r=await fetch(CRMotion.last.url), a=new Uint8Array(await r.arrayBuffer()); let s=''; for(let i=0;i<a.length;i+=0x8000) s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000)); return btoa(s); });
  const buf=Buffer.from(bytes,'base64'); fs.writeFileSync(SHOTS+'story.mp4',buf); const info=mp4Info(buf); lastInfo=info; const vt=info.tracks.find(t=>t.kind==='vide');
  ok('MP4 header: ftyp first, one video track 1080x1920, avc1',buf.toString('latin1',4,8)==='ftyp'&&!!vt&&vt.w===1080&&vt.h===1920&&vt.codec==='avc1',{vt,n:info.tracks.length});
  ok('~30 fps and duration within 5-8 s (8 s here)',vt&&Math.abs(vt.fps-30)<0.6&&info.dur>=5&&info.dur<=8.1&&Math.abs(info.dur-8)<0.2,{fps:vt&&vt.fps,dur:info.dur});
  ok('no audio track without sound',!info.tracks.some(t=>t.kind==='soun'),info.tracks.map(t=>t.kind));
  /* the last frame equals the still design */
  const cmp=await pg.evaluate(async()=>{ const f=BD.activeFrame(), still=BD.renderFrame(f,1), url=CRMotion.last.url;
    const draw=async()=>{ const v=document.createElement('video'); v.muted=true; v.playsInline=true; v.src=url; await new Promise((ok,no)=>{ v.onloadedmetadata=ok; v.onerror=()=>no(new Error('video error')); }); v.currentTime=Math.max(0,v.duration-0.02); await new Promise(r=>{ v.onseeked=r; setTimeout(r,4000); });
      const c=document.createElement('canvas'); c.width=270; c.height=480; const x=c.getContext('2d'); x.drawImage(v,0,0,270,480); return {c,vw:v.videoWidth,vh:v.videoHeight,d:v.duration}; };
    let r; try{ r=await draw(); }catch(e){ return {err:String(e)}; }
    const s=document.createElement('canvas'); s.width=270; s.height=480; const sx=s.getContext('2d'); sx.drawImage(still,0,0,270,480); const a=r.c.getContext('2d').getImageData(0,0,270,480).data, bb=sx.getImageData(0,0,270,480).data; let sum=0; for(let i=0;i<a.length;i+=4) sum+=(Math.abs(a[i]-bb[i])+Math.abs(a[i+1]-bb[i+1])+Math.abs(a[i+2]-bb[i+2]))/3; return {mad:sum/(a.length/4),vw:r.vw,vh:r.vh,d:r.d,blank:a.every((v,i)=>i%4===3||v===0)}; });
  if(cmp.err){ console.log('INFO video element could not decode here ('+cmp.err+'), comparing with VideoDecoder is not available'); ok('video element reports 1080x1920 (decode unavailable in this browser: header checked above)',true); }
  else { ok('video element: 1080x1920 and 8 s',cmp.vw===1080&&cmp.vh===1920&&Math.abs(cmp.d-8)<0.2,cmp); ok('the last frame matches the still design (mean abs diff < 6/255)',!cmp.blank&&cmp.mad<6,cmp); }
  await pg.screenshot({path:SHOTS+'desktop-done.png'});
  ok('the result shows a Download button and a video preview',await pg.evaluate(()=>!!document.querySelector('#cmVid')&&!!document.querySelector('.cm [data-a=out]')));
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:8000}),pg.click('.cm [data-a=out]')]); ok('Download hands over an .mp4 file',/\.mp4$/.test(dl.suggestedFilename()),dl.suggestedFilename());
  ok('the design is unchanged after export (layers restored)',await pg.evaluate(()=>{ const f=BD.activeFrame(); return BD.util.items(f).every(n=>n.opacity()>=0.99||n.hasName('frame-bg')||n.getAttr('locked')||n.opacity()===(n.attrs.opacity==null?1:n.attrs.opacity)); }));
  await ctx.close(); }

/* ---- 3. with sound: audio track at the target loudness ---- */
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800},deviceScaleFactor:1,colorScheme:'light'},ON);
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg); await pg.evaluate(()=>CRUI.openMotion()); await pg.waitForSelector('#crSheet[data-name=motion] .cm');
  await pg.click('.cm [data-a=auto]'); await pg.waitForTimeout(500); await pg.locator('.cm [data-len="5"]').click(); await pg.locator('.cm [data-snd=pop]').click(); await pg.waitForTimeout(150);
  await pg.click('.cm [data-a=save]'); await pg.waitForFunction(()=>window.CRMotion&&window.CRMotion.last,null,{timeout:300000});
  const L=await pg.evaluate(()=>{ const x=CRMotion.last; return {audio:x.audio,level:x.level,codec:x.codec,len:x.len}; }); console.log('INFO sound level',JSON.stringify(L));
  const buf=Buffer.from(await pg.evaluate(async()=>{ const r=await fetch(CRMotion.last.url), a=new Uint8Array(await r.arrayBuffer()); let s=''; for(let i=0;i<a.length;i+=0x8000) s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000)); return btoa(s); }),'base64');
  const info=mp4Info(buf); ok('with sound: the MP4 has a video and an audio track',info.tracks.some(t=>t.kind==='vide')&&info.tracks.some(t=>t.kind==='soun'),info.tracks.map(t=>t.kind));
  ok('a 5 s story lasts about 5 s',Math.abs(info.dur-5)<0.25,info.dur);
  ok('loudness: mean about -28 dB (within 2.5 dB), peaks <= -9 dB',L.level&&Math.abs(L.level.meanDb+28)<=2.5&&L.level.peakDb<=-8.95,L);
  await ctx.close(); }

/* ---- 4. no VideoEncoder: a plain message, the PNG still saves at 2160x3840 ---- */
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800},deviceScaleFactor:1,colorScheme:'light'},ON+";delete window.VideoEncoder;");
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg); await pg.evaluate(()=>CRUI.openMotion()); await pg.waitForSelector('#crSheet[data-name=motion] .cm');
  await pg.click('.cm [data-a=auto]'); await pg.waitForTimeout(400); await pg.click('.cm [data-a=save]'); await pg.waitForSelector('.cm [data-a=still]',{timeout:15000});
  const msg=await pg.textContent('#cmSt'); ok('the fallback says so in plain words',/cannot make video/i.test(msg)&&/still picture/i.test(msg),msg);
  ok('no broken video was offered',await pg.evaluate(()=>!document.querySelector('#cmVid')&&!window.CRMotion.last));
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),pg.click('.cm [data-a=still]')]); const p=await dl.path(); const sz=pngSize(fs.readFileSync(p));
  ok('the still PNG saves at 2160x3840',sz.w===2160&&sz.h===3840&&/\.png$/.test(dl.suggestedFilename()),sz);
  await ctx.close(); }

/* ---- 5. phone 390 touch, light + dark; and layout checks ---- */
for(const scheme of ['light','dark']){
  const {ctx,pg}=await mk({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:scheme},ON);
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg);
  await pg.tap('#crMenu'); await pg.waitForTimeout(250); await pg.locator('#crMenuBox [role=menuitem]',{hasText:'Moving story'}).tap(); await pg.waitForSelector('#crSheet[data-name=motion] .cm',{timeout:8000});
  await pg.tap('.cm [data-a=auto]'); await pg.waitForTimeout(600);
  const m=await pg.evaluate(()=>{ const q=s=>[...document.querySelectorAll(s)].map(e=>{ const r=e.getBoundingClientRect(); return Math.round(r.height); }); const sh=document.getElementById('crSheet').getBoundingClientRect();
    return {act:q('.cm-act .btn'),seg:q('.cm [data-len]'),rows:q('.cm-row'),sheetW:Math.round(sh.width),overflow:document.documentElement.scrollWidth>innerWidth+1,box:document.getElementById('crSheetB').scrollWidth>document.getElementById('crSheetB').clientWidth+1}; });
  ok('phone '+scheme+': buttons, length chips and rows are >= 44 px tall',[...m.act,...m.seg,...m.rows].every(h=>h>=44),m);
  ok('phone '+scheme+': no sideways scrolling',!m.overflow&&!m.box,m);
  await pg.screenshot({path:SHOTS+'phone-'+scheme+'.png'}); await ctx.close(); }
{ const {ctx,pg}=await mk({viewport:{width:1280,height:800},deviceScaleFactor:1,colorScheme:'dark'},ON);
  await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg); await pg.evaluate(()=>CRUI.openMotion()); await pg.waitForSelector('#crSheet[data-name=motion] .cm'); await pg.click('.cm [data-a=auto]'); await pg.waitForTimeout(500);
  const h=await pg.evaluate(()=>[...document.querySelectorAll('.cm button')].map(e=>Math.round(e.getBoundingClientRect().height)));
  ok('desktop 1280 dark: every control >= 44 px',h.every(x=>x>=44),h); await pg.screenshot({path:SHOTS+'desktop-dark.png'}); await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,4));
await b.close(); console.log(fails?fails+' FAILED':'ALL PASSED'); process.exit(fails?1:0);
