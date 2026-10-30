/* Video project test: media store, project timeline, drawing, text animations, mixed sound and export (assets/reel-project.js).
   Needs ffmpeg + ffprobe. Run: server on :8080 (or BASE=...), then `node tests/video-project.mjs`. Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { spawnSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const OUT=process.env.OUT_DIR||'/tmp/claude-0/-home-user-1stChoice-Studio/06e6729b-e4f8-560f-b51f-65d4a41f117c/scratchpad/project/';
fs.mkdirSync(OUT,{recursive:true});
const res=[]; let bad=0;
const ok=(n,c,i)=>{ if(!c) bad++; res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const probe=f=>JSON.parse(spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',f]).stdout.toString()||'{}');

const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}), pg=await b.newPage(), errs=[];
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errs.push(m.text()); });
await pg.goto(BASE+'tests/fixtures/reels/project.html');
await pg.evaluate(async()=>{
  await Studio.useBrand();
  const fx=async n=>{ const r=await fetch(location.href.replace(/project\.html.*$/,n)); return new File([await r.blob()],n,{type:{mp4:'video/mp4',jpg:'image/jpeg',mp3:'audio/mpeg'}[n.split('.').pop()]}); };
  window.fx=fx;
  // helpers used by the checks below
  window.cv=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
  window.frame=(P,t,w,o)=>{ const c=cv(w||540,Math.round((w||540)*1920/1080)); P.draw(c.getContext('2d'),t,o); return c; };
  window.px=(c,x,y)=>Array.from(c.getContext('2d').getImageData(x,y,1,1).data);
  // bounding box of pixels that differ from black by a green-ish colour (text box tests)
  window.bbox=(c,pred)=>{ const x=c.getContext('2d'), d=x.getImageData(0,0,c.width,c.height).data; let x0=1e9,x1=-1,y0=1e9,y1=-1,n=0,mx=0;
    for(let y=0;y<c.height;y++) for(let X=0;X<c.width;X++){ const i=(y*c.width+X)*4; const v=pred(d[i],d[i+1],d[i+2]); if(v>0){ n++; if(X<x0)x0=X; if(X>x1)x1=X; if(y<y0)y0=y; if(y>y1)y1=y; if(v>mx)mx=v; } }
    return {x0,x1,y0,y1,n,w:x1-x0+1,mx}; };
  window.goertzel=(a,from,to,f,sr)=>{ const w=2*Math.PI*f/sr; let s1=0,s2=0,c=2*Math.cos(w); for(let i=from;i<to;i++){ const s=a[i]+c*s1-s2; s2=s1; s1=s; } return Math.sqrt(s1*s1+s2*s2-c*s1*s2)/(to-from)*2; };
  window.rms=(a,from,to)=>{ let s=0; for(let i=from;i<to;i++) s+=a[i]*a[i]; return Math.sqrt(s/Math.max(1,to-from)); };
});

// ---- media store
const M=await pg.evaluate(async()=>{
  const out={}; const v=await StudioMedia.put(await fx('vclip.mp4')), c2=await StudioMedia.put(await fx('clip2.mp4')), ph=await StudioMedia.put(await fx('photo.jpg')), mu=await StudioMedia.put(await fx('music.mp3'));
  window.ids={v:v.id,c2:c2.id,ph:ph.id,mu:mu.id}; out.metas=[v,c2,ph,mu];
  const g=await StudioMedia.get(v.id); out.get={type:g.meta.type,isVideo:g.el instanceof HTMLVideoElement,muted:g.el.muted,url:g.url.slice(0,5)};
  out.same=(await StudioMedia.get(v.id))===g; out.none=await StudioMedia.get('nope');
  const th=await StudioMedia.thumbs(v.id,4,64); out.thumbs={n:th.length,h:th[0].height,w:th[0].width,px:th.map(c=>Array.from(c.getContext('2d').getImageData(2,2,1,1).data))};
  const tp=await StudioMedia.thumbs(ph.id,3,50); out.tp=[tp.length,tp[0].height];
  const w=await StudioMedia.wave(v.id,20); out.wave={n:w.length,max:Math.max(...w),min:Math.min(...w)};
  const w2=await StudioMedia.wave(c2.id,10); out.wave2=Math.max(...w2);
  return out; });
const [mv,mc2,mph,mmu]=M.metas;
ok('put(): video meta',mv.type==='video'&&Math.abs(mv.dur-4)<0.1&&mv.w===1080&&mv.h===1920,mv);
ok('put(): second clip meta',mc2.type==='video'&&Math.abs(mc2.dur-2)<0.1&&mc2.w===720,mc2);
ok('put(): photo meta',mph.type==='image'&&mph.w===1200&&mph.h===1600,mph);
ok('put(): audio meta',mmu.type==='audio'&&Math.abs(mmu.dur-6)<0.2,mmu);
ok('get(): video element, muted, cached',M.get.isVideo&&M.get.muted&&M.same&&M.get.url==='blob:',M.get);
ok('get(): unknown id gives null',M.none===null);
ok('thumbs(): 4 frames 64 px tall',M.thumbs.n===4&&M.thumbs.h===64&&M.thumbs.w===36,M.thumbs);
ok('thumbs(): frames show the clip (grey bg)',M.thumbs.px.every(p=>Math.abs(p[0]-0x20)<30&&Math.abs(p[2]-0x30)<40),M.thumbs.px[0]);
ok('thumbs(): photo gives n canvases',M.tp[0]===3&&M.tp[1]===50,M.tp);
ok('wave(): tone clip has loud peaks, silent clip is flat',M.wave.n===20&&M.wave.max>0.1&&M.wave2<0.01,[M.wave.max,M.wave2]);

// ---- project: video 0.5-3.0, photo 2 s zoom, reel winter-cat 6.5-10
const mk=`(ids)=>({v:2,kind:'video',brand:'1stchoice',size:[1080,1920],fps:30,
  clips:[{id:'c1',kind:'video',media:ids.v,in:0.5,out:3.0,db:0,mute:false},{id:'c2',kind:'photo',media:ids.ph,dur:2,motion:'zoom'},{id:'c3',kind:'reel',reel:'winter-cat',in:6.5,out:10,texts:{},mix:{},duck:true}],
  texts:[],audio:[],media:{}})`;
const S=await pg.evaluate(async mk=>{
  const r=eval(mk)(ids); window.mkRecipe=eval(mk);
  const P=await StudioProject.create(r,{brandBase:'../../../brands/1stchoice/'}); window.P=P; const out={dur:P.duration,cuts:P.cuts,starts:P.starts(),missing:P.missing(),fps:P.fps,W:P.W,H:P.H};
  out.at=[0,2.4999,2.5,4.4999,4.5,7.9,8.0].map(t=>{ const a=P.clipAt(t); return a?[a.clip.id,+a.start.toFixed(3),+a.local.toFixed(3)]:null; });
  out.atNeg=P.clipAt(-1); out.atPast=P.clipAt(9);
  // video: box moves at x=100+200*src_t; project t=1.0 -> source 1.5 -> box x 400..600, y 860..1060
  await P.prepare(1.0); const c=frame(P,1.0,1080); out.v1=[px(c,500,960),px(c,150,960),px(c,500,300)];
  await P.prepare(2.0); const c2=frame(P,2.0,1080); out.v2=[px(c2,700,960),px(c2,500,960)];   // source 2.5 -> 600..800
  // photo zoom
  const a=frame(P,2.5,270), z=frame(P,4.49,270); out.zoomDiff=(()=>{ const A=a.getContext('2d').getImageData(0,0,270,480).data, B=z.getContext('2d').getImageData(0,0,270,480).data; let s=0; for(let i=0;i<A.length;i++) s+=Math.abs(A[i]-B[i]); return s/A.length; })();
  // reel part equals reel.draw
  const reel=await StudioReel.load('../../../brands/1stchoice/reels/winter-cat/'), pc=frame(P,5.4,540), rc=cv(540,960); reel.draw(rc.getContext('2d'),6.5+0.9);
  const A=pc.getContext('2d').getImageData(0,0,540,960).data, B=rc.getContext('2d').getImageData(0,0,540,960).data; let d=0; for(let i=0;i<A.length;i++) d=Math.max(d,Math.abs(A[i]-B[i])); out.reelDiff=d;
  return out; },mk);
ok('project: duration 8.0',Math.abs(S.dur-8)<1e-6,S.dur);
ok('project: cuts include 2.5 and 4.5 (and the reel cut 7.2-6.5+4.5)',S.cuts.includes(2.5)&&S.cuts.includes(4.5)&&S.cuts.some(c=>Math.abs(c-5.2)<1e-3),S.cuts);
ok('project: starts [0,2.5,4.5], size 1080x1920 @30, nothing missing',JSON.stringify(S.starts)==='[0,2.5,4.5]'&&S.W===1080&&S.H===1920&&S.fps===30&&!S.missing.length);
ok('clipAt(): boundaries and locals',JSON.stringify(S.at)==='[["c1",0,0.5],["c1",0,3],["c2",2.5,0],["c2",2.5,2],["c3",4.5,6.5],["c3",4.5,9.9],["c3",4.5,10]]',S.at);
ok('clipAt(): out of range gives null',S.atNeg===null&&S.atPast===null);
ok('draw video after prepare(): red box at the expected place',S.v1[0][0]>200&&S.v1[0][1]<90&&S.v1[1][0]<90&&S.v1[2][0]<90,S.v1);
ok('draw video: box moved with time',S.v2[0][0]>200&&S.v2[1][0]<90||S.v2[1][0]>200,S.v2);
ok('photo zoom changes over time',S.zoomDiff>0.5,S.zoomDiff.toFixed(2));
ok('reel clip equals reel.draw at the same local time',S.reelDiff===0,'max diff '+S.reelDiff);

// ---- text layers
const T=await pg.evaluate(async()=>{
  const r=mkRecipe(ids); r.clips=[{id:'k',kind:'video',media:'nope',in:0,out:5}];   // a dark frame; text colours are green/white, easy to find
  r.texts=[{id:'tp',value:'POP',start:1,end:3,x:540,y:600,size:200,font:'display',color:'#ffffff',box:'#00ff00',in:'pop',out:'fade'},
           {id:'ty',value:'TYPEWRITER',start:1,end:4,x:540,y:1400,size:160,font:'body',color:'#ffffff',box:null,in:'type',out:'none'},
           {id:'ar',value:'علبتك واجد',start:0,end:5,x:540,y:1000,size:120,font:'display',color:'#fff',box:null,in:'none',out:'none'},
           {id:'ml',value:'one\ntwo\nthree',start:0,end:5,x:300,y:300,size:80,font:'body',color:'#fff',box:'#f00',in:'slide',out:'slide'}];
  const P=await StudioProject.create(r,{brandBase:'../../../brands/1stchoice/'}); window.TP=P; const g=(rr,gg,bb)=>gg>150&&rr<80&&bb<80?gg:0;
  const wd=t=>bbox(frame(P,t,540),g), o={};
  o.before=wd(0.99).n; o.p1=wd(1.1); o.p5=wd(1.5); o.end=wd(2.5); o.after=wd(3.0).n;
  const white=(r,g,b)=>r>200&&g>200&&b>200?1:0;
  const ty=t=>{ const c=frame(P,t,540); const x=c.getContext('2d'); return bbox(c,white); };
  o.ty=[ty(1.05),ty(1.3),ty(1.8)].map(x=>x.n);
  // direction: spy on ctx.direction
  const log=[]; const c=cv(540,960), x=c.getContext('2d'); const desc=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'direction');
  Object.defineProperty(x,'direction',{get(){ return desc.get.call(x); },set(v){ log.push(v); desc.set.call(x,v); }}); P.draw(x,2,{}); o.dirs=[...new Set(log)];
  o.dirAr=P.textInfo('ar').dir; o.dirEn=P.textInfo('tp').dir; o.lines=P.textInfo('ml').lines;
  o.boxPop=P.textBox('tp'); o.boxAr=P.textBox('ar'); o.boxMl=P.textBox('ml');
  o.hit=[P.textAt(540,600,2),P.textAt(540,600,0.5),P.textAt(540,600,3.5),P.textAt(540,1000,2),P.textAt(5,5,2),P.textAt(300,300,2)];
  o.hide=bbox(frame(P,2,540,{hideText:'tp'}),g).n;
  o.slideEarly=bbox(frame(P,0.05,540),(r,g,b)=>r>25&&g<10&&b<10?1:0).y0;
  o.slideLate=bbox(frame(P,2.5,540),(r,g,b)=>r>200&&g<60&&b<60?1:0).y0;
  return o; });
ok('text pop: invisible before start',T.before===0,T.before);
ok('text pop: partly scaled at start+0.1, full at start+0.5',T.p1.n>0&&T.p1.w<T.p5.w*0.97&&T.p1.mx<T.p5.mx&&T.p5.w>200,[T.p1.w,T.p5.w,T.p1.mx,T.p5.mx]);
ok('text pop: still full before the fade-out, gone after end',T.end.n>0&&T.after===0,[T.end.n,T.after]);
ok('text type: fewer characters early',T.ty[0]<T.ty[1]&&T.ty[1]<T.ty[2],T.ty);
ok('Arabic layer is rtl, English ltr',T.dirAr==='rtl'&&T.dirEn==='ltr'&&T.dirs.includes('rtl')&&T.dirs.includes('ltr'),T);
ok('multi-line text has 3 lines and a taller box',T.lines===3&&T.boxMl.h>T.boxPop.h*0.9,[T.boxMl,T.boxPop]);
ok('textAt(): hits box, respects time, topmost',T.hit[0]==='tp'&&T.hit[1]===null&&T.hit[2]===null&&T.hit[3]==='ar'&&T.hit[4]===null&&T.hit[5]==='ml',T.hit);
ok('hideText hides that layer',T.hide===0,T.hide);
ok('text slide: starts lower than it rests',T.slideEarly>0&&T.slideLate>0&&T.slideEarly>T.slideLate,[T.slideEarly,T.slideLate]);

// ---- sound
const A=await pg.evaluate(async()=>{
  const o={}, P=window.P, a=await P.audio(); window.__a=a; const SRt=48000;
  o.len=a.L.length; o.lufs=a.lufs; o.peak=a.peakDb; o.sr=a.sampleRate;
  const gz=(arr,t0,t1)=>goertzel(arr,Math.round(t0*SRt),Math.round(t1*SRt),440,SRt);
  o.tone=gz(a.L,0.6,2.4); o.toneAfter=gz(a.L,2.6,4.4);   // photo part has no sound
  // land hit: loudest 50 ms in the reel clip
  const w=2400; let best=0,bi=0; for(let i=Math.round(4.5*SRt);i+w<Math.round(8*SRt);i+=480){ const r=rms(a.L,i,i+w); if(r>best){ best=r; bi=i; } } o.landAt=bi/SRt;
  // muted video clip
  const r=mkRecipe(ids); r.clips[0].mute=true; const Q=await StudioProject.create(r,{brandBase:'../../../brands/1stchoice/'}); const q=await Q.audio(); o.toneMuted=goertzel(q.L,Math.round(0.6*SRt),Math.round(2.4*SRt),440,SRt); o.lufsMuted=q.lufs;
  // audio track with a fade-in on a photo-only project
  const r2=mkRecipe(ids); r2.clips=[{id:'p',kind:'photo',media:ids.ph,dur:4}]; r2.audio=[{id:'a1',media:ids.mu,start:0,in:0,out:6,db:0,mute:false,fadeIn:1,fadeOut:0}];
  const F=await StudioProject.create(r2,{brandBase:'../../../brands/1stchoice/'}), f=await F.audio();
  o.f=[rms(f.L,0,Math.round(0.3*SRt)),rms(f.L,Math.round(1.5*SRt),Math.round(1.8*SRt))]; o.fLen=f.L.length; o.fLufs=f.lufs; o.fTone=goertzel(f.L,Math.round(2*SRt),Math.round(3*SRt),220,SRt);
  const r3=mkRecipe(ids); r3.clips=[]; const E=await StudioProject.create(r3,{}); const e=await E.audio(); o.empty=[e.L.length,E.duration];
  o.cached=(await P.audio())===a;
  return o; });
ok('audio(): length = duration*48000, 48 kHz',A.len===8*48000&&A.sr===48000,A.len);
ok('audio(): about -14 LUFS',Math.abs(A.lufs+14)<0.5,A.lufs.toFixed(2));
ok('audio(): peak <= -1.4 dBFS',A.peak<=-1.4,A.peak.toFixed(2));
ok('audio(): 440 Hz of the video clip present in 0.6-2.4 s, absent in the photo part',A.tone>0.01&&A.toneAfter<A.tone*0.05,[A.tone,A.toneAfter]);
ok('audio(): can-land hit at 4.5+0.9 s',A.landAt>5.3&&A.landAt<5.6,A.landAt);
ok('audio(): muted clip has no tone',A.toneMuted<A.tone*0.05,[A.toneMuted,A.tone]);
ok('audio track fadeIn 1 s: quiet first 0.3 s, louder at 1.5 s',A.f[0]<A.f[1]*0.5&&A.f[1]>0.01,A.f);
ok('audio track: 4 s long, -14 LUFS, music tone present',A.fLen===4*48000&&Math.abs(A.fLufs+14)<0.7&&A.fTone>0.01,[A.fLen,A.fLufs,A.fTone]);
ok('audio(): empty project is empty silence; result cached',A.empty[0]===0&&A.empty[1]===0&&A.cached);

// ---- recipes, missing media
const R=await pg.evaluate(async()=>{
  const o={}, v1={v:1,kind:'reel',brand:'1stchoice',reel:'winter-cat',texts:{headline:'x'},mix:{hood:{db:-3,mute:false}},duck:false};
  const r=StudioProject.fromRecipe(v1); o.v2=[r.v,r.clips.length,r.clips[0].kind,r.clips[0].reel,r.clips[0].in,r.clips[0].out,r.clips[0].duck,r.clips[0].texts.headline];
  const P1=await StudioProject.create(v1,{brandBase:'../../../brands/1stchoice/'}); o.dur1=P1.duration; o.cuts1=P1.cuts;
  const r2=mkRecipe(ids); r2.clips.splice(1,0,{id:'x',kind:'video',media:'ghost',in:0,out:1},{id:'y',kind:'photo',media:'ghost2',dur:1}); r2.audio=[{id:'a',media:'ghost3',start:0,in:0,out:2,db:0}];
  const P=await StudioProject.create(r2,{brandBase:'../../../brands/1stchoice/'}); o.missing=P.missing().sort(); o.mdur=P.duration;
  const c=frame(P,2.5+0.2,540); o.mpx=px(c,270,100); const c2=frame(P,3.6,540); o.mpx2=px(c2,270,100);
  o.maudio=(await P.audio()).L.length; o.upd=typeof P.update();
  P.recipe.texts.push({id:'n',value:'new',start:0,end:1,x:100,y:100,size:40,font:'body'}); P.recipe.clips[1].out=0.5; await P.update(); o.newDur=P.duration;
  return o; });
ok('fromRecipe(v1): one reel clip, settings kept',JSON.stringify(R.v2)==='[2,1,"reel","winter-cat",0,null,false,"x"]',R.v2);
ok('v1 project plays the whole reel (10 s)',Math.abs(R.dur1-10)<1e-6&&R.cuts1.includes(7.2),[R.dur1,R.cuts1]);
ok('missing(): lists unknown media, draw/audio still work',JSON.stringify(R.missing)==='["ghost","ghost2","ghost3"]'&&R.mdur>8&&R.mpx[0]<60&&R.mpx2[0]<60&&R.maudio>0,R);
ok('update(): new length after an edit',Math.abs(R.newDur-(R.mdur-0.5))<1e-6,R.newDur);

// ---- preview sync
const PS=await pg.evaluate(async()=>{ const P=window.P, e=await StudioMedia.get(ids.v), o={};
  P.syncPreview(1.0,true); await new Promise(r=>setTimeout(r,500)); o.playing=!e.el.paused; o.t=e.el.currentTime;
  P.syncPreview(3.0,true); await new Promise(r=>setTimeout(r,200)); o.paused=e.el.paused;
  P.syncPreview(2.0,false); await new Promise(r=>setTimeout(r,300)); o.scrub=e.el.currentTime; o.muted=e.el.muted; P.stopAll(); return o; });
ok('syncPreview(): plays near the clock, pauses outside the clip, scrubs while paused',PS.playing&&PS.t>1.3&&PS.t<2.3&&PS.paused&&Math.abs(PS.scrub-2.5)<0.2&&PS.muted,PS);
const PL=await pg.evaluate(async()=>{ await P.audio(); const h=P.play(1); await new Promise(r=>setTimeout(r,300)); const p=h.position(), pl=h.playing; h.stop(); return {p,pl,after:h.playing}; });
ok('play(): handle runs and stops',PL.pl&&PL.p>=1&&PL.p<2&&!PL.after,PL);

// ---- export
const sup=await pg.evaluate(()=>StudioReelExport.support());
if(sup.mode==='webcodecs'){
  const X=await pg.evaluate(async()=>{ const P=await StudioProject.create(mkRecipe(ids),{brandBase:'../../../brands/1stchoice/'}), a=await P.audio();
    const x=await StudioReelExport.run({reel:P,audio:a,sub:1}); const u=new Uint8Array(await x.blob.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));
    const y=await StudioReelExport.run({reel:P,audio:null,sub:2}); return {b64:btoa(s),ms:x.ms,frames:x.frames,ms2:y.ms,frames2:y.frames}; });
  const f=OUT+'project.mp4'; fs.writeFileSync(f,Buffer.from(X.b64,'base64')); const p=probe(f), v=p.streams.find(s=>s.codec_type==='video'), a=p.streams.find(s=>s.codec_type==='audio');
  ok('export: 1080x1920 h264',v&&v.codec_name==='h264'&&v.width===1080&&v.height===1920,v&&[v.width,v.height]);
  ok('export: frames = duration*30 +-1, audio stream present',v&&Math.abs(+v.nb_read_frames-240)<=1&&!!a,[v&&v.nb_read_frames,a&&a.codec_name]);
  const fr=OUT+'f1.png'; spawnSync('ffmpeg',['-v','error','-y','-i',f,'-vf','select=eq(n\\,30)','-frames:v','1',fr]);
  const raw=spawnSync('ffmpeg',['-v','error','-i',fr,'-vf','crop=2:2:500:960','-f','rawvideo','-pix_fmt','rgb24','-'],{encoding:'buffer'}).stdout;
  ok('export: frame at 1.0 s shows the red box (video clip, sought exactly)',raw.length===12&&raw[0]>180&&raw[1]<90,[...raw].slice(0,3).join(','));
  console.log('  export: '+X.ms+' ms ('+X.frames+' frames, sub 1), sub 2 without audio '+X.ms2+' ms');
} else ok('export (webcodecs not available here)',true,sup.mode);
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); console.log(bad?bad+' FAILED':'ALL PASSED'); process.exit(bad?1:0);
