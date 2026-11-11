/* Synthetic logo fixtures for Cutout Pro (drawn with canvas, no downloads). Each case has a ground truth:
   truth = the logo on a transparent canvas (anti-aliased, shadow included as translucent black), img = the logo on its ground
   with the case's damage (JPEG, noise, gradient, uneven light). window.CutoutCases.make(name) -> Promise<{name,img,truth,note}>.
   Used by tests/cutout-pro.mjs and lab/cutout-pro-test.html. */
(function(g){
  const W=1000,H=640;
  const mk=(w,h)=>{ const c=document.createElement('canvas'); c.width=w||W; c.height=h||H; return c; };
  function rnd(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
  function gauss(r){ return Math.sqrt(-2*Math.log(r()||1e-9))*Math.cos(2*Math.PI*r()); }
  function wordmark(x,col,text,cx,cy,size){ x.fillStyle=col; x.font='900 '+(size||230)+'px "DejaVu Sans","Arial Black",Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,cx,cy); }
  function ring(x,cx,cy,r,lw,col){ x.strokeStyle=col; x.lineWidth=lw; x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.stroke(); }
  const draw={
    wordmark(x){ wordmark(x,'#111',  'BOOM',W/2,H/2); },
    badge(x){ x.fillStyle='#d6252b'; x.beginPath(); x.arc(W/2,H/2,270,0,Math.PI*2); x.fill(); ring(x,W/2,H/2,240,8,'#fff'); wordmark(x,'#fff','SALE',W/2,H/2+4,150); },
    whiteOnDark(x){ wordmark(x,'#fff','OK',W/2,H/2,300); ring(x,W/2,H/2,285,14,'#fff'); },
    shadow(x){ x.save(); x.shadowColor='rgba(0,0,0,.5)'; x.shadowBlur=16; x.shadowOffsetX=10; x.shadowOffsetY=12;
      x.fillStyle='#e23a2e'; x.beginPath(); x.arc(380,300,170,0,7); x.fill(); x.fillStyle='#1f5fd1'; x.beginPath(); x.arc(560,330,150,0,7); x.fill();
      x.fillStyle='#f2b01e'; x.beginPath(); x.moveTo(500,120); x.lineTo(700,460); x.lineTo(300,460); x.closePath(); x.fill(); x.restore(); },
    thin(x){ x.strokeStyle='#000'; x.lineCap='butt'; x.lineWidth=1; x.beginPath(); x.moveTo(80,80.5); x.lineTo(920,80.5); x.stroke();
      x.lineWidth=2; x.beginPath(); x.moveTo(80,140); x.lineTo(920,140); x.stroke(); x.lineWidth=1.5; x.beginPath(); x.moveTo(80,200); x.lineTo(500,500); x.stroke();
      x.lineWidth=1; x.beginPath(); x.arc(700,400,120,0,7); x.stroke(); x.lineWidth=2; x.beginPath(); x.arc(700,400,80,0,7); x.stroke();
      x.fillStyle='#000'; x.font='400 40px "DejaVu Sans",Arial,sans-serif'; x.textBaseline='middle'; x.fillText('tiny text 1 2 3 4 5',90,560); },
    multi(x){ wordmark(x,'#1f5fd1','LOGO',W/2,200,200); x.fillStyle='#e23a2e'; x.beginPath(); x.arc(250,450,110,0,7); x.fill(); x.fillStyle='#f2b01e'; x.fillRect(420,350,200,200); wordmark(x,'#111','o',780,450,260); }
  };
  const SPEC={
    wordmark:{ground:'#ffffff',note:'black wordmark on white'},
    badge:{ground:'#ffffff',note:'red badge, white text, on white'},
    whiteOnDark:{ground:'#1c2536',note:'white logo on a dark square'},
    shadow:{ground:'#f4efe6',note:'colour logo with a drop shadow on off-white'},
    thin:{ground:'#ffffff',note:'1-2 px strokes and tiny text'},
    jpeg:{base:'wordmark',ground:'#ffffff',jpeg:.6,note:'wordmark, JPEG quality 0.6'},
    jpegColour:{base:'multi',ground:'#ffffff',jpeg:.5,note:'colour logo, JPEG quality 0.5'},
    gradient:{base:'multi',ground:'grad',note:'colour logo on a soft gradient'},
    paper:{base:'wordmark',ground:'#efe8d8',paper:true,jpeg:.8,note:'wordmark photographed on paper (uneven light, noise)'},
    paperColour:{base:'multi',ground:'#efe8d8',paper:true,jpeg:.8,note:'colour logo on paper (uneven light, noise)'},
    twoTone:{base:'wordmark',ground:'split',note:'wordmark across a two-colour ground'},
    brandLogo:{brand:'logo.png',ground:'#ffffff',jpeg:.7,note:'the real brand logo on white, JPEG 0.7'},
    brandLogoCream:{brand:'logo.png',ground:'#f3ead7',jpeg:.8,note:'the real brand logo on cream, JPEG 0.8'},
    brandCan:{brand:'assets/classic_can.png',ground:'#2f8f8a',jpeg:.85,note:'the real can cut-out on a teal ground, JPEG 0.85'}
  };
  const loadImg=u=>new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('no '+u)); i.src=u; });
  async function make(name){
    const sp=SPEC[name]; if(!sp) throw new Error('no case '+name);
    const truth=mk(), tx=truth.getContext('2d');
    if(sp.brand){ const im=await loadImg('../brands/1stchoice/'+sp.brand), k=Math.min((W-120)/im.naturalWidth,(H-80)/im.naturalHeight); tx.imageSmoothingQuality='high'; tx.drawImage(im,(W-im.naturalWidth*k)/2,(H-im.naturalHeight*k)/2,im.naturalWidth*k,im.naturalHeight*k); }
    else draw[sp.base||name](tx);
    const img=mk(), x=img.getContext('2d');
    if(sp.ground==='grad'){ const gr=x.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#bcd3f0'); gr.addColorStop(1,'#f8efe2'); x.fillStyle=gr; x.fillRect(0,0,W,H); }
    else if(sp.ground==='split'){ x.fillStyle='#ffffff'; x.fillRect(0,0,W/2,H); x.fillStyle='#ece3c8'; x.fillRect(W/2,0,W/2,H); }
    else { x.fillStyle=sp.ground; x.fillRect(0,0,W,H); }
    x.drawImage(truth,0,0);
    if(sp.paper){ const d=x.getImageData(0,0,W,H), r=rnd(7); for(let y=0;y<H;y++) for(let xx=0;xx<W;xx++){ const i=(y*W+xx)*4, cx=xx/W-.5, cy=y/H-.5, light=.78+.3*(xx/W)-.12*(cx*cx+cy*cy)*4+.06*(y/H), n=gauss(r)*3; for(let k=0;k<3;k++){ const v=d.data[i+k]*light+n; d.data[i+k]=v<0?0:v>255?255:v; } } x.putImageData(d,0,0); }
    if(sp.jpeg){ const blob=await new Promise(res=>img.toBlob(res,'image/jpeg',sp.jpeg)), bm=await createImageBitmap(blob), c2=mk(); c2.getContext('2d').drawImage(bm,0,0); return {name,img:c2,truth,note:sp.note,spec:sp}; }
    return {name,img,truth,note:sp.note,spec:sp};
  }
  g.CutoutCases={names:Object.keys(SPEC),make,W,H,SPEC};
})(window);
