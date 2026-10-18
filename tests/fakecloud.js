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
  async designs(brand){ return Object.values(db().designs).filter(d=>d.brand===brand).map(d=>({...d,collections:[]})); },
  async download(path){ return toBlob(db().files[path]); },
  async fileUrl(p){ return db().files[p]||null; }, async fileUrls(ps){ const f=db().files, o={}; ps.forEach(p=>{ if(f[p]) o[p]=f[p]; }); return o; },
  touchUsed:async()=>{}, renameDesign:async()=>{}, deleteDesign:async()=>0, duplicateDesign:async()=>null, setDesignCollections:async()=>{}, renameCollection:async()=>{}, deleteCollection:async()=>{}
};
})();
