/* Board: stickers and emoji (1.36.0). The same vector stickers as the tool pages and Create (assets/stickers.js) and the
   24 sharp emoji of Highlight covers (tools/highlight-emoji.js, Twemoji CC-BY 4.0, credit in that file). Both files load only
   when needed: the Stickers or Emoji assets open, or a board has a sticker in it.
   A sticker is a Konva.Shape {kind:'sticker', ref:'sticker:<id>', width, height, scol?}: drawn from its paths at any size, so the
   2× export stays sharp. scol = its colour; an emoji with no scol keeps its own colours. Never rename an id (boards point to it).
   The drawing function is not saved with the board, so prep() puts it back when a board opens, on undo and on paste. */
(function(){
const BD=window.BD=window.BD||{};
const L=Studio.lab;
const ROOT=(L&&L.ROOT)||'../';
let pSt=null, pEm=null;
function script(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
const list=()=>window.STUDIO_STICKERS||[];
const hasEmoji=()=>list().some(s=>s.emoji);
/* the drawn stickers (assets/stickers.js); with emoji=true also the emoji shapes */
function load(emoji){
  if(!pSt) pSt=(window.STUDIO_STICKERS?Promise.resolve():script(ROOT+'assets/stickers.js')).then(()=>true,()=>{ pSt=null; return false; });
  if(!emoji) return pSt;
  return pSt.then(ok=>{ if(!ok) return false; if(hasEmoji()) return true;
    if(!pEm) pEm=(window.HL_EMOJI?Promise.resolve():script(ROOT+'tools/highlight-emoji.js')).then(()=>{ if(window.addEmojiStickers) window.addEmojiStickers(); return hasEmoji(); },()=>{ pEm=null; return false; });
    return pEm; });
}
const def=ref=>list().find(s=>s.id===ref)||null;
const isEmojiRef=ref=>/^sticker:emoji-/.test(ref||'');
const isSticker=n=>!!n&&n.getAttr&&n.getAttr('kind')==='sticker';

/* drawing: the sticker's own box scaled to the layer's width × height (a missing one loads, then draws again) */
let redraw=0;
function scene(ctx,shape){
  const s=def(shape.getAttr('ref')), w=shape.width(), h=shape.height();
  if(!s){ load(isEmojiRef(shape.getAttr('ref'))).then(ok=>{ if(ok&&def(shape.getAttr('ref'))&&!redraw) redraw=requestAnimationFrame(()=>{ redraw=0; BD.main&&BD.main.batchDraw(); }); }); return; }
  const c=ctx._context; c.save();
  if(shape.hasShadow&&shape.hasShadow()&&ctx._applyShadow) ctx._applyShadow(shape);
  c.scale(w/s.w,h/s.h); s.draw(c,shape.getAttr('scol')||(s.emoji?null:'#000')); c.restore(); }
function hit(ctx,shape){ const c=ctx._context; c.fillStyle=shape.colorKey; c.fillRect(0,0,shape.width(),shape.height()); }
function prep(n){ if(!isSticker(n)) return false; n.sceneFunc(scene); n.hitFunc(hit); return true; }

/* colour: a drawn sticker always has one; an emoji with none keeps its own */
function setColor(n,v){ if(!isSticker(n)) return; if(v) n.setAttr('scol',v); else if(isEmojiRef(n.getAttr('ref'))) n.setAttr('scol',undefined); }
/* a new sticker layer: as wide as Studio adds it on a story (w0 of 1080), scaled to the frame */
function make(ref,frameW,color){ const s=def(ref); if(!s) return null; const fw=frameW||1080, w=Math.round(s.w0*fw/1080), h=Math.round(w*s.h/s.w);
  const n=BD.obj('Shape',{kind:'sticker',ref,width:w,height:h,label:s.label});
  if(!s.emoji) n.setAttr('scol',color||BD.brandColors().ink); else if(color) n.setAttr('scol',color);
  prep(n); return n; }
async function add(ref,at){ await load(isEmojiRef(ref)); const f=at?BD.frameAt(at):BD.targetFrame(); const n=make(ref,f?BD.util.fsize(f).w:1080); if(!n) return null; return BD.place(n,{frame:f,at}); }
/* before a board draws or exports: load what its stickers need */
function need(nodes){ let st=false, em=false; const walk=o=>{ if(!o) return; const a=o.a||{}; if(a.kind==='sticker'){ st=true; if(isEmojiRef(a.ref)) em=true; } (o.k||[]).forEach(walk); };
  (nodes||[]).forEach(walk); return st?load(em):Promise.resolve(true); }

/* picker tiles, drawn for real (drawn stickers in the text colour, emoji in their own colours) */
const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]);
function tiles(items){ return `<div class="sgrid stk-grid">${items.map(s=>`<button type="button" class="sg stk" data-sticker="${esc(s.id)}" draggable="true" title="${esc(s.label)}" aria-label="${esc(s.label)}${s.emoji?' emoji':''}"><canvas aria-hidden="true"></canvas></button>`).join('')}</div>`; }
function paint(root){ if(!root) return; const dpr=Math.min(3,devicePixelRatio||1);
  root.querySelectorAll('[data-sticker] canvas').forEach(cv=>{ const b=cv.parentNode, s=def(b.dataset.sticker); if(!s) return;
    const box=Math.round(Math.min(b.clientWidth||48,b.clientHeight||48)*.62)||30, col=getComputedStyle(b).color||'#111', key=box+'|'+col; if(cv.dataset.k===key) return;
    cv.width=Math.ceil(box*dpr); cv.height=Math.ceil(box*dpr); cv.style.width=cv.style.height=box+'px';
    const c=cv.getContext('2d'), k=box/Math.max(s.w,s.h); c.scale(dpr,dpr); c.translate((box-s.w*k)/2,(box-s.h*k)/2); c.scale(k,k); s.draw(c,s.emoji?null:col); cv.dataset.k=key; }); }
const drawn=q=>list().filter(s=>!s.emoji&&(!q||s.label.toLowerCase().includes(q)||'sticker'.includes(q)));
const emoji=q=>list().filter(s=>s.emoji&&(!q||s.label.toLowerCase().includes(q)||'emoji sticker'.includes(q)));

BD.stickers={load,def,make,setColor,add,prep,need,isSticker,isEmojiRef,tiles,paint,drawn,emoji,ready:()=>!!window.STUDIO_STICKERS,emojiReady:hasEmoji};
})();
