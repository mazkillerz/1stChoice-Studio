/* Test double for assets/cloud.js: same API, keeps designs + photos in this browser (localStorage). */
(function(){
const K='fakecloud', db=()=>JSON.parse(localStorage.getItem(K)||'{"designs":{},"files":{},"cols":{}}'), put=d=>localStorage.setItem(K,JSON.stringify(d));
const toData=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});
const toBlob=async u=>(await fetch(u)).blob();
const uid=()=>'d'+Math.random().toString(36).slice(2,10);
const me={email:'team@1stchoice.cloud'};
window.StudioCloud={
  teamEmail:'team@1stchoice.cloud',
  client:async()=>({}), session:async()=>({user:me}), user:async()=>me, isMember:async()=>true, signInTeam:async()=>{}, signOut:async()=>{}, onAuth(){},
  members:async()=>[{email:me.email,role:'member'}],
  collections:async brand=>Object.values(db().cols).filter(c=>c.brand===brand).map(c=>({id:c.id,name:c.name,count:Object.values(db().designs).filter(d=>(d.cols||[]).includes(c.name)).length,designs:[]})),
  async saveDesign(o){ const d=db(); const id=o.id||uid(); const paths=[];
    for(let i=0;i<(o.photos||[]).length;i++){ const p=o.photos[i]; if(!p){paths.push(null);continue;} if(p.path&&!p.blob){paths.push(p.path);continue;} const path=o.brand+'/'+id+'/photo-'+i+'-'+uid()+'.jpg'; d.files[path]=await toData(p.blob); paths.push(path); }
    const thumb=o.brand+'/'+id+'/thumb.jpg'; d.files[thumb]=await toData(o.thumb);
    d.designs[id]={id,brand:o.brand,tool:o.tool,name:o.name,kind:o.kind,recipe:{...o.recipe,photoPaths:paths},thumb_path:thumb,cols:o.collections||[],updated_at:new Date().toISOString()};
    (o.collections||[]).forEach(n=>{ d.cols[n]={id:n,name:n,brand:o.brand}; }); put(d); return id; },
  async getDesign(id){ const x=db().designs[id]; if(!x) throw new Error('not found'); return {...x,collectionNames:x.cols}; },
  async designs(brand){ return Object.values(db().designs).filter(d=>d.brand===brand).map(d=>({...d,collections:[...(d.cols||[])]})); },
  async download(path){ return toBlob(db().files[path]); },
  async fileUrl(p){ return db().files[p]||null; }, async fileUrls(ps){ const f=db().files, o={}; ps.forEach(p=>{ if(f[p]) o[p]=f[p]; }); return o; },
  touchUsed:async()=>{},
  /* the Saved page's actions really change the stored data (collection ids are the collection names here) */
  async renameDesign(id,name){ const d=db(); if(d.designs[id]){ d.designs[id].name=name.trim(); d.designs[id].updated_at=new Date().toISOString(); put(d); } },
  async deleteDesign(id){ const d=db(), x=d.designs[id]; if(!x) return 0; Object.keys(d.files).forEach(p=>{ if(p.startsWith(x.brand+'/'+id+'/')) delete d.files[p]; }); delete d.designs[id]; put(d); return 1; },
  async duplicateDesign(id,newName){ const d=db(), x=d.designs[id]; if(!x) throw new Error('not found'); const nid=uid(), thumb=x.brand+'/'+nid+'/thumb.jpg'; d.files[thumb]=d.files[x.thumb_path];
    d.designs[nid]={...x,id:nid,name:newName||(x.name+' (copy)'),thumb_path:thumb,cols:[...(x.cols||[])],updated_at:new Date().toISOString()}; put(d); return nid; },
  async setDesignCollections(brand,id,names){ const d=db(); if(!d.designs[id]) return; d.designs[id].cols=[...names]; names.forEach(n=>{ if(!d.cols[n]) d.cols[n]={id:n,name:n,brand}; }); put(d); },
  async renameCollection(id,name){ const d=db(), c=d.cols[id]; if(!c) return; const n=name.trim(); delete d.cols[id]; d.cols[n]={...c,id:n,name:n}; Object.values(d.designs).forEach(x=>{ x.cols=(x.cols||[]).map(v=>v===id?n:v); }); put(d); },
  async deleteCollection(id){ const d=db(); delete d.cols[id]; Object.values(d.designs).forEach(x=>{ x.cols=(x.cols||[]).filter(v=>v!==id); }); put(d); }
};
})();
