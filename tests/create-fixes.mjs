/* Create small fixes (1.47.0): all five sizes fit on a 360px phone; 44px+ targets in the Add sheet's jump chips, the
   Layers Hide/Lock buttons and the colour swatches; no empty gap in the Save sheet before saving; team templates in the
   picker that fail or hang show a message with Try again (never a stuck "Looking…"). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake0=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
/* designs() fails / hangs while localStorage fakeTeam is 'fail' / 'hang' */
const fake=fake0.replace('async designs(brand){','async designs(brand){ const m=localStorage.getItem("fakeTeam"); if(m==="fail") throw new Error("offline"); if(m==="hang") await new Promise(()=>{});');
if(fake===fake0) throw new Error('fakecloud designs() not found');
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const mk=async(W,H,seed)=>{ const ctx=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(seed) await ctx.addInitScript(s=>{ for(const [k,v] of Object.entries(s)) localStorage.setItem(k,v); },seed);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|offline/.test(m.text())) errs.push(m.text()); }); return {ctx,pg}; };
const ready=pg=>pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}).then(()=>pg.waitForTimeout(500));
/* hit size: the box, or its ::after hit area */
const HIT=`(e=>{ const r=e.getBoundingClientRect(), a=getComputedStyle(e,'::after'), px=v=>parseFloat(v)||0; let w=r.width,h=r.height;
  if(a.content!=='none'&&a.position==='absolute'){ w=Math.max(w,r.width-px(a.left)-px(a.right)); h=Math.max(h,r.height-px(a.top)-px(a.bottom)); } return Math.min(w,h); })`;
const minHit=(pg,sel)=>pg.evaluate(([sel,HIT])=>{ const f=eval(HIT); const l=[...document.querySelectorAll(sel)].filter(e=>e.getBoundingClientRect().width>0); return l.length?Math.min(...l.map(f)):-1; },[sel,HIT]);

for(const W of [360,390]){ const {ctx,pg}=await mk(W,780); await pg.goto(BASE+'tools/create.html'); await ready(pg);
  const s=await pg.evaluate(()=>{ const row=document.querySelector('.cr-sizes'), r=row.getBoundingClientRect(); return {fits:row.scrollWidth<=row.clientWidth+1,cards:[...row.children].every(c=>{ const b=c.getBoundingClientRect(); return b.left>=r.left-1&&b.right<=r.right+1&&c.scrollWidth<=c.clientWidth+1; })}; });
  ok(W+'px: all five sizes fit in the start sheet, none cut off',s.fits&&s.cards,s);
  await ctx.close(); }

{ const {ctx,pg}=await mk(390,844); await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await ready(pg);
  await pg.tap('#crBar [data-cr="add"]'); await pg.waitForTimeout(400);
  ok('Add sheet: jump chips are 44px+',await minHit(pg,'.cr-jump button')>=44,await minHit(pg,'.cr-jump button'));
  await pg.tap('#crSheetX'); await pg.tap('#crBar [data-cr="layers"]'); await pg.waitForTimeout(400);
  ok('Layers: Hide and Lock are 44px+',await minHit(pg,'.cr-ly .ib')>=44,await minHit(pg,'.cr-ly .ib'));
  await pg.tap('#crSheetX'); await pg.evaluate(()=>BD.select([BD.main.find(n=>n.getAttr('label')==='Headline')[0]])); await pg.waitForTimeout(250);
  await pg.tap('#crCtx [data-x="color"]'); await pg.waitForTimeout(400);
  ok('Colour: every swatch has a 44px+ hit area',await minHit(pg,'button.cr-sw')>=44,await minHit(pg,'button.cr-sw'));
  ok('… and neighbouring hit areas do not overlap',await pg.evaluate(()=>{ const l=[...document.querySelectorAll('.cr-sws .cr-sw')].map(e=>e.getBoundingClientRect()); return l.every((r,i)=>i===0||Math.abs(r.top-l[i-1].top)>4||r.left-l[i-1].right>=4); }));
  await pg.tap('#crSheetX'); await pg.tap('#crBar [data-cr="save"]'); await pg.waitForTimeout(400);
  const gap=await pg.evaluate(()=>{ const p=document.querySelector('.cr-save .small'), t=document.querySelector('.cr-save .cr-team'); return Math.round(t.getBoundingClientRect().top-p.getBoundingClientRect().bottom); });
  ok('Save sheet: no empty gap under "Full quality" before saving',gap<=16,gap);
  await ctx.close(); }

/* team templates that fail, then come back */
{ const {ctx,pg}=await mk(390,844,{fakeTeam:'fail'}); await pg.goto(BASE+'tools/create.html'); await ready(pg);
  await pg.waitForSelector('#crTeamRetry',{timeout:5000}).catch(()=>{});
  ok('team templates that fail: a message and Try again',await pg.evaluate(()=>/could not load/.test(document.getElementById('crTeamT').textContent)&&!!document.getElementById('crTeamRetry')));
  await pg.evaluate(()=>localStorage.removeItem('fakeTeam')); if(await pg.$('#crTeamRetry')) await pg.tap('#crTeamRetry');
  await pg.waitForFunction(()=>!/Looking|could not/.test(document.getElementById('crTeamT').textContent),null,{timeout:5000}).catch(()=>{});
  ok('Try again loads them',await pg.evaluate(()=>/No team templates yet|Sign in/.test(document.getElementById('crTeamT').textContent)),await pg.evaluate(()=>document.getElementById('crTeamT').textContent));
  await ctx.close(); }
/* a list that never answers */
{ const {ctx,pg}=await mk(390,844,{fakeTeam:'hang'}); await pg.goto(BASE+'tools/create.html'); await ready(pg);
  ok('while it loads: Looking…',await pg.evaluate(()=>/Looking/.test(document.getElementById('crTeamT').textContent)));
  await pg.waitForSelector('#crTeamRetry',{timeout:16000}).catch(()=>{});
  ok('a list that never answers: "taking too long" + Try again, not a stuck Looking…',await pg.evaluate(()=>/too long/.test(document.getElementById('crTeamT').textContent)&&!!document.getElementById('crTeamRetry')));
  await ctx.close(); }

console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);
