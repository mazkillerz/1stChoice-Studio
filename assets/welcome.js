/* Studio first-run welcome tour: three short slides in a full-screen dialog (a centred card on desktop).
   window.StudioWelcome.open({tools:[{id,title,blurb,thumb}], icons:{search,star,download,check,camera,grid,bookmark}, lockScroll(key,on), haptic(kind)})
   returns a Promise that resolves 'done' (Get started) or 'skipped' (Skip / Esc) once the dialog has closed and been removed.
   Brand-agnostic: the tools, their pictures and the icons all come from the caller. Styles: assets/welcome.css (tokens from studio.css). */
(function(){
  'use strict';
  if(window.StudioWelcome) return;

  var COPY=[
    {t:'Make a story in a minute',p:'Pick a tool, add your photo, tap Save. Restock, Photo story and Collage are always one tap away.'},
    {t:'Pin your tools, find anything',p:'Tap the star in All tools to pin a tool to your home screen. Search finds tools, templates and saved designs, in English or Arabic.'},
    {t:'Save in one tap',p:'Save gives you a full-quality picture for Instagram and adds a copy to Saved, so your team can find it.'}
  ];
  var QUERIES=['Restock','Collage'];   /* the mock search text alternates; the hub passes an English tool name and an approved phrase from the brand kit */

  var S='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var FALLBACK={
    search:S+'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    star:S+'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    download:S+'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    check:S+'<path d="M20 6 9 17l-5-5"/></svg>',
    grid:S+'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
  };
  var active=null;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function safe(fn){ try{ return fn(); }catch(_){ return undefined; } }

  function open(o){
    if(active) return active.promise;
    o=o||{};
    var tools=(Array.isArray(o.tools)?o.tools:[]).filter(function(t){ return t&&typeof t==='object'; }).slice(0,3);
    var copy=Array.isArray(o.copy)&&o.copy.length>=3?o.copy.map(function(c,i){ return {t:c.t||COPY[i].t,p:c.p||COPY[i].p}; }):COPY;
    var queries=Array.isArray(o.queries)&&o.queries.length>=2?o.queries:QUERIES;
    var icons=o.icons||{};
    var ic=function(name){ var s=icons[name]; return typeof s==='string'&&s.indexOf('<svg')>-1?s:FALLBACK[name]||''; };
    var reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var N=3, cur=0, nav=null, done=false, raf=0, settleT=0, resolve;
    var promise=new Promise(function(r){ resolve=r; });
    active={promise:promise};

    var thumb=function(t){ return t&&t.thumb?'<img src="'+esc(t.thumb)+'" alt="" draggable="false" decoding="async">':''; };

    /* slide 1: the tools as story-shaped cards, fanned out */
    var n1=tools.length||3, step=n1===2?12:8, cards='';
    for(var i=0;i<n1;i++){
      var t=tools[i], k=i-(n1-1)/2;
      cards+='<div class="wl-c" style="--k:'+k+';--z:'+(5-Math.round(Math.abs(k)*2))+';--i:'+i+'"><div class="wl-card">'+(t?thumb(t):'<span class="wl-ph">'+ic('grid')+'</span>')+'</div>'+(t&&t.title?'<span class="wl-lab">'+esc(t.title)+'</span>':'')+'</div>';
    }
    var vis1='<div class="wl-fan" style="--n:'+n1+';--rot:'+step+'deg;--lw:'+(n1>1?'calc(var(--cw) * var(--step) * 1.04)':'calc(var(--cw) * 1.4)')+'">'+cards+'</div>';

    /* slide 2: a mock search field with two result rows; one row's star fills in */
    var row=function(t,idx,pin){
      var th=t&&t.thumb?'<img src="'+esc(t.thumb)+'" alt="" draggable="false" decoding="async">':'';
      var txt=t&&t.title?'<b>'+esc(t.title)+'</b>'+(t.blurb?'<span>'+esc(t.blurb)+'</span>':''):'<i class="wl-sk"></i><i class="wl-sk short"></i>';
      return '<div class="wl-row'+(pin?' wl-pin':'')+'" style="--i:'+idx+'"><span class="wl-th">'+th+'</span><span class="wl-rt">'+txt+'</span><span class="wl-star"><span class="wl-s0">'+ic('star')+'</span><span class="wl-s1">'+ic('star')+'</span></span></div>';
    };
    var vis2='<div class="wl-find"><div class="wl-field"><span class="wl-fi">'+ic('search')+'</span><span class="wl-q"><span class="wl-q1">'+esc(queries[0])+'</span><span class="wl-q2" dir="auto">'+esc(queries[1])+'</span></span></div><div class="wl-res">'+row(tools[0],0,true)+row(tools[1],1,false)+'</div></div>';

    /* slide 3: a small phone with a mini story card, a Save pill that is pressed, then a tick and "Saved!" */
    var vis3='<div class="wl-save"><div class="wl-phone"><div class="wl-mini">'+thumb(tools[0])+'</div><span class="wl-tick">'+ic('check')+'</span><span class="wl-toast">'+ic('check')+'<span>Saved!</span></span></div><span class="wl-pill">'+ic('download')+'<span>Save</span></span></div>';

    var visuals=[vis1,vis2,vis3], slides='', dots='';
    for(var s=0;s<N;s++){
      slides+='<div class="wl-slide wl-s-'+(s+1)+(s===0?' on':'')+'"><div class="wl-vis" aria-hidden="true">'+visuals[s]+'</div><div class="wl-copy"><h2 class="wl-t" id="wl-t'+s+'">'+esc(copy[s].t)+'</h2><p class="wl-p">'+esc(copy[s].p)+'</p></div></div>';
      dots+='<button type="button" class="wl-dot" data-i="'+s+'" aria-label="Slide '+(s+1)+' of '+N+'" aria-current="'+(s===0)+'"></button>';
    }

    var dlg=document.createElement('dialog');
    dlg.className='wl'; dlg.tabIndex=-1; dlg.setAttribute('autofocus',''); dlg.setAttribute('aria-labelledby','wl-t0');
    dlg.innerHTML='<div class="wl-top"><button type="button" class="wl-skip">Skip</button></div>'
      +'<div class="wl-track">'+slides+'</div>'
      +'<div class="wl-foot"><div class="wl-dots">'+dots+'</div><button type="button" class="btn wl-next">Next</button></div>';
    var track=dlg.querySelector('.wl-track'), slideEls=[].slice.call(dlg.querySelectorAll('.wl-slide')), dotEls=[].slice.call(dlg.querySelectorAll('.wl-dot')),
      skip=dlg.querySelector('.wl-skip'), next=dlg.querySelector('.wl-next');

    var lock=function(on){ if(typeof o.lockScroll==='function') safe(function(){ o.lockScroll('welcome',on); }); };
    var haptic=function(kind){ if(typeof o.haptic==='function') safe(function(){ o.haptic(kind); }); };

    function render(){
      dotEls.forEach(function(d,i){ d.setAttribute('aria-current',String(i===cur)); });
      next.textContent=cur===N-1?'Get started':'Next';
      skip.classList.toggle('off',cur===N-1);
      dlg.setAttribute('aria-labelledby','wl-t'+cur);
    }
    function setCur(i){ if(i===cur) return; cur=i; render(); haptic('tick'); }
    /* the slide is "on" once it is mostly coming into view; the others lose "on" when scrolling has settled */
    function sync(){
      raf=0; var w=track.clientWidth||1, p=track.scrollLeft/w;
      slideEls.forEach(function(el,k){ if(Math.abs(p-k)<.7) el.classList.add('on'); });
      setCur(nav!=null?nav:Math.max(0,Math.min(N-1,Math.round(p))));
    }
    function settle(){
      clearTimeout(settleT); nav=null; sync();
      slideEls.forEach(function(el,k){ el.classList.toggle('on',k===cur); });
    }
    function onScroll(){ if(!raf) raf=requestAnimationFrame(sync); clearTimeout(settleT); settleT=setTimeout(settle,140); }
    function go(i){
      i=Math.max(0,Math.min(N-1,i)); var target=i*track.clientWidth;
      if(i===cur&&Math.abs(track.scrollLeft-target)<2) return;
      nav=i; setCur(i);
      clearTimeout(settleT); settleT=setTimeout(settle,reduced?80:900);
      track.scrollTo({left:target,behavior:reduced?'auto':'smooth'});
    }
    function onResize(){ track.scrollTo({left:cur*track.clientWidth,behavior:'auto'}); }

    function finish(result){
      if(done) return; done=true;
      window.removeEventListener('resize',onResize);
      clearTimeout(settleT); if(raf) cancelAnimationFrame(raf);
      if(!reduced) dlg.classList.add('closing');
      setTimeout(function(){
        safe(function(){ if(dlg.open) dlg.close(); });
        if(dlg.parentNode) dlg.parentNode.removeChild(dlg);
        lock(false); active=null; resolve(result);
      },reduced?0:200);
    }

    track.addEventListener('scroll',onScroll,{passive:true});
    track.addEventListener('scrollend',settle);
    window.addEventListener('resize',onResize);
    dotEls.forEach(function(d){ d.addEventListener('click',function(){ go(+d.getAttribute('data-i')); }); });
    next.addEventListener('click',function(){ if(cur<N-1) go(cur+1); else { haptic('success'); finish('done'); } });
    skip.addEventListener('click',function(){ finish('skipped'); });
    dlg.addEventListener('cancel',function(e){ e.preventDefault(); finish('skipped'); });
    dlg.addEventListener('close',function(){ finish('skipped'); });
    dlg.addEventListener('keydown',function(e){
      if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey) return;
      if(e.key==='ArrowRight'){ e.preventDefault(); go(cur+1); }   /* the track is always left to right, so Right is always forward */
      else if(e.key==='ArrowLeft'){ e.preventDefault(); go(cur-1); }
    });

    document.body.appendChild(dlg);
    render();
    lock(true);
    try{ dlg.showModal(); }
    catch(_){ if(dlg.parentNode) dlg.parentNode.removeChild(dlg); lock(false); active=null; resolve('skipped'); return promise; }
    safe(function(){ dlg.focus({preventScroll:true}); });   /* focus the dialog itself so no button shows a focus ring on open */
    return promise;
  }

  window.StudioWelcome={open:open};
})();
