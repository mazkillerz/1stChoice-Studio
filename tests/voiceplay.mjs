/* Voice playback (assets/ideas.js): tap + drag to seek, speed 1x/1.5x/2x remembered, one player at a time, continuation autoplay
   (same person, within 3 minutes), error + Retry, 44px targets, RTL keeps the player LTR. Real <audio> over generated WAVs.
   Run: node tests/voiceplay.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const T0=Date.now()-3*3600e3, at=min=>new Date(T0+min*60e3).toISOString();
const wav=secs=>{ const rate=8000, n=rate*secs, buf=Buffer.alloc(44+n*2); buf.write('RIFF',0); buf.writeUInt32LE(36+n*2,4); buf.write('WAVEfmt ',8); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22); buf.writeUInt32LE(rate,24); buf.writeUInt32LE(rate*2,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34); buf.write('data',36); buf.writeUInt32LE(n*2,40); return 'data:audio/wav;base64,'+buf.toString('base64'); };
const W=wav(8);
function seeded(arabic){
  const db=seedDesigns(); const I=(id,o)=>({id,brand:'1stchoice',title:'',note:'',type:'post',stage:'idea',link:null,image_path:null,audio_path:null,audio_secs:null,design_id:null,calendar_id:null,sort:0,author:'Omar',seen_at:at(0),seen_by:'Sara',deleted_at:null,deleted_by:null,created_at:at(0),updated_at:at(0),...o});
  const N=(id,author,min,file,o)=>({id,idea_id:'i1',brand:'1stchoice',author,body:'',created_at:at(min),audio_path:file?'1stchoice/ideas/i1/notes/'+file:null,audio_secs:file?8:null,deleted_at:null,...o});
  ['v0','a','b','c','d'].forEach(f=>{ db.files['1stchoice/ideas/i1/'+(f==='v0'?'voice.wav':'notes/'+f+'.wav')]=W; }); db.files['1stchoice/ideas/i1/notes/bad.wav']='data:audio/wav;base64,AAAA';
  db.ideas=[ I('i1',{title:arabic?'فكرة جديدة':'Voice thread',author:arabic?'عمر':'Omar',audio_path:'1stchoice/ideas/i1/voice.wav',audio_secs:8}) ];
  const au=arabic?'عمر':'Omar', sa=arabic?'سارة':'Sara';
  db.idea_notes=[ N('n1',au,2,'a.wav'), N('n2',sa,3,'b.wav'), N('n3',sa,4,'c.wav'), N('n4',au,30,'d.wav'), N('n5',au,31,'bad.wav') ];
  return db;
}
const init=db=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:flag:plan','1');
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}
  window.__auds=[]; const A=window.Audio; window.Audio=function(...a){ const x=new A(...a); window.__auds.push(x); return x; }; window.Audio.prototype=A.prototype;`;
async function mk(opts,db){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(db)}); return ctx;
}
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const wait=(pg,f,a)=>pg.waitForFunction(f,a,{timeout:6000}).then(()=>true).catch(()=>false);
const open=async pg=>{ await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-top',{timeout:10000}); await pg.waitForFunction(()=>!document.querySelector('#ideasView .id-skel'),null,{timeout:10000});
  await pg.tap('.id-card[data-id="i1"] .id-main'); await pg.waitForSelector('dialog .id-thread .id-voice'); };
const V=i=>`dialog .id-thread .id-msg:nth-child(${i+1}) .id-voice`;   /* 0 = idea's own voice note, 1..5 = replies */
const barPt=async(pg,i,f)=>{ const el=await pg.$(V(i)+' .id-vbar'); await pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:3000,polling:50}).catch(()=>{}); await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'})); await pg.waitForTimeout(80);   /* measure after the sheet has slid in */ const r=await el.boundingBox();   /* the player can sit below the fold in the read-first sheet */ return {x:r.x+r.width*f,y:r.y+r.height/2,r}; };
const cur=(pg,k=-1)=>pg.evaluate(k=>{ const a=window.__auds.at(k); return a?{t:a.currentTime,d:a.duration,paused:a.paused,rate:a.playbackRate,pp:a.preservesPitch,pre:a.preload}:null; },k);
const pauseAll=pg=>pg.evaluate(()=>window.__auds.forEach(a=>a.pause()));
const onPath=pg=>pg.evaluate(()=>{ const v=document.querySelector('.id-voice.on'); return v?v.dataset.path.split('/').pop():null; });
const shot=async(pg,n)=>{ if(SHOTS) await pg.screenshot({path:SHOTS+'/'+n+'.png'}); };

async function main(dark){
  const T=(dark?'dark ':'light ')+'voice: ';
  const ctx=await mk({...PH,colorScheme:dark?'dark':'light'},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|ERR_FAILED|net::|favicon|Failed to load resource|MEDIA_ELEMENT|decode/i.test(m.text())) errs.push(T+'console '+m.text()); });
  await open(pg); await pg.waitForSelector(V(5));
  /* targets */
  const sz=await pg.$$eval('dialog .id-voice',vs=>vs.slice(0,2).map(v=>['.id-play','.id-vbar','.id-rate'].map(s=>{ const r=v.querySelector(s).getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)]; })));
  ok(T+'play, wave bar and speed button are all at least 44px tall; speed at least 44 wide',sz.every(r=>r.every(([w,h])=>h>=44)&&r[2][0]>=44&&r[0][0]>=44),sz);
  ok(T+'the wave has 48 bars and touch-action pan-y on the bar only (it scrolls up/down, drags sideways to seek)',await pg.$eval(V(0),v=>{ const n=v.querySelectorAll('.id-vbar i').length; return n===48&&getComputedStyle(v.querySelector('.id-vbar')).touchAction==='pan-y'&&getComputedStyle(v).touchAction!=='none'; }));
  ok(T+'the wave is drawn from the audio (bars have a range of heights)',await pg.$eval(V(1),v=>new Set([...v.querySelectorAll('.id-vbar i')].map(i=>i.style.height)).size>1));
  await shot(pg,'vp-'+(dark?'dark':'light')+'-idle');
  /* tap to seek: the note was idle, so it starts there */
  let p=await barPt(pg,0,.5); await pg.touchscreen.tap(p.x,p.y);
  ok(T+'tapping the bar on an idle note starts it at that spot',await wait(pg,()=>{ const a=window.__auds.at(-1); return a&&a.currentTime>3.5&&a.duration>0; }),await cur(pg));
  await pauseAll(pg); let c=await cur(pg); ok(T+'tap at 50% seeks to about half',c.t>3.9&&c.t<4.8&&c.pre==='metadata',c);
  /* tap while active */
  await pg.tap(V(0)+' .id-play'); p=await barPt(pg,0,.25); await pg.touchscreen.tap(p.x,p.y); await pauseAll(pg); c=await cur(pg);
  ok(T+'tap at 25% moves the same note to about a quarter',c.t>1.9&&c.t<2.6,c);
  /* drag scrub */
  await pg.tap(V(0)+' .id-play'); await pauseAll(pg);
  p=await barPt(pg,0,.1); await pg.mouse.move(p.x,p.y); await pg.mouse.down(); const p2=await barPt(pg,0,.9); await pg.mouse.move((p.x+p2.x)/2,p.y,{steps:4}); await pg.mouse.move(p2.x,p.y,{steps:4}); await pg.mouse.up(); await pauseAll(pg); c=await cur(pg);
  ok(T+'dragging along the bar scrubs to the finger (about 90%)',c.t>6.7&&c.t<7.8,c);
  ok(T+'the wave paints played bars in accent (about 90%)',await pg.$eval(V(0),v=>{ const a=v.querySelectorAll('.id-vbar i.pl').length, n=v.querySelectorAll('.id-vbar i').length; return a>=Math.floor(n*.8)&&a<=n; }));
  /* time */
  await pg.tap(V(0)+' .id-play'); ok(T+'while playing the time reads elapsed / total',await wait(pg,()=>/^\d:\d\d \/ \d:\d\d$/.test(document.querySelector('dialog .id-thread .id-msg .id-vt').textContent.trim())),await pg.$eval(V(0)+' .id-vt',e=>e.textContent));
  ok(T+'the time sits in a bdi',await pg.$eval(V(0)+' .id-vt',e=>e.tagName==='BDI'));
  await pauseAll(pg); await shot(pg,'vp-'+(dark?'dark':'light')+'-playing');
  /* speed */
  const rb=V(0)+' .id-rate'; const lab=()=>pg.$eval(rb,e=>e.textContent), st=()=>pg.evaluate(()=>localStorage.getItem('studio:voiceRate'));
  ok(T+'speed starts at 1x',await lab()==='1×');
  await pg.tap(rb); const r15=[await lab(),await st(),(await cur(pg)).rate]; await pg.tap(rb); const r2=[await lab(),await st(),(await cur(pg)).rate]; await pg.tap(rb); const r1=[await lab(),await st(),(await cur(pg)).rate];
  ok(T+'speed cycles 1x to 1.5x to 2x to 1x, stored and applied to the audio',r15.join()==='1.5×,1.5,1.5'&&r2.join()==='2×,2,2'&&r1.join()==='1×,1,1',[r15,r2,r1]);
  ok(T+'pitch is preserved',(await cur(pg)).pp===true);
  await pg.tap(rb); await pg.tap(rb);   /* 2x */
  ok(T+'every player shows the same speed',await pg.$$eval('dialog .id-rate',bs=>bs.every(x=>x.textContent==='2×')));
  await pg.reload(); await open(pg); await pg.waitForSelector(V(3));
  ok(T+'the speed survives a reload and shows on every player',await pg.$$eval('dialog .id-rate',bs=>bs.length>=5&&bs.every(x=>x.textContent==='2×')));
  await pg.tap(V(3)+' .id-play'); await wait(pg,()=>window.__auds.length>0&&!window.__auds.at(-1).paused);
  ok(T+'a new player starts at the remembered speed',(await cur(pg)).rate===2,await cur(pg));
  /* one at a time */
  await pg.tap(V(4)+' .id-play'); await wait(pg,()=>window.__auds.length>=2&&!window.__auds.at(-1).paused);
  const live=await pg.evaluate(()=>window.__auds.filter(a=>!a.paused).length);
  ok(T+'starting a second note pauses the first (one player at a time)',live===1&&await onPath(pg)==='d.wav',[live,await onPath(pg)]);
  await pauseAll(pg);
  /* continuation: voice.wav (Omar) then a.wav (Omar, 2 min) continues; a.wav then b.wav (Sara) stops; b then c (Sara, 1 min) continues; c then d (Omar) stops */
  const nearEnd=async i=>{ const q=await barPt(pg,i,.97); await pg.touchscreen.tap(q.x,q.y); };
  await pg.tap(V(0)+' .id-play'); await wait(pg,()=>!window.__auds.at(-1).paused); await nearEnd(0);
  ok(T+'the same person right after (within 3 min): the next note starts by itself',await wait(pg,()=>{ const v=document.querySelector('.id-voice.on'); return v&&/a\.wav$/.test(v.dataset.path); }),await onPath(pg));
  await nearEnd(1); await pg.waitForTimeout(1500);
  ok(T+'a different person next: playback stops',await onPath(pg)===null&&(await pg.evaluate(()=>window.__auds.filter(a=>!a.paused).length))===0,await onPath(pg));
  await pg.tap(V(2)+' .id-play'); await wait(pg,()=>!window.__auds.at(-1).paused); await nearEnd(2);
  ok(T+'a second note by the same other person (1 min later) continues too',await wait(pg,()=>{ const v=document.querySelector('.id-voice.on'); return v&&/c\.wav$/.test(v.dataset.path); }),await onPath(pg));
  await nearEnd(3); await pg.waitForTimeout(1500);
  ok(T+'the same name but 26 minutes later: playback stops',await onPath(pg)===null&&(await pg.evaluate(()=>window.__auds.filter(a=>!a.paused).length))===0,await onPath(pg));
  /* error + retry */
  const n0=await pg.evaluate(()=>window.__auds.length);
  await pg.tap(V(5)+' .id-play'); ok(T+'a note that cannot load shows the calm message',await wait(pg,()=>document.querySelector('dialog .id-thread .id-msg:nth-child(6) .id-voice.err')),'');
  const er=await pg.$eval(V(5),v=>({t:v.querySelector('.id-verr').innerText.trim(),vis:getComputedStyle(v.querySelector('.id-verr')).display!=='none',rh:v.querySelector('.id-retry').getBoundingClientRect().height,play:getComputedStyle(v.querySelector('.id-play')).display}));
  ok(T+'the message reads "Could not play this voice note" with a 44px Retry',er.t==='Could not play this voice note'&&er.vis&&er.rh>=44,er);
  await shot(pg,'vp-'+(dark?'dark':'light')+'-error');
  await pg.tap(V(5)+' .id-retry'); await pg.waitForTimeout(600);
  ok(T+'Retry tries again',(await pg.evaluate(()=>window.__auds.length))>n0+1,[n0,await pg.evaluate(()=>window.__auds.length)]);
  await ctx.close(); }

await main(false); await main(true);

/* Arabic thread: the player stays left-to-right (play, wave, time, speed read left to right) */
{ const ctx=await mk(PH,seeded(true)); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('ar: '+e.message));
  await open(pg); await pg.evaluate(()=>{ document.documentElement.dir='rtl'; }); await pg.waitForSelector(V(2));
  const o=await pg.$$eval('dialog .id-thread .id-voice',vs=>vs.slice(0,3).map(v=>{ const x=s=>v.querySelector(s).getBoundingClientRect().left; return {dir:getComputedStyle(v).direction,ord:x('.id-play')<x('.id-vbar')&&x('.id-vt')<x('.id-skip')&&x('.id-skip')<x('.id-rate'),fits:v.getBoundingClientRect().right<=document.documentElement.clientWidth+1}; }));
  ok('RTL thread: every player is LTR (play, wave, time, skip, speed in that order) and fits the screen',o.length===3&&o.every(x=>x.dir==='ltr'&&x.ord&&x.fits),o);
  const hs=await pg.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
  ok('RTL thread: no horizontal page scroll',hs);
  if(SHOTS) await pg.screenshot({path:SHOTS+'/vp-rtl.png'});
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,5));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad} passed, ${bad} failed`); process.exit(bad?1:0);
