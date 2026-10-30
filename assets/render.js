/* Studio: Save pictures from Saved (1.18.0). In Saved, select several designs → Save pictures saves each one's picture at
   full quality, as if you opened it and tapped Save: every design is opened in a hidden frame of its own tool page
   (tools/<tool>.html?design=<id>&render=1) and drawn there by the same code as Save (Studio.renderer in tool()), so the pixels
   are the same. One share sheet on a phone, one ZIP on a computer (assets/batch.js), with a running count and Cancel.
   StudioRender.design(d,stop) → {files:[Blob…], K} · StudioRender.saveDesigns(designs,{toast,done}) */
(function(){
  const L=()=>window.Studio.lab;
  const MAX=20;   // designs in one go: a phone keeps every picture in memory until the share sheet
  const STOP=new Error('stopped');
  /* a hidden frame of the design's tool page, resolved once its renderer is ready */
  function frame(d,stop){ return new Promise((res,rej)=>{
    const f=document.createElement('iframe'); f.className='render-frame'; f.setAttribute('aria-hidden','true'); f.tabIndex=-1; f.title='';
    f.src=L().toolPage(d.tool)+(d.draft?'?draft=':'?design=')+encodeURIComponent(d.id)+'&render=1';   // an unfinished story (1.23.0) or a saved design
    document.body.appendChild(f); const t0=Date.now();
    const tick=()=>{ if(stop.now){ f.remove(); return rej(STOP); }
      let r=null; try{ r=f.contentWindow&&f.contentWindow.Studio&&f.contentWindow.Studio.renderer; }catch(_){}
      if(r) return res({f,r});
      if(Date.now()-t0>30000){ f.remove(); return rej(new Error('timeout')); }
      setTimeout(tick,120); };
    tick(); }); }
  /* every page of one design: [{blob,K}…]; max = the size the batch has stepped down to (never back up within one batch) */
  async function design(d,stop,max,onPage){
    let got; try{ got=await frame(d,stop); }catch(err){ if(err===STOP) throw err; return {error:'could not be opened'}; }
    const {f,r}=got;
    try{
      if(!r.ok) return {error:'could not be opened'};
      if(r.missing&&r.missing.length) return {error:d.draft?'has no photo yet':'has a photo missing'};
      const out=[];
      for(let pg=0;pg<r.pages;pg++){ if(stop.now) throw STOP; if(onPage) onPage(pg,r.pages);
        const x=await r.page(pg,max); if(!x) return {error:'memory',out}; out.push(x); max=x.K; }
      return {out,W:r.W,H:r.H};
    } finally { f.remove(); }
  }
  const slug=s=>String(s||'').trim().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,60);
  const z2=n=>String(n).padStart(2,'0');
  function stampName(at){ const d=at, z=z2; return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes()); }
  const plural=(n,w)=>n+' '+w+(n===1?'':'s');

  async function saveDesigns(list,ui){
    const {dialog,shareFiles,celebrate,haptic,ROOT}=L();
    const loadScript=src=>new Promise((ok,no)=>{ const x=document.createElement('script'); x.src=src; x.onload=ok; x.onerror=no; document.head.appendChild(x); });
    if(list.length>MAX){ ui.toast('Pick up to '+MAX+' designs at a time.'); return; }
    const tpl=list.filter(d=>d.kind==='template'), todo=list.filter(d=>d.kind!=='template');
    if(!todo.length){ ui.toast(tpl.length===1?'That is a template: open it to make a design, then save its picture.':'Those are templates: open one to make a design, then save its picture.'); return; }
    const touch=matchMedia('(pointer:coarse)').matches, what=L().devWord();
    const dl=dialog(`<div class="dlg-body bs-dlg"><h3 id="bsH">Saving ${plural(todo.length,'picture')}</h3>
      <div class="progress" id="bsProg"><div class="progress-bar" role="progressbar" aria-label="Saving" aria-valuemin="0" aria-valuemax="100" id="bsRole"><i id="bsBar"></i></div><span id="bsTxt" dir="auto">Getting ready…</span></div>
      <p class="small" id="bsNote" dir="auto" hidden></p>
      <div class="dlg-actions"><button type="button" class="mini" id="bsCancel">Cancel</button><button type="button" class="btn" id="bsGo" hidden></button></div></div>`,'bs');
    dl.tabIndex=-1; dl.focus();
    const $=id=>dl.querySelector('#'+id), stop={now:false};
    const bar=(p,t)=>{ $('bsBar').style.width=Math.round(p*100)+'%'; $('bsRole').setAttribute('aria-valuenow',String(Math.round(p*100))); if(t) $('bsTxt').textContent=t; };
    let busy=true;
    const halt=()=>{ if(!busy) return; stop.now=true; $('bsCancel').disabled=true; $('bsTxt').textContent='Stopping…'; };
    $('bsCancel').onclick=()=>{ if(busy) halt(); else dl.close(); };
    dl.addEventListener('cancel',e=>{ if(busy){ e.preventDefault(); halt(); } });
    dl.addEventListener('close',()=>{ if(busy) stop.now=true; });
    const files=[], names=new Set(), skipped=[]; let used=0, W=0, H=0, at=new Date();
    const uniq=n=>{ let x=n, i=2; while(names.has(x.toLowerCase())) x=n+'-'+i++; names.add(x.toLowerCase()); return x; };
    try{
      for(let i=0;i<todo.length;i++){
        const d=todo[i], tag='Saving '+(i+1)+' of '+todo.length+'…';
        if(d.skip){ skipped.push('“'+(d.label||d.name)+'” '+d.skip); continue; }
        bar(i/todo.length,tag);
        const res=await design(d,stop,used||0,(pg,n)=>bar((i+pg/n)/todo.length,n>1?tag+' ('+(pg+1)+' of '+n+')':tag));
        if(res.error==='memory'){ busy=false; bar(0,''); $('bsProg').hidden=true; $('bsH').textContent='Not saved';
          $('bsNote').hidden=false; $('bsNote').textContent='Your '+what+' could not make the image. Close other apps or tabs and try again.'; $('bsCancel').textContent='Close'; $('bsCancel').disabled=false; return; }
        if(res.error){ skipped.push('“'+(d.label||d.name)+'” '+res.error); continue; }
        W=res.W; H=res.H; const base=uniq(slug(d.name)||'design');
        res.out.forEach((x,pg)=>{ used=used?Math.min(used,x.K):x.K;
          files.push(new File([x.blob],(res.out.length>1?base+'-'+z2(pg+1):base)+'.png',{type:'image/png'})); });
      }
    }catch(err){ if(err===STOP){ busy=false; dl.close(); ui.toast('Stopped. Nothing was saved.'); return; }
      busy=false; $('bsProg').hidden=true; $('bsH').textContent='Not saved'; $('bsNote').hidden=false; $('bsNote').textContent='Something went wrong while making the pictures. Try again.'; $('bsCancel').textContent='Close'; $('bsCancel').disabled=false; return; }
    if(stop.now){ busy=false; dl.close(); ui.toast('Stopped. Nothing was saved.'); return; }
    busy=false; $('bsCancel').disabled=false;
    const small=used&&used<2?' This '+what+' was low on memory, so they are a little smaller ('+Math.round(W*used)+'×'+Math.round(H*used)+'). Close other tabs for full size.':'';
    const left=[tpl.length?plural(tpl.length,'template')+' skipped (templates have no picture of their own).':'',skipped.length?'Not saved: '+skipped.join(', ')+'.':''].filter(Boolean).join(' ');
    const n=files.length, pics=plural(n,'picture');
    const finish=(title,txt)=>{ $('bsProg').hidden=true; $('bsH').textContent=title; $('bsNote').hidden=false; $('bsNote').textContent=[txt+small,left].filter(Boolean).join(' ');
      $('bsGo').hidden=true; $('bsCancel').hidden=false; $('bsCancel').textContent='Done'; $('bsCancel').className='btn'; celebrate(); if(ui.done) ui.done(n); };
    if(!n){ $('bsProg').hidden=true; $('bsH').textContent='Nothing saved'; $('bsNote').hidden=false; $('bsNote').textContent=left; $('bsCancel').textContent='Close'; return; }
    bar(1,'Done');
    /* a phone: one share sheet with every picture; it needs a fresh tap if the drawing took too long, so ask for one then */
    if(touch&&navigator.canShare&&navigator.canShare({files})){
      const share=async()=>{ const r=await shareFiles(files);
        if(r==='shared'){ finish('Saved!','Choose “'+(n===1?'Save Image':'Save '+n+' Images')+'” if you haven’t yet. Every picture is full quality.'); return true; }
        $('bsProg').hidden=true; $('bsH').textContent='Ready!'; $('bsNote').hidden=false;
        $('bsNote').textContent=(r==='cancelled'?'Not saved yet. ':'')+'Tap Save to Photos to put your '+pics+' in your photos.'+small;
        $('bsGo').hidden=false; $('bsGo').textContent='Save to Photos'; $('bsCancel').textContent='Close'; return false; };
      $('bsGo').onclick=()=>{ haptic('tick'); share(); };
      await share(); return;
    }
    /* a computer: several pictures come as one ZIP (browsers stop a page that downloads many files at once) */
    const brand=(L().brand()||{}).id||'studio', down=(blob,name)=>{ const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); },4000); };
    if(n>1){ let zip=null; try{ bar(1,'Packing '+pics+' into one ZIP…'); if(!window.StudioBatch) await loadScript(ROOT+'assets/batch.js'); zip=await window.StudioBatch.zip(files,at); }catch(_){ zip=null; }
      if(zip){ const name=brand+'-pictures-'+stampName(at)+'.zip'; down(zip,name); finish('Saved!','Your '+pics+' are in your downloads in one ZIP ('+name+').'); return; } }
    for(const f of files){ down(f,f.name); await new Promise(r=>setTimeout(r,250)); }
    finish('Saved!',n>1?'Your '+pics+' are in your downloads.':'Your picture is in your downloads.');
  }
  window.StudioRender={design,saveDesigns,MAX};
})();
