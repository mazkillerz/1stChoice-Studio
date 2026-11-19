/* Video editor, logo layers (assets/reel-project.js `logos`, tools/video*.js) and a brand-kit project template (media from a url):
   opens the National Day reel template (tools/video.html?reel=nd-getting-ready): the clip loads from its url (not "Missing"), the logo is drawn;
   tap to select, Place > Bottom right, Size slider, drag, Undo; Add > Logo adds a second one; a draft reload keeps the logos; an old recipe
   with no `logos` still opens. Phone 390×844 (touch) and computer 1280×800. Needs the server on :8080 (npx http-server -p 8080 -c-1 .) or BASE=...
   Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const near=(a,b,t)=>Math.abs(a-b)<=(t||3);

async function newPage(vp,touch){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('studio:welcome','1'); }catch(e){}`});
  const pg=await ctx.newPage(), errs=[];
  pg.on('pageerror',e=>errs.push(String(e.message||e)));
  pg.on('console',m=>{ if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  return {ctx,pg,errs};
}
const ready=async pg=>{ await pg.waitForFunction(()=>window.__video&&window.__video().ready,null,{timeout:90000}); await pg.waitForTimeout(400); };
const rec=pg=>pg.evaluate(()=>window.__video().recipe);
const logo=async(pg,i)=>(await rec(pg)).logos[i||0];
/* where the logo is on the screen (css px) */
const screenBox=(pg,id)=>pg.evaluate(id=>{ const P=VD.st.P, b=P.logoBox(id), r=document.getElementById('vdPv').getBoundingClientRect(), k=r.width/P.W; return {x:r.left+(b.x+b.w/2)*k,y:r.top+(b.y+b.h/2)*k,k}; },id);
async function drag(pg,cdp,touch,x1,y1,x2,y2){
  if(touch){ const pt=(x,y)=>[{x,y,id:1}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pt(x1,y1)});
    for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pt(x1+(x2-x1)*i/8,y1+(y2-y1)*i/8)}); await wait(20); }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
  else { await pg.mouse.move(x1,y1); await pg.mouse.down(); await pg.mouse.move((x1+x2)/2,(y1+y2)/2,{steps:4}); await pg.mouse.move(x2,y2,{steps:4}); await pg.mouse.up(); }
  await pg.waitForTimeout(300);
}
const tapAt=(pg,touch,x,y)=>touch?pg.touchscreen.tap(x,y):pg.mouse.click(x,y);

for(const [N,vp,touch] of [['phone: ',{width:390,height:844},true],['computer: ',{width:1280,height:800},false]]){
  const {ctx,pg,errs}=await newPage(vp,touch), cdp=await ctx.newCDPSession(pg);
  await pg.goto(BASE+'tools/video.html?reel=nd-getting-ready'); await ready(pg);
  let r=await rec(pg);
  ok(N+'the template opens as a project with one video clip and one logo',r.v===2&&r.clips.length===1&&r.clips[0].kind==='video'&&r.logos.length===1&&r.logos[0].asset==='nd26-logo-white',[r.clips.length,r.logos.length]);
  const miss=await pg.evaluate(()=>({missing:[...VD.missing()],dur:VD.dur(),txt:document.querySelector('.vt-miss')&&document.querySelector('.vt-miss').textContent}));
  ok(N+'the clip loads from its url: not missing, 29.7 s',miss.missing.length===0&&!miss.txt&&near(miss.dur,29.73,0.1),miss);
  ok(N+'the timeline shows the logo block',await pg.locator('.vt-blk.vt-logo').count()===1);
  ok(N+'no "yours stay on this device" note for a clip that comes with the brand kit',await pg.evaluate(()=>!VD.hasOwnFiles()));

  // the logo is drawn (pixels in its box differ from the same frame without it; nothing differs far away from it)
  const dr=await pg.evaluate(async()=>{ const P=VD.st.P, W=540, c1=document.createElement('canvas'), c2=document.createElement('canvas'); c1.width=c2.width=W; c1.height=c2.height=960;
    await P.prepare(5); P.draw(c1.getContext('2d'),5,{}); P.draw(c2.getContext('2d'),5,{hideLogo:'l1'});
    const a=c1.getContext('2d').getImageData(0,0,W,960).data, d=c2.getContext('2d').getImageData(0,0,W,960).data, bx=P.logoBox('l1'), k=W/1080; let inBox=0, far=0;
    for(let y=0;y<960;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4; if(Math.abs(a[i]-d[i])+Math.abs(a[i+1]-d[i+1])+Math.abs(a[i+2]-d[i+2])>30){ const X=x/k, Y=y/k; if(X>=bx.x&&X<=bx.x+bx.w&&Y>=bx.y&&Y<=bx.y+bx.h) inBox++; else if(Y<bx.y-80) far++; } }
    return {inBox,far,box:bx}; });
  ok(N+'the logo is drawn in its box (and only there)',dr.inBox>400&&dr.far===0,dr);
  ok(N+'the box sits bottom left, above the caption',near(dr.box.x,48,2)&&dr.box.y+dr.box.h<=1521&&dr.box.y>1300,dr.box);
  await pg.evaluate(()=>VD.setT(5)); await pg.waitForTimeout(500);

  // select by tapping the picture, then Place > Bottom right
  let sb=await screenBox(pg,'l1'); await tapAt(pg,touch,sb.x,sb.y); await pg.waitForTimeout(300);
  let s=await pg.evaluate(()=>window.__video().sel);
  ok(N+'tapping the logo selects it',s&&s.kind==='logo'&&s.id==='l1',s);
  ok(N+'the bar shows Place, Size, Logo, Shadow, Animation, Delete',await pg.evaluate(()=>[...document.querySelectorAll('#bar .vd-bb span')].map(x=>x.textContent).join(',')==='Done,Place,Size,Logo,Shadow,Animation,Delete'),await pg.evaluate(()=>[...document.querySelectorAll('#bar .vd-bb span')].map(x=>x.textContent).join(',')));
  ok(N+'the bar buttons are 48 px tall or more',await pg.evaluate(()=>[...document.querySelectorAll('#bar .vd-bb')].every(x=>x.getBoundingClientRect().height>=48)));
  await pg.tap?await (touch?pg.tap('#bar [data-open="lplace"]'):pg.click('#bar [data-open="lplace"]')):0; await pg.waitForTimeout(300);
  await (touch?pg.tap('[data-place="br"]'):pg.click('[data-place="br"]')); await pg.waitForTimeout(400);
  let l=await logo(pg), h=(await pg.evaluate(()=>VD.st.P.logoBox('l1'))).h;
  ok(N+'Bottom right: right edge 48 px from the frame edge, bottom edge at y 1520',near(l.x,1080-48-l.w/2,2)&&near(l.y,1520-h/2,2),[l.x,l.y,l.w]);
  await (touch?pg.tap('[data-place="tl"]'):pg.click('[data-place="tl"]')); await pg.waitForTimeout(300);
  l=await logo(pg); ok(N+'Top left: left edge 48, top edge at y 250',near(l.x,48+l.w/2,2)&&near(l.y,250+h/2,2),[l.x,l.y]);
  await (touch?pg.tap('[data-place="c"]'):pg.click('[data-place="c"]')); await pg.waitForTimeout(300);
  l=await logo(pg); ok(N+'Centre: the middle of the frame',near(l.x,540,2)&&near(l.y,960,2),[l.x,l.y]);

  // Size
  await (touch?pg.tap('#bar [data-open="lsize"]'):pg.click('#bar [data-open="lsize"]')); await pg.waitForTimeout(300);
  const rg=await pg.evaluate(()=>{ const r=document.querySelector('[data-r="lw"]'); return r?{min:+r.min,max:+r.max}:null; });
  ok(N+'the Size slider goes from 120 to 720 px',rg&&rg.min===120&&rg.max===720,rg);
  await pg.evaluate(()=>{ const r=document.querySelector('[data-r="lw"]'); r.value='420'; r.dispatchEvent(new Event('input',{bubbles:true})); r.dispatchEvent(new Event('change',{bubbles:true})); }); await pg.waitForTimeout(400);
  l=await logo(pg); ok(N+'the Size slider changes the width',l.w===420,l.w);
  ok(N+'the selection outline follows the logo size',await pg.evaluate(()=>{ const b=document.getElementById('vdSelBox'), p=document.getElementById('vdPv').getBoundingClientRect(); return !b.hidden&&Math.abs(b.getBoundingClientRect().width/p.width*1080-420)<4; }));
  await (touch?pg.tap('#bar [data-open="lplace"]'):pg.click('#bar [data-open="lplace"]')); await pg.waitForTimeout(250);
  await (touch?pg.tap('[data-place="bl"]'):pg.click('[data-place="bl"]')); await pg.waitForTimeout(300);

  // drag on the picture, then Undo
  await pg.evaluate(()=>VD.hist.commit()); const before=await logo(pg); sb=await screenBox(pg,'l1');
  await drag(pg,cdp,touch,sb.x,sb.y,sb.x+80*sb.k*3,sb.y-60*sb.k*3);
  const after=await logo(pg);
  ok(N+'dragging the logo moves it',after.x>before.x+150&&after.y<before.y-100,[before.x,after.x,before.y,after.y]);
  await pg.evaluate(()=>VD.hist.commit()); await pg.waitForTimeout(200);
  await (touch?pg.tap('#vdUndo'):pg.click('#vdUndo')); await pg.waitForTimeout(400);
  const un=await logo(pg); ok(N+'Undo puts the logo back (one step for the whole drag)',un.x===before.x&&un.y===before.y,[un.x,un.y,before.x,before.y]);
  await (touch?pg.tap('#vdRedo'):pg.click('#vdRedo')); await pg.waitForTimeout(300);
  ok(N+'Redo moves it again',(await logo(pg)).x===after.x);
  await (touch?pg.tap('#vdUndo'):pg.click('#vdUndo')); await pg.waitForTimeout(300);

  // Shadow and animation
  await (touch?pg.tap('#bar [data-do="shadow"]'):pg.click('#bar [data-do="shadow"]')); await pg.waitForTimeout(300);
  ok(N+'Shadow turns off',(await logo(pg)).shadow===false);
  await (touch?pg.tap('#bar [data-do="shadow"]'):pg.click('#bar [data-do="shadow"]')); await pg.waitForTimeout(300);
  ok(N+'Shadow turns on again',(await logo(pg)).shadow===true);
  await (touch?pg.tap('#bar [data-open="lanim"]'):pg.click('#bar [data-open="lanim"]')); await pg.waitForTimeout(300);
  await (touch?pg.tap('[data-chip="out"][data-v="fade"]'):pg.click('[data-chip="out"][data-v="fade"]')); await pg.waitForTimeout(400);
  ok(N+'Animation out: Fade',(await logo(pg)).out==='fade');
  await pg.evaluate(()=>VD.pause&&VD.pause());

  // the timeline block trims
  const tl=await pg.evaluate(()=>{ const b=document.querySelector('.vt-blk.vt-logo'); return b?{sel:b.classList.contains('sel'),handles:b.querySelectorAll('.vt-h').length}:null; });
  ok(N+'the selected logo block has two trim handles',tl&&tl.sel&&tl.handles===2,tl);

  // Delete + Undo toast
  await (touch?pg.tap('#bar [data-do="del"]'):pg.click('#bar [data-do="del"]')); await pg.waitForTimeout(400);
  ok(N+'Delete removes the logo and offers Undo',(await rec(pg)).logos.length===0&&await pg.evaluate(()=>{ const t=document.getElementById('vdToast'); return !!t&&!t.hidden&&/Undo/.test(t.textContent); }));
  await (touch?pg.tap('#vdToast [data-undo]'):pg.click('#vdToast [data-undo]')); await pg.waitForTimeout(400);
  ok(N+'Undo brings the logo back',(await rec(pg)).logos.length===1);

  // Add > Logo
  await pg.evaluate(()=>{ VD.select(null); VD.setT(12); }); await pg.waitForTimeout(400);
  await (touch?pg.tap('#bar [data-open="add"]'):pg.click('#bar [data-open="add"]')); await pg.waitForTimeout(300);
  ok(N+'Add has a Logo button',await pg.locator('[data-logos]').count()===1);
  await (touch?pg.tap('[data-logos]'):pg.click('[data-logos]')); await pg.waitForTimeout(300);
  const tiles=await pg.evaluate(()=>[...document.querySelectorAll('.vd-logo')].map(x=>({id:x.dataset.asset,bg:getComputedStyle(x.querySelector('.tile')).backgroundColor,img:x.querySelector('img').naturalWidth>0,h:x.getBoundingClientRect().height})));
  ok(N+'the sheet lists the brand logos, each on a grey tile, with its picture',tiles.length>=2&&tiles.some(t=>t.id==='nd26-logo-white')&&tiles.every(t=>t.bg==='rgb(128, 128, 128)'&&t.img&&t.h>=48),tiles);
  ok(N+'only logo assets are offered',tiles.every(t=>/logo/i.test(t.id)));
  await (touch?pg.tap('.vd-logo[data-asset="nd26-logo-white"]'):pg.click('.vd-logo[data-asset="nd26-logo-white"]')); await pg.waitForTimeout(700);
  r=await rec(pg); const l2=r.logos[1];
  ok(N+'a second logo is added from the playhead to the end, bottom left, w 280, fade in',r.logos.length===2&&near(l2.start,12,0.05)&&near(l2.end,29.73,0.05)&&l2.w===280&&l2.in==='fade'&&l2.out==='none'&&l2.shadow===true&&near(l2.x,188,2),l2);
  ok(N+'the new logo is selected',await pg.evaluate(id=>window.__video().sel&&window.__video().sel.id===id,l2&&l2.id));
  const h2=(await pg.evaluate(id=>VD.st.P.logoBox(id),l2.id)).h; ok(N+'its bottom edge is at y 1520',near(l2.y+h2/2,1520,2),[l2.y,h2]);

  // Swap the logo asset (keeps position and size)
  await (touch?pg.tap('#bar [data-open="lswap"]'):pg.click('#bar [data-open="lswap"]')); await pg.waitForTimeout(300);
  const other=await pg.evaluate(()=>{ const t=[...document.querySelectorAll('.vd-logo')].find(x=>x.getAttribute('aria-pressed')!=='true'); return t&&t.dataset.asset; });
  await (touch?pg.tap('.vd-logo[data-asset="'+other+'"]'):pg.click('.vd-logo[data-asset="'+other+'"]')); await pg.waitForTimeout(500);
  const l3=(await rec(pg)).logos[1]; ok(N+'Logo swaps the picture and keeps position and size',l3.asset===other&&l3.x===l2.x&&l3.y===l2.y&&l3.w===280,[l3.asset,other]);

  // a draft reload keeps the logos
  await pg.evaluate(()=>VD.hist.commit()); await pg.waitForTimeout(1500);
  const url=pg.url(), want=JSON.stringify((await rec(pg)).logos);
  ok(N+'the editor keeps a draft (?draft=)',/draft=/.test(url),url);
  await pg.goto(url); await ready(pg);
  const back=await rec(pg); ok(N+'reloading the draft keeps both logos and the url clip',JSON.stringify(back.logos)===want&&back.media.m1&&back.media.m1.url&&await pg.evaluate(()=>VD.missing().size===0),back.logos.length);
  ok(N+'no page errors',errs.length===0,errs.slice(0,3));
  await ctx.close();
}

/* an old recipe (no `logos`) still opens; a draft made before logos existed too */
{
  const {ctx,pg,errs}=await newPage({width:390,height:844},true);
  await pg.goto(BASE+'tools/video.html?new=1'); await ready(pg);
  const out=await pg.evaluate(async()=>{
    const r=StudioProject.fromRecipe({v:2,kind:'video',brand:'1stchoice',size:[1080,1920],fps:30,clips:[{id:'c1',kind:'reel',reel:'label-reveal',in:0,out:null,texts:{},mix:{},duck:true}],texts:[{id:'t1',value:'Hi',start:0,end:2,x:540,y:900,size:96,font:'display',color:'#fff',in:'none',out:'none'}],audio:[],media:{}});
    const old=StudioProject.fromRecipe({v:1,kind:'reel',brand:'1stchoice',reel:'label-reveal',texts:{},mix:{},duck:true});
    const key=Studio.lab.draftBase('1stchoice','video')+':old1'; Studio.lab.store(key,{video:{v:2,kind:'video',brand:'1stchoice',size:[1080,1920],fps:30,clips:[{id:'c1',kind:'reel',reel:'label-reveal',in:0,out:12,texts:{},mix:{},duck:true}],texts:[],audio:[],media:{}},name:'Old',at:Date.now(),design:null,pfx:key});
    return {logos:Array.isArray(r.logos)&&r.logos.length===0,v1:Array.isArray(old.logos)};
  });
  ok('an old recipe without logos gets an empty list',out.logos&&out.v1,out);
  await pg.goto(BASE+'tools/video.html?draft=old1'); await ready(pg);
  const st=await pg.evaluate(()=>({logos:window.__video().recipe.logos,n:window.__video().clips,err:window.__video().drawErr}));
  ok('a draft made before logos existed opens, with a logo list',Array.isArray(st.logos)&&st.logos.length===0&&st.n===1&&!st.err,st);
  /* the reel template sheet leaves out project templates */
  await pg.tap('#bar [data-open="add"]'); await pg.waitForTimeout(250); await pg.tap('[data-reels]'); await pg.waitForTimeout(800);
  const ids=await pg.evaluate(()=>[...document.querySelectorAll('[data-reel]')].map(x=>x.dataset.reel));
  ok('the Reel template sheet lists coded reels only (no project template)',ids.length>=2&&!ids.includes('nd-getting-ready'),ids);
  ok('no page errors (old recipe)',errs.length===0,errs.slice(0,3));
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); const bad=res.filter(x=>x.startsWith('FAIL')).length; console.log('\n'+(res.length-bad)+' passed, '+bad+' failed'); process.exit(bad?1:0);
