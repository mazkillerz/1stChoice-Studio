(function(){
  'use strict';
  /* What's new page. Reads studio-notes/changelog.md (format: see the intro of that file).
     Newest version = one big highlight card; older versions = closed groups of five minor versions;
     filter chips (All / Features / Fixes / Design) hide the cards that do not match. Nothing is stored except the "seen" mark. */
  var list=document.getElementById('wnList'),foot=document.getElementById('wnFoot'),
      dlg=document.getElementById('wnDlg'),big=document.getElementById('wnBig'),
      closeBtn=document.getElementById('wnClose'),
      filtersBox=document.getElementById('wnFilters'),chips=document.getElementById('wnChips'),
      status=document.getElementById('wnStatus');
  var BLOCK=5;                         /* minor versions per group: 0.1 to 0.5, 0.6 to 0.10, ... */
  var TYPES=[{id:'feature',label:'Features',tag:'Feature'},{id:'fix',label:'Fixes',tag:'Fix'},{id:'design',label:'Design',tag:'Design'}];
  var ALIAS={features:'feature',fixes:'fix'};
  var filter='all',model=null;

  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function typeOf(id){for(var i=0;i<TYPES.length;i++)if(TYPES[i].id===id)return TYPES[i];return TYPES[0];}
  var CHEV='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

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
      if(ty){var t=ty[1].toLowerCase();t=ALIAS[t]||t;card.type=TYPES.some(function(x){return x.id===t;})?t:'feature';return;}
      var m=/^!\[(before|after)\]\(([^)]+)\)$/i.exec(line);
      if(m){card[m[1].toLowerCase()]=m[2].trim();return;}
      card.note.push(line);
    });
    return out;
  }

  /* ---------- screenshot dialog ---------- */
  function open(src,alt){
    big.src=src;big.alt=alt||'';
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
  }
  function closeDlg(){if(dlg.close)dlg.close();else dlg.removeAttribute('open');}
  closeBtn.addEventListener('click',closeDlg);
  dlg.addEventListener('click',function(e){if(e.target===dlg)closeDlg();});
  dlg.addEventListener('close',function(){big.removeAttribute('src');});

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
    img.src=src;
    b.appendChild(img);
    b.addEventListener('click',function(){open(src,img.alt);});
    f.appendChild(b);return f;
  }

  /* ---------- building blocks ---------- */
  /* a note: plain text, with **words** in bold (never HTML from the file) */
  function rich(t,cls){var p=el('p',cls||null);String(t).split(/\*\*(.+?)\*\*/).forEach(function(part,i){if(!part)return;p.appendChild(i%2?el('b',null,part):document.createTextNode(part));});return p;}
  function cardEl(c,level){
    var card=el('article','wn-card');card.setAttribute('data-type',c.type);
    card.appendChild(el('span','wn-tag',typeOf(c.type).tag));
    card.appendChild(el(level,'wn-ct',c.title));
    if(c.note.length)card.appendChild(rich(c.note.join(' ')));
    if(c.before||c.after){
      var g=el('div','wn-shots'+(c.before&&c.after?' two':''));
      if(c.before)g.appendChild(fig('before',c.before,c.title));
      if(c.after)g.appendChild(fig('after',c.after,c.title));
      card.appendChild(g);
    }
    return card;
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
  function plural(n){return n+(n===1?' update':' updates');}

  /* ---------- render ---------- */
  function render(vers){
    filter='all';
    model={cards:[],blocks:[],groups:[],hero:null,heroCards:[],sech:null};
    list.textContent='';
    var idx=0;
    function enter(e){e.classList.add('wn-a');e.style.setProperty('--i',Math.min(idx++,8));return e;}
    function add(c,level,bucket){var e=cardEl(c,level);var rec={el:e,type:c.type};model.cards.push(rec);bucket.push(rec);return e;}

    /* the latest version: one big highlight card */
    var latest=vers[0];
    var hero=enter(el('section','wn-latest'+(latest.milestone?' wn-ms':'')));hero.setAttribute('aria-labelledby','wnLatestH');
    if(latest.milestone){
      /* a milestone (e.g. 1.0.0): a banner with the big version number, a title and a short intro, above the cards */
      var mb=el('div','wn-msban'),mn=/^(\d+\.\d+)/.exec(latest.version);
      var big=el('span','wn-msnum',mn?mn[1]:latest.version);big.setAttribute('aria-hidden','true');mb.appendChild(big);
      var spark=el('span','wn-msspark');spark.setAttribute('aria-hidden','true');spark.innerHTML='<i></i><i></i><i></i><i></i><i></i>';mb.appendChild(spark);
      var mh=el('h2','wn-mst',latest.milestone);mh.id='wnLatestH';mb.appendChild(mh);
      var meta=el('p','wn-msmeta','Studio '+latest.version+(latest.date?' · '+latest.date:''));mb.appendChild(meta);
      if(latest.intro.length)mb.appendChild(rich(latest.intro.join(' '),'wn-msintro'));
      hero.appendChild(mb);
    } else {
      var lh=el('div','wn-lhead');
      var badge=el('h2','wn-badge','Latest · '+latest.version);badge.id='wnLatestH';
      lh.appendChild(badge);if(latest.date)lh.appendChild(el('span','wn-date',latest.date));
      hero.appendChild(lh);
    }
    latest.cards.forEach(function(c){hero.appendChild(add(c,'h3',model.heroCards));});
    model.hero=hero;list.appendChild(hero);

    /* older versions: closed groups of five minor versions */
    var older=vers.slice(1);
    if(older.length){
      var sech=enter(el('h2','wn-sech','Earlier versions'));model.sech=sech;list.appendChild(sech);
      var wrap=el('div','wn-groups');
      groupVersions(older).forEach(function(g){
        var det=enter(el('details','wn-group'));
        var sum=el('summary','wn-gsum');
        var txt=el('span','wn-gtxt');
        txt.appendChild(el('span','wn-glab',groupLabel(g)));
        var meta=el('span','wn-gmeta'),d=groupDate(g),count=el('span','wn-gcount');
        if(d){meta.appendChild(el('span',null,d));meta.appendChild(el('span','wn-sep','·'));}
        meta.appendChild(count);txt.appendChild(meta);
        sum.appendChild(txt);
        var chev=el('span','wn-chev');chev.innerHTML=CHEV;sum.appendChild(chev);
        det.appendChild(sum);
        var body=el('div','wn-gbody'),rec={el:det,count:count,cards:[],blocks:[],was:undefined};
        g.versions.forEach(function(v){
          var blk=el('section','wn-gver'),bcards=[];
          var vh=el('div','wn-vhead');vh.appendChild(el('h3','wn-chip'+(v.milestone?' ms':''),v.version+(v.milestone?' · '+v.milestone:'')));if(v.date)vh.appendChild(el('span','wn-date',v.date));
          blk.appendChild(vh);
          v.cards.forEach(function(c){blk.appendChild(add(c,'h4',bcards));});
          bcards.forEach(function(x){rec.cards.push(x);});
          model.blocks.push({el:blk,cards:bcards});
          body.appendChild(blk);
        });
        det.appendChild(body);wrap.appendChild(det);model.groups.push(rec);
      });
      list.appendChild(wrap);
    }
    buildChips();
    apply();
    foot.textContent='Studio '+latest.version;foot.hidden=false;
    try{localStorage.setItem('studio:seenVersion',JSON.stringify(latest.version));}catch(e){}
  }

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
    model.blocks.forEach(function(b){b.el.hidden=!b.cards.some(shown);});
    model.groups.forEach(function(g){
      var k=g.cards.filter(shown).length;
      g.el.hidden=!k;g.count.textContent=plural(k);
    });
    model.hero.hidden=!model.heroCards.some(shown);
    if(model.sech)model.sech.hidden=!model.groups.some(function(g){return !g.el.hidden;});
    status.textContent=filter==='all'?'Showing all '+plural(n):'Showing '+plural(n)+': '+typeOf(filter).label;
  }
  function setFilter(id){
    if(id===filter||!model)return;
    var prev=filter;filter=id;
    Array.prototype.forEach.call(chips.children,function(b){b.setAttribute('aria-pressed',b.getAttribute('data-filter')===id?'true':'false');});
    if(prev==='all')model.groups.forEach(function(g){g.was=g.el.open;});   /* remember what the reader had open */
    apply();
    model.groups.forEach(function(g){
      if(id==='all'){if(g.was!==undefined)g.el.open=g.was;}
      else g.el.open=g.cards.some(shown);                                 /* show the matches */
    });
    /* keep the reader at the top of the (now shorter or longer) list */
    var y=list.getBoundingClientRect().top+window.pageYOffset-filtersBox.offsetHeight-8;
    if(window.pageYOffset>y)window.scrollTo(0,Math.max(0,y));
    list.classList.remove('wn-swap');void list.offsetWidth;list.classList.add('wn-swap');
    setTimeout(function(){list.classList.remove('wn-swap');},420);
  }
  /* an entrance animation plays once; drop its class so showing a hidden group again does not replay it */
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
