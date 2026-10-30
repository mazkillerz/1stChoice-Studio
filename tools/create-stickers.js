/* Create: stickers and emoji (1.31.0). The same stickers as the tool pages' Sticker sheet (assets/stickers.js) and the
   24 vector emoji (tools/highlight-emoji.js, Twemoji CC-BY 4.0, credit in that file), loaded here only when the Add sheet
   or a Swap needs them (Create does not depend on tool-page script tags).
   A sticker becomes ordinary Konva layers, so the saved format does not change and Board can open it too:
   - a drawn sticker = one Konva.Path (kind 'path' = filled, kind 'icon' = one stroked line), its outline traced from the
     sticker's own canvas drawing (traceSticker below), so it is the same shape and stays sharp at any size;
   - an emoji = a group of filled Konva.Paths in its own colours (attr stickerId 'sticker:emoji-<id>'); a picked colour makes
     it one colour, Original brings its colours back.
   Never rename an id: designs keep stickerId. Brand-agnostic: no words, no brand colours (the default colour is the kit's ink). */
(function(){
const BD=window.BD, U=BD.util, CR=window.CR=window.CR||{};
const TAU=Math.PI*2;

/* ---------- loading (once, on demand) ---------- */
let loading=null;
const script=src=>new Promise(res=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>res(true); s.onerror=()=>res(false); document.head.appendChild(s); });
CR.stickersReady=function(){ if(loading) return loading;
  loading=(async()=>{ if(!Array.isArray(window.HL_EMOJI)) await script('highlight-emoji.js');
    if(!Array.isArray(window.STUDIO_STICKERS)) await script('../assets/stickers.js'); })();
  return loading; };
/* the drawn stickers (no emoji) and the emoji, each as {id,label,…} */
CR.drawnStickers=()=>(window.STUDIO_STICKERS||[]).filter(s=>!s.emoji&&typeof s.draw==='function');
CR.emojiList=()=>(Array.isArray(window.HL_EMOJI)?window.HL_EMOJI:[]).map(([id,ch,label,parts])=>({id:'sticker:emoji-'+id,key:id,char:ch,label,parts}));
const emojiDef=sid=>CR.emojiList().find(e=>e.id===sid)||null;
const drawnDef=sid=>CR.drawnStickers().find(s=>s.id===sid)||null;
CR.isSticker=n=>!!(n&&n.getAttr&&n.getAttr('stickerId'));
CR.isEmoji=n=>CR.isSticker(n)&&String(n.getAttr('stickerId')).startsWith('sticker:emoji-');

/* ---------- trace a sticker's canvas drawing into SVG path data ----------
   The stickers use beginPath, moveTo, lineTo, quadraticCurveTo, bezierCurveTo, arc, arcTo, closePath, then ONE fill or stroke. */
const TRACE=new Map();
function traceSticker(s){ if(TRACE.has(s.id)) return TRACE.get(s.id);
  const d=[], r2=v=>Math.round(v*100)/100, P=(x,y)=>r2(x)+' '+r2(y); let cur=null, start=null;
  const out={mode:'fill',lw:0,rule:''};
  const to=(x,y)=>{ if(cur) d.push('L'+P(x,y)); else { d.push('M'+P(x,y)); start={x,y}; } cur={x,y}; };
  const c={lineWidth:1,lineCap:'butt',lineJoin:'miter',strokeStyle:'',fillStyle:'',globalAlpha:1,
    beginPath(){ cur=null; }, moveTo(x,y){ d.push('M'+P(x,y)); cur=start={x,y}; }, lineTo:to,
    quadraticCurveTo(a,b,x,y){ if(!cur) c.moveTo(a,b); d.push('Q'+P(a,b)+' '+P(x,y)); cur={x,y}; },
    bezierCurveTo(a,b,e,f,x,y){ if(!cur) c.moveTo(a,b); d.push('C'+P(a,b)+' '+P(e,f)+' '+P(x,y)); cur={x,y}; },
    closePath(){ if(cur){ d.push('Z'); cur=start; } },
    arc(cx,cy,r,a0,a1,ccw){ to(cx+Math.cos(a0)*r,cy+Math.sin(a0)*r);
      let sweep=ccw?a0-a1:a1-a0; sweep=sweep>=TAU?TAU:((sweep%TAU)+TAU)%TAU; if(!sweep) return;
      const n=Math.max(1,Math.ceil(sweep/(Math.PI/2)-1e-9));
      for(let i=1;i<=n;i++){ const a=a0+(ccw?-1:1)*sweep*i/n; d.push('A'+r2(r)+' '+r2(r)+' 0 0 '+(ccw?0:1)+' '+P(cx+Math.cos(a)*r,cy+Math.sin(a)*r)); }
      cur={x:cx+Math.cos(a1)*r,y:cy+Math.sin(a1)*r}; },
    arcTo(x1,y1,x2,y2,r){ if(!cur){ c.moveTo(x1,y1); return; }
      const ax=cur.x-x1, ay=cur.y-y1, bx=x2-x1, by=y2-y1, la=Math.hypot(ax,ay), lb=Math.hypot(bx,by);
      const cross=(-ax/la)*(by/lb)-(-ay/la)*(bx/lb);
      if(!r||!la||!lb||Math.abs(cross)<1e-6){ to(x1,y1); return; }
      const cos=(ax*bx+ay*by)/(la*lb), t=r/Math.tan(Math.acos(Math.max(-1,Math.min(1,cos)))/2);
      const t1={x:x1+ax/la*t,y:y1+ay/la*t}, t2={x:x1+bx/lb*t,y:y1+by/lb*t};
      to(t1.x,t1.y); d.push('A'+r2(r)+' '+r2(r)+' 0 0 '+(cross>0?1:0)+' '+P(t2.x,t2.y)); cur=t2; },
    fill(rule){ out.mode='fill'; if(rule) out.rule=rule; }, stroke(){ out.mode='stroke'; out.lw=c.lineWidth; },
    save(){}, restore(){}, translate(){}, scale(){}, rotate(){}, rect(x,y,w,h){ c.moveTo(x,y); to(x+w,y); to(x+w,y+h); to(x,y+h); c.closePath(); } };
  try{ s.draw(c,'#000'); }catch(_){}
  out.d=d.join(''); TRACE.set(s.id,out); return out; }
CR.traceSticker=traceSticker;

/* ---------- making them (size = the longer side, in page pixels) ---------- */
const ink=()=>(CR.colors?CR.colors().ink:'#111111');
function makeDrawn(sid,size,color){ const s=drawnDef(sid); if(!s) return null; const t=traceSticker(s), k=size/Math.max(s.w,s.h), col=color||ink();
  const base={id:U.uid(),name:'obj',data:t.d,scaleX:k,scaleY:k,label:s.label,stickerId:s.id};
  if(t.mode==='stroke') return new Konva.Path(Object.assign(base,{kind:'icon',stroke:col,strokeWidth:t.lw,lineCap:'round',lineJoin:'round',fill:'',hitStrokeWidth:Math.max(t.lw*2,24)}));
  return new Konva.Path(Object.assign(base,{kind:'path',fill:col,strokeScaleEnabled:false},t.rule?{fillRule:t.rule}:{})); }
function makeEmoji(sid,size){ const e=emojiDef(sid); if(!e) return null; const k=size/36;
  const g=new Konva.Group({id:U.uid(),name:'obj',kind:'group',label:e.label+' emoji',stickerId:e.id,scaleX:k,scaleY:k});
  e.parts.forEach(([fill,d,op])=>g.add(new Konva.Path({id:U.uid(),name:'obj',kind:'path',data:d,fill,opacity:op==null?1:op,strokeScaleEnabled:false,label:'Part'})));
  return g; }
CR.makeSticker=function(sid,size,color){ return String(sid).startsWith('sticker:emoji-')?makeEmoji(sid,size):makeDrawn(sid,size,color); };
/* the default size on a page: the sticker's own story size (w0 on a 1080-wide story), scaled to the page width */
CR.stickerSize=function(sid,frameW){ const w=frameW||1080, s=drawnDef(sid); return Math.round((s?(s.w0||280)*Math.max(s.w,s.h)/s.w:280)*w/1080); };
CR.addSticker=async function(sid){ await CR.stickersReady(); const f=BD.activeFrame(), w=f?U.fsize(f).w:1080; const n=CR.makeSticker(sid,CR.stickerSize(sid,w)); return n?BD.place(n):null; };

/* ---------- emoji colour: one picked colour, or the emoji's own colours ---------- */
CR.emojiTint=n=>n.getAttr('tint')||'';
CR.setEmojiTint=function(n,v){ const e=emojiDef(n.getAttr('stickerId')); const kids=n.getChildren();
  if(v){ kids.forEach(c=>{ c.fill(v); c.opacity(1); }); n.setAttr('tint',v); return; }
  n.setAttr('tint',undefined); if(e) kids.forEach((c,i)=>{ const p=e.parts[i]; if(p){ c.fill(p[0]); c.opacity(p[2]==null?1:p[2]); } }); };

/* ---------- Swap: put another sticker or emoji in the same place, size and turn ---------- */
CR.canSwap=n=>!!n&&(CR.isSticker(n)||(U.kind(n)==='icon'&&!!n.getAttr('iconId'))||n.getAttr('iconId')==='pin-fill');
CR.swapSticker=async function(old,sid){ await CR.stickersReady(); const f=U.frameOf(old)||BD.activeFrame(); if(!f) return null;
  const r=old.getClientRect({skipTransform:true,skipShadow:true}), size=Math.max(r.width*Math.abs(old.scaleX()),r.height*Math.abs(old.scaleY()))||CR.stickerSize(sid,U.fsize(f).w);
  const was=old.getClientRect({relativeTo:f,skipShadow:true}), cx=was.x+was.width/2, cy=was.y+was.height/2;
  const col=U.kind(old)==='icon'?old.stroke():U.kind(old)==='path'?old.fill():null;
  const n=CR.makeSticker(sid,size,typeof col==='string'&&col?col:null); if(!n) return null;
  n.rotation(old.rotation()); if(old.scaleX()<0) n.scaleX(-n.scaleX()); n.opacity(old.opacity());
  const p=old.getParent(), z=old.zIndex(); p.add(n); n.zIndex(z);
  const now=n.getClientRect({relativeTo:f,skipShadow:true}); n.x(Math.round(n.x()+cx-(now.x+now.width/2))); n.y(Math.round(n.y()+cy-(now.y+now.height/2)));
  old.destroy(); BD.select([n]); BD.changed(); BD.emitDoc(); return n; };

/* ---------- the picker tiles (SVG, so they are sharp and follow the theme; emoji keep their colours) ---------- */
const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]);
CR.stickerTiles=function(){ return CR.drawnStickers().map(s=>{ const t=traceSticker(s), pad=t.mode==='stroke'?t.lw:2;
  const paint=t.mode==='stroke'?`fill="none" stroke="currentColor" stroke-width="${t.lw}" stroke-linecap="round" stroke-linejoin="round"`:`fill="currentColor"${t.rule?` fill-rule="${t.rule}"`:''}`;
  return `<button type="button" data-sticker="${esc(s.id)}" aria-label="${esc(s.label)}" title="${esc(s.label)}"><svg viewBox="${-pad} ${-pad} ${s.w+pad*2} ${s.h+pad*2}" aria-hidden="true"><path d="${t.d}" ${paint}/></svg></button>`; }).join(''); };
CR.emojiTiles=function(){ return CR.emojiList().map(e=>`<button type="button" data-sticker="${esc(e.id)}" aria-label="${esc(e.label)} emoji" title="${esc(e.label)}"><svg viewBox="0 0 36 36" aria-hidden="true">${e.parts.map(([fill,d,op])=>`<path d="${d}" fill="${fill}"${op==null?'':` opacity="${op}"`}/>`).join('')}</svg></button>`).join(''); };
})();
