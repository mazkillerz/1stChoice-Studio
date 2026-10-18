/* Carousel: an Instagram feed carousel (1080×1350). Several slides, one photo each, page dots.
   Each slide has its own layout and words; saving makes one numbered PNG per slide. */
const csw=bg=>`<span class="swatch" style="background:${bg};height:38px"><i style="left:4px;right:4px;top:5px;height:16px;border-radius:3px"></i></span>`;
Studio.tool({
  id:'carousel', title:'Carousel', fileName:'carousel',
  size:{w:1080,h:1350}, safe:{top:0,bottom:0},
  pages:{min:2,max:8,start:4},
  photos:{count:1}, sampleNote:'Example photos. Add a photo to each slide; keep the important part in the middle (the grid shows 3:4).',
  styles:[{id:'cream',label:'Cream',swatch:csw('#F3EADC')},{id:'white',label:'White',swatch:csw('#fff')},{id:'black',label:'Black',swatch:csw('#000')}],
  pageNeedsPhoto:value=>value('kind')!=='words',
  fields:[
    {id:'kind',type:'seg',in:'style',label:'This slide',options:[{v:'cover',l:'Cover'},{v:'photo',l:'Photo + words'},{v:'full',l:'Full photo'},{v:'words',l:'Words only'}],pageDefault:pg=>pg===0?'cover':'photo'},
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines,none:true,pageDefault:pg=>pg===0?undefined:'__none'},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true,pageDefault:()=>'__none'},
    {id:'logo',type:'toggle',in:'style',label:'Logo on every slide',default:false}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, kind=o.value('kind'), st=o.style, dark=st==='black', ground=dark?C.night:st==='white'?C.paper:(C.cream||C.paper);
    const head=o.value('head');
    const small=o.value('small'), ink=dark?C.paper:C.ink, muted=dark?C.mutedOnDark:(C.brown||C.muted);
    const dotsOn=(onPhoto)=>h.dots(o.pages,o.page,W/2,H-54,onPhoto?C.paper:ink,onPhoto?'rgba(255,255,255,.45)':(dark?'rgba(255,255,255,.3)':'rgba(0,0,0,.18)'));
    const everyLogo=o.value('logo');
    if(kind==='cover'||kind==='full'){
      h.photo(0,0,0,W,H,{mode:'cover'});
      if(kind==='cover'){ h.shade(H,H-760,.78,0); h.shade(0,300,.35,0);
        const start=h.dir==='rtl'?W-80:80, lw=210;
        h.logo(h.dir==='rtl'?W-80-lw:80,80,lw,'light');
        const hm=head?h.measure(head,{font:'display',size:150,maxW:920}):{h:0}, sm=small?h.measure(small,{weight:'800',size:40,maxW:900}):{h:0};
        let y=H-150-hm.h-(small?sm.h+22:0);
        y+=h.text('head','Headline',head,start,y,{font:'display',size:150,color:C.paper,align:'start',shadow:true,maxW:920})+22;
        h.text('small','Small line',small,start,y,{weight:'800',size:40,color:'rgba(255,255,255,.92)',align:'start',shadow:true,maxW:900});
      } else {
        h.shade(H,H-260,.45,0);
        if(head||small){ h.shade(H,H-620,.6,0); let y=H-150-(small?62:0)-h.measure(head||' ',{font:'display',size:110,maxW:920}).h;
          y+=h.text('head','Headline',head,W/2,y,{font:'display',size:110,color:C.paper,shadow:true,maxW:920})+18;
          h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:'rgba(255,255,255,.92)',shadow:true,maxW:900}); }
        else { h.text('head','Headline','',0,0); h.text('small','Small line','',0,0); }
        if(everyLogo) h.logo((W-170)/2,70,170,'light');
      }
      dotsOn(true); return;
    }
    ctx.fillStyle=ground; ctx.fillRect(0,0,W,H);
    if(kind==='words'){
      const lw=200; if(everyLogo||!o.page) h.logo((W-lw)/2,110,lw,dark?'light':'dark');
      const hm=h.measure(head||' ',{font:'display',size:170,maxW:900}), sm=small?h.measure(small,{weight:'800',size:46,maxW:880}):{h:0};
      let y=(H-hm.h-(small?sm.h+34:0))/2;
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:170,color:ink,maxW:900})+34;
      h.text('small','Small line',small,W/2,y,{weight:'800',size:46,color:muted,maxW:880});
      dotsOn(false); return;
    }
    // photo + words
    const pw=920, hasHead=!!head, hasSmall=!!small, textH=(hasHead?130:0)+(hasSmall?60:0);
    const ph=Math.round(H-80-(textH?textH+70:0)-150), px=(W-pw)/2;
    if(C.blob&&st==='cream'){ ctx.fillStyle=C.blob; ctx.beginPath(); h.rr(ctx,px-22,80-22,pw+44,ph+44,62); ctx.fill(); }
    h.photo(0,px,80,pw,ph,{r:44,mode:'cover'});
    let y=80+ph+(textH?52:0);
    if(everyLogo) h.logo((W-160)/2,124,160,'light');
    y+=h.text('head','Headline',head,W/2,y,{font:'display',size:110,color:ink,maxW:900})+(hasHead?16:0);
    h.text('small','Small line',small,W/2,y,{weight:'800',size:40,color:muted,maxW:900});
    dotsOn(false);
  }
});
