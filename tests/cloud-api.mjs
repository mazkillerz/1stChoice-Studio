/* StudioCloud contract (tests/fakecloud.js, same API as assets/cloud.js): versions, restore, setThumb, review/caption, calendar,
   comments, phrases, campaigns. Also: node --check assets/cloud.js. Needs BASE (default http://127.0.0.1:8080/). Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import { execSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
try{ execSync('node --check '+new URL('../assets/cloud.js',import.meta.url).pathname); ok('cloud.js parses',true); }catch(e){ ok('cloud.js parses',false,String(e.message).slice(0,80)); }
const b=await chromium.launch(); const ctx=await b.newContext({serviceWorkers:'block'});
await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(BASE+'index.html'); await pg.waitForFunction(()=>window.StudioCloud||window.Studio,null,{timeout:8000}).catch(()=>{});
await pg.addScriptTag({content:fake});
const r=await pg.evaluate(async()=>{
  const C=window.StudioCloud, out={}, blob=t=>new Blob([t],{type:'image/jpeg'});
  const names=['versions','restoreVersion','setThumb','calendar','saveCalendarItem','deleteCalendarItem','comments','addComment','resolveComment','phrases','suggestPhrase','setPhraseStatus','campaigns','saveCampaign','deleteCampaign','setReview','setCaption','saveDesign','designs'];
  out.missing=names.filter(n=>typeof C[n]!=='function');
  const rec=n=>({v:2,n}); const B='t';
  const id=await C.saveDesign({brand:B,tool:'restock',name:'One',kind:'design',recipe:rec(0),photos:[],thumb:blob('t0'),author:'Sara'});
  out.v0=(await C.versions(id)).length;
  const t0=(await C.getDesign(id)).thumb_path;
  await C.saveDesign({id,brand:B,tool:'restock',name:'One',kind:'design',recipe:rec(1),photos:[],thumb:blob('t1'),author:'Omar'});
  let vs=await C.versions(id); out.v1=vs.length; out.v1recipe=vs[0].recipe.n; out.v1thumb=vs[0].thumb_path===t0; out.v1keys=Object.keys(vs[0]);
  out.files1=Object.keys(JSON.parse(localStorage.fakecloud).files).includes(t0);
  const cur1=await C.getDesign(id); out.author=cur1.author;
  for(let i=2;i<=21;i++) await C.saveDesign({id,brand:B,tool:'restock',name:'One',kind:'design',recipe:rec(i),photos:[],thumb:blob('t'+i)});
  vs=await C.versions(id); out.cap=vs.length; out.newest=vs[0].recipe.n; out.oldest=vs[vs.length-1].recipe.n;
  const files=Object.keys(JSON.parse(localStorage.fakecloud).files).filter(p=>p.startsWith(B+'/'+id+'/')); out.fileCount=files.length;
  const target=vs[vs.length-1]; const before=(await C.getDesign(id)).recipe.n;
  await C.restoreVersion(id,target.id,'Sara');
  const after=await C.getDesign(id); vs=await C.versions(id);
  out.restored=after.recipe.n===target.recipe.n; out.restoredFrom=target.recipe.n; out.afterVers=vs.length; out.keptCurrent=vs[0].recipe.n===before;
  const d0=await C.getDesign(id); await C.setThumb(id,blob('cover'));
  const d1=await C.getDesign(id); out.thumbOnly=d1.thumb_path!==d0.thumb_path&&JSON.stringify(d1.recipe)===JSON.stringify(d0.recipe)&&d1.name===d0.name&&(await C.versions(id)).length===vs.length;
  await C.setReview(id,'in_review','Sara'); await C.setCaption(id,'hello',['a','b']);
  const row=(await C.designs(B)).find(x=>x.id===id); out.review=[row.review,row.review_by,row.caption,row.hashtags];
  await C.setReview(id,null); out.reviewCleared=(await C.getDesign(id)).review===null;
  const camp=await C.saveCampaign({brand:B,name:'Eid',words:{a:1},look:'white',author:'Sara'}); out.camp=(await C.campaigns(B)).map(x=>x.name);
  const it=await C.saveCalendarItem({brand:B,day:'2026-11-10',title:'Post',design_ids:[id],campaign_id:camp.id}); await C.saveCalendarItem({brand:B,day:'2026-12-01',title:'Later'});
  out.cal=(await C.calendar(B,{from:'2026-11-01',to:'2026-11-30'})).map(x=>[x.title,x.status]); await C.deleteCalendarItem(it.id); out.calAfter=(await C.calendar(B,{})).length;
  const cm=await C.addComment({design_id:id,author:'Omar',text:' hi ',x:.25,y:.5}); await C.resolveComment(cm.id,true);
  const cs=await C.comments(id); out.cm=[cs.length,cs[0].text,cs[0].x,cs[0].resolved];
  const ph=await C.suggestPhrase({brand:B,line:'x',category:'cta',author:'Sara'}); await C.setPhraseStatus(ph.id,'approved','Owner','y');
  const ps=await C.phrases(B); out.ph=[ps.length,ps[0].status,ps[0].approved_by,ps[0].line];
  await C.deleteCampaign(camp.id); out.campGone=(await C.campaigns(B)).length;
  out.otherEmpty=[(await C.versions('nope')).length,(await C.comments('nope')).length];
  await C.deleteDesign(id); out.afterDel=[(await C.versions(id)).length,(await C.comments(id)).length];
  return out;
});
ok('every contract function exists',r.missing.length===0,r.missing);
ok('first save has no version',r.v0===0);
ok('an update keeps one version with the old recipe + thumb',r.v1===1&&r.v1recipe===0&&r.v1thumb&&r.files1,r);
ok('version has the contract fields',['id','design_id','name','recipe','thumb_path','photo_paths','author','created_at'].every(k=>r.v1keys.includes(k)),r.v1keys);
ok('designs row carries author',r.author==='Omar');
ok('21 updates leave 20 versions, newest first',r.cap===20&&r.newest===20&&r.oldest===1,[r.cap,r.newest,r.oldest]);
ok('files of dropped versions are tidied (20 thumbs + current)',r.fileCount<=22,r.fileCount);
ok('restore brings the old recipe back',r.restored,r.restoredFrom);
ok('restore keeps the current state as a version (still capped)',r.keptCurrent&&r.afterVers===20,[r.keptCurrent,r.afterVers]);
ok('setThumb changes only the cover',r.thumbOnly);
ok('setReview + setCaption show in designs()',JSON.stringify(r.review)==='["in_review","Sara","hello",["a","b"]]'&&r.reviewCleared,r.review);
ok('campaign saved',JSON.stringify(r.camp)==='["Eid"]');
ok('calendar filters by range, default draft; delete works',JSON.stringify(r.cal)==='[["Post","draft"]]'&&r.calAfter===1,[r.cal,r.calAfter]);
ok('comment round-trips and resolves',JSON.stringify(r.cm)==='[1,"hi",0.25,true]',r.cm);
ok('phrase suggested then approved with edited line',JSON.stringify(r.ph)==='[1,"approved","Owner","y"]',r.ph);
ok('deleteCampaign removes it',r.campGone===0);
ok('unknown design gives empty lists',JSON.stringify(r.otherEmpty)==='[0,0]');
ok('deleting a design drops its versions and comments',JSON.stringify(r.afterDel)==='[0,0]',r.afterDel);
ok('no page errors',errs.length===0,errs);

/* the REAL assets/cloud.js against a stub Supabase that has not had the migration applied: new tables/columns fail like PostgREST does */
const real=fs.readFileSync(new URL('../assets/cloud.js',import.meta.url),'utf8');
const pg2=await (await b.newContext({serviceWorkers:'block'})).newPage();
await pg2.goto(BASE+'index.html'); 
const q=await pg2.evaluate(async src=>{
  const rows={designs:[{id:'d1',brand:'t',name:'Old',recipe:{v:2},thumb_path:'t/d1/thumb-a.jpg',photo_paths:[]}]}, calls=[], files=new Set(['t/d1/thumb-a.jpg']);
  const NEW=['author','review','review_by','review_at','caption','hashtags','campaign_id'];
  const err=(code,message)=>({code,message});
  function from(t){ const st={t,op:'select',cols:'',pay:null}, b={};
    ['select','insert','upsert','update','delete'].forEach(op=>{ b[op]=(x)=>{ if(op==='select'&&st.op!=='select'){ return b; } st.op=op; st.pay=x; st.cols=typeof x==='string'?x:st.cols; return b; }; });
    ['eq','in','gte','lte','order','is','limit'].forEach(k=>b[k]=()=>b); b.single=b.maybeSingle=()=>{ st.one=true; return b; };
    b.then=(ok,no)=>Promise.resolve().then(()=>{ calls.push(st.op+' '+t);
      if(['design_versions','calendar_items','comments','phrases','campaigns'].includes(t)) return {data:null,error:err('PGRST205','Could not find the table \'public.'+t+'\' in the schema cache')};
      if(st.op==='select'&&t==='designs'){ if(NEW.some(c=>st.cols.includes(c))) return {data:null,error:err('42703','column designs.'+NEW.find(c=>st.cols.includes(c))+' does not exist')}; return {data:st.one?rows.designs[0]:rows.designs,error:null}; }
      if((st.op==='upsert')&&t==='designs'){ if(NEW.some(c=>c in st.pay)) return {data:null,error:err('PGRST204','Could not find the \'author\' column of \'designs\' in the schema cache')}; rows.designs=[st.pay]; return {data:null,error:null}; }
      return {data:st.one?{}:[],error:null}; }).then(ok,no);
    return b; }
  window.supabase={createClient:()=>({from,auth:{getSession:async()=>({data:{session:{user:{}}}}),onAuthStateChange(){},startAutoRefresh(){},stopAutoRefresh(){}},rpc:async()=>({data:true}),
    storage:{from:()=>({upload:async(p)=>{ files.add(p); return {error:null}; },list:async()=>({data:[...files].map(f=>({id:'1',name:f.split('/').pop()})),error:null}),remove:async ps=>{ ps.forEach(p=>files.delete(p)); return {error:null}; }})}})};
  window.STUDIO_CONFIG={bucket:'studio',supabaseUrl:'x',supabaseKey:'y'};
  (0,eval)(src);
  const C=window.StudioCloud, o={};
  o.list=(await C.designs('t')).map(d=>[d.id,d.review,d.caption]);
  o.versions=await C.versions('d1'); o.cal=await C.calendar('t',{}); o.com=await C.comments('d1'); o.ph=await C.phrases('t'); o.camp=await C.campaigns('t');
  const id=await C.saveDesign({id:'d1',brand:'t',tool:'x',name:'New',kind:'design',recipe:{v:2},photos:[],thumb:new Blob(['x'],{type:'image/jpeg'}),author:'Sara'});
  o.saved=id; o.name=rows.designs[0].name; o.files=[...files].length;
  return o; },real);
ok('before the migration: designs() still lists (old columns)',JSON.stringify(q.list)==='[["d1",null,null]]',q.list);
ok('before the migration: versions/calendar/comments/phrases/campaigns give []',[q.versions,q.cal,q.com,q.ph,q.camp].every(x=>Array.isArray(x)&&!x.length));
ok('before the migration: saveDesign with an author still saves, the old preview is tidied',q.saved==='d1'&&q.name==='New'&&q.files===1,[q.saved,q.name,q.files]);
await b.close(); console.log(res.join('\n')); const f=res.filter(x=>x.startsWith('FAIL')).length; console.log((res.length-f)+' passed, '+f+' failed'); process.exit(f?1:0);
