/* Home restructure (2.21.0): Part 1 (no tools grid, no + Idea pill, ideas via the + menu) and the "home2" preview flag (New Home):
   slim header + one greeting line, search, Today (Calendar | Ideas | Goals swipe tabs, fixed height), a compact tools list.
   390x844 touch light + dark, 360 and 1280x800. fakecloud stands in for Supabase. SHOTS=<dir> saves screenshots. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/', SHOTS=process.env.SHOTS||'';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const now=new Date(), TODAY=iso(now), MONTH=TODAY.slice(0,7), AR='علبتك باشن فروت واجد';
const db=seedDesigns();
const ts=n=>new Date(Date.now()-n*3600e3).toISOString();
db.calendar=[
  {id:'c1',brand:'1stchoice',day:TODAY,at:'09:30',status:'draft',format:'story',title:'Restock – 24 Oct',caption:'x',hashtags:[],design_ids:['seed0'],author:'Sara',created_at:ts(5)},
  {id:'c2',brand:'1stchoice',day:TODAY,at:'12:00',status:'in_review',format:'post',title:AR,caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:ts(5)},
  {id:'c3',brand:'1stchoice',day:TODAY,at:'18:00',status:'draft',format:'reel',title:'Evening reel',caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:ts(5)},
  {id:'c4',brand:'1stchoice',day:TODAY,at:'20:00',status:'draft',format:'post',title:'Fourth item',caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:ts(5)},
  {id:'c5',brand:'1stchoice',day:TODAY,at:'08:00',status:'posted',format:'post',title:'Already posted',caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:ts(5)},
  {id:'c6',brand:'1stchoice',day:MONTH+'-01',at:'08:00',status:'posted',format:'post',title:'Old posted',caption:'',hashtags:[],design_ids:[],author:'Sara',created_at:ts(500)}];
db.ideas=[
  {id:'i1',brand:'1stchoice',title:'Summer giveaway',note:'',type:'giveaway',stage:'inbox',sort:0,author:'Omar',seen_at:null,created_at:ts(1)},
  {id:'i2',brand:'1stchoice',title:AR,note:'',type:'post',stage:'inbox',sort:0,author:'Sara',seen_at:null,created_at:ts(2)},
  {id:'i3',brand:'1stchoice',title:'Behind the scenes',note:'',type:'reel',stage:'idea',sort:0,author:'Omar',seen_at:ts(1),created_at:ts(3)},
  {id:'i4',brand:'1stchoice',title:'Oldest idea',note:'',type:'story',stage:'idea',sort:0,author:'Omar',created_at:ts(40)}];
db.kpi_months=[{id:'m1',brand:'1stchoice',month:MONTH,targets:{post:12,story:8,reel:0},engagement:{},note:''}];
const dbEmpty=seedDesigns(); dbEmpty.calendar=[]; dbEmpty.ideas=[]; dbEmpty.kpi_months=[];
const init=(flag,data,delay)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  ${flag?"localStorage.setItem('studio:flag:home2','1');":''}
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(data))}); }catch(e){}
  ${delay?`window.__slow=${delay}; addEventListener('DOMContentLoaded',()=>{ const w=()=>{ if(!window.StudioCloud||!StudioCloud.ideas) return setTimeout(w,5); const o=StudioCloud.ideas; StudioCloud.ideas=async(...a)=>{ await new Promise(r=>setTimeout(r,window.__slow)); return o(...a); }; }; w(); });`:''}`;
async function mk(opts,flag,data,delay){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(flag,data||db,delay)});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  return {ctx,pg};
}
const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2};
const shot=async(pg,name)=>{ if(SHOTS){ fs.mkdirSync(SHOTS,{recursive:true}); await pg.screenshot({path:SHOTS+'/'+name+'.png'}); } };
const settle=pg=>pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&!(a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('body')&&getComputedStyle(a.effect.target,'::before').content!=='none'&&a.effect.target===document.body)),null,{timeout:3000}).catch(()=>{});
const vis=(pg,sel)=>pg.evaluate(s=>{ const e=document.querySelector(s); return !!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'; },sel);
const swipeTo=async(pg,i)=>{ await pg.evaluate(i=>{ const t=document.querySelector('#todaySec .st-track'); t.scrollTo({left:i*t.clientWidth,behavior:'instant'}); },i); await pg.waitForTimeout(450); };
const tabNow=pg=>pg.evaluate(()=>[...document.querySelectorAll('#todaySec .st-tab')].findIndex(t=>t.getAttribute('aria-selected')==='true'));

/* ===== PART 1: flag off (no grid switch, no + Idea, the + menu still has New idea) ===== */
for(const [tag,opts] of [['phone',PHONE],['desktop',{viewport:{width:1280,height:800}}]]){
  const {ctx,pg}=await mk(opts,false); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await pg.waitForSelector('#calRow .plan-chip',{timeout:8000}); await pg.waitForTimeout(400);
  const N='off '+tag+': ';
  ok(N+'no #todaySec visible, no data-home2',!(await vis(pg,'#todaySec'))&&await pg.evaluate(()=>!document.documentElement.hasAttribute('data-home2')));
  ok(N+'no list/grid switch, no + Idea chip',await pg.evaluate(()=>!document.querySelector('.vswitch,[data-view="tools"],.plan-add,#calRow [data-new-idea]')));
  ok(N+'Ideas and Goals are two equal tiles',await pg.evaluate(()=>{ const c=[...document.querySelectorAll('#calRow .plan-chip')]; if(c.length!==2) return false; const w=c.map(x=>Math.round(x.getBoundingClientRect().width)); return Math.abs(w[0]-w[1])<=1; }));
  if(tag==='phone') ok(N+'the tools are a list (full-width rows)',await pg.evaluate(()=>{ const r=[...document.querySelectorAll('#toolGrid .tool-row')]; return r.length>=2&&r.every(x=>Math.abs(x.getBoundingClientRect().width-r[0].getBoundingClientRect().width)<1)&&r[1].getBoundingClientRect().top>r[0].getBoundingClientRect().bottom-1; }));
  ok(N+'a stored toolsView is forgotten',await pg.evaluate(()=>{ localStorage.setItem('studio:toolsView','"grid"'); return true; })&&(await pg.reload(),await pg.waitForSelector('#toolGrid .tool-row'),await pg.evaluate(()=>localStorage.getItem('studio:toolsView')===null&&!document.querySelector('#toolGrid').className.includes('view-'))));
  await pg.tap?.call(pg,'#setBtn').catch(()=>pg.click('#setBtn')); await pg.waitForSelector('dialog.set-dlg[open]');
  ok(N+'Settings has no Your tools row',(await pg.locator('[data-set="view"]').count())===0);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  await pg.click('#fab'); await pg.waitForSelector('.fab-dlg[open] [data-new-idea],dialog[open] [data-new-idea]',{timeout:4000});
  ok(N+'the + menu offers New idea',await pg.locator('dialog[open] [data-new-idea]').count()===1);
  if(tag==='phone') await shot(pg,'off-menu');
  await ctx.close();
}
{ /* the search no longer offers the grid/list action */
  const {ctx,pg}=await mk(PHONE,false); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#uq');
  ok('off: no "Show your tools as a grid" search action',await pg.evaluate(()=>!(window.StudioSearch&&JSON.stringify(Studio.debug?.search?.()||'').includes('act:view'))&&!/act:view/.test(document.body.innerHTML)));
  await ctx.close(); }

/* ===== PART 2: flag on ===== */
async function homeOn(opts,data,delay){ const m=await mk(opts,true,data,delay); await m.pg.goto(BASE+'index.html'); return m; }
for(const [tag,opts,scheme] of [['phone light',PHONE,'light'],['phone dark',PHONE,'dark'],['360',{...PHONE,viewport:{width:360,height:780}},'light'],['desktop',{viewport:{width:1280,height:800}},'light']]){
  const {ctx,pg}=await homeOn({...opts,colorScheme:scheme}); const N=tag+': ';
  await pg.waitForSelector('#todaySec .td-row',{timeout:8000}); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await pg.waitForSelector('#toolGrid .tool-row'); await pg.waitForTimeout(800);
  ok(N+'data-home2 is set, the old Calendar row and the big heading are hidden',await pg.evaluate(()=>document.documentElement.hasAttribute('data-home2'))&&!(await vis(pg,'#calRow'))&&!(await vis(pg,'.hero h1')));
  const order=await pg.evaluate(()=>{ const t=s=>{ const e=document.querySelector(s); return e?Math.round(e.getBoundingClientRect().top):-1; }; return {nav:t('nav.top'),hello:t('#hello'),search:t('#uSearch'),today:t('#todaySec'),tools:t('#tools'),saved:t('#savedRow')}; });
  ok(N+'order: header, greeting, search, Today, tools, saved',order.nav<order.hello&&order.hello<order.search&&order.search<order.today&&order.today<order.tools&&order.tools<order.saved,order);
  const hello=await pg.evaluate(()=>{ const h=document.getElementById('hello'), r=h.getBoundingClientRect(); return {txt:h.textContent,h:Math.round(r.height),fs:parseFloat(getComputedStyle(h).fontSize)}; });
  ok(N+'the greeting is one small line ("Good … · Weekday d Mon")',/^Good (morning|afternoon|evening)\s*\S*[A-Z][a-z]+day/.test(hello.txt)&&hello.h<=22&&hello.fs<=14,hello);
  ok(N+'the section heading is "Today" and the tabs are Calendar | Ideas | Goals',(await pg.textContent('#todayH')).trim()==='Today'&&JSON.stringify(await pg.$$eval('#todaySec .st-tab',t=>t.map(x=>x.textContent.trim())))==='["Calendar","Ideas","Goals"]');
  const geo=await pg.evaluate(()=>{ const tabs=[...document.querySelectorAll('#todaySec .st-tab')].map(t=>Math.round(t.getBoundingClientRect().height)), p=[...document.querySelectorAll('#todaySec .st-pane')].map(x=>Math.round(x.getBoundingClientRect().height)); return {tabs,p,sw:document.documentElement.scrollWidth<=innerWidth,card:document.querySelector('.td-card').getBoundingClientRect().width}; });
  ok(N+'tabs are 44px, all three panes have the same height',geo.tabs.every(h=>h===44)&&new Set(geo.p).size===1&&geo.p[0]>=200,geo);
  ok(N+'no sideways scroll',geo.sw);
  /* Calendar pane */
  const cal=await pg.evaluate(()=>[...document.querySelectorAll('#tdp-cal .td-row')].map(r=>({t:r.querySelector('.td-t')?.textContent.trim(),b:r.querySelector('b')?.textContent.trim(),dir:r.querySelector('b')?.getAttribute('dir'),bdi:!!r.querySelector('.td-t bdi'),f:r.querySelector('small')?.textContent,post:!!r.querySelector('.cal-home-post'),ph:Math.round(r.querySelector('.cal-home-post')?.getBoundingClientRect().height||0)})));
  ok(N+'Calendar: today\'s three next items (posted ones left out), times in <bdi>, titles dir=auto, formats',cal.length===3&&cal[0].t==='9:30 am'&&cal[0].f==='Story'&&cal[1].b===AR&&cal[2].f==='Reel'&&cal.every(r=>r.dir==='auto'&&r.bdi)&&!cal.some(r=>/posted/i.test(r.b)),cal);
  ok(N+'Calendar: the Post pill only where there is a design, 44px tall',cal[0].post&&!cal[1].post&&!cal[2].post&&cal[0].ph>=44,cal.map(r=>r.post));
  ok(N+'Calendar: "Open calendar" link is under the rows',(await pg.textContent('#tdp-cal .td-more')).trim()==='Open calendar');
  /* long Arabic title, RTL */
  const rtl=await pg.evaluate(()=>{ const bb=[...document.querySelectorAll('#tdp-cal b')].find(x=>/علبتك/.test(x.textContent)), cs=getComputedStyle(bb); return {align:cs.textAlign,dir:cs.direction,over:bb.scrollWidth>bb.parentElement.clientWidth+1&&getComputedStyle(bb).textOverflow!=='ellipsis'}; });
  ok(N+'Arabic title reads right to left and never overflows',rtl.dir==='rtl'&&!rtl.over,rtl);
  if(tag==='phone light'){ await shot(pg,'on-phone-light-cal'); }
  /* Ideas pane */
  await pg.tap?.call(pg,'#tdt-ideas').catch(()=>pg.click('#tdt-ideas')); await pg.waitForTimeout(600);
  ok(N+'tapping the Ideas tab shows the Ideas pane',await tabNow(pg)===1&&await pg.evaluate(()=>{ const t=document.querySelector('#todaySec .st-track'); return Math.abs(t.scrollLeft-t.clientWidth)<2; }));
  const ide=await pg.evaluate(()=>[...document.querySelectorAll('#tdp-ideas .td-row')].map(r=>({b:r.querySelector('b').textContent.trim(),dir:r.querySelector('b').getAttribute('dir'),t:r.querySelector('small')?.textContent,dot:!!r.querySelector('.td-new')})));
  ok(N+'Ideas: the 3 newest, with their type',ide.length===3&&ide[0].b==='Summer giveaway'&&ide[0].t==='Giveaway'&&ide[2].b==='Behind the scenes'&&!ide.some(x=>x.b==='Oldest idea')&&ide.every(x=>x.dir==='auto'),ide);
  ok(N+'Ideas: the "new" dot shows for an unseen idea by someone else, not my own or a seen one',ide[0].dot&&!ide[1].dot&&!ide[2].dot,ide.map(x=>x.dot));
  if(tag==='phone light') await shot(pg,'on-phone-light-ideas');
  /* Goals pane */
  await swipeTo(pg,2);
  ok(N+'swiping to the Goals pane selects the Goals tab',await tabNow(pg)===2);
  const gl=await pg.evaluate(()=>[...document.querySelectorAll('#tdp-goals .td-row')].map(r=>({l:r.querySelector('.td-gl b').textContent,v:r.querySelector('.td-gl span').textContent.replace(/\s+/g,' ').trim(),w:Math.round(parseFloat(r.querySelector('.td-bar i').style.width)),bh:Math.round(r.querySelector('.td-bar').getBoundingClientRect().height)})));
  ok(N+'Goals: Posts and Stories as "x of y" with thin bars (Reels has no target, so it is left out)',gl.length===2&&gl[0].l==='Posts'&&gl[0].v==='2 of 12'&&gl[0].w===17&&gl[1].l==='Stories'&&gl[1].v==='0 of 8'&&gl.every(g=>g.bh<=6),gl);
  if(tag==='phone light') await shot(pg,'on-phone-light-goals');
  /* links */
  ok(N+'each pane has its Open link',(await pg.$$eval('#todaySec .td-more',a=>a.map(x=>x.textContent.trim()))).join('|')==='Open calendar|Open ideas|Open goals');
  await pg.evaluate(()=>{ const t=document.querySelector('#todaySec .st-track'); t.scrollTo({left:0,behavior:'instant'}); }); await pg.waitForTimeout(400);
  /* tools list */
  const tl=await pg.evaluate(()=>{ const rows=[...document.querySelectorAll('#toolGrid .tool-item')].map(it=>{ const r=it.querySelector('.tool-row').getBoundingClientRect(), th=it.querySelector('.tthumb').getBoundingClientRect(), c=it.querySelector('.row-cam')?.getBoundingClientRect(); return {h:Math.round(r.height),th:Math.round(th.width),cam:c?{in:c.top>=r.top&&c.bottom<=r.bottom&&c.left>=r.left&&c.right<=r.right,clear:c.left>=th.right||c.right<=th.left,s:Math.round(c.width)}:null}; }); return rows; });
  ok(N+'Your tools: compact rows (<= 72px, small thumbs), the camera stays inside its row, clear of the artwork, >= 44px',tl.length>=3&&tl.every(r=>r.h<=72&&r.th<=34)&&tl.filter(r=>r.cam).every(r=>r.cam.in&&r.cam.clear&&r.cam.s>=44),tl);
  ok(N+'All tools row follows the pinned tools, Saved designs stays below',await pg.evaluate(()=>{ const a=document.getElementById('allTools').getBoundingClientRect(), g=document.getElementById('toolGrid').getBoundingClientRect(), s=document.getElementById('savedRow').getBoundingClientRect(); return a.top>=g.bottom-1&&s.top>=a.bottom-1; }));
  await settle(pg);
  if(tag==='phone light'){ await pg.evaluate(()=>scrollTo(0,0)); await shot(pg,'on-phone-light'); await pg.evaluate(()=>scrollTo(0,document.body.scrollHeight)); await shot(pg,'on-phone-light-bottom'); }
  if(tag==='phone dark'){ await pg.evaluate(()=>scrollTo(0,0)); await shot(pg,'on-phone-dark'); }
  if(tag==='360'){ await pg.evaluate(()=>scrollTo(0,0)); await shot(pg,'on-360'); }
  if(tag==='desktop'){ await pg.evaluate(()=>scrollTo(0,0)); await shot(pg,'on-desktop'); }
  await ctx.close();
}
{ /* the Open links go to the Plan pages (phone) */
  for(const [pane,sel,hash] of [['cal','#tdp-cal .td-more','calendar'],['ideas','#tdp-ideas .td-more','ideas'],['goals','#tdp-goals .td-more','goals']]){
    const {ctx,pg}=await homeOn(PHONE); await pg.waitForSelector('#tdp-cal .td-row'); await pg.waitForTimeout(600);
    if(pane!=='cal'){ await pg.click('#tdt-'+pane); await pg.waitForTimeout(600); }
    await pg.tap(sel); await pg.waitForFunction(h=>location.hash==='#'+h&&!document.getElementById('planView').hidden,hash,{timeout:4000}).catch(()=>{});
    ok('Open link ('+pane+') goes to #'+hash,await pg.evaluate(h=>location.hash==='#'+h&&!document.getElementById('planView').hidden&&document.getElementById('homeView').hidden,hash),await pg.evaluate(()=>location.hash));
    await ctx.close(); }
  /* tapping an idea row opens Ideas, the Post pill opens Post now */
  { const {ctx,pg}=await homeOn(PHONE); await pg.waitForSelector('#tdp-cal .td-row'); await pg.waitForTimeout(600);
    await pg.tap('#tdp-cal .cal-home-post'); await pg.waitForSelector('dialog[open]',{timeout:8000}).catch(()=>{});
    ok('the Post pill opens Post now for that item',await pg.evaluate(()=>!!document.querySelector('dialog[open]')&&/Post now/.test(document.querySelector('dialog[open]').textContent)),await pg.evaluate(()=>document.querySelector('dialog[open]')?.textContent.slice(0,80)));
    await ctx.close(); }
  { const {ctx,pg}=await homeOn(PHONE); await pg.waitForSelector('#tdp-cal .td-row'); await pg.waitForTimeout(600);
    await pg.click('#tdt-ideas'); await pg.waitForTimeout(600); await pg.tap('#tdp-ideas .td-open'); await pg.waitForTimeout(800);
    ok('tapping an idea opens Ideas',await pg.evaluate(()=>location.hash==='#ideas'&&!document.getElementById('planView').hidden)); await ctx.close(); }
}
{ /* empty states, placeholders and no layout jump */
  const {ctx,pg}=await homeOn(PHONE,dbEmpty); await pg.waitForSelector('#tdp-cal .td-empty',{timeout:8000}); await pg.waitForTimeout(600);
  const t=await pg.evaluate(()=>['cal','ideas','goals'].map(k=>{ const p=document.getElementById('tdp-'+k); return {t:p.textContent.replace(/\s+/g,' ').trim(),h:Math.round(p.getBoundingClientRect().height)}; }));
  ok('empty: "Nothing planned for today" + Plan a post, "No ideas yet. Tap + to add one.", "Set this month’s goals"',/Nothing planned for today\s*Plan a post/.test(t[0].t)&&/No ideas yet\. Tap \+ to add one\./.test(t[1].t)&&/Set this month’s goals/.test(t[2].t)&&new Set(t.map(x=>x.h)).size===1,t);
  await shot(pg,'on-phone-empty');
  await pg.tap('#tdp-cal .td-more'); await pg.waitForTimeout(500);
  ok('empty: Plan a post opens the calendar',await pg.evaluate(()=>location.hash==='#calendar'));
  await ctx.close(); }
{ const {ctx,pg}=await mk(PHONE,true,db,900); /* ideas arrive late: the placeholders are there first, the section keeps its height */
  const hs=[]; await pg.addInitScript(()=>{ window.__hs=[]; addEventListener('DOMContentLoaded',()=>{ const st=document.createElement('style'); st.textContent='#packBanner{display:none!important}'; document.head.appendChild(st);   /* the in-season occasion banner is a separate, older arrival */
   const s=document.getElementById('todaySec'); const rec=()=>window.__hs.push([s.offsetHeight,s.querySelectorAll('.hs-skel').length,document.getElementById('tools').offsetTop-s.offsetTop]); rec(); new MutationObserver(rec).observe(s,{childList:true,subtree:true}); new ResizeObserver(rec).observe(s); }); });
  await pg.goto(BASE+'index.html');
  ok('placeholders: Today is in index.html with a skeleton in every pane before any data',await pg.evaluate(()=>window.__hs[0][1]>=3||window.__hs.some(x=>x[1]>=3)),await pg.evaluate(()=>window.__hs.slice(0,3)));
  await pg.waitForSelector('#tdp-ideas .td-row',{state:'attached',timeout:10000}); await pg.waitForTimeout(500);
  const hh=await pg.evaluate(()=>window.__hs);
  const hts=[...new Set(hh.filter(x=>x[0]>0).map(x=>x[0]))], tops=[...new Set(hh.filter(x=>x[0]>0).map(x=>x[2]))];
  ok('no layout jump: #todaySec has the same height (and the tools the same distance below it) before and after the data arrives',hts.length===1&&tops.length===1,{hts,tops});
  await ctx.close(); }
{ /* the cache paints Home at once (second visit), then only changed pieces swap */
  const {ctx,pg}=await homeOn(PHONE); await pg.waitForSelector('#tdp-cal .td-row'); await pg.waitForTimeout(800);
  await pg.evaluate(()=>{ window.__mut=0; new MutationObserver(m=>{ window.__mut+=m.length; }).observe(document.getElementById('todaySec'),{childList:true,subtree:true}); });
  await pg.reload(); await pg.waitForSelector('#tdp-cal .td-row'); await pg.waitForTimeout(1200);
  const cached=await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:home:plan:1stchoice')||'{}'));
  ok('the plan cache holds today\'s items (with format), ideas and goals',cached.today&&cached.today[0].f==='story'&&cached.ideas&&cached.ideas.length===3&&cached.goals&&cached.goals.post[1]===12&&cached.goals.story[1]===8,cached);
  const sw=await pg.evaluate(()=>{ const p=[...document.querySelectorAll('#todaySec .td-in')]; return p.map(x=>x.classList.contains('hs-in')||x.classList.contains('hs-skel')); });
  ok('after the refresh no pane is mid-fade or back to a skeleton (no flicker)',sw.every(x=>!x),sw);
  await ctx.close(); }
{ /* flag toggled live and via the link */
  const {ctx,pg}=await mk(PHONE,false); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card');
  ok('flag off by default: Today hidden',!(await vis(pg,'#todaySec')));
  await pg.evaluate(()=>Studio.flags.set('home2',true)); await pg.waitForTimeout(300);
  ok('turning the flag on shows Today and hides the old Calendar row at once',await vis(pg,'#todaySec')&&!(await vis(pg,'#calRow')));
  await pg.evaluate(()=>Studio.flags.set('home2',false)); await pg.waitForTimeout(200);
  ok('turning it off brings the old Home back',!(await vis(pg,'#todaySec'))&&await vis(pg,'#calRow'));
  await pg.goto(BASE+'index.html?flag-home2=1'); await pg.waitForSelector('#todaySec .td-row');
  ok('?flag-home2=1 turns it on',await pg.evaluate(()=>Studio.flags.on('home2')&&document.documentElement.hasAttribute('data-home2')));
  await ctx.close(); }
ok('no page errors',!errs.length,errs.slice(0,4));
await b.close(); console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\nhome2: ${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
