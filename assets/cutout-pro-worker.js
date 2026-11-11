/* Cutout Pro worker: logo-grade background removal, off the main thread.
   In:  {id,cmd:'analyse'|'logo'|'photo', bmp:ImageBitmap, opts}   Out: {id,progress}, {id,done}, {id,error}
   Logo mode = classic image maths (no model): ground field -> OKLab distance -> flood/holes -> soft alpha -> colour decontamination.
   Photo mode = U2-Net mask (same vendored model as cutout-worker.js) refined with guided filters + blur-fusion decontamination. */
'use strict';
const BASE=new URL('vendor/cutout/',self.location.href).href, SIZE=320;
const smooth=(a,b,x)=>{ x=(x-a)/(b-a); x=x<0?0:x>1?1:x; return x*x*(3-2*x); };
const LIN=new Float32Array(256); for(let i=0;i<256;i++){ const c=i/255; LIN[i]=c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4); }
const enc=c=>{ c=c<=0?0:c>=1?1:c; return c<=.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-.055; };
const post=(id,m,tr)=>postMessage(Object.assign({id},m),tr||[]);

/* ---------- decode ---------- */
function decode(bmp,maxSide,flatten){
  const w=bmp.width,h=bmp.height,s=Math.min(1,maxSide/Math.max(w,h)),W=Math.max(1,Math.round(w*s)),H=Math.max(1,Math.round(h*s));
  let src=bmp,cw=w,ch=h;
  while(cw>=W*2&&ch>=H*2){ const nw=Math.max(W,cw>>1),nh=Math.max(H,ch>>1),c=new OffscreenCanvas(nw,nh),x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(src,0,0,nw,nh); src=c; cw=nw; ch=nh; }
  const c=new OffscreenCanvas(W,H),x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality='high';
  if(flatten){ x.fillStyle='#fff'; x.fillRect(0,0,W,H); }
  x.drawImage(src,0,0,W,H);
  return {data:x.getImageData(0,0,W,H).data,W,H};
}
/* OKLab planes */
function toLab(d,n){
  const L=new Float32Array(n),A=new Float32Array(n),B=new Float32Array(n);
  for(let i=0,j=0;i<n;i++,j+=4){
    const r=LIN[d[j]],g=LIN[d[j+1]],b=LIN[d[j+2]];
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    L[i]=.2104542553*l+.793617785*m-.0040720468*s; A[i]=1.9779984951*l-2.428592205*m+.4505937099*s; B[i]=.0259040371*l+.7827717662*m-.808675766*s;
  }
  return {L,A,B};
}
function labToRgb(L,a,b,o){ /* -> o[0..2] in 0..1 sRGB */
  const l_=L+.3963377774*a+.2158037573*b,m_=L-.1055613458*a-.0638541728*b,s_=L-.0894841775*a-1.291485548*b,l=l_*l_*l_,m=m_*m_*m_,s=s_*s_*s_;
  o[0]=enc(4.0767416621*l-3.3077115913*m+.2309699292*s); o[1]=enc(-1.2684380046*l+2.6097574011*m-.3413193965*s); o[2]=enc(-.0041960863*l-.7034186147*m+1.707614701*s);
}
const median=a=>{ if(!a.length) return 0; const b=Float32Array.from(a).sort(); return b[b.length>>1]; };
const pct=(a,p)=>{ if(!a.length) return 0; const b=Float32Array.from(a).sort(); return b[Math.min(b.length-1,Math.floor(p*b.length))]; };

/* ---------- ground model: border ring -> robust planes per channel (1 or 2 clusters) ---------- */
function solve3(M,v){ /* M symmetric 3x3 as [a,b,c,d,e,f] = [[a,b,c],[b,d,e],[c,e,f]] */
  const [a,b,c,d,e,f]=M, det=a*(d*f-e*e)-b*(b*f-e*c)+c*(b*e-d*c); if(Math.abs(det)<1e-9) return [v[0]/Math.max(a,1e-9),0,0];
  const i00=(d*f-e*e)/det,i01=(c*e-b*f)/det,i02=(b*e-c*d)/det,i11=(a*f-c*c)/det,i12=(b*c-a*e)/det,i22=(a*d-b*b)/det;
  return [i00*v[0]+i01*v[1]+i02*v[2],i01*v[0]+i11*v[1]+i12*v[2],i02*v[0]+i12*v[1]+i22*v[2]];
}
function fitPlanes(lab,w,h){
  const {L,A,B}=lab,rw=Math.max(1,Math.round(.02*Math.min(w,h))),ring=[];
  const total=w*h-Math.max(0,w-2*rw)*Math.max(0,h-2*rw), stride=Math.max(1,Math.ceil(total/12000)); let k=0;
  for(let y=0;y<h;y++){ const full=y<rw||y>=h-rw; for(let x=0;x<w;x++){ if(!full&&x>=rw&&x<w-rw){ x=w-rw-1; continue; } if((k++)%stride===0) ring.push(y*w+x); } }
  const N=ring.length, xs=new Float32Array(N),ys=new Float32Array(N),cl=[new Float32Array(N),new Float32Array(N),new Float32Array(N)];
  for(let i=0;i<N;i++){ const p=ring[i],x=p%w,y=(p/w)|0; xs[i]=w>1?x/(w-1)*2-1:0; ys[i]=h>1?y/(h-1)*2-1:0; cl[0][i]=L[p]; cl[1][i]=A[p]; cl[2][i]=B[p]; }
  const dist=(i,m)=>{ const x=xs[i],y=ys[i],a=cl[0][i]-(m[0][0]+m[0][1]*x+m[0][2]*y),b=cl[1][i]-(m[1][0]+m[1][1]*x+m[1][2]*y),c=cl[2][i]-(m[2][0]+m[2][1]*x+m[2][2]*y); return Math.sqrt(a*a+b*b+c*c); };
  const fit=idx=>{ let sx=0,sy=0,sxx=0,sxy=0,syy=0,n=idx.length; const v=[[0,0,0],[0,0,0],[0,0,0]];
    for(const i of idx){ const x=xs[i],y=ys[i]; sx+=x; sy+=y; sxx+=x*x; sxy+=x*y; syy+=y*y; for(let c=0;c<3;c++){ const q=cl[c][i]; v[c][0]+=q; v[c][1]+=q*x; v[c][2]+=q*y; } }
    const M=[n,sx,sy,sxx,sxy,syy]; return [0,1,2].map(c=>solve3(M,v[c])); };
  let rest=Array.from({length:N},(_,i)=>i); const models=[];
  for(let kc=0;kc<2&&rest.length>=Math.max(8,.2*N);kc++){
    const g0=[0,1,2].map(c=>median(rest.map(i=>cl[c][i]))), r0=rest.map(i=>Math.hypot(cl[0][i]-g0[0],cl[1][i]-g0[1],cl[2][i]-g0[2])), t0=Math.max(.04,2.5*1.4826*median(r0));
    let S=rest.filter((i,j)=>r0[j]<t0); if(S.length<8) break;
    let m=null; for(let it=0;it<4;it++){ m=fit(S); const rr=rest.map(i=>dist(i,m)), thr=Math.max(.02,2.5*1.4826*median(S.map(q=>dist(q,m)))), inl=rest.filter((i,j)=>rr[j]<=thr); if(inl.length<8) break; S=inl; }
    const spread=pct(S.map(i=>dist(i,m)),.95);
    if(kc===1&&(S.length<.25*N||spread>.05)) break;
    models.push({m,frac:S.length/N,spread}); const set=new Set(S); rest=rest.filter(i=>!set.has(i));
  }
  if(!models.length){ const g=[0,1,2].map(c=>median(cl[c])); models.push({m:g.map(v=>[v,0,0]),frac:0,spread:1}); }
  /* border colour (rgb) for analyse(): the first model at the centre */
  return {models,rw,spread:models[0].spread,coverage:models.reduce((s,q)=>s+q.frac,0)};
}
const planeAt=(m,x,y)=>[m[0][0]+m[0][1]*x+m[0][2]*y,m[1][0]+m[1][1]*x+m[1][2]*y,m[2][0]+m[2][1]*x+m[2][2]*y];

/* min/max box (chebyshev radius r) on a Uint8 mask; op 1 = dilate, 0 = erode */
function morph(m,w,h,r,dil){
  const n=w*h,t=new Uint8Array(n),o=new Uint8Array(n);
  for(let y=0;y<h;y++){ const row=y*w; for(let x=0;x<w;x++){ let v=dil?0:1; const a=Math.max(0,x-r),b=Math.min(w-1,x+r); for(let q=a;q<=b;q++){ const z=m[row+q]; if(dil){ if(z){ v=1; break; } } else if(!z){ v=0; break; } } t[row+x]=v; } }
  for(let y=0;y<h;y++){ const a=Math.max(0,y-r),b=Math.min(h-1,y+r); for(let x=0;x<w;x++){ let v=dil?0:1; for(let q=a;q<=b;q++){ const z=t[q*w+x]; if(dil){ if(z){ v=1; break; } } else if(!z){ v=0; break; } } o[y*w+x]=v; } }
  return o;
}
/* connected components. mask value `val` is labelled; returns {lab,n,area[]} (labels from 1) */
function label(mask,val,w,h,eight){
  const n=w*h,lab=new Int32Array(n),stack=new Int32Array(n),area=[0]; let cnt=0;
  for(let s=0;s<n;s++){
    if(mask[s]!==val||lab[s]) continue; cnt++; let sp=0,a=0; stack[sp++]=s; lab[s]=cnt;
    while(sp){ const p=stack[--sp]; a++; const x=p%w,y=(p/w)|0;
      if(x>0&&mask[p-1]===val&&!lab[p-1]){ lab[p-1]=cnt; stack[sp++]=p-1; }
      if(x<w-1&&mask[p+1]===val&&!lab[p+1]){ lab[p+1]=cnt; stack[sp++]=p+1; }
      if(y>0&&mask[p-w]===val&&!lab[p-w]){ lab[p-w]=cnt; stack[sp++]=p-w; }
      if(y<h-1&&mask[p+w]===val&&!lab[p+w]){ lab[p+w]=cnt; stack[sp++]=p+w; }
      if(eight){
        if(x>0&&y>0&&mask[p-w-1]===val&&!lab[p-w-1]){ lab[p-w-1]=cnt; stack[sp++]=p-w-1; }
        if(x<w-1&&y>0&&mask[p-w+1]===val&&!lab[p-w+1]){ lab[p-w+1]=cnt; stack[sp++]=p-w+1; }
        if(x>0&&y<h-1&&mask[p+w-1]===val&&!lab[p+w-1]){ lab[p+w-1]=cnt; stack[sp++]=p+w-1; }
        if(x<w-1&&y<h-1&&mask[p+w+1]===val&&!lab[p+w+1]){ lab[p+w+1]=cnt; stack[sp++]=p+w+1; }
      } }
    area.push(a); }
  return {lab,n:cnt,area};
}
/* chamfer 3-4 distance (in px) from each pixel to the nearest pixel whose mask value is `val` */
function chamfer(mask,val,w,h){
  const n=w*h,D=new Float32Array(n),INF=1e9; for(let i=0;i<n;i++) D[i]=mask[i]===val?0:INF;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x; let v=D[i]; if(v===0) continue;
    if(x>0){ const t=D[i-1]+3; if(t<v) v=t; } if(y>0){ const t=D[i-w]+3; if(t<v) v=t; if(x>0){ const u=D[i-w-1]+4; if(u<v) v=u; } if(x<w-1){ const u=D[i-w+1]+4; if(u<v) v=u; } } D[i]=v; }
  for(let y=h-1;y>=0;y--) for(let x=w-1;x>=0;x--){ const i=y*w+x; let v=D[i]; if(v===0) continue;
    if(x<w-1){ const t=D[i+1]+3; if(t<v) v=t; } if(y<h-1){ const t=D[i+w]+3; if(t<v) v=t; if(x<w-1){ const u=D[i+w+1]+4; if(u<v) v=u; } if(x>0){ const u=D[i+w-1]+4; if(u<v) v=u; } } D[i]=v; }
  for(let i=0;i<n;i++) D[i]/=3;
  return D;
}

/* ---------- ground field: planes + a coarse residual grid grown from the smooth border-connected region ---------- */
function groundField(lab,w,h,fp,progress){
  const n=w*h,{L,A,B}=lab,gL=new Float32Array(n),gA=new Float32Array(n),gB=new Float32Array(n),models=fp.models;
  const fillPlanes=()=>{ for(let y=0;y<h;y++){ const yn=h>1?y/(h-1)*2-1:0; for(let x=0;x<w;x++){ const xn=w>1?x/(w-1)*2-1:0,i=y*w+x; let bi=0,bd=1e9,bl=0,ba=0,bb=0;
      for(let k=0;k<models.length;k++){ const g=planeAt(models[k].m,xn,yn),dl=L[i]-g[0],da=A[i]-g[1],db=B[i]-g[2],d=dl*dl+da*da+db*db; if(d<bd){ bd=d; bl=g[0]; ba=g[1]; bb=g[2]; } }
      gL[i]=bl; gA[i]=ba; gB[i]=bb; } } };
  fillPlanes();
  if(models.length>1) return {gL,gA,gB,cand:null};
  /* stage 1: smooth, border-connected region (follows soft gradients and uneven light, stops at edges) */
  const pl=models[0].m, cand=new Uint8Array(n), stack=new Int32Array(n); let sp=0;
  const LOOSE=.10, STEP=.025;
  const near=(i)=>Math.hypot(L[i]-gL[i],A[i]-gA[i],B[i]-gB[i])<LOOSE;
  const push=i=>{ if(!cand[i]&&near(i)){ cand[i]=1; stack[sp++]=i; } };
  for(let x=0;x<w;x++){ push(x); push((h-1)*w+x); } for(let y=0;y<h;y++){ push(y*w); push(y*w+w-1); }
  const stp=(i,j)=>Math.hypot(L[i]-L[j],A[i]-A[j],B[i]-B[j])<STEP;
  while(sp){ const p=stack[--sp],x=p%w,y=(p/w)|0;
    if(x>0){ const q=p-1; if(!cand[q]&&near(q)&&stp(p,q)){ cand[q]=1; stack[sp++]=q; } }
    if(x<w-1){ const q=p+1; if(!cand[q]&&near(q)&&stp(p,q)){ cand[q]=1; stack[sp++]=q; } }
    if(y>0){ const q=p-w; if(!cand[q]&&near(q)&&stp(p,q)){ cand[q]=1; stack[sp++]=q; } }
    if(y<h-1){ const q=p+w; if(!cand[q]&&near(q)&&stp(p,q)){ cand[q]=1; stack[sp++]=q; } } }
  const core=morph(cand,w,h,2,false);
  const cs=Math.max(6,Math.ceil(Math.max(w,h)/110)),gw=Math.ceil(w/cs),gh=Math.ceil(h/cs),sum=new Float64Array(gw*gh*3),cnt=new Float64Array(gw*gh);
  for(let y=0;y<h;y++){ const row=y*w,gy=((y/cs)|0)*gw; for(let x=0;x<w;x++){ const i=row+x; if(!core[i]) continue; const c=gy+((x/cs)|0); cnt[c]++; sum[c*3]+=L[i]-gL[i]; sum[c*3+1]+=A[i]-gA[i]; sum[c*3+2]+=B[i]-gB[i]; } }
  const valid=new Uint8Array(gw*gh),res=new Float32Array(gw*gh*3); let nv=0;
  for(let c=0;c<gw*gh;c++) if(cnt[c]>=Math.max(4,cs*cs*.06)){ valid[c]=1; nv++; res[c*3]=sum[c*3]/cnt[c]; res[c*3+1]=sum[c*3+1]/cnt[c]; res[c*3+2]=sum[c*3+2]/cnt[c]; }
  if(nv===0) return {gL,gA,gB,cand:core};
  /* diffuse the residual into empty cells */
  for(let it=0;it<gw+gh&&nv<gw*gh;it++){ const add=[]; for(let gy=0;gy<gh;gy++) for(let gx=0;gx<gw;gx++){ const c=gy*gw+gx; if(valid[c]) continue; let a=0,b=0,d=0,k=0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const X=gx+dx,Y=gy+dy; if(X<0||Y<0||X>=gw||Y>=gh) continue; const q=Y*gw+X; if(valid[q]){ a+=res[q*3]; b+=res[q*3+1]; d+=res[q*3+2]; k++; } }
      if(k) add.push(c,a/k,b/k,d/k); }
    for(let j=0;j<add.length;j+=4){ const c=add[j]; valid[c]=1; nv++; res[c*3]=add[j+1]; res[c*3+1]=add[j+2]; res[c*3+2]=add[j+3]; } }
  /* a light smooth of the residual grid */
  const sm=new Float32Array(res.length); for(let gy=0;gy<gh;gy++) for(let gx=0;gx<gw;gx++){ for(let ch=0;ch<3;ch++){ let a=0,k=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const X=gx+dx,Y=gy+dy; if(X<0||Y<0||X>=gw||Y>=gh) continue; a+=res[(Y*gw+X)*3+ch]; k++; } sm[(gy*gw+gx)*3+ch]=a/k; } }
  for(let y=0;y<h;y++){ const fy=Math.min(gh-1,Math.max(0,y/cs-.5)),y0=Math.floor(fy),y1=Math.min(gh-1,y0+1),ty=fy-y0;
    for(let x=0;x<w;x++){ const fx=Math.min(gw-1,Math.max(0,x/cs-.5)),x0=Math.floor(fx),x1=Math.min(gw-1,x0+1),tx=fx-x0,i=y*w+x;
      const a=(y0*gw+x0)*3,b=(y0*gw+x1)*3,c=(y1*gw+x0)*3,d=(y1*gw+x1)*3,w00=(1-tx)*(1-ty),w10=tx*(1-ty),w01=(1-tx)*ty,w11=tx*ty;
      gL[i]+=sm[a]*w00+sm[b]*w10+sm[c]*w01+sm[d]*w11; gA[i]+=sm[a+1]*w00+sm[b+1]*w10+sm[c+1]*w01+sm[d+1]*w11; gB[i]+=sm[a+2]*w00+sm[b+2]*w10+sm[c+2]*w01+sm[d+2]*w11; } }
  return {gL,gA,gB,cand:core};
}

/* ---------- analyse ---------- */
function analyse(bmp){
  const ow=bmp.width,oh=bmp.height, {data,W,H}=decode(bmp,256,false), n=W*H;
  let tr=0; for(let i=3;i<data.length;i+=4) if(data[i]<250) tr++;
  if(tr/n>.003) return {hasAlpha:true,flat:false,bg:null,suggest:'keep',w:ow,h:oh};
  const lab=toLab(data,n), fp=fitPlanes(lab,W,H), m=fp.models[0].m, c=planeAt(m,0,0), rgb=[0,0,0]; labToRgb(c[0],c[1],c[2],rgb);
  const flat=fp.coverage>=.6&&fp.spread<=.035;
  return {hasAlpha:false,flat,bg:flat||fp.coverage>=.5?rgb.map(v=>Math.round(v*255)):null,suggest:flat?'logo':'photo',w:ow,h:oh};
}

/* ---------- logo mode ---------- */
function logo(bmp,o,id){
  const t=Math.max(0,Math.min(100,o.tolerance==null?50:o.tolerance))/100, holes=o.holes!==false;
  const {data,W,H}=decode(bmp,o.maxSide||2048,true), n=W*H; post(id,{progress:'Finding the ground…'});
  const lab=toLab(data,n),{L,A,B}=lab, fp=fitPlanes(lab,W,H), gf=groundField(lab,W,H,fp), {gL,gA,gB}=gf;
  /* distance to the local ground */
  const d=new Float32Array(n); for(let i=0;i<n;i++){ const a=L[i]-gL[i],b=A[i]-gA[i],c=B[i]-gB[i]; d[i]=Math.sqrt(a*a+b*b+c*c); }
  /* noise floor from the smooth ground region (or the border samples) */
  const hist=new Int32Array(1001); let hn=0; const srcMask=gf.cand;
  for(let i=0;i<n;i+=(n>400000?3:1)){ if(srcMask?!srcMask[i]:false) continue; const b=Math.min(1000,(d[i]*2000)|0); hist[b]++; hn++; }
  let noise=.01; if(hn>50){ let acc=0; for(let b=0;b<=1000;b++){ acc+=hist[b]; if(acc>=.97*hn){ noise=b/2000; break; } } }
  const lo=Math.min(.22,Math.max(.012,1.2*noise)+.05*t), kmin=.03+.15*t*t;
  /* ink mask, specks, ground regions */
  let X=new Uint8Array(n); for(let i=0;i<n;i++) X[i]=d[i]>=lo?1:0;
  post(id,{progress:'Tracing the outline…'});
  const ink=label(X,1,W,H,true), peak=new Float32Array(ink.n+1);
  for(let i=0;i<n;i++){ const k=ink.lab[i]; if(k&&d[i]>peak[k]) peak[k]=d[i]; }
  const minA=Math.max(4,Math.round(5e-6*n)), dustPeak=Math.max(2.4*lo,.1), speck=new Uint8Array(ink.n+1);
  for(let k=1;k<=ink.n;k++) if(ink.area[k]<minA||(peak[k]<dustPeak&&ink.area[k]<minA*10)) speck[k]=1;
  for(let i=0;i<n;i++){ const k=ink.lab[i]; if(k&&speck[k]) X[i]=0; }
  const gr=label(X,0,W,H,false), touch=new Uint8Array(gr.n+1);
  for(let x=0;x<W;x++){ touch[gr.lab[x]]=1; touch[gr.lab[(H-1)*W+x]]=1; } for(let y=0;y<H;y++){ touch[gr.lab[y*W]]=1; touch[gr.lab[y*W+W-1]]=1; }
  const pin=Math.max(3,Math.min(9,Math.round(2e-6*n))); let pins=0;
  for(let i=0;i<n;i++){ const k=gr.lab[i]; if(k&&!touch[k]&&gr.area[k]<=pin){ X[i]=1; pins++; } }
  /* holes: an enclosed ground-coloured region is a counter (cleared) when the ink around it is not much
     thicker than the hole is wide: thick ink around a small hole (white text on a badge) is design and is kept */
  const clear=new Uint8Array(gr.n+1);
  if(holes&&gr.n){
    const dtI=chamfer(X,0,W,H),T=new Float32Array(gr.n+1),Tm=new Float32Array(ink.n+1);
    for(let i=0;i<n;i++){ const k=ink.lab[i]; if(k&&X[i]&&dtI[i]>Tm[k]) Tm[k]=dtI[i]; }
    const par=new Float32Array(gr.n+1);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=y*W+x,g=gr.lab[i]; if(!g||touch[g]||X[i]) continue;
      let q;  if(x>0&&(q=ink.lab[i-1])&&X[i-1]&&Tm[q]>par[g]) par[g]=Tm[q]; if(x<W-1&&(q=ink.lab[i+1])&&X[i+1]&&Tm[q]>par[g]) par[g]=Tm[q];
      if(y>0&&(q=ink.lab[i-W])&&X[i-W]&&Tm[q]>par[g]) par[g]=Tm[q]; if(y<H-1&&(q=ink.lab[i+W])&&X[i+W]&&Tm[q]>par[g]) par[g]=Tm[q]; }
    const dtB=chamfer(X,1,W,H);
    for(let i=0;i<n;i++){ const g=gr.lab[i]; if(g&&!touch[g]&&!X[i]&&dtB[i]>T[g]) T[g]=dtB[i]; }
    const K=4.5; for(let g=1;g<=gr.n;g++) if(!touch[g]&&gr.area[g]>pin&&T[g]*K>=par[g]) clear[g]=1;
  }
  /* ground set = outside + cleared holes */
  const gs=new Uint8Array(n); for(let i=0;i<n;i++){ const g=gr.lab[i]; if(g&&!X[i]&&(touch[g]||clear[g])) gs[i]=1; }
  const band=morph(gs,W,H,2,true);
  /* strongest-ink neighbour (5x5) for the foreground colour reference */
  post(id,{progress:'Cleaning the edges…'});
  const hi=new Int32Array(n); for(let y=0;y<H;y++){ const row=y*W; for(let x=0;x<W;x++){ let bi=row+x,bd=d[bi]; const a=Math.max(0,x-2),b=Math.min(W-1,x+2); for(let q=a;q<=b;q++){ const j=row+q; if(d[j]>bd){ bd=d[j]; bi=j; } } hi[row+x]=bi; } }
  const out=new Uint8ClampedArray(n*4), bg=[0,0,0], kRGB=1.73*kmin;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=y*W+x,j=i*4; let al=1,r=data[j],g=data[j+1],b=data[j+2];
    if(gs[i]) al=0;
    else if(!X[i]) al=1;
    else if(band[i]){
      let bi=hi[i],bd=d[bi]; const y0=Math.max(0,y-2),y1=Math.min(H-1,y+2); for(let q=y0;q<=y1;q++){ const c=hi[q*W+x]; if(d[c]>bd){ bd=d[c]; bi=c; } }
      labToRgb(gL[i],gA[i],gB[i],bg); const fr=data[bi*4]/255,fg=data[bi*4+1]/255,fb=data[bi*4+2]/255,ux=fr-bg[0],uy=fg-bg[1],uz=fb-bg[2];
      const cr=r/255,cg=g/255,cb=b/255,vx=cr-bg[0],vy=cg-bg[1],vz=cb-bg[2],uu=ux*ux+uy*uy+uz*uz,den=Math.max(uu,kRGB*kRGB);
      let p=(vx*ux+vy*uy+vz*uz)/den; p=p<0?0:p>1?1:p;
      /* a pixel that is not a mix of ground and that ink (two inks meeting) is solid */
      const px=vx-p*ux,py=vy-p*uy,pz=vz-p*uz,rho=Math.sqrt(px*px+py*py+pz*pz), s=smooth(.07,.22,rho); al=1-(1-p)*(1-s);
      if(al<.03) al=0;
      else if(al<1){ const k=1/al; r=((cr-(1-al)*bg[0])*k)*255; g=((cg-(1-al)*bg[1])*k)*255; b=((cb-(1-al)*bg[2])*k)*255; if(al<.12){ const m=smooth(.03,.12,al); r=fr*255*(1-m)+r*m; g=fg*255*(1-m)+g*m; b=fb*255*(1-m)+b*m; } }
    } else if(d[i]<kmin) al=Math.max(d[i]/kmin,.35);
    out[j]=r; out[j+1]=g; out[j+2]=b; out[j+3]=al*255+.5;
  }
  return {w:W,h:H,buf:out.buffer,info:{lo,kmin,noise,holes:gr.n,cleared:clear.reduce((a,v)=>a+v,0)}};
}

/* ---------- photo mode ---------- */
let sess=null,loading=null;
async function loadModel(id){
  if(sess) return sess;
  if(!loading) loading=(async()=>{
    importScripts(BASE+'ort.wasm.min.js'); ort.env.wasm.wasmPaths=BASE; ort.env.wasm.numThreads=1; ort.env.wasm.proxy=false; ort.env.wasm.simd=true;
    post(id,{progress:'Loading the model…'});
    const buf=await (await fetch(BASE+'u2netp.onnx')).arrayBuffer();
    sess=await ort.InferenceSession.create(buf,{executionProviders:['wasm'],graphOptimizationLevel:'all'}); return sess; })();
  return loading;
}
function box(src,dst,tmp,w,h,r){
  for(let y=0;y<h;y++){ const row=y*w; let s=0; for(let x=0;x<=Math.min(r,w-1);x++) s+=src[row+x];
    for(let x=0;x<w;x++){ const x0=x-r,x1=x+r,lo=x0<0?0:x0,hi=x1>=w?w-1:x1; tmp[row+x]=s/(hi-lo+1); if(x1+1<w) s+=src[row+x1+1]; if(x0>=0) s-=src[row+x0]; } }
  const col=new Float64Array(w); for(let y=0;y<=Math.min(r,h-1);y++) for(let x=0;x<w;x++) col[x]+=tmp[y*w+x];
  for(let y=0;y<h;y++){ const y0=y-r,y1=y+r,cnt=(y1>=h?h-1:y1)-(y0<0?0:y0)+1,row=y*w; for(let x=0;x<w;x++) dst[row+x]=col[x]/cnt;
    if(y1+1<h){ const q=(y1+1)*w; for(let x=0;x<w;x++) col[x]+=tmp[q+x]; } if(y0>=0){ const q=y0*w; for(let x=0;x<w;x++) col[x]-=tmp[q+x]; } }
}
/* gray guided filter (He et al.) */
function guided(I,P,w,h,r,eps){
  const n=w*h,t=new Float32Array(n),mI=new Float32Array(n),mP=new Float32Array(n),a=new Float32Array(n),b=new Float32Array(n),q=new Float32Array(n);
  box(I,mI,t,w,h,r); box(P,mP,t,w,h,r);
  for(let i=0;i<n;i++) q[i]=I[i]*I[i]; box(q,a,t,w,h,r); /* a = mean(I*I) */
  for(let i=0;i<n;i++) q[i]=I[i]*P[i]; box(q,b,t,w,h,r); /* b = mean(I*P) */
  for(let i=0;i<n;i++){ const v=a[i]-mI[i]*mI[i],c=b[i]-mI[i]*mP[i],A=c/(v+eps); a[i]=A; b[i]=mP[i]-A*mI[i]; }
  box(a,mI,t,w,h,r); box(b,mP,t,w,h,r);
  const o=new Float32Array(n); for(let i=0;i<n;i++){ const v=mI[i]*I[i]+mP[i]; o[i]=v<0?0:v>1?1:v; } return o;
}
function gray(data,n){ const g=new Float32Array(n); for(let i=0,j=0;i<n;i++,j+=4) g[i]=(.299*data[j]+.587*data[j+1]+.114*data[j+2])/255; return g; }
async function photo(bmp,o,id){
  const s=await loadModel(id); post(id,{progress:'Finding the edges…'});
  const {data,W,H}=decode(bmp,o.maxSide||2048,true), n=W*H;
  /* coarse mask */
  const c=new OffscreenCanvas(SIZE,SIZE),x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality='high'; x.drawImage(bmp,0,0,SIZE,SIZE);
  const cd=x.getImageData(0,0,SIZE,SIZE).data,m=SIZE*SIZE,tt=new Float32Array(3*m),mean=[.485,.456,.406],sd=[.229,.224,.225];
  for(let i=0;i<m;i++) for(let k=0;k<3;k++) tt[k*m+i]=(cd[i*4+k]/255-mean[k])/sd[k];
  const out=await s.run({[s.inputNames[0]]:new ort.Tensor('float32',tt,[1,3,SIZE,SIZE])}), raw=out[s.outputNames[0]].data;
  let lo=Infinity,hi=-Infinity; for(let i=0;i<m;i++){ if(raw[i]<lo) lo=raw[i]; if(raw[i]>hi) hi=raw[i]; }
  const mc=new OffscreenCanvas(SIZE,SIZE),mx=mc.getContext('2d'),mi=mx.createImageData(SIZE,SIZE);
  for(let i=0;i<m;i++){ const v=Math.round(255*(raw[i]-lo)/(hi-lo||1)); mi.data[i*4]=mi.data[i*4+1]=mi.data[i*4+2]=v; mi.data[i*4+3]=255; } mx.putImageData(mi,0,0);
  post(id,{progress:'Refining the outline…'});
  /* working size <= 1024: upsample the mask, snap it to image edges with a guided filter */
  const sc=Math.min(1,1024/Math.max(W,H)),ww=Math.max(1,Math.round(W*sc)),wh=Math.max(1,Math.round(H*sc)),wn=ww*wh;
  const wc=new OffscreenCanvas(ww,wh),wx=wc.getContext('2d',{willReadFrequently:true}); wx.imageSmoothingQuality='high';
  const fullC=new OffscreenCanvas(W,H),fx=fullC.getContext('2d'); fx.putImageData(new ImageData(new Uint8ClampedArray(data),W,H),0,0);
  wx.drawImage(fullC,0,0,ww,wh); const wd=wx.getImageData(0,0,ww,wh).data;
  wx.drawImage(mc,0,0,ww,wh); const md=wx.getImageData(0,0,ww,wh).data;
  const P=new Float32Array(wn); for(let i=0;i<wn;i++) P[i]=md[i*4]/255;
  const G=gray(wd,wn),r1=Math.max(4,Math.round(Math.max(ww,wh)/70));
  let al=guided(G,P,ww,wh,r1,.004); al=guided(G,al,ww,wh,Math.max(2,r1>>1),.0008);
  for(let i=0;i<wn;i++) al[i]=smooth(.3,.7,al[i]);
  /* drop stray blobs, fill small pinholes */
  const bin=new Uint8Array(wn); for(let i=0;i<wn;i++) bin[i]=al[i]>.5?1:0;
  const cc=label(bin,1,ww,wh,true); let big=0; for(let k=1;k<=cc.n;k++) if(cc.area[k]>big) big=cc.area[k];
  const keep=new Uint8Array(wn); for(let i=0;i<wn;i++){ const k=cc.lab[i]; if(k&&cc.area[k]>=.08*big) keep[i]=1; }
  const keepD=morph(keep,ww,wh,Math.max(2,r1>>1),true); for(let i=0;i<wn;i++) if(!keepD[i]) al[i]=0;
  const gh=label(bin,0,ww,wh,false),tch=new Uint8Array(gh.n+1);
  for(let x=0;x<ww;x++){ tch[gh.lab[x]]=1; tch[gh.lab[(wh-1)*ww+x]]=1; } for(let y=0;y<wh;y++){ tch[gh.lab[y*ww]]=1; tch[gh.lab[y*ww+ww-1]]=1; }
  for(let i=0;i<wn;i++){ const k=gh.lab[i]; if(k&&!tch[k]&&gh.area[k]<.0015*wn&&keepD[i]) al[i]=1; }
  /* up to full size, then a small full-resolution guided pass */
  let fa;
  if(sc<1){ const ac=new OffscreenCanvas(ww,wh),ax=ac.getContext('2d'),ai=ax.createImageData(ww,wh); for(let i=0;i<wn;i++){ const v=Math.round(al[i]*255); ai.data[i*4]=ai.data[i*4+1]=ai.data[i*4+2]=v; ai.data[i*4+3]=255; } ax.putImageData(ai,0,0);
    const bc=new OffscreenCanvas(W,H),bx=bc.getContext('2d',{willReadFrequently:true}); bx.imageSmoothingQuality='high'; bx.drawImage(ac,0,0,W,H); const bd=bx.getImageData(0,0,W,H).data; fa=new Float32Array(n); for(let i=0;i<n;i++) fa[i]=bd[i*4]/255; }
  else fa=al;
  fa=guided(gray(data,n),fa,W,H,Math.max(2,Math.round(Math.max(W,H)/600)),.0012);
  for(let i=0;i<n;i++) fa[i]=smooth(.1,.9,fa[i]);
  post(id,{progress:'Cleaning the edges…'});
  /* blur-fusion foreground estimate (removes the old ground colour from edge pixels) */
  const R=Math.max(3,Math.round(Math.max(W,H)/260)),t=new Float32Array(n),w1=new Float32Array(n),w0=new Float32Array(n),bw1=new Float32Array(n),bw0=new Float32Array(n);
  for(let i=0;i<n;i++){ w1[i]=fa[i]*fa[i]; w0[i]=(1-fa[i])*(1-fa[i]); } box(w1,bw1,t,W,H,R); box(w0,bw0,t,W,H,R);
  const res=new Uint8ClampedArray(n*4), src=new Float32Array(n), bb=new Float32Array(n), fb=new Float32Array(n);
  for(let ch=0;ch<3;ch++){
    for(let i=0;i<n;i++) src[i]=data[i*4+ch]/255*w1[i]; box(src,fb,t,W,H,R);
    for(let i=0;i<n;i++) src[i]=data[i*4+ch]/255*w0[i]; box(src,bb,t,W,H,R);
    for(let i=0;i<n;i++){ const a=fa[i],C=data[i*4+ch]/255; let F=C; if(a<.995){ const F0=bw1[i]>1e-4?fb[i]/bw1[i]:C,B0=bw0[i]>1e-4?bb[i]/bw0[i]:C; F=F0+a*(C-a*F0-(1-a)*B0); F=F<0?0:F>1?1:F; if(a<.08) F=F0; } res[i*4+ch]=F*255; } }
  for(let i=0;i<n;i++) res[i*4+3]=fa[i]*255+.5;
  return {w:W,h:H,buf:res.buffer};
}

onmessage=async e=>{
  const {id,cmd,bmp,opts}=e.data;
  try{
    let r;
    if(cmd==='analyse') r=analyse(bmp);
    else if(cmd==='logo'){ r=logo(bmp,opts||{},id); }
    else if(cmd==='photo'){ r=await photo(bmp,opts||{},id); }
    else if(cmd==='warm'){ await loadModel(id); r={ready:true}; }
    bmp&&bmp.close&&bmp.close();
    post(id,{done:r},r&&r.buf?[r.buf]:[]);
  }catch(err){ post(id,{error:String(err&&err.message||err)}); }
};
