/* Tokens check (mega w1): Studio.tokens(format) reads brands/<id>/brand.js `tokens` over neutral engine defaults.
   1. 1st Choice on a tool page: shape + the values the tools use today, h.tok inside draw, tokens reachable on Create and Board
   2. the test brand (tests/fixtures/brands/testbrand/): different values   3. a brand with no tokens block gets the neutral defaults
   4. a git diff of assets/ and tools/ against the base adds no brand hex colour (BASE_REF, default claude/mega-integration)
   Run like tests/smoke.mjs (server on :8080, or BASE=...). Exit code 1 on any FAIL. */
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('..',import.meta.url).pathname, FIX=ROOT+'tests/fixtures/brands/testbrand/';
const fake=fs.readFileSync(ROOT+'tests/fakecloud.js','utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const mimes={'.png':'image/png','.jpg':'image/jpeg','.js':'application/javascript'};
/* every h.tok seen inside a draw() */
const HOOK=`(()=>{ window.__tok=[]; let S; Object.defineProperty(window,'Studio',{configurable:true,get(){return S;},set(v){ S=v; if(v&&v.tool&&!v.__w){ const t=v.tool; v.tool=function(cfg){ const d=cfg.draw; if(d) cfg.draw=function(h,o){ try{ if(!window.__tok.length) window.__tok.push(h.tok); }catch(e){ window.__tok.push({err:e.message}); } return d.call(this,h,o); }; return t.call(this,cfg); }; v.__w=1; } }}); })();`;
async function page(b,brand,strip){
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  if(brand==='testbrand'){
    await ctx.route('**/brands/brands.js',r=>r.fulfill({contentType:'application/javascript',body:"Studio.brandList=['testbrand'];"}));
    await ctx.route('**/brands/testbrand/**',r=>{ const rest=decodeURIComponent(new URL(r.request().url()).pathname.split('/brands/testbrand/')[1]); const f=FIX+rest;
      if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
      let body=fs.readFileSync(f); if(strip&&rest==='brand.js') body=body.toString().replace(/\n  tokens:\{[\s\S]*?\n  \},\n/,'\n');
      r.fulfill({contentType:mimes[path.extname(f)]||'application/octet-stream',body}); });
  }
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort()); await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:HOOK});
  const pg=await ctx.newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message)); return pg;
}
const read=pg=>pg.evaluate(()=>({story:Studio.tokens('story'),post:Studio.tokens('post'),square:Studio.tokens('square'),hl:Studio.tokens('highlight'),dflt:Studio.tokens(),bogus:Studio.tokens('nope'),raw:Studio.tokens.raw(),tok:window.__tok[0]||null}));
const SHAPE=t=>t&&['headline','sub','body','small'].every(k=>t.type&&t.type[k]&&typeof t.type[k].size==='number'&&typeof t.type[k].lh==='number'&&['display','body','latin'].includes(t.type[k].font))
  &&Array.isArray(t.space)&&t.space.length>2&&['sm','md','lg','pill'].every(k=>typeof t.radius[k]==='number')&&['soft','lift'].every(k=>t.shadow[k]&&typeof t.shadow[k].blur==='number'&&typeof t.shadow[k].y==='number'&&typeof t.shadow[k].color==='string')
  &&['top','bottom','side'].every(k=>typeof t.safe[k]==='number')&&typeof t.w==='number'&&typeof t.h==='number';
const b=await chromium.launch();

/* 1. 1st Choice */
{ const pg=await page(b,'1stchoice'); await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(2500); const d=await read(pg);
  ok('1stchoice: story tokens have the full shape',SHAPE(d.story),d.story);
  ok('1stchoice: story canvas 1080x1920, safe top 250 / bottom 300',d.story.w===1080&&d.story.h===1920&&d.story.safe.top===250&&d.story.safe.bottom===300,d.story.safe);
  ok('1stchoice: formats post 1080x1350, square 1080x1080, highlight present',d.post.w===1080&&d.post.h===1350&&d.square.h===1080&&d.hl.w===1080&&d.hl.format==='highlight');
  ok('1stchoice: type scale = what the tools use (story headline 150, small 38 body 800; post headline 170)',d.story.type.headline.size===150&&d.story.type.headline.font==='display'&&d.story.type.small.size===38&&d.story.type.small.wt==='800'&&d.post.type.headline.size===170);
  ok('1stchoice: radius, shadow, space',d.story.radius.lg===64&&d.story.radius.pill>=500&&d.story.shadow.soft.blur===24&&d.story.shadow.lift.blur===64&&d.story.space.includes(44));
  ok('1stchoice: no format / unknown format = story',d.dflt.format==='story'&&d.bogus.format==='story');
  ok('1stchoice: Studio.tokens.raw() is the brand block',d.raw&&d.raw.type&&d.raw.type.story&&d.raw.radius.sm===40);
  ok('1stchoice: h.tok exists inside draw (story)',SHAPE(d.tok)&&d.tok.format==='story',d.tok&&d.tok.format);
  const mut=await pg.evaluate(()=>{ const t=Studio.tokens('story'); t.safe.top=1; t.type.headline.size=1; return Studio.tokens('story').safe.top+'/'+Studio.tokens('story').type.headline.size; });
  ok('tokens are read-only copies',mut==='250/150',mut);
  await pg.goto(BASE+'tools/carousel.html'); await pg.waitForTimeout(2500); const c=await read(pg);
  ok('carousel: h.tok is the post format (1080x1350)',c.tok&&c.tok.format==='post'&&c.tok.h===1350,c.tok&&c.tok.format);
  for(const u of ['tools/create.html','lab/board.html']){ await pg.goto(BASE+u); await pg.waitForTimeout(1800);
    const r=await pg.evaluate(()=>typeof Studio==='object'&&typeof Studio.tokens==='function'&&Studio.tokens('story').safe.top); ok(u+': Studio.tokens reachable',r===250,r); }
  ok('no page errors (1stchoice)',!pg.errs.length,pg.errs.slice(0,3).join(' | ')); }

/* 2. test brand */
{ const pg=await page(b,'testbrand'); await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(2500); const d=await read(pg);
  ok('testbrand: shape ok',SHAPE(d.story),d.story);
  ok('testbrand: different values (headline 96/700, safe 200/340/60, radius lg 36, shadow soft 12)',d.story.type.headline.size===96&&d.story.type.headline.wt==='700'&&d.story.safe.top===200&&d.story.safe.bottom===340&&d.story.safe.side===60&&d.story.radius.lg===36&&d.story.shadow.soft.blur===12&&d.story.space.length===5,d.story);
  ok('testbrand: highlight format as the brand sets it (1080x1080)',d.hl.h===1080,d.hl);
  ok('testbrand: a format the brand does not set keeps neutral defaults (post type, safe)',d.post.type.headline.size===120&&d.post.safe.side===72,d.post.type.headline);
  ok('testbrand: h.tok inside draw carries the test brand',d.tok&&d.tok.type.headline.size===96,d.tok&&d.tok.type.headline);
  ok('no page errors (testbrand)',!pg.errs.length,pg.errs.slice(0,3).join(' | ')); }

/* 3. brand without tokens */
{ const pg=await page(b,'testbrand',true); await pg.goto(BASE+'tools/restock.html'); await pg.waitForTimeout(2500); const d=await read(pg);
  ok('no tokens block: raw() is empty',Object.keys(d.raw).length===0,d.raw);
  ok('no tokens block: neutral defaults (story 1080x1920, safe 250/300, headline 120, radius pill 999)',SHAPE(d.story)&&d.story.h===1920&&d.story.safe.top===250&&d.story.safe.bottom===300&&d.story.type.headline.size===120&&d.story.radius.pill===999,d.story);
  ok('no tokens block: h.tok still exists',SHAPE(d.tok),d.tok);
  ok('no page errors (no tokens)',!pg.errs.length,pg.errs.slice(0,3).join(' | ')); }
await b.close();

/* 4. no brand hex colour added to assets/ or tools/ */
{ const ref=process.env.BASE_REF||'claude/mega-integration';
  const git=(...a)=>{ try{ return execFileSync('git',['-C',ROOT,...a],{encoding:'utf8',maxBuffer:1e8,stdio:['ignore','pipe','ignore']}); }catch(e){ return null; } };
  const diff=git('diff','--unified=0',ref,'--','assets','tools');
  if(diff===null) ok('no new brand hex in assets/ tools/ (SKIP: git ref '+ref+' not found)',true);
  else { const kit=fs.readFileSync(ROOT+'brands/1stchoice/brand.js','utf8'), brandHex=new Set((kit.match(/#[0-9a-fA-F]{6}\b/g)||[]).map(s=>s.toUpperCase()).filter(c=>c!=='#FFFFFF'&&c!=='#000000'));
    const hit=[]; let file=''; diff.split('\n').forEach(l=>{ if(l.startsWith('+++ ')) file=l.slice(6); else if(l.startsWith('+')) (l.match(/#[0-9a-fA-F]{6}\b/g)||[]).forEach(c=>{ if(brandHex.has(c.toUpperCase())) hit.push(file+' '+c); }); });
    ok('no new brand hex colour added to assets/ or tools/ vs '+ref,!hit.length,hit.join(', ')); } }

console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log('\n'+(res.length-bad)+'/'+res.length+' passed'); process.exit(bad?1:0);
