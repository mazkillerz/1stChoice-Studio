/* Round 3 (2.3.0): Back and Done always go ONE step back (Studio.nav, the shared back stack).
   Tool sheets: Layers -> Asset -> Back -> Layers -> Back -> canvas (still the tool); pick an asset -> layer bar -> Done -> Layers -> Done -> canvas;
   Sticker / Text children return to Layers; tab switches add no history; Save sheet closes on Back; history does not grow without bound.
   Hub: Settings, All tools, + menu, design menu, ⋯ pop menu, select mode, calendar sheets, search all close one at a time and Back never leaves Home early.
   Create: a panel/sheet closes on Back. Run like the other suites (BASE=http://127.0.0.1:8081/ node tests/nav.mjs). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns, seedScript } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
process.on('uncaughtException',e=>{ console.log(res.join('\n')); console.log('CRASH after '+res.length+' checks: '+String(e&&e.message||e).split('\n').slice(0,4).join(' | ')); process.exit(1); });
const b=await chromium.launch(), errs=[];
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const now=new Date(), sun=new Date(now.getFullYear(),now.getMonth(),now.getDate()-now.getDay());
const OTHER=iso(new Date(sun.getFullYear(),sun.getMonth(),sun.getDate()+(now.getDay()===0?1:0)));
const db=seedDesigns(); db.calendar=[];
const init=`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false}));
  if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
const SHOTS=process.env.SHOTS||'';
async function mk(scheme='light'){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',colorScheme:scheme});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init}); return ctx; }
const sheets=pg=>pg.evaluate(()=>[...document.querySelectorAll('.sheet.open')].map(e=>e.id.replace('sh-','')));
const dlgs=pg=>pg.evaluate(()=>document.querySelectorAll('dialog[open]').length);
const wait=(pg,ms=450)=>pg.waitForTimeout(ms);
const back=async pg=>{ await pg.goBack({waitUntil:'commit'}).catch(()=>{}); await wait(pg); };
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/* ---- tool sheets (Restock, phone) ---- */
for(const scheme of ['light','dark']){
  const ctx=await mk(scheme), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  const T='tool '+scheme+': ';
  await pg.goto(BASE+'tools/restock.html'); await pg.waitForSelector('#bar'); await wait(pg,900);
  const url0=pg.url(), len0=await pg.evaluate(()=>navigation.currentEntry.index);
  await pg.tap('#bar [data-open="layers"]'); await wait(pg,300);
  ok(T+'Layers opens',eq(await sheets(pg),['layers']));
  await pg.tap('#addAsset'); await wait(pg,300);
  ok(T+'Layers -> Asset: the picker shows',eq(await sheets(pg),['assets']));
  if(scheme==='light'&&SHOTS) await pg.screenshot({path:SHOTS+'/tool-asset-picker.png'});
  await back(pg);
  ok(T+'Back from Asset: Layers is open again, same page',eq(await sheets(pg),['layers'])&&pg.url().split('?')[0]===url0.split('?')[0],[await sheets(pg),pg.url()]);
  await back(pg);
  ok(T+'Back again: no sheet, still on the tool',eq(await sheets(pg),[])&&pg.url().split('?')[0]===url0.split('?')[0]&&await pg.isVisible('#view'),[await sheets(pg),pg.url()]);
  /* pick an asset: layer bar replaces the picker, Done goes back to Layers, Done again to the canvas */
  await pg.tap('#bar [data-open="layers"]'); await wait(pg,300); await pg.tap('#addAsset'); await wait(pg,300);
  await pg.tap('#assetList [data-asset]:not([data-asset^="shape"]) >> nth=0').catch(async()=>{ await pg.tap('#assetList [data-asset] >> nth=0'); }); await wait(pg,700);
  ok(T+'picking an asset opens the layer bar (the picker is replaced)',eq(await sheets(pg),['insp']),await sheets(pg));
  if(scheme==='light'&&SHOTS) await pg.screenshot({path:SHOTS+'/tool-layer-bar.png'});
  await pg.tap('#inspClose'); await wait(pg,350);
  ok(T+'Done on the layer bar: back to Layers',eq(await sheets(pg),['layers']),await sheets(pg));
  await pg.tap('#sh-layers [data-close="layers"]'); await wait(pg,350);
  ok(T+'Done on Layers: no sheet',eq(await sheets(pg),[]),await sheets(pg));
  /* the entries Done dropped are gone: Back leaves nothing open and the tool is still here */
  ok(T+'no history left over after Done',await pg.evaluate(()=>navigation.currentEntry.index)<=len0+1,[len0,await pg.evaluate(()=>navigation.currentEntry.index)]);
  /* pick, then Back: layer bar -> Layers -> canvas */
  await pg.tap('#bar [data-open="layers"]'); await wait(pg,300); await pg.tap('#addAsset'); await wait(pg,300); await pg.tap('#assetList [data-asset] >> nth=0'); await wait(pg,700);
  await back(pg); ok(T+'Back on the layer bar: Layers',eq(await sheets(pg),['layers']),await sheets(pg));
  await back(pg); ok(T+'Back on Layers: canvas, same page',eq(await sheets(pg),[])&&pg.url().split('?')[0]===url0.split('?')[0],[await sheets(pg),pg.url()]);
  /* sticker + text children */
  await pg.tap('#bar [data-open="layers"]'); await wait(pg,300);
  if(await pg.$('#addSticker')){ await pg.tap('#addSticker'); await wait(pg,1800); ok(T+'Layers -> Sticker opens',eq(await sheets(pg),['stickers']),await sheets(pg));
    await pg.tap('#sh-stickers [data-close="stickers"]'); await wait(pg,350); ok(T+'Done on Sticker: Layers',eq(await sheets(pg),['layers']),await sheets(pg)); }
  if(await pg.$('#addComp')){ await pg.tap('#addComp'); await wait(pg,300); ok(T+'Layers -> Element opens',eq(await sheets(pg),['comps']),await sheets(pg)); await back(pg); ok(T+'Back on Element: Layers',eq(await sheets(pg),['layers']),await sheets(pg)); }
  const addText=await pg.$('#addText'); if(addText){ await pg.tap('#addText'); await wait(pg,700); ok(T+'Layers -> Text opens the layer bar',eq(await sheets(pg),['insp']),await sheets(pg));
    await pg.tap('#inspClose'); await wait(pg,350); ok(T+'Done on the text layer bar: Layers',eq(await sheets(pg),['layers']),await sheets(pg)); }
  await pg.tap('#sh-layers [data-close="layers"]'); await wait(pg,350);
  /* tab switch adds no entry */
  const hl=await pg.evaluate(()=>navigation.currentEntry.index);
  await pg.tap('#bar [data-open="photo"]'); await wait(pg,300);
  const words=await pg.$('#bar [data-open="words"]'); if(words){ await pg.tap('#bar [data-open="words"]'); await wait(pg,300); }
  ok(T+'switching Photo -> Words adds one entry only (position +1 at most)',await pg.evaluate(()=>navigation.currentEntry.index)<=hl+1,[hl,await pg.evaluate(()=>navigation.currentEntry.index)]);
  await back(pg); ok(T+'Back after a tab switch: no sheet',eq(await sheets(pg),[])&&pg.url().split('?')[0]===url0.split('?')[0],[await sheets(pg),pg.url()]);
  /* Save sheet */
  await pg.tap('#barSave'); await wait(pg,400);
  const saveOpen=(await sheets(pg)).includes('save');
  ok(T+'the Save sheet opens',saveOpen,await sheets(pg));
  if(scheme==='light'&&SHOTS) await pg.screenshot({path:SHOTS+'/tool-save-sheet.png'});
  await back(pg); ok(T+'Back closes the Save sheet, still on the tool',eq(await sheets(pg),[])&&pg.url().split('?')[0]===url0.split('?')[0],[await sheets(pg),pg.url()]);
  /* history never grows: 5x open + Done */
  const h0=await pg.evaluate(()=>navigation.currentEntry.index);
  for(let i=0;i<5;i++){ await pg.tap('#bar [data-open="photo"]'); await wait(pg,200); await pg.tap('#sh-photo [data-close="photo"]'); await wait(pg,350); }
  ok(T+'5x open + Done: the history position moves by at most 1',await pg.evaluate(()=>navigation.currentEntry.index)<=h0+1,[h0,await pg.evaluate(()=>navigation.currentEntry.index)]);
  /* Back with nothing open leaves the tool as before (to the previous page) */
  await ctx.close();
}

/* ---- hub ---- */
{ const ctx=await mk('light'), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await wait(pg,600);
  const url0=pg.url();
  await pg.tap('#setBtn'); await wait(pg,400); ok('hub: Settings opens',await dlgs(pg)===1);
  if(SHOTS) await pg.screenshot({path:SHOTS+'/hub-settings.png'});
  await back(pg); ok('hub: Back closes Settings, still Home',await dlgs(pg)===0&&pg.url().split('?')[0]===url0.split('?')[0],[await dlgs(pg),pg.url()]);
  await pg.tap('#allTools'); await wait(pg,400); ok('hub: All tools opens',await dlgs(pg)===1);
  await back(pg); ok('hub: Back closes All tools, still Home',await dlgs(pg)===0&&pg.url().split('?')[0]===url0.split('?')[0],pg.url());
  /* dialog closed by its own button leaves no entry behind */
  const h0=await pg.evaluate(()=>navigation.currentEntry.index);
  for(let i=0;i<3;i++){ await pg.tap('#setBtn'); await wait(pg,300); await pg.keyboard.press('Escape'); await wait(pg,350); }
  ok('hub: open + Escape x3 moves the history position by at most 1',await pg.evaluate(()=>navigation.currentEntry.index)<=h0+1,[h0,await pg.evaluate(()=>navigation.currentEntry.index)]);
  /* Saved: open, design menu, Back, Back */
  await pg.tap('[data-see-all]'); await wait(pg,600); const savedUrl=pg.url();
  ok('hub: Saved is open',savedUrl.endsWith('#saved'),savedUrl);
  await pg.tap('#savedGrid .sv-more >> nth=0'); await wait(pg,500); ok('hub: the design menu opens',await dlgs(pg)===1);
  await back(pg); ok('hub: Back closes the design menu, still on Saved',await dlgs(pg)===0&&pg.url()===savedUrl,[await dlgs(pg),pg.url()]);
  await pg.tap('#selBtn'); await wait(pg,300); ok('hub: Select mode on',await pg.evaluate(()=>document.body.classList.contains('selecting')));
  await pg.tap('#savedGrid .sv-more >> nth=0').catch(()=>{}); await wait(pg,400);
  const inSel=await dlgs(pg);
  if(inSel){ await back(pg); ok('hub: select + menu: Back closes the menu, select stays',await dlgs(pg)===0&&await pg.evaluate(()=>document.body.classList.contains('selecting')),await dlgs(pg)); }
  await back(pg); ok('hub: Back ends select, still on Saved',!await pg.evaluate(()=>document.body.classList.contains('selecting'))&&pg.url()===savedUrl,pg.url());
  await back(pg); ok('hub: Back from Saved goes Home',!pg.url().includes('#saved')&&await pg.isVisible('#homeView'),pg.url());
  /* the Saved header's back arrow: first ends select, second goes Home */
  await pg.tap('[data-see-all]'); await wait(pg,500); await pg.tap('#selBtn'); await wait(pg,300); await pg.tap('#savedBack'); await wait(pg,500);
  ok('hub: the back arrow ends select first (still Saved)',pg.url().endsWith('#saved')&&!await pg.evaluate(()=>document.body.classList.contains('selecting')),pg.url());
  await pg.tap('#savedBack'); await wait(pg,600);
  ok('hub: the back arrow again goes Home',await pg.isVisible('#homeView')&&!pg.url().includes('#saved'),pg.url());
  await ctx.close(); }

/* ---- calendar: Plan a post -> Pick a design -> Back -> Back ---- */
{ const ctx=await mk('light'), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'index.html#calendar'); await pg.waitForSelector('[data-add]',{timeout:8000}); await wait(pg,600); const u0=pg.url();
  await pg.tap(`[data-add="${OTHER}"]`); await pg.waitForSelector('dialog.cal-dlg[open] #calCap'); await wait(pg,300);
  await pg.tap('#calPick'); await pg.waitForSelector('dialog.cal-full .cal-pcard'); await wait(pg,300);
  ok('calendar: plan sheet + picker both open',await dlgs(pg)===2,await dlgs(pg));
  if(SHOTS) await pg.screenshot({path:SHOTS+'/cal-picker.png'});
  await back(pg); ok('calendar: Back closes the picker only; the plan sheet stays',await dlgs(pg)===1&&await pg.isVisible('#calCap'),await dlgs(pg));
  await back(pg); ok('calendar: Back again closes the plan sheet; the calendar stays',await dlgs(pg)===0&&pg.url()===u0&&await pg.evaluate(()=>!document.getElementById('calendarView').hidden),[await dlgs(pg),pg.url()]);
  await ctx.close(); }

/* ---- search over Saved ---- */
{ const ctx=await mk('light'), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'index.html'); await pg.waitForSelector('#savedRowList .sv-card',{timeout:8000}); await wait(pg,600); const u0=pg.url();
  const si=await pg.$('#us-input, .us-input, #hubSearch input, input[type=search]');
  if(si){ await si.tap(); await wait(pg,500); const open=await pg.evaluate(()=>document.body.classList.contains('us-open')); ok('search: opens',open);
    await back(pg); ok('search: Back closes it, still Home',!await pg.evaluate(()=>document.body.classList.contains('us-open'))&&pg.url()===u0,pg.url()); }
  await ctx.close(); }

/* ---- Create ---- */
{ const ctx=await mk('light'), pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'tools/create.html?quick=1'); await pg.waitForSelector('#crBar'); await wait(pg,1500); const u0=pg.url().split('?')[0];
  const crOpen=()=>pg.evaluate(()=>!document.getElementById('crSheet').hidden?document.getElementById('crSheet').dataset.name:'');
  await pg.evaluate(()=>{ const s=document.getElementById('crSheet'); if(!s.hidden) document.getElementById('crSheetX').click(); }); await wait(pg,400);
  const base=await pg.evaluate(()=>navigation.currentEntry.index);
  await pg.tap('#crBar [data-cr="add"]'); await wait(pg,500); ok('create: Add opens its sheet',await crOpen()==='add',await crOpen());
  if(SHOTS) await pg.screenshot({path:SHOTS+'/create-sheet.png'});
  await back(pg); ok('create: Back closes the Add sheet, still in Create',await crOpen()===''&&pg.url().split('?')[0]===u0,[await crOpen(),pg.url()]);
  await pg.tap('#crMenu'); await wait(pg,300); const menuOn=await pg.evaluate(()=>!document.getElementById('crMenuBox').hidden); ok('create: the menu opens',menuOn);
  await back(pg); ok('create: Back closes the menu first',!await pg.evaluate(()=>!document.getElementById('crMenuBox').hidden)&&pg.url().split('?')[0]===u0);
  await pg.tap('#crBar [data-cr="add"]'); await wait(pg,400); await pg.tap('#crSheetX'); await wait(pg,400);
  ok('create: the sheet close button leaves no step behind',await crOpen()===''&&await pg.evaluate(()=>navigation.currentEntry.index)<=base+1);
  await ctx.close(); }

console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length;
console.log((res.length-bad)+' passed, '+bad+' failed'+(errs.length?'; page errors: '+errs.slice(0,3).join(' | '):'')); await b.close(); process.exit(bad||errs.length?1:0);
