/* Video editor, the Good morning cat reel project template (brands/1stchoice/reels/good-morning, Studio 2.38.0):
   tools/video.html?reel=good-morning opens one clip (from its url), the Omani logo layer on the end card (drawn only there),
   two audio tracks from the brand kit (sounds + music, not "missing"), and the recipe's `master` loudness is used by the mix
   (integrated loudness near master.lufs, peaks under master.ceiling instead of the default -14 LUFS / -1.5 dBFS);
   muting the music track makes the mix change. Phone 390x844 (touch) and computer 1280x800.
   Needs the server on :8080 (npx http-server -p 8080 -c-1 .) or BASE=... Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const near=(a,c,t)=>Math.abs(a-c)<=(t||3);
const tpl=JSON.parse(fs.readFileSync(new URL('../brands/1stchoice/reels/good-morning/project.json',import.meta.url),'utf8'));

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

for(const [N,vp,touch] of [['phone: ',{width:390,height:844},true],['computer: ',{width:1280,height:800},false]]){
  const {ctx,pg,errs}=await newPage(vp,touch);
  await pg.goto(BASE+'tools/video.html?reel=good-morning'); await ready(pg);
  const r=await rec(pg);
  ok(N+'opens as a project: one video clip, the Omani logo, two audio tracks',r.v===2&&r.clips.length===1&&r.clips[0].kind==='video'&&r.logos.length===1&&r.logos[0].asset==='nd26-logo'&&r.audio.length===2,[r.clips.length,r.logos.length,r.audio.length]);
  ok(N+'the recipe keeps its loudness setting',r.master&&r.master.lufs===tpl.master.lufs&&r.master.ceiling===tpl.master.ceiling,r.master);
  const miss=await pg.evaluate(()=>({missing:[...VD.missing()],dur:VD.dur(),own:VD.hasOwnFiles()}));
  ok(N+'clip and both sounds load from the brand kit (nothing missing), 12.5 s',miss.missing.length===0&&near(miss.dur,12.47,0.1)&&!miss.own,miss);
  ok(N+'the timeline shows the logo block and both sound blocks',await pg.locator('.vt-blk.vt-logo').count()===1&&await pg.locator('.vt-blk.vt-aud, .vt-blk.vt-audio').count()>=2,
     [await pg.locator('.vt-blk.vt-logo').count(),await pg.locator('.vt-blk.vt-aud, .vt-blk.vt-audio').count()]);

  // the logo is drawn on the end card (12.2 s) and not before it (9 s)
  const dr=await pg.evaluate(async()=>{ const P=VD.st.P, W=540, diff=async t=>{ const c1=document.createElement('canvas'), c2=document.createElement('canvas'); c1.width=c2.width=W; c1.height=c2.height=960;
      await P.prepare(t); P.draw(c1.getContext('2d'),t,{}); P.draw(c2.getContext('2d'),t,{hideLogo:'l1'});
      const a=c1.getContext('2d').getImageData(0,0,W,960).data, d=c2.getContext('2d').getImageData(0,0,W,960).data; let n=0;
      for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-d[i])+Math.abs(a[i+1]-d[i+1])+Math.abs(a[i+2]-d[i+2])>30) n++; return n; };
    return {end:await diff(12.2),before:await diff(9)}; });
  ok(N+'the logo shows on the end card only',dr.end>800&&dr.before===0,dr);

  // the mix uses the template's loudness, not the default -14 LUFS / -1.5 dBFS
  const m=await pg.evaluate(async()=>{ const a=await VD.st.P.audio(); return {lufs:a.lufs,peak:a.peakDb,n:a.L.length}; });
  ok(N+'the mix is levelled to the template loudness',near(m.lufs,tpl.master.lufs,1.2)&&m.peak<=tpl.master.ceiling+0.3,m);
  const m2=await pg.evaluate(async()=>{ const R=VD.st.R, a=R.audio.find(x=>/music/i.test((R.media[x.media]||{}).name||'')); a.mute=true; await VD.st.P.update();
    const s=await VD.st.P.audio(); a.mute=false; await VD.st.P.update(); return {lufs:s.lufs,found:!!a}; });
  ok(N+'muting the music track changes the mix (sounds stay)',m2.found&&isFinite(m2.lufs)&&Math.abs(m2.lufs-m.lufs)>0.05,m2);
  ok(N+'no page errors',errs.length===0,errs.slice(0,3));
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); const bad=res.filter(x=>x.startsWith('FAIL')).length; console.log('\n'+(res.length-bad)+' passed, '+bad+' failed'); process.exit(bad?1:0);
