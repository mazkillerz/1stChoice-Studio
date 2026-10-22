/* Collage: 2 to 9 photos. Whole-photo layouts (never cropped), scattered prints, and edge-to-edge grids. No text. */
/* tiny layout drawings for the buttons: boxes in a 30×46 frame */
const lic=(...r)=>`<svg width="30" height="46" viewBox="0 0 30 46" aria-hidden="true"><rect x=".5" y=".5" width="29" height="45" rx="4" fill="none" stroke="currentColor" opacity=".35"/>${r.map(([x,y,w,h,rot])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="currentColor"${rot?` transform="rotate(${rot} ${x+w/2} ${y+h/2})"`:''}/>`).join('')}</svg>`;
/* grid layouts: cells are [column,row,colSpan,rowSpan] in grid units; cell i holds photo i */
const full=(c,r)=>{const o=[];for(let y=0;y<r;y++)for(let x=0;x<c;x++)o.push([x,y]);return o;};
const G=(l,cols,rows,cells)=>({v:'g-'+l.toLowerCase().replace(/[^a-z0-9]+/g,'-'),l,cols,rows,cells:cells||full(cols,rows)});
const GR={
  2:[G('2 rows',1,2),G('2 cols',2,1)],
  3:[G('3 rows',1,3),G('3 cols',3,1),G('Big + 2',2,2,[[0,0,2,1],[0,1],[1,1]]),G('L-shape',2,2,[[0,0,1,2],[1,0],[1,1]])],
  4:[G('2 × 2',2,2),G('4 rows',1,4),G('Strips',4,1),G('Big + 3',3,3,[[0,0,3,2],[0,2],[1,2],[2,2]]),G('L-shape',2,3,[[0,0,1,3],[1,0],[1,1],[1,2]]),G('Bento',2,3,[[0,0,1,2],[1,0],[1,1,1,2],[0,2]])],
  5:[G('Big + 4',2,3,[[0,0,2,1],[0,1],[1,1],[0,2],[1,2]]),G('Hero + frame',2,4,[[0,0],[1,0],[0,1,2,2],[0,3],[1,3]]),G('Bento',2,4,[[0,0,1,2],[1,0],[1,1,1,2],[0,2,1,2],[1,3]]),G('5 rows',1,5)],
  6:[G('2 × 3',2,3),G('3 × 2',3,2),G('Mosaic',3,4,[[0,0,2,2],[2,0],[2,1],[0,2,1,2],[1,2,2,1],[1,3,2,1]]),G('Hero + frame',6,4,[[0,0,2,1],[2,0,2,1],[4,0,2,1],[0,1,6,2],[0,3,3,1],[3,3,3,1]]),G('Big + 5',6,4,[[0,0,6,2],[0,2,2,1],[2,2,2,1],[4,2,2,1],[0,3,3,1],[3,3,3,1]])],
  7:[G('Mosaic',3,4,[[0,0,2,2],[2,0],[2,1],[0,2],[1,2],[2,2],[0,3,3,1]]),G('Top hero + grid',3,4,[[0,0,3,2],[0,2],[1,2],[2,2],[0,3],[1,3],[2,3]])],
  8:[G('2 × 4',2,4),G('4 × 2',4,2),G('Mosaic',3,4,[[0,0,2,2],[2,0],[2,1],[0,2],[1,2],[2,2],[0,3],[1,3,2,1]]),G('Big + 7',4,4,[[0,0,3,3],[3,0],[3,1],[3,2],[0,3],[1,3],[2,3],[3,3]])],
  9:[G('3 × 3',3,3),G('Top hero + grid',4,4,[[0,0,4,2],...full(4,2).map(([x,y])=>[x,y+2])]),G('Mosaic',3,4,[[0,0,2,2],[2,0],[2,1],[0,2],[1,2],[2,2],[0,3],[1,3],[2,3]])]
};
/* grid cell boxes inside area (ax,ay,aw,ah) with a gap */
const cellBoxes=(g,ax,ay,aw,ah,gap)=>{ const cw=(aw-gap*(g.cols-1))/g.cols, rh=(ah-gap*(g.rows-1))/g.rows;
  return g.cells.map(([c,r,cs=1,rs=1])=>({x:ax+c*(cw+gap),y:ay+r*(rh+gap),w:cs*cw+(cs-1)*gap,h:rs*rh+(rs-1)*gap})); };
const gridIc=g=>lic(...cellBoxes(g,3,3,24,40,1.5).map(b=>[b.x,b.y,b.w,b.h]));
/* scattered prints: slots as fractions of the area [centreX,centreY,width,height,tilt°] */
const SC={
  2:[[.5,.25,.86,.46,-3],[.5,.75,.86,.46,3]],
  3:[[.42,.17,.8,.31,-3],[.58,.5,.8,.31,3],[.42,.83,.8,.31,-2]],
  4:[[.26,.25,.47,.46,-4],[.74,.28,.47,.46,3],[.26,.75,.47,.46,3],[.74,.72,.47,.46,-3]],
  5:[[.26,.17,.47,.3,-4],[.74,.17,.47,.3,3],[.5,.5,.62,.3,-2],[.26,.83,.47,.3,3],[.74,.83,.47,.3,-3]],
  6:[[.26,.17,.47,.3,-4],[.74,.17,.47,.3,3],[.26,.5,.47,.3,3],[.74,.5,.47,.3,-3],[.26,.83,.47,.3,-3],[.74,.83,.47,.3,4]]
};
const scIc={2:lic([4,6,22,15,-4],[4,25,22,15,4]),3:lic([4,4,22,10,-4],[4,17,22,10,4],[4,30,22,10,-3]),4:lic([3,6,12,14,-5],[15,8,12,14,4],[3,25,12,14,4],[15,24,12,14,-4]),5:lic([3,5,12,10,-5],[15,5,12,10,4],[8,18,14,10,-3],[3,31,12,10,4],[15,31,12,10,-4]),6:lic([3,4,12,10,-5],[15,4,12,10,4],[3,18,12,10,4],[15,18,12,10,-4],[3,32,12,10,-4],[15,32,12,10,5])};
const lay=(n,whole)=>({id:'lay'+n,type:'seg',when:{count:n},in:'style',label:'Layout',options:[...whole,...GR[n].map(g=>({v:g.v,l:g.l,ic:gridIc(g)})),...(scIc[n]?[{v:'scatter',l:'Scattered prints',ic:scIc[n]}]:[])]});
Studio.tool({
  id:'collage', title:'Collage', fileName:'collage',
  photos:{min:2,max:9}, sampleNote:'Example photos. Pick a layout; drag a photo onto another to swap them, pinch to zoom.',
  styles:[{id:'white',label:'White'},{id:'cream',label:'Cream'},{id:'black',label:'Black'}],
  lightBackground:style=>style!=='black',
  fields:[
    lay(2,[
      {v:'stack',l:'Stacked',ic:lic([4,9,22,12],[4,25,22,12])},
      {v:'diag',l:'Diagonal',ic:lic([3,9,17,12],[10,25,17,12])},
      {v:'side',l:'Side by side',ic:lic([3,16,11,14],[16,16,11,14])},
      {v:'inset',l:'Big + small',ic:lic([3,8,24,20],[14,24,13,10])}]),
    lay(3,[
      {v:'framed',l:'Framed',ic:lic([6,6,18,10],[6,18,18,10],[6,30,18,10])},
      {v:'stagger',l:'Stagger',ic:lic([3,6,17,10],[10,18,17,10],[3,30,17,10])},
      {v:'big',l:'Big + 2',ic:lic([3,10,24,14],[3,26,11,9],[16,26,11,9])},
      {v:'row',l:'Three in a row',ic:lic([2,15,8,16],[11,15,8,16],[20,15,8,16])},
      {v:'tall2',l:'Tall + 2',ic:lic([3,10,13,26],[18,10,9,12],[18,24,9,12])}]),
    lay(4,[
      {v:'wide',l:'Wide / 2 / wide',ic:lic([3,5,24,9],[3,16,11,9],[16,16,11,9],[3,27,24,9])},
      {v:'zigzag',l:'Zigzag',ic:lic([3,4,16,9],[11,14,16,9],[3,24,16,9],[11,34,16,9])},
      {v:'grid',l:'2 × 2 whole',ic:lic([3,11,11,11],[16,11,11,11],[3,24,11,11],[16,24,11,11])},
      {v:'big3',l:'Big + 3 whole',ic:lic([3,9,24,16],[3,27,7,8],[11.5,27,7,8],[20,27,7,8])},
      {v:'film',l:'Film strip',ic:lic([8,4,14,38],[10,6,10,8],[10,16,10,8],[10,26,10,8],[10,36,10,4])}]),
    lay(5,[]),lay(6,[]),lay(7,[]),lay(8,[]),lay(9,[]),
    {id:'gap',type:'range',in:'style',label:'Gap',min:0,max:60,step:2,default:14,unit:'px'},
    {id:'bg',type:'color',in:'style',label:'Gap & background colour',default:null,auto:'Style colour'},
    {id:'margin',type:'toggle',in:'style',label:'Outer margin',default:true},
    {id:'radius',type:'range',in:'style',label:'Corner radius',min:0,max:60,step:2,default:0,unit:'px'},
    {id:'logo',type:'toggle',in:'style',label:'Show the logo',default:true}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, light=h.isLight||(x=>{const m=/^#?([0-9a-f]{6})$/i.exec(x||'');if(!m)return false;const n=parseInt(m[1],16);return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>150;});
    const V=(id,d)=>{const v=o.value(id);return v==null?d:v;};
    const bg=o.value('bg')||(o.style==='black'?C.night:o.style==='cream'?(C.cream||C.paper):C.paper), dk=!light(bg);
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);   // gaps show this colour
    const n=o.count, a=i=>h.photoAspect(i), gap=V('gap',14), g=gap, rad=V('radius',0), showLogo=!!V('logo',true), margin=V('margin',true)!==false;
    let L=o.value('lay'+n); if(L==='polaroid') L='scatter';   // old designs
    const grid=(GR[n]||[]).find(x=>x.v===L), isScatter=L==='scatter'&&SC[n];
    /* logo centred between a given y and the canvas bottom */
    const logoBelow=by=>{ if(!showLogo) return; const lw=170, lh=h.logoH(lw); h.logo((W-lw)/2,by+Math.max(40,((H-by)-lh)/2-20),lw,dk?'light':'dark'); };
    /* grid layouts: photos fill the area exactly (cropped, pan/zoom by the person) */
    if(grid){
      let ax=0,ay=0,aw=W,ah=H;
      if(margin){ const m=Math.max(gap,40); ax=m; ay=m; aw=W-2*m; ah=(showLogo?H-260:H-m)-m; }
      cellBoxes(grid,ax,ay,aw,ah,gap).forEach((b,i)=>h.photo(i,b.x,b.y,b.w,b.h,{mode:'cover',r:rad}));
      if(margin) logoBelow(ay+ah); else if(showLogo){ const lw=170; h.logo((W-lw)/2,H-300,lw,'light'); }
      return;
    }
    /* scattered prints: no frames, small tilts, soft shadow, photos shown whole */
    if(isScatter){
      const ay=110, ah=H-ay-(showLogo?280:110), ax=60, aw=W-120;
      /* two arrangements: the slots above, or one tilted column (better for wide photos); the one with bigger photos wins */
      const col=SC[n].map(([,,,,t],k)=>[k%2?.56:.44,(k+.5)/n,.84,1.12/n,t]);
      const fit=slots=>slots.map(([fx,fy,fw,fh,tilt],i)=>{ const sw=fw*aw, sh=fh*ah, w=Math.min(sw,sh*a(i)); return {cx:ax+fx*aw,cy:ay+fy*ah,w,hh:w/a(i),tilt}; });
      const area=P=>P.reduce((s,p)=>s+p.w*p.hh,0), A=fit(SC[n]), B2=fit(col), P=area(B2)>area(A)*1.15?B2:A;
      P.forEach((p,i)=>{ ctx.save(); ctx.translate(p.cx,p.cy); ctx.rotate(p.tilt*Math.PI/180);
        ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=34; ctx.shadowOffsetY=12; ctx.fillStyle='#000'; ctx.beginPath(); h.rr(ctx,-p.w/2,-p.hh/2,p.w,p.hh,rad); ctx.fill(); ctx.restore();
        h.photo(i,p.cx-p.w/2,p.cy-p.hh/2,p.w,p.hh,{mode:'contain',r:rad,rot:p.tilt}); });
      logoBelow(ay+ah); return;
    }
    /* whole-photo layouts (2 to 4 photos): never cropped */
    let R=[], film=null;
    const col=(list,gp)=>{let y=0;const out=[];list.forEach(([i,w,x])=>{const hh=w/a(i);out.push({i,x,y,w,h:hh});y+=hh+gp;});return out;};
    /* k photos in one row, all the same height, filling the width */
    const rowOf=(ids,t,gp)=>{ const sum=ids.reduce((s,i)=>s+a(i),0), hh=(W-gp*(ids.length-1))/sum; let x=0; return {rows:ids.map(i=>{ const r={i,x,y:t,w:hh*a(i),h:hh}; x+=r.w+gp; return r; }),h:hh}; };
    const pair=(t,gp,i,j)=>{const sw=(W-gp)/2,s1=sw/a(i),s2=sw/a(j),sh=Math.max(s1,s2);return {rows:[{i,x:0,y:t+(sh-s1)/2,w:sw,h:s1},{i:j,x:W-sw,y:t+(sh-s2)/2,w:sw,h:s2}],h:sh};};
    if(n===2){
      if(L==='diag') R=col([[0,920,0],[1,920,W-920]],g*2+12);
      else if(L==='side') R=pair(0,g,0,1).rows;
      else if(L==='inset'){ const bh=W/a(0), sw=460, sh=sw/a(1); R=[{i:0,x:0,y:0,w:W,h:bh},{i:1,x:W-sw-40,y:bh-sh*0.55,w:sw,h:sh,border:16}]; }
      else R=col([[0,W,0],[1,W,0]],g);
    } else if(n===3){
      if(L==='stagger') R=col([[0,860,0],[1,860,W-860],[2,860,0]],g+10);
      else if(L==='big'){ const bh=W/a(0); R=[{i:0,x:0,y:0,w:W,h:bh},...pair(bh+g,g,1,2).rows]; }
      else if(L==='row') R=rowOf([0,1,2],0,g).rows;
      else if(L==='tall2'){ /* the tallest photo takes the big spot */
        const [b0,b1,b2]=[0,1,2].sort((p,q)=>a(p)-a(q)), s=1/a(b1)+1/a(b2), wl=((W-g)*s+g)/(1/a(b0)+s), wr=W-wl-g, h1=wr/a(b1);
        R=[{i:b0,x:0,y:0,w:wl,h:wl/a(b0)},{i:b1,x:wl+g,y:0,w:wr,h:h1},{i:b2,x:wl+g,y:h1+g,w:wr,h:wr/a(b2)}]; }
      else R=col([[0,840,(W-840)/2],[1,840,(W-840)/2],[2,840,(W-840)/2]],g+4);
    } else {
      if(L==='zigzag') R=col([[0,690,0],[1,690,W-690],[2,690,0],[3,690,W-690]],g);
      else if(L==='grid'){ const p1=pair(0,g,0,1), p2=pair(p1.h+g,g,2,3); R=[...p1.rows,...p2.rows]; }
      else if(L==='big3'){ const bh=W/a(0); R=[{i:0,x:0,y:0,w:W,h:bh},...rowOf([1,2,3],bh+g,g).rows]; }
      else if(L==='film'){ const fw=760, x=(W-fw)/2, fg=26; let y=40; R=[0,1,2,3].map(i=>{ const r={i,x,y,w:fw,h:fw/a(i)}; y+=r.h+fg; return r; }); film={x:x-70,w:fw+140,h:y-fg+40}; }
      else { const t=W/a(0), p=pair(t+g,g,1,2); R=[{i:0,x:0,y:0,w:W,h:t},...p.rows,{i:3,x:0,y:t+g+p.h+g,w:W,h:W/a(3)}]; }
    }
    const room=H-(showLogo?260:120);
    let gh=Math.max(...R.map(r=>r.y+r.h))+(film?80:0); const gwid=Math.max(...R.map(r=>r.x+r.w));
    const k=Math.min(1,room/gh,W/Math.max(W,gwid)); const ox=(W-W*k)/2; gh*=k; const oy=(H-gh)/2-(showLogo?50:0);
    if(film){ ctx.fillStyle='#141210'; ctx.fillRect(ox+film.x*k,oy,film.w*k,film.h*k);
      ctx.fillStyle=dk?'#3a3632':bg; const hs=26*k;
      for(let y=oy+20*k;y<oy+film.h*k-hs;y+=56*k){ ctx.beginPath(); h.rr(ctx,ox+(film.x+18)*k,y,hs,hs*.8,4*k); h.rr(ctx,ox+(film.x+film.w-18)*k-hs,y,hs,hs*.8,4*k); ctx.fill(); } }
    R.forEach(r=>{ const x=ox+r.x*k, y=oy+r.y*k, w=r.w*k, hh=r.h*k;
      if(r.border){ const b=r.border*k; ctx.save(); ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=24; ctx.fillStyle=dk?C.paper:'#fff'; ctx.beginPath(); h.rr(ctx,x-b,y-b,w+2*b,hh+2*b,rad?rad+b:0); ctx.fill(); ctx.restore(); }
      h.photo(r.i,x,y,w,hh,{mode:'contain',r:rad}); });
    logoBelow(oy+gh);
  }
});
