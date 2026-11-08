/* Brand rules check (2.3): every rule fed designs in the page; the quiet lines in the Save sheet of a tool (Restock) and of Create:
   a banned word -> a finding with a Fix that swaps it, text in the top 250 of a story -> a Fix that moves it, a clean design -> the Save sheet
   is exactly as before (same height, nothing added), Ignore survives a reload, the Settings switch turns the check off, the save still makes
   2160x3840 with findings present. 390x844 touch light + dark and 1280x800. Needs BASE (default http://127.0.0.1:8080/). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''&&!c?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const pngSize=async d=>{ const x=fs.readFileSync(await d.path()); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
const b=await chromium.launch(), errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n')[0]); process.exit(1); });
const mk=async(tag,opts,init)=>{ const ctx=await b.newContext({serviceWorkers:'block',acceptDownloads:true,...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(i=>{ try{ if(!localStorage.getItem('studio:welcome')) localStorage.setItem('studio:welcome','seen'); if(i) for(const [k,v] of Object.entries(i)) localStorage.setItem(k,v); }catch(_){} },init||null);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); return {ctx,pg}; };
const calm=pg=>pg.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'),null,{timeout:4000}).catch(()=>{});
const ready=pg=>pg.waitForFunction(()=>window.Studio&&Studio.debug&&Studio.debug.reg().length>0,null,{timeout:15000}).then(()=>pg.waitForTimeout(800));
/* the tool path: optionally push a text layer, make one real edit (so Save opens the sheet instead of saving at once), open the Save sheet */
async function edit(pg,tap){ await tap('#bar [data-open="words"]'); await pg.waitForTimeout(400);
  const c=pg.locator('#sh-words .chip[aria-pressed="false"]').first(); if(await c.count()) await c.tap().catch(()=>c.click()); await pg.waitForTimeout(700);
  await pg.evaluate(()=>{ const d=document.querySelector('#sh-words .done'); d&&d.click(); }); }
async function openSheet(pg,tap){ await pg.evaluate(()=>{ const d=document.querySelector('#sh-save [data-close]'); if(document.getElementById('sh-save').classList.contains('open')&&d) d.click(); }); await pg.waitForTimeout(500); await tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:6000}); await calm(pg); await pg.waitForTimeout(1300); }
async function toolSheet(pg,tap,extra){ await pg.goto(BASE+'tools/restock.html'); await ready(pg); await pg.evaluate(()=>{ Studio.debug.S.style='cans'; Studio.debug.render(); }); await pg.waitForTimeout(900);   // Cans: needs no photo, so a save goes through
  if(extra) await pg.evaluate(x=>{ Studio.debug.S.extras.push(x); },extra); await edit(pg,tap); await openSheet(pg,tap); }
const sheetH=pg=>pg.evaluate(()=>Math.round(document.getElementById('sh-save').getBoundingClientRect().height));
const rows=pg=>pg.evaluate(()=>{ const h=document.getElementById('rulesHost'); return {hidden:!h||h.hidden,rows:[...document.querySelectorAll('#rulesHost .rules-row')].map(r=>({t:r.querySelector('.rules-msg').textContent,fix:!!r.querySelector('[data-fix]'),h:Math.round(r.querySelector('.rules-btns .link').getBoundingClientRect().height)})),h:h?Math.round(h.getBoundingClientRect().height):0}; });
const TX=o=>({id:'tx-rules',text:'جربها',y:700,size:80,font:'display',color:'#161210',...o});

/* ---- 1. the rules, one by one (a design is fed straight to StudioRules.check) ---- */
{ const {ctx,pg}=await mk('unit',{viewport:{width:390,height:844}}); await pg.goto(BASE+'tools/restock.html'); await ready(pg);
  await pg.addScriptTag({url:BASE+'assets/rules.js'});
  const U=await pg.evaluate(()=>{
    const base=Studio.debug.rulesDesign(), T=(id,text,o)=>({id,kind:'text',text,x:100,y:700,w:600,h:100,size:80,color:'#161210',...o});
    const run=(items,o)=>StudioRules.check({...base,items,grounds:['#FFFFFF'],...o}), r={};
    const swap=text=>{ let got=null; const f=run([T('a',text,{api:{setText:t=>{ got=t; }}})]).find(x=>x.rule==='Banned word'); if(f&&f.fix) f.fix.apply(); return {found:!!f,fix:f&&f.fix&&f.fix.label,got}; };
    r.base=base.items.length>0&&!!base.rules&&base.format==='story';
    r.friend=swap('جربها يا خوي'); r.friend2=swap('تعال يا خويك'); r.harakat=swap('غَرْشَة باردة'); r.prefix=swap('بالغرشة'); r.cans=swap('علبتك غرشتك'); r.wayid=swap('وايد حلو'); r.cheers=swap('cheers!'); r.kasak=swap('كاسك'); r.mobaad=swap('مو بعد');
    r.ok=run([T('a','ربيعك واجد علبة')]).filter(f=>f.rule==='Banned word').length;
    r.passion=run([T('a','٢٥+ كوب'),T('b','باشن فروت')]).filter(f=>f.rule==='Passion fruit').length; r.passionOk=run([T('a','٢٥+ كوب'),T('b','كلاسيك')]).filter(f=>f.rule==='Passion fruit').length;
    r.passionAsset=run([T('a','25+'),{id:'c',kind:'asset',assetId:'can-passion',x:0,y:0,w:300,h:600}]).filter(f=>f.rule==='Passion fruit').length;
    r.look=run([T('a','x')],{grounds:['#FFFFFF','#F3EADC']}).filter(f=>f.rule==='One look').length; r.look1=run([T('a','x')],{grounds:['#F3EADC']}).filter(f=>f.rule==='One look').length;
    let moved=0; const z=run([T('a','يسرسح ثلج',{y:100,h:60,api:{move:d=>{ moved=d; }}})]).find(x=>x.rule==='Covered zone'); if(z&&z.fix) z.fix.apply(); r.zone={found:!!z,moved,fix:z&&z.fix&&z.fix.label};
    r.zoneBottom=run([T('a','يسرسح ثلج',{y:1700,h:100,api:{move:()=>{}}})]).filter(x=>x.rule==='Covered zone').length; r.zoneSafe=run([T('a','يسرسح ثلج',{y:600})]).filter(x=>x.rule==='Covered zone').length;
    r.zonePost=run([T('a','يسرسح ثلج',{y:20,h:60})],{format:'post',h:1350}).filter(x=>x.rule==='Covered zone').length;
    let k=0; const sm=run([T('a','يسرسح ثلج',{size:20,w:300,api:{scale:f=>{ k=f; }}})]).find(x=>x.rule==='Small text'); if(sm&&sm.fix) sm.fix.apply(); r.small={found:!!sm,k:+k.toFixed(2)}; r.smallOk=run([T('a','يسرسح ثلج',{size:40})]).filter(x=>x.rule==='Small text').length;
    r.contrast=run([T('a','يسرسح ثلج',{color:'#D6B078'})]).filter(x=>x.rule==='Hard to read').length; r.contrastOk=run([T('a','يسرسح ثلج',{color:'#161210'})]).filter(x=>x.rule==='Hard to read').length;
    r.contrastShape=run([{id:'s',kind:'shape',fill:'#161210',x:0,y:600,w:1080,h:400},T('a','يسرسح ثلج',{color:'#FFFFFF'})]).filter(x=>x.rule==='Hard to read').length;
    r.contrastPhoto=run([{id:'p',kind:'photo',x:0,y:0,w:1080,h:1920},T('a','يسرسح ثلج',{color:'#FFFFFF'})]).filter(x=>x.rule==='Hard to read').length;
    const can=id=>run([{id:'c',kind:'asset',assetId:id,x:0,y:0,w:100,h:100}]).filter(x=>x.rule==='HD can').length; r.can={old:can('can-old-photo'),hd:can('can-classic-shadow'),icon:can('can-icon'),logo:can('logo')};
    const nw=t=>run([T('a',t)]).filter(x=>x.rule==='New wording').length; r.neu={fresh:nw('قهوة باردة جدا'),approved:nw('يسرسح ثلج'),harakat:nw('يَسْرَسِح   ثلج'),dots:nw('صبر شوي'),date:nw('٧ – ١٣ نوفمبر'),latin:nw('1ST CHOICE'),noun:run([T('a','قهوة باردة جدا',{noun:true})]).filter(x=>x.rule==='New wording').length,
      extra:StudioRules.check({...base,items:[T('a','قهوة باردة جدا')],grounds:['#FFFFFF'],approved:['قهوة باردة جدا']}).filter(x=>x.rule==='New wording').length};
    r.hidden=run([T('a','خوي',{hidden:true})]).length; r.contrastFn=[StudioRules.contrast('#000','#fff'),StudioRules.contrast('#777','#777')].map(v=>+v.toFixed(1));
    return r; });
  ok('unit: the Restock design is read into items with the brand rules and story format',U.base);
  ok('banned: خوي is found, the Fix says "Use ربيع" and swaps it',U.friend.found&&U.friend.fix==='Use ربيع'&&U.friend.got==='جربها يا ربيع',U.friend);
  ok('banned: خويك -> ربيعك; harakat and a prefix do not dodge it (غَرْشَة, بالغرشة)',U.friend2.got==='تعال يا ربيعك'&&U.harakat.got==='علبة باردة'&&U.prefix.got==='بالعلبة',[U.friend2,U.harakat,U.prefix]);
  ok('banned: غرشتك -> علبتك (the longer word wins), وايد -> واجد',U.cans.got==='علبتك علبتك'&&U.wayid.got==='واجد حلو',[U.cans,U.wayid]);
  ok('banned: cheers words and "مو بعد" are found without a Fix',U.cheers.found&&!U.cheers.fix&&U.kasak.found&&!U.kasak.fix&&U.mobaad.found&&!U.mobaad.fix,[U.cheers,U.kasak,U.mobaad]);
  ok('banned: approved words are not flagged; hidden layers are skipped',U.ok===0&&U.hidden===0,[U.ok,U.hidden]);
  ok('Passion + "25+" (any digits) is flagged, with a Passion can too; Classic + 25+ is not',U.passion>=1&&U.passionAsset===1&&U.passionOk===0,[U.passion,U.passionAsset,U.passionOk]);
  ok('looks: White and Cream grounds on one design is flagged; one look is not',U.look===1&&U.look1===0,[U.look,U.look1]);
  ok('zone: text in the top 250 of a story is flagged, Fix moves it to y 250; bottom is flagged; safe text and a post are not',U.zone.found&&U.zone.moved===150&&U.zone.fix==='Move it in'&&U.zoneBottom===1&&U.zoneSafe===0&&U.zonePost===0,[U.zone,U.zoneBottom,U.zoneSafe,U.zonePost]);
  ok('small: 20 px text is flagged, Fix scales it to the 30 px minimum; 40 px is not',U.small.found&&U.small.k===1.5&&U.smallOk===0,[U.small,U.smallOk]);
  ok('contrast: gold on white is flagged, ink on white is not; white on a dark shape is fine; text over a photo is skipped',U.contrast===1&&U.contrastOk===0&&U.contrastShape===0&&U.contrastPhoto===0,[U.contrast,U.contrastOk,U.contrastShape,U.contrastPhoto,U.contrastFn]);
  ok('cans: a non-HD can asset is flagged; HD cans, the flat can icon and the logo are not',U.can.old===1&&U.can.hd===0&&U.can.icon===0&&U.can.logo===0,U.can);
  ok('new wording: a fresh Arabic line is flagged; approved lines (also with harakat/spacing/dots), dates, Latin, names and listed extras are not',U.neu.fresh===1&&U.neu.approved===0&&U.neu.harakat===0&&U.neu.dots===0&&U.neu.date===0&&U.neu.latin===0&&U.neu.noun===0&&U.neu.extra===0,U.neu);
  await ctx.close(); }

/* ---- 2. the Save sheet of a tool, three screens ---- */
for(const [tag,opts,touch] of [['phone light',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'},true],['phone dark',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'},true],['desktop',{viewport:{width:1280,height:800},colorScheme:'light'},false]]){
  const N=tag+': ';
  const heights=[];   // the clean default: check on vs check off, same height, no row
  for(const off of [false,true]){ const {ctx,pg}=await mk(tag,opts,off?{'studio:rulesOff':'1'}:null); const tap=s=>touch?pg.tap(s):pg.click(s);
    await toolSheet(pg,tap); const r=await rows(pg); heights.push({h:await sheetH(pg),r}); await ctx.close(); }
  ok(N+'a clean Restock design: the Save sheet is exactly as tall with the check on as off, the host takes no room, no finding row',heights[0].h===heights[1].h&&heights[0].r.hidden&&heights[0].r.h===0&&heights[0].r.rows.length===0,heights);

  const {ctx,pg}=await mk(tag,opts); const tap=s=>touch?pg.tap(s):pg.click(s); const dls=[]; pg.on('download',d=>dls.push(d));
  await toolSheet(pg,tap,TX({text:'جربها يا خوي',y:700}));
  let r=await rows(pg);
  ok(N+'a banned word gives one quiet line with a Fix and 44px+ targets',!r.hidden&&r.rows.length===1&&r.rows[0].fix&&/خوي/.test(r.rows[0].t)&&r.rows[0].h>=44,r);
  const vis=await pg.evaluate(()=>{ const h=document.getElementById('rulesHost'), s=document.getElementById('save'); return {before:!!(h.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING),saveEnabled:!s.disabled,filled:[...document.querySelectorAll('#sh-save .btn')].filter(x=>x.offsetParent&&!x.classList.contains('ghost')).length}; });
  ok(N+'the line sits above Save, Save is enabled, at most two filled buttons',vis.before&&vis.saveEnabled&&vis.filled<=2,vis);
  await tap('#rulesHost [data-fix]'); await pg.waitForTimeout(900);
  const sw=await pg.evaluate(()=>({t:Studio.debug.S.extras.find(x=>x.id==='tx-rules').text,banned:[...document.querySelectorAll('#rulesHost .rules-row')].some(r=>/Banned word/.test(r.textContent))}));
  ok(N+'Fix swaps the word for ربيع and the line goes away',sw.t==='جربها يا ربيع'&&!sw.banned,sw);

  await pg.evaluate(()=>{ Studio.debug.S.extras.find(x=>x.id==='tx-rules').y=80; Studio.debug.render(); }); await pg.waitForTimeout(600); await openSheet(pg,tap);   // top zone
  r=await rows(pg); ok(N+'text in the top 250 of a story is flagged with a Move fix',r.rows.some(x=>/Instagram covers the top/.test(x.t)&&x.fix),r);
  await tap('#rulesHost [data-fix]'); await pg.waitForTimeout(1200);
  const mv=await pg.evaluate(()=>{ const q=Studio.debug.reg().find(q=>q.id==='tx-rules'); return {y:Math.round(q.y)}; });
  ok(N+'Fix moved the layer to y 250 or below',mv.y>=249,mv);

  await pg.evaluate(()=>{ const S=Studio.debug.S; ['a','b','c','d','e'].forEach((k,i)=>S.extras.push({id:'bad'+k,text:'خوي '+k,y:500+i*90,size:70,font:'display',color:'#161210'})); Studio.debug.render(); }); await pg.waitForTimeout(600); await openSheet(pg,tap);
  r=await rows(pg); const more=await pg.evaluate(()=>{ const m=document.querySelector('#rulesHost .rules-more'); return m&&{t:m.textContent,h:Math.round(m.getBoundingClientRect().height)}; });
  ok(N+'at most 3 lines show, the rest sit behind "N more" (44px+)',r.rows.length===3&&more&&/\d more/.test(more.t)&&more.h>=44,[r.rows.length,more]);
  await tap('#rulesHost .rules-more'); await pg.waitForTimeout(200); r=await rows(pg); ok(N+'"N more" shows them all',r.rows.length>3,r.rows.length);

  const url=pg.url(), scope=await pg.evaluate(()=>'draft:'+Studio.debug.draftId());   // Ignore: per draft, kept after a reload
  const first=await pg.evaluate(()=>document.querySelector('#rulesHost .rules-row .rules-msg').textContent);
  await tap('#rulesHost .rules-row:first-child [data-ign]'); await pg.waitForTimeout(200);
  const ig=await pg.evaluate(s=>({n:StudioRules.ignored(s).size,key:Object.keys(localStorage).filter(k=>k.startsWith('studio:rulesIgn:'))}),scope);
  ok(N+'Ignore is stored per draft',ig.n===1&&ig.key.length===1&&ig.key[0]==='studio:rulesIgn:'+scope,[ig,scope]);
  await pg.goto(url); await ready(pg);
  await pg.evaluate(()=>{ const S=Studio.debug.S; ['a','b','c','d','e'].forEach((k,i)=>{ if(!S.extras.some(x=>x.id==='bad'+k)) S.extras.push({id:'bad'+k,text:'خوي '+k,y:500+i*90,size:70,font:'display',color:'#161210'}); }); });
  await edit(pg,tap); await openSheet(pg,tap);
  const after=await pg.evaluate(()=>[...document.querySelectorAll('#rulesHost .rules-row .rules-msg')].map(r=>r.textContent));
  ok(N+'after a reload the ignored line stays ignored (the others still show)',after.length>=1&&!after.includes(first),[first,after]);

  await tap('#save'); for(let i=0;i<60&&!dls.length;i++) await pg.waitForTimeout(300);   // never blocked
  ok(N+'with findings on screen, Save still makes the 2160x3840 PNG',dls.length>0&&await pngSize(dls[0])==='2160x3840',dls.length?await pngSize(dls[0]):'no download');
  await ctx.close();

  const s2=await mk(tag,opts), t2=s=>touch?s2.pg.tap(s):s2.pg.click(s);   // Settings: Brand check off -> no check
  await s2.pg.goto(BASE+'index.html'); await s2.pg.waitForSelector('#setBtn'); await t2('#setBtn'); await s2.pg.waitForSelector('dialog.set-dlg[open]'); await calm(s2.pg);
  const row=await s2.pg.evaluate(()=>{ const q=document.querySelector('[data-set=rules]'); return q&&{on:q.getAttribute('aria-checked'),role:q.getAttribute('role'),h:Math.round(q.getBoundingClientRect().height),t:q.textContent}; });
  ok(N+'Settings has a Brand check switch, on by default, 44px+',row&&row.role==='switch'&&row.on==='true'&&row.h>=44&&/Brand check/.test(row.t),row);
  await t2('[data-set=rules]'); const off=await s2.pg.evaluate(()=>({on:document.querySelector('[data-set=rules]').getAttribute('aria-checked'),ls:localStorage.getItem('studio:rulesOff')}));
  ok(N+'tapping it turns the check off on this device',off.on==='false'&&off.ls==='1',off);
  await toolSheet(s2.pg,t2,TX({text:'يا خوي'}));
  const lazy=await s2.pg.evaluate(()=>({rows:document.querySelectorAll('#rulesHost .rules-row').length,hidden:document.getElementById('rulesHost').hidden}));
  ok(N+'with Brand check off, a banned word shows nothing',lazy.rows===0&&lazy.hidden,lazy);
  await s2.ctx.close();
}

/* ---- 3. Create: the same lines in its Save sheet ---- */
for(const [tag,opts,touch] of [['create phone light',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'},true],['create phone dark',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'},true],['create desktop',{viewport:{width:1280,height:800},colorScheme:'light'},false]]){
  const N=tag+': '; const {ctx,pg}=await mk(tag,opts); const tap=s=>touch?pg.tap(s):pg.click(s); const dls=[]; pg.on('download',d=>dls.push(d));
  await pg.goto(BASE+'tools/create.html?size=story'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(700);
  const openSave=async()=>{ await pg.evaluate(()=>{ const x=document.getElementById('crSheetX'); x&&x.offsetParent&&x.click(); }); await tap('#crBar [data-cr="save"]'); await pg.waitForSelector('#crGo',{timeout:5000}); await calm(pg); await pg.waitForTimeout(1300); };
  const addText=(id,text,y)=>pg.evaluate(([id,text,y])=>{ const f=BD.util.frames()[0], n=BD.make.text(text,{fontSize:90,x:200,y}); f.add(n); n.id(id); BD.prepText(n); BD.changed(); },[id,text,y]);
  await openSave(); let r=await rows(pg);
  ok(N+'an empty page: no finding, the host takes no room',r.hidden&&r.h===0&&r.rows.length===0,r);
  await addText('rules-t1','جربها يا خوي',700); await openSave(); r=await rows(pg);
  ok(N+'a banned word shows a line with a Fix and 44px+ targets',!r.hidden&&r.rows.length===1&&r.rows[0].fix&&r.rows[0].h>=44,r);
  await tap('#rulesHost [data-fix]'); await pg.waitForTimeout(800);
  const t1=await pg.evaluate(()=>BD.main.findOne('#rules-t1').text()); r=await rows(pg);
  ok(N+'Fix swaps it for ربيع and the banned line goes away',t1==='جربها يا ربيع'&&!r.rows.some(x=>/Banned/.test(x.t)),[t1,r]);
  await pg.evaluate(()=>{ const n=BD.main.findOne('#rules-t1'), f=BD.util.frameOf(n); BD.util.moveByWorld(n,0,f.y()+80-BD.util.wrect(n).y); BD.changed(); });
  await openSave(); r=await rows(pg); ok(N+'text in the top 250 of a story is flagged with a Move fix',r.rows.some(x=>/covers the top/.test(x.t)&&x.fix),r);
  await tap('#rulesHost [data-fix]'); await pg.waitForTimeout(800);
  const y=await pg.evaluate(()=>{ const n=BD.main.findOne('#rules-t1'), f=BD.util.frameOf(n); return Math.round(BD.util.wrect(n).y-f.y()); });
  ok(N+'Fix moved it to y 250 or below',y>=249,y);
  await addText('rules-t2','قهوة باردة جدا',900); await openSave(); r=await rows(pg);
  ok(N+'a new Arabic line that is not approved is flagged (no Fix)',r.rows.some(x=>/new wording/.test(x.t)&&!x.fix),r);
  const nB=r.rows.length; await tap('#rulesHost .rules-row:last-child [data-ign]'); await pg.waitForTimeout(200); r=await rows(pg); ok(N+'Ignore removes that line',r.rows.length===nB-1&&!r.rows.some(x=>/new wording/.test(x.t)),r);
  await pg.evaluate(()=>{ const n=BD.main.findOne('#rules-t2'); n.text('خوي'); BD.prepText(n); BD.changed(); }); await openSave();
  await tap('#crGo'); for(let i=0;i<80&&!dls.length;i++) await pg.waitForTimeout(300);
  ok(N+'with a finding on screen, Save image still makes the 2160x3840 PNG',dls.length>0&&await pngSize(dls[0])==='2160x3840',dls.length?await pngSize(dls[0]):'no download');
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
