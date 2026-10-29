/* Two-photo split: close-up on top, wide below, a white label on the cut with the words and the logo. */
Studio.tool({
  id:'split', title:'Two-photo split', fileName:'split',
  photos:{count:2}, sampleNote:'Example photos. Close-up on top, wide below. Drag each photo to move it.',
  styles:[
    {id:'white',label:'White label',swatch:'<span class="swatch" style="background:#b8a58f"><i style="left:2px;right:2px;top:19px;height:8px;border-radius:4px;background:#fff"></i></span>'},
    {id:'cream',label:'Cream label',swatch:'<span class="swatch" style="background:#b8a58f"><i style="left:2px;right:2px;top:19px;height:8px;border-radius:4px;background:var(--b-cream,#f4efe6)"></i></span>'},
    {id:'black',label:'Black label',swatch:'<span class="swatch" style="background:#b8a58f"><i style="left:2px;right:2px;top:19px;height:8px;border-radius:4px;background:#000"></i></span>'},
    {id:'gold',label:'Gold label',swatch:'<span class="swatch" style="background:#b8a58f"><i style="left:2px;right:2px;top:19px;height:8px;border-radius:4px;background:var(--b-accent,#c9a66b)"></i></span>'}
  ],
  fields:[
    {id:'cut',type:'seg',in:'style',label:'Where the cut is',options:[{v:'50',l:'Middle'},{v:'60',l:'Lower'},{v:'40',l:'Higher'}]},
    {id:'bg',type:'color',in:'style',label:'Label colour',default:null,auto:'Style colour'},
    {id:'head',type:'chips',label:'Words on the cut',options:b=>b.phrases.cut}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, half=Math.round(H*(+(o.value('cut')||50))/100), st=o.style||'white';
    const band=o.value('bg')||(st==='black'?C.night:st==='gold'?C.accent:st==='cream'?(C.cream||C.paper):C.paper), dark=o.value('bg')?!h.isLight(band):st==='black';
    const bandInk=dark?C.paper:C.ink, rule=dark?'rgba(255,255,255,.3)':st==='gold'?'rgba(0,0,0,.25)':'#d9d8d4';
    h.photo(0,0,0,W,half,{mode:'cover'}); h.photo(1,0,half,W,H-half,{mode:'cover'});
    h.shade(0,300,.35,0); h.shade(H,H-300,.35,0);
    const head=o.value('head')||h.brand.phrases.cut[0];
    // the label: words, a thin line, the logo, on a white rounded band centred on the cut
    const lw=190, lh=h.logoH(lw); let fs=72; let m=h.measure(head,{font:'display',size:fs,maxW:9999});
    while(m.w+28+3+28+lw+100>1000&&fs>44){ fs-=4; m=h.measure(head,{font:'display',size:fs,maxW:9999}); }
    const pw=m.w+28+3+28+lw+100, ph=110, px=(W-pw)/2, py=half-ph/2, rtl=h.dir==='rtl';
    ctx.fillStyle=band; ctx.beginPath(); h.rr(ctx,px,py,pw,ph,ph/2); ctx.fill();
    const textX=rtl?px+pw-52-m.w:px+52, lineX=rtl?textX-28-3:textX+m.w+28, logoX=rtl?lineX-28-lw:lineX+3+28;
    h.text('head','Words',head,textX,py+(ph-m.h)/2,{font:'display',size:fs,color:bandInk,align:rtl?'end':'start',maxW:9999});
    ctx.fillStyle=rule; ctx.fillRect(lineX,py+ph/2-27,3,54);
    h.logo(logoX,py+(ph-lh)/2,lw,dark?'light':'dark');
  }
});
