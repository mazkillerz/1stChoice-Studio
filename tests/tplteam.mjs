/* Studio 1.34.0: stars on Team templates in Create's picker, team/search opens count as Recently used, "Skip to photo N of M".
   Phone 390x844 touch, light (+ one dark contrast check). Run with the server on :8080 (or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const FAV='studio:tplFav:1stchoice', REC='studio:tplRecent:1stchoice';
let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const blk=async(n,f)=>{ try{ await f(); }catch(e){ ok(n+' (block aborted)',false,String(e.message).split('\n')[0]); } };
const b=await chromium.launch(); const t0=Date.now();
const pic=id=>'data:image/jpeg;base64,'+fs.readFileSync(new URL('../assets/thumbs/1stchoice/'+id+'-sm.jpg',import.meta.url)).toString('base64');
function teamDb(){ const db={designs:{},files:{},cols:{}};
  [['tmA','Good morning','restock'],['tmB','Ice cold post','offer'],['tmC','Offer','restock']].forEach(([id,name,th],i)=>{ const t='1stchoice/'+id+'/thumb.jpg'; db.files[t]=pic(th);
    db.designs[id]={id,brand:'1stchoice',tool:'create',name,kind:'template',recipe:{doc:{nodes:[]},photoPaths:[]},thumb_path:t,cols:[],updated_at:new Date(Date.now()-i*3600e3).toISOString()}; });
  return db; }
async function mk(tag,{scheme='light',seed={}}={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(s=>{ try{ if(!sessionStorage.__seeded){ sessionStorage.__seeded='1'; localStorage.setItem('fakecloud',s.db); for(const k in s.ls) localStorage.setItem(k,JSON.stringify(s.ls[k])); } }catch(_){} },{db:JSON.stringify(teamDb()),ls:seed});
  const pg=await ctx.newPage(); pg.setDefaultTimeout(6000); pg.on('pageerror',e=>errs.push(tag+' '+e.message)); return {ctx,pg}; }
const store=(pg,k)=>pg.evaluate(k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(_){ return 'bad'; } },k);
const openPicker=async pg=>{ await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(600);
  if(!await pg.evaluate(()=>{ const s=document.getElementById('crSheet'); return s&&!s.hidden&&document.querySelector('.cr-tw'); })) await pg.evaluate(()=>CRUI.openTemplates());
  await pg.waitForSelector('#crTeamT .cr-tw',{timeout:10000}); await pg.waitForTimeout(300); };
const reopen=async pg=>{ await pg.evaluate(()=>CRUI.closeSheet&&CRUI.closeSheet(true)); await pg.waitForTimeout(300); await pg.evaluate(()=>CRUI.openTemplates()); await pg.waitForSelector('#crTeamT .cr-tw'); await pg.waitForTimeout(300); };
const teamOrder=pg=>pg.$$eval('#crTeamT .cr-tpl[data-team]',e=>e.map(x=>x.dataset.team));
const star=(pg,id)=>pg.locator(`.cr-star[data-tstar="${id}"]`);

await blk('team stars',async()=>{ const {ctx,pg}=await mk('team'); await openPicker(pg);
  const o0=await teamOrder(pg); ok('3 team cards, newest first',o0.length===3&&o0[0]==='tmA',o0);
  const g=await pg.$$eval('#crTeamT .cr-tw',ws=>ws.map(w=>{ const s=w.querySelector('.cr-star'); const r=s&&s.getBoundingClientRect(); return {has:!!s,w:r&&r.width,h:r&&r.height,pr:s&&s.getAttribute('aria-pressed')}; }));
  ok('every team card has a star, >= 44px, unpressed',g.length===3&&g.every(x=>x.has&&x.w>=44&&x.h>=44&&x.pr==='false'),g);
  await star(pg,'tmC').scrollIntoViewIfNeeded(); await star(pg,'tmC').tap(); await pg.waitForTimeout(300);
  ok('tap: aria-pressed true',(await star(pg,'tmC').getAttribute('aria-pressed'))==='true');
  ok('tap: no reorder now',JSON.stringify(await teamOrder(pg))===JSON.stringify(o0));
  ok('storage has team:tmC',JSON.stringify(await store(pg,FAV))===JSON.stringify(['team:tmC']),await store(pg,FAV));
  ok('star tap does not open the template (sheet still open)',await pg.evaluate(()=>!document.getElementById('crSheet').hidden));
  await reopen(pg); const o1=await teamOrder(pg);
  ok('reopen: starred team template first',o1[0]==='tmC'&&o1.length===3,o1);
  ok('reopen: star still pressed',(await star(pg,'tmC').getAttribute('aria-pressed'))==='true');
  await star(pg,'tmC').tap(); await pg.waitForTimeout(300);
  ok('unstar: pressed false, storage empty',(await star(pg,'tmC').getAttribute('aria-pressed'))==='false'&&JSON.stringify(await store(pg,FAV))===JSON.stringify([]),await store(pg,FAV));
  /* brand template stars still work and do not touch team ids */
  await pg.locator('.cr-star[data-star="ice-cold"]').tap(); await pg.waitForTimeout(300);
  const fv=await store(pg,FAV); ok('brand star writes t:ice-cold',Array.isArray(fv)&&fv[0]==='t:ice-cold'&&!fv.some(x=>x.startsWith('team:')),fv);
  /* search */
  const vis=()=>pg.$$eval('.cr-tw',ws=>({brand:ws.filter(w=>!w.closest('#crTeamT')&&!w.hidden).length,team:ws.filter(w=>w.closest('#crTeamT')&&!w.hidden&&w.offsetParent!==null).length}));
  const v0=await vis();
  await pg.fill('#crTplQ','ice'); await pg.waitForTimeout(250); const v1=await vis();
  ok('search "ice": fewer brand templates, team cards all visible',v1.brand>=1&&v1.brand<v0.brand&&v1.team===3,{v0,v1});
  await pg.fill('#crTplQ','zzqq'); await pg.waitForTimeout(250); const v2=await vis();
  ok('search no match: brand hidden, "No templates match" shown, team cards still visible',v2.brand===0&&v2.team===3&&await pg.locator('#crTplNone').isVisible(),v2);
  await pg.fill('#crTplQ',''); await pg.waitForTimeout(250); const v3=await vis();
  ok('clearing restores brand templates',v3.brand===v0.brand&&v3.team===3,v3);
  /* using a team template records it */
  await pg.locator('.cr-tpl[data-team="tmB"]').scrollIntoViewIfNeeded(); await pg.locator('.cr-tpl[data-team="tmB"]').tap(); await pg.waitForTimeout(300);
  if(await pg.locator('[data-mode]').first().isVisible().catch(()=>false)) await pg.locator('[data-mode]').first().tap();
  ok('using a team template: team:tmB first in Recently used',await pg.waitForFunction(()=>{ try{ return JSON.parse(localStorage.getItem('studio:tplRecent:1stchoice'))[0]==='team:tmB'; }catch(_){ return false; } },null,{timeout:15000}).then(()=>true,()=>false),await store(pg,REC));
  ok('no page errors (team)',errs.length===0,errs); await ctx.close(); });

await blk('dark contrast',async()=>{ const {ctx,pg}=await mk('dark',{scheme:'dark',seed:{[FAV]:['team:tmA']}}); await openPicker(pg);
  const c=await pg.evaluate(()=>{ const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number), lum=([r,g,b])=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    const s=document.querySelector('.cr-star[data-tstar="tmA"]'), sh=document.getElementById('crSheet'); let bg=null,e=s; while(e){ const x=getComputedStyle(e).backgroundColor; if(x&&!/rgba\(0, 0, 0, 0\)|transparent/.test(x)){ bg=x; break; } e=e.parentElement; }
    const L1=lum(rgb(getComputedStyle(s).color)), L2=lum(rgb(bg||'rgb(0,0,0)')); return {pressed:s.getAttribute('aria-pressed'),ratio:(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05),col:getComputedStyle(s).color,bg}; });
  ok('dark: starred team card pressed from storage',c.pressed==='true',c);
  ok('dark: pressed star contrast >= 3:1',c.ratio>=3,c); await ctx.close(); });

/* hub search: opening a template counts as Recently used */
for(const [q,id,sel] of [['ice cold post','t:ice-cold-post'],['cans, no photo','p:rs-cans']]){
  await blk('search '+id,async()=>{ const {ctx,pg}=await mk('hub'); await pg.goto(BASE+'index.html'); await pg.waitForSelector('#uq'); await pg.waitForTimeout(800);
    await pg.tap('#uq'); await pg.waitForTimeout(300); await pg.fill('#uq',q); await pg.waitForTimeout(400);
    const row=pg.locator('#usPanel .us-sec[data-k="template"] .us-row').first();
    ok('search "'+q+'": a template row is shown',await row.count()===1);
    await Promise.all([pg.waitForURL(/tools\//,{timeout:15000}),row.tap()]); await pg.waitForTimeout(600);
    const r=await store(pg,REC); ok('search open '+id+': first in tplRecent',Array.isArray(r)&&r[0]===id,r);
    await pg.goto(BASE+'index.html#templates'); await pg.waitForSelector('.tp-li',{timeout:20000}); await pg.waitForTimeout(700);
    ok(id+': shown under Recently used',await pg.locator('section[data-cat="recent"] ul.tp-recent .tp-mini').count()>=1);
    await ctx.close(); });
}
ok('no page errors overall',errs.length===0,errs);
await b.close(); console.log(`\n${fails?'FAILED':'ALL PASS'}: ${fails} fail, ${((Date.now()-t0)/1000).toFixed(0)}s`); process.exit(fails?1:0);
