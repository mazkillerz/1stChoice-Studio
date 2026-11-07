/* "Who's using Studio?" (assets/who.js + the Settings rows): 390x844 touch light + dark and 1280x800.
   Settings shows the row and the owner switch; the picker lists names seen before (this device + the team's saved designs) and takes an Arabic name
   right to left; the name persists after reload and is what StudioWho.author() returns; the owner switch asks to confirm first;
   ask() never opens by itself in an automated browser; every target is at least 44px. Needs BASE (default http://127.0.0.1:8080/). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const AR='سارة';
async function run(tag,opts){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','seen'); }catch(_){} });
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#setBtn',{timeout:8000}); await pg.waitForTimeout(400);
  const tap=s=>opts.hasTouch?pg.tap(s):pg.click(s);
  const N=tag+': ';
  /* a design by someone else on the team, so the picker has a name to offer */
  await pg.evaluate(async()=>{ const brand=Studio.lab.brand().id, C=await Studio.lab.cloud(); await C.saveDesign({brand,tool:'restock',name:'Team one',kind:'design',recipe:{v:2},photos:[],thumb:new Blob(['x'],{type:'image/jpeg'}),author:'Omar'}); });
  await tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]');
  const rows=await pg.evaluate(()=>{ const q=s=>document.querySelector(s), r=e=>{ const x=e.getBoundingClientRect(); return [Math.round(x.width),Math.round(x.height)]; };
    return {who:!!q('[data-set=who]'),sub:q('[data-set=who] small')&&q('[data-set=who] small').textContent,owner:q('[data-set=owner]')&&q('[data-set=owner]').getAttribute('aria-checked'),role:q('[data-set=owner]')&&q('[data-set=owner]').getAttribute('role'),
      sizes:[r(q('[data-set=who]')),r(q('[data-set=owner]'))]}; });
  ok(N+'Settings has the "Who\'s using Studio" row and an owner switch',rows.who&&rows.owner==='false'&&rows.role==='switch',rows);
  ok(N+'the rows are at least 44px tall',rows.sizes.every(s=>s[1]>=44),rows.sizes);
  ok(N+'no name yet says so',/Not set/i.test(rows.sub),rows.sub);
  /* webdriver: nothing opens by itself */
  const auto=await pg.evaluate(async()=>{ await new Promise(r=>{ const s=document.createElement('script'); s.src='assets/who.js'; s.onload=r; document.head.appendChild(s); }); const before=document.querySelectorAll('dialog[open]').length; const v=await StudioWho.ask(); return {v,navWd:navigator.webdriver,opened:document.querySelectorAll('dialog[open]').length-before}; });
  ok(N+'ask() does not open by itself under webdriver',auto.v===null&&auto.opened===0&&auto.navWd===true,auto);
  /* picker */
  await tap('[data-set=who]'); await pg.waitForSelector('dialog.who-dlg[open]'); await pg.waitForTimeout(600);   /* the sheet's open animation scales it a little at first */
  const pk=await pg.evaluate(()=>{ const d=document.querySelector('dialog.who-dlg'), chips=[...d.querySelectorAll('.chip')]; return {title:d.querySelector('h3').textContent,chips:chips.map(c=>c.textContent),minH:Math.min(...chips.map(c=>c.getBoundingClientRect().height),999),
    inH:d.querySelector('#whoIn').getBoundingClientRect().height,dir:d.querySelector('#whoIn').getAttribute('dir'),btnH:[...d.querySelectorAll('button:not(.chip)')].map(x=>Math.round(x.getBoundingClientRect().height)),saveOff:d.querySelector('[data-save]').disabled,locked:document.documentElement.classList.contains('scroll-lock')}; });
  ok(N+'picker title',pk.title==='Who’s using Studio?',pk.title);
  ok(N+'chips list the team name',pk.chips.includes('Omar'),pk.chips);
  ok(N+'targets are at least 44px',pk.minH>=44&&pk.inH>=44&&pk.btnH.every(h=>h>=44),[pk.minH,pk.inH,pk.btnH]);
  ok(N+'input is dir=auto, Save waits for a name, page scroll is locked',pk.dir==='auto'&&pk.saveOff&&pk.locked,pk);
  await pg.fill('#whoIn',AR);
  const rtl=await pg.evaluate(()=>{ const i=document.querySelector('#whoIn'); return {dir:getComputedStyle(i).direction,align:getComputedStyle(i).textAlign,bidi:getComputedStyle(i).unicodeBidi,v:i.value}; });
  ok(N+'Arabic name types right to left',rtl.dir==='rtl'||rtl.bidi==='plaintext',rtl);
  await tap('[data-save]'); await pg.waitForFunction(()=>!document.querySelector('dialog.who-dlg'),null,{timeout:3000});
  const sub=await pg.evaluate(()=>document.querySelector('[data-set=who] small').textContent);
  ok(N+'Settings row shows the saved name',sub===AR,sub);
  ok(N+'scroll lock released after the picker closes (settings still open)',await pg.evaluate(()=>document.querySelectorAll('dialog[open]').length===1));
  /* owner switch: confirm first */
  await tap('[data-set=owner]'); await pg.waitForSelector('dialog.who-dlg[open]');
  const cf=await pg.evaluate(()=>({t:document.querySelector('dialog.who-dlg').textContent,on:document.querySelector('[data-set=owner]').getAttribute('aria-checked')}));
  ok(N+'owner switch asks first (only the owner), stays off until confirmed',/only the owner/i.test(cf.t)&&cf.on==='false',cf);
  await tap('dialog.who-dlg [data-no]'); await pg.waitForFunction(()=>!document.querySelector('dialog.who-dlg'));
  ok(N+'Cancel leaves it off',await pg.evaluate(()=>document.querySelector('[data-set=owner]').getAttribute('aria-checked'))==='false'&&!(await pg.evaluate(()=>StudioWho.get().owner)));
  await tap('[data-set=owner]'); await pg.waitForSelector('dialog.who-dlg[open]'); await tap('dialog.who-dlg [data-yes]'); await pg.waitForFunction(()=>!document.querySelector('dialog.who-dlg'));
  await pg.waitForFunction(()=>document.querySelector('[data-set=owner]').getAttribute('aria-checked')==='true',null,{timeout:2000}).catch(()=>{});
  ok(N+'confirming turns it on and keeps the name',await pg.evaluate(()=>document.querySelector('[data-set=owner]').getAttribute('aria-checked')==='true'&&StudioWho.get().owner===true&&StudioWho.get().name),null);
  /* persists */
  await pg.reload(); await pg.waitForSelector('#setBtn'); await pg.waitForTimeout(300);
  await tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]');
  const again=await pg.evaluate(()=>({sub:document.querySelector('[data-set=who] small').textContent,own:document.querySelector('[data-set=owner]').getAttribute('aria-checked'),lazy:!!window.StudioWho}));
  ok(N+'name and owner switch persist after reload (read without loading who.js)',again.sub===AR&&again.own==='true'&&!again.lazy,again);
  /* picker again: the saved name is listed and the user flag opens it */
  const w=await pg.evaluate(async()=>{ await new Promise(r=>{ const s=document.createElement('script'); s.src='assets/who.js'; s.onload=r; document.head.appendChild(s); }); const g=StudioWho.get(); return {name:g.name,author:StudioWho.author(),off:await StudioWho.setOwner(false),after:StudioWho.get().owner}; });
  ok(N+'get()/author() return the name; owner switch turns off without a prompt',w.name===AR&&w.author===AR&&w.off===false&&w.after===false,w);
  await ctx.close();
}
await run('phone light',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,colorScheme:'light'});
await run('phone dark',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,colorScheme:'dark'});
await run('desktop',{viewport:{width:1280,height:800},colorScheme:'light'});
ok('no page errors',errs.length===0,errs);
await b.close(); console.log(res.join('\n')); const f=res.filter(x=>x.startsWith('FAIL')).length; console.log((res.length-f)+' passed, '+f+' failed'); process.exit(f?1:0);
