/* Studio cloud: team sign-in, saved designs, collections and their photos (Supabase).
   Brand-agnostic: every row carries the brand id. Loaded lazily the first time it's needed. */
(function(){
const CFG=window.STUDIO_CONFIG||{};
const ROOT=(document.currentScript&&document.currentScript.src)?document.currentScript.src.replace(/assets\/cloud\.js.*$/,''):'../';
let sb=null, memberCache=null;

function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
async function client(){
  if(sb) return sb;
  if(!window.supabase) await loadScript(ROOT+'assets/vendor/supabase.js');
  /* Stay signed in: the session is kept in this browser and refreshed automatically, with no expiry on our side.
     It only ends on "Sign out" or if the phone clears the site's data. */
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'studio-auth',storage:window.localStorage},global:{fetch:timedFetch}});
  sb.auth.onAuthStateChange(()=>{memberCache=null;});
  // when the app comes back to the front (phones pause background tabs), refresh the session right away
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') sb.auth.startAutoRefresh(); else sb.auth.stopAutoRefresh(); });
  return sb;
}
/* a slow or missing connection (1.46.0): a request that hangs is stopped after a while, so the page can say so and offer
   Try again instead of a spinner that never ends. Photo uploads have no limit (a big photo on slow data takes time). */
function timedFetch(input,init){ init=init||{}; const url=String(input&&input.url||input), m=String(init.method||'GET').toUpperCase();
  if(init.signal||(m!=='GET'&&m!=='HEAD'&&url.includes('/storage/v1/object/'+CFG.bucket+'/'))) return fetch(input,init);
  const ac=new AbortController(), t=setTimeout(()=>ac.abort(),url.includes('/storage/v1/')?90000:20000);
  return fetch(input,{...init,signal:ac.signal}).finally(()=>clearTimeout(t)); }
/* is this error the connection (offline, or too slow), not the cloud saying no? */
const NET=/failed to fetch|networkerror|network request failed|load failed|err_internet|err_network|err_connection|err_name|abort|timed? ?out|fetch failed/i;
function netErr(e){ if(!e) return false; if(e.offline) return true; if(typeof navigator!=='undefined'&&navigator.onLine===false) return true;
  return e.name==='AuthRetryableFetchError'||NET.test(String(e.message||'')+' '+String(e.name||'')+' '+String(e.details||'')); }
const slowErr=e=>/abort|timed? ?out/i.test(String(e&&e.message||'')+' '+String(e&&e.name||''))&&!(typeof navigator!=='undefined'&&navigator.onLine===false);
/* errors read as plain words: "No connection…" instead of "Upload: TypeError: Failed to fetch" */
function fail(error,what){ if(!error) return;
  if(netErr(error)){ const e=new Error(slowErr(error)?'The connection is too slow right now. Try again in a moment.':'No connection. Check your internet and try again.'); e.offline=true; e.cause=error; throw e; }
  const e=new Error((what?what+': ':'')+(error.message||String(error))); e.cause=error; throw e; }
const uid=()=>(crypto.randomUUID?crypto.randomUUID():'x'+Date.now().toString(36)+Math.random().toString(36).slice(2));

/* ---------- account ---------- */
async function session(){ const c=await client(); const {data}=await c.auth.getSession(); return data.session||null; }
/* the session and why there is none: a sign-in that could not be refreshed because the phone is offline is not "signed out" */
/* an old sign-in that cannot be refreshed with no signal makes getSession wait a long time (45 s+): stop waiting after 12 s */
async function sessionState(){ const c=await client(); let late=0;
  const r=await Promise.race([c.auth.getSession(),new Promise(res=>{ late=setTimeout(()=>res({timedOut:true}),12000); })]); clearTimeout(late);
  if(r.timedOut) return {session:null,error:null,offline:true,slow:navigator.onLine!==false};
  const {data,error}=r; return {session:data&&data.session||null,error:error||null,offline:!!(error&&netErr(error)),slow:!!(error&&slowErr(error))}; }
/* a sign-in is kept in this browser (it may still need the network to refresh) */
function signedInHere(){ try{ return !!localStorage.getItem('studio-auth'); }catch(_){ return false; } }
async function user(){ const s=await session(); return s?s.user:null; }
async function isMember(){
  if(memberCache!==null) return memberCache;
  const c=await client(); if(!(await session())) return memberCache=false;
  const {data,error}=await c.rpc('am_i_team_member'); if(error) return false;
  return memberCache=!!data;
}
/* like isMember, but a failed check (offline, slow) throws instead of reading as "not on the team" */
async function checkMember(){
  if(memberCache!==null) return memberCache;
  const c=await client(); if(!(await session())) return memberCache=false;
  const {data,error}=await c.rpc('am_i_team_member'); fail(error,'Team');
  return memberCache=!!data;
}
async function sendCode(email){
  const c=await client();
  const {error}=await c.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{shouldCreateUser:true,emailRedirectTo:location.href.split('#')[0]}});
  fail(error,'Could not send the email');
}
async function verifyCode(email,code){
  const c=await client();
  const {error}=await c.auth.verifyOtp({email:email.trim().toLowerCase(),token:String(code).trim(),type:'email'});
  fail(error,'That code did not work'); memberCache=null;
}
/* the one shared team login: people only type the team password */
async function signInTeam(password){
  const c=await client();
  const {error}=await c.auth.signInWithPassword({email:CFG.teamEmail,password});
  if(error){ if(netErr(error)) fail(error); throw new Error(/invalid/i.test(error.message)?'Wrong password. Try again.':error.message); }
  memberCache=null;
}
async function signOut(){ const c=await client(); await c.auth.signOut({scope:'local'}); memberCache=null; }
function onAuth(fn){ client().then(c=>c.auth.onAuthStateChange((ev,s)=>fn(ev,s))); }

/* ---------- team (the owner adds people) ---------- */
async function members(){ const c=await client(); const {data,error}=await c.from('team_members').select('email,name,role,added_at').order('added_at'); fail(error,'Team'); return data; }
async function addMember(email,name){ const c=await client(); const {error}=await c.from('team_members').insert({email:email.trim().toLowerCase(),name:name||null,role:'member'}); fail(error,'Could not add'); }
async function removeMember(email){ const c=await client(); const {error}=await c.from('team_members').delete().eq('email',email); fail(error,'Could not remove'); }

/* ---------- collections ---------- */
async function collections(brand){
  const c=await client();
  const {data,error}=await c.from('collections').select('id,name,cover_design,updated_at,design_collections(design_id)').eq('brand',brand).order('name');
  fail(error,'Collections');
  return data.map(r=>({id:r.id,name:r.name,cover:r.cover_design,count:(r.design_collections||[]).length,designs:(r.design_collections||[]).map(x=>x.design_id)}));
}
async function ensureCollections(brand,names){
  const c=await client(); names=[...new Set((names||[]).map(n=>String(n).trim()).filter(Boolean))]; if(!names.length) return [];
  const {error}=await c.from('collections').upsert(names.map(name=>({brand,name})),{onConflict:'brand,name',ignoreDuplicates:true}); fail(error,'Collections');
  const {data,error:e2}=await c.from('collections').select('id,name').eq('brand',brand).in('name',names); fail(e2,'Collections');
  return data;
}
async function renameCollection(id,name){ const c=await client(); const {error}=await c.from('collections').update({name:name.trim()}).eq('id',id); fail(error,'Rename'); }
async function deleteCollection(id){ const c=await client(); const {error}=await c.from('collections').delete().eq('id',id); fail(error,'Delete'); }
async function setDesignCollections(brand,designId,names){
  const c=await client(); const cols=await ensureCollections(brand,names);
  const {error:e1}=await c.from('design_collections').delete().eq('design_id',designId); fail(e1,'Collections');
  if(cols.length){ const {error}=await c.from('design_collections').insert(cols.map(x=>({design_id:designId,collection_id:x.id}))); fail(error,'Collections'); }
  // a collection without a cover takes this design's picture
  for(const col of cols){ await c.from('collections').update({cover_design:designId}).eq('id',col.id).is('cover_design',null); }
}

/* ---------- designs ---------- */
/* a table or column the migration has not created yet (Postgres 42P01 / 42703, PostgREST PGRST204 / PGRST205): older data keeps working */
function missing(e){ return !!e&&(['42P01','42703','PGRST204','PGRST205'].includes(e.code)||/could not find|does not exist|schema cache/i.test(String(e.message||''))); }
const DESIGN_COLS='id,tool,name,kind,thumb_path,updated_at,used_at,created_at';
async function designs(brand){
  const c=await client();
  let r=await c.from('designs').select(DESIGN_COLS+',author,review,review_by,review_at,caption,hashtags,campaign_id,design_collections(collection_id)').eq('brand',brand).order('updated_at',{ascending:false});
  if(r.error&&missing(r.error)) r=await c.from('designs').select(DESIGN_COLS+',design_collections(collection_id)').eq('brand',brand).order('updated_at',{ascending:false});
  fail(r.error,'Saved designs');
  return r.data.map(d=>({review:null,caption:null,hashtags:null,author:null,campaign_id:null,...d,collections:(d.design_collections||[]).map(x=>x.collection_id)}));
}
async function getDesign(id){ const c=await client(); const {data,error}=await c.from('designs').select('*,design_collections(collection_id,collections(name))').eq('id',id).single(); fail(error,'Open design'); data.collectionNames=(data.design_collections||[]).map(x=>x.collections&&x.collections.name).filter(Boolean); return data; }
async function upload(path,blob){ const c=await client(); const {error}=await c.storage.from(CFG.bucket).upload(path,blob,{upsert:true,contentType:blob.type||'image/jpeg',cacheControl:'31536000'}); fail(error,'Upload'); return path; }
async function removeFiles(paths){ paths=(paths||[]).filter(Boolean); if(!paths.length) return; const c=await client(); const {error}=await c.storage.from(CFG.bucket).remove(paths); fail(error,'Remove images'); }
/* every file stored for one design lives in <brand>/<design id>/ */
async function listFolder(prefix){ const c=await client(); const {data,error}=await c.storage.from(CFG.bucket).list(prefix,{limit:1000}); fail(error,'Images'); return (data||[]).filter(f=>f.id).map(f=>prefix+f.name); }
const urlCache=new Map();
async function fileUrl(path){
  if(!path) return null; const hit=urlCache.get(path); if(hit&&hit.until>Date.now()) return hit.url;
  const c=await client(); const {data,error}=await c.storage.from(CFG.bucket).createSignedUrl(path,3600); if(error) return null;
  urlCache.set(path,{url:data.signedUrl,until:Date.now()+50*60*1000}); return data.signedUrl;
}
async function fileUrls(paths){
  paths=[...new Set(paths.filter(Boolean))]; const need=paths.filter(p=>!(urlCache.get(p)&&urlCache.get(p).until>Date.now()));
  if(need.length){ const c=await client(); const {data}=await c.storage.from(CFG.bucket).createSignedUrls(need,3600); (data||[]).forEach(r=>{ if(r.signedUrl) urlCache.set(r.path,{url:r.signedUrl,until:Date.now()+50*60*1000}); }); }
  const out={}; paths.forEach(p=>{ const h=urlCache.get(p); if(h) out[p]=h.url; }); return out;
}
async function download(path){ const c=await client(); const {data,error}=await c.storage.from(CFG.bucket).download(path); fail(error,'Photo'); return data; }

const VERSION_CAP=20;
const VCOLS='id,design_id,name,recipe,thumb_path,photo_paths,author,created_at';
/* the saved versions of one design, newest first ([] until the migration has been applied) */
async function versions(designId){
  const c=await client(); const {data,error}=await c.from('design_versions').select(VCOLS).eq('design_id',designId).order('created_at',{ascending:false});
  if(missing(error)) return []; fail(error,'Versions'); return data||[];
}
/* keep the newest VERSION_CAP versions; the older rows go first, then (by the caller's tidy) their files */
async function pruneVersions(designId){
  const c=await client(); const {data,error}=await c.from('design_versions').select('id').eq('design_id',designId).order('created_at',{ascending:false});
  if(error) return; const old=(data||[]).slice(VERSION_CAP).map(x=>x.id);
  if(old.length) await c.from('design_versions').delete().in('id',old);
}
async function versionFiles(designId){ try{ return (await versions(designId)).flatMap(v=>[v.thumb_path,...(v.photo_paths||[])]).filter(Boolean); }catch(_){ return []; } }
async function keepAsVersion(prev,author){
  const c=await client();
  const {data,error}=await c.from('design_versions').insert({design_id:prev.id,name:prev.name,recipe:prev.recipe,thumb_path:prev.thumb_path,photo_paths:prev.photo_paths||[],author:prev.author||author||null}).select('id').single();
  if(missing(error)) return null; fail(error,'Save design'); return data.id;
}
/* save (new or update). photos: [{blob}|{path}|null] in slot order; kind 'template' keeps no photos. */
/* Images go to Supabase ONLY here, when someone taps Save design: the photos actually used in the story
   (unchanged ones are not uploaded again) plus one small preview. Drafts never leave the phone.
   An update keeps the row it replaces as a version (design_versions, newest 20) and its files stay. */
async function saveDesign(o){
  const c=await client(); const id=o.id||uid(); const base=o.brand+'/'+id+'/';
  const paths=[], fresh=[]; let verId=null;
  try{
    if(o.kind!=='template'){
      for(let i=0;i<(o.photos||[]).length;i++){ const p=o.photos[i];
        if(!p){ paths.push(null); continue; }
        if(p.path&&!p.blob&&p.path.startsWith(base)){ paths.push(p.path); continue; }
        const np=await upload(base+'photo-'+i+'-'+uid().slice(0,8)+(p.blob.type==='image/png'?'.png':'.jpg'),p.blob); fresh.push(np); paths.push(np);
      }
    }
    const thumb=await upload(base+'thumb-'+uid().slice(0,8)+'.jpg',o.thumb); fresh.push(thumb);
    const row={id,brand:o.brand,tool:o.tool,name:o.name.trim(),kind:o.kind||'design',schema_version:o.recipe.v||1,recipe:{...o.recipe,photoPaths:paths},thumb_path:thumb,photo_paths:paths.filter(Boolean)};
    if(o.id){ const {data:prev}=await c.from('designs').select('id,name,recipe,thumb_path,photo_paths,author').eq('id',id).maybeSingle();
      if(prev) verId=await keepAsVersion(prev,o.author); }
    let {error}=await c.from('designs').upsert(o.author?{...row,author:o.author}:row);
    if(error&&o.author&&missing(error)) ({error}=await c.from('designs').upsert(row));   // the migration is not applied yet: save as before
    fail(error,'Save design');
    if(verId) await pruneVersions(id);
    // tidy: anything left in this design's folder that the new version (and every kept version) doesn't use is removed
    const keep=new Set([...row.photo_paths,thumb,...(await versionFiles(id))]);
    try{ await removeFiles((await listFolder(base)).filter(p=>!keep.has(p))); }catch(_){}
  }catch(err){ try{ await removeFiles(fresh); }catch(_){} if(verId){ try{ await c.from('design_versions').delete().eq('id',verId); }catch(_){} } throw err; }   // a failed save leaves nothing behind
  if(o.collections) await setDesignCollections(o.brand,id,o.collections);
  return id;
}
/* put an older version back; the state it replaces is kept as a new version first, so nothing is lost */
async function restoreVersion(designId,versionId,author){
  const c=await client();
  const {data:v,error:e1}=await c.from('design_versions').select(VCOLS).eq('id',versionId).eq('design_id',designId).single(); fail(e1,'Restore');
  const {data:cur,error:e2}=await c.from('designs').select('id,brand,name,recipe,thumb_path,photo_paths,author').eq('id',designId).single(); fail(e2,'Restore');
  await keepAsVersion(cur,author);
  const patch={recipe:v.recipe,thumb_path:v.thumb_path,photo_paths:v.photo_paths||[],updated_at:new Date().toISOString()};
  if(author){ const r=await c.from('designs').update({...patch,author}).eq('id',designId); if(r.error&&missing(r.error)) ({error:r.error}=await c.from('designs').update(patch).eq('id',designId)); fail(r.error,'Restore'); }
  else { const {error}=await c.from('designs').update(patch).eq('id',designId); fail(error,'Restore'); }
  await pruneVersions(designId);
  try{ const base=cur.brand+'/'+designId+'/'; const keep=new Set([v.thumb_path,...(v.photo_paths||[]),cur.thumb_path,...(cur.photo_paths||[]),...(await versionFiles(designId))].filter(Boolean));
    await removeFiles((await listFolder(base)).filter(p=>!keep.has(p))); }catch(_){}
  return designId;
}
/* replace only the cover picture ("Redraw cover"); the recipe stays */
async function setThumb(designId,blob){
  const c=await client(); const {data:cur,error:e0}=await c.from('designs').select('brand,thumb_path,photo_paths').eq('id',designId).single(); fail(e0,'Cover');
  const np=await upload(cur.brand+'/'+designId+'/thumb-'+uid().slice(0,8)+'.jpg',blob);
  const {error}=await c.from('designs').update({thumb_path:np,updated_at:new Date().toISOString()}).eq('id',designId);
  if(error){ try{ await removeFiles([np]); }catch(_){} fail(error,'Cover'); }
  const keep=new Set([np,...(cur.photo_paths||[]),...(await versionFiles(designId))]);
  try{ if(cur.thumb_path&&!keep.has(cur.thumb_path)) await removeFiles([cur.thumb_path]); }catch(_){}
  return np;
}
async function renameDesign(id,name){ const c=await client(); const {error}=await c.from('designs').update({name:name.trim()}).eq('id',id); fail(error,'Rename'); }
async function touchUsed(id){ const c=await client(); await c.from('designs').update({used_at:new Date().toISOString()}).eq('id',id); }
/* Delete = the design row AND every image stored for it in Supabase (photos + preview). */
async function deleteDesign(id){
  const c=await client(); const {data,error:e0}=await c.from('designs').select('brand,photo_paths,thumb_path').eq('id',id).single(); fail(e0,'Delete');
  const base=data.brand+'/'+id+'/';
  const files=[...new Set([...(await listFolder(base)),...(data.photo_paths||[]),data.thumb_path].filter(Boolean))];
  await removeFiles(files);
  const {error}=await c.from('collections').update({cover_design:null}).eq('cover_design',id); fail(error,'Delete');
  const {error:e2}=await c.from('designs').delete().eq('id',id); fail(e2,'Delete');
  const left=await listFolder(base).catch(()=>[]); if(left.length) await removeFiles(left);
  return files.length;
}
async function duplicateDesign(id,newName){
  const c=await client(); const d=await getDesign(id); const nid=uid(); const base=d.brand+'/'+nid+'/';
  const copy=async p=>{ if(!p) return null; const np=base+p.split('/').pop(); const {error}=await c.storage.from(CFG.bucket).copy(p,np); return error?null:np; };
  const photoPaths=[]; for(const p of (d.recipe.photoPaths||[])) photoPaths.push(await copy(p));
  const thumb=await copy(d.thumb_path);
  const recipe={...d.recipe,photoPaths};
  const {error}=await c.from('designs').insert({id:nid,brand:d.brand,tool:d.tool,name:newName||(d.name+' (copy)'),kind:d.kind,schema_version:d.schema_version,recipe,thumb_path:thumb,photo_paths:photoPaths.filter(Boolean)});
  fail(error,'Duplicate'); if(d.collectionNames.length) await setDesignCollections(d.brand,nid,d.collectionNames); return nid;
}

/* ---------- review, caption (columns on designs; they need the migration) ---------- */
async function setReview(id,status,by){
  const c=await client(); const {error}=await c.from('designs').update({review:status||null,review_by:status?(by||null):null,review_at:status?new Date().toISOString():null}).eq('id',id); fail(error,'Review');
}
async function setCaption(id,caption,hashtags){
  const c=await client(); const {error}=await c.from('designs').update({caption:caption==null?null:String(caption),hashtags:hashtags||null}).eq('id',id); fail(error,'Caption');
}

/* ---------- Wave 2 rows: calendar, comments, phrases, campaigns (reads give [] until the migration is applied) ---------- */
async function rows(q,what){ const {data,error}=await q; if(missing(error)) return []; fail(error,what); return data||[]; }
async function calendar(brand,range){
  const c=await client(); let q=c.from('calendar_items').select('*').eq('brand',brand); range=range||{};
  if(range.from) q=q.gte('day',range.from); if(range.to) q=q.lte('day',range.to);
  return rows(q.order('day').order('at',{nullsFirst:true}),'Calendar');
}
async function saveCalendarItem(item){
  const c=await client(); const row={...item,updated_at:new Date().toISOString()}; if(!row.id) row.id=uid();
  const {data,error}=await c.from('calendar_items').upsert(row).select().single(); fail(error,'Save to calendar'); return data;
}
async function deleteCalendarItem(id){ const c=await client(); const {error}=await c.from('calendar_items').delete().eq('id',id); fail(error,'Delete'); }
async function comments(designId){ const c=await client(); return rows(c.from('comments').select('*').eq('design_id',designId).order('created_at'),'Comments'); }
async function addComment(o){
  const c=await client(); const row={design_id:o.design_id,author:o.author||null,text:String(o.text||'').trim(),x:o.x==null?null:o.x,y:o.y==null?null:o.y};
  const {data,error}=await c.from('comments').insert(row).select().single(); fail(error,'Comment'); return data;
}
async function resolveComment(id,on){ const c=await client(); const {error}=await c.from('comments').update({resolved:on!==false}).eq('id',id); fail(error,'Comment'); }
async function phrases(brand){ const c=await client(); return rows(c.from('phrases').select('*').eq('brand',brand).order('created_at',{ascending:false}),'Phrases'); }
async function suggestPhrase(o){
  const c=await client(); const {data,error}=await c.from('phrases').insert({brand:o.brand,line:String(o.line||'').trim(),category:o.category||null,author:o.author||null,status:'suggested'}).select().single(); fail(error,'Suggest'); return data;
}
async function setPhraseStatus(id,status,by,line){
  const c=await client(); const patch={status,approved_by:status==='suggested'?null:(by||null),updated_at:new Date().toISOString()}; if(line!=null) patch.line=String(line).trim();
  const {error}=await c.from('phrases').update(patch).eq('id',id); fail(error,'Phrase');
}
async function campaigns(brand){ const c=await client(); return rows(c.from('campaigns').select('*').eq('brand',brand).order('updated_at',{ascending:false}),'Campaigns'); }
async function saveCampaign(camp){
  const c=await client(); const row={...camp,updated_at:new Date().toISOString()}; if(!row.id) row.id=uid();
  const {data,error}=await c.from('campaigns').upsert(row).select().single(); fail(error,'Save campaign'); return data;
}
async function deleteCampaign(id){ const c=await client(); const {error}=await c.from('campaigns').delete().eq('id',id); fail(error,'Delete'); }

/* campaigns (mega w2): which campaign a design belongs to (saveDesign does not pass campaign_id through) */
async function setCampaign(designId,campaignId){ const c=await client(); const {error}=await c.from('designs').update({campaign_id:campaignId||null}).eq('id',designId); fail(error,'Campaign'); }

window.StudioCloud={client,session,sessionState,signedInHere,netErr,user,isMember,checkMember,sendCode,verifyCode,signInTeam,signOut,onAuth,teamEmail:CFG.teamEmail,members,addMember,removeMember,
  collections,ensureCollections,renameCollection,deleteCollection,setDesignCollections,
  designs,getDesign,saveDesign,renameDesign,touchUsed,deleteDesign,duplicateDesign,fileUrl,fileUrls,download,
  versions,restoreVersion,setThumb,setReview,setCaption,calendar,saveCalendarItem,deleteCalendarItem,comments,addComment,resolveComment,phrases,suggestPhrase,setPhraseStatus,campaigns,saveCampaign,deleteCampaign,setCampaign};
})();
