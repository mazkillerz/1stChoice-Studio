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
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'studio-auth'}});
  sb.auth.onAuthStateChange(()=>{memberCache=null;});
  return sb;
}
function fail(error,what){ if(error){ const e=new Error((what?what+': ':'')+(error.message||String(error))); e.cause=error; throw e; } }
const uid=()=>(crypto.randomUUID?crypto.randomUUID():'x'+Date.now().toString(36)+Math.random().toString(36).slice(2));

/* ---------- account ---------- */
async function session(){ const c=await client(); const {data}=await c.auth.getSession(); return data.session||null; }
async function user(){ const s=await session(); return s?s.user:null; }
async function isMember(){
  if(memberCache!==null) return memberCache;
  const c=await client(); if(!(await session())) return memberCache=false;
  const {data,error}=await c.rpc('am_i_team_member'); if(error) return false;
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
async function signOut(){ const c=await client(); await c.auth.signOut(); memberCache=null; }
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
async function designs(brand){
  const c=await client();
  const {data,error}=await c.from('designs').select('id,tool,name,kind,thumb_path,updated_at,used_at,created_at,design_collections(collection_id)').eq('brand',brand).order('updated_at',{ascending:false});
  fail(error,'Saved designs');
  return data.map(d=>({...d,collections:(d.design_collections||[]).map(x=>x.collection_id)}));
}
async function getDesign(id){ const c=await client(); const {data,error}=await c.from('designs').select('*,design_collections(collection_id,collections(name))').eq('id',id).single(); fail(error,'Open design'); data.collectionNames=(data.design_collections||[]).map(x=>x.collections&&x.collections.name).filter(Boolean); return data; }
async function upload(path,blob){ const c=await client(); const {error}=await c.storage.from(CFG.bucket).upload(path,blob,{upsert:true,contentType:blob.type||'image/jpeg',cacheControl:'31536000'}); fail(error,'Upload'); return path; }
async function removeFiles(paths){ paths=(paths||[]).filter(Boolean); if(!paths.length) return; const c=await client(); await c.storage.from(CFG.bucket).remove(paths); }
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

/* save (new or update). photos: [{blob}|{path}|null] in slot order; kind 'template' keeps no photos. */
async function saveDesign(o){
  const c=await client(); const id=o.id||uid(); const base=o.brand+'/'+id+'/';
  let old=null; if(o.id){ const {data}=await c.from('designs').select('photo_paths,thumb_path').eq('id',o.id).single(); old=data; }
  const paths=[];
  if(o.kind!=='template'){
    for(let i=0;i<(o.photos||[]).length;i++){ const p=o.photos[i];
      if(!p){ paths.push(null); continue; }
      if(p.path&&!p.blob){ paths.push(p.path); continue; }
      paths.push(await upload(base+'photo-'+i+'-'+uid().slice(0,8)+(p.blob.type==='image/png'?'.png':'.jpg'),p.blob));
    }
  }
  const thumb=o.thumb?await upload(base+'thumb-'+uid().slice(0,8)+'.jpg',o.thumb):(old&&old.thumb_path);
  const row={id,brand:o.brand,tool:o.tool,name:o.name.trim(),kind:o.kind||'design',schema_version:o.recipe.v||1,recipe:o.recipe,thumb_path:thumb,photo_paths:paths.filter(Boolean)};
  const recipe={...o.recipe,photoPaths:paths}; row.recipe=recipe;
  const {error}=await c.from('designs').upsert(row); fail(error,'Save design');
  if(old){ const keep=new Set([...row.photo_paths,row.thumb_path]); await removeFiles([...(old.photo_paths||[]),old.thumb_path].filter(p=>p&&!keep.has(p))); }
  if(o.collections) await setDesignCollections(o.brand,id,o.collections);
  return id;
}
async function renameDesign(id,name){ const c=await client(); const {error}=await c.from('designs').update({name:name.trim()}).eq('id',id); fail(error,'Rename'); }
async function touchUsed(id){ const c=await client(); await c.from('designs').update({used_at:new Date().toISOString()}).eq('id',id); }
async function deleteDesign(id){
  const c=await client(); const {data}=await c.from('designs').select('photo_paths,thumb_path').eq('id',id).single();
  const {error}=await c.from('designs').delete().eq('id',id); fail(error,'Delete');
  if(data) await removeFiles([...(data.photo_paths||[]),data.thumb_path]);
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

window.StudioCloud={client,session,user,isMember,sendCode,verifyCode,signOut,onAuth,members,addMember,removeMember,
  collections,ensureCollections,renameCollection,deleteCollection,setDesignCollections,
  designs,getDesign,saveDesign,renameDesign,touchUsed,deleteDesign,duplicateDesign,fileUrl,fileUrls,download};
})();
