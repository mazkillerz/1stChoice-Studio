/* Remove background, on this device (cutout, mega). One shared module for the tools' Photo sheet and Create.
   Lazy: nothing is fetched until someone taps Remove background. The model (U2-Net small, Apache-2.0) and the
   ONNX Runtime (MIT) live in assets/vendor/cutout/ and are cached by the browser/service worker after the first time.
   StudioCutout.supported()        -> '' when it can run here, else a short reason for the UI
   StudioCutout.run(source,{onProgress}) -> Promise<HTMLCanvasElement|null> same size as source, transparent ground */
(function(){
  const ROOT=(document.currentScript&&document.currentScript.src||'').replace(/assets\/cutout\.js.*$/,'')||'';
  const MB='15 MB';
  let worker=null, busy=false;
  function supported(){
    if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof WebAssembly==='undefined') return 'This browser cannot do it yet.';
    try{ const c=new OffscreenCanvas(1,1); if(!c.getContext('2d')||typeof c.transferToImageBitmap!=='function') return 'This browser cannot do it yet.'; }catch(_){ return 'This browser cannot do it yet.'; }
    return '';
  }
  const warmed=()=>{ try{ return localStorage.getItem('studio:cutout:ready')==='1'; }catch(_){ return false; } };
  const mark=()=>{ try{ localStorage.setItem('studio:cutout:ready','1'); }catch(_){} };
  /* "First time only: it downloads about 15 MB" shows until it has worked once */
  const firstNote=()=>warmed()?'':'First time only: this downloads about '+MB+', then it works offline.';
  function ensure(){ if(!worker) worker=new Worker(ROOT+'assets/cutout-worker.js'); return worker; }
  async function run(source,opt){
    opt=opt||{}; if(busy) return null; busy=true;
    const w=ensure();
    try{
      const bmp=await createImageBitmap(source);   // a copy, so the photo on screen is untouched
      const im=await new Promise((res,rej)=>{
        w.onmessage=e=>{ const d=e.data; if(d.progress&&opt.onProgress) opt.onProgress(d.progress); if(d.done) res(d.done); if(d.error) rej(new Error(d.error)); };
        w.onerror=e=>rej(new Error(e.message||'worker'));
        if(opt.onProgress) opt.onProgress(warmed()?'Starting…':'Downloading the model ('+MB+', first time only)…');
        w.postMessage({src:bmp},[bmp]);
      });
      mark();
      const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; c.getContext('2d').drawImage(im,0,0); im.close&&im.close();
      return c;
    }catch(err){ try{ worker&&worker.terminate(); }catch(_){} worker=null; throw err; }
    finally{ busy=false; }
  }
  window.StudioCutout={supported,run,firstNote,isBusy:()=>busy,sizeLabel:MB};
})();
