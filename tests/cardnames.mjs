/* Studio 1.6.0: names on Saved cards. An automatic name ("Restock – 28 Oct") shows only "Restock" when its date is the
   day the card's caption already gives, so it fits on one line instead of "Restock – 2…". Any other name stays as typed.
   Older designs say "18 Oct", never the phone's 10/18/2026. The full name stays in the tooltip, the label and the menu.
   Run like tests/full.mjs (server on :8080, or BASE=...). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pic='data:image/jpeg;base64,'+fs.readFileSync(new URL('../assets/thumbs/1stchoice/restock-sm.jpg',import.meta.url)).toString('base64');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':'')); };
const tag=d=>d.getDate()+' '+d.toLocaleString('en',{month:'short'});
const now=new Date(), old=new Date(Date.now()-10*86400e3), other=new Date(Date.now()+3*86400e3);
const list=[['a','restock','Restock – '+tag(now),now],['b','offer','Offer – '+tag(other),now],['c','photo-story','Al Khoud shop',now],
  ['d','collage','Collage – '+tag(old),old],['e','restock','Photo story – '+tag(now),now]];
const db={designs:{},files:{},cols:{}};
list.forEach(([id,tool,name,at])=>{ const th='1stchoice/'+id+'/thumb.jpg'; db.files[th]=pic; db.designs[id]={id,brand:'1stchoice',tool,name,kind:'design',recipe:{photoPaths:[]},thumb_path:th,cols:[],updated_at:at.toISOString()}; });
const b=await chromium.launch(); const errs=[];
for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:`try{ localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); localStorage.setItem('studio:welcome','1'); }catch(e){}`});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(BASE+'index.html#saved'); await pg.waitForSelector('#savedGrid .sv-card[data-id]',{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(600);
  const cards=await pg.$$eval('#savedGrid .sv-card[data-id]',l=>Object.fromEntries(l.map(c=>{ const b=c.querySelector('.sv-txt b'), cap=c.querySelector('.sv-txt>span');
    return [c.dataset.id,{name:b.textContent,title:b.title,label:c.querySelector('.sv-open').getAttribute('aria-label'),cap:cap.textContent,fits:b.scrollWidth<=b.clientWidth+1}]; })));
  const N=scheme+': ';
  ok(N+'an automatic name from the same day shows just the tool: "Restock"',cards.a&&cards.a.name==='Restock'&&cards.a.fits,JSON.stringify(cards.a));
  ok(N+'its full name stays in the tooltip and the label',cards.a&&cards.a.title===list[0][2]&&cards.a.label.startsWith(list[0][2]));
  ok(N+'a name with another date (an offer\'s end date) stays whole',cards.b&&cards.b.name===list[1][2],JSON.stringify(cards.b));
  ok(N+'a typed name stays as typed',cards.c&&cards.c.name==='Al Khoud shop');
  ok(N+'an older automatic name: "Collage", and the caption gives the day as "'+tag(old)+'"',cards.d&&cards.d.name==='Collage'&&cards.d.cap===tag(old),JSON.stringify(cards.d));
  ok(N+'no caption uses slashes (10/18/2026)',Object.values(cards).every(c=>!/\//.test(c.cap)));
  ok(N+'a name whose start is another tool stays whole',cards.e&&cards.e.name===list[4][2],JSON.stringify(cards.e));
  /* the menu still shows the full name */
  await pg.tap('#savedGrid .sv-card[data-id="a"] .sv-more'); await pg.waitForTimeout(500);
  ok(N+'the design\'s menu shows the full name',(await pg.textContent('dialog[open] h3').catch(()=>''))===list[0][2]);
  /* Home's Saved row uses the same cards */
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card[data-id]',{timeout:10000}).catch(()=>{});
  ok(N+'the Saved row on Home shows "Restock" too',(await pg.$eval('#savedRowList .sv-card[data-id="a"] .sv-txt b',e=>e.textContent).catch(()=>''))==='Restock');
  await ctx.close();
}
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
await b.close();
res.forEach(l=>console.log(l)); const f=res.filter(l=>l.startsWith('FAIL')).length; console.log(`\n${res.length-f} passed, ${f} failed`); process.exit(f?1:0);
