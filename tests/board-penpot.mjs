/* Board: ideas from Penpot. Combine shapes (union, subtract, intersect, exclude) and components
   (main + copies that follow it, words in a copy kept, detach, save and reopen). */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch(); let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
async function page(path,vp,touch){ const ctx=await b.newContext({viewport:vp||{width:1440,height:900},serviceWorkers:'block',hasTouch:!!touch,isMobile:!!touch}); await ctx.addInitScript(()=>{ localStorage.setItem('studio:lab','"1"'); });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g/.test(m.text())) errs.push(m.text()); });
  await pg.goto(BASE+path); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0); await pg.waitForTimeout(600); return {pg,ctx}; }
/* colour of the exported frame at a point (frame units) */
const PX=`async (pts)=>{ const f=BD.util.frames()[0]; const r=await BD.exportFrame(f,{canvas:true,scale:1}); const c=r.canvas.getContext('2d'); return pts.map(([x,y])=>[...c.getImageData(x,y,1,1).data].slice(0,3).join(',')); }`;
const addShapes=`()=>{ const f=BD.util.frames()[0]; const a=new Konva.Rect({id:'ra',name:'obj',kind:'rect',x:100,y:100,width:400,height:400,fill:'#ff0000'}); const c=new Konva.Ellipse({id:'eb',name:'obj',kind:'ellipse',x:500,y:500,radiusX:200,radiusY:200,fill:'#0000ff'}); f.add(a); f.add(c); BD.select([a,c]); BD.changed(); BD.emitDoc(); }`;

{ const {pg,ctx}=await page('lab/board.html?preset=square');
  await pg.evaluate(new Function('return ('+addShapes+')()'));
  await pg.waitForTimeout(200);
  ok('panel offers Combine shapes for two shapes',await pg.locator('[data-act="bool:subtract"]').count()===1);
  await pg.click('[data-act="bool:subtract"]'); await pg.waitForTimeout(200);
  const k=await pg.evaluate(()=>({k:BD.util.kind(BD.S.sel[0]),op:BD.S.sel[0].getAttr('boolOp'),n:BD.S.sel[0].getChildren().length}));
  ok('subtract makes one combined shape with both shapes inside',k.k==='bool'&&k.op==='subtract'&&k.n===2,k);
  const px=new Function('return ('+PX+')(arguments[0])');
  const pts=[[200,200],[450,450],[600,600]];
  const exp={subtract:['255,0,0','255,255,255','255,255,255'],intersect:['255,255,255','255,0,0','255,255,255'],union:['255,0,0','255,0,0','255,0,0'],exclude:['255,0,0','255,255,255','255,0,0']};
  ok('subtract cuts the top shape out (export)',JSON.stringify(await pg.evaluate(px,pts))===JSON.stringify(exp.subtract),await pg.evaluate(px,pts));
  for(const op of ['intersect','union','exclude']){ await pg.click(`[data-seg="boolOp"][data-v="${op}"]`); await pg.waitForTimeout(150);
    const got=await pg.evaluate(px,pts); ok(op+' looks right (export)',JSON.stringify(got)===JSON.stringify(exp[op]),got); }
  await pg.waitForTimeout(400);
  // colour from the panel goes to the bottom shape
  await pg.evaluate(()=>{ const g=BD.S.sel[0]; BD.bool.base(g).fill('#00ff00'); BD.main.batchDraw(); BD.changed(); });
  ok('bottom shape colour paints the whole result',(await pg.evaluate(px,[[600,600]]))[0]==='0,255,0');
  // undo keeps it combined and drawn right
  await pg.waitForTimeout(400); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(400);
  const u=await pg.evaluate(px,pts); ok('undo restores the combined shape',u[2]==='255,0,0'&&u[1]==='255,255,255',u);
  // SVG export uses masks for exclude
  const svg=await pg.evaluate(async()=>BD.io?await BD.io.svg(BD.util.frames()[0]):null);
  ok('SVG export draws combined shapes with masks',!!svg&&/<mask /.test(svg),svg&&svg.slice(0,200));
  // double-click goes inside, release gives the shapes back
  await pg.evaluate(()=>{ BD.select([BD.util.frames()[0].findOne(n=>BD.util.kind(n)==='bool')]); });
  await pg.waitForTimeout(100); await pg.click('[data-act="boolRelease"]'); await pg.waitForTimeout(200);
  const rel=await pg.evaluate(()=>({sel:BD.S.sel.map(n=>BD.util.kind(n)),bool:BD.util.frames()[0].find(n=>BD.util.kind(n)==='bool').length}));
  ok('release gives back the two shapes',rel.bool===0&&rel.sel.length===2,rel);
  const r2=await pg.evaluate(px,[[450,450]]); ok('released shapes draw normally again',r2[0]==='0,0,255',r2);
  // right-click menu has Combine shapes and Make component
  const st=await pg.locator('#stage').boundingBox(); const sp=await pg.evaluate(()=>BD.util.toScreen({x:BD.util.frames()[0].x()+200,y:BD.util.frames()[0].y()+200}));
  await pg.mouse.click(st.x+sp.x,st.y+sp.y,{button:'right'}); await pg.waitForTimeout(150);
  const menu=await pg.locator('#menu').innerText(); ok('right-click menu lists Combine shapes and Make component',/Combine shapes/.test(menu)&&/Make component/.test(menu),menu);
  await pg.keyboard.press('Escape');
  await ctx.close(); }

{ const {pg,ctx}=await page('lab/board.html?preset=square');
  // a small badge: box + approved wording
  const word=await pg.evaluate(()=>{ const ph=(BD.B&&BD.B.phrases)||{}; return (ph.headlines||[])[0]||'Text'; });
  await pg.evaluate((w)=>{ const f=BD.util.frames()[0]; const r=new Konva.Rect({id:'cr',name:'obj',kind:'rect',x:100,y:100,width:300,height:120,fill:'#ff0000'}); const t=BD.make.text(w,{x:120,y:130,fontSize:40}); f.add(r); f.add(t); BD.select([r,t]); BD.changed(); BD.emitDoc(); },word);
  await pg.waitForTimeout(200);
  await pg.click('[data-act="compMake"]'); await pg.waitForTimeout(200);
  const m=await pg.evaluate(()=>({main:BD.comps.isMain(BD.S.sel[0]),kids:BD.S.sel[0].getChildren().length}));
  ok('Make component turns the selection into a main component',m.main&&m.kids===2,m);
  await pg.click('[data-act="compCopy"]'); await pg.waitForTimeout(200);
  await pg.evaluate(()=>{ const f=BD.util.frames()[0]; BD.comps.addCopy(BD.comps.mains()[0],f); });
  const c=await pg.evaluate(()=>({copies:BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp')).length,sel:BD.comps.isCopy(BD.S.sel[0])}));
  ok('Add a copy places copies',c.copies===2&&c.sel,c);
  // change the main: copies follow
  await pg.evaluate(()=>{ const m=BD.comps.mains()[0]; m.findOne('Rect').fill('#00aa00'); BD.changed(); });
  await pg.waitForTimeout(500);
  const f1=await pg.evaluate(()=>BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp')).map(x=>x.findOne('Rect').fill()));
  ok('copies follow a colour change on the main',f1.every(v=>v==='#00aa00'),f1);
  // type into one copy: kept when the main changes
  const word2=await pg.evaluate(()=>{ const ph=(BD.B&&BD.B.phrases)||{}; return (ph.headlines||[])[1]||'Word'; });
  await pg.evaluate((w)=>{ const cp=BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp'))[0]; const t=cp.findOne('Text'); BD.select([t]); BD.startEdit(t); document.querySelector('textarea').value=w; BD.commitEdit(); },word2);
  await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const m=BD.comps.mains()[0]; m.findOne('Rect').fill('#0000aa'); m.findOne('Text').fontSize(52); BD.changed(); });
  await pg.waitForTimeout(500);
  const o=await pg.evaluate(()=>BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp')).map(x=>({fill:x.findOne('Rect').fill(),text:x.findOne('Text').text(),fs:x.findOne('Text').fontSize()})));
  ok('a copy keeps its own words but takes the new colour and size',o[0].text===word2&&o[0].fill==='#0000aa'&&o[0].fs===52&&o[1].text===word&&o[1].fill==='#0000aa',o);
  // moving something inside a copy snaps back
  await pg.evaluate(()=>{ const cp=BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp'))[1]; cp.findOne('Rect').x(999); BD.changed(); });
  await pg.waitForTimeout(500);
  ok('changes inside a copy follow the main again',await pg.evaluate(()=>BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp'))[1].findOne('Rect').x()===100));
  // duplicating the main makes a copy, not a second main
  await pg.evaluate(()=>{ BD.select([BD.comps.mains()[0]]); BD.act.duplicate(); }); await pg.waitForTimeout(500);
  ok('duplicate of a main is a copy',await pg.evaluate(()=>BD.comps.mains().length===1&&BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp')).length===3));
  // detach
  await pg.evaluate(()=>{ BD.select([BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp'))[2]]); }); await pg.waitForTimeout(100);
  await pg.click('[data-act="compDetach"]'); await pg.waitForTimeout(500);
  ok('detach leaves a plain group',await pg.evaluate(()=>BD.util.kind(BD.S.sel[0])==='group'&&!BD.S.sel[0].getAttr('comp')&&BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp')).length===2));
  // layers list marks components
  ok('layers list marks components',await pg.locator('#layers .lr-n.lr-comp').count()>=1||await pg.evaluate(()=>!document.querySelector('#layers')));
  // save and reopen
  await pg.evaluate(()=>BD.saveNow()); const id=await pg.evaluate(()=>BD.S.id);
  await pg.goto(BASE+'lab/board.html?id='+id); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0); await pg.waitForTimeout(800);
  const re=await pg.evaluate(()=>{ const m=BD.comps.mains()[0]; return m?{n:BD.comps.copiesOf(m.getAttr('comp')).length,t:BD.comps.copiesOf(m.getAttr('comp')).map(x=>x.findOne('Text').text())}:null; });
  ok('components survive save and reopen (with the copy\'s words)',re&&re.n===2&&re.t.includes(word2),re);
  await pg.evaluate(()=>{ const m=BD.comps.mains()[0]; m.findOne('Rect').fill('#123456'); BD.changed(); }); await pg.waitForTimeout(500);
  ok('copies still follow after reopening',await pg.evaluate(()=>BD.comps.copiesOf(BD.comps.mains()[0].getAttr('comp')).every(x=>x.findOne('Rect').fill()==='#123456')));
  await ctx.close(); }

{ const {pg,ctx}=await page('lab/board.html?preset=story',{width:390,height:844},true);
  await pg.evaluate(new Function('return ('+addShapes+')()')); await pg.waitForTimeout(300);
  const open=await pg.evaluate(()=>{ const b=document.querySelector('[data-act="bool:union"]'); return !!b; });
  if(!open){ const t=await pg.$('[data-panel="design"],[data-act="design"],#qbar [data-q="props"]'); if(t) await t.click(); await pg.waitForTimeout(300); }
  const sz=await pg.evaluate(()=>[...document.querySelectorAll('[data-act^="bool:"]')].filter(b=>b.offsetParent).map(b=>{ const r=b.getBoundingClientRect(); return Math.round(Math.min(r.width,r.height)); }));
  ok('phone: Combine buttons are finger-sized (when the panel is open)',sz.every(v=>v>=44),sz);
  await pg.evaluate(()=>{ BD.select(BD.util.frames()[0].find(n=>['rect','ellipse'].includes(BD.util.kind(n)))); }); await pg.waitForTimeout(300);
  const qb=pg.locator('[data-q="combine"]'); ok('phone: quick bar has Combine',await qb.count()===1);
  if(await qb.count()){ await qb.tap(); await pg.waitForTimeout(250); await pg.locator('#menu button:has-text("Union")').tap(); await pg.waitForTimeout(250); }
  ok('phone: two taps combine the shapes',await pg.evaluate(()=>BD.util.kind(BD.S.sel[0])==='bool'&&BD.S.sel[0].getAttr('boolOp')==='union'));
  ok('phone: no sideways scrolling',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await ctx.close(); }

ok('no console errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(fails?fails+' failed':'all passed'); process.exit(fails?1:0);
