/* r6-ideas: one control row under the Plan tabs (stage tabs + search icon), type as a tag, no New button, search by type word;
   rebuilt voice player (wave stays while playing, running time, tap/drag seek, skip +-5 s) on the idea's own note and on a reply.
   Run: node tests/r6-ideas.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const T0=Date.now()-3*3600e3, at=min=>new Date(T0+min*60e3).toISOString();
const wav=secs=>{ const rate=8000, n=rate*secs, buf=Buffer.alloc(44+n*2); buf.write('RIFF',0); buf.writeUInt32LE(36+n*2,4); buf.write('WAVEfmt ',8); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22); buf.writeUInt32LE(rate,24); buf.writeUInt32LE(rate*2,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34); buf.write('data',36); buf.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++){ const env=.15+.85*Math.abs(Math.sin(i/rate*2.1)); buf.writeInt16LE(Math.round(9000*env*Math.sin(i*0.35)),44+i*2); } return 'data:audio/wav;base64,'+buf.toString('base64'); };
const W=wav(8);
function seeded(){
  const db=seedDesigns(); const I=(id,o)=>({id,brand:'1stchoice',title:'',note:'',type:'post',stage:'idea',link:null,image_path:null,audio_path:null,audio_secs:null,design_id:null,calendar_id:null,sort:0,author:'Omar',seen_at:at(0),seen_by:'Sara',deleted_at:null,deleted_by:null,created_at:at(0),updated_at:at(0),...o});
  db.files['1stchoice/ideas/i1/voice.wav']=W; db.files['1stchoice/ideas/i1/notes/a.wav']=W;
  db.ideas=[ I('i1',{title:'Voice thread',audio_path:'1stchoice/ideas/i1/voice.wav',audio_secs:8,type:'story'}), I('i2',{title:'Pour shot',type:'reel',created_at:at(5)}), I('i3',{title:'Weekend case',type:'giveaway',note:'win a case',created_at:at(6)}), I('i4',{title:'Planned one',type:'post',stage:'planned',created_at:at(7)}) ];
  db.idea_notes=[ {id:'n1',idea_id:'i1',brand:'1stchoice',author:'Sara',body:'',created_at:at(2),audio_path:'1stchoice/ideas/i1/notes/a.wav',audio_secs:8,deleted_at:null} ];
  return db;
}
const init=db=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}
  window.__auds=[]; const A=window.Audio; window.Audio=function(...a){ const x=new A(...a); window.__auds.push(x); return x; }; window.Audio.prototype=A.prototype;`;
async function mk(opts,db){ const ctx=await b.newContext({serviceWorkers:'block',...opts}); await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake})); await ctx.addInitScript({content:init(db)}); return ctx; }
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const wait=(pg,f,a)=>pg.waitForFunction(f,a,{timeout:6000}).then(()=>true).catch(()=>false);
const open=async pg=>{ await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-top',{timeout:10000}); await pg.waitForFunction(()=>!document.querySelector('#ideasView .id-skel'),null,{timeout:10000}); };
const cards=pg=>pg.$$eval('#ideasView .id-card',e=>e.map(c=>c.dataset.id));
const SHOTS=process.env.SHOTS||'';

async function main(dark){
  const T=(dark?'dark ':'light ')+'r6: ';
  const ctx=await mk({...PH,colorScheme:dark?'dark':'light'},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|ERR_FAILED|net::|favicon|Failed to load resource|MEDIA_ELEMENT|decode/i.test(m.text())) errs.push(T+'console '+m.text()); });
  await open(pg);
  /* one row */
  ok(T+'no type row and no New button',!(await pg.$('#ideasView .id-types'))&&!(await pg.$('#ideasView [data-idea-new]'))&&!(await pg.$('#ideasView [data-type]')));
  const row=await pg.evaluate(()=>{ const v=document.getElementById('ideasView'), r=v.querySelector('.id-row'); if(!r) return null; const bs=[...r.querySelectorAll('button')].filter(x=>x.offsetParent), ys=bs.map(x=>Math.round(x.getBoundingClientRect().top)), tabs=r.querySelectorAll('[data-stage-tab]').length;
    const top=v.querySelector('.id-top'); const rows=[...top.children].filter(c=>c.offsetParent&&!c.classList.contains('sr-only')); return {tabs,same:Math.max(...ys)-Math.min(...ys)<=4,n:bs.length,rows:rows.length,h:Math.round(r.getBoundingClientRect().height)}; });
  ok(T+'exactly one control row: 4 stage tabs + a search icon on the same line',row&&row.tabs===4&&row.n===5&&row.same&&row.rows===1,row);
  ok(T+'type is a tag on each card',await pg.$$eval('#ideasView .id-card',e=>e.length>0&&e.every(c=>c.querySelector('.id-pill'))));
  if(SHOTS) await pg.screenshot({path:SHOTS+'/r6-board-'+(dark?'dark':'light')+'.png'});
  /* search */
  await pg.tap('#ideasView [data-search]'); await pg.waitForSelector('#idQ');
  ok(T+'search icon turns the row into one search field with a close x',!!(await pg.$('#ideasView .id-row .id-search'))&&!(await pg.$('#ideasView [data-stage-tab]'))&&!!(await pg.$('#ideasView .id-row [data-search][aria-label="Close search"]')));
  await pg.fill('#idQ','reel'); await pg.waitForTimeout(150);
  ok(T+'typing "reel" matches the type: only the reel idea',JSON.stringify(await cards(pg))==='["i2"]',await cards(pg));
  await pg.fill('#idQ','planned'); await pg.waitForTimeout(150);
  ok(T+'a search looks in every stage (the planned idea shows from the Idea tab)',(await cards(pg)).includes('i4'));
  if(SHOTS) await pg.screenshot({path:SHOTS+'/r6-search-'+(dark?'dark':'light')+'.png'});
  await pg.tap('#ideasView [data-search]'); await pg.waitForTimeout(150);
  ok(T+'the x closes the search and brings the tabs and the full list back',!(await pg.$('#idQ'))&&(await pg.$$('#ideasView [data-stage-tab]')).length===4&&(await cards(pg)).length===3);
  await pg.tap('#ideasView [data-search]'); await pg.waitForSelector('#idQ'); await pg.fill('#idQ','x'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
  ok(T+'Escape closes the search',!(await pg.$('#idQ'))&&(await cards(pg)).length===3);
  await pg.tap('#ideasView [data-search]'); await pg.waitForSelector('#idQ'); await pg.goBack().catch(()=>{}); await pg.waitForTimeout(400);
  ok(T+'Back closes the search first (still on the Ideas page)',!(await pg.$('#idQ'))&&await pg.evaluate(()=>!document.getElementById('ideasView').hidden));
  /* the + opens New idea directly */
  await pg.tap('#fab'); ok(T+'the + on the Ideas tab opens New idea directly',await wait(pg,()=>!!document.querySelector('dialog.id-capdlg textarea')));
  await pg.evaluate(()=>document.querySelector('dialog.id-capdlg').close()); await pg.waitForTimeout(200);
  /* the player */
  await pg.tap('.id-card[data-id="i1"] .id-main'); await pg.waitForSelector('dialog .id-thread .id-voice');
  await pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:3000,polling:50}).catch(()=>{});
  for(const [k,sel] of [['own note','dialog .id-thread .id-msg:nth-child(1) .id-voice'],['reply','dialog .id-thread .id-msg:nth-child(2) .id-voice']]){
    const cur=()=>pg.evaluate(()=>{ const a=window.__auds.at(-1); return a?{t:a.currentTime,d:a.duration,paused:a.paused}:null; });
    const el=await pg.$(sel); await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'})); await pg.waitForTimeout(100);
    ok(T+k+': 48 bars, skip back/forward and speed are 44px, play is 44px',await el.evaluate(v=>{ const q=s=>v.querySelector(s).getBoundingClientRect(); return v.querySelectorAll('.id-vbar i').length===48&&[...v.querySelectorAll('.id-skip,.id-rate,.id-play')].every(x=>x.getBoundingClientRect().width>=44&&x.getBoundingClientRect().height>=44)&&v.querySelectorAll('.id-skip').length===2&&q('.id-vbar').height>=40; }));
    ok(T+k+': the wave is drawn from the audio',await wait(pg,s=>{ const v=document.querySelector(s); return v.dataset.wave==='1'&&new Set([...v.querySelectorAll('.id-vbar i')].map(i=>i.style.height)).size>6; },sel));
    await el.evaluate(v=>v.querySelector('.id-play').click());
    ok(T+k+': playing: the time runs past 0:00 as "0:0x / 0:08"',await wait(pg,s=>/^0:0[1-9] \/ 0:08$/.test(document.querySelector(s+' .id-vt').textContent),sel),await el.evaluate(v=>v.querySelector('.id-vt').textContent));
    const vis=await el.evaluate(v=>{ const r=v.querySelector('.id-vbar').getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),bars:v.querySelectorAll('.id-vbar i').length,pl:v.querySelectorAll('.id-vbar i.pl').length,on:v.classList.contains('playing')}; });
    ok(T+k+': the wave stays visible while playing and fills with progress',vis.w>80&&vis.h>=40&&vis.bars===48&&vis.pl>=1&&vis.on,vis);
    if(SHOTS&&k==='own note') await pg.screenshot({path:SHOTS+'/r6-player-'+(dark?'dark':'light')+'.png'});
    let r=await el.$eval('.id-vbar',e=>{ const q=e.getBoundingClientRect(); return {x:q.x+q.width*.75,y:q.y+q.height/2}; }); await pg.touchscreen.tap(r.x,r.y); await pg.evaluate(()=>window.__auds.forEach(a=>a.pause())); let c=await cur();
    ok(T+k+': tap at 75% seeks to about three quarters',c.t>5.5&&c.t<6.6,c);
    await el.$eval('.id-play',e=>e.click()); await el.$eval('.id-skip[data-skip="-5"]',e=>e.click()); await pg.evaluate(()=>window.__auds.forEach(a=>a.pause())); c=await cur();
    ok(T+k+': skip back 5 s from about 6 s lands near 1 s',c.t>0.5&&c.t<2.2,c);
    await el.$eval('.id-skip[data-skip="5"]',e=>e.click()); await pg.evaluate(()=>window.__auds.forEach(a=>a.pause())); c=await cur();
    ok(T+k+': skip forward 5 s lands near 6 s',c.t>5.5&&c.t<6.9,c);
    /* drag scrub: from 20% to 60% */
    const box=await el.$eval('.id-vbar',e=>{ const q=e.getBoundingClientRect(); return {x:q.x,y:q.y+q.height/2,w:q.width}; });
    await pg.evaluate(({x,y,w})=>{ const bar=document.querySelector('dialog .id-voice.on .id-vbar'); const fire=(t,cx)=>bar.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:7,pointerType:'touch',clientX:cx,clientY:y,isPrimary:true})); fire('pointerdown',x+w*.2); fire('pointermove',x+w*.4); fire('pointermove',x+w*.6); fire('pointerup',x+w*.6); },box);
    await pg.evaluate(()=>window.__auds.forEach(a=>a.pause())); c=await cur();
    ok(T+k+': dragging the wave scrubs (20% to 60% lands near 4.8 s)',c.t>4.2&&c.t<5.6,c);
    ok(T+k+': slider semantics (aria-valuenow, aria-valuetext)',await el.$eval('.id-vbar',e=>e.getAttribute('role')==='slider'&&/^\d+:\d\d of \d+:\d\d$/.test(e.getAttribute('aria-valuetext'))&&+e.getAttribute('aria-valuenow')>0));
    await pg.evaluate(()=>window.__auds.forEach(a=>a.pause()));
  }
  ok(T+'the player fits the sheet at 390 wide',await pg.$$eval('dialog .id-voice',vs=>vs.every(v=>v.getBoundingClientRect().right<=document.documentElement.clientWidth&&v.getBoundingClientRect().left>=0&&v.scrollWidth<=v.clientWidth+1)));
  await ctx.close();
}
await main(false); await main(true);
/* wide: columns, no type row, the search icon in one header row */
{ const ctx=await mk({viewport:{width:1280,height:800}},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('wide '+e.message)); await open(pg);
  ok('wide: no type row, no New button, search icon in one row above the columns',!(await pg.$('#ideasView .id-types'))&&!(await pg.$('#ideasView [data-idea-new]'))&&!!(await pg.$('#ideasView .id-row [data-search]'))&&(await pg.$$('#ideasView .id-col')).length===4);
  await pg.click('#ideasView [data-search]'); await pg.fill('#idQ','giveaway'); await pg.waitForTimeout(150);
  ok('wide: search filters the columns by type',JSON.stringify(await cards(pg))==='["i3"]',await cards(pg));
  await ctx.close(); }
await b.close();
console.log(res.join('\n')); ok('no page errors',!errs.length,errs.slice(0,3)); console.log(res.at(-1));
const f=res.filter(r=>r.startsWith('FAIL')).length; console.log((res.length-f)+' passed, '+f+' failed'); process.exit(f?1:0);
