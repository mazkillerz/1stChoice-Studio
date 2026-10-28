import { chromium } from 'playwright';
import fs from 'fs'; import os from 'os';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const TOOLS=['new-place','photo-story','cinematic','collage','split','restock','offer','carousel'];
const SAMPLES=new URL('../brands/1stchoice/samples/',import.meta.url).pathname;
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const pngSize=f=>{ const b=fs.readFileSync(f); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20); };
/* the PNGs inside a stored ZIP (what Save all makes on a computer since 1.9.0) */
const unzipPngs=buf=>{ const out=[]; let p=0; while(buf.readUInt32LE(p)===0x04034b50){ const size=buf.readUInt32LE(p+18), nl=buf.readUInt16LE(p+26), xl=buf.readUInt16LE(p+28), d=buf.slice(p+30+nl+xl,p+30+nl+xl+size);
  out.push({name:buf.slice(p+30,p+30+nl).toString('utf8'),wh:d.readUInt32BE(16)+'x'+d.readUInt32BE(20)}); p+=30+nl+xl+size; } return out; };
const rows=[]; const b=await chromium.launch();
for(const [tag,vp,mob] of [['phone',{width:390,height:844},true],['desktop',{width:1280,height:800},false]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:mob?2:1,isMobile:mob,hasTouch:mob,acceptDownloads:true,serviceWorkers:'block'});
  await ctx.route(/supabase\.co/,r=>r.abort());
  await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  for(const t of TOOLS){
    const R={tool:t,view:tag,errors:[],checks:[]}; const ok=(name,cond,info)=>R.checks.push((cond?'PASS ':'FAIL ')+name+(info?' ('+info+')':''));
    const pg=await ctx.newPage();
    pg.on('pageerror',e=>R.errors.push(String(e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404/.test(m.text())) R.errors.push(m.text()); });
    pg.on('response',r=>{ if(r.status()>=400&&!/\/brands\/[^/]+\/assets\//.test(r.url())) R.errors.push(r.status()+' '+r.url()); });
    await pg.goto(''+BASE+'tools/'+t+'.html'); await pg.waitForTimeout(1500);
    const pages=await pg.evaluate(()=>Studio.debug.S.P.length), per=t==='carousel'?1:await pg.evaluate(()=>Studio.debug.S.count);
    const tap=async sel=>mob?pg.tap(sel):pg.click(sel);
    // sheets + bottom bar by touch
    if(mob){
      const tabs=await pg.$$eval('#bar [data-open]',bs=>bs.map(b=>b.dataset.open)); let good=true;
      for(const n of tabs){ await pg.tap(`#bar [data-open="${n}"]`); await pg.waitForTimeout(350);
        const st=await pg.evaluate(n=>({open:document.getElementById('sh-'+n).classList.contains('open'),exp:document.querySelector(`#bar [data-open="${n}"]`).getAttribute('aria-expanded'),vis:getComputedStyle(document.getElementById('sh-'+n)).visibility}),n);
        if(!(st.open&&st.exp==='true'&&st.vis==='visible')) good=false; }
      ok('bar tabs open their sheets',good,tabs.join('/'));
      await pg.tap(`#sh-${tabs[tabs.length-1]} .done`); await pg.waitForTimeout(350);
      ok('Done closes the sheet',await pg.evaluate(()=>!document.querySelector('.sheet.open')));
      // swipe down on the sheet header
      await pg.tap('#bar [data-open="photo"]'); await pg.waitForTimeout(350);
      const hb=await pg.locator('#sh-photo .sheet-head').boundingBox();
      await pg.mouse.move(hb.x+40,hb.y+20); await pg.mouse.down(); await pg.mouse.move(hb.x+40,hb.y+80,{steps:4}); await pg.mouse.move(hb.x+40,hb.y+160,{steps:4}); await pg.mouse.up(); await pg.waitForTimeout(400);
      ok('swipe down closes the sheet',await pg.evaluate(()=>!document.getElementById('sh-photo').classList.contains('open')));
      const ph=await pg.locator('#phone').boundingBox(); ok('preview is large',ph.height>500||ph.width>340,Math.round(ph.width)+'x'+Math.round(ph.height));
    }
    // tap a layer -> inspector
    const lb=await pg.evaluate(()=>{const R=Studio.debug.reg(); const b=R.find(x=>x.id&&!x.empty&&!x.hidden&&x.kind!=='logo')||R.find(x=>x.id&&!x.empty&&!x.hidden); return b&&{x:b.x+b.w/2,y:b.y+b.h/2,id:b.id};});
    const vr=await pg.locator('#view').boundingBox(), k=vr.width/(await pg.evaluate(()=>document.getElementById('view').width));
    if(mob) await pg.touchscreen.tap(vr.x+lb.x*k,vr.y+lb.y*k); else await pg.mouse.click(vr.x+lb.x*k,vr.y+lb.y*k);
    await pg.waitForTimeout(350);
    ok('tap a layer opens the editor',await pg.evaluate(()=>{const e=document.getElementById('sh-insp'); return e.classList.contains('open')||e.classList.contains('active');}),lb.id);
    // drag that layer a little (move it)
    await pg.mouse.move(vr.x+lb.x*k,vr.y+lb.y*k); await pg.mouse.down(); await pg.mouse.move(vr.x+lb.x*k+30,vr.y+lb.y*k+25,{steps:5}); await pg.mouse.up(); await pg.waitForTimeout(200);
    if(mob){ await pg.tap('#inspClose'); await pg.waitForTimeout(300); } else await pg.click('#inspClose');
    // add an asset (shape) through Layers
    if(mob){ await pg.tap('#bar [data-open="layers"]'); await pg.waitForTimeout(300); }
    await tap('#addAsset'); await pg.waitForTimeout(350); await tap('[data-asset="shape:sparkle"]'); await pg.waitForTimeout(300);
    if(mob){ await pg.tap('#inspClose'); await pg.waitForTimeout(300); } else await pg.click('#inspClose');
    // photos on every page
    for(let p=0;p<pages;p++){ if(pages>1){ await tap(`[data-pg="${p}"]`); await pg.waitForTimeout(200); }
      await pg.setInputFiles('#pick',Array.from({length:per},(_,i)=>SAMPLES+['pair','closeup','hand','window','tall'][(p+i)%5]+'.jpg')); await pg.waitForTimeout(700); }
    // save PNG(s) and the design to the team (fake cloud) in one go
    const dls=[]; pg.on('download',d=>dls.push(d));
    if(mob){   // phone: the bar's Save opens the small Save sheet (no picture yet); Save in the sheet saves
      await pg.tap('#barSave'); await pg.waitForTimeout(600);
      ok('bar Save opens the Save sheet without saving',await pg.evaluate(()=>document.getElementById('sh-save').classList.contains('open'))&&!(await pg.isVisible('#doneBox'))&&!dls.length);
    }
    await pg.waitForFunction(()=>document.getElementById('teamOn').checked,null,{timeout:8000}).catch(()=>{});
    ok('team switch is on (signed in) and the button offers Save & add to team',await pg.isChecked('#teamOn')&&/Save & add to team/.test(await pg.textContent('#saveTxt')),await pg.textContent('#saveTxt'));
    const before=await pg.evaluate(()=>{ const r=Studio.debug.recipe(); delete r.page; return JSON.stringify(r); });
    await pg.fill('#teamName','Test '+t); await tap('#save');   // one tap: the 2× PNG(s), then the team
    const zipped=pages>1&&!mob;   // 1.9.0: a computer gets every page in one ZIP
    for(let i=0;i<60&&dls.length<(zipped?1:pages);i++) await pg.waitForTimeout(300);
    const sizes=[], names=[]; for(const d of dls){ const f=os.tmpdir()+'/'+tag+'-'+d.suggestedFilename(); await d.saveAs(f);
      if(/\.zip$/.test(f)) unzipPngs(fs.readFileSync(f)).forEach(e=>{ names.push(e.name); sizes.push(e.wh); }); else { names.push(d.suggestedFilename()); sizes.push(pngSize(f)); } }
    const want=t==='carousel'?'2160x2700':'2160x3840';
    ok('save makes full-size PNG'+(pages>1?'s':'')+(zipped?' (one ZIP)':''),(zipped?dls.length===1:dls.length===pages)&&sizes.length===pages&&sizes.every(s=>s===want),sizes.join(', ')+(pages>1?' · '+names.map(n=>n.replace(/^.*-(\d+)\.png$/,'#$1')).join(' '):''));
    await pg.waitForSelector('#doneBox',{state:'visible',timeout:5000}).catch(()=>{});
    ok('success message',await pg.isVisible('#doneBox'),await pg.textContent('#doneTitle'));
    await pg.waitForFunction(()=>/design=/.test(location.search),null,{timeout:15000}).catch(()=>{});
    const id=await pg.evaluate(()=>new URLSearchParams(location.search).get('design'));
    ok('the same tap saved it to the team',!!id&&/Saved to the team/.test(await pg.textContent('#teamStatus')||''),await pg.textContent('#teamStatus'));
    ok('afterwards the switch is off and the button says Save again',!(await pg.isChecked('#teamOn'))&&/Save again/.test(await pg.textContent('#saveTxt')),await pg.textContent('#saveTxt'));
    const p2=await ctx.newPage(); p2.on('pageerror',e=>R.errors.push('reopen: '+e));
    await p2.goto(''+BASE+'tools/'+t+'.html?design='+id); await p2.waitForTimeout(2500);
    const after=await p2.evaluate(()=>{ const r=Studio.debug.recipe(); delete r.page; return JSON.stringify(r); });
    const photosBack=await p2.evaluate(()=>Studio.debug.recipe().photos.filter(p=>p.has).length);
    ok('saved design reopens the same',!!id&&before===after,id?(before===after?'identical recipe':'recipe differs'):'no id');
    const wantPh=JSON.parse(before).photos.filter(p=>p&&p.has).length;
    ok('saved photos come back',photosBack===wantPh,photosBack+' of '+wantPh+' photos');
    if(mob&&t==='new-place'){ await p2.goto(BASE+'index.html#saved'); await p2.waitForSelector('#savedGrid .sv-open',{timeout:8000}).catch(()=>{});
      await p2.tap('#savedGrid .sv-open'); await p2.waitForURL(/new-place\.html\?design=/,{timeout:8000}).catch(()=>{});
      ok('a saved design opens in its tool on tap',/new-place\.html\?design=/.test(p2.url())&&!(await p2.locator('dialog[open]').count()),p2.url()); }
    await p2.close(); await pg.close();
    R.errors=[...new Set(R.errors)];
    ok('no console errors',!R.errors.length,R.errors.slice(0,3).join(' | '));
    rows.push(R); console.log(tag,t,R.checks.filter(c=>c.startsWith('FAIL')).length?R.checks.filter(c=>c.startsWith('FAIL')).join('; '):'all pass');
  }
  await ctx.close();
}
fs.writeFileSync(os.tmpdir()+'/studio-results.json',JSON.stringify(rows,null,1)); await b.close();
