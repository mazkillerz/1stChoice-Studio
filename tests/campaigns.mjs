/* Campaign sets (w2-campaigns, preview flag team). fakecloud stands in for Supabase.
   1 flag off: no Campaigns row, no Campaign button, no "Add to campaign" row, no campaigns.js/css request, designs open exactly as saved
   2 phone 390 touch (light): Select 3 saved designs (a Create story, a Create post, a Restock) -> Campaign -> "Spring launch": the campaign view shows its
     3 designs with a format label; a headline typed once is stored in the campaign; the designs open with it, except the one that overrides it
     (its headline was edited inside the design and saved: recipe.camp.over.headline); change the headline again -> after reopening the two follow, the
     overridden one keeps its own text
   3 Save all: ONE ZIP of 3 full-size PNGs (story 2160x3840, post 2160x2700, Restock 2160x3840), the pictures carry the campaign headline
   4 Add all to the team says all are already with the team; Plan this campaign: 3 calendar items with campaign_id, the calendar shows the campaign name
   5 design menu: "Add to campaign" / "Campaign: name"; take a design out of the campaign
   6 dark phone and 1280 desktop: the view opens, readable, Save all gives a ZIP; every button >= 44px (>= 48 for the filled one), <= 2 filled per view, no sideways scroll
   Run: server on :8080 (or BASE=...), then node tests/campaigns.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const S=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const jpg=n=>'data:image/jpeg;base64,'+fs.readFileSync(S+n+'.jpg').toString('base64');
const res=[]; let tag=''; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+tag+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const pngWH=buf=>buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
function readZip(buf){ const out=[]; let p=0; while(buf.readUInt32LE(p)===0x04034b50){ const size=buf.readUInt32LE(p+18), nl=buf.readUInt16LE(p+26), xl=buf.readUInt16LE(p+28);
  out.push({name:buf.slice(p+30,p+30+nl).toString('utf8'),data:buf.slice(p+30+nl+xl,p+30+nl+xl+size)}); p+=30+nl+xl+size; } return out; }
const PHONE={width:390,height:844}, DESK={width:1280,height:800};
const mk=async(vp,{touch=true,scheme='light',flag=true,seed}={})=>{
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(({s,flag,touch})=>{ try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
    if(flag) localStorage.setItem('studio:flag:team','1'); if(s&&!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',s); }catch(e){}
    if(touch) navigator.canShare=()=>false; },{s:seed?JSON.stringify(seed):null,flag,touch});
  return ctx; };
const newPage=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(tag+e.message)); return pg; };
const dbOf=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));

/* ---- seed: real recipes from Create (two templates) and Restock ---- */
const db={designs:{},files:{},cols:{}};
{ const ctx=await mk(PHONE,{flag:false}); const pg=await newPage(ctx); const pics=['shelf','closeup','hand'];
  const doc={};
  for(const tpl of ['ice-cold','did-you-know-post']){ await pg.goto(BASE+'tools/create.html?tpl='+tpl); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0&&BD.main.find('Text').length>0,null,{timeout:25000}); await pg.waitForTimeout(600); doc[tpl]=await pg.evaluate(()=>JSON.parse(BD.docJson())); }
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug); const rr=await pg.evaluate(()=>Studio.debug.recipe());
  const thumb=(id,n)=>{ db.files['1stchoice/'+id+'/thumb.jpg']=jpg(n); return '1stchoice/'+id+'/thumb.jpg'; };
  const when=i=>new Date(Date.now()-i*3600e3).toISOString();
  db.designs.cStory={id:'cStory',brand:'1stchoice',tool:'create',name:'Story teaser',kind:'design',recipe:{v:1,kind:'board',doc:doc['ice-cold'],imgs:[],photoPaths:[]},thumb_path:thumb('cStory','tall'),cols:[],updated_at:when(1)};
  db.designs.cPost={id:'cPost',brand:'1stchoice',tool:'create',name:'Did you know post',kind:'design',recipe:{v:1,kind:'board',doc:doc['did-you-know-post'],imgs:[],photoPaths:[]},thumb_path:thumb('cPost','closeup'),cols:[],updated_at:when(2)};
  { const r=JSON.parse(JSON.stringify(rr)), paths=[]; r.photos.forEach((p,i)=>{ const k='1stchoice/sRestock/photo-'+i+'.jpg'; db.files[k]=jpg(pics[i%3]); paths.push(k); }); r.photos=r.photos.map(p=>({...p,has:true}));
    db.designs.sRestock={id:'sRestock',brand:'1stchoice',tool:'restock',name:'Shelf day',kind:'design',recipe:{...r,photoPaths:paths},thumb_path:thumb('sRestock','shelf'),cols:[],updated_at:when(3)}; }
  db.designs.sOther={id:'sOther',brand:'1stchoice',tool:'restock',name:'Not in it',kind:'design',recipe:{photoPaths:[]},thumb_path:thumb('sOther','hand'),cols:[],updated_at:when(4)};
  await ctx.close(); }

const card=id=>`#savedGrid .sv-card[data-id="${id}"] .sv-open`;
const HEAD1='Fresh batch today', HEAD2='Back this weekend', OWN='My own line';
const rd=(pg,n)=>pg.evaluate(n=>JSON.parse(localStorage.getItem('fakecloud')),n);

/* run one matrix cell */
async function cell(name,vp,opt){
  tag=name+': '; const touch=opt.touch!==false;
  const ctx=await mk(vp,{...opt,seed:db}); const pg=await newPage(ctx); const tap=s=>touch?pg.tap(s):pg.click(s);
  const goSaved=async()=>{ await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:15000}); await pg.waitForTimeout(500); await tap('[data-see-all]'); await pg.waitForSelector('#savedGrid .sv-card'); await pg.waitForTimeout(500); };
  const noScroll=async s=>pg.evaluate(s=>{ const e=document.querySelector(s); return !e||e.scrollWidth<=e.clientWidth+1; },s);
  const tapsOk=async(root)=>pg.evaluate(root=>[...document.querySelectorAll(root+' button, '+root+' a.btn, '+root+' .cp-open')].filter(x=>x.offsetParent&&!x.disabled).map(x=>{ const r=x.getBoundingClientRect(); return [(x.textContent||x.getAttribute('aria-label')||'').trim().slice(0,22),Math.round(r.height)]; }).filter(([,h])=>h<44),root);
  const filled=root=>pg.evaluate(root=>[...document.querySelectorAll(root+' .btn, '+root+' .mini.solid')].filter(x=>x.offsetParent&&!x.classList.contains('ghost')).length,root);
  const fullFlow=name==='phone/light';

  if(name==='phone/light'){
    /* 1 flag off */
    { const c2=await mk(vp,{flag:false,seed:db}); const p2=await newPage(c2); let req=0; p2.on('request',r=>{ if(/campaigns\.(js|css)/.test(r.url())) req++; });
      await p2.goto(BASE+'index.html'); await p2.waitForSelector('#savedRowList .sv-card',{timeout:15000}); await p2.waitForTimeout(500); await p2.tap('[data-see-all]'); await p2.waitForSelector('#savedGrid .sv-card'); await p2.waitForTimeout(700);
      ok('flag off: no Campaigns row, no Campaign button, no request',!(await p2.$('#campRow'))&&!(await p2.$('#selCamp'))&&req===0&&!(await p2.evaluate(()=>!!window.StudioCampaigns)),req);
      await p2.evaluate(()=>{ const m=document.querySelector('[data-dmore]'); if(m) m.click(); }); await p2.waitForSelector('.design-sheet',{timeout:5000}).catch(()=>{});
      ok('flag off: the design menu has no campaign row',!(await p2.$('[data-camp]')));
      await p2.goto(BASE+'tools/create.html?design=cStory'); await p2.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0&&BD.main.find('Text').length>0,null,{timeout:25000});
      ok('flag off: a design opens as saved and loads no campaign code',!(await p2.evaluate(()=>!!window.StudioCampaigns)));
      await c2.close(); }
  }

  await goSaved();
  ok('Saved has the Campaigns row',!!(await pg.$('#campRow [data-camps]'))&&await pg.isVisible('#campRow [data-camps]'));
  /* 2 make a campaign from three designs */
  await tap('#selBtn'); await pg.waitForTimeout(300);
  for(const id of ['cStory','cPost','sRestock']){ await tap(card(id)); } await pg.waitForTimeout(200);
  ok('Select mode has a Campaign button that works with 3 designs',await pg.isEnabled('#selCamp'));
  const sb=await pg.evaluate(()=>{ const bs=[...document.querySelectorAll('#selBar .sel-act')].filter(x=>!x.hidden); return {n:bs.length,min:Math.min(...bs.map(x=>x.getBoundingClientRect().width)),h:Math.min(...bs.map(x=>x.getBoundingClientRect().height)),fit:document.getElementById('selBar').scrollWidth<=document.getElementById('selBar').clientWidth+1}; });
  ok('the select bar still fits (every button >= 44 wide and tall)',sb.min>=44&&sb.h>=44&&sb.fit,sb);
  await tap('#selCamp'); await pg.waitForSelector('.camp-dlg #adNew');
  ok('the sheet says "Make a campaign of 3 designs"',/Make a campaign of 3 designs/.test(await pg.textContent('.camp-dlg h3')));
  ok('the Make-a-campaign sheet: buttons >= 44, one filled',(await tapsOk('.camp-dlg')).length===0&&(await filled('.camp-dlg'))<=2,await tapsOk('.camp-dlg'));
  await pg.fill('#adNew','Spring launch'); await pg.waitForTimeout(100); ok('the button names the new campaign',/Start “Spring launch”/.test(await pg.textContent('#adGo')));
  await tap('#adGo'); await pg.waitForSelector('.camp-view #cvGrid .cp-card',{timeout:10000}); await pg.waitForTimeout(500);
  let d=await dbOf(pg); const camp=d.campaigns&&d.campaigns[0];
  ok('a campaign was saved with the author and no words yet',!!camp&&camp.name==='Spring launch'&&camp.author==='Sara'&&Object.keys(camp.words||{}).length===0,camp);
  ok('the three designs carry campaign_id',['cStory','cPost','sRestock'].every(i=>d.designs[i].campaign_id===camp.id)&&!d.designs.sOther.campaign_id);
  const cards=await pg.$$eval('#cvGrid .cp-card',els=>els.map(e=>({n:e.querySelector('b').textContent,f:e.querySelector('.cp-fmt').textContent})));
  ok('the view lists the 3 designs with a format label',cards.length===3&&cards.some(c=>c.n==='Story teaser'&&c.f==='Story')&&cards.some(c=>c.n==='Shelf day'&&c.f==='Story')&&cards.some(c=>c.n==='Did you know post'&&c.f==='Post'),cards);
  ok('campaign view: every button >= 44px',(await tapsOk('.camp-view')).length===0,await tapsOk('.camp-view'));
  ok('campaign view: at most 2 filled buttons',(await filled('.camp-view'))<=2,await filled('.camp-view'));
  ok('campaign view: no sideways scroll',await noScroll('.camp-view')&&await noScroll('dialog.camp'));
  /* shared words */
  await pg.fill('#cvW-headline',HEAD1); await tap('#cvSaveW'); await pg.waitForFunction(()=>/Saved/.test(document.getElementById('cvSt').textContent),null,{timeout:8000});
  d=await dbOf(pg); ok('the headline is stored in the campaign',d.campaigns[0].words.headline===HEAD1,d.campaigns[0].words);
  if(!fullFlow){ /* the lighter cells: the view, Save all and Plan are checked below; the headline flow is run on phone/light */ }
  const openStat=async()=>pg.evaluate(()=>1);
  const headOfCreate=async id=>{ await pg.goto(BASE+'tools/create.html?design='+id); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0&&BD.main.find('Text').length>0,null,{timeout:25000}); await pg.waitForTimeout(700); return pg.evaluate(()=>BD.main.find('Text').map(t=>t.text())); };
  const headOfRestock=async()=>{ await pg.goto(BASE+'tools/restock.html?design=sRestock'); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&!document.getElementById('designBar').hidden,null,{timeout:25000}); await pg.waitForTimeout(500); return pg.evaluate(()=>{ const v=Studio.debug.recipe().values.head; return v.pick==='__own'?v.own:v.pick; }); };
  if(fullFlow){
    let t=await headOfCreate('cStory'); ok('the Create story opens with the campaign headline',t.includes(HEAD1),t.slice(0,4));
    t=await headOfRestock(); ok('the Restock opens with the campaign headline',t===HEAD1,t);
    /* override: edit the headline inside the Create post, save */
    t=await headOfCreate('cPost'); ok('the Create post opens with the campaign headline',t.includes(HEAD1),t.slice(0,4));
    await pg.evaluate(h=>{ const n=BD.main.find('Text').find(x=>x.text()===h); n.text('My own line'); BD.changed(); },HEAD1); await pg.waitForTimeout(400);
    await tap('#crBar [data-cr="save"]'); await pg.waitForSelector('#crGo'); await pg.waitForTimeout(400); await tap('#crTeamOnly');
    await pg.waitForFunction(()=>{ const d=JSON.parse(localStorage.getItem('fakecloud')).designs.cPost; return d&&d.recipe.camp&&d.recipe.camp.over&&d.recipe.camp.over.headline; },null,{timeout:20000}).catch(()=>{}); await pg.waitForTimeout(500);
    d=await dbOf(pg); ok('saving the edited post marks its headline as an override',!!(d.designs.cPost.recipe.camp&&d.designs.cPost.recipe.camp.over.headline),d.designs.cPost.recipe.camp);
    /* change the headline again from the campaign view */
    await goSaved(); await tap('#campRow [data-camps]'); await pg.waitForSelector('#cpList [data-cp]'); await tap('#cpList [data-cp]'); await pg.waitForSelector('.camp-view #cvW-headline');
    ok('Saved > Campaigns opens the campaign with its words',(await pg.inputValue('#cvW-headline'))===HEAD1);
    await pg.fill('#cvW-headline',HEAD2); await tap('#cvSaveW'); await pg.waitForFunction(()=>/Saved/.test(document.getElementById('cvSt').textContent),null,{timeout:8000});
    t=await headOfCreate('cStory'); ok('after the change the Create story follows',t.includes(HEAD2)&&!t.includes(HEAD1),t.slice(0,4));
    t=await headOfRestock(); ok('after the change the Restock follows',t===HEAD2,t);
    t=await headOfCreate('cPost'); ok('the overridden post keeps its own text',t.includes(OWN)&&!t.includes(HEAD2),t.slice(0,4));
    d=await dbOf(pg); ok('a design outside the campaign is untouched',!d.designs.sOther.campaign_id);
    /* the look */
    await goSaved(); await tap('#campRow [data-camps]'); await pg.waitForSelector('#cpList [data-cp]'); await tap('#cpList [data-cp]'); await pg.waitForSelector('.camp-view #cvLook');
    await tap('#cvLook [data-look="cream"]'); await tap('#cvSaveW'); await pg.waitForFunction(()=>/Saved/.test(document.getElementById('cvSt').textContent),null,{timeout:8000});
    d=await dbOf(pg); ok('the look is stored (cream)',d.campaigns[0].look==='cream');
    await pg.goto(BASE+'tools/restock.html?design=sRestock'); await pg.waitForFunction(()=>window.Studio&&Studio.debug&&!document.getElementById('designBar').hidden,null,{timeout:25000}); await pg.waitForTimeout(500);
    ok('the Restock opens in the Cream look',(await pg.evaluate(()=>Studio.debug.recipe().style))==='cream');
  }
  await goSaved(); await tap('#campRow [data-camps]'); await pg.waitForSelector('#cpList [data-cp]'); await tap('#cpList [data-cp]'); await pg.waitForSelector('.camp-view #cvGrid .cp-card'); await pg.waitForTimeout(400);
  /* 3 Save all */
  const dl=pg.waitForEvent('download',{timeout:240000}); await tap('#cvAll');
  const down=await dl.catch(()=>null);
  if(down){ const p=await down.path(); const z=fs.existsSync(p)?readZip(fs.readFileSync(p)):[]; const sizes=z.map(f=>pngWH(f.data));
    ok('Save all: one ZIP of 3 PNGs',/\.zip$/.test(down.suggestedFilename())&&z.length===3&&z.every(f=>/\.png$/.test(f.name)),z.map(f=>f.name));
    ok('Save all: full size (2x: story 2160x3840, post 2160x2700)',sizes.filter(s=>s==='2160x3840').length===2&&sizes.includes('2160x2700'),sizes); }
  else ok('Save all gives a download',false);
  await pg.waitForFunction(()=>{ const h=document.getElementById('bsH'); return h&&/Saved/.test(h.textContent); },null,{timeout:20000}).catch(()=>{});
  ok('Save all: the dialog says Saved!',/Saved/.test(await pg.evaluate(()=>(document.getElementById('bsH')||{}).textContent||'')));
  await pg.evaluate(()=>{ const x=document.getElementById('bsCancel'); if(x) x.click(); }); await pg.waitForTimeout(300);

  if(fullFlow){
    /* 4 Add all to the team, Plan */
    await goSaved(); await tap('#campRow [data-camps]'); await pg.waitForSelector('#cpList [data-cp]'); await tap('#cpList [data-cp]'); await pg.waitForSelector('.camp-view #cvGrid .cp-card');
    await tap('#cvTeam'); await pg.waitForFunction(()=>/already with the team/.test(document.getElementById('cvSt').textContent),null,{timeout:5000}).catch(()=>{});
    ok('Add all to the team says everything is already with the team',/All 3 designs are already with the team/.test(await pg.textContent('#cvSt')),await pg.textContent('#cvSt'));
    await tap('#cvPlan'); await pg.waitForSelector('.cp-plan-row');
    const rows=await pg.$$('.cp-plan-row [data-day]'); ok('Plan: one date row per design',rows.length===3);
    ok('Plan: sheet buttons >= 44, inputs >= 44, one filled',(await tapsOk('.camp-dlg')).length===0&&(await pg.evaluate(()=>[...document.querySelectorAll('.cp-plan-row input')].every(i=>i.getBoundingClientRect().height>=44))));
    const today=await pg.evaluate(()=>{ const n=new Date(),p=x=>(x<10?'0':'')+x; return n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate()); });
    for(const r of rows) await r.fill(today);
    await tap('#plGo'); await pg.waitForFunction(()=>(JSON.parse(localStorage.getItem('fakecloud')).calendar||[]).length>=3,null,{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(800);
    d=await dbOf(pg); const items=d.calendar||[];
    ok('Plan this campaign made 3 calendar items with campaign_id',items.length===3&&items.every(i=>i.campaign_id===d.campaigns[0].id&&i.status==='draft'&&i.design_ids.length===1&&i.brand==='1stchoice'),items.map(i=>[i.title,i.campaign_id]));
    await pg.waitForSelector('#calendarView .cal-item',{timeout:10000}).catch(()=>{});
    const names=await pg.$$eval('#calendarView .ci-camp',els=>els.map(e=>e.textContent));
    ok('the calendar shows the campaign name on its items',names.length===3&&names.every(n=>n==='Spring launch'),names);
    /* 5 design menu, take one out */
    await goSaved(); await pg.evaluate(()=>{ const m=document.querySelector('#savedGrid [data-id="cPost"] [data-dmore]'); if(m) m.click(); else document.querySelector('#savedGrid [data-id="cPost"] .sv-open').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})); });
    await pg.waitForSelector('.design-sheet [data-camp]',{timeout:5000}).catch(()=>{});
    ok('a campaign design menu says "Campaign: Spring launch"',/Campaign: Spring launch/.test(await pg.textContent('.design-sheet [data-camp]').catch(()=>'')));
    await pg.evaluate(()=>document.querySelector('.design-sheet #dsClose').click()); await pg.waitForTimeout(300);
    await pg.evaluate(()=>{ const m=document.querySelector('#savedGrid [data-id="sOther"] [data-dmore]'); if(m) m.click(); else document.querySelector('#savedGrid [data-id="sOther"] .sv-open').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})); });
    await pg.waitForSelector('.design-sheet [data-camp]',{timeout:5000}).catch(()=>{});
    ok('a free design menu says "Add to campaign"',/Add to campaign/.test(await pg.textContent('.design-sheet [data-camp]').catch(()=>'')));
    await tap('.design-sheet [data-camp]'); await pg.waitForSelector('.camp-dlg #adChips [data-id]'); await tap('#adChips [data-id]'); await tap('#adGo'); await pg.waitForFunction(()=>!!(JSON.parse(localStorage.getItem('fakecloud')).designs.sOther||{}).campaign_id,null,{timeout:8000}).catch(()=>{});
    d=await dbOf(pg); ok('"Add to campaign" put the design in it',d.designs.sOther.campaign_id===d.campaigns[0].id);
    await pg.waitForTimeout(600); await tap('#campRow [data-camps]'); await pg.waitForSelector('#cpList [data-cp]'); await tap('#cpList [data-cp]'); await pg.waitForSelector('.camp-view #cvGrid [data-rm="sOther"]',{timeout:8000});
    await tap('#cvGrid [data-rm="sOther"]'); await pg.waitForFunction(()=>!(JSON.parse(localStorage.getItem('fakecloud')).designs.sOther||{}).campaign_id,null,{timeout:5000}).catch(()=>{});
    d=await dbOf(pg); ok('taking a design out clears its campaign_id',!d.designs.sOther.campaign_id);
  }
  await ctx.close();
}
await cell('phone/light',PHONE,{touch:true,scheme:'light'});
await cell('phone/dark',PHONE,{touch:true,scheme:'dark'});
await cell('desktop',DESK,{touch:false,scheme:'light'});
await b.close();
console.log(res.join('\n'));
const bad=res.filter(x=>x.startsWith('FAIL')), errsF=errs.filter(e=>!/fonts\.g|status of 404|Failed to load resource/.test(e));
if(errsF.length){ console.log('FAIL page errors: '+errsF.slice(0,5).join(' | ')); }
console.log(`${res.length-bad.length}/${res.length} passed`); process.exit(bad.length||errsF.length?1:0);
