/* Smoke test: the core flows, phone size (390x844, touch), in light AND dark. Run it every session; it takes about a minute.
   1. Home opens (Restock row with its camera button, search, Saved row), the theme really applies (readable body text).
   2. Restock from a photo: the camera button's photo lands in Restock, the "Your photo is in" note shows.
   3. Save in one tap: the bar's Save makes the full-size PNG (2160x3840) and saves the design to the team (?design=).
   4. Save after an edit: the bar's Save opens the Save sheet and Save in it makes the PNG again.
   5. Search finds the tool and saved designs, English and Arabic (an Arabic result row runs right to left).
   6. Open a saved design from the Saved page: it opens in its tool with its photo back.
   Saved designs are seeded with tests/seed.js (the first one gets an approved Arabic phrase as its name); the team is tests/fakecloud.js.
   Run like tests/full.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const SEED=seedDesigns(); Object.values(SEED.designs)[0].name='رجع متوفر – Classic';
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=async d=>{ const p=await d.path(); const x=fs.readFileSync(p); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

for(const scheme of ['light','dark']){
  const N=scheme+': ';
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:seedScript(SEED)});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(scheme+': '+e.message));
  const dls=[]; pg.on('download',d=>dls.push(d));
  const waitDl=async n=>{ for(let i=0;i<50&&dls.length<n;i++) await pg.waitForTimeout(300); return dls[n-1]; };

  /* 1. home */
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1200);
  const home=await pg.evaluate(()=>{ const lum=c=>{ const m=c.match(/\d+(\.\d+)?/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };
    const bs=getComputedStyle(document.body), bg=lum(bs.backgroundColor), fg=lum(bs.color);
    return {restock:!!document.querySelector('.tool-item [data-quick="restock"]'),search:!!document.getElementById('uq'),saved:document.querySelectorAll('#savedRowList .sv-card').length,
      bg, ratio:(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)}; });
  ok(N+'home opens: Restock row with a camera button, search, saved designs',home.restock&&home.search&&home.saved>0,{restock:home.restock,saved:home.saved});
  ok(N+'the theme applies and body text is readable',(scheme==='dark'?home.bg<.05:home.bg>.8)&&home.ratio>=7,{bg:+home.bg.toFixed(3),ratio:+home.ratio.toFixed(1)});

  /* 2. Restock from a photo */
  await Promise.all([pg.waitForURL(/restock\.html/,{timeout:10000}),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]);
  await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
  const real=()=>pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
  ok(N+'Restock from a photo: the photo is in and the note shows',await real()===1&&await pg.isVisible('#readyBar'));

  /* 3. one tap saves the picture and the design */
  await pg.tap('#barSave');
  const d1=await waitDl(1); const s1=d1?await pngSize(d1):'';
  await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
  const did=new URL(pg.url()).searchParams.get('design');
  ok(N+'one tap on Save: full-size PNG + saved to the team',s1==='2160x3840'&&!!did,{png:s1,design:did});

  /* 4. after an edit, Save opens the Save sheet; Save in it makes the picture */
  await pg.waitForTimeout(1500);   // the save tick and toast settle
  await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(500);
  const chip=pg.locator('#sh-words .chip[aria-pressed="false"]').first(); if(await chip.count()) await chip.tap(); await pg.waitForTimeout(800);
  await pg.tap('#bar [data-open="words"]').catch(()=>{}); await pg.waitForTimeout(400);
  await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{});
  const sheet=await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'));
  if(sheet) await pg.tap('#save');
  const d2=await waitDl(2); const s2=d2?await pngSize(d2):'';
  ok(N+'after an edit: Save opens the Save sheet, Save in it makes the full-size PNG',sheet&&s2==='2160x3840',{sheet,png:s2});

  /* 5. search: the tool and saved designs, English and Arabic */
  await pg.goto(BASE+'index.html?s=1'); await pg.waitForTimeout(1200);
  await pg.tap('#uq'); await pg.fill('#uq','Restock'); await pg.waitForTimeout(600);
  const en=await pg.$$eval('#usPanel .us-row .us-t',l=>l.map(x=>x.textContent));
  ok(N+'search "Restock" finds the tool and a saved restock',en.includes('Restock')&&en.some(t=>/^Restock – /.test(t)),en.slice(0,6));
  await pg.fill('#uq','رجع'); await pg.waitForTimeout(600);
  const ar=await pg.evaluate(()=>{ const r=[...document.querySelectorAll('#usPanel .us-item')].find(x=>/رجع متوفر/.test(x.textContent)); return r?{rtl:r.matches(':dir(rtl)')}:null; });
  ok(N+'search "رجع" finds the Arabic design, and its row runs right to left',!!ar&&ar.rtl,ar);
  await pg.click('#usCancel').catch(()=>{});

  /* 6. open the design saved in step 3 from the Saved page */
  await pg.goto(BASE+'index.html?o=1#saved'); await pg.waitForTimeout(1500);
  const card=pg.locator(`#savedGrid .sv-card[data-id="${did}"] .sv-open`);
  const has=await card.count();
  if(has){ await card.tap(); await pg.waitForURL(new RegExp('restock\\.html\\?design='+did),{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(2500); }
  const opened=has?await pg.evaluate(()=>({bar:!document.getElementById('designBar').hidden,photos:Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length})):null;
  ok(N+'Saved: the new design is there and opens in Restock with its photo',!!opened&&opened.bar&&opened.photos===1&&new RegExp('design='+did).test(pg.url()),{card:has,opened,url:pg.url()});
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); console.log(`smoke: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);
