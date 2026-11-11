/* Test double for assets/cloud.js: same API, keeps designs + photos in this browser (localStorage). */
(function(){
const K='fakecloud', db=()=>JSON.parse(localStorage.getItem(K)||'{"designs":{},"files":{},"cols":{}}'), put=d=>localStorage.setItem(K,JSON.stringify(d));
const toData=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});
const toBlob=async u=>(await fetch(u)).blob();
const uid=()=>'d'+Math.random().toString(36).slice(2,10);
const me={email:'team@1stchoice.cloud'};
const CAP=20, vlist=(d,id)=>(d.versions||[]).filter(v=>v.design_id===id);
function keepVersion(d,x,author){ d.versions=d.versions||[]; d.versions.push({id:'v'+uid(),design_id:x.id,name:x.name,recipe:x.recipe,thumb_path:x.thumb_path,photo_paths:(x.recipe&&x.recipe.photoPaths||[]).filter(Boolean),author:x.author||author||null,created_at:new Date().toISOString()});
  const mine=vlist(d,x.id); mine.slice(0,Math.max(0,mine.length-CAP)).forEach(v=>{ d.versions.splice(d.versions.indexOf(v),1); }); }
/* files of this design that neither the design nor a kept version points at are dropped (like the real tidy step) */
function tidy(d,id){ const x=d.designs[id], keep=new Set([x.thumb_path,...(x.recipe.photoPaths||[])]); vlist(d,id).forEach(v=>{ keep.add(v.thumb_path); (v.photo_paths||[]).forEach(p=>keep.add(p)); });
  Object.keys(d.files).forEach(p=>{ if(p.startsWith(x.brand+'/'+id+'/')&&!keep.has(p)) delete d.files[p]; }); }
const tbl=(d,n)=>(d[n]=d[n]||[]), now=()=>new Date().toISOString();
const upsertRow=(d,n,r)=>{ const t=tbl(d,n); const i=t.findIndex(x=>x.id===r.id); const row={...(i>=0?t[i]:{created_at:now()}),...r,updated_at:now()}; if(i>=0) t[i]=row; else t.push(row); return row; };
window.StudioCloud={
  teamEmail:'team@1stchoice.cloud',
  client:async()=>({}), session:async()=>({user:me}), user:async()=>me, isMember:async()=>true, signInTeam:async()=>{}, signOut:async()=>{}, onAuth(){},
  members:async()=>[{email:me.email,role:'member'}],
  collections:async brand=>Object.values(db().cols).filter(c=>c.brand===brand).map(c=>({id:c.id,name:c.name,count:Object.values(db().designs).filter(d=>(d.cols||[]).includes(c.name)).length,designs:[]})),
  async saveDesign(o){ const d=db(); const id=o.id||uid(); const paths=[]; const prev=o.id&&d.designs[o.id]||null;
    for(let i=0;i<(o.photos||[]).length;i++){ const p=o.photos[i]; if(!p){paths.push(null);continue;} if(p.path&&!p.blob){paths.push(p.path);continue;} const path=o.brand+'/'+id+'/photo-'+i+'-'+uid()+'.jpg'; d.files[path]=await toData(p.blob); paths.push(path); }
    if(prev) keepVersion(d,prev,o.author);   /* an update keeps the row it replaces as a version (newest 20) */
    const thumb=o.brand+'/'+id+'/'+(prev?'thumb-'+uid()+'.jpg':'thumb.jpg'); d.files[thumb]=await toData(o.thumb);
    const extra={}; if(prev) ['review','review_by','review_at','caption','hashtags','campaign_id','author'].forEach(k=>{ if(prev[k]!==undefined) extra[k]=prev[k]; }); if(o.author) extra.author=o.author;
    d.designs[id]={...extra,id,brand:o.brand,tool:o.tool,name:o.name,kind:o.kind,recipe:{...o.recipe,photoPaths:paths},thumb_path:thumb,cols:o.collections||[],updated_at:new Date().toISOString()};
    if(prev) tidy(d,id);
    (o.collections||[]).forEach(n=>{ d.cols[n]={id:n,name:n,brand:o.brand}; }); put(d); return id; },
  async getDesign(id){ const x=db().designs[id]; if(!x) throw new Error('not found'); return {...x,collectionNames:x.cols}; },
  async designs(brand){ return Object.values(db().designs).filter(d=>d.brand===brand).map(d=>({...d,collections:[...(d.cols||[])]})); },
  async download(path){ return toBlob(db().files[path]); },
  async fileUrl(p){ return db().files[p]||null; }, async fileUrls(ps){ const f=db().files, o={}; ps.forEach(p=>{ if(f[p]) o[p]=f[p]; }); return o; },
  touchUsed:async()=>{},
  /* the Saved page's actions really change the stored data (collection ids are the collection names here) */
  async renameDesign(id,name){ const d=db(); if(d.designs[id]){ d.designs[id].name=name.trim(); d.designs[id].updated_at=new Date().toISOString(); put(d); } },
  async deleteDesign(id){ const d=db(), x=d.designs[id]; if(!x) return 0; Object.keys(d.files).forEach(p=>{ if(p.startsWith(x.brand+'/'+id+'/')) delete d.files[p]; }); delete d.designs[id]; d.versions=(d.versions||[]).filter(v=>v.design_id!==id); d.comments=(d.comments||[]).filter(c=>c.design_id!==id); put(d); return 1; },
  async duplicateDesign(id,newName){ const d=db(), x=d.designs[id]; if(!x) throw new Error('not found'); const nid=uid(), thumb=x.brand+'/'+nid+'/thumb.jpg'; d.files[thumb]=d.files[x.thumb_path];
    d.designs[nid]={...x,id:nid,name:newName||(x.name+' (copy)'),thumb_path:thumb,cols:[...(x.cols||[])],updated_at:new Date().toISOString()}; put(d); return nid; },
  async setDesignCollections(brand,id,names){ const d=db(); if(!d.designs[id]) return; d.designs[id].cols=[...names]; names.forEach(n=>{ if(!d.cols[n]) d.cols[n]={id:n,name:n,brand}; }); put(d); },
  async renameCollection(id,name){ const d=db(), c=d.cols[id]; if(!c) return; const n=name.trim(); delete d.cols[id]; d.cols[n]={...c,id:n,name:n}; Object.values(d.designs).forEach(x=>{ x.cols=(x.cols||[]).map(v=>v===id?n:v); }); put(d); },
  async deleteCollection(id){ const d=db(); delete d.cols[id]; Object.values(d.designs).forEach(x=>{ x.cols=(x.cols||[]).filter(v=>v!==id); }); put(d); },
  /* ---- versions (newest first), restore, cover ---- */
  async versions(id){ return vlist(db(),id).slice().reverse(); },
  async restoreVersion(id,vid,author){ const d=db(), x=d.designs[id], v=(d.versions||[]).find(q=>q.id===vid&&q.design_id===id); if(!x||!v) throw new Error('Restore: not found');
    keepVersion(d,x,author); d.designs[id]={...x,recipe:v.recipe,thumb_path:v.thumb_path,updated_at:now(),...(author?{author}:{})}; tidy(d,id); put(d); return id; },
  async setThumb(id,blob){ const d=db(), x=d.designs[id]; if(!x) throw new Error('Cover: not found'); const np=x.brand+'/'+id+'/thumb-'+uid()+'.jpg'; d.files[np]=await toData(blob); x.thumb_path=np; x.updated_at=now(); tidy(d,id); put(d); return np; },
  async setReview(id,status,by){ const d=db(), x=d.designs[id]; if(!x) return; x.review=status||null; x.review_by=status?(by||null):null; x.review_at=status?now():null; put(d); },
  async setCaption(id,caption,hashtags){ const d=db(), x=d.designs[id]; if(!x) return; x.caption=caption==null?null:String(caption); x.hashtags=hashtags||null; put(d); },
  /* ---- calendar, comments, phrases, campaigns ---- */
  async calendar(brand,r){ r=r||{}; return tbl(db(),'calendar').filter(x=>x.brand===brand&&(!r.from||x.day>=r.from)&&(!r.to||x.day<=r.to)).sort((a,b)=>(a.day+(a.at||'')).localeCompare(b.day+(b.at||''))); },
  async saveCalendarItem(item){ const d=db(); const row=upsertRow(d,'calendar',{status:'draft',hashtags:[],design_ids:[],...item,id:item.id||uid()}); put(d); return row; },
  async deleteCalendarItem(id){ const d=db(); d.calendar=tbl(d,'calendar').filter(x=>x.id!==id); put(d); },
  async comments(id){ return tbl(db(),'comments').filter(c=>c.design_id===id); },
  async addComment(o){ const d=db(); const row={id:'c'+uid(),design_id:o.design_id,author:o.author||null,text:String(o.text||'').trim(),x:o.x==null?null:o.x,y:o.y==null?null:o.y,resolved:false,created_at:now()}; tbl(d,'comments').push(row); put(d); return row; },
  async resolveComment(id,on){ const d=db(); const c=tbl(d,'comments').find(x=>x.id===id); if(c){ c.resolved=on!==false; put(d); } },
  async phrases(brand){ return tbl(db(),'phrases').filter(x=>x.brand===brand).slice().reverse(); },
  async suggestPhrase(o){ const d=db(); const row=upsertRow(d,'phrases',{id:'p'+uid(),brand:o.brand,line:String(o.line||'').trim(),category:o.category||null,author:o.author||null,status:'suggested',approved_by:null}); put(d); return row; },
  async setPhraseStatus(id,status,by,line){ const d=db(); const x=tbl(d,'phrases').find(q=>q.id===id); if(!x) return; x.status=status; x.approved_by=status==='suggested'?null:(by||null); if(line!=null) x.line=String(line).trim(); x.updated_at=now(); put(d); },
  async campaigns(brand){ return tbl(db(),'campaigns').filter(x=>x.brand===brand).slice().reverse(); },
  async saveCampaign(c){ const d=db(); const row=upsertRow(d,'campaigns',{words:{},...c,id:c.id||'k'+uid()}); put(d); return row; },
  async deleteCampaign(id){ const d=db(); d.campaigns=tbl(d,'campaigns').filter(x=>x.id!==id); Object.values(d.designs).forEach(x=>{ if(x.campaign_id===id) x.campaign_id=null; }); d.calendar=tbl(d,'calendar').map(x=>x.campaign_id===id?{...x,campaign_id:null}:x); put(d); }
};
/* campaigns (mega w2) */
window.StudioCloud.setCampaign=async(designId,campaignId)=>{ const d=db(); if(d.designs[designId]){ d.designs[designId].campaign_id=campaignId||null; put(d); } };
})();
/* r3-assets: team assets (flag localStorage fakecloud-noassets=1 simulates the missing table) */
(function(){
const C=window.StudioCloud, K='fakecloud';
const db=()=>JSON.parse(localStorage.getItem(K)||'{"designs":{},"files":{},"cols":{}}'), put=d=>localStorage.setItem(K,JSON.stringify(d));
const off=()=>localStorage.getItem('fakecloud-noassets')==='1';
const toData=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});
const tbl=d=>(d.team_assets=d.team_assets||[]);
/* localStorage fakecloud-signedout=1: this phone is not signed in to the team */
{ const out=()=>localStorage.getItem('fakecloud-signedout')==='1', se=C.session, mem=C.isMember;
  C.session=async()=>out()?null:se(); C.isMember=async()=>out()?false:mem(); C.checkMember=async()=>out()?false:mem(); }
C.teamAssetsReady=async()=>!off();
C.teamAssets=async brand=>off()?[]:tbl(db()).filter(x=>x.brand===brand).slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
C.saveTeamAsset=async o=>{ const d=db(); const id='ta'+Math.random().toString(36).slice(2,10), base=o.brand+'/assets/'+id+'/';
  d.files[base+'full.png']=await toData(o.blob); if(o.prevBlob) d.files[base+'prev.png']=await toData(o.prevBlob);
  const row={id,brand:o.brand,name:String(o.name||'').trim(),tags:o.tags||[],folder:o.folder||null,path:base+'full.png',prev_path:o.prevBlob?base+'prev.png':null,w:o.w||null,h:o.h||null,cutout:!!o.cutout,author:o.author||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  tbl(d).push(row); put(d); return row; };
C.updateTeamAsset=async(id,patch)=>{ const d=db(), r=tbl(d).find(x=>x.id===id); if(!r) return; ['name','tags','folder'].forEach(k=>{ if(patch&&k in patch) r[k]=patch[k]; }); r.updated_at=new Date().toISOString(); put(d); };
C.removeTeamAsset=async id=>{ const d=db(); d.team_assets=tbl(d).filter(x=>x.id!==id); put(d); };
})();
