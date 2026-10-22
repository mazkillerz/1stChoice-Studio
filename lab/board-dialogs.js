/* Board (experimental): dialogs — export (PNG, JPG, WebP, PDF, SVG, ZIP; print size, bleed, crop marks),
   new print frame, repeat, find and replace, replace a colour, versions, barcode, QR code, shortcuts, board menu. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S, UI=BD.UI, esc=L.esc, IC=UI.IC, $=UI.$;
const {kind,isFrame,isLocked,frames,items,fsize,unionRect,frameOf,nameOf,frameBg}=U;
const toast=UI.toast;
const seg=(key,val,opts)=>`<div class="seg2" role="group">${opts.map(([v,l])=>`<button type="button" data-seg="${key}" data-v="${v}" aria-pressed="${String(val)===String(v)}">${esc(l)}</button>`).join('')}</div>`;
function segs(d,onChange){ d.addEventListener('click',e=>{ const sg=e.target.closest('[data-seg]'); if(!sg) return; d.querySelectorAll(`[data-seg="${sg.dataset.seg}"]`).forEach(b=>b.setAttribute('aria-pressed',String(b===sg))); onChange(sg.dataset.seg,sg.dataset.v); }); }

/* ---------- saving files ---------- */
function fileBase(){ return ((BD.B&&BD.B.id)||'board')+'-'+(S.name||'board').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,40); }
const slug=s=>String(s||'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,30)||'frame';
function stamp(){ const d=new Date(), z=x=>String(x).padStart(2,'0'); return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes()); }
function saveBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },4000); }
const phoneShare=()=>matchMedia('(pointer:coarse)').matches&&navigator.canShare;
async function deliver(files){ if(phoneShare()&&navigator.canShare({files})){ try{ await navigator.share({files}); return true; }catch(err){ if(err&&err.name==='AbortError') return false; } }
  for(const f of files){ saveBlob(f,f.name); await new Promise(r=>setTimeout(r,350)); } return true; }
UI.saveBlob=saveBlob; UI.fileBase=fileBase;

/* the one place every export goes through */
UI.runExport=async function(o,status){ const st=status||(t=>BD.busy(t)); const fr=o.frames.filter(f=>f&&f.getStage()); if(!fr.length){ toast('Pick at least one frame.'); return; }
  const fmt=o.fmt||'png', files=[]; let smaller=false;
  try{
    if(fmt==='pdf'){ const pages=[]; for(let i=0;i<fr.length;i++){ st('Making page '+(i+1)+' of '+fr.length+'…'); await new Promise(r=>setTimeout(r,20)); pages.push(await BD.io.pdfPage(fr[i],{bleed:o.bleed,marks:o.marks,scale:o.scale,transparent:false}));
        if(!o.onePdf){ st('Writing the PDF…'); files.push(new File([await BD.io.pdf([pages.pop()])],fileBase()+'-'+slug(nameOf(fr[i]))+'-'+stamp()+'.pdf',{type:'application/pdf'})); } }
      if(o.onePdf){ st('Writing the PDF…'); files.push(new File([await BD.io.pdf(pages)],fileBase()+'-'+stamp()+'.pdf',{type:'application/pdf'})); } }
    else if(fmt==='svg'){ for(let i=0;i<fr.length;i++){ st('Making '+(i+1)+' of '+fr.length+'…'); const t=await BD.io.svg(fr[i],{bleed:o.bleed,transparent:o.transparent}); files.push(new File([t],fileBase()+'-'+slug(nameOf(fr[i]))+'-'+stamp()+'.svg',{type:'image/svg+xml'})); } }
    else { const type=fmt==='jpg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png';
      for(let i=0;i<fr.length;i++){ const f=fr[i]; st('Making '+(i+1)+' of '+fr.length+'…'); await new Promise(r=>setTimeout(r,20));
        const print=!!f.getAttr('print'), sc=o.scale||(print?1:2); const res=await BD.exportFrame(f,{type,scale:sc,bleed:o.bleed,transparent:o.transparent&&type!=='image/jpeg'}); if(res.scale<sc) smaller=true;
        let blob=res.blob; if(print) blob=await BD.io.withDpi(blob,Math.round(BD.units.dpiOf(f)*res.scale));
        files.push(new File([blob],fileBase()+'-'+slug(nameOf(f))+'-'+stamp()+(fr.length>1?'-'+(i+1):'')+'.'+(fmt==='jpg'?'jpg':fmt),{type})); } }
    if(o.copy&&files[0]&&navigator.clipboard&&window.ClipboardItem){ const f=files[0]; const png=f.type==='image/png'?f:null; if(!png) throw new Error('Copying works for PNG.'); await navigator.clipboard.write([new ClipboardItem({'image/png':png})]); BD.busy(null); toast('Copied. Paste it anywhere.'); return true; }
    let out=files; if(o.zip&&files.length>1){ st('Packing a ZIP…'); out=[new File([await BD.io.zip(files.map(f=>({name:f.name,blob:f})))],fileBase()+'-'+stamp()+'.zip',{type:'application/zip'})]; }
    BD.busy(null); await deliver(out);
    toast((out.length>1?out.length+' files saved.':'Saved '+out[0].name.split('.').pop().toUpperCase()+'.')+(smaller?' (A bit smaller than asked: this device can\'t make it that big.)':''),5000); return true;
  }catch(err){ BD.busy(null); toast(err.message||'Could not export.'); return false; } };

UI.exportDialog=function(list,fmt0){ const fs=frames(); if(!fs.length){ toast('Add a frame first.'); return; }
  const pre=new Set((list&&list.length?list:(S.sel.length?[...new Set(S.sel.map(n=>isFrame(n)?n:frameOf(n)).filter(Boolean))]:fs)).map(f=>f.id())); if(!pre.size) fs.forEach(f=>pre.add(f.id()));
  let fmt=fmt0||L.store('lab:xfmt')||'png', scale='auto', bleed=true, marks=false, transparent=false, onePdf=true, zip=false;
  const d=L.dialog(`<div class="dlg-body exp"><h3>Export</h3>
    <span class="lbl">Frames</span><div class="exp-list">${fs.map(f=>{ const s=fsize(f), dp=BD.units.dpiOf(f), pr=!!f.getAttr('print'); return `<label class="tg"><input type="checkbox" value="${f.id()}" ${pre.has(f.id())?'checked':''}><span dir="auto">${esc(nameOf(f))} <small>${pr?BD.units.fmt(s.w,dp,'mm')+' × '+BD.units.fmt(s.h,dp,'mm')+' mm · '+dp+' dpi':s.w+' × '+s.h+' px'}</small></span></label>`; }).join('')}</div>
    <div class="row"><button type="button" class="link" id="exAll">All</button><button type="button" class="link" id="exNone">None</button></div>
    <span class="lbl">Format</span>${seg('fmt',fmt,[['png','PNG'],['jpg','JPG'],['webp','WebP'],['pdf','PDF'],['svg','SVG']])}<p class="small fmt-note" id="exFmtNote"></p>
    <div id="exOpts"></div><p class="small" id="exInfo"></p><div class="status" id="exSt" role="status"></div>
    <div class="dlg-actions"><button type="button" class="mini" id="exNo">Cancel</button>${navigator.clipboard&&window.ClipboardItem?'<button type="button" class="mini" id="exCopy">Copy image</button>':''}<button type="button" class="btn" id="exGo">Export</button></div></div>`,'wide');
  const chosen=()=>[...d.querySelectorAll('.exp-list input:checked')].map(i=>BD.main.findOne('#'+i.value)).filter(Boolean);
  const NOTES={png:'Lossless, sharpest. See-through background possible.',jpg:'Smaller files, no see-through background.',webp:'Small files for the web.',pdf:'Each frame is a page at its exact size. Print frames keep their mm size and DPI.',svg:'Keeps layers, so it opens again in Board, Figma, Illustrator or Canva.'};
  function opts(){ const fr=chosen(), anyPrint=fr.some(f=>f.getAttr('print')), anyBleed=fr.some(f=>U.bleedOf(f)>0); let h='';
    if(fmt!=='svg'&&fmt!=='pdf') h+=`<span class="lbl">Size</span>${seg('scale',scale,[['auto',anyPrint?'Print size':'2× (sharp)'],['1','1×'],['2','2×'],['3','3×']])}`;
    if(fmt==='pdf'&&fr.some(f=>!f.getAttr('print'))) h+=`<span class="lbl">Screen frames</span>${seg('scale',scale,[['auto','2× (sharp)'],['1','1×'],['3','3×']])}`;
    if(anyBleed) h+=`<label class="tg"><input type="checkbox" id="exBleed" ${bleed?'checked':''}><span>Include the bleed</span></label>`;
    if(fmt==='pdf'&&anyPrint) h+=`<label class="tg"><input type="checkbox" id="exMarks" ${marks?'checked':''}><span>Crop marks</span></label>`;
    if(fmt==='pdf'&&fr.length>1) h+=`<label class="tg"><input type="checkbox" id="exOne" ${onePdf?'checked':''}><span>One PDF with every frame as a page</span></label>`;
    if(fmt==='png'||fmt==='webp'||fmt==='svg') h+=`<label class="tg"><input type="checkbox" id="exTr" ${transparent?'checked':''}><span>See-through background</span></label>`;
    if(fr.length>1&&!(fmt==='pdf'&&onePdf)) h+=`<label class="tg"><input type="checkbox" id="exZip" ${zip?'checked':''}><span>Download as one ZIP</span></label>`;
    d.querySelector('#exOpts').innerHTML=h; d.querySelector('#exFmtNote').textContent=NOTES[fmt]; info(); }
  function info(){ const fr=chosen(); d.querySelector('#exGo').disabled=!fr.length; if(!fr.length){ d.querySelector('#exInfo').textContent='Pick at least one frame.'; return; } const f=fr[0], s=fsize(f), b=bleed?U.bleedOf(f):0, pr=!!f.getAttr('print'), dp=BD.units.dpiOf(f);
    const sc=scale==='auto'?(pr?1:2):+scale; const w=Math.round((s.w+2*b)*sc), h=Math.round((s.h+2*b)*sc);
    d.querySelector('#exInfo').textContent=(fr.length>1?fr.length+' frames · first: ':'')+(fmt==='svg'?'vector layers':w+' × '+h+' px')+(pr&&fmt!=='svg'?' · '+BD.units.fmt(s.w+2*b,dp,'mm')+' × '+BD.units.fmt(s.h+2*b,dp,'mm')+' mm at '+Math.round(dp*sc)+' dpi':''); }
  segs(d,(k,v)=>{ if(k==='fmt'){ fmt=v; L.store('lab:xfmt',v); opts(); } if(k==='scale'){ scale=v; info(); } });
  d.addEventListener('change',e=>{ const id=e.target.id; if(id==='exBleed') bleed=e.target.checked; if(id==='exMarks') marks=e.target.checked; if(id==='exOne'){ onePdf=e.target.checked; opts(); } if(id==='exTr') transparent=e.target.checked; if(id==='exZip') zip=e.target.checked; if(e.target.closest('.exp-list')) opts(); else info(); });
  d.querySelector('#exAll').onclick=()=>{ d.querySelectorAll('.exp-list input').forEach(i=>i.checked=true); opts(); }; d.querySelector('#exNone').onclick=()=>{ d.querySelectorAll('.exp-list input').forEach(i=>i.checked=false); opts(); };
  d.querySelector('#exNo').onclick=()=>d.close(); opts();
  const run=async copy=>{ const st=d.querySelector('#exSt'); d.querySelectorAll('button').forEach(b=>b.disabled=true);
    const ok=await UI.runExport({frames:chosen(),fmt:copy?'png':fmt,scale:scale==='auto'?null:+scale,bleed,marks,transparent,onePdf,zip,copy},t=>{ st.textContent=t; });
    if(ok) d.close(); else d.querySelectorAll('button').forEach(b=>b.disabled=false); };
  d.querySelector('#exGo').onclick=()=>run(false); const cp=d.querySelector('#exCopy'); if(cp) cp.onclick=()=>run(true); };
UI.exportSel=async function(){ if(!S.sel.length) return; if(S.sel.length===1&&isFrame(S.sel[0])){ UI.exportDialog([S.sel[0]]); return; }
  try{ BD.busy('Exporting…'); const res=await BD.exportSelection({scale:2}); BD.busy(null); await deliver([new File([res.blob],fileBase()+'-selection-'+stamp()+'.png',{type:'image/png'})]); toast('Saved with a see-through background.'); }catch(err){ BD.busy(null); toast(err.message); } };
$('exportB').onclick=()=>UI.exportDialog();

/* ---------- board menu ---------- */
$('fileMenu').onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(); UI.openMenu(r.left,r.bottom+6,[
  {label:'New board',run:()=>newBoardDialog()},{label:'All boards',run:()=>{ BD.saveNow().then(()=>location.href='index.html'); }},{label:'Duplicate this board',run:dupBoard},'-',
  {label:'Rename',run:()=>{ $('bName').focus(); $('bName').select(); }},{label:'Versions…',run:()=>UI.versionsDialog()},{label:'Save a version now',run:()=>BD.tools.saveVersion().then(()=>toast('Version saved.'))},'-',
  {label:'Download board file',run:()=>UI.downloadBoard()},{label:'Open board file…',run:()=>$('pickBoard').click()},'-',
  {label:'Keyboard shortcuts',key:'?',run:()=>UI.shortcuts()},{label:'Delete this board',danger:true,run:deleteBoard}]); };
$('pickBoard').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; try{ const id=await BD.importBoardFile(f); await BD.saveNow(); location.href='board.html?id='+id; }catch(err){ toast(err.message||'Could not open that file.'); } };
async function dupBoard(){ await BD.saveNow(); const raw=await L.idb.get('board:'+S.id); const d=JSON.parse(raw); const id=U.uid(); d.name=S.name+' copy'; await L.idb.put('board:'+id,JSON.stringify(d)); const t=await L.idb.get('bthumb:'+S.id); if(t) await L.idb.put('bthumb:'+id,t); const list=BD.boards(); list.unshift({id,name:d.name,created:Date.now(),updated:Date.now()}); BD.saveIndex(list); location.href='board.html?id='+id; }
UI.downloadBoard=async function(){ BD.busy('Packing the board…'); const blob=await BD.exportBoardFile(); BD.busy(null); saveBlob(blob,fileBase()+'.board'); };
function deleteBoard(){ const d=L.dialog(`<div class="dlg-body"><h3>Delete “${esc(S.name)}”?</h3><p class="small">The board and its photos are removed from this device. It can't be undone.</p><div class="dlg-actions"><button type="button" class="mini" id="dNo">Cancel</button><button type="button" class="btn danger" id="dYes">Delete</button></div></div>`);
  d.querySelector('#dNo').onclick=()=>d.close();
  d.querySelector('#dYes').onclick=async()=>{ const raw=await L.idb.get('board:'+S.id); try{ const others=new Set(); for(const o of BD.boards()){ if(o.id===S.id) continue; const r=await L.idb.get('board:'+o.id); if(r) (JSON.parse(r).imgs||[]).forEach(x=>others.add(x)); } const doc=JSON.parse(raw); for(const id of (doc.imgs||[])) if(!others.has(id)) await L.idb.del('bimg:'+id); }catch(_){}
    for(const v of await BD.tools.versions()) await L.idb.del('bver:'+v.id); await L.idb.del('bvers:'+S.id);
    await L.idb.del('board:'+S.id); await L.idb.del('bthumb:'+S.id); BD.saveIndex(BD.boards().filter(b=>b.id!==S.id)); S.id=null; location.href='index.html'; }; }
function newBoardDialog(){ const d=L.dialog(`<div class="dlg-body"><h3>New board</h3><p class="small">Start with one frame. You can add frames of any size later.</p>
  <div class="preset-grid">${BD.PRESETS.slice(0,8).map(p=>`<button type="button" class="preset" data-p="${p.id}"><span class="pv" style="${UI.pv(p.w,p.h,28)}"></span><b>${esc(p.label)}</b><small>${p.w} × ${p.h}</small></button>`).join('')}</div>
  <span class="lbl">Print</span><div class="chips">${BD.PRINT.slice(0,6).map(p=>`<button type="button" class="chip" data-pp="${p.id}">${esc(p.label)}</button>`).join('')}</div>
  <span class="lbl">Or a template</span><div class="chips">${BD.TEMPLATES.map(t=>`<button type="button" class="chip" data-t="${t.id}">${esc(t.label)}</button>`).join('')}</div>
  <div class="dlg-actions"><button type="button" class="mini" id="nbNo">Cancel</button></div></div>`,'wide');
  d.querySelector('#nbNo').onclick=()=>d.close();
  d.addEventListener('click',async e=>{ const p=e.target.closest('[data-p]'), t=e.target.closest('[data-t]'), pp=e.target.closest('[data-pp]'); if(!p&&!t&&!pp) return; d.close(); await BD.saveNow(); location.href='board.html?'+(p?'preset='+p.dataset.p:pp?'print='+pp.dataset.pp:'template='+t.dataset.t); }); }
UI.newBoardDialog=newBoardDialog;
UI.renameNode=function(n){ const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>Rename</h3><input type="text" id="rnIn" maxlength="60" dir="auto" class="b-in"><div class="dlg-actions"><button type="button" class="mini" id="rnNo">Cancel</button><button type="submit" class="btn">Save</button></div></form>`);
  const i=d.querySelector('#rnIn'); i.value=nameOf(n); setTimeout(()=>{ i.focus(); i.select(); },30); d.querySelector('#rnNo').onclick=()=>d.close();
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); n.setAttr('label',i.value.trim()||undefined); d.close(); BD.paintUI(); BD.changed(); UI.paintLayersSoon(); UI.paintProps(); }; };

/* ---------- new print frame (labels, flyers, anything printed) ---------- */
UI.printFrameDialog=function(){ const last=L.store('lab:printLast')||{w:205,h:85,unit:'mm',dpi:300,bleed:3,safe:3,name:''};
  const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>New print frame</h3><p class="small">Type the real size, for example a can label. It's made at the DPI you pick, so it prints at exactly this size.</p>
    <label class="f wide"><span>Name</span><input type="text" id="pfName" maxlength="40" placeholder="Can label" value="${esc(last.name||'')}" dir="auto"></label>
    <div class="grid2"><label class="f"><span>W</span><input type="number" id="pfW" min="1" step="any" value="${last.w}"></label><label class="f"><span>H</span><input type="number" id="pfH" min="1" step="any" value="${last.h}"></label></div>
    <span class="lbl">Unit</span>${seg('pfU',last.unit,[['mm','mm'],['cm','cm'],['in','in']])}
    <span class="lbl">Quality</span>${seg('pfD',String(last.dpi),[['150','150 dpi'],['300','300 dpi'],['600','600 dpi']])}
    <div class="grid2"><label class="f" title="Extra design around the edge that gets trimmed"><span>Bleed</span><input type="number" id="pfB" min="0" step="any" value="${last.bleed}"></label><label class="f" title="Keep words inside this margin"><span>Safe</span><input type="number" id="pfS" min="0" step="any" value="${last.safe}"></label></div>
    <p class="small" id="pfInfo"></p>
    <span class="lbl">Common sizes</span><div class="chips">${BD.PRINT.map(p=>`<button type="button" class="chip sm" data-pp="${p.id}">${esc(p.label)}</button>`).join('')}</div>
    <div class="dlg-actions"><button type="button" class="mini" id="pfNo">Cancel</button><button type="submit" class="btn">Make frame</button></div></form>`,'wide');
  let unit=last.unit, dpi=last.dpi; const $d=id=>d.querySelector('#'+id);
  const info=()=>{ const w=+$d('pfW').value, h=+$d('pfH').value; if(!(w>0&&h>0)){ $d('pfInfo').textContent=''; return; } const px=v=>Math.round(BD.units.fromUnit(v,dpi,unit)); $d('pfInfo').textContent=`${px(w)} × ${px(h)} px at ${dpi} dpi${+$d('pfB').value?' · plus '+$d('pfB').value+' '+unit+' bleed on every side':''}.`; };
  segs(d,(k,v)=>{ if(k==='pfU') unit=v; if(k==='pfD') dpi=+v; info(); }); d.addEventListener('input',info); info();
  d.addEventListener('click',e=>{ const pp=e.target.closest('[data-pp]'); if(!pp) return; const p=BD.PRINT.find(x=>x.id===pp.dataset.pp); unit='mm'; d.querySelectorAll('[data-seg="pfU"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v==='mm'))); $d('pfW').value=p.w; $d('pfH').value=p.h; if(!$d('pfName').value) $d('pfName').value=p.label; info(); });
  $d('pfNo').onclick=()=>d.close();
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); const w=+$d('pfW').value, h=+$d('pfH').value; if(!(w>0&&h>0)) return; const name=$d('pfName').value.trim();
    const big=BD.units.fromUnit(Math.max(w,h),dpi,unit); if(big>16000){ $d('pfInfo').textContent='That is too big at this quality. Try a lower DPI.'; return; }
    L.store('lab:printLast',{w,h,unit,dpi,bleed:+$d('pfB').value||0,safe:+$d('pfS').value||0,name});
    d.close(); UI.addPrintFrame(w,h,name||('Print '+w+' × '+h+' '+unit),{unit,dpi,bleed:+$d('pfB').value||0,safe:+$d('pfS').value||0}); toast('Print frame ready: '+w+' × '+h+' '+unit+'.'); }; };

/* ---------- repeat in a grid ---------- */
UI.repeatDialog=function(){ const list=S.sel.filter(n=>!isFrame(n)); if(!list.length){ toast('Select what to repeat first.'); return; } const dp=BD.units.dpiOf(list[0]);
  const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>Repeat in a grid</h3><p class="small">Makes copies in rows and columns, like labels on a sheet.</p>
    <div class="grid2"><label class="f"><span>Rows</span><input type="number" id="rpR" min="1" max="50" value="2"></label><label class="f"><span>Columns</span><input type="number" id="rpC" min="1" max="50" value="2"></label>
    <label class="f"><span>Gap X</span><input type="number" id="rpX" min="0" step="any" value="${+BD.units.fmt(20,dp)}"><em>${S.unit}</em></label><label class="f"><span>Gap Y</span><input type="number" id="rpY" min="0" step="any" value="${+BD.units.fmt(20,dp)}"><em>${S.unit}</em></label></div>
    <button type="button" class="link" id="rpFit">Fill the frame</button><p class="small" id="rpInfo"></p>
    <div class="dlg-actions"><button type="button" class="mini" id="rpNo">Cancel</button><button type="submit" class="btn">Repeat</button></div></form>`);
  const $d=id=>d.querySelector('#'+id), px=v=>BD.units.fromUnit(+v||0,dp);
  const info=()=>{ $d('rpInfo').textContent=((+$d('rpR').value||1)*(+$d('rpC').value||1))+' in total.'; }; d.addEventListener('input',info); info();
  $d('rpFit').onclick=()=>{ const c=BD.tools.fitCount(px($d('rpX').value),px($d('rpY').value)); if(c){ $d('rpR').value=c.rows; $d('rpC').value=c.cols; info(); } else toast('Put it inside a frame first.'); };
  $d('rpNo').onclick=()=>d.close();
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); d.close(); const n=BD.tools.repeat(+$d('rpR').value,+$d('rpC').value,px($d('rpX').value),px($d('rpY').value)); if(n) toast(n+' in the grid. Group them with '+UI.mod+'+G if you like.'); }; };

/* ---------- find and replace ---------- */
UI.findDialog=function(){ const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>Find and replace</h3>
    <label class="f wide"><span>Find</span><input type="text" id="frQ" dir="auto"></label><label class="f wide"><span>Replace</span><input type="text" id="frW" dir="auto"></label>
    <label class="tg"><input type="checkbox" id="frCs"><span>Match capital letters</span></label><p class="small" id="frInfo">Searches the text in every frame.</p>
    <div class="dlg-actions"><button type="button" class="mini" id="frNo">Close</button><button type="button" class="mini" id="frSel">Select matches</button><button type="submit" class="btn">Replace all</button></div></form>`);
  const $d=id=>d.querySelector('#'+id); setTimeout(()=>$d('frQ').focus(),30);
  const info=()=>{ const c=BD.tools.findCount($d('frQ').value,$d('frCs').checked); $d('frInfo').textContent=$d('frQ').value?(c?c+' found.':'Not found.'):'Searches the text in every frame.'; };
  d.addEventListener('input',info); d.addEventListener('change',info); $d('frNo').onclick=()=>d.close();
  $d('frSel').onclick=()=>{ const ns=BD.tools.findNodes($d('frQ').value,$d('frCs').checked); if(ns.length){ d.close(); BD.select(ns); BD.view.fitSel(); } };
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); const c=BD.tools.replaceAll($d('frQ').value,$d('frW').value,$d('frCs').checked); $d('frInfo').textContent=c?'Replaced '+c+'.':'Not found.'; UI.paintProps(); }; };

/* ---------- replace a colour everywhere ---------- */
UI.colorsDialog=function(){ const used=BD.tools.usedColors(); if(!used.length){ toast('No colours to replace yet.'); return; } let from=used[0].c, to=from;
  const d=L.dialog(`<div class="dlg-body"><h3>Replace a colour</h3><p class="small">Pick a colour used in this board, then the new one. Every fill, line, text and background with it changes.</p>
    <span class="lbl">Used in this board</span><div class="sws big">${used.map(u=>`<button type="button" class="sw" data-c="${u.c}" style="--c:${u.c}" title="${u.c} · used ${u.n}×" aria-label="${u.c}" aria-pressed="${u.c===from}"></button>`).join('')}</div>
    <div class="row">${'<span class="small">New colour</span>'}<button type="button" class="swb" id="rcTo" data-pop-owner><i style="--c:${to}"></i><span>${to.toUpperCase()}</span></button></div>
    <p class="small" id="rcInfo"></p><div class="dlg-actions"><button type="button" class="mini" id="rcNo">Close</button><button type="button" class="btn" id="rcGo">Replace</button></div></div>`);
  const $d=id=>d.querySelector('#'+id);
  d.querySelectorAll('.sws .sw').forEach(b=>b.onclick=()=>{ from=b.dataset.c; d.querySelectorAll('.sws .sw').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
  $d('rcTo').onclick=e=>{ const btn=e.currentTarget; const native=document.createElement('input'); native.type='color'; native.value=to; native.oninput=()=>{ to=native.value; btn.querySelector('i').style.setProperty('--c',to); btn.querySelector('span').textContent=to.toUpperCase(); }; native.click(); };
  $d('rcNo').onclick=()=>d.close(); $d('rcGo').onclick=()=>{ const c=BD.tools.replaceColor(from,to); $d('rcInfo').textContent=c?'Changed '+c+' place'+(c===1?'':'s')+'.':'Nothing changed.'; UI.paintProps(); }; };

/* ---------- versions ---------- */
UI.versionsDialog=async function(){ const d=L.dialog(`<div class="dlg-body"><h3>Versions</h3><p class="small">Save the board as it is now, and go back to any saved version later. Kept on this device.</p>
    <form class="inline" id="vForm"><input type="text" id="vName" placeholder="Name this version" maxlength="60" class="b-in" dir="auto"><button type="submit" class="mini solid">Save version</button></form>
    <ul class="vlist" id="vList"></ul><div class="dlg-actions"><button type="button" class="btn" id="vClose">Done</button></div></div>`,'wide');
  const $d=id=>d.querySelector('#'+id);
  const paint=async()=>{ const vs=await BD.tools.versions(); $d('vList').innerHTML=vs.length?vs.map(v=>`<li><span><b dir="auto">${esc(v.name)}</b><small>${new Date(v.at).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span><button type="button" class="mini" data-go="${v.id}">Go back to this</button><button type="button" class="ib" data-del="${v.id}" aria-label="Delete ${esc(v.name)}">${IC.trash}</button></li>`).join(''):'<li class="hint">No versions yet.</li>'; };
  paint(); $d('vClose').onclick=()=>d.close();
  $d('vForm').onsubmit=async e=>{ e.preventDefault(); await BD.tools.saveVersion($d('vName').value.trim()||undefined); $d('vName').value=''; paint(); };
  $d('vList').onclick=async e=>{ const g=e.target.closest('[data-go]'), x=e.target.closest('[data-del]'); if(g){ await BD.tools.restoreVersion(g.dataset.go); d.close(); toast('Back to that version. The board before it was saved as a version too.',5000); } if(x){ await BD.tools.deleteVersion(x.dataset.del); paint(); } }; };

/* ---------- barcode and QR ---------- */
UI.barcodeDialog=function(n){ const edit=n&&kind(n)==='barcode'; let type=edit?n.getAttr('btype')||'ean':'ean';
  const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>${edit?'Change barcode':'Barcode'}</h3><p class="small">Type the product number. A missing check digit is added for you.</p>
    ${seg('bt',type,[['ean','EAN-13 (12–13 digits)'],['upc','UPC-A (11–12 digits)']])}
    <label class="f wide"><span>Number</span><input type="text" id="bcIn" inputmode="numeric" maxlength="14" value="${esc(edit?n.getAttr('code'):'')}"></label><p class="small" id="bcInfo"></p>
    <div class="dlg-actions"><button type="button" class="mini" id="bcNo">Cancel</button><button type="submit" class="btn" id="bcGo">${edit?'Update':'Add barcode'}</button></div></form>`);
  const $d=id=>d.querySelector('#'+id); setTimeout(()=>$d('bcIn').focus(),30);
  const info=()=>{ const v=$d('bcIn').value; if(!v){ $d('bcInfo').textContent=''; $d('bcGo').disabled=true; return; } const r=BD.tools.barcodeDigits(v,type); $d('bcInfo').textContent=r.ok?'Barcode: '+r.code:r.msg; $d('bcGo').disabled=!r.code; };
  segs(d,(k,v)=>{ type=v; info(); }); d.addEventListener('input',info); info(); $d('bcNo').onclick=()=>d.close();
  d.querySelector('form').onsubmit=e=>{ e.preventDefault(); const v=$d('bcIn').value.replace(/\D/g,''); if(!BD.tools.barcodeDigits(v,type).code) return; d.close();
    if(edit){ n.setAttrs({code:v,btype:type}); BD.tools.buildBarcode(n); BD.main.batchDraw(); BD.tr.forceUpdate(); BD.changed(); UI.paintProps(); } else BD.tools.makeBarcode(v,type); }; };
UI.qrDialog=function(n){ const edit=n&&kind(n)==='qr';
  const d=L.dialog(`<form method="dialog" class="dlg-body" action="#"><h3>${edit?'Change QR code':'QR code'}</h3><p class="small">A link (Instagram, WhatsApp, a map) or any text.</p>
    <label class="f wide tall"><span>Link or text</span><textarea id="qrIn" rows="3" dir="auto">${esc(edit?n.getAttr('qrText'):'https://')}</textarea></label>
    <div class="dlg-actions"><button type="button" class="mini" id="qrNo">Cancel</button><button type="submit" class="btn">${edit?'Update':'Add QR code'}</button></div></form>`);
  const $d=id=>d.querySelector('#'+id); setTimeout(()=>{ $d('qrIn').focus(); $d('qrIn').setSelectionRange(999,999); },30); $d('qrNo').onclick=()=>d.close();
  d.querySelector('form').onsubmit=async e=>{ e.preventDefault(); const v=$d('qrIn').value.trim(); if(!v) return; d.close();
    if(edit){ n.setAttr('qrText',v); await BD.tools.buildQR(n); BD.main.batchDraw(); BD.tr.forceUpdate(); BD.changed(); UI.paintProps(); } else await BD.tools.makeQR(v); }; };

/* ---------- shortcuts ---------- */
UI.shortcuts=function(){ const mod=UI.mod; const groups=[['Tools',[['Move / Hand','V / H, or hold Space'],['Frame','F'],['Rectangle · Ellipse · Triangle · Star','R · O · Y · S'],['Line / Arrow','L / Shift+L'],['Pen · Highlighter · Eraser','P · Shift+P · E'],['Text','T'],['Upload','I'],['Find any tool or action',mod+' K or /']]],
  ['Editing',[['Undo / redo',mod+'+Z / '+mod+'+Shift+Z'],['Copy / cut / paste',mod+'+C / X / V'],['Duplicate',mod+'+D or Alt+drag'],['Delete','Delete'],['Select all',mod+'+A'],['Group / ungroup',mod+'+G / '+mod+'+Shift+G'],['Forward / backward',mod+'+] / '+mod+'+['],['To front / back',mod+'+Shift+] / ['],['Lock / hide',mod+'+Shift+L / H'],['Flip','Shift+H / Shift+V'],['Copy / paste style',mod+'+Alt+C / V'],['Nudge','Arrows (Shift = 10)'],['Find and replace',mod+'+F']]],
  ['View',[['Zoom','Pinch, '+mod+'+scroll, '+mod+' + / −'],['Fit all / selection / 100%','Shift+1 / 2 / 0'],['Rulers and guides','Shift+R'],['Measure distances','Hold Alt and point'],['Don’t snap while moving','Hold '+mod],['Straight lines, squares','Hold Shift'],['Edit text / open a group','Enter or double-click'],['Pick inside a group',mod+'+click'],['Export / save',mod+'+E / '+mod+'+S']]]];
  const d=L.dialog(`<div class="dlg-body"><h3>Shortcuts</h3><div class="keys-wrap">${groups.map(([g,rows])=>`<div><span class="lbl">${g}</span><dl class="keys">${rows.map(([a,b])=>`<dt>${esc(a)}</dt><dd><kbd>${esc(b)}</kbd></dd>`).join('')}</dl></div>`).join('')}</div><div class="dlg-actions"><button type="button" class="btn" id="kOk">Done</button></div></div>`,'wide'); d.querySelector('#kOk').onclick=()=>d.close(); };

/* ---------- templates (built from the brand kit; wording only from the approved lists) ---------- */
BD.buildTemplate=async function(id,select){
  const B=BD.B||{}, ph=B.phrases||{}, c=BD.brandColors(), D=BD.displayFont(), Bf=BD.bodyFont();
  const head=(ph.headlines||[])[0]||'Your headline', small=(ph.small||[])[0]||'A short line', btn=(ph.buttons||[])[0]||'Learn more', rest=(ph.restock||[])[0]||head;
  await Promise.all([BD.ensureFont(D,''),BD.ensureFont(Bf,'800')]);
  const fs=frames(); let x0=0, y0=0; if(fs.length){ const r=unionRect(fs); x0=Math.round(r.x+r.width+160); y0=Math.round(r.y); }
  const made=[];
  const asset=async(aid,f,w,cx,cy,o)=>{ const a=L.brandAssets().find(x=>x.id===aid); if(!a) return null; const im=await BD.getImg('brand:'+aid); if(!im) return null; const h=Math.round(im.h*w/im.w); const n=BD.make.image('brand:'+aid,w,h,'asset'); n.setAttrs(Object.assign({x:Math.round(cx-w/2),y:Math.round(cy-h/2),label:a.label},o||{})); f.add(n); BD.applyFx(n); return n; };
  const text=(f,t,o)=>{ const n=BD.make.text(t,Object.assign({fontFamily:D},o)); f.add(n); if(o.cx!=null){ const w=n.width(); n.x(Math.round(o.cx-w/2)); } return n; };
  const pill=(f,t,cx,y,w,bg,fg)=>{ const h=Math.round(w*.2); const r=new Konva.Rect({id:U.uid(),name:'obj',kind:'rect',x:Math.round(cx-w/2),y,width:w,height:h,cornerRadius:h/2,fill:bg,label:'Button'}); f.add(r);
    const n=BD.make.text(t,{fontFamily:Bf,fontStyle:'800',fontSize:Math.round(h*.42),fill:fg,width:w,autoW:false,x:Math.round(cx-w/2),align:'center'}); n.y(Math.round(y+(h-n.height())/2)); f.add(n); return r; };
  if(id==='headline'){ const f=BD.makeFrame(x0,y0,1080,1920,{label:'Headline story',fill:c.cream}); made.push(f);
    f.add(new Konva.Ellipse({id:U.uid(),name:'obj',kind:'ellipse',x:540,y:1060,radiusX:430,radiusY:430,fill:c.blob,label:'Soft circle'}));
    await asset('cans-pair-shadow',f,760,540,1080);
    text(f,head,{fontSize:170,fill:c.ink,y:250,cx:540}); text(f,small,{fontFamily:Bf,fontStyle:'800',fontSize:56,fill:c.brown,y:470,cx:540});
    pill(f,btn,540,1560,560,c.ink,c.paper); await asset('logo',f,300,540,1800); }
  if(id==='product'){ const f=BD.makeFrame(x0,y0,1080,1350,{label:'Product post',fill:c.ink}); made.push(f); const bg=frameBg(f); bg.setAttrs({fillType:'radial',gradA:'#3a2a1f',gradB:c.ink}); BD.applyFill(bg);
    await asset('cans-pair-shadow',f,700,540,760); text(f,head,{fontSize:140,fill:c.accent,y:110,cx:540}); text(f,small,{fontFamily:Bf,fontStyle:'800',fontSize:48,fill:c.paper,y:1150,cx:540});
    const lg=await asset('logo',f,220,540,1270); if(lg){ lg.setAttr('fx',{invert:1}); BD.applyFx(lg); } }
  if(id==='square'){ const f=BD.makeFrame(x0,y0,1080,1080,{label:'Square promo',fill:c.accent}); made.push(f);
    text(f,rest,{fontSize:150,fill:c.ink,y:90,cx:540}); await asset('cans-pair',f,560,540,600);
    const fl=B.flavours||[]; fl.slice(0,2).forEach((v,i)=>pill(f,v.name,fl.length>1?(i?760:320):540,900,360,v.bg,v.fg)); }
  if(id==='carousel'){ for(let i=0;i<3;i++){ const f=BD.makeFrame(x0+i*1080,y0,1080,1350,{label:'Slide '+(i+1),fill:c.cream}); made.push(f); }
    const [a,b,d]=made; text(a,head,{fontSize:160,fill:c.ink,y:480,cx:540}); text(a,small,{fontFamily:Bf,fontStyle:'800',fontSize:52,fill:c.brown,y:720,cx:540});
    const ph1=new Konva.Rect({id:U.uid(),name:'obj',kind:'rect',x:90,y:90,width:900,height:1170,cornerRadius:40,fill:c.blob,label:'Photo spot (drop a photo, then Fill the frame)'}); b.add(ph1);
    text(b,'+',{fontFamily:Bf,fontSize:160,fill:c.brown,y:560,cx:540});
    await asset('cans-pair-shadow',d,600,540,560); pill(d,btn,540,1000,560,c.ink,c.paper); await asset('logo',d,240,540,1230); }
  if(id==='menu'){ const f=BD.makeFrame(x0,y0,1920,1080,{label:'Landscape banner',fill:c.cream}); made.push(f);
    f.add(new Konva.Rect({id:U.uid(),name:'obj',kind:'rect',x:1060,y:0,width:860,height:1080,fill:c.blob,label:'Panel'}));
    await asset('cans-pair-shadow',f,700,1490,560); text(f,head,{fontSize:180,fill:c.ink,y:300,cx:520}); text(f,small,{fontFamily:Bf,fontStyle:'800',fontSize:60,fill:c.brown,y:560,cx:520}); pill(f,btn,520,720,560,c.ink,c.paper); }
  made.forEach(f=>frameBg(f).moveToBottom());
  BD.paintUI(); if(select){ BD.select(made); BD.view.fitSel(); BD.changed(); } UI.paintLayersSoon(); UI.drawMini();
  return made;
};

/* ---------- start ---------- */
const q=new URLSearchParams(location.search);
if(q.get('print')){ const p=BD.PRINT.find(x=>x.id===q.get('print')); if(p){ BD.startPrint=p; } }
if(!(BD.cfg&&BD.cfg.manualBoot)) UI.boot();   // a host page (Create) boots it after adding its own parts
})();
