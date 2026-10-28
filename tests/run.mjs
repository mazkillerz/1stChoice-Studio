/* Run several suites at the same time and print one line each (name, pass, fail, seconds, first fails).
   Usage:  node tests/run.mjs smoke taste pins        the suites named
           node tests/run.mjs --changed [base]        smoke + taste + the suites mapped to the files changed since base
                                                      (default: origin/main, fetched first, so a stale local main never makes it run everything)
           node tests/run.mjs --quick                 smoke + taste + only the suites in tests/ you added or changed (while you work)
           --dry                                      only print which suites it would run, and why
   assets/studio.js is mapped by WHERE it changed: lines inside tool() run the tool-page suites, lines inside home() the hub
   suites, a change to the VERSION line only What's New; anything else in it runs both.
   The slowest suites start first, so the run ends when the longest one does (see SLOW).
           JOBS=4 sets how many run at once (default: CPU count, at most 4).
   Each suite has its own browser and pages, so they do not share state; the http-server on :8080 serves them all. */
import { spawn, execSync } from 'child_process';
import os from 'os';
import fs from 'fs';

/* file pattern → suites (mirrors the test map in .claude/skills/studio-improver/SKILL.md) */
const MAP=[
  [/^tools\/|assets\/studio\.js/,['full','v5','polish','queue','queue-keep','copystyle']],
  [/assets\/studio\.(js|css)|index\.html/,['home7-hub','home7-saved','pins','pinorder','fresh','peek','select','extra','cardnames','alltools-cam','simplify','quickpages']],
  [/assets\/search\./,['search','polish71-search','create-search']],
  [/tools\/create/,['create','create-search']],
  [/changelog\.md|whatsnew/,['whatsnew']],
  [/sw\.js|manifest/,['share']],
  [/assets\/studio\.css/,['contrast','polish71-saved','polish71-bar']],
  [/^lab\//,['lab','lab-pro','board-penpot']],
  [/assets\/templates\.|brands\//,['templates','postpresets']],
  [/tools\/create-templates|assets\/search\./,['postpresets']],
  [/assets\/welcome\./,['welcome']],
  [/tools\/restock/,['restock-styles']],[/tools\/photo-story/,['photostory-styles']],[/tools\/collage/,['collage-grids']],
  [/tools\/highlight|tools\/carousel/,['highlight','highlight-product','quickpages','batch']],
  [/assets\/batch\.js/,['batch']],
];
let names=process.argv.slice(2);
const dry=names.includes('--dry'); names=names.filter(n=>n!=='--dry');
const SKIP=['run','shot','tapscan','tplthumbs','look8','seed'];
const TOOL_SUITES=['full','v5','polish','queue','queue-keep','copystyle','batch','home7-save'],
      HUB_SUITES=['home7-hub','home7-saved','pins','pinorder','fresh','peek','select','extra','cardnames','search','queue-keep','alltools-cam','simplify','quickpages'];
const sh=c=>execSync(c,{encoding:'utf8',stdio:['ignore','pipe','ignore']});
const why={}; const add=(set,list,r)=>list.forEach(x=>{ if(!set.has(x)){ set.add(x); why[x]=r; } });
/* the part of studio.js a set of changed lines falls in: tool(), home(), the VERSION line, or anything else */
function studioParts(base){
  let diff=''; try{ diff=sh(`git diff -U0 ${base} -- assets/studio.js`); }catch(_){ return ['other']; }
  const src=require_('assets/studio.js').split('\n'), starts=[]; src.forEach((l,i)=>{ const m=l.match(/^(?:async )?function (\w+)/); if(m) starts.push([i+1,m[1]]); });
  const fnAt=n=>{ let f=null; for(const [ln,name] of starts){ if(ln<=n) f=name; else break; } return f; };
  const parts=new Set();
  for(const h of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)){ const a=+h[1], c=h[2]===undefined?1:+h[2];
    for(let n=a;n<a+Math.max(c,1);n++){ const line=src[n-1]||''; if(/^const VERSION=/.test(line)){ parts.add('version'); continue; } const f=fnAt(n); parts.add(f==='tool'?'tool':f==='home'?'home':'other'); } }
  return [...parts]; }
function require_(f){ return fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'); }
if(names[0]==='--changed'||names[0]==='--quick'){
  const quick=names[0]==='--quick';
  let base=names[1];
  if(!base){ try{ sh('git fetch -q origin main'); base='origin/main'; }catch(_){ try{ sh('git rev-parse -q --verify origin/main'); base='origin/main'; }catch(_){ base='main'; } } }
  const files=sh(`git diff --name-only ${base} && git ls-files --others --exclude-standard`).split('\n').filter(Boolean);
  const set=new Set(); add(set,['smoke','taste'],'every run');
  for(const f of files){
    const m=f.match(/^tests\/([\w-]+)\.mjs$/); if(m&&!SKIP.includes(m[1])) add(set,[m[1]],'suite changed');
    if(quick) continue;
    if(f==='assets/studio.js'){ const parts=studioParts(base);
      if(parts.includes('tool')||parts.includes('other')) add(set,TOOL_SUITES,'studio.js: tool pages');
      if(parts.includes('home')||parts.includes('other')) add(set,HUB_SUITES,'studio.js: hub');
      if(parts.includes('version')) add(set,['whatsnew'],'studio.js: VERSION'); }
    for(const [re,s2] of MAP) if(re.test(f)&&!(f==='assets/studio.js'&&re.source.includes('studio'))) add(set,s2,f); }
  names=[...set];
  console.log('Compared with '+base+': '+files.length+' file(s) changed');
}
if(dry){ names.forEach(n=>console.log('  '+n.padEnd(18)+(why[n]||'named'))); process.exit(0); }
if(!names.length){ console.log('Name suites, or use --changed'); process.exit(2); }
const JOBS=+process.env.JOBS||Math.min(4,os.cpus().length);
console.log(`Running ${names.length} suites, ${JOBS} at a time: ${names.join(' ')}`);
const t0=Date.now(), out=[];
const runOne=name=>new Promise(res=>{ const t=Date.now(); let log='';
  const p=spawn(process.execPath,[`tests/${name}.mjs`],{env:process.env});
  p.stdout.on('data',d=>log+=d); p.stderr.on('data',d=>log+=d);
  p.on('close',code=>{ const lines=log.split('\n'), fails=lines.filter(l=>l.startsWith('FAIL'));
    const r={name,code,pass:lines.filter(l=>l.startsWith('PASS')).length,fails,s:((Date.now()-t)/1000).toFixed(0),tail:code&&!fails.length?lines.filter(Boolean).slice(-3):[]};
    console.log(`${code?'✗':'✓'} ${name}  pass ${r.pass}  fail ${fails.length}  ${r.s}s`); out.push(r); res(); }); });
/* longest first (seconds on a 4-core sandbox, Oct 2026), so the slow ones are not left running alone at the end */
const SLOW={'collage-grids':210,full:180,'polish71-saved':110,'home7-hub':85,batch:75,postpresets:80,'queue-keep':70,'restock-styles':65,contrast:77,welcome:63,quicksave:55,queue:60,v5:50,taste:51,
  'home7-save':37,smoke:35,select:35,'home7-saved':33,'alltools-cam':23,'polish71-bar':16,'polish71-search':15};
const queue=[...names].sort((a,b)=>(SLOW[b]||30)-(SLOW[a]||30));
await Promise.all(Array.from({length:Math.min(JOBS,queue.length)},async()=>{ while(queue.length) await runOne(queue.shift()); }));
const bad=out.filter(r=>r.code);
for(const r of bad){ console.log(`\n${r.name}:`); [...r.fails.slice(0,3),...r.tail].forEach(l=>console.log('  '+l)); }
console.log(`\n${bad.length?bad.length+' suite(s) failed':'All green'} in ${((Date.now()-t0)/1000).toFixed(0)}s`);
process.exit(bad.length?1:0);
