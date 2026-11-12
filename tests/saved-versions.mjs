/* Saved designs: covers, updates and versions (mega round 1.1).
   Owner report: "I go inside, save and update, but it saves another version, not that version."
   Phone (390x844 touch, light + dark) and computer (1280x800):
   1. Tool: a new design is saved; opened from Saved the main button reads Update "name" (team switch on), "Save as a copy" sits under it;
      Update keeps the id (and the design count), Save as a copy makes a new id.
   2. A team template opened from Templates starts as a NEW design ("Save as a copy design"), "Update the template" is the other choice.
   3. Two taps during a slow upload make ONE design (the second is an update, it used to make a second new design).
   4. A cover made while the photo is still decoding is drawn only after the decode.
   5. A blank or missing cover is redrawn when the design opens; "Redraw cover" in the design menu does it on demand.
   6. Versions: every update keeps the one before; the menu lists them (who, when) and Restore (with a confirm) puts one back; the row is
      hidden when the cloud has no versions.
   7. Create: Update "name" / Save as a copy for an opened design, a template defaults to a new design, "Update the template" updates it.
   8. Two tabs editing the same design stay one design.
   fakecloud has versions / restoreVersion / setThumb (4.0 schema); STUB below only counts the calls and can hide versions.
   Run: server on :8080 (or BASE=...), then node tests/saved-versions.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const PHOTO=new URL('../brands/1stchoice/samples/pair.jpg',import.meta.url).pathname;
const STUB=`
;(()=>{ const C=StudioCloud, sd=C.saveDesign, st=C.setThumb, rv=C.restoreVersion;
  C.saveDesign=async o=>{ if(window.__slow) await new Promise(r=>setTimeout(r,window.__slow)); const id=await sd(o);
    localStorage.setItem('__calls',JSON.stringify(JSON.parse(localStorage.getItem('__calls')||'[]').concat([{id:o.id||null,author:o.author||null,kind:o.kind}]))); return id; };
  if(C.setThumb) C.setThumb=async(id,blob)=>{ const r=await st.call(C,id,blob); localStorage.setItem('__setThumb',String(+(localStorage.getItem('__setThumb')||0)+1)); return r; };
  if(rv) C.restoreVersion=async(id,vid,author)=>{ const r=await rv.call(C,id,vid,author); localStorage.setItem('__restored',JSON.stringify({id,vid,author:author||null})); return r; };
  if(window.__noVer){ delete C.versions; delete C.restoreVersion; }
})();`;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8')+STUB;
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+(typeof i==='string'?i:JSON.stringify(i)):'')); };
const b=await chromium.launch(); const errs=[];
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const CLOUD='fakecloud';
const dbOf=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')||'{"designs":{},"files":{}}'));
const calls=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('__calls')||'[]'));
const flatOf=(pg,idOrPath)=>pg.evaluate(async p=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); if(d.designs[p]) p=d.designs[p].thumb_path; const u=d.files[p]; if(!u) return 'missing'; const blob=await (await fetch(u)).blob(); return await Studio.lab.coverFlat(blob); },idOrPath);
const waitCalls=(pg,n)=>pg.waitForFunction(n=>JSON.parse(localStorage.getItem('__calls')||'[]').length>=n,n,{timeout:30000,polling:100}).catch(()=>{});

for(const [name,vp,touch,scheme] of [['phone/light',{width:390,height:844},true,'light'],['phone/dark',{width:390,height:844},true,'dark'],['desktop',{width:1280,height:800},false,'light']]){
  const N=name+': ';
  const ctx=await b.newContext({viewport:vp,isMobile:touch,hasTouch:touch,serviceWorkers:'block',colorScheme:scheme,acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.route(/slowpic\.jpg/,async r=>{ await new Promise(x=>setTimeout(x,1500)); r.fulfill({contentType:'image/jpeg',body:fs.readFileSync(PHOTO)}); });
  await ctx.addInitScript(()=>{ navigator.canShare=()=>true; navigator.share=async()=>{}; });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(N+e)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|ERR_FAILED|net::/.test(m.text())) errs.push(N+m.text()); });
  const tap=s=>touch?pg.tap(s):pg.click(s);
  const tool=async(url,photo)=>{ await pg.goto(BASE+url); await pg.waitForFunction(()=>window.Studio&&Studio.debug,null,{polling:100});
    if(photo){ await pg.setInputFiles('#pick',PHOTO); await pg.waitForFunction(()=>{ const p=Studio.debug.S.photos[0]; return p&&p.img&&!p.sample; },null,{polling:100}); } else await pg.waitForTimeout(700); };
  const sheet=async()=>{ if(touch){ await tap('#barSave'); await pg.waitForTimeout(600); } await pg.waitForFunction(()=>document.getElementById('teamOn'),null,{polling:100}); await pg.waitForTimeout(1500); };
  /* 2.3.0: the sheet starts on My phone; tm() chooses Phone + Team and types a new collection (a team save needs one) */
  const tm=async(n='Versions')=>{ await tap('#saveWhere [data-where="team"]'); await pg.waitForSelector('#teamCols [data-newcol]',{timeout:15000}); await pg.waitForTimeout(300); if(await pg.isHidden('#teamNewRow')) await tap('#teamCols [data-newcol]'); await pg.fill('#teamNewCol',n); };
  const lab=()=>pg.evaluate(()=>({btn:document.getElementById('saveTxt').textContent.trim(),alt:(a=>!a||a.hidden?'':a.textContent.trim())(document.getElementById('saveAlt')),team:document.getElementById('teamOn').checked,where:document.querySelector('#saveWhere [aria-checked="true"]').dataset.where}));
  const moreOf=id=>pg.waitForFunction(id=>[...document.querySelectorAll('.sv-more[data-dmore="'+id+'"]')].some(x=>x.offsetParent),id,{timeout:15000,polling:100});
  const seedClear=()=>pg.evaluate(()=>{ localStorage.clear(); });

  /* 1. new design, then Update / Save as a copy */
  await pg.goto(BASE+'index.html'); await seedClear();
  await tool('tools/restock.html',true); await sheet();
  let L=await lab(); ok(N+'new design: starts on My phone, the button reads "Save to my phone", no Save as a copy yet',/^Save to (my phone|this device)$/.test(L.btn)&&L.alt===''&&!L.team,L);
  await tm(); L=await lab(); ok(N+'Phone + Team with a collection: the button names it',L.btn==='Save to “Versions”',L);
  await tap('#save'); await waitCalls(pg,1); await pg.waitForTimeout(800);
  let db=await dbOf(pg), ids=Object.keys(db.designs); const id=ids[0], c1=await calls(pg);
  ok(N+'the first save makes one design with a real cover',ids.length===1&&c1.length===1&&c1[0].id===null&&(await flatOf(pg,id))===false,{n:ids.length,calls:c1});
  const upd0=db.designs[id].updated_at;
  await tool('tools/restock.html?design='+id); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100}); await sheet();
  L=await lab(); ok(N+'opened from Saved: main button reads Update “name”, Save as a copy under it, Phone + Team chosen',/^Update “.+”$/.test(L.btn)&&L.alt==='Save as a copy'&&L.team&&L.where==='team',L);
  const filled=await pg.evaluate(()=>[...document.querySelectorAll('#sh-save .btn:not(.ghost)')].filter(x=>x.offsetParent&&!x.hidden).length); ok(N+'at most two filled buttons in the Save sheet',filled<=2,filled);
  await tap('#save'); await waitCalls(pg,2); await pg.waitForTimeout(800);
  db=await dbOf(pg); let cc=await calls(pg);
  ok(N+'Update keeps the same design (id kept, still one design)',Object.keys(db.designs).length===1&&cc[1].id===id&&db.designs[id].updated_at!==upd0,{n:Object.keys(db.designs).length,call:cc[1]});
  await tool('tools/restock.html?design='+id); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100}); await sheet();
  await tap('#saveAlt'); await waitCalls(pg,3); await pg.waitForTimeout(800);
  db=await dbOf(pg); cc=await calls(pg);
  ok(N+'Save as a copy makes a new design and leaves the first as it was',Object.keys(db.designs).length===2&&cc[2].id===null&&!!db.designs[id],{n:Object.keys(db.designs).length,call:cc[2]});
  const newId=Object.keys(db.designs).find(k=>k!==id); ok(N+'the page is now on the new design (URL)',(await pg.evaluate(()=>new URLSearchParams(location.search).get('design')))===newId);

  /* 2. a team template: starts as a new design; Update the template is the other choice */
  await pg.evaluate(id=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); d.designs.tplX={...d.designs[id],id:'tplX',kind:'template',name:'Team template',recipe:{...d.designs[id].recipe,photoPaths:[]}}; d.files[d.designs[id].thumb_path]=d.files[d.designs[id].thumb_path]; d.designs.tplX.thumb_path=d.designs[id].thumb_path; localStorage.setItem('fakecloud',JSON.stringify(d)); },id);
  await tool('tools/restock.html?design=tplX',true); await sheet();
  L=await lab(); ok(N+'template opened: starts on My phone, other choice "Update the template"',/^Save to (my phone|this device)$/.test(L.btn)&&L.alt==='Update the template'&&!L.team,L);
  await tm('Versions'); L=await lab(); ok(N+'template + Phone + Team: the button names the collection (a NEW design)',L.btn==='Save to “Versions”',L);
  const n0=Object.keys((await dbOf(pg)).designs).length, k0=(await calls(pg)).length;
  await tap('#save'); await waitCalls(pg,k0+1); await pg.waitForTimeout(800);
  db=await dbOf(pg); cc=await calls(pg);
  const made=Object.values(db.designs).filter(d=>d.name==='Team template'||d.id!=='tplX'&&!['%'].includes(d.id));
  ok(N+'a template + a photo + Save: a NEW design with the photos (the template is untouched)',Object.keys(db.designs).length===n0+1&&cc[k0].id===null&&cc[k0].kind==='design'&&db.designs.tplX.kind==='template',{n:Object.keys(db.designs).length,call:cc[k0]});
  await tool('tools/restock.html?design=tplX',true); await sheet(); await tap('#saveAlt'); await waitCalls(pg,k0+2); await pg.waitForTimeout(800);
  db=await dbOf(pg); cc=await calls(pg);
  ok(N+'Update the template saves over the template (same id, still a template, no new design)',cc[k0+1].id==='tplX'&&cc[k0+1].kind==='template'&&Object.keys(db.designs).length===n0+1&&db.designs.tplX.kind==='template',{call:cc[k0+1],n:Object.keys(db.designs).length});

  /* 3. slow upload, two taps: one design */
  await pg.evaluate(()=>{ localStorage.removeItem('fakecloud'); localStorage.setItem('__calls','[]'); });
  await tool('tools/restock.html',true); await sheet(); await tm(); await pg.evaluate(()=>{ window.__slow=1200; });
  await pg.evaluate(()=>{ const o=document.getElementById('teamOnly'); o.click(); o.click(); });
  await waitCalls(pg,2); await pg.waitForTimeout(1200);
  db=await dbOf(pg); cc=await calls(pg);
  ok(N+'two taps during a slow upload make ONE design (the second one updates it)',Object.keys(db.designs).length===1&&cc.length===2&&cc[0].id===null&&cc[1].id===Object.keys(db.designs)[0],{n:Object.keys(db.designs).length,calls:cc});
  await pg.evaluate(()=>{ window.__slow=0; });

  /* 4. the cover waits for a photo that is still decoding */
  await pg.evaluate(()=>{ localStorage.removeItem('fakecloud'); localStorage.setItem('__calls','[]'); });
  await tool('tools/restock.html',true); await sheet(); await tm();
  await pg.evaluate(()=>{ const im=new Image(); window.__im=im; window.__dec=false; window.__early=0; im.src='/brands/1stchoice/samples/slowpic.jpg?'+Math.random(); im.decode=()=>new Promise(r=>{ const t=setInterval(()=>{ if(im.complete&&im.naturalWidth){ clearInterval(t); setTimeout(()=>{ window.__dec=true; r(); },200); } },50); });
    const dI=CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage=function(...a){ if(a[0]===im&&this.canvas.width===360&&!window.__dec) window.__early++; return dI.apply(this,a); };
    Studio.debug.S.photos[0].img=im; });
  await pg.evaluate(()=>document.getElementById('teamOnly').click()); await waitCalls(pg,1); await pg.waitForTimeout(500);
  const early=await pg.evaluate(()=>window.__early), decoded=await pg.evaluate(()=>window.__dec);
  ok(N+'the cover is drawn after the photo has decoded (not before)',early===0&&decoded===true,{early,decoded});
  db=await dbOf(pg); const cid=Object.keys(db.designs)[0];

  /* 5. a blank / missing cover is redrawn on open; Redraw cover in the menu */
  const blank=()=>pg.evaluate(async id=>{ const c=document.createElement('canvas'); c.width=360; c.height=640; const x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,360,640); const u=c.toDataURL('image/jpeg',.8), d=JSON.parse(localStorage.getItem('fakecloud')); d.files[d.designs[id].thumb_path]=u; localStorage.setItem('fakecloud',JSON.stringify(d)); },cid);
  await blank(); ok(N+'(the test cover is now black)',(await flatOf(pg,cid))===true);
  await tool('tools/restock.html?design='+cid); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100});
  await pg.waitForFunction(()=>+(localStorage.getItem('__setThumb')||0)>=1,null,{timeout:15000,polling:200}).catch(()=>{});
  ok(N+'a black cover is redrawn when the design is opened',(await flatOf(pg,cid))===false&&+(await pg.evaluate(()=>localStorage.getItem('__setThumb')))>=1);
  await pg.evaluate(id=>{ const d=JSON.parse(localStorage.getItem('fakecloud')); delete d.files[d.designs[id].thumb_path]; localStorage.setItem('fakecloud',JSON.stringify(d)); },cid);
  await tool('tools/restock.html?design='+cid); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100});
  await pg.waitForFunction(()=>+(localStorage.getItem('__setThumb')||0)>=2,null,{timeout:15000,polling:200}).catch(()=>{});
  ok(N+'a missing cover is redrawn when the design is opened',(await flatOf(pg,cid))===false);
  await pg.goto(BASE+'index.html#saved'); await moreOf(cid); await blank();
  await pg.evaluate(id=>{ [...document.querySelectorAll('.sv-more[data-dmore="'+id+'"]')].find(x=>x.offsetParent).click(); },cid); await pg.waitForSelector('dialog.design-dlg [data-act="cover"]');
  ok(N+'the design menu has Redraw cover and Versions',await pg.isVisible('dialog [data-act="cover"]')&&await pg.isVisible('dialog [data-act="ver"]'));
  await tap('dialog [data-act="cover"]'); await pg.waitForFunction(()=>+(localStorage.getItem('__setThumb')||0)>=3,null,{timeout:40000,polling:200}).catch(()=>{});
  ok(N+'Redraw cover stores a real cover again',(await flatOf(pg,cid))===false&&+(await pg.evaluate(()=>localStorage.getItem('__setThumb')))>=3);

  /* 6. versions: an update keeps the one before; list, Restore with a confirm */
  await tool('tools/restock.html?design='+cid); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100}); await sheet();
  const k1=(await calls(pg)).length; await tap('#save'); await waitCalls(pg,k1+1); await pg.waitForTimeout(800);
  ok(N+'the update passes an author field (when the Who is using name exists)',(await calls(pg)).slice(-1)[0].id===cid);
  const nv=await pg.evaluate(id=>StudioCloud.versions(id).then(v=>v.length),cid); ok(N+'the update kept a version',nv>=1,nv);
  await pg.goto(BASE+'index.html#saved'); await moreOf(cid);
  await pg.evaluate(id=>{ [...document.querySelectorAll('.sv-more[data-dmore="'+id+'"]')].find(x=>x.offsetParent).click(); },cid); await pg.waitForSelector('dialog.design-dlg [data-act="ver"]'); await tap('dialog [data-act="ver"]');
  await pg.waitForSelector('.ver-row',{timeout:8000}); await pg.waitForTimeout(700);   // the dialog finishes its entrance
  const vr=await pg.evaluate(()=>({n:document.querySelectorAll('.ver-row').length,bdi:!!document.querySelector('.ver-row bdi'),img:!!document.querySelector('.ver-row img'),h:document.querySelector('.ver-row [data-restore]').getBoundingClientRect().height}));
  ok(N+'Versions lists each one with a picture, who and when (time in <bdi>)',vr.n>=1&&vr.bdi,vr);
  ok(N+'Restore is a 48px target',vr.h>=47.5,vr.h);
  await tap('.ver-row [data-restore]'); await pg.waitForSelector('#rsYes'); ok(N+'Restore asks first',await pg.isVisible('#rsYes')&&await pg.isVisible('#rsNo'));
  await tap('#rsYes'); await pg.waitForFunction(()=>localStorage.getItem('__restored'),null,{timeout:8000}).catch(()=>{});
  const rs=await pg.evaluate(()=>JSON.parse(localStorage.getItem('__restored')||'null')); ok(N+'Restore calls restoreVersion(designId, versionId)',!!rs&&rs.id===cid&&!!rs.vid,rs);
  await pg.waitForTimeout(800); ok(N+'the dialogs close after Restore',await pg.evaluate(()=>!document.querySelector('dialog[open]')));

  /* 8. two tabs on one design */
  const pg2=await ctx.newPage(); pg2.on('pageerror',e=>errs.push(N+'tab2 '+e));
  await pg2.goto(BASE+'tools/restock.html?design='+cid); await pg2.waitForFunction(()=>window.Studio&&Studio.debug&&!document.getElementById('designBar').hidden,null,{polling:100}); await pg2.waitForTimeout(800);
  await tool('tools/restock.html?design='+cid); await pg.waitForFunction(()=>!document.getElementById('designBar').hidden,null,{polling:100});
  const k2=(await calls(pg)).length;
  await pg2.evaluate(()=>{ if(window.innerWidth<=820) document.getElementById('barSave').click(); }); await pg2.waitForTimeout(500); await pg2.evaluate(()=>{ document.getElementById('teamOn').checked=true; document.getElementById('save').click(); });
  await waitCalls(pg,k2+1); await sheet(); await tap('#save'); await waitCalls(pg,k2+2); await pg.waitForTimeout(800);
  db=await dbOf(pg); cc=await calls(pg);
  ok(N+'two tabs updating the same design stay one design',Object.keys(db.designs).length===1&&cc.slice(-2).every(x=>x.id===cid),{n:Object.keys(db.designs).length,calls:cc.slice(-2)});
  await pg2.close();

  /* 7. Create (Update / Save as a copy, template defaults) */
  if(name!=='phone/dark'){
    await pg.evaluate(()=>{ localStorage.removeItem('fakecloud'); localStorage.setItem('__calls','[]'); });
    const cready=async()=>{ await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(500); };
    const csave=async()=>{ await tap('#crBar [data-cr="save"]'); await pg.waitForSelector('#crGo'); await pg.waitForTimeout(400); };
    const clab=()=>pg.evaluate(()=>({go:document.getElementById('crGo').textContent.trim(),alt:(a=>a?a.textContent.trim():'')(document.getElementById('crAlt')),on:document.getElementById('crTeamOn').checked}));
    await pg.goto(BASE+'tools/create.html?tpl=ice-cold'); await cready();
    await pg.evaluate(()=>CR.addElement('slot')); await pg.waitForTimeout(300);
    const [fc]=await Promise.all([pg.waitForEvent('filechooser'),tap('#crCtx [data-x="slot"]')]); await fc.setFiles(PHOTO); await pg.waitForTimeout(1200);
    await csave(); let C=await clab(); ok(N+'Create, new design: starts on My phone, "Save image"',C.go==='Save image'&&!C.alt&&!C.on,C);
    await tap('#crWhere [data-where="team"]'); await pg.waitForTimeout(300); ok(N+'Create, Phone + Team for a new design: "Pick a collection" until one is named',(await clab()).go==='Pick a collection');
    await pg.fill('#crCol','Versions'); ok(N+'Create: a collection is named: the button says where it goes',(await clab()).go==='Save to “Versions”');
    await tap('#crTeamOnly'); await waitCalls(pg,1); await pg.waitForTimeout(800);
    const cd=Object.keys((await dbOf(pg)).designs)[0]; db=await dbOf(pg); ok(N+'Create saved a design (with the photo)',db.designs[cd].kind==='design'&&(await flatOf(pg,cd))===false,db.designs[cd]&&db.designs[cd].kind);
    await pg.goto(BASE+'tools/create.html?design='+cd); await cready(); await csave(); C=await clab();
    ok(N+'Create, opened design: Update “name”, Save as a copy, Phone + Team chosen',/^Update “.+”$/.test(C.go)&&C.alt==='Save as a copy'&&C.on,C);
    await tap('#crTeamOnly'); await waitCalls(pg,2); await pg.waitForTimeout(800); cc=await calls(pg);
    ok(N+'Create: Update keeps the same design',cc[1].id===cd&&Object.keys((await dbOf(pg)).designs).length===1,cc[1]);
    await pg.goto(BASE+'tools/create.html?design='+cd); await cready(); await csave(); await tap('#crAlt'); await waitCalls(pg,3); await pg.waitForTimeout(1200); cc=await calls(pg);
    ok(N+'Create: Save as a copy makes a second design',cc[2].id===null&&Object.keys((await dbOf(pg)).designs).length===2,cc[2]);
    /* a design whose photo was removed is still an update, not a new template */
    await pg.goto(BASE+'tools/create.html?design='+cd); await cready();
    await pg.evaluate(()=>{ BD.main.find('Image').filter(n=>BD.util.kind(n)==='image').forEach(n=>n.destroy()); BD.main.batchDraw(); }); await csave();
    const k3=(await calls(pg)).length; await tap('#crTeamOnly'); await waitCalls(pg,k3+1); await pg.waitForTimeout(800); cc=await calls(pg);
    ok(N+'Create: an opened design with its photos removed is updated in place',cc[k3].id===cd,cc[k3]);
    /* template: new by default, Update the template is the other choice */
    await pg.goto(BASE+'tools/create.html?design='+cd); await cready(); await csave(); const k4=(await calls(pg)).length; await tap('#crAsTpl'); await waitCalls(pg,k4+1); await pg.waitForTimeout(800);
    const tid=Object.values((await dbOf(pg)).designs).find(d=>d.kind==='template'); ok(N+'Create: Save as a team template makes a template',!!tid);
    if(tid){ await pg.goto(BASE+'tools/create.html?design='+tid.id); await cready(); await csave(); C=await clab();
      ok(N+'Create, opened template: starts on My phone ("Save image") with "Update the template" as the other choice',C.go==='Save image'&&C.alt==='Update the template'&&!C.on,C);
      const k5=(await calls(pg)).length; await tap('#crAlt'); await waitCalls(pg,k5+1); await pg.waitForTimeout(1200); cc=await calls(pg);
      ok(N+'Create: Update the template saves over the template',cc[k5].id===tid.id&&cc[k5].kind==='template',cc[k5]); }
  }
  await ctx.close();
}

/* the Versions row is hidden when the cloud has no versions */
{ const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript(()=>{ window.__noVer=true; try{ if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',JSON.stringify({designs:{a:{id:'a',brand:'1stchoice',tool:'restock',name:'Old',kind:'design',recipe:{photoPaths:[]},thumb_path:null,cols:[],updated_at:new Date().toISOString()}},files:{},cols:{}})); }catch(e){} });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('nover '+e));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForFunction(()=>[...document.querySelectorAll('.sv-more[data-dmore="a"]')].some(x=>x.offsetParent),null,{timeout:15000});
  await pg.evaluate(()=>{ delete StudioCloud.versions; [...document.querySelectorAll('.sv-more[data-dmore="a"]')].find(x=>x.offsetParent).click(); }); await pg.waitForSelector('dialog.design-dlg [data-act="dup"]');
  ok('no versions in the cloud: the Versions row is hidden',!(await pg.$('dialog [data-act="ver"]')));
  await ctx.close(); }

ok('no page errors',!errs.length,errs.slice(0,5));
console.log(res.join('\n')); const bad=res.filter(x=>x.startsWith('FAIL')).length; console.log(`saved-versions: ${res.length-bad} pass, ${bad} fail`);
await b.close(); process.exit(bad?1:0);
