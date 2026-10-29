/* Restock: a "back in stock" story. An approved headline, the flavour names and a button, on one of six looks:
   White / Cream (photo card), Full photo, Cans (the brand's HD can cut-outs, no photo), Split (photo on top) and Big words (huge headline). */
const rsw=(bg,photo,extra)=>`<span class="swatch" style="background:${bg}"><i style="${photo}"></i>${extra||''}</span>`;
const sb=css=>`<i style="${css}"></i>`;   // one small drawn piece of a style button
const swx=(bg,...parts)=>`<span class="swatch" style="background:${bg}">${parts.join('')}</span>`;
const same=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
/* a colour moved a little toward another one (hex only) */
const mixHex=(a,b,t)=>{ const p=x=>{ const m=/^#?([0-9a-f]{6})$/i.exec(x||''); return m?[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)):null; }, A=p(a), B=p(b); if(!A||!B) return a; return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); };
/* the room one photo gets: a rounded card, a circle or an arch; room = the height the rest of the page leaves */
const photoBox=(shape,pw,ph,room)=>{
  if(shape==='circle'){ const d=Math.max(520,Math.min(780,pw,room)); return {w:d,h:d}; }
  if(shape==='arch'){ const hh=Math.max(520,Math.min(820,room)); return {w:Math.min(pw,Math.round(hh*.92)),h:hh}; }
  return {w:pw,h:Math.max(520,Math.min(ph,room))};
};
Studio.tool({
  id:'restock', title:'Restock', fileName:'restock',
  photos:{count:1}, sampleNote:'Example photo. A clear photo of the cans works best (cans not touching).',
  photosFor:o=>o.style!=='cans',   // Cans uses the HD can pictures, so no photo box and nothing to add before Save
  photoStyle:'white',              // adding a photo while on Cans switches to this look
  noPhotoNote:'Cans uses the HD can pictures, so no photo is needed. Tap Save when it looks good.',
  noPhotoHint:'No photo needed. Tap a word to change it.',
  styles:[
    {id:'white',label:'White',swatch:rsw('#fff','left:4px;right:4px;top:14px;height:16px;border-radius:4px')},
    {id:'cream',label:'Cream',swatch:rsw('var(--b-cream,#f4efe6)','left:4px;right:4px;top:14px;height:16px;border-radius:4px')},
    {id:'photo',label:'Full photo',swatch:rsw('#b8a58f','inset:0;background:linear-gradient(transparent 50%,rgba(0,0,0,.6))')},
    {id:'cans',label:'Cans',swatch:swx('#fff',
      sb('left:7px;right:7px;top:6px;height:4px;border-radius:2px;background:var(--b-ink,#111)'),
      sb('left:4px;right:4px;top:14px;height:21px;border-radius:5px;background:var(--b-panel,#f2f2f2)'),
      sb('left:8px;top:17px;width:6px;height:15px;border-radius:2px 2px 3px 3px;background:var(--b-ink,#111)'),
      sb('left:17px;top:17px;width:6px;height:15px;border-radius:2px 2px 3px 3px;background:var(--b-yellow,#f2c94c)'),
      sb('left:9px;right:9px;top:39px;height:4px;border-radius:2px;background:var(--b-ink,#111)'))},
    {id:'split',label:'Split',swatch:swx('#fff',
      sb('left:0;right:0;top:0;height:27px;border-radius:0 0 6px 6px'),
      sb('left:7px;right:7px;top:31px;height:4px;border-radius:2px;background:var(--b-ink,#111)'),
      sb('left:9px;right:9px;top:39px;height:4px;border-radius:2px;background:var(--b-ink,#111)'))},
    {id:'poster',label:'Big words',swatch:swx('#fff',
      sb('left:4px;right:4px;top:5px;height:9px;border-radius:2px;background:var(--b-ink,#111)'),
      sb('left:4px;right:4px;top:18px;height:17px;border-radius:5px'),
      sb('left:9px;right:9px;top:39px;height:4px;border-radius:2px;background:var(--b-ink,#111)'))}
  ],
  fields:[
    {id:'head',type:'chips',label:'Headline',options:b=>b.phrases.restock||b.phrases.headlines},
    {id:'bg',type:'color',in:'style',label:'Background colour',default:null,auto:'Style colour',when:{style:['white','cream','cans','split','poster']}},
    {id:'flav',type:'multi',label:'Flavours back in stock',options:b=>(b.flavours||[]).map(f=>({v:f.id,l:f.name}))},
    {id:'small',type:'chips',label:'Small line',options:b=>b.phrases.small,none:true,default:b=>((b.defaults||{}).restock||{}).small||'__none'},
    {id:'place',type:'place',in:'style',cols:false,label:'Words place',default:'bottom-center',when:{style:'photo'}},
    {id:'shape',type:'seg',in:'style',label:'Photo shape',default:'rounded',when:{style:['white','cream','poster']},options:[{v:'rounded',l:'Rounded'},{v:'circle',l:'Circle'},{v:'arch',l:'Arch'},{v:'square',l:'Square'}]},
    {id:'hsize',type:'seg',in:'style',label:'Headline size',default:'medium',options:[{v:'small',l:'Small'},{v:'medium',l:'Medium'},{v:'large',l:'Large'}]},
    {id:'btn',type:'color',in:'style',label:'Button colour',default:null,auto:'Automatic'},
    {id:'pill',type:'text',label:'Show a button',toggle:true,default:b=>b.phrases.buttons[0]}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, st=o.style, full=st==='photo', bgc=full?null:o.value('bg'), ground=bgc||(st==='cream'?(C.cream||C.paper):C.paper), dark=!!bgc&&!h.isLight(ground);
    const classic=st==='white'||st==='cream';   // the two original photo-card looks keep their original colours
    const ink=full||dark?C.paper:C.ink;
    const muted=full?'rgba(255,255,255,.9)':dark?C.mutedOnDark:classic?(C.brown||C.muted)
      :(same(ground,C.paper)||same(ground,C.panel))?C.muted:(same(ground,C.cream)||same(ground,C.blob))?(C.brown||C.muted):C.ink;
    const head=o.value('head')||h.brand.phrases.restock[0], small=o.value('small'), pill=o.value('pill');
    const picked=(h.brand.flavours||[]).filter(f=>o.value('flav').includes(f.name));
    const fl=picked.map(f=>full||dark?{text:f.name,bg:f.bg===C.ink?C.paper:f.bg,fg:f.bg===C.ink?C.ink:f.fg}:{text:f.name,bg:f.bg,fg:f.fg});
    /* headline size (Small / Medium / Large) and button colour (automatic unless one is picked) */
    const hk={small:.8,large:1.22}[o.value('hsize')]||1, hsz=n=>Math.round(n*hk);
    const bt=o.value('btn'), btn=(bg,fg)=>bt?{bg:bt,fg:h.isLight(bt)?C.ink:C.paper}:{bg,fg};
    const shape=['circle','arch','square'].includes(o.value('shape'))?o.value('shape'):'rounded';
    const smallH=small?h.measure(small,{weight:'800',size:38,maxW:900}).h:0;
    /* flavours, small line and button, one under the other, centred */
    const tail=(y,sh,pillBtn)=>{
      const t=h.tags('flav','Flavours',fl,W/2,y,{size:36,h:72}); if(t) y+=t+30;
      const s=h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:muted,maxW:900,...(sh?{shadow:true}:{})}); if(s) y+=s+30;
      h.pill('pill','Button',pill,W/2,y,pillBtn);
    };
    /* the height of that tail, from what is really shown */
    const tailH=()=>{ const r=[fl.length?72:0,smallH,pill?76:0].filter(Boolean); return r.reduce((a,b)=>a+b,0)+30*Math.max(0,r.length-1); };
    /* a photo outline: rounded (today's look), circle, arch (round top) or square; grow = extra pixels all round */
    const outline=(x,y,w,hh,g)=>{
      ctx.beginPath();
      if(shape==='circle') ctx.arc(x+w/2,y+hh/2,Math.min(w,hh)/2+g,0,Math.PI*2);
      else if(shape==='arch'){ ctx.moveTo(x-g,y+hh+g); ctx.lineTo(x-g,y+w/2); ctx.arc(x+w/2,y+w/2,w/2+g,Math.PI,0); ctx.lineTo(x+w+g,y+hh+g); ctx.closePath(); }
      else h.rr(ctx,x-g,y-g,w+2*g,hh+2*g,shape==='square'?0:44+g);
    };
    /* the photo itself stays a normal photo layer (drag + zoom); circle and arch are clipped around it */
    const putPhoto=(x,y,w,hh)=>{
      if(shape==='circle'||shape==='arch'){ ctx.save(); outline(x,y,w,hh,0); ctx.clip(); h.photo(0,x,y,w,hh,{mode:'cover'}); ctx.restore(); }
      else h.photo(0,x,y,w,hh,{r:shape==='square'?0:44,mode:'cover'});
    };

    /* ---- Full photo ---- */
    if(full){
      const hm=h.measure(head,{font:'display',size:hsz(150),maxW:940});
      const vp=String(o.value('place')||'bottom').split('-')[0];
      h.photo(0,0,0,W,H,{mode:'cover'});
      if(vp==='top'){ h.shade(0,1300,.8,0); } else if(vp==='middle'){ h.shade(H/2-700,H/2,0,.62); h.shade(H/2+700,H/2,0,.62); h.shade(0,420,.4,0); } else { h.shade(H,H-1200,.8,0); h.shade(0,420,.45,0); }
      h.logo((W-240)/2,250,240,'light');
      const blockH=hm.h+30+(fl.length?70+30:0)+(small?60:0)+(pill?76+30:0);
      const lgH=h.logoH(240);
      let y=vp==='top'?250+lgH+60:vp==='middle'?Math.round((H-blockH)/2):Math.min(1560,H-300)-blockH;
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:hsz(150),color:ink,shadow:true,maxW:940})+30;
      const t=h.tags('flav','Flavours',fl,W/2,y,{size:36,h:72}); if(t) y+=t+30;
      const s=h.text('small','Small line',small,W/2,y,{weight:'800',size:38,color:muted,shadow:true,maxW:900}); if(s) y+=s+30;
      h.pill('pill','Button',pill,W/2,y,btn(C.paper,C.ink));
      return;
    }
    ctx.fillStyle=ground; ctx.fillRect(0,0,W,H);
    const logoTone=dark?'light':'dark';

    /* ---- Cans: the HD can cut-out(s) on a soft panel, no photo ---- */
    if(st==='cans'){
      const hm=h.measure(head,{font:'display',size:hsz(150),maxW:940});
      const lw=230, lh=h.logoH(lw), pw=920;
      const rest=lh+56+hm.h+44+44+tailH();
      const ph=Math.max(460,Math.min(760,1330-rest)), total=rest+ph;
      let y=Math.max(250,Math.round((H-total)/2-10));
      y+=h.logo((W-lw)/2,y,lw,logoTone)+56;
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:hsz(150),color:ink,maxW:940})+44;
      /* a soft panel: grey on a white ground, the warm blob tone on cream, a lighter tint on a dark ground */
      const panel=dark?mixHex(ground,'#ffffff',.1):same(ground,C.paper)?(C.panel||mixHex(ground,'#000000',.05)):same(ground,C.cream)?(C.blob||mixHex(ground,'#000000',.06)):mixHex(ground,'#000000',.06);
      ctx.fillStyle=panel; ctx.beginPath(); h.rr(ctx,(W-pw)/2,y,pw,ph,64); ctx.fill();
      /* both flavours (or none) = the pair cut-out; exactly one = that flavour's can. The pair keeps a gap: cans never touch. */
      const one=picked.length===1&&picked[0].can?picked[0].can:null, ref=one||(h.brand.products||{}).both;
      if(ref){
        /* the HD cut-outs: one can is 1964×2994, both are 3893×2994 (a little transparent margin round each) */
        const cw=one?Math.round(ph*.7):Math.min(Math.round(pw*.86),Math.round(ph*1.24)), cy=Math.round(y+ph/2+ph*.015), chh=Math.round(cw*(one?2994/1964:2994/3893));
        h.asset({id:'cans',ref,label:'Cans',x:W/2,y:cy,w:cw});
        /* the same box once more as an empty layer: the can picture loads a moment after the first drawing, and without this the
           'cans' layer would only appear then and count as an edit (a fresh Cans would stop being one-tap Save) */
        h.block('cans','Cans',W/2-cw/2,cy-chh/2,cw,chh,()=>{},'asset');
      }
      y+=ph+44;
      tail(y,false,btn(dark?C.paper:C.ink,dark?C.ink:C.paper));
      return;
    }

    /* ---- Split: the photo fills the top, the words sit on the ground below ---- */
    if(st==='split'){
      const hm=h.measure(head,{font:'display',size:hsz(150),maxW:940});
      const lw=240, blockH=hm.h+(tailH()?28+tailH():0), top=Math.min(1570-blockH,1420);
      const photoH=Math.max(880,Math.min(1250,top-50));
      h.photo(0,0,0,W,photoH,{r:[0,0,56,56],mode:'cover'});
      h.shade(0,600,.5,0);
      h.logo((W-lw)/2,250,lw,'light');
      let y=Math.max(photoH+50,top);
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:hsz(150),color:ink,maxW:940})+28;
      tail(y,false,btn(dark?C.paper:C.ink,dark?C.ink:C.paper));
      return;
    }

    /* ---- Big words: a huge headline, then the photo as a big card ---- */
    if(st==='poster'){
      const hm=h.measure(head,{font:'display',size:hsz(230),maxW:940});
      const lw=200, lh=h.logoH(lw), pw=940;
      const rest=lh+40+hm.h+40+40+tailH();
      const bx=photoBox(shape,pw,900,Math.min(900,1360-rest)), total=rest+bx.h;
      let y=250+Math.max(0,Math.round((1360-total)/2));
      y+=h.logo((W-lw)/2,y,lw,logoTone)+40;
      y+=h.text('head','Headline',head,W/2,y,{font:'display',size:hsz(230),color:ink,maxW:940})+40;
      putPhoto((W-bx.w)/2,y,bx.w,bx.h); y+=bx.h+40;
      tail(y,false,btn(dark?C.paper:C.ink,dark?C.ink:C.paper));
      return;
    }

    /* ---- White / Cream: the headline, then the photo on a card ---- */
    const hm=h.measure(head,{font:'display',size:hsz(150),maxW:940});
    const ar=h.photoAspect(0), pw=920; let ph=Math.round(pw/ar); ph=Math.max(560,Math.min(820,ph));
    const lw=230, lh=h.logoH(lw);
    const rest=lh+56+hm.h+44+44+(fl.length?72+30:0)+(small?60:0)+(pill?76+30:0);
    const bx=photoBox(shape,pw,ph,1330-rest), total=rest+bx.h;
    let y=Math.max(250,Math.round((H-total)/2-10));
    y+=h.logo((W-lw)/2,y,lw,logoTone)+56;
    y+=h.text('head','Headline',head,W/2,y,{font:'display',size:hsz(150),color:ink,maxW:940})+44;
    // a soft shape behind the photo, then the photo
    if(C.blob&&st==='cream'&&!bgc){ ctx.fillStyle=C.blob; outline((W-bx.w)/2,y,bx.w,bx.h,26); ctx.fill(); }
    putPhoto((W-bx.w)/2,y,bx.w,bx.h); y+=bx.h+44;
    tail(y,false,btn(dark?C.paper:C.ink,dark?C.ink:C.paper));
  }
});
