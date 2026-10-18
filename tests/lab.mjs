/* Experimental area (lab/) and the Board editor: passcode gate, drawing, text, photos, moving with snapping,
   handles, undo, layers, panel controls, export at 2×, board files, Alt-measure, copy to another size, phone view. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const ROOT=new URL('../',import.meta.url).pathname, OUT=fs.mkdtempSync('/tmp/labtest-');
const b=await chromium.launch(); const errs=[]; let fails=0;
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(i!==undefined&&!c?' '+JSON.stringify(i):'')); };
const pngSize=f=>{ const x=fs.readFileSync(f); return [x.readUInt32BE(16),x.readUInt32BE(20)]; };
const watch=(pg,tag)=>{ pg.on('pageerror',e=>errs.push(tag+' '+e.stack)); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404/.test(m.text())) errs.push(tag+' '+m.text()); }); };

/* 1. the gate */
{ const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'}); await ctx.route(/supabase\.co/,r=>r.abort());
  const pg=await ctx.newPage(); watch(pg,'gate');
  await pg.goto(BASE+'lab/board.html'); await pg.waitForURL(/index\.html#lab/); ok('locked lab page sends you to the hub',true);
  await pg.waitForSelector('#labCode'); ok('passcode box opens',await pg.isVisible('#labCode'));
  await pg.fill('#labCode','0000'); await pg.click('#labGo'); ok('wrong passcode refused',/not right/.test(await pg.textContent('#labSt')));
  await pg.fill('#labCode','6790'); await pg.click('#labGo'); await pg.waitForURL(/lab\/index\.html/); ok('right passcode opens the lab',true);
  await pg.click('#lockB'); await pg.waitForURL(/index\.html$/); ok('lock the lab',await pg.evaluate(()=>localStorage.getItem('studio:lab')===null));
  await ctx.close(); }

/* 2. the editor on a computer */
const ctx=await b.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true});
await ctx.addInitScript(()=>{ localStorage.setItem('studio:lab','"1"'); });
const pg=await ctx.newPage(); watch(pg,'desk');
await pg.goto(BASE+'lab/board.html?preset=story'); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length===1); await pg.waitForTimeout(600);
const st=await pg.locator('#stage').boundingBox();
const W=async(x,y)=>{ const p=await pg.evaluate(([x,y])=>BD.util.toScreen({x,y}),[x,y]); return {x:st.x+p.x,y:st.y+p.y}; };
const drag=async(a,c,steps)=>{ await pg.mouse.move(a.x,a.y); await pg.mouse.down(); await pg.mouse.move(c.x,c.y,{steps:steps||8}); await pg.mouse.up(); };
const kindSel=()=>pg.evaluate(()=>BD.S.sel[0]&&BD.util.kind(BD.S.sel[0]));
await pg.keyboard.press('r'); await drag(await W(100,100),await W(500,400));
ok('draw a rectangle in the frame',await pg.evaluate(()=>{ const n=BD.S.sel[0]; return BD.util.kind(n)==='rect'&&Math.round(n.width())===400&&BD.util.isFrame(n.getParent()); }));
await pg.keyboard.press('t'); let a=await W(540,800); await pg.mouse.click(a.x,a.y); await pg.keyboard.type('Hello يسرسح'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
ok('text tool: click, type, Esc',await pg.evaluate(()=>{ const n=BD.S.sel[0]; return n&&n.text()==='Hello يسرسح'&&n.direction()==='rtl'&&n.visible(); }));
await pg.waitForTimeout(400); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(400);
ok('undo removes it (and nothing is left hidden)',await pg.evaluate(()=>BD.main.find('Text').length===0));
await pg.keyboard.press('Control+Shift+z'); await pg.waitForTimeout(400); ok('redo brings it back',await pg.evaluate(()=>BD.main.find('Text').length===1));
await pg.keyboard.press('o'); a=await W(800,1100); await pg.mouse.click(a.x,a.y); ok('ellipse with one click',(await kindSel())==='ellipse');
let r=await pg.evaluate(()=>BD.util.wrect(BD.S.sel[0])); await drag(await W(r.x+r.width/2,r.y+r.height/2),await W(543,1100));
ok('moving snaps to the frame centre',await pg.evaluate(()=>{ const r=BD.util.wrect(BD.S.sel[0]); return Math.abs(r.x+r.width/2-540)<.5; }));
r=await pg.evaluate(()=>BD.util.wrect(BD.S.sel[0])); a=await W(r.x+r.width/2,r.y+r.height/2);
await pg.keyboard.down('Alt'); await drag(a,{x:a.x+60,y:a.y+60}); await pg.keyboard.up('Alt');
ok('Alt+drag makes one copy',await pg.evaluate(()=>BD.main.find('Ellipse').length===2));
// handles: text corner makes the font bigger; rotate the text, nothing else turns
await pg.evaluate(()=>BD.select([BD.main.find('Text')[0]]));
r=await pg.evaluate(()=>BD.util.wrect(BD.S.sel[0])); const fs0=await pg.evaluate(()=>BD.S.sel[0].fontSize());
await drag(await W(r.x+r.width,r.y+r.height),await W(r.x+r.width*1.4,r.y+r.height*1.4));
ok('corner handle grows the text, no stretching',await pg.evaluate(f=>BD.S.sel[0].fontSize()>f*1.2&&BD.S.sel[0].scaleX()===1,fs0));
const rot=await pg.evaluate(()=>{ const r=BD.tr.findOne('.rotater').getClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
await drag({x:st.x+rot.x,y:st.y+rot.y},{x:st.x+rot.x+150,y:st.y+rot.y+90});
ok('rotate handle turns only the selection',await pg.evaluate(()=>BD.S.sel.length===1&&BD.util.kind(BD.S.sel[0])==='text'&&Math.abs(BD.S.sel[0].rotation())>5&&BD.main.find('Ellipse').every(e=>!e.rotation())));
// photos (JPEG + HEIC), brand asset, shapes, icons, emoji
await pg.setInputFiles('#pickImg',[ROOT+'brands/1stchoice/samples/pair.jpg',ROOT+'tests/fixtures/sample.heic']); await pg.waitForFunction(()=>BD.main.find('Image').length===2,null,{timeout:15000});
ok('photos added (JPEG and HEIC)',true);
await pg.click('#tabAdd'); await pg.click('[data-asset="cans-pair-shadow"]'); await pg.waitForTimeout(600);
await pg.click('[data-shape="heart"]'); await pg.click('[data-icon="coffee"]'); await pg.click('[data-emoji="☕"]'); await pg.click('[data-stroke="squiggle"]');
ok('brand asset, shape, icon, emoji, line added',await pg.evaluate(()=>['asset','path','icon','stroke'].every(k=>BD.main.find('.obj').some(n=>BD.util.kind(n)===k))));
// panel: photo looks + adjust + crop
await pg.evaluate(()=>BD.select([BD.main.find('Image').find(n=>BD.util.kind(n)==='image')]));
await pg.click('[data-look="warm"]'); ok('photo look applied',await pg.evaluate(()=>BD.S.sel[0].isCached()&&BD.S.sel[0].getAttr('fx').temp>0));
await pg.evaluate(()=>{ const n=BD.S.sel[0]; n.width(300); n.height(600); BD.applyCrop(n); });
const c0=await pg.evaluate(()=>BD.S.sel[0].crop().x); await pg.click('[data-act="crop"]');
r=await pg.evaluate(()=>BD.util.wrect(BD.S.sel[0])); a=await W(r.x+r.width/2,r.y+r.height/2); await drag(a,{x:a.x+60,y:a.y}); await pg.click('#cropDone');
ok('crop mode moves the photo inside its box, not the box',await pg.evaluate(c=>{ const n=BD.S.sel[0]; return n.crop().x!==c; },c0));
// text panel
await pg.evaluate(()=>BD.select([BD.main.find('Text')[0]]));
await pg.click('[data-seg="oFillType"][data-v="linear"]'); ok('gradient fill',await pg.evaluate(()=>BD.S.sel[0].fillPriority()==='linear-gradient'));
await pg.check('[data-k="shadowOn"]'); ok('shadow',await pg.evaluate(()=>BD.S.sel[0].shadowEnabled()));
await pg.click('[data-color="tbg"]'); await pg.click('#pop .sw >> nth=1'); ok('text background box',await pg.evaluate(()=>!!BD.S.sel[0].getAttr('tbg')));
await pg.mouse.click(st.x+8,st.y+8); ok('colour pop-up closes on outside click',!(await pg.isVisible('#pop .cp')));
// tools after clicking a checkbox still work
await pg.evaluate(()=>BD.select([BD.main.find('Text')[0]])); await pg.check('[data-k="autoW"]'); await pg.keyboard.press('s'); ok('shortcuts work after using a checkbox',await pg.evaluate(()=>BD.S.tool==='star')); await pg.keyboard.press('Escape');
// pen
await pg.keyboard.press('p'); await drag(await W(200,1500),await W(800,1600),20); await pg.keyboard.press('Escape');
ok('freehand drawing',await pg.evaluate(()=>BD.main.find('Line').some(l=>l.getAttr('kind')==='pen'&&l.points().length>10)));
// view
const p0=await pg.evaluate(()=>BD.stage.x()); await pg.keyboard.down(' '); await drag({x:st.x+300,y:st.y+300},{x:st.x+360,y:st.y+300}); await pg.keyboard.up(' ');
ok('space+drag pans',Math.round(await pg.evaluate(()=>BD.stage.x())-p0)===60);
const k0=await pg.evaluate(()=>BD.stage.scaleX()); await pg.mouse.move(st.x+500,st.y+400); await pg.keyboard.down('Control'); await pg.mouse.wheel(0,-200); await pg.keyboard.up('Control');
ok('Ctrl+scroll zooms',await pg.evaluate(()=>BD.stage.scaleX())>k0); await pg.keyboard.press('Shift+1');
// group / layers / lock
await pg.evaluate(()=>BD.select(BD.main.find('Ellipse'))); await pg.keyboard.press('Control+g'); ok('group',(await kindSel())==='group');
await pg.keyboard.press('Control+Shift+g'); ok('ungroup',await pg.evaluate(()=>BD.S.sel.length===2));
await pg.click('#tabLayers'); await pg.waitForTimeout(200); ok('layers list',await pg.$$eval('.lr',x=>x.length)>10);
await pg.keyboard.press('Control+Shift+L'); ok('lock',await pg.evaluate(()=>BD.main.find('Ellipse').every(n=>n.getAttr('locked'))));
// right-click menu
a=await W(540,300); await pg.mouse.click(a.x,a.y,{button:'right'}); ok('right-click menu',await pg.isVisible('#menu')); await pg.keyboard.press('Escape');
// Alt measure
await pg.evaluate(()=>BD.select([BD.main.find('Rect').find(n=>BD.util.kind(n)==='rect')])); await pg.mouse.move(st.x+6,st.y+6); await pg.keyboard.down('Alt'); await pg.waitForTimeout(100);
ok('hold Alt to measure',await pg.evaluate(()=>BD.ui.find('Label').length>=2)); await pg.keyboard.up('Alt');
// copy to another size
await pg.evaluate(()=>BD.select([BD.util.frames()[0]])); await pg.selectOption('[data-k="copyTo"]','post45'); await pg.waitForTimeout(500);
ok('copy the frame to 4:5 with its content',await pg.evaluate(()=>{ const f=BD.util.frames()[1]; return f&&BD.util.fsize(f).h===1350&&BD.util.items(f).length>=8; }));
// export 2× PNG
await pg.evaluate(()=>BD.select([BD.util.frames()[0]])); await pg.keyboard.press('Control+e'); await pg.waitForSelector('#exGo');
let [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exGo')]); await dl.saveAs(OUT+'/f.png');
ok('export a frame at 2× (2160×3840 PNG)',JSON.stringify(pngSize(OUT+'/f.png'))==='[2160,3840]',pngSize(OUT+'/f.png'));
await pg.evaluate(()=>BD.select([BD.main.find('Rect').find(n=>BD.util.kind(n)==='rect')]));
[dl]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-act="expSel"]')]); await dl.saveAs(OUT+'/s.png'); ok('export the selection as PNG',pngSize(OUT+'/s.png')[0]===800,pngSize(OUT+'/s.png'));
// save, reload, board file
await pg.waitForTimeout(1500); const n1=await pg.evaluate(()=>BD.main.find('.obj').length); await pg.reload(); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.main.find('.obj').length>0); await pg.waitForTimeout(800);
ok('board is kept after reload',await pg.evaluate(n=>BD.main.find('.obj').length===n&&BD.main.find('Image').every(i=>!!i.image()),n1));
await pg.click('#fileMenu'); [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#menu button:has-text("Download board file")')]); await dl.saveAs(OUT+'/b.board');
await pg.setInputFiles('#pickBoard',OUT+'/b.board'); await pg.waitForURL(u=>!u.href.includes(pg.url().split('id=')[1]||'@'),{timeout:10000}).catch(()=>{}); await pg.waitForTimeout(2500);
ok('board file opens as a new board with its photos',await pg.evaluate(()=>BD.main.find('Image').length>=2&&BD.main.find('Image').every(i=>!!i.image())));
await pg.goto(BASE+'lab/index.html'); await pg.waitForTimeout(1200); ok('lab lists the boards',await pg.$$eval('.bcard',x=>x.length)>=2);
await ctx.close();

/* 3. phone */
{ const c2=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await c2.addInitScript(()=>{ localStorage.setItem('studio:lab','"1"'); });
  const p2=await c2.newPage(); watch(p2,'phone');
  await p2.goto(BASE+'lab/board.html?template=product'); await p2.waitForFunction(()=>window.BD&&BD.util&&BD.main.find('Text').length>0); await p2.waitForTimeout(800);
  ok('phone: no sideways scrolling',await p2.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const s2=await p2.locator('#stage').boundingBox(); const t=await p2.evaluate(()=>{ const r=BD.main.find('Text')[0].getClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  await p2.touchscreen.tap(s2.x+t.x,s2.y+t.y); ok('phone: tap selects',await p2.evaluate(()=>BD.S.sel.length===1));
  await p2.tap('#panelR'); ok('phone: design panel opens',await p2.isVisible('#right'));
  await c2.close(); }
ok('no console errors',!errs.length,errs);
await b.close(); fs.rmSync(OUT,{recursive:true,force:true});
console.log(fails?fails+' failed':'all passed'); process.exit(fails?1:0);
