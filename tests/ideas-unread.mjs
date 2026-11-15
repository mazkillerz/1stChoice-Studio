/* Ideas Session 7 + 8 (assets/ideas.js): "Instant Plan" cache (studio:plan:ideas:<brand>), open(id), and "discussion first + unread":
   the sheet opens read-only (idea, then the thread, composer pinned), Edit -> form -> Save -> back; "N new" pills, onUnread(n), per-device seen map.
   Run: node tests/ideas-unread.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake0=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
/* the fake cloud answers after localStorage "fakedelay" ms, and records that it did */
const fake=fake0+`;(()=>{ const C=window.StudioCloud, d=()=>+localStorage.getItem('fakedelay')||0; window.__answered=0;
  ['ideas','ideaNotes'].forEach(k=>{ const f=C[k]; C[k]=async(...a)=>{ await new Promise(r=>setTimeout(r,d())); const r=await f(...a); if(k==='ideas') window.__answered++; return r; }; }); })();`;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const SHOTS=new URL('../studio-notes/pending/shots/',import.meta.url).pathname;
const hrs=n=>new Date(Date.now()-n*3600e3).toISOString();
const CK='studio:plan:ideas:1stchoice', SK='studio:ideas:seen:1stchoice';
function seeded(){
  const db=seedDesigns(); const I=(id,o)=>({id,brand:'1stchoice',title:'',note:'',type:'post',stage:'idea',link:null,image_path:null,audio_path:null,audio_secs:null,design_id:null,calendar_id:null,sort:0,author:'Sara',seen_at:hrs(5),seen_by:'Omar',deleted_at:null,deleted_by:null,created_at:hrs(20),updated_at:hrs(2),...o});
  const N=(id,idea,author,body,h)=>({id,brand:'1stchoice',idea_id:idea,author,body,audio_path:null,audio_secs:null,deleted_at:null,deleted_by:null,created_at:hrs(h)});
  db.ideas=[ I('u1',{title:'My reel about the slow pour',note:'Film it from above.\nGolden light.',type:'reel',link:'https://www.example.com/ref',created_at:hrs(10)}),
    I('u2',{title:'Seen and quiet',author:'Omar',created_at:hrs(12)}),
    I('u3',{title:'Brand new from Omar',author:'Omar',seen_at:null,seen_by:null,created_at:hrs(1)}),
    I('u4',{title:'Omar asked a question',author:'Omar',seen_at:hrs(6),created_at:hrs(15)}),
    I('u5',{title:'I answered myself',author:'Omar',seen_at:hrs(6),created_at:hrs(16)}) ];
  db.idea_notes=[ N('n1','u1','Omar','Love this one',4), N('n2','u1','Omar','We could film Friday',3),
    N('n3','u2','Omar','Old reply',8), N('n4','u4','Omar','Which can do we use?',2), N('n5','u5','Sara','Passion fruit, I think',1) ];
  return db;
}
const WRAP=`(()=>{ window.__unread=[]; let real; Object.defineProperty(window,'StudioIdeas',{configurable:true,get(){ return real; },set(v){ real=v&&{...v,init(o){ const prev=o.onUnread; o.onUnread=n=>{ window.__unread.push(n); prev&&prev(n); }; const api=v.init(o); window.__ideasApi=api; return api; }}; }}); })();`;
const init=(db,extra)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:flag:plan','1');
  ${extra||''} if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,db,extra){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:WRAP}); await ctx.addInitScript({content:init(db,extra)});
  return ctx;
}
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const stored=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const ls=(pg,k)=>pg.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');
const open=async(pg)=>{ await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-top',{timeout:10000}); await pg.waitForFunction(()=>!document.querySelector('#ideasView .id-skel'),null,{timeout:10000}); };
const wait=(pg,f,a)=>pg.waitForFunction(f,a,{timeout:5000}).then(()=>true).catch(()=>false);
const smalls=pg=>pg.evaluate(()=>{ const out=[]; document.querySelectorAll('dialog[open] button,dialog[open] input:not([hidden]),dialog[open] a').forEach(e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); if(!r.width||!r.height||cs.visibility==='hidden'||e.closest('[hidden]')) return; if(r.height<43.5||(r.width<43.5&&!e.matches('a'))) out.push((e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height)); }); return out; });
const unread=pg=>pg.evaluate(()=>window.__unread.slice());
const pillOf=(pg,id)=>pg.$eval('.id-card[data-id="'+id+'"] .id-unread',e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');

async function main(dark,w){
  const T=(dark?'dark ':'light ')+w+': ';
  const ctx=await mk({...PH,viewport:{width:w,height:w===360?740:844},colorScheme:dark?'dark':'light'},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|ERR_FAILED|net::|favicon/i.test(m.text())) errs.push(T+'console '+m.text()); });
  await open(pg);
  /* ---- unread pills ---- */
  ok(T+'my idea with two replies by others shows "2 new"',/^2 new/.test(await pillOf(pg,'u1')),await pillOf(pg,'u1'));
  ok(T+'an idea whose replies are older than the last open shows no pill',(await pillOf(pg,'u2'))==='');
  ok(T+'a reply newer than anybody opened shows "1 new"; my own reply makes no pill',/^1 new/.test(await pillOf(pg,'u4'))&&(await pillOf(pg,'u5'))==='');
  ok(T+'the never-opened idea keeps its new dot (and no pill)',!!(await pg.$('.id-card[data-id="u3"] .id-new-dot'))&&(await pillOf(pg,'u3'))==='');
  ok(T+'onUnread got 3 (u1, u3, u4)',(await unread(pg)).pop()===3,await unread(pg));
  /* ---- read-mode sheet: 1 tap ---- */
  await pg.tap('.id-card[data-id="u1"] .id-main'); await pg.waitForSelector('dialog.id-edit .id-rtitle'); await pg.waitForTimeout(500);
  const rd=await pg.evaluate(()=>{ const d=document.querySelector('dialog.id-edit'), dr=d.getBoundingClientRect(), c=d.querySelector('.id-composer').getBoundingClientRect(), th=d.querySelector('.id-thread').getBoundingClientRect(), ti=d.querySelector('.id-rtitle').getBoundingClientRect(), ed=d.querySelector('[data-edit]').getBoundingClientRect();
    return {title:d.querySelector('.id-rtitle').innerText,note:d.querySelector('.id-rnote').innerText,chips:d.querySelectorAll('.id-rchips .id-chip').length,form:d.querySelector('.id-form').hidden,
      composerInView:c.bottom<=dr.bottom+1&&c.top>dr.top&&c.bottom<=innerHeight+1,thread:th.top<innerHeight,threadAfter:th.top>ti.bottom,msgs:d.querySelectorAll('.id-msg').length,editRight:ed.right>dr.right-90&&ed.top<dr.top+70,
      editVisible:!d.querySelector('[data-edit]').hidden,sw:d.scrollWidth<=d.clientWidth,stage:d.querySelector('[data-qs][aria-pressed="true"]').dataset.qs}; });
  ok(T+'1 tap opens the idea itself: title, note, link chip, type; the form is hidden',rd.title==='My reel about the slow pour'&&/Film it from above/.test(rd.note)&&rd.chips>=1&&rd.form,rd);
  ok(T+'the Discussion thread follows the idea, replies are on screen without scrolling',rd.threadAfter&&rd.thread&&rd.msgs===2,rd);
  ok(T+'the composer is pinned inside the bottom of the sheet; Edit is top right',rd.composerInView&&rd.editVisible&&rd.editRight&&rd.sw,rd);
  ok(T+'opening cleared the pill at once; onUnread dropped to 2',await wait(pg,()=>!document.querySelector('.id-card[data-id="u1"] .id-unread'))&&(await unread(pg)).pop()===2,await unread(pg));
  const seen=await ls(pg,SK); ok(T+'the seen map holds the idea with an ISO time',!!seen&&!!seen.u1&&!isNaN(Date.parse(seen.u1)),seen);
  ok(T+'no control under 44px in the read sheet',(await smalls(pg)).length===0,await smalls(pg));
  await pg.screenshot({path:SHOTS+'ideas-sheet-read-'+(dark?'dark':'light')+(w===360?'-360':'')+'.png'});
  /* quick stage: one tap, stored */
  await pg.tap('dialog [data-qs="planned"]');
  await pg.waitForFunction(()=>JSON.parse(localStorage.getItem('fakecloud')).ideas.find(x=>x.id==='u1').stage==='planned',null,{timeout:4000}).catch(()=>{});
  ok(T+'the stage chip row changes the stage in one tap (stored)',(await stored(pg)).ideas.find(x=>x.id==='u1').stage==='planned');
  /* reply: text + Arabic RTL, no pill for my own reply */
  await pg.fill('#idReply','Great, Friday it is'); await pg.press('#idReply','Enter');
  ok(T+'a reply is sent from the read view',await wait(pg,()=>/Friday it is/.test(document.querySelector('dialog .id-thread').innerText)));
  await pg.fill('#idReply','ممتاز واجد'); await pg.tap('.id-csend');
  const rtl=await wait(pg,()=>{ const p=[...document.querySelectorAll('dialog .id-mtx')].pop(); return p&&/ممتاز/.test(p.innerText); })&&await pg.evaluate(()=>{ const p=[...document.querySelectorAll('dialog .id-mtx')].pop(); return p.getAttribute('dir')==='auto'&&getComputedStyle(p).direction==='rtl'; });
  ok(T+'an Arabic reply is right-to-left',rtl);
  /* Edit -> form -> Save -> read mode */
  await pg.tap('dialog [data-edit]'); await pg.waitForSelector('dialog #idTitle',{state:'visible'});
  const ed=await pg.evaluate(()=>{ const d=document.querySelector('dialog.id-edit'); return {read:d.querySelector('#idRead').hidden,thread:d.querySelector('.id-tw').hidden,composer:d.querySelector('.id-composer').hidden,save:!!d.querySelector('#idSave'),cancel:!!d.querySelector('#idCancel'),val:d.querySelector('#idTitle').value}; });
  ok(T+'Edit (1 tap) switches to the form with Save / Cancel; thread and composer step aside',ed.read&&ed.thread&&ed.composer&&ed.save&&ed.cancel&&ed.val==='My reel about the slow pour',ed);
  ok(T+'no control under 44px in the edit form',(await smalls(pg)).length===0,await smalls(pg));
  await pg.fill('#idTitle','Slow pour (edited)'); await pg.tap('#idCancel');
  ok(T+'Cancel returns to read mode and discards changes',await pg.evaluate(()=>document.querySelector('.id-rtitle').innerText==='My reel about the slow pour'&&document.querySelector('.id-form').hidden));
  await pg.tap('dialog [data-edit]'); await pg.fill('#idTitle','Slow pour (edited)'); await pg.tap('dialog [data-t="story"]'); await pg.tap('#idSave');
  ok(T+'Save returns to read mode (sheet stays open) with the new title',await wait(pg,()=>document.querySelector('dialog.id-edit .id-form').hidden&&document.querySelector('.id-rtitle').innerText==='Slow pour (edited)'&&!!document.querySelector('#idReply')));
  const s=await stored(pg), u1=s.ideas.find(x=>x.id==='u1'); ok(T+'the edit is stored',u1.title==='Slow pour (edited)'&&u1.type==='story',[u1.title,u1.type]);
  if(w===390&&!dark) await pg.screenshot({path:SHOTS+'ideas-sheet-after-save-light.png'});
  await pg.evaluate(()=>document.querySelector('dialog.id-edit').close()); await pg.waitForTimeout(250);
  ok(T+'my own replies leave no pill after closing',(await pillOf(pg,'u1'))==='');
  /* a reply from someone else arrives -> pill again, opening clears it */
  await pg.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); d.idea_notes.push({id:'n9',brand:'1stchoice',idea_id:'u2',author:'Omar',body:'One more thing',audio_path:null,audio_secs:null,deleted_at:null,deleted_by:null,created_at:new Date(Date.now()+1000).toISOString()}); localStorage.setItem('fakecloud',JSON.stringify(d)); });
  await pg.evaluate(()=>window.__ideasApi.refresh());
  ok(T+'a new reply by someone else shows "1 new" after a refresh; onUnread follows',await wait(pg,()=>/1\s+new/.test(document.querySelector('.id-card[data-id="u2"] .id-unread')?.innerText||''))&&(await unread(pg)).pop()===3,await unread(pg));
  ok(T+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await ctx.close();
}
await main(false,390); await main(true,390); await main(false,360); await main(true,360);

/* seen map is capped at 300 */
{ const ctx=await mk(PH,seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('cap: '+e.message));
  await open(pg);
  await pg.evaluate(k=>{ const m={}; for(let i=0;i<320;i++) m['old'+i]=new Date(Date.now()-(400-i)*60000).toISOString(); localStorage.setItem(k,JSON.stringify(m)); },SK);
  await pg.tap('.id-card[data-id="u2"] .id-main'); await pg.waitForSelector('dialog.id-edit'); await pg.evaluate(()=>document.querySelector('dialog.id-edit').close());
  const m=await ls(pg,SK); ok('the seen map keeps at most 300 entries, newest kept',Object.keys(m).length===300&&!!m.u2&&!m.old0,Object.keys(m).length);
  await ctx.close(); }

/* ---------- Instant Plan cache ---------- */
{ const ctx=await mk(PH,seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('cache: '+e.message));
  await open(pg); await pg.waitForFunction(k=>!!localStorage.getItem(k),CK,{timeout:4000}).catch(()=>{});
  const c=await ls(pg,CK);
  ok('cache: the first visit stores {v:1, at, items, notes}',!!c&&c.v===1&&!!c.at&&c.items.length===5&&c.notes.length===5,c&&[c.v,c.items.length,c.notes.length]);
  /* second visit: cloud answers after 1.5 s; cards paint before that */
  await pg.evaluate(()=>localStorage.setItem('fakedelay','1500'));
  const t0=Date.now(); await pg.goto('about:blank'); await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-card',{timeout:1400});
  const painted=await pg.evaluate(()=>({answered:window.__answered,skel:!!document.querySelector('#ideasView .id-skel'),pill:!!document.querySelector('.id-unread')}));
  ok('cache: the second visit paints the cards before the delayed cloud answers (no skeleton)',painted.answered===0&&!painted.skel,[painted,Date.now()-t0]);
  const lat=await pg.evaluate(()=>0); void lat;
  ok('cache: no "Updated … ago" line while online',!(await pg.$('.id-stale')));
  await pg.evaluate(()=>{ document.querySelector('.id-card[data-id="u2"]').__keep=1; });
  await wait(pg,()=>window.__answered>=1); await pg.waitForTimeout(300);
  ok('cache: same data after the refresh means no redraw (cards kept)',await pg.evaluate(()=>!!document.querySelector('.id-card[data-id="u2"]').__keep));
  /* changed data redraws */
  await pg.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); d.ideas[1].title='Seen and quiet (renamed)'; localStorage.setItem('fakecloud',JSON.stringify(d)); });
  await pg.goto('about:blank'); await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-card');
  ok('cache: the old title shows first',/Seen and quiet$/.test(await txt(pg,'.id-card[data-id="u2"] .id-title')));
  ok('cache: the refreshed title replaces it',await wait(pg,()=>/renamed/.test(document.querySelector('.id-card[data-id="u2"] .id-title')?.innerText||'')));
  /* open(id) before the load */
  await pg.evaluate(()=>localStorage.setItem('fakedelay','0'));
  await pg.evaluate(k=>{ const c=JSON.parse(localStorage.getItem(k)); c.items=c.items.filter(x=>x.id!=='u3'); localStorage.setItem(k,JSON.stringify(c)); },CK);
  await pg.evaluate(()=>localStorage.setItem('fakedelay','600'));
  await pg.goto('about:blank'); await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-card'); await pg.waitForFunction(()=>!!window.__ideasApi);
  await pg.evaluate(()=>window.__ideasApi.open('u3'));
  ok('open(id): an idea that is not loaded yet opens once the load finishes',await wait(pg,()=>/Brand new from Omar/.test(document.querySelector('dialog.id-edit .id-rtitle')?.innerText||'')));
  await pg.evaluate(()=>document.querySelector('dialog.id-edit')?.close()); await pg.waitForTimeout(200);
  await pg.evaluate(()=>window.__ideasApi.open('u2'));
  ok('open(id): a loaded idea opens at once',await pg.waitForSelector('dialog.id-edit .id-rtitle',{timeout:800}).then(()=>true).catch(()=>false));
  await ctx.close(); }

/* offline: cached paint plus "Updated 5 min ago" */
{ const ctx=await mk(PH,seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('offline: '+e.message));
  await open(pg); await pg.waitForFunction(k=>!!localStorage.getItem(k),CK,{timeout:4000}).catch(()=>{});
  await pg.evaluate(k=>{ const c=JSON.parse(localStorage.getItem(k)); c.at=new Date(Date.now()-5*60000).toISOString(); localStorage.setItem(k,JSON.stringify(c)); },CK);
  await pg.addInitScript(()=>{ Object.defineProperty(navigator,'onLine',{get:()=>false}); });
  await pg.goto('about:blank'); await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-card',{timeout:5000});
  ok('offline: the cached board shows (no offline wall)',(await pg.$$('#ideasView .id-card')).length===5&&!/You’re offline/.test(await txt(pg,'.id-content')));
  ok('offline: a quiet "Updated 5 min ago" line',await wait(pg,()=>/Updated\s+5 min ago/.test(document.querySelector('.id-stale')?.innerText||'')),await txt(pg,'.id-content'));
  await ctx.close(); }

/* signed out clears the cache */
{ const ctx=await mk(PH,seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('out: '+e.message));
  await open(pg); await pg.waitForFunction(k=>!!localStorage.getItem(k),CK,{timeout:4000}).catch(()=>{});
  await pg.evaluate(()=>localStorage.setItem('fakecloud-signedout','1'));
  await pg.goto('about:blank'); await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-top');
  ok('signed out: the cache key is cleared and the sign-in note shows',await wait(pg,()=>/Ideas are for your team/.test(document.querySelector('#ideasView .id-content')?.innerText||''))&&(await ls(pg,CK))===null);
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,5));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad} passed, ${bad} failed`); process.exit(bad?1:0);
