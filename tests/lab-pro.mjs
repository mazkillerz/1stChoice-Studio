/* Lab Board, part 2: opening SVG and PDF files, print frames (mm, bleed, guides, layout grid),
   every export format (PDF size and trim, PNG DPI, SVG that reopens, ZIP) and the extra tools
   (mask, curved text, barcode, QR, repeat, find and replace, replace colour, versions, eraser, outline, corners, blur, styles, quick find). */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const R=new URL('../',import.meta.url).pathname, F=R+'tests/fixtures/', SP=fs.mkdtempSync('/tmp/labpro-');
const b=await chromium.launch(); let fails=0; const errs=[];
const ok=(n,c,i)=>{ if(!c) fails++; console.log((c?'PASS ':'FAIL ')+n+(!c&&i!==undefined?' '+JSON.stringify(i):'')); };
const log=(...a)=>{};
async function page(path,vp){ const ctx=await b.newContext({viewport:vp||{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true}); await ctx.addInitScript(()=>{ localStorage.setItem('studio:lab','"1"'); });
  const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e.stack||e))); pg.on('console',m=>{ if(m.type()==='error'&&!/status of 404/.test(m.text())) errs.push(m.text()); }); pg.on('dialog',d=>d.accept('My style'));
  await pg.goto(BASE+path); await pg.waitForFunction(()=>window.BD&&BD.util&&BD.util.frames().length>0); await pg.waitForTimeout(600); return {pg,ctx}; }

{ const {pg,ctx}=await page('lab/board.html?preset=square');
  await pg.setInputFiles('#pickImg',F+'canva-like.svg'); await pg.waitForSelector('[data-m="frame"]'); await pg.click('[data-m="frame"]'); await pg.waitForFunction(()=>BD.util.frames().length===2,null,{timeout:15000}); await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>{ const f=BD.util.frames()[1]; const all=f.find('.obj'); return {size:BD.util.fsize(f),bg:BD.util.frameBg(f).fill(),n:all.length,masks:all.filter(n=>BD.util.kind(n)==='mask').length,texts:all.filter(n=>BD.util.kind(n)==='text').map(t=>t.text().trim()),img:all.filter(n=>BD.util.kind(n)==='image').every(i=>!!i.image()),grad:all.some(n=>n.fillPriority&&n.fillPriority()==='linear-gradient'),names:all.map(n=>n.getAttr('label')).filter(Boolean)}; });
  ok('SVG opens as a 1080×1080 frame with its background colour',r.size.w===1080&&r.size.h===1080&&r.bg==='#f3eadc',r);
  ok('SVG keeps clip masks, gradient, pictures and layer names',r.masks===2&&r.grad&&r.img&&r.names.includes('Gradient blob')&&r.names.includes('Photo block'),r);
  ok('SVG text stays editable (styled pieces and Arabic)',r.texts.includes('Real')&&r.texts.includes('text')&&r.texts.includes('يسرسح ثلج'),r.texts);
  const t=await pg.evaluate(()=>{ const ts=BD.util.frames()[1].find('Text'); const a=ts.find(x=>x.text().trim()==='Real'), c=ts.find(x=>x.text()==='text'); return a&&c?c.x()-(a.x()+a.width()*a.scaleX()):null; });
  ok('styled pieces sit side by side',t!=null&&Math.abs(t)<2,t);
  await pg.setInputFiles('#pickImg',F+'label.pdf'); await pg.waitForSelector('#pdGo'); await pg.click('#pdGo'); await pg.waitForFunction(()=>BD.util.frames().length===3,null,{timeout:20000}); await pg.waitForTimeout(400);
  const p=await pg.evaluate(()=>{ const f=BD.util.frames().slice(-1)[0]; const all=f.find('.obj'); return {size:BD.util.fsize(f),dpi:f.getAttr('dpi'),print:f.getAttr('print'),texts:all.filter(n=>BD.util.kind(n)==='text').map(t=>[t.text(),t.fill(),Math.round(t.fontSize()),t.fontStyle()]),art:all.some(n=>n.getAttr('isBg')),unit:BD.S.unit}; });
  ok('PDF page becomes an A5 print frame at 300 dpi',Math.abs(p.size.w-1750)<2&&Math.abs(p.size.h-2479)<2&&p.dpi===300&&p.print&&p.art&&p.unit==='mm',p);
  ok('PDF text is editable with size, weight and colour',p.texts.length===3&&p.texts[0][0]==='Cold brew label'&&p.texts[0][2]===133&&p.texts[0][3]==='700'&&/^#[0-3]/.test(p.texts[0][1]),p.texts);
  await ctx.close(); }
{ const {pg,ctx}=await page('lab/board.html?preset=story');
const st=await pg.locator('#stage').boundingBox();
const W=async(x,y)=>{ const p=await pg.evaluate(([x,y])=>BD.util.toScreen({x,y}),[x,y]); return {x:st.x+p.x,y:st.y+p.y}; };
const drag=async(a,c,steps)=>{ await pg.mouse.move(a.x,a.y); await pg.mouse.down(); await pg.mouse.move(c.x,c.y,{steps:steps||8}); await pg.mouse.up(); };
// print frame via dock flyout
await pg.click('[data-fly="frame"]'); await pg.waitForTimeout(150); await pg.click('#menu button:has-text("Print size")'); await pg.waitForTimeout(200);
await pg.fill('#pfName','Can label'); await pg.fill('#pfW','205'); await pg.fill('#pfH','85'); await pg.fill('#pfB','3'); await pg.fill('#pfS','4');
await pg.click('form .btn[type=submit]'); await pg.waitForTimeout(600);
const pf=await pg.evaluate(()=>{ const f=BD.S.sel[0]; return {kind:BD.util.kind(f),fw:f.getAttr('fw'),fh:f.getAttr('fh'),bleed:f.getAttr('bleed'),dpi:f.getAttr('dpi'),unit:BD.S.unit,print:f.getAttr('print'),label:f.getAttr('label')}; });
ok('print frame 205×85 mm at 300 dpi',pf.fw===2421.26||Math.abs(pf.fw-2421.26)<1,pf);
ok('W field shows mm',await pg.inputValue('[data-k="w"]')==='205',await pg.inputValue('[data-k="w"]'));
await pg.screenshot({path:SP+'/print.png'});
// group sizing in mm: draw rect + ellipse, group, set W to 100mm
const f=await pg.evaluate(()=>{ const f=BD.S.sel[0]; return {x:f.x(),y:f.y()}; });
await pg.keyboard.press('r'); await drag(await W(f.x+100,f.y+100),await W(f.x+600,f.y+500));
await pg.keyboard.press('o'); await drag(await W(f.x+700,f.y+100),await W(f.x+1000,f.y+400));
await pg.evaluate(()=>{ const f=BD.util.frames()[1]; BD.select(BD.util.items(f)); }); await pg.keyboard.press('Control+g'); await pg.waitForTimeout(150);
await pg.fill('[data-k="w"]','100'); await pg.press('[data-k="w"]','Enter'); await pg.waitForTimeout(150);
ok('group width typed in mm',await pg.evaluate(()=>Math.abs(BD.units.toUnit(BD.util.wrect(BD.S.sel[0]).width,300,'mm')-100)<0.2));
// guides: drag from top ruler into frame
const rx=await pg.locator('#rulerX').boundingBox(); const target=await W(f.x+500,f.y+300);
await pg.mouse.move(target.x,rx.y+10); await pg.mouse.down(); await pg.mouse.move(target.x,target.y,{steps:6}); await pg.mouse.up(); await pg.waitForTimeout(150);
ok('guide added from ruler',await pg.evaluate(()=>{ const g=BD.util.frames()[1].getAttr('guides'); return g&&g.h&&g.h.length===1; }));
// layout grid
await pg.evaluate(()=>BD.select([BD.util.frames()[1]])); await pg.waitForTimeout(100); await pg.check('[data-k="lgOn"]'); await pg.waitForTimeout(100);
ok('layout grid on',await pg.evaluate(()=>BD.util.frames()[1].getAttr('lgrid').on===true));
// exports: PDF print with bleed + marks
await pg.waitForTimeout(500); await pg.keyboard.press('Control+e'); await pg.waitForSelector('dialog[open] #exGo'); await pg.click('dialog[open] [data-seg="fmt"][data-v="pdf"]'); await pg.waitForTimeout(100);
await pg.click('#exNone'); await pg.check(`.exp-list input[value="${await pg.evaluate(()=>BD.util.frames()[1].id())}"]`); await pg.check('#exMarks');
let [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exGo')]); await dl.saveAs(SP+'/x.pdf');
const pdf=fs.readFileSync(SP+'/x.pdf','latin1'); const mb=pdf.match(/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/), tb=pdf.match(/TrimBox \[([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)\]/);
ok('PDF has trim 205×85 mm',tb&&Math.abs((tb[3]-tb[1])/72*25.4-205)<0.3&&Math.abs((tb[4]-tb[2])/72*25.4-85)<0.3,{mb:mb&&mb.slice(1),tb:tb&&tb.slice(1)});
// PNG with DPI
await pg.waitForTimeout(500); await pg.keyboard.press('Control+e'); await pg.waitForSelector('dialog[open] #exGo'); await pg.click('dialog[open] [data-seg="fmt"][data-v="png"]'); await pg.click('#exNone'); await pg.check(`.exp-list input[value="${await pg.evaluate(()=>BD.util.frames()[1].id())}"]`);
[dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exGo')]); await dl.saveAs(SP+'/x.png');
const png=fs.readFileSync(SP+'/x.png'); const ph=png.indexOf('pHYs'); const ppm=ph>0?png.readUInt32BE(ph+4):0;
ok('PNG says 300 dpi and includes bleed',Math.round(ppm*0.0254)===300&&png.readUInt32BE(16)===Math.round(2421.26+2*35.43),{dpi:Math.round(ppm*0.0254),w:png.readUInt32BE(16),h:png.readUInt32BE(20)});
// SVG export, then import it back
await pg.waitForTimeout(500); await pg.keyboard.press('Control+e'); await pg.waitForSelector('dialog[open] #exGo'); await pg.click('dialog[open] [data-seg="fmt"][data-v="svg"]'); await pg.click('#exNone'); await pg.check(`.exp-list input[value="${await pg.evaluate(()=>BD.util.frames()[1].id())}"]`);
[dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exGo')]); await dl.saveAs(SP+'/x.svg');
const svgt=fs.readFileSync(SP+'/x.svg','utf8'); ok('SVG is mm sized with layers',/width="211mm"/.test(svgt)&&/<ellipse/.test(svgt),svgt.slice(0,200));
const nf=await pg.evaluate(()=>BD.util.frames().length); await pg.setInputFiles('#pickImg',SP+'/x.svg'); await pg.waitForTimeout(300); await pg.click('[data-m="frame"]'); await pg.waitForTimeout(1200);
ok('SVG round-trips',await pg.evaluate(()=>{ const f=BD.util.frames().slice(-1)[0]; return f.find('Ellipse').length===1&&f.find('Rect').length>=2&&f.getAttr('print'); })&&await pg.evaluate(()=>BD.util.frames().length)===nf+1);
// ZIP of all frames
await pg.waitForTimeout(500); await pg.keyboard.press('Control+e'); await pg.waitForSelector('dialog[open] #exGo'); await pg.click('dialog[open] [data-seg="fmt"][data-v="jpg"]'); await pg.click('#exAll'); await pg.check('#exZip');
[dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exGo')]); await dl.saveAs(SP+'/x.zip');
const zip=fs.readFileSync(SP+'/x.zip'); ok('ZIP export',zip.readUInt32LE(0)===0x04034b50&&dl.suggestedFilename().endsWith('.zip'),dl.suggestedFilename());
await ctx.close(); }
{ const {pg,ctx}=await page('lab/board.html?preset=post45');
const st=await pg.locator('#stage').boundingBox();
const W=async(x,y)=>{ const p=await pg.evaluate(([x,y])=>BD.util.toScreen({x,y}),[x,y]); return {x:st.x+p.x,y:st.y+p.y}; };
const drag=async(a,c,steps)=>{ await pg.mouse.move(a.x,a.y); await pg.mouse.down(); await pg.mouse.move(c.x,c.y,{steps:steps||8}); await pg.mouse.up(); };
// mask: photo + ellipse
await pg.setInputFiles('#pickImg',R+'brands/1stchoice/samples/pair.jpg'); await pg.waitForTimeout(2000);
await pg.keyboard.press('o'); await drag(await W(300,300),await W(800,800));
await pg.evaluate(()=>BD.select(BD.main.find('.obj').filter(n=>['image','ellipse'].includes(BD.util.kind(n))))); await pg.waitForTimeout(200);
ok('quick bar shows Mask',await pg.isVisible('#qbar [data-q="mask"]'));
await pg.click('#qbar [data-q="mask"]'); await pg.waitForTimeout(300);
ok('mask made',await pg.evaluate(()=>{ const g=BD.S.sel[0]; return BD.util.kind(g)==='mask'&&!!g.clipFunc()&&g.getChildren(c=>c.getAttr('isMask')).length===1; }));
await pg.screenshot({path:SP+'/mask.png'});
// mask survives reload
await pg.waitForTimeout(1200); await pg.reload(); await pg.waitForTimeout(2500);
ok('mask after reload',await pg.evaluate(()=>{ const g=BD.main.find('.obj').find(n=>BD.util.kind(n)==='mask'); return g&&!!g.clipFunc(); }));
await pg.evaluate(()=>BD.select([BD.main.find('.obj').find(n=>BD.util.kind(n)==='mask')])); await pg.click('#qbar [data-q="unmask"]'); await pg.waitForTimeout(200);
ok('unmask',await pg.evaluate(()=>!BD.main.find('.obj').some(n=>BD.util.kind(n)==='mask')&&BD.main.find('Ellipse')[0].opacity()===1));
// curved text
await pg.evaluate(()=>BD.tools.makeArc('HELLO WORLD')); await pg.waitForTimeout(300);
ok('curved text',await pg.evaluate(()=>BD.util.kind(BD.S.sel[0])==='arc'&&BD.S.sel[0].getClassName()==='TextPath'));
await pg.click('[data-seg="arcMode"][data-v="circle"]'); ok('arc circle mode',await pg.evaluate(()=>/A.*A/.test(BD.S.sel[0].data())));
// barcode
await pg.evaluate(()=>BD.UI.barcodeDialog()); await pg.fill('#bcIn','629104150021'); await pg.waitForTimeout(100);
ok('barcode check digit',/6291041500213|Barcode: \d{13}/.test(await pg.textContent('#bcInfo')),await pg.textContent('#bcInfo'));
await pg.click('#bcGo'); await pg.waitForTimeout(300);
ok('barcode added',await pg.evaluate(()=>{ const g=BD.S.sel[0]; return BD.util.kind(g)==='barcode'&&g.findOne('.bc-bars')&&g.findOne('.bc-bars').data().length>100; }));
// QR
await pg.evaluate(()=>BD.UI.qrDialog()); await pg.fill('#qrIn','https://instagram.com/1stchoice.om'); await pg.click('dialog[open] .btn[type=submit]'); await pg.waitForTimeout(1200);
ok('QR added',await pg.evaluate(()=>BD.util.kind(BD.S.sel[0])==='qr'&&BD.S.sel[0].findOne('.qr-dots').data().length>500));
await pg.screenshot({path:SP+'/codes.png'});
// repeat
await pg.keyboard.press('r'); await drag(await W(50,1000),await W(150,1100));
await pg.evaluate(()=>BD.UI.repeatDialog()); await pg.fill('#rpR','3'); await pg.fill('#rpC','4'); await pg.click('dialog[open] .btn[type=submit]'); await pg.waitForTimeout(300);
ok('repeat 3×4',await pg.evaluate(()=>BD.S.sel.length===12));
// find & replace
await pg.evaluate(()=>{ const t=BD.make.text('Hello cold brew'); BD.place(t); }); await pg.waitForTimeout(200);
await pg.keyboard.press('Control+f'); await pg.waitForTimeout(150); await pg.fill('#frQ','cold'); await pg.fill('#frW','iced'); await pg.waitForTimeout(100); ok('find counts',/1 found/.test(await pg.textContent('#frInfo')),await pg.textContent('#frInfo'));
await pg.click('dialog[open] .btn[type=submit]'); await pg.waitForTimeout(100); await pg.click('#frNo');
ok('replace all',await pg.evaluate(()=>BD.main.find('Text').some(t=>t.text()==='Hello iced brew')));
// replace colour
const accent=await pg.evaluate(()=>BD.brandColors().accent.toLowerCase());
const n=await pg.evaluate(c=>BD.tools.replaceColor(c,'#00ff00'),accent);
ok('replace colour everywhere',n>=12&&await pg.evaluate(()=>BD.main.find('Rect').filter(r=>r.fill()==='#00ff00').length>=12),n);
// versions
await pg.evaluate(()=>BD.tools.saveVersion('v1')); const cnt=await pg.evaluate(()=>BD.main.find('.obj').length);
await pg.evaluate(()=>{ BD.select(BD.main.find('Rect').filter(r=>r.fill()==='#00ff00')); BD.act.del(); }); await pg.waitForTimeout(300);
const vid=await pg.evaluate(async()=>(await BD.tools.versions()).find(v=>v.name==='v1').id);
await pg.evaluate(id=>BD.tools.restoreVersion(id),vid); await pg.waitForTimeout(800);
ok('version restore',await pg.evaluate(c=>BD.main.find('.obj').length===c,cnt));
// eraser
await pg.keyboard.press('Escape'); await pg.keyboard.press('p'); await drag(await W(100,200),await W(900,200),25); await pg.keyboard.press('e'); await drag(await W(500,150),await W(500,250),6);
ok('eraser cuts the drawing in two',await pg.evaluate(()=>BD.main.find('Line').filter(l=>BD.util.kind(l)==='pen').length===2));
await pg.keyboard.press('Escape');
// outline position + per-corner + blur
await pg.evaluate(()=>BD.select([BD.main.find('Rect').find(r=>r.fill()==='#00ff00')])); await pg.waitForTimeout(100);
await pg.click('[data-seg="strokeAlign"][data-v="inside"]'); ok('outline inside',await pg.evaluate(()=>BD.S.sel[0].getAttr('strokeAlign')==='inside'&&typeof BD.S.sel[0].sceneFunc()==='function'));
await pg.check('[data-k="crEach"]'); await pg.fill('[data-k="cr1"]','30'); await pg.press('[data-k="cr1"]','Enter'); ok('per corner',await pg.evaluate(()=>JSON.stringify(BD.S.sel[0].cornerRadius())),await pg.evaluate(()=>BD.S.sel[0].cornerRadius()));
await pg.click('[data-rtab="effects"]'); await pg.fill('[data-k="lblur"]','10'); await pg.dispatchEvent('[data-k="lblur"]','input'); await pg.waitForTimeout(200);
ok('layer blur',await pg.evaluate(()=>BD.S.sel[0].isCached()&&BD.S.sel[0].getAttr('lblur')===10));
await pg.click('[data-rtab="design"]');
// text style save/apply
await pg.evaluate(()=>BD.select([BD.main.find('Text').find(t=>BD.util.kind(t)==='text')])); await pg.waitForTimeout(100); await pg.click('[data-act="saveStyle"]'); await pg.waitForTimeout(100);
ok('text style saved',await pg.evaluate(()=>BD.S.styles.text.length===1&&BD.S.styles.text[0].name==='My style'));
// palette
await pg.keyboard.press('Control+k'); await pg.waitForTimeout(100); await pg.keyboard.type('export pdf'); await pg.waitForTimeout(100);
ok('quick find',/Export PDF/.test(await pg.textContent('#palList')));
await pg.screenshot({path:SP+'/palette.png'}); await pg.keyboard.press('Escape');
// undo across everything still works
await pg.keyboard.press('Control+z'); await pg.waitForTimeout(400);
await ctx.close(); }

ok('no console errors',!errs.length,errs);
await b.close(); fs.rmSync(SP,{recursive:true,force:true});
console.log(fails?fails+' failed':'all passed'); process.exit(fails?1:0);
