(function(){
  'use strict';
  /* the Fresh look preview (per device, off by default) applies here too; a card line "[try:fresh] label" shows a switch for it */
  var LOOK='studio:look';
  function isFresh(){try{return localStorage.getItem(LOOK)==='"fresh"';}catch(e){return false;}}
  function applyLook(){var r=document.documentElement;if(isFresh()){r.dataset.look='fresh';if(!document.getElementById('vtStyle')){var st=document.createElement('style');st.id='vtStyle';st.textContent='@view-transition{navigation:auto}';document.head.appendChild(st);}}else{delete r.dataset.look;var o=document.getElementById('vtStyle');if(o)o.remove();}}
  applyLook();
  var list=document.getElementById('wnList'),foot=document.getElementById('wnFoot'),
      dlg=document.getElementById('wnDlg'),big=document.getElementById('wnBig'),
      closeBtn=document.getElementById('wnClose');

  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}

  function parse(md){
    var out=[],ver=null,card=null,started=false;
    md.replace(/\r/g,'').split('\n').forEach(function(raw){
      var line=raw.trim();
      if(!started){if(/^## /.test(line))started=true;else return;}
      if(/^## /.test(line)){
        var p=line.slice(3).split(' · ');
        ver={version:(p[0]||'').trim(),date:(p.slice(1).join(' · ')||'').trim(),cards:[]};
        out.push(ver);card=null;return;
      }
      if(!ver)return;
      if(/^### /.test(line)){card={title:line.slice(4).trim(),note:[],before:'',after:'',tryLook:''};ver.cards.push(card);return;}
      if(!card||!line)return;
      var t=/^\[try:fresh\]\s*(.*)$/.exec(line);
      if(t){card.tryLook=t[1]||'Try it on this device';return;}
      var m=/^!\[(before|after)\]\(([^)]+)\)$/i.exec(line);
      if(m){card[m[1].toLowerCase()]=m[2].trim();return;}
      card.note.push(line);
    });
    return out;
  }

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

  /* a switch that turns the Fresh look on or off on this device, right away */
  function trySwitch(label){
    var row=el('label','wn-try');
    var txt=el('span','wn-try-txt');txt.appendChild(el('b',null,label));txt.appendChild(el('span',null,'Only on this device. Turn it off here any time.'));
    var sw=document.createElement('input');sw.type='checkbox';sw.className='switch';sw.id='wnTryFresh';sw.checked=isFresh();
    sw.addEventListener('change',function(){
      try{if(sw.checked)localStorage.setItem(LOOK,'"fresh"');else localStorage.removeItem(LOOK);}catch(e){}
      applyLook();
      try{if(sw.checked&&navigator.vibrate)navigator.vibrate(8);}catch(e){}
    });
    row.appendChild(txt);row.appendChild(sw);return row;
  }

  var idx=0;
  function render(vers){
    list.textContent='';
    vers.forEach(function(v,vi){
      var sec=el('section','wn-ver'+(vi===0?' new':''));
      var head=el('div','wn-vhead');head.style.setProperty('--i',idx++);
      head.appendChild(el('span','wn-chip',v.version));
      if(v.date)head.appendChild(el('span','wn-date',v.date));
      sec.appendChild(head);
      var cards=el('div','wn-cards');
      v.cards.forEach(function(c){
        var card=el('article','wn-card');card.style.setProperty('--i',idx++);
        card.appendChild(el('h2',null,c.title));
        if(c.note.length)card.appendChild(el('p',null,c.note.join(' ')));
        if(c.tryLook)card.appendChild(trySwitch(c.tryLook));
        if(c.before||c.after){
          var g=el('div','wn-shots'+(c.before&&c.after?' two':''));
          if(c.before)g.appendChild(fig('before',c.before,c.title));
          if(c.after)g.appendChild(fig('after',c.after,c.title));
          card.appendChild(g);
        }
        cards.appendChild(card);
      });
      sec.appendChild(cards);list.appendChild(sec);
    });
    if(vers.length){
      foot.textContent='Studio '+vers[0].version;foot.hidden=false;
      try{localStorage.setItem('studio:seenVersion',JSON.stringify(vers[0].version));}catch(e){}
    }
  }

  function skeleton(){
    foot.hidden=true;list.textContent='';
    for(var i=0;i<3;i++)list.appendChild(el('div','wn-skel'));
  }
  function error(){
    list.textContent='';
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
      var v=parse(t);if(!v.length)throw new Error('empty');idx=0;render(v);
    }).catch(error);
  }
  load();
})();
