/* Studio Ideas (brand-agnostic, behind the "plan" preview flag). Lazy-loaded; window.StudioIdeas.init(ctx) -> {show(), refresh(), capture({mode})}.
   A home for every marketing idea: an Inbox (quick captures, sorted later) and a Board (Idea, Planned, In progress, Posted) tagged Reel / Post / Story / Giveaway.
   Capture by typing, a link, a picture or screenshot, or a voice note (MediaRecorder, 24 kbit/s, 2 minutes max, stored as audio and played by the whole team, never transcribed).
   An idea can link to a saved design and to a calendar slot. Rows live in the cloud (C.ideas / C.saveIdea / C.updateIdea / C.deleteIdea). */
(function(){
'use strict';
const TYPES=[['reel','Reel'],['post','Post'],['story','Story'],['giveaway','Giveaway']];
const TYPES_ALL=TYPES.concat([['other','Other']]);
const STAGES=[['idea','Idea'],['planned','Planned'],['progress','In progress'],['posted','Posted']];
const STAGES_ALL=[['inbox','Inbox']].concat(STAGES);
const MAX_SECS=120, WARN_SECS=105, MAX_EDGE=1600;
const TLABEL=Object.fromEntries(TYPES_ALL), SLABEL=Object.fromEntries(STAGES_ALL);
const TIMES_AMPM=t=>{ const m=/^(\d{1,2}):(\d{2})/.exec(String(t||'')); if(!m) return ''; const h=+m[1]; return h>=12?((h%12)||12)+':'+m[2]+' pm':h+':'+m[2]+' am'; };
const pad=n=>(n<10?'0':'')+n;
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||'')); return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(); };
const nrm=s=>window.Studio&&Studio.normText?Studio.normText(s):String(s==null?'':s).toLowerCase().trim();
const mmss=s=>{ s=Math.max(0,Math.round(+s||0)); return Math.floor(s/60)+':'+pad(s%60); };
const firstLine=s=>String(s||'').split(/\r?\n/).find(l=>l.trim())||'';
const URL_RE=/https?:\/\/[^\s<>"]+/i;
const hrefOf=u=>{ u=String(u||'').trim(); return /^https?:\/\//i.test(u)?u:(u?'https://'+u:''); };
const domain=u=>{ try{ return new URL(hrefOf(u)).hostname.replace(/^www\./,''); }catch(_){ return String(u||'').slice(0,40); } };
const ago=t=>{ const s=(Date.now()-new Date(t).getTime())/1000; if(!(s>=0)||s<60) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; if(s<86400*7) return Math.round(s/86400)+' d ago'; return new Date(t).toLocaleDateString('en',{day:'numeric',month:'short'}); };
const SVG=(d,w)=>'<svg viewBox="0 0 24 24" width="'+(w||22)+'" height="'+(w||22)+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const IC={
  mic:SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>'),
  link:SVG('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  image:SVG('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3L16 12l4 4"/>'),
  play:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  stop:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  bulb:SVG('<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',24),
  cal:SVG('<rect x="3" y="4.5" width="17" height="16.5" rx="2.5"/><path d="M3 10h17"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>',16),
  design:SVG('<rect x="5" y="3" width="14" height="18" rx="2.5"/>',16),
  x:SVG('<path d="M6 6l12 12M18 6L6 18"/>',18)
};

function make(o){
  const root=o.root, esc=o.esc, ic=k=>(o.icons&&o.icons[k])||'', hap=k=>{ try{ o.haptic&&o.haptic(k); }catch(_){} };
  const rd=k=>{ try{ return o.store?o.store(k):null; }catch(_){ return null; } }, wr=(k,v)=>{ try{ o.store&&o.store(k,v); }catch(_){} };
  const wide=()=>matchMedia('(min-width:821px)').matches;
  let C=null, items=[], designs=[], cal={}, urls={}, state='loading', note='', run=0, slowT=0, built=false;
  let tab=rd('studio:ideasTab')==='board'?'board':'inbox', stage='idea', typeF='', q='', searchOpen=false, wasWide=wide();
  const authorName=()=>{ try{ return (o.who&&o.who.author&&o.who.author())||null; }catch(_){ return null; } };
  const designOf=id=>designs.find(d=>d.id===id);
  const againBtn='<button type="button" class="btn slim" data-reload>Try again</button>';
  const noteBox=(icn,title,text,btn)=>`<div class="sv-note"><span class="sn-ic" aria-hidden="true">${icn}</span><div class="sn-txt"><b>${title}</b><p>${text}</p></div>${btn||''}</div>`;

  /* ---------- load ---------- */
  async function ensure(){ if(!C) C=await o.cloud(); return C; }
  async function load(){
    const my=++run; clearTimeout(slowT);
    if(state!=='ok'){ state='loading'; drawBody(); }
    slowT=setTimeout(()=>{ if(my===run&&state!=='ok'){ state='slow'; drawBody(); } },8000);
    try{
      if(navigator.onLine===false) throw Object.assign(new Error('No connection. Check your internet and try again.'),{offline:true});
      await ensure(); if(my!==run) return;
      if(!(await o.member())){ state='out'; drawTop(); drawBody(); return; }
      const now=new Date(), from=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()-90)), to=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()+90));
      const [list,dl,cl]=await Promise.all([C.ideas(o.brand),Promise.resolve(o.designs?o.designs():[]).catch(()=>designs),C.calendar?C.calendar(o.brand,{from:from,to:to}).catch(()=>[]):[]]); if(my!==run) return;
      designs=dl||[]; cal={}; (cl||[]).forEach(x=>{ cal[x.id]=x; });
      const live=new Set(list.map(x=>x.id)), keepP=items.filter(x=>x._pending&&!live.has(x.id));
      items=keepP.concat(list); state='ok'; drawTop(); drawBody(); thumbsFor(items);
    }catch(err){ if(my!==run) return; const net=o.netDown(err), slow=net&&/slow/i.test(err.message||'');
      if(state==='ok'){ o.toast(net?'You’re offline. These are your ideas from before.':'Could not refresh the ideas: '+(err.message||err)); return; }
      state=net?(slow?'slow':'offline'):'error'; note=err.message||String(err); drawBody(); }
    finally{ if(my===run) clearTimeout(slowT); }
  }
  async function thumbsFor(list){
    const ps=new Set(); list.forEach(x=>{ if(x.image_path) ps.add(x.image_path); const g=designOf(x.design_id); if(g&&g.thumb_path) ps.add(g.thumb_path); });
    const need=[...ps].filter(p=>p&&!urls[p]); if(need.length){ try{ Object.assign(urls,await o.thumbs(need)); }catch(_){} } fillThumbs(document);
  }
  function fillThumbs(scope){ (scope||root).querySelectorAll('img[data-path]').forEach(i=>{ const u=urls[i.dataset.path]; if(u&&i.getAttribute('src')!==u) i.src=u; }); }

  /* ---------- voice playback (one at a time, anywhere) ---------- */
  let aud=null, playingPath=null;
  const playerHtml=(path,secs)=>`<div class="id-voice" data-path="${esc(path)}" data-secs="${+secs||0}"><button type="button" class="id-play" data-play aria-label="Play voice note">${IC.play}</button><span class="id-vbar" aria-hidden="true"><i></i></span><bdi class="id-vt">${mmss(secs)}</bdi></div>`;
  function paintAudio(){
    document.querySelectorAll('.id-voice').forEach(el=>{ const on=aud&&el.dataset.path===playingPath, tot=+el.dataset.secs||(aud&&aud.duration)||0, playing=!!on&&!aud.paused;
      const dur=on&&isFinite(aud.duration)&&aud.duration>0?aud.duration:tot, p=on&&dur?Math.min(1,aud.currentTime/dur):0;
      el.querySelector('.id-vbar i').style.width=(p*100)+'%'; el.classList.toggle('on',!!on&&(playing||aud.currentTime>0));
      const b=el.querySelector('.id-play'); b.innerHTML=playing?IC.pause:IC.play; b.setAttribute('aria-label',playing?'Pause voice note':'Play voice note');
      el.querySelector('.id-vt').textContent=on&&aud.currentTime>0&&!aud.ended?mmss(aud.currentTime):mmss(tot); });
  }
  function stopAudio(){ if(aud){ try{ aud.pause(); }catch(_){} aud=null; playingPath=null; paintAudio(); } }
  async function togglePlay(path){
    if(aud&&playingPath===path){ if(aud.paused) aud.play().catch(()=>{}); else aud.pause(); return; }
    stopAudio(); let u=urls[path];
    if(!u){ try{ const m=await o.thumbs([path]); u=m[path]; if(u) urls[path]=u; }catch(_){} }
    if(!u){ o.toast('Could not load the voice note.'); return; }
    const a=new Audio(u); aud=a; playingPath=path; a.preload='auto';
    ['timeupdate','play','pause','ended','loadedmetadata'].forEach(ev=>a.addEventListener(ev,()=>{ if(aud===a){ if(ev==='ended'){ a.currentTime=0; } paintAudio(); } }));
    a.addEventListener('error',()=>{ if(aud===a){ o.toast('That voice note will not play.'); stopAudio(); } });
    a.play().catch(()=>{ if(aud===a) o.toast('Could not play the voice note.'); }); paintAudio();
  }
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-play]'); if(!b) return; const v=b.closest('.id-voice'); if(v&&(root.contains(v)||v.closest('.id-dlg'))){ e.preventDefault(); e.stopPropagation(); togglePlay(v.dataset.path); } });

  /* ---------- the voice recorder: one live panel (level meter, mm:ss countdown, Stop / Cancel), used by capture and the idea sheet ---------- */
  function recordInto(host,done){
    let stream=null, mr=null, ac=null, raf=0, tick=0, chunks=[], t0=0, finished=false, stopping=false;
    const mime=(()=>{ try{ return ['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||''; }catch(_){ return ''; } })();
    const fail=msg=>{ cleanup(); host.innerHTML=''; host.hidden=true; done(null,msg); };
    function cleanup(){ cancelAnimationFrame(raf); clearInterval(tick); try{ stream&&stream.getTracks().forEach(t=>t.stop()); }catch(_){} try{ ac&&ac.close(); }catch(_){} stream=null; ac=null; }
    const ui=()=>{ host.hidden=false; host.innerHTML=`<div class="id-rec" role="group" aria-label="Recording a voice note"><span class="id-dot" aria-hidden="true"></span><div class="id-rtxt"><b class="id-rtime" aria-live="off">0:00</b><small>of <bdi>${mmss(MAX_SECS)}</bdi></small></div><span class="id-meter" aria-hidden="true"><i></i></span>
      <button type="button" class="id-rstop" data-rstop aria-label="Stop recording">${IC.stop}<span>Stop</span></button><button type="button" class="id-rcancel" data-rcancel>Cancel</button></div><p class="id-rwarn small" hidden>Almost at the limit.</p>`;
      host.querySelector('[data-rstop]').onclick=()=>finish(true); host.querySelector('[data-rcancel]').onclick=()=>finish(false); };
    function finish(keep){ if(finished) return; if(!mr||mr.state==='inactive'){ finished=true; cleanup(); host.innerHTML=''; host.hidden=true; if(!keep) done(null); return; }
      stopping=true; keep_=keep; try{ mr.stop(); }catch(_){ finished=true; cleanup(); host.hidden=true; done(null,'Recording stopped.'); } }
    let keep_=true;
    (async()=>{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder) return fail('Voice notes are not supported on this device.');
      try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }catch(err){ return fail(/denied|permission|notallowed/i.test((err&&(err.name+' '+err.message))||'')?'The microphone is blocked. Allow it in your browser settings to record.':'Could not use the microphone.'); }
      if(finished) return cleanup();
      try{ mr=new MediaRecorder(stream,Object.assign({audioBitsPerSecond:24000},mime?{mimeType:mime}:{})); }catch(_){ try{ mr=new MediaRecorder(stream); }catch(__){ return fail('Voice notes are not supported on this device.'); } }
      mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
      mr.onstop=()=>{ if(finished) return; finished=true; const secs=Math.min(MAX_SECS,Math.max(1,Math.round((Date.now()-t0)/1000))); const type=mr.mimeType||mime||'audio/webm'; cleanup(); host.innerHTML=''; host.hidden=true;
        if(keep_&&chunks.length) done({blob:new Blob(chunks,{type:type}),secs:secs}); else done(null,keep_?'Nothing was recorded.':''); };
      mr.onerror=()=>{ if(!finished){ finished=true; cleanup(); host.hidden=true; done(null,'Recording failed. Try again.'); } };
      ui();
      try{ const AC=window.AudioContext||window.webkitAudioContext; ac=new AC(); const src=ac.createMediaStreamSource(stream), an=ac.createAnalyser(); an.fftSize=512; src.connect(an); const buf=new Uint8Array(an.fftSize), bar=host.querySelector('.id-meter i');
        const loop=()=>{ an.getByteTimeDomainData(buf); let s=0; for(let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; s+=v*v; } const lv=Math.min(1,Math.sqrt(s/buf.length)*4); if(bar) bar.style.width=(8+lv*92)+'%'; raf=requestAnimationFrame(loop); }; loop(); }catch(_){}
      t0=Date.now(); mr.start(250);
      const tEl=host.querySelector('.id-rtime'), warn=host.querySelector('.id-rwarn');
      tick=setInterval(()=>{ const s=(Date.now()-t0)/1000; if(tEl) tEl.textContent=mmss(s); if(s>=WARN_SECS&&warn&&warn.hidden){ warn.hidden=false; warn.textContent='Almost at the limit: it stops at '+mmss(MAX_SECS)+'.'; host.classList.add('warn'); } if(s>=MAX_SECS) finish(true); },250);
    })();
    return {cancel:()=>{ if(!finished) finish(false); }, active:()=>!finished};
  }

  /* ---------- pictures: downscale to 1600 px, JPEG 0.82 ---------- */
  async function shrink(file){
    try{ const bmp=await createImageBitmap(file); const k=Math.min(1,MAX_EDGE/Math.max(bmp.width,bmp.height)), w=Math.max(1,Math.round(bmp.width*k)), h=Math.max(1,Math.round(bmp.height*k));
      const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,w,h); g.drawImage(bmp,0,0,w,h); try{ bmp.close(); }catch(_){}
      const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.82)); return b||file;
    }catch(_){ return file; }
  }
  const imageFrom=e=>{ const fs=(e.clipboardData&&e.clipboardData.files)||[]; for(const f of fs) if(/^image\//.test(f.type)) return f; const its=(e.clipboardData&&e.clipboardData.items)||[]; for(const it of its) if(it.kind==='file'&&/^image\//.test(it.type)) return it.getAsFile(); return null; };

  /* ---------- drawing ---------- */
  const pending=(it)=>!!it._pending;
  const titleOf=it=>it.title||(it.audio_path?'Voice note':it.image_path?'Picture':it.link?domain(it.link):'Untitled');
  const matches=it=>{ const n=nrm(q); return !n||nrm([it.title,it.note,it.link].join(' ')).includes(n); };
  const inbox=()=>items.filter(x=>x.stage==='inbox');
  const boardItems=()=>items.filter(x=>x.stage!=='inbox'&&(!typeF||x.type===typeF));
  const pill=t=>`<span class="id-pill t-${esc(t||'other')}"><i aria-hidden="true"></i>${esc(TLABEL[t]||'Other')}</span>`;
  const calChip=it=>{ if(!it.calendar_id) return ''; const c=cal[it.calendar_id]; const txt=c?parse(c.day).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})+(c.at?' · '+TIMES_AMPM(c.at):''):'On the calendar';
    return `<span class="id-chip id-cal" title="On the calendar">${IC.cal}<bdi>${esc(txt)}</bdi></span>`; };
  const designMini=it=>{ if(!it.design_id) return ''; const g=designOf(it.design_id); return `<span class="id-chip id-des" title="${esc(g?g.name:'A design')}">${g&&g.thumb_path?`<img alt="" decoding="async" data-path="${esc(g.thumb_path)}"${urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}>`:IC.design}<span dir="auto">${esc(g?g.name:'A design')}</span></span>`; };
  const linkChip=it=>it.link?`<a class="id-chip id-lnk" href="${esc(hrefOf(it.link))}" target="_blank" rel="noopener noreferrer" aria-label="Open the link ${esc(domain(it.link))}">${IC.link.replace('width="22" height="22"','width="16" height="16"')}<bdi>${esc(domain(it.link))}</bdi></a>`:'';
  const byLine=it=>`<span class="id-by">${it.author?`<b class="id-av" aria-hidden="true">${esc(String(it.author).trim().charAt(0).toUpperCase())}</b><span class="sr-only">${esc(it.author)}, </span>`:''}<bdi>${pending(it)?'Saving…':esc(ago(it.created_at))}</bdi></span>`;
  function card(it,kind){
    const t=titleOf(it), snip=it.note?firstLine(it.note).slice(0,140):'', idx=STAGES.findIndex(s=>s[0]===it.stage), nxt=STAGES[idx+1];
    const img=it.image_path?`<img class="id-thumb" alt="" decoding="async" data-path="${esc(it.image_path)}"${urls[it.image_path]?` src="${urls[it.image_path]}"`:''}>`:'';
    const meta=[it.audio_path?playerHtml(it.audio_path,it.audio_secs):'',linkChip(it),designMini(it),calChip(it)].filter(Boolean).join('');
    return `<article class="id-card${pending(it)?' pend':''}" data-id="${esc(it.id)}"${kind==='board'&&!pending(it)?' draggable="true"':''}>
      <button type="button" class="id-main" data-open="${esc(it.id)}"${pending(it)?' disabled':''}>
        <span class="id-top2">${kind==='board'?pill(it.type):''}${byLine(it)}</span>
        <span class="id-body2">${img}<span class="id-txt"><b class="id-title" dir="auto">${esc(t)}</b>${snip?`<span class="id-snip" dir="auto">${esc(snip)}</span>`:''}</span></span></button>
      ${meta?`<div class="id-meta">${meta}</div>`:''}
      ${pending(it)?'':kind==='inbox'?`<div class="id-sort" role="group" aria-label="Sort this idea">${TYPES.map(([k,l])=>`<button type="button" class="id-sortbtn" data-sort="${esc(it.id)}" data-t="${k}">${l}</button>`).join('')}</div>`
        :`<div class="id-foot">${nxt?`<button type="button" class="id-next" data-next="${esc(it.id)}">Move to ${esc(nxt[1])}<span aria-hidden="true">›</span></button>`:'<span></span>'}</div>`}
      ${pending(it)?'':`<button type="button" class="id-more" data-more="${esc(it.id)}" aria-label="Options for ${esc(t)}">${ic('more')}</button>`}</article>`;
  }
  const newBtn=`<button type="button" class="btn slim" data-idea-new>${ic('plus')}<span>New idea</span></button>`;
  function inboxHtml(){
    const list=inbox().filter(matches);
    if(!list.length) return q?`<div class="id-empty"><p>No inbox ideas match “<bdi>${esc(q)}</bdi>”.</p></div>`
      :`<div class="id-empty"><span class="id-bulb" aria-hidden="true">${IC.bulb}</span><b>Inbox is clear</b><p>New ideas land here first. Sort them onto the board later.</p>${newBtn}</div>`;
    return `<div class="id-list">${list.map(x=>card(x,'inbox')).join('')}</div>`;
  }
  function boardHtml(){
    const all=boardItems().filter(matches), by=k=>all.filter(x=>x.stage===k);
    const filt=`<div class="chips id-types" role="group" aria-label="Filter by type"><button type="button" class="chip" data-type="" aria-pressed="${!typeF}">All</button>${TYPES.map(([k,l])=>`<button type="button" class="chip" data-type="${k}" aria-pressed="${typeF===k}">${l}</button>`).join('')}</div>`;
    if(!items.some(x=>x.stage!=='inbox')) return filt+`<div class="id-empty"><span class="id-bulb" aria-hidden="true">${IC.bulb}</span><b>Your board is empty</b><p>Sort an idea from the inbox to start the board.</p>${newBtn}</div>`;
    if(wide()) return filt+`<div class="id-cols">${STAGES.map(([k,l])=>`<section class="id-col" data-stage="${k}" aria-label="${l}"><header><b>${l}</b><em><bdi>${by(k).length}</bdi></em></header><div class="id-list">${by(k).map(x=>card(x,'board')).join('')||'<p class="id-none">Nothing here</p>'}</div></section>`).join('')}</div>`;
    const stagesRow=`<div class="id-stages" role="group" aria-label="Stage">${STAGES.map(([k,l])=>`<button type="button" class="chip" data-stage-tab="${k}" aria-pressed="${stage===k}">${l}<i><bdi>${by(k).length}</bdi></i></button>`).join('')}</div>`;
    const list=by(stage);
    return filt+stagesRow+(list.length?`<div class="id-list" data-stage="${stage}">${list.map(x=>card(x,'board')).join('')}</div>`:`<div class="id-empty slim"><p>${q||typeF?'Nothing matches here.':'Nothing in “'+esc(SLABEL[stage])+'” yet.'}</p></div>`);
  }
  function drawTop(){
    const n=inbox().length, el=root.querySelector('.id-top'); if(!el) return;
    el.innerHTML=`<div class="id-head"><button type="button" class="sp-back" data-back aria-label="Back to home">${ic('back')}</button><div class="sp-title"><h1 id="idH" tabindex="-1">Ideas</h1></div><button type="button" class="mini solid id-new" data-idea-new>${ic('plus')}<span>New</span></button></div>${o.tabs||''}
      <div class="id-bar"><div class="id-seg" role="group" aria-label="View"><button type="button" class="chip" data-tab="inbox" aria-pressed="${tab==='inbox'}">Inbox${n?`<i><bdi>${n}</bdi></i>`:''}</button><button type="button" class="chip" data-tab="board" aria-pressed="${tab==='board'}">Board</button></div>
        <button type="button" class="id-sbtn" data-search aria-label="Search ideas" aria-expanded="${searchOpen}">${searchOpen?IC.x:ic('search')}</button></div>
      ${searchOpen?`<label class="id-search"><span class="sr-only">Search ideas</span>${ic('search')}<input type="search" id="idQ" dir="auto" autocomplete="off" enterkeyhint="search" placeholder="Search ideas, notes and links" value="${esc(q)}"></label>`:''}`;
  }
  function drawBody(){
    const el=root.querySelector('.id-content'); if(!el) return; const keepY=window.scrollY;
    el.innerHTML=state==='ok'?(tab==='inbox'?inboxHtml():boardHtml())
      :state==='loading'?'<div class="id-skel" aria-hidden="true">'+'<span></span>'.repeat(4)+'</div>'
      :state==='offline'?noteBox(ic('clock'),'You’re offline','You can still capture ideas; they save when you are back online. Your ideas show here when you’re online.',againBtn)
      :state==='slow'?noteBox(ic('clock'),'Still loading…','The connection is slow. Your ideas show as soon as they arrive.',againBtn)
      :state==='out'?noteBox(IC.bulb,'Ideas are for your team','Sign in to keep and share ideas with your team.','<button type="button" class="btn slim" data-signin>Sign in</button>')
      :noteBox(ic('rotate'),'Could not load the ideas',esc(note),againBtn);
    fillThumbs(el); paintAudio(); window.scrollTo({top:keepY,behavior:'instant'});
  }
  function build(){ root.innerHTML='<div class="id-top"></div><div class="id-content"></div>'; drawTop(); }

  /* ---------- changes ---------- */
  async function patch(id,p,msg){
    const it=items.find(x=>x.id===id); if(!it||pending(it)) return; const was={}; Object.keys(p).forEach(k=>{ was[k]=it[k]; }); Object.assign(it,p); drawTop(); drawBody(); thumbsFor([it]);
    try{ await ensure(); const r=await C.updateIdea(id,p); Object.assign(it,r); if(msg) o.toast(msg); drawTop(); drawBody(); }catch(err){ Object.assign(it,was); drawTop(); drawBody(); o.toast('Could not save: '+(err.message||err)); }
  }
  const moveTo=(id,st)=>{ const it=items.find(x=>x.id===id); if(!it||it.stage===st) return; hap('tick'); patch(id,{stage:st},'Moved to '+SLABEL[st]+'.'); };
  async function remove(it){
    const was=items.slice(); items=items.filter(x=>x.id!==it.id); drawTop(); drawBody();
    try{ await ensure(); await C.deleteIdea(it.id); o.toast('Idea deleted.'); }catch(err){ items=was; drawTop(); drawBody(); o.toast('Could not delete: '+(err.message||err)); }
  }
  function confirmDelete(it){
    const d=o.dialog(`<div class="dlg-body"><h3 id="idDH">Delete this idea?</h3><p dir="auto">“${esc(titleOf(it))}” will be removed for everyone, with its picture and voice note.</p>
      <div class="dlg-actions"><button type="button" class="mini" data-no>Cancel</button><button type="button" class="btn danger" data-yes>Delete</button></div></div>`,'id-dlg');
    d.setAttribute('aria-labelledby','idDH'); d.querySelector('[data-no]').onclick=()=>d.close();
    d.querySelector('[data-yes]').onclick=()=>{ d.close(); remove(it); };
  }
  function menu(it){
    if(!it||pending(it)||document.querySelector('dialog[open]')) return;
    const row=(a,icn,l,cls)=>`<button type="button" class="act-row${cls?' '+cls:''}" data-a="${a}">${icn}<span>${l}</span></button>`;
    const moves=STAGES_ALL.filter(s=>s[0]!==it.stage).map(s=>row('m:'+s[0],ic('next'),'Move to '+s[1])).join('');
    const d=o.dialog(`<div class="dlg-body id-menu"><h3 id="idMH" dir="auto">${esc(titleOf(it))}</h3><p class="small">${esc(SLABEL[it.stage]||'')}${it.stage==='inbox'?'':' · '+esc(TLABEL[it.type]||'')}</p>
      <div class="act-list">${moves}${row('edit',ic('pencil'),'Edit')}${row('del',ic('trash'),'Delete','danger')}</div><button type="button" class="link" data-x>Close</button></div>`,'id-dlg');
    d.setAttribute('aria-labelledby','idMH'); d.querySelector('[data-x]').onclick=()=>d.close();
    d.querySelector('.act-list').addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a; d.close();
      if(a==='del') return confirmDelete(it); if(a==='edit') return sheet(it); if(a.startsWith('m:')) moveTo(it.id,a.slice(2)); });
  }

  /* ---------- the idea sheet (edit) ---------- */
  function sheet(src){
    if(!src||pending(src)) return;
    const it={...src}; let img={blob:null,url:null,removed:false}, au={blob:null,secs:0,url:null,removed:false}, rec=null, busy=false;
    const hasImg=()=>!img.removed&&(img.url||it.image_path), hasAud=()=>!au.removed&&(au.blob||it.audio_path);
    const d=o.dialog(`<form class="dlg-body id-sheet" action="#" novalidate>
      <div class="id-sh-head"><h3 id="idEH">Idea</h3><button type="button" class="cs-x" data-x aria-label="Close">${ic('close')}</button></div>
      <div class="field"><label class="lbl" for="idTitle">Title</label><input class="id-in" id="idTitle" dir="auto" autocomplete="off" value="${esc(it.title||'')}" placeholder="Name this idea"></div>
      <div class="field"><label class="lbl" for="idNote">Note</label><textarea class="id-in id-ta" id="idNote" dir="auto" rows="3" placeholder="Details, hooks, captions…">${esc(it.note||'')}</textarea></div>
      <div class="field"><span class="lbl" id="idTL">Type</span><div class="id-segw" role="group" aria-labelledby="idTL">${TYPES_ALL.map(([k,l])=>`<button type="button" class="id-sg" data-t="${k}" aria-pressed="${it.type===k}">${l}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl" id="idSL">Stage</span><div class="id-segw" role="group" aria-labelledby="idSL">${STAGES_ALL.map(([k,l])=>`<button type="button" class="id-sg" data-s="${k}" aria-pressed="${it.stage===k}">${l}</button>`).join('')}</div></div>
      <div class="field"><label class="lbl" for="idLink">Link</label><input class="id-in" id="idLink" type="url" dir="ltr" inputmode="url" autocomplete="off" placeholder="Paste a link" value="${esc(it.link||'')}"></div>
      <div class="field"><span class="lbl">Picture</span><div id="idPic"></div></div>
      <div class="field"><span class="lbl">Voice note</span><div id="idVoice"></div><div id="idRecHost" hidden></div></div>
      <div class="field"><span class="lbl">Design</span><div id="idDes"></div></div>
      <div class="field"><span class="lbl">Calendar</span><div id="idCal"></div></div>
      <input type="file" id="idFile" accept="image/*" hidden>
      <div class="status" id="idSt" role="status"></div>
      <div class="id-foot2"><button type="submit" class="btn" id="idSave">Save</button><button type="button" class="link danger-link" id="idDel">Delete this idea</button></div></form>`,'id-dlg id-edit');
    d.setAttribute('aria-labelledby','idEH'); const $=s=>d.querySelector(s), st=t=>{ $('#idSt').textContent=t; };
    const paintPic=()=>{ const u=img.url||(!img.removed&&it.image_path&&urls[it.image_path]);
      $('#idPic').innerHTML=hasImg()?`<div class="id-picrow"><img alt="Picture" ${u?`src="${u}"`:`data-path="${esc(it.image_path||'')}"`}><div class="id-pcol"><button type="button" class="link" data-pic>Replace</button><button type="button" class="link" data-picx>Remove</button></div></div>`
        :`<button type="button" class="id-add" data-pic>${IC.image}<span>Add a picture or screenshot</span></button>`; fillThumbs(d); };
    const paintVoice=()=>{ const path=au.blob?'sheet:'+it.id:it.audio_path;
      $('#idVoice').innerHTML=hasAud()?`<div class="id-vrow">${playerHtml(path,au.blob?au.secs:it.audio_secs)}</div><div class="id-pcol row"><button type="button" class="link" data-rec>Record again</button><button type="button" class="link" data-recx>Remove</button></div>`
        :`<button type="button" class="id-add" data-rec>${IC.mic}<span>Record a voice note</span></button>`; paintAudio(); };
    const paintDes=()=>{ const g=it.design_id&&designOf(it.design_id), u=g&&g.thumb_path&&urls[g.thumb_path];
      $('#idDes').innerHTML=(it.design_id?`<div class="id-tile">${g&&g.thumb_path?`<img alt="" data-path="${esc(g.thumb_path)}"${u?` src="${u}"`:''}>`:`<span class="id-ph">${IC.design}</span>`}<span class="id-ttxt"><b dir="auto">${esc(g?g.name:'A design')}</b><small>${esc(g&&g.tool?o.toolName(g.tool):'Saved design')}</small></span></div>
        <div class="id-links">${g&&g.tool?`<a class="link" href="${esc(o.designHref(g))}">Open</a>`:''}<button type="button" class="link" data-dchg>Change</button><button type="button" class="link" data-drm>Remove</button></div>`
        :`<button type="button" class="id-add" data-dchg>${IC.design.replace(/width="16" height="16"/,'width="22" height="22"')}<span>Link a saved design</span></button><div class="id-links"><a class="link" href="${esc(o.newDesignHref)}">Make a design</a></div>`); fillThumbs(d); };
    const paintCal=()=>{ const c=it.calendar_id&&cal[it.calendar_id];
      $('#idCal').innerHTML=it.calendar_id?`<div class="id-calrow"><span class="id-chip id-cal big">${IC.cal}<bdi>${esc(c?parse(c.day).toLocaleDateString('en',{weekday:'long',day:'numeric',month:'long'})+(c.at?' · '+TIMES_AMPM(c.at):''):'On the calendar')}</bdi></span></div>`
        :`<button type="button" class="id-add" data-plan>${IC.cal.replace(/width="16" height="16"/,'width="22" height="22"')}<span>Add to calendar</span></button>`; };
    paintPic(); paintVoice(); paintDes(); paintCal(); thumbsFor([it]).then(()=>{ paintPic(); paintDes(); });
    const setImage=async f=>{ if(!f) return; st('Preparing the picture…'); const b=await shrink(f); if(img.url) URL.revokeObjectURL(img.url); img={blob:b,url:URL.createObjectURL(b),removed:false}; st(''); paintPic(); };
    $('#idFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; setImage(f); };
    d.addEventListener('paste',e=>{ const f=imageFrom(e); if(f){ e.preventDefault(); setImage(f); } });
    const startRec=()=>{ if(rec&&rec.active()) return; stopAudio(); const host=$('#idRecHost'); $('#idVoice').hidden=true;
      rec=recordInto(host,(r,msg)=>{ $('#idVoice').hidden=false; if(r){ if(au.url) URL.revokeObjectURL(au.url); au={blob:r.blob,secs:r.secs,url:URL.createObjectURL(r.blob),removed:false}; urls['sheet:'+it.id]=au.url; } if(msg) st(msg); paintVoice(); }); };
    d.addEventListener('click',e=>{ const t=e.target; let b;
      if(t.closest('[data-x]')){ d.close(); return; }
      if(t.closest('[data-pic]')){ $('#idFile').click(); return; }
      if(t.closest('[data-picx]')){ img={blob:null,url:null,removed:true}; paintPic(); return; }
      if(t.closest('[data-rec]')){ startRec(); return; }
      if(t.closest('[data-recx]')){ stopAudio(); au={blob:null,secs:0,url:null,removed:true}; paintVoice(); return; }
      if(t.closest('[data-dchg]')){ o.pickDesign().then(g=>{ if(g){ it.design_id=g.id; if(!designs.find(x=>x.id===g.id)) designs.push(g); if(g.thumb_path&&!urls[g.thumb_path]) o.thumbs([g.thumb_path]).then(m=>{ Object.assign(urls,m); paintDes(); }); if(!$('#idTitle').value.trim()) $('#idTitle').value=g.name||''; paintDes(); } }).catch(()=>{}); return; }
      if(t.closest('[data-drm]')){ it.design_id=null; paintDes(); return; }
      if(t.closest('[data-plan]')){ plan(); return; }
      if((b=t.closest('[data-t]'))){ it.type=b.dataset.t; d.querySelectorAll('[data-t]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); return; }
      if((b=t.closest('[data-s]'))){ it.stage=b.dataset.s; d.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); return; } });
    async function plan(){
      const g=it.design_id&&designOf(it.design_id), title=$('#idTitle').value.trim()||titleOf(it), type=it.type;
      let item=null; try{ item=await o.plan({...(g?{id:g.id,name:g.name,tool:g.tool,thumb_path:g.thumb_path}:{}),format:type==='reel'?'reel':type==='story'?'story':'post',caption:$('#idNote').value,title}); }catch(err){ st('Could not open the calendar: '+(err.message||err)); return; }
      if(!item) return; it.calendar_id=item.id; cal[item.id]=item; if(it.stage==='inbox'||it.stage==='idea'){ it.stage='planned'; d.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.s==='planned'))); }
      paintCal(); st('Added to the calendar. Press Save to keep the idea up to date.'); }
    $('#idDel').onclick=()=>{ d.close(); confirmDelete(src); };
    d.addEventListener('close',()=>{ if(rec&&rec.active()) rec.cancel(); if(img.url) URL.revokeObjectURL(img.url); if(au.url) URL.revokeObjectURL(au.url); stopAudio(); });
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault(); if(busy) return; if(rec&&rec.active()) return st('Stop the recording first.');
      busy=true; const sv=$('#idSave'); sv.disabled=true; st('Saving…');
      const link=$('#idLink').value.trim(), row={id:it.id,brand:o.brand,title:$('#idTitle').value.trim(),note:$('#idNote').value,type:it.type,stage:it.stage,link:link||null,design_id:it.design_id||null,calendar_id:it.calendar_id||null,sort:it.sort||0,author:it.author||authorName()||null,audio_secs:it.audio_secs||null};
      if(img.blob){ row.image=img.blob; row.image_path_old=it.image_path||undefined; } else if(img.removed&&it.image_path){ row.image_path=null; row.image_path_old=it.image_path; }
      if(au.blob){ row.audio=au.blob; row.audio_secs=au.secs; row.audio_path_old=it.audio_path||undefined; } else if(au.removed&&it.audio_path){ row.audio_path=null; row.audio_secs=null; row.audio_path_old=it.audio_path; }
      try{ await ensure(); const r=await C.saveIdea(row); const i=items.findIndex(x=>x.id===it.id); if(i>=0) items[i]=r; d.close(); o.toast('Saved'); hap('tick'); drawTop(); drawBody(); thumbsFor([r]); }
      catch(err){ busy=false; sv.disabled=false; st('Could not save: '+(err.message||err)+' Try again.'); } });
    setTimeout(()=>{ try{ if(!src.title) $('#idTitle').focus(); }catch(_){} },60);
  }

  /* ---------- quick capture: one sheet, seconds to save ---------- */
  let capOpen=null;
  function capture(opt){
    opt=opt||{}; const mode=opt.mode||'text'; if(capOpen&&capOpen.isConnected) return;
    const S={img:null,aud:null,link:'',linkManual:false,type:'',linkField:false}; let rec=null;
    const d=o.dialog(`<form class="dlg-body id-cap" action="#" novalidate>
      <div class="id-sh-head"><h3 id="idCH">New idea</h3><button type="button" class="cs-x" data-x aria-label="Close">${ic('close')}</button></div>
      <textarea class="id-in id-ta id-big" id="idCT" autofocus dir="auto" rows="4" enterkeyhint="done" aria-label="What’s the idea?" placeholder="What’s the idea?"></textarea>
      <div id="idAtt" class="id-atts"></div><div id="idRecHost" hidden></div>
      <div class="id-tools" role="group" aria-label="Add to this idea">
        <button type="button" class="id-tool" data-tool="voice" aria-label="Record a voice note"><span>${IC.mic}</span><small>Voice</small></button>
        <button type="button" class="id-tool" data-tool="image" aria-label="Add a picture or screenshot"><span>${IC.image}</span><small>Picture</small></button>
        <button type="button" class="id-tool" data-tool="link" aria-label="Add a link"><span>${IC.link}</span><small>Link</small></button></div>
      <div class="chips id-ctypes" role="group" aria-label="Type (optional)">${TYPES.map(([k,l])=>`<button type="button" class="chip" data-ct="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
      <input type="file" id="idFile" accept="image/*" hidden>
      <div class="status" id="idSt" role="status"></div>
      <button type="submit" class="btn" id="idSave">Save to inbox</button></form>`,'id-dlg id-capdlg');
    capOpen=d; d.setAttribute('aria-labelledby','idCH'); const $=s=>d.querySelector(s), st=t=>{ $('#idSt').textContent=t; }, ta=$('#idCT');
    const paintAtt=()=>{ let h='';
      if(S.img) h+=`<div class="id-att"><img alt="Picture added" src="${S.img.url}"><span>Picture</span><button type="button" class="id-attx" data-rm="img" aria-label="Remove the picture">${IC.x}</button></div>`;
      if(S.aud) h+=`<div class="id-att wide">${playerHtml('cap:a',S.aud.secs)}<button type="button" class="link" data-rerec>Re-record</button><button type="button" class="id-attx" data-rm="aud" aria-label="Remove the voice note">${IC.x}</button></div>`;
      if(S.link&&!S.linkField) h+=`<div class="id-att"><span class="id-attic">${IC.link}</span><bdi class="id-attl">${esc(domain(S.link))}</bdi><button type="button" class="id-attx" data-rm="link" aria-label="Remove the link">${IC.x}</button></div>`;
      if(S.linkField) h+=`<label class="id-att wide"><span class="id-attic">${IC.link}</span><input class="id-in id-lin" id="idLinkF" type="url" dir="ltr" inputmode="url" autocomplete="off" placeholder="Paste a link" value="${esc(S.link)}" aria-label="Link"><button type="button" class="id-attx" data-rm="link" aria-label="Remove the link">${IC.x}</button></label>`;
      $('#idAtt').innerHTML=h; $('#idAtt').hidden=!h; paintAudio(); };
    const detect=()=>{ if(S.linkManual) return; const m=URL_RE.exec(ta.value); const u=m?m[0].replace(/[).,;!?]+$/,''):''; if(u!==S.link){ S.link=u; paintAtt(); } };
    const setImage=async f=>{ if(!f) return; st('Preparing the picture…'); const b=await shrink(f); if(S.img) URL.revokeObjectURL(S.img.url); S.img={blob:b,url:URL.createObjectURL(b)}; st(''); paintAtt(); };
    const startVoice=()=>{ if(rec&&rec.active()) return; stopAudio(); const host=$('#idRecHost'); $('.id-tools').classList.add('rec');
      rec=recordInto(host,(r,msg)=>{ $('.id-tools').classList.remove('rec'); if(r){ if(S.aud) URL.revokeObjectURL(S.aud.url); S.aud={blob:r.blob,secs:r.secs,url:URL.createObjectURL(r.blob)}; urls['cap:a']=S.aud.url; } if(msg) st(msg); paintAtt(); if(!r) ta.focus({preventScroll:true}); }); };
    async function pasteLink(){ let txt=''; try{ txt=await navigator.clipboard.readText(); }catch(_){ txt=''; } const m=URL_RE.exec(txt||'');
      if(m){ S.link=m[0].replace(/[).,;!?]+$/,''); S.linkManual=true; S.linkField=false; paintAtt(); st(''); }
      else{ S.linkField=true; S.linkManual=true; paintAtt(); const f=$('#idLinkF'); if(f) f.focus(); } }
    paintAtt();
    $('#idFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; setImage(f); };
    ta.addEventListener('input',detect);
    ta.addEventListener('paste',e=>{ const f=imageFrom(e); if(f){ e.preventDefault(); setImage(f); } else setTimeout(detect,0); });
    ta.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); d.querySelector('form').requestSubmit(); } });
    d.addEventListener('input',e=>{ if(e.target.id==='idLinkF') S.link=e.target.value.trim(); });
    d.addEventListener('click',e=>{ const t=e.target; let b;
      if(t.closest('[data-x]')){ d.close(); return; }
      if((b=t.closest('[data-tool]'))){ const k=b.dataset.tool; if(k==='voice') startVoice(); else if(k==='image') $('#idFile').click(); else pasteLink(); return; }
      if(t.closest('[data-rerec]')){ startVoice(); return; }
      if((b=t.closest('[data-rm]'))){ const k=b.dataset.rm; if(k==='img'){ URL.revokeObjectURL(S.img.url); S.img=null; } else if(k==='aud'){ stopAudio(); URL.revokeObjectURL(S.aud.url); S.aud=null; } else{ S.link=''; S.linkField=false; S.linkManual=true; } paintAtt(); return; }
      if((b=t.closest('[data-ct]'))){ const k=b.dataset.ct, on=b.getAttribute('aria-pressed')==='true'; S.type=on?'':k; d.querySelectorAll('[data-ct]').forEach(x=>x.setAttribute('aria-pressed',String(!on&&x===b))); return; } });
    d.addEventListener('close',()=>{ if(rec&&rec.active()) rec.cancel(); stopAudio(); capOpen=null; });
    d.querySelector('form').addEventListener('submit',e=>{ e.preventDefault(); if(rec&&rec.active()) return st('Stop the recording first.');
      const text=ta.value.trim(), link=S.link.trim();
      if(!text&&!S.img&&!S.aud&&!link) return st('Add a few words, a picture, a link or a voice note.');
      const lines=text.split(/\r?\n/).filter(l=>l.trim()), l0=(lines[0]||'').trim(), one=l0.length<=80;
      const title=(one?l0:l0.slice(0,80).trim()+'…')||(S.aud?'Voice note':S.img?'Picture':domain(link)), noteTxt=one?lines.slice(1).join('\n').trim():text;
      const payload={brand:o.brand,title:title,note:noteTxt,type:S.type||'post',stage:'inbox',link:link||null,audio_secs:S.aud?S.aud.secs:null,author:authorName()||null,sort:0};
      const imgBlob=S.img&&S.img.blob, audBlob=S.aud&&S.aud.blob, imgUrl=S.img&&S.img.url, audUrl=S.aud&&S.aud.url; S.img=null; S.aud=null;   /* ownership moves to the card: its blob URLs stay alive */
      d.close(); hap('tick'); persistNew(payload,imgBlob,audBlob,imgUrl,audUrl); });
    setTimeout(()=>{ if(mode==='voice') startVoice(); else if(mode==='image'){ try{ $('#idFile').click(); }catch(_){} ta.focus(); } else if(mode==='link') pasteLink(); else ta.focus(); },60);
    return d;
  }
  function failToast(msg,retry){
    let t=document.getElementById('idToast'); if(!t){ t=document.createElement('div'); t.id='idToast'; t.className='toast'; t.setAttribute('role','alert'); document.body.appendChild(t); }
    t.innerHTML=`<span>${esc(msg)}</span><button type="button" class="toast-btn">Try again</button>`; t.hidden=false; t.style.pointerEvents='auto'; clearTimeout(t._h); t._h=setTimeout(()=>{ t.hidden=true; },12000);
    t.querySelector('button').onclick=()=>{ t.hidden=true; retry(); };
  }
  /* optimistic: the card is in the inbox at once; the upload runs in the background and a failure offers Try again */
  function persistNew(payload,imgBlob,audBlob,imgUrl,audUrl){
    const id='tmp-'+Math.random().toString(36).slice(2,9), tmp={...payload,id:id,_pending:true,created_at:new Date().toISOString(),image_path:imgBlob?'tmp:'+id+':i':null,audio_path:audBlob?'tmp:'+id+':a':null};
    if(imgUrl) urls[tmp.image_path]=imgUrl; if(audUrl) urls[tmp.audio_path]=audUrl;
    items.unshift(tmp); if(built&&state==='ok'){ tab='inbox'; drawTop(); drawBody(); } o.toast('Saved to your inbox.');
    const go=async()=>{
      try{ await ensure(); if(!(await o.member())){ const ok=await o.signIn(); if(!ok) throw new Error('Sign in to save ideas.'); }
        const row=await C.saveIdea({...payload,image:imgBlob||undefined,audio:audBlob||undefined});
        if(row.image_path&&imgUrl) urls[row.image_path]=imgUrl; if(row.audio_path&&audUrl) urls[row.audio_path]=audUrl;
        const i=items.findIndex(x=>x.id===id); if(i>=0) items[i]=row; else if(!items.some(x=>x.id===row.id)) items.unshift(row);
        if(built&&state==='ok'){ drawTop(); drawBody(); thumbsFor([row]); }
      }catch(err){ failToast('Could not save the idea: '+(err.message||err),go); }
    };
    go();
  }

  /* ---------- events ---------- */
  let dragId=null;
  root.addEventListener('click',e=>{ const t=e.target; let b;
    if(t.closest('[data-back]')) return o.onBack();
    if(t.closest('[data-reload]')) return load();
    if(t.closest('[data-signin]')){ o.signIn().then(ok=>{ if(ok) load(); }); return; }
    if(t.closest('[data-idea-new]')){ hap('tick'); capture({mode:'text'}); return; }
    if((b=t.closest('[data-tab]'))){ tab=b.dataset.tab; wr('studio:ideasTab',tab); hap('tick'); drawTop(); drawBody(); return; }
    if(t.closest('[data-search]')){ searchOpen=!searchOpen; if(!searchOpen) q=''; drawTop(); drawBody(); if(searchOpen){ const i=root.querySelector('#idQ'); if(i) i.focus(); } return; }
    if((b=t.closest('[data-type]'))){ typeF=b.dataset.type; hap('tick'); drawBody(); return; }
    if((b=t.closest('[data-stage-tab]'))){ stage=b.dataset.stageTab; hap('tick'); drawBody(); return; }
    if((b=t.closest('[data-next]'))){ const it=items.find(x=>x.id===b.dataset.next); const i=it?STAGES.findIndex(s=>s[0]===it.stage):-1; if(i>=0&&STAGES[i+1]){ if(!wide()) stage=STAGES[i+1][0]; moveTo(it.id,STAGES[i+1][0]); } return; }
    if((b=t.closest('[data-sort]'))){ hap('tick'); patch(b.dataset.sort,{type:b.dataset.t,stage:'idea'},'Moved to the board.'); return; }
    if((b=t.closest('[data-more]'))){ menu(items.find(x=>x.id===b.dataset.more)); return; }
    if((b=t.closest('[data-open]'))){ sheet(items.find(x=>x.id===b.dataset.open)); } });
  root.addEventListener('input',e=>{ if(e.target.id==='idQ'){ q=e.target.value; drawBody(); } });
  root.addEventListener('dragstart',e=>{ const el=e.target.closest&&e.target.closest('.id-card[draggable="true"]'); if(!el) return; dragId=el.dataset.id; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',dragId); e.dataTransfer.effectAllowed='move'; }catch(_){} });
  root.addEventListener('dragend',()=>{ dragId=null; root.querySelectorAll('.dragging,.drop').forEach(x=>x.classList.remove('dragging','drop')); });
  root.addEventListener('dragover',e=>{ const c=e.target.closest&&e.target.closest('.id-col'); if(!c||!dragId) return; e.preventDefault(); root.querySelectorAll('.drop').forEach(x=>x!==c&&x.classList.remove('drop')); c.classList.add('drop'); });
  root.addEventListener('drop',e=>{ const c=e.target.closest&&e.target.closest('.id-col'); if(!c||!dragId) return; e.preventDefault(); const id=dragId; dragId=null; root.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop')); moveTo(id,c.dataset.stage); });
  matchMedia('(min-width:821px)').addEventListener('change',()=>{ if(wide()!==wasWide){ wasWide=wide(); if(built&&state==='ok') drawBody(); } });

  return {
    show(){ built=true; stopAudio(); build(); drawBody();
      /* opens on the Inbox when it has ideas (unless the board was the last choice), else the Board */
      load().then(()=>{ if(state==='ok'&&rd('studio:ideasTab')!=='board'&&inbox().length) tab='inbox'; else if(state==='ok'&&!inbox().length&&tab==='inbox') tab='board'; if(state==='ok'){ drawTop(); drawBody(); } });
      const h=root.querySelector('#idH'); if(h) h.focus({preventScroll:true}); },
    refresh(){ if(built) load(); },
    capture,
    get items(){ return items; }
  };
}
let cur=null;
window.StudioIdeas={ init(o){ cur=make(o); return cur; } };
})();
