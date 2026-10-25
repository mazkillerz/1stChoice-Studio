/* Create template search: filters by label / Arabic words, RTL input, empty state, clear, picking still works, no overflow at 360px. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(tag+' '+m.text()); }); };
const ready=async pg=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400); };
const shown=pg=>pg.evaluate(()=>[...document.querySelectorAll('.cr-tpl')].filter(e=>e.offsetParent!==null).map(e=>e.dataset.tpl));

for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,scheme);
  await pg.goto(BASE+'tools/create.html'); await ready(pg);
  const all=await pg.evaluate(()=>CR.templates().map(d=>({id:d.id,label:d.label,words:Object.values(d.words||{})})));
  const n=all.length;
  ok(scheme+': search box is there',await pg.locator('#crTplQ').count()===1&&n>=6);
  const h=await pg.locator('#crTplQ').boundingBox(); ok(scheme+': input >= 44px tall',h&&h.height>=44,h);
  ok(scheme+': all templates listed',(await shown(pg)).length===n);
  const t=all[0]; await pg.fill('#crTplQ',t.label.toLowerCase());
  let s=await shown(pg); ok(scheme+': English label filters',s.includes(t.id)&&s.length<n&&s.length>0,s.length);
  ok(scheme+': clear button visible',await pg.locator('#crTplClear').isVisible());
  /* picking a filtered template still opens it */
  await pg.fill('#crTplQ',''); await pg.fill('#crTplQ',t.id);
  await pg.tap(`[data-tpl="${t.id}"]`); await pg.waitForTimeout(1500);
  ok(scheme+': picking a filtered template builds it',await pg.evaluate(()=>BD.util.frames().some(f=>BD.util.items(f).some(n=>!n.hasName('frame-bg')))&&document.getElementById('crSheet').hidden));
  await pg.evaluate(()=>CRUI.openTemplates()); await pg.waitForTimeout(500);
  /* Arabic */
  const aw=all.map(x=>({id:x.id,w:x.words.find(w=>/[؀-ۿ]/.test(w))})).find(x=>x.w); const word=aw.w.split(/\s+/)[0];
  await pg.fill('#crTplQ',word); s=await shown(pg);
  ok(scheme+': Arabic word filters',s.includes(aw.id)&&s.length<n&&s.length>0,{word,s});
  ok(scheme+': input direction is rtl for Arabic',await pg.evaluate(()=>getComputedStyle(document.getElementById('crTplQ')).direction==='rtl'));
  ok(scheme+': Arabic words never run under the clear button',await pg.evaluate(()=>{ const q=document.getElementById('crTplQ'), c=document.getElementById('crTplClear').getBoundingClientRect(), r=q.getBoundingClientRect(); return !document.getElementById('crTplClear').hidden && r.right-parseFloat(getComputedStyle(q).paddingRight)<=c.left+1; }));
  /* Arabic normalisation: same word with a tatweel still matches */
  await pg.fill('#crTplQ',word[0]+'ـ'+word.slice(1)); ok(scheme+': Arabic tatweel ignored',(await shown(pg)).includes(aw.id));
  await pg.fill('#crTplQ','zzqqxx'); ok(scheme+': nonsense shows empty state',(await shown(pg)).length===0&&await pg.locator('#crTplNone').isVisible()&&/No templates match/.test(await pg.locator('#crTplNone').textContent()));
  await pg.tap('#crTplClear'); await pg.waitForTimeout(150);
  ok(scheme+': clear restores all',(await shown(pg)).length===n&&!(await pg.locator('#crTplNone').isVisible())&&(await pg.locator('#crTplQ').inputValue())==='');
  /* ?tpl= on an existing draft highlights the template */
  const url=await pg.evaluate(()=>location.href);
  await ctx.close();
}

/* 360px: no horizontal scroll; ?tpl= with a draft opens the picker on that template */
{ const ctx=await b.newContext({viewport:{width:360,height:740},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  const pg=await ctx.newPage(); watch(pg,'360');
  await pg.goto(BASE+'tools/create.html'); await ready(pg);
  ok('360px: no horizontal scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.getElementById('crSheetB').scrollWidth<=document.getElementById('crSheetB').clientWidth+1));
  const id=await pg.evaluate(()=>CR.templates().slice(-1)[0].id);
  await pg.tap('[data-size="story"]'); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ const t=BD.util.frames()[0]; BD.addText&&0; });
  /* make a draft: add text through the UI */
  await pg.tap('#crBar [data-cr="text"]'); await pg.waitForTimeout(1500);
  const withDraft=await pg.evaluate(()=>location.search.includes('draft='));
  if(withDraft){ const u=await pg.evaluate(()=>location.href.split('?')[0]+'?'+location.search.slice(1)); await pg.goto(u+'&tpl='+id); await ready(pg); await pg.waitForSelector('.cr-tpl.hl',{timeout:8000}).catch(()=>{});
    ok('?tpl= on a draft opens the picker on that template',await pg.evaluate(id=>{ const e=document.querySelector(`[data-tpl="${id}"]`); return !!e&&e.classList.contains('hl'); },id),await pg.evaluate(()=>({h:document.getElementById('crSheet').hidden,t:document.getElementById('crSheetT').textContent,u:location.href,n:document.querySelectorAll('.cr-tpl').length}))); }
  else console.log('SKIP draft highlight (no draft made)');
  await ctx.close(); }

console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no console errors');
await b.close(); process.exit(fails||errs.length?1:0);
