/* Carousel: an Instagram feed carousel (1080×1350). Several slides with page dots.
   Slide types: Cover, Photo + words, Full photo, Two photos, Words only, Big number, Panorama (one wide photo across 2–3 slides), End slide.
   "All slides" settings (look, logo, counter, grid guide) are shared; everything else belongs to the slide you're on.
   Saving makes one numbered PNG per slide. */
const csw=bg=>`<span class="swatch" style="background:${bg};height:38px"><i style="left:4px;right:4px;top:5px;height:16px;border-radius:3px"></i></span>`;
/* panoramas: a run of Panorama slides shares the first one's photo, in groups of up to 3 */
function panoInfo(p,kindOf){
  if(kindOf(p)!=='pano') return null;
  let r=p; while(r>0&&kindOf(r-1)==='pano') r--;
  let e=p; for(let i=p+1;kindOf(i)==='pano';i++) e=i;
  const q=r+Math.floor((p-r)/3)*3;
  return {q,part:p-q,n:Math.min(3,e-q+1)};
}
/* the height a text really takes: h.measure reads one line, but people can type a new line (Enter). One line measures
   exactly as before, so old designs keep their layout */
const mLines=(h,str,o)=>{ const L=String(str||'').split('\n'); if(L.length<2) return h.measure(str,o);
  const size=Math.min(...L.map(t=>h.measure(t||' ',o).size)), ms=L.map(t=>h.measure(t||' ',{...o,size}));
  return {w:Math.max(...ms.map(m=>m.w)),h:Math.round(Math.max(...ms.map(m=>m.h))+(L.length-1)*size*1.2),size}; };
/* the old measure where it fits, the true one where the old layout would push words off the slide */
const mFit=(h,str,o,fits)=>{ const a=h.measure(str,o); if(!String(str||'').includes('\n')) return a; const b=mLines(h,str,o); return fits(a,b)?a:b; };
Studio.tool({
  id:'carousel', title:'Carousel', fileName:'carousel',
  size:{w:1080,h:1350}, safe:{top:0,bottom:0},
  pages:{min:2,max:10,start:4},
  photos:{count:2}, quickKind:'photo', sampleNote:'Example photos. Add your photos (pick several at once to fill the slides); keep the important part in the middle (the grid shows 3:4).',
  stylesTitle:'All slides',
  styles:[{id:'white',label:'White',swatch:csw('#fff')},{id:'cream',label:'Cream',swatch:csw('var(--b-cream,#f4efe6)')},{id:'black',label:'Black',swatch:csw('#000')}],
  /* photos each slide takes */
  pagePhotos:(value,c)=>{ const k=value('kind'); if(k==='two') return 2; if(k==='words'||k==='number'||k==='end') return 0;
    if(k==='pano'){ const info=panoInfo(c.page,i=>{ try{ return c.pageValue(i,'kind'); }catch(_){ return null; } }); return info&&info.part?0:1; } return 1; },
  slideKinds:[
    {v:'photo',l:'Photo + words'},{v:'full',l:'Full photo'},{v:'two',l:'Two photos'},{v:'words',l:'Words only'},
    {v:'number',l:'Big number',d:'Steps or highlights'},{v:'cover',l:'Cover'},{v:'end',l:'End slide',d:'Logo + button'},
    {v:'pano',l:'Panorama',d:'One wide photo, 2 slides',slides:2},{v:'pano',l:'Panorama',d:'One wide photo, 3 slides',slides:3}
  ],
  slideDefaults(kind,v,b){ if(kind==='words'||kind==='number'||kind==='cover') v.head={pick:b.phrases.headlines[0],own:''}; if(kind==='end') v.small={pick:'__none',own:''}; },
  fields:[
    {id:'logo',type:'toggle',in:'style',label:'Logo on every slide',default:false,global:true},
    {id:'dots',type:'seg',in:'style',label:'Slide counter',options:[{v:'dots',l:'Dots'},{v:'num',l:'1 / 5'},{v:'none',l:'None'}],global:true},
    {id:'dotsPos',type:'seg',in:'style',label:'Counter place',options:[{v:'bottom',l:'Bottom'},{v:'top',l:'Top'}],global:true,when:{field:'dots',is:['dots','num']}},
    {id:'grid',type:'toggle',in:'style',label:'Show the feed-grid guide (preview only)',default:false,global:true},
    {id:'bg',type:'color',in:'style',label:'Background colour',default:null,auto:'Style colour',global:true},
    {...Studio.groundField(),global:true},
    {id:'gThis',type:'note',in:'style',lead:true,label:'This slide'},
    {id:'kind',type:'seg',in:'style',lead:true,label:'Slide type',options:[{v:'cover',l:'Cover'},{v:'photo',l:'Photo + words'},{v:'full',l:'Full photo'},{v:'two',l:'Two photos'},{v:'words',l:'Words only'},{v:'number',l:'Big number'},{v:'pano',l:'Panorama'},{v:'end',l:'End slide'}],pageDefault:pg=>pg===0?'cover':'photo'},
    {id:'two',type:'seg',in:'style',lead:true,label:'Two photos',options:[{v:'stack',l:'Stacked'},{v:'side',l:'Side by side'}],when:{field:'kind',is:'two'}},
    {id:'place',type:'place',in:'style',lead:true,label:'Words place',when:{field:'kind',is:['cover','full','pano']},pageDefault:pg=>pg===0?'bottom-start':'bottom-center'},
    {id:'num',type:'text',label:'Big number',placeholder:'Leave empty to count automatically',when:{field:'kind',is:'number'}},
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines,none:true,pageDefault:pg=>pg===0?undefined:'__none'},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true,pageDefault:()=>'__none'},
    {id:'pill',type:'text',label:'Button',toggle:true,default:b=>b.phrases.buttons[0],when:{field:'kind',is:'end'}}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, kind=o.value('kind'), st=o.style, bgc=o.value('bg'), ground=bgc||(st==='black'?C.night:st==='white'?C.paper:(C.cream||C.paper)), dark=bgc?!h.isLight(ground):st==='black';
    const head=o.value('head'), small=o.value('small'), ink=dark?C.paper:C.ink, muted=dark?C.mutedOnDark:(C.brown||C.muted);
    const everyLogo=o.value('logo'), rtl=h.dir==='rtl', M=80;
    const counter=o.value('dots')||'dots', cTop=o.value('dotsPos')==='top';
    const drawCounter=onPhoto=>{
      if(counter==='none') return; const y=cTop?54:H-54;
      if(counter==='num'){ const t=h.digits((o.page+1)+' / '+o.pages); ctx.save(); ctx.font='800 30px "'+h.brand.fonts.body+'"'; const w=ctx.measureText(t).width+36, x=rtl?M-20:W-M+20-w, yy=y-24;
        ctx.fillStyle=onPhoto?'rgba(0,0,0,.45)':(dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.07)'); ctx.beginPath(); h.rr(ctx,x,yy,w,48,24); ctx.fill();
        ctx.fillStyle=onPhoto?'#fff':ink; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.direction=h.dir; ctx.fillText(t,x+w/2,yy+25); ctx.restore(); return; }
      h.dots(o.pages,o.page,W/2,y,onPhoto?C.paper:ink,onPhoto?'rgba(255,255,255,.45)':(dark?'rgba(255,255,255,.3)':'rgba(0,0,0,.18)'));
    };
    const gridGuide=()=>{ if(!o.preview||!o.value('grid')) return; const side=(W-H*3/4)/2; ctx.save(); ctx.fillStyle='rgba(255,45,135,.22)'; ctx.fillRect(0,0,side,H); ctx.fillRect(W-side,0,side,H);
      ctx.setLineDash([12,10]); ctx.strokeStyle='rgba(255,45,135,.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(side,0); ctx.lineTo(side,H); ctx.moveTo(W-side,0); ctx.lineTo(W-side,H); ctx.stroke(); ctx.restore(); };
    /* words over a photo, wherever "Words place" says; the fade follows them */
    const photoWords=(big,withLogo)=>{
      let [vp,hp]=String(o.value('place')||'bottom-start').split('-'); hp=hp||'start';
      const center=hp==='center', tx=center?W/2:(hp==='start')!==rtl?M:W-M, al=center?'center':hp;
      const hO=head?h.measure(head,{font:'display',size:big,maxW:920}):{h:0}, sO=small?h.measure(small,{weight:'800',size:40,maxW:900}):{h:0};
      const hR=head?mLines(h,head,{font:'display',size:big,maxW:920}):{h:0}, sR=small?mLines(h,small,{weight:'800',size:40,maxW:900}):{h:0};
      const startAt=bh=>vp==='top'?(withLogo||everyLogo?100:110):vp==='middle'?Math.round((H-bh)/2):H-150-bh;
      const oldOk=startAt(hO.h+(small?sO.h+22:0))+hR.h+(small?sR.h+22:0)<=H-60;   // old layout kept while the words stay on the slide
      const hm=oldOk?hO:hR, sm=oldOk?sO:sR, blockH=hm.h+(small?sm.h+22:0);
      if(head||small){ if(vp==='top') h.shade(0,760,.72,0); else if(vp==='middle'){ h.shade(H/2-520,H/2,0,.5); h.shade(H/2+520,H/2,0,.5); } else h.shade(H,H-760,.75,0); }
      else h.shade(H,H-260,.4,0);
      const lw=withLogo?210:170;
      if(withLogo||everyLogo){ const ly=vp==='top'?H-120-h.logoH(lw):80, lx=center?(W-lw)/2:((hp==='start')!==rtl?W-M-lw:M); if(vp!=='top') h.shade(0,300,.3,0); h.logo(lx,ly,lw,'light'); }
      let y=startAt(blockH);
      y+=h.text('head','Headline',head,tx,y,{font:'display',size:big,color:C.paper,align:al,shadow:true,maxW:920})+(head?22:0);
      h.text('small','Small line',small,tx,y,{weight:'800',size:40,color:'rgba(255,255,255,.92)',align:al,shadow:true,maxW:900});
    };
    if(kind==='cover'||kind==='full'){ h.photo(0,0,0,W,H,{mode:'cover'}); photoWords(kind==='cover'?150:110,kind==='cover'); drawCounter(true); gridGuide(); return; }
    if(kind==='pano'){
      const info=panoInfo(o.page,i=>i<o.pages?o.pageValue(i,'kind'):null)||{q:o.page,part:0,n:1};
      /* the first slide's photo, stretched across the group, this slide shows its part */
      h.photo(0,-info.part*W,0,W*info.n,H,{mode:'cover',page:info.q});
      if(info.part===0) photoWords(110,false); else { h.text('head','Headline','',0,0); h.text('small','Small line','',0,0); h.shade(H,H-220,.35,0); if(everyLogo) h.logo((W-170)/2,80,170,'light'); }
      drawCounter(true); gridGuide(); return;
    }
    h.ground(ground,o.value('gfx'));
    const topLogo=(force)=>{ if(force||everyLogo){ const lw=180; h.logo((W-lw)/2,cTop&&counter!=='none'?104:72,lw,dark?'light':'dark'); return 72+h.logoH(lw)+40; } return 0; };
    if(kind==='words'){
      topLogo(!o.page);
      const fitsW=(a,b)=>(H-a.h)/2+b.h<=H-60;
      const hm=mFit(h,head||' ',{font:'display',size:170,maxW:900},(a,b)=>fitsW({h:a.h+(small?h.measure(small,{weight:'800',size:46,maxW:880}).h+34:0)},{h:b.h+(small?mLines(h,small,{weight:'800',size:46,maxW:880}).h+34:0)}));
      const sm=small?mFit(h,small,{weight:'800',size:46,maxW:880},(a,b)=>fitsW({h:hm.h+a.h+34},{h:hm.h+b.h+34})):{h:0};
      let y=(H-hm.h-(small?sm.h+34:0))/2;
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:170,color:ink,maxW:900})+34;
      h.text('small','Small line',small,W/2,y,{weight:'800',size:46,color:muted,maxW:880});
      drawCounter(false); gridGuide(); return;
    }
    if(kind==='number'){
      let n=String(o.value('num')||'').trim(); if(!n){ let c=0; for(let i=0;i<=o.page;i++) if(o.pageValue(i,'kind')==='number') c++; n=String(c); }
      const t0=topLogo(false);
      const big=h.digits(n), nm=h.measure(big,{font:'display',size:460,maxW:900}), hm=head?mFit(h,head,{font:'display',size:120,maxW:900},(a,b)=>(H-nm.h-a.h)/2+nm.h+b.h+40<=H-60):{h:0}, sm=small?mFit(h,small,{weight:'800',size:44,maxW:880},(a,b)=>(H-nm.h-hm.h-a.h)/2+nm.h+hm.h+b.h+66<=H-60):{h:0};
      const blockH=nm.h+(head?40+hm.h:0)+(small?26+sm.h:0); let y=Math.max(t0+20,(H-blockH)/2-20);
      y+=h.text('num','Big number',big,W/2,y,{font:'display',size:460,color:dark?C.accent:ink,maxW:900})+(head?40:0);
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:120,color:ink,maxW:900})+(small?26:0);
      h.text('small','Small line',small,W/2,y,{weight:'800',size:44,color:muted,maxW:880});
      drawCounter(false); gridGuide(); return;
    }
    if(kind==='end'){
      const lw=460, lh=h.logoH(lw), pill=o.value('pill'), sm=small?mFit(h,small,{weight:'800',size:44,maxW:880},(a,b)=>(H-lh-a.h-190)/2+lh+b.h+190<=H-60):{h:0};
      const blockH=lh+(small?50+sm.h:0)+(pill?60+80:0); let y=(H-blockH)/2-20;
      y+=h.logo((W-lw)/2,y,lw,dark?'light':'dark')+(small?50:0);
      y+=h.text('small','Small line',small,W/2,y,{weight:'800',size:44,color:muted,maxW:880})+(pill?60:0);
      h.text('head','Headline','',0,0);
      h.pill('pill','Button',pill,W/2,y,{bg:dark?C.paper:C.ink,fg:dark?C.ink:C.paper,size:pill?h.measure(String(pill).replace(/\n/g,' '),{weight:'800',size:40,maxW:860}).size:40,h:84});
      drawCounter(false); gridGuide(); return;
    }
    /* Photo + words, Two photos: photos on the ground, words underneath */
    const pw=W-2*M; let textH=(head?130:0)+(small?60:0), avail=Math.round(H-80-(textH?textH+70:0)-150);
    /* words on 2-3 lines need more room than the fixed 130 + 60: the photos give it up (only when the old room would push words off) */
    const needH=(head?mLines(h,head,{font:'display',size:110,maxW:900}).h+16:0)+(small?mLines(h,small,{weight:'800',size:40,maxW:900}).h:0);
    if(80+avail+(textH?52:0)+needH>H-40){ textH=needH+10; avail=Math.round(H-80-(textH+70)-150); }
    if(kind==='two'){
      const g=24, side=o.value('two')==='side';
      if(side){ const w=(pw-g)/2; h.photo(0,M,80,w,avail,{r:36,mode:'cover'}); h.photo(1,M+w+g,80,w,avail,{r:36,mode:'cover'}); }
      else { const hh=(avail-g)/2; h.photo(0,M,80,pw,hh,{r:36,mode:'cover'}); h.photo(1,M,80+hh+g,pw,hh,{r:36,mode:'cover'}); }
    } else {
      if(C.blob&&st==='cream'&&!bgc){ ctx.fillStyle=C.blob; ctx.beginPath(); h.rr(ctx,M-22,80-22,pw+44,avail+44,62); ctx.fill(); }
      h.photo(0,M,80,pw,avail,{r:44,mode:'cover'});
    }
    if(everyLogo) h.logo((W-160)/2,124,160,'light');
    let y=80+avail+(textH?52:0);
    y+=h.text('head','Headline',head,W/2,y,{font:'display',size:110,color:ink,maxW:900})+(head?16:0);
    h.text('small','Small line',small,W/2,y,{weight:'800',size:40,color:muted,maxW:900});
    drawCounter(false); gridGuide();
  }
});
