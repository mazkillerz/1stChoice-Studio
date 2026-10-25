/* Contrast + direction sweep: every main screen, light and dark, phone size. Lists text whose contrast is below WCAG AA
   (4.5:1, or 3:1 for large text) against the colour actually behind it, and Arabic text that runs left-to-right.
   Usage: node tests/contrast.mjs [base]   (server on :8080). Exit code 1 when something is found. */
import { chromium } from 'playwright'; import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.argv[2]||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const SEED=seedDesigns(); const AR=['رجع متوفر – Classic','Restock وفرنا كمية جديدة'];
Object.values(SEED.designs).slice(0,2).forEach((d,i)=>{ d.name=AR[i]; });
SEED.cols['ربعك']={id:'ربعك',name:'منشن ربعك',brand:'1stchoice'}; Object.values(SEED.designs)[2].cols.push('ربعك');
const scan=()=>{
  const lin=c=>{ c/=255; return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4); };
  const parse=s=>{ const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const over=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
  const L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
  const ratio=(a,b)=>{ const x=L(a),y=L(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  /* the colour behind an element: blend the backgrounds of its ancestors (stops at an image or gradient: unknown) */
  const behind=el=>{ const stack=[]; for(let e=el;e;e=e.parentElement){ const cs=getComputedStyle(e); if(cs.backgroundImage&&cs.backgroundImage!=='none'&&!/gradient/.test(cs.backgroundImage)) return null; const c=parse(cs.backgroundColor); if(c&&c.a>0){ stack.push(c); if(c.a>=1) break; } }
    let col=parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1}; for(let i=stack.length-1;i>=0;i--) col=over(stack[i],col); return col; };
  const vis=e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) return false; for(let x=e;x;x=x.parentElement){ const cs=getComputedStyle(x); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.5) return false; } return true; };
  const out=[], rtl=[]; const seen=new Set();
  document.querySelectorAll('body *').forEach(el=>{
    if(['SCRIPT','STYLE','SVG','PATH','CANVAS','OPTION'].includes(el.tagName.toUpperCase())) return;
    const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
    const isInput=/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&!['file','range','checkbox','radio','color','hidden'].includes(el.type);
    const text=isInput?(el.value||el.placeholder||''):own; if(!text||!vis(el)) return;
    if(el.closest('.sr-only')) return;
    const cs=getComputedStyle(el); let fg=parse(cs.color); if(!fg) return;
    let op=1; for(let x=el;x;x=x.parentElement) op*=+getComputedStyle(x).opacity; fg={...fg,a:fg.a*op};
    const bg=behind(el); if(!bg) return;
    const r=ratio(over(fg,bg),bg), size=parseFloat(cs.fontSize), w=+cs.fontWeight, large=size>=24||(size>=18.66&&w>=600);
    const need=large?3:4.5, disabled=el.disabled||el.closest('[disabled],[aria-disabled="true"]');
    if(r<need&&!disabled){ const k=el.className+'|'+text.slice(0,20); if(!seen.has(k)){ seen.add(k); out.push(`${r.toFixed(2)} < ${need}  <${el.tagName.toLowerCase()} class="${String(el.className).slice(0,40)}"> "${text.slice(0,40)}"`); } }
    /* Arabic text should run right-to-left */
    const first=(text.match(/[A-Za-z֐-ࣿ]/)||[''])[0];
    if(/[֐-ࣿ]/.test(first)&&!isInput&&cs.direction!=='rtl'&&getComputedStyle(el).unicodeBidi!=='plaintext'&&!el.closest('bdi,[dir=auto],[dir=rtl]')) rtl.push(`<${el.tagName.toLowerCase()} class="${String(el.className).slice(0,40)}"> "${text.slice(0,30)}" runs ${cs.direction}`);
  });
  return {low:out,rtl:[...new Set(rtl)]};
};
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const b=await chromium.launch({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined});
let bad=0; const errs=[];
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme,ignoreHTTPSErrors:true,reducedMotion:'reduce'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  await ctx.addInitScript({content:`try{ if(!localStorage.getItem('studio:pins')) localStorage.setItem('studio:pins',JSON.stringify(['restock','photo-story','collage'])); }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(scheme+': '+e));
  const report=async name=>{ await pg.waitForTimeout(500); const r=await pg.evaluate(scan); const n=r.low.length+r.rtl.length; bad+=n; console.log(`${scheme.padEnd(5)} ${name.padEnd(22)} ${n?'':'ok'}`); r.low.forEach(x=>console.log('   contrast '+x)); r.rtl.forEach(x=>console.log('   rtl      '+x)); };
  const go=async u=>{ await pg.goto(BASE+u); await pg.waitForTimeout(1500); };
  await go('index.html'); await report('home');
  await pg.evaluate(()=>scrollTo(0,9999)); await report('home (bottom)');
  await go('index.html?a=1'); await pg.tap('#fab'); await report('+ menu'); await pg.keyboard.press('Escape');
  await go('index.html?b=1'); await pg.tap('#allTools'); await report('All tools'); await pg.keyboard.press('Escape');
  await go('index.html?c=1'); await pg.tap('#uq'); await report('search (idle)'); await pg.fill('#uq','رجع'); await report('search (Arabic)'); await pg.fill('#uq','Restock'); await report('search (English)');
  await go('index.html#saved'); await report('Saved');
  await pg.tap('#colChips [data-f="c:Restocks"]'); await report('Saved: collection on');
  await pg.tap('#colMore'); await report('collection menu'); await pg.keyboard.press('Escape');
  await pg.tap('#colChips [data-f="c:ربعك"]'); await report('Saved: Arabic collection');
  await pg.tap('#savedGrid [data-dmore]'); await report('design sheet'); await pg.keyboard.press('Escape');
  await go('whats-new.html'); await report("What's New");
  await go('tools/photo-story.html'); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3500); await report('photo story');
  for(const sh of ['photo','words','style','layers']){ await pg.tap(`#bar [data-open="${sh}"]`); await report('sheet: '+sh); await pg.tap(`#bar [data-open="${sh}"]`).catch(()=>{}); await pg.waitForTimeout(300); }
  await pg.tap('#barSave'); await report('sheet: save');
  await go('tools/restock.html'); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(3500); await report('restock');
  await go('tools/create.html'); await report('create');
  await ctx.close();
}
await b.close();
if(errs.length) console.log('PAGE ERRORS: '+errs.join(' | '));
console.log(bad?`${bad} finding(s)`:'no findings'); process.exit(bad||errs.length?1:0);
