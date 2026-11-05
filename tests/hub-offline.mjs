/* Home + Saved when the cloud is out of reach or slow (1.46.0): the real assets/cloud.js with the Supabase host blocked or hanging.
   1 offline with a kept sign-in: "You're offline" + Try again on Home's Saved row and the Saved page (was "Not on the team yet")
   2 a slow cloud: "Still loading…" + Try again within ~9 s (was a blank row forever); the Account button still says Team
   3 the phone says it is offline (navigator.onLine false): the note shows at once; the "online" event loads again by itself
   4 an old sign-in that cannot refresh offline: a note within ~14 s (was blank for 45 s+)
   5 signed out with no signal: still the Sign in note (nothing changed)
   6 a list already on screen stays when a refresh fails; the toast says why (fakecloud, then the cloud goes away)
   7 cloud.js turns network errors into plain words (no "Failed to fetch"); 8 the notes fit at 360 px, both themes, no page errors.
   Run: node tests/hub-offline.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const T0=Date.now(); const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const sess=exp=>JSON.stringify({access_token:'x.y.z',refresh_token:'r',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+exp,token_type:'bearer',user:{id:'u1',email:'team@1stchoice.cloud',aud:'authenticated'}});
/* net: 'abort' (no connection) | 'hang' (never answers) ; auth: session lifetime in s, or null (signed out) ; off: navigator.onLine false */
const mk=async({w=390,h=844,dark=false,net='abort',auth=3600,off=false}={})=>{
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await ctx.route(/supabase\.co/,r=>net==='hang'?new Promise(()=>{}):r.abort('internetdisconnected'));
  await ctx.addInitScript(([s,off])=>{ try{ localStorage.setItem('studio:welcome','1'); if(s) localStorage.setItem('studio-auth',s); }catch(e){}
    if(off){ window.__on=false; Object.defineProperty(Navigator.prototype,'onLine',{configurable:true,get(){ return window.__on; }}); } },[auth===null?null:sess(auth),off]);
  return ctx; };
const open=async(ctx,tag,hash='')=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e)); await pg.goto(BASE+'index.html'+hash); return pg; };
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');
const waitTxt=(pg,s,re,ms)=>pg.waitForFunction(([s,re])=>new RegExp(re).test((document.querySelector(s)||{}).innerText||''),[s,re.source],{timeout:ms}).then(()=>true,()=>false);
const vis=(pg,s)=>pg.evaluate(s=>{ const e=document.querySelector(s); return !!e&&!e.hidden&&e.getClientRects().length>0; },s);

/* 1 offline, sign-in kept */
{ const ctx=await mk(), pg=await open(ctx,'1');
  const got=await waitTxt(pg,'#savedRowList',/offline/i,8000);
  const row=await txt(pg,'#savedRowList');
  ok('1 offline + signed in: Home row says "You’re offline"',got&&/You’re offline/.test(row),row.slice(0,90));
  ok('1 never "Not on the team yet" when offline',!/Not on the team/.test(row));
  ok('1 the note has Try again',await vis(pg,'#savedRowList [data-reload]'));
  ok('1 the Account button still says Team',(await txt(pg,'#acct'))==='Team',await txt(pg,'#acct'));
  await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForTimeout(400);
  const sv=await txt(pg,'#savedEmpty');
  ok('1 Saved page: the same note, no skeleton',/You’re offline/.test(sv)&&!(await pg.$('#savedGrid .sv-skel')),sv.slice(0,60));
  ok('1 Saved page: no sort / select / search buttons',!(await vis(pg,'#sortBtn'))&&!(await vis(pg,'#selBtn'))&&!(await vis(pg,'#findBtn')));
  /* Try again: still offline → the note comes back (not a stuck skeleton) */
  await pg.tap('#savedEmpty [data-reload]'); await pg.waitForTimeout(2500);
  ok('1 Try again while still offline: the note again',/You’re offline/.test(await txt(pg,'#savedEmpty')),await txt(pg,'#savedEmpty'));
  await ctx.close(); }

/* 2 slow cloud */
{ const ctx=await mk({net:'hang'}), pg=await open(ctx,'2'); const t=Date.now();
  await pg.waitForTimeout(1500);
  ok('2 slow: a skeleton while it waits (not a blank row)',(await pg.$$('#savedRowList .sv-skel')).length>0);
  const got=await waitTxt(pg,'#savedRowList',/Still loading/,11000);
  ok('2 slow: "Still loading…" + Try again within ~9 s',got&&Date.now()-t<11500&&await vis(pg,'#savedRowList [data-reload]'),Math.round((Date.now()-t)/1000)+' s');
  ok('2 slow: the Account button says Team',(await txt(pg,'#acct'))==='Team',await txt(pg,'#acct'));
  await ctx.close(); }

/* 3 navigator.onLine false, then back online */
{ const ctx=await mk({off:true}), pg=await open(ctx,'3');
  const got=await waitTxt(pg,'#savedRowList',/offline/i,2500);
  ok('3 the phone says offline: the note within 2.5 s',got,await txt(pg,'#savedRowList'));
  /* back online: the cloud answers again (fakecloud stands in), the list loads with no tap */
  await ctx.unroute(/supabase\.co/);
  await pg.evaluate(f=>{ window.__on=true; },fake);
  await pg.evaluate(()=>{ const s=window.StudioCloud; s.sessionState=async()=>({session:{user:{id:'u1',email:s.teamEmail}}}); s.checkMember=async()=>true; s.designs=async()=>[{id:'a1',tool:'restock',name:'Back online',kind:'design',thumb_path:'',updated_at:new Date().toISOString(),collections:[]}]; s.collections=async()=>[];
    window.dispatchEvent(new Event('online')); });
  const back=await waitTxt(pg,'#savedRowList',/Back online/,4000);
  ok('3 the "online" event loads the designs by itself',back,await txt(pg,'#savedRowList'));
  await ctx.close(); }

/* 4 an old sign-in, no signal */
{ const ctx=await mk({auth:-100}), pg=await open(ctx,'4'); const t=Date.now();
  const got=await waitTxt(pg,'#savedRowList',/Still loading|offline/i,15000);
  ok('4 old sign-in offline: a note with Try again within ~14 s (was blank 45 s+)',got&&await vis(pg,'#savedRowList [data-reload]'),Math.round((Date.now()-t)/1000)+' s');
  await ctx.close(); }

/* 5 signed out, no signal */
{ const ctx=await mk({auth:null}), pg=await open(ctx,'5');
  const got=await waitTxt(pg,'#savedRowList',/Sign in/,6000);
  ok('5 signed out offline: still the Sign in note',got&&await vis(pg,'#savedRowList [data-signin]'),await txt(pg,'#savedRowList'));
  await ctx.close(); }

/* 6 a list on screen stays when a refresh fails */
{ const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','1'); }catch(e){} }); await ctx.addInitScript({content:seedScript(seedDesigns())});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('6: '+e)); await pg.goto(BASE+'index.html#saved');
  await pg.waitForFunction(()=>document.querySelectorAll('#savedGrid .sv-card').length===8,null,{timeout:10000}); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const s=window.StudioCloud; s.designs=async()=>{ const e=new Error('No connection. Check your internet and try again.'); e.offline=true; throw e; }; });
  /* a successful rename asks for a fresh list: that refresh fails */
  await pg.evaluate(()=>{ document.querySelector('#savedGrid [data-dmore]').click(); }); await pg.waitForSelector('dialog[open] [data-act="rename"]',{timeout:4000});
  await pg.tap('dialog[open] [data-act="rename"]'); await pg.waitForSelector('dialog[open] input[type="text"]',{timeout:4000});
  await pg.fill('dialog[open] input[type="text"]','Renamed offline'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(800);
  ok('6 the 8 cards stay when the refresh fails',(await pg.$$('#savedGrid .sv-card')).length===8);
  const tt=await txt(pg,'#hubToast');
  ok('6 a toast says it is offline and shows the designs from before',/offline/i.test(tt),tt);
  await ctx.close(); }

/* 7 cloud.js error words */
{ const ctx=await mk({auth:null}), pg=await open(ctx,'7');
  await pg.waitForFunction(()=>window.StudioCloud&&window.StudioCloud.signInTeam,null,{timeout:6000});
  const m=await pg.evaluate(async()=>{ const out={}; try{ await StudioCloud.signInTeam('x'); }catch(e){ out.signin=e.message; }
    try{ await StudioCloud.designs('1stchoice'); }catch(e){ out.designs=e.message; out.flag=!!e.offline; }
    out.net=StudioCloud.netErr(new TypeError('Failed to fetch')); out.notNet=StudioCloud.netErr({message:'new row violates row-level security policy'}); return out; });
  ok('7 sign in with no signal: plain words, no "Failed to fetch"',/No connection/.test(m.signin||'')&&!/fetch/i.test(m.signin||''),m.signin);
  ok('7 a failed load: plain words, marked offline',/No connection|too slow/.test(m.designs||'')&&m.flag&&!/fetch/i.test(m.designs||''),m.designs);
  ok('7 netErr tells the connection from the cloud saying no',m.net&&!m.notNet,m);
  await ctx.close(); }

/* 8 fits at 360 px, both themes */
for(const dark of [false,true]){ const N='8 '+(dark?'dark':'light')+' 360: ';
  const ctx=await mk({w:360,h:740,dark,off:true}), pg=await open(ctx,N);
  await waitTxt(pg,'#savedRowList',/offline/i,3000);
  const r=await pg.evaluate(()=>{ const n=document.querySelector('#savedRowList .sv-note'), b=n&&n.querySelector('[data-reload]'), br=b&&b.getBoundingClientRect(), nr=n&&n.getBoundingClientRect();
    const col=getComputedStyle(n.querySelector('p')).color, bg=getComputedStyle(n).backgroundColor;
    return {sw:document.documentElement.scrollWidth, nr:nr&&[nr.left,nr.right], bh:br&&br.height, bw:br&&br.width, col, bg}; });
  ok(N+'no sideways scroll, the note inside the screen',r.sw<=360&&r.nr&&r.nr[0]>=0&&r.nr[1]<=360,r);
  ok(N+'the top bar fits while the button says Sign in (was 3px too wide)',(await txt(pg,'#acct'))==='Sign in'&&r.sw<=360,await txt(pg,'#acct')+' '+r.sw);
  ok(N+'Try again is 44px+ tall',r.bh>=44,r.bh);
  await ctx.close(); }

ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`hub-offline: ${res.length-f} pass, ${f} fail, ${Math.round((Date.now()-T0)/1000)} s`); process.exit(f?1:0);
