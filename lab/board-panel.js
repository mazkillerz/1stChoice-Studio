/* Board (experimental): the right panel — Design, Effects and Export tabs. Sections fold and remember it;
   sizes are shown and typed in the board's unit (px, mm, cm, in, pt). */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S, UI=BD.UI, esc=L.esc, IC=UI.IC, $=UI.$;
const {kind,isFrame,isLocked,frames,items,fsize,wrect,unionRect,frameOf,nameOf,frameBg,clamp,AR}=U;
const props=$('props');
let tab=L.store('lab:rtab')||'design';
document.querySelector('#right .bp-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-rtab]'); if(!b) return; tab=b.dataset.rtab; L.store('lab:rtab',tab); paintProps(); });

/* ---------- small builders ---------- */
const folded=new Set(L.store('lab:folds')||[]);
function sec(id,title,body,o){ o=o||{}; if(!body) return ''; const shut=folded.has(id); return `<section class="ps${o.cls?' '+o.cls:''}" data-sec="${id}"><h3><button type="button" class="ps-fold" data-fold="${id}" aria-expanded="${!shut}">${IC.caretR}<span>${esc(title)}</span></button>${o.extra||''}</h3><div class="ps-b"${shut?' hidden':''}>${body}</div></section>`; }
const unitSfx=()=>S.unit==='px'?'':`<em>${S.unit}</em>`;
function field(label,key,val,o){ o=o||{}; return `<label class="f ${o.cls||''}" title="${esc(o.title||label)}"><span>${esc(label)}</span><input type="number" data-k="${key}" value="${val==null?'':val}" ${o.min!=null?`min="${o.min}"`:''} ${o.max!=null?`max="${o.max}"`:''} step="${o.step||'any'}" ${val==null?'placeholder="Mixed"':''}>${o.sfx===false?'':o.sfx||''}</label>`; }
function ufield(label,key,px,dpi,o){ return field(label,key,px==null?null:+BD.units.fmt(px,dpi),Object.assign({sfx:unitSfx()},o||{})); }
function range(label,key,val,min,max,step,unit){ return `<label class="rg"><span>${esc(label)}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step||1}" value="${val}"><output>${val}${unit||''}</output></label>`; }
function swatch(key,val,label,none){ const v=typeof val==='string'?val:''; return `<button type="button" class="swb" data-color="${key}" ${none?'data-none="1"':''} data-pop-owner aria-label="${esc(label)}" title="${esc(label)}"><i style="--c:${v||'transparent'}" class="${v?'':'empty'}"></i><span>${v?esc(UI.hex6(v)).toUpperCase()+(UI.alphaOf(v)<100?' · '+UI.alphaOf(v)+'%':''):(key==='workspace'?'Default':'None')}</span></button>`; }
function seg(key,val,opts){ return `<div class="seg2" role="group">${opts.map(([v,l,ic])=>`<button type="button" data-seg="${key}" data-v="${v}" aria-pressed="${String(val)===String(v)}" title="${esc(l)}" aria-label="${esc(l)}">${ic||esc(l)}</button>`).join('')}</div>`; }
function toggle(key,on,label){ return `<label class="tg"><input type="checkbox" data-k="${key}" ${on?'checked':''}><span>${esc(label)}</span></label>`; }
function qa(act,label,ic,cls){ return `<button type="button" class="ib ${cls||''}" data-act="${act}" aria-label="${esc(label)}" title="${esc(label)}">${ic}</button>`; }
const WEIGHTS=[['300','Light'],['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold'],['800','Extra bold'],['900','Black']];
const BLENDS=[['source-over','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['darken','Darken'],['lighten','Lighten'],['color-dodge','Color dodge'],['color-burn','Color burn'],['hard-light','Hard light'],['soft-light','Soft light'],['difference','Difference'],['exclusion','Exclusion'],['hue','Hue'],['saturation','Saturation'],['color','Color'],['luminosity','Luminosity']];
const FX=[['bright','Brightness',-100,100],['contrast','Contrast',-100,100],['sat','Saturation',-100,100],['temp','Warmth',-100,100],['hue','Hue',-180,180],['fade','Fade',0,100],['vignette','Vignette',0,100],['blur','Blur',0,40],['noise','Grain',0,100],['gray','Black & white',0,100],['sepia','Sepia',0,100]];
const FILLABLE=['rect','ellipse','poly','star','ring','path','text','arrow','arc'];
const STROKABLE=['rect','ellipse','poly','star','ring','path','text','line','arrow','pen','stroke','icon','image','arc'];
const SHADOWABLE=n=>typeof n.shadowEnabled==='function';
const n0=()=>S.sel[0];
const weightOf=n=>{ const s=n.fontStyle()||''; const m=s.match(/\d{3}/); return m?m[0]:/bold/.test(s)?'700':'400'; };
const italicOf=n=>/italic/.test(n.fontStyle()||'');
const setStyle=(n,w,it)=>n.fontStyle(((it?'italic ':'')+(w||'400')).trim());
const num=(v,d)=>Math.round((+v||0)*(d||1))/(d||1);
const kindLabel=n=>n.getAttr('isMask')?'Mask shape':n.getAttr('comp')?(n.getAttr('compMain')?'Main component':'Component copy'):({frame:n.getAttr('print')?'Print frame':'Frame',text:'Text',arc:'Curved text',rect:'Rectangle',ellipse:'Ellipse',poly:'Polygon',star:'Star',ring:'Ring',path:'Shape',icon:'Icon',line:'Line',arrow:'Arrow',pen:'Drawing',image:'Photo',asset:'Brand asset',group:'Group',bool:'Combined shape',mask:'Mask',stroke:'Line',barcode:'Barcode',qr:'QR code'})[kind(n)]||'';
function geomOf(){ const list=S.sel; if(!list.length) return null; const n=list[0];
  if(list.length===1){ if(isFrame(n)){ const s=fsize(n); return {x:n.x(),y:n.y(),w:s.w,h:s.h,r:null}; } const p=frameOf(n), r=wrect(n); return {x:r.x-(p?p.x():0),y:r.y-(p?p.y():0),w:r.width,h:r.height,r:num(n.rotation(),10)}; }
  const r=unionRect(list), p=frameOf(n); const same=list.every(x=>frameOf(x)===p&&!isFrame(x)); return {x:r.x-(same&&p?p.x():0),y:r.y-(same&&p?p.y():0),w:r.width,h:r.height,r:null}; }

/* ---------- painting ---------- */
function paintProps(){
  document.querySelectorAll('#right [data-rtab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.rtab===tab)));
  const list=S.sel;
  if(tab==='export'){ props.innerHTML=exportTab(); return; }
  if(!list.length){ props.innerHTML=tab==='effects'?'<p class="ps-note">Select something to add shadows, blur, blend modes or photo looks.</p>':(S.tool==='pen'||S.tool==='eraser'?penPanel():boardPanel()); return; }
  const n=list[0], k=kind(n), all=list.every(x=>kind(x)===k), objs=list.filter(x=>!isFrame(x)), lockedAll=list.every(isLocked);
  let h=`<div class="ps-head"><span class="ps-ic">${kindIconFor(n)}</span><b dir="auto">${list.length>1?list.length+' selected':esc(n.getAttr('isMask')?'Mask shape':nameOf(n))}</b><span class="ps-kind">${list.length>1?'':esc(kindLabel(n))}</span></div>`;
  if(lockedAll){ props.innerHTML=h+`<div class="ps-locked"><p>Locked, so it can't be moved or changed.</p><button type="button" class="mini" data-act="lock">${IC.unlock} Unlock</button></div>`; return; }
  if(tab==='effects'){ props.innerHTML=h+effectsTab(list,objs,k,all); return; }
  h+=`<div class="qa">${qa('dup','Duplicate ('+UI.mod+'+D)',IC.dup)}${qa('front','Bring to front',IC.front)}${qa('back','Send to back',IC.back2)}${objs.length?qa('flipX','Flip horizontal',IC.flipX)+qa('flipY','Flip vertical',IC.flipY):''}${qa('lock','Lock',IC.lock)}${objs.length>1?qa('group','Group ('+UI.mod+'+G)',IC.group):''}${list.some(x=>kind(x)==='group')?qa('ungroup','Ungroup',IC.group):''}${qa('del','Delete',IC.trash,'danger')}</div>`;
  const g=geomOf(), dp=BD.units.dpiOf(n);
  if(objs.length) h+=sec('align','Align',`<div class="al">${['left:al','hcenter:ah','right:ar','top:at','vcenter:av','bottom:ab'].map(x=>{ const [a,i]=x.split(':'); return `<button type="button" class="ib" data-align="${a}" aria-label="Align ${a}" title="Align ${a==='hcenter'?'centre':a==='vcenter'?'middle':a}${list.length===1?' in the frame':''}">${IC[i]}</button>`; }).join('')}${list.length>2?`<button type="button" class="ib" data-dist="x" title="Space evenly across" aria-label="Space evenly across">${IC.dh}</button><button type="button" class="ib" data-dist="y" title="Space evenly down" aria-label="Space evenly down">${IC.dv}</button>`:''}</div>`);
  if(!(isFrame(n)&&list.length===1)) h+=sec('pos',list.length>1?'Selection size':'Position and size',`<div class="grid2">${ufield('X','x',g.x,dp)}${ufield('Y','y',g.y,dp)}${ufield('W','w',g.w,dp,{min:0})}${ufield('H','h',g.h,dp,{min:0})}${g.r!=null?field('↻','rot',g.r,{step:.1,title:'Rotation (degrees)',sfx:'<em>°</em>'}):''}<button type="button" class="ib ratio" data-act="ratio" aria-pressed="${!!S.lockRatio}" title="Keep proportions when typing a size" aria-label="Keep proportions">${IC.link}</button></div>${S.unit!=='px'?`<p class="hint">At ${dp} dpi${frameOf(n)&&frameOf(n).getAttr('print')?' (this print frame)':''}.</p>`:''}`);
  if(k==='frame'&&list.length===1) h+=framePanel(n);
  if(all&&k==='text') h+=textPanel(list);
  if(all&&k==='arc'&&list.length===1) h+=arcPanel(n);
  if(all&&k==='barcode'&&list.length===1) h+=barcodePanel(n);
  if(all&&k==='qr'&&list.length===1) h+=qrPanel(n);
  if(objs.length&&objs.some(x=>FILLABLE.includes(kind(x)))&&!(all&&k==='image')) h+=fillPanel(objs.filter(x=>FILLABLE.includes(kind(x))));
  if(objs.length&&objs.some(x=>STROKABLE.includes(kind(x)))) h+=strokePanel(objs.filter(x=>STROKABLE.includes(kind(x))));
  if(list.length===1) h+=shapePanel(n);
  if(all&&k==='image') h+=photoPanel(list);
  if(list.some(x=>kind(x)==='mask')) h+=sec('mask','Mask',`<p class="hint">Double-click to move or change what's inside. The mask shape is in the layers list.</p><button type="button" class="mini" data-act="unmask">Release mask</button>`);
  else if(BD.tools.canMask(list)) h+=sec('mask','Mask',`<p class="hint">Put the other things inside the top shape.</p><button type="button" class="mini" data-act="mask">${IC.mask} Mask</button>`);
  if(list.length===1&&k==='bool') h+=boolPanel(n);
  else if(BD.bool.can(list)) h+=sec('bool','Combine shapes',`<div class="seg2 bool-ops" role="group">${BD.bool.OPS.map(([op,l,t])=>`<button type="button" data-act="bool:${op}" title="${esc(t)}" aria-label="${esc(l)}">${IC[op]}<span>${esc(l)}</span></button>`).join('')}</div>`);
  h+=compPanel(list);
  props.innerHTML=h;
}
function boolPanel(g){ const op=g.getAttr('boolOp')||'union', base=BD.bool.base(g), f=base&&typeof base.fill()==='string'?base.fill():'';
  return sec('bool','Combine shapes',`<div class="seg2 bool-ops" role="group">${BD.bool.OPS.map(([v,l,t])=>`<button type="button" data-seg="boolOp" data-v="${v}" aria-pressed="${op===v}" title="${esc(t)}" aria-label="${esc(l)}">${IC[v]}<span>${esc(l)}</span></button>`).join('')}</div>
    <div class="row">${swatch('boolFill',f,'Colour')}</div><p class="hint">The bottom shape gives the colour. ${matchMedia('(pointer:coarse)').matches?'Double-tap':'Double-click'} to move a shape inside.</p><button type="button" class="mini" data-act="boolRelease">Release shapes</button>`); }
function compPanel(list){ const C=BD.comps, n=list.length===1?list[0]:null;
  if(n&&C.isMain(n)){ const cs=C.copiesOf(n.getAttr('comp')).length;
    return sec('comp','Component',`<p class="hint">${cs?cs+' cop'+(cs===1?'y follows':'ies follow')+' every change you make here.':'Add copies; they follow every change you make here.'}</p><div class="row"><button type="button" class="mini" data-act="compCopy">${IC.comp} Add a copy</button>${cs?'<button type="button" class="mini" data-act="compSel">Select copies</button>':''}</div><button type="button" class="link" data-act="compDetach">Stop being a component</button>`); }
  if(n&&C.isCopy(n)){ const m=C.mainOf(n.getAttr('comp')), ov=n.find(x=>x.getAttr('ovr')).length;
    return sec('comp','Component',`<p class="hint">${m?'A copy of <b>'+esc(nameOf(m))+'</b>. It follows the main one; words you type into it stay.':'The main component is not on this board, so this copy works like a group.'}</p><div class="row">${m?'<button type="button" class="mini" data-act="compMain">Go to main</button>':''}${ov?'<button type="button" class="mini" data-act="compReset">Reset words</button>':''}<button type="button" class="mini" data-act="compDetach">Detach</button></div>`); }
  if(C.can(list)&&!list.some(x=>x.getAttr('comp')||C.compOf(x))) return sec('comp','Component',`<p class="hint">Use it again and again: copies update when you change it.</p><button type="button" class="mini" data-act="compMake">${IC.comp} Make component</button>`,{cls:'ps-quiet'});
  return ''; }
function kindIconFor(n){ const k=n.getAttr('isMask')?'mask':kind(n); if(n.getAttr('comp')) return n.getAttr('compMain')?IC.comp:IC.compCopy; if(k==='bool') return IC[n.getAttr('boolOp')]||IC.union; return ({frame:IC.frame,text:IC.text,arc:IC.arc,rect:IC.rect,ellipse:IC.ellipse,poly:IC.poly,star:IC.star,ring:IC.ellipse,path:IC.shapes,icon:IC.icons,line:IC.line,arrow:IC.arrow,pen:IC.pen,image:IC.image,asset:IC.brand,group:IC.group,mask:IC.mask,stroke:IC.line,barcode:IC.barcode,qr:IC.qr})[k]||IC.rect; }
UI.paintProps=paintProps;
UI.focusField=k=>{ tab='design'; paintProps(); setTimeout(()=>{ const i=props.querySelector(`input[data-k="${k}"]`); if(i){ i.focus(); i.select(); } },30); };

function boardPanel(){ const fs=frames();
  return `<div class="ps-head"><span class="ps-ic">${IC.frame}</span><b>Board</b><span class="ps-kind">${fs.length} frame${fs.length===1?'':'s'}</span></div>`+
    sec('units','Units and print',`<label class="f wide"><span>Units</span><select data-k="unit" class="b-sel">${BD.units.list.map(u=>`<option value="${u}" ${S.unit===u?'selected':''}>${({px:'Pixels',mm:'Millimetres',cm:'Centimetres',in:'Inches',pt:'Points'})[u]} (${u})</option>`).join('')}</select></label>
      <label class="f wide"><span>Print quality</span><select data-k="bdpi" class="b-sel">${[150,300,600].map(d=>`<option value="${d}" ${S.dpi===d?'selected':''}>${d} dpi${d===300?' (standard)':''}</option>`).join('')}</select></label>
      <p class="hint">Used for mm/cm/in on screen frames and for new print frames.</p><button type="button" class="mini" data-act="printFrame">${IC.print} New print frame…</button>`)+
    sec('canvas','Canvas',`<div class="row">${swatch('workspace',S.bg||'','Canvas colour')}${S.bg?'<button type="button" class="link" data-act="bgReset">Reset</button>':''}</div>${toggle('grid',S.grid,'Dot grid')}${toggle('snap',S.snap,'Snap to edges, centres and equal gaps')}${toggle('rulers',S.rulers,'Rulers and guides')}${toggle('safe',S.safe,'Story safe zones')}`)+
    sec('saved','Saved colours',(S.styles.colors.length?`<div class="sws">${S.styles.colors.map(c=>`<button type="button" class="sw" style="--c:${c}" data-delcolor="${c}" title="${c} (click to remove)" aria-label="Remove ${c}"></button>`).join('')}</div>`:'<p class="hint">Save colours from any colour picker.</p>'))+
    `<p class="ps-note">Tips: press <kbd>${UI.mod} K</kbd> to find any tool, <kbd>?</kbd> for shortcuts. Drag from the rulers to add guides. Hold <kbd>Alt</kbd> to measure.</p>`; }
function penPanel(){ const p=S.pen, er=S.tool==='eraser'; return `<div class="ps-head"><span class="ps-ic">${er?IC.eraser:IC.pen}</span><b>${er?'Eraser':'Draw'}</b></div>`+
  sec('brush',er?'Eraser':'Brush',`${er?'':seg('penMode',p.mode,[['pen','Pen'],['marker','Highlighter']])+`<div class="row">${swatch('pen',p.color,'Brush colour')}</div>`}${range('Size','penSize',p.size,1,160,1,'px')}`)+`<p class="ps-note">${er?'Drag over a drawing to erase that part of it.':'Drag on the canvas to draw.'} Press V or Esc when you're done.</p>`; }
function framePanel(f){ const s=fsize(f), dp=BD.units.dpiOf(f), pr=BD.PRESETS.find(p=>p.w===s.w&&p.h===s.h), print=!!f.getAttr('print'), lg=f.getAttr('lgrid')||{}, gd=f.getAttr('guides')||{}, gn=(gd.v||[]).length+(gd.h||[]).length, bg=frameBg(f);
  const prm=BD.PRINT.find(p=>Math.abs(BD.units.fromUnit(p.w,dp,'mm')-s.w)<1&&Math.abs(BD.units.fromUnit(p.h,dp,'mm')-s.h)<1);
  return sec('fsize','Frame size',`<label class="f wide"><span>Size</span><select data-k="framePreset" class="b-sel"><option value="">${pr||prm?'Custom…':'Custom'}</option><optgroup label="Screen (pixels)">${BD.PRESETS.map(p=>`<option value="${p.id}" ${pr&&pr.id===p.id?'selected':''}>${esc(p.label)} · ${p.w}×${p.h}</option>`).join('')}</optgroup><optgroup label="Print (mm, at ${dp} dpi)">${BD.PRINT.map(p=>`<option value="print:${p.id}" ${prm&&prm.id===p.id?'selected':''}>${esc(p.label)} · ${p.w}×${p.h} mm</option>`).join('')}</optgroup></select></label>
      <div class="grid2">${ufield('W','w',s.w,dp,{min:1})}${ufield('H','h',s.h,dp,{min:1})}${ufield('X','x',f.x(),dp)}${ufield('Y','y',f.y(),dp)}</div>
      <div class="row"><button type="button" class="mini" data-act="swapWH">${IC.swap} Turn</button><button type="button" class="mini" data-act="fitContent">Fit to content</button></div>
      <label class="f wide" title="Copies this frame in another size and fits everything into it"><span>Copy to</span><select data-k="copyTo" class="b-sel"><option value="">Another size…</option><optgroup label="Screen">${BD.PRESETS.filter(p=>!(p.w===s.w&&p.h===s.h)).map(p=>`<option value="${p.id}">${esc(p.label)} · ${p.w}×${p.h}</option>`).join('')}</optgroup><optgroup label="Print">${BD.PRINT.map(p=>`<option value="print:${p.id}">${esc(p.label)} · ${p.w}×${p.h} mm</option>`).join('')}</optgroup></select></label>
      ${toggle('clip',!f.getAttr('noClip'),'Hide things outside the frame')}`)+
    sec('print','Print',`${toggle('isPrint',print,'This is for printing')}
      ${print?`<label class="f wide"><span>Quality</span><select data-k="fdpi" class="b-sel">${[150,300,600].map(d=>`<option value="${d}" ${dp===d?'selected':''}>${d} dpi</option>`).join('')}${[150,300,600].includes(dp)?'':`<option selected>${dp} dpi</option>`}</select></label>
      <div class="grid2">${field('Bleed','bleed',+BD.units.fmt(U.bleedOf(f),dp,S.unit==='px'?'mm':S.unit),{min:0,sfx:'<em>'+(S.unit==='px'?'mm':S.unit)+'</em>',title:'Extra design around the edge that gets cut off'})}${field('Safe','safe',+BD.units.fmt(f.getAttr('safe')||0,dp,S.unit==='px'?'mm':S.unit),{min:0,sfx:'<em>'+(S.unit==='px'?'mm':S.unit)+'</em>',title:'Keep text inside this margin'})}</div>
      <p class="hint">Real size: ${BD.units.fmt(s.w,dp,'mm')} × ${BD.units.fmt(s.h,dp,'mm')} mm (${Math.round(s.w)} × ${Math.round(s.h)} px). The pink dashed line is where it gets cut; keep text inside the green line.</p>`:'<p class="hint">Turn this on for labels, flyers and anything printed: sizes in mm, bleed, a safe margin and print-ready PDF.</p>'}`)+
    sec('lgrid','Layout grid',`${toggle('lgOn',!!lg.on,'Show columns')}${lg.on?`<div class="grid2">${field('Columns','lgCols',lg.cols||12,{min:1,max:24,step:1,sfx:false})}${ufield('Gap','lgGutter',lg.gutter||0,dp,{min:0})}${ufield('Margin','lgMargin',lg.margin||0,dp,{min:0})}</div>`:''}`)+
    sec('guides','Guides',`<p class="hint">${S.rulers?'Drag from the rulers to add a guide. Drag a guide back to the ruler to remove it.':'Turn on rulers to add guides.'}</p>${gn?`<button type="button" class="mini" data-act="clearGuides">Remove ${gn} guide${gn===1?'':'s'}</button>`:''}${!S.rulers?'<button type="button" class="mini" data-act="rulersOn">Show rulers</button>':''}`)+
    sec('fbg','Background',fillControls(bg,'bg'))+
    sec('factions','Frame',`<div class="row"><button type="button" class="mini" data-act="dupFrame">Duplicate frame</button><button type="button" class="mini" data-act="selChildren">Select contents</button><button type="button" class="mini" data-act="exportFrame">Export…</button></div>`); }
function fillControls(n,prefix){ const t=n.getAttr('fillType')||'solid';
  if(t==='svg') return `<p class="hint">A gradient from the imported file.</p>${seg(prefix+'FillType','svg',[['solid','Solid'],['linear','Linear'],['radial','Radial']])}`;
  return `${seg(prefix+'FillType',t,[['solid','Solid'],['linear','Linear'],['radial','Radial']])}
    <div class="row">${t==='solid'?swatch(prefix+'Fill',n.fill(),'Colour',prefix!=='bg'):swatch(prefix+'GradA',n.getAttr('gradA')||'#ffffff','Gradient start')+swatch(prefix+'GradB',n.getAttr('gradB')||'#000000','Gradient end')}</div>
    ${t==='linear'?range('Angle',prefix+'GradAngle',n.getAttr('gradAngle')??90,0,360,1,'°'):''}`; }
function fontSelect(fam){ const fonts=BD.allFonts(), groups=[['brand','Brand'],['ar','Arabic'],['latin','Latin'],['system','System']];
  return `<select data-k="fontFamily" class="b-sel">${groups.map(([g,l])=>`<optgroup label="${l}">${fonts.filter(f=>f.tag===g).map(f=>`<option value="${esc(f.family)}" ${f.family===fam?'selected':''}>${esc(f.label||f.family)}</option>`).join('')}</optgroup>`).join('')}${fonts.some(f=>f.family===fam)?'':`<option selected>${esc(fam)}</option>`}</select>`; }
function textPanel(list){ const n=list[0], w=weightOf(n), dec=n.textDecoration()||'', ar=AR.test(n.text()||''), st=S.styles.text||[];
  return sec('text','Text',`<label class="f wide"><span>Font</span>${fontSelect(n.fontFamily())}</label>
    <div class="grid2"><label class="f"><span>Weight</span><select data-k="weight" class="b-sel">${WEIGHTS.map(([v,l])=>`<option value="${v}" ${v===w?'selected':''}>${l}</option>`).join('')}</select></label>${field('Size','fontSize',num(n.fontSize(),10),{min:1,sfx:'<em>px</em>'})}</div>
    <div class="row tight">${seg('align',n.align(),[['left','Left',IC.tl],['center','Centre',IC.tc],['right','Right',IC.tr],['justify','Justify',IC.tj]])}
      <div class="seg2"><button type="button" data-act="italic" aria-pressed="${italicOf(n)}" title="Italic" aria-label="Italic"><i>I</i></button><button type="button" data-act="underline" aria-pressed="${/underline/.test(dec)}" title="Underline" aria-label="Underline"><u>U</u></button><button type="button" data-act="strike" aria-pressed="${/line-through/.test(dec)}" title="Strikethrough" aria-label="Strikethrough"><s>S</s></button></div></div>
    <div class="grid2">${field('Line','lineHeight',num(n.lineHeight(),100),{step:.05,min:.5,title:'Line height',sfx:false})}${field('Spacing','letterSpacing',num(n.letterSpacing(),10),{step:.5,title:'Letter spacing',sfx:false})}</div>
    ${ar&&n.letterSpacing()?'<p class="hint warn">Arabic letters may not join when letter spacing isn\'t 0.</p>':''}
    ${toggle('autoW',!!n.getAttr('autoW'),'Width follows the text')}
    <div class="row"><button type="button" class="mini" data-act="editText">Edit text</button>${/[a-z]/i.test(n.text())?'<button type="button" class="mini" data-act="caseUp">AA</button><button type="button" class="mini" data-act="caseLow">aa</button>':''}</div>`)+
    sec('tstyle','Text styles',`${st.length?`<label class="f wide"><span>Apply</span><select data-k="applyStyle" class="b-sel"><option value="">Pick a saved style…</option>${st.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>`:''}<button type="button" class="mini" data-act="saveStyle">Save as style</button>`)+
    sec('tbg','Text background',`<div class="row">${swatch('tbg',n.getAttr('tbg')||'','Box colour',true)}</div>${n.getAttr('tbg')?range('Padding','padding',num(n.padding()),0,200,1,'px')+range('Corners','tbgR',n.getAttr('tbgR')||0,0,200,1,'px'):''}`); }
function arcPanel(n){ const r=n.getAttr('arcR')||300, mode=n.getAttr('arcMode')||'up';
  return sec('arc','Curved text',`<label class="f wide"><span>Text</span><input type="text" data-k="arcText" value="${esc(n.text())}" dir="auto"></label>
    ${seg('arcMode',mode,[['up','Arc up'],['down','Arc down'],['circle','Circle']])}${range('Curve size','arcR',Math.round(r),20,3000,1,'px')}
    <label class="f wide"><span>Font</span>${fontSelect(n.fontFamily())}</label><div class="grid2"><label class="f"><span>Weight</span><select data-k="weight" class="b-sel">${WEIGHTS.map(([v,l])=>`<option value="${v}" ${v===weightOf(n)?'selected':''}>${l}</option>`).join('')}</select></label>${field('Size','fontSize',num(n.fontSize(),10),{min:1,sfx:'<em>px</em>'})}</div>
    ${range('Spacing','letterSpacing',num(n.letterSpacing()),-10,80,1,'')}${AR.test(n.text())?'<p class="hint warn">Arabic letters don\'t join on curved text. Use straight text for Arabic.</p>':''}`); }
function barcodePanel(n){ const r=BD.tools.barcodeDigits(n.getAttr('code'),n.getAttr('btype'));
  return sec('barcode','Barcode',`<label class="f wide"><span>Number</span><input type="text" inputmode="numeric" data-k="bcCode" value="${esc(n.getAttr('code')||'')}" maxlength="14"></label>
    ${r.msg?`<p class="hint warn">${esc(r.msg)}</p>`:`<p class="hint">Code: ${esc(r.code||'')}</p>`}
    ${seg('bcType',n.getAttr('btype')||'ean',[['ean','EAN-13'],['upc','UPC-A']])}${range('Bar width','bcMod',n.getAttr('mod')||4,1,20,.5,'px')}${range('Height','bcH',n.getAttr('bh')||280,40,2000,1,'px')}
    <div class="row">${swatch('bcColor',n.getAttr('color')||'#000000','Bar colour')}</div>${toggle('bcBg',n.getAttr('bgOn')!==false,'White background (helps scanning)')}
    <p class="hint">Keep bars dark on a light background. At 300 dpi a bar width of 4 px is about 0.34 mm, the standard size.</p>`); }
function qrPanel(n){ return sec('qr','QR code',`<label class="f wide tall"><span>Link or text</span><textarea data-k="qrText" rows="2" dir="auto">${esc(n.getAttr('qrText')||'')}</textarea></label>
    ${seg('qrEcc',n.getAttr('ecc')||'M',[['L','Low'],['M','Medium'],['Q','High'],['H','Best']])}<p class="hint">Higher recovery still scans when part of it is covered, but makes more dots.</p>
    <div class="row">${swatch('qrColor',n.getAttr('color')||'#000000','Dot colour')}${swatch('qrBgC',n.getAttr('bg')||'#ffffff','Background colour')}</div>${toggle('qrBg',n.getAttr('bgOn')!==false,'Background behind it')}${toggle('qrRound',!!n.getAttr('round'),'Round corners')}`); }
function fillPanel(list){ const n=list[0]; if(!n) return ''; return sec('fill','Fill',fillControls(n,'o')); }
function strokePanel(list){ const n=list[0]; if(!n) return ''; const k=kind(n), isLine=['line','arrow','pen','stroke','icon'].includes(k), d=n.dash()||[];
  const dashV=!d.length?'solid':d[0]<=n.strokeWidth()*0.2?'dot':'dash';
  let b=`<div class="row">${swatch('stroke',n.stroke()||'',isLine?'Line colour':'Outline colour',!isLine)}</div>${range(isLine?'Thickness':'Width','strokeWidth',num(n.strokeWidth(),10),0,k==='icon'?6:120,k==='icon'?.25:1,k==='icon'?'':'px')}`;
  if(['rect','ellipse','poly','star','ring','path'].includes(k)) b+=`<span class="lbl sub">Position</span>`+seg('strokeAlign',n.getAttr('strokeAlign')||'center',[['inside','Inside'],['center','Centre'],['outside','Outside']]);
  if(isLine||k==='rect'||k==='ellipse') b+=seg('dash',dashV,[['solid','Solid'],['dash','Dashed'],['dot','Dotted']]);
  if(k==='arrow') b+=`<div class="row">${toggle('pStart',n.pointerAtBeginning(),'Arrow at start')}${toggle('pEnd',n.pointerAtEnding()!==false,'Arrow at end')}</div>${range('Head size','pointerLength',num(n.pointerLength()),4,200,1,'px')}`;
  if(k==='line'||k==='pen'||k==='arrow') b+=toggle('roundCap',n.lineCap()==='round','Round ends');
  return sec('stroke',isLine?'Line':'Outline',b); }
function shapePanel(n){ const k=kind(n); let b='';
  if(k==='rect'){ const cr=n.cornerRadius(), each=Array.isArray(cr), mx=Math.round(Math.min(n.width(),n.height())/2);
    b=each?`<div class="grid2">${['↖','↗','↘','↙'].map((l,i)=>field(l,'cr'+i,num(cr[i]||0),{min:0,sfx:'<em>px</em>',title:['Top left','Top right','Bottom right','Bottom left'][i]})).join('')}</div>`:range('Corners','cornerRadius',num(cr||0),0,mx,1,'px');
    b+=toggle('crEach',each,'Each corner'); }
  if(k==='poly') b=range('Sides','sides',n.sides(),3,12,1,'');
  if(k==='star') b=range('Points','numPoints',n.numPoints(),3,24,1,'')+range('Inner size','innerRatio',Math.round(n.innerRadius()/n.outerRadius()*100),5,95,1,'%');
  if(k==='ring') b=range('Thickness','ringRatio',Math.round((1-n.innerRadius()/n.outerRadius())*100),2,98,1,'%');
  return b?sec('shape','Shape',b):''; }
function photoPanel(list){ const n=list[0], one=list.length===1, cr=typeof n.cornerRadius()==='number'?n.cornerRadius():0;
  return sec('photo','Photo',(one?`<div class="row"><button type="button" class="mini" data-act="crop">${IC.crop} Crop / move</button><button type="button" class="mini" data-act="replace">Replace</button></div>`:'')+
    `<div class="row"><button type="button" class="mini" data-act="fillFrame">Fill the frame</button><button type="button" class="mini" data-act="asBg">Make background</button></div>
    ${range('Zoom','cropZ',num(n.getAttr('cropZ')||1,100),1,4,.01,'×')}${range('Corners','cornerRadius',num(cr),0,Math.round(Math.min(n.width(),n.height())/2),1,'px')}
    <div class="row"><button type="button" class="link" data-act="circle">Make it a circle</button><button type="button" class="link" data-act="resetCrop">Reset crop</button><button type="button" class="link" data-act="natural">Original size</button></div><p class="hint">Looks and adjustments are in the Effects tab.</p>`); }
function effectsTab(list,objs,k,all){ const n=objs[0]||list[0]; let h='';
  if(!objs.length) return h+'<p class="ps-note">Effects work on things inside frames. Select a text, shape or photo.</p>';
  const shp=objs.every(SHADOWABLE), sh=shp&&!!n.shadowEnabled()&&n.shadowOpacity()>0&&(n.shadowBlur()||n.shadowOffsetX()||n.shadowOffsetY()||n.getAttr('shadowOn'));
  h+=sec('look','Opacity and blend',`${range('Opacity','opacity',Math.round(n.opacity()*100),0,100,1,'%')}<label class="f wide"><span>Blend</span><select data-k="blend" class="b-sel">${BLENDS.map(([v,l])=>`<option value="${v}" ${(n.globalCompositeOperation()||'source-over')===v?'selected':''}>${l}</option>`).join('')}</select></label>`);
  if(shp) h+=sec('shadow','Shadow',`${toggle('shadowOn',sh,'Shadow')}${sh?`<div class="row">${swatch('shadowColor',n.shadowColor()||'#000000','Shadow colour')}</div>${range('Blur','shadowBlur',num(n.shadowBlur()),0,200,1,'px')}${range('Move X','shadowOffsetX',num(n.shadowOffsetX()),-200,200,1,'px')}${range('Move Y','shadowOffsetY',num(n.shadowOffsetY()),-200,200,1,'px')}${range('Strength','shadowOpacity',Math.round(n.shadowOpacity()*100),0,100,1,'%')}`:''}`);
  h+=sec('lblur','Blur',range('Layer blur','lblur',num(n.getAttr('lblur')||0),0,80,1,'px'));
  if(all&&(k==='image'||k==='asset')){ const fx=n.getAttr('fx')||{};
    h+=sec('looks','Photo looks',`<div class="looks">${BD.LOOKS.map(l=>`<button type="button" class="look" data-look="${l.id}" aria-pressed="${lookIs(fx,l.fx)}">${esc(l.label)}</button>`).join('')}</div>`);
    h+=sec('adjust','Adjust',FX.map(([kk,l,a,b])=>range(l,'fx:'+kk,fx[kk]||0,a,b,1,'')).join('')+`<div class="row">${toggle('fx:invert',!!fx.invert,'Invert colours')}<button type="button" class="link" data-act="fxReset">Reset</button></div>`,{cls:'adjust'}); }
  return h; }
function lookIs(fx,l){ const ks=new Set([...Object.keys(fx).filter(k=>fx[k]),...Object.keys(l)]); for(const k of ks) if((fx[k]||0)!==(l[k]||0)) return false; return true; }
function exportTab(){ const sel=S.sel, fs=[...new Set(sel.map(n=>isFrame(n)?n:frameOf(n)).filter(Boolean))], target=sel.length&&!sel.every(isFrame)?'selection':'frames', list=fs.length?fs:frames();
  const print=list.some(f=>f.getAttr('print'));
  if(!frames().length) return '<p class="ps-note">Add a frame to export.</p>';
  return `<div class="ps-head"><span class="ps-ic">${IC.upload}</span><b>Export</b><span class="ps-kind">${target==='selection'?'Selection':list.length+' frame'+(list.length===1?'':'s')}</span></div>`+
    sec('xq','Quick export',`<div class="xgrid">${[['png','PNG','Best quality'],['jpg','JPG','Smaller'],['pdf','PDF',print?'Print-ready':'Document'],['svg','SVG','Layers'],['webp','WebP','Web']].map(([f,l,s])=>`<button type="button" class="xb" data-xfmt="${f}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
      ${target==='selection'?`<button type="button" class="mini wide" data-act="expSel">Selection as see-through PNG</button>`:''}<button type="button" class="link" data-act="exportMore">More options…</button>
      <p class="hint">${list.length===1?esc(nameOf(list[0])):list.length+' frames'}${print?' · print frames export at their real size and DPI':' · screen frames export at 2×'}.</p>`); }

/* ---------- reacting to edits ---------- */
BD.on('geom',()=>{ const g=geomOf(); if(!g||tab!=='design') return; const dp=BD.units.dpiOf(S.sel[0]); ['x','y','w','h'].forEach(k=>{ const i=props.querySelector(`input[data-k="${k}"]`); if(i&&document.activeElement!==i) i.value=+BD.units.fmt(g[k],dp); }); const r=props.querySelector('input[data-k="rot"]'); if(r&&document.activeElement!==r&&g.r!=null) r.value=g.r; });
const apply=UI.apply, targets=UI.targets;
function rerot(n,r){ const b=wrect(n), c={x:b.x+b.width/2,y:b.y+b.height/2}; n.rotation(r); const b2=wrect(n); U.moveByWorld(n,c.x-(b2.x+b2.width/2),c.y-(b2.y+b2.height/2)); }
function setW(n,w,h){ const k=kind(n), r=wrect(n);
  if(k==='frame'){ BD.setFrameSize(n,w??fsize(n).w,h??fsize(n).h); return; }
  let kx=w!=null?w/r.width:null, ky=h!=null?h/r.height:null; if(S.lockRatio){ if(kx!=null) ky=kx; else if(ky!=null) kx=ky; } kx=kx??1; ky=ky??1;
  if(n.rotation()||['group','mask','bool','barcode','qr','path','icon','stroke','star','poly','ring','pen','arc'].includes(k)){ n.scaleX(n.scaleX()*kx); n.scaleY(n.scaleY()*ky); return; }
  if(k==='text'){ if(kx!==1&&ky===1){ n.width(Math.max(10,n.width()*kx)); n.setAttr('autoW',false); } else { n.fontSize(n.fontSize()*ky); if(!n.getAttr('autoW')) n.width(n.width()*kx); } return; }
  if(k==='rect'||k==='image'||k==='asset'){ n.width(n.width()*kx); n.height(n.height()*ky); if(k!=='rect'){ BD.applyCrop(n); BD.applyFx(n); } return; }
  if(k==='ellipse'){ n.radiusX(n.radiusX()*kx); n.radiusY(n.radiusY()*ky); return; }
  n.scaleX(n.scaleX()*kx); n.scaleY(n.scaleY()*ky); }
/* several things at once: scale the group of them around its top-left corner */
function setGroupSize(w,h){ const list=targets(), r=unionRect(list); let kx=w!=null?w/r.width:1, ky=h!=null?h/r.height:1; if(S.lockRatio){ if(w!=null) ky=kx; else kx=ky; }
  list.forEach(n=>{ const b=wrect(n); setW(n,b.width*kx,b.height*ky); const b2=wrect(n); U.moveByWorld(n,r.x+(b.x-r.x)*kx-b2.x,r.y+(b.y-r.y)*ky-b2.y); }); }
props.addEventListener('input',e=>{ const t=e.target, k=t.dataset.k; if(!k) return;
  const out=t.parentElement.querySelector('output'); if(out&&t.type==='range') out.textContent=t.value+(out.textContent.match(/[^\d.\-]+$/)||[''])[0];
  if(t.type==='number'||t.tagName==='SELECT'||t.type==='text'||t.tagName==='TEXTAREA') return;
  liveSet(k,t); });
props.addEventListener('change',e=>{ const t=e.target, k=t.dataset.k; if(!k) return; liveSet(k,t,true); });
props.addEventListener('keydown',e=>{ const t=e.target; if(t.tagName==='INPUT'&&(e.key==='Enter'||e.key==='Escape')){ if(e.key==='Enter') t.dispatchEvent(new Event('change',{bubbles:true})); t.blur(); e.preventDefault(); e.stopPropagation(); }
  if(t.tagName==='INPUT'&&t.type==='number'&&(e.key==='ArrowUp'||e.key==='ArrowDown')){ e.preventDefault(); const st=e.shiftKey?10:1; t.value=+(+t.value+(e.key==='ArrowUp'?st:-st)).toFixed(3); t.dispatchEvent(new Event('change',{bubbles:true})); } });
const val=t=>t.type==='checkbox'?t.checked:(t.type==='number'||t.type==='range')?+t.value:t.value;
function liveSet(k,t,final){ const v=val(t), n=n0(), dp=n?BD.units.dpiOf(n):S.dpi, px=x=>BD.units.fromUnit(x,dp);
  if(t.type==='number'&&t.value==='') return;
  switch(k){
    case 'x': case 'y': { const g=geomOf(); if(!g) return; const d=px(v)-(k==='x'?g.x:g.y); targets().forEach(m=>{ if(isFrame(m)) m[k](Math.round(m[k]()+d)); else U.moveByWorld(m,k==='x'?d:0,k==='y'?d:0); }); apply(()=>{}); return; }
    case 'w': case 'h': if(v<=0) return; if(S.sel.length===1) apply(m=>setW(m,k==='w'?px(v):null,k==='h'?px(v):null)); else { setGroupSize(k==='w'?px(v):null,k==='h'?px(v):null); apply(()=>{}); } paintProps(); return;
    case 'rot': apply(m=>rerot(m,v)); return;
    case 'unit': UI.setUnit(v); return;
    case 'bdpi': S.dpi=+v; BD.scheduleSave(); BD.paintUI(); paintProps(); return;
    case 'grid': S.grid=v; BD.view.changed(); return;
    case 'snap': S.snap=v; return;
    case 'rulers': UI.setRulers(v); return;
    case 'safe': if(t.type==='checkbox'){ S.safe=v; BD.paintUI(); return; } apply(f=>f.setAttr('safe',Math.max(0,BD.units.fromUnit(v,dp,S.unit==='px'?'mm':S.unit)))); return;
    case 'penSize': S.pen.size=v; return;
    case 'fontFamily': { const fam=v; Promise.all(targets().map(m=>BD.ensureFont(fam,m.fontStyle()))).then(()=>apply(m=>{ m.fontFamily(fam); if(kind(m)==='text') BD.prepText(m); })); return; }
    case 'weight': Promise.all(targets().map(m=>BD.ensureFont(m.fontFamily(),v))).then(()=>apply(m=>{ setStyle(m,v,italicOf(m)); if(kind(m)==='text') BD.prepText(m); })); return;
    case 'fontSize': if(v>=1) apply(m=>m.fontSize(v)); return;
    case 'lineHeight': if(v>0) apply(m=>m.lineHeight(v)); return;
    case 'letterSpacing': apply(m=>m.letterSpacing(v)); if(final) paintProps(); return;
    case 'autoW': apply(m=>{ m.setAttr('autoW',v); if(v) m.width(undefined); else m.width(m.width()); }); return;
    case 'padding': apply(m=>m.padding(v)); return;
    case 'tbgR': apply(m=>m.setAttr('tbgR',v)); return;
    case 'applyStyle': { const st=S.styles.text.find(x=>x.id===v); if(st) BD.tools.applyTextStyle(st); t.value=''; return; }
    case 'framePreset': { if(!v) return; if(v.startsWith('print:')){ const p=BD.PRINT.find(x=>x.id===v.slice(6)); if(p) apply(f=>{ f.setAttr('print',true); const d=f.getAttr('dpi')||S.dpi; BD.setFrameSize(f,BD.units.fromUnit(p.w,d,'mm'),BD.units.fromUnit(p.h,d,'mm')); },{repaint:true}); if(S.unit==='px') UI.setUnit('mm'); }
      else { const p=BD.PRESETS.find(x=>x.id===v); if(p) apply(f=>BD.setFrameSize(f,p.w,p.h),{repaint:true}); } return; }
    case 'copyTo': { if(!v||!n) return; let w,h,lab,pr=false; if(v.startsWith('print:')){ const p=BD.PRINT.find(x=>x.id===v.slice(6)), d=n.getAttr('dpi')||S.dpi; w=BD.units.fromUnit(p.w,d,'mm'); h=BD.units.fromUnit(p.h,d,'mm'); lab=p.label; pr=true; } else { const p=BD.PRESETS.find(x=>x.id===v); w=p.w; h=p.h; lab=p.label; }
      const c=BD.act.resizeWithContent(n,w,h,true,nameOf(n)+' · '+lab); if(c){ if(pr) c.setAttr('print',true); BD.view.fitSel(); UI.toast('Made a '+lab+' copy.'); } t.value=''; return; }
    case 'clip': apply(f=>BD.setClip(f,v)); return;
    case 'isPrint': apply(f=>{ f.setAttr('print',v||undefined); if(v&&!f.getAttr('dpi')) f.setAttr('dpi',S.dpi); },{repaint:true}); if(v&&S.unit==='px') UI.setUnit('mm'); return;
    case 'fdpi': { const nd=parseInt(v,10); if(!nd) return; apply(f=>{ /* keep the real size: the pixels change with the DPI */ const od=f.getAttr('dpi')||S.dpi, s=fsize(f), k2=nd/od; f.setAttr('dpi',nd); BD.setBleed(f,U.bleedOf(f)*k2); f.setAttr('safe',(f.getAttr('safe')||0)*k2); BD.act.resizeWithContent(f,s.w*k2,s.h*k2,false); },{repaint:true}); BD.view.fitSel(); return; }
    case 'bleed': apply(f=>BD.setBleed(f,BD.units.fromUnit(v,dp,S.unit==='px'?'mm':S.unit))); return;
    case 'lgOn': apply(f=>{ const g=Object.assign({cols:12,gutter:Math.round(fsize(f).w*.02),margin:Math.round(fsize(f).w*.05)},f.getAttr('lgrid')||{}); g.on=v; f.setAttr('lgrid',g); },{repaint:true}); return;
    case 'lgCols': case 'lgGutter': case 'lgMargin': apply(f=>{ const g=Object.assign({},f.getAttr('lgrid')||{}); if(k==='lgCols') g.cols=Math.max(1,Math.min(24,Math.round(v))); if(k==='lgGutter') g.gutter=Math.max(0,px(v)); if(k==='lgMargin') g.margin=Math.max(0,px(v)); f.setAttr('lgrid',g); }); return;
    case 'bgGradAngle': apply(f=>{ const bg=frameBg(f); bg.setAttr('gradAngle',v); BD.applyFill(bg); }); return;
    case 'oGradAngle': apply(m=>m.setAttr('gradAngle',v)); return;
    case 'strokeWidth': apply(m=>{ m.strokeWidth(v); if(v>0&&!m.stroke()) m.stroke(BD.brandColors().ink); if(m.dash()&&m.dash().length) m.dash(dashFor(m,m.getAttr('dashV'))); }); return;
    case 'pStart': apply(m=>m.pointerAtBeginning(v)); return;
    case 'pEnd': apply(m=>m.pointerAtEnding(v)); return;
    case 'pointerLength': apply(m=>{ m.pointerLength(v); m.pointerWidth(v); }); return;
    case 'roundCap': apply(m=>m.lineCap(v?'round':'butt')); return;
    case 'cornerRadius': apply(m=>m.cornerRadius(v)); return;
    case 'crEach': apply(m=>{ const c=m.cornerRadius(); m.cornerRadius(v?(Array.isArray(c)?c:[c||0,c||0,c||0,c||0]):(Array.isArray(c)?c[0]:c)); },{repaint:true}); return;
    case 'cr0': case 'cr1': case 'cr2': case 'cr3': apply(m=>{ const c=Array.isArray(m.cornerRadius())?[...m.cornerRadius()]:[0,0,0,0]; c[+k[2]]=Math.max(0,v); m.cornerRadius(c); }); return;
    case 'sides': apply(m=>m.sides(v)); return;
    case 'numPoints': apply(m=>m.numPoints(v)); return;
    case 'innerRatio': apply(m=>m.innerRadius(m.outerRadius()*v/100)); return;
    case 'ringRatio': apply(m=>m.innerRadius(m.outerRadius()*(1-v/100))); return;
    case 'cropZ': apply(m=>{ m.setAttr('cropZ',v); BD.applyCrop(m); BD.applyFx(m); }); return;
    case 'opacity': apply(m=>m.opacity(v/100)); return;
    case 'blend': apply(m=>m.globalCompositeOperation(v)); return;
    case 'lblur': apply(m=>{ m.setAttr('lblur',v||undefined); BD.applyFx(m); }); return;
    case 'shadowOn': apply(m=>{ if(v) m.setAttrs({shadowEnabled:true,shadowOn:true,shadowColor:m.shadowColor()||'#000000',shadowBlur:m.shadowBlur()||30,shadowOffsetX:m.shadowOffsetX()||0,shadowOffsetY:m.shadowOffsetY()||16,shadowOpacity:m.shadowOpacity()<1?m.shadowOpacity():.35}); else m.setAttrs({shadowEnabled:false,shadowOn:undefined}); },{repaint:true}); return;
    case 'shadowBlur': case 'shadowOffsetX': case 'shadowOffsetY': apply(m=>m.setAttr(k,v)); return;
    case 'shadowOpacity': apply(m=>m.shadowOpacity(v/100)); return;
    case 'arcText': apply(m=>m.text(v||' ')); return;
    case 'arcR': apply(m=>{ m.setAttr('arcR',v); BD.tools.updateArc(m); }); return;
    case 'bcCode': apply(m=>{ m.setAttr('code',String(v).replace(/\D/g,'')); BD.tools.buildBarcode(m); },{repaint:true}); return;
    case 'bcMod': apply(m=>{ m.setAttr('mod',v); BD.tools.buildBarcode(m); }); return;
    case 'bcH': apply(m=>{ m.setAttr('bh',v); BD.tools.buildBarcode(m); }); return;
    case 'bcBg': apply(m=>{ m.setAttr('bgOn',v?undefined:false); BD.tools.buildBarcode(m); }); return;
    case 'qrText': targets().forEach(m=>m.setAttr('qrText',v)); Promise.all(targets().map(m=>BD.tools.buildQR(m))).then(()=>apply(()=>{})); return;
    case 'qrBg': targets().forEach(m=>m.setAttr('bgOn',v?undefined:false)); Promise.all(targets().map(m=>BD.tools.buildQR(m))).then(()=>apply(()=>{})); return;
    case 'qrRound': targets().forEach(m=>m.setAttr('round',v||undefined)); Promise.all(targets().map(m=>BD.tools.buildQR(m))).then(()=>apply(()=>{})); return;
  }
  if(k.startsWith('fx:')){ const f=k.slice(3); apply(m=>{ const fx=Object.assign({},m.getAttr('fx')||{}); fx[f]=f==='invert'?(v?1:0):v; m.setAttr('fx',fx); BD.applyFx(m); }); if(final) markLooks(); }
}
function markLooks(){ const n=n0(); if(!n) return; const fx=n.getAttr('fx')||{}; props.querySelectorAll('[data-look]').forEach(b=>{ const l=BD.LOOKS.find(x=>x.id===b.dataset.look); b.setAttribute('aria-pressed',String(lookIs(fx,l.fx))); }); }
function dashFor(n,v){ const w=Math.max(1,n.strokeWidth()); return v==='dot'?[0.001,w*2]:v==='dash'?[w*3,w*2]:[]; }

props.addEventListener('click',e=>{
  const fo=e.target.closest('[data-fold]'); if(fo){ const id=fo.dataset.fold, on=fo.getAttribute('aria-expanded')==='true'; fo.setAttribute('aria-expanded',String(!on)); fo.closest('.ps').querySelector('.ps-b').hidden=on; on?folded.add(id):folded.delete(id); L.store('lab:folds',[...folded]); return; }
  const sw=e.target.closest('[data-color]'); if(sw){ colorFor(sw); return; }
  const sg=e.target.closest('[data-seg]'); if(sg){ segSet(sg.dataset.seg,sg.dataset.v); return; }
  const al=e.target.closest('[data-align]'); if(al){ BD.act.align(al.dataset.align); return; }
  const di=e.target.closest('[data-dist]'); if(di){ BD.act.distribute(di.dataset.dist); return; }
  const lk=e.target.closest('[data-look]'); if(lk){ const l=BD.LOOKS.find(x=>x.id===lk.dataset.look); apply(m=>{ m.setAttr('fx',Object.assign({},l.fx)); BD.applyFx(m); },{repaint:true}); return; }
  const dc=e.target.closest('[data-delcolor]'); if(dc){ S.styles.colors=S.styles.colors.filter(c=>c!==dc.dataset.delcolor); BD.scheduleSave(); paintProps(); return; }
  const xf=e.target.closest('[data-xfmt]'); if(xf){ quickExport(xf.dataset.xfmt); return; }
  const b=e.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act, n=n0();
  const acts={dup:()=>BD.act.duplicate(),front:()=>BD.act.order('front'),back:()=>BD.act.order('back'),flipX:()=>BD.act.flip('x'),flipY:()=>BD.act.flip('y'),lock:()=>BD.act.lock(),group:BD.act.group,ungroup:BD.act.ungroup,del:BD.act.del,
    ratio:()=>{ S.lockRatio=!S.lockRatio; b.setAttribute('aria-pressed',String(S.lockRatio)); }, mask:BD.tools.mask, unmask:BD.tools.unmask, boolRelease:BD.bool.release, compMake:()=>BD.comps.make(), compCopy:()=>BD.comps.addCopy(n), compSel:()=>BD.comps.selectCopies(n), compMain:()=>BD.comps.goMain(n), compReset:()=>{ BD.comps.reset(n); paintProps(); }, compDetach:()=>{ BD.comps.detach([n]); paintProps(); },
    printFrame:()=>UI.printFrameDialog(), bgReset:()=>{ S.bg=null; BD.wrap.style.backgroundColor=''; BD.scheduleSave(); paintProps(); },
    swapWH:()=>apply(f=>{ const s=fsize(f); BD.setFrameSize(f,s.h,s.w); },{repaint:true}),
    fitContent:()=>{ const f=n, list=items(f); if(!list.length) return; const r=unionRect(list); const dx=r.x-f.x(), dy=r.y-f.y(); f.position({x:Math.round(r.x),y:Math.round(r.y)}); list.forEach(c=>{ c.x(c.x()-dx); c.y(c.y()-dy); }); BD.setFrameSize(f,r.width,r.height); BD.tr.forceUpdate(); BD.paintUI(); BD.changed(); paintProps(); },
    dupFrame:()=>BD.act.duplicate(), selChildren:()=>BD.select(items(n).filter(x=>!isLocked(x))), exportFrame:()=>UI.exportDialog([n]),
    clearGuides:()=>apply(f=>f.setAttr('guides',undefined),{repaint:true}), rulersOn:()=>{ UI.setRulers(true); paintProps(); },
    italic:()=>apply(m=>setStyle(m,weightOf(m),!italicOf(m)),{repaint:true}),
    underline:()=>apply(m=>{ const d=m.textDecoration()||''; m.textDecoration(/underline/.test(d)?d.replace('underline','').trim():(d+' underline').trim()); },{repaint:true}),
    strike:()=>apply(m=>{ const d=m.textDecoration()||''; m.textDecoration(/line-through/.test(d)?d.replace('line-through','').trim():(d+' line-through').trim()); },{repaint:true}),
    editText:()=>BD.startEdit(n), caseUp:()=>apply(m=>m.text(m.text().toUpperCase())), caseLow:()=>apply(m=>m.text(m.text().toLowerCase())),
    saveStyle:()=>{ const name=prompt('Name this text style',(n.text()||'').slice(0,20)||'Text style'); if(name===null) return; BD.tools.saveTextStyle(n,name.trim()||undefined); UI.toast('Saved. Find it under Assets › Text.'); paintProps(); },
    crop:()=>UI.startCrop(n), replace:()=>UI.replacePhoto(n), fillFrame:()=>BD.act.fillFrame(n), asBg:()=>BD.act.fillFrame(n,true),
    circle:()=>apply(m=>{ const s=Math.min(m.width(),m.height()); const r=wrect(m); m.width(s); m.height(s); BD.applyCrop(m); m.cornerRadius(s/2); const r2=wrect(m); U.moveByWorld(m,r.x+r.width/2-(r2.x+r2.width/2),r.y+r.height/2-(r2.y+r2.height/2)); BD.applyFx(m); },{repaint:true}),
    resetCrop:()=>apply(m=>{ m.setAttrs({cropZ:1,focX:.5,focY:.5,stretch:undefined}); BD.applyCrop(m); BD.applyFx(m); },{repaint:true}),
    natural:()=>apply(m=>{ const im=BD.IMGS.get(m.getAttr('imgId')); if(!im) return; const f=frameOf(m), box=f?fsize(f):{w:im.w,h:im.h}, k=Math.min(1,box.w/im.w,box.h/im.h); m.setAttrs({width:Math.round(im.w*k),height:Math.round(im.h*k),cropZ:1,focX:.5,focY:.5,stretch:undefined}); BD.applyCrop(m); BD.applyFx(m); },{repaint:true}),
    fxReset:()=>apply(m=>{ m.setAttr('fx',{}); BD.applyFx(m); },{repaint:true}),
    expSel:()=>UI.exportSel(), exportMore:()=>UI.exportDialog()};
  if(a.startsWith('bool:')){ BD.bool.make(a.slice(5)); return; }
  if(acts[a]) acts[a](); });
function quickExport(fmt){ const sel=S.sel, fs=[...new Set(sel.map(n=>isFrame(n)?n:frameOf(n)).filter(Boolean))], list=fs.length?fs:frames();
  const print=list.some(f=>f.getAttr('print'));
  UI.runExport({frames:list,fmt,scale:print?1:2,bleed:print,marks:false,onePdf:true,zip:list.length>3}); }
function segSet(key,v){
  if(key==='align') return apply(m=>m.align(v),{repaint:true});
  if(key==='penMode'){ S.pen.mode=v; return paintProps(); }
  if(key==='boolOp'){ targets().filter(m=>kind(m)==='bool').forEach(m=>BD.bool.setOp(m,v)); return apply(()=>{},{repaint:true}); }
  if(key==='dash') return apply(m=>{ m.setAttr('dashV',v); if(v!=='solid'&&!m.strokeWidth()) m.strokeWidth(4); if(v!=='solid'&&!m.stroke()) m.stroke(BD.brandColors().ink); m.dash(dashFor(m,v)); if(v==='dot') m.lineCap('round'); },{repaint:true});
  if(key==='strokeAlign') return apply(m=>{ m.setAttr('strokeAlign',v==='center'?undefined:v); if(v!=='center'&&!m.strokeWidth()){ m.strokeWidth(8); if(!m.stroke()) m.stroke(BD.brandColors().ink); } BD.decorate(m); },{repaint:true});
  if(key==='bgFillType') return apply(f=>setFillType(frameBg(f),v),{repaint:true});
  if(key==='oFillType') return apply(m=>setFillType(m,v),{repaint:true});
  if(key==='arcMode') return apply(m=>{ m.setAttr('arcMode',v); BD.tools.updateArc(m); },{repaint:true});
  if(key==='bcType') return apply(m=>{ m.setAttr('btype',v); BD.tools.buildBarcode(m); },{repaint:true});
  if(key==='qrEcc'){ targets().forEach(m=>m.setAttr('ecc',v)); Promise.all(targets().map(m=>BD.tools.buildQR(m))).then(()=>apply(()=>{},{repaint:true})); }
}
function setFillType(n,v){ if(v!=='solid'){ if(!n.getAttr('gradA')) n.setAttr('gradA',typeof n.fill()==='string'&&n.fill()?UI.hex6(n.fill()):'#ffffff'); if(!n.getAttr('gradB')) n.setAttr('gradB',BD.brandColors().ink); if(n.getAttr('gradAngle')==null) n.setAttr('gradAngle',180); }
  n.setAttr('fillType',v); if(v==='solid'){ n.fillPriority('color'); if(!n.fill()) n.fill(n.getAttr('gradA')||'#ffffff'); } BD.applyFill(n); }
function colorFor(btn){ const key=btn.dataset.color, n=n0();
  const get={boolFill:()=>{ const b=BD.bool.base(n); return b&&b.fill(); },workspace:()=>S.bg||'',pen:()=>S.pen.color,bgFill:()=>frameBg(n).fill(),bgGradA:()=>frameBg(n).getAttr('gradA'),bgGradB:()=>frameBg(n).getAttr('gradB'),oFill:()=>n.fill(),oGradA:()=>n.getAttr('gradA'),oGradB:()=>n.getAttr('gradB'),stroke:()=>n.stroke(),tbg:()=>n.getAttr('tbg'),shadowColor:()=>n.shadowColor(),bcColor:()=>n.getAttr('color'),qrColor:()=>n.getAttr('color'),qrBgC:()=>n.getAttr('bg')||'#ffffff'};
  let cur=(get[key]||(()=>''))()||'';
  UI.colorPop(btn,(typeof cur==='string'&&cur)||'#000000',v=>{
    const set={workspace:()=>{ S.bg=v||null; BD.wrap.style.backgroundColor=S.bg||''; BD.scheduleSave(); }, pen:()=>{ S.pen.color=v; },
      bgFill:()=>apply(f=>{ const bg=frameBg(f); bg.fill(v||'#ffffff'); bg.setAttr('fillType','solid'); BD.applyFill(bg); }),
      bgGradA:()=>apply(f=>{ const bg=frameBg(f); bg.setAttr('gradA',v); BD.applyFill(bg); }), bgGradB:()=>apply(f=>{ const bg=frameBg(f); bg.setAttr('gradB',v); BD.applyFill(bg); }),
      boolFill:()=>apply(m=>{ const b=kind(m)==='bool'&&BD.bool.base(m); if(b){ b.fill(v||'#000000'); b.setAttr('fillType','solid'); BD.applyFill(b); } },{repaint:true}),
      oFill:()=>apply(m=>{ m.fill(v); if(kind(m)==='arrow') m.stroke(v||m.stroke()); }), oGradA:()=>apply(m=>m.setAttr('gradA',v)), oGradB:()=>apply(m=>m.setAttr('gradB',v)),
      stroke:()=>apply(m=>{ m.stroke(v); if(v&&!m.strokeWidth()) m.strokeWidth(kind(m)==='text'?4:6); if(kind(m)==='arrow') m.fill(v); }),
      tbg:()=>apply(m=>{ m.setAttr('tbg',v||undefined); if(v&&!m.padding()) m.padding(Math.round(m.fontSize()*.3)); }), shadowColor:()=>apply(m=>m.shadowColor(v)),
      bcColor:()=>apply(m=>{ m.setAttr('color',v); BD.tools.buildBarcode(m); }),
      qrColor:()=>{ targets().forEach(m=>m.setAttr('color',v)); Promise.all(targets().map(m=>BD.tools.buildQR(m))).then(()=>apply(()=>{})); },
      qrBgC:()=>{ targets().forEach(m=>m.setAttr('bg',v)); Promise.all(targets().map(m=>BD.tools.buildQR(m))).then(()=>apply(()=>{})); }};
    (set[key]||(()=>{}))();
    const i=btn.querySelector('i'), s=btn.querySelector('span'); if(i){ i.style.setProperty('--c',v||'transparent'); i.classList.toggle('empty',!v); } if(s) s.textContent=v?UI.hex6(v).toUpperCase()+(UI.alphaOf(v)<100?' · '+UI.alphaOf(v)+'%':''):(key==='workspace'?'Default':'None');
    if(key==='tbg'&&!!v!==!!cur){ cur=v; setTimeout(paintProps,0); } UI.paintQbar(); },{none:!!btn.dataset.none}); }
})();
