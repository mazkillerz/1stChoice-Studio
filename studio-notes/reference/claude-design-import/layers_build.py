"""Layered Create documents + brand assets from lout/layers.json. Writes into the repo; prints a summary.
Assets: art pieces visible in Add asset (group National Day 2026); photos and one-off clip pictures hidden."""
import json, os, re, shutil, uuid
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__)); L=json.load(open(HERE+'/lout/layers.json')); BOARDS=json.load(open(HERE+'/boards.json'))
REPO='/home/claude/1stchoice-studio/brands/1stchoice'
S='/tmp/claude-0/-home-claude/ae0b4aef-7ca8-507d-8711-f5296d3f6a33/scratchpad'
uid=lambda: uuid.uuid4().hex[:10]
KNOWN={'cat-upper.png':('nd26-cat-upper','Omani cat · kumma'),'cat-upper-wink.png':('nd26-cat-upper-wink','Omani cat · wink'),'cat-head.png':('nd26-cat-head','Omani cat · head'),
       'crayon-flag.png':('nd26-flag','Crayon flag'),'fw-red.png':('nd26-fw-red','Crayon firework · red'),'fw-green.png':('nd26-fw-green','Crayon firework · green'),'sweep-band.png':('nd26-sweep','Grey crayon sweep'),
       'cat-head-wink.png':('nd26-cat-head-wink','Omani cat · head, wink'),'sweep-pfp.png':('nd26-sweep-corner','Grey crayon sweep · corner'),'kumma-band.svg':('nd26-kumma-band','Kumma band'),
       'badge-red.png':('nd26-badge-red','Red crayon sticker'),'logo-c3.svg':('nd26-logo','Logo · National Day'),'logo-c3-white.svg':('nd26-logo-white','Logo · National Day, white'),
       'scribble-black.png':('nd26-scribble','Black crayon scribble'),'scribble-black-60.png':('nd26-scribble-soft','Black crayon scribble · soft'),
       'sticker-cat-up.png':('nd26-sticker-cat','Sticker · cat'),'sticker-cat-wink.png':('nd26-sticker-cat-wink','Sticker · cat, wink'),'sticker-flag.png':('nd26-sticker-flag','Sticker · flag'),
       'fw-white.png':('nd26-fw-white','Crayon firework · white'),'ring-white.png':('nd26-ring','Hand-drawn loop · white'),'arrow-white.png':('nd26-arrow','Hand-drawn arrow · white')}
assets={}   # id -> entry
def asset_for(src):
    f=os.path.basename(src)
    if f.lower().endswith('.jpg'):
        aid='nd26-photo-'+re.sub(r'[^a-z0-9]+','-',f[:-4].lower()).strip('-')
        if aid not in assets:
            os.makedirs(REPO+'/assets/nd26/photos',exist_ok=True); shutil.copy(src,REPO+'/assets/nd26/photos/'+f)
            assets[aid]=dict(id=aid,label='Photo · '+f[:-4],file='assets/nd26/photos/'+f,group='National Day 2026',hidden=True)
        return aid,'image'
    aid,label=KNOWN.get(f,('nd26-'+re.sub(r'[^a-z0-9]+','-',f.rsplit('.',1)[0].lower()),f))
    if aid not in assets:
        os.makedirs(REPO+'/assets/nd26/parts',exist_ok=True); shutil.copy(src,REPO+'/assets/nd26/parts/'+f)
        e=dict(id=aid,label=label,file='assets/nd26/parts/'+f,group='National Day 2026',noFlip=True)
        if not f.endswith('.svg'):
            os.makedirs(REPO+'/assets/prev/nd26',exist_ok=True); p=Image.open(src); p.thumbnail((400,400)); pv='assets/prev/nd26/'+f.rsplit('.',1)[0]+'.webp'; p.save(REPO+'/'+pv,'WEBP',quality=82); e['prev']=pv
        assets[aid]=e
    return aid,'asset'
GEO=('x','y','rotation','scaleX','scaleY')
def geo(n): a={k:n[k] for k in GEO}; [a.pop(k) for k in ('rotation',) if abs(a[k])<1e-3]; [a.pop(k) for k in ('scaleX','scaleY') if abs(a[k]-1)<1e-4]; return a
SH=('shadowColor','shadowOffsetX','shadowOffsetY','shadowBlur','shadowEnabled')
docs={}; tpl_ids=[]
for bd in BOARDS:
    i=bd['id']; r=L[i]; W,H=int(r['w']),int(r['h']); kids=[{'c':'Rect','a':{'name':'frame-bg','width':W,'height':H,'fill':r['bg']}}]
    for n in r['nodes']:
        op={'opacity':n['opacity']} if n.get('opacity',1)<0.999 else {}
        if n['t']=='img':
            aid,kind=asset_for(n['src'])
            a={'id':uid(),'name':'obj','kind':kind,'imgId':'brand:'+aid,'width':round(n['w'],2),'height':round(n['h'],2),**geo(n),'cropZ':1,'focX':n['focX'],'focY':n['focY'],'label':n.get('alt') or assets[aid]['label'],**op}
            if n.get('cornerRadius'): a['cornerRadius']=round(n['cornerRadius'],2)
            a.update({k:n[k] for k in SH if k in n}); kids.append({'c':'Image','a':a})
        elif n['t']=='flat':
            fl=next(f for f in r['flatten'] if f['key']==n['key']); f=f'{i}-clip.png'
            os.makedirs(REPO+'/assets/nd26/parts',exist_ok=True); shutil.copy(fl['file'],REPO+'/assets/nd26/parts/'+f)
            aid='nd26-clip-'+i; assets[aid]=dict(id=aid,label=bd['label']+' · picture',file='assets/nd26/parts/'+f,group='National Day 2026',hidden=True)
            bb=fl['bbox']; kids.append({'c':'Image','a':{'id':uid(),'name':'obj','kind':'asset','imgId':'brand:'+aid,'width':round(bb['width'],2),'height':round(bb['height'],2),'x':round(bb['x'],2),'y':round(bb['y'],2),'cropZ':1,'focX':.5,'focY':.5,'label':'Picture',**op}})
        elif n['t']=='rect':
            a={'id':uid(),'name':'obj','kind':'rect','width':round(n['w'],2),'height':round(n['h'],2),**geo(n),'label':'Shade' if 'fillLinearGradientColorStops' in n else 'Shape',**op}
            for k in ('fill','cornerRadius','stroke','strokeWidth','fillLinearGradientStartPoint','fillLinearGradientEndPoint','fillLinearGradientColorStops','fillPriority',*SH):
                if n.get(k) not in (None,0,'') or k=='fill' and n.get(k): a[k]=n[k]
            if 'fill' not in a and 'fillLinearGradientColorStops' not in a: a['fill']=''
            kids.append({'c':'Rect','a':a})
        elif n['t']=='text':
            t=dict(n); rot=abs(t.get('rotation',0))>1e-3
            sl=round(t['w']*0.18+40); dx=-(sl if t['align']=='right' else sl/2 if t['align']=='center' else 0); w=t['w']+sl
            # shift the box left along the text's own direction (works when rotated too)
            import math; th=math.radians(t.get('rotation',0)); x=t['x']+dx*math.cos(th); y=t['y']+dx*math.sin(th)
            if t['lh']<=1.05: y+=round(t['fs']*0.12)*math.cos(th); x-=round(t['fs']*0.12)*math.sin(th)
            if not rot:
                if t['align']=='center': cx=x+w/2; half=min(w/2,cx,W-cx); x,w=cx-half,2*half
                else: l=max(0,x); rr=min(W,x+w); x,w=l,rr-l
            fam=t['fam']; style='normal' if fam in ('Lalezar','Modak') else str(t['wt'])
            a={'id':uid(),'name':'obj','kind':'text','text':t['text'],'autoW':False,'width':round(w),'x':round(x,1),'y':round(y,1),
               'fontFamily':fam,'fontSize':round(t['fs'],1),'fontStyle':style,'fill':t['col'] or {'red':'#DA291C','green':'#007A33'}.get(t.get('tex'),'#161210'),'align':t['align'],
               'lineHeight':round(t['lh'],3),'padding':0,'label':'Headline' if fam=='Lalezar' else 'Text',**op}
            if rot: a['rotation']=round(t['rotation'],3)
            if t.get('tex'):
                tid='nd26-crayon-'+t['tex']+('-solid' if t.get('solid') else ''); a['fillTex']='brand:'+tid; a['fillPriority']='pattern'
                if t.get('solid') and tid not in assets:
                    base=Image.open(S+f'/nd/theme/crayon-{t["tex"]}.png').convert('RGBA'); wb=Image.new('RGBA',base.size,(255,255,255,255)); wb.alpha_composite(base)
                    os.makedirs(REPO+'/assets/nd26/tex',exist_ok=True); wb.convert('RGB').save(REPO+f'/assets/nd26/tex/crayon-{t["tex"]}-solid.jpg',quality=90)
                    assets[tid]=dict(id=tid,label=f'Crayon {t["tex"]} on white (text fill)',file=f'assets/nd26/tex/crayon-{t["tex"]}-solid.jpg',group='National Day 2026',hidden=True)
            kids.append({'c':'Text','a':a})
    frame={'c':'Group','a':{'id':uid(),'x':0,'y':0,'kind':'frame','label':bd['label'],'fw':W,'fh':H,'clipX':0,'clipY':0,'clipWidth':W,'clipHeight':H,'tpl':i},'k':kids}
    json.dump({'v':1,'name':bd['label'],'nodes':[frame]},open(f'{REPO}/templates/nd26/{i}.json','w'),ensure_ascii=False)
    tpl_ids.append(i)
json.dump(list(assets.values()),open(HERE+'/lout/assets.json','w'),ensure_ascii=False,indent=1)
print(len(tpl_ids),'docs',len(assets),'assets',sum(1 for a in assets.values() if not a.get('hidden')),'visible')
