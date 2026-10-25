/* Run several suites at the same time and print one line each (name, pass, fail, seconds, first fails).
   Usage:  node tests/run.mjs smoke taste pins        the suites named
           node tests/run.mjs --changed [base]        smoke + taste + the suites mapped to the files changed since base (default main)
           JOBS=4 sets how many run at once (default: CPU count, at most 4).
   Each suite has its own browser and pages, so they do not share state; the http-server on :8080 serves them all. */
import { spawn, execSync } from 'child_process';
import os from 'os';

/* file pattern → suites (mirrors the test map in .claude/skills/studio-improver/SKILL.md) */
const MAP=[
  [/^tools\/|assets\/studio\.js/,['full','v5','polish']],
  [/assets\/studio\.(js|css)|index\.html/,['home7','pins','pinorder','fresh']],
  [/assets\/search\./,['search']],
  [/tools\/create/,['create']],
  [/changelog\.md|whatsnew/,['whatsnew']],
  [/sw\.js|manifest/,['share']],
  [/assets\/studio\.css/,['contrast','polish71']],
  [/^lab\//,['lab','lab-pro','board-penpot']],
  [/assets\/templates\.|brands\//,['templates']],
  [/assets\/welcome\./,['welcome']],
  [/tools\/restock/,['restock-styles']],[/tools\/photo-story/,['photostory-styles']],[/tools\/collage/,['collage-grids']],
  [/tools\/highlight|tools\/carousel/,['highlight','quickpages']],
];
let names=process.argv.slice(2);
if(names[0]==='--changed'){
  const base=names[1]||'main';
  const files=execSync(`git diff --name-only ${base} && git ls-files --others --exclude-standard`,{encoding:'utf8'}).split('\n').filter(Boolean);
  const set=new Set(['smoke','taste']);
  for(const f of files){ for(const [re,s] of MAP) if(re.test(f)) s.forEach(x=>set.add(x)); const m=f.match(/^tests\/([\w-]+)\.mjs$/); if(m&&!['run','shot','tapscan','tplthumbs','look8','seed'].includes(m[1])) set.add(m[1]); }
  names=[...set];
}
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
const queue=[...names];
await Promise.all(Array.from({length:Math.min(JOBS,queue.length)},async()=>{ while(queue.length) await runOne(queue.shift()); }));
const bad=out.filter(r=>r.code);
for(const r of bad){ console.log(`\n${r.name}:`); [...r.fails.slice(0,3),...r.tail].forEach(l=>console.log('  '+l)); }
console.log(`\n${bad.length?bad.length+' suite(s) failed':'All green'} in ${((Date.now()-t0)/1000).toFixed(0)}s`);
process.exit(bad.length?1:0);
