(function(){
  'use strict';
  /* What's new page. Reads studio-notes/changelog.md (format: see the intro of that file).
     ONE level: the newest version is a hero card, fully open (every change with its note and screenshots). Every older version is one row
     (version, date, one-line summary, count chips); one tap opens everything inside (built on first open, then kept). No nested expanders.
     #v-<version> links open and scroll to any version.
     Filter chips (All / New / Improved / Fixed) hide the changes that do not match. Nothing is stored except the "seen" mark. */
  var list=document.getElementById('wnList'),foot=document.getElementById('wnFoot'),
      dlg=document.getElementById('wnDlg'),big=document.getElementById('wnBig'),
      closeBtn=document.getElementById('wnClose'),
      filtersBox=document.getElementById('wnFilters'),chips=document.getElementById('wnChips'),
      status=document.getElementById('wnStatus');
  var emptyBox=document.getElementById('wnEmpty');
  var svg=function(d){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';};
  /* New: sparkle. Improved: trending arrow. Fixed: wrench. (Lucide-style strokes) */
  var TYPES=[
    {id:'feature',label:'New',chip:'new',icon:svg('<path d="M9.94 14.34 8.5 18.5l-1.44-4.16a2 2 0 0 0-1.4-1.4L1.5 11.5l4.16-1.44a2 2 0 0 0 1.4-1.4L8.5 4.5l1.44 4.16a2 2 0 0 0 1.4 1.4l4.16 1.44-4.16 1.44a2 2 0 0 0-1.4 1.4Z"/><path d="M19 3v4M21 5h-4M19 17v4M21 19h-4"/>')},
    {id:'improve',label:'Improved',chip:'improved',icon:svg('<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>')},
    {id:'fix',label:'Fixed',chip:'fixed',icon:svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z"/>')}
  ];
  /* words the changelog may use for a type */
  var ALIAS={features:'feature',"new":'feature',fixes:'fix',fixed:'fix',design:'improve',improved:'improve',improvement:'improve'};
  var filter='all',model=null,uid=0;

  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function typeOf(id){for(var i=0;i<TYPES.length;i++)if(TYPES[i].id===id)return TYPES[i];return TYPES[0];}
  var CHEV='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var REDUCED=function(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;};

  /* ---------- parse ---------- */
  function parse(md){
    var out=[],ver=null,card=null,started=false;
    md.replace(/\r/g,'').split('\n').forEach(function(raw){
      var line=raw.trim();
      if(!started){if(/^## /.test(line))started=true;else return;}
      if(/^## /.test(line)){
        var p=line.slice(3).split(' · ');
        ver={version:(p[0]||'').trim(),date:(p.slice(1).join(' · ')||'').trim(),cards:[],milestone:'',intro:[]};
        out.push(ver);card=null;return;
      }
      if(!ver)return;
      /* lines between the version heading and its first card: "milestone: <title>" turns the version into a milestone banner,
         any other text is the banner's short intro */
      if(!card&&!/^### /.test(line)){
        if(!line)return;
        var ms=/^milestone:\s*(.+)$/i.exec(line);
        if(ms){ver.milestone=ms[1].trim();return;}
        if(!/^\[try:/i.test(line))ver.intro.push(line);
        return;
      }
      if(/^### /.test(line)){card={title:line.slice(4).trim(),note:[],type:'feature',before:'',after:''};ver.cards.push(card);return;}
      if(!card||!line)return;
      if(/^\[try:[^\]]*\]/i.test(line))return;                      /* old "[try:...]" switch lines are ignored */
      var ty=/^type:\s*(\S+)\s*$/i.exec(line);
      if(ty){var t=ty[1].toLowerCase();t=ALIAS[t]||t;card.type=typeOf(t).id;return;}
      var fl=/^\[flag:([a-z0-9-]+)\]\s*(.*)$/i.exec(line);                 /* "[flag:next] Try the new look": a switch for a preview */
      if(fl){card.flag={id:fl[1].toLowerCase(),label:(fl[2]||'Try it').trim()};return;}
      var m=/^!\[(before|after)\]\(([^)]+)\)$/i.exec(line);
      if(m){card[m[1].toLowerCase()]=m[2].trim();return;}
      card.note.push(line);
    });
    return out;
  }

  /* r3-nav: this page does not load studio.js, so it keeps a one-layer back step of its own: Back closes the screenshot first */
  var Nv=(window.Studio&&Studio.nav)||(function(){var fn=null,skip=0;
    addEventListener('popstate',function(){if(skip){skip--;return;}var f=fn;fn=null;if(f)f();});
    return{push:function(k,f){if(fn)return;fn=f;try{history.pushState({wn:1},'');}catch(_){}},drop:function(){if(!fn)return;fn=null;skip++;try{history.back();}catch(_){skip--;}}};})();
  /* ---------- screenshot dialog ---------- */
  function open(src,alt){
    big.src=src;big.alt=alt||'';
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
    Nv.push('wnShot',function(){closeDlg();});   /* r3-nav: Back closes the screenshot */
  }
  function closeDlg(){if(dlg.close)dlg.close();else dlg.removeAttribute('open');}
  closeBtn.addEventListener('click',closeDlg);
  dlg.addEventListener('click',function(e){if(e.target===dlg)closeDlg();});
  dlg.addEventListener('close',function(){big.removeAttribute('src');Nv.drop('wnShot');});


  function fig(kind,src,title){
    var f=el('figure','wn-fig '+kind);
    f.appendChild(el('figcaption',null,kind==='before'?'Before':'After'));
    var b=el('button','wn-shot');b.type='button';
    b.setAttribute('aria-label','Open '+kind+' screenshot: '+title);
    var img=el('img');img.loading='lazy';img.decoding='async';img.alt=kind+' screenshot: '+title;
    img.addEventListener('error',function(){
      f.hidden=true;
      var grid=f.parentNode;
      if(grid){var vis=grid.querySelectorAll('.wn-fig:not([hidden])').length;
        grid.classList.toggle('two',vis>1);if(!vis)grid.hidden=true;}
    });
    img.src=src;                      /* a row builds its body only when opened, so nothing downloads for closed rows */
    b.appendChild(img);
    b.addEventListener('click',function(){open(src,img.alt);});
    f.appendChild(b);return f;
  }

  /* ---------- building blocks ---------- */
  /* a note: plain text, with **words** in bold (never HTML from the file) */
  function rich(t,cls){var p=el('p',cls||null);p.setAttribute('dir','auto');String(t).split(/\*\*(.+?)\*\*/).forEach(function(part,i){if(!part)return;p.appendChild(i%2?el('b',null,part):document.createTextNode(part));});return p;}
  function chevron(){var c=el('span','wn-chev');c.innerHTML=CHEV;return c;}

  /* one change: its title, its note, the preview switch and the screenshots (before and after side by side), all visible */
  function lineEl(c){
    var li=el('li','wn-line');li.setAttribute('data-type',c.type);
    var t=el('h4','wn-lt',c.title);t.setAttribute('dir','auto');li.appendChild(t);
    if(c.note.length)li.appendChild(rich(c.note.join(' '),'wn-ln'));
    if(c.flag)li.appendChild(flagRow(c.flag));
    if(c.before||c.after){
      var g=el('div','wn-shots'+(c.before&&c.after?' two':''));
      if(c.before)g.appendChild(fig('before',c.before,c.title));
      if(c.after)g.appendChild(fig('after',c.after,c.title));
      li.appendChild(g);
    }
    return li;
  }
  /* a preview switch: per device, the same key Settings → Previews uses (studio:flag:<id>) */
  function flagOn(id){try{return localStorage.getItem('studio:flag:'+id)==='1';}catch(e){return false;}}
  function flagRow(f){
    var row=el('label','wn-prev');
    var txt=el('span','wn-prevtxt');txt.appendChild(el('b',null,f.label));
    var sub=el('small',null,'');txt.appendChild(sub);row.appendChild(txt);
    var sw=el('input','switch');sw.type='checkbox';sw.setAttribute('role','switch');sw.checked=flagOn(f.id);row.appendChild(sw);
    var go=el('a','wn-prevgo','Open Studio');go.href='index.html';
    var wrap=el('div','wn-prevbox');wrap.appendChild(row);wrap.appendChild(go);
    function paint(){sub.textContent=sw.checked?'On for this device. Switch it off any time, here or in Settings.':'A preview: off until you switch it on. Only this device changes.';go.hidden=!sw.checked;}
    sw.addEventListener('change',function(){try{if(sw.checked)localStorage.setItem('studio:flag:'+f.id,'1');else localStorage.removeItem('studio:flag:'+f.id);}catch(e){sw.checked=false;}paint();});
    paint();return wrap;
  }

  function plural(n){return n+(n===1?' change':' changes');}
  /* the one-line summary of a version: its lead line, else its titles joined */
  function summary(v){
    if(v.intro.length)return v.intro.join(' ').replace(/\*\*/g,'');
    return v.cards.map(function(c){return c.title;}).join(' · ');
  }

  /* ---------- render ---------- */
  /* the changes of one version, grouped New / Improved / Fixed with an icon heading; every change is registered on the version's record for the filter */
  function groupsEl(rec){
    var v=rec.v,wrap=el('div','wn-groups');
    TYPES.forEach(function(t){
      var cs=v.cards.filter(function(c){return c.type===t.id;});
      if(!cs.length)return;
      var sec=el('section','wn-grp');sec.setAttribute('data-type',t.id);
      var h=el('h3','wn-gh');var ic=el('span','wn-gi');ic.innerHTML=t.icon;h.appendChild(ic);h.appendChild(el('span',null,t.label));
      var n=el('span','wn-gn');h.appendChild(n);sec.appendChild(h);
      var ul=el('ul','wn-ul'),recs=[];
      cs.forEach(function(c){var li=lineEl(c);ul.appendChild(li);recs.push({el:li,type:c.type});});
      sec.appendChild(ul);wrap.appendChild(sec);
      rec.secs.push({el:sec,recs:recs,n:n});
      rec.lines=rec.lines.concat(recs);
    });
    return wrap;
  }
  function matches(c){return filter==='all'||c.type===filter;}
  /* "3 new · 2 fixed" chips for the changes of a version that are showing (counted from the data, so a closed row is right too) */
  function paintChips(box,cards){
    box.textContent='';
    TYPES.forEach(function(t){
      var n=cards.filter(function(c){return c.type===t.id&&matches(c);}).length;
      if(n){var c=el('span','wn-cc',n+' '+t.chip);c.setAttribute('data-type',t.id);box.appendChild(c);}
    });
  }
  /* milestone banner (big version number, title, short intro); the newest version gets the larger one with the "Latest" badge */
  function banner(v,latest){
    var mb=el('div','wn-msban'),mn=/^(\d+\.\d+)/.exec(v.version);
    var mrow=el('div','wn-msrow');mrow.appendChild(el('span','wn-badge wn-msbadge',(latest?'Latest · ':'Milestone · ')+v.version));if(v.date)mrow.appendChild(el('span','wn-msdate',v.date));mb.appendChild(mrow);
    var bigN=el('span','wn-msnum',mn?mn[1]:v.version);bigN.setAttribute('aria-hidden','true');mb.appendChild(bigN);
    var spark=el('span','wn-msspark');spark.setAttribute('aria-hidden','true');spark.innerHTML='<i></i><i></i><i></i><i></i><i></i>';mb.appendChild(spark);
    var mh=el(latest?'h2':'p','wn-mst',v.milestone);if(latest)mh.id='wnLatestH';mb.appendChild(mh);
    if(v.intro.length)mb.appendChild(rich(v.intro.join(' '),'wn-msintro'));
    return mb;
  }
  /* an older version's body: built on its first open, then kept */
  function buildRow(rec){
    if(rec.built)return;rec.built=true;
    if(rec.v.milestone)rec.xi.appendChild(banner(rec.v,false));
    rec.xi.appendChild(groupsEl(rec));
    applyRow(rec);
  }
  function applyRow(rec){
    if(!rec.built)return;
    rec.lines.forEach(function(r){r.el.hidden=!(filter==='all'||r.type===filter);});
    rec.secs.forEach(function(s){var k=s.recs.filter(function(r){return !r.el.hidden;}).length;s.el.hidden=!k;s.n.textContent=String(k);});
  }
  function setRow(rec,on){
    if(!rec.btn)return;
    if(on)buildRow(rec);
    rec.btn.setAttribute('aria-expanded',on?'true':'false');
    if(on)void rec.panel.offsetHeight;            /* the body is new: let it settle at 0fr so it animates open */
    rec.panel.classList.toggle('open',on);rec.el.classList.toggle('is-open',on);
  }

  function render(vers){
    filter='all';
    model={vers:[],byId:{},sech:null,total:0};
    list.textContent='';
    var idx=0;
    function enter(e){e.classList.add('wn-a');e.style.setProperty('--i',Math.min(idx++,6));return e;}
    vers.forEach(function(v){model.total+=v.cards.length;});

    /* the latest version: one hero card, fully open */
    var latest=vers[0];
    var hero=enter(el('section','wn-latest'+(latest.milestone?' wn-ms':'')));hero.setAttribute('aria-labelledby','wnLatestH');hero.id='v-'+latest.version;
    var hrec={v:latest,el:hero,secs:[],lines:[],built:true,hero:true};
    if(latest.milestone)hero.appendChild(banner(latest,true));
    else {
      var lh=el('div','wn-lhead');
      var badge=el('h2','wn-badge','Latest · '+latest.version);badge.id='wnLatestH';
      lh.appendChild(badge);if(latest.date)lh.appendChild(el('span','wn-date',latest.date));
      hero.appendChild(lh);
      var sm=summary(latest);if(sm)hero.appendChild(rich(sm,'wn-lintro'));
    }
    hero.appendChild(groupsEl(hrec));
    model.vers.push(hrec);model.byId[hero.id]=hrec;list.appendChild(hero);

    /* older versions: one row each; the body is built when the row is first opened */
    var older=vers.slice(1);
    if(older.length){
      var sech=enter(el('h2','wn-sech','Earlier versions'));model.sech=sech;list.appendChild(sech);
      var wrap=el('div','wn-rows');
      older.forEach(function(v){
        var vr=el('div','wn-ver'+(v.milestone?' wn-vms':''));vr.id='v-'+v.version;
        var rec={v:v,el:vr,secs:[],lines:[],built:false};
        var vb=el('button','wn-vbtn');vb.type='button';
        var top=el('span','wn-vtop');
        top.appendChild(el('span','wn-vnum',v.version));
        if(v.date)top.appendChild(el('span','wn-vdate',v.date));
        var sl=el('span','wn-vsum',(v.milestone?v.milestone+'. ':'')+summary(v));sl.setAttribute('dir','auto');
        var chipBox=el('span','wn-vchips');
        var col=el('span','wn-vcol');col.appendChild(top);col.appendChild(sl);col.appendChild(chipBox);
        vb.appendChild(col);vb.appendChild(chevron());vr.appendChild(vb);
        var w=el('div','wn-x'),xi=el('div','wn-xi');w.id='wnx'+(++uid);w.appendChild(xi);vr.appendChild(w);
        vb.setAttribute('aria-controls',w.id);vb.setAttribute('aria-expanded','false');
        rec.btn=vb;rec.panel=w;rec.xi=xi;rec.chips=chipBox;
        vb.addEventListener('click',function(){setRow(rec,vb.getAttribute('aria-expanded')!=='true');});
        model.vers.push(rec);model.byId[vr.id]=rec;wrap.appendChild(vr);
      });
      list.appendChild(wrap);
    }
    buildChips();
    apply();
    sizeBar();
    foot.textContent='Studio '+latest.version;foot.hidden=false;
    try{localStorage.setItem('studio:seenVersion',JSON.stringify(latest.version));}catch(e){}
    openHash();
  }

  /* ---------- deep links ---------- */
  /* r6-whatsnew: the Jump to bar and the All versions sheet are gone; the rows are the list, and #v-<version> links still work */
  /* the sticky filter bar's height, so a link lands just under it */
  function sizeBar(){document.documentElement.style.setProperty('--wnf',filtersBox.offsetHeight+'px');}
  addEventListener('resize',sizeBar);
  function goTo(id){
    var rec=model&&model.byId[id];if(!rec)return;
    if(filter!=='all')setFilter('all');            /* a filtered-out version would be hidden */
    setRow(rec,true);
    setTimeout(function(){rec.el.scrollIntoView({block:'start',behavior:REDUCED()?'auto':'smooth'});},40);
  }
  /* a link such as whats-new.html#v-2.3.0 opens that version and scrolls to it */
  function openHash(){
    var id=decodeURIComponent((location.hash||'').slice(1));if(!/^v-/.test(id)||!model)return;
    goTo(id);
  }
  addEventListener('hashchange',openHash);

  /* ---------- filters ---------- */
  function buildChips(){
    chips.textContent='';
    var all=[{id:'all',label:'All',n:model.total}];
    TYPES.forEach(function(t){var n=0;model.vers.forEach(function(r){n+=r.v.cards.filter(function(c){return c.type===t.id;}).length;});all.push({id:t.id,label:t.label,n:n});});
    all.forEach(function(t){
      if(t.id!=='all'&&!t.n)return;                                  /* nothing of this kind yet: no chip */
      var b=el('button','wn-f');b.type='button';b.setAttribute('data-filter',t.id);
      b.setAttribute('aria-pressed',t.id===filter?'true':'false');
      b.appendChild(el('span',null,t.label));b.appendChild(el('b',null,String(t.n)));
      b.addEventListener('click',function(){setFilter(t.id);});
      chips.appendChild(b);
    });
    filtersBox.hidden=false;
  }
  function apply(){
    var n=0,anyOlder=false;
    model.vers.forEach(function(r){
      var k=r.v.cards.filter(matches).length;n+=k;
      r.el.hidden=!k;
      if(!r.hero){paintChips(r.chips,r.v.cards);if(k)anyOlder=true;}
      applyRow(r);
    });
    if(model.sech)model.sech.hidden=!anyOlder;
    emptyBox.hidden=n>0;
    status.textContent=filter==='all'?'Showing all '+plural(n):'Showing '+plural(n)+': '+typeOf(filter).label;
  }
  function setFilter(id){
    if(id===filter||!model)return;
    filter=id;
    Array.prototype.forEach.call(chips.children,function(b){b.setAttribute('aria-pressed',b.getAttribute('data-filter')===id?'true':'false');});
    apply();sizeBar();
    /* keep the reader at the top of the (now shorter or longer) list */
    var y=list.getBoundingClientRect().top+window.pageYOffset-filtersBox.offsetHeight-8;
    if(window.pageYOffset>y)window.scrollTo(0,Math.max(0,y));
  }
  /* an entrance animation plays once; drop its class so showing a hidden row again does not replay it */
  document.addEventListener('animationend',function(e){if(e.target.classList&&e.target.classList.contains('wn-a'))e.target.classList.remove('wn-a');});

  /* ---------- states ---------- */
  function skeleton(){
    foot.hidden=true;filtersBox.hidden=true;status.textContent='';list.textContent='';
    list.appendChild(el('div','wn-skel big'));
    for(var i=0;i<2;i++)list.appendChild(el('div','wn-skel row'));
  }
  function error(){
    filtersBox.hidden=true;foot.hidden=true;list.textContent='';
    var box=el('div','wn-err');
    box.appendChild(el('p',null,"Couldn't load what's new. Check your connection and try again."));
    var b=el('button','mini solid','Retry');b.type='button';b.addEventListener('click',load);
    box.appendChild(b);list.appendChild(box);
  }

  function load(){
    skeleton();
    fetch('studio-notes/changelog.md',{cache:'no-cache'}).then(function(r){
      if(!r.ok)throw new Error('http '+r.status);return r.text();
    }).then(function(t){
      var v=parse(t);if(!v.length)throw new Error('empty');render(v);
    }).catch(error);
  }
  /* r6-nav: the Back link (data-back, assets/back.js) returns to the page the person came from */
  load();
})();
