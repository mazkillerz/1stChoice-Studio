/* Reel previews for Home → Templates (Reels): assets/thumbs/<brand>/tpl/reel-<id>.jpg, 320×569 JPEG, the frame at the reel's `poster` time.
   Drawn by the reel engine itself (tests/fixtures/reels/scene.html), so it is the same picture the editor shows.
     node tests/reelthumbs.mjs            every reel in the brand kit's `reels` list
     node tests/reelthumbs.mjs winter-cat only these ids
   Serve the repo first: npx http-server -p 8080 -c-1 .   (BASE=http://host:port/ to use another address; BRAND=<id> for another brand). */
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
import fs from 'fs';
import path from 'path';
const { chromium } = await import('playwright');
const BASE=process.env.BASE||'http://127.0.0.1:8080/', BRAND_ID=process.env.BRAND||'1stchoice';
const ROOT=new URL('../',import.meta.url).pathname, OUT=path.join(ROOT,'assets/thumbs',BRAND_ID,'tpl');
let BRAND=null; new Function('Studio',fs.readFileSync(path.join(ROOT,'brands',BRAND_ID,'brand.js'),'utf8'))({registerBrand:b=>{ BRAND=b; }});
const want=process.argv.slice(2), reels=((BRAND&&BRAND.reels)||[]).map(r=>r.id).filter(id=>!want.length||want.includes(id));
const b=await chromium.launch(), p=await (await b.newContext({serviceWorkers:'block'})).newPage(); let bad=0;
await p.goto(BASE+'tests/fixtures/reels/scene.html');
fs.mkdirSync(OUT,{recursive:true});
for(const id of reels){
  const m=JSON.parse(fs.readFileSync(path.join(ROOT,'brands',BRAND_ID,'reels',id,'reel.json'),'utf8'));
  const url=await p.evaluate(async([id,t])=>{ const c=await T.frame(id,t,undefined,320); return c.toDataURL('image/jpeg',0.8); },[id,m.poster||0]);
  const buf=Buffer.from(url.split(',')[1],'base64'), f=path.join(OUT,'reel-'+id+'.jpg');
  if(buf.length>45000){ console.error('too big: '+id+' '+buf.length); bad=1; continue; }
  fs.writeFileSync(f,buf); console.log('wrote '+path.relative(ROOT,f)+' '+buf.length+' bytes');
}
await b.close(); process.exit(bad);
