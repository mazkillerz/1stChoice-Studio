/* Photo story: one photo as a story (1080×1920) with a headline, a small line and the logo.
   Four looks keep the words on the photo (Full photo, White / Cream / Black frame), Whole photo shows a wide or square
   photo uncropped on a soft blurred copy of itself, and Caption, Poster and Arch put the photo on a calm solid ground. */
const psw=(bg,inner)=>`<span class="swatch" style="background:${bg}">${inner}</span>`;
const PS_SIZE={s:.8,m:1,l:1.3};   // Headline size: Small · Medium (today's) · Large
const PS_PHOTO=['full','white','cream','black','whole'];
const PS_GROUNDS=['white','cream','black','caption','poster','arch'];

/* the dark fade behind words that sit on a photo: from the top, a soft band, or from the bottom (fa scales it, 1 = full) */
function psShade(h,vp,fa){
  const {H}=h;
  if(vp==='top') h.shade(0,950,.66*fa,0);
  else if(vp==='middle'){ const c=H/2; h.shade(c-560,c,0,.5*fa); h.shade(c+560,c,0,.5*fa); }
  else h.shade(H,H-980,.68*fa,0);
}

/* The words block: headline, then a small line and the logo (side by side, or stacked when centred).
   p: {head, small, hp:'start'|'center'|'end', vp:'top'|'middle'|'bottom', size, color, sub, shadow, tone, logo, noHead}
   Returns {top, bottom, blockH, paint(y)}; paint(y) draws it with its top at y (default: where vp puts it). */
function psWords(h,p){
  const {W,H}=h, rtl=h.dir==='rtl', center=p.hp==='center', hp=p.hp;
  const hm=p.noHead?{h:0}:h.measure(p.head,{font:'display',size:p.size,maxW:936});
  const sm=p.small?h.measure(p.small,{weight:'800',size:38,maxW:center?900:700}):{h:0};
  const lw=200, lh=p.logo?h.logoH(lw):0, rowH=center?(p.small?sm.h+22:0)+lh:Math.max(sm.h,lh), gap=p.noHead||!rowH?0:24, blockH=hm.h+gap+rowH;
  // inside the story's safe zones: never above 250px from the top or below 300px from the bottom
  const home=p.vp==='top'?290:p.vp==='middle'?Math.round((H-blockH)/2):Math.min(1580,H-300)-blockH;
  const leftX=72, rightX=W-72, startX=rtl?rightX:leftX, endX=rtl?leftX:rightX;
  const tx=center?W/2:hp==='start'?startX:endX, al=center?'center':hp;
  const sub=p.sub||'rgba(255,255,255,.94)';
  return {top:home,bottom:home+blockH,blockH,rowH,paint(y0){
    let y=y0==null?home:y0;
    if(!p.noHead){ h.text('head','Headline',p.head,tx,y,{font:'display',size:p.size,color:p.color,shadow:p.shadow,align:al,maxW:936}); y+=hm.h+gap; }
    if(center){
      if(p.small){ h.text('small','Small line',p.small,W/2,y,{weight:'800',size:38,color:sub,shadow:p.shadow,maxW:900}); y+=sm.h+22; } else h.text('small','Small line','',0,0);
      if(p.logo) h.logo((W-lw)/2,y,lw,p.tone);
    } else {
      /* words on one side, the logo on the other side of the same row */
      const textOnRight=(hp==='start')===rtl, logoX=textOnRight?leftX:rightX-lw;
      if(p.logo) h.logo(logoX,y+(rowH-lh)/2,lw,p.tone);
      if(p.small) h.text('small','Small line',p.small,tx,y+(rowH-sm.h)/2,{weight:'800',size:38,color:sub,align:al,shadow:p.shadow,maxW:700});
      else h.text('small','Small line','',0,0);
    }
  }};
}

Studio.tool({
  id:'photo-story', title:'Photo story', fileName:'story',
  photos:{count:1}, sampleNote:'Example photo. Tall photos work best on Full photo; for a wide or square photo try Whole photo, Caption, Poster or Arch.',
  styles:[
    {id:'full',label:'Full photo',swatch:'<span class="swatch" style="background:#b8a58f"></span>'},
    {id:'white',label:'White frame',swatch:'<span class="swatch" style="background:#fff"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'},
    {id:'cream',label:'Cream frame',swatch:'<span class="swatch" style="background:var(--b-cream,#f4efe6)"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'},
    {id:'black',label:'Black frame',swatch:'<span class="swatch" style="background:#000"><i style="inset:4px 4px 8px;border-radius:4px"></i></span>'},
    {id:'whole',label:'Whole photo',swatch:psw('#8d7b68','<i style="left:4px;right:4px;top:14px;height:17px;border-radius:3px;background:#d9c7b0"></i>')},
    {id:'caption',label:'Caption',swatch:psw('#fff','<i style="left:0;right:0;top:0;height:30px"></i>')},
    {id:'poster',label:'Poster',swatch:psw('#fff','<i style="left:4px;right:4px;top:15px;bottom:6px;border-radius:4px"></i>')},
    {id:'arch',label:'Arch',swatch:psw('var(--b-cream,#f4efe6)','<i style="left:6px;right:6px;top:5px;bottom:7px;border-radius:12px 12px 0 0"></i>')}
  ],
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.headlines},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true},
    {id:'bg',type:'color',in:'style',label:'Frame colour',default:null,auto:'Style colour',when:{style:PS_GROUNDS}},
    Studio.groundField({style:['caption','poster','arch']}),
    {id:'pos',type:'place',in:'style',label:'Text place',default:'bottom-start',when:{style:PS_PHOTO}},
    {id:'hsize',type:'seg',in:'style',label:'Headline size',options:[{v:'s',l:'Small'},{v:'m',l:'Medium'},{v:'l',l:'Large'}],default:'m'},
    {id:'fade',type:'range',in:'style',label:'Shade',min:0,max:100,step:5,default:100,unit:'%',when:{style:PS_PHOTO}},
    {id:'tcol',type:'color',in:'style',label:'Words colour',default:null,auto:'Style colour'},
    {id:'logo',type:'toggle',in:'style',label:'Show the logo',default:true}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, st=o.style;
    /* place = "top|middle|bottom - start|center|end" (older saved designs only kept top/middle/bottom) */
    let [vp,hp]=String(o.value('pos')||'bottom').split('-'); hp=hp||'start';
    const head=o.value('head')||h.brand.phrases.headlines[0], small=o.value('small');
    const k=PS_SIZE[o.value('hsize')]||1, size=Math.round(140*k), fa=(o.value('fade')??100)/100, tc=o.value('tcol')||null, logo=o.value('logo')!==false;
    const isCream=c=>String(c||'').toLowerCase()===String(C.cream||'').toLowerCase();
    /* the calm styles: a solid ground, ink words (light words on a dark ground), the second line in the brand's soft tone */
    const ground=st==='arch'?(o.value('bg')||C.cream||C.paper):(o.value('bg')||C.paper), dark=!h.isLight(ground);
    const ink=tc||(dark?C.paper:C.ink), soft=tc||(dark?(C.mutedOnDark||C.paper):isCream(ground)?(C.brown||C.muted):C.muted), tone=dark?'light':'dark';
    const rr=(x,y,w,hh,r)=>{ ctx.beginPath(); h.rr(ctx,x,y,w,hh,r); };

    if(PS_PHOTO.includes(st)){
      /* words over the photo: light with a soft shadow (the words colour can change it) */
      const onTc=tc||C.paper, lightW=h.isLight(onTc);
      const ww=psWords(h,{head,small,hp,vp,size,color:onTc,sub:tc||'rgba(255,255,255,.94)',shadow:lightW,tone:lightW?'light':'dark',logo});
      if(st==='whole'){
        /* the photo shown whole (never cropped) on a blurred, dimmed copy of itself; the words keep to the place chosen */
        const pa=h.photoAspect(0);
        /* the room for the photo: above the words, below them, or (words in the middle, over the photo) the whole safe area */
        const r0=vp==='top'?ww.bottom+56:290, r1=vp==='bottom'?ww.top-56:1580, room=Math.min(1240,r1-r0);
        const ph=Math.min(room,Math.round(936/pa)), pw=Math.round(ph*pa);
        const px=Math.round((W-pw)/2), py=Math.round(Math.max(r0,Math.min(r1-ph,(H-ph)/2)));
        h.backdrop(0,0,0,W,H,{blur:28,dim:.3});
        psShade(h,vp,fa);
        const sc=(ctx.getTransform&&ctx.getTransform().a)||1;   // canvas shadows ignore the save scale: keep them in proportion
        ctx.save(); ctx.shadowColor='rgba(0,0,0,.42)'; ctx.shadowBlur=64*sc; ctx.shadowOffsetY=22*sc; ctx.fillStyle='#000'; rr(px,py,pw,ph,36); ctx.fill(); ctx.restore();
        h.photo(0,px,py,pw,ph,{mode:'contain',r:36});
        if(ww.top<py+ph&&ww.bottom>py){ ctx.save(); rr(px,py,pw,ph,36); ctx.clip(); psShade(h,vp,fa); ctx.restore(); }   // words that sit on the photo get the same shade
      } else if(st!=='full'){
        ctx.fillStyle=o.value('bg')||(st==='black'?C.night:st==='white'?C.paper:(C.cream||C.paper)); ctx.fillRect(0,0,W,H);
        h.photo(0,36,36,W-72,H-72,{mode:'cover',r:46}); ctx.save(); rr(36,36,W-72,H-72,46); ctx.clip();
        psShade(h,vp,fa); ctx.restore();
      } else {
        h.photo(0,0,0,W,H,{mode:'cover'});
        psShade(h,vp,fa);
      }
      ww.paint();
      return;
    }

    h.ground(ground,o.value('gfx'));
    if(st==='caption'){
      /* the photo fills the top, a calm band below holds the words (kept above the story's bottom safe zone) */
      const ww=psWords(h,{head,small,hp:'start',vp:'bottom',size,color:ink,sub:soft,shadow:false,tone,logo});
      const pad=64, ph=Math.round(1620-ww.blockH-pad*2);
      h.photo(0,0,0,W,ph,{mode:'cover'});
      ww.paint(ph+pad);
      return;
    }
    if(st==='poster'){
      /* big headline, the photo as a tall rounded card, a footer row with the small line and the logo */
      const psz=Math.round(190*k), hm=h.measure(head,{font:'display',size:psz,maxW:936});
      const ft=psWords(h,{small,hp:'start',vp:'bottom',noHead:true,color:ink,sub:soft,shadow:false,tone,logo});
      const top=290+hm.h+48, bottom=1580-(ft.rowH?ft.rowH+52:0), ph=bottom-top;
      const sc=(ctx.getTransform&&ctx.getTransform().a)||1;
      if(!dark){ ctx.save(); ctx.shadowColor='rgba(0,0,0,.2)'; ctx.shadowBlur=56*sc; ctx.shadowOffsetY=20*sc; ctx.fillStyle=ground; rr(72,top,W-144,ph,40); ctx.fill(); ctx.restore(); }
      h.photo(0,72,top,W-144,ph,{mode:'cover',r:40});
      h.text('head','Headline',head,W/2,290,{font:'display',size:psz,color:ink,align:'center',maxW:936});
      ft.paint(1580-ft.rowH);
      return;
    }
    /* arch: the photo in an arch, the words centred under it, the logo last */
    const ww=psWords(h,{head,small,hp:'center',vp:'bottom',size,color:ink,sub:soft,shadow:false,tone,logo});
    const aw=816, ax=Math.round((W-aw)/2), ay=290, ah=Math.round(1580-ww.blockH-56-ay);
    const arch=(x,y,w,hh)=>{ const r=w/2; ctx.moveTo(x,y+hh); ctx.lineTo(x,y+r); ctx.arc(x+r,y+r,r,Math.PI,0); ctx.lineTo(x+w,y+hh); ctx.closePath(); };
    ctx.fillStyle=dark?'rgba(255,255,255,.1)':isCream(ground)?(C.blob||'rgba(0,0,0,.06)'):'rgba(0,0,0,.05)';   // a soft arch behind, like a frame
    ctx.beginPath(); arch(ax-28,ay-28,aw+56,ah+28); ctx.fill();
    ctx.save(); ctx.beginPath(); arch(ax,ay,aw,ah); ctx.clip();
    h.photo(0,ax,ay,aw,ah,{mode:'cover'});
    ctx.restore();
    ww.paint(ay+ah+56);
  }
});
