/* Board (experimental): extra tools — masks, curved text, barcodes, QR codes, repeat in a grid,
   versions, find & replace, replace a colour everywhere, saved text styles and colours. */
(function(){
const BD=window.BD, L=Studio.lab, U=BD.util, S=BD.S;
const {kind,isFrame,isLocked,frames,items,fsize,wrect,unionRect,frameOf,nameOf,frameBg,uid}=U;
const T={};
BD.tools=T;

/* ---------- mask: put photos (or anything) inside a shape ---------- */
const MASKABLE=['rect','ellipse','poly','star','ring','path','icon'];
T.canMask=list=>list.length>=2&&list.some(n=>MASKABLE.includes(kind(n)))&&list.every(n=>!isFrame(n));
T.mask=function(){
  const sel=S.sel.filter(n=>!isFrame(n)&&!isLocked(n));
  if(sel.length<2){ BD.toast('Pick a shape and what goes inside it (a photo, text, anything).'); return; }
  const par=sel[0].getParent(); if(!sel.every(n=>n.getParent()===par)){ BD.toast('Pick things inside the same frame.'); return; }
  const shapes=sel.filter(n=>MASKABLE.includes(kind(n))); if(!shapes.length){ BD.toast('One of them needs to be a shape: a box, circle, star or any shape.'); return; }
  const m=shapes.sort((a,b)=>b.zIndex()-a.zIndex())[0], content=sel.filter(n=>n!==m).sort((a,b)=>a.zIndex()-b.zIndex());
  const z=Math.max(...sel.map(n=>n.zIndex()));
  const g=new Konva.Group({id:uid(),name:'obj',kind:'mask',label:'Mask'}); par.add(g); g.zIndex(Math.min(z,par.children.length-1));
  U.reparent(m,g); m.setAttrs({isMask:true,maskOpacity:m.opacity(),opacity:0});
  content.forEach(n=>U.reparent(n,g)); m.moveToBottom();
  BD.decorate(g); BD.select([g]); BD.changed(); BD.paintUI(); BD.toast('Masked. Double-click to move what\'s inside.');
};
T.unmask=function(){ const out=[];
  S.sel.filter(n=>kind(n)==='mask').forEach(g=>{ const p=g.getParent(); let z=g.zIndex();
    [...g.getChildren()].forEach(c=>{ U.reparent(c,p); if(c.getAttr('isMask')){ c.setAttrs({opacity:c.getAttr('maskOpacity')??1,isMask:undefined,maskOpacity:undefined}); } c.zIndex(Math.min(++z,p.children.length-1)); out.push(c); }); g.destroy(); });
  if(out.length){ S.entered=null; BD.select(out); BD.changed(); BD.paintUI(); } };

/* ---------- curved text (along an arc or a whole circle) ---------- */
function arcData(r,mode){ r=Math.max(10,r);
  if(mode==='circle') return `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0`;
  return mode==='down'?`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`:`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`; }
T.updateArc=n=>{ n.data(arcData(n.getAttr('arcR')||300,n.getAttr('arcMode')||'up')); };
T.makeArc=function(text,opt){ opt=opt||{}; const f=BD.targetFrame(), fw=f?fsize(f).w:1080, r=opt.r||Math.round(fw*.32);
  const n=BD.obj('TextPath',{kind:'arc',text:text||((BD.B&&BD.B.lang)==='ar'?'نص على شكل قوس':'Curved text'),arcR:r,arcMode:opt.mode||'up',fontFamily:BD.bodyFont(),fontStyle:'800',fontSize:Math.round(fw*.06),fill:BD.brandColors().ink,align:'center',letterSpacing:2});
  T.updateArc(n); return BD.place(n,{frame:f}); };

/* ---------- barcodes (EAN-13 / UPC-A), drawn as sharp shapes ---------- */
const EL=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const EG=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const ER=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PAR=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const check=d=>(10-d.split('').reduce((s,c,i)=>s+(+c)*(i%2?3:1),0)%10)%10;
/* returns {digits13, ok, msg} */
T.barcodeDigits=function(raw,type){ const d=String(raw||'').replace(/\D/g,'');
  if(type==='upc'){ if(d.length===11) return {code:'0'+d+check('0'+d),ok:true}; if(d.length===12){ const c=check('0'+d.slice(0,11)); return {code:'0'+d,ok:c===+d[11],msg:c===+d[11]?'':'The last digit should be '+c+'.'}; } return {ok:false,msg:'UPC-A needs 11 or 12 digits.'}; }
  if(d.length===12) return {code:d+check(d),ok:true}; if(d.length===13){ const c=check(d.slice(0,12)); return {code:d,ok:c===+d[12],msg:c===+d[12]?'':'The last digit should be '+c+'.'}; }
  return {ok:false,msg:'EAN-13 needs 12 or 13 digits.'}; };
function eanBits(code){ const p=PAR[+code[0]]; let b='101'; for(let i=1;i<7;i++) b+=(p[i-1]==='L'?EL:EG)[+code[i]]; b+='01010'; for(let i=7;i<13;i++) b+=ER[+code[i]]; return b+'101'; }
T.buildBarcode=function(g){ /* g: a group with attrs code, btype, mod (module width px), bh (bar height px), color, bgOn */
  const r=T.barcodeDigits(g.getAttr('code'),g.getAttr('btype')); if(!r.ok&&!r.code) return r;
  const code=r.code, bits=eanBits(code), m=g.getAttr('mod')||4, h=g.getAttr('bh')||m*70, col=g.getAttr('color')||'#000000', q=m*11, fs=m*8.5;
  const guards=new Set([0,1,2,45,46,47,48,49,92,93,94]); let d='';
  for(let i=0;i<95;){ if(bits[i]!=='1'){ i++; continue; } let j=i; while(j<95&&bits[j]==='1'&&guards.has(j)===guards.has(i)) j++; const hh=guards.has(i)?h+m*5:h; d+=`M${q+i*m} 0H${q+j*m}V${hh}H${q+i*m}Z`; i=j; }
  g.destroyChildren();
  const W=q+95*m+m*7, H=h+m*5+fs*.4;
  g.add(new Konva.Rect({name:'bc-bg',width:W,height:H+fs*.6,fill:g.getAttr('bgOn')===false?undefined:'#ffffff',listening:true}));
  g.add(new Konva.Path({name:'bc-bars',data:d,fill:col}));
  const font='Courier New', y=h+m*1.5, upc=g.getAttr('btype')==='upc';
  const txt=(t,x,w,al)=>g.add(new Konva.Text({text:t,x,y,width:w,align:al||'center',fontFamily:font,fontSize:fs,fontStyle:'bold',fill:col,letterSpacing:m*.6}));
  if(upc){ txt(code[1],0,q-m,'right'); txt(code.slice(2,7),q+3*m+m*2,m*38); txt(code.slice(7,12),q+50*m+m*2,m*38); txt(code[12],q+95*m+m,m*7,'left'); }
  else { txt(code[0],0,q-m,'right'); txt(code.slice(1,7),q+3*m,m*42); txt(code.slice(7),q+50*m,m*42); }
  return r; };
T.makeBarcode=function(code,type){ const g=new Konva.Group({id:uid(),name:'obj',kind:'barcode',label:'Barcode',code:code||'628000000000',btype:type||'ean',mod:4,bh:280,color:'#000000'});
  T.buildBarcode(g); return BD.place(g); };

/* ---------- QR codes ---------- */
async function qrLib(){ if(!window.qrcode) await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=L.ROOT+'assets/vendor/qrcode.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  if(window.qrcode.stringToBytesFuncs&&window.qrcode.stringToBytesFuncs['UTF-8']) window.qrcode.stringToBytes=window.qrcode.stringToBytesFuncs['UTF-8']; return window.qrcode; }
T.buildQR=async function(g){ const q=await qrLib(); let qr;
  try{ qr=q(0,g.getAttr('ecc')||'M'); qr.addData(g.getAttr('qrText')||' ','Byte'); qr.make(); }catch(err){ BD.toast('That is too long for a QR code.'); return false; }
  const n=qr.getModuleCount(), cell=g.getAttr('cell')||12, quiet=4; let d='';
  for(let r=0;r<n;r++){ let c=0; while(c<n){ if(!qr.isDark(r,c)){ c++; continue; } let e=c; while(e<n&&qr.isDark(r,e)) e++; d+=`M${(c+quiet)*cell} ${(r+quiet)*cell}H${(e+quiet)*cell}V${(r+quiet+1)*cell}H${(c+quiet)*cell}Z`; c=e; } }
  g.destroyChildren(); const W=(n+quiet*2)*cell;
  g.add(new Konva.Rect({name:'qr-bg',width:W,height:W,fill:g.getAttr('bgOn')===false?undefined:(g.getAttr('bg')||'#ffffff'),cornerRadius:g.getAttr('round')?cell*2:0}));
  g.add(new Konva.Path({name:'qr-dots',data:d,fill:g.getAttr('color')||'#000000'}));
  return true; };
T.makeQR=async function(text){ const g=new Konva.Group({id:uid(),name:'obj',kind:'qr',label:'QR code',qrText:text||'https://instagram.com/',ecc:'M',cell:12,color:'#000000'});
  await T.buildQR(g); return BD.place(g); };

/* ---------- repeat in rows and columns (labels on a sheet, patterns) ---------- */
T.repeat=function(rows,cols,gx,gy){ const list=S.sel.filter(n=>!isFrame(n)&&!isLocked(n)); if(!list.length) return;
  rows=Math.max(1,Math.min(50,rows|0)); cols=Math.max(1,Math.min(50,cols|0)); if(rows*cols>400){ BD.toast('That is a lot of copies. Try 400 or fewer.'); return; }
  const r=unionRect(list), out=[...list], json=list.map(n=>BD.toObjFn(n));
  for(let i=0;i<rows;i++) for(let j=0;j<cols;j++){ if(!i&&!j) continue;
    list.forEach((n,k)=>{ const c=BD.rebuild(json[k],true); n.getParent().add(c); U.moveByWorld(c,j*(r.width+gx),i*(r.height+gy)); out.push(c); }); }
  BD.select(out); BD.changed(); BD.paintUI(); return out.length; };
T.fitCount=function(gx,gy){ const list=S.sel.filter(n=>!isFrame(n)); const f=list[0]&&frameOf(list[0]); if(!f) return null; const r=unionRect(list), s=fsize(f);
  const left=r.x-f.x(), top=r.y-f.y(); return {cols:Math.max(1,Math.floor((s.w-left+gx)/(r.width+gx))),rows:Math.max(1,Math.floor((s.h-top+gy)/(r.height+gy)))}; };

/* ---------- versions ---------- */
const vkey=()=>'bvers:'+S.id;
T.versions=async()=>(await L.idb.get(vkey()))||[];
T.saveVersion=async function(name){ const list=await T.versions(); const id=uid(); await L.idb.put('bver:'+id,BD.docJson()); list.unshift({id,name:name||'Version '+(list.length+1),at:Date.now()}); await L.idb.put(vkey(),list.slice(0,60)); return id; };
T.restoreVersion=async function(id){ const raw=await L.idb.get('bver:'+id); if(!raw) return false; await T.saveVersion('Before going back'); await BD.loadDocJson(raw); return true; };
T.deleteVersion=async function(id){ const list=(await T.versions()).filter(v=>v.id!==id); await L.idb.del('bver:'+id); await L.idb.put(vkey(),list); };

/* ---------- find and replace ---------- */
function texts(){ return BD.main.find(n=>kind(n)==='text'||kind(n)==='arc'); }
function rx(q,cs){ return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),cs?'g':'gi'); }
T.findCount=(q,cs)=>{ if(!q) return 0; let c=0; texts().forEach(n=>{ const m=(n.text()||'').match(rx(q,cs)); if(m) c+=m.length; }); return c; };
T.findNodes=(q,cs)=>q?texts().filter(n=>rx(q,cs).test(n.text()||'')):[];
T.replaceAll=function(q,w,cs){ if(!q) return 0; let c=0; texts().forEach(n=>{ const t=n.text()||'', m=t.match(rx(q,cs)); if(!m) return; c+=m.length; n.text(t.replace(rx(q,cs),w)); if(kind(n)==='text') BD.prepText(n); }); if(c){ BD.main.batchDraw(); BD.changed(); } return c; };

/* ---------- replace a colour everywhere ---------- */
const CKEYS=['fill','stroke','gradA','gradB','tbg','shadowColor','color'];
const hex6=c=>{ if(typeof c!=='string'||!c) return null; if(/^#[0-9a-f]{6}/i.test(c)) return c.slice(0,7).toLowerCase(); const k=Konva.Util.colorToRGBA(c); return k?'#'+[k.r,k.g,k.b].map(v=>v.toString(16).padStart(2,'0')).join(''):null; };
T.usedColors=function(){ const m=new Map(); BD.main.find(()=>true).forEach(n=>CKEYS.forEach(k=>{ const h=hex6(n.getAttr(k)); if(h) m.set(h,(m.get(h)||0)+1); })); return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(([c,n])=>({c,n})); };
T.replaceColor=function(from,to){ let c=0; from=from.toLowerCase();
  BD.main.find(()=>true).forEach(n=>{ let hit=false; CKEYS.forEach(k=>{ const v=n.getAttr(k); if(hex6(v)===from){ const a=typeof v==='string'&&/^#[0-9a-f]{8}$/i.test(v)?v.slice(7):''; n.setAttr(k,to.slice(0,7)+a); hit=true; c++; } });
    if(hit){ BD.applyFill(n); if(kind(n)==='barcode') T.buildBarcode(n); if(kind(n)==='qr') T.buildQR(n); } });
  BD.main.batchDraw(); if(c) BD.changed(); return c; };

/* ---------- saved styles (text styles and colours, kept with the board) ---------- */
const TS_KEYS=['fontFamily','fontStyle','fontSize','fill','lineHeight','letterSpacing','align','textDecoration','tbg','tbgR','padding','stroke','strokeWidth'];
T.saveTextStyle=function(n,name){ const a={}; TS_KEYS.forEach(k=>{ const v=n.getAttr(k); if(v!==undefined) a[k]=v; }); S.styles.text.push({id:uid(),name:name||'Text style '+(S.styles.text.length+1),attrs:a}); BD.scheduleSave(); };
T.applyTextStyle=function(st,list){ list=(list||S.sel).filter(n=>kind(n)==='text'||kind(n)==='arc');
  if(!list.length){ const n=BD.make.text((BD.B&&BD.B.lang)==='ar'?'اكتب هنا':'Text',Object.assign({},st.attrs)); BD.ensureFont(st.attrs.fontFamily,st.attrs.fontStyle).then(()=>BD.place(n)); return; }
  BD.ensureFont(st.attrs.fontFamily,st.attrs.fontStyle).then(()=>{ list.forEach(n=>{ Object.entries(st.attrs).forEach(([k,v])=>{ if(kind(n)==='arc'&&['tbg','tbgR','padding','lineHeight'].includes(k)) return; n.setAttr(k,v); }); if(kind(n)==='text') BD.prepText(n); }); BD.main.batchDraw(); BD.tr.forceUpdate(); BD.changed(); BD.emitSelect&&BD.emitSelect(); }); };
T.addColor=function(c){ c=hex6(c)||c; if(!S.styles.colors.includes(c)) S.styles.colors.push(c); BD.scheduleSave(); };
})();
