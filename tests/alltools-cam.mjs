/* Studio 1.10.0 (Simplify): the camera button in All tools.
   A tool that starts from photos and is not pinned (Carousel, Highlight covers; Photo story and Collage on a device that only
   pinned Restock) gets the Home row's camera in the All tools sheet, before its star. Pinned tools keep star + drag handle only
   (their camera is on Home); tools that need no photo (Offer, Create) get none.
   Picking photos with it opens the tool with them in, like Home's camera: Carousel from photos is 3 taps (All tools, camera, Save)
   instead of 4 (All tools, Carousel, Add your photos, Save).
   Phone (390 and 360, touch) and desktop (1280), light and dark. Run: server on :8080, then node tests/alltools-cam.mjs. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
const VPS=[{name:'phone',width:390,height:844,touch:true},{name:'small phone',width:360,height:740,touch:true},{name:'desktop',width:1280,height:800,touch:false}];
for(const scheme of ['light','dark']) for(const vp of VPS){
  const N=`${vp.name} ${scheme}: `;
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.touch?2:1,isMobile:vp.touch,hasTouch:vp.touch,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); if(!localStorage.getItem('studio:pins')) localStorage.setItem('studio:pins',JSON.stringify(['restock'])); }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e));
  const tap=s=>vp.touch?pg.tap(s):pg.click(s);
  await pg.goto(BASE+'index.html'); await pg.waitForTimeout(900);
  await tap('#allTools'); await pg.waitForSelector('dialog[open] .lib-row',{timeout:5000}); await pg.waitForTimeout(500);
  const rows=await pg.$$eval('dialog[open] .lib-row',l=>l.map(r=>{ const c=r.querySelector('.lib-cam'), st=r.querySelector('.pin-btn'), cr=c&&c.getBoundingClientRect(), sr=st.getBoundingClientRect(), rr=r.getBoundingClientRect(), t=r.querySelector('.ttxt b');
    return {id:r.dataset.id,pinned:r.classList.contains('pinned'),cam:!!c,label:c?(c.querySelector('.sr-only')||{}).textContent:'',input:c?(c.querySelector('input[type=file][data-quick]')||{}).dataset?.quick:'',multiple:!!(c&&c.querySelector('input[multiple]')),
      w:cr?Math.round(cr.width):0,h:cr?Math.round(cr.height):0,before:cr?cr.right<=sr.left+1:true,inRow:cr?cr.right<=rr.right+1&&cr.left>=rr.left:true,titleClip:t.scrollWidth>t.clientWidth+1,rowOver:r.scrollWidth>r.clientWidth+1}; }));
  const R=id=>rows.find(r=>r.id===id)||{};
  ok(N+'Carousel and Highlight covers (not pinned) have a camera',R('carousel').cam&&R('highlight').cam,rows.filter(r=>r.cam).map(r=>r.id));
  ok(N+'Photo story and Collage (not pinned here) have one too',R('photo-story').cam&&R('collage').cam);
  ok(N+'pinned Restock has none (its camera is on Home), nor do Offer and Create',!R('restock').cam&&R('restock').pinned&&!R('offer').cam&&!R('create').cam);
  ok(N+'each camera has a label and its own picker',rows.filter(r=>r.cam).every(r=>/from (a photo|photos)$/.test(r.label)&&r.input===r.id),rows.filter(r=>r.cam).map(r=>r.label));
  ok(N+'multi-photo tools pick several photos',R('carousel').multiple&&R('highlight').multiple&&R('collage').multiple);
  ok(N+'cameras are 48x48, inside the row, before the star',rows.filter(r=>r.cam).every(r=>r.w>=48&&r.h>=48&&r.before&&r.inRow),rows.filter(r=>r.cam).map(r=>r.id+':'+r.w+'x'+r.h));
  ok(N+'no title cut and no row wider than the sheet',rows.every(r=>!r.titleClip&&!r.rowOver),rows.filter(r=>r.titleClip||r.rowOver).map(r=>r.id));
  ok(N+'no sideways scroll on the page',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  /* pin Carousel: its camera leaves the sheet (it is on Home now) */
  await tap('dialog[open] .pin-btn[data-pin="carousel"]'); await pg.waitForTimeout(500);
  ok(N+'pinning Carousel moves it up and drops its camera from the sheet',await pg.evaluate(()=>{ const r=document.querySelector('dialog[open] .lib-pins .lib-row[data-id="carousel"]'); return !!r&&!r.querySelector('.lib-cam'); }));
  ok(N+'…and Home has its camera now',await pg.evaluate(()=>!!document.querySelector('#toolGrid .tool-item input[data-quick="carousel"]')));
  await tap('dialog[open] .pin-btn[data-pin="carousel"]'); await pg.waitForTimeout(500);
  ok(N+'unpinning brings the camera back to the sheet',await pg.evaluate(()=>!!document.querySelector('dialog[open] .lib-row[data-id="carousel"] .lib-cam')));
  /* the job: Carousel from photos, from All tools */
  if(scheme==='light'&&vp.width!==360){
    await Promise.all([pg.waitForURL(/carousel\.html/,{timeout:15000}),pg.setInputFiles('dialog[open] .lib-row[data-id="carousel"] input[data-quick]',[S+'pair.jpg',S+'foam.jpg',S+'shelf.jpg'])]);
    await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.S.P&&Studio.debug.S.P.length===3,null,{timeout:15000}).catch(()=>{});
    const st=await pg.evaluate(()=>({pages:Studio.debug.S.P.length,real:Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length,url:location.search}));
    ok(N+'picking 3 photos opens Carousel with 3 slides, each with its photo',st.pages===3&&st.real===3&&!/quick/.test(st.url),st);
  }
  await ctx.close();
}
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const nf=res.filter(r=>r.startsWith('FAIL')).length; console.log(nf?nf+' FAILED':'ALL '+res.length+' PASSED'); process.exit(nf?1:0);
