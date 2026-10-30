/* Winter cat: canvas-2D port of source/winter_cat.html (DOM + SVG, window.seek(t)). Same timing, same springs, same seeded
   wind/specks/breeze, same camera. The two SVG "boil" filters become R.wobble. Every frame is a pure function of t. */
(function(){
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const out3=x=>1-Math.pow(1-x,3);
function spring(t,k=170,d=26){ if(t<=0) return 0; const w=Math.sqrt(k), z=d/(2*w);
  if(z<1){ const wd=w*Math.sqrt(1-z*z); return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t)); }
  return 1-Math.exp(-w*t)*(1+w*t); }
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const T={gust:0.8, h1:0.92, h2:1.0, hood:1.08, look:2.3, reach:2.95, side:3.45, bang:3.5, deadpan:4.15, grab:4.95, hold:5.07, wink:6.2, zoom:6.75, end:7.2};
const INK='#161210', RAD=Math.PI/180, POSES=['L1','H1','H2','L2','L2b','S1','R1','L3','S3','G1','L4','L4b'];

/* CSS-style transform about the element's transform-origin (ox,oy as fractions of its box): [bx,by] translate, x/y, rotate r, skewX k, scale s*sx,s*sy */
function place(c,left,top,w,h,ox,oy,o){
  const cx=left+w*ox, cy=top+h*oy;
  c.translate(cx,cy); if(o.bx||o.by) c.translate(o.bx||0,o.by||0); c.translate(o.x||0,o.y||0);
  if(o.r) c.rotate(o.r*RAD); if(o.k) c.transform(1,0,Math.tan(o.k*RAD),1,0,0);
  const s=o.s==null?1:o.s; c.scale(s*(o.sx==null?1:o.sx),s*(o.sy==null?1:o.sy)); c.translate(-cx,-cy);
}
/* a picture sized by its CSS width (natural aspect) */
function pic(c,im,left,top,w,ox,oy,o,alpha){
  const h=w*im.naturalHeight/im.naturalWidth; c.save(); place(c,left,top,w,h,ox,oy,o||{}); c.globalAlpha=alpha==null?1:alpha; c.drawImage(im,left,top,w,h); c.restore();
}
/* CSS border-radius: 52% 48% 44% 56% / 55% 50% 50% 45% */
function blob(c,x,y,w,h){
  const rx=[.52,.48,.44,.56].map(v=>v*w), ry=[.55,.5,.5,.45].map(v=>v*h), P=Math.PI;
  c.beginPath(); c.moveTo(x+rx[0],y); c.lineTo(x+w-rx[1],y); c.ellipse(x+w-rx[1],y+ry[1],rx[1],ry[1],0,-P/2,0);
  c.lineTo(x+w,y+h-ry[2]); c.ellipse(x+w-rx[2],y+h-ry[2],rx[2],ry[2],0,0,P/2);
  c.lineTo(x+rx[3],y+h); c.ellipse(x+rx[3],y+h-ry[3],rx[3],ry[3],0,P/2,P);
  c.lineTo(x,y+ry[0]); c.ellipse(x+rx[0],y+ry[0],rx[0],ry[0],0,P,P*1.5); c.closePath();
}

let winds=[], specks=[], breeze=[], sparks=[];
const pathLen=d=>{ const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d',d); return p.getTotalLength(); };

/* headline: words laid out like the DOM line (inline-block masks padded 0 8px 18px, one space between), centred in 1080 */
const PAD=8, TOP=430, LH=1.05;
function layout(c,words,dir){
  const sp=c.measureText(' ').width, ws=words.map(w=>c.measureText(w).width);
  const total=ws.reduce((a,b)=>a+b,0)+words.length*PAD*2+Math.max(0,words.length-1)*sp;
  let x=dir==='rtl'?540+total/2:540-total/2; const items=[];
  words.forEach((w,i)=>{ const mw=ws[i]+PAD*2, left=dir==='rtl'?x-mw:x; items.push({w,x:left+PAD,width:ws[i]}); x=dir==='rtl'?left-sp:left+mw+sp; });
  return {items,total};
}
const sizeOf=font=>parseFloat((/(\d+(?:\.\d+)?)px/.exec(font)||[0,178])[1]);
const wordsOf=v=>String(v).trim().split(/\s+/).filter(Boolean);

StudioReel.scene({
  id:'winter-cat',
  setup(){
    let r=rng(7); winds=[];
    for(let i=0;i<10;i++){ const y=1000+i*85+r()*50, amp=10+r()*14, len=700+r()*400, x0=1200;
      let d=`M ${x0} ${y}`; for(let x=x0;x>x0-len;x-=40) d+=` Q ${x-20} ${y+(Math.sin(x*0.013+i)*amp)} ${x-40} ${y+Math.sin((x-40)*0.013+i)*amp}`;
      const xe=x0-len, ye=y+Math.sin((xe)*0.013+i)*amp; d+=` C ${xe-70} ${ye} ${xe-70} ${ye-60} ${xe-25} ${ye-55} C ${xe+10} ${ye-50} ${xe+5} ${ye-15} ${xe-25} ${ye-20}`;
      const w=6+r()*3;
      winds.push({p:new Path2D(d),w,len:pathLen(d),t0:T.gust+i*0.06+r()*0.12,dur:0.75+r()*0.3}); }
    r=rng(11); specks=[];
    for(let i=0;i<34;i++){ const rad=3+r()*4; specks.push({rad,y:1300+r()*560,t0:T.gust+r()*0.9,v:1500+r()*900,wob:r()*6}); }
    r=rng(23); breeze=[];
    for(let i=0;i<3;i++){ const y=1010+i*150+r()*40; let d=`M 1150 ${y}`;
      for(let x=1150;x>-60;x-=60) d+=` Q ${x-30} ${y+Math.sin(x*0.01+i)*12} ${x-60} ${y+Math.sin((x-60)*0.01+i)*12}`;
      breeze.push({p:new Path2D(d),len:pathLen(d),ph:i*0.9}); }
    sparks=[[349,1388,26],[533,1356,20],[325,1500,16],[566,1475,22]].map(([x,y,s],i)=>({x,y,ph:i*0.37,
      p:new Path2D(`M ${x} ${y-s} Q ${x} ${y} ${x+s} ${y} Q ${x} ${y} ${x} ${y+s} Q ${x} ${y} ${x-s} ${y} Q ${x} ${y} ${x} ${y-s} Z`)}));
  },

  /* width of the whole headline line as laid out (the engine turns it into the fit) */
  measure(id,value,c){ return layout(c,wordsOf(value),'ltr').total; },

  draw(ctx,t,R){
    const I=R.img, f=Math.floor(t*12), tq=f/12, land=T.end+0.28;

    /* ---- world (camera + punch), drawn into a layer, then boiled ---- */
    if(t<T.end){
      const c=R.layer('world');
      let cs=1.24+0.04*prog(t,0,T.zoom), cx=0, cy=0;
      if(t>=T.h2 && t<T.h2+0.3){ const k=(T.h2+0.3-tq)/0.3; cx=Math.sin(f*2.1)*10*k; cy=Math.cos(f*1.7)*7*k; }
      const za=prog(t,T.zoom,T.end), zp=za*za*za, Z=Math.exp(Math.log(cs)+(Math.log(7)-Math.log(cs))*zp);
      const fx=t<T.zoom?500:433, fy=t<T.zoom?1530:1465;
      const pin=t>=T.deadpan&&t<T.grab?0.13*spring(t-T.deadpan,600,40):0.13*(1-out3(prog(t,T.grab,T.grab+0.25)))*(t>=T.grab?1:0);
      c.save();
      c.translate(fx-fx*Z+cx,fy-fy*Z+cy); c.scale(Z,Z);
      c.translate(470,1168); c.scale(1+pin,1+pin); c.translate(-470,-1168);

      /* background and the grey patch behind the cat */
      c.save(); c.translate(540,1920); c.scale(1.2,1.2); c.translate(-540,-1920); c.drawImage(I.bg,0,0,1080,1920); c.restore();
      c.fillStyle='#C1B9AE'; blob(c,175,1095,470,520); c.fill();

      /* sky: moon bobs, stars twinkle on twos, clouds drift and get shoved by the gust */
      pic(c,I.moon,740,470,200,.5,.5,{y:Math.sin(tq*1.1)*6,r:Math.sin(tq*0.8)*2});
      const shove=out3(prog(t,T.gust,T.gust+0.9));
      pic(c,I.cloud1,590,640,300,.5,.5,{x:-tq*12-260*shove,y:Math.sin(tq*0.9)*5});
      pic(c,I.cloud2,120,520,330,.5,.5,{x:-tq*8-160*shove,y:Math.sin(tq*0.7+1)*5});
      [['star1',330,450,62],['star2',560,500,54],['star3',430,700,46]].forEach(([id,l,tp,w],i)=>
        pic(c,I[id],l,tp,w,.5,.5,{s:0.75+0.25*Math.sin(f*0.9+i*2.1),r:f%4<2?0:8}));

      /* wind gust: wavy strokes drawn on with a dash, sand specks, later two thin breeze lines */
      c.save(); c.strokeStyle=INK; c.lineCap='round'; c.fillStyle=INK;
      winds.forEach(w=>{ const a=(t-w.t0)/w.dur, on=clamp(a*1.6), off=clamp((a-0.45)*1.8);
        if(on>0&&off<1){ c.lineWidth=w.w; c.setLineDash([w.len*(on-off),w.len*2]); c.lineDashOffset=-w.len*off; c.stroke(w.p); } });
      c.setLineDash([]); c.lineDashOffset=0;
      specks.forEach(s=>{ const a=tq-s.t0; if(a>0&&a<1.2){ c.beginPath(); c.arc(1120-a*s.v,s.y+Math.sin(a*9+s.wob)*14-a*30,s.rad,0,Math.PI*2); c.fill(); } });
      c.lineWidth=4;
      breeze.forEach(b=>{ const cyc=((tq-T.hold-0.4-b.ph)%2.6+2.6)%2.6, a=cyc/1.6, on=clamp(a*1.5), off=clamp((a-0.4)*1.6);
        if(tq>T.hold+0.4 && a<1){ c.globalAlpha=0.85; c.setLineDash([b.len*(on-off),b.len*2]); c.lineDashOffset=-b.len*off; c.stroke(b.p); } });
      c.restore();

      /* the drawn can on the ground, then the cat (one drawing at a time) */
      pic(c,I.candrawn,770,1555,118,.5,1,{r:t>T.bang&&t<T.grab?Math.sin(f*2)*2:0,y:t>T.bang&&t<T.grab?-Math.abs(Math.sin(f*1.3))*6:0},t<T.grab+0.04?1:0);
      let pose='L1';
      if(t>=T.h1) pose='H1'; if(t>=T.h2) pose='H2'; if(t>=T.hood) pose=(t<T.look-0.15 && Math.floor(t*8)%2)?'L2b':'L2';
      if(t>=T.look) pose='S1'; if(t>=T.reach) pose='R1'; if(t>=T.side) pose='L3'; if(t>=T.deadpan) pose='S3';
      if(t>=T.grab) pose='G1'; if(t>=T.hold) pose='L4'; if(t>=T.wink) pose='L4b';
      const breathe=Math.sin(tq*2.4)*0.008; let sx=1,sy=1+breathe,x=0,r=0;
      if(pose==='L1'){ r=-2*prog(t,T.gust,T.h1); }
      if(pose==='H2'){ sy=0.94; sx=1.04; }
      if(pose==='L2'||pose==='L2b'){ const p=spring(t-T.hood,420,18); sy=1-0.05*(1-p)+breathe; sx=1+0.03*(1-p); x=(f%2?1:-1)*3*(t<T.look-0.15?1:0); }
      if(pose==='S1'){ r=-1.5*out3(prog(t,T.look,T.look+0.2)); }
      if(pose==='R1'){ const p=spring(t-T.reach,380,26); x=-10*(1-p); }
      if(pose==='L3'){ const p=spring(t-T.side,600,30); x=3*(1-p); }
      if(pose==='L4'||pose==='L4b'){ const p=spring(t-T.hold,380,15); sy=1+0.07*(1-p)+breathe; sx=1-0.04*(1-p); if(pose==='L4b'){ const q=spring(t-T.wink,500,20); r=2*(1-q)*0+1.5*q; } }
      pic(c,I[pose],102,1014,752,.49,.91,{x,r,sx,sy});

      /* fire (flames flicker and lean in the gust), logs */
      const g=prog(t,T.gust,T.gust+0.25)*(1-prog(t,2.0,2.7));
      pic(c,I.flames,30,1450,320,.5,1,{sy:1+Math.sin(f*1.9)*0.06+Math.sin(f*0.7)*0.04,sx:1-Math.sin(f*1.3)*0.03,k:Math.sin(f*1.1)*3+g*22,s:1+(t>=T.look&&t<T.side?0.08:0)});
      pic(c,I.logs,30,1633,320,.5,1,{});

      /* fx: the "!" mark, grab puff, sparkles */
      c.save(); c.fillStyle=INK; c.strokeStyle=INK; c.lineCap='round';
      if(t>T.bang&&t<T.deadpan){ const p=spring(t-T.bang,500,18);
        c.save(); c.translate(610,1035); c.scale(Math.max(0,p),Math.max(0,p)); c.rotate((1-p)*-20*RAD);
        c.lineWidth=8; c.lineJoin='round'; c.beginPath(); c.moveTo(-14,-120); c.lineTo(16,-124); c.lineTo(8,-22); c.lineTo(-6,-20); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.arc(1,10,15,0,Math.PI*2); c.fill(); c.restore(); }
      { const a=prog(t,T.grab,T.grab+0.35);
        if(a>0&&a<1){ c.save(); c.translate(830,1735); c.scale(0.6+a*0.7,0.6+a*0.7); c.lineWidth=7;
          c.beginPath(); [[-60,-10,-100,-30],[-40,-60,-64,-100],[0,-75,0,-120],[40,-60,64,-100],[60,-10,100,-30]].forEach(l=>{ c.moveTo(l[0],l[1]); c.lineTo(l[2],l[3]); }); c.stroke(); c.restore(); } }
      sparks.forEach(s=>{ const a=tq-T.hold-0.2-s.ph, v=a>0?Math.max(0,Math.sin(a*4)):0;
        if(v>0){ c.save(); c.translate(s.x,s.y); c.scale(v,v); c.translate(-s.x,-s.y); c.fill(s.p); c.restore(); } });
      c.restore();

      c.restore();
      /* the SVG filter lives in the world's own space, so it zooms with the camera */
      const zq=1; // Chrome does not scale the filter with the camera
      R.wobble(c,ctx,{seed:1+(f%5),freq:0.022/zq,amount:5*zq});
    }

    /* ---- end card: the real can drops and lands, the grey blob pops, the line slams in ---- */
    if(t>=T.end){
      if(t>=land){ const c=R.layer('blob'), pb=spring(t-land,320,18), s=Math.max(0,0.3+0.7*pb);
        c.save(); place(c,150,880,780,760,.5,.5,{s}); c.fillStyle='#C1B9AE'; blob(c,150,880,780,760); c.fill(); c.restore();
        R.wobble(c,ctx,{seed:3+(f%4),freq:0.03,amount:4}); }
      { const a=prog(t,T.end,land); let y=-1250*(1-a*a), sy2=1, sx2=1;
        if(t>=land){ const q=spring(t-land,500,14); y=0; sy2=1-0.12*(1-q); sx2=1+0.08*(1-q); }
        const h=820, w=h*I.can_real.naturalWidth/I.can_real.naturalHeight;
        ctx.save(); place(ctx,540,860,w,h,.5,.6,{bx:-w/2,y:y+(t>land+0.6?Math.sin((t-land)*1.4)*4:0),sx:sx2,sy:sy2}); ctx.drawImage(I.can_real,540,860,w,h); ctx.restore(); }
      { const a=prog(t,land,land+0.18);
        if(a>0&&a<1){ const c=R.layer('land'); c.save(); c.translate(540,1600); c.scale(1+a*0.15,1+a*0.15); c.translate(-540,-1600);
          c.strokeStyle=INK; c.lineWidth=9; c.lineCap='round'; c.beginPath();
          [[300,1640,220,1610],[320,1580,250,1520],[780,1640,860,1610],[760,1580,830,1520]].forEach(l=>{ c.moveTo(l[0],l[1]); c.lineTo(l[2],l[3]); }); c.stroke(); c.restore();
          R.wobble(c,ctx,{seed:3+(f%4),freq:0.03,amount:4}); } }
    }

    /* ---- logo, headline ---- */
    { const p=out3(prog(t,land+0.55,land+0.95)); if(p>0) pic(ctx,I.logo,350,215,380,.5,.5,{y:(1-p)*40},p); }
    const H=R.text.headline; if(!H) return;
    const words=wordsOf(H.value); if(!words.length) return;
    const size=sizeOf(H.font), lh=size*LH;
    ctx.save(); ctx.font=H.font; ctx.direction=H.dir; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillStyle=INK;
    const m=ctx.measureText('Hg'), A=m.fontBoundingBoxAscent, D=m.fontBoundingBoxDescent, base=TOP+(lh-(A+D))/2+A, cyl=TOP+lh/2;
    const L=layout(ctx,words,H.dir);
    ctx.translate(540,cyl); ctx.scale(H.fit,H.fit); ctx.translate(-540,-cyl);
    L.items.forEach((it,i)=>{ const t0=land+0.15+i*0.12, p=spring(t-t0,420,20);
      if(t<t0) return;
      const s=1.3-0.3*p, cx=it.x+it.width/2;
      ctx.save(); ctx.globalAlpha=clamp((t-t0)*20);
      ctx.translate(cx,cyl); ctx.translate(0,-50*(1-p)); ctx.scale(s,s); ctx.translate(-cx,-cyl);
      ctx.fillText(it.w,it.x,base); ctx.restore(); });
    ctx.restore();
  }
});
})();
