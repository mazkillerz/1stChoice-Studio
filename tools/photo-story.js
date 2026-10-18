/* Photo story: one tall photo full screen, a headline, a small line and the logo. */
Studio.tool({
  id:'photo-story', title:'Photo story', fileName:'story',
  photos:{count:1}, sampleNote:'Example photo. Tall photos work best here; for wide photos use Cinematic bars.',
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true},
    {id:'pos',type:'seg',in:'style',label:'Text place',options:[{v:'bottom',l:'Bottom'},{v:'top',l:'Top'}]}
  ],
  draw(h,o){
    const {W,H,C}=h;
    h.photo(0,0,0,W,H,{mode:'cover'});
    const top=o.value('pos')==='top';
    if(top){ h.shade(0,900,.62,0); h.shade(H-360,H,0,.35); } else { h.shade(H,H-980,.68,0); h.shade(0,360,.35,0); }
    const head=o.value('head')||h.brand.phrases.headlines[0], small=o.value('small');
    const hm=h.measure(head,{font:'display',size:140,maxW:936}), sm=small?h.measure(small,{weight:'800',size:38,maxW:700}):{h:0};
    const lw=200, lh=h.logoH(lw), rowH=Math.max(sm.h,lh), blockH=hm.h+24+rowH;
    let y=top?300:Math.min(1550,H-210)-blockH;
    const start=h.dir==='rtl'?W-72:72, end=h.dir==='rtl'?72:W-72-lw;
    h.text('head','Headline',head,start,y,{font:'display',size:140,color:C.paper,align:'start',shadow:true,maxW:936}); y+=hm.h+24;
    h.logo(end,y+(rowH-lh)/2,lw,'light');
    if(small) h.text('small','Small line',small,start,y+(rowH-sm.h)/2,{weight:'800',size:38,color:'rgba(255,255,255,.94)',align:'start',shadow:true,maxW:700});
    else h.text('small','Small line','',0,0);
  }
});
