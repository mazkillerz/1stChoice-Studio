/* Cinematic bars: a wide photo shown whole (no crop), black bars above and below, logo and words on the bars. */
Studio.tool({
  id:'cinematic', title:'Cinematic bars', fileName:'story',
  photos:{count:1}, sampleNote:'Example photo. Made for wide photos: the whole photo shows, nothing is cut.',
  styles:[
    {id:'black',label:'Black bars',swatch:'<span class="swatch" style="background:#000"><i style="left:0;right:0;top:15px;height:16px"></i></span>'},
    {id:'cream',label:'Cream bars',swatch:'<span class="swatch" style="background:#F3EADC"><i style="left:0;right:0;top:15px;height:16px"></i></span>'},
    {id:'white',label:'White bars',swatch:'<span class="swatch" style="background:#fff"><i style="left:0;right:0;top:15px;height:16px"></i></span>'}
  ],
  lightBackground:style=>style!=='black',
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true},
    {id:'pill',type:'text',label:'Show a button',toggle:true,default:b=>b.phrases.buttons[0],on:false}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, light=o.style==='cream'||o.style==='white';
    ctx.fillStyle=o.style==='cream'?(C.cream||C.paper):o.style==='white'?C.paper:C.night; ctx.fillRect(0,0,W,H);
    const ink=light?C.ink:C.paper, soft=light?(C.brown||C.muted):'rgba(255,255,255,.8)';
    const ar=h.photoAspect(0); let ph=Math.round(W/ar); const maxH=1000, mode=ph>maxH?'cover':'contain'; ph=Math.min(ph,maxH);
    const py=Math.round(870-ph/2);
    h.photo(0,0,py,W,ph,{mode});
    h.logo((W-230)/2,Math.max(250,py-130),230,light?'dark':'light');
    let y=Math.min(py+ph+110,1400);
    y+=h.text('head','Headline',o.value('head')||h.brand.phrases.headlines[0],W/2,y,{font:'display',size:130,color:ink})+26;
    const s=h.text('small','Small line',o.value('small'),W/2,y,{weight:'600',size:38,color:soft,maxW:900}); if(s) y+=s+30;
    h.pill('pill','Button',o.value('pill'),W/2,y,{bg:light?C.ink:C.paper,fg:light?C.paper:C.night});
  }
});
