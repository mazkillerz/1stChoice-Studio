/* Reel export: turns a coded reel (+ its mixed audio) into an MP4/WebM file in the browser.
   StudioReelExport.support() -> { mode:'webcodecs'|'recorder'|'none', video, audio, mime }
   StudioReelExport.run({reel, texts, audio, onProgress, signal, force, sub, shutter}) -> { blob, mode, codec, ms, frames }
   WebCodecs path: frame-exact (motion blur from sub-frames, like the reel renderer), H.264 + AAC/Opus muxed to MP4.
   Recorder path: real-time MediaRecorder, for browsers without WebCodecs. */
(function(){
'use strict';
const ROOT=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/reel-export\.js.*$/,''):'../';
const W0=1080,H0=1920,FPS0=30,VBITR=12e6,ABITR=192e3;
const abortErr=()=>{ try{ return new DOMException('Export cancelled','AbortError'); }catch(e){ const x=new Error('Export cancelled'); x.name='AbortError'; return x; } };
const mc=new MessageChannel(), waiters=[]; mc.port1.onmessage=()=>{ const f=waiters.shift(); if(f) f(); };
const tick=()=>new Promise(r=>{ waiters.push(r); mc.port2.postMessage(0); });   // yields to the event loop (no timer clamping)
function loadScript(src){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>no(new Error('Could not load '+src)); document.head.appendChild(s); }); }
async function muxer(){ if(!window.Mp4Muxer) await loadScript(ROOT+'assets/vendor/mp4-muxer.js'); return window.Mp4Muxer; }

let cached=null;
async function detect(){
  const out={mode:'none',video:null,audio:null,mime:null};
  let rec=null; if(window.MediaRecorder&&MediaRecorder.isTypeSupported) rec=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))||null;
  if(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData){
    for(const codec of ['avc1.640028','avc1.4d0028','avc1.42e028']){
      try{ const r=await VideoEncoder.isConfigSupported({codec,width:W0,height:H0,bitrate:VBITR,framerate:FPS0,hardwareAcceleration:'no-preference',avc:{format:'avc'}}); if(r.supported){ out.video=codec; break; } }catch(e){}
    }
    for(const [name,codec] of [['aac','mp4a.40.2'],['opus','opus']]){
      try{ const r=await AudioEncoder.isConfigSupported({codec,sampleRate:48000,numberOfChannels:2,bitrate:ABITR}); if(r.supported){ out.audio=name; break; } }catch(e){}
    }
  }
  if(out.video&&(out.audio||!rec)){ out.mode='webcodecs'; return out; }
  if(rec){ out.mode='recorder'; out.mime=rec; out.video=null; out.audio=null; return out; }
  return out;
}
const support=()=>cached||(cached=detect());

// make a canvas (offscreen when possible)
const mkCanvas=(w,h)=>{ if(window.OffscreenCanvas) return new OffscreenCanvas(w,h); const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };

// the times drawn for one output frame: sub-frames over the shutter, never blurred across a cut
function frameTimes(i,fps,T,cuts,sub,shutter){
  const t0=i/fps, out=[];
  for(let j=0;j<sub;j++){
    let t=sub===1?t0:Math.min(T-1e-3,Math.max(0,t0+(j-(sub-1)/2)*shutter/(fps*sub)));
    for(const c of cuts||[]) if((t<c)!==(t0<c)) t=t0>=c?c:c-1e-4;
    out.push(t);
  }
  return out;
}

async function runWebcodecs(o,sup,t0){
  const R=o.reel, W=R.W||W0, H=R.H||H0, fps=R.fps||FPS0, T=R.duration, frames=Math.round(T*fps), sub=o.sub||4, shutter=o.shutter==null?0.5:o.shutter;
  const sig=o.signal; if(sig&&sig.aborted) throw abortErr();
  const M=await muxer(), A=o.audio&&sup.audio?o.audio:null, asr=A?(A.sampleRate||48000):48000;
  const target=new M.ArrayBufferTarget();
  const mx=new M.Muxer({target,video:{codec:'avc',width:W,height:H,frameRate:fps},audio:A?{codec:sup.audio==='aac'?'aac':'opus',numberOfChannels:2,sampleRate:asr}:undefined,fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let err=null; const fail=e=>{ if(!err) err=e; };
  const venc=new VideoEncoder({output:(c,m)=>mx.addVideoChunk(c,m),error:fail});
  venc.configure({codec:sup.video,width:W,height:H,bitrate:VBITR,framerate:fps,hardwareAcceleration:'no-preference',latencyMode:'quality',avc:{format:'avc'}});
  let aenc=null;
  if(A){ aenc=new AudioEncoder({output:(c,m)=>mx.addAudioChunk(c,m),error:fail});
    aenc.configure({codec:sup.audio==='aac'?'mp4a.40.2':'opus',sampleRate:asr,numberOfChannels:2,bitrate:ABITR}); }
  const cv=mkCanvas(W,H), cx=cv.getContext('2d'), acc=sub>1?mkCanvas(W,H):null, ax=acc&&acc.getContext('2d');
  const total=A?Math.min(A.L.length,Math.round(T*asr)):0, CH=4800; let ap=0;
  const feedAudio=async upTo=>{   // push audio chunks up to a time, keeps audio and video interleaved
    const end=Math.min(total,Math.round(upTo*asr));
    while(ap<end){
      const n=Math.min(CH,total-ap), d=new Float32Array(n*2); d.set(A.L.subarray(ap,ap+n),0); d.set(A.R.subarray(ap,ap+n),n);
      const ad=new AudioData({format:'f32-planar',sampleRate:asr,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(ap*1e6/asr),data:d});
      aenc.encode(ad); ad.close(); ap+=n;
      while(aenc.encodeQueueSize>8){ await tick(); if(err) throw err; }
    }
  };
  const closeAll=()=>{ for(const e of [venc,aenc]) if(e&&e.state!=='closed'){ try{ e.close(); }catch(x){} } };
  try{
    for(let i=0;i<frames;i++){
      if(sig&&sig.aborted) throw abortErr(); if(err) throw err;
      const ts=frameTimes(i,fps,T,R.cuts,sub,shutter);
      for(let j=0;j<ts.length;j++){
        cx.setTransform(1,0,0,1,0,0); cx.globalAlpha=1; cx.clearRect(0,0,W,H);
        R.draw(cx,ts[j],{texts:o.texts});
        if(acc){ ax.globalAlpha=j===0?1:1/(j+1); ax.globalCompositeOperation=j===0?'copy':'source-over'; ax.drawImage(cv,0,0); }
      }
      if(acc){ ax.globalAlpha=1; ax.globalCompositeOperation='source-over'; }
      const vf=new VideoFrame(acc||cv,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
      venc.encode(vf,{keyFrame:i%(fps*2)===0}); vf.close();
      if(A) await feedAudio((i+1)/fps);
      while(venc.encodeQueueSize>2){ await tick(); if(err) throw err; }
      if(o.onProgress) o.onProgress((i+1)/frames,i,frames);
      await tick();
    }
    if(A) await feedAudio(T);
    await venc.flush(); if(aenc) await aenc.flush(); if(err) throw err;
    mx.finalize();
  }catch(e){ closeAll(); throw e; }
  closeAll();
  return {blob:new Blob([target.buffer],{type:'video/mp4'}),mode:'webcodecs',codec:sup.video+(A?'+'+sup.audio:''),ms:Date.now()-t0,frames};
}

async function runRecorder(o,sup,t0){
  const R=o.reel, W=R.W||W0, H=R.H||H0, fps=R.fps||FPS0, T=R.duration, frames=Math.round(T*fps), sig=o.signal;
  let mime=sup.mime; if(!mime){ mime=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m)); }
  if(!mime) throw new Error('This browser cannot record video.');
  if(sig&&sig.aborted) throw abortErr();
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const cx=cv.getContext('2d');
  const A=o.audio, stream=cv.captureStream(fps); let ac=null,src=null;
  if(A){ const C=window.AudioContext||window.webkitAudioContext; ac=new C(); const dest=ac.createMediaStreamDestination(), buf=ac.createBuffer(2,A.L.length,A.sampleRate||48000);
    buf.copyToChannel(A.L,0); buf.copyToChannel(A.R,1); src=ac.createBufferSource(); src.buffer=buf; src.connect(dest); dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t)); await ac.resume(); }
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:VBITR,audioBitsPerSecond:ABITR}), chunks=[];
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  const stopped=new Promise(r=>{ rec.onstop=r; });
  const draw=t=>{ cx.setTransform(1,0,0,1,0,0); cx.globalAlpha=1; cx.clearRect(0,0,W,H); R.draw(cx,Math.min(T-1e-3,Math.max(0,t)),{texts:o.texts}); };
  const cleanup=()=>{ try{ stream.getTracks().forEach(t=>t.stop()); }catch(e){} if(ac) try{ ac.close(); }catch(e){} };
  draw(0); rec.start(250);
  const start=ac?ac.currentTime+0.05:performance.now()/1000+0.05; if(src) src.start(start);
  const now=()=>(ac?ac.currentTime:performance.now()/1000)-start;
  try{
    await new Promise((ok,no)=>{
      const step=()=>{
        if(sig&&sig.aborted) return no(abortErr());
        const t=now(); draw(t);
        if(o.onProgress) o.onProgress(Math.min(1,Math.max(0,t/T)),Math.min(frames-1,Math.max(0,Math.floor(t*fps))),frames);
        if(t>=T) return ok(); requestAnimationFrame(step);
      }; requestAnimationFrame(step);
    });
  }catch(e){ try{ rec.stop(); }catch(x){} cleanup(); throw e; }
  draw(T); await tick(); rec.stop(); await stopped; cleanup();
  return {blob:new Blob(chunks,{type:mime.split(';')[0]}),mode:'recorder',codec:mime,ms:Date.now()-t0,frames};
}

async function run(o){
  const t0=Date.now(), sup=await support();
  if(o.force==='recorder'||sup.mode==='recorder'){
    const rs=(sup.mode==='recorder')?sup:Object.assign({},sup,{mime:null});
    return runRecorder(o,rs,t0);
  }
  if(sup.mode==='none') throw new Error('This browser cannot export video.');
  return runWebcodecs(o,sup,t0);
}
window.StudioReelExport={support,run,frameTimes};
})();
