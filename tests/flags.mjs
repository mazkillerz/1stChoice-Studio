/* Preview flags (Studio.flags, Settings → Previews, ?flag-<id>=1|0, search actions): 390x844 touch light + dark and 1280x800.
   Every flag is off by default; Settings shows Previews with the count; the switches flip the stored value; a link sets one;
   search lists "Try preview: …". Needs BASE (default http://127.0.0.1:8080/). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
async function run(tag,opts){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','seen'); }catch(_){} });
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#setBtn',{timeout:8000});
  const tap=s=>opts.hasTouch?pg.tap(s):pg.click(s), N=tag+': ';
  const def=await pg.evaluate(()=>Studio.flags.list());
  ok(N+'there are flags and every one is off by default',def.length>0&&def.every(f=>!f.on),def);
  await tap('#setBtn'); await pg.waitForSelector('dialog.set-dlg[open]');
  const row=await pg.evaluate(()=>{ const r=document.querySelector('[data-set=previews]'); return r&&{end:r.querySelector('.set-end').textContent,h:r.getBoundingClientRect().height}; });
  ok(N+'Settings has a Previews row that says Off, at least 44px tall',row&&row.end==='Off'&&row.h>=44,row);
  await tap('[data-set=previews]'); await pg.waitForSelector('[data-flag]');
  await pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:4000}).catch(()=>{});
  const sw=await pg.evaluate(()=>[...document.querySelectorAll('[data-flag]')].map(b=>({id:b.dataset.flag,role:b.getAttribute('role'),on:b.getAttribute('aria-checked'),h:Math.round(b.getBoundingClientRect().height),w:Math.round(b.getBoundingClientRect().width)})));
  ok(N+'one switch per flag, all off, at least 44px, inside the screen',sw.length===def.length&&sw.every(s=>s.role==='switch'&&s.on==='false'&&s.h>=44&&s.w<=(opts.viewport.width)),sw);
  await tap('[data-flag="'+sw[0].id+'"]');
  const after=await pg.evaluate(id=>({stored:localStorage.getItem('studio:flag:'+id),on:Studio.flags.on(id),aria:document.querySelector('[data-flag="'+id+'"]').getAttribute('aria-checked'),end:document.querySelector('[data-set=previews] .set-end').textContent}),sw[0].id);
  ok(N+'tapping a switch turns that preview on and updates the count',after.stored==='1'&&after.on&&after.aria==='true'&&after.end==='1 on',after);
  await tap('[data-flag="'+sw[0].id+'"]');
  ok(N+'tapping again turns it off',await pg.evaluate(id=>!Studio.flags.on(id)&&localStorage.getItem('studio:flag:'+id)===null,sw[0].id));
  await pg.goto(BASE+'index.html?flag-'+sw[0].id+'=1'); await pg.waitForSelector('#setBtn');
  ok(N+'a ?flag-<id>=1 link switches it on',await pg.evaluate(id=>Studio.flags.on(id),sw[0].id));
  await pg.goto(BASE+'index.html?flag-'+sw[0].id+'=0&flag-nonsense=1'); await pg.waitForSelector('#setBtn');
  ok(N+'?flag-<id>=0 switches it off and unknown ids are ignored',await pg.evaluate(id=>!Studio.flags.on(id)&&localStorage.getItem('studio:flag:nonsense')===null,sw[0].id));
  await ctx.close();
}
await run('phone light',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'});
await run('phone dark',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'});
await run('desktop',{viewport:{width:1280,height:800},colorScheme:'light'});
ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
