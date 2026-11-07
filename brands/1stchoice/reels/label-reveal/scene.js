/* New label reveal: canvas-2D port of source/label_reveal.html (DOM + SVG, window.seek(t)). Same timing, same springs and easings,
   same cuts. Every frame is a pure function of t (the stop-motion jitter uses the same seeded hash as the original).
   Port notes (CSS/SVG feature -> canvas):
   - CSS mask-image linear-gradient on the scribble wipes -> picture drawn into a layer, then 'destination-in' with a gradient
   - SVG <mask> with a feTurbulence-displaced circle (the scribble "rubbing off" the kumma) -> feTurbulence (seed 4, 0.03, 2 octaves)
     ported from the SVG spec, its displacement field computed once in photo coordinates; the hole is rubbed out of the scribble layer
   - clip-path circle() on the fireworks -> clip to an arc (radius % of sqrt((w^2+h^2)/2) like CSS)
   - masked word-rise text (overflow:hidden masks, 110% translate, stagger) -> one clip per word, laid out like the DOM line
   - crayon-red word fill (background-clip:text) -> createPattern fill (cover-sized to the same box) over a white copy of the glyphs
   - object-fit:cover -> computed crop; box-shadow -> shadow of a layer. */
(function(){
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, eo5=x=>1-Math.pow(1-x,5);
function spring(t,z=0.72,w=16){ if(t<=0) return 0; const wd=w*Math.sqrt(1-z*z); return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t)); }
function rnd(i){ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); }
const RAD=Math.PI/180, INK='#161210', PADX=6, PADB=16, LH=1.12;

/* CSS transform list about the transform-origin (ox,oy): ['t',x,y] translate, ['s',sx,sy?] scale, ['r',deg] rotate, applied in the order written */
function xf(c,ox,oy,ops){ c.translate(ox,oy); for(const o of ops){ if(o[0]==='t') c.translate(o[1],o[2]); else if(o[0]==='s') c.scale(o[1],o[2]==null?o[1]:o[2]); else c.rotate(o[1]*RAD); } c.translate(-ox,-oy); }
function cover(c,im,x,y,w,h){ const s=Math.max(w/im.naturalWidth,h/im.naturalHeight), sw=w/s, sh=h/s; c.drawImage(im,(im.naturalWidth-sw)/2,(im.naturalHeight-sh)/2,sw,sh,x,y,w,h); }
function blit(c,L){ c.save(); c.setTransform(1,0,0,1,0,0); c.drawImage(L.canvas,0,0); c.restore(); }
function rrect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
/* the dark shades over the photos: linear-gradient(to bottom, rgba(12,9,7,.7), rgba(12,9,7,0)) */
function shadeTop(c,a){ const g=c.createLinearGradient(0,0,0,760); g.addColorStop(0,'rgba(12,9,7,'+a+')'); g.addColorStop(1,'rgba(12,9,7,0)'); c.fillStyle=g; c.fillRect(0,0,1080,760); }
function shadeBottom(c,a){ const g=c.createLinearGradient(0,1920,0,1220); g.addColorStop(0,'rgba(12,9,7,'+a+')'); g.addColorStop(1,'rgba(12,9,7,0)'); c.fillStyle=g; c.fillRect(0,1220,1080,700); }

/* ---------- feTurbulence (SVG 1.1 reference algorithm), used for the rubbed-out hole ---------- */
const RM=2147483647, RA=16807, RQ=127773, RR=2836, BS=256, BM=255, PN=4096;
const nextSeed=s=>{ const r=RA*(s%RQ)-RR*Math.floor(s/RQ); return r<=0?r+RM:r; };
function turbInit(seed){
  const lat=new Int32Array(BS+BS+2), grad=[0,1,2,3].map(()=>new Float64Array((BS+BS+2)*2));
  let s=seed; if(s<=0) s=-(s%(RM-1))+1; if(s>RM-1) s=RM-1;
  let i,j,k;
  for(k=0;k<4;k++) for(i=0;i<BS;i++){ lat[i]=i;
    for(j=0;j<2;j++){ s=nextSeed(s); grad[k][i*2+j]=((s%(BS+BS))-BS)/BS; }
    const n=Math.hypot(grad[k][i*2],grad[k][i*2+1]); grad[k][i*2]/=n; grad[k][i*2+1]/=n; }
  i=BS; while(--i){ k=lat[i]; s=nextSeed(s); j=s%BS; lat[i]=lat[j]; lat[j]=k; }
  for(i=0;i<BS+2;i++){ lat[BS+i]=lat[i]; for(k=0;k<4;k++) for(j=0;j<2;j++) grad[k][(BS+i)*2+j]=grad[k][i*2+j]; }
  return {lat,grad};
}
function noise2(P,ch,vx,vy){
  let t=vx+PN; const bx0=(t|0)&BM, bx1=(bx0+1)&BM, rx0=t-(t|0), rx1=rx0-1;
  t=vy+PN; const by0=(t|0)&BM, by1=(by0+1)&BM, ry0=t-(t|0), ry1=ry0-1;
  const i=P.lat[bx0], j=P.lat[bx1], b00=P.lat[i+by0], b10=P.lat[j+by0], b01=P.lat[i+by1], b11=P.lat[j+by1], g=P.grad[ch];
  const sx=rx0*rx0*(3-2*rx0), sy=ry0*ry0*(3-2*ry0);
  let u=rx0*g[b00*2]+ry0*g[b00*2+1], v=rx1*g[b10*2]+ry0*g[b10*2+1]; const a=u+sx*(v-u);
  u=rx0*g[b01*2]+ry1*g[b01*2+1]; v=rx1*g[b11*2]+ry1*g[b11*2+1]; const b=u+sx*(v-u);
  return a+sy*(b-a);
}
const fractal=(P,ch,x,y,f,oct)=>{ let sum=0, vx=x*f, vy=y*f, ratio=1; for(let o=0;o<oct;o++){ sum+=noise2(P,ch,vx,vy)/ratio; vx*=2; vy*=2; ratio*=2; } return sum; };

/* the hole lives in the photo's coordinates, inside the scribble's box (x 80..1000, y 930..1707), sampled every 2 px */
const HX=80, HY=930, HW=920, HH=777, HS=2, HC=[452,1132], GW=HW/HS, GH=Math.ceil(HH/HS);
let FX=null, FY=null, holeCv=null, holeCx=null, holeImg=null, holeKey=null;
function holeSetup(){
  const P=turbInit(4); FX=new Float32Array(GW*GH); FY=new Float32Array(GW*GH);
  for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const x=HX+i*HS+HS/2, y=HY+j*HS+HS/2;
    const xc=clamp((fractal(P,0,x,y,0.03,2)+1)/2), yc=clamp((fractal(P,1,x,y,0.03,2)+1)/2);   // fractalNoise R and G, as feDisplacementMap reads them
    FX[j*GW+i]=70*(xc-0.5); FY[j*GW+i]=70*(yc-0.5); }
  holeCv=document.createElement('canvas'); holeCv.width=GW; holeCv.height=GH; holeCx=holeCv.getContext('2d'); holeImg=holeCx.createImageData(GW,GH);
}
/* canvas of the hole at radius r: alpha 1 where the displaced circle is (feDisplacementMap: pixel q shows the circle at q + D(q)), only inside the filter region (+-1.6 r) */
function holeMask(r){
  const key=r.toFixed(1); if(key===holeKey) return holeCv; holeKey=key;
  const d=holeImg.data, cx=HC[0], cy=HC[1], lim=1.6*r;
  for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const k=j*GW+i, x=HX+i*HS+HS/2, y=HY+j*HS+HS/2; let a=0;
    if(r>0&&Math.abs(x-cx)<=lim&&Math.abs(y-cy)<=lim){ const g=Math.hypot(x+FX[k]-cx,y+FY[k]-cy)-r; a=clamp(0.5-g/HS); }
    d[k*4+3]=Math.round(a*255); }
  holeCx.putImageData(holeImg,0,0); return holeCv;
}

/* ---------- words: laid out like the DOM line (inline-block masks padded 0 6px 16px, one space between, centred in 1080) ---------- */
const sizeOf=font=>parseFloat((/(\d+(?:\.\d+)?)px/.exec(font)||[0,100])[1]);
const splitDots=s=>{ const m=/^(.*?)([.…]+)$/.exec(s); return m?[m[1],m[2]]:[s,'']; };
/* U+0020 comes from Cairo Latin in the original (Lalezar's face is Arabic-only), so spaces are measured there */
function spaceW(c,fs){ c.save(); c.font='800 '+fs+'px "Reel Cairo Latin"'; const w=c.measureText(' ').width; c.restore(); return w; }
/* the font metrics the browser rounds to whole pixels */
function fm(c,font){ c.save(); c.font=font; const m=c.measureText('Hg'); c.restore(); return [Math.round(m.fontBoundingBoxAscent),Math.round(m.fontBoundingBoxDescent)]; }
function tokensOf(id,value){
  const v=String(value).trim(); if(!v) return [];
  if(id==='flavours'){ const k=v.indexOf('/');
    if(k>=0){ const out=[], a=v.slice(0,k).trim(), b=v.slice(k+1).trim(); a.split(/\s+/).filter(Boolean).forEach(s=>out.push({s})); out.push({s:'/'}); if(b) out.push({s:b,red:'all'}); return out; } }
  const out=v.split(/\s+/).map(s=>({s}));
  if(id==='reveal2') out[out.length-1].red='letters';
  return out;
}
/* a token is drawn as pieces in logical order: [letters, dots] for the red last word, [word, space, word...] for text after "/" */
function piecesOf(c,tk,sp){
  let parts; if(tk.red==='letters'){ const [a,b]=splitDots(tk.s); parts=[]; if(a) parts.push({s:a,w:c.measureText(a).width,red:true}); if(b) parts.push({s:b,w:c.measureText(b).width}); }
  else if(/\s/.test(tk.s)){ parts=[]; tk.s.split(/(\s+)/).forEach(s=>{ if(!s) return; parts.push(/\s/.test(s)?{s:'',w:sp*s.length}:{s,w:c.measureText(s).width}); }); }
  else parts=[{s:tk.s,w:c.measureText(tk.s).width}];
  return {parts,w:parts.reduce((a,p)=>a+p.w,0)};
}
function lineWidth(c,id,value){
  const fs=sizeOf(c.font), sp=spaceW(c,fs), tk=tokensOf(id,value); if(!tk.length) return 0;
  return tk.reduce((a,t)=>a+piecesOf(c,t,sp).w+PADX*2,0)+(tk.length-1)*sp;
}
const wordCount=(R,id)=>R.text[id]?tokensOf(id,R.text[id].value).length:0;
/* the crayon texture as a fill, cover-sized to the box (bx,by,bw,bh) like background:center/cover */
let crayonPat=null;
function crayon(c,im,bx,by,bw,bh){
  if(!crayonPat) crayonPat=c.createPattern(im,'no-repeat');
  const s=Math.max(bw,bh)/im.naturalWidth; crayonPat.setTransform(new DOMMatrix([s,0,0,s,bx+bw/2-im.naturalWidth*s/2,by+bh/2-im.naturalHeight*s/2])); return crayonPat;
}
/* one line of masked rising words. o: {top, color, t0, step, dur, out, idx0, red:true if red words fill with crayon} */
function words(c,R,id,t,o){
  const H=R.text[id]; if(!H) return; const tk=tokensOf(id,H.value); if(!tk.length) return;
  const fs=sizeOf(H.font), lh=fs*LH;
  c.save(); c.font=H.font; c.direction=H.dir; c.textAlign='left'; c.textBaseline='alphabetic';
  /* the line is set in Cairo's metrics (the first family with a face for the space): baseline = ascent + floor(half-leading) */
  const [A,D]=fm(c,'800 '+fs+'px "Reel Cairo Latin"'), sp=spaceW(c,fs);
  const base=A+Math.floor((lh-(A+D))/2), cy=o.top+lh/2, rtl=H.dir==='rtl';
  const P=tk.map(k=>piecesOf(c,k,sp)), total=P.reduce((a,p)=>a+p.w+PADX*2,0)+(tk.length-1)*sp;
  c.translate(540,cy); c.scale(H.fit,H.fit); c.translate(-540,-cy);
  let x=rtl?540+total/2:540-total/2;
  tk.forEach((k,i)=>{
    const bw=P[i].w+PADX*2, left=rtl?x-bw:x; x=rtl?left-sp:left+bw+sp;
    const p=eo5(seg(t,o.t0+(o.idx0+i)*o.step,o.t0+(o.idx0+i)*o.step+o.dur)); let y=(1-p)*110;
    if(o.out!=null) y-=eio(seg(t,o.out,o.out+0.22))*110;
    const dy=y/100*lh;
    c.save(); c.beginPath(); c.rect(left,o.top,bw,lh+PADB); c.clip();
    c.translate(0,dy);
    let px=rtl?left+bw-PADX:left+PADX;                      // pieces run right to left (rtl) or left to right
    P[i].parts.forEach(pc=>{
      const x0=rtl?px-pc.w:px; px=rtl?px-pc.w:px+pc.w; if(!pc.s) return;
      const red=k.red==='all'||pc.red;
      if(red){
        if(pc.red&&k.red==='letters'){ c.fillStyle=o.color; c.fillText(pc.s,x0,o.top+base); c.fillStyle=crayon(c,R.img.crayon,x0,o.top,pc.w,lh); }
        else c.fillStyle=crayon(c,R.img.crayon,x0,o.top+base-A,P[i].w,A+D);
      } else c.fillStyle=o.color;
      c.fillText(pc.s,x0,o.top+base);
    });
    c.restore();
  });
  c.restore();
}
/* a single centred text (the sticker and the button): fit shrinks it about its centre */
function single(c,R,id,cx,cy,base,color,alpha){
  const H=R.text[id]; if(!H||!String(H.value).trim()) return;
  c.save(); c.font=H.font; c.direction=H.dir; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=color;
  const w=c.measureText(H.value).width; c.translate(cx,cy); c.scale(H.fit,H.fit); c.translate(-cx,-cy); c.fillText(H.value,cx-w/2,base); c.restore();
}
/* fireworks burst: scale + spin + clip-path circle() */
function burst(c,im,left,top,w,t0,t){
  const h=w*im.naturalHeight/im.naturalWidth, p=seg(t,t0,t0+0.55), s=0.35+0.7*eo(p), o=clamp(p*4), r=t>t0?(t-t0)*6:0;
  if(o<=0) return; const cx=left+w/2, cy=top+h/2, ref=Math.sqrt((w*w+h*h)/2);
  c.save(); c.globalAlpha=o; xf(c,cx,cy,[['s',s],['r',r]]);
  c.beginPath(); c.arc(cx,cy,(8+92*eo(p))/100*ref,0,Math.PI*2); c.clip(); c.drawImage(im,left,top,w,h); c.restore();
}

const NATW=(im,w)=>w*im.naturalHeight/im.naturalWidth;

StudioReel.scene({
  id:'label-reveal',
  setup(){ holeSetup(); },
  /* width of a headline line as laid out (the engine turns it into the fit) */
  measure(id,value,c){
    if(id==='badge'||id==='button') return c.measureText(value).width;
    return lineWidth(c,id,value);
  },

  draw(ctx,t,R){
    const I=R.img;

    /* ---------- A: the crayon cat drops in (0 - 2.61) ---------- */
    if(t<2.61){
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,1080,1920);
      ctx.drawImage(I.band,0,1290,1080,NATW(I.band,1080));
      ctx.save(); xf(ctx,540,788+760*227/1200/2,[['s',1+0.02*Math.sin(t*2)]]); ctx.drawImage(I.logo,160,788,760,760*227/1200); ctx.restore();
      const f=spring(t-0.75,0.6,18);
      if(f>0){ const fh=NATW(I.flag,230); ctx.save(); xf(ctx,735+0.04*230,1480+0.2*fh,[['s',f],['r',-4+4*Math.sin(t*5)]]); ctx.drawImage(I.flag,735,1480,230,fh); ctx.restore(); }
      const d=spring(t-0.08,0.72,13), sw=t>0.7?3.2*Math.sin((t-0.7)*4.2)*Math.exp(-(t-0.7)*0.6):0;
      ctx.save(); xf(ctx,540,-30,[['t',0,(1-d)*-560],['r',sw]]);
      ctx.translate(0,-30+NATW(I.cat,420)/2); ctx.scale(1,-1); ctx.translate(0,-(-30+NATW(I.cat,420)/2));   // the img is flipped about its own centre
      ctx.drawImage(I.cat,330,-30,420,NATW(I.cat,420)); ctx.restore();
    }

    /* ---------- B: black scribble wipe over A (1.4 - 2.61) ---------- */
    if(t>=1.4&&t<2.61){
      const sh=2100*760/900, W=2100;
      [[-500,-300,-18,'r',eio(seg(t,1.43,1.73))],[-520,520,14,'l',eio(seg(t,1.69,1.99))],[-480,1150,-8,'r',eio(seg(t,1.95,2.29))]].forEach(([l,tp,deg,dir,p])=>{
        const a=-12+124*p, L=R.layer('scrib');
        L.save(); xf(L,l+W/2,tp+sh/2,[['r',deg]]);
        L.drawImage(I.scrib,l,tp,W,sh);
        const x0=dir==='r'?l+W*a/100:l+W-W*a/100, x1=dir==='r'?l+W*(a+12)/100:l+W-W*(a+12)/100;
        const g=L.createLinearGradient(x0,0,x1,0); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
        L.globalCompositeOperation='destination-in'; L.fillStyle=g; L.fillRect(l-4,tp-4,W+8,sh+8); L.restore();
        blit(ctx,L); });
      const o=0.92*eio(seg(t,2.23,2.59)); if(o>0){ ctx.globalAlpha=o; ctx.fillStyle='#120d0a'; ctx.fillRect(0,0,1080,1920); ctx.globalAlpha=1; }
    }

    /* ---------- C: the printer, stop-motion (2.61 - 4.42) ---------- */
    if(t>=2.61&&t<4.42){
      ctx.fillStyle='#000'; ctx.fillRect(0,0,1080,1920);
      const k=Math.floor((t-2.61)/0.3019), fi=[0,1,2,1][k%4];
      const jx=(rnd(k)-.5)*12, jy=(rnd(k+50)-.5)*12, jr=(rnd(k+99)-.5)*0.8;
      const z=Math.exp(Math.log(1.04)+(Math.log(1.13)-Math.log(1.04))*seg(t,2.61,4.42));
      ctx.save(); xf(ctx,540,700,[['t',jx,jy],['r',jr],['s',z]]); ctx.drawImage(I['print'+fi],0,0,1080,1920); ctx.restore();
      shadeTop(ctx,0.7);
      words(ctx,R,'printed',t,{top:300,color:'#fff',t0:2.85,step:0.07,dur:0.42,out:4.18,idx0:0});
    }

    /* ---------- D: the label roll (4.42 - 5.93) ---------- */
    if(t>=4.42&&t<5.93){
      ctx.fillStyle='#ddd'; ctx.fillRect(0,0,1080,1920);
      const p=seg(t,4.42,5.93), e=eo(seg(t,4.42,4.77));
      ctx.save(); xf(ctx,540,960,[['t',(1-e)*260-70*p,30-60*p],['s',1.14+0.05*p],['r',(1-e)*3]]); ctx.drawImage(I.roll,0,0,1080,1920); ctx.restore();
    }

    /* ---------- E/F: guess, then the reveal (one continuous camera) (5.93 - 9.85) ---------- */
    if(t>=5.93&&t<9.85){
      ctx.fillStyle='#000'; ctx.fillRect(0,0,1080,1920);
      const z=Math.exp(Math.log(1.14)*eio(seg(t,5.93,9.85))), punch=t>=8.04?0.035*Math.exp(-(t-8.04)*6)*Math.cos((t-8.04)*18):0, S=z+punch;
      let r=0; if(t>=7.44) r=150*eo(seg(t,7.44,7.62)); if(t>=7.74) r=150+760*eio(seg(t,7.74,8.06));
      r=Math.round(r*10)/10;
      ctx.save(); xf(ctx,540,1150,[['s',S]]);
      ctx.drawImage(I.dark,0,0,1080,1920);
      /* the scribble over the kumma, with the ragged hole rubbed out of it */
      { const L=R.layer('rub'); L.save(); xf(L,540,1150,[['s',S]]);
        const sc=Math.min(920/I.scrib.naturalWidth,777/I.scrib.naturalHeight), w=I.scrib.naturalWidth*sc, h=I.scrib.naturalHeight*sc;
        L.drawImage(I.scrib,80+(920-w)/2,930+(777-h)/2,w,h);
        if(r>0){ L.globalCompositeOperation='destination-out'; L.drawImage(holeMask(r),HX,HY,GW*HS,GH*HS); }
        L.restore(); blit(ctx,L); }
      if(t>=8.05){ burst(ctx,I.fwr,20,590,280,8.05,t); if(t>=8.34) burst(ctx,I.fwg,790,560,250,8.34,t); }
      if(t>=8.64){
        const b=spring(t-8.64,0.55,20), o=clamp((t-8.64)*10);
        ctx.save(); ctx.globalAlpha=o; xf(ctx,770,1390,[['s',1+0.6*(1-b)],['r',12-8*(1-b)]]);
        ctx.drawImage(I.badge,650,1270,240,240);
        /* the sticker word is a flex item with line-height normal: tallest ascent and descent of Cairo and Lalezar, centred in the 228 px under the 12 px padding */
        const Hb=R.text.badge, [Ac,Dc]=fm(ctx,'800 88px "Reel Cairo Latin"'), [Al,Dl]=fm(ctx,Hb?Hb.font:'88px sans-serif'), A=Math.max(Ac,Al), D=Math.max(Dc,Dl), top=12+(228-(A+D))/2;
        single(ctx,R,'badge',770,1270+top+(A+D)/2,1270+top+A,'#fff'); ctx.restore(); }
      ctx.restore();
      shadeTop(ctx,0.7);
      if(t<8.03) { words(ctx,R,'guess1',t,{top:300,color:'#fff',t0:6.2,step:0.06,dur:0.45,out:7.72,idx0:0});
                   words(ctx,R,'guess2',t,{top:300+120*LH+PADB,color:'#fff',t0:6.2,step:0.06,dur:0.45,out:7.72,idx0:wordCount(R,'guess1')}); }
      if(t>=8.0) { words(ctx,R,'reveal1',t,{top:300,color:'#fff',t0:8.06,step:0.07,dur:0.45,out:9.64,idx0:0});
                   words(ctx,R,'reveal2',t,{top:300+120*LH+PADB,color:'#fff',t0:8.06,step:0.07,dur:0.45,out:9.64,idx0:wordCount(R,'reveal1')}); }
    }

    /* ---------- G: beat cuts (9.85 - 12.27) ---------- */
    if(t>=9.85&&t<12.27){
      ctx.fillStyle='#000'; ctx.fillRect(0,0,1080,1920);
      const cuts=[9.85,10.45,11.06,11.66,12.27]; let gi=0; for(let i=0;i<4;i++) if(t>=cuts[i]) gi=i;
      const lt=t-cuts[gi], s=1.0+0.09*Math.exp(-lt*9)+0.04*seg(t,cuts[gi],cuts[gi+1]);
      ctx.save(); xf(ctx,540,960,[['s',s]]); ctx.drawImage(I['beat'+gi],0,0,1080,1920); ctx.restore();
      if(gi<2){ shadeBottom(ctx,0.72); words(ctx,R,'kumma',t,{top:1330,color:'#fff',t0:9.95,step:0.07,dur:0.38,out:10.84,idx0:0}); }
    }

    /* ---------- H: two flavours (12.27 - 14.08) ---------- */
    if(t>=12.27&&t<14.08){
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,1080,1920);
      const a=eo5(seg(t,12.27,12.63)), b=eo5(seg(t,12.57,12.93)), p=seg(t,12.27,14.08), sc=1+0.03*p;
      [[0,(1-a)*-1080,I.classic],[1010,(1-b)*1080,I.passion]].forEach(([top,dx,im])=>{
        ctx.save(); xf(ctx,540,top+455,[['t',dx,0],['s',sc]]); ctx.beginPath(); ctx.rect(0,top,1080,910); ctx.clip();
        ctx.drawImage(im,0,top-420,1080,1920); ctx.restore(); });
      words(ctx,R,'flavours',t,{top:896,color:INK,t0:12.87,step:0.06,dur:0.38,out:null,idx0:0});
    }

    /* ---------- I: end card (14.08 - 16.6) ---------- */
    if(t>=14.08){
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,1080,1920);
      const p=seg(t,14.08,16.6), cs=1.0+0.02*p;
      ctx.save(); xf(ctx,540,900,[['s',cs]]);
      ctx.drawImage(I.band,0,1290,1080,NATW(I.band,1080));
      burst(ctx,I.fwr,820,1470,210,15.59,t);
      { const f=spring(t-14.99,0.6,18); if(f>0){ const fh=NATW(I.flag,205); ctx.save(); xf(ctx,110+0.04*205,1500+0.2*fh,[['s',f],['r',-4+4*Math.sin(t*5)]]); ctx.drawImage(I.flag,110,1500,205,fh); ctx.restore(); } }
      { const l=spring(t-14.08,0.6,16), o=clamp((t-14.08)*10), lh=240*227/1200;
        if(o>0){ ctx.save(); ctx.globalAlpha=o; xf(ctx,540,228+lh/2,[['s',0.4+0.6*l]]); ctx.drawImage(I.logo,420,228,240,lh); ctx.restore(); } }
      words(ctx,R,'endHead',t,{top:330,color:INK,t0:14.22,step:0.07,dur:0.45,out:null,idx0:0});
      { const c=eo5(seg(t,14.69,15.14)), o=clamp((t-14.69)*6);
        if(o>0){
          const L=R.layer('card'); L.save(); xf(L,540,900,[['s',cs]]); xf(L,540,913.5,[['t',0,(1-c)*120],['s',0.94+0.06*c]]);
          L.save(); rrect(L,70,600,940,627,28); L.clip(); cover(L,I.card,70,600,940,627); L.restore(); L.restore();
          const S=L.canvas.width/1080, sc=(0.94+0.06*c)*cs, sh=R.layer('cardshadow');
          sh.save(); sh.setTransform(1,0,0,1,0,0); sh.shadowColor='rgba(22,18,16,0.2)'; sh.shadowBlur=50*S*sc; sh.shadowOffsetY=22*S*sc; sh.drawImage(L.canvas,0,0);
          sh.shadowColor='transparent'; sh.globalCompositeOperation='destination-out'; sh.drawImage(L.canvas,0,0); sh.restore();   // the shadow only outside the card, like box-shadow
          ctx.save(); ctx.globalAlpha=o; blit(ctx,sh); blit(ctx,L); ctx.restore(); } }
      if(t>=15.29){
        const q=spring(t-15.29,0.55,18); ctx.save(); xf(ctx,540,1348,[['s',0.6+0.4*q]]);
        ctx.fillStyle=INK; rrect(ctx,240,1300,600,96,48); ctx.fill();
        const H=R.text.button; if(H){ const [A,D]=fm(ctx,H.font); single(ctx,R,'button',540,1300+48,1300+(96-(A+D))/2+A,'#fff'); }
        ctx.restore(); }
      ctx.restore();
    }
  }
});
})();
