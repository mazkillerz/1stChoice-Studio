/* Planned content (2.3.1): a saved design may point at files shipped with the site instead of the bucket.
   - recipe.docSite: getDesign fills recipe.doc from that file (every tool then reads a normal recipe)
   - thumb_path 'site:<path>': fileUrl / fileUrls give the site URL, download fetches it
   Real assets/cloud.js; Supabase answered by a route. Run: server on :8080 (or BASE=...), then node tests/planned.mjs. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const res=[]; const ok=(n,c,i)=>res.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' ('+JSON.stringify(i)+')':''));
const b=await chromium.launch(); const ctx=await b.newContext({serviceWorkers:'block'}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
const row={id:'p1',brand:'1stchoice',tool:'create',name:'Planned',kind:'design',schema_version:1,thumb_path:'site:assets/thumbs/1stchoice/tpl/nd-countdown-3.jpg',photo_paths:[],
  recipe:{v:1,kind:'board',docSite:'brands/1stchoice/templates/nd26/nd-countdown-3.json',imgs:[],photoPaths:[]},design_collections:[]};
const removed=[];
await ctx.route(/supabase\.co\/rest\/v1\/designs/,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(row)}));
await ctx.route(/supabase\.co\/storage\/v1\/object\/sign/,r=>r.fulfill({contentType:'application/json',body:JSON.stringify([])}));
await ctx.route(/supabase\.co\/storage\/v1\/object\/studio/,r=>{ if(r.request().method()==='DELETE') removed.push(r.request().postData()); r.fulfill({contentType:'application/json',body:'[]'}); });
await pg.goto(BASE+'whats-new.html');
await pg.addScriptTag({url:BASE+'assets/config.js'}); await pg.addScriptTag({url:BASE+'assets/cloud.js'});
const out=await pg.evaluate(async()=>{ const C=window.StudioCloud; const d=await C.getDesign('p1'); const u=await C.fileUrl(d.thumb_path); const us=await C.fileUrls([d.thumb_path]);
  const bl=await C.download(d.thumb_path);
  return {nodes:((d.recipe.doc||{}).nodes||[]).length, tpl:(((d.recipe.doc||{}).nodes||[])[0]||{a:{}}).a.tpl, u, us:us[d.thumb_path], size:bl.size, type:bl.type}; });
ok('getDesign fills recipe.doc from docSite',out.nodes===1&&out.tpl==='nd-countdown-3',out);
ok('fileUrl gives the site URL',/assets\/thumbs\/1stchoice\/tpl\/nd-countdown-3\.jpg$/.test(out.u||''),out.u);
ok('fileUrls gives the site URL',out.us===out.u);
ok('download fetches the shipped cover',out.size>1000&&/jpeg/.test(out.type),[out.size,out.type]);
ok('no page errors',!errs.length,errs);
await b.close(); console.log(res.join('\n')); process.exit(res.some(r=>r.startsWith('FAIL'))?1:0);
