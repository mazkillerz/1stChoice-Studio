/* Team assets (2.3.0): the team's own pictures as layers. Add flow (stand-in background remover) -> row + files in the fake cloud,
   library tile, the tool's Team group, pick -> layer {ref:'team:…',path}, Save PNG contains its pixels, save to the team and reopen,
   remove from the library and the design still draws, rename/tags/folder, search + sort, table missing, signed out.
   Screenshots (390x844 light + dark) go to SHOTS (default /tmp/ta-shots). Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
import { chooseTeam } from './_saveflow-helpers.mjs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const SHOTS=process.env.SHOTS||'/tmp/ta-shots'; fs.mkdirSync(SHOTS,{recursive:true});
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const stub=fs.readFileSync(new URL('fixtures/cutout-pro-stub.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i)).slice(0,200)+')':'')); };
const b=await chromium.launch(), errs=[];
const pngSize=async d=>{ const x=fs.readFileSync(await d.path()); return x.readUInt32BE(16)+'x'+x.readUInt32BE(20); };
async function mk(scheme){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,colorScheme:scheme||'light'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/assets\/cutout-pro\.js/,r=>r.fulfill({contentType:'application/javascript',body:stub}));
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('studio:welcome','seen'); }catch(_){} });
  return ctx;
}
const page=async ctx=>{ const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); }); return pg; };
const ctx=await mk(), pg=await page(ctx), dls=[]; pg.on('download',d=>dls.push(d));
const waitDl=async n=>{ for(let i=0;i<60&&dls.length<n;i++) await pg.waitForTimeout(300); return dls[n-1]; };
const fdb=p=>(p||pg).evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{}'));
/* fixtures made in the page: a green logo with a see-through "O" hole on white, and two tiny solid pictures */
const makePng=(p,w,h,draw)=>p.evaluate(([w,h,draw])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); new Function('x','w','h',draw)(x,w,h); return c.toDataURL('image/png').split(',')[1]; },[w,h,draw]);
const LOGO='x.fillStyle="#fff";x.fillRect(0,0,w,h);x.fillStyle="#00c83c";x.beginPath();x.roundRect(60,60,w-120,h-120,40);x.fill();x.fillStyle="#fff";x.beginPath();x.arc(w/2,h/2,60,0,7);x.fill();';
await pg.goto(BASE+'index.html'); await pg.evaluate(()=>localStorage.clear());
const mkFile=async(name,w,h,draw)=>{ const f='/tmp/'+name; fs.writeFileSync(f,Buffer.from(await makePng(pg,w,h,draw),'base64')); return f; };
const logo=await mkFile('partner_bakery-logo.png',600,400,LOGO);
const blue=await mkFile('blue-badge.png',300,300,'x.fillStyle="#fff";x.fillRect(0,0,w,h);x.fillStyle="#2040d0";x.fillRect(50,50,200,200);');

/* 1. open a tool, Layers -> Asset: the Team group (empty library) then the add flow from "Add or browse" */
await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await pg.waitForTimeout(900); await pg.setInputFiles('#pick',[new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname]); await pg.waitForTimeout(900);
await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(300); await pg.tap('#addAsset'); await pg.waitForSelector('#assetTeam [data-team-browse]',{timeout:8000});
ok('the Asset sheet paints brand assets at once and the Team group with "Add or browse"',await pg.evaluate(()=>document.querySelectorAll('#assetList .asset-grid .asset-tile').length>3&&!!document.querySelector('#assetTeam [data-team-browse]')));
await pg.screenshot({path:SHOTS+'/01-tool-team-group-light.png'});
await pg.tap('#assetTeam [data-team-browse]'); await pg.waitForSelector('.ta-dlg .ta-note [data-add]',{timeout:8000});
ok('an empty library says so and offers Add',/No team assets yet/.test(await pg.textContent('.ta-dlg .ta-note'))&&await pg.isVisible('.ta-dlg [data-add]'));
await pg.screenshot({path:SHOTS+'/02-library-empty-light.png'});
await pg.setInputFiles('#taFile',[logo]); await pg.waitForSelector('#taNext:not([disabled])',{timeout:15000});
ok('the background step starts on Logo for a flat ground, with strength and inside-areas controls',await pg.getAttribute('[data-mode="logo"]','aria-pressed')==='true'&&await pg.isVisible('#taTol')&&await pg.isChecked('#taHoles'));
await pg.screenshot({path:SHOTS+'/03-add-background-light.png'});
await pg.tap('[data-g="black"]'); await pg.waitForTimeout(100);
ok('the ground switch changes the preview ground',await pg.getAttribute('.ta-stage','data-ground')==='black');
await pg.tap('[data-mode="keep"]'); await pg.waitForSelector('#taNext:not([disabled])'); await pg.tap('[data-mode="logo"]'); await pg.waitForSelector('#taNext:not([disabled])'); await pg.fill('#taTol','70'); await pg.waitForTimeout(500); await pg.waitForSelector('#taNext:not([disabled])');
await pg.tap('#taNext'); await pg.waitForSelector('#taAN');
ok('details: the name is filled from the file name, the Logos folder is picked',await pg.inputValue('#taAN')==='partner bakery logo'&&await pg.getAttribute('#taAF [data-f="Logos"]','aria-pressed')==='true');
await pg.fill('#taAN','Partner Bakery'); await pg.fill('.ta-taginp','bakery,'); await pg.fill('.ta-taginp','collab'); await pg.press('.ta-taginp','Enter');
ok('tags become chips',await pg.locator('#taAT .ta-tag').count()===2);
await pg.screenshot({path:SHOTS+'/04-add-details-light.png'});
await pg.tap('#taGo'); await pg.waitForSelector('[data-usenow]',{timeout:15000});
let db=await fdb(), row=(db.team_assets||[])[0];
ok('the row is in the cloud with name, tags, folder, author slot and both files',!!row&&row.name==='Partner Bakery'&&row.tags.join()==='bakery,collab'&&row.folder==='Logos'&&row.cutout===true&&!!db.files[row.path]&&!!db.files[row.prev_path]&&row.path.endsWith('/assets/'+row.id+'/full.png'),row);
ok('the picture is a transparent PNG (the corner is see-through, the hole too)',await pg.evaluate(async p=>{ const im=new Image(); im.src=JSON.parse(localStorage.getItem('fakecloud')).files[p]; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); return x.getImageData(0,0,1,1).data[3]===0&&x.getImageData(im.width>>1,im.height>>1,1,1).data[3]===0&&x.getImageData(im.width>>1,Math.round(im.height*.12),1,1).data[3]===255; },row.path));
await pg.screenshot({path:SHOTS+'/05-added-light.png'});
await pg.tap('[data-usenow]'); await pg.waitForTimeout(900);
const lay=await pg.evaluate(()=>Studio.debug.S.extras.filter(x=>x.type==='asset'));
ok('Use it now adds a layer with ref team:<id>, path and name',lay.length===1&&lay[0].ref==='team:'+row.id&&lay[0].path===row.path&&lay[0].name==='Partner Bakery',lay);
ok('the layer draws (not missing)',await pg.evaluate(id=>{ const r=Studio.debug.reg().find(x=>x.id===id); return !!r&&!r.empty; },lay[0].id));

/* 2. Save the picture: 2160x3840 and the logo's green is in it; then save to the team and reopen */
await pg.waitForTimeout(500); await pg.tap('#inspClose').catch(()=>{}); await pg.waitForTimeout(300);
await pg.tap('#barSave'); await pg.waitForSelector('#sh-save.open',{timeout:6000}).catch(()=>{});
if(await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))){   /* the Save sheet: send it to the team too (works with the old switch or the new Phone / Team choice) */
  if(await pg.locator('#saveWhere [data-where="team"]').count()) await pg.tap('#saveWhere [data-where="team"]').catch(()=>{});
  await chooseTeam(pg,'Collabs');
  await pg.waitForSelector('#teamName',{timeout:6000}).catch(()=>{}); await pg.fill('#teamName','Collab story').catch(()=>{});

  await pg.tap('#save'); }
const d1=await waitDl(1); const s1=d1?await pngSize(d1):'';
let green=0; if(d1){ const b64=fs.readFileSync(await d1.path()).toString('base64'); green=await pg.evaluate(async b64=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height).data; let n=0; for(let i=0;i<d.length;i+=16){ if(d[i]<40&&d[i+1]>170&&d[i+2]<90) n++; } return n; },b64); }
ok('Save: full-size PNG that contains the asset pixels',s1==='2160x3840'&&green>2000,{png:s1,green});
await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
const did=new URL(pg.url()).searchParams.get('design');
if(!did){ ok('the design was saved to the team',false); }
else{
  const dd=(await fdb()).designs[did]; ok('the saved recipe keeps the team layer (ref + path)',!!dd&&JSON.stringify(dd.recipe).includes('team:'+row.id)&&JSON.stringify(dd.recipe).includes(row.path));
  const p2=await page(ctx); await p2.goto(BASE+'tools/restock.html?design='+did); await p2.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await p2.waitForTimeout(1800);
  ok('reopening ?design= brings the layer back, drawn',await p2.evaluate(()=>{ const x=Studio.debug.S.extras.find(e=>e.type==='asset'&&/^team:/.test(e.ref)); const r=x&&Studio.debug.reg().find(q=>q.id===x.id); return !!r&&!r.empty; }));

  /* 3. manage mode: search by tag, sort, rename/tags/folder, then remove -> the design still draws */
  await p2.evaluate(async brand=>{ const C=StudioCloud, mkb=(col)=>new Promise(r=>{ const c=document.createElement('canvas'); c.width=c.height=40; const x=c.getContext('2d'); x.fillStyle=col; x.fillRect(0,0,40,40); c.toBlob(r); });
    await C.saveTeamAsset({brand,name:'Alpha mark',tags:['seasonal'],folder:'Partners',blob:await mkb('#c00'),prevBlob:await mkb('#c00'),w:40,h:40,cutout:false,author:'Test'}); },row.brand);
  await p2.evaluate(()=>Studio.lazy('teamassets',{css:1,global:'StudioTeamAssets'}).then(T=>T.open({mode:'manage'}))); await p2.waitForSelector('.ta-grid .ta-tile',{timeout:8000}); await p2.waitForTimeout(500);
  ok('the library lists both assets, newest first',await p2.evaluate(()=>[...document.querySelectorAll('.ta-nm')].map(e=>e.textContent).join('|'))==='Alpha mark|Partner Bakery');
  ok('folder chips: All, Logos, Partners',await p2.evaluate(()=>[...document.querySelectorAll('#taChips .chip')].map(e=>e.textContent).join('|'))==='All|Logos|Partners');
  ok('tiles are 3 per row at 390 and their previews load',await p2.evaluate(()=>{ const t=[...document.querySelectorAll('.ta-tile')]; return t.length>=2&&Math.abs(t[0].getBoundingClientRect().width-t[1].getBoundingClientRect().width)<2&&t[0].getBoundingClientRect().width>100&&t[0].getBoundingClientRect().width<125&&[...document.querySelectorAll('.ta-pic img')].every(i=>i.getAttribute('src')); }));
  await p2.screenshot({path:SHOTS+'/06-library-light.png'});
  await p2.fill('#taQ','collab'); await p2.waitForTimeout(150);
  ok('search matches a tag',await p2.evaluate(()=>[...document.querySelectorAll('.ta-nm')].map(e=>e.textContent).join('|'))==='Partner Bakery');
  await p2.fill('#taQ',''); await p2.tap('[data-sort]'); await p2.tap('.ta-sortopt[data-s="name"]'); await p2.waitForTimeout(150);
  ok('sort by name A–Z',await p2.evaluate(()=>[...document.querySelectorAll('.ta-nm')].map(e=>e.textContent).join('|'))==='Alpha mark|Partner Bakery');
  await p2.tap('.ta-tile:nth-child(2) [data-more]'); await p2.waitForSelector('#taEN'); await p2.fill('#taEN','Bakery partner'); await p2.tap('#taEF [data-f="Partners"]'); await p2.fill('#taET .ta-taginp','winter'); await p2.press('#taET .ta-taginp','Enter');
  await p2.screenshot({path:SHOTS+'/07-edit-light.png'}); await p2.tap('#taES'); await p2.waitForTimeout(400);
  const r2=((await fdb(p2)).team_assets||[]).find(r=>r.id===row.id);
  ok('rename, folder and tags persist',r2&&r2.name==='Bakery partner'&&r2.folder==='Partners'&&r2.tags.includes('winter')&&r2.tags.includes('bakery'),r2);
  await p2.tap('#taChips [data-folder="Partners"]'); await p2.waitForTimeout(100);
  ok('the folder chip filters',await p2.locator('.ta-tile').count()===2);
  await p2.tap('.ta-tile:nth-child(2) [data-more]'); await p2.waitForSelector('[data-remove]'); await p2.tap('[data-remove]'); await p2.waitForSelector('[data-yes]');
  ok('remove asks and says designs keep it',/Designs that already use it keep it/.test(await p2.textContent('.dlg-body .small')));
  await p2.tap('[data-yes]'); await p2.waitForTimeout(500);
  db=await fdb(p2); ok('remove deletes the row only; the files stay',!(db.team_assets||[]).some(r=>r.id===row.id)&&!!db.files[row.path]);
  const p3=await page(ctx); await p3.goto(BASE+'tools/restock.html?design='+did); await p3.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await p3.waitForTimeout(1800);
  ok('the design opened after the removal still draws the asset',await p3.evaluate(()=>{ const x=Studio.debug.S.extras.find(e=>e.type==='asset'&&/^team:/.test(e.ref)); const r=x&&Studio.debug.reg().find(q=>q.id===x.id); return !!r&&!r.empty; }));
  await p2.close(); await p3.close();
}

/* 4. dark screenshots of the states */
{ const dk=await mk('dark'), q=await page(dk); await q.goto(BASE+'index.html'); await q.evaluate(()=>localStorage.clear());
  await q.goto(BASE+'tools/restock.html'); await q.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await q.waitForTimeout(700);
  await q.evaluate(async()=>{ const C=await Studio.lab.cloud(), mkb=(col,w,h)=>new Promise(r=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.fillStyle=col; x.beginPath(); x.roundRect(4,4,w-8,h-8,12); x.fill(); c.toBlob(r); });
    for(const [n,col,t,f] of [['Bakery partner','#00c83c',['collab'],'Logos'],['Cold brew can','#2040d0',['can','product'],'Cut-outs'],['Alpha mark','#c00',[],'Logos']]) await C.saveTeamAsset({brand:Studio.lab.brand().id,name:n,tags:t,folder:f,blob:await mkb(col,300,200),prevBlob:await mkb(col,150,100),w:300,h:200,cutout:true,author:'Test'}); });
  await q.tap('#bar [data-open="layers"]'); await q.waitForTimeout(300); await q.tap('#addAsset'); await q.waitForSelector('#assetTeam [data-team]',{timeout:8000}); await q.waitForTimeout(500);
  ok('the Team group shows the newest team assets plus Add or browse',await q.locator('#assetTeam [data-team]').count()===3&&await q.locator('#assetTeam [data-team-browse]').count()===1);
  await q.screenshot({path:SHOTS+'/08-tool-team-group-dark.png'});
  await q.tap('#assetTeam [data-team="'+(await q.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')).team_assets[0].id))+'"]'); await q.waitForTimeout(700);
  ok('tapping a Team tile adds the layer',await q.evaluate(()=>Studio.debug.S.extras.some(e=>e.type==='asset'&&/^team:/.test(e.ref)&&e.path)));
  await q.evaluate(()=>Studio.lazy('teamassets',{css:1,global:'StudioTeamAssets'}).then(T=>T.open({mode:'pick'}))); await q.waitForSelector('.ta-grid .ta-tile'); await q.waitForTimeout(500);
  await q.screenshot({path:SHOTS+'/09-library-dark.png'});
  await q.setInputFiles('#taFile',[blue]); await q.waitForSelector('#taNext:not([disabled])',{timeout:15000}); await q.screenshot({path:SHOTS+'/10-add-background-dark.png'});
  await q.tap('#taNext'); await q.waitForSelector('#taAN'); await q.screenshot({path:SHOTS+'/11-add-details-dark.png'});
  await dk.close(); }

/* 5. the table is missing: a friendly note, the tool sheet still works */
{ const c2=await mk(), q=await page(c2); await q.goto(BASE+'index.html'); await q.evaluate(()=>{ localStorage.clear(); localStorage.setItem('fakecloud-noassets','1'); });
  await q.goto(BASE+'tools/restock.html'); await q.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await q.waitForTimeout(700);
  await q.tap('#bar [data-open="layers"]'); await q.waitForTimeout(300); await q.tap('#addAsset'); await q.waitForSelector('#assetTeam [data-team-browse]',{timeout:8000});
  ok('table missing: the tool sheet still lists the brand assets and a quiet Team tile',await q.locator('#assetList .asset-tile[data-asset]').count()>3);
  await q.tap('#assetTeam [data-team-browse]'); await q.waitForSelector('.ta-note',{timeout:8000});
  ok('table missing: the library says the owner switches it on once',/switched on by the owner/.test(await q.textContent('.ta-note'))&&!(await q.isVisible('.ta-dlg [data-add]')));
  await q.screenshot({path:SHOTS+'/12-table-missing-light.png'}); await c2.close(); }

/* 6. signed out: a quiet sign-in row, no errors; the library asks to sign in */
{ const c3=await mk(), q=await page(c3); await q.goto(BASE+'index.html'); await q.evaluate(()=>{ localStorage.clear(); localStorage.setItem('fakecloud-signedout','1'); });
  await q.goto(BASE+'tools/restock.html'); await q.waitForFunction(()=>window.Studio&&Studio.debug,null,{timeout:20000}); await q.waitForTimeout(900);
  await q.tap('#bar [data-open="layers"]'); await q.waitForTimeout(300); await q.tap('#addAsset'); await q.waitForSelector('#assetTeam [data-team-signin]',{timeout:8000});
  ok('signed out: one quiet "Team assets: sign in" row',await q.locator('#assetTeam [data-team]').count()===0&&/sign in/.test(await q.textContent('#assetTeam')));
  await q.evaluate(()=>Studio.lazy('teamassets',{css:1,global:'StudioTeamAssets'}).then(T=>T.open({mode:'manage'}))); await q.waitForSelector('.ta-note [data-signin]',{timeout:8000});
  ok('signed out: the library asks to sign in',/Sign in to see the team/.test(await q.textContent('.ta-note')));
  await c3.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad} passed, ${bad} failed`); process.exit(bad?1:0);
