/* Reel engine (brand-agnostic): loads a coded reel template (reel.json + scene.js + fonts + images) and draws any frame
   from the time t onto any 2D canvas context. See docs/reels.md.
     StudioReel.scene(def)      called by a template's scene.js: {id, setup?(R), draw(ctx,t,R), measure?(id,value,ctx)}
     StudioReel.load(base,{onProgress}) -> Promise<reel>   base = folder url ending in '/'
     reel.draw(ctx,t,{texts,wobble})   synchronous; reel.textInfo(texts)   words -> {value,dir,fit,warn} */
(function(){
'use strict';
let lastDef=null; const cache={};

/* ---- "boiling line" wobble: smooth 2-octave gradient noise used as a displacement map (like feTurbulence + feDisplacementMap) ---- */
const G=new Float32Array(512); for(let i=0;i<256;i++){ const a=i/256*Math.PI*2; G[i*2]=Math.cos(a); G[i*2+1]=Math.sin(a); }
const hash=(x,y,s)=>{ let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1274126177))|0; h=Math.imul(h^(h>>>13),1103515245); return ((h^(h>>>16))&255)*2; };
const fade=t=>t*t*t*(t*(t*6-15)+10);
function noise(x,y,s){                         // 2D gradient noise, about -0.7..0.7
  const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy, u=fade(fx), v=fade(fy);
  const g=(cx,cy)=>{ const k=hash(ix+cx,iy+cy,s); return G[k]*(fx-cx)+G[k+1]*(fy-cy); };
  const a=g(0,0), b=g(1,0), c=g(0,1), d=g(1,1);
  return a+(b-a)*u+((c+(d-c)*u)-(a+(b-a)*u))*v;
}
const fields=new Map();
function field(seed,freq,amount,w,h,px){       // displacement at quarter resolution, in whole target pixels
  const key=[seed,freq,amount,w,h,px].join('|'); let F=fields.get(key); if(F) return F;
  const gw=Math.ceil(w/4), gh=Math.ceil(h/4), dx=new Int16Array(gw*gh), dy=new Int16Array(gw*gh), k=amount*px*0.5;
  for(let j=0;j<gh;j++) for(let i=0;i<gw;i++){
    const X=(i*4+2)/px*freq, Y=(j*4+2)/px*freq;
    dx[j*gw+i]=Math.round(k*(noise(X,Y,seed*2)+noise(X*2,Y*2,seed*2+7)/2));
    dy[j*gw+i]=Math.round(k*(noise(X+31.4,Y+17.2,seed*2+1)+noise(X*2+31.4,Y*2+17.2,seed*2+9)/2));
  }
  if(fields.size>48) fields.delete(fields.keys().next().value);
  fields.set(key,F={gw,dx,dy}); return F;
}
const tmps=new Map();                           // per size: scratch canvas + output pixels
function tmp(w,h){ const k=w+'x'+h; let t=tmps.get(k); if(!t){ const c=document.createElement('canvas'); c.width=w; c.height=h;
  const x=c.getContext('2d'); t={c,x,img:x.createImageData(w,h)}; t.o32=new Uint32Array(t.img.data.buffer); tmps.set(k,t); } return t; }
function wobble(src,dst,o,px,on){
  const w=src.canvas.width, h=src.canvas.height;
  dst.save(); dst.setTransform(1,0,0,1,0,0);
  if(!on||!o||!o.amount){ dst.drawImage(src.canvas,0,0); dst.restore(); return; }
  let px32; try{ px32=src.getImageData(0,0,w,h); }catch(_){ px32=null; }   // a canvas the browser won't read back (pictures from another site): draw it plain, never blank
  if(!px32){ dst.drawImage(src.canvas,0,0); dst.restore(); return; }
  const F=field(o.seed|0,o.freq,o.amount,w,h,px), T=tmp(w,h), s32=new Uint32Array(px32.data.buffer), out=T.o32, gw=F.gw, DX=F.dx, DY=F.dy;
  for(let y=0;y<h;y++){ const row=(y>>2)*gw, yo=y*w;
    for(let x=0;x<w;x++){ const i=row+(x>>2), sx=x+DX[i], sy=y+DY[i];
      out[yo+x]=(sx<0||sy<0||sx>=w||sy>=h)?0:s32[sy*w+sx]; } }
  T.x.putImageData(T.img,0,0); dst.drawImage(T.c,0,0); dst.restore();
}

/* ---- text ---- */
const RTL=/[֐-ࣿיִ-﷿ﹰ-﻿]/, LTR=/\p{L}/u;
function dirOf(s){ for(const ch of s){ if(RTL.test(ch)) return 'rtl'; if(LTR.test(ch)) return 'ltr'; } return 'rtl'; }
const meas=document.createElement('canvas').getContext('2d');

/* ---- load ---- */
async function load(base,opt){
  if(cache[base]) return cache[base].then(r=>{ opt&&opt.onProgress&&opt.onProgress(1); return r; });
  return cache[base]=(async()=>{
    const M=await (await fetch(base+'reel.json')).json(), imgs={};
    const jobs=[]; let done=0; const total=1+M.fonts.length+Object.keys(M.images).length+1;
    const tick=p=>p.then(v=>{ done++; opt&&opt.onProgress&&opt.onProgress(done/total); return v; });
    for(const f of M.fonts) jobs.push(tick(new FontFace(f.family,'url('+base+f.src+')',{weight:f.weight||'100 900'}).load().then(ff=>document.fonts.add(ff))));
    for(const [k,p] of Object.entries(M.images)) jobs.push(tick(new Promise((ok,no)=>{ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>im.decode().catch(()=>{}).then(()=>{ imgs[k]=im; ok(); });
      im.onerror=()=>no(new Error('Could not load '+base+p)); im.src=base+p; })));
    let def; jobs.push(tick(new Promise((ok,no)=>{ lastDef=null; const s=document.createElement('script'); s.src=base+M.scene;
      s.onload=()=>{ def=lastDef; lastDef=null; def?ok():no(new Error('scene.js did not call StudioReel.scene')); }; s.onerror=()=>no(new Error('Could not load '+base+M.scene)); document.head.appendChild(s); })));
    done++; await Promise.all(jobs);
    return make(M,base,imgs,def);
  })();
}

function make(M,base,imgs,def){
  const W=M.size[0], H=M.size[1], layers=new Map(); let lastKey='', lastInfo=null;
  function widthOf(slot,value,dir){
    meas.font=slot.font; meas.direction=dir; meas.textAlign='left';
    return def.measure?def.measure(slot.id,value,meas):meas.measureText(value).width;
  }
  function textInfo(texts){
    texts=texts||{}; const key=JSON.stringify(texts); if(key===lastKey) return lastInfo; const o={};
    for(const s of M.texts||[]){
      const v=texts[s.id]!=null?String(texts[s.id]):s.value, dir=dirOf(v), w=widthOf(s,v,dir), raw=w>0?(s.maxWidth||W)/w:1, fit=Math.min(1,raw);   // always fits its room (never runs off the frame); the editor warns below warnBelow
      o[s.id]={value:v,dir,fit,warn:raw<(s.warnBelow||0),font:s.font};
    }
    lastKey=key; return lastInfo=o;
  }
  function makeR(px,w,h,on,text){
    const R={W,H,M,img:imgs,text,px,base,
      layer(name){ const k=name+'|'+w+'x'+h; let c=layers.get(k);
        if(!c){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; c=cv.getContext('2d',{willReadFrequently:true}); c.imageSmoothingQuality='high'; layers.set(k,c); }
        c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,w,h); c.setTransform(px,0,0,px,0,0); return c; },
      wobble(s,d,o){ wobble(s,d,o,px,on); } };
    return R;
  }
  const reel={M,base,W,H,fps:M.fps,duration:M.duration,cuts:M.cuts||[],scene:def,textInfo,
    draw(ctx,t,opt){
      opt=opt||{}; const cw=ctx.canvas.width, ch=ctx.canvas.height, px=cw/W;
      ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
      ctx.fillStyle=M.background||'#fff'; ctx.fillRect(0,0,cw,ch); ctx.setTransform(px,0,0,px,0,0);
      try{ def.draw(ctx,t,makeR(px,cw,ch,opt.wobble!==false,textInfo(opt.texts))); } finally{ ctx.restore(); }
    }};
  if(def.setup) def.setup(makeR(1,W,H,false,textInfo({})));
  return reel;
}

window.StudioReel={ scene(def){ lastDef=def; }, load };
})();
