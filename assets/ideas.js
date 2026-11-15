/* Studio Ideas (brand-agnostic, behind the "plan" preview flag). Lazy-loaded; window.StudioIdeas.init(ctx) -> {show(), refresh(), capture({mode})}.
   A home for every marketing idea: one Board (Idea, Planned, In progress, Posted) tagged Reel / Post / Story / Giveaway. New ideas land straight in "Idea" (no Inbox; old 'inbox' rows read as 'idea').
   Capture by typing, a link, a picture or screenshot, or a voice note (MediaRecorder; clear speech: mono 48 kHz, noise suppression + auto gain, no echo cancellation since nothing plays while recording;
   Opus at 96 kbit/s on Chrome/Android, AAC at 128 kbit/s on iPhone Safari; data every second; 2 minutes max; stored as recorded, never re-encoded or transcribed).
   Every idea has a discussion thread (text and voice replies, many voice notes). A card carries a "new" dot until someone other than its author opens it.
   Nothing is deleted: ideas, voice notes and replies "Move to archive"; the Archive sheet restores them.
   Rows live in the cloud (C.ideas / C.saveIdea / C.updateIdea / C.ideaNotes / C.addIdeaNote / C.archiveIdea* / C.restoreIdea* / C.markIdeaSeen). */
(function(){
'use strict';
const TYPES=[['reel','Reel'],['post','Post'],['story','Story'],['giveaway','Giveaway']];
const TYPES_ALL=TYPES.concat([['other','Other']]);
const STAGES=[['idea','Idea'],['planned','Planned'],['progress','In progress'],['posted','Posted']];
const REC_FORMATS=[['audio/webm;codecs=opus',96000],['audio/mp4;codecs=mp4a.40.2',128000],['audio/mp4',128000]];
const REC_AUDIO={channelCount:{ideal:1},sampleRate:{ideal:48000},sampleSize:{ideal:16},echoCancellation:false,noiseSuppression:true,autoGainControl:true};
const MAX_SECS=120, WARN_SECS=105, MAX_EDGE=1600;
const TLABEL=Object.fromEntries(TYPES_ALL), SLABEL=Object.fromEntries(STAGES);
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
  chat:SVG('<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',14),
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
  const sy=()=>o.shell?root.scrollTop:scrollY, sTo=y=>{ if(o.shell) root.scrollTop=y; else scrollTo({top:y,behavior:'instant'}); };
  if(o.shell) root.classList.add('is-shell');
  let lastSig='', C=null, items=[], notes=[], openSheet=null, designs=[], cal={}, urls={}, state='loading', note='', run=0, slowT=0, built=false;
  let stage='idea', typeF='', q='', searchOpen=false, wasWide=wide();
  let staleAt=null, dataAt=null, lastExtra='', pendingOpen=null, thumbsOnce=false, lastUnread=-1, saveT=0;
  const CKEY='studio:plan:ideas:'+o.brand, SKEY='studio:ideas:seen:'+o.brand;
  /* ---------- per-device memory: the Plan cache (paints at once) and when I last opened each idea ---------- */
  const newest=(a,n)=>{ if(a.length<=n) return a; const keep=new Set(a.slice().sort((x,y)=>String(y.created_at).localeCompare(String(x.created_at))).slice(0,n)); return a.filter(x=>keep.has(x)); };   /* the newest n, in their own order */
  const persist=()=>{ if(state!=='ok'||staleAt) return; const its=items.filter(x=>!x._pending&&!/^tmp/.test(x.id)), ns=notes.filter(x=>!x._pending);
    wr(CKEY,{v:1,at:dataAt||new Date().toISOString(),items:newest(its,200),notes:newest(ns,600)}); };
  const persistSoon=()=>{ clearTimeout(saveT); saveT=setTimeout(persist,250); };
  const seenMap=()=>{ const m=rd(SKEY); return m&&typeof m==='object'&&!Array.isArray(m)?m:{}; };
  function markSeen(id){ if(!id||/^tmp/.test(id)) return; const m=seenMap(); let t=new Date().toISOString();
    notes.forEach(n=>{ if(n.idea_id===id&&n.created_at&&String(n.created_at)>t) t=String(n.created_at); }); m[id]=t;
    const ks=Object.keys(m); if(ks.length>300){ ks.sort((a,b)=>String(m[a]).localeCompare(String(m[b]))); ks.slice(0,ks.length-300).forEach(k=>{ delete m[k]; }); } wr(SKEY,m); }
  const hydrate=()=>{ const c=rd(CKEY); if(!c||c.v!==1||!Array.isArray(c.items)) return false; items=c.items; notes=Array.isArray(c.notes)?c.notes:[]; state='ok'; dataAt=c.at||null; lastSig=JSON.stringify([items,notes]); return true; };
  /* only the designs and calendar entries that ideas point to can change what a card shows */
  const extraSig=()=>JSON.stringify(items.map(x=>{ const g=x.design_id&&designOf(x.design_id), c=x.calendar_id&&cal[x.calendar_id]; return [g?g.name+(g.thumb_path||''):0,c?c.day+(c.at||''):0]; }));

  const authorName=()=>{ try{ return (o.who&&o.who.author&&o.who.author())||null; }catch(_){ return null; } };
  const designOf=id=>designs.find(d=>d.id===id);
  const againBtn='<button type="button" class="btn slim" data-reload>Try again</button>';
  const noteBox=(icn,title,text,btn)=>`<div class="sv-note"><span class="sn-ic" aria-hidden="true">${icn}</span><div class="sn-txt"><b>${title}</b><p>${text}</p></div>${btn||''}</div>`;

  try{ if(hydrate()) lastExtra=extraSig(); }catch(_){}
  /* ---------- load ---------- */
  async function ensure(){ if(!C) C=await o.cloud(); return C; }
  async function load(){
    const my=++run; clearTimeout(slowT);
    if(state!=='ok'){ state='loading'; drawBody(); }
    slowT=setTimeout(()=>{ if(my===run&&state!=='ok'){ state='slow'; drawBody(); } },8000);
    try{
      if(navigator.onLine===false) throw Object.assign(new Error('No connection. Check your internet and try again.'),{offline:true});
      await ensure(); if(my!==run) return;
      if(!(await o.member())){ state='out'; items=[]; notes=[]; staleAt=null; lastSig=''; clearTimeout(saveT); wr(CKEY,null); drawTop(); drawBody(); return; }
      const now=new Date(), from=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()-90)), to=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()+90));
      const [list0,dl,cl,nl]=await Promise.all([C.ideas(o.brand),Promise.resolve(o.designs?o.designs():[]).catch(()=>designs),C.calendar?C.calendar(o.brand,{from:from,to:to}).catch(()=>[]):[],C.ideaNotes?C.ideaNotes(o.brand).catch(()=>notes):[]]); if(my!==run) return;
      const list=list0.map(x=>x.stage==='inbox'?{...x,stage:'idea'}:x), keepN=notes.filter(n=>n._pending); notes=(nl||[]).concat(keepN);
      designs=dl||[]; cal={}; (cl||[]).forEach(x=>{ cal[x.id]=x; });
      const live=new Set(list.map(x=>x.id)), keepP=items.filter(x=>x._pending&&!live.has(x.id));
      items=keepP.concat(list);
      const sig=JSON.stringify([items,notes]), extra=extraSig(), same=state==='ok'&&sig===lastSig&&extra===lastExtra; lastSig=sig; lastExtra=extra;   /* no redraw when nothing changed (no flicker) */
      const wasStale=!!staleAt; staleAt=null; dataAt=new Date().toISOString(); state='ok'; if(!same||wasStale){ drawTop(); drawBody(); if(openSheet) openSheet.thread(); } persistSoon();
      if(!same||!thumbsOnce){ thumbsOnce=true; thumbsFor(items); }
      if(pendingOpen){ const it=items.find(x=>x.id===pendingOpen); pendingOpen=null; if(it&&!document.querySelector('dialog.id-edit')) sheet(it); }
    }catch(err){ if(my!==run) return; const net=o.netDown(err), slow=net&&/slow/i.test(err.message||'');
      if(state==='ok'){ if(net||err.offline){ if(!staleAt){ staleAt=dataAt||new Date().toISOString(); drawBody(); } } else o.toast('Could not refresh the ideas: '+(err.message||err)); return; }
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
  function recordInto(host,done,opt){
    opt=opt||{};
    let stream=null, mr=null, ac=null, raf=0, tick=0, chunks=[], t0=0, finished=false, stopping=false;
    /* clear speech: Opus 96 kbit/s (Chrome/Android), else AAC 128 kbit/s (iPhone Safari), else the browser's default */
    const pick=(()=>{ try{ return REC_FORMATS.find(f=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(f[0]))||null; }catch(_){ return null; } })(), mime=pick?pick[0]:'';
    const fail=msg=>{ cleanup(); host.innerHTML=''; host.hidden=true; done(null,msg); };
    function cleanup(){ cancelAnimationFrame(raf); clearInterval(tick); try{ stream&&stream.getTracks().forEach(t=>t.stop()); }catch(_){} try{ ac&&ac.close(); }catch(_){} stream=null; ac=null; }
    const ui=()=>{ host.hidden=false; host.innerHTML=`<div class="id-rec" role="group" aria-label="Recording a voice note"><span class="id-dot" aria-hidden="true"></span><div class="id-rtxt"><b class="id-rtime" aria-live="off">0:00</b><small>of <bdi>${mmss(MAX_SECS)}</bdi></small></div><span class="id-meter" aria-hidden="true"><i></i></span>
      <button type="button" class="id-rstop" data-rstop aria-label="Stop recording">${IC.stop}<span>Stop</span></button><button type="button" class="id-rcancel${opt.compact?' x':''}" data-rcancel aria-label="Cancel recording">${opt.compact?IC.x:'Cancel'}</button></div><p class="id-rwarn small" hidden>Almost at the limit.</p>`;
      host.querySelector('[data-rstop]').onclick=()=>finish(true); host.querySelector('[data-rcancel]').onclick=()=>finish(false); };
    function finish(keep){ if(finished) return; if(!mr||mr.state==='inactive'){ finished=true; cleanup(); host.innerHTML=''; host.hidden=true; if(!keep) done(null); return; }
      stopping=true; keep_=keep; try{ mr.stop(); }catch(_){ finished=true; cleanup(); host.hidden=true; done(null,'Recording stopped.'); } }
    let keep_=true;
    (async()=>{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder) return fail('Voice notes are not supported on this device.');
      try{ try{ stream=await navigator.mediaDevices.getUserMedia({audio:REC_AUDIO}); }catch(e1){ if(/overconstrained|constraintnotsatisfied/i.test((e1&&(e1.name+' '+e1.message))||'')) stream=await navigator.mediaDevices.getUserMedia({audio:true}); else throw e1; } }catch(err){ return fail(/denied|permission|notallowed/i.test((err&&(err.name+' '+err.message))||'')?'The microphone is blocked. Allow it in your browser settings to record.':'Could not use the microphone.'); }
      if(finished) return cleanup();
      try{ mr=new MediaRecorder(stream,pick?{mimeType:pick[0],audioBitsPerSecond:pick[1]}:{}); }catch(_){ try{ mr=new MediaRecorder(stream); }catch(__){ return fail('Voice notes are not supported on this device.'); } }
      mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
      mr.onstop=()=>{ if(finished) return; finished=true; const secs=Math.min(MAX_SECS,Math.max(1,Math.round((Date.now()-t0)/1000))); const type=mr.mimeType||mime||'audio/webm'; cleanup(); host.innerHTML=''; host.hidden=true;
        if(keep_&&chunks.length) done({blob:new Blob(chunks,{type:type}),secs:secs}); else done(null,keep_?'Nothing was recorded.':''); };
      mr.onerror=()=>{ if(!finished){ finished=true; cleanup(); host.hidden=true; done(null,'Recording failed. Try again.'); } };
      ui();
      try{ const AC=window.AudioContext||window.webkitAudioContext; ac=new AC(); const src=ac.createMediaStreamSource(stream), an=ac.createAnalyser(); an.fftSize=512; src.connect(an); const buf=new Uint8Array(an.fftSize), bar=host.querySelector('.id-meter i');
        const loop=()=>{ an.getByteTimeDomainData(buf); let s=0; for(let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; s+=v*v; } const lv=Math.min(1,Math.sqrt(s/buf.length)*4); if(bar) bar.style.width=(8+lv*92)+'%'; raf=requestAnimationFrame(loop); }; loop(); }catch(_){}
      t0=Date.now(); mr.start(1000);
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
  const boardItems=()=>items.filter(x=>!typeF||x.type===typeF);
  const pill=t=>`<span class="id-pill t-${esc(t||'other')}"><i aria-hidden="true"></i>${esc(TLABEL[t]||'Other')}</span>`;
  const calChip=it=>{ if(!it.calendar_id) return ''; const c=cal[it.calendar_id]; const txt=c?parse(c.day).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})+(c.at?' · '+TIMES_AMPM(c.at):''):'On the calendar';
    return `<span class="id-chip id-cal" title="On the calendar">${IC.cal}<bdi>${esc(txt)}</bdi></span>`; };
  const designMini=it=>{ if(!it.design_id) return ''; const g=designOf(it.design_id); return `<span class="id-chip id-des" title="${esc(g?g.name:'A design')}">${g&&g.thumb_path?`<img alt="" decoding="async" data-path="${esc(g.thumb_path)}"${urls[g.thumb_path]?` src="${urls[g.thumb_path]}"`:''}>`:IC.design}<span dir="auto">${esc(g?g.name:'A design')}</span></span>`; };
  const linkChip=it=>it.link?`<a class="id-chip id-lnk" href="${esc(hrefOf(it.link))}" target="_blank" rel="noopener noreferrer" aria-label="Open the link ${esc(domain(it.link))}">${IC.link.replace('width="22" height="22"','width="16" height="16"')}<bdi>${esc(domain(it.link))}</bdi></a>`:'';
  const initial=n=>String(n||'?').trim().charAt(0).toUpperCase()||'?';
  const nReplies=it=>notes.filter(n=>n.idea_id===it.id&&!n._pending).length;
  /* "new": the column exists (seen_at is null, not just missing), and the author is someone else */
  const isNew=it=>!pending(it)&&it.seen_at===null&&String(it.author||'')!==String(authorName()||'');
  /* replies by others newer than my last open here (an idea I wrote and never opened here counts from its creation; someone else's from the moment anybody opened it) */
  const unreadOf=it=>{ if(pending(it)) return 0; const me=String(authorName()||''), m=seenMap(); let base=m[it.id];
    if(!base) base=String(it.author||'')===me?it.created_at:(it.seen_at||null); if(!base) return 0;
    return notes.filter(n=>n.idea_id===it.id&&!n._pending&&String(n.author||'')!==me&&String(n.created_at)>String(base)).length; };
  const emitUnread=()=>{ if(state!=='ok') return; const n=items.filter(x=>isNew(x)||unreadOf(x)>0).length; if(n!==lastUnread){ lastUnread=n; try{ o.onUnread&&o.onUnread(n); }catch(_){} } };
  const byLine=it=>{ const n=nReplies(it); return `<span class="id-by">${it.author?`<b class="id-av" aria-hidden="true">${esc(initial(it.author))}</b><span class="sr-only">${esc(it.author)}, </span>`:''}<bdi>${pending(it)?'Saving…':esc(ago(it.created_at))}</bdi>${n?`<span class="id-rc" title="Replies">${IC.chat}<bdi>${n}</bdi><span class="sr-only"> ${n===1?'reply':'replies'}</span></span>`:''}</span>`; };
  function card(it){
    const t=titleOf(it), snip=it.note?firstLine(it.note).slice(0,140):'', idx=STAGES.findIndex(s=>s[0]===it.stage), nxt=STAGES[idx+1];
    const img=it.image_path?`<img class="id-thumb" alt="" decoding="async" data-path="${esc(it.image_path)}"${urls[it.image_path]?` src="${urls[it.image_path]}"`:''}>`:'';
    const meta=[it.audio_path?playerHtml(it.audio_path,it.audio_secs):'',linkChip(it),designMini(it),calChip(it)].filter(Boolean).join('');
    return `<article class="id-card${pending(it)?' pend':''}${isNew(it)?' is-new':''}" data-id="${esc(it.id)}"${!pending(it)?' draggable="true"':''}>
      <button type="button" class="id-main" data-open="${esc(it.id)}"${pending(it)?' disabled':''}>
        <span class="id-top2">${isNew(it)?'<i class="id-new-dot" role="img" aria-label="New"></i>':''}${pill(it.type)}${byLine(it)}${unreadOf(it)?`<span class="id-unread"><bdi>${unreadOf(it)}</bdi> new<span class="sr-only"> ${unreadOf(it)===1?'reply':'replies'}</span></span>`:''}</span>
        <span class="id-body2">${img}<span class="id-txt"><b class="id-title" dir="auto">${esc(t)}</b>${snip?`<span class="id-snip" dir="auto">${esc(snip)}</span>`:''}</span></span></button>
      ${meta?`<div class="id-meta">${meta}</div>`:''}
      ${pending(it)?'':`<div class="id-foot">${nxt?`<button type="button" class="id-next" data-next="${esc(it.id)}">Move to ${esc(nxt[1])}<span aria-hidden="true">›</span></button>`:'<span></span>'}</div>`}
      ${pending(it)?'':`<button type="button" class="id-more" data-more="${esc(it.id)}" aria-label="Options for ${esc(t)}">${ic('more')}</button>`}</article>`;
  }
  const newBtn=`<button type="button" class="btn slim" data-idea-new>${ic('plus')}<span>New idea</span></button>`;
  const endLink='<div class="id-end"><button type="button" class="link" data-archive>Archive</button></div>';
  function boardHtml(){
    const all=boardItems().filter(matches), by=k=>all.filter(x=>x.stage===k);
    const filt=`<div class="chips id-types" role="group" aria-label="Filter by type"><button type="button" class="chip" data-type="" aria-pressed="${!typeF}">All</button>${TYPES.map(([k,l])=>`<button type="button" class="chip" data-type="${k}" aria-pressed="${typeF===k}">${l}</button>`).join('')}</div>`;
    if(!items.length) return filt+`<div class="id-empty"><span class="id-bulb" aria-hidden="true">${IC.bulb}</span><b>Your board is empty</b><p>Capture an idea in a few seconds. It lands here, ready to plan.</p>${newBtn}</div>`+endLink;
    if(wide()) return filt+`<div class="id-cols">${STAGES.map(([k,l])=>`<section class="id-col" data-stage="${k}" aria-label="${l}"><header><b>${l}</b><em><bdi>${by(k).length}</bdi></em></header><div class="id-list">${by(k).map(x=>card(x)).join('')||'<p class="id-none">Nothing here</p>'}</div></section>`).join('')}</div>`+endLink;
    const stagesRow=`<div class="id-stages" role="group" aria-label="Stage">${STAGES.map(([k,l])=>`<button type="button" class="chip" data-stage-tab="${k}" aria-pressed="${stage===k}">${l}<i><bdi>${by(k).length}</bdi></i></button>`).join('')}</div>`;
    const list=by(stage);
    return filt+stagesRow+(list.length?`<div class="id-list" data-stage="${stage}">${list.map(x=>card(x)).join('')}</div>`:`<div class="id-empty slim"><p>${q||typeF?'Nothing matches here.':'Nothing in “'+esc(SLABEL[stage])+'” yet.'}</p></div>`)+endLink;
  }
  function drawTop(){
    const el=root.querySelector('.id-top'); if(!el) return; const sh=!!o.shell;
    el.innerHTML=`<div class="id-head">${sh?'':`<button type="button" class="sp-back" data-back aria-label="Back to home">${ic('back')}</button>`}<div class="sp-title"><h1 id="idH" tabindex="-1"${sh?' class="sr-only"':''}>Ideas</h1></div>
        <button type="button" class="id-sbtn" data-search aria-label="Search ideas" aria-expanded="${searchOpen}">${searchOpen?IC.x:ic('search')}</button>
        <button type="button" class="mini solid id-new" data-idea-new>${ic('plus')}<span>New</span></button></div>${sh?'':o.tabs||''}
      ${searchOpen?`<label class="id-search"><span class="sr-only">Search ideas</span>${ic('search')}<input type="search" id="idQ" dir="auto" autocomplete="off" enterkeyhint="search" placeholder="Search ideas, notes and links" value="${esc(q)}"></label>`:''}`;
  }
  function drawBody(){
    const el=root.querySelector('.id-content'); if(!el) return; const keepY=sy();
    el.innerHTML=state==='ok'?boardHtml()
      :state==='loading'?'<div class="id-skel" aria-hidden="true">'+'<span></span>'.repeat(4)+'</div>'
      :state==='offline'?noteBox(ic('clock'),'You’re offline','You can still capture ideas; they save when you are back online. Your ideas show here when you’re online.',againBtn)
      :state==='slow'?noteBox(ic('clock'),'Still loading…','The connection is slow. Your ideas show as soon as they arrive.',againBtn)
      :state==='out'?noteBox(IC.bulb,'Ideas are for your team','Sign in to keep and share ideas with your team.','<button type="button" class="btn slim" data-signin>Sign in</button>')
      :noteBox(ic('rotate'),'Could not load the ideas',esc(note),againBtn);
    if(state==='ok'&&staleAt){ el.insertAdjacentHTML('afterbegin',`<p class="id-stale small" role="status">Updated <bdi>${esc(ago(staleAt))}</bdi></p>`); }
    fillThumbs(el); paintAudio(); sTo(keepY); if(state==='ok'){ emitUnread(); persistSoon(); }
  }
  function build(){ root.innerHTML='<div class="id-top"></div><div class="id-content"></div>'; drawTop(); }

  /* ---------- changes ---------- */
  async function patch(id,p,msg){
    const it=items.find(x=>x.id===id); if(!it||pending(it)) return; const was={}; Object.keys(p).forEach(k=>{ was[k]=it[k]; }); Object.assign(it,p); drawTop(); drawBody(); thumbsFor([it]);
    try{ await ensure(); const r=await C.updateIdea(id,p); Object.assign(it,r); if(msg) o.toast(msg); drawTop(); drawBody(); }catch(err){ Object.assign(it,was); drawTop(); drawBody(); o.toast('Could not save: '+(err.message||err)); }
  }
  const moveTo=(id,st)=>{ const it=items.find(x=>x.id===id); if(!it||it.stage===st) return; hap('tick'); patch(id,{stage:st},'Moved to '+SLABEL[st]+'.'); };
  /* nothing is ever deleted: an idea moves to the archive and can be restored from there */
  async function archive(it){
    const was=items.slice(); items=items.filter(x=>x.id!==it.id); drawTop(); drawBody();
    try{ await ensure(); await C.archiveIdea(it.id,authorName()); o.toast('Moved to the archive.'); }catch(err){ items=was; drawTop(); drawBody(); o.toast('Could not archive: '+(err.message||err)); }
  }
  function confirmDlg(title,text,yes,onYes){
    const d=o.dialog(`<div class="dlg-body"><h3 id="idDH" dir="auto">${title}</h3><p dir="auto">${text}</p>
      <div class="dlg-actions"><button type="button" class="mini" data-no>Keep it</button><button type="button" class="btn" data-yes>${yes}</button></div></div>`,'id-dlg id-confirm');
    d.setAttribute('aria-labelledby','idDH'); d.querySelector('[data-no]').onclick=()=>d.close();
    d.querySelector('[data-yes]').onclick=()=>{ d.close(); onYes(); };
  }
  const confirmArchive=it=>confirmDlg('Move this idea to the archive?',`“${esc(titleOf(it))}” leaves the board for everyone, with its picture and voice notes. You can restore it any time from Archive.`,'Move to archive',()=>archive(it));
  function menu(it){
    if(!it||pending(it)||document.querySelector('dialog[open]')) return;
    const row=(a,icn,l,cls)=>`<button type="button" class="act-row${cls?' '+cls:''}" data-a="${a}">${icn}<span>${l}</span></button>`;
    const moves=STAGES.filter(s=>s[0]!==it.stage).map(s=>row('m:'+s[0],ic('next'),'Move to '+s[1])).join('');
    const d=o.dialog(`<div class="dlg-body id-menu"><h3 id="idMH" dir="auto">${esc(titleOf(it))}</h3><p class="small">${esc(SLABEL[it.stage]||'')} · ${esc(TLABEL[it.type]||'')}</p>
      <div class="act-list">${moves}${row('edit',ic('pencil'),'Open')}${row('del',ic('trash'),'Move to archive')}</div><button type="button" class="link" data-x>Close</button></div>`,'id-dlg');
    d.setAttribute('aria-labelledby','idMH'); d.querySelector('[data-x]').onclick=()=>d.close();
    d.querySelector('.act-list').addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a; d.close();
      if(a==='del') return confirmArchive(it); if(a==='edit') return sheet(it); if(a.startsWith('m:')) moveTo(it.id,a.slice(2)); });
  }

  /* ---------- the Archive: ideas and notes that were moved away, each with Restore ---------- */
  function archiveSheet(){
    if(document.querySelector('dialog.id-archive')) return;
    const d=o.dialog(`<div class="dlg-body id-arch"><div class="id-sh-head"><h3 id="idAH">Archive</h3><button type="button" class="cs-x" data-x aria-label="Close">${ic('close')}</button></div>
      <p class="small">Nothing is ever removed. Restore an idea or a voice note and it comes straight back.</p><div id="idAList" aria-live="polite"><p class="small">Loading…</p></div></div>`,'id-dlg id-archive');
    d.setAttribute('aria-labelledby','idAH'); d.querySelector('[data-x]').onclick=()=>d.close();
    let data={ideas:[],notes:[]};
    const when=r=>esc((r.deleted_by?r.deleted_by+' · ':'')+ago(r.deleted_at));
    const paint=()=>{ const L=d.querySelector('#idAList'); const rows=[];
      data.ideas.forEach(x=>rows.push({k:'idea',id:x.id,at:x.deleted_at,h:`<b dir="auto">${esc(titleOf(x))}</b><small>Idea · archived by <bdi>${when(x)}</bdi></small>`}));
      data.notes.forEach(n=>{ const parent=items.find(x=>x.id===n.idea_id)||data.ideas.find(x=>x.id===n.idea_id), pt=parent?titleOf(parent):'an idea';
        rows.push({k:'note',id:n.id,at:n.deleted_at,h:`<b dir="auto">${n.audio_path?'Voice note':'Reply'}${n.body?': '+esc(String(n.body).slice(0,60)):''}</b><small>on <span dir="auto">${esc(pt)}</span> · archived by <bdi>${when(n)}</bdi></small>`}); });
      rows.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
      L.innerHTML=rows.length?`<ul class="id-alist">${rows.map(r=>`<li class="id-arow"><span class="id-atx">${r.h}</span><button type="button" class="mini" data-restore="${r.id}" data-k="${r.k}">Restore</button></li>`).join('')}</ul>`:'<p class="id-none">Nothing in the archive.</p>'; };
    (async()=>{ try{ await ensure(); data=await C.archivedIdeas(o.brand); }catch(err){ d.querySelector('#idAList').innerHTML='<p class="small">Could not load the archive: '+esc(err.message||err)+'</p>'; return; } paint(); })();
    d.addEventListener('click',async e=>{ const b=e.target.closest('[data-restore]'); if(!b) return; b.disabled=true;
      try{ if(b.dataset.k==='idea') await C.restoreIdea(b.dataset.restore); else await C.restoreIdeaNote(b.dataset.restore);
        data.ideas=data.ideas.filter(x=>x.id!==b.dataset.restore); data.notes=data.notes.filter(x=>x.id!==b.dataset.restore); paint(); o.toast('Restored.'); lastSig=''; load(); }
      catch(err){ b.disabled=false; o.toast('Could not restore: '+(err.message||err)); } });
  }

  /* ---------- the idea sheet: edit + discussion thread ---------- */
  function sheet(src){
    if(!src||pending(src)) return;
    const it={...src}; let img={blob:null,url:null,removed:false}, rec=null, busy=false, mode='read';
    const me=authorName(); const wasNew=isNew(src);
    if(wasNew){ src.seen_at=new Date().toISOString(); src.seen_by=me; ensure().then(()=>C.markIdeaSeen&&C.markIdeaSeen(src.id,me)).catch(()=>{}); }
    markSeen(src.id); drawBody();
    const hasImg=()=>!img.removed&&(img.url||it.image_path);
    const d=o.dialog(`<div class="dlg-body id-sheet is-read">
      <div class="id-sh-head"><h3 id="idEH">Idea</h3><button type="button" class="id-editbtn" data-edit>Edit</button><button type="button" class="cs-x" data-x aria-label="Close">${ic('close')}</button></div>
      <div class="id-scroll">
      <div class="id-read" id="idRead"></div>
      <form class="id-form" action="#" novalidate hidden>
      <div class="field"><label class="lbl" for="idTitle">Title</label><input class="id-in" id="idTitle" dir="auto" autocomplete="off" value="${esc(it.title||'')}" placeholder="Name this idea"></div>
      <div class="field"><label class="lbl" for="idNote">Note</label><textarea class="id-in id-ta" id="idNote" dir="auto" rows="3" placeholder="Details, hooks, captions…">${esc(it.note||'')}</textarea></div>
      <div class="field"><span class="lbl" id="idTL">Type</span><div class="id-segw" role="group" aria-labelledby="idTL">${TYPES_ALL.map(([k,l])=>`<button type="button" class="id-sg" data-t="${k}" aria-pressed="${it.type===k}">${l}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl" id="idSL">Stage</span><div class="id-segw" role="group" aria-labelledby="idSL">${STAGES.map(([k,l])=>`<button type="button" class="id-sg" data-s="${k}" aria-pressed="${it.stage===k}">${l}</button>`).join('')}</div></div>
      <div class="field"><label class="lbl" for="idLink">Link</label><input class="id-in" id="idLink" type="url" dir="ltr" inputmode="url" autocomplete="off" placeholder="Paste a link" value="${esc(it.link||'')}"></div>
      <div class="field"><span class="lbl">Picture</span><div id="idPic"></div></div>
      <div class="field"><span class="lbl">Design</span><div id="idDes"></div></div>
      <div class="field"><span class="lbl">Calendar</span><div id="idCal"></div></div>
      <input type="file" id="idFile" accept="image/*" hidden>
      <div class="status" id="idSt" role="status"></div>
      <div class="id-foot2"><div class="id-saverow"><button type="submit" class="btn" id="idSave">Save</button><button type="button" class="mini" id="idCancel">Cancel</button></div><button type="button" class="link" id="idDel">Move this idea to the archive</button></div></form>
      <section class="id-tw" aria-labelledby="idTH"><h4 class="lbl" id="idTH">Discussion</h4><ul class="id-thread" id="idThread"></ul></section>
      </div>
      <div class="id-composer"><div id="idRecHost" hidden></div>
        <div class="id-crow"><input class="id-in id-cin" id="idReply" dir="auto" autocomplete="off" enterkeyhint="send" aria-label="Write a reply" placeholder="Write a reply">
          <button type="button" class="id-cmic" data-cmic aria-label="Record a voice reply">${IC.mic}</button><button type="button" class="btn id-csend" data-csend>Send</button></div>
        <div class="status small" id="idRSt" role="status"></div></div></div>`,'id-dlg id-edit');
    d.setAttribute('aria-labelledby','idEH'); const $=s=>d.querySelector(s), st=t=>{ $('#idSt').textContent=t; }, rst=t=>{ $('#idRSt').textContent=t; };
    const paintPic=()=>{ const u=img.url||(!img.removed&&it.image_path&&urls[it.image_path]);
      $('#idPic').innerHTML=hasImg()?`<div class="id-picrow"><img alt="Picture" ${u?`src="${u}"`:`data-path="${esc(it.image_path||'')}"`}><div class="id-pcol"><button type="button" class="link" data-pic>Replace</button><button type="button" class="link" data-picx>Remove</button></div></div>`
        :`<button type="button" class="id-add" data-pic>${IC.image}<span>Add a picture or screenshot</span></button>`; fillThumbs(d); };
    const paintDes=()=>{ const g=it.design_id&&designOf(it.design_id), u=g&&g.thumb_path&&urls[g.thumb_path];
      $('#idDes').innerHTML=(it.design_id?`<div class="id-tile">${g&&g.thumb_path?`<img alt="" data-path="${esc(g.thumb_path)}"${u?` src="${u}"`:''}>`:`<span class="id-ph">${IC.design}</span>`}<span class="id-ttxt"><b dir="auto">${esc(g?g.name:'A design')}</b><small>${esc(g&&g.tool?o.toolName(g.tool):'Saved design')}</small></span></div>
        <div class="id-links">${g&&g.tool?`<a class="link" href="${esc(o.designHref(g))}">Open</a>`:''}<button type="button" class="link" data-dchg>Change</button><button type="button" class="link" data-drm>Remove</button></div>`
        :`<button type="button" class="id-add" data-dchg>${IC.design.replace(/width="16" height="16"/,'width="22" height="22"')}<span>Link a saved design</span></button><div class="id-links"><a class="link" href="${esc(o.newDesignHref)}">Make a design</a></div>`); fillThumbs(d); };
    const paintCal=()=>{ const c=it.calendar_id&&cal[it.calendar_id];
      $('#idCal').innerHTML=it.calendar_id?`<div class="id-calrow"><span class="id-chip id-cal big">${IC.cal}<bdi>${esc(c?parse(c.day).toLocaleDateString('en',{weekday:'long',day:'numeric',month:'long'})+(c.at?' · '+TIMES_AMPM(c.at):''):'On the calendar')}</bdi></span></div>`
        :`<button type="button" class="id-add" data-plan>${IC.cal.replace(/width="16" height="16"/,'width="22" height="22"')}<span>Add to calendar</span></button>`; };
    /* read mode: the idea as content (nothing to edit until "Edit"), then the thread */
    const paintRead=()=>{ const t=titleOf(it), hp=!!it.image_path, u=hp&&urls[it.image_path], chips=[linkChip(it),designMini(it),calChip(it)].filter(Boolean).join('');
      $('#idRead').innerHTML=`<div class="id-rtop">${pill(it.type)}${it.author?`<span class="id-by"><bdi>${esc(it.author)}</bdi> · <bdi>${esc(ago(it.created_at))}</bdi></span>`:''}</div>
        <h4 class="id-rtitle" dir="auto">${esc(t)}</h4>${it.note?`<p class="id-rnote" dir="auto">${esc(it.note)}</p>`:''}
        ${hp?`<img class="id-rpic" alt="Picture" decoding="async" data-path="${esc(it.image_path)}"${u?` src="${u}"`:''}>`:''}${chips?`<div class="id-rchips">${chips}</div>`:''}
        <div class="id-qstage" role="group" aria-label="Stage">${STAGES.map(([k,l])=>`<button type="button" class="id-sg" data-qs="${k}" aria-pressed="${it.stage===k}">${l}</button>`).join('')}</div>`; fillThumbs(d); };
    const setMode=m=>{ mode=m; const ed=m==='edit'; $('.id-sheet').classList.toggle('is-read',!ed); $('.id-form').hidden=!ed; $('#idRead').hidden=ed; $('.id-tw').hidden=ed; $('.id-composer').hidden=ed; $('[data-edit]').hidden=ed;
      $('#idEH').textContent=ed?'Edit idea':'Idea'; $('.id-scroll').scrollTop=0; if(ed){ setTimeout(()=>{ try{ $('#idTitle').focus({preventScroll:true}); }catch(_){} },30); } };
    const fillForm=()=>{ $('#idTitle').value=it.title||''; $('#idNote').value=it.note||''; $('#idLink').value=it.link||''; d.querySelectorAll('[data-t]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.t===it.type))); d.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.s===it.stage))); };
    /* the thread: the idea's own voice note first, then the replies, oldest first */
    const entries=()=>{ const e=[]; if(it.audio_path) e.push({id:'main',main:true,author:it.author,created_at:it.created_at,audio_path:it.audio_path,audio_secs:it.audio_secs,body:''});
      return e.concat(notes.filter(n=>n.idea_id===it.id).slice().sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))); };
    const msg=e=>{ const who=e.author||'Someone';
      return `<li class="id-msg${e._pending?' pend':''}" data-eid="${esc(e.id)}"><b class="id-av lg" aria-hidden="true">${esc(initial(who))}</b><div class="id-mb"><div class="id-mh"><b class="id-mn" dir="auto">${esc(who)}</b><bdi class="id-mt">${e._pending?'Sending…':esc(ago(e.created_at))}</bdi>${e._pending?'':`<button type="button" class="id-mmore" data-mmore="${esc(e.id)}" aria-label="Options for this ${e.audio_path?'voice note':'reply'}">${ic('more')}</button>`}</div>
        ${e.body?`<p class="id-mtx" dir="auto">${esc(e.body)}</p>`:''}${e.audio_path?playerHtml(e.audio_path,e.audio_secs):''}</div></li>`; };
    const paintThread=(toEnd)=>{ const L=$('#idThread'); if(!L) return; const list=entries();
      L.innerHTML=list.length?list.map(msg).join(''):'<li class="id-none">No replies yet. Write one, or leave a voice note.</li>'; paintAudio(); if(toEnd&&list.length){ try{ L.lastElementChild.scrollIntoView({block:'nearest'}); }catch(_){} } };
    paintPic(); paintDes(); paintCal(); paintRead(); paintThread(); thumbsFor([it]).then(()=>{ paintPic(); paintDes(); paintRead(); });
    openSheet={thread:()=>{ if(mode==='read'){ const cur=items.find(x=>x.id===it.id); if(cur){ Object.assign(it,cur); src=cur; paintRead(); } } paintThread(); markSeen(it.id); }};
    const setImage=async f=>{ if(!f) return; st('Preparing the picture…'); const b=await shrink(f); if(img.url) URL.revokeObjectURL(img.url); img={blob:b,url:URL.createObjectURL(b),removed:false}; st(''); paintPic(); };
    $('#idFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; setImage(f); };
    d.addEventListener('paste',e=>{ const f=imageFrom(e); if(f){ e.preventDefault(); setImage(f); } });
    /* replies */
    async function send(voice){
      const txt=voice?'':$('#idReply').value.trim(); if(!voice&&!txt) return; if(!voice) $('#idReply').value=''; rst('');
      const tid='tmp-n'+Math.random().toString(36).slice(2,8), n={id:tid,idea_id:it.id,brand:o.brand,author:me,body:txt,created_at:new Date().toISOString(),_pending:true,audio_path:voice?'tmp:'+tid:null,audio_secs:voice?voice.secs:null};
      if(voice) urls['tmp:'+tid]=URL.createObjectURL(voice.blob);
      notes.push(n); paintThread(true); hap('tick');
      try{ await ensure(); const r=await C.addIdeaNote({brand:o.brand,idea_id:it.id,author:me,body:txt,audio:voice?voice.blob:undefined,secs:voice?voice.secs:undefined});
        const i=notes.indexOf(n); if(i>=0) notes[i]=r; else notes.push(r); if(voice&&r.audio_path) urls[r.audio_path]=urls['tmp:'+tid]; lastSig=''; }
      catch(err){ const i=notes.indexOf(n); if(i>=0) notes.splice(i,1); if(!voice) $('#idReply').value=txt; rst(err.message||String(err)); }
      paintThread(true); drawBody(); }
    const startReply=()=>{ if(rec&&rec.active()) return; stopAudio(); rst(''); const host=$('#idRecHost'); $('.id-crow').hidden=true;
      rec=recordInto(host,(r,msg2)=>{ $('.id-crow').hidden=false; if(msg2) rst(msg2); if(r) send(r); },{compact:true}); };
    $('#idReply').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); send(); } });
    /* ⋯ on an entry: only "Move to archive", always behind a clear question */
    function entryMenu(e){
      const word=e.audio_path?'voice note':'reply';
      const m=o.dialog(`<div class="dlg-body id-menu"><h3 id="idNH">${e.audio_path?'Voice note':'Reply'}</h3><p class="small" dir="auto">${esc(e.author||'Someone')} · <bdi>${esc(ago(e.created_at))}</bdi></p>
        <div class="act-list"><button type="button" class="act-row" data-a="arch">${ic('trash')}<span>Move to archive</span></button></div><button type="button" class="link" data-x>Close</button></div>`,'id-dlg');
      m.setAttribute('aria-labelledby','idNH'); m.querySelector('[data-x]').onclick=()=>m.close();
      m.querySelector('[data-a="arch"]').onclick=()=>{ m.close(); confirmDlg(`Move this ${word} to the archive?`,'You can restore it any time from Archive.','Move to archive',()=>archiveEntry(e)); };
    }
    async function archiveEntry(e){
      try{ await ensure();
        if(e.main){ const r=await C.archiveIdeaVoice(it.id,me); if(r){ it.audio_path=null; it.audio_secs=null; src.audio_path=null; src.audio_secs=null; const x=items.find(y=>y.id===it.id); if(x){ x.audio_path=null; x.audio_secs=null; } } }
        else{ await C.archiveIdeaNote(e.id,me); notes=notes.filter(n=>n.id!==e.id); }
        stopAudio(); lastSig=''; paintThread(); drawBody(); o.toast('Moved to the archive.'); }
      catch(err){ rst(err.message||String(err)); } }
    d.addEventListener('click',e=>{ const t=e.target; let b;
      if(t.closest('[data-x]')&&t.closest('.id-sh-head')){ d.close(); return; }
      if(t.closest('[data-edit]')){ setMode('edit'); return; }
      if(t.closest('#idCancel')){ Object.assign(it,src); img={blob:null,url:null,removed:false}; fillForm(); paintPic(); paintDes(); paintCal(); st(''); setMode('read'); return; }
      if((b=t.closest('[data-qs]'))){ const k=b.dataset.qs; if(it.stage===k) return; it.stage=k; hap('tick'); d.querySelectorAll('[data-qs]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); d.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.s===k))); patch(it.id,{stage:k}); return; }
      if(t.closest('[data-csend]')){ send(); return; }
      if(t.closest('[data-cmic]')){ startReply(); return; }
      if((b=t.closest('[data-mmore]'))){ const en=entries().find(x=>String(x.id)===b.dataset.mmore); if(en) entryMenu(en); return; }
      if(t.closest('[data-pic]')){ $('#idFile').click(); return; }
      if(t.closest('[data-picx]')){ img={blob:null,url:null,removed:true}; paintPic(); return; }
      if(t.closest('[data-dchg]')){ o.pickDesign().then(g=>{ if(g){ it.design_id=g.id; if(!designs.find(x=>x.id===g.id)) designs.push(g); if(g.thumb_path&&!urls[g.thumb_path]) o.thumbs([g.thumb_path]).then(m=>{ Object.assign(urls,m); paintDes(); }); if(!$('#idTitle').value.trim()) $('#idTitle').value=g.name||''; paintDes(); } }).catch(()=>{}); return; }
      if(t.closest('[data-drm]')){ it.design_id=null; paintDes(); return; }
      if(t.closest('[data-plan]')){ plan(); return; }
      if((b=t.closest('[data-t]'))&&t.closest('.id-form')){ it.type=b.dataset.t; d.querySelectorAll('[data-t]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); return; }
      if((b=t.closest('[data-s]'))){ it.stage=b.dataset.s; d.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); return; } });
    async function plan(){
      const g=it.design_id&&designOf(it.design_id), title=$('#idTitle').value.trim()||titleOf(it), type=it.type;
      let item=null; try{ item=await o.plan({...(g?{id:g.id,name:g.name,tool:g.tool,thumb_path:g.thumb_path}:{}),format:type==='reel'?'reel':type==='story'?'story':'post',caption:$('#idNote').value,title}); }catch(err){ st('Could not open the calendar: '+(err.message||err)); return; }
      if(!item) return; it.calendar_id=item.id; cal[item.id]=item; if(it.stage==='idea'){ it.stage='planned'; d.querySelectorAll('[data-s]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.s==='planned'))); }
      paintCal(); st('Added to the calendar. Press Save to keep the idea up to date.'); }
    $('#idDel').onclick=()=>{ d.close(); confirmArchive(src); };
    d.addEventListener('close',()=>{ if(rec&&rec.active()) rec.cancel(); if(img.url) URL.revokeObjectURL(img.url); stopAudio(); openSheet=null; markSeen(it.id); drawBody(); });
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault(); if(busy) return; if(rec&&rec.active()) return st('Stop the recording first.');
      busy=true; const sv=$('#idSave'); sv.disabled=true; st('Saving…');
      const link=$('#idLink').value.trim(), row={id:it.id,brand:o.brand,title:$('#idTitle').value.trim(),note:$('#idNote').value,type:it.type,stage:it.stage,link:link||null,design_id:it.design_id||null,calendar_id:it.calendar_id||null,sort:it.sort||0,author:it.author||authorName()||null};
      if(img.blob){ row.image=img.blob; row.image_path_old=it.image_path||undefined; } else if(img.removed&&it.image_path){ row.image_path=null; row.image_path_old=it.image_path; }
      try{ await ensure(); const r=await C.saveIdea(row); const i=items.findIndex(x=>x.id===it.id); if(i>=0){ items[i]={...items[i],...r}; src=items[i]; } Object.assign(it,src); if(img.url){ URL.revokeObjectURL(img.url); } img={blob:null,url:null,removed:false};
        busy=false; sv.disabled=false; st(''); o.toast('Saved'); hap('tick'); drawTop(); drawBody(); paintRead(); paintPic(); paintDes(); paintCal(); fillForm(); setMode('read'); thumbsFor([src]).then(()=>{ paintRead(); paintPic(); }); }
      catch(err){ busy=false; sv.disabled=false; st('Could not save: '+(err.message||err)+' Try again.'); } });
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
      <button type="submit" class="btn" id="idSave">Save idea</button></form>`,'id-dlg id-capdlg');
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
      const payload={brand:o.brand,title:title,note:noteTxt,type:S.type||'post',stage:'idea',link:link||null,audio_secs:S.aud?S.aud.secs:null,author:authorName()||null,sort:0};
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
  /* optimistic: the card is on the board at once; the upload runs in the background and a failure offers Try again */
  function persistNew(payload,imgBlob,audBlob,imgUrl,audUrl){
    const id='tmp-'+Math.random().toString(36).slice(2,9), tmp={...payload,id:id,_pending:true,created_at:new Date().toISOString(),image_path:imgBlob?'tmp:'+id+':i':null,audio_path:audBlob?'tmp:'+id+':a':null};
    if(imgUrl) urls[tmp.image_path]=imgUrl; if(audUrl) urls[tmp.audio_path]=audUrl;
    items.unshift(tmp); stage='idea'; if(built&&state==='ok'){ drawTop(); drawBody(); } o.toast('Saved to the board.');
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
    if(t.closest('[data-archive]')){ archiveSheet(); return; }
    if(t.closest('[data-search]')){ searchOpen=!searchOpen; if(!searchOpen) q=''; drawTop(); drawBody(); if(searchOpen){ const i=root.querySelector('#idQ'); if(i) i.focus(); } return; }
    if((b=t.closest('[data-type]'))){ typeF=b.dataset.type; hap('tick'); drawBody(); return; }
    if((b=t.closest('[data-stage-tab]'))){ stage=b.dataset.stageTab; hap('tick'); drawBody(); return; }
    if((b=t.closest('[data-next]'))){ const it=items.find(x=>x.id===b.dataset.next); const i=it?STAGES.findIndex(s=>s[0]===it.stage):-1; if(i>=0&&STAGES[i+1]){ if(!wide()) stage=STAGES[i+1][0]; moveTo(it.id,STAGES[i+1][0]); } return; }
    if((b=t.closest('[data-more]'))){ menu(items.find(x=>x.id===b.dataset.more)); return; }
    if((b=t.closest('[data-open]'))){ sheet(items.find(x=>x.id===b.dataset.open)); } });
  root.addEventListener('input',e=>{ if(e.target.id==='idQ'){ q=e.target.value; drawBody(); } });
  root.addEventListener('dragstart',e=>{ const el=e.target.closest&&e.target.closest('.id-card[draggable="true"]'); if(!el) return; dragId=el.dataset.id; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',dragId); e.dataTransfer.effectAllowed='move'; }catch(_){} });
  root.addEventListener('dragend',()=>{ dragId=null; root.querySelectorAll('.dragging,.drop').forEach(x=>x.classList.remove('dragging','drop')); });
  root.addEventListener('dragover',e=>{ const c=e.target.closest&&e.target.closest('.id-col'); if(!c||!dragId) return; e.preventDefault(); root.querySelectorAll('.drop').forEach(x=>x!==c&&x.classList.remove('drop')); c.classList.add('drop'); });
  root.addEventListener('drop',e=>{ const c=e.target.closest&&e.target.closest('.id-col'); if(!c||!dragId) return; e.preventDefault(); const id=dragId; dragId=null; root.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop')); moveTo(id,c.dataset.stage); });
  matchMedia('(min-width:821px)').addEventListener('change',()=>{ if(wide()!==wasWide){ wasWide=wide(); if(built&&state==='ok') drawBody(); } });

  return {
    show(){ const again=built&&state==='ok'&&root.querySelector('.id-content'); built=true; stopAudio(); if(!again){ if(state!=='ok') lastSig=''; build(); drawBody(); }   /* coming back keeps the page on screen (no rebuild flash) */
      load();
      const h=root.querySelector('#idH'); if(h&&!o.shell) h.focus({preventScroll:true}); },
    refresh(){ if(built) load(); },
    capture,
    open(id){ const it=items.find(x=>x.id===id&&!x._pending); if(it){ if(!document.querySelector('dialog.id-edit')) sheet(it); return; }
      pendingOpen=id; if(!built) this.show(); else if(state!=='loading') load(); },
    get items(){ return items; }
  };
}
let cur=null;
window.StudioIdeas={ init(o){ cur=make(o); return cur; } };
})();
