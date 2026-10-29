/* Templates library test (assets/templates.js + templates.css): the view module the hub fills with templates.
   Phone 390x844 (touch) in light AND dark, then desktop 1280x800, 360 wide, reduced motion, slow lists, empty lists.
   Run like tests/smoke.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. SHOTS=<dir> saves screenshots.
   Fonts: Google Fonts fail inside some sandboxes (a known false failure); with HTTPS_PROXY set the browser goes through it, NOPROXY=1 turns that off. */
import { chromium } from 'playwright';
import fs from 'fs';
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'';
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const t0=Date.now(), errs=[];
const proxy=process.env.HTTPS_PROXY&&!process.env.NOPROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined;
const b=await chromium.launch(proxy?{proxy}:{});
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });

/* ---- the fake hub data: ~14 templates over five categories (+ one empty "Seasonal"), mixed shapes, one without a picture, one with a picture that 404s ---- */
const T='assets/thumbs/1stchoice/';
const CATS=[{id:'all',label:'All'},{id:'restock',label:'Restock'},{id:'story',label:'Stories'},{id:'post',label:'Posts'},{id:'highlight',label:'Highlights'},{id:'seasonal',label:'Seasonal'},{id:'team',label:'Team'}];
const E=(id,cat,title,sub,thumb,shape,more)=>Object.assign({id,cat,title,sub,thumb:thumb?BASE+T+thumb:null,shape,href:'tools/'+cat+'.html?t='+id},more||{});
const ENTRIES=[
  E('r1','restock','Restock','Story · Classic','restock.jpg','story',{badge:'New'}),
  E('r2','restock','رجع متوفر','Story · Passion fruit','restock-sm.jpg','story'),
  E('r3','restock','وفرنا كمية جديدة','Post','offer.jpg','post'),
  E('r4','restock','Restock square','Square','restock.jpg','square'),
  E('s1','story','Photo story','Your photo, full screen','photo-story.jpg','story'),
  E('s2','story','Collage of three photos with a long title that must stay inside two lines','A sub line that is much too long to fit on one single line of the card','collage.jpg','story'),
  E('s3','story','Cinematic','No picture yet',null,'story'),
  E('s4','story','يسرسح ثلج','Story','split.jpg','story'),
  E('p1','post','Carousel cover','Post · 4:5','carousel.jpg','post'),
  E('p2','post','Offer','Post · 4:5','offer.jpg','post'),
  E('p3','post','Broken picture','The file is missing','assets/thumbs/does-not-exist.jpg','post'),
  E('h1','highlight','Highlight cover','Circle','highlight.jpg','circle'),
  E('h2','highlight','Create','Circle','create.jpg','circle'),
  E('h3','highlight','New place','Circle','new-place.jpg','circle')
];
ENTRIES.find(e=>e.id==='p3').thumb=BASE+'assets/thumbs/does-not-exist.jpg';

/* what runs inside the page: init the module the way the hub does, and a few measuring helpers */
const PAGE=({ENTRIES,CATS,mode,delay,noTeamNote})=>{
  window.__store={}; window.__sets=[]; window.__opened=null; window.__back=0; window.__signin=0; window.__extra=[]; window.__calls=0; window.__hap=[]; window.__mode=mode; window.__delay=delay;
  window.__init=()=>{
    const root=document.getElementById('tpRoot');
    window.__api=StudioTemplates.init({root,cats:CATS,
      entries:()=>{ window.__calls++; const l=ENTRIES.concat(window.__extra); return window.__mode==='async'?new Promise(r=>setTimeout(()=>r(l),window.__delay||400)):window.__mode==='empty'?[]:l; },
      onOpen:e=>{ window.__opened=e; return false; },
      onBack:()=>{ window.__back++; },
      teamNote:()=>noTeamNote?null:{text:'Sign in to see your team’s templates.',action:{label:'Sign in',run:()=>{ window.__signin++; }}},
      haptic:k=>window.__hap.push(k),
      store:(k,v)=>{ if(v===undefined) return k in window.__store?window.__store[k]:null; window.__store[k]=v; window.__sets.push([k,v]); },
      icons:{}});
    window.__api.show();
  };
  /* contrast of a list of selectors against the effective background */
  const parse=c=>{ let m=c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/); if(m) return [m[1]*255,m[2]*255,m[3]*255,m[4]===undefined?1:+m[4]]; m=c.match(/[\d.]+/g).map(Number); return [m[0],m[1],m[2],m.length>3?m[3]:1]; };
  const lum=([r,g,b])=>{ const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  const over=(top,bot)=>{ const a=top[3]; return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1]; };
  const effBg=el=>{ const ls=[]; for(let n=el;n;n=n.parentElement){ const c=parse(getComputedStyle(n).backgroundColor); if(c[3]>0) ls.push(c); if(c[3]>=1) break; } let base=[255,255,255,1]; for(let i=ls.length-1;i>=0;i--) base=over(ls[i],base); return base; };
  window.__contrast=sels=>{ const out=[]; sels.forEach(s=>document.querySelectorAll(s).forEach(el=>{ if(!el.getClientRects().length) return; const bg=effBg(el), fg=over(parse(getComputedStyle(el).color),bg); const l1=lum(fg), l2=lum(bg); out.push({s,r:(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05),txt:(el.textContent||'').trim().slice(0,24)}); })); return out; };
  window.__ids=()=>[...document.querySelectorAll('.tp-card')].map(a=>window.__api&&a.getAttribute('href').split('t=')[1]);
  window.__lefts=()=>{ const l=s=>{ const e=document.querySelector(s); return e?Math.round(e.getBoundingClientRect().left*10)/10:null; }; return {back:l('.tp-back'),h1:l('.tp-ttl'),chip:l('.tp-chip'),card:l('.tp-card')}; };
};
const BOOT=async(ctx,tag,cfg)=>{
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(tag+' console: '+m.text()); });
  await pg.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
  await pg.addStyleTag({url:BASE+'assets/templates.css'}); await pg.addScriptTag({url:BASE+'assets/templates.js'});
  await pg.addStyleTag({content:'body>*:not(#tpRoot){display:none!important}'});
  await pg.evaluate(()=>{ const s=document.createElement('section'); s.id='tpRoot'; document.body.appendChild(s); });
  await pg.evaluate(PAGE,Object.assign({ENTRIES,CATS,mode:'sync'},cfg||{}));
  await Promise.race([pg.evaluate(()=>document.fonts.ready),pg.waitForTimeout(4000)]);
  await pg.evaluate(()=>window.__init()); await pg.waitForTimeout(900);
  return pg;
};
const vis=(pg,s)=>pg.evaluate(s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'; },s);
const sizes=(pg,sel)=>pg.$$eval(sel,l=>l.map(e=>{ const r=e.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}; }));
const shot=async(pg,name,full)=>{ if(SHOTS) await pg.screenshot({path:SHOTS+'/'+name+'.png',fullPage:!!full}); };
const ratio=(pg,sel)=>pg.$eval(sel,e=>{ const r=e.getBoundingClientRect(); return r.height/r.width; });
const near=(a,b,t)=>Math.abs(a-b)<=b*t;
const CONTRAST=['.tp-ttl','.tp-count','.tp-lead','.tp-chip .tp-cl','.tp-chip .tp-cn','.tp-chip[aria-pressed="true"]','.tp-h span','.tp-t','.tp-s','.tp-badge','.tp-nt','.tp-na'];

/* ================= phone: 390x844, touch, light and dark ================= */
for(const scheme of ['light','dark']){
  const N=scheme+' phone: ';
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme,ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await BOOT(ctx,scheme);
  const url0=pg.url();

  /* 1. header, back button, chips with counts */
  const head=await pg.evaluate(()=>({h1:document.querySelector('h1.tp-ttl')&&document.querySelector('h1.tp-ttl').textContent,count:document.querySelector('.tp-count').textContent,lead:document.querySelector('.tp-lead').textContent,
    back:document.querySelector('.tp-back').getAttribute('aria-label'),chips:[...document.querySelectorAll('.tp-chip')].map(c=>c.querySelector('.tp-cl').textContent+(c.querySelector('.tp-cn')?' '+c.querySelector('.tp-cn').textContent:'')),
    pressed:[...document.querySelectorAll('.tp-chip')].filter(c=>c.getAttribute('aria-pressed')==='true').map(c=>c.dataset.id),fw:getComputedStyle(document.querySelector('.tp-ttl')).fontWeight}));
  ok(N+'header: title, count, one short line, labelled back button',head.h1==='Templates'&&head.count==='14 templates'&&/^Tap one to start\. Every word and photo can be changed\.$/.test(head.lead)&&head.back==='Back to home'&&head.fw==='600',head);
  ok(N+'chips show label + count; the empty Seasonal chip is hidden, Team stays',JSON.stringify(head.chips)===JSON.stringify(['All 14','Restock 4','Stories 4','Posts 3','Highlights 3','Team'])&&JSON.stringify(head.pressed)==='["all"]',head.chips);
  const bk=(await sizes(pg,'.tp-back'))[0];
  await pg.tap('.tp-back'); await pg.waitForTimeout(100);
  ok(N+'back button: 48px round, tapping it calls onBack',bk.w===48&&bk.h===48&&await pg.evaluate(()=>window.__back)===1&&(await pg.evaluate(()=>window.__hap)).includes('tick'),bk);

  /* 2. All: a section per non-empty category, in order (Team shows its note) */
  const secs=await pg.$$eval('.tp-sec .tp-h',h=>h.map(x=>x.textContent));
  ok(N+'All: one heading per non-empty category, in order, with counts',JSON.stringify(secs)===JSON.stringify(['Restock4','Stories4','Posts3','Highlights3','Team']),secs);
  const lefts=await pg.evaluate(()=>window.__lefts());
  ok(N+'back button, title, chips and grid share the left edge (16px)',lefts.back===16&&lefts.h1===16&&lefts.chip===16&&lefts.card===16,lefts);

  const mo=await pg.evaluate(()=>{ const c=document.querySelectorAll('.tp-card'); return {a:getComputedStyle(c[0]).animationName,fill:getComputedStyle(c[0]).animationFillMode,d1:getComputedStyle(c[1]).animationDelay,d9:parseFloat(getComputedStyle(c[9]).animationDelay),dur:parseFloat(getComputedStyle(c[0]).animationDuration)}; });
  ok(N+'cards rise in with a small stagger (fill-mode backwards)',mo.a==='tp-in'&&mo.fill==='backwards'&&mo.d1==='0.028s'&&mo.d9>mo.dur*0&&mo.d9<=0.4&&mo.dur<=.5,mo);

  /* 4. shapes */
  const rs=await pg.evaluate(()=>{ const r=s=>{ const e=document.querySelector(s); const b=e.getBoundingClientRect(); return b.height/b.width; }; return {story:r('.tp-frame.tp-story'),post:r('.tp-frame.tp-post'),square:r('.tp-frame.tp-square'),circle:r('.tp-frame.tp-circle'),
    r:getComputedStyle(document.querySelector('.tp-frame')).borderRadius,circ:(()=>{ const i=document.querySelector('.tp-circle .tp-img'); const f=i.parentNode.getBoundingClientRect(), a=i.getBoundingClientRect(); return {inset:Math.round((a.left-f.left)/f.width*100),round:getComputedStyle(i).borderRadius}; })()}; });
  ok(N+'frames: story 16/9, post 5/4, square 1, circle tile 1 with a round picture inset ~12%',near(rs.story,16/9,.03)&&near(rs.post,1.25,.03)&&near(rs.square,1,.03)&&near(rs.circle,1,.03)&&rs.r==='16px'&&rs.circ.inset>=10&&rs.circ.inset<=14&&rs.circ.round==='50%',rs);

  /* 5. columns */
  const cols=await pg.evaluate(()=>getComputedStyle(document.querySelector('.tp-grid')).gridTemplateColumns.split(' ').length);
  const tops=await pg.evaluate(()=>{ const c=[...document.querySelectorAll('.tp-sec')[0].querySelectorAll('.tp-card')].map(a=>a.getBoundingClientRect()); return {row1:[c[0].top,c[1].top],row2:[c[2].top,c[3].top],gap:Math.round(c[1].left-c[0].right)}; });
  ok(N+'2 columns at 390, gap 12px, mixed shapes align to the top of the row',cols===2&&tops.gap===12&&Math.abs(tops.row2[0]-tops.row2[1])<1&&tops.row2[0]>tops.row1[0],{cols,tops});

  /* 8. placeholder icon for thumb:null, no broken image */
  const noimg=await pg.evaluate(()=>{ const a=document.querySelector('.tp-card[href$="t=s3"]'), f=a.querySelector('.tp-frame'), ph=a.querySelector('.tp-ph svg'); const r=ph&&ph.getBoundingClientRect(), fr=f.getBoundingClientRect();
    return {none:f.classList.contains('tp-none'),img:!!a.querySelector('img'),icon:!!r&&r.width>=24&&r.height>=24,centered:!!r&&Math.abs((r.left+r.width/2)-(fr.left+fr.width/2))<2&&Math.abs((r.top+r.height/2)-(fr.top+fr.height/2))<2,text:a.textContent.trim()}; });
  ok(N+'a card without a picture shows the centred icon and no <img>',noimg.none&&!noimg.img&&noimg.icon&&noimg.centered,noimg);
  await pg.evaluate(()=>document.querySelector('.tp-card[href$="t=p3"]').scrollIntoView({block:'center'})); await pg.waitForTimeout(900);
  const broken=await pg.evaluate(()=>{ const a=document.querySelector('.tp-card[href$="t=p3"]'); return {none:a.querySelector('.tp-frame').classList.contains('tp-none'),img:!!a.querySelector('img'),wait:a.querySelector('.tp-frame').classList.contains('tp-wait'),
    any:[...document.querySelectorAll('.tp-img')].filter(i=>i.complete&&!i.naturalWidth).length}; });
  ok(N+'a picture that fails to load falls back to the icon (no broken image left)',broken.none&&!broken.img&&!broken.wait&&broken.any===0,broken);
  await pg.evaluate(()=>window.scrollTo(0,0));
  const loaded=await pg.evaluate(()=>{ const i=document.querySelector('.tp-card[href$="t=r1"] .tp-img'); return {on:i.classList.contains('on'),op:getComputedStyle(i).opacity,wait:i.parentNode.classList.contains('tp-wait'),cover:getComputedStyle(i).objectFit,lazy:i.loading,dec:i.decoding,alt:i.getAttribute('alt')}; });
  ok(N+'a loaded picture fades in (cover, lazy, async, empty alt), the shimmer is gone',loaded.on&&loaded.op==='1'&&!loaded.wait&&loaded.cover==='cover'&&loaded.lazy==='lazy'&&loaded.dec==='async'&&loaded.alt==='',loaded);

  /* 9. Arabic titles run right to left, English left to right */
  const dir=await pg.evaluate(()=>{ const t=(href)=>{ const a=document.querySelector('.tp-card[href$="t='+href+'"]'), tt=a.querySelector('.tp-t'), s=a.querySelector('.tp-s'), f=a.querySelector('.tp-frame').getBoundingClientRect();
      const rg=document.createRange(); rg.selectNodeContents(tt); const r=rg.getBoundingClientRect(); return {t:getComputedStyle(tt).direction,s:getComputedStyle(s).direction,al:getComputedStyle(tt).textAlign,right:Math.round(f.right-r.right),left:Math.round(r.left-f.left),label:a.getAttribute('aria-label')}; };
    return {ar:t('r2'),ar2:t('r3'),ar3:t('s4'),en:t('r1')}; });
  ok(N+'Arabic titles read right to left and sit at the right edge; English ones left to right',dir.ar.t==='rtl'&&dir.ar2.t==='rtl'&&dir.ar3.t==='rtl'&&dir.en.t==='ltr'&&dir.ar.right<=6&&dir.en.left<=6,dir);
  ok(N+'accessible name = title + sub (+ badge)',dir.en.label==='Restock, Story · Classic, New'&&dir.ar.label==='رجع متوفر, Story · Passion fruit',[dir.en.label,dir.ar.label]);
  const clamp=await pg.evaluate(()=>{ const a=document.querySelector('.tp-card[href$="t=s2"]'), t=a.querySelector('.tp-t'), s=a.querySelector('.tp-s'); const lh=parseFloat(getComputedStyle(t).lineHeight); return {lines:Math.round(t.getBoundingClientRect().height/lh),subOne:s.getBoundingClientRect().height<=parseFloat(getComputedStyle(s).lineHeight)+1,ell:getComputedStyle(s).textOverflow,w:t.getBoundingClientRect().width<=a.getBoundingClientRect().width}; });
  ok(N+'a long title stops at 2 lines, a long sub at 1 line with an ellipsis',clamp.lines===2&&clamp.subOne&&clamp.ell==='ellipsis'&&clamp.w,clamp);
  /* since 1.16.0 the badge sits at the start of the line under the title, never on the preview (it covered post headlines) */
  const bd=await pg.evaluate(()=>{ const c=document.querySelector('.tp-card[href$="t=r1"]'), b=c.querySelector('.tp-badge'), f=c.querySelector('.tp-frame').getBoundingClientRect(), s=c.querySelector('.tp-s').getBoundingClientRect(), r=b.getBoundingClientRect(); return {inSub:!!b.closest('.tp-s'),below:Math.round(r.top-f.bottom),dx:Math.round(r.left-s.left),h:Math.round(r.height)}; });
  ok(N+'badge: small pill at the start of the line under the title, below the preview',bd.inSub&&bd.below>=0&&bd.dx>=0&&bd.dx<=4&&bd.h<=26,bd);

  /* 11. contrast */
  const cn=await pg.evaluate(s=>window.__contrast(s),CONTRAST);
  const low=cn.filter(x=>x.r<4.5);
  ok(N+'text contrast >= 4.5 (title, sub, header, chips, badge)',cn.length>20&&!low.length,low.length?low.slice(0,4):{checked:cn.length,min:+Math.min(...cn.map(x=>x.r)).toFixed(2)});
  await shot(pg,'phone-'+scheme+'-all');

  /* 10. tap targets */
  const tgt=async()=>{ const l=[...await sizes(pg,'.tp-chip'),...await sizes(pg,'.tp-card'),...await sizes(pg,'.tp-back'),...await sizes(pg,'.tp-na')]; return {n:l.length,min:Math.min(...l.map(x=>Math.min(x.w,x.h)))}; };
  const tg=await tgt();
  ok(N+'every chip, card and button is at least 44x44',tg.n>=20&&tg.min>=44,tg);

  /* 3. choose Restock: only its cards, aria-pressed, remembered */
  await pg.tap('.tp-chip[data-id="restock"]'); await pg.waitForTimeout(450);
  const rst=await pg.evaluate(()=>({ids:window.__ids(),sets:window.__sets,pr:[...document.querySelectorAll('.tp-chip')].filter(c=>c.getAttribute('aria-pressed')==='true').map(c=>c.dataset.id),secs:document.querySelectorAll('.tp-sec').length,cat:window.__api.cat,
    bg:getComputedStyle(document.querySelector('.tp-chip[data-id="restock"]')).backgroundColor,acc:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()}));
  ok(N+'Restock chip: only restock cards, pressed, no section headings',JSON.stringify(rst.ids)===JSON.stringify(['r1','r2','r3','r4'])&&JSON.stringify(rst.pr)==='["restock"]'&&rst.secs===0&&rst.cat==='restock',rst);
  ok(N+'the choice is remembered (studio:tplCat = restock)',rst.sets.some(s=>s[0]==='studio:tplCat'&&s[1]==='restock'),rst.sets);
  await shot(pg,'phone-'+scheme+'-restock');
  await pg.evaluate(()=>window.__init()); await pg.waitForTimeout(500);
  const again=await pg.evaluate(()=>({cat:window.__api.cat,ids:window.__ids(),pr:[...document.querySelectorAll('.tp-chip[aria-pressed="true"]')].map(c=>c.dataset.id)}));
  ok(N+'after a fresh init Restock is still selected',again.cat==='restock'&&JSON.stringify(again.pr)==='["restock"]'&&again.ids.length===4,again);

  /* 6. tap a card: onOpen gets the entry, the page does not navigate */
  await pg.tap('.tp-card[href$="t=r2"]'); await pg.waitForTimeout(300);
  const op=await pg.evaluate(()=>window.__opened);
  ok(N+'tapping a card calls onOpen with its entry and stays on the page (it returned false)',op&&op.id==='r2'&&op.title==='رجع متوفر'&&pg.url()===url0,{id:op&&op.id,url:pg.url()===url0});

  /* 13. cross-fade on change, scroll back up, sticky chips */
  await pg.tap('.tp-chip[data-id="all"]'); await pg.waitForTimeout(450);
  await pg.evaluate(()=>window.scrollTo(0,1100)); await pg.waitForTimeout(450);
  if(scheme==='light') await shot(pg,'phone-light-scrolled');
  const st=await pg.evaluate(()=>{ const bar=document.querySelector('.tp-bar'), r=bar.getBoundingClientRect(), c=document.querySelector('.tp-chip').getBoundingClientRect(), el=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
    return {y:Math.round(window.scrollY),top:Math.round(r.top),chipOnTop:!!el&&!!el.closest('.tp-chip'),bg:getComputedStyle(bar).backgroundColor,pos:getComputedStyle(bar).position,vw:document.documentElement.scrollWidth<=document.documentElement.clientWidth}; });
  ok(N+'scrolled down 1100px, the chips stay stuck at the top, above the cards, on the page colour',st.y>=1000&&st.top===0&&st.chipOnTop&&st.pos==='sticky'&&!/rgba\(0, 0, 0, 0\)/.test(st.bg),st);
  const fade=await pg.evaluate(()=>{ document.querySelector('.tp-chip[data-id="story"]').click(); return document.querySelector('.tp-body').getAnimations().length; });
  await pg.waitForTimeout(450);
  const back=await pg.evaluate(()=>({y:Math.round(window.scrollY),headBottom:Math.round(document.querySelector('.tp-head').getBoundingClientRect().bottom),ids:window.__ids(),op:getComputedStyle(document.querySelector('.tp-body')).opacity,anims:document.querySelector('.tp-body').getAnimations().length}));
  ok(N+'changing category cross-fades the grid (<= 200ms) and returns to the top of the chips',fade>0&&back.op==='1'&&back.anims===0&&back.headBottom>=-1&&back.headBottom<=1&&back.ids.length===4,{fade,back});
  await pg.evaluate(()=>window.scrollTo(0,0));

  /* 7. Team: the note and its action */
  await pg.tap('.tp-chip[data-id="team"]'); await pg.waitForTimeout(450);
  const tm=await pg.evaluate(()=>{ const n=document.querySelector('.tp-note'); return {text:n&&n.querySelector('.tp-nt').textContent,btn:n&&n.querySelector('button').textContent,cards:document.querySelectorAll('.tp-card').length,cat:window.__api.cat,mini:!!n&&n.querySelector('button').classList.contains('mini')}; });
  ok(N+'Team without templates shows the note and a Sign in button',tm.text==='Sign in to see your team’s templates.'&&tm.btn==='Sign in'&&tm.cards===0&&tm.cat==='team'&&tm.mini,tm);
  const tb=(await sizes(pg,'.tp-na'))[0];
  const cnT=await pg.evaluate(s=>window.__contrast(s),['.tp-nt','.tp-na']);
  ok(N+'the Sign in button is >= 48px tall and the note text is readable',tb.h>=48&&tb.w>=44&&cnT.length===2&&cnT.every(x=>x.r>=4.5),{tb,r:cnT.map(x=>+x.r.toFixed(1))});
  await shot(pg,'phone-'+scheme+'-team');
  await pg.tap('.tp-na'); await pg.waitForTimeout(100);
  ok(N+'tapping Sign in runs the note action',await pg.evaluate(()=>window.__signin)===1);

  /* 13b. refresh keeps the category, picks up new data, does not throw */
  await pg.tap('.tp-chip[data-id="story"]'); await pg.waitForTimeout(450);
  const calls0=await pg.evaluate(()=>window.__calls);
  const rf=await pg.evaluate(async()=>{ window.__extra=[{id:'x1',cat:'story',title:'Added later',sub:'Story',thumb:null,shape:'story',href:'tools/story.html?t=x1'}]; let err=''; try{ window.__api.refresh(); }catch(e){ err=String(e); } await new Promise(r=>setTimeout(r,300)); return {err,cat:window.__api.cat,n:window.__ids().length,count:document.querySelector('.tp-count').textContent,calls:window.__calls,y:window.scrollY,anim:document.querySelector('.tp-body').hasAttribute('data-anim')}; });
  ok(N+'refresh(): asks for the entries again, keeps the category, shows the new one, no replay of the entrance',!rf.err&&rf.cat==='story'&&rf.n===5&&rf.count==='15 templates'&&rf.calls>calls0&&!rf.anim,rf);
  await pg.evaluate(()=>{ window.__extra=[]; });
  await ctx.close();
}

/* ================= desktop 1280x800 ================= */
for(const scheme of ['light','dark']){
  const N=scheme+' desktop: ';
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',colorScheme:scheme,ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await BOOT(ctx,'desktop-'+scheme);
  const d=await pg.evaluate(()=>{ const cols=getComputedStyle(document.querySelector('.tp-grid')).gridTemplateColumns.split(' ').length;
    const g=document.querySelector('.tp-grid').getBoundingClientRect(); return {cols,gridW:Math.round(g.width),left:window.__lefts(),vw:document.documentElement.scrollWidth<=document.documentElement.clientWidth}; });
  ok(N+'5 columns (>= 3), content centred at most ~1080px wide, no sideways scroll',d.cols>=3&&d.cols===5&&d.gridW<=1080&&d.vw,d);
  ok(N+'title, chips and grid share the left edge',d.left.h1===d.left.chip&&d.left.chip===d.left.card&&d.left.back===d.left.card,d.left);
  await pg.keyboard.press('Tab'); const f1=await pg.evaluate(()=>{ const a=document.activeElement, c=getComputedStyle(a); return {cls:a.className,w:c.outlineWidth,st:c.outlineStyle}; });
  await pg.keyboard.press('Tab'); const f2=await pg.evaluate(()=>{ const a=document.activeElement, c=getComputedStyle(a); return {cls:a.className,w:c.outlineWidth,st:c.outlineStyle}; });
  for(let i=0;i<5;i++) await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab');
  const f3=await pg.evaluate(()=>{ const a=document.activeElement, c=getComputedStyle(a.querySelector&&a.querySelector('.tp-frame')||a); return {cls:a.className,w:c.outlineWidth,st:c.outlineStyle}; });
  ok(N+'keyboard focus: back button, chips and cards show a 3px focus ring',/tp-back/.test(f1.cls)&&f1.w==='3px'&&f1.st==='solid'&&/tp-chip/.test(f2.cls)&&f2.w==='3px'&&/tp-card/.test(f3.cls)&&f3.w==='3px'&&f3.st==='solid',{f1,f2,f3});
  await pg.evaluate(()=>document.activeElement.blur());
  const cn=await pg.evaluate(s=>window.__contrast(s),CONTRAST);
  ok(N+'text contrast >= 4.5',cn.length>20&&cn.every(x=>x.r>=4.5),cn.filter(x=>x.r<4.5).slice(0,3));
  const hv=await pg.evaluate(()=>getComputedStyle(document.querySelector('.tp-card .tp-frame')).boxShadow);
  await pg.hover('.tp-card[href$="t=r2"]'); await pg.waitForTimeout(600);
  const lift=await pg.evaluate(()=>({sh:getComputedStyle(document.querySelector('.tp-card[href$="t=r2"] .tp-frame')).boxShadow,tf:getComputedStyle(document.querySelector('.tp-card[href$="t=r2"] .tp-frame')).transform}));
  ok(N+'hover lifts a card (deeper shadow, moves up)',lift.sh!==hv&&/matrix/.test(lift.tf),lift);
  const bx=await pg.$eval('.tp-card[href$="t=r1"]',e=>{ const r=e.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; });
  await pg.mouse.move(bx[0],bx[1]); await pg.mouse.down(); await pg.waitForTimeout(250);
  const pressed=await pg.$eval('.tp-card[href$="t=r1"]',e=>getComputedStyle(e).transform);
  await pg.mouse.up(); await pg.waitForTimeout(150);
  const sc=parseFloat((pressed.match(/matrix\(([^,]+)/)||[])[1]);
  ok(N+'pressing a card scales it down to .97 (and a click still reaches onOpen)',Math.abs(sc-.97)<.005&&(await pg.evaluate(()=>window.__opened)).id==='r1',{pressed});
  await pg.mouse.move(5,5); await pg.waitForTimeout(700);
  await shot(pg,'desktop-'+scheme+'-all');
  await pg.click('.tp-chip[data-id="post"]'); await pg.waitForTimeout(450);
  const pc=await pg.evaluate(()=>({ids:window.__ids(),pr:document.querySelector('.tp-chip[aria-pressed="true"]').dataset.id,cols:getComputedStyle(document.querySelector('.tp-grid')).gridTemplateColumns.split(' ').length}));
  ok(N+'a click on a chip works with the mouse too',JSON.stringify(pc.ids)===JSON.stringify(['p1','p2','p3'])&&pc.pr==='post'&&pc.cols>=3,pc);
  if(scheme==='light') await shot(pg,'desktop-light-posts');
  await ctx.close();
}

/* ================= 360 wide: nothing sideways; 600/1000 breakpoints ================= */
{
  const ctx=await b.newContext({viewport:{width:360,height:740},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await BOOT(ctx,'360');
  const flow=async()=>pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth,wide:[...document.querySelectorAll('.tp-in *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1).length}));
  const f1=await flow(); await pg.tap('.tp-chip[data-id="team"]'); await pg.waitForTimeout(450); const f2=await flow(); await pg.tap('.tp-chip[data-id="highlight"]'); await pg.waitForTimeout(450); const f3=await flow();
  ok('360 wide: no horizontal overflow in All, Team and a category',[f1,f2,f3].every(f=>f.sw<=f.cw&&f.bw<=f.cw&&f.wide===0),[f1,f2,f3]);
  const chipsScroll=await pg.evaluate(()=>{ const c=document.querySelector('.tp-chips'); return {scrolls:c.scrollWidth>c.clientWidth,bar:getComputedStyle(c).scrollbarWidth,ox:getComputedStyle(c).overflowX}; });
  ok('360 wide: the chips scroll sideways inside their own strip (scrollbar hidden)',chipsScroll.scrolls&&chipsScroll.ox==='auto'&&chipsScroll.bar==='none',chipsScroll);
  /* right to left page: everything mirrors, the back arrow turns round, still no sideways scroll */
  await pg.tap('.tp-chip[data-id="all"]'); await pg.waitForTimeout(450);
  await pg.evaluate(()=>{ document.documentElement.dir='rtl'; }); await pg.waitForTimeout(200);
  const rt=await pg.evaluate(()=>{ const r=s=>{ const e=document.querySelector(s); return e?Math.round(e.getBoundingClientRect().right):null; }; const bd=document.querySelector('.tp-card[href$="t=r1"] .tp-badge'), fr=bd.closest('.tp-card').querySelector('.tp-frame').getBoundingClientRect();
    return {back:r('.tp-back'),h1:r('.tp-ttl'),chip:r('.tp-chip'),card:r('.tp-card'),vw:document.documentElement.scrollWidth<=document.documentElement.clientWidth,arrow:getComputedStyle(document.querySelector('.tp-back svg')).transform,badgeBelow:Math.round(bd.getBoundingClientRect().top-fr.bottom)}; });
  ok('right-to-left page: back button, title, chips and grid share the right edge, arrow turned round, badge under the preview, no sideways scroll',rt.back===344&&rt.h1===344&&rt.chip===344&&rt.card===344&&rt.vw&&/matrix\(-1/.test(rt.arrow)&&rt.badgeBelow>=0,rt);
  await pg.evaluate(()=>{ document.documentElement.dir='ltr'; });
  await pg.setViewportSize({width:700,height:800}); await pg.tap('.tp-chip[data-id="all"]').catch(()=>{}); await pg.waitForTimeout(500);
  const c3=await pg.evaluate(()=>getComputedStyle(document.querySelector('.tp-grid')).gridTemplateColumns.split(' ').length);
  await pg.setViewportSize({width:1100,height:800}); await pg.waitForTimeout(300);
  const c5=await pg.evaluate(()=>getComputedStyle(document.querySelector('.tp-grid')).gridTemplateColumns.split(' ').length);
  ok('breakpoints: 3 columns at 700, 5 at 1100',c3===3&&c5===5,{c3,c5});
  await ctx.close();
}

/* ================= reduced motion: no animation, no cross-fade, still works ================= */
{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await BOOT(ctx,'reduced');
  const r1=await pg.evaluate(()=>({anim:getComputedStyle(document.querySelector('.tp-card')).animationName,tr:getComputedStyle(document.querySelector('.tp-chip')).transitionDuration,sh:getComputedStyle(document.querySelector('.tp-wait')||document.querySelector('.tp-frame'),'::before').animationName}));
  const fade=await pg.evaluate(()=>{ document.querySelector('.tp-chip[data-id="post"]').click(); return {anims:document.querySelector('.tp-body').getAnimations().length,ids:window.__ids()}; });
  ok('reduced motion: no card entrance, no transitions, no shimmer, no cross-fade, the category still changes',r1.anim==='none'&&/^0s/.test(r1.tr)&&fade.anims===0&&JSON.stringify(fade.ids)===JSON.stringify(['p1','p2','p3']),{r1,fade});
  await ctx.close();
}

/* ================= slow list (skeleton), empty list, no team note ================= */
{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await BOOT(ctx,'slow',{mode:'async',delay:700});
  await pg.evaluate(()=>window.__init()); await pg.waitForTimeout(250);
  await shot(pg,'phone-light-loading');
  const sk=await pg.evaluate(()=>({shimmer:getComputedStyle(document.querySelector('.tp-wait'),'::before').animationName,busy:document.querySelector('.tp-body').getAttribute('aria-busy'),cards:document.querySelectorAll('.tp-card').length,bones:document.querySelectorAll('.tp-wait').length,pills:document.querySelectorAll('.tp-pill').length,count:document.querySelector('.tp-count').textContent}));
  await pg.waitForTimeout(1100);
  const sk2=await pg.evaluate(()=>({busy:document.querySelector('.tp-body').getAttribute('aria-busy'),cards:document.querySelectorAll('.tp-card').length,chips:document.querySelectorAll('.tp-chip').length,count:document.querySelector('.tp-count').textContent}));
  ok('a slow list: shimmer cards while waiting, then the real ones (a promise from entries() works)',sk.busy==='true'&&sk.shimmer==='tp-sh'&&sk.cards===0&&sk.bones>=4&&sk.pills>=3&&sk.count===''&&!sk2.busy&&sk2.cards===14&&sk2.chips===6&&sk2.count==='14 templates',{sk,sk2});
  await pg.evaluate(()=>{ window.__mode='empty'; window.__api.refresh(); }); await pg.waitForTimeout(400);
  const em=await pg.evaluate(()=>({text:document.querySelector('.tp-empty')&&document.querySelector('.tp-empty').textContent.trim(),chips:[...document.querySelectorAll('.tp-chip')].map(c=>c.dataset.id),cat:window.__api.cat,count:document.querySelector('.tp-count').textContent}));
  ok('an empty library: the friendly note, only All and Team chips',em.text==='No templates here yet.'&&JSON.stringify(em.chips)==='["all","team"]'&&em.cat==='all'&&em.count==='0 templates',em);
  await pg.tap('.tp-chip[data-id="team"]'); await pg.waitForTimeout(400);
  ok('an empty library, Team: the team note with its button',await pg.evaluate(()=>!!document.querySelector('.tp-note .tp-na')));
  /* a saved category that no longer exists falls back to All and is not lost */
  await pg.evaluate(()=>{ window.__store['studio:tplCat']='seasonal'; window.__mode='sync'; window.__init(); }); await pg.waitForTimeout(500);
  ok('a remembered category that has no chip (any more) opens All',await pg.evaluate(()=>window.__api.cat)==='all');
  await pg.evaluate(()=>{ window.__api.show('post'); }); await pg.waitForTimeout(400);
  ok('show(cat) selects that category',await pg.evaluate(()=>window.__api.cat)==='post'&&JSON.stringify(await pg.evaluate(()=>window.__ids()))==='["p1","p2","p3"]');
  await ctx.close();
}
{
  /* team without a note and without entries: All has no Team section; the Team chip says nothing here yet */
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',ignoreHTTPSErrors:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await BOOT(ctx,'nonote',{noTeamNote:true});
  const secs=await pg.$$eval('.tp-sec .tp-h span:first-child',h=>h.map(x=>x.textContent));
  await pg.click('.tp-chip[data-id="team"]'); await pg.waitForTimeout(400);
  const t=await pg.evaluate(()=>({note:!!document.querySelector('.tp-note'),empty:document.querySelector('.tp-empty')&&document.querySelector('.tp-empty').textContent.trim()}));
  ok('no team note: no Team section in All, the Team chip shows the friendly empty note',JSON.stringify(secs)==='["Restock","Stories","Posts","Highlights"]'&&!t.note&&t.empty==='No templates here yet.',{secs,t});
  await ctx.close();
}

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); console.log(`templates: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-t0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);
