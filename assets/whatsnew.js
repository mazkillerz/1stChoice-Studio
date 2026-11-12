(function(){
  'use strict';
  /* What's new page. Reads studio-notes/changelog.md (format: see the intro of that file).
     The newest version is a hero card (version, date, summary, its changes grouped New / Improved / Fixed). Older versions are closed rows
     (version, date, one-line summary, count chips) inside closed blocks of five minor versions. Each change is one line; tap it for the note and screenshots.
     Filter chips (All / New / Improved / Fixed) hide the lines that do not match. Nothing is stored except the "seen" mark. */
  var list=document.getElementById('wnList'),foot=document.getElementById('wnFoot'),
      dlg=document.getElementById('wnDlg'),big=document.getElementById('wnBig'),
      closeBtn=document.getElementById('wnClose'),
      filtersBox=document.getElementById('wnFilters'),chips=document.getElementById('wnChips'),
      status=document.getElementById('wnStatus');
  var BLOCK=5;                         /* minor versions per block: 0.1 to 0.5, 0.6 to 0.10, ... */
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
    img.setAttribute('data-src',src);
    b.appendChild(img);
    b.addEventListener('click',function(){open(src,img.alt);});
    f.appendChild(b);return f;
  }

  /* ---------- building blocks ---------- */
  /* a note: plain text, with **words** in bold (never HTML from the file) */
  function rich(t,cls){var p=el('p',cls||null);p.setAttribute('dir','auto');String(t).split(/\*\*(.+?)\*\*/).forEach(function(part,i){if(!part)return;p.appendChild(i%2?el('b',null,part):document.createTextNode(part));});return p;}
  /* an expanding panel: grid rows 0fr to 1fr, so it opens smoothly at any height */
  function panel(inner){var w=el('div','wn-x');w.id='wnx'+(++uid);var i=el('div','wn-xi');i.appendChild(inner);w.appendChild(i);return w;}
  /* pictures wait (data-src) until every panel around them is open, so closed rows download nothing */
  function wake(root){Array.prototype.forEach.call(root.querySelectorAll('img[data-src]'),function(i){if(i.closest('.wn-x:not(.open)'))return;i.src=i.getAttribute('data-src');i.removeAttribute('data-src');});}
  function setOpen(btn,w,on){btn.setAttribute('aria-expanded',on?'true':'false');w.classList.toggle('open',on);if(on)wake(w);}
  function toggler(btn,w,after){btn.setAttribute('aria-controls',w.id);btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',function(){var on=btn.getAttribute('aria-expanded')!=='true';setOpen(btn,w,on);if(after)after(on);});}
  function chevron(){var c=el('span','wn-chev');c.innerHTML=CHEV;return c;}

  /* one change = one line (its title); the note, the preview switch and the screenshots open under it */
  function lineEl(c){
    var li=el('li','wn-line');li.setAttribute('data-type',c.type);
    var shot=c.after||c.before,hasMore=c.note.length||c.flag||c.before||c.after;
    var head=hasMore?el('button','wn-lbtn'):el('div','wn-lbtn');
    if(hasMore)head.type='button';
    var t=el('span','wn-lt',c.title);t.setAttribute('dir','auto');head.appendChild(t);
    if(shot){var th=el('img','wn-th');th.loading='lazy';th.decoding='async';th.alt='';th.setAttribute('data-src',shot);th.addEventListener('error',function(){th.remove();});head.appendChild(th);}
    if(hasMore)head.appendChild(chevron());
    li.appendChild(head);
    if(hasMore){
      var body=el('div','wn-lbody');
      if(c.note.length)body.appendChild(rich(c.note.join(' ')));
      if(c.flag)body.appendChild(flagRow(c.flag));
      if(c.before||c.after){
        var g=el('div','wn-shots'+(c.before&&c.after?' two':''));
        if(c.before)g.appendChild(fig('before',c.before,c.title));
        if(c.after)g.appendChild(fig('after',c.after,c.title));
        body.appendChild(g);
      }
      var w=panel(body);li.appendChild(w);toggler(head,w);
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

  function parts(ver){var m=/^(\d+)\.(\d+)/.exec(ver);return m?{major:+m[1],minor:+m[2]}:null;}
  function groupVersions(older){
    var map={},order=[];
    older.forEach(function(v,i){
      var p=parts(v.version),key=p?p.major+':'+Math.floor(Math.max(p.minor-1,0)/BLOCK):'v'+i;
      var g=map[key];
      if(!g){g=map[key]={major:p?p.major:null,minors:[],versions:[],name:p?'':v.version};order.push(g);}
      g.versions.push(v);if(p)g.minors.push(p.minor);
    });
    return order;
  }
  function groupLabel(g){
    if(g.name)return g.name;
    var lo=Math.min.apply(null,g.minors),hi=Math.max.apply(null,g.minors);
    return g.major+'.'+lo+(hi>lo?' – '+g.major+'.'+hi:'');
  }
  function groupDate(g){
    var newest=g.versions[0].date,oldest=g.versions[g.versions.length-1].date;
    return newest&&oldest&&newest!==oldest?oldest+' – '+newest:(newest||oldest||'');
  }
  function plural(n){return n+(n===1?' change':' changes');}
  /* the one-line summary of a version: its lead line, else its titles joined */
  function summary(v){
    if(v.intro.length)return v.intro.join(' ').replace(/\*\*/g,'');
    return v.cards.map(function(c){return c.title;}).join(' · ');
  }

  /* ---------- render ---------- */
  /* the changes of one version, grouped New / Improved / Fixed with an icon heading; every line is registered in the model for the filter */
  function groupsEl(v,level,bucket){
    var wrap=el('div','wn-groups');
    TYPES.forEach(function(t){
      var cs=v.cards.filter(function(c){return c.type===t.id;});
      if(!cs.length)return;
      var sec=el('section','wn-grp');sec.setAttribute('data-type',t.id);
      var h=el(level,'wn-gh');var ic=el('span','wn-gi');ic.innerHTML=t.icon;h.appendChild(ic);h.appendChild(el('span',null,t.label));
      var n=el('span','wn-gn');h.appendChild(n);sec.appendChild(h);
      var ul=el('ul','wn-ul'),recs=[];
      cs.forEach(function(c){var li=lineEl(c);ul.appendChild(li);var rec={el:li,type:c.type};recs.push(rec);model.cards.push(rec);bucket.push(rec);});
      sec.appendChild(ul);wrap.appendChild(sec);
      model.sections.push({el:sec,recs:recs,n:n});
    });
    return wrap;
  }
  /* "3 new · 2 fixed" chips for the lines of a version that are showing */
  function paintChips(box,recs){
    box.textContent='';
    TYPES.forEach(function(t){
      var n=recs.filter(function(r){return r.type===t.id&&!r.el.hidden;}).length;
      if(n){var c=el('span','wn-cc',n+' '+t.chip);c.setAttribute('data-type',t.id);box.appendChild(c);}
    });
  }

  function render(vers){
    filter='all';
    model={cards:[],sections:[],versions:[],blocks:[],hero:null,heroCards:[],sech:null};
    list.textContent='';
    var idx=0;
    function enter(e){e.classList.add('wn-a');e.style.setProperty('--i',Math.min(idx++,6));return e;}

    /* the latest version: one hero card */
    var latest=vers[0];
    var hero=enter(el('section','wn-latest'+(latest.milestone?' wn-ms':'')));hero.setAttribute('aria-labelledby','wnLatestH');hero.id='v-'+latest.version;
    if(latest.milestone){
      /* a milestone (e.g. 1.0.0): a banner with the big version number, a title and a short intro, above the changes */
      var mb=el('div','wn-msban'),mn=/^(\d+\.\d+)/.exec(latest.version);
      var mrow=el('div','wn-msrow');mrow.appendChild(el('span','wn-badge wn-msbadge','Latest · '+latest.version));if(latest.date)mrow.appendChild(el('span','wn-msdate',latest.date));mb.appendChild(mrow);
      var bigN=el('span','wn-msnum',mn?mn[1]:latest.version);bigN.setAttribute('aria-hidden','true');mb.appendChild(bigN);
      var spark=el('span','wn-msspark');spark.setAttribute('aria-hidden','true');spark.innerHTML='<i></i><i></i><i></i><i></i><i></i>';mb.appendChild(spark);
      var mh=el('h2','wn-mst',latest.milestone);mh.id='wnLatestH';mb.appendChild(mh);
      if(latest.intro.length)mb.appendChild(rich(latest.intro.join(' '),'wn-msintro'));
      hero.appendChild(mb);
    } else {
      var lh=el('div','wn-lhead');
      var badge=el('h2','wn-badge','Latest · '+latest.version);badge.id='wnLatestH';
      lh.appendChild(badge);if(latest.date)lh.appendChild(el('span','wn-date',latest.date));
      hero.appendChild(lh);
      var sm=summary(latest);if(sm)hero.appendChild(rich(sm,'wn-lintro'));
    }
    hero.appendChild(groupsEl(latest,'h3',model.heroCards));
    model.hero=hero;list.appendChild(hero);wake(hero);

    /* older versions: closed blocks of five minor versions, each version a closed row */
    var older=vers.slice(1);
    if(older.length){
      var sech=enter(el('h2','wn-sech','Earlier versions'));model.sech=sech;list.appendChild(sech);
      var wrap=el('div','wn-blocks');
      groupVersions(older).forEach(function(g){
        var box=enter(el('div','wn-block'));
        var bb=el('button','wn-bbtn');bb.type='button';
        var txt=el('span','wn-gtxt');
        txt.appendChild(el('span','wn-glab',groupLabel(g)));
        var meta=el('span','wn-gmeta'),d=groupDate(g),count=el('span','wn-gcount');
        if(d){meta.appendChild(el('span',null,d));meta.appendChild(el('span','wn-sep','·'));}
        meta.appendChild(count);txt.appendChild(meta);
        bb.appendChild(txt);bb.appendChild(chevron());box.appendChild(bb);
        var inner=el('div','wn-bbody'),rec={el:box,btn:bb,count:count,cards:[],versions:[],was:undefined};
        g.versions.forEach(function(v){
          var vr=el('div','wn-ver'+(v.milestone?' wn-vms':''));vr.id='v-'+v.version;
          var vb=el('button','wn-vbtn');vb.type='button';
          var top=el('span','wn-vtop');
          top.appendChild(el('span','wn-vnum',v.version));
          if(v.date)top.appendChild(el('span','wn-vdate',v.date));
          vb.appendChild(top);
          var sm2=(v.milestone?v.milestone+'. ':'')+summary(v);
          var sl=el('span','wn-vsum',sm2);sl.setAttribute('dir','auto');
          var chipBox=el('span','wn-vchips');
          var col=el('span','wn-vcol');col.appendChild(top);col.appendChild(sl);col.appendChild(chipBox);
          vb.textContent='';vb.appendChild(col);vb.appendChild(chevron());vr.appendChild(vb);
          var vcards=[];
          var gw=groupsEl(v,'h4',vcards);
          var pw=panel(gw);vr.appendChild(pw);toggler(vb,pw);
          var vrec={el:vr,btn:vb,wrap:pw,cards:vcards,chips:chipBox};
          model.versions.push(vrec);rec.versions.push(vrec);vcards.forEach(function(x){rec.cards.push(x);});
          inner.appendChild(vr);
        });
        var bw=panel(inner);box.appendChild(bw);rec.wrap=bw;toggler(bb,bw);
        model.blocks.push(rec);wrap.appendChild(box);
      });
      list.appendChild(wrap);
    }
    buildChips();
    apply();
    foot.textContent='Studio '+latest.version;foot.hidden=false;
    try{localStorage.setItem('studio:seenVersion',JSON.stringify(latest.version));}catch(e){}
    openHash();
  }
  /* a link such as whats-new.html#v-2.3.0 opens that version (and its block) and scrolls to it */
  function openHash(){
    var id=decodeURIComponent((location.hash||'').slice(1));if(!/^v-/.test(id)||!model)return;
    var t=document.getElementById(id);if(!t)return;
    model.blocks.forEach(function(b){if(b.el.contains(t))setOpen(b.btn,b.wrap,true);});
    model.versions.forEach(function(v){if(v.el===t)setOpen(v.btn,v.wrap,true);});
    setTimeout(function(){t.scrollIntoView({block:'start',behavior:REDUCED()?'auto':'smooth'});},60);
  }
  addEventListener('hashchange',openHash);

  /* ---------- filters ---------- */
  function buildChips(){
    chips.textContent='';
    var all=[{id:'all',label:'All',n:model.cards.length}];
    TYPES.forEach(function(t){all.push({id:t.id,label:t.label,n:model.cards.filter(function(c){return c.type===t.id;}).length});});
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
  function shown(c){return !c.el.hidden;}
  function apply(){
    var n=0;
    model.cards.forEach(function(c){var on=filter==='all'||c.type===filter;c.el.hidden=!on;if(on)n++;});
    model.sections.forEach(function(s){var k=s.recs.filter(shown).length;s.el.hidden=!k;s.n.textContent=String(k);});
    model.versions.forEach(function(v){v.el.hidden=!v.cards.some(shown);paintChips(v.chips,v.cards);});
    model.blocks.forEach(function(g){
      var k=g.cards.filter(shown).length;
      g.el.hidden=!k;g.count.textContent=plural(k);
    });
    model.hero.hidden=!model.heroCards.some(shown);
    if(model.sech)model.sech.hidden=!model.blocks.some(function(g){return !g.el.hidden;});
    status.textContent=filter==='all'?'Showing all '+plural(n):'Showing '+plural(n)+': '+typeOf(filter).label;
  }
  function setFilter(id){
    if(id===filter||!model)return;
    var prev=filter;filter=id;
    Array.prototype.forEach.call(chips.children,function(b){b.setAttribute('aria-pressed',b.getAttribute('data-filter')===id?'true':'false');});
    if(prev==='all')model.blocks.forEach(function(g){g.was=g.btn.getAttribute('aria-expanded')==='true';});   /* remember what the reader had open */
    apply();
    model.blocks.forEach(function(g){
      if(id==='all'){if(g.was!==undefined)setOpen(g.btn,g.wrap,g.was);}
      else setOpen(g.btn,g.wrap,g.cards.some(shown));                    /* show the matches */
    });
    /* keep the reader at the top of the (now shorter or longer) list */
    var y=list.getBoundingClientRect().top+window.pageYOffset-filtersBox.offsetHeight-8;
    if(window.pageYOffset>y)window.scrollTo(0,Math.max(0,y));
  }
  /* an entrance animation plays once; drop its class so showing a hidden block again does not replay it */
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
  load();
})();
