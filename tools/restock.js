/* Restock: a "back in stock" story. Photo of the cans, an approved headline, the flavour names and a button. */
const rsw=(bg,photo,extra)=>`<span class="swatch" style="background:${bg}"><i style="${photo}"></i>${extra||''}</span>`;
Studio.tool({
  id:'restock', title:'Restock', fileName:'restock',
  photos:{count:1}, sampleNote:'Example photo. A clear photo of the cans works best (cans not touching).',
  styles:[
    {id:'cream',label:'Cream',swatch:rsw('#F3EADC','left:4px;right:4px;top:14px;height:16px;border-radius:4px')},
    {id:'white',label:'White',swatch:rsw('#fff','left:4px;right:4px;top:14px;height:16px;border-radius:4px')},
    {id:'photo',label:'Full photo',swatch:rsw('#b8a58f','inset:0;background:linear-gradient(transparent 50%,rgba(0,0,0,.6))')}
  ],
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.restock||b.phrases.headlines},
    {id:'flav',type:'multi',label:'Flavours back in stock',options:b=>(b.flavours||[]).map(f=>({v:f.id,l:f.name}))},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true,default:b=>b.phrases.small.find(x=>/محدود/.test(x))||'__none'},
    {id:'pill',type:'text',label:'Show a button',toggle:true,default:b=>b.phrases.buttons[0]}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, st=o.style, full=st==='photo', ground=st==='white'?C.paper:(C.cream||C.paper);
    const ink=full?C.paper:C.ink, muted=full?'rgba(255,255,255,.9)':(C.brown||C.muted);
    const head=o.value('head')||h.brand.phrases.restock[0], small=o.value('small'), pill=o.value('pill');
    const fl=(h.brand.flavours||[]).filter(f=>o.value('flav').includes(f.name)).map(f=>full?{text:f.name,bg:f.bg===C.ink?C.paper:f.bg,fg:f.bg===C.ink?C.ink:f.fg}:{text:f.name,bg:f.bg,fg:f.fg});
    const hm=h.measure(head,{font:'display',size:150,maxW:940});
    if(full){
      h.photo(0,0,0,W,H,{mode:'cover'}); h.shade(H,H-1150,.78,0); h.shade(0,420,.45,0);
      h.logo((W-240)/2,250,240,'light');
      const blockH=hm.h+30+(fl.length?70+30:0)+(small?60:0)+(pill?76+30:0);
      let y=Math.min(1560,H-300)-blockH;
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:150,color:ink,shadow:true,maxW:940})+30;
      const t=h.tags('flav','Flavours',fl,W/2,y,{size:36,h:72}); if(t) y+=t+30;
      const s=h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:muted,shadow:true,maxW:900}); if(s) y+=s+30;
      h.pill('pill','Button',pill,W/2,y,{bg:C.paper,fg:C.ink});
      return;
    }
    ctx.fillStyle=ground; ctx.fillRect(0,0,W,H);
    const ar=h.photoAspect(0), pw=920; let ph=Math.round(pw/ar); ph=Math.max(560,Math.min(820,ph));
    const lw=230, lh=h.logoH(lw);
    const total=lh+56+hm.h+44+ph+44+(fl.length?72+30:0)+(small?60:0)+(pill?76+30:0);
    let y=Math.max(250,Math.round((H-total)/2-10));
    y+=h.logo((W-lw)/2,y,lw,'dark')+56;
    y+=h.text('head','Headline',head,W/2,y,{font:'display',size:150,color:ink,maxW:940})+44;
    // a soft shape behind the photo, then the photo
    if(C.blob&&st==='cream'){ ctx.fillStyle=C.blob; ctx.beginPath(); h.rr(ctx,(W-pw)/2-26,y-26,pw+52,ph+52,70); ctx.fill(); }
    h.photo(0,(W-pw)/2,y,pw,ph,{r:44,mode:'cover'}); y+=ph+44;
    const t=h.tags('flav','Flavours',fl,W/2,y,{size:36,h:72}); if(t) y+=t+30;
    const s=h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:muted,maxW:900}); if(s) y+=s+30;
    h.pill('pill','Button',pill,W/2,y,{bg:C.ink,fg:C.paper});
  }
});
