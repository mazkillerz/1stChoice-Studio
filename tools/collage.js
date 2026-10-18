/* Collage: 2, 3 or 4 whole photos (never cropped) in many layouts, no text. */
/* tiny layout drawings for the buttons: boxes in a 30×46 frame */
const lic=(...r)=>`<svg width="30" height="46" viewBox="0 0 30 46" aria-hidden="true"><rect x=".5" y=".5" width="29" height="45" rx="4" fill="none" stroke="currentColor" opacity=".35"/>${r.map(([x,y,w,h,rot])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="currentColor"${rot?` transform="rotate(${rot} ${x+w/2} ${y+h/2})"`:''}/>`).join('')}</svg>`;
Studio.tool({
  id:'collage', title:'Collage', fileName:'collage', noZoom:true,
  photos:{min:2,max:4}, sampleNote:'Example photos. Every photo shows whole, never cropped.',
  styles:[{id:'black',label:'Black'},{id:'white',label:'White'},{id:'cream',label:'Cream'}],
  lightBackground:style=>style!=='black',
  fields:[
    {id:'lay2',type:'seg',when:{count:2},in:'style',label:'Layout',options:[
      {v:'stack',l:'Stacked',ic:lic([4,9,22,12],[4,25,22,12])},
      {v:'diag',l:'Diagonal',ic:lic([3,9,17,12],[10,25,17,12])},
      {v:'side',l:'Side by side',ic:lic([3,16,11,14],[16,16,11,14])},
      {v:'inset',l:'Big + small',ic:lic([3,8,24,20],[14,24,13,10])},
      {v:'polaroid',l:'Polaroids',ic:lic([4,7,15,17,-6],[11,23,15,17,5])}]},
    {id:'lay3',type:'seg',when:{count:3},in:'style',label:'Layout',options:[
      {v:'framed',l:'Framed',ic:lic([6,6,18,10],[6,18,18,10],[6,30,18,10])},
      {v:'stagger',l:'Stagger',ic:lic([3,6,17,10],[10,18,17,10],[3,30,17,10])},
      {v:'big',l:'Big + 2',ic:lic([3,10,24,14],[3,26,11,9],[16,26,11,9])},
      {v:'row',l:'Three in a row',ic:lic([2,15,8,16],[11,15,8,16],[20,15,8,16])},
      {v:'tall2',l:'Tall + 2',ic:lic([3,10,13,26],[18,10,9,12],[18,24,9,12])},
      {v:'polaroid',l:'Polaroids',ic:lic([3,5,13,12,-6],[14,16,13,12,5],[4,28,13,12,-3])}]},
    {id:'lay4',type:'seg',when:{count:4},in:'style',label:'Layout',options:[
      {v:'wide',l:'Wide / 2 / wide',ic:lic([3,5,24,9],[3,16,11,9],[16,16,11,9],[3,27,24,9])},
      {v:'zigzag',l:'Zigzag',ic:lic([3,4,16,9],[11,14,16,9],[3,24,16,9],[11,34,16,9])},
      {v:'grid',l:'2 × 2',ic:lic([3,11,11,11],[16,11,11,11],[3,24,11,11],[16,24,11,11])},
      {v:'big3',l:'Big + 3',ic:lic([3,9,24,16],[3,27,7,8],[11.5,27,7,8],[20,27,7,8])},
      {v:'film',l:'Film strip',ic:lic([8,4,14,38],[10,6,10,8],[10,16,10,8],[10,26,10,8],[10,36,10,4])},
      {v:'polaroid',l:'Polaroids',ic:lic([3,4,12,11,-6],[15,9,12,11,5],[3,22,12,11,4],[15,27,12,11,-5])}]},
    {id:'logo',type:'toggle',in:'style',label:'Show the logo',default:true},
    {id:'round',type:'toggle',in:'style',label:'Rounded corners',default:false}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, dark=o.style==='black', ground=dark?C.night:o.style==='cream'?(C.cream||C.paper):C.paper;
    ctx.fillStyle=ground; ctx.fillRect(0,0,W,H);
    const n=o.count, a=i=>h.photoAspect(i); let R=[], extra=null;
    const col=(list,gap)=>{let y=0;const out=[];list.forEach(([i,w,x])=>{const hh=w/a(i);out.push({i,x,y,w,h:hh});y+=hh+gap;});return out;};
    /* k photos in one row, all the same height, filling the width */
    const rowOf=(ids,t,g,width,x0)=>{ width=width||W; x0=x0||0; const sum=ids.reduce((s,i)=>s+a(i),0), hh=(width-g*(ids.length-1))/sum; let x=x0; return {rows:ids.map(i=>{ const r={i,x,y:t,w:hh*a(i),h:hh}; x+=r.w+g; return r; }),h:hh}; };
    const pair=(t,g,i,j)=>{const sw=(W-g)/2,s1=sw/a(i),s2=sw/a(j),sh=Math.max(s1,s2);return {rows:[{i,x:0,y:t+(sh-s1)/2,w:sw,h:s1},{i:j,x:W-sw,y:t+(sh-s2)/2,w:sw,h:s2}],h:sh};};
    /* polaroids: white frames, slightly tilted, placed so they never touch */
    const polaroids=ids=>{ const tilt=[-5,4,-3,5], pw=ids.length===2?700:ids.length===3?560:430, out=[];
      ids.forEach((i,k)=>{ const ph=pw/a(i), fw=pw+48, fh=ph+48+110; const cols=ids.length===4?2:1;
        const cx=cols===2?(k%2?W*0.745:W*0.255):(k%2?W*0.60:W*0.40), cy=0; out.push({i,pw,ph,fw,fh,cx,cy,rot:tilt[k]*Math.PI/180}); });
      let y=0; const rows=ids.length===4?[[0,1],[2,3]]:out.map((_,k)=>[k]);
      rows.forEach(r=>{ const rh=Math.max(...r.map(k=>out[k].fh)); r.forEach(k=>{ out[k].cy=y+rh/2+(r.length>1&&k%2?60:0); }); y+=rh+70; });
      return {items:out,h:y-70}; };
    const L2=o.value('lay2'), L3=o.value('lay3'), L4=o.value('lay4');
    if(n===2){
      if(L2==='diag') R=col([[0,920,0],[1,920,W-920]],40);
      else if(L2==='side'){ R=pair(0,20,0,1).rows; }
      else if(L2==='inset'){ const bh=W/a(0), sw=460, sh=sw/a(1); R=[{i:0,x:0,y:0,w:W,h:bh},{i:1,x:W-sw-40,y:bh-sh*0.55,w:sw,h:sh,border:16}]; }
      else if(L2==='polaroid') extra=polaroids([0,1]);
      else R=col([[0,W,0],[1,W,0]],20);
    } else if(n===3){
      if(L3==='stagger') R=col([[0,860,0],[1,860,W-860],[2,860,0]],24);
      else if(L3==='big'){ const bh=W/a(0); const p=pair(bh+16,16,1,2); R=[{i:0,x:0,y:0,w:W,h:bh},...p.rows]; }
      else if(L3==='row') R=rowOf([0,1,2],0,14).rows;
      else if(L3==='tall2'){ /* the tallest photo takes the big spot */
        const [b0,b1,b2]=[0,1,2].sort((p,q)=>a(p)-a(q)), g=14, s=1/a(b1)+1/a(b2), wl=((W-g)*s+g)/(1/a(b0)+s), wr=W-wl-g, h1=wr/a(b1);
        R=[{i:b0,x:0,y:0,w:wl,h:wl/a(b0)},{i:b1,x:wl+g,y:0,w:wr,h:h1},{i:b2,x:wl+g,y:h1+g,w:wr,h:wr/a(b2)}]; }
      else if(L3==='polaroid') extra=polaroids([0,1,2]);
      else R=col([[0,840,(W-840)/2],[1,840,(W-840)/2],[2,840,(W-840)/2]],18);
    } else {
      if(L4==='zigzag') R=col([[0,690,0],[1,690,W-690],[2,690,0],[3,690,W-690]],12);
      else if(L4==='grid'){ const g=14, p1=pair(0,g,0,1), p2=pair(p1.h+g,g,2,3); R=[...p1.rows,...p2.rows]; }
      else if(L4==='big3'){ const g=14, bh=W/a(0), r=rowOf([1,2,3],bh+g,g); R=[{i:0,x:0,y:0,w:W,h:bh},...r.rows]; }
      else if(L4==='film'){ const fw=760, x=(W-fw)/2, g=26; let y=40; R=[0,1,2,3].map(i=>{ const r={i,x,y,w:fw,h:fw/a(i)}; y+=r.h+g; return r; }); extra={film:{x:x-70,w:fw+140,h:y-g+40}}; }
      else if(L4==='polaroid') extra=polaroids([0,1,2,3]);
      else { const g=14, t=W/a(0), p=pair(t+g,g,1,2); R=[{i:0,x:0,y:0,w:W,h:t},...p.rows,{i:3,x:0,y:t+g+p.h+g,w:W,h:W/a(3)}]; }
    }
    const showLogo=!!o.value('logo'), room=H-(showLogo?260:120), rad=o.value('round')?28:0;
    if(extra&&extra.items){
      /* polaroids */
      const gh0=extra.h*1.08; const k=Math.min(1,room/gh0), oy=(H-gh0*k)/2-(showLogo?50:0)+extra.h*0.04*k;
      extra.items.forEach(it=>{ ctx.save(); ctx.translate(it.cx,oy+it.cy*k); ctx.scale(k,k); ctx.rotate(it.rot);
        ctx.shadowColor='rgba(0,0,0,.28)'; ctx.shadowBlur=30; ctx.shadowOffsetY=10; ctx.fillStyle='#fbfaf7'; ctx.fillRect(-it.fw/2,-it.fh/2,it.fw,it.fh); ctx.shadowColor='transparent';
        h.photo(it.i,-it.pw/2,-it.fh/2+24,it.pw,it.ph,{mode:'contain'}); ctx.restore(); });
      if(showLogo){ const lw=170, lh=h.logoH(lw), by=oy+gh0*k; h.logo((W-lw)/2,by+Math.max(40,((H-by)-lh)/2-20),lw,dark?'light':'dark'); }
      return;
    }
    let gh=Math.max(...R.map(r=>r.y+r.h))+(extra&&extra.film?80:0); const gwid=Math.max(...R.map(r=>r.x+r.w));
    const k=Math.min(1,room/gh,W/Math.max(W,gwid)); const ox=(W-W*k)/2; gh*=k; const oy=(H-gh)/2-(showLogo?50:0);
    if(extra&&extra.film){ const f=extra.film; ctx.fillStyle='#141210'; ctx.fillRect(ox+f.x*k,oy,f.w*k,f.h*k);
      ctx.fillStyle=dark?'#3a3632':ground; const hs=26*k;
      for(let y=oy+20*k;y<oy+f.h*k-hs;y+=56*k){ ctx.beginPath(); h.rr(ctx,ox+(f.x+18)*k,y,hs,hs*.8,4*k); h.rr(ctx,ox+(f.x+f.w-18)*k-hs,y,hs,hs*.8,4*k); ctx.fill(); } }
    R.forEach(r=>{ const x=ox+r.x*k, y=oy+r.y*k, w=r.w*k, hh=r.h*k;
      if(r.border){ const b=r.border*k; ctx.save(); ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=24; ctx.fillStyle=dark?C.paper:'#fff'; ctx.beginPath(); h.rr(ctx,x-b,y-b,w+2*b,hh+2*b,rad?rad+b:0); ctx.fill(); ctx.restore(); }
      h.photo(r.i,x,y,w,hh,{mode:'contain',r:rad}); });
    if(showLogo){ const lw=170, lh=h.logoH(lw), by=oy+gh; h.logo((W-lw)/2,by+Math.max(40,((H-by)-lh)/2-20),lw,dark?'light':'dark'); }
  }
});
