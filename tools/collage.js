/* Collage: 2, 3 or 4 whole photos (never cropped) in several layouts, no text. */
Studio.tool({
  id:'collage', title:'Collage', fileName:'collage', noZoom:true,
  photos:{min:2,max:4}, sampleNote:'Example photos. Every photo shows whole, never cropped.',
  styles:[{id:'black',label:'Black'},{id:'white',label:'White'},{id:'cream',label:'Cream'}],
  lightBackground:style=>style!=='black',
  fields:[
    {id:'lay2',type:'seg',in:'style',when:{count:2},label:'Layout',options:[{v:'stack',l:'Stacked'},{v:'diag',l:'Diagonal'}]},
    {id:'lay3',type:'seg',in:'style',when:{count:3},label:'Layout',options:[{v:'framed',l:'Framed'},{v:'stagger',l:'Stagger'},{v:'big',l:'Big + 2'}]},
    {id:'lay4',type:'seg',in:'style',when:{count:4},label:'Layout',options:[{v:'wide',l:'Wide / 2 / wide'},{v:'zigzag',l:'Zigzag'}]},
    {id:'logo',type:'toggle',in:'style',label:'Show the logo',default:true},
    {id:'round',type:'toggle',in:'style',label:'Rounded corners',default:false}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, dark=o.style==='black'; ctx.fillStyle=dark?C.night:o.style==='cream'?(C.cream||C.paper):C.paper; ctx.fillRect(0,0,W,H);
    const n=o.count, a=i=>h.photoAspect(i); let R=[];
    const col=(list,gap)=>{let y=0;const out=[];list.forEach(([i,w,x])=>{const hh=w/a(i);out.push({i,x,y,w,h:hh});y+=hh+gap;});return out;};
    const pair=(t,g,i,j,w)=>{const sw=(W-g)/2,s1=sw/a(i),s2=sw/a(j),sh=Math.max(s1,s2);return {rows:[{i,x:0,y:t+(sh-s1)/2,w:sw,h:s1},{i:j,x:W-sw,y:t+(sh-s2)/2,w:sw,h:s2}],h:sh};};
    if(n===2) R=o.value('lay2')==='diag'?col([[0,920,0],[1,920,W-920]],40):col([[0,W,0],[1,W,0]],20);
    else if(n===3){ const L=o.value('lay3');
      if(L==='stagger') R=col([[0,860,0],[1,860,W-860],[2,860,0]],24);
      else if(L==='big'){ const bh=W/a(0); const p=pair(bh+16,16,1,2); R=[{i:0,x:0,y:0,w:W,h:bh},...p.rows]; }
      else R=col([[0,840,(W-840)/2],[1,840,(W-840)/2],[2,840,(W-840)/2]],18);
    } else { const L=o.value('lay4');
      if(L==='zigzag') R=col([[0,690,0],[1,690,W-690],[2,690,0],[3,690,W-690]],12);
      else { const g=14, t=W/a(0), p=pair(t+g,g,1,2); R=[{i:0,x:0,y:0,w:W,h:t},...p.rows,{i:3,x:0,y:t+g+p.h+g,w:W,h:W/a(3)}]; }
    }
    const showLogo=!!o.value('logo'), room=H-(showLogo?260:120);
    let gh=Math.max(...R.map(r=>r.y+r.h)); const k=Math.min(1,room/gh); const gw=W*k, ox=(W-gw)/2; gh*=k; const oy=(H-gh)/2-(showLogo?50:0);
    const rad=o.value('round')?28:0;
    R.forEach(r=>h.photo(r.i,ox+r.x*k,oy+r.y*k,r.w*k,r.h*k,{mode:'contain',r:rad}));
    if(showLogo){ const lw=170, lh=h.logoH(lw), by=oy+gh; h.logo((W-lw)/2,by+Math.max(40,((H-by)-lh)/2-20),lw,dark?'light':'dark'); }
  }
});
