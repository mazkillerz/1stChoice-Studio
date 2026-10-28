/* Studio stickers: brand-neutral vector stickers (no words, no images).
   Each one is drawn with canvas paths in its own w×h box, so it stays sharp at the 2160×3840 save and takes any colour.
   draw(c,color) works in that box; Studio scales it to the layer's size. Each sticker is ONE fill or ONE stroke,
   so a see-through sticker (opacity) has no darker overlaps.
   A sticker is saved in a design as an added layer {type:'asset', ref:'sticker:<id>', w, x, y, color} (see assetDef in studio.js).
   Never rename an id: saved designs point to it. */
(function(){
  const TAU=Math.PI*2;
  /* a stroked line in round caps and joins */
  function line(c,color,width){ c.lineWidth=width; c.lineCap='round'; c.lineJoin='round'; c.strokeStyle=color; c.stroke(); }
  /* an arrow head at (x,y) pointing along angle a (radians), as part of the current path */
  function head(c,x,y,a,len,spread){ spread=spread||.6;
    c.moveTo(x-Math.cos(a-spread)*len,y-Math.sin(a-spread)*len); c.lineTo(x,y); c.lineTo(x-Math.cos(a+spread)*len,y-Math.sin(a+spread)*len); }
  /* a four-point sparkle */
  function star4(c,x,y,r){ const k=r*.12; c.moveTo(x,y-r); c.quadraticCurveTo(x+k,y-k,x+r,y); c.quadraticCurveTo(x+k,y+k,x,y+r); c.quadraticCurveTo(x-k,y+k,x-r,y); c.quadraticCurveTo(x-k,y-k,x,y-r); c.closePath(); }

  const LIST=[
    {id:'sticker:arrow-curve',label:'Curved arrow',w:240,h:160,w0:340,draw(c,col){ c.beginPath();
      c.moveTo(18,140); c.quadraticCurveTo(40,34,206,42); head(c,214,42,-.03,46); line(c,col,14); }},
    {id:'sticker:arrow-loop',label:'Loop arrow',w:260,h:180,w0:360,draw(c,col){ c.beginPath();
      c.moveTo(14,162); c.bezierCurveTo(64,160,112,132,120,90); c.bezierCurveTo(128,40,70,30,76,78); c.bezierCurveTo(82,126,176,128,236,64);
      head(c,240,60,Math.atan2(-64,60),44); line(c,col,13); }},
    {id:'sticker:arrow-wavy',label:'Wavy arrow',w:160,h:240,w0:220,draw(c,col){ c.beginPath();
      c.moveTo(80,14); c.bezierCurveTo(30,64,130,110,80,160); c.quadraticCurveTo(62,184,80,216); head(c,82,222,Math.PI/2.2,42); line(c,col,13); }},
    {id:'sticker:sparkles',label:'Sparkles',w:220,h:220,w0:280,draw(c,col){ c.beginPath();
      star4(c,88,128,84); star4(c,178,48,38); star4(c,186,176,22); c.fillStyle=col; c.fill(); }},
    {id:'sticker:burst',label:'Starburst',w:220,h:220,w0:320,draw(c,col){ c.beginPath();
      for(let i=0;i<24;i++){ const a=i/24*TAU-Math.PI/2, r=i%2?78:110; c.lineTo(110+Math.cos(a)*r,110+Math.sin(a)*r); } c.closePath(); c.fillStyle=col; c.fill(); }},
    {id:'sticker:star',label:'Star',w:220,h:210,w0:240,draw(c,col){ c.beginPath();
      for(let i=0;i<10;i++){ const a=i/10*TAU-Math.PI/2, r=i%2?46:108; c.lineTo(110+Math.cos(a)*r,114+Math.sin(a)*r); } c.closePath();
      c.fillStyle=col; c.fill(); }},
    {id:'sticker:heart',label:'Heart',w:220,h:200,w0:240,draw(c,col){ c.beginPath();
      c.moveTo(110,190); c.bezierCurveTo(-36,96,24,-26,110,48); c.bezierCurveTo(196,-26,256,96,110,190); c.closePath(); c.fillStyle=col; c.fill(); }},
    {id:'sticker:seal',label:'Seal',w:220,h:220,w0:300,draw(c,col){ c.beginPath();
      for(let i=0;i<=180;i++){ const a=i/180*TAU, r=100+7*Math.cos(a*18); c.lineTo(110+Math.cos(a)*r,110+Math.sin(a)*r); } c.closePath();
      c.moveTo(188,110); c.arc(110,110,78,0,TAU); c.moveTo(180,110); c.arc(110,110,70,0,TAU);   // a thin ring cut out of the seal
      c.fillStyle=col; c.fill('evenodd'); }},
    {id:'sticker:circle',label:'Scribble circle',w:320,h:200,w0:520,draw(c,col){ c.beginPath();
      const n=140, turns=1.14;
      for(let i=0;i<=n;i++){ const t=i/n*TAU*turns, rx=148-i/n*12+4*Math.sin(t*3), ry=88-i/n*8+3*Math.cos(t*2), a=t-2.3;
        const x=160+Math.cos(a)*rx, y=100+Math.sin(a)*ry; if(i) c.lineTo(x,y); else c.moveTo(x,y); }
      line(c,col,11); }},
    {id:'sticker:underline',label:'Scribble underline',w:320,h:70,w0:520,draw(c,col){ c.beginPath();
      c.moveTo(10,26); c.quadraticCurveTo(160,6,310,22); c.quadraticCurveTo(190,32,40,52); c.quadraticCurveTo(170,40,286,50); line(c,col,10); }},
    {id:'sticker:wave',label:'Wavy line',w:320,h:90,w0:480,draw(c,col){ c.beginPath();
      c.moveTo(12,45); for(let i=0;i<4;i++){ const x=12+i*74; c.quadraticCurveTo(x+18.5,8,x+37,45); c.quadraticCurveTo(x+55.5,82,x+74,45); } line(c,col,13); }},
    {id:'sticker:bubble',label:'Speech bubble',w:240,h:200,w0:420,draw(c,col){ c.beginPath();
      c.moveTo(52,12); c.lineTo(188,12); c.arcTo(228,12,228,52,40); c.lineTo(228,108); c.arcTo(228,148,188,148,40);
      c.lineTo(104,148); c.lineTo(54,188); c.lineTo(66,148); c.lineTo(52,148); c.arcTo(12,148,12,108,40); c.lineTo(12,52); c.arcTo(12,12,52,12,40); c.closePath();
      line(c,col,10); }},
    {id:'sticker:lines',label:'Shine lines',w:200,h:200,w0:220,draw(c,col){ c.beginPath();
      c.moveTo(36,124); c.lineTo(26,34); c.moveTo(78,140); c.lineTo(144,72); c.moveTo(96,184); c.lineTo(186,174); line(c,col,15); }},
    {id:'sticker:tick',label:'Tick',w:220,h:180,w0:240,draw(c,col){ c.beginPath();
      c.moveTo(18,98); c.quadraticCurveTo(52,118,82,164); c.quadraticCurveTo(120,72,204,16); line(c,col,20); }}
  ];
  LIST.forEach(s=>{ s.sticker=true; });
  window.STUDIO_STICKERS=LIST;

  /* the picker: one tile per sticker, drawn for real in the text colour (so it reads in light and dark) */
  const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]);
  window.paintStickers=function(el){
    if(!el) return; const col=getComputedStyle(el).color||'#161210'; if(el.dataset.painted===col) return;   // once per text colour (theme)
    el.innerHTML=LIST.map(s=>`<button type="button" class="asset-tile sticker-tile" data-sticker="${esc(s.id)}" title="${esc(s.label)}"><canvas aria-hidden="true"></canvas><span>${esc(s.label)}</span></button>`).join('');
    const dpr=Math.min(3,window.devicePixelRatio||1), box=56;
    LIST.forEach(s=>{ const cv=el.querySelector(`[data-sticker="${s.id}"] canvas`), k=box/Math.max(s.w,s.h);
      cv.width=Math.ceil(box*dpr); cv.height=Math.ceil(box*dpr); cv.style.width=cv.style.height=box+'px';
      const c=cv.getContext('2d'); c.scale(dpr,dpr); c.translate((box-s.w*k)/2,(box-s.h*k)/2); c.scale(k,k); s.draw(c,col); });
    el.dataset.painted=col;
  };
})();
