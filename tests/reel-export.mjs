/* Reel export test: exports a small fake reel (3 s, 30 fps, one cut) with real mixed audio, then checks the file with ffprobe/ffmpeg.
   Covers support(), the WebCodecs path (size, frames, duration, audio, loudness, progress), abort (encoders closed) and the recorder fallback.
   Needs ffmpeg + ffprobe. Run: server on :8080 (or BASE=...), then `node tests/reel-export.mjs`. Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import { spawnSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const OUT=process.env.OUT_DIR||'/tmp/claude-0/-home-user-1stChoice-Studio/06e6729b-e4f8-560f-b51f-65d4a41f117c/scratchpad/export/';
fs.mkdirSync(OUT,{recursive:true});
const res=[]; let bad=0;
const ok=(n,c,i)=>{ if(!c) bad++; res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const probe=f=>JSON.parse(spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',f]).stdout.toString()||'{}');
const ebu=f=>{ const r=spawnSync('ffmpeg',['-nostats','-i',f,'-vn','-af','ebur128','-f','null','-'],{encoding:'utf8'}).stderr; const m=[...r.matchAll(/I:\s+(-?[\d.]+) LUFS/g)]; return m.length?+m[m.length-1][1]:NaN; };
const save=(name,b64)=>{ const p=OUT+name; fs.writeFileSync(p,Buffer.from(b64,'base64')); return p; };

const b=await chromium.launch(), pg=await b.newPage(), errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await pg.goto(BASE+'tests/fixtures/reels/audio.html');
const setup=await pg.evaluate(async()=>{
  const base=location.origin+location.pathname.replace(/tests\/.*$/,'')+'brands/1stchoice/reels/winter-cat/';
  const M=await (await fetch(base+'reel.json')).json(), mix=await StudioReelAudio.load(M,base), m=await mix.render(mix.defaults());
  const n=3*48000; window.__audio={L:m.L.slice(0,n),R:m.R.slice(0,n),sampleRate:48000}; window.__lufs=StudioReelAudio.lufs(__audio.L,__audio.R,48000);
  window.__reel={W:1080,H:1920,fps:30,duration:3,cuts:[1.5],draw(ctx,t,o){
    const k=ctx.canvas.width/1080; ctx.save(); ctx.scale(k,k); ctx.fillStyle=t<1.5?'#fff':'#fe0'; ctx.fillRect(0,0,1080,1920);
    ctx.fillStyle='#c33'; ctx.fillRect(100+t*250,800,200,200); ctx.fillStyle='#000'; ctx.font='80px sans-serif'; ctx.fillText((o&&o.texts&&o.texts.t||'')+' f'+Math.round(t*30),100,400); ctx.restore(); }};
  window.__encs=[]; for(const K of ['VideoEncoder','AudioEncoder']){ const O=window[K]; if(!O) continue; window[K]=class extends O{ constructor(i){ super(i); window.__encs.push(this); } }; window[K].isConfigSupported=O.isConfigSupported.bind(O); }
  window.__b64=async blob=>{ const u=new Uint8Array(await blob.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s); };
  return window.__lufs;
});
const sup=await pg.evaluate(()=>StudioReelExport.support()); console.log('support:',JSON.stringify(sup));
ok('support() answers with a mode',['webcodecs','recorder','none'].includes(sup.mode),sup.mode);

if(sup.mode==='webcodecs'){
  const r=await pg.evaluate(async()=>{ const pr=[]; const x=await StudioReelExport.run({reel:__reel,texts:{t:'hi'},audio:__audio,onProgress:(f,i,n)=>pr.push([f,i,n])}); return {mode:x.mode,codec:x.codec,ms:x.ms,frames:x.frames,size:x.blob.size,type:x.blob.type,b64:await __b64(x.blob),np:pr.length,last:pr[pr.length-1],mono:pr.every((p,i)=>!i||p[0]>=pr[i-1][0])}; });
  const f=save('webcodecs.mp4',r.b64), p=probe(f), v=p.streams.find(s=>s.codec_type==='video'), a=p.streams.find(s=>s.codec_type==='audio');
  ok('webcodecs: h264 1080x1920',v&&v.codec_name==='h264'&&v.width===1080&&v.height===1920,v&&[v.codec_name,v.width,v.height].join(' '));
  ok('webcodecs: 90 frames',v&&+v.nb_read_frames===90,v&&v.nb_read_frames);
  ok('webcodecs: duration 3.0 +-0.05',Math.abs(+p.format.duration-3)<0.05,p.format.duration);
  ok('webcodecs: audio 48 kHz 2 ch',a&&+a.sample_rate===48000&&a.channels===2,a&&[a.codec_name,a.sample_rate,a.channels].join(' '));
  const l=ebu(f); ok('webcodecs: loudness ~ input +-1',Math.abs(l-setup)<1,'file '+l+' vs input '+setup.toFixed(2));
  ok('webcodecs: progress reached 1 each frame, monotone',r.last&&r.last[0]===1&&r.np>=90&&r.mono,'calls '+r.np);
  console.log('  webcodecs: '+r.codec+', '+r.ms+' ms, '+(r.size/1e6).toFixed(2)+' MB -> '+f);
  // the cut: no blur across it (frame 44 is before the cut at 1.5 s, 45 after); check pixel colours with ffmpeg
  const px=n=>spawnSync('ffmpeg',['-v','error','-i',f,'-vf',`select=eq(n\\,${n}),crop=2:2:6:6`,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],{encoding:'buffer'}).stdout;
  const p44=px(44), p45=px(45); ok('webcodecs: hard cut stays clean (frame 44 white, 45 yellow)',p44.length===12&&p44[2]>200&&p45.length===12&&p45[2]<80,[...p44].join(',')+' | '+[...p45].join(','));
  // abort mid-way
  const ab=await pg.evaluate(async()=>{ __encs.length=0; const ac=new AbortController(); let name='';
    try{ await StudioReelExport.run({reel:__reel,texts:{},audio:__audio,signal:ac.signal,onProgress:(f,i)=>{ if(i===10) ac.abort(); }}); }catch(e){ name=e.name; }
    await new Promise(r=>setTimeout(r,100)); return {name,states:__encs.map(e=>e.state)}; });
  ok('abort rejects with AbortError',ab.name==='AbortError',ab.name); ok('abort closes every encoder',ab.states.length>0&&ab.states.every(s=>s==='closed'),ab.states.join());
  // no-audio export still works
  const na=await pg.evaluate(async()=>{ const x=await StudioReelExport.run({reel:__reel,texts:{},audio:null,sub:1}); return await __b64(x.blob); });
  const pn=probe(save('webcodecs-noaudio.mp4',na)); ok('webcodecs: no-audio export has video only',pn.streams.length===1&&+pn.streams[0].nb_read_frames===90,pn.streams.map(s=>s.codec_type).join());
}
// recorder fallback (real time: about 3 s)
const rr=await pg.evaluate(async()=>{ try{ const x=await StudioReelExport.run({reel:__reel,texts:{},audio:__audio,force:'recorder'}); return {mode:x.mode,codec:x.codec,ms:x.ms,type:x.blob.type,size:x.blob.size,b64:await __b64(x.blob)}; }catch(e){ return {err:String(e)}; } });
if(rr.err) ok('recorder export',false,rr.err); else {
  const ext=rr.type.includes('mp4')?'mp4':'webm', f=save('recorder.'+ext,rr.b64), p=probe(f);
  const d=+p.format.duration||0, v=p.streams.find(s=>s.codec_type==='video'), a=p.streams.find(s=>s.codec_type==='audio');
  ok('recorder: playable file ~3 s',v&&d>2.5&&d<4,rr.type+', '+rr.codec+', duration '+d+', size '+rr.size);
  ok('recorder: has audio',!!a,a&&a.codec_name);
  console.log('  recorder: '+rr.ms+' ms -> '+f);
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); console.log(bad?bad+' FAILED':'ALL PASSED'); process.exit(bad?1:0);
