/* Goals (assets/kpis.js + kpis.css, behind the "plan" preview flag). fakecloud stands in for Supabase.
   1 permanent (2.4.1): #goalsView exists with no switch   2 counts from posted calendar items ("12 of 15"), giveaways from ideas, "+3 vs Oct"
   3 Edit goals saves to the cloud, Same as last month   4 Update numbers: % change vs last month, src manual
   5 month switch, This month   6 chart: 6 bars   7 empty month note   8 signed out / missing tables   9 phone light + dark, tap sizes, no sideways scroll
   Run: node tests/kpis.mjs (server on :8080 or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pad=n=>(n<10?'0':'')+n, now=new Date();
const mk=(y,m)=>{ const d=new Date(y,m,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); };
const CUR=mk(now.getFullYear(),now.getMonth()), PRV=mk(now.getFullYear(),now.getMonth()-1), P2=mk(now.getFullYear(),now.getMonth()-2);
const prevName=new Date(now.getFullYear(),now.getMonth()-1,1).toLocaleDateString('en',{month:'short'});
const db=seedDesigns();
db.calendar=[]; let n=0; const add=(m,count,format,status='posted')=>{ for(let i=0;i<count;i++) db.calendar.push({id:'k'+(n++),brand:'1stchoice',day:m+'-'+pad(1+i%27),at:null,status,format,title:'x',caption:'',hashtags:[],design_ids:[]}); };
add(CUR,10,'post'); add(CUR,2,null); add(CUR,3,'post','draft'); add(CUR,4,'story'); add(CUR,1,'reel');   // 12 posts, 4 stories, 1 reel posted this month
add(PRV,9,'post'); add(PRV,5,'story'); add(PRV,2,'reel'); add(P2,6,'post');
db.ideas=[{id:'g1',brand:'1stchoice',title:'Win a case',type:'giveaway',stage:'posted',calendar_id:null,updated_at:new Date().toISOString(),created_at:new Date().toISOString(),sort:0},{id:'g2',brand:'1stchoice',title:'Draft giveaway',type:'giveaway',stage:'idea',updated_at:new Date().toISOString(),created_at:new Date().toISOString(),sort:0}];
db.kpi_months=[{id:'m1',brand:'1stchoice',month:CUR,targets:{post:15,story:10,reel:4,giveaway:1},engagement:{},note:''},
  {id:'m0',brand:'1stchoice',month:PRV,targets:{post:12,story:8,reel:2,giveaway:0},engagement:{reach:{v:10000,src:'manual',at:new Date().toISOString()},followers:{v:2000,src:'manual',at:new Date().toISOString()}},note:''}];
const init=(flag,extra)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  ${flag?"localStorage.setItem('studio:flag:plan','1');":''} ${extra||''}
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
const b=await chromium.launch(), errs=[];
async function mkp(opts,flag,extra,seedMod){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(flag,extra)}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message)); return {ctx,pg};
}
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');
const rows=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')).kpi_months||[]);
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};

/* 1 permanent since 2.4.1 */
{ const {ctx,pg}=await mkp(PH,false); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(800);
  ok('1 no switch needed: #goalsView is there',await pg.evaluate(()=>!!document.getElementById('goalsView'))); await ctx.close(); }

async function phone(dark){
  const T=(dark?'dark':'light')+' phone: ';
  const {ctx,pg}=await mkp({...PH,colorScheme:dark?'dark':'light'},true);
  await pg.goto(BASE+'index.html#goals'); await pg.waitForSelector('#goalsView .kp-card',{timeout:10000});
  const h=await txt(pg,'#goalsView .cal-top');
  ok(T+'header: Goals, Edit goals, tabs, month',/Goals/.test(h)&&/Edit goals/.test(h)&&/Calendar/.test(h)&&new RegExp(now.toLocaleDateString('en',{month:'long'})).test(h),h);
  const cards=await pg.$$eval('.kp-card',e=>e.map(x=>x.innerText.replace(/\s+/g,' ').trim()));
  ok(T+'Posts card reads "12 of 15" with +3 vs previous month',/Posts\s*12 of 15/.test(cards[0])&&new RegExp('\\+3 vs '+prevName).test(cards[0]),cards[0]);
  ok(T+'Stories 4 of 10 (-1), Reels 1 of 4 (-1), Giveaways 1 of 1',/Stories\s*4 of 10/.test(cards[1])&&/Reels\s*1 of 4/.test(cards[2])&&/Giveaways.*1 of 1/.test(cards[3]),cards);
  ok(T+'a full goal shows a check',await pg.$eval('.kp-card[data-kp-card="giveaway"]',e=>e.classList.contains('done')&&!!e.querySelector('.kp-check')));
  ok(T+'progress bar width 80% for posts',await pg.$eval('.kp-card[data-kp-card="post"] .kp-bar i',e=>e.style.width==='80%'));
  ok(T+'chart has 6 bars, current one last',await pg.evaluate(()=>document.querySelectorAll('.kp-chart rect.kp-b, .kp-chart rect.kp-b0').length===6&&document.querySelectorAll('.kp-chart g.cur').length===1));
  await pg.tap('[data-kp-chart="followers"]'); ok(T+'chart chips switch the metric',await pg.evaluate(()=>/Followers/.test(document.querySelector('.kp-chart').getAttribute('aria-label'))));
  await pg.tap('[data-kp-chart="post"]');
  if(!dark){
    await pg.tap('.kp-editbtn'); await pg.waitForSelector('.kp-dlg #kpS-post');
    const small=await pg.$$eval('.kp-dlg button, .kp-dlg input',e=>e.filter(x=>x.offsetHeight&&x.offsetHeight<44).map(x=>x.className||x.id));
    ok(T+'Edit goals sheet: controls >= 44px',small.length===0,small);
    await pg.tap('.kp-step[data-k="post"] [data-d="1"]'); await pg.tap('.kp-step[data-k="post"] [data-d="1"]');
    await pg.tap('.kp-step[data-k="reel"] [data-d="-1"]');
    await pg.tap('#kpSave'); await pg.waitForFunction(()=>!document.querySelector('.kp-dlg[open]'),null,{timeout:5000}).catch(()=>{});
    await pg.waitForTimeout(300);
    const r=(await rows(pg)).find(x=>x.month===CUR);
    ok(T+'Edit goals saved to the cloud (17 posts, 3 reels)',r&&r.targets.post===17&&r.targets.reel===3&&r.targets.story===10,r&&r.targets);
    ok(T+'card updates to "12 of 17"',/12 of 17/.test(await txt(pg,'.kp-card[data-kp-card="post"]')));
    /* numbers */
    ok(T+'no numbers yet: Add numbers link',/Add numbers/.test(await txt(pg,'.kp-sh')));
    await pg.tap('[data-kp-nums]'); await pg.waitForSelector('#kpN-reach');
    await pg.fill('#kpN-reach','12,300'); await pg.fill('#kpN-followers','2,100'); await pg.fill('#kpN-likes','abc');
    await pg.tap('#kpSave'); await pg.waitForTimeout(200);
    ok(T+'bad digits are refused with a message',/digits only/.test(await txt(pg,'#kpSt')));
    await pg.fill('#kpN-likes','340'); await pg.tap('#kpSave'); await pg.waitForFunction(()=>!document.querySelector('.kp-dlg[open]'),null,{timeout:5000}).catch(()=>{}); await pg.waitForTimeout(300);
    const e=(await rows(pg)).find(x=>x.month===CUR).engagement;
    ok(T+'numbers stored with src manual',e.reach&&e.reach.v===12300&&e.reach.src==='manual'&&!!e.reach.at&&e.followers.v===2100&&e.likes.v===340,e);
    const eg=await pg.$$eval('.kp-eng',x=>x.map(y=>y.innerText.replace(/\s+/g,' ').trim()));
    ok(T+'Reach 12,300 shows +23% vs last month, Followers +5%, "Entered by hand"',/12,300/.test(eg[0])&&/▲ \+23%/.test(eg[0])&&/\+5%/.test(eg[3])&&/Entered by hand/.test(eg[0]),eg);
    /* same as last month */
    await pg.tap('.kp-editbtn'); await pg.waitForSelector('#kpS-post'); await pg.tap('#kpSame');
    ok(T+'Same as last month copies the targets (12/8/2/0)',await pg.evaluate(()=>['post','story','reel','giveaway'].map(k=>document.getElementById('kpS-'+k).value).join()==='12,8,2,0'));
    await pg.tap('[data-kp-x]'); await pg.waitForTimeout(250);
    /* month switch */
    await pg.tap('[data-kp-nav="-1"]'); await pg.waitForFunction(()=>/Posts\s*9 of 12/.test(document.querySelector('.kp-card').innerText.replace(/\s+/g,' ')),null,{timeout:5000}).catch(()=>{});
    ok(T+'previous month: Posts 9 of 12, "This month" link appears',/9 of 12/.test(await txt(pg,'.kp-card[data-kp-card="post"]'))&&/This month/.test(await txt(pg,'.cal-bar')));
    await pg.tap('[data-kp-nav="-1"]'); await pg.waitForTimeout(500);
    ok(T+'a month with no goals row: "Set this month\'s goals" note, counts still shown',/Set this month’s goals/.test(await txt(pg,'.kp-empty'))&&/6/.test(await txt(pg,'.kp-card[data-kp-card="post"]'))&&/No goal/.test(await txt(pg,'.kp-card[data-kp-card="post"]')));
    await pg.tap('.cal-today'); await pg.waitForTimeout(500);
    ok(T+'This month returns to now',/12 of 17/.test(await txt(pg,'.kp-card[data-kp-card="post"]')));
  }
  const sw=await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
  ok(T+'no sideways scroll at 390',sw);
  const tiny=await pg.$$eval('#goalsView button',e=>e.filter(x=>x.offsetHeight&&x.offsetHeight<44).map(x=>x.className||x.textContent));
  ok(T+'no button under 44px on the page',tiny.length===0,tiny);
  await pg.evaluate(()=>window.scrollTo(0,0)); await pg.waitForTimeout(2800);
  await pg.screenshot({path:new URL('../studio-notes/pending/shots/kpis-'+(dark?'dark':'light')+'.png',import.meta.url).pathname});
  await ctx.close();
}
await phone(false); await phone(true);

/* 360 */
{ const {ctx,pg}=await mkp({viewport:{width:360,height:740},isMobile:true,hasTouch:true},true); await pg.goto(BASE+'index.html#goals'); await pg.waitForSelector('.kp-card',{timeout:10000});
  ok('360: no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=360)); await ctx.close(); }
/* desktop */
{ const {ctx,pg}=await mkp({viewport:{width:1280,height:800}},true); await pg.goto(BASE+'index.html#goals'); await pg.waitForSelector('.kp-card',{timeout:10000});
  const cols=await pg.$$eval('.kp-card',e=>new Set(e.map(x=>Math.round(x.getBoundingClientRect().top))).size);
  ok('desktop: four cards in one row',cols===1,cols); await ctx.close(); }
/* signed out */
{ const {ctx,pg}=await mkp(PH,true,"localStorage.setItem('fakecloud-signedout','1');"); await pg.goto(BASE+'index.html#goals'); await pg.waitForSelector('#goalsView .sv-note',{timeout:10000});
  ok('signed out: note with Sign in, no cards',/Sign in/.test(await txt(pg,'#goalsView .sv-note'))&&!(await pg.$('.kp-card'))); await ctx.close(); }
/* missing tables */
{ const {ctx,pg}=await mkp(PH,true,"localStorage.setItem('fakecloud-noplan','1');"); await pg.goto(BASE+'index.html#goals'); await pg.waitForSelector('.kp-card',{timeout:10000});
  ok('tables missing: empty-state note shown',/Set this month/.test(await txt(pg,'.kp-empty')));
  await pg.tap('.kp-editbtn'); await pg.waitForSelector('#kpSave'); await pg.tap('#kpSave'); await pg.waitForTimeout(400);
  ok('tables missing: save says the owner switches goals on',/switched on by the owner/.test(await txt(pg,'#kpSt')),await txt(pg,'#kpSt')); await ctx.close(); }
ok('no page errors',errs.length===0,errs.slice(0,3)); await b.close();
console.log(res.join('\n')); const f=res.filter(x=>x.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
