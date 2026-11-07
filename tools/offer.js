/* Offer: a discount story. Offer tiles (e.g. ×3 / 20%), a dates line, a product photo and a button.
   Tiles are numbers you type; for an Arabic brand they're written in Arabic digits (٢٠٪). */
const osw=(bg,photo)=>`<span class="swatch" style="background:${bg}"><i style="${photo}"></i></span>`;
/* the height a text really takes: h.measure reads one line, but people can type a new line (Enter). One line measures
   exactly as before, so old designs keep their layout */
const mLines=(h,str,o)=>{ const L=String(str||'').split('\n'); if(L.length<2) return h.measure(str,o);
  const size=Math.min(...L.map(t=>h.measure(t||' ',o).size)), ms=L.map(t=>h.measure(t||' ',{...o,size}));
  return {w:Math.max(...ms.map(m=>m.w)),h:Math.round(Math.max(...ms.map(m=>m.h))+(L.length-1)*size*1.2),size}; };
/* a button never wider than the story: its words shrink until the pill fits (short words keep size 36 exactly) */
const pillFit=(h,str,size,o)=>({...o,size:str?h.measure(String(str).replace(/\n/g,' '),{weight:'800',size:size||36,maxW:860}).size:size||36});
Studio.tool({
  id:'offer', title:'Offer', fileName:'offer',
  photos:{count:1}, sampleNote:'Example photo. Use a clear product photo (cans not touching).',
  styles:[
    {id:'white',label:'White',swatch:osw('#fff','left:4px;right:4px;top:8px;height:14px;border-radius:3px')},
    {id:'cream',label:'Cream',swatch:osw('var(--b-cream,#f4efe6)','left:4px;right:4px;top:8px;height:14px;border-radius:3px')},
    {id:'black',label:'Black',swatch:osw('#000','left:4px;right:4px;top:8px;height:14px;border-radius:3px')},
    {id:'photo',label:'Full photo',swatch:osw('#b8a58f','inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.65))')}
  ],
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines,default:b=>((b.defaults||{}).offer||{}).head||b.phrases.headlines[0]},
    {id:'tiles',type:'tiles',label:'Offer tiles',max:3,addLabel:'Add a tile',smallLabel:'Top line, e.g. ×3',bigLabel:'Big line, e.g. 20%',
      default:[{small:'×3',big:'20%'}],hint:'Up to 3 tiles. Numbers are written in the brand’s digits automatically.'},
    {id:'dates',type:'dates',label:'Show the dates'},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true,default:'__none'},
    {id:'place',type:'place',in:'style',cols:false,label:'Words place',default:'bottom-center',when:{style:'photo'}},
    {id:'bg',type:'color',in:'style',label:'Background colour',default:null,auto:'Style colour',when:{style:['white','cream','black']}},
    Studio.groundField({style:['white','cream','black']}),
    {id:'pill',type:'text',label:'Show a button',toggle:true,default:b=>((b.defaults||{}).offer||{}).pill||b.phrases.buttons[0]}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, st=o.style, full=st==='photo', bgc=full?null:o.value('bg'), ground=bgc||(st==='black'?C.night:st==='white'?C.paper:(C.cream||C.paper)), dark=bgc?!h.isLight(ground):st==='black';
    const ink=full||dark?C.paper:C.ink, muted=full?'rgba(255,255,255,.9)':dark?C.mutedOnDark:(C.brown||C.muted);
    const head=o.value('head')||h.brand.phrases.headlines[0], tiles=o.value('tiles'), dates=o.value('dates'), small=o.value('small'), pill=o.value('pill');
    const tileBg=full?C.paper:dark?C.accent:C.ink, tileSmall=full?C.ink:dark?C.ink:(C.cream||C.paper), tileBig=full?C.ink:dark?C.ink:C.accent;
    const n=tiles.length, tw=n===1?460:n===2?400:300, th=n?260:0, tg=24, rowW=n*tw+(n-1)*tg;
    /* heights the old way (h.measure) and the true way (several lines); the old one stays while everything fits (old designs unchanged) */
    const hmO=h.measure(head,{font:'display',size:140,maxW:940}), hmR=mLines(h,head,{font:'display',size:140,maxW:940});
    const smallR=small?mLines(h,small,{weight:'800',size:38,maxW:900}).h+30:0, datesR=dates?h.measure(dates,{weight:'800',size:40,maxW:900}).h+26:0;
    const drawTiles=y=>h.block('tiles','Offer tiles',(W-rowW)/2,y,rowW,th,(c,color)=>{
      tiles.forEach((t,i)=>{ const k=h.dir==='rtl'?n-1-i:i, x=k*(tw+tg);
        c.fillStyle=color||tileBg; c.beginPath(); h.rr(c,x,0,tw,th,40); c.fill();
        c.direction=h.dir; c.textAlign='center'; c.textBaseline='alphabetic';
        const sm=h.digits(t.small), bg=h.digits(t.big);
        if(sm){ c.font='800 44px "'+h.brand.fonts.body+'"'; c.fillStyle=tileSmall; c.fillText(sm,x+tw/2,sm&&bg?78:th/2+16,tw-40); }
        if(bg){ let fs=150; c.font=fs+'px "'+h.brand.fonts.display+'"'; while(c.measureText(bg).width>tw-44&&fs>60){ fs-=6; c.font=fs+'px "'+h.brand.fonts.display+'"'; }
          c.fillStyle=tileBig; c.fillText(bg,x+tw/2,sm?th-46:th/2+fs*.36); }
      });
    });
    if(full){
      const vp=String(o.value('place')||'bottom').split('-')[0];
      h.photo(0,0,0,W,H,{mode:'cover'});
      if(vp==='top'){ h.shade(0,1300,.8,0); } else if(vp==='middle'){ h.shade(H/2-700,H/2,0,.62); h.shade(H/2+700,H/2,0,.62); h.shade(0,420,.4,0); } else { h.shade(H,H-1200,.8,0); h.shade(0,420,.45,0); }
      h.logo((W-230)/2,250,230,'light');
      const blk=(hh,sr,dr)=>hh+34+(n?th+36:0)+dr+sr+(pill?76+30:0);
      const lgH=h.logoH(240);
      const at=bh=>vp==='top'?250+lgH+60:vp==='middle'?Math.round((H-bh)/2):Math.min(1580,H-300)-bh;
      const y0=at(blk(hmO.h,small?56:0,dates?56:0)), real=blk(hmR.h,smallR,datesR)-30;
      let y=y0+real<=1621?y0:at(real+30);
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:140,color:ink,shadow:true,maxW:940})+34;
      if(n) y+=drawTiles(y)+36;
      const d=h.text('dates','Dates',dates,W/2,y,{weight:'800',size:40,color:muted,shadow:true,maxW:900}); if(d) y+=d+26;
      const s=h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:muted,shadow:true,maxW:900}); if(s) y+=s+30;
      h.pill('pill','Button',pill,W/2,y,pillFit(h,pill,36,{bg:C.paper,fg:C.ink}));
      return;
    }
    h.ground(ground,o.value('gfx'));
    const ar=h.photoAspect(0), pw=880; let ph=Math.round(pw/ar); ph=Math.max(480,Math.min(640,ph));
    const lw=220, lh=h.logoH(lw);
    const rest=(hh,sr,dr)=>lh+50+hh+40+44+(n?th+40:0)+dr+sr+(pill?76+30:0);
    let total=rest(hmO.h,small?56:0,dates?56:0)+ph, y=Math.max(250,Math.round((H-total)/2-10));
    /* the button would land past the safe line (3 tiles + dates + small line + button, or words on 2-3 lines): the photo gives up
       the room it needs (down to 300) and the block is centred again */
    const need=rest(hmR.h,smallR,datesR)-30;
    if(y+need+ph>1621){ ph=Math.max(300,Math.min(ph,1370-need)); total=need+30+ph; y=Math.max(250,Math.round((H-total)/2-10)); }
    y+=h.logo((W-lw)/2,y,lw,dark?'light':'dark')+50;
    y+=h.text('head','Headline',head,W/2,y,{font:'display',size:140,color:ink,maxW:940})+40;
    h.photo(0,(W-pw)/2,y,pw,ph,{r:44,mode:'cover'}); y+=ph+44;
    if(n) y+=drawTiles(y)+40;
    const d=h.text('dates','Dates',dates,W/2,y,{weight:'800',size:40,color:muted,maxW:900}); if(d) y+=d+26;
    const s=h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:muted,maxW:900}); if(s) y+=s+30;
    h.pill('pill','Button',pill,W/2,y,pillFit(h,pill,36,{bg:dark?C.paper:C.ink,fg:dark?C.ink:C.paper}));
  }
});
