/* Test helper (w2-packs): read a brand kit the way the engine does: brand.js, then each packs/<id>/pack.js merged in.
   loadKit(root,brandId) -> the brand object with assets, textFills, create.templates, templateCats, palette, reels and aliases merged. */
import fs from 'fs'; import path from 'path';
export function loadKit(root,id){
  let B=null; const P={};
  new Function('Studio',fs.readFileSync(path.join(root,'brands',id,'brand.js'),'utf8'))({registerBrand:b=>{ B=b; }});
  if(!B) return null;
  for(const pid of (B.packs||[])){
    const f=path.join(root,'brands',id,'packs',pid,'pack.js'); if(!fs.existsSync(f)) continue;
    let p=null; new Function('Studio',fs.readFileSync(f,'utf8'))({registerPack:x=>{ p=x; }}); if(!p) continue; P[pid]=p;
    B.assets=(B.assets||[]).concat(p.assets||[]); B.textFills=(B.textFills||[]).concat(p.textFills||[]);
    if((p.templates||[]).length){ B.create=B.create||{}; B.create.templates=(B.create.templates||[]).concat(p.templates); }
    if(p.templateCat&&p.templateCat.id) B.templateCats=(B.templateCats||[]).concat([p.templateCat]);
    if((p.palette||[]).length) B.palette=(B.palette||[]).concat(p.palette);
    if((p.reels||[]).length) B.reels=(B.reels||[]).concat(p.reels);
    B.aliases=Object.assign(B.aliases||{},p.aliases||{});
  }
  B.packList=Object.values(P); return B;
}
