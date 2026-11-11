/* Studio Goals (brand-agnostic, behind the "plan" preview flag). Lazy-loaded the first time #goals opens.
   StudioKpis.init(ctx) -> {show(), refresh()}. ctx comes from assets/studio.js (see planCtx).
   Data: C.kpiMonths / C.saveKpiMonth (targets + hand-entered engagement per month), counts come from the calendar (status 'posted') and the ideas board (giveaways). */
(function(){
'use strict';
const KINDS=[['post','Posts','post'],['story','Stories','story'],['reel','Reels','reel'],['giveaway','Giveaways','giveaway']];
const ENG=[['reach','Reach'],['likes','Likes'],['saves','Saves'],['followers','Followers']];
const CHART=[['post','Posts'],['story','Stories'],['reel','Reels'],['followers','Followers'],['reach','Reach']];
const pad=n=>(n<10?'0':'')+n;
const mkey=(y,m)=>{ const d=new Date(y,m,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); };
const shift=(k,n)=>mkey(+k.slice(0,4),+k.slice(5,7)-1+n);
const lastDay=k=>new Date(+k.slice(0,4),+k.slice(5,7),0).getDate();
const nowKey=()=>{ const d=new Date(); return mkey(d.getFullYear(),d.getMonth()); };
const mdate=k=>new Date(+k.slice(0,4),+k.slice(5,7)-1,1);
const fmtN=n=>Number(n).toLocaleString('en');

function init(o){
  /* the header, month row and sheets reuse the calendar's styles: make sure they are there (same id studio.js uses, so never twice) */
  if(!document.getElementById('lz-calendar')){ const mine=document.querySelector('link[href*="kpis.css"]'), l=document.createElement('link'); l.id='lz-calendar'; l.rel='stylesheet';
    l.href=mine?mine.getAttribute('href').replace('kpis.css','calendar.css'):'assets/calendar.css'; document.head.appendChild(l); }
  const root=o.root, esc=o.esc, ic=k=>(o.icons&&o.icons[k])||'';
  let boots=0, C=null, state='loading', note='', run=0, slowT=0, built=false;
  let month=nowKey(), chartKey='post';
  let cal=[], ideas=[], rows={};   // rows by month key
  const Lm=(k,opt)=>mdate(k).toLocaleDateString('en',opt);
  const shortM=k=>Lm(k,{month:'short'});
  const againBtn='<button type="button" class="btn slim" data-kp-reload>Try again</button>';
  const noteBox=(icn,title,text,btn)=>`<div class="sv-note cal-note"><span class="sn-ic" aria-hidden="true">${icn}</span><div class="sn-txt"><b>${title}</b><p>${text}</p></div>${btn||''}</div>`;
  const author=()=>{ try{ return (o.who&&o.who.author&&o.who.author())||null; }catch(_){ return null; } };
  const wr=(k,v)=>{ try{ o.store(k,v); }catch(_){} };

  /* ---------- load ---------- */
  async function load(){
    const my=++run; clearTimeout(slowT);
    if(state!=='ok'){ state='loading'; draw(); }
    slowT=setTimeout(()=>{ if(my===run&&state!=='ok'){ state='slow'; draw(); } },8000);
    try{
      if(navigator.onLine===false) throw Object.assign(new Error('No connection. Check your internet and try again.'),{offline:true});
      C=await o.cloud(); if(my!==run) return;
      if(!(await o.member())){ state='out'; draw(); return; }
      const from=shift(month,-5);
      const [list,km,idl]=await Promise.all([
        C.calendar(o.brand,{from:from+'-01',to:month+'-'+pad(lastDay(month))}),
        C.kpiMonths(o.brand,from,month),
        (C.ideas?Promise.resolve().then(()=>C.ideas(o.brand)).catch(()=>[]):Promise.resolve([]))]);
      if(my!==run) return;
      cal=list||[]; ideas=idl||[]; rows={}; (km||[]).forEach(r=>{ rows[r.month]=r; });
      state='ok'; draw();
    }catch(err){ if(my!==run) return;
      if(err&&err.name==='ReferenceError'&&boots++<5){ setTimeout(()=>{ if(my===run) load(); },400); return; }   /* opened by #goals before studio.js finished starting */
      const net=o.netDown(err), slow=net&&/slow/i.test(err.message||'');
      if(state==='ok'){ o.toast(net?'You’re offline. These are your goals from before.':'Could not refresh goals: '+(err.message||err)); return; }
      state=net?(slow?'slow':'offline'):'error'; note=err.message||String(err); draw(); }
    finally{ if(my===run) clearTimeout(slowT); }
  }

  /* ---------- numbers ---------- */
  function counts(k){
    const c={post:0,story:0,reel:0,giveaway:0};
    cal.forEach(x=>{ if(x.status!=='posted'||String(x.day||'').slice(0,7)!==k) return; const f=x.format==='story'||x.format==='reel'?x.format:'post'; c[f]++; });
    (Array.isArray(ideas)?ideas:[]).forEach(i=>{ if(i.type!=='giveaway'||i.stage!=='posted') return;
      let day=null; if(i.calendar_id){ const ci=cal.find(x=>x.id===i.calendar_id); day=ci?ci.day:null; }
      if(!day) day=String(i.updated_at||'').slice(0,10);
      if(day.slice(0,7)===k) c.giveaway++; });
    return c;
  }
  const target=(k,key)=>{ const r=rows[k]; const v=r&&r.targets&&+r.targets[key]; return v>0?v:0; };
  const eng=(k,key)=>{ const r=rows[k], e=r&&r.engagement&&r.engagement[key]; return e&&e.v!=null&&e.v!==''&&isFinite(+e.v)?{...e,v:+e.v}:null; };
  const metric=(k,key)=>{ if(['post','story','reel','giveaway'].includes(key)) return counts(k)[key]; const e=eng(k,key); return e?e.v:null; };

  /* ---------- drawing ---------- */
  function card(key,label,cnt,prevCnt,prevKey){
    const t=target(month,key), pct=t?Math.min(100,Math.round(cnt/t*100)):0, done=t&&cnt>=t;
    const d=cnt-prevCnt, delta=d===0?`Same as ${esc(shortM(prevKey))}`:`${d>0?'+':'−'}<bdi>${Math.abs(d)}</bdi> vs ${esc(shortM(prevKey))}`;
    return `<button type="button" class="kp-card${done?' done':''}" data-kp-card="${key}" aria-label="${esc(label)}: ${cnt}${t?' of '+t:', no goal'}. ${t?'Tap to change the goal.':'Tap to set a goal.'}">
      <span class="kp-lbl">${esc(label)}${done?`<i class="kp-check" aria-hidden="true">${ic('check')}</i><span class="kp-sr"> goal reached</span>`:''}</span>
      <span class="kp-big"><bdi>${cnt}</bdi>${t?` <small>of <bdi>${t}</bdi></small>`:''}</span>
      ${t?`<span class="kp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${Math.min(cnt,t)}" aria-label="${esc(label)} progress"><i style="width:${pct}%"></i></span>`:'<span class="kp-bar none" aria-hidden="true"></span>'}
      <span class="kp-sub">${t?delta:'No goal'}</span></button>`;
  }
  function engHtml(){
    const prev=shift(month,-1), any=ENG.some(([k])=>eng(month,k));
    const cells=ENG.map(([k,l])=>{ const e=eng(month,k), p=eng(prev,k); let ch='<span class="kp-ch muted">No number yet</span>';
      if(e&&p&&p.v>0){ const pc=Math.round((e.v-p.v)/p.v*1000)/10, up=pc>0, flat=pc===0, txt=(up?'+':pc<0?'−':'')+Math.abs(pc).toLocaleString('en',{maximumFractionDigits:1})+'%';
        ch=`<span class="kp-ch ${flat?'flat':up?'up':'down'}"><span aria-hidden="true">${flat?'●':up?'▲':'▼'}</span> <bdi>${txt}</bdi> <span class="kp-sr">${flat?'no change':up?'up':'down'}</span> vs ${esc(shortM(prev))}</span>`; }
      else if(e) ch=`<span class="kp-ch muted">No ${esc(shortM(prev))} number to compare</span>`;
      return `<div class="kp-eng"><span class="kp-lbl">${l}</span><b class="kp-val">${e?`<bdi>${fmtN(e.v)}</bdi>`:'–'}</b>${ch}<small class="kp-src">${e?(e.src==='instagram'?'From Instagram':'Entered by hand'):''}</small></div>`; }).join('');
    return `<section class="kp-sec" aria-labelledby="kpEH"><div class="kp-sh"><h2 id="kpEH">Your numbers</h2><button type="button" class="link" data-kp-nums>${any?'Update numbers':'Add numbers'}</button></div><div class="kp-engrid">${cells}</div></section>`;
  }
  function chartSvg(){
    const keys=Array.from({length:6},(_,i)=>shift(month,i-5)), vals=keys.map(k=>metric(k,chartKey));
    const max=Math.max(1,...vals.map(v=>v||0)), W=330, H=150, top=22, bot=24, bw=34, gap=(W-6*bw)/6, base=H-bot, label=(CHART.find(c=>c[0]===chartKey)||[])[1];
    const bars=keys.map((k,i)=>{ const v=vals[i], x=gap/2+i*(bw+gap), h=v?Math.max(3,Math.round((v/max)*(base-top))):0, cur=i===5;
      return `<g class="${cur?'cur':''}"><title>${esc(Lm(k,{month:'long',year:'numeric'}))}: ${v==null?'no number':fmtN(v)}</title>${v?`<rect class="kp-b" x="${x}" y="${base-h}" width="${bw}" height="${h}" rx="5"/>`:`<rect class="kp-b0" x="${x}" y="${base-2}" width="${bw}" height="2" rx="1"/>`}
        <text class="kp-v" x="${x+bw/2}" y="${(v?base-h:base)-6}" text-anchor="middle">${v==null?'–':fmtN(v)}</text><text class="kp-m" x="${x+bw/2}" y="${H-7}" text-anchor="middle">${esc(Lm(k,{month:'narrow'}))}</text></g>`; }).join('');
    return `<svg class="kp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} over the last 6 months: ${keys.map((k,i)=>shortM(k)+' '+(vals[i]==null?'none':vals[i])).join(', ')}">${bars}</svg>`;
  }
  function body(){
    const prev=shift(month,-1), c=counts(month), p=counts(prev), has=!!rows[month]&&KINDS.some(([k])=>target(month,k));
    return `${has?'':`<div class="kp-empty"><div><b>Set this month’s goals</b><p>Pick how many posts, stories and reels you want in ${esc(Lm(month,{month:'long'}))}. Your posted items count by themselves.</p></div><button type="button" class="btn slim" data-kp-edit>Set goals</button></div>`}
      <section class="kp-sec" aria-label="This month's goals"><div class="kp-grid">${KINDS.map(([k,l])=>card(k,l,c[k],p[k],prev)).join('')}</div></section>
      ${engHtml()}
      <section class="kp-sec" aria-labelledby="kpCH"><div class="kp-sh"><h2 id="kpCH">Last 6 months</h2></div>
        <div class="chips kp-chips" role="group" aria-label="Show">${CHART.map(([k,l])=>`<button type="button" class="chip" data-kp-chart="${k}" aria-pressed="${k===chartKey}">${l}</button>`).join('')}</div>
        <div class="kp-chartbox">${chartSvg()}</div></section>`;
  }
  function draw(){
    const keepY=window.scrollY, ok=state==='ok', here=month===nowKey();
    const msg=state==='loading'?'<div class="cal-skel" aria-hidden="true"><span></span><span></span><span></span></div>'
      :state==='offline'?noteBox(ic('clock'),'You’re offline','Your goals come back when you’re online.',againBtn)
      :state==='slow'?noteBox(ic('clock'),'Still loading…','The connection is slow. Your goals show as soon as they arrive.',againBtn)
      :state==='out'?noteBox(ic('check'),'Goals are for your team','Sign in to set goals and see how you’re doing.','<button type="button" class="btn slim" data-kp-signin>Sign in</button>')
      :noteBox(ic('rotate'),'Could not load goals',esc(note),againBtn);
    root.innerHTML=`<div class="cal-top"><div class="cal-head"><button type="button" class="sp-back" data-kp-back aria-label="Back to home">${ic('back')}</button>
        <div class="sp-title"><h1 id="kpH" tabindex="-1">Goals</h1></div>
        <button type="button" class="mini kp-editbtn" data-kp-edit${ok?'':' disabled'}>${ic('pencil')}<span>Edit goals</span></button></div>
      ${o.tabs||''}
      <div class="cal-bar"><div class="cal-nav"><button type="button" class="cal-arrow" data-kp-nav="-1" aria-label="Previous month">${ic('back')}</button>
        <strong class="cal-title" aria-live="polite">${esc(Lm(month,{month:'long',year:'numeric'}))}</strong>
        <button type="button" class="cal-arrow" data-kp-nav="1" aria-label="Next month">${ic('next')}</button></div>
        ${here?'':'<button type="button" class="cal-today" data-kp-nav="0">This month</button>'}</div></div>
      <div class="kp-body">${ok?body():msg}</div>`;
    window.scrollTo({top:keepY,behavior:'instant'});
  }

  /* ---------- saving ---------- */
  async function save(patch,msg){
    const r=rows[month]||{}, row={brand:o.brand,month,targets:{...(r.targets||{})},engagement:{...(r.engagement||{})},note:r.note||'',author:author(),...patch};
    const saved=await C.saveKpiMonth(row); rows[month]={...r,...row,...(saved||{})}; if(msg) o.toast(msg); draw(); return saved;
  }
  const failMsg=err=>/not there|table|relation|schema/i.test(err.message||'')||!(err&&err.message)?'Goals are switched on by the owner once. Ask the owner to switch them on, then try again.':'Could not save: '+(err.message||err)+' Try again.';

  /* ---------- sheets ---------- */
  function sheetHead(id,title){ return `<div class="cs-head"><h3 id="${id}">${title}</h3><button type="button" class="cs-x" data-kp-x aria-label="Close">${ic('close')}</button></div>`; }
  function editGoals(){
    const cur={}; KINDS.forEach(([k])=>{ cur[k]=target(month,k); });
    const d=o.dialog(`<form class="dlg-body cal-sheet kp-sheet" action="#" novalidate>${sheetHead('kpGH','Goals for '+esc(Lm(month,{month:'long'})))}
      <p class="small kp-hint">How many do you want to post this month? Leave 0 for no goal.</p>
      ${KINDS.map(([k,l])=>`<div class="kp-step" data-k="${k}"><label for="kpS-${k}">${l}</label><div class="kp-stepper"><button type="button" class="kp-sb" data-d="-1" aria-label="Fewer ${l.toLowerCase()}">−</button><input id="kpS-${k}" type="text" inputmode="numeric" pattern="[0-9]*" value="${cur[k]}" aria-label="${l} goal"><button type="button" class="kp-sb" data-d="1" aria-label="More ${l.toLowerCase()}">+</button></div></div>`).join('')}
      <button type="button" class="link" id="kpSame">Same as last month</button>
      <div class="status" id="kpSt" role="status"></div>
      <div class="cal-foot"><button type="submit" class="btn" id="kpSave">Save</button></div></form>`,'cal-dlg kp-dlg');
    d.setAttribute('aria-labelledby','kpGH'); const $=s=>d.querySelector(s), st=t=>{ $('#kpSt').textContent=t; };
    const get=k=>{ const v=parseInt(String($('#kpS-'+k).value).replace(/\D/g,''),10); return isFinite(v)?Math.max(0,Math.min(999,v)):0; };
    d.querySelectorAll('.kp-step').forEach(s=>{ const inp=s.querySelector('input');
      s.querySelectorAll('.kp-sb').forEach(b=>b.onclick=()=>{ inp.value=Math.max(0,Math.min(999,get(s.dataset.k)+(+b.dataset.d))); o.haptic&&o.haptic('tick'); });
      inp.addEventListener('blur',()=>{ inp.value=get(s.dataset.k); }); });
    $('#kpSame').onclick=()=>{ const p=rows[shift(month,-1)]; if(!p||!KINDS.some(([k])=>+(p.targets||{})[k]>0)) return st('There are no goals for last month.');
      KINDS.forEach(([k])=>{ $('#kpS-'+k).value=Math.max(0,Math.min(999,+(p.targets||{})[k]||0)); }); st('Copied from '+Lm(shift(month,-1),{month:'long'})+'. Tap Save to keep them.'); };
    d.querySelector('[data-kp-x]').onclick=()=>d.close();
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault(); const sv=$('#kpSave'); sv.disabled=true; st('Saving…');
      const targets={}; KINDS.forEach(([k])=>{ targets[k]=get(k); });
      try{ await save({targets},'Goals saved'); d.close(); }catch(err){ sv.disabled=false; st(failMsg(err)); } });
    setTimeout(()=>{ const f=$('#kpS-post'); f&&f.focus&&f.focus({preventScroll:true}); },60);
  }
  function editNumbers(){
    const prev=shift(month,-1);
    const d=o.dialog(`<form class="dlg-body cal-sheet kp-sheet" action="#" novalidate>${sheetHead('kpNH','Your numbers for '+esc(Lm(month,{month:'long'})))}
      <p class="small kp-hint">Type the numbers from Instagram. They are saved as entered by hand.</p>
      ${ENG.map(([k,l])=>{ const e=eng(month,k), p=eng(prev,k); return `<div class="kp-step field"><label for="kpN-${k}">${l}</label><input id="kpN-${k}" class="kp-num" type="text" inputmode="numeric" pattern="[0-9,]*" autocomplete="off" value="${e?e.v:''}" placeholder="0"><small class="kp-src">${p?`${esc(shortM(prev))}: <bdi>${fmtN(p.v)}</bdi>`:'&nbsp;'}</small></div>`; }).join('')}
      <div class="status" id="kpSt" role="status"></div>
      <div class="cal-foot"><button type="submit" class="btn" id="kpSave">Save</button></div></form>`,'cal-dlg kp-dlg');
    d.setAttribute('aria-labelledby','kpNH'); const $=s=>d.querySelector(s), st=t=>{ $('#kpSt').textContent=t; };
    d.querySelector('[data-kp-x]').onclick=()=>d.close();
    d.querySelector('form').addEventListener('submit',async e=>{ e.preventDefault();
      const en={...(rows[month]&&rows[month].engagement||{})}; const at=new Date().toISOString();
      for(const [k,l] of ENG){ const raw=$('#kpN-'+k).value.replace(/[,\s]/g,''); if(raw==='') continue; if(!/^\d{1,12}$/.test(raw)) return st(l+': use digits only, like 12300.');
        const v=+raw, old=en[k]; if(!old||old.v!==v) en[k]={v,src:'manual',at}; }
      const sv=$('#kpSave'); sv.disabled=true; st('Saving…');
      try{ await save({engagement:en},'Numbers saved'); d.close(); }catch(err){ sv.disabled=false; st(failMsg(err)); } });
    setTimeout(()=>{ const f=$('#kpN-reach'); f&&f.focus&&f.focus({preventScroll:true}); },60);
  }

  /* ---------- events ---------- */
  root.addEventListener('click',e=>{ const t=e.target; let b;
    if(t.closest('[data-kp-back]')){ o.onBack(); return; }
    if(t.closest('[data-kp-reload]')) return load();
    if(t.closest('[data-kp-signin]')){ o.signIn().then(ok=>{ if(ok) load(); }); return; }
    if(state!=='ok') return;
    if((b=t.closest('[data-kp-nav]'))){ const n=+b.dataset.kpNav; month=n===0?nowKey():shift(month,n); o.haptic&&o.haptic('tick'); load(); return; }
    if(t.closest('[data-kp-edit]')||t.closest('[data-kp-card]')){ o.haptic&&o.haptic('tick'); editGoals(); return; }
    if(t.closest('[data-kp-nums]')){ o.haptic&&o.haptic('tick'); editNumbers(); return; }
    if((b=t.closest('[data-kp-chart]'))){ chartKey=b.dataset.kpChart; wr('studio:goalsChart',chartKey); draw(); const nb=root.querySelector('[data-kp-chart="'+chartKey+'"]'); nb&&nb.focus(); } });

  return {
    show(){ built=true; try{ const s=o.store('studio:goalsChart'); if(CHART.some(c=>c[0]===s)) chartKey=s; }catch(_){} draw(); load(); },
    refresh(){ if(built) load(); }
  };
}
window.StudioKpis={init};
})();
