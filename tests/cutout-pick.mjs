/* Background remover: pick the ground colour (2.12.0). Engine: with picked colours (and tapped seeds) the alpha error against the drawn
   ground truth drops clearly below the automatic result on cases where the border estimate is wrong (a frame around the ground, a
   three-colour ground, a see-through hole the engine keeps as design); no pick stays automatic. UI: Team assets add flow at 390x844
   touch (real remover, fake cloud): Pick the background -> tap the preview -> swatch -> result changes -> x removes -> Reset, light + dark.
   Run: server on :8080 (BASE=...), node tests/cutout-pick.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'/tmp/pick-shots'; fs.mkdirSync(SHOTS,{recursive:true});
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ const r=(c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i).slice(0,300):''); res.push(r); if(process.env.LIVE) console.log(r); };
const b=await chromium.launch(), errs=[];
const watch=pg=>{ pg.on('pageerror',e=>errs.push(String(e))); pg.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource|fonts\.g|status of 404|ERR_/.test(m.text())) errs.push(m.text()); }); };

/* ---- engine ---- */
{ const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true}), pg=await ctx.newPage(); watch(pg);
  await pg.goto(BASE+'lab/cutout-pro-test.html');
  const err=(name,pick)=>pg.evaluate(async([name,pick])=>{
    const c=await CutoutCases.make(name), run=async o=>{ const out=await StudioCutoutPro.run(c.img,Object.assign({mode:'logo'},o||{})), W=out.width,H=out.height,rd=out.getContext('2d').getImageData(0,0,W,H).data,td=c.truth.getContext('2d').getImageData(0,0,W,H).data; let e=0; for(let i=0;i<W*H;i++) e+=Math.abs(rd[i*4+3]-td[i*4+3])/255; return e/(W*H); };
    const t0=performance.now(), auto=await run(), picked=await run(pick||c.spec.pick), ms=Math.round(performance.now()-t0), again=await run();
    return {auto,picked,again,ms,pick:pick||c.spec.pick}; },[name,pick]);
  const R={};
  for(const n of ['framed','threeTone','plug']){ const r=R[n]=await err(n); ok(n+': picking drops the alpha error from '+r.auto.toFixed(4)+' to '+r.picked.toFixed(4),r.picked<=.02&&r.picked<r.auto*.4,r); ok(n+': automatic result is repeatable (same error twice)',r.auto===r.again,r); }
  ok('plug: seeds on the see-through holes clear them (automatic keeps them)',await pg.evaluate(async()=>{ const c=await CutoutCases.make('plug'),p=c.spec.pick,f=async o=>{ const out=await StudioCutoutPro.run(c.img,Object.assign({mode:'logo'},o)); return out.getContext('2d').getImageData(500,320,1,1).data[3]; }; return [await f({}),await f({ground:p.ground}),await f({ground:p.ground,seeds:p.seeds})]; }).then(a=>a[0]>200&&a[2]<10,'x'));
  ok('a single triple works as ground (not only an array of triples)',await pg.evaluate(async()=>{ const c=await CutoutCases.make('wordmark'),out=await StudioCutoutPro.run(c.img,{mode:'logo',ground:[255,255,255]}),d=out.getContext('2d').getImageData(0,0,1,1).data; return d[3]===0; }));
  ok('ground given with mode auto runs logo mode (no model)',await pg.evaluate(async()=>{ const c=await CutoutCases.make('wordmark'),out=await StudioCutoutPro.run(c.img,{ground:[[255,255,255]]}); return out.getContext('2d').getImageData(500,320,1,1).data[3]>0&&out.getContext('2d').getImageData(2,2,1,1).data[3]===0; }));
  ok('picking is instant image maths (<3 s for 3 runs of a 1000x640 case: '+R.framed.ms+' ms)',R.framed.ms<3000,R.framed);
  ok('a nonsense ground ([], NaN) falls back to automatic',await pg.evaluate(async()=>{ const c=await CutoutCases.make('wordmark'),a=await StudioCutoutPro.run(c.img,{mode:'logo'}),b2=await StudioCutoutPro.run(c.img,{mode:'logo',ground:[]}),c2=await StudioCutoutPro.run(c.img,{mode:'logo',ground:[[NaN,1,2]]}),g=x=>x.getContext('2d').getImageData(0,0,a.width,a.height).data; const A=g(a),B=g(b2),C=g(c2); for(let i=0;i<A.length;i++) if(A[i]!==B[i]||A[i]!==C[i]) return false; return true; }));
  await ctx.close(); }

/* ---- UI ---- */
const makePng=(p,w,h,draw)=>p.evaluate(([w,h,draw])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); new Function('x','w','h',draw)(x,w,h); return c.toDataURL('image/png').split(',')[1]; },[w,h,draw]);
/* a teal frame around a cream ground with a green block: the automatic border estimate takes the frame for the ground */
const DRAW='x.fillStyle="#efe8d8";x.fillRect(0,0,w,h);x.strokeStyle="#2f8f8a";x.lineWidth=60;x.strokeRect(30,30,w-60,h-60);x.fillStyle="#c8321e";x.beginPath();x.roundRect(w*.3,h*.3,w*.4,h*.4,30);x.fill();';
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','seen'); }catch(_){} });
  const pg=await ctx.newPage(); watch(pg);
  await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
  fs.mkdirSync('/tmp/rp',{recursive:true}); const f='/tmp/rp/frame-'+scheme+'.png'; fs.writeFileSync(f,Buffer.from(await makePng(pg,600,400,DRAW),'base64'));
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await pg.waitForTimeout(700);
  await pg.setInputFiles('#pick',[new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname]); await pg.waitForTimeout(800);
  await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(300); await pg.tap('#addAsset'); await pg.waitForSelector('#assetTeam [data-team-browse]',{timeout:8000});
  await pg.tap('#assetTeam [data-team-browse]'); await pg.waitForSelector('.ta-dlg [data-add]',{timeout:8000});
  await pg.setInputFiles('#taFile',[f]); await pg.waitForSelector('#taNext:not([disabled])',{timeout:20000});
  const T=scheme+': ';
  const opaque=async()=>pg.evaluate(()=>{ const c=document.querySelector('#taPrev'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let o=0; for(let i=3;i<d.length;i+=4) if(d[i]>200) o++; return {o,n:c.width*c.height,w:c.width,h:c.height}; });
  await pg.tap('[data-mode="logo"]'); await pg.waitForSelector('#taNext:not([disabled])'); await pg.waitForTimeout(200);
  const a0=await opaque();
  ok(T+'a "Pick the background" link with a pipette sits in the Logo options, tap target >= 44px',await pg.evaluate(()=>{ const t=document.querySelector('#taPick'); if(!t) return false; const r=t.getBoundingClientRect(); return t.classList.contains('link')&&r.height>=44&&!!t.querySelector('svg')&&t.getAttribute('aria-pressed')==='false'; }));
  ok(T+'no swatches and no Reset before picking',await pg.locator('#taSw .ta-swatch').count()===0&&await pg.locator('#taPickReset').count()===0);
  await pg.screenshot({path:SHOTS+'/01-before-'+scheme+'.png'});
  await pg.tap('#taPick'); await pg.waitForTimeout(200);
  ok(T+'the toggle is on, a hint says to tap the picture, the preview shows a crosshair cursor',await pg.getAttribute('#taPick','aria-pressed')==='true'&&/Tap/.test(await pg.textContent('#taPickHint'))&&await pg.getAttribute('.ta-stage','data-picking')==='1');
  /* tap on the cream ground inside the frame (about 12% in from the left, mid height) */
  const tapAt=async(fx,fy)=>{ const r=await pg.evaluate(()=>{ const c=document.querySelector('#taPrev').getBoundingClientRect(); return {x:c.x,y:c.y,w:c.width,h:c.height}; }); await pg.touchscreen.tap(r.x+r.w*fx,r.y+r.h*fy); };
  await tapAt(.2,.5); await pg.waitForSelector('#taSw .ta-swatch'); await pg.waitForSelector('#taNext:not([disabled])'); await pg.waitForTimeout(250);
  const a1=await opaque();
  ok(T+'tapping adds one swatch of the tapped colour',await pg.locator('#taSw .ta-swatch').count()===1&&/rgb\(2(3[89]|4\d), ?2(2\d|3\d), ?(2[01]\d)\)/.test(await pg.evaluate(()=>getComputedStyle(document.querySelector('#taSw .ta-swatch i')).backgroundColor)));
  ok(T+'the result changes at once: the cream ground is gone ('+Math.round(a0.o/a0.n*100)+'% -> '+Math.round(a1.o/a1.n*100)+'% of the picture is opaque)',a1.o/a1.n<a0.o/a0.n*.8&&a1.o/a1.n<.7,{a0,a1});
  ok(T+'swatch remove button and Reset are touch sized',await pg.evaluate(()=>[...document.querySelectorAll('#taSw .ta-swatch button,#taPickReset')].every(e=>{ const r=e.getBoundingClientRect(); return r.width>=44&&r.height>=44; })));
  await pg.screenshot({path:SHOTS+'/02-picked-'+scheme+'.png'});
  await tapAt(.5,.5); await pg.waitForTimeout(300); await pg.waitForSelector('#taNext:not([disabled])');
  ok(T+'a second tap adds a second swatch (max 3)',await pg.locator('#taSw .ta-swatch').count()===2);
  await tapAt(.15,.15); await pg.waitForTimeout(250); await tapAt(.8,.8); await pg.waitForTimeout(250); await pg.waitForSelector('#taNext:not([disabled])');
  ok(T+'a fourth colour is not added, the hint says the limit',await pg.locator('#taSw .ta-swatch').count()===3&&/3/.test(await pg.textContent('#taPickHint')));
  await pg.tap('#taSw .ta-swatch button >> nth=2'); await pg.waitForTimeout(300); await pg.waitForSelector('#taNext:not([disabled])');
  ok(T+'x removes that colour only',await pg.locator('#taSw .ta-swatch').count()===2);
  await pg.tap('#taPickReset'); await pg.waitForTimeout(300); await pg.waitForSelector('#taNext:not([disabled])'); await pg.waitForTimeout(200);
  const a2=await opaque();
  ok(T+'Reset clears the swatches, leaves pick mode and returns to the automatic result',await pg.locator('#taSw .ta-swatch').count()===0&&await pg.locator('#taPickReset').count()===0&&await pg.getAttribute('#taPick','aria-pressed')==='false'&&Math.abs(a2.o/a2.n-a0.o/a0.n)<=.02,{a0,a2});
  await pg.tap('#taPick'); await tapAt(.2,.5); await pg.waitForSelector('#taNext:not([disabled])'); await pg.waitForTimeout(250);
  await pg.tap('[data-mode="keep"]'); await pg.waitForTimeout(200); await pg.tap('[data-mode="logo"]'); await pg.waitForSelector('#taNext:not([disabled])'); await pg.waitForTimeout(250);
  ok(T+'switching mode drops the picks (back to automatic)',await pg.locator('#taSw .ta-swatch').count()===0);
  await pg.tap('#taPick'); await tapAt(.2,.5); await pg.waitForSelector('#taNext:not([disabled])'); await pg.waitForTimeout(250);
  await pg.tap('#taPick'); await pg.waitForTimeout(300); await pg.waitForSelector('#taNext:not([disabled])');
  const a3=await opaque();
  ok(T+'turning pick mode off keeps the picks, and the preview is trimmed to the logo again',await pg.locator('#taSw .ta-swatch').count()===1&&a3.w<=a1.w&&a3.o>0,{a1,a3});
  await pg.tap('#taNext'); await pg.waitForSelector('#taAN');
  ok(T+'Next carries the picked result to the details step',await pg.evaluate(()=>{ const c=document.querySelector('#taThumb'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let t=0; for(let i=3;i<d.length;i+=4) if(d[i]<10) t++; return t>c.width*c.height*.05; }));
  ok(T+'no page errors',errs.length===0,errs);
  await ctx.close();
}
await b.close();
const fails=res.filter(r=>r.startsWith('FAIL')); console.log(res.join('\n')); console.log('\n'+(res.length-fails.length)+' passed, '+fails.length+' failed'); process.exit(fails.length?1:0);
