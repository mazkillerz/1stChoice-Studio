/* New place: a photo of the new sale point in a window, the place name with a pin, and a button. */
const sw=(bg,photo)=>`<span class="swatch" style="background:${bg}"><i style="${photo}"></i></span>`;
Studio.tool({
  id:'new-place', title:'New place', fileName:'new-place', frameOnly:true,
  photos:{count:1},
  styles:[
    {id:'A',label:'White',swatch:sw('#fff','left:4px;right:4px;top:12px;height:16px;border-radius:3px')},
    {id:'B',label:'Black',swatch:sw('#000','left:4px;right:4px;top:12px;height:16px;border-radius:3px')},
    {id:'C',label:'Photo on top',swatch:sw('#fff','left:0;right:0;top:0;height:28px;border-radius:0 0 4px 4px')},
    {id:'D',label:'Cream',swatch:sw('#F3EADC','left:4px;right:4px;top:12px;height:16px;border-radius:3px')}
  ],
  lightBackground:style=>style!=='B',
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.newPlace},
    {id:'place',type:'text',label:'Place name',placeholder:b=>b.phrases.placeName},
    {id:'bg',type:'color',in:'style',label:'Background colour',default:null,auto:'Style colour'},
    {id:'pill',type:'text',label:'Show the button under it',toggle:true,default:b=>b.phrases.buttons[0]}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, ar=h.photoAspect(0), bgc=o.value('bg');
    let win,textTop,logoTop;
    if(o.style==='C'){ const wh=Math.round(Math.max(760,Math.min(1200,W/ar))); win={x:0,y:0,w:W,h:wh,r:[0,0,56,56]}; textTop=wh+60; }
    else { const ww=960; let wh=Math.round(ww/ar); wh=Math.max(540,Math.min(900,wh)); const lh=h.logoH(260); const total=lh+44+wh+44+300; logoTop=Math.max(230,Math.round(250+(1300-total)/2)); win={x:60,y:Math.round(logoTop+lh+44),w:ww,h:wh,r:44}; textTop=win.y+wh+44; }
    const cream=o.style==='D', ground=bgc||(o.style==='B'?C.night:cream?(C.cream||C.paper):C.paper), dark=bgc?!h.isLight(ground):o.style==='B';
    h.photo(0,win.x,win.y,win.w,win.h,{r:win.r,mode:'cover'});
    // the ground with a see-through window (so "Save the frame only" keeps the photo area transparent)
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); h.rr(ctx,win.x,win.y,win.w,win.h,win.r); ctx.fillStyle=ground; ctx.fill('evenodd');
    if(cream&&!bgc&&C.blob&&o.style!=='C'){ ctx.beginPath(); h.rr(ctx,win.x-24,win.y-24,win.w+48,win.h+48,(+win.r||0)+22); h.rr(ctx,win.x,win.y,win.w,win.h,win.r); ctx.fillStyle=C.blob; ctx.fill('evenodd'); }
    ctx.restore();
    const ink=dark?C.paper:C.ink, muted=dark?C.mutedOnDark:cream?(C.brown||C.muted):C.muted; let y=textTop;
    if(o.style==='C') y+=h.logo((W-220)/2,y,220,dark?'light':'dark')+34; else h.logo((W-260)/2,logoTop,260,dark?'light':'dark');
    y+=h.text('head','Headline',o.value('head')||h.brand.phrases.newPlace[0],W/2,y,{font:'display',size:o.style==='C'?108:116,color:ink})+24;
    const pl=h.pin('place','Place name',o.value('place'),W/2,y,{color:muted}); if(pl) y+=pl+30;
    h.pill('pill','Button',o.value('pill'),W/2,y,{bg:dark?C.paper:C.ink,fg:dark?C.night:C.paper});
  }
});
