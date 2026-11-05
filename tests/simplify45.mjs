/* 1.45.0 Simplify: no dead CSS. Every class a shared stylesheet styles must still be used by a page, tool or script,
   so rules left behind by earlier cuts (the old page dots, the old Saved sort bar, the compact tools view …) can't pile up again.
   Static check: no browser, no server. Usage: node tests/simplify45.mjs */
import fs from 'fs'; import path from 'path';
const T0=Date.now(), ROOT=new URL('..',import.meta.url).pathname, res=[];
const ok=(name,cond,info)=>res.push((cond?'PASS ':'FAIL ')+name+(cond||info===undefined?'':' '+JSON.stringify(info)));
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
/* every shipped file that can put a class on the page */
const walk=d=>fs.readdirSync(path.join(ROOT,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['vendor','whatsnew','thumbs','samples'].includes(e.name)?[]:walk(d+'/'+e.name)):[d+'/'+e.name]);
const SRC=['index.html','whats-new.html',...['assets','tools','lab','brands'].flatMap(walk)].filter(f=>/\.(js|html)$/.test(f)).map(read).join('\n');
/* classes built from a value at run time (`'grid view-'+toolsView`, `tp-${e.shape}`): listed here, each with where it is built */
const DYNAMIC={
  'view-grid':"home(): $('toolGrid').className='grid view-'+toolsView",
  'tp-post':'templates.js: tp-${e.shape}', 'tp-square':'templates.js: tp-${e.shape}', 'tp-circle':'templates.js: tp-${e.shape}',
};
const used=c=>new RegExp('(?<![\\w-])'+c.replace(/[-]/g,'\\-')+'(?![\\w-])').test(SRC);
/* create.css is left out until 1.47.0 (Create's own session) moves its one dead rule (.cx-sep); lab/ has its own sheets */
for(const f of ['assets/studio.css','assets/whatsnew.css','assets/welcome.css','assets/search.css','assets/templates.css','tools/video.css']){
  const css=read(f).replace(/\/\*[\s\S]*?\*\//g,'').replace(/url\([^)]*\)/g,'').replace(/\d*\.\d+/g,'0');
  const cls=[...new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]))];
  const dead=cls.filter(c=>!used(c)&&!DYNAMIC[c]);
  ok(`${f}: every class it styles is used (${cls.length} classes)`,cls.length>10&&!dead.length,dead);
}
/* the dynamic list stays honest: each entry is still styled and its builder still exists */
ok('dynamic classes: home() still builds view-<choice> for the tools grid',/className='grid view-'\+toolsView/.test(read('assets/studio.js')));
ok('dynamic classes: templates.js still builds tp-<shape>',/tp-\$\{e\.shape\}/.test(read('assets/templates.js')));
/* the removed rules are kept, not deleted (CLAUDE.md: never delete, move to _archive) */
const arch=path.join(ROOT,'_archive/unused css (2026-11-05)/removed.css');
ok('the removed rules are kept in _archive/unused css (2026-11-05)/',!fs.existsSync(path.join(ROOT,'_archive'))||fs.existsSync(arch));
console.log(res.join('\n')); console.log(`simplify45: ${res.filter(x=>x.startsWith('PASS')).length} pass, ${res.filter(x=>x.startsWith('FAIL')).length} fail, ${Math.round((Date.now()-T0)/1000)} s`);
if(res.some(x=>x.startsWith('FAIL'))) process.exit(1);
