"""National Day boards -> Studio Create documents with EVERY piece as its own layer
(pictures, photos, shapes, shades, text), in painting order. Usage: python3 layers.py OUTDIR"""
import re, os, sys, json
from playwright.sync_api import sync_playwright
S='/tmp/claude-0/-home-claude/ae0b4aef-7ca8-507d-8711-f5296d3f6a33/scratchpad'
exec(open(S+'/nd/qa/qa.py').read().split('names=sys.argv')[0])
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
BOARDS=json.load(open(os.environ.get('BOARDS',os.path.join(os.path.dirname(os.path.abspath(__file__)),'boards.json'))))
JS=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'layers.js')).read()
res={}
with sync_playwright() as p:
    br=p.chromium.launch(args=['--allow-file-access-from-files'])
    for bd in BOARDS:
        n=bd['board']
        t=open(S+f'/ndcanvas/project/{n}.dc.html').read(); body=t[t.index('<x-dc>')+6:t.index('</x-dc>')]
        body=re.sub(r'<link[^>]+googleapis[^>]+>','',body).replace('<helmet>','').replace('</helmet>','')
        for k,v in M.items(): body=body.replace('/_blob/'+k,'file://'+v)
        html=OUT+f'/{n}.html'
        open(html,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}</style></head><body style="margin:0">{body}</body></html>')
        w,h=map(int,re.search(r'"width":(\d+),"height":(\d+)',t).groups())
        pg=br.new_page(viewport={'width':w,'height':h},device_scale_factor=2); pg.goto('file://'+html); pg.wait_for_timeout(1200)
        pg.screenshot(path=OUT+f'/{bd["id"]}-full.png')
        r=pg.evaluate(JS)
        # clipped groups (overflow hidden): one picture each, transparent outside the clip
        for j,fl in enumerate(r['flatten']):
            loc=pg.locator(f'[data-flat="{fl["key"]}"]')
            pg.evaluate('''k=>{const el=document.querySelector(`[data-flat="${k}"]`); const keep=new Set([...el.querySelectorAll('*'),el]);
              for(let a=el.parentElement;a;a=a.parentElement) keep.add(a);
              document.querySelectorAll('body *').forEach(e=>{ if(!keep.has(e)){ e.dataset.vis='1'; e.style.visibility='hidden'; } });
              for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){ a.dataset.bg=a.style.background||' '; a.style.background='transparent'; } }''',fl['key'])
            f=OUT+f'/{bd["id"]}-flat{j}.png'; loc.screenshot(path=f,omit_background=True); fl['file']=f; bb=loc.bounding_box(); fl['bbox']=bb
            pg.evaluate('''()=>{ document.querySelectorAll('[data-vis]').forEach(e=>{ e.style.visibility=''; delete e.dataset.vis; }); document.querySelectorAll('[data-bg]').forEach(e=>{ e.style.background=e.dataset.bg.trim(); delete e.dataset.bg; }); }''')
        pg.close(); res[bd['id']]=r; print(bd['id'],len(r['nodes']),'flat',len(r['flatten']))
    br.close()
old=json.load(open(OUT+'/layers.json')) if os.path.exists(OUT+'/layers.json') else {}
old.update(res); json.dump(old,open(OUT+'/layers.json','w'),ensure_ascii=False,indent=1)
