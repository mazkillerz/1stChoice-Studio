/* Cutout Pro: a logo-grade background remover that runs on this device (free, offline after the first photo use).
   Logo mode = classic image maths in a worker (instant, no download). Photo mode = U2-Net mask refined at higher resolution.
   StudioCutoutPro.analyse(source)  -> {hasAlpha,flat,bg:[r,g,b]|null,suggest:'keep'|'logo'|'photo',w,h}
   StudioCutoutPro.run(source,{mode:'auto'|'logo'|'photo',tolerance:0..100=50,holes:true,onProgress}) -> canvas (long side <= 2048, transparent ground, not trimmed)
   StudioCutoutPro.trim(canvas,pad=0) -> new canvas cropped to the visible box (or the same canvas when nothing to trim)
   StudioCutoutPro.supported(mode) -> '' or a short reason
   source = HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob/File. */
(function(){
  const ROOT=(document.currentScript&&document.currentScript.src||'').replace(/assets\/cutout-pro\.js.*$/,'')||'';
  const MB='15 MB', MAX=2048;
  let worker=null, seq=0; const jobs=new Map();
  const warmed=()=>{ try{ return localStorage.getItem('studio:cutout:ready')==='1'; }catch(_){ return false; } };
  const mark=()=>{ try{ localStorage.setItem('studio:cutout:ready','1'); }catch(_){} };
  function supported(mode){
    if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined') return 'This browser cannot do it yet.';
    try{ const c=new OffscreenCanvas(1,1); if(!c.getContext('2d')) return 'This browser cannot do it yet.'; }catch(_){ return 'This browser cannot do it yet.'; }
    if(mode==='photo'&&typeof WebAssembly==='undefined') return 'This browser cannot do it yet.';
    return '';
  }
  function ensure(){
    if(worker) return worker;
    worker=new Worker(ROOT+'assets/cutout-pro-worker.js');
    worker.onmessage=e=>{ const d=e.data,j=jobs.get(d.id); if(!j) return;
      if(d.progress){ j.onProgress&&j.onProgress(d.progress); return; }
      jobs.delete(d.id); if(d.error) j.rej(new Error(d.error)); else j.res(d.done); };
    worker.onerror=e=>{ const err=new Error(e.message||'worker'); jobs.forEach(j=>j.rej(err)); jobs.clear(); try{ worker.terminate(); }catch(_){} worker=null; };
    return worker;
  }
  async function bitmap(src){ return createImageBitmap(src); }
  function call(cmd,bmp,opts,onProgress){
    return new Promise((res,rej)=>{ const id=++seq; jobs.set(id,{res,rej,onProgress}); try{ ensure().postMessage({id,cmd,bmp,opts},[bmp]); }catch(err){ jobs.delete(id); rej(err); } });
  }
  async function analyse(source){ return call('analyse',await bitmap(source)); }
  function toCanvas(r){ const c=document.createElement('canvas'); c.info=r.info; c.width=r.w; c.height=r.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.buf),r.w,r.h),0,0); return c; }
  async function copy(source){
    const bmp=await bitmap(source), s=Math.min(1,MAX/Math.max(bmp.width,bmp.height)), c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(bmp.width*s)); c.height=Math.max(1,Math.round(bmp.height*s));
    const x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(bmp,0,0,c.width,c.height); bmp.close&&bmp.close(); return c;
  }
  async function run(source,opt){
    opt=opt||{}; const why=supported(opt.mode==='photo'?'photo':''); if(why) throw new Error(why);
    let mode=opt.mode||'auto', say=opt.onProgress||function(){};
    if(mode==='auto'){
      const a=await analyse(source);
      if(a.suggest==='keep') return copy(source);
      mode=a.suggest;
    }
    const o={tolerance:opt.tolerance==null?50:opt.tolerance,holes:opt.holes!==false,maxSide:MAX};
    if(mode==='photo'){ say(warmed()?'Starting…':'First time only: this downloads about '+MB+', then it works offline.'); }
    else say('Cutting it out…');
    const r=await call(mode==='photo'?'photo':'logo',await bitmap(source),o,say);
    if(mode==='photo') mark();
    return toCanvas(r);
  }
  function trim(c,pad){
    pad=pad||0; const w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data; let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++){ const row=y*w*4; for(let x=0;x<w;x++) if(d[row+x*4+3]>0){ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; y1=y; } }
    if(x1<0) return c;
    x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(w-1,x1+pad); y1=Math.min(h-1,y1+pad);
    if(x0===0&&y0===0&&x1===w-1&&y1===h-1) return c;
    const o=document.createElement('canvas'); o.width=x1-x0+1; o.height=y1-y0+1; o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height); return o;
  }
  window.StudioCutoutPro={analyse,run,trim,supported,firstNote:()=>warmed()?'':'First time only: this downloads about '+MB+', then it works offline.',sizeLabel:MB};
})();
