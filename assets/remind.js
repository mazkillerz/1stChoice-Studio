/* Studio 2.11.0: reminders for planned posts (assets/remind.js, lazy, loaded only while Settings → "Remind me about planned posts" is on).
   No server: an app badge with today's not-posted count, and while Studio is open a note (and a system notification when allowed)
   15 minutes before an item's time, or at once if Studio was opened up to 2 hours late. Each item reminds once a day (localStorage). */
(function(){
  var timers=[], bar=null, cur=null, EARLY=15*60e3, LATE=2*3600e3;
  var speed=function(){ return +window.__remindSpeed||1; };   // test hook only: shrinks the wait
  function key(brand){ return 'studio:remind:fired:'+brand; }
  function read(brand){ try{ var o=JSON.parse(localStorage.getItem(key(brand))||'null'); return o&&o.day===day()?o:{day:day(),ids:[]}; }catch(_){ return {day:day(),ids:[]}; } }
  function day(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function mark(brand,id){ var o=read(brand); if(o.ids.indexOf(id)<0) o.ids.push(id); try{ localStorage.setItem(key(brand),JSON.stringify(o)); }catch(_){} }
  function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
  function badge(n){ try{ if(n>0){ if(navigator.setAppBadge) navigator.setAppBadge(n).catch(function(){}); } else if(navigator.clearAppBadge) navigator.clearAppBadge().catch(function(){}); }catch(_){} }
  function hideBar(){ if(bar){ bar.remove(); bar=null; } }
  function note(o,it){
    hideBar();
    var b=document.createElement('div'); b.className='banner slim-bar remind-bar'; b.setAttribute('role','status');
    var esc=o.esc, txt=(it.title||'Untitled')+' is planned for '+o.time(it.at);
    b.innerHTML='<span class="slim-txt" dir="auto">'+esc(txt)+'</span><span class="banner-btns">'+'<button type="button" class="mini solid" data-r="post">Post</button>'+'<button type="button" class="icon-btn" data-r="x" aria-label="Dismiss">×</button></span>';
    b.addEventListener('click',function(e){ var a=e.target.closest('[data-r]'); if(!a) return; hideBar(); if(a.dataset.r==='post') o.post(it.id,it.day); });
    document.body.appendChild(b); bar=b; setTimeout(function(){ if(bar===b) hideBar(); },20000);
  }
  function system(o,it){
    try{ if(!('Notification' in window)||Notification.permission!=='granted'||!navigator.serviceWorker) return;
      navigator.serviceWorker.ready.then(function(reg){ return reg.showNotification(o.brandName||'Studio',{body:(it.title||'Untitled')+' is planned for '+o.time(it.at),tag:'remind:'+o.brand+':'+it.id,data:{url:o.url||'./'},icon:o.icon}); }).catch(function(){});
    }catch(_){}
  }
  function fire(o,it){ var f=read(o.brand); if(f.ids.indexOf(it.id)>=0) return; mark(o.brand,it.id); note(o,it); system(o,it); }
  function sync(o){
    cur=o; clearTimers(); badge(o.items.length);
    var f=read(o.brand), now=Date.now();
    o.items.forEach(function(it){
      var m=/^(\d{1,2}):(\d{2})/.exec(String(it.at||'')); if(!m||f.ids.indexOf(it.id)>=0) return;
      var d=new Date(); d.setHours(+m[1],+m[2],0,0); var t=d.getTime(), at=t-EARLY;
      if(now>t+LATE) return;
      if(now>=at) fire(o,it); else timers.push(setTimeout(function(){ fire(o,it); },(at-now)/speed()));
    });
  }
  function off(){ clearTimers(); hideBar(); cur=null; try{ if(navigator.clearAppBadge) navigator.clearAppBadge().catch(function(){}); }catch(_){} }
  window.StudioRemind={sync:sync,off:off};
})();
