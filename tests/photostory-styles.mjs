/* Photo story styles + options (tools/photo-story.js), phone size (390x844, touch).
   1. The four old looks (Full photo, White / Cream / Black frame) with default values draw exactly what the previous
      photo-story.js drew (a pixel hash of the preview, a few word places and a long headline included).
   2. Whole photo, Caption, Poster and Arch draw without errors and are not blank.
   3. Whole photo shows the photo whole (contain); Caption hides the Text place field.
   4. Arch: the photo can still be dragged (pan changes after adding a real photo).
   5. Headline size, Shade, Words colour and Show the logo change the picture; logo off takes the logo layer away.
   6. Words and logo stay inside the story's safe zone (y 250 to 1620) for every style, at all three headline sizes.
   7. Save makes the full-size PNG (2160x3840).
   8. No page errors.
   Run: npx http-server -p 8080 -c-1 .   then   node tests/photostory-styles.mjs   (or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname;
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const SHOTS=process.env.SHOTS||'';   // optional folder: also keep a screenshot of every style there
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=async d=>{ const p=await d.path(); const x=fs.readFileSync(p); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const t0=Date.now(), b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

/* the file as it was before the new looks: the newest commit of it that has no "whole" look (HEAD, until this change is committed) */
const git=(...a)=>execFileSync('git',['-C',ROOT,...a],{encoding:'utf8',maxBuffer:1<<24});
let OLD=''; for(const c of git('log','--format=%H','--','tools/photo-story.js').split('\n').filter(Boolean)){ const t=git('show',c+':tools/photo-story.js'); if(!/id:'whole'/.test(t)){ OLD=t; break; } }
if(!OLD) OLD=git('show','HEAD:tools/photo-story.js');

const NEW=['whole','caption','poster','arch'], ALL=['full','white','cream','black',...NEW];
const newCtx=async(old)=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(old) await ctx.route('**/tools/photo-story.js',r=>r.fulfill({contentType:'application/javascript',body:OLD}));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push((old?'old: ':'')+e.message));
  await pg.goto(BASE+'tools/photo-story.html'); await pg.evaluate(()=>localStorage.clear()); await pg.goto(BASE+'tools/photo-story.html');
  await pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.reg().length>3,null,{timeout:20000}); await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(900);
  return {ctx,pg};
};
/* set style + values, draw, and read the preview: a hash of every pixel (plus how many different colours a sample shows) */
const look=(pg,style,values,hash=true)=>pg.evaluate(async([s,v,hash])=>{
  const D=Studio.debug.S; D.style=s; Object.entries(v||{}).forEach(([k,x])=>{ D.values[k]=x; }); Studio.debug.render();
  await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  if(!hash) return null;
  const c=document.getElementById('view'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data, u=new Uint32Array(d.buffer); let hh=2166136261>>>0; const seen=new Set();
  for(let i=0;i<u.length;i++){ hh=Math.imul(hh^u[i],16777619)>>>0; if(i%997===0) seen.add(u[i]); }
  return {hash:hh,colours:seen.size}; },[style,values||{},hash]);
const own=txt=>({pick:'__own',own:txt}), NONE={pick:'__none',own:''};

/* ---------- 1. the old looks are unchanged ---------- */
{
  const a=await newCtx(false), o=await newCtx(true);
  const cases=[...['full','white','cream','black'].map(s=>[s,{}]),
    ['full',{pos:'top-start'}],['full',{pos:'middle-center'}],['full',{pos:'bottom-end'}],['full',{pos:'bottom-center'}],['full',{pos:'top'}],
    ['white',{pos:'top-end'}],['cream',{small:NONE}],['black',{small:NONE,pos:'bottom-center'}],['white',{head:own('وفرنا كمية جديدة')}],['cream',{bg:'#7A563A'}]];
  let same=0; const bad=[];
  for(const [s,v] of cases){
    const x=await look(a.pg,s,v), y=await look(o.pg,s,v);
    if(x.hash===y.hash&&x.colours>20) same++; else bad.push(s+JSON.stringify(v)+' '+x.hash+'/'+y.hash);
    /* back to the defaults before the next case, in both pages */
    for(const p of [a.pg,o.pg]) await p.evaluate(()=>{ const D=Studio.debug.S; ['pos','small','head','bg'].forEach(k=>{ const was={pos:'bottom-start',small:{pick:'خذلك كولد برو',own:''},head:{pick:'يسرسح ثلج',own:''},bg:null}[k]; if(k in D.values) D.values[k]=was; }); });
  }
  const nOld=await o.pg.evaluate(()=>document.querySelectorAll('#styles [data-style]').length), nNew=await a.pg.evaluate(()=>document.querySelectorAll('#styles [data-style]').length);
  ok('the comparison page runs the previous file (4 looks) next to the new one (8 looks)',nOld===4&&nNew===8,{old:nOld,new:nNew});
  ok('old looks (Full photo, White / Cream / Black frame) draw the same as before, defaults and word places',same===cases.length,bad.length?bad.join(' | '):same+' of '+cases.length);
  await a.ctx.close(); await o.ctx.close();
}

/* ---------- 2 to 6. the new looks, on the sample photo ---------- */
const {ctx,pg}=await newCtx(false);
const dl=[]; pg.on('download',d=>dl.push(d));
const sheet=async n=>{ if(!await pg.evaluate(n=>document.getElementById('sh-'+n).classList.contains('open'),n)){ await pg.tap(`#bar [data-open="${n}"]`); await pg.waitForTimeout(350); } };
const pickStyle=async s=>{ await sheet('style'); await pg.tap(`#styles [data-style="${s}"]`); await pg.waitForTimeout(500); };
const reg=()=>pg.evaluate(()=>Studio.debug.reg().map(r=>({id:r.id,kind:r.kind,photo:r.photo,mode:r.mode,x:r.x,y:r.y,w:r.w,h:r.h,hidden:!!r.hidden,empty:!!r.empty})));
const shot=async s=>{ if(!SHOTS) return; fs.mkdirSync(SHOTS,{recursive:true}); const d=await pg.evaluate(()=>document.getElementById('view').toDataURL('image/png').split(',')[1]); fs.writeFileSync(SHOTS+'/'+s+'.png',Buffer.from(d,'base64')); };

/* 2. each new look draws, and the canvas is not blank */
{
  const out={}; let all=true;
  for(const s of NEW){ const l=await look(pg,s,{}); out[s]=l.colours; if(l.colours<20) all=false; await shot('sample-'+s); }
  ok('Whole photo, Caption, Poster and Arch each draw something (not blank)',all,out);
}

/* 3. Whole photo is contain; Caption hides the Text place field (through the Style sheet) */
{
  await pickStyle('whole');
  const w=(await reg()).find(r=>r.photo===0);
  ok('Whole photo: the photo box is "contain" (never cropped), inside the story',!!w&&w.mode==='contain'&&w.x>=0&&w.x+w.w<=1080&&w.w>400,w&&{mode:w.mode,w:Math.round(w.w),h:Math.round(w.h)});
  const vis=async()=>pg.evaluate(()=>{ const f=id=>{ const e=document.querySelector(`#sh-style [data-fw="${id}"]`); return !!e&&!e.hidden; }; return {pos:f('pos'),fade:f('fade'),bg:f('bg'),hsize:f('hsize'),tcol:f('tcol'),logo:f('logo')}; });
  const vw=await vis(); await pickStyle('caption'); const vc=await vis(); await pickStyle('full'); const vf=await vis(); await pickStyle('white'); const vwh=await vis();
  ok('Caption hides Text place and Shade; Whole photo and Full photo show them',!vc.pos&&!vc.fade&&vw.pos&&vw.fade&&vf.pos&&vf.fade,{caption:vc,whole:vw});
  ok('Frame colour shows for White frame and Caption, not for Full photo or Whole photo',vwh.bg&&vc.bg&&!vf.bg&&!vw.bg,{white:vwh.bg,caption:vc.bg,full:vf.bg,whole:vw.bg});
  const nVis=async s=>{ await pickStyle(s); return Object.values(await vis()).filter(Boolean).length; };
  const counts={}; for(const s of ALL) counts[s]=await nVis(s);
  ok('the Style sheet stays short: at most 6 options on any look',Math.max(...Object.values(counts))<=6,counts);
  await pg.tap('#sh-style .done'); await pg.waitForTimeout(350);
}

/* 5. the options change the picture (every look that has them), and Show the logo takes the logo layer away */
{
  const miss=[];
  for(const s of ALL){
    const base=await look(pg,s,{hsize:'m',fade:100,tcol:null,logo:true});
    const v=[['hsize','l'],['hsize','s'],['tcol','#D6B078'],['logo',false]]; if(['full','white','cream','black','whole'].includes(s)) v.push(['fade',30]);
    for(const [k,x] of v){ const l=await look(pg,s,{[k]:x}); if(l.hash===base.hash) miss.push(s+':'+k+'='+x); await look(pg,s,{hsize:'m',fade:100,tcol:null,logo:true},false); }
  }
  ok('Headline size, Shade, Words colour and Show the logo each change the picture on every look that has them',!miss.length,miss.join(', '));
  const gone=[], back=[];
  for(const s of ALL){
    await look(pg,s,{logo:false},false); const off=(await reg()).some(r=>r.id==='logo'&&!r.hidden&&!r.empty);
    await look(pg,s,{logo:true},false); const on=(await reg()).some(r=>r.id==='logo'&&!r.hidden&&!r.empty);
    if(off) gone.push(s); if(!on) back.push(s);
  }
  ok('Show the logo off removes the logo layer, on brings it back (every look)',!gone.length&&!back.length,{stillThere:gone,missing:back});
  /* the same through the real controls on Full photo: Large, Shade, a colour, no logo */
  await pickStyle('full'); const before=await look(pg,'full',{});
  await pg.tap('#sh-style [data-seg="hsize"] [data-v="l"]'); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{ const r=document.querySelector('[data-range="fade"]'); r.value=40; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await pg.tap('#sh-style [data-pal="f:tcol"] .sw-btn[data-c="#D6B078"]'); await pg.waitForTimeout(300);
  await pg.locator('#sh-style [data-toggle="logo"]').uncheck({force:true}); await pg.waitForTimeout(450);
  const st=await pg.evaluate(()=>({...Studio.debug.S.values,style:Studio.debug.S.style})), after=await look(pg,'full',{});
  ok('the Style sheet controls set Headline size, Shade, Words colour and the logo',st.hsize==='l'&&st.fade===40&&String(st.tcol).toUpperCase()==='#D6B078'&&st.logo===false&&after.hash!==before.hash,{hsize:st.hsize,fade:st.fade,tcol:st.tcol,logo:st.logo});
  await pg.tap('#sh-style .done').catch(()=>{}); await pg.waitForTimeout(300);
  await look(pg,'full',{hsize:'m',fade:100,tcol:null,logo:true});
}

/* 6. words and logo stay inside the story's safe zone: y 250 to 1620 */
{
  const bad=[];
  for(const head of [null,'وفرنا كمية جديدة'])
    for(const hs of ['s','m','l']) for(const s of ALL){
      await look(pg,s,{hsize:hs,logo:true,tcol:null,fade:100,head:head?own(head):{pick:'يسرسح ثلج',own:''}},false);
      for(const r of await reg()) if((r.kind==='text'||r.kind==='logo')&&!r.hidden&&!r.empty&&(r.y<250||r.y+r.h>1620)) bad.push(`${s}/${hs}/${r.id} ${Math.round(r.y)}..${Math.round(r.y+r.h)}`);
    }
  /* word places on the photo looks, too */
  for(const pos of ['top-start','top-center','top-end','middle-center','bottom-center','bottom-end']) for(const s of ['full','white','whole']){
    await look(pg,s,{pos,hsize:'l'},false);
    for(const r of await reg()) if((r.kind==='text'||r.kind==='logo')&&!r.hidden&&!r.empty&&(r.y<250||r.y+r.h>1620)) bad.push(`${s}/${pos}/${r.id} ${Math.round(r.y)}..${Math.round(r.y+r.h)}`);
  }
  ok('words and logo stay inside y 250 to 1620 for every look, every headline size and word place',!bad.length,bad.slice(0,8).join(', '));
  await look(pg,'full',{pos:'bottom-start',hsize:'m',head:{pick:'يسرسح ثلج',own:''}});
}

/* 4. Arch, Poster, Caption: the photo still pans after a real photo is added */
{
  await pg.setInputFiles('#slots input[data-file="0"]',S+'pair.jpg'); await pg.waitForTimeout(1800);
  const real=await pg.evaluate(()=>Studio.debug.S.photos.filter(p=>p.img&&!p.sample).length);
  const panned={};
  for(const s of ['arch','poster','caption']){
    await look(pg,s,{});
    await pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; p.ox=0; p.oy=0; p.zoom=1.4; Studio.debug.render(); }); await pg.waitForTimeout(300);
    const box=(await reg()).find(r=>r.photo===0), vr=await pg.locator('#view').boundingBox(), k=vr.width/1080;
    const cx=vr.x+(box.x+box.w/2)*k, cy=vr.y+(box.y+box.h*.55)*k;
    await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx-45*k*1.5,cy-30*k*1.5,{steps:8}); await pg.mouse.up(); await pg.waitForTimeout(350);
    panned[s]=await pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; return {ox:Math.round(p.ox),oy:Math.round(p.oy)}; });
  }
  ok('a real photo is in',real===1,real);
  ok('Arch: dragging the photo pans it (ox / oy change)',panned.arch.ox!==0||panned.arch.oy!==0,panned.arch);
  ok('Poster and Caption: dragging the photo pans it too',(panned.poster.ox!==0||panned.poster.oy!==0)&&(panned.caption.ox!==0||panned.caption.oy!==0),panned);
  for(const s of ALL){ await pg.evaluate(()=>{ const p=Studio.debug.S.photos[0]; p.ox=0; p.oy=0; p.zoom=1; }); await look(pg,s,{}); await shot('pair-'+s); }
}

/* 7. Save: the bar's Save (then the Save sheet's Save) makes the full-size PNG */
{
  await look(pg,'whole',{}); await pg.tap('#barSave');
  await pg.waitForSelector('#sh-save.open',{timeout:5000}).catch(()=>{});
  const sheetOpen=await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'));
  if(sheetOpen) await pg.tap('#save');
  for(let i=0;i<60&&!dl.length;i++) await pg.waitForTimeout(300);
  const png=dl[0]?await pngSize(dl[0]):'';
  if(dl[0]&&SHOTS) fs.copyFileSync(await dl[0].path(),SHOTS+'/saved-whole.png');
  ok('Save makes the full-size PNG (2160x3840) on Whole photo',png==='2160x3840',{sheetOpen,png});
}
await ctx.close(); await b.close();

/* 8 */
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); console.log(`photostory-styles: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);
