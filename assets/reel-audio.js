/* Reel audio: loads the sounds of a reel template, mixes them like the owner's mix script and plays/renders the result.
   StudioReelAudio.load(M, baseUrl) -> mix { rows, defaults(), isDefault(s), render(s), renderRaw(s), play(s, from), solo(id, s), stopAll() }
   Settings: { mix: { <rowId>: { db, mute } }, duck: Boolean }. Everything is plain JS math, so a render is deterministic. */
(function(){
'use strict';
const SR=48000, db=g=>Math.pow(10,g/20), dbOf=x=>20*Math.log10(x);
let actx=null; const live=new Set();

// --- loudness (ITU-R BS.1770-4: K-weighting, 400 ms blocks, gates at -70 and -10) ---
function kCoefs(fs){
  const sh=()=>{ const K=Math.tan(Math.PI*1681.9744509555319/fs), Q=0.7071752369554193, Vh=Math.pow(10,3.99984385397/20), Vb=Math.pow(Vh,0.4996667741545416), a0=1+K/Q+K*K;
    return {b:[(Vh+Vb*K/Q+K*K)/a0,2*(K*K-Vh)/a0,(Vh-Vb*K/Q+K*K)/a0],a:[2*(K*K-1)/a0,(1-K/Q+K*K)/a0]}; };
  const hp=()=>{ const K=Math.tan(Math.PI*38.13547087613982/fs), Q=0.5003270373238773, a0=1+K/Q+K*K;
    return {b:[1,-2,1],a:[2*(K*K-1)/a0,(1-K/Q+K*K)/a0]}; };
  return [sh(),hp()];
}
function kWeigh(x,fs){   // returns squared K-weighted samples of one channel
  const st=kCoefs(fs), n=x.length, y=new Float64Array(n); y.set(x);
  for(const c of st){
    let x1=0,x2=0,y1=0,y2=0; const [b0,b1,b2]=c.b,[a1,a2]=c.a;
    for(let i=0;i<n;i++){ const v=y[i], o=b0*v+b1*x1+b2*x2-a1*y1-a2*y2; x2=x1;x1=v;y2=y1;y1=o;y[i]=o; }
  }
  for(let i=0;i<n;i++) y[i]*=y[i];
  return y;
}
function lufs(L,R,fs){
  fs=fs||SR; const chans=[kWeigh(L,fs)]; if(R) chans.push(kWeigh(R,fs));
  const blk=Math.round(0.4*fs), step=Math.round(0.1*fs), n=L.length, T=n/fs;
  if(T<0.4) return -Infinity;
  const nb=Math.round((T-0.4)/0.1)+1, z=[], l=[];
  const pre=chans.map(c=>{ const p=new Float64Array(n+1); for(let i=0;i<n;i++) p[i+1]=p[i]+c[i]; return p; });
  for(let j=0;j<nb;j++){
    const a=j*step, b=Math.min(n,a+blk); if(b<=a) break;
    const zz=pre.map(p=>(p[b]-p[a])/blk); z.push(zz);
    let s=0; for(const v of zz) s+=v; l.push(-0.691+10*Math.log10(s));
  }
  const mean=idx=>{ let s=0; for(let c=0;c<chans.length;c++){ let m=0; for(const j of idx) m+=z[j][c]; s+=m/idx.length; } return -0.691+10*Math.log10(s); };
  let idx=[]; for(let j=0;j<z.length;j++) if(l[j]>-70) idx.push(j);
  if(!idx.length) return -Infinity;
  const rel=mean(idx)-10; idx=idx.filter(j=>l[j]>rel);
  return idx.length?mean(idx):-Infinity;
}

// --- clips ---
function peak50(L,R){   // loudest 50 ms RMS (dBFS) of the channel mean
  const n=L.length, w=Math.round(0.05*SR), m=new Float64Array(n);
  for(let i=0;i<n;i++) m[i]=R?(L[i]+R[i])/2:L[i];
  const p=new Float64Array(n+1); for(let i=0;i<n;i++) p[i+1]=p[i]+m[i]*m[i];
  let best=0;
  if(n<w) best=p[n]/Math.max(1,n);
  else for(let i=0;i+w<=n;i++){ const e=(p[i+w]-p[i])/w; if(e>best) best=e; }
  return dbOf(Math.sqrt(best+1e-12));
}
function prepClip(buf,s){   // trim by ss/dur, fade out; returns {L,R} (not yet levelled)
  const a=Math.round((s.ss||0)*SR), b=s.dur?Math.min(buf.L.length,a+Math.round(s.dur*SR)):buf.L.length;
  const L=buf.L.slice(a,b), R=buf.R.slice(a,b), f=Math.min(L.length,Math.round((s.fade||0)*SR));
  for(let i=0;i<f;i++){ const g=1-i/Math.max(1,f-1); L[L.length-f+i]*=g; R[R.length-f+i]*=g; }
  return {L,R};
}

async function decode(url){
  const r=await fetch(url); if(!r.ok) throw new Error('Could not load '+url);
  const ab=await r.arrayBuffer(), ctx=new OfflineAudioContext(2,1,SR), d=await ctx.decodeAudioData(ab);
  const L=new Float32Array(d.getChannelData(0)); return {L,R:d.numberOfChannels>1?new Float32Array(d.getChannelData(1)):L.slice()};
}

async function load(M,baseUrl,opt){
  opt=opt||{}; const base=baseUrl.replace(/\/?$/,'/'), D=M.duration, N=Math.round(D*SR), mu=M.music, snds=M.sounds||[], MA=M.master||{lufs:-14,lufsNoMusic:-16,ceiling:-1.5};
  const files=[]; if(mu) files.push(mu.file); for(const s of snds) if(!files.includes(s.file)) files.push(s.file);
  const raw={}; let done=0;
  await Promise.all(files.map(async f=>{ raw[f]=await decode(base+f); if(opt.onProgress) opt.onProgress(++done/files.length); }));
  // levelled clips: per sound, one clip per distinct hit level
  const clips=snds.map(s=>{
    const c=prepClip(raw[s.file],s), e=peak50(c.L,c.R), by={};
    const get=lv=>{ lv=lv==null?s.level:lv; if(!by[lv]){ const g=db(lv-e), L=new Float32Array(c.L.length), R=new Float32Array(c.R.length);
      for(let i=0;i<L.length;i++){ L[i]=c.L[i]*g; R[i]=c.R[i]*g; } by[lv]={L,R}; } return by[lv]; };
    return get;
  });
  // the music bed levelled to its lufs over the reel length
  let bed=null;
  if(mu){
    const src=raw[mu.file], L=new Float32Array(N), R=new Float32Array(N); L.set(src.L.subarray(0,N)); R.set(src.R.subarray(0,N));
    const g=db(mu.lufs-lufs(L,R,SR)); for(let i=0;i<N;i++){ L[i]*=g; R[i]*=g; } bed={L,R};
  }
  // the music envelope (cuts and fade-out) does not depend on settings
  let env=null;
  if(mu){
    env=new Float64Array(N).fill(1);
    const t=i=>i/SR;
    for(const c of mu.cuts||[]) for(let i=0;i<N;i++) if(t(i)>=c.from&&t(i)<c.to) env[i]=0;
    for(const c of mu.cuts||[]){
      const r=c.ramp||0;
      for(const [a,b,up] of [[c.from-r,c.from,false],[c.to,c.to+r,true]]){
        let i0=-1,i1=-1; for(let i=0;i<N;i++) if(t(i)>=a&&t(i)<b){ if(i0<0) i0=i; i1=i; }
        if(i0<0) continue; const n=i1-i0+1;
        for(let k=0;k<n;k++){ const f=n>1?k/(n-1):0; env[i0+k]=up?f:1-f; }
      }
    }
    const fo=mu.fadeOut||0; if(fo) for(let i=0;i<N;i++) env[i]*=Math.min(1,Math.max(0,(D-t(i))/fo));
  }
  // rows for the mixer
  const first=s=>Math.min(...s.hits.map(h=>h.at));
  const rows=[]; if(mu) rows.push({id:mu.id||'music',label:mu.label||'Music',kind:'music',hits:[0],duck:false});
  snds.map((s,i)=>({s,i})).sort((a,b)=>first(a.s)-first(b.s)||a.i-b.i).forEach(({s})=>rows.push({id:s.id,label:s.label||s.id,kind:'sound',hits:s.hits.map(h=>h.at),duck:!!s.duck}));
  const musicId=mu?(mu.id||'music'):null;
  const st=(s,id)=>{ const m=(s&&s.mix&&s.mix[id])||{}; return {db:+m.db||0,mute:!!m.mute}; };
  const norm=s=>{ const o={mix:{},duck:!s||s.duck!==false}; for(const r of rows){ const m=st(s,r.id); if(m.db||m.mute) o.mix[r.id]={db:m.db,mute:m.mute}; } return o; };

  function mixRaw(settings){   // the summed sounds and music of a reel, not yet levelled by the master
    const sfx=[new Float64Array(N),new Float64Array(N)], hits=[], duckOn=!settings||settings.duck!==false;
    snds.forEach((s,k)=>{
      const m=st(settings,s.id); if(m.mute) return; const gdb=db(m.db);
      for(const h of s.hits){
        const c=clips[k](h.level); let t=h.at, a=0;
        if(t<0){ a=Math.round(-t*SR); t=0; }
        const o=Math.round(t*SR), len=Math.min(c.L.length-a,N-o); if(len<=0) continue;
        let bi=0,bv=-1;
        for(let i=0;i<len;i++){ const l=c.L[a+i]*gdb, r=c.R[a+i]*gdb; sfx[0][o+i]+=l; sfx[1][o+i]+=r; if(s.duck){ const v=Math.abs(l)+Math.abs(r); if(v>bv){ bv=v; bi=i; } } }
        if(s.duck) hits.push(t+bi/SR);
      }
    });
    let mL=null,mR=null,hasMusic=false;
    if(bed&&!st(settings,musicId).mute){
      hasMusic=true; const dk=new Float64Array(N).fill(1), du=mu.duck||{db:-5,half:0.28,lead:0.05}, g=db(st(settings,musicId).db);
      if(duckOn) for(const h of hits){
        const c=h+du.lead, a=Math.max(0,Math.floor((c-du.half)*SR)), b=Math.min(N,Math.ceil((c+du.half)*SR)+1);
        for(let i=a;i<b;i++){ const d=Math.min(1,Math.max(0,1-Math.abs(i/SR-c)/du.half)); dk[i]=Math.min(dk[i],1-(1-db(du.db))*d); }
      }
      mL=new Float64Array(N); mR=new Float64Array(N);
      for(let i=0;i<N;i++){ const e=env[i]*dk[i]*g; mL[i]=bed.L[i]*e; mR[i]=bed.R[i]*e; }
    }
    const f64=[new Float64Array(N),new Float64Array(N)];
    for(let i=0;i<N;i++){ f64[0][i]=sfx[0][i]+(mL?mL[i]:0); f64[1][i]=sfx[1][i]+(mR?mR[i]:0); }
    return {f64,hasMusic};
  }
  function renderSync(settings){
    const {f64,hasMusic}=mixRaw(settings), L=new Float32Array(N), R=new Float32Array(N);
    // master: integrated loudness to target, then the soft-knee ceiling
    const cur=lufs(f64[0],f64[1],SR), tgt=hasMusic?MA.lufs:(MA.lufsNoMusic!=null?MA.lufsNoMusic:MA.lufs);
    const g=isFinite(cur)?db(tgt-cur):1, c=db(MA.ceiling==null?-1.5:MA.ceiling), k=0.8*c, w=0.2*c; let pk=0;
    const lim=x=>{ x*=g; const a=Math.abs(x); return a>k?Math.sign(x)*(k+w*Math.tanh((a-k)/w)):x; };
    for(let i=0;i<N;i++){ const l=lim(f64[0][i]), r=lim(f64[1][i]); L[i]=l; R[i]=r; pk=Math.max(pk,Math.abs(l),Math.abs(r)); }
    return {L,R,sampleRate:SR,lufs:lufs(L,R,SR),peakDb:pk>0?dbOf(pk):-Infinity};
  }

  // --- playback ---
  const cache=new Map();
  const mixFor=s=>{ const k=JSON.stringify(norm(s)); if(!cache.has(k)){ if(cache.size>4) cache.delete(cache.keys().next().value); cache.set(k,renderSync(s)); } return cache.get(k); };
  const ctxGet=()=>{ if(!actx){ const C=window.AudioContext||window.webkitAudioContext; actx=new C(); } if(actx.state==='suspended') actx.resume(); return actx; };
  function playBuf(L,R,from,total){
    const ctx=ctxGet(), b=ctx.createBuffer(2,L.length,SR); b.copyToChannel(L,0); b.copyToChannel(R,1);
    const src=ctx.createBufferSource(); src.buffer=b; src.connect(ctx.destination);
    const t0=ctx.currentTime; let ended=false;
    const h={playing:true,stop(){ if(ended) return; ended=true; h.playing=false; live.delete(h); try{src.stop();}catch(e){} },
      position(){ return h.playing?Math.min(total,from+ctx.currentTime-t0):(h._end!=null?h._end:from); }};
    src.onended=()=>{ if(!ended){ ended=true; h._end=total; h.playing=false; live.delete(h); } };
    const o=Math.max(0,Math.min(from,L.length/SR-0.01)); src.start(0,o); live.add(h); return h;
  }
  const api={
    rows, defaults:()=>({mix:{},duck:true}),
    isDefault(s){ const n=norm(s); return n.duck&&!Object.keys(n.mix).length; },
    renderRaw:s=>{ const m=mixRaw(s); return {L:Float32Array.from(m.f64[0]),R:Float32Array.from(m.f64[1]),sampleRate:SR,hasMusic:m.hasMusic}; },   // un-normalised (for the project mix)
    render:s=>new Promise(res=>setTimeout(()=>res(renderSync(s)),0)),
    play(s,from){ const m=mixFor(s); from=from||0; if(from>=D) from=0; return playBuf(m.L,m.R,from,D); },
    solo(id,s){
      const m=st(s,id), row=rows.find(r=>r.id===id); let L,R;
      if(row&&row.kind==='music'){ const n=Math.round(1.5*SR); L=bed.L.slice(0,n); R=bed.R.slice(0,n); }
      else { const k=snds.findIndex(x=>x.id===id), c=clips[k](snds[k].hits[0].level); const n=Math.min(c.L.length,Math.round(1.5*SR)); L=c.L.slice(0,n); R=c.R.slice(0,n); }
      const g=db(m.db); for(let i=0;i<L.length;i++){ L[i]*=g; R[i]*=g; }
      return playBuf(L,R,0,L.length/SR);
    },
    stopAll(){ for(const h of [...live]) h.stop(); },
    duration:D
  };
  return api;
}
window.StudioReelAudio={load,lufs};
})();
