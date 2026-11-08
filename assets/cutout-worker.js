/* Remove background: runs the model off the main thread (cutout, mega).
   In:  {src:ImageBitmap}  Out: {progress}, {done: ImageBitmap (full size, transparent ground)} or {error}. */
let sess=null, loading=null;
const BASE=new URL('vendor/cutout/',self.location.href).href, SIZE=320;
async function load(){
  if(sess) return sess;
  if(!loading) loading=(async()=>{
    importScripts(BASE+'ort.wasm.min.js');
    ort.env.wasm.wasmPaths=BASE; ort.env.wasm.numThreads=1; ort.env.wasm.proxy=false; ort.env.wasm.simd=true;
    postMessage({progress:'Loading the model…'});
    const buf=await (await fetch(BASE+'u2netp.onnx')).arrayBuffer();
    sess=await ort.InferenceSession.create(buf,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
    return sess;
  })();
  return loading;
}
const smooth=(a,b,x)=>{ x=(x-a)/(b-a); x=x<0?0:x>1?1:x; return x*x*(3-2*x); };
async function run(src){
  const s=await load(), W=src.width, H=src.height;
  postMessage({progress:'Finding the edges…'});
  const c=new OffscreenCanvas(SIZE,SIZE), x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality='high'; x.drawImage(src,0,0,SIZE,SIZE);
  const d=x.getImageData(0,0,SIZE,SIZE).data, n=SIZE*SIZE, t=new Float32Array(3*n), mean=[.485,.456,.406], sd=[.229,.224,.225];
  for(let i=0;i<n;i++) for(let k=0;k<3;k++) t[k*n+i]=(d[i*4+k]/255-mean[k])/sd[k];
  const out=await s.run({[s.inputNames[0]]:new ort.Tensor('float32',t,[1,3,SIZE,SIZE])});
  const o=out[s.outputNames[0]].data; let lo=Infinity,hi=-Infinity; for(let i=0;i<n;i++){ if(o[i]<lo) lo=o[i]; if(o[i]>hi) hi=o[i]; }
  const mc=new OffscreenCanvas(SIZE,SIZE), mx=mc.getContext('2d'), mi=mx.createImageData(SIZE,SIZE), r=hi-lo||1;
  for(let i=0;i<n;i++){ const v=Math.round(255*(o[i]-lo)/r); mi.data[i*4]=mi.data[i*4+1]=mi.data[i*4+2]=255; mi.data[i*4+3]=v; }
  mx.putImageData(mi,0,0);
  postMessage({progress:'Cutting it out…'});
  /* full-size mask: smooth up-scale of the model's mask, then a short curve so the edge is crisp with about 1-2 px of feather */
  const big=new OffscreenCanvas(W,H), bx=big.getContext('2d',{willReadFrequently:true}); bx.imageSmoothingEnabled=true; bx.imageSmoothingQuality='high';
  /* two steps for large photos keep the up-scale smooth */
  let cur=mc, cw=SIZE, ch=SIZE; while(cw*2<W&&ch*2<H){ const t2=new OffscreenCanvas(cw*2,ch*2), tx=t2.getContext('2d'); tx.imageSmoothingQuality='high'; tx.drawImage(cur,0,0,cw*2,ch*2); cur=t2; cw*=2; ch*=2; }
  bx.drawImage(cur,0,0,W,H);
  const md=bx.getImageData(0,0,W,H), p=md.data, lut=new Uint8ClampedArray(256); for(let i=0;i<256;i++) lut[i]=Math.round(255*smooth(.3,.7,i/255));
  for(let i=3;i<p.length;i+=4) p[i]=lut[p[i]];
  bx.putImageData(md,0,0);
  const res=new OffscreenCanvas(W,H), rx=res.getContext('2d'); rx.drawImage(src,0,0); rx.globalCompositeOperation='destination-in'; rx.drawImage(big,0,0);
  return res.transferToImageBitmap();
}
onmessage=async e=>{ try{ if(e.data.warm){ await load(); postMessage({ready:true}); return; } const im=await run(e.data.src); e.data.src.close&&e.data.src.close(); postMessage({done:im},[im]); }
  catch(err){ postMessage({error:String(err&&err.message||err)}); } };
