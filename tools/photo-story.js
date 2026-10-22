/* Photo story: one tall photo full screen, a headline, a small line and the logo. */
Studio.tool({
  id:'photo-story', title:'Photo story', fileName:'story',
  photos:{count:1}, sampleNote:'Example photo. Tall photos work best here; for wide photos use Cinematic bars.',
  styles:[
    {id:'full',label:'Full photo',swatch:'<span class="swatch" style="background:#b8a58f"></span>'},
    {id:'white',label:'White frame',swatch:'<span class="swatch" style="background:#fff"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'},
    {id:'cream',label:'Cream frame',swatch:'<span class="swatch" style="background:#F3EADC"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'},
    {id:'black',label:'Black frame',swatch:'<span class="swatch" style="background:#000"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'}
  ],
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true},
    {id:'bg',type:'color',in:'style',label:'Frame colour',default:null,auto:'Style colour',when:{style:['white','cream','black']}},
    {id:'pos',type:'place',in:'style',label:'Text place',default:'bottom-start'}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, framed=o.style==='white'||o.style==='cream'||o.style==='black', rtl=h.dir==='rtl';
    /* place = "top|middle|bottom - start|center|end" (older saved designs only kept top/middle/bottom) */
    let [vp,hp]=String(o.value('pos')||'bottom').split('-'); hp=hp||'start';
    const top=vp==='top', mid=vp==='middle';
    if(framed){ ctx.fillStyle=o.value('bg')||(o.style==='black'?C.night:o.style==='white'?C.paper:(C.cream||C.paper)); ctx.fillRect(0,0,W,H); h.photo(0,36,36,W-72,H-72,{mode:'cover',r:46}); ctx.save(); ctx.beginPath(); h.rr(ctx,36,36,W-72,H-72,46); ctx.clip(); }
    else h.photo(0,0,0,W,H,{mode:'cover'});
    /* the dark fade follows the words: from the top, a soft band, or from the bottom */
    if(top){ h.shade(0,950,.66,0); } else if(mid){ const c=H/2; h.shade(c-560,c,0,.5); h.shade(c+560,c,0,.5); } else { h.shade(H,H-980,.68,0); }
    if(framed) ctx.restore();
    const head=o.value('head')||h.brand.phrases.headlines[0], small=o.value('small'), center=hp==='center';
    const hm=h.measure(head,{font:'display',size:140,maxW:936}), sm=small?h.measure(small,{weight:'800',size:38,maxW:center?900:700}):{h:0};
    const lw=200, lh=h.logoH(lw), rowH=center?(small?sm.h+22:0)+lh:Math.max(sm.h,lh), blockH=hm.h+24+rowH;
    // inside the story's safe zones: never above 250px from the top or below 300px from the bottom
    let y=top?290:mid?Math.round((H-blockH)/2):Math.min(1580,H-300)-blockH;
    const leftX=72, rightX=W-72, startX=rtl?rightX:leftX, endX=rtl?leftX:rightX;
    const tx=center?W/2:hp==='start'?startX:endX, al=center?'center':hp;
    const light={color:C.paper,shadow:true};
    h.text('head','Headline',head,tx,y,{font:'display',size:140,...light,align:al,maxW:936}); y+=hm.h+24;
    if(center){
      if(small){ h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:'rgba(255,255,255,.94)',shadow:true,maxW:900}); y+=sm.h+22; } else h.text('small','Small line','',0,0);
      h.logo((W-lw)/2,y,lw,'light');
    } else {
      /* words on one side, the logo on the other side of the same row */
      const textOnRight=(hp==='start')===rtl, logoX=textOnRight?leftX:rightX-lw;
      h.logo(logoX,y+(rowH-lh)/2,lw,'light');
      if(small) h.text('small','Small line',small,tx,y+(rowH-sm.h)/2,{weight:'800',size:38,color:'rgba(255,255,255,.94)',align:al,shadow:true,maxW:700});
      else h.text('small','Small line','',0,0);
    }
  }
});
