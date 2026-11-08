/* Studio 1.37.0: Create drafts in Continue editing's "Save pictures" (#42) and team templates in Create's Recently used row (#46).
   1. Computer: one Create draft (Ice cold) -> a single PNG 2160x3840, "Saved!", nothing skipped; the draft record and its board
      are byte-for-byte unchanged; no render frame left; the picture is pixel-identical to Create's own Save (exportFrame 2x).
   2. Computer: a 3-page Create draft (Chat, post) + a Restock draft -> one ZIP: 3 PNGs 2160x2700 numbered -01..-03 + 1 PNG
      2160x3840. Then the tidy-up offer removes both from Continue editing after one confirm.
   3. The render frame itself: create.html?draft=<id>&render=1 -> Studio.renderer {ok,pages,W,H}, no templates sheet, no
      localStorage/IDB writes, URL kept; a missing draft -> ok:false; a saved Create design (?design=…&render=1) -> ok, 1 page;
      a team template -> ok:false.
   4. Phone 390x844 touch: Create draft -> one share sheet with 1 PNG.
   5. Recently used (phone): team templates fill in after the team list loads, in true order, gone ones skipped, with names and
      thumbnails; a tap applies the team template and moves it first; search hides the row, clearing shows it; only team ids
      -> the row appears once loaded; signed out -> brand ones only, no empty row.
   6. No page errors.
   Run: server on :8080 (BASE=... to change), then node tests/create-render.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const REC='studio:tplRecent:1stchoice';
let fails=0, n=0; const errs=[];
const ok=(name,c,i)=>{ n++; if(!c) fails++; console.log((c?'PASS ':'FAIL ')+name+(!c&&i!==undefined?' '+JSON.stringify(i).slice(0,400):'')); };
const blk=async(name,f)=>{ try{ await f(); }catch(e){ ok(name+' (block aborted)',false,String(e.message).split('\n')[0]); } };
const b=await chromium.launch(); const t0=Date.now();
const pngWH=buf=>buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20);
const isPng=buf=>buf.length>24&&buf.readUInt32BE(0)===0x89504e47;
function readZip(buf){ const out=[]; let p=0;
  while(buf.readUInt32LE(p)===0x04034b50){ const size=buf.readUInt32LE(p+18), nl=buf.readUInt16LE(p+26), xl=buf.readUInt16LE(p+28);
    out.push({name:buf.slice(p+30,p+30+nl).toString('utf8'),data:buf.slice(p+30+nl+xl,p+30+nl+xl+size)}); p+=30+nl+xl+size; } return out; }
const pic=id=>'data:image/jpeg;base64,'+fs.readFileSync(new URL('../assets/thumbs/1stchoice/'+id+'-sm.jpg',import.meta.url)).toString('base64');
function teamDb(extra){ const db={designs:{},files:{},cols:{}};
  [['tmA','Good morning','restock'],['tmB','Ice cold post','offer'],['tmC','Offer','restock']].forEach(([id,name,th],i)=>{ const t='1stchoice/'+id+'/thumb.jpg'; db.files[t]=pic(th);
    db.designs[id]={id,brand:'1stchoice',tool:'create',name,kind:'template',recipe:{doc:{nodes:[]},photoPaths:[]},thumb_path:t,cols:[],updated_at:new Date(Date.now()-i*3600e3).toISOString()}; });
  Object.assign(db.designs,extra||{}); return db; }
const PHONE={width:390,height:844}, DESK={width:1280,height:800};
async function mk(vp,{touch=true,signedOut=false,db=null,seed={},share=false}={}){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:signedOut?fake.replace('isMember:async()=>true','isMember:async()=>false'):fake}));
  await ctx.addInitScript(s=>{ try{ if(!sessionStorage.__seeded){ sessionStorage.__seeded='1'; localStorage.setItem('fakecloud',s.db); for(const k in s.ls) localStorage.setItem(k,JSON.stringify(s.ls[k])); } }catch(_){} },{db:JSON.stringify(db||teamDb()),ls:seed});
  if(share) await ctx.addInitScript(()=>{ if(window.top!==window) return; navigator.canShare=()=>true; navigator.share=async d=>{ window.__shared=(d.files||[]).map(f=>({name:f.name,type:f.type,size:f.size})); }; });
  return ctx; }
const newPage=async(ctx,tag)=>{ const pg=await ctx.newPage(); pg.setDefaultTimeout(8000); pg.on('pageerror',e=>errs.push(tag+': '+e.message)); return pg; };
const lsDrafts=pg=>pg.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('studio:draft:')).sort().map(k=>({k,v:localStorage.getItem(k)})));
const allLs=pg=>pg.evaluate(()=>{ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); o[k]=localStorage.getItem(k); } return JSON.stringify(o); });
/* a real Create draft from a brand template: open ?tpl=…, wait for the draft record (board id) */
async function createDraft(ctx,tpl){ const pg=await newPage(ctx,'make '+tpl);
  await pg.goto(BASE+'tools/create.html?tpl='+tpl);
  const key=await pg.waitForFunction(()=>Object.keys(localStorage).find(k=>{ if(!k.startsWith('studio:draft:1stchoice:create:')) return false; try{ return !!JSON.parse(localStorage.getItem(k)).board; }catch(_){ return false; } }),null,{timeout:30000}).then(h=>h.jsonValue());
  await pg.waitForTimeout(2200);   // the draft thumbnail (1.2 s) lands too
  await pg.close();   // leaving saves once more (pagehide): read the record and board only after that, from a fresh page
  const p2=await newPage(ctx,'read '+tpl); await p2.goto(BASE+'index.html'); await p2.waitForFunction(()=>window.Studio&&Studio.lab); await p2.waitForTimeout(300);
  const rec=JSON.parse(await p2.evaluate(k=>localStorage.getItem(k),key));
  const board=await p2.evaluate(id=>Studio.lab.idb.get('board:'+id),rec.board);
  await p2.close(); return {key,id:key.split(':').pop(),rec,board}; }
async function restockDraft(ctx){ const pg=await newPage(ctx,'restock'); const t=s=>pg.$eval(s,e=>e.click());
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForFunction(()=>window.Studio&&Studio.debug);
  await t('#styles [data-style="photo"]'); await pg.waitForTimeout(900); await t('#styles [data-style="cans"]');
  await pg.waitForFunction(()=>Studio.debug.draftId(),null,{timeout:8000}); await pg.waitForTimeout(1500); await pg.close(); }
const home=async pg=>{ await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>window.Studio); await pg.waitForTimeout(1200); };
const waitH=(pg,re,ms=120000)=>pg.waitForFunction(r=>new RegExp(r).test((document.getElementById('bsH')||{}).textContent||''),re.source,{timeout:ms});
const rframes=pg=>pg.$$eval('iframe.render-frame',l=>l.length);

/* ===== 1: one Create draft on a computer ===== */
await blk('one Create draft',async()=>{ const ctx=await mk(DESK,{touch:false}); const d=await createDraft(ctx,'ice-cold');
  ok('the Create draft has a board in IndexedDB',typeof d.board==='string'&&d.board.length>100);
  const pg=await newPage(ctx,'desk1'); await home(pg);
  ok('Continue editing lists the Create draft',await pg.$$eval('#continueList .ccard[data-draft]',c=>c.length)===1);
  const ls0=await lsDrafts(pg);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:120000}),pg.click('#contSave')]);
  const buf=fs.readFileSync(await dl.path());
  ok('a single .png download',/\.png$/i.test(dl.suggestedFilename())&&isPng(buf),dl.suggestedFilename());
  ok('PNG is 2160x3840 (2x of 1080x1920)',isPng(buf)&&pngWH(buf)==='2160x3840',isPng(buf)?pngWH(buf):'not png');
  await waitH(pg,/Saved!/,20000).catch(()=>{});
  ok('dialog says "Saved!"',(await pg.textContent('#bsH')).trim()==='Saved!',(await pg.textContent('#bsH')).trim());
  const note=(await pg.textContent('#bsNote')).trim();
  ok('nothing skipped (no "Not saved" / "Create design")',!/Not saved|Create design|could not/.test(note),note);
  ok('no render frame left',await rframes(pg)===0);
  ok('draft record unchanged (same at, board, imgs)',JSON.stringify(await lsDrafts(pg))===JSON.stringify(ls0));
  const board1=await pg.evaluate(id=>Studio.lab.idb.get('board:'+id),d.rec.board);
  ok('board in IndexedDB byte-for-byte unchanged',board1===d.board);
  /* the same picture Create's own Save makes */
  const cp=await newPage(ctx,'create own'); await cp.goto(BASE+'tools/create.html?draft='+d.id);
  await cp.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await cp.waitForTimeout(800);
  const diff=await cp.evaluate(async b64=>{ const f=BD.util.frames()[0]; BD.select([],{quiet:true}); const r=await BD.exportFrame(f,{scale:2,type:'image/png'});
    const other=new Blob([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],{type:'image/png'});
    const [x,y]=await Promise.all([createImageBitmap(r.blob),createImageBitmap(other)]); if(x.width!==y.width||x.height!==y.height) return {size:[x.width,x.height,y.width,y.height]};
    const px=bm=>{ const c=new OffscreenCanvas(bm.width,bm.height), g=c.getContext('2d'); g.drawImage(bm,0,0); return g.getImageData(0,0,bm.width,bm.height).data; };
    const a=px(x), q=px(y); let bad=0; for(let i=0;i<a.length;i+=4){ if(Math.abs(a[i]-q[i])>2||Math.abs(a[i+1]-q[i+1])>2||Math.abs(a[i+2]-q[i+2])>2||Math.abs(a[i+3]-q[i+3])>2) bad++; }
    let x0=1e9,y0=1e9,x1=-1,y1=-1; if(bad){ for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-q[i])>2||Math.abs(a[i+1]-q[i+1])>2||Math.abs(a[i+2]-q[i+2])>2||Math.abs(a[i+3]-q[i+3])>2){ const p=i/4, px_=p%x.width, py=(p/x.width)|0; x0=Math.min(x0,px_); x1=Math.max(x1,px_); y0=Math.min(y0,py); y1=Math.max(y1,py); } }
    return {bad,total:a.length/4,scale:r.scale,box:bad?[x0,y0,x1,y1]:undefined,own:bad?await new Promise(rs=>{ const f2=new FileReader(); f2.onload=()=>rs(f2.result); f2.readAsDataURL(r.blob); }):undefined}; },buf.toString('base64'));
  if(diff.own){ const dir=process.env.DUMP_DIR||'/tmp'; fs.writeFileSync(dir+'/create-render-own.png',Buffer.from(diff.own.split(',')[1],'base64')); fs.writeFileSync(dir+'/create-render-home.png',buf); console.log('  (dumped the two PNGs to '+dir+'/create-render-{own,home}.png, differing box '+diff.box+')'); delete diff.own; }
  ok('pixel-identical to Create’s own 2x Save',diff.bad===0&&diff.scale===2,diff);
  await ctx.close(); });

/* ===== 2: a 3-page Create draft + a Restock draft -> one ZIP; then the tidy-up offer ===== */
await blk('multi-page + offer',async()=>{ const ctx=await mk(DESK,{touch:false}); await createDraft(ctx,'chat'); await restockDraft(ctx);
  const pg=await newPage(ctx,'desk2'); await home(pg);
  ok('Continue editing lists 2 drafts',await pg.$$eval('#continueList .ccard[data-draft]',c=>c.length)===2);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:180000}),pg.click('#contSave')]);
  ok('one ZIP',/\.zip$/i.test(dl.suggestedFilename()),dl.suggestedFilename());
  const z=readZip(fs.readFileSync(await dl.path())), sizes=z.map(e=>e.name+' '+pngWH(e.data));
  ok('ZIP holds 4 PNGs',z.length===4&&z.every(e=>isPng(e.data)),sizes);
  const posts=z.filter(e=>pngWH(e.data)==='2160x2700'), story=z.filter(e=>pngWH(e.data)==='2160x3840');
  ok('3 post pages at 2160x2700 + 1 story at 2160x3840',posts.length===3&&story.length===1,sizes);
  ok('post pages numbered -01, -02, -03',JSON.stringify(posts.map(e=>e.name.match(/-(\d\d)\.png$/)?.[1]).sort())==='["01","02","03"]',posts.map(e=>e.name));
  await waitH(pg,/Saved!/,20000).catch(()=>{});
  ok('no render frame left',await rframes(pg)===0);
  const off=pg.locator('#bsOffer'); ok('offer: "Remove these 2 from Continue editing"',await off.isVisible()&&/Remove these 2/.test(await off.textContent()),await off.textContent().catch(()=>''));
  await off.click(); await pg.waitForTimeout(200); await pg.click('#bsGo'); await pg.waitForTimeout(600);
  ok('after confirm: no drafts left',(await lsDrafts(pg)).length===0,(await lsDrafts(pg)).map(x=>x.k));
  ok('Continue editing hidden',!(await pg.isVisible('#continueSec')));
  await ctx.close(); });

/* ===== 3: the render frame on its own ===== */
await blk('render frame',async()=>{
  const ctx=await mk(DESK,{touch:false}); const d=await createDraft(ctx,'ice-cold'); const pg=await newPage(ctx,'frame');
  await pg.goto(BASE+'index.html'); const ls0=await allLs(pg);
  await pg.goto(BASE+'tools/create.html?draft='+d.id+'&render=1');
  await pg.waitForFunction(()=>Studio.renderer,null,{timeout:20000});
  const r=await pg.evaluate(()=>{ const x=Studio.renderer; return {ok:x.ok,pages:x.pages,W:x.W,H:x.H,missing:x.missing}; });
  ok('renderer: ok, 1 page, 1080x1920, nothing missing',r.ok===true&&r.pages===1&&r.W===1080&&r.H===1920&&r.missing.length===0,r);
  ok('no templates sheet in the frame',await pg.evaluate(()=>{ const s=document.getElementById('crSheet'); return !s||s.hidden; }));
  const p=await pg.evaluate(async()=>{ const x=await Studio.renderer.page(0); return x&&{K:x.K,type:x.blob.type,size:x.blob.size}; });
  ok('page(0): PNG at K=2',p&&p.K===2&&p.type==='image/png'&&p.size>10000,p);
  const p15=await pg.evaluate(async()=>{ const x=await Studio.renderer.page(0,1.5); return x&&x.K; });
  ok('page(0, max 1.5): steps down to 1.5 like a low-memory batch',p15===1.5,p15);
  await pg.waitForTimeout(1500);
  ok('URL kept (?draft=…&render=1)',/render=1/.test(pg.url())&&pg.url().includes(d.id),pg.url());
  ok('no localStorage writes from the frame',await allLs(pg)===ls0);
  ok('board unchanged',await pg.evaluate(id=>Studio.lab.idb.get('board:'+id),d.rec.board)===d.board);
  await pg.goto(BASE+'tools/create.html?draft=nope&render=1'); await pg.waitForFunction(()=>Studio.renderer,null,{timeout:20000});
  ok('a draft that is gone: ok false',await pg.evaluate(()=>Studio.renderer.ok)===false);
  ok('a draft that is gone: no new draft written',await allLs(pg)===ls0);
  /* a saved Create design (Saved → Save pictures) and a team template */
  const doc=JSON.parse(d.board); delete doc.imgs; delete doc.cur;
  const db=teamDb({dX:{id:'dX',brand:'1stchoice',tool:'create',name:'Saved one',kind:'design',recipe:{v:1,kind:'board',doc,imgs:[]},photoPaths:[],thumb_path:'1stchoice/tmA/thumb.jpg',cols:[],updated_at:new Date().toISOString()}});
  await ctx.close();
  const c2=await mk(DESK,{touch:false,db}); const p2=await newPage(c2,'design');
  await p2.goto(BASE+'tools/create.html?design=dX&render=1'); await p2.waitForFunction(()=>Studio.renderer,null,{timeout:20000});
  const r2=await p2.evaluate(()=>{ const x=Studio.renderer; return {ok:x.ok,pages:x.pages,W:x.W,H:x.H}; });
  ok('saved Create design: ok, 1 page 1080x1920',r2.ok===true&&r2.pages===1&&r2.W===1080&&r2.H===1920,r2);
  const x2=await p2.evaluate(async()=>{ const x=await Studio.renderer.page(0); return x&&x.K; }); ok('saved Create design: page at K=2',x2===2,x2);
  ok('saved Create design: no draft written',await p2.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('studio:draft:'))));
  await p2.goto(BASE+'tools/create.html?design=tmA&render=1'); await p2.waitForFunction(()=>Studio.renderer,null,{timeout:20000});
  ok('team template: ok false (templates have no picture)',await p2.evaluate(()=>Studio.renderer.ok)===false);
  await c2.close(); });

/* ===== 4: phone, one share sheet ===== */
await blk('phone share',async()=>{ const ctx=await mk(PHONE,{share:true}); await createDraft(ctx,'ice-cold');
  const pg=await newPage(ctx,'phone'); await home(pg);
  await pg.locator('#contSave').tap();
  const sh=await pg.waitForFunction(()=>window.__shared,null,{timeout:120000}).then(h=>h.jsonValue());
  ok('one share sheet with 1 PNG',sh.length===1&&sh[0].type==='image/png'&&/\.png$/.test(sh[0].name)&&sh[0].size>10000,sh);
  await waitH(pg,/Saved!/,20000).catch(()=>{});
  ok('phone: "Saved!"',(await pg.textContent('#bsH')).trim()==='Saved!');
  await ctx.close(); });

/* ===== 5: Recently used shows team templates ===== */
const recRow=pg=>pg.$$eval('#crRecent .cr-rec',l=>l.map(x=>({id:x.dataset.rtpl?'t:'+x.dataset.rtpl:'team:'+x.dataset.rteam,name:x.textContent.trim(),img:!!x.querySelector('img'),dir:(x.querySelector('.nm')||{}).dir||'',h:x.getBoundingClientRect().height})));
const openPicker=async pg=>{ await pg.goto(BASE+'tools/create.html'); await pg.waitForFunction(()=>window.CRUI&&BD.util.frames().length>0,null,{timeout:20000}); await pg.waitForTimeout(400);
  if(!await pg.evaluate(()=>{ const s=document.getElementById('crSheet'); return s&&!s.hidden&&document.querySelector('.cr-tw'); })) await pg.evaluate(()=>CRUI.openTemplates()); };
await blk('recently used',async()=>{
  const ctx=await mk(PHONE,{seed:{[REC]:['team:tmB','t:ice-cold','team:gone','t:did-you-know','t:chat']}}); const pg=await newPage(ctx,'recent');
  await openPicker(pg); await pg.waitForSelector('#crTeamT .cr-tw',{timeout:10000}); await pg.waitForTimeout(1500);
  const row=await recRow(pg);
  ok('row: team tmB, Ice cold, Did you know (true order, the gone one skipped, 3 max)',JSON.stringify(row.map(r=>r.id))==='["team:tmB","t:ice-cold","t:did-you-know"]',row);
  ok('team card shows its name and thumbnail',row[0]&&row[0].name==='Ice cold post'&&row[0].img&&row[0].dir==='auto',row[0]);
  ok('brand cards keep their thumbnails',row.slice(1).every(r=>r.img),row);
  ok('row cards the same height',new Set(row.map(r=>Math.round(r.h))).size===1,row.map(r=>r.h));
  ok('Recently used visible',await pg.locator('#crRecent').isVisible());
  if(await pg.locator('#crTplQ').count()){ await pg.fill('#crTplQ','ice'); await pg.waitForTimeout(250);
    ok('search hides Recently used',!(await pg.locator('#crRecent').isVisible()));
    await pg.fill('#crTplQ',''); await pg.waitForTimeout(250);
    ok('clearing shows it again',await pg.locator('#crRecent').isVisible()); }
  await pg.locator('#crRecent [data-rtpl="ice-cold"]').tap(); await pg.waitForTimeout(400);
  if(await pg.locator('#tmRep').isVisible().catch(()=>false)) await pg.locator('#tmRep').tap();
  await pg.waitForFunction(()=>{ try{ return JSON.parse(localStorage.getItem('studio:tplRecent:1stchoice'))[0]==='t:ice-cold'; }catch(_){ return false; } },null,{timeout:15000});
  await pg.waitForTimeout(1500); await pg.evaluate(()=>CRUI.openTemplates()); await pg.waitForSelector('#crTeamT .cr-tw'); await pg.waitForTimeout(1200);
  await pg.locator('#crRecent [data-rteam="tmB"]').tap(); await pg.waitForTimeout(400);
  if(await pg.locator('#tmRep').isVisible().catch(()=>false)) await pg.locator('#tmRep').tap();
  const first=await pg.waitForFunction(()=>{ try{ return JSON.parse(localStorage.getItem('studio:tplRecent:1stchoice'))[0]==='team:tmB'; }catch(_){ return false; } },null,{timeout:15000}).then(()=>true,()=>false);
  ok('tapping the team card applies it: team:tmB first again',first,await pg.evaluate(()=>localStorage.getItem('studio:tplRecent:1stchoice')));
  ok('the sheet closed after applying',await pg.evaluate(()=>{ const s=document.getElementById('crSheet'); return !s||s.hidden; }));
  await ctx.close();
  /* only team ids: hidden at first, shown once the team list is in */
  const c2=await mk(PHONE,{seed:{[REC]:['team:tmC']}}); const p2=await newPage(c2,'recent-team-only'); await openPicker(p2);
  await p2.waitForSelector('#crTeamT .cr-tw',{timeout:10000}); await p2.waitForTimeout(500);
  const r2=await recRow(p2); ok('only a team id: the row shows it once loaded',await p2.locator('#crRecent').isVisible()&&r2.length===1&&r2[0].id==='team:tmC',r2);
  await c2.close();
  /* signed out: brand ones only, and no empty row when only team ids */
  const c3=await mk(PHONE,{signedOut:true,seed:{[REC]:['team:tmB','t:ice-cold']}}); const p3=await newPage(c3,'recent-out'); await openPicker(p3);
  await p3.waitForSelector('#crTeamSign',{timeout:10000}); await p3.waitForTimeout(500);
  const r3=await recRow(p3); ok('signed out: brand template only',r3.length===1&&r3[0].id==='t:ice-cold',r3);
  await c3.close();
  const c4=await mk(PHONE,{signedOut:true,seed:{[REC]:['team:tmB']}}); const p4=await newPage(c4,'recent-out2'); await openPicker(p4);
  await p4.waitForSelector('#crTeamSign',{timeout:10000}); await p4.waitForTimeout(500);
  ok('signed out, only team ids: no empty Recently used row',!(await p4.locator('#crRecent').isVisible()));
  await c4.close(); });

ok('no page errors',errs.length===0,errs);
await b.close();
console.log(`\n${n-fails}/${n} passed in ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(fails?1:0);
