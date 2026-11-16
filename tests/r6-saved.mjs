/* r6-saved: Campaigns are gone (no button, row or request), and in every grid the "more" button never covers the picture and
   long names show on two lines instead of being cut. Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pic='data:image/jpeg;base64,'+fs.readFileSync(new URL('../assets/thumbs/1stchoice/restock-sm.jpg',import.meta.url)).toString('base64');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i)).slice(0,200)+')':'')); };
const LONG='Restock story for the weekend market and the new shop opening';
const AR='علبتك واجد حلوة ربيعي علبتك واجد حلوة ربيعي علبتك واجد حلوة';
const db={designs:{},files:{},cols:{},team_assets:[]};
[['a','restock',LONG],['b','offer',AR],['c','photo-story','Short']].forEach(([id,tool,name])=>{ const th='1stchoice/'+id+'/thumb.jpg'; db.files[th]=pic;
  db.designs[id]={id,brand:'1stchoice',tool,name,kind:'design',recipe:{photoPaths:[]},thumb_path:th,cols:[],updated_at:new Date().toISOString()}; });
db.team_assets=[{id:'t1',brand:'1stchoice',name:LONG,path:'1stchoice/ta/t1.png',prev_path:'1stchoice/ta/t1.png',tags:['logo'],created_at:new Date().toISOString()}];
db.files['1stchoice/ta/t1.png']=pic;
const b=await chromium.launch(); const errs=[];
for(const [w,h,touch,scheme] of [[390,844,true,'light'],[360,740,true,'dark'],[1280,800,false,'light']]){
  const N=`${w} ${scheme}: `;
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme});
  const reqs=[]; ctx.on('request',r=>reqs.push(r.url()));
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:flags',JSON.stringify({team:true})); }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  const tap=s=>touch?pg.tap(s):pg.click(s);
  const check=async(sel,label)=>{ const r=await pg.$$eval(sel,els=>els.map(c=>{ const bx=e=>{ const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
    const more=c.querySelector('.sv-more,.ta-more'), th=c.querySelector('.sv-thumb,.ta-pic'), nm=c.querySelector('.sv-txt b,.ta-nm'), lh=nm?(parseFloat(getComputedStyle(nm).lineHeight)||17):17;
    return {more:more&&bx(more),th:th&&bx(th),lines:nm?Math.round(nm.getBoundingClientRect().height/lh):0,w:more&&more.getBoundingClientRect().width,h:more&&more.getBoundingClientRect().height}; }));
    ok(N+label+': the more button does not cover the picture',r.length>0&&r.every(x=>x.more&&x.th&&!(x.more.left<x.th.right&&x.th.left<x.more.right&&x.more.top<x.th.bottom&&x.th.top<x.more.bottom)),JSON.stringify(r[0]));
    ok(N+label+': the more button is at least 28px',r.every(x=>x.w>=28&&x.h>=28));
    ok(N+label+': a long name shows on two lines, not one',r.some(x=>x.lines===2),JSON.stringify(r.map(x=>x.lines)));
    return r; };
  /* Saved page */
  await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(600);
  await check('#savedGrid .sv-card[data-id]','Saved');
  const full=await pg.$eval('#savedGrid .sv-card[data-id="a"] .sv-txt b',e=>e.textContent); ok(N+'the long name is whole in the page (clamped by lines, not letters)',full===LONG);
  const rtl=await pg.$eval('#savedGrid .sv-card[data-id="b"] .sv-txt',e=>({d:getComputedStyle(e).direction,ta:getComputedStyle(e.querySelector('b')).textAlign})); ok(N+'an Arabic name is right to left and right-aligned',rtl.d==='rtl'&&/right|start/.test(rtl.ta),rtl);
  ok(N+'no Campaigns button on Saved',await pg.evaluate(()=>!document.querySelector('.camp-row,#selCamp,[data-camp]')&&!/Campaigns/i.test(document.getElementById('saved').textContent)));
  /* the menu opens from the more button, and has no Campaign row */
  await tap('#savedGrid .sv-card[data-id="c"] .sv-more'); await pg.waitForSelector('dialog[open] h3',{timeout:5000}).catch(()=>{});
  ok(N+'the menu opens from the more button',(await pg.textContent('dialog[open] h3').catch(()=>''))==='Short');
  ok(N+'the design menu has no Campaign row',await pg.evaluate(()=>{ const d=document.querySelector('dialog[open]'); return !!d&&!/campaign/i.test(d.textContent); }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  /* select mode */
  await tap('#selBtn'); await pg.waitForTimeout(300);
  ok(N+'select mode has no Campaign button',await pg.evaluate(()=>document.body.classList.contains('selecting')&&!document.getElementById('selCamp')&&![...document.querySelectorAll('#selBar button')].some(x=>/campaign/i.test(x.textContent))));
  /* Home's Saved row */
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card[data-id]',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(500);
  await check('#savedRowList .sv-card[data-id]','Home row');
  /* Team assets library */
  await pg.evaluate(()=>Studio.lazy('teamassets',{css:1,global:'StudioTeamAssets'}).then(m=>m.open({brand:'1stchoice',mode:'manage'}))).catch(()=>{}); await pg.waitForSelector('.ta-tile',{timeout:6000}).catch(()=>{});
  if(await pg.$('.ta-tile')){ await check('.ta-tile','Team assets'); await tap('.ta-tile .ta-more'); await pg.waitForTimeout(500);
    ok(N+'Team assets: the more button still opens its sheet',await pg.evaluate(()=>document.querySelectorAll('dialog[open]').length>1||!!document.querySelector('.ta-edit,.ta-sheet'))); }
  else ok(N+'Team assets grid opened',false);
  ok(N+'campaigns.js and campaigns.css were never requested',!reqs.some(u=>/campaigns\.(js|css)/.test(u)));
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
res.forEach(l=>console.log(l)); const f=res.filter(l=>l.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
