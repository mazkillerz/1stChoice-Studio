/* Studio 1.15.0 (Simplify): the checks for this session's cuts.
   1. Phone sheets have a quiet Done (not accent-filled), so the Save sheet shows two blue buttons (its Save + the bar's), not three.
   2. Secondary actions (.link) are text buttons: no underline, readable colour, in light and dark.
   3. "Keep the photos" has its note on a line under it; the Photo sheet's note is one short sentence.
   4. Offer starts from a photo in All tools: All tools, camera, Save = 3 taps (was 4) and a full-size PNG.
   5. Computer: the Save card no longer sticks over the steps; a slim dock with the same Save button shows while the card is out of
      sight, follows its words, hides when the card shows, and one click brings the card up and saves the full-size PNG.
   Phone 390x844 (touch) and desktop 1280x800, light and dark. Run: server on :8080 (or BASE=...), then node tests/simplify15.mjs. */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=async d=>{ const p=await d.path(); const x=fs.readFileSync(p); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
/* helpers that run in the page: contrast of an element's text on the first solid background behind it; accent-filled controls */
const PAGE_FN=`window.__s15={
  rgb(c){ const m=(c||'').match(/[\\d.]+/g); return m?m.map(Number):[0,0,0,0]; },
  lum(c){ return .2126*c[0]+.7152*c[1]+.0722*c[2]; },
  L(c){ return c.slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); },
  bg(e){ for(let x=e;x;x=x.parentElement){ const c=this.rgb(getComputedStyle(x).backgroundColor); if(c.length<4||c[3]>.9) return c; } return [255,255,255]; },
  ratio(e){ const f=this.lum(this.L(this.rgb(getComputedStyle(e).color))), g=this.lum(this.L(this.bg(e))); return (Math.max(f,g)+.05)/(Math.min(f,g)+.05); },
  vis(e){ const r=e.getBoundingClientRect(), s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&+s.opacity>0&&r.bottom>0&&r.top<innerHeight; },
  accent(){ const a=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); const d=document.createElement('i'); d.style.color=a; document.body.appendChild(d); const c=getComputedStyle(d).color; d.remove();
    return [...document.querySelectorAll('button,a,label')].filter(e=>this.vis(e)&&getComputedStyle(e).backgroundColor===c&&!e.closest('.fab')&&!e.matches('.chip,[aria-pressed]')).map(e=>(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,24)); } };`;

for(const scheme of ['light','dark']){
  /* ---------------- phone ---------------- */
  { const N='phone '+scheme+': ';
    const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,colorScheme:scheme});
    await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
    await ctx.addInitScript({content:seedScript(seedDesigns())}); await ctx.addInitScript({content:PAGE_FN});
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
    const dls=[]; pg.on('download',d=>dls.push(d)); const waitDl=async n=>{ for(let i=0;i<60&&dls.length<n;i++) await pg.waitForTimeout(300); return dls[n-1]; };
    await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:welcome','1'); }); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1000);

    /* 4. Offer from a photo in All tools: All tools (1), camera (2), Save (3) */
    let taps=0;
    await pg.tap('#allTools'); taps++; await pg.waitForSelector('dialog[open] .lib-row[data-id="offer"]',{timeout:5000}); await pg.waitForTimeout(400);
    const cam=await pg.evaluate(()=>{ const c=document.querySelector('dialog[open] .lib-row[data-id="offer"] .lib-cam'); return c?{label:c.querySelector('.sr-only').textContent,multi:!!c.querySelector('input[multiple]')}:null; });
    ok(N+'Offer has a camera in All tools (one photo)',!!cam&&cam.label==='Offer from a photo'&&!cam.multi,cam);
    taps++; await Promise.all([pg.waitForURL(/offer\.html/,{timeout:10000}),pg.setInputFiles('dialog[open] .lib-row[data-id="offer"] input[data-quick="offer"]',S+'pair.jpg')]);
    await pg.waitForSelector('#readyBar:not([hidden])',{timeout:10000}).catch(()=>{});
    ok(N+'the photo is in Offer and the ready note shows',await pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length)===1&&await pg.isVisible('#readyBar'));
    await pg.tap('#barSave'); taps++;
    const d1=await waitDl(1); const s1=d1?await pngSize(d1):'';
    ok(N+'Offer from a photo: 3 taps to a full-size PNG (was 4)',s1==='2160x3840'&&taps===3,{png:s1,taps});

    /* 1 + 2. the Save sheet after an edit: two blue buttons, a quiet Done, text buttons with no underline */
    await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(1500); await pg.evaluate(()=>document.getElementById('draftFresh')?.click()); await pg.waitForTimeout(800);
    for(const sh of ['photo','words','style','layers']){ await pg.tap(`#bar [data-open="${sh}"]`); await pg.waitForTimeout(450);
      const d=await pg.evaluate(s=>{ const e=document.querySelector(`#sh-${s} .done`); return e&&__s15.vis(e)?{acc:__s15.accent(),ratio:+__s15.ratio(e).toFixed(2)}:null; },sh);
      ok(N+sh+' sheet: Done is quiet (one blue button: Save) and readable',!!d&&d.acc.length<=1&&d.ratio>=4.5,d);
      await pg.tap(`#bar [data-open="${sh}"]`).catch(()=>{}); await pg.waitForTimeout(350); }
    await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(400); await pg.locator('#sh-words .chip[aria-pressed="false"]').first().tap(); await pg.waitForTimeout(400); await pg.tap('#bar [data-open="words"]'); await pg.waitForTimeout(350);
    await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{}); await pg.waitForTimeout(500);
    const sv=await pg.evaluate(()=>({acc:__s15.accent(),done:__s15.ratio(document.querySelector('#sh-save .done')),
      links:[...document.querySelectorAll('#sh-save .link')].filter(e=>__s15.vis(e)).map(e=>({t:e.textContent.trim(),u:getComputedStyle(e).textDecorationLine,r:+__s15.ratio(e).toFixed(2)})),
      dock:getComputedStyle(document.getElementById('saveDock')).display}));
    ok(N+'Save sheet: at most two blue buttons (its Save and the bar), Done is not one',sv.acc.length<=2&&!sv.acc.includes('Done'),sv.acc);
    ok(N+'Save sheet: text buttons have no underline and read at 4.5:1',sv.links.length>=2&&sv.links.every(l=>l.u==='none'&&l.r>=4.5),sv.links);
    ok(N+'the computer dock is not shown on a phone',sv.dock==='none',sv.dock);
    /* 3. Keep the photos: its note sits under it */
    await pg.tap('#teamMore'); await pg.waitForTimeout(350);
    const kp=await pg.evaluate(()=>{ const l=document.querySelector('#teamMoreBox .check-txt'), n=l&&l.querySelector('.small'); if(!l) return null; const a=l.firstChild, r=document.createRange(); r.selectNodeContents(a); const ta=r.getBoundingClientRect(), tn=n.getBoundingClientRect();
      return {label:a.textContent.trim(),note:n.textContent.trim(),under:tn.top>=ta.bottom-1,clip:l.scrollWidth>l.clientWidth+1,ratio:+__s15.ratio(n).toFixed(2)}; });
    ok(N+'"Keep the photos" with its note on the line under it, readable',!!kp&&kp.label==='Keep the photos'&&kp.under&&!kp.clip&&kp.ratio>=4.5,kp);
    await pg.tap('#sh-save .done'); await pg.waitForTimeout(400);
    await pg.tap('#bar [data-open="photo"]'); await pg.waitForTimeout(450);
    const hint=await pg.evaluate(()=>[...document.querySelectorAll('#sh-photo .small')].map(e=>e.textContent.trim()).find(t=>/Drag a photo/.test(t))||'');
    ok(N+'Photo sheet: the note is one short sentence',hint.length>0&&hint.length<=80&&!/Tap a box/.test(hint),hint);
    await ctx.close(); }

  /* ---------------- computer ---------------- */
  { const N='desktop '+scheme+': ';
    const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:true,colorScheme:scheme});
    await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
    await ctx.addInitScript({content:seedScript(seedDesigns())}); await ctx.addInitScript({content:PAGE_FN});
    const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e.message));
    const dls=[]; pg.on('download',d=>dls.push(d)); const waitDl=async n=>{ for(let i=0;i<60&&dls.length<n;i++) await pg.waitForTimeout(300); return dls[n-1]; };
    await pg.goto(BASE+'index.html'); await pg.evaluate(()=>{ localStorage.clear(); localStorage.setItem('studio:welcome','1'); }); await pg.goto(BASE+'index.html'); await pg.waitForTimeout(1000);
    await Promise.all([pg.waitForURL(/restock\.html/,{timeout:10000}),pg.setInputFiles('input[data-quick="restock"]',S+'pair.jpg')]); await pg.waitForTimeout(2500);
    const top=await pg.evaluate(()=>{ const dock=document.getElementById('saveDock'), card=dock.firstElementChild.getBoundingClientRect(), sh=document.getElementById('sh-save');
      return {pos:getComputedStyle(sh).position,dockShown:!dock.hidden&&__s15.vis(dock.firstElementChild),h:Math.round(card.height),bottom:Math.round(innerHeight-card.bottom),
        words:document.getElementById('dockSave').textContent.trim(),label:document.getElementById('saveTxt').textContent.trim(),ids:document.querySelectorAll('#saveTxt').length,
        cardBelow:sh.getBoundingClientRect().top>innerHeight}; });
    ok(N+'the Save card is not sticky and sits below the steps',top.pos!=='sticky'&&top.cardBelow,top);
    ok(N+'the dock shows the same Save at the bottom, slim (<= 80px)',top.dockShown&&top.h<=80&&top.bottom>=0&&top.bottom<=24&&top.words===top.label&&top.ids===1,top);
    /* scrolled to Style: the steps show, only the dock covers the bottom */
    await pg.evaluate(()=>{ const s=document.getElementById('sh-style'); scrollTo(0,s.getBoundingClientRect().top+scrollY-90); }); await pg.waitForTimeout(500);
    const mid=await pg.evaluate(()=>{ const card=document.getElementById('saveDock').firstElementChild.getBoundingClientRect(), sv=document.getElementById('sh-save').getBoundingClientRect();
      return {free:Math.round(card.top),saveCard:Math.round(Math.max(0,innerHeight-Math.max(0,sv.top)))}; });
    ok(N+'editing Style: at least 650px of the steps in view (was about 330 under the sticky card)',mid.free>=650&&mid.saveCard===0,mid);
    /* the dock follows the card's words */
    await pg.evaluate(()=>{ const t=document.getElementById('teamOn'); t.click(); }); await pg.waitForTimeout(300);
    const w2=await pg.evaluate(()=>[document.getElementById('dockSave').textContent.trim(),document.getElementById('saveTxt').textContent.trim()]);
    ok(N+'the dock follows the card (team switch off changes both)',w2[0]===w2[1]&&w2[0]!==top.words,w2);
    await pg.evaluate(()=>document.getElementById('teamOn').click()); await pg.waitForTimeout(300);
    /* at the end of the page the card shows and the dock goes */
    await pg.evaluate(()=>scrollTo(0,document.body.scrollHeight)); await pg.waitForTimeout(600);
    ok(N+'with the card in view the dock hides',await pg.evaluate(()=>document.getElementById('saveDock').hidden&&!__s15.vis(document.getElementById('dockSave'))));
    /* one click on the dock: the card comes up and the full-size PNG is saved */
    await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(600);
    await pg.click('#dockSave');
    const d1=await waitDl(1); const s1=d1?await pngSize(d1):'';
    await pg.waitForTimeout(900);
    const after=await pg.evaluate(()=>{ const r=document.getElementById('sh-save').getBoundingClientRect(); return {inView:r.top<innerHeight&&r.bottom>0,done:!document.getElementById('doneBox').hidden}; });
    ok(N+'one click on the dock saves the full-size PNG and brings the card (and its tick) into view',s1==='2160x3840'&&after.inView,{png:s1,...after});
    ok(N+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await ctx.close(); }
}
ok('no page errors',!errs.length,errs.slice(0,3));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length;
console.log(`\n${res.length-f} passed, ${f} failed, ${((Date.now()-t0)/1000).toFixed(0)}s`); await b.close(); process.exit(f?1:0);
