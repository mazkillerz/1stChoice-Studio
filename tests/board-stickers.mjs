/* Board: stickers, sharp emoji and shared text styles (1.36.0, lab/board-stickers.js + board-tools.js).
   Stickers: the files load only when needed; Assets › Stickers (14) and Emoji (24 sharp + keyboard emoji); a sticker is a vector layer
   that exports sharp at 2×, takes a colour (Design panel + quick bar; emoji back to Original), resizes, is picked by a tap, undoes,
   duplicates, saves + reopens, exports to SVG (emoji as paths) and is found by asset search; phone tap adds one.
   Text styles: Save as style writes studio:textstyles ({id,name,st,at}, styleOf shape, auto-named, no duplicates, up to 8); a style
   saved on a tool page shows as a chip and goes on in one undo step; Assets › Text renames and removes; a board's own old styles
   still work; an old board opens unchanged (same data, no sticker files loaded). */
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const b=await chromium.launch(); let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
async function ready(pg){ await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0&&BD.UI); await pg.waitForTimeout(500); }
async function page(path,o){ o=o||{}; const ctx=await b.newContext({viewport:o.vp||{width:1280,height:800},serviceWorkers:'block',hasTouch:!!o.touch,isMobile:!!o.touch,colorScheme:o.dark?'dark':'light'});
  await ctx.addInitScript(s=>{ localStorage.setItem('studio:lab','"1"'); if(s&&!sessionStorage.getItem('seeded')){ localStorage.setItem('studio:textstyles',s); sessionStorage.setItem('seeded','1'); } },o.styles?JSON.stringify(o.styles):null);
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404|fonts\.g|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto(BASE+path); await ready(pg); return {pg,ctx}; }
const sel=pg=>pg.evaluate(()=>{ const n=BD.S.sel[0]; return n?{kind:n.getAttr('kind'),ref:n.getAttr('ref'),w:n.width(),h:n.height(),scol:n.getAttr('scol')||null,fn:typeof n.sceneFunc()}:null; });
/* the colour at the middle of node n in a 2× export of its frame */
const PX=()=>{ window.pxAt=async(n,fx,fy)=>{ const f=BD.util.frameOf(n), r=await BD.exportFrame(f,{canvas:true}), c=r.canvas, rr=n.getClientRect({relativeTo:f});
  const d=c.getContext('2d').getImageData(Math.round((rr.x+rr.width*(fx??.5))*r.scale),Math.round((rr.y+rr.height*(fy??.5))*r.scale),1,1).data; const out={s:r.scale,w:c.width,h:c.height,rgb:[d[0],d[1],d[2]]}; c.width=c.height=0; return out; }; };
const near=(a,b,t=24)=>a.every((v,i)=>Math.abs(v-b[i])<=t);
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

/* 1-11: stickers on a computer */
{ const {pg,ctx}=await page('lab/board.html?preset=story'); await pg.evaluate(PX);
  ok('sticker files not loaded when a board opens',await pg.evaluate(()=>!window.STUDIO_STICKERS&&!window.HL_EMOJI));
  await pg.evaluate(()=>BD.UI.openAssets()); await pg.waitForTimeout(200);
  ok('Assets lists a Stickers category',await pg.locator('#addList .cat[data-cat="stickers"]').count()===1);
  await pg.click('#addList .cat[data-cat="stickers"]'); await pg.waitForFunction(()=>document.querySelectorAll('#addList [data-sticker]').length>0); await pg.waitForTimeout(200);
  ok('Stickers: 14 drawn stickers, each with a drawn preview',await pg.evaluate(()=>{ const t=[...document.querySelectorAll('#addList [data-sticker]')]; return t.length===14&&t.every(x=>x.querySelector('canvas').width>0); }),await pg.locator('#addList [data-sticker]').count());
  await pg.click('#addList [data-sticker="sticker:star"]'); await pg.waitForTimeout(400);
  const ink=await pg.evaluate(()=>BD.brandColors().ink);
  let s=await sel(pg); ok('tap adds a sticker layer (story width 240, brand ink, drawn by a function)',s&&s.kind==='sticker'&&s.ref==='sticker:star'&&s.w===240&&s.scol===ink&&s.fn==='function',s);
  ok('layers list names it "Star"',(await pg.locator('#layers').innerText()).includes('Star'));
  let px=await pg.evaluate(()=>pxAt(BD.S.sel[0]));
  ok('export is 2160×3840 at 2× and the star is drawn in ink',px.s===2&&px.w===2160&&px.h===3840&&near(px.rgb,hexRgb(ink)),px);
  // Design panel: Sticker section + colour
  await pg.evaluate(()=>BD.UI.paintProps()); await pg.waitForTimeout(100);
  ok('Design panel has a Sticker section with its colour',await pg.locator('#props [data-sec="sticker"] [data-color="scol"]').count()===1);
  await pg.click('#props [data-color="scol"]'); await pg.waitForTimeout(200);
  ok('a drawn sticker offers no "No colour"',await pg.locator('#pop #cpNone').count()===0);
  await pg.fill('#pop #cpHex','#1f9d55'); await pg.dispatchEvent('#pop #cpHex','change'); await pg.waitForTimeout(400); await pg.keyboard.press('Escape');
  px=await pg.evaluate(()=>pxAt(BD.S.sel[0])); s=await sel(pg);
  ok('colour picked in the panel: saved as scol and drawn green',s.scol==='#1f9d55'&&near(px.rgb,[31,157,85]),{s,px});
  // resize with the W field (keeps its shape, stays sharp)
  const w=pg.locator('#props input[data-k="w"]'); await w.fill('480'); await w.dispatchEvent('change'); await pg.waitForTimeout(400);
  s=await sel(pg); ok('W field: 480 wide, height follows (keeps its shape)',s.kind==='sticker'&&Math.abs(s.w-480)<1.5&&Math.abs(s.h-458)<3,s);
  ok('resized: still drawn (green in the middle)',near((await pg.evaluate(()=>pxAt(BD.S.sel[0]))).rgb,[31,157,85]));
  // tap on the canvas picks it
  await pg.evaluate(()=>BD.select([])); await pg.waitForTimeout(150);
  const pt=await pg.evaluate(()=>{ const n=BD.main.findOne(x=>x.getAttr('kind')==='sticker'), r=n.getClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  const st=await pg.locator('#stage').boundingBox(); await pg.mouse.click(st.x+pt.x,st.y+pt.y); await pg.waitForTimeout(250);
  ok('a click on the sticker selects it',(await sel(pg)||{}).kind==='sticker');
  // emoji
  await pg.evaluate(()=>BD.UI.openAssets('emoji')); await pg.waitForFunction(()=>document.querySelectorAll('#addList [data-sticker]').length>0); await pg.waitForTimeout(200);
  ok('Emoji: 24 sharp emoji, then the keyboard emoji',await pg.locator('#addList [data-sticker^="sticker:emoji-"]').count()===24&&await pg.locator('#addList .eg').count()>40&&/keyboard emoji/i.test(await pg.locator('#addList').innerText()));
  await pg.click('#addList [data-sticker="sticker:emoji-heart"]'); await pg.waitForTimeout(400); s=await sel(pg);
  ok('emoji sticker: own colours (no scol), 280 wide',s.kind==='sticker'&&s.ref==='sticker:emoji-heart'&&s.scol===null&&s.w===280,s);
  ok('emoji drawn in its own red',near((await pg.evaluate(()=>pxAt(BD.S.sel[0],.5,.45))).rgb,[221,46,68]));
  await pg.evaluate(()=>BD.UI.paintProps()); await pg.waitForTimeout(100);
  ok('Design panel: Emoji section says Original',(await pg.locator('#props [data-sec="sticker"]').innerText()).includes('Original'));
  ok('quick bar has a colour button',await pg.locator('#qbar [data-qc="scol"]').count()===1);
  await pg.click('#qbar [data-qc="scol"]'); await pg.waitForTimeout(200); await pg.fill('#pop #cpHex','#3d5afe'); await pg.dispatchEvent('#pop #cpHex','change'); await pg.waitForTimeout(300);
  ok('quick bar colour makes it one colour',(await sel(pg)).scol==='#3d5afe'&&near((await pg.evaluate(()=>pxAt(BD.S.sel[0],.5,.45))).rgb,[61,90,254]));
  await pg.click('#pop #cpNone'); await pg.waitForTimeout(300);
  ok('No colour gives the emoji its own colours back',(await sel(pg)).scol===null&&near((await pg.evaluate(()=>pxAt(BD.S.sel[0],.5,.45))).rgb,[221,46,68]));
  // undo / redo / duplicate
  await pg.waitForTimeout(400); const n0=await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='sticker').length);
  await pg.evaluate(()=>BD.act.duplicate()); await pg.waitForTimeout(500);
  const dup=await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='sticker').map(x=>typeof x.sceneFunc()));
  ok('duplicate: one more sticker, also drawn',dup.length===n0+1&&dup.every(t=>t==='function'),{n0,dup});
  await pg.evaluate(()=>BD.undo()); await pg.waitForTimeout(400);
  ok('undo removes the copy',await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='sticker').length)===n0);
  await pg.evaluate(()=>BD.redo()); await pg.waitForTimeout(400);
  ok('redo brings it back, drawn',await pg.evaluate(()=>{ const l=BD.main.find(x=>x.getAttr('kind')==='sticker'); return l.length; })===n0+1&&await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='sticker').every(x=>typeof x.sceneFunc()==='function')));
  // search
  await pg.evaluate(()=>BD.UI.openAssets()); await pg.fill('#addQ','heart'); await pg.waitForTimeout(300);
  ok('search "heart" finds the heart sticker and the heart emoji',await pg.locator('#addList [data-sticker="sticker:heart"]').count()===1&&await pg.locator('#addList [data-sticker="sticker:emoji-heart"]').count()===1);
  // SVG export
  const svg=await pg.evaluate(()=>BD.io.svg(BD.util.frames()[0]));
  ok('SVG export: emoji as vector paths, drawn sticker as a picture',/fill="#dd2e44"/i.test(svg)&&/<image[^>]+href="data:image\/png/.test(svg),svg.length);
  // save + reopen
  await pg.evaluate(()=>BD.saveNow()); const id=await pg.evaluate(()=>BD.S.id);
  const was=await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='sticker').map(x=>[x.getAttr('ref'),x.getAttr('scol')||null,Math.round(x.width())]));
  await pg.goto(BASE+'lab/board.html?id='+id); await ready(pg); await pg.evaluate(PX);
  const now=await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='sticker').map(x=>[x.getAttr('ref'),x.getAttr('scol')||null,Math.round(x.width())]));
  ok('reopen: the same stickers come back',JSON.stringify(now)===JSON.stringify(was),{was,now});
  ok('reopen: emoji shapes loaded and drawn',near((await pg.evaluate(()=>pxAt(BD.main.findOne(x=>x.getAttr('ref')==='sticker:emoji-heart'),.5,.45))).rgb,[221,46,68]));
  await ctx.close(); }

/* 12: an old board (no stickers, its own text styles) opens unchanged */
{ /* reopen the old board in one context (storage kept) */
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'}); await ctx.addInitScript(()=>localStorage.setItem('studio:lab','"1"'));
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e)));
  await pg.goto(BASE+'lab/board.html?preset=square'); await ready(pg);
  const id=await pg.evaluate(async()=>{ const L=Studio.lab, id='old'+Date.now().toString(36);
    const d={v:1,name:'Old board',bg:null,unit:'px',dpi:300,rulers:true,styles:{colors:['#7a563a'],text:[{id:'lg1',name:'Big brown',attrs:{fontFamily:'system-ui',fontStyle:'800',fontSize:140,fill:'#7a563a',align:'center',lineHeight:1.1}}]},
      nodes:[{c:'Group',a:{id:'f1',x:0,y:0,kind:'frame',label:'Frame 1',dpi:300,bleed:0,safe:0,fw:1080,fh:1080,clipX:0,clipY:0,clipWidth:1080,clipHeight:1080},k:[{c:'Rect',a:{name:'frame-bg',x:0,y:0,width:1080,height:1080,fill:'#ffffff'}},
        {c:'Text',a:{id:'t1',name:'obj',kind:'text',text:'Hello',autoW:true,fontFamily:'system-ui',fontSize:96,fontStyle:'normal',fill:'#161210',align:'center',lineHeight:1.15,padding:0,fillAfterStrokeEnabled:true,x:300,y:400}}]}],view:{x:0,y:0,k:.5},imgs:[]};
    await L.idb.put('board:'+id,JSON.stringify(d)); const list=L.store('lab:boards')||[]; list.unshift({id,name:'Old board',created:Date.now(),updated:Date.now()}); L.store('lab:boards',list); return id; });
  await pg.goto(BASE+'lab/board.html?id='+id); await ready(pg);
  const got=await pg.evaluate(()=>{ const d=JSON.parse(BD.docJson()); return {nodes:d.nodes,styles:d.styles}; });
  const t=got.nodes[0].k[1].a;
  ok('old board: same frame, text and own styles after opening',got.nodes[0].a.kind==='frame'&&t.text==='Hello'&&t.fill==='#161210'&&t.fontSize===96&&got.styles.text.length===1&&got.styles.colors[0]==='#7a563a',got);
  ok('old board: no sticker files loaded',await pg.evaluate(()=>!window.STUDIO_STICKERS&&!window.HL_EMOJI));
  // its own style still works from Assets › Text (now under "This board")
  await pg.evaluate(()=>{ BD.select([BD.main.findOne('#t1')]); BD.UI.openAssets('text'); }); await pg.waitForTimeout(300);
  ok('Assets › Text shows the board\'s own style under "This board"',/this board/i.test(await pg.locator('#addList').innerText())&&await pg.locator('#addList [data-tstyle="lg1"]').count()===1);
  await pg.click('#addList [data-tstyle="lg1"]'); await pg.waitForTimeout(500);
  ok('the board\'s own style goes on as before',await pg.evaluate(()=>{ const n=BD.main.findOne('#t1'); return n.fill()==='#7a563a'&&n.fontSize()===140; }));
  await ctx.close(); }

/* 13-18: shared text styles */
const TOOL_STYLE=[{id:'tsTool',name:'Pill white',st:{color:'#ffffff',font:'system-ui',align:'left',lh:1.4,ls:4,bg:'#161210',op:0.9,shadow:false},at:1}];
{ const {pg,ctx}=await page('lab/board.html?preset=story',{styles:TOOL_STYLE});
  await pg.evaluate(()=>{ const f=BD.util.frames()[0]; const t=BD.make.text('Hello',{fontSize:120,fontFamily:'system-ui'}); BD.place(t,{frame:f}); }); await pg.waitForTimeout(500);
  await pg.evaluate(()=>BD.UI.paintProps()); await pg.waitForTimeout(100);
  ok('Text styles: a style saved on a tool page shows as a chip',await pg.locator('#props [data-sec="tstyle"] [data-tsuse="tsTool"]').count()===1);
  ok('chip not pressed while the text looks different',await pg.locator('[data-tsuse="tsTool"]').getAttribute('aria-pressed')==='false');
  await pg.waitForTimeout(400); const h0=await pg.evaluate(()=>BD.docJson());
  await pg.click('[data-tsuse="tsTool"]'); await pg.waitForTimeout(600);
  const look=await pg.evaluate(()=>{ const n=BD.S.sel[0]; return {fill:n.fill(),font:n.fontFamily(),align:n.align(),lh:n.lineHeight(),ls:n.letterSpacing(),tbg:n.getAttr('tbg'),pad:n.padding(),op:n.opacity(),size:n.fontSize()}; });
  ok('tap puts colour, font, align, line height, spacing, box and opacity on (size stays)',look.fill==='#ffffff'&&look.align==='left'&&look.lh===1.4&&look.ls===4&&look.tbg==='#161210'&&look.pad>0&&look.op===0.9&&look.size===120,look);
  ok('chip is pressed now',await pg.locator('[data-tsuse="tsTool"]').getAttribute('aria-pressed')==='true');
  await pg.evaluate(()=>BD.undo()); await pg.waitForTimeout(500);
  ok('one undo brings the old look back',await pg.evaluate(()=>BD.docJson())===h0);
  // save as style
  await pg.evaluate(()=>{ const n=BD.main.findOne(x=>x.getAttr('kind')==='text'); BD.select([n]); n.fill('#7a563a'); n.fontFamily(BD.bodyFont()); n.fontStyle('800'); n.lineHeight(1.25); BD.changed(); BD.UI.paintProps(); }); await pg.waitForTimeout(300);
  await pg.click('#props [data-act="saveStyle"]'); await pg.waitForTimeout(300);
  let list=await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')));
  const mine=list.find(x=>x.id!=='tsTool');
  ok('Save as style: stored in studio:textstyles as {id,name,st,at}, named "Style 1", no prompt',list.length===2&&mine&&mine.name==='Style 1'&&typeof mine.at==='number'&&mine.id,list);
  ok('st has the tool pages\' shape (+ wt)',mine&&mine.st.color==='#7a563a'&&mine.st.font===await pg.evaluate(()=>BD.bodyFont())&&!('bf' in mine.st)&&mine.st.align==='center'&&mine.st.lh===1.25&&mine.st.shadow===false&&mine.st.wt==='800'&&!('fontSize' in mine.st),mine&&mine.st);
  ok('the new chip shows, pressed',await pg.locator(`[data-tsuse="${mine.id}"]`).getAttribute('aria-pressed')==='true');
  await pg.click('#props [data-act="saveStyle"]'); await pg.waitForTimeout(300);
  ok('saving the same look again adds nothing and says so',(await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')).length))===2&&/Already saved/.test(await pg.locator('#bToast').innerText()));
  // a font only Board has goes in bf, so a tool page keeps its own font
  await pg.evaluate(()=>{ const n=BD.S.sel[0]; n.fontFamily('Inter'); BD.changed(); BD.UI.paintProps(); }); await pg.waitForTimeout(200);
  await pg.click('#props [data-act="saveStyle"]'); await pg.waitForTimeout(300);
  list=await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')));
  const bfs=list[list.length-1]; ok('a Board-only font is kept as bf, not font',list.length===3&&bfs.st.bf==='Inter'&&!('font' in bfs.st),bfs);
  await pg.evaluate(()=>{ const l=JSON.parse(localStorage.getItem('studio:textstyles')); l.pop(); localStorage.setItem('studio:textstyles',JSON.stringify(l)); });
  // up to 8
  await pg.evaluate(()=>{ const l=JSON.parse(localStorage.getItem('studio:textstyles')); for(let i=0;i<6;i++) l.push({id:'f'+i,name:'F'+i,st:{color:'#00000'+i,font:'system-ui'},at:i}); localStorage.setItem('studio:textstyles',JSON.stringify(l)); const n=BD.S.sel[0]; n.fill('#123456'); BD.changed(); BD.UI.paintProps(); }); await pg.waitForTimeout(200);
  await pg.click('#props [data-act="saveStyle"]'); await pg.waitForTimeout(300);
  ok('a 9th style is refused with a note',(await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')).length))===8&&/You have 8 styles/.test(await pg.locator('#bToast').innerText()));
  // Assets › Text: rename + remove
  await pg.evaluate(()=>BD.UI.openAssets('text')); await pg.waitForTimeout(300);
  ok('Assets › Text lists the shared styles',await pg.locator('#addList [data-tshared]').count()===8);
  await pg.click(`#addList [data-tsmore="${mine.id}"]`); await pg.waitForTimeout(200);
  await pg.fill('dialog.ts-menu #tsName','Brown head'); await pg.click('dialog.ts-menu button[type="submit"]'); await pg.waitForTimeout(300);
  ok('⋯ → rename is stored',(await pg.evaluate(id=>JSON.parse(localStorage.getItem('studio:textstyles')).find(x=>x.id===id).name,mine.id))==='Brown head');
  await pg.click('#addList [data-tsmore="f0"]'); await pg.waitForTimeout(200); await pg.click('dialog.ts-menu [data-tsact="del"]'); await pg.waitForTimeout(300);
  ok('⋯ → Remove takes it out',(await pg.evaluate(()=>JSON.parse(localStorage.getItem('studio:textstyles')).some(x=>x.id==='f0')))===false&&await pg.locator('#addList [data-tshared]').count()===7);
  // with nothing selected, a style from Assets adds a new text in that look
  await pg.evaluate(()=>BD.select([])); const nt=await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='text').length);
  await pg.click('#addList [data-tshared="tsTool"]'); await pg.waitForTimeout(600);
  ok('no text chosen: tapping a style adds a text in that look',await pg.evaluate(()=>BD.main.find(x=>x.getAttr('kind')==='text').length)===nt+1&&await pg.evaluate(()=>BD.S.sel[0]&&BD.S.sel[0].getAttr('tbg')==='#161210'));
  await ctx.close(); }

/* shadow, opacity, copy + paste (paste of a text or sticker used to stop at n.find) */
{ const {pg,ctx}=await page('lab/board.html?preset=square');
  const r=await pg.evaluate(async()=>{ const n=await BD.stickers.add('sticker:star'); n.position({x:300,y:300}); const f=BD.util.frames()[0], out={};
    const px=async(x,y)=>{ const e=await BD.exportFrame(f,{canvas:true}); const d=e.canvas.getContext('2d').getImageData(x*2,y*2,1,1).data; e.canvas.width=0; return [d[0],d[1],d[2]]; };
    out.plain=await px(420,504); n.setAttrs({shadowEnabled:true,shadowOn:true,shadowColor:'#000000',shadowBlur:10,shadowOffsetX:0,shadowOffsetY:60,shadowOpacity:1}); out.shadow=await px(420,504);
    n.setAttrs({shadowEnabled:false,shadowOn:undefined}); n.opacity(.5); out.half=await px(420,440); n.opacity(1);
    const t=BD.make.text('Hi'); BD.place(t); BD.select([n,t]); BD.copy(); let err=null; try{ await BD.paste(); }catch(e){ err=e.message; }
    out.err=err; out.stickers=BD.main.find(x=>x.getAttr('kind')==='sticker').map(x=>typeof x.sceneFunc()); out.texts=BD.main.find('Text').length; return out; });
  ok('shadow is drawn under a sticker',near(r.plain,[255,255,255])&&near(r.shadow,[0,0,0],40),r);
  ok('opacity 50% shows half the ink',near(r.half,[138,136,135],12),r.half);
  ok('copy + paste a sticker and a text: no error, both pasted, sticker drawn',!r.err&&r.stickers.length===2&&r.stickers.every(x=>x==='function')&&r.texts===2,r);
  await ctx.close(); }

/* 19-20: phone (390×844, touch), light and dark */
for(const dark of [false,true]){ const {pg,ctx}=await page('lab/board.html?preset=story',{vp:{width:390,height:844},touch:true,dark,styles:TOOL_STYLE});
  const tag=dark?' (dark)':' (light)';
  await pg.tap('#panelL'); await pg.waitForTimeout(250); await pg.tap('#left [data-tab="add"]'); await pg.waitForTimeout(200);
  await pg.tap('#addList .cat[data-cat="stickers"]'); await pg.waitForFunction(()=>document.querySelectorAll('#addList [data-sticker]').length>0);
  const sz=await pg.evaluate(()=>[...document.querySelectorAll('#addList [data-sticker]')].map(x=>{ const r=x.getBoundingClientRect(); return [r.width,r.height]; }));
  ok('phone: sticker tiles ≥ 44px and fit the panel'+tag,sz.every(([w,h])=>w>=44&&h>=44)&&await pg.evaluate(()=>{ const p=document.getElementById('addList'); return p.scrollWidth<=p.clientWidth+1; }),sz[0]);
  await pg.tap('#addList [data-sticker="sticker:burst"]'); await pg.waitForTimeout(500);
  ok('phone: a tap adds the sticker and closes the panel'+tag,(await sel(pg)||{}).ref==='sticker:burst'&&!(await pg.evaluate(()=>document.getElementById('left').classList.contains('open'))));
  await pg.evaluate(()=>{ const t=BD.make.text('Hello',{fontSize:120,fontFamily:'system-ui'}); BD.place(t); }); await pg.waitForTimeout(300);
  await pg.tap('#panelR'); await pg.waitForTimeout(300);
  const chip=pg.locator('#props [data-tsuse="tsTool"]'); const cb=await chip.boundingBox();
  ok('phone: style chip ≥ 44px tall'+tag,cb&&cb.height>=44,cb);
  const con=await chip.evaluate(el=>{ const c=getComputedStyle(el), p=x=>x.match(/[\d.]+/g).slice(0,3).map(Number), L=([r,g,b])=>{ const f=v=>(v/=255)<=.03928?v/12.92:((v+.055)/1.055)**2.4; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    let bg=c.backgroundColor, e=el; while(/rgba\(.*, 0\)|transparent/.test(bg)&&e.parentElement){ e=e.parentElement; bg=getComputedStyle(e).backgroundColor; } const a=L(p(c.color)), b2=L(p(bg)); return (Math.max(a,b2)+.05)/(Math.min(a,b2)+.05); });
  ok('phone: chip text contrast ≥ 4.5'+tag,con>=4.5,con);
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,3));
await b.close(); console.log(fails?`\n${fails} FAILED`:'\nALL PASS'); process.exit(fails?1:0);
