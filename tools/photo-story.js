/* Photo story: one tall photo full screen, a headline, a small line and the logo. */
Studio.tool({
  id:'photo-story', title:'Photo story', fileName:'story',
  photos:{count:1}, sampleNote:'Example photo. Tall photos work best here; for wide photos use Cinematic bars.',
  styles:[
    {id:'full',label:'Full photo',swatch:'<span class="swatch" style="background:#b8a58f"></span>'},
    {id:'cream',label:'Cream frame',swatch:'<span class="swatch" style="background:#F3EADC"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'},
    {id:'black',label:'Black frame',swatch:'<span class="swatch" style="background:#000"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'}
  ],
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true},
    {id:'pos',type:'seg',in:'style',label:'Text place',options:[{v:'bottom',l:'Bottom'},{v:'middle',l:'Middle'},{v:'top',l:'Top'}]}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, framed=o.style==='cream'||o.style==='black', pos=o.value('pos'), top=pos==='top', mid=pos==='middle';
    if(framed){ ctx.fillStyle=o.style==='black'?C.night:(C.cream||C.paper); ctx.fillRect(0,0,W,H); h.photo(0,36,36,W-72,H-72,{mode:'cover',r:46}); ctx.save(); ctx.beginPath(); h.rr(ctx,36,36,W-72,H-72,46); ctx.clip(); }
    else h.photo(0,0,0,W,H,{mode:'cover'});
    if(top){ h.shade(0,900,.62,0); h.shade(H-360,H,0,.35); } else if(mid){ h.shade(0,H,.22,.22); h.shade(0,360,.3,0); h.shade(H,H-360,.3,0); } else { h.shade(H,H-980,.68,0); h.shade(0,360,.35,0); }
    if(framed) ctx.restore();
    const head=o.value('head')||h.brand.phrases.headlines[0], small=o.value('small');
    const hm=h.measure(head,{font:'display',size:140,maxW:936}), sm=small?h.measure(small,{weight:'800',size:38,maxW:700}):{h:0};
    const lw=200, lh=h.logoH(lw), rowH=Math.max(sm.h,lh), blockH=hm.h+24+rowH;
    let y=top?300:mid?Math.round((H-blockH)/2):Math.min(1550,H-210)-blockH;
    const start=h.dir==='rtl'?W-72:72, end=h.dir==='rtl'?72:W-72-lw;
    h.text('head','Headline',head,start,y,{font:'display',size:140,color:C.paper,align:'start',shadow:true,maxW:936}); y+=hm.h+24;
    h.logo(end,y+(rowH-lh)/2,lw,'light');
    if(small) h.text('small','Small line',small,start,y+(rowH-sm.h)/2,{weight:'800',size:38,color:'rgba(255,255,255,.94)',align:'start',shadow:true,maxW:700});
    else h.text('small','Small line','',0,0);
  }
});
