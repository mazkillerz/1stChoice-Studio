/* Highlight covers: a set of round covers for Instagram story highlights, one cover per page.
   Each cover is an icon, a word or a photo, centred in the circle Instagram shows (1080×1920, the circle is the middle 1080).
   The look (style, shape, colours) is shared by every cover so the set matches; saving makes one numbered PNG per cover. */
const HL_ICONS=[
  ['pin','Places'],['chat','Chat'],['star','Reviews'],['heart','Love'],['coffee','Coffee'],['snowflake','Cold'],
  ['gift','Offers'],['tag','Prices'],['percent','Deals'],['truck','Delivery'],['store','Shop'],['map','Map'],
  ['clock','Hours'],['calendar','Events'],['sparkles','New'],['bolt','Energy'],['sun','Day'],['fire','Hot'],
  ['smile','Fun'],['thumb','Likes'],['crown','Best'],['phone','Call'],['camera','Photos'],['music','Music']
];
const HL_PATHS={
  pin:'M20 10C20 16 12 22 12 22C12 22 4 16 4 10A8 8 0 0 1 20 10Z M15 10A3 3 0 1 1 9 10A3 3 0 1 1 15 10Z',
  chat:'M21 11.5A8.5 8.5 0 0 1 8.4 19L3 21L5 15.6A8.5 8.5 0 1 1 21 11.5Z',
  star:'M12 2L15.1 8.3L22 9.3L17 14.1L18.2 21L12 17.8L5.8 21L7 14.1L2 9.3L8.9 8.3Z',
  heart:'M20.8 4.6A5.5 5.5 0 0 0 13 4.6L12 5.7L11 4.6A5.5 5.5 0 0 0 3.2 12.4L4.2 13.5L12 21L19.8 13.5L20.8 12.4A5.5 5.5 0 0 0 20.8 4.6Z',
  coffee:'M17 8H18A4 4 0 0 1 18 16H17 M3 8H17V17A4 4 0 0 1 13 21H7A4 4 0 0 1 3 17Z M6 2V4 M10 2V4 M14 2V4',
  snowflake:'M12 2V22 M2 12H22 M4.9 4.9L19.1 19.1 M19.1 4.9L4.9 19.1 M9 3L12 6L15 3 M9 21L12 18L15 21 M3 9L6 12L3 15 M21 9L18 12L21 15',
  gift:'M3 8H21V12H3Z M5 12V21H19V12 M12 8V21 M12 8C10 4 7 4 7 6C7 8 12 8 12 8 M12 8C14 4 17 4 17 6C17 8 12 8 12 8',
  tag:'M20.6 13.4L13.4 20.6A2 2 0 0 1 10.6 20.6L2 12V2H12L20.6 10.6A2 2 0 0 1 20.6 13.4Z M7.5 7.5L7.6 7.5',
  percent:'M19 5L5 19 M9 6.5A2.5 2.5 0 1 1 4 6.5A2.5 2.5 0 1 1 9 6.5Z M20 17.5A2.5 2.5 0 1 1 15 17.5A2.5 2.5 0 1 1 20 17.5Z',
  truck:'M1 3H16V16H1Z M16 8H20L23 11V16H16 M7.5 18.5A2.5 2.5 0 1 1 2.5 18.5A2.5 2.5 0 1 1 7.5 18.5Z M20.5 18.5A2.5 2.5 0 1 1 15.5 18.5A2.5 2.5 0 1 1 20.5 18.5Z',
  store:'M3 9L4.5 3H19.5L21 9 M3 9H21V10A3 3 0 0 1 15 10A3 3 0 0 1 9 10A3 3 0 0 1 3 10Z M5 12V21H19V12 M10 21V15H14V21',
  map:'M9 4L3 6V20L9 18L15 20L21 18V4L15 6Z M9 4V18 M15 6V20',
  clock:'M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M12 6V12L16 14',
  calendar:'M5 4H19A2 2 0 0 1 21 6V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V6A2 2 0 0 1 5 4Z M16 2V6 M8 2V6 M3 10H21',
  sparkles:'M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1Z M19 15L19.8 17.2L22 18L19.8 18.8L19 21L18.2 18.8L16 18L18.2 17.2Z',
  bolt:'M13 2L3 14H12L11 22L21 10H12Z',
  sun:'M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12Z M12 2V4 M12 20V22 M4.9 4.9L6.3 6.3 M17.7 17.7L19.1 19.1 M2 12H4 M20 12H22 M6.3 17.7L4.9 19.1 M19.1 4.9L17.7 6.3',
  fire:'M12 22C7 22 4 18.5 4 14.5C4 10 8 7 9 2C12 4 13 7 12.5 9.5C14 8.5 15 7 15 5.5C18 8 20 11 20 14.5C20 18.5 17 22 12 22Z',
  smile:'M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12Z M8 14C9 16 15 16 16 14 M9 9L9.1 9 M15 9L15.1 9',
  thumb:'M7 10V21H4V10Z M7 10L11 2A3 3 0 0 1 14 5V9H19.5A2 2 0 0 1 21.5 11.3L20.1 19.3A2 2 0 0 1 18.1 21H7',
  crown:'M2 18L4 7L9 11L12 4L15 11L20 7L22 18Z M2 21H22',
  phone:'M22 16.9V19.9A2 2 0 0 1 19.8 21.9A19.8 19.8 0 0 1 11.2 18.8A19.5 19.5 0 0 1 5.2 12.8A19.8 19.8 0 0 1 2.1 4.2A2 2 0 0 1 4.1 2H7.1A2 2 0 0 1 9.1 3.7C9.2 4.6 9.5 5.5 9.8 6.4A2 2 0 0 1 9.3 8.5L8 9.8A16 16 0 0 0 14 15.8L15.3 14.5A2 2 0 0 1 17.4 14.1C18.3 14.4 19.2 14.7 20.1 14.8A2 2 0 0 1 22 16.9Z',
  camera:'M7 2H17A5 5 0 0 1 22 7V17A5 5 0 0 1 17 22H7A5 5 0 0 1 2 17V7A5 5 0 0 1 7 2Z M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12Z M17.5 6.5L17.6 6.5',
  music:'M9 18V5L21 3V16 M9 18A3 3 0 1 1 3 18A3 3 0 1 1 9 18Z M21 16A3 3 0 1 1 15 16A3 3 0 1 1 21 16Z'
};
const hlIc=id=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${HL_PATHS[id]}"/></svg>`;
const hsw=(bg,disc)=>`<span class="swatch" style="background:${bg}"><i style="left:6px;right:6px;top:9px;bottom:9px;border-radius:50%;background:${disc}"></i></span>`;
/* Product cover: a brand asset (picture files of the brand kit, not the tinted logo) inside the circle. No assets in the kit = no Product type. */
const hlProducts=b=>((b&&b.assets)||[]).filter(a=>a.file&&!a.tint);
const HL_DIMS=new Map();   // asset id -> width/height of its picture, so it can be fitted to the circle
function hlDims(b,a){
  if(HL_DIMS.has(a.id)) return HL_DIMS.get(a.id);
  HL_DIMS.set(a.id,null);
  const i=new Image(); i.onload=()=>HL_DIMS.set(a.id,i.width/i.height); i.src=b.base+(a.prev||a.file);
  return null;
}
/* Emoji cover (1.14.0): one big emoji from tools/highlight-emoji.js, drawn as vector paths (36-unit box).
   No list loaded = no Emoji type. A colour from the layer bar draws it as a one-colour silhouette. */
const HL_EMO=Array.isArray(window.HL_EMOJI)?window.HL_EMOJI:[];
const hlEmo=id=>HL_EMO.find(e=>e[0]===id)||HL_EMO[0];
const HL_P2D=new Map();
function hlEmoji(c,id,x,y,s,color){
  const e=hlEmo(id); if(!e) return;
  c.save(); c.translate(x,y); c.scale(s/36,s/36);
  e[3].forEach(([fill,d,op],i)=>{ const k=e[0]+i; if(!HL_P2D.has(k)) HL_P2D.set(k,new Path2D(d)); c.globalAlpha=color?1:(op==null?1:op); c.fillStyle=color||fill; c.fill(HL_P2D.get(k)); });
  c.restore();
}
const hlEmoSvg=e=>`<svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">${e[3].map(([f,d,op])=>`<path fill="${f}" d="${d}"${op!=null?` opacity="${op}"`:''}/>`).join('')}</svg>`;
/* draw an icon (24-unit path) centred at cx,cy, s px wide */
function hlIcon(c,id,cx,cy,s,color,weight){
  c.save();
  const k=s/24; c.translate(cx-12*k,cy-12*k); c.scale(k,k);
  c.strokeStyle=color; c.lineWidth=weight; c.lineCap='round'; c.lineJoin='round'; c.stroke(new Path2D(HL_PATHS[id]||HL_PATHS.star)); c.restore();
}
Studio.tool({
  id:'highlight', title:'Highlight covers', fileName:'highlight',
  safe:{top:0,bottom:0},
  pages:{min:1,max:12,start:4}, pageNoun:{one:'cover',many:'covers',set:'set of covers'},
  photos:{count:1}, sampleNote:'A photo cover fills the whole circle. Keep the important part in the middle.',
  pagePhotos:value=>value('kind')==='photo'?1:0, quickKind:'photo',
  stylesTitle:'All covers',
  styles:[
    {id:'white',label:'White',swatch:hsw('#fff','var(--b-panel,#f2f2f2)')},
    {id:'cream',label:'Cream',swatch:hsw('var(--b-cream,#f4efe6)','var(--b-blob,#e6e0d8)')},
    {id:'black',label:'Black',swatch:hsw('#000','#2a2826')}
  ],
  fields:[
    {id:'shape',type:'seg',in:'style',label:'Behind the icon',options:[{v:'disc',l:'Circle'},{v:'ring',l:'Ring'},{v:'plain',l:'Nothing'}],global:true},
    {id:'weight',type:'seg',in:'style',label:'Line weight',options:[{v:'1.3',l:'Thin'},{v:'1.8',l:'Regular'},{v:'2.4',l:'Bold'}],default:'1.8',global:true},
    {id:'bg',type:'color',in:'style',label:'Background colour',default:null,auto:'Style colour',global:true},
    {id:'ink',type:'color',in:'style',label:'Icon and word colour',default:null,auto:'Style colour',global:true},
    {id:'guide',type:'toggle',in:'style',label:'Show the circle Instagram crops to (preview only)',default:true,global:true},
    {id:'gThis',type:'note',in:'style',label:'This cover'},
    {id:'kind',type:'seg',in:'style',label:'Cover type',options:b=>[{v:'icon',l:'Icon'},{v:'word',l:'Word'},{v:'photo',l:'Photo'},...(hlProducts(b).length?[{v:'product',l:'Product'}]:[]),...(HL_EMO.length?[{v:'emoji',l:'Emoji'}]:[])],default:'icon'},
    {id:'product',type:'seg',in:'style',label:'Product',cols:3,options:b=>{ const l=hlProducts(b); return l.length?l.map(a=>({v:a.id,l:a.label,ic:`<img alt="" src="${b.base+(a.prev||a.file)}" style="width:44px;height:44px;object-fit:contain">`})):[{v:'',l:''}]; },default:b=>(hlProducts(b)[0]||{}).id||'',when:{field:'kind',is:'product'}},
    {id:'icon',type:'seg',in:'style',label:'Icon',cols:4,options:HL_ICONS.map(([v,l])=>({v,l,ic:hlIc(v)})),pageDefault:pg=>HL_ICONS[pg%HL_ICONS.length][0],when:{field:'kind',is:'icon'}},
    {id:'emoji',type:'seg',in:'style',label:'Emoji',cols:4,options:HL_EMO.length?HL_EMO.map(e=>({v:e[0],l:e[2],ic:hlEmoSvg(e)})):[{v:'',l:''}],pageDefault:pg=>(HL_EMO[pg%Math.max(1,HL_EMO.length)]||[''])[0],when:{field:'kind',is:'emoji'}},
    {id:'word',type:'text',label:'Word on the cover',placeholder:b=>(b.phrases&&b.phrases.write)||'',when:{field:'kind',is:'word'}},
    {id:'sub',type:'text',label:'Small word under the icon',toggle:true,on:false,placeholder:b=>(b.phrases&&b.phrases.write)||'',when:{field:'kind',is:'icon'}}
  ],
  draw(h,o){
    const {ctx,W,H,C}=h, st=o.style, kind=o.value('kind'), bgc=o.value('bg');
    const ground=bgc||(st==='black'?C.night:st==='cream'?(C.cream||C.paper):C.paper), dark=!h.isLight(ground);
    const ink=o.value('ink')||(dark?(C.accent||C.paper):(st==='cream'?(C.brown||C.ink):C.ink));
    const disc=dark?'rgba(255,255,255,.08)':(st==='cream'&&!bgc?(C.blob||C.panel):(C.panel||'#f2f2f2'));
    const cx=W/2, cy=H/2, R=W/2;   // the circle Instagram shows
    ctx.fillStyle=ground; ctx.fillRect(0,0,W,H);
    if(kind==='photo'){ h.photo(0,0,0,W,H,{mode:'cover'}); h.text('word','Word','',0,0); h.text('sub','Small word','',0,0); }
    else {
      const shape=o.value('shape');
      if(shape==='disc'){ ctx.fillStyle=disc; ctx.beginPath(); ctx.arc(cx,cy,R*.86,0,Math.PI*2); ctx.fill(); }
      else if(shape==='ring'){ ctx.strokeStyle=ink; ctx.lineWidth=16; ctx.beginPath(); ctx.arc(cx,cy,R*.82,0,Math.PI*2); ctx.stroke(); }
      if(kind==='word'){
        const word=o.value('word'), m=h.measure(word||' ',{font:'display',size:230,maxW:700});
        h.text('word','Word',word,cx,cy-m.h/2,{font:'display',size:230,color:ink,maxW:700});
        if(!word&&o.preview){ ctx.save(); ctx.fillStyle=dark?'rgba(255,255,255,.35)':'rgba(0,0,0,.25)'; ctx.font='800 54px "'+h.brand.fonts.body+'"'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('Type a word in Words',cx,cy); ctx.restore(); }
        h.text('sub','Small word','',0,0);
      } else if(kind==='emoji'){
        const s=560, id=o.value('emoji');
        h.block('emoji','Emoji',cx-s/2,cy-s/2,s,s,(c,color)=>hlEmoji(c,id,0,0,s,color),'shape');
        h.text('word','Word','',0,0); h.text('sub','Small word','',0,0);
      } else if(kind==='product'){
        const a=hlProducts(h.brand).find(x=>x.id===o.value('product'));
        if(a){
          const ar=hlDims(h.brand,a)||.8, bw=Math.min(620,740*ar), bh=bw/ar;
          h.asset({id:'product',ref:a.id,label:a.label,x:cx,y:cy,w:Math.round(bw)});
          h.block('product',a.label,cx-bw/2,cy-bh/2,bw,bh,()=>{},'asset');   // keeps the layer steady while the picture loads
        }
        h.text('word','Word','',0,0); h.text('sub','Small word','',0,0);
      } else {
        const id=o.value('icon'), sub=o.value('sub'), wt=+o.value('weight')||1.8;
        const s=sub?360:460, sm=sub?h.measure(sub,{weight:'800',size:84,maxW:620}):{h:0}, gap=sub?36:0, top=cy-(s+gap+sm.h)/2;
        h.block('icon','Icon',cx-s/2,top,s,s,(c,color)=>hlIcon(c,id,s/2,s/2,s,color||ink,wt),'shape');
        h.text('sub','Small word',sub,cx,top+s+gap,{weight:'800',size:84,color:ink,maxW:620});
        h.text('word','Word','',0,0);
      }
    }
    /* preview only: dim what Instagram crops away and outline the circle */
    if(o.preview&&o.value('guide')){
      ctx.save(); ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.rect(0,0,W,H); ctx.arc(cx,cy,R,0,Math.PI*2,true); ctx.fill('evenodd');
      ctx.setLineDash([18,14]); ctx.strokeStyle='rgba(255,45,135,.9)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,R-2,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
  }
});
