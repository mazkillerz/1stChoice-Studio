/* Studio 0.7.1 polish: the readable chosen collection chip + its ⋯ menu (open, close, keyboard, rename, delete that still asks),
   framed Saved cards with RTL captions (an Arabic name and its time group on the right), the "New design" tile + tip when only a few
   designs exist (and neither when 6+), friendly empty / no-match notes, the bottom bar's outline-off / filled-on icons, the labelled Snap button,
   the Plex interface font (no weight-800 anywhere on Home), the search's own clear button, Arabic result rows that mirror fully,
   and the design sheet header that mirrors for an Arabic name.
   Colour checks run in light AND dark; the phone gets everything, the computer the chip / menu / search / sheet bits.
   Designs are seeded with tests/seed.js (the first one gets an approved Arabic phrase as its name); the team is tests/fakecloud.js.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });   // keep what passed so far visible
const b=await chromium.launch(); const errs=[];
const PHONE={name:'phone',width:390,height:844,touch:true}, DESK={name:'desktop',width:1280,height:800,touch:false};

/* ---------- seeds ---------- */
const AR='رجع متوفر – Classic';                                       // an approved phrase from brand.js (restock headline) + the flavour
const LONG='Restock for the weekend with a very long design name that cannot fit on one line';
const eight=()=>{ const db=seedDesigns(); const d=Object.values(db.designs); d[0].name=AR; d[1].name=LONG; return db; };     // seed0 Arabic (1 h, Restocks), seed1 long (5 h)
const few=n=>{ const db=eight(); Object.keys(db.designs).slice(n).forEach(k=>delete db.designs[k]); db.cols={}; Object.values(db.designs).forEach(d=>{ d.cols=[]; }); return db; };
const empty=()=>({designs:{},files:{},cols:{}});

/* ---------- colour maths (WCAG) ---------- */
const parseCol=s=>{ let m=String(s).match(/rgba?\(([^)]+)\)/); if(m){ const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
  m=String(s).match(/color\(srgb ([^)]+)\)/); if(m){ const p=m[1].split(/[ \/]+/).filter(Boolean).map(Number); return {r:p[0]*255,g:p[1]*255,b:p[2]*255,a:p.length>3?p[3]:1}; } return null; };
const over=(t,u)=>({r:t.r*t.a+u.r*(1-t.a),g:t.g*t.a+u.g*(1-t.a),b:t.b*t.a+u.b*(1-t.a),a:1});
const lin=c=>{ c/=255; return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4); };
const lum=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
const ratio=(fg,bg,page)=>{ const base=over(bg,page), f=over(fg,base); const x=lum(f), y=lum(base); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };

/* the same wording ago() in assets/studio.js gives for a design saved h hours ago */
const agoH=h=>h<1/60?'just now':h<1?Math.round(h*60)+' min ago':h<24?Math.round(h)+' h ago':Math.round(h/24)+' d ago';

const mk=async(vp,scheme,db)=>{
  const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.touch?2:1,isMobile:vp.touch,hasTouch:vp.touch,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  if(db) await ctx.addInitScript({content:seedScript(db)});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(vp.name+' '+scheme+': '+e)); return {ctx,pg}; };
const savedPage=async pg=>{ await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id],#savedEmpty .sv-note',{timeout:10000}); await pg.waitForTimeout(700); };
const homePage=async pg=>{ await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card,#savedRowList .sv-note',{timeout:10000}); await pg.waitForTimeout(700); };
const cards=pg=>pg.$$eval('#savedGrid .sv-card',c=>c.length);
const colNames=pg=>pg.$$eval('#colChips .chip.col span',l=>l.map(x=>x.textContent).sort());

for(const scheme of ['light','dark']) for(const vp of [PHONE,DESK]){
  const N=`${vp.name} ${scheme}: `, tap=(pg,s,o)=>vp.touch?pg.tap(s,o):pg.click(s,o);
  /* =========== Saved page, 8 designs: chosen chip, ⋯ menu, captions, tile + tip =========== */
  { const {ctx,pg}=await mk(vp,scheme,eight()); await savedPage(pg);
    ok(N+'8 designs: no New design tile and no tip (6+ designs)',!(await pg.$('#savedGrid .sv-new'))&&!(await pg.isVisible('#savedTip'))&&await cards(pg)===8);
    ok(N+'no collection chosen: no ⋯ button',!(await pg.$('#colMore'))&&!(await pg.$('.col-sel')));
    /* captions: framed cards, an Arabic name and its time group on the right */
    const cap=await pg.evaluate(()=>{ const q=id=>document.querySelector(`#savedGrid .sv-card[data-id="${id}"]`);
      const info=el=>{ const t=el.querySelector('.sv-txt'), nm=t.querySelector('b'), ti=t.querySelector(':scope>span'), bd=ti&&ti.querySelector('bdi');
        let order=null; if(bd&&bd.firstChild&&bd.textContent.length>2){ const tn=bd.firstChild, a=document.createRange(), z=document.createRange(); a.setStart(tn,0); a.setEnd(tn,1); z.setStart(tn,tn.length-1); z.setEnd(tn,tn.length); order=a.getBoundingClientRect().left<z.getBoundingClientRect().left; }
        const tr=t.getBoundingClientRect(), nr=nm.getBoundingClientRect();
        return {tag:t.tagName,dirAttr:t.getAttribute('dir'),rtl:t.matches(':dir(rtl)'),ltr:t.matches(':dir(ltr)'),name:nm.textContent,time:bd?bd.textContent:null,hasBdi:!!bd,digitFirst:bd?/^\d/.test(bd.textContent):null,visualLtr:order,
          nameDir:getComputedStyle(nm).direction,lines:Math.round(nr.height/parseFloat(getComputedStyle(nm).lineHeight)*10)/10,clamp:getComputedStyle(nm).webkitLineClamp,
          nameAtStart:getComputedStyle(nm).direction==='rtl'?Math.abs(nr.right-tr.right)<60:Math.abs(nr.left-tr.left)<60}; };
      return {ar:info(q('seed0')),long:info(q('seed1')),en:info(q('seed2')),frame:getComputedStyle(q('seed0').querySelector('.sv-open')).borderTopWidth+' '+getComputedStyle(q('seed0').querySelector('.sv-open')).borderRadius}; });
    ok(N+'card caption is span.sv-txt[dir=auto] > b + span > bdi',cap.ar.tag==='SPAN'&&cap.ar.dirAttr==='auto'&&cap.ar.hasBdi,cap.ar);
    ok(N+'an Arabic design name makes its caption right-to-left (:dir(rtl)) and the name starts at the right',cap.ar.rtl&&cap.ar.nameDir==='rtl'&&cap.ar.nameAtStart&&cap.ar.name===AR,cap.ar);
    ok(N+'the time reads like ago() ("1 h ago"), digit first in logical order, left-to-right inside its own bdi',cap.ar.time===agoH(1)&&cap.ar.digitFirst&&cap.ar.visualLtr===true,JSON.stringify({time:cap.ar.time,want:agoH(1),visualLtr:cap.ar.visualLtr}));
    ok(N+'an English name keeps a left-to-right caption (name at the left, time "'+agoH(20)+'")',cap.en.ltr&&cap.en.nameDir==='ltr'&&cap.en.nameAtStart&&cap.en.time===agoH(20)&&/^Offer/.test(cap.en.name),cap.en);
    ok(N+'a long title takes two lines and is clamped there (not one, not three)',cap.long.lines>=1.8&&cap.long.lines<=2.2&&cap.long.clamp==='2',cap.long);
    ok(N+'cards are framed (a hairline border and rounded corners)',/^1px/.test(cap.frame)&&/1[0-9]px|2[0-9]px/.test(cap.frame),cap.frame);
    await tap(pg,'#colChips .chip[data-f="c:Restocks"]'); await pg.waitForTimeout(600);
    /* readable chosen chip: .col-sel paints the accent, the chip inside takes --on-accent */
    const cc=await pg.evaluate(()=>{ const sel=document.querySelector('.col-sel'), chip=sel&&sel.querySelector('.chip.col'), more=document.getElementById('colMore'), row=document.getElementById('colChips');
      const cs=x=>getComputedStyle(x); return {ok:!!(sel&&chip&&more),selBg:sel&&cs(sel).backgroundColor,chipFg:chip&&cs(chip).color,chipBg:chip&&cs(chip).backgroundColor,chipPressed:chip&&chip.getAttribute('aria-pressed'),page:cs(document.body).backgroundColor,
        padB:parseFloat(cs(row).paddingBottom),accent:cs(document.documentElement).getPropertyValue('--accent').trim(),on:cs(document.documentElement).getPropertyValue('--on-accent').trim(),
        wraps:!!sel&&sel.contains(more)&&sel.contains(chip)&&chip.getAttribute('aria-pressed')==='true'}; });
    ok(N+'the chosen chip and its ⋯ are wrapped together in span.col-sel',cc.ok&&cc.wraps,cc);
    const bg=parseCol(cc.selBg), fg=parseCol(cc.chipFg), pgc=parseCol(cc.page)||{r:255,g:255,b:255,a:1};
    const r=bg&&fg?ratio(fg,bg,pgc):0;
    ok(N+'chosen collection chip: text on its background is at least 4.5:1',r>=4.5&&bg.a>0,r.toFixed(2)+' '+cc.chipFg+' on '+cc.selBg);
    ok(N+'the chosen chip is not the plain page colour (accent fill, not invisible)',!!bg&&bg.a>0&&JSON.stringify([bg.r,bg.g,bg.b])!==JSON.stringify([pgc.r,pgc.g,pgc.b]),cc.selBg+' vs page '+cc.page);
    ok(N+'the chip row keeps 12px+ of room below (the chosen chip\'s shadow is not cut)',cc.padB>=12,cc.padB);
    /* the menu */
    const mb=await pg.$eval('#colMore',e=>{ const r=e.getBoundingClientRect(), cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2, hit=(dx,dy)=>{ const t=document.elementFromPoint(cx+dx,cy+dy); return !!t&&(t===e||e.contains(t)); };
      return {w:Math.round(r.width),h:Math.round(r.height),hit:hit(-22,0)&&hit(22,0)&&hit(0,-22)&&hit(0,22),pop:e.getAttribute('aria-haspopup'),exp:e.getAttribute('aria-expanded'),label:e.getAttribute('aria-label')}; });
    ok(N+'⋯ is a menu button (aria-haspopup=menu, aria-expanded=false, labelled), 36px+ with a 44px+ touch area',mb.pop==='menu'&&mb.exp==='false'&&/collection/i.test(mb.label)&&Math.min(mb.w,mb.h)>=36&&mb.hit,mb);
    ok(N+'no menu until ⋯ is tapped; old #colTools links are gone',!(await pg.$('.pop-menu'))&&!(await pg.$('#colTools'))&&!(await pg.$('#colRename'))&&!(await pg.$('#colDelete')));
    await tap(pg,'#colMore'); await pg.waitForSelector('.pop-menu[role="menu"]',{state:'visible'});
    const pm=await pg.evaluate(()=>{ const m=document.querySelector('.pop-menu'), r=m.getBoundingClientRect(), it=[...m.querySelectorAll('button')];
      return {exp:document.getElementById('colMore').getAttribute('aria-expanded'),items:it.map(x=>x.id+':'+x.textContent.trim()+(x.classList.contains('danger')?':danger':'')).join('|'),roles:it.map(x=>x.getAttribute('role')).join(),on:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,minH:Math.min(...it.map(x=>x.getBoundingClientRect().height)),focus:document.activeElement&&document.activeElement.id,
        top:r.top,btnBottom:document.getElementById('colMore').getBoundingClientRect().bottom,delColor:getComputedStyle(it[1]).color,txtColor:getComputedStyle(it[0]).color,menuBg:getComputedStyle(m).backgroundColor}; });
    ok(N+'⋯ opens the menu: Rename collection + Delete collection (danger), on screen, 44px+ rows',pm.exp==='true'&&pm.items==='colRename:Rename collection|colDelete:Delete collection:danger'&&pm.roles==='menuitem,menuitem'&&pm.on&&pm.minH>=44,pm);
    ok(N+'the menu opens right under ⋯ and focus goes to its first item',pm.top>=pm.btnBottom-1&&pm.focus==='colRename',pm.focus);
    const dc=parseCol(pm.delColor), tc=parseCol(pm.txtColor), mbg=parseCol(pm.menuBg)||pgc;
    ok(N+'menu text (and the red Delete) are readable on the menu: 4.5:1',dc&&tc&&ratio(dc,mbg,pgc)>=4.5&&ratio(tc,mbg,pgc)>=4.5,(dc&&tc?ratio(dc,mbg,pgc).toFixed(2)+' / '+ratio(tc,mbg,pgc).toFixed(2):'unparsed'));
    await pg.keyboard.press('ArrowDown'); ok(N+'ArrowDown moves focus to Delete collection',await pg.evaluate(()=>document.activeElement.id)==='colDelete');
    await pg.keyboard.press('ArrowDown'); ok(N+'ArrowDown again wraps to Rename collection',await pg.evaluate(()=>document.activeElement.id)==='colRename');
    await pg.keyboard.press('ArrowUp'); ok(N+'ArrowUp goes back to Delete collection',await pg.evaluate(()=>document.activeElement.id)==='colDelete');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
    ok(N+'Escape closes the menu, aria-expanded goes back to false, focus returns to ⋯',!(await pg.$('.pop-menu'))&&await pg.getAttribute('#colMore','aria-expanded')==='false'&&await pg.evaluate(()=>document.activeElement.id)==='colMore');
    await tap(pg,'#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await tap(pg,'#colMore'); await pg.waitForTimeout(300);
    ok(N+'tapping ⋯ again closes the menu',!(await pg.$('.pop-menu'))&&await pg.getAttribute('#colMore','aria-expanded')==='false');
    await tap(pg,'#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await tap(pg,'#savedH'); await pg.waitForTimeout(300);
    ok(N+'a tap outside closes the menu',!(await pg.$('.pop-menu'))&&await pg.getAttribute('#colMore','aria-expanded')==='false');
    /* rename + delete through the menu (delete still asks) */
    await tap(pg,'#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await tap(pg,'#colRename'); await pg.waitForSelector('#crName',{state:'visible'});
    ok(N+'Rename collection (from the menu) opens the rename dialog with the name; the menu is closed',await pg.inputValue('#crName')==='Restocks'&&!(await pg.$('.pop-menu'))&&await pg.isVisible('dialog[open]'));
    await pg.fill('#crName','Specials'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
    ok(N+'Rename collection: the chip shows the new name',JSON.stringify(await colNames(pg))==='["Offers","Specials"]'&&!(await pg.locator('dialog[open]').count()),await colNames(pg));
    await tap(pg,'#colChips .chip[data-f="c:Specials"]'); await pg.waitForTimeout(500);
    ok(N+'the renamed collection can be chosen and has its ⋯ again',await pg.isVisible('#colMore')&&await cards(pg)===2);
    await tap(pg,'#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await tap(pg,'#colDelete'); await pg.waitForSelector('#cdGo',{state:'visible'});
    ok(N+'Delete collection (from the menu) asks first: #cdGo and Cancel show, nothing is deleted yet',await pg.isVisible('#cdGo')&&await pg.isVisible('#cdX')&&JSON.stringify(await colNames(pg))==='["Offers","Specials"]'&&!(await pg.$('.pop-menu')));
    await tap(pg,'#cdX'); await pg.waitForTimeout(400);
    ok(N+'Cancel keeps the collection',!(await pg.locator('dialog[open]').count())&&JSON.stringify(await colNames(pg))==='["Offers","Specials"]');
    await tap(pg,'#colMore'); await pg.waitForSelector('.pop-menu',{state:'visible'}); await tap(pg,'#colDelete'); await pg.waitForSelector('#cdGo',{state:'visible'}); await tap(pg,'#cdGo'); await pg.waitForTimeout(900);
    ok(N+'Delete collection: the chip and ⋯ go, the designs stay (8)',JSON.stringify(await colNames(pg))==='["Offers"]'&&await cards(pg)===8&&!(await pg.$('#colMore')));
    /* tapping the chosen chip again clears the filter and the ⋯ */
    await tap(pg,'#colChips .chip[data-f="c:Offers"]'); await pg.waitForTimeout(400); const oneCol=await cards(pg);
    await tap(pg,'#colChips .chip[data-f="c:Offers"]'); await pg.waitForTimeout(400);
    ok(N+'tapping the chosen chip again clears the filter, and ⋯ is gone',oneCol===1&&await cards(pg)===8&&!(await pg.$('#colMore'))&&!(await pg.$('.col-sel')),oneCol);
    await ctx.close(); }

  /* =========== Saved page, a few designs: New design tile + tip; no-match note; sparse list =========== */
  { const db=eight(); const {ctx,pg}=await mk(vp,scheme,db); await savedPage(pg);
    await tap(pg,'#colChips .chip[data-f="c:Restocks"]'); await pg.waitForTimeout(500);
    const t2=await pg.evaluate(()=>{ const g=document.getElementById('savedGrid'), nw=g.querySelector('.sv-new'), tip=document.getElementById('savedTip');
      return {cards:g.querySelectorAll('.sv-card').length,newLast:!!nw&&g.lastElementChild===nw,newIsCard:!!nw&&nw.classList.contains('sv-card'),newTag:nw&&nw.tagName,dataNew:nw&&nw.hasAttribute('data-new'),txt:nw&&nw.textContent.replace(/\s+/g,' ').trim(),
        tipVisible:!!tip&&!tip.hidden&&tip.getClientRects().length>0,tipTxt:tip&&tip.textContent.trim(),h:nw&&Math.round(nw.getBoundingClientRect().height),w:nw&&Math.round(nw.getBoundingClientRect().width)}; });
    ok(N+'2 designs (Restocks): the grid ends with a "New design" button, which is not a .sv-card',t2.cards===2&&t2.newLast&&!t2.newIsCard&&t2.newTag==='BUTTON'&&t2.dataNew&&/New design/.test(t2.txt),t2);
    ok(N+'2 designs: the tip is visible',t2.tipVisible&&t2.tipTxt.length>10,t2.tipTxt);
    ok(N+'the New design tile is finger-sized',t2.h>=48&&t2.w>=48,t2);
    await tap(pg,'#savedGrid .sv-new'); await pg.waitForSelector('dialog.fab-dlg[open]',{timeout:4000}).catch(()=>{});
    ok(N+'tapping New design opens the + menu',await pg.isVisible('dialog.fab-dlg[open]'));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
    /* no match: the note keeps Show all, and neither tile nor tip shows */
    await tap(pg,'#typeChips .chip[data-type="post"]'); await pg.waitForTimeout(400);
    const nm=await pg.evaluate(()=>{ const n=document.querySelector('#savedEmpty .sv-note'); return {note:!!n,ic:!!(n&&n.querySelector('.sn-ic svg')),title:n&&n.querySelector('.sn-txt b')&&n.querySelector('.sn-txt b').textContent.trim(),p:n&&n.querySelector('.sn-txt p')&&n.querySelector('.sn-txt p').textContent.trim(),
      showall:!!(n&&n.querySelector('[data-showall]')),tile:!!document.querySelector('#savedGrid .sv-new'),tip:!document.getElementById('savedTip').hidden,vis:!document.getElementById('savedEmpty').hidden}; });
    ok(N+'no match: a friendly .sv-note (icon, title, line) with Show all; no tile, no tip',nm.vis&&nm.note&&nm.ic&&!!nm.title&&!!nm.p&&nm.showall&&!nm.tile&&!nm.tip,nm);
    await tap(pg,'#savedEmpty [data-showall]'); await pg.waitForTimeout(400);
    ok(N+'Show all brings the 8 designs back, without the tile and the tip',await cards(pg)===8&&!(await pg.$('#savedGrid .sv-new'))&&!(await pg.isVisible('#savedTip')));
    /* the exact boundary: 5 designs show tile + tip, 6 do not */
    await ctx.close(); }
  for(const [n,want] of [[1,true],[5,true],[6,false]]){
    const {ctx,pg}=await mk(vp,scheme,few(n)); await savedPage(pg);
    const s=await pg.evaluate(()=>({cards:document.querySelectorAll('#savedGrid .sv-card').length,tile:!!document.querySelector('#savedGrid .sv-new'),tip:!document.getElementById('savedTip').hidden&&document.getElementById('savedTip').getClientRects().length>0}));
    ok(N+n+' design'+(n>1?'s':'')+': tile and tip '+(want?'show':'are absent'),s.cards===n&&s.tile===want&&s.tip===want,s);
    if(n===1||n===6){ await homePage(pg);
      const h=await pg.evaluate(()=>{ const r=document.getElementById('savedRowList'); const nw=r.querySelector('.sv-new'); return {cards:r.querySelectorAll('.sv-card').length,tile:!!nw,last:!!nw&&r.lastElementChild===nw}; });
      ok(N+'home Saved row with '+n+': '+(n<4?'ends with the New design tile':'has no New design tile'),n<4?h.tile&&h.last&&h.cards===n:!h.tile&&h.cards===n,h); }
    await ctx.close(); }
  { const {ctx,pg}=await mk(vp,scheme,few(3)); await homePage(pg);
    ok(N+'home row: 3 designs end with the tile (fewer than 4)',await pg.evaluate(()=>{ const r=document.getElementById('savedRowList'); return r.querySelectorAll('.sv-card').length===3&&r.lastElementChild.classList.contains('sv-new'); }));
    await ctx.close(); }
  { const {ctx,pg}=await mk(vp,scheme,few(4)); await homePage(pg);
    ok(N+'home row: 4 designs have no tile',await pg.evaluate(()=>{ const r=document.getElementById('savedRowList'); return r.querySelectorAll('.sv-card').length===4&&!r.querySelector('.sv-new'); }));
    await ctx.close(); }

  /* =========== empty Saved: a friendly note and Make a design =========== */
  { const {ctx,pg}=await mk(vp,scheme,empty()); await savedPage(pg);
    const e=await pg.evaluate(()=>{ const n=document.querySelector('#savedEmpty .sv-note'), bt=n&&n.querySelector('[data-new]'); return {note:!!n,ic:!!(n&&n.querySelector('.sn-ic svg')),title:n&&n.querySelector('.sn-txt b').textContent.trim(),p:n&&n.querySelector('.sn-txt p').textContent.trim(),btn:bt&&bt.textContent.trim(),btnH:bt&&Math.round(bt.getBoundingClientRect().height),
      grid:document.querySelectorAll('#savedGrid .sv-card,#savedGrid .sv-new').length,tip:!document.getElementById('savedTip').hidden,chips:!document.getElementById('typeChips').hidden||!document.getElementById('colChips').hidden}; });
    ok(N+'empty Saved: .sv-note with icon, title, line and a "Make a design" button',e.note&&e.ic&&e.title==='Nothing saved yet'&&e.p.length>10&&e.btn==='Make a design'&&e.btnH>=44,e);
    ok(N+'empty Saved: no cards, no tile, no tip, no chips',e.grid===0&&!e.tip&&!e.chips,e);
    await tap(pg,'#savedEmpty [data-new]'); await pg.waitForSelector('dialog.fab-dlg[open]',{timeout:4000}).catch(()=>{});
    ok(N+'Make a design opens the + menu',await pg.isVisible('dialog.fab-dlg[open]'));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
    await homePage(pg);
    ok(N+'empty home row: the same friendly note, with its button',await pg.evaluate(()=>{ const n=document.querySelector('#savedRowList .sv-note'); return !!n&&!!n.querySelector('.sn-ic')&&!!n.querySelector('[data-new]'); }));
    await ctx.close(); }

  /* =========== design sheet header mirrors for an Arabic name =========== */
  { const {ctx,pg}=await mk(vp,scheme,eight()); await savedPage(pg);
    await tap(pg,'#savedGrid .sv-card[data-id="seed0"] .sv-more'); await pg.waitForSelector('dialog.design-dlg[open] .ds-top',{timeout:5000}); await pg.waitForTimeout(400);
    const ds=await pg.evaluate(()=>{ const t=document.querySelector('dialog.design-dlg[open] .ds-top'), h=t.querySelector('h3'), im=t.querySelector('img,.ds-ph'), c=r=>(r.left+r.right)/2;
      return {dir:t.getAttribute('dir'),rtl:t.matches(':dir(rtl)'),name:h.textContent,picRightOfName:c(im.getBoundingClientRect())>c(h.getBoundingClientRect()),nameDir:getComputedStyle(h).direction}; });
    ok(N+'design sheet header has dir=auto and is :dir(rtl) for an Arabic name, picture on the right',ds.dir==='auto'&&ds.rtl&&ds.name===AR&&ds.picRightOfName,ds);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
    await tap(pg,'#savedGrid .sv-card[data-id="seed2"] .sv-more'); await pg.waitForSelector('dialog.design-dlg[open] .ds-top',{timeout:5000}); await pg.waitForTimeout(400);
    const dsE=await pg.evaluate(()=>{ const t=document.querySelector('dialog.design-dlg[open] .ds-top'), h=t.querySelector('h3'), im=t.querySelector('img,.ds-ph'), c=r=>(r.left+r.right)/2; return {ltr:t.matches(':dir(ltr)'),picLeftOfName:c(im.getBoundingClientRect())<c(h.getBoundingClientRect())}; });
    ok(N+'design sheet header stays left-to-right for an English name, picture on the left',dsE.ltr&&dsE.picLeftOfName,dsE);
    await ctx.close(); }

  /* =========== search: our own clear button, Arabic rows mirror =========== */
  { const {ctx,pg}=await mk(vp,scheme,eight()); await homePage(pg);
    await tap(pg,'#uq'); await pg.waitForTimeout(400);
    const x0=await pg.evaluate(()=>{ const x=document.querySelector('.us-field .us-x'); return {has:!!x,vis:!!x&&x.getClientRects().length>0&&!x.hidden,label:x&&x.getAttribute('aria-label'),inField:!!x&&!!x.closest('.us-field')}; });
    ok(N+'search: our clear button exists inside the field, hidden while empty',x0.has&&!x0.vis&&x0.inField&&x0.label==='Clear search',x0);
    await pg.fill('#uq','rest'); await pg.waitForTimeout(300);
    const x1=await pg.evaluate(()=>{ const x=document.querySelector('.us-field .us-x'), r=x.getBoundingClientRect(), f=document.getElementById('uq').getBoundingClientRect(); return {vis:x.getClientRects().length>0&&!x.hidden,w:Math.round(r.width),h:Math.round(r.height),inside:r.left>=f.left-1&&r.right<=f.right+1,
      nativeCancel:(()=>{ let hid=false; for(const sh of document.styleSheets){ let rules; try{ rules=sh.cssRules; }catch(_){ continue; } for(const r of rules) if(r.selectorText&&/-webkit-search-cancel-button/.test(r.selectorText)&&r.style.display==='none') hid=true; } return hid?'none':'shown'; })()}; });
    ok(N+'search: the clear button shows with text, 44px, inside the field; the native cancel button is hidden',x1.vis&&x1.w>=44&&x1.h>=44&&x1.inside&&x1.nativeCancel==='none',x1);
    await tap(pg,'.us-field .us-x'); await pg.waitForTimeout(400);
    const x2=await pg.evaluate(()=>({val:document.getElementById('uq').value,open:document.getElementById('usPanel').getClientRects().length>0,focus:document.activeElement&&document.activeElement.id,xvis:!document.querySelector('.us-field .us-x').hidden}));
    ok(N+'tapping clear empties the field, keeps the search open and focused, and hides itself',x2.val===''&&x2.open&&x2.focus==='uq'&&!x2.xvis,x2);
    /* an Arabic title: the whole row mirrors */
    await pg.fill('#uq','رجع'); await pg.waitForTimeout(400);
    const row=async title=>pg.evaluate(t=>{ const it=[...document.querySelectorAll('#usPanel .us-item')].find(x=>x.querySelector('.us-t')&&x.querySelector('.us-t').textContent.trim()===t); if(!it) return null; const c=r=>(r.left+r.right)/2;
      const th=it.querySelector('.us-th,.us-ic'), tt=it.querySelector('.us-t'), go=it.querySelector('.us-end.go'); return {rtl:it.matches(':dir(rtl)'),ltr:it.matches(':dir(ltr)'),dirAttr:it.getAttribute('dir'),thumbX:Math.round(c(th.getBoundingClientRect())),titleX:Math.round(c(tt.getBoundingClientRect())),goX:go&&Math.round(c(go.getBoundingClientRect())),goTransform:go&&getComputedStyle(go).transform}; },title);
    const ar=await row(AR);
    ok(N+'search: an Arabic result row is :dir(rtl): thumbnail right of the title, chevron at the left and mirrored',!!ar&&ar.dirAttr==='auto'&&ar.rtl&&ar.thumbX>ar.titleX&&ar.goX!==null&&ar.goX<ar.titleX&&/^matrix\(-1,/.test(ar.goTransform||''),ar);
    await pg.fill('#uq','restock'); await pg.waitForTimeout(400);
    const en=await row('Restock – 21 Oct');
    ok(N+'search: an English result row stays left-to-right: thumbnail left, chevron right, not mirrored',!!en&&en.ltr&&en.thumbX<en.titleX&&en.goX>en.titleX&&(en.goTransform==='none'||/^matrix\(1,/.test(en.goTransform||'')),en);
    await ctx.close(); }
}

/* =========== phone only: bar icons, Snap label, interface font =========== */
for(const scheme of ['light','dark']){
  const N=`phone ${scheme}: `;
  { const {ctx,pg}=await mk(PHONE,scheme,eight()); await homePage(pg);
    const bar=()=>pg.evaluate(()=>[...document.querySelectorAll('.hubbar a')].map(a=>{ const off=a.querySelector('svg.ic-off'), on=a.querySelector('svg.ic-on'), v=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0, sz=e=>{ const r=e.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height); };
      const shown=[off,on].filter(v)[0]; return {tab:a.dataset.tab,cur:a.getAttribute('aria-current'),svgs:a.querySelectorAll('svg').length,off:v(off),on:v(on),size:shown?sz(shown):null,filledOn:!!on&&((on.getAttribute('fill')&&on.getAttribute('fill')!=='none')||/fill="(?!none)[^"]+"/.test(on.innerHTML)),filledOff:!!off&&((off.getAttribute('fill')&&off.getAttribute('fill')!=='none')||/fill="(?!none)[^"]+"/.test(off.innerHTML))}; }));
    let g=await bar();
    ok(N+'bar: each tab has two icons, .ic-off (outline) and .ic-on (filled)',g.length===2&&g.every(x=>x.svgs===2),g);
    ok(N+'bar: the current tab (Home) shows only the filled icon, the other only the outline',g[0].cur==='true'&&g[0].on&&!g[0].off&&g[1].cur==='false'&&g[1].off&&!g[1].on,g);
    ok(N+'bar: icons are 24x24',g.every(x=>x.size==='24x24'),g.map(x=>x.size).join());
    ok(N+'bar: the .ic-on icons are really filled (fill set), the .ic-off outlines are not',g.every(x=>x.filledOn&&!x.filledOff),g.map(x=>x.tab+':'+x.filledOn+'/'+x.filledOff).join());
    await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForTimeout(700); g=await bar();
    ok(N+'bar: after Saved is chosen the icons swap (Saved filled, Home outline)',g[1].cur==='true'&&g[1].on&&!g[1].off&&g[0].cur==='false'&&g[0].off&&!g[0].on,g);
    await pg.tap('.hubbar a[data-tab="home"]'); await pg.waitForTimeout(700); g=await bar();
    ok(N+'bar: back on Home the icons swap back',g[0].on&&!g[0].off&&g[1].off&&!g[1].on,g);

    /* the interface font, and no weight 800 anywhere on Home */
    const f=await pg.evaluate(()=>{ const cs=(e)=>getComputedStyle(e), pick=s=>{ const e=document.querySelector(s); return e?{ff:cs(e).fontFamily,w:cs(e).fontWeight,sz:cs(e).fontSize}:null; };
      const heavy=[]; document.querySelectorAll('body *').forEach(e=>{ if(!e.getClientRects().length||['SCRIPT','STYLE'].includes(e.tagName)) return; const w=+cs(e).fontWeight; if(w>=800&&!(e.closest('svg'))) heavy.push(e.tagName.toLowerCase()+'.'+String(e.className).slice(0,30)+'='+w); });
      const root=cs(document.documentElement);
      return {body:pick('body'),h1:pick('.hero h1')||pick('h1'),h2:pick('.hub-sec h2'),heavy:heavy.slice(0,8),sans:root.getPropertyValue('--sans').trim(),brandSans:root.getPropertyValue('--brand-sans').trim(),display:root.getPropertyValue('--display').trim()}; });
    ok(N+'font: body and the page title use IBM Plex Sans Arabic',/^"?IBM Plex Sans Arabic/.test(f.body.ff)&&/^"?IBM Plex Sans Arabic/.test(f.h1.ff),{body:f.body.ff,h1:f.h1.ff});
    ok(N+'font: the interface font variable is not overwritten by the brand font (--brand-sans holds that)',/IBM Plex Sans Arabic/.test(f.sans)&&!!f.brandSans&&f.brandSans!==f.sans&&!/IBM Plex/.test(f.brandSans),{sans:f.sans,brandSans:f.brandSans});
    ok(N+'font: titles are weight 600',f.h1.w==='600'&&(!f.h2||f.h2.w==='600'),{h1:f.h1.w,h2:f.h2&&f.h2.w});
    ok(N+'font: no element on Home computes font-weight 800 or heavier',f.heavy.length===0,f.heavy.join(' | '));
    await homePage(pg); await pg.tap('.hubbar a[data-tab="saved"]'); await pg.waitForTimeout(700);
    const heavy2=await pg.evaluate(()=>{ const out=[]; document.querySelectorAll('#saved *').forEach(e=>{ if(e.getClientRects().length&&+getComputedStyle(e).fontWeight>=800&&!e.closest('svg')) out.push(e.tagName.toLowerCase()+'.'+String(e.className).slice(0,30)); }); return out.slice(0,8); });
    ok(N+'font: nor on the Saved page',heavy2.length===0,heavy2.join(' | '));
    await ctx.close(); }

  /* the tool page: Snap label + font */
  { const {ctx,pg}=await mk(PHONE,scheme,null); await pg.goto(BASE+'tools/restock.html'); await pg.waitForSelector('#snapBtn',{timeout:10000}); await pg.waitForTimeout(1200);
    const sn=await pg.evaluate(()=>{ const bt=document.getElementById('snapBtn'), r=bt.getBoundingClientRect(), lab=[...bt.querySelectorAll('span')].find(x=>x.textContent.trim()==='Snap'), lr=lab&&lab.getBoundingClientRect(), sv=bt.querySelector('svg'), cs=getComputedStyle(bt);
      return {text:bt.textContent.trim(),label:bt.getAttribute('aria-label'),pressed:bt.getAttribute('aria-pressed'),vis:r.width>0&&r.height>0&&cs.visibility!=='hidden',labelVisible:!!lab&&lr.width>0&&lr.height>0&&getComputedStyle(lab).display!=='none',icon:!!sv&&sv.getBoundingClientRect().width>0,
        iconLeftOfLabel:!!sv&&!!lab&&sv.getBoundingClientRect().right<=lr.left+1,w:Math.round(r.width),h:Math.round(r.height),inView:r.left>=0&&r.right<=innerWidth,ff:getComputedStyle(document.body).fontFamily,titleW:getComputedStyle(document.querySelector('.page-title')).fontWeight}; });
    ok(N+'Snap: a visible "Snap" label next to the magnet icon, still labelled "Snap to guides"',sn.vis&&sn.labelVisible&&sn.icon&&sn.iconLeftOfLabel&&sn.text==='Snap'&&sn.label==='Snap to guides'&&sn.inView,sn);
    ok(N+'Snap: at least 36px tall (plus its invisible hit area)',sn.h>=36&&sn.w>=56,sn);
    ok(N+'Snap: still an on/off toggle (aria-pressed)',sn.pressed==='false'&&await (async()=>{ await pg.tap('#snapBtn'); await pg.waitForTimeout(200); const on=await pg.getAttribute('#snapBtn','aria-pressed'); await pg.tap('#snapBtn'); await pg.waitForTimeout(200); return on==='true'&&await pg.getAttribute('#snapBtn','aria-pressed')==='false'; })());
    ok(N+'tool page: Plex interface font and a 600-weight title',/^"?IBM Plex Sans Arabic/.test(sn.ff)&&sn.titleW==='600',{ff:sn.ff,w:sn.titleW});
    await ctx.close(); }
}

await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);
