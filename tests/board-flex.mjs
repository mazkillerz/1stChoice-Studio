/* Board: flex layout (preview, lab/board-flex.js). Off by default and switchable (panel, localStorage, ?flex=); column/row stacks of
   a frame or group (gap, padding, align, fit contents, right to left), live re-flow while typing, stack-from-selection,
   box colour, drag to reorder, undo/redo, save + reopen, components, locked items, export size, old boards unchanged, phone. */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch(); let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const near=(a,v,t=.6)=>Math.abs(a-v)<=t;
const HELP=()=>{ window.T={ f:()=>BD.util.frames()[0],
  txt:(s,x,y,fs)=>{ const f=BD.util.frames()[0]; const t=BD.make.text(s,{fontSize:fs||60,x,y}); f.add(t); return t; },
  rects:c=>BD.flex.kids(c||BD.util.frames()[0]).map(n=>{ const r=n.getClientRect({relativeTo:c||BD.util.frames()[0],skipShadow:true}); return {x:r.x,y:r.y,w:r.width,h:r.height}; }) }; };
async function ready(pg){ await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0); await pg.evaluate(HELP); await pg.waitForTimeout(600); }
async function page(path,vp,touch){ const ctx=await b.newContext({viewport:vp||{width:1440,height:900},serviceWorkers:'block',hasTouch:!!touch,isMobile:!!touch}); await ctx.addInitScript(()=>{ localStorage.setItem('studio:lab','"1"'); });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto(BASE+path); await ready(pg); return {pg,ctx}; }
async function reload(pg,path){ await pg.goto(BASE+path); await ready(pg); }
const R=(pg,sel)=>pg.evaluate(sel||(()=>T.rects()));
const gapsOf=(rs,gap)=>rs.every((r,i)=>i===0||near(r.y,rs[i-1].y+rs[i-1].h+gap));
const setNum=async(pg,k,v)=>{ const i=pg.locator(`#props input[data-k="${k}"]`); await i.fill(String(v)); await i.dispatchEvent('change'); await pg.waitForTimeout(450); };
const seg=async(pg,k,v)=>{ await pg.click(`#props [data-seg="${k}"][data-v="${v}"]`); await pg.waitForTimeout(450); };
const SEL=()=>{ BD.select([T.f()]); };
const setupCol=()=>{ T.txt('A',700,600); T.txt('B',200,100); T.txt('C',450,300); BD.changed(); };

/* 1+2: off by default, switch on/off */
{ const {pg,ctx}=await page('lab/board.html?preset=square');
  await pg.evaluate(setupCol); await pg.evaluate(SEL); await pg.waitForTimeout(300);
  ok('off by default: no Layout section for a frame',await pg.locator('#props [data-sec="flex"]').count()===0);
  await pg.keyboard.press('Shift+A'); await pg.waitForTimeout(200);
  ok('off by default: Shift+A does nothing',await pg.evaluate(()=>T.f().getAttr('flex')===undefined));
  const st=await pg.locator('#stage').boundingBox(); const sp=await pg.evaluate(()=>{ const f=T.f(); return BD.util.toScreen({x:f.x()+900,y:f.y()+900}); });
  await pg.mouse.click(st.x+sp.x,st.y+sp.y,{button:'right'}); await pg.waitForTimeout(200);
  const menu=await pg.locator('#menu').innerText().catch(()=>''); ok('off by default: right-click menu has no flex items',!/flex/i.test(menu),menu); await pg.keyboard.press('Escape');
  await pg.evaluate(()=>BD.select([])); await pg.waitForTimeout(300);
  const cb=pg.locator('#props input[data-k="flexOn"]'); ok('off by default: Board panel toggle exists, unchecked',await cb.count()===1&&!(await cb.isChecked()));
  await cb.check({force:true}); await pg.waitForTimeout(300);
  ok('toggle stores lab:flex = true',await pg.evaluate(()=>localStorage.getItem('lab:flex')==='true'),await pg.evaluate(()=>localStorage.getItem('lab:flex')));
  await pg.evaluate(SEL); await pg.waitForTimeout(300);
  ok('on: frame shows Add column',await pg.locator('[data-act="flexAdd:col"]').count()===1);
  await reload(pg,'lab/board.html?preset=square&flex=0'); ok('?flex=0 turns it off',await pg.evaluate(()=>BD.flex.enabled()===false));
  await reload(pg,'lab/board.html?preset=square&flex=1'); ok('?flex=1 turns it on',await pg.evaluate(()=>BD.flex.enabled()===true));
  await ctx.close(); }

/* 3-8: column, gap/padding, centre, live typing, row + rtl, fit contents (one board) */
{ const {pg,ctx}=await page('lab/board.html?preset=square&flex=1');
  await pg.evaluate(setupCol); await pg.waitForTimeout(500); await pg.evaluate(SEL); await pg.waitForTimeout(300);
  const before=await pg.evaluate(()=>BD.flex.kids(T.f()).map(n=>[n.x(),n.y()]));
  await pg.click('[data-act="flexAdd:col"]'); await pg.waitForTimeout(400);
  let fx=await pg.evaluate(()=>T.f().getAttr('flex')), rs=await R(pg);
  const order=await pg.evaluate(()=>BD.flex.kids(T.f()).map(n=>n.text()).join(''));
  ok('column: dir col, items in order of position (B,C,A)',fx.dir==='col'&&order==='BCA',{fx,order});
  ok('column: each y = previous y + h + gap',gapsOf(rs,fx.gap),{rs,gap:fx.gap});
  const same=k=>rs.every(r=>near(k(r),k(rs[0])));
  ok('column: aligned by '+fx.align,fx.align==='center'?same(r=>r.x+r.w/2):fx.align==='end'?same(r=>r.x+r.w):same(r=>r.x),{fx,rs});
  await setNum(pg,'flexGap',50); rs=await R(pg); ok('gap field: gaps are 50',gapsOf(rs,50),rs);
  await seg(pg,'flexAlign','start'); await setNum(pg,'flexPx',70); await setNum(pg,'flexPy',90); rs=await R(pg);
  ok('padding fields: first item at 70,90',near(rs[0].x,70)&&near(rs[0].y,90),rs[0]);
  await seg(pg,'flexAlign','center'); rs=await R(pg);
  ok('align centre: every centre x = 540',rs.every(r=>near(r.x+r.w/2,540)),rs.map(r=>r.x+r.w/2));
  // live re-flow while typing
  const c0=await pg.evaluate(()=>{ const f=T.f(), t=BD.flex.kids(f)[0], r=t.getClientRect({relativeTo:f}); return BD.util.toScreen({x:f.x()+r.x+r.width/2,y:f.y()+r.y+r.height/2}); });
  const st=await pg.locator('#stage').boundingBox(); await pg.mouse.dblclick(st.x+c0.x,st.y+c0.y); await pg.waitForTimeout(300);
  const hasEd=await pg.locator('textarea.ed-text').count()===1; ok('double-click opens the text editor',hasEd);
  if(hasEd){ const y1=(await R(pg))[1].y; await pg.keyboard.press('End'); await pg.keyboard.press('Enter'); await pg.keyboard.type('Classic'); await pg.waitForTimeout(150);
    const live=await R(pg); ok('typing re-flows live (2nd item moves down before commit)',live[1].y>y1+20,{y1,y2:live[1].y});
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(450);
    rs=await R(pg); ok('after commit: 2nd y = first y + h + gap',near(rs[1].y,rs[0].y+rs[0].h+50),rs); }
  else ok('typing re-flows live (2nd item moves down before commit)',false,'no editor');
  // row + rtl
  await pg.evaluate(SEL); await pg.waitForTimeout(300); await seg(pg,'flexDir','row'); await seg(pg,'flexAlign','start'); rs=await R(pg);
  ok('row: x increasing in layer order, y equal',rs.every((r,i)=>i===0||r.x>rs[i-1].x)&&rs.every(r=>near(r.y,rs[0].y)),rs);
  await pg.locator('#props input[data-k="flexRtl"]').check({force:true}); await pg.waitForTimeout(450); rs=await R(pg);
  ok('right to left: first layer item is right-most',rs.slice(1).every(r=>r.x<rs[0].x),rs);
  // fit contents
  await pg.locator('#props input[data-k="flexHug"]').check({force:true}); await pg.waitForTimeout(450); rs=await R(pg);
  const sz=await pg.evaluate(()=>BD.util.fsize(T.f())), fx2=await pg.evaluate(()=>T.f().getAttr('flex'));
  const w=Math.max(...rs.map(r=>r.x+r.w))-Math.min(...rs.map(r=>r.x))+2*fx2.px, h=Math.max(...rs.map(r=>r.y+r.h))-Math.min(...rs.map(r=>r.y))+2*fx2.py;
  ok('fit contents: frame = content + 2x padding',near(sz.w,w,1)&&near(sz.h,h,1),{sz,w,h});
  await ctx.close(); }

/* 9, 10, 16: stack from selection, box colour, ungroup */
{ const {pg,ctx}=await page('lab/board.html?preset=square&flex=1');
  await pg.evaluate(()=>{ window.a=T.txt('Classic',100,300); window.b2=T.txt('Passion fruit',500,300); BD.changed(); BD.select([a,b2]); }); await pg.waitForTimeout(400);
  ok('two texts: panel offers Row stack',await pg.locator('[data-act="flexStack:row"]').count()===1);
  await pg.click('[data-act="flexStack:row"]'); await pg.waitForTimeout(400);
  const g=await pg.evaluate(()=>{ const s=BD.S.sel; const n=s[0]; return {n:s.length,kind:BD.util.kind(n),dir:n.getAttr('flex')&&n.getAttr('flex').dir,bg:n.getChildren(c=>c.hasName('flex-bg')).length}; });
  ok('stack: one group, dir row, with a flex-bg box',g.n===1&&g.kind==='group'&&g.dir==='row'&&g.bg===1,g);
  const gr=()=>pg.evaluate(()=>{ const grp=BD.S.sel[0]; return {gap:grp.getAttr('flex').gap,rs:T.rects(grp)}; });
  let s=await gr(); ok('stack: gap between the texts = flex.gap',near(s.rs[1].x,s.rs[0].x+s.rs[0].w+s.gap),s);
  const x0=s.rs[1].x;
  await pg.evaluate(()=>{ a.text('Classic Classic'); BD.prepText(a); BD.changed(); }); await pg.waitForTimeout(400); s=await gr();
  ok('stack: wider first text pushes the second right',s.rs[1].x>x0+20&&near(s.rs[1].x,s.rs[0].x+s.rs[0].w+s.gap),{x0,s});
  await pg.evaluate(()=>{ const grp=BD.S.sel[0]; BD.flex.set(grp,{fill:'#ff0000',px:30,py:30}); BD.changed(); }); await pg.waitForTimeout(300);
  const px=await pg.evaluate(async()=>{ const f=T.f(), grp=BD.S.sel[0], r=grp.getClientRect({relativeTo:f}); const e=await BD.exportFrame(f,{canvas:true,scale:1}); return {r,p:[...e.canvas.getContext('2d').getImageData(Math.round(r.x+10),Math.round(r.y+10),1,1).data].slice(0,3).join(',')}; });
  ok('box colour: pixel inside the box corner is red',px.p==='255,0,0',px);
  await pg.evaluate(()=>{ BD.select([BD.S.sel[0]]); BD.act.ungroup(); });
  ok('ungroup removes the flex-bg rect',await pg.evaluate(()=>T.f().find(n=>n.hasName&&n.hasName('flex-bg')).length===0));
  await ctx.close(); }

/* 11: drag to reorder; 17: locked item; 15: export size */
{ const {pg,ctx}=await page('lab/board.html?preset=square&flex=1');
  await pg.evaluate(()=>{ T.txt('A',100,100); T.txt('B',100,300); T.txt('C',100,500); BD.changed(); BD.flex.add(T.f(),{dir:'col',gap:40}); BD.select([]); }); await pg.waitForTimeout(500);
  const p=await pg.evaluate(()=>{ const f=T.f(), r=T.rects(), a=r[0], c=r[2]; return {a:BD.util.toScreen({x:f.x()+a.x+a.w/2,y:f.y()+a.y+a.h/2}),to:BD.util.toScreen({x:f.x()+a.x+a.w/2,y:f.y()+c.y+c.h+40})}; });
  const st=await pg.locator('#stage').boundingBox();
  await pg.mouse.move(st.x+p.a.x,st.y+p.a.y); await pg.mouse.down(); await pg.mouse.move(st.x+p.to.x,st.y+p.to.y,{steps:10}); await pg.mouse.up(); await pg.waitForTimeout(500);
  const o=await pg.evaluate(()=>{ const f=T.f(); return {t:BD.flex.kids(f).map(n=>n.text()).join(''),rs:T.rects()}; });
  ok('drag A below C: order B,C,A and gaps tidy (40)',o.t==='BCA'&&gapsOf(o.rs,40),o);
  const e=await pg.evaluate(async()=>{ const r=await BD.exportFrame(T.f()); const bm=await createImageBitmap(r.blob); return {type:r.blob.type,w:bm.width,h:bm.height}; });
  ok('export default is PNG 2160x2160 with a stack',e.type==='image/png'&&e.w===2160&&e.h===2160,e);
  await ctx.close(); }
{ const {pg,ctx}=await page('lab/board.html?preset=square&flex=1');
  const pos=await pg.evaluate(()=>{ T.txt('A',100,100); const m=T.txt('B',100,500); T.txt('C',100,300); m.setAttr('locked',true); BD.changed(); const mp=[m.x(),m.y()]; BD.flex.add(T.f(),{dir:'col',gap:30}); return {mp,after:[m.x(),m.y()],rs:T.rects(),n:BD.flex.kids(T.f()).map(n=>n.text()).join('')}; });
  ok('locked item stays put, the others stack ignoring it',pos.mp[0]===pos.after[0]&&pos.mp[1]===pos.after[1]&&pos.n==='AC'&&gapsOf(pos.rs,30),pos);
  // 18 components
  const c=await pg.evaluate(async()=>{ const f=T.f(); T.txt('Classic',100,700); T.txt('Passion fruit',100,800); BD.select(f.getChildren(n=>n.getAttr('kind')==='text'&&n.y()>=700)); BD.flex.stack('col'); const g=BD.S.sel[0]; BD.select([g]); BD.comps.make(); const m=BD.comps.mains()[0]; BD.comps.addCopy(m,f);
    BD.flex.set(m,{gap:80}); BD.changed(); await new Promise(r=>setTimeout(r,500)); const cp=BD.comps.copiesOf(m.getAttr('comp'))[0], rs=T.rects(cp); return {gap:cp.getAttr('flex')&&cp.getAttr('flex').gap,rs}; });
  ok('component copy follows the main\'s gap (80)',c.gap===80&&c.rs.length===2&&near(c.rs[1].y,c.rs[0].y+c.rs[0].h+80),c);
  await ctx.close(); }

/* 12 undo/redo, 13 save + reopen */
{ const {pg,ctx}=await page('lab/board.html?preset=square&flex=1');
  await pg.evaluate(setupCol); await pg.waitForTimeout(600); await pg.evaluate(SEL);
  const old=await pg.evaluate(()=>BD.flex.kids(T.f()).map(n=>[n.x(),n.y()]));
  await pg.click('[data-act="flexAdd:col"]'); await pg.waitForTimeout(600);
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(600);
  const u=await pg.evaluate(()=>({fx:T.f().getAttr('flex'),p:BD.util.frames()[0].getChildren(n=>n.getAttr('kind')==='text').map(n=>[n.x(),n.y()])}));
  ok('undo: flex gone, items back where they were',u.fx===undefined&&JSON.stringify(u.p)===JSON.stringify(old),{u,old});
  await pg.keyboard.press('Control+Shift+z'); await pg.waitForTimeout(600);
  ok('redo: flex back',await pg.evaluate(()=>!!T.f().getAttr('flex')));
  const snap=await pg.evaluate(async()=>{ await BD.saveNow(); return {id:BD.S.id,fx:T.f().getAttr('flex'),rs:T.rects()}; });
  await reload(pg,'lab/board.html?id='+snap.id);
  const re=await pg.evaluate(()=>({fx:T.f().getAttr('flex'),rs:T.rects()}));
  ok('save + reopen: flex and positions equal',JSON.stringify(re.fx)===JSON.stringify(snap.fx)&&re.rs.every((r,i)=>near(r.x,snap.rs[i].x,.01)&&near(r.y,snap.rs[i].y,.01)),{re,snap});
  const rf=await pg.evaluate(async()=>{ const t=BD.flex.kids(T.f())[0]; const y=T.rects()[1].y; t.text('A\nA\nA'); BD.prepText(t); BD.changed(); await new Promise(r=>setTimeout(r,300)); return {y,y2:T.rects()[1].y}; });
  ok('after reopen, editing a text still re-flows',rf.y2>rf.y+20,rf);
  await ctx.close(); }

/* 14: old boards are exactly the same with the preview on */
{ const {pg,ctx}=await page('lab/board.html?preset=square');
  await pg.evaluate(()=>{ const f=T.f(); const R=(o)=>Object.assign({name:'obj',kind:'rect'},o);
    f.add(new Konva.Rect(R({id:'r1',x:50,y:50,width:300,height:200,fill:'#ff0000'}))); f.add(new Konva.Ellipse({id:'e1',name:'obj',kind:'ellipse',x:700,y:200,radiusX:120,radiusY:80,fill:'#0000ff'}));
    T.txt('Classic',100,400); const g=new Konva.Group({id:'g1',name:'obj',kind:'group',x:500,y:500}); g.add(new Konva.Rect(R({id:'g2',x:0,y:0,width:150,height:100,fill:'#00aa00'}))); g.add(new Konva.Rect(R({id:'g3',x:200,y:50,width:100,height:100,fill:'#ffaa00'}))); f.add(g);
    f.add(new Konva.Rect(R({id:'lk',x:800,y:800,width:200,height:150,fill:'#aa00aa',locked:true}))); BD.changed(); });
  await pg.waitForTimeout(500);
  const id=await pg.evaluate(async()=>{ await BD.saveNow(); return BD.S.id; });
  const PTS=[[60,60],[300,240],[700,200],[110,430],[520,520],[680,600],[850,850],[10,10],[1000,1000],[540,900]];
  const grab=()=>pg.evaluate(async(pts)=>{ const e=await BD.exportFrame(T.f(),{canvas:true,scale:1}), c=e.canvas.getContext('2d'); return {nodes:JSON.stringify(JSON.parse(BD.docJson()).nodes),all:BD.docJson(),px:pts.map(([x,y])=>[...c.getImageData(x,y,1,1).data].slice(0,3).join(','))}; },PTS);
  await reload(pg,'lab/board.html?id='+id); const A=await grab();
  await pg.evaluate(()=>BD.changed()); await pg.waitForTimeout(500); const B=await grab();
  ok('old board: BD.changed() with preview off changes nothing',A.nodes===B.nodes&&JSON.stringify(A.px)===JSON.stringify(B.px));
  await reload(pg,'lab/board.html?id='+id+'&flex=1'); await pg.evaluate(()=>BD.changed()); await pg.waitForTimeout(500); const C=await grab();
  ok('old board: identical nodes and pixels with the preview on',A.nodes===C.nodes&&JSON.stringify(A.px)===JSON.stringify(C.px),{px:[A.px,C.px]});
  ok('old board: no flex attribute or flex-bg anywhere',!/"flex"|flex-bg/.test(C.all));
  await ctx.close(); }

/* 19: phone */
{ const {pg,ctx}=await page('lab/board.html?preset=square&flex=1',{width:390,height:844},true);
  await pg.evaluate(()=>{ T.txt('A',700,600); T.txt('B',200,100); T.txt('C',450,300); BD.changed(); BD.select([T.f()]); }); await pg.waitForTimeout(400);
  if(!(await pg.locator('[data-act="flexAdd:col"]').isVisible().catch(()=>false))){ await pg.locator('#panelR').tap().catch(()=>{}); await pg.waitForTimeout(500); }
  const bx=await pg.locator('[data-act="flexAdd:col"]').boundingBox().catch(()=>null);
  ok('phone: Add column is visible and at least 40px tall',!!bx&&bx.height>=40,bx);
  if(bx){ await pg.locator('[data-act="flexAdd:col"]').tap(); await pg.waitForTimeout(500); }
  const hs=await pg.evaluate(()=>[...document.querySelectorAll('#props [data-seg="flexDir"]')].map(e=>Math.round(e.getBoundingClientRect().height)));
  ok('phone: direction buttons at least 40px tall',hs.length>=2&&hs.every(h=>h>=40),hs);
  ok('phone: no sideways scroll in the panel',await pg.evaluate(()=>{ const p=document.querySelector('#props'); return p.scrollWidth<=p.clientWidth+1; }));
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close();
console.log(fails?fails+' failed':'all passed'); process.exit(fails?1:0);
