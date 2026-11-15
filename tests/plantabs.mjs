/* 2.18.0 Plan tabs: Calendar · Ideas · Goals as one page (#planView) with swipeable tabs at the top (swipeTabs in studio.js).
   1 the old floating strip is gone; the tab bar sits at the top   2 tap a tab: the track slides, the hash follows, the underline sits under the label
   3 swipe sideways: next / previous pane, hash follows   4 all three panes are drawn (kept ready) and only one is on screen after a switch
   5 Back from a tab returns Home in one step   6 light + dark, 390 and 360 (no sideways page scroll), 1280 desktop   7 reduced motion: no smooth slide
   Run: node tests/plantabs.mjs (server on :8080 or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
async function mkp(opts){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); return {ctx,pg};
}
const state=pg=>pg.evaluate(()=>{ const tr=document.querySelector('#planView .pv-track'), w=tr.clientWidth, sel=[...document.querySelectorAll('.pv-tab')].findIndex(t=>t.getAttribute('aria-selected')==='true');
  const ind=document.querySelector('.st-ind').getBoundingClientRect(), lab=document.querySelectorAll('.pv-tab .st-l')[sel].getBoundingClientRect();
  const vis=['calendarView','ideasView','goalsView'].filter(id=>{ const r=document.getElementById(id).getBoundingClientRect(); return r.right>1&&r.left<innerWidth-1; });
  return {hash:location.hash,sel,pane:Math.round(tr.scrollLeft/w),indOk:Math.abs(ind.left-lab.left)<=2&&Math.abs(ind.width-lab.width)<=2,vis}; });
const settle=pg=>pg.waitForFunction(()=>{ const tr=document.querySelector('#planView .pv-track'); return tr&&Math.abs(tr.scrollLeft/tr.clientWidth-Math.round(tr.scrollLeft/tr.clientWidth))<0.01&&!document.getAnimations().some(a=>a.playState==='running'); },null,{timeout:4000,polling:50}).catch(()=>{});

async function phone(dark,width){
  const T=(dark?'dark':'light')+' '+width+': ';
  const {ctx,pg}=await mkp({viewport:{width,height:844},isMobile:true,hasTouch:true,colorScheme:dark?'dark':'light'});
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#calRow:not(.is-skel)',{timeout:10000}).catch(()=>{});
  await pg.evaluate(()=>{ const b=document.querySelector('[data-plan-go="ideas"]')||document.querySelector('.cal-home-row'); b.click(); });
  await pg.waitForFunction(()=>!document.getElementById('planView').hidden,null,{timeout:6000}); await settle(pg);
  ok(T+'no floating tab strip anywhere',await pg.evaluate(()=>!document.querySelector('.plan-tabs')));
  const top=await pg.evaluate(()=>{ const r=document.querySelector('#planView .pv-tabs').getBoundingClientRect(); return {top:r.top,h:r.height,n:document.querySelectorAll('.pv-tab').length}; });
  ok(T+'tab bar at the top with 3 tabs, >= 44px',top.top<80&&top.h>=44&&top.n===3,top);
  let s=await state(pg); const start=s.hash;
  ok(T+'opened on the tab it was asked for, underline under its label',['#ideas','#calendar'].includes(s.hash)&&s.indOk&&s.vis.length===1,s);
  await pg.tap('#pvt-goals'); await settle(pg); s=await state(pg);
  ok(T+'tap Goals: pane 3, #goals, underline follows, one pane on screen',s.hash==='#goals'&&s.sel===2&&s.pane===2&&s.indOk&&s.vis.length===1&&s.vis[0]==='goalsView',s);
  const cdp=await ctx.newCDPSession(pg), tp=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  await tp('touchStart',60,520); for(let i=1;i<=10;i++){ await tp('touchMove',60+i*Math.round(width/14),522); await pg.waitForTimeout(16); } await tp('touchEnd'); await pg.waitForTimeout(250); await settle(pg); await pg.waitForTimeout(200);
  s=await state(pg); ok(T+'swipe right: back to Ideas, hash follows',s.hash==='#ideas'&&s.sel===1&&s.pane===1&&s.indOk,s);
  await tp('touchStart',width-60,520); for(let i=1;i<=10;i++){ await tp('touchMove',width-60-i*Math.round(width/14),522); await pg.waitForTimeout(16); } await tp('touchEnd'); await pg.waitForTimeout(250); await settle(pg); await pg.waitForTimeout(200);
  s=await state(pg); ok(T+'swipe left: Goals again',s.hash==='#goals'&&s.pane===2,s);
  await pg.waitForFunction(()=>['calendarView','ideasView','goalsView'].every(id=>document.getElementById(id).children.length>0),null,{timeout:8000}).catch(()=>{});
  ok(T+'all three panes are drawn (kept ready)',await pg.evaluate(()=>['calendarView','ideasView','goalsView'].every(id=>document.getElementById(id).children.length>0)));
  ok(T+'off-screen panes are inert',await pg.evaluate(()=>document.getElementById('calendarView').inert&&!document.getElementById('goalsView').inert));
  ok(T+'no sideways page scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const col=await pg.evaluate(()=>{ const on=getComputedStyle(document.querySelector('.pv-tab[aria-selected="true"]')).color, off=getComputedStyle(document.querySelector('.pv-tab[aria-selected="false"]')).color; return {on,off}; });
  ok(T+'selected tab looks different from the others',col.on!==col.off,col);
  await pg.goBack(); await pg.waitForFunction(()=>!document.getElementById('homeView').hidden,null,{timeout:4000}).catch(()=>{});
  ok(T+'Back returns Home in one step',await pg.evaluate(()=>!document.getElementById('homeView').hidden&&document.getElementById('planView').hidden&&!/#(calendar|ideas|goals)/.test(location.hash)),start);
  await ctx.close();
}
await phone(false,390); await phone(true,390); await phone(false,360);

{ const {ctx,pg}=await mkp({viewport:{width:1280,height:800}});
  await pg.goto(BASE+'index.html#goals'); await pg.waitForFunction(()=>!document.getElementById('planView').hidden,null,{timeout:6000}); await settle(pg);
  let s=await state(pg); ok('desktop: #goals opens the Goals tab',s.hash==='#goals'&&s.pane===2&&s.indOk,s);
  await pg.click('#pvt-calendar'); await settle(pg); s=await state(pg); ok('desktop: click Calendar',s.hash==='#calendar'&&s.pane===0&&s.indOk,s);
  await pg.focus('#pvt-calendar'); await pg.keyboard.press('ArrowRight'); await settle(pg); s=await state(pg); ok('desktop: arrow key moves to Ideas',s.pane===1&&s.hash==='#ideas',s);
  await ctx.close(); }

{ const {ctx,pg}=await mkp({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForFunction(()=>!document.getElementById('planView').hidden,null,{timeout:6000});
  await pg.tap('#pvt-goals'); const sl=await pg.evaluate(()=>{ const tr=document.querySelector('#planView .pv-track'); return Math.round(tr.scrollLeft/tr.clientWidth*100)/100; });
  ok('reduced motion: the tab switch is instant',sl===2,sl); await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
