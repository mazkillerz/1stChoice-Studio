/* TEST STAND-IN for assets/cutout-pro.js (same contract: analyse, run, trim, supported). Not shipped. */
(function(){
const toCanvas=src=>{ const c=document.createElement('canvas'); c.width=src.naturalWidth||src.width; c.height=src.naturalHeight||src.height; c.getContext('2d').drawImage(src,0,0); return c; };
const prep=async s=>{ if(s instanceof Blob) s=await createImageBitmap(s); return toCanvas(s); };
function info(c){ const x=c.getContext('2d'), w=c.width, h=c.height, d=x.getImageData(0,0,w,h).data; let alpha=false;
  for(let i=3;i<d.length;i+=4*7){ if(d[i]<250){ alpha=true; break; } }
  const px=(a,b)=>{ const i=(b*w+a)*4; return [d[i],d[i+1],d[i+2]]; }, cs=[px(0,0),px(w-1,0),px(0,h-1),px(w-1,h-1)];
  const flat=cs.every(p=>Math.abs(p[0]-cs[0][0])+Math.abs(p[1]-cs[0][1])+Math.abs(p[2]-cs[0][2])<40);
  return {hasAlpha:alpha,flat,bg:flat?cs[0]:null,w,h}; }
window.StudioCutoutPro={
  supported:()=>'',
  async analyse(src){ const c=await prep(src), i=info(c); return {...i,suggest:i.hasAlpha?'keep':i.flat?'logo':'photo'}; },
  async run(src,o){ o=o||{}; const c=await prep(src), i=info(c); if(o.onProgress) o.onProgress(o.mode==='photo'?'First time only: this downloads a 15 MB model.':'Working…');
    if(i.hasAlpha||!i.bg) return c; const x=c.getContext('2d'), im=x.getImageData(0,0,c.width,c.height), d=im.data, t=20+(o.tolerance==null?50:o.tolerance)*2;
    for(let p=0;p<d.length;p+=4){ if(Math.abs(d[p]-i.bg[0])+Math.abs(d[p+1]-i.bg[1])+Math.abs(d[p+2]-i.bg[2])<t) d[p+3]=0; }
    x.putImageData(im,0,0); return c; },
  trim(c,pad){ pad=pad||0; const w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data; let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    if(x1<0) return c; x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(w-1,x1+pad); y1=Math.min(h-1,y1+pad);
    const o=document.createElement('canvas'); o.width=x1-x0+1; o.height=y1-y0+1; o.getContext('2d').drawImage(c,-x0,-y0); return o; }
};
})();
