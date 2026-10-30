/* Reel audio test: mixes winter-cat in the browser and compares it with the owner's reference mixes (python script output).
   Checks loudness, peak, envelope/sample correlation, the music silence, ducking, mute, gain, isDefault and determinism.
   Run: server on :8080 (or BASE=...), then `node tests/reel-audio.mjs`. Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
import vm from 'vm';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const here=p=>new URL(p,import.meta.url).pathname;
const res=[]; let bad=0;
const ok=(n,c,i)=>{ if(!c) bad++; res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
// the same loudness code, run in Node
const ctx={window:{},Math,Float64Array,Float32Array,Uint8Array}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(here('../assets/reel-audio.js'),'utf8'),ctx); const NodeAudio=ctx.window.StudioReelAudio;
function readWav(f){ const b=fs.readFileSync(f); let p=12,fmt,data; while(p<b.length){ const id=b.toString('ascii',p,p+4), n=b.readUInt32LE(p+4); if(id==='fmt ') fmt=b.subarray(p+8,p+8+n); if(id==='data'){ data=b.subarray(p+8,p+8+n); break; } p+=8+n+(n&1); }
  const ch=fmt.readUInt16LE(2), N=data.length/2/ch, L=new Float32Array(N), R=new Float32Array(N); for(let i=0;i<N;i++){ L[i]=data.readInt16LE(i*2*ch)/32768; R[i]=data.readInt16LE(i*2*ch+2*(ch-1))/32768; } return {L,R}; }
const b64=f=>Buffer.from(f.buffer,f.byteOffset,f.byteLength).toString('base64');
const unb64=s=>{ const b=Buffer.from(s,'base64'); return new Float32Array(b.buffer,b.byteOffset,b.length/4); };
const rms=(x,a,b)=>{ let s=0; a=Math.round(a*48000); b=Math.round(b*48000); for(let i=a;i<b;i++) s+=x[i]*x[i]; return Math.sqrt(s/(b-a)); };
const dbf=v=>20*Math.log10(v+1e-12);
const pearson=(a,b)=>{ const n=Math.min(a.length,b.length); let ma=0,mb=0; for(let i=0;i<n;i++){ ma+=a[i]; mb+=b[i]; } ma/=n; mb/=n; let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ const x=a[i]-ma,y=b[i]-mb; sab+=x*y; saa+=x*x; sbb+=y*y; } return sab/Math.sqrt(saa*sbb); };
const env20=x=>{ const w=960, o=[]; for(let i=0;i+w<=x.length;i+=w) o.push(rms(x,i/48000,(i+w)/48000)); return o; };
const mono=m=>{ const o=new Float32Array(m.L.length); for(let i=0;i<o.length;i++) o[i]=(m.L[i]+m.R[i])/2; return o; };
const cmp=(name,mine,ref)=>{ const e=pearson(env20(mono(mine)),env20(mono(ref))), r=pearson(mono(mine),mono(ref));
  ok(name+' envelope correlation >= 0.97',e>=0.97,e.toFixed(4)); ok(name+' sample correlation >= 0.9',r>=0.9,r.toFixed(4)); };

const refM=readWav(here('./fixtures/reels/winter_cat_MUSIC_mix.wav')), refS=readWav(here('./fixtures/reels/winter_cat_SFX-only_mix.wav'));
console.log('reference LUFS (same algorithm): music mix',NodeAudio.lufs(refM.L,refM.R,48000).toFixed(2),' sfx-only',NodeAudio.lufs(refS.L,refS.R,48000).toFixed(2));

const b=await chromium.launch(), pg=await b.newPage(), errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(BASE+'tests/fixtures/reels/audio.html');
await pg.evaluate(async()=>{
  const base=location.origin+location.pathname.replace(/tests\/.*$/,'')+'brands/1stchoice/reels/winter-cat/';
  const M=await (await fetch(base+'reel.json')).json();
  window.__M=M; window.__mix=await StudioReelAudio.load(M,base);
  window.__r=async s=>{ const m=await __mix.render(s); const f=a=>{ let t=''; const u=new Uint8Array(a.buffer); for(let i=0;i<u.length;i+=8192) t+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(t); }; return {L:f(m.L),R:f(m.R),lufs:m.lufs,peakDb:m.peakDb,n:m.L.length,sr:m.sampleRate}; };
});
const get=async s=>{ const r=await pg.evaluate(s=>__r(s),s); return {L:unb64(r.L),R:unb64(r.R),lufs:r.lufs,peakDb:r.peakDb,n:r.n}; };
const mute=ids=>({mix:Object.fromEntries(ids.map(i=>[i,{db:0,mute:true}])),duck:true});
const rows=await pg.evaluate(()=>__mix.rows.map(r=>r.id+':'+r.kind+':'+r.hits.length+(r.duck?':duck':'')));
ok('rows: music first, 18 sounds',rows[0].startsWith('music:music')&&rows.length===19,rows.join(' '));

const d=await get(undefined);
ok('length 480000',d.n===480000,d.n); ok('lufs -14 +-0.3',Math.abs(d.lufs+14)<0.3,d.lufs.toFixed(2)); ok('peak <= -1.4 dBFS',d.peakDb<=-1.4,d.peakDb.toFixed(2));
cmp('music mix',d,refM);
const sfxIds=await pg.evaluate(()=>__mix.rows.filter(r=>r.kind==='sound').map(r=>r.id));
const nm=await get(mute(['music']));
ok('music muted lufs ~ -16',Math.abs(nm.lufs+16)<0.3,nm.lufs.toFixed(2)); cmp('sfx only',nm,refS);
const sil=await get(mute(sfxIds)); ok('all sounds muted: 4.2-4.85 s silent (< -60 dBFS)',dbf(rms(sil.L,4.2,4.85))<-60,dbf(rms(sil.L,4.2,4.85)).toFixed(1));
const nd=await get({mix:Object.fromEntries(sfxIds.filter(i=>i!=='hood').map(i=>[i,{mute:true}])),duck:false});
const yd=await get({mix:Object.fromEntries(sfxIds.filter(i=>i!=='hood').map(i=>[i,{mute:true}])),duck:true});
// loudness master changes with the mix, so compare the music share only: same settings, duck on/off, hero hood only
const ed=dbf(rms(yd.L,0.9,1.3)), en=dbf(rms(nd.L,0.9,1.3));
ok('duck:false keeps more energy around the hood slap',en>ed-0.0001&&en!==ed,'duck off '+en.toFixed(2)+' dB vs on '+ed.toFixed(2)+' dB');
const w=await get(undefined), nh=await get(mute(['hood']));
ok('mute hood lowers 0.9-1.1 s',rms(nh.L,0.9,1.1)<rms(w.L,0.9,1.1),dbf(rms(nh.L,0.9,1.1)).toFixed(1)+' < '+dbf(rms(w.L,0.9,1.1)).toFixed(1));
const dg=await get({mix:{ding:{db:6}},duck:true});
ok('ding +6 dB raises 3.5-3.7 s',rms(dg.L,3.5,3.7)>rms(w.L,3.5,3.7),dbf(rms(dg.L,3.5,3.7)).toFixed(1)+' > '+dbf(rms(w.L,3.5,3.7)).toFixed(1));
const flags=await pg.evaluate(()=>[__mix.isDefault(__mix.defaults()),__mix.isDefault(undefined),__mix.isDefault({mix:{hood:{db:0,mute:false}},duck:true}),__mix.isDefault({mix:{hood:{db:-3}}}),__mix.isDefault({mix:{},duck:false}),__mix.isDefault({mix:{hood:{mute:true}},duck:true})]);
ok('isDefault',JSON.stringify(flags)==='[true,true,true,false,false,false]',flags.join());
const again=await get(undefined); let same=true; for(let i=0;i<again.L.length;i++) if(again.L[i]!==d.L[i]||again.R[i]!==d.R[i]){ same=false; break; }
ok('two renders identical',same);
const pl=await pg.evaluate(async()=>{ const h=__mix.play(__mix.defaults(),1); await new Promise(r=>setTimeout(r,300)); const p=h.position(), pl=h.playing; __mix.stopAll(); return {p,pl,after:h.playing}; }).catch(e=>({err:String(e)}));
ok('play() starts and stopAll() stops it',pl.pl===true&&pl.after===false&&pl.p>=0.9,JSON.stringify(pl));
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
console.log(res.join('\n')); console.log(bad?bad+' FAILED':'ALL PASSED'); process.exit(bad?1:0);
