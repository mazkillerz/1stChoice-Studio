/* Run several suites at the same time and print one line each (name, pass, fail, seconds, first fails).
   Usage:  node tests/run.mjs smoke taste pins        the suites named
           node tests/run.mjs --changed [base]        smoke + taste + the suites mapped to the files changed since base
                                                      (default: origin/main, fetched first, so a stale local main never makes it run everything)
           node tests/run.mjs --quick                 smoke + taste + only the suites in tests/ you added or changed (while you work)
           node tests/run.mjs --all                   every suite except SKIP and the whole-file twins (home7, polish71, collage-grids: their PART files run instead)
           --dry                                      only print which suites it would run, and why
           NOQUIET=1                                  keep the fixed page.waitForTimeout sleeps as written (default: tests/_quiet.mjs ends a sleep early
                                                      when nothing is scheduled to happen in it; see that file)
   assets/studio.js is mapped by WHERE it changed: lines inside tool() run the tool-page suites, lines inside home() the hub
   suites, a change to the VERSION line only What's New; anything else in it runs both.
   The slowest suites start first, so the run ends when the longest one does (see SLOW).
           JOBS=4 sets how many run at once (default: CPU count, at most 4).
   --all prints the total wall time; the slowest five suites are listed so a new slow one shows up at once. Keep a suite under ~120 s: split it
   into PARTs like home7/polish71 (each part file sets process.env.PART and imports the whole file).
   Each suite has its own browser and pages, so they do not share state; the http-server on :8080 serves them all. */
import { spawn, execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
const sh0=c=>execSync(c,{encoding:'utf8',stdio:['ignore','pipe','ignore']});

/* file pattern → suites (mirrors the test map in .claude/skills/studio-improver/SKILL.md) */
const MAP=[
  /* 2.5.3 same-name guard */
  [/assets\/cloud\.js|tests\/fakecloud\.js|tools\/create\.js|assets\/studio\.js/,['same-name']],
  /* round 3 (2.3.0) */
  [/assets\/teamassets\.|assets\/cutout-pro/,['teamassets','cutout-pro']],[/assets\/ideas\./,['ideas']],[/assets\/kpis\./,['kpis']],[/assets\/cloud\.js|tests\/fakecloud\.js/,['teamassets','saveflow']],
  [/tools\/create\.js|tools\/video\.js|tools\/video-ui\.js|lab\/board-ui\.js|assets\/search\.js|assets\/welcome\.js/,['nav','saveflow']],
  /* mega round, Wave 2-3 (1.55.0) */
  [/assets\/cutout|assets\/vendor\/cutout/,['cutout']],
  [/assets\/calendar\.|assets\/captions\.|assets\/campaigns\./,['calendar','captions','campaigns']],
  [/assets\/review\./,['review']],[/assets\/rules\./,['rules','captions']],[/assets\/phrasebook\./,['phrasebook']],
  [/assets\/components\.js|tools\/create-lib\.js/,['components','goldens']],
  [/brands\/[\w-]+\/packs\/|tests\/kit\.mjs/,['packs','nd-templates','got-talent','goldens','templates']],
  [/tools\/create-import/,['create-import']],[/tools\/create-motion/,['create-motion']],[/tools\/create-resize/,['create-resize']],
  [/tools\/create\.js|tools\/create-core\.js/,['create-import','create-motion','create-resize','rules','campaigns']],
  [/assets\/cloud\.js|tests\/fakecloud\.js/,['calendar','review','captions','campaigns','phrasebook']],
  [/^lab\/(board|lab)\.css$/,['fixes54']],
  [/^assets\/fonts\/|^assets\/studio\.css$|^brands\/[\w-]+\/fonts\/|^brands\/[\w-]+\/brand\.js$|^lab\/board\.html$/,['fonts-local']],
  [/^assets\/who\./,['who']],
  [/^assets\/cloud\.js$|^tests\/fakecloud\.js$/,['cloud-api','planned']],
  [/^tools\/create\.js$|^assets\/cloud\.js$/,['saved-versions','resave']],
  [/^brands\/|^tests\/fixtures\/brands\//,['tokens']],
  [/^brands\/|^tests\/fixtures\/brands\//,['brandkit','create-stickers','nd-templates','text-fill','goldens']],
  [/^tools\/(?!video)|assets\/studio\.js/,['resave','goldens','simplify40','simplify35','full','v5','polish','queue','queue-keep','copystyle','stickers','emoji-stickers','flip','simplify15','textstyles','brandkit','simplify30','quicksave','font-ready','team-retry','toolfix43','drafts-queue']],
  [/^assets\/stickers\.js$|^tools\/highlight-emoji\.js$/,['stickers','copystyle','emoji-stickers','highlight-emoji','flip','create-stickers','board-stickers']],[/assets\/render\.js/,['draft-pictures','batch-saved','continue-clear','create-render','font-ready']],
  [/assets\/cloud\.js/,['hub-offline','smoke','quicksave','home7-save','collections-save']],
  [/assets\/studio\.(js|css)|index\.html/,['hub-offline','hub-fixes','home7-hub','home7-saved','pins','pinorder','fresh','peek','select','extra','cardnames','alltools-cam','simplify','quickpages','simplify15','brandkit','reels-hub','saved-find','simplify30','continue-clear','create-render','select-swipe','collections-save']],
  [/assets\/search\./,['search','polish71-search','create-search','tplteam','select-swipe']],
  [/^tests\/goldens\//,['goldens']],[/tools\/create|^templates\//,['goldens','nd-templates','text-fill','create','create-search','tplfav','create-stickers','tplteam','create-render','create-fit','create-fixes']],
  [/changelog\.md|whatsnew/,['whatsnew']],
  [/sw\.js|manifest/,['share']],
  [/assets\/studio\.css/,['contrast','polish71-saved','polish71-bar','waiting-tag','simplify45','toolfix43']],[/\.css$/,['simplify45']],
  [/^lab\//,['lab','lab-pro','board-penpot','board-flex','board-stickers','board-touch']],
  [/assets\/templates\.|brands\//,['templates','postpresets','tplfav','reels-hub','feedlayouts']],
  [/tools\/create-templates|assets\/search\./,['postpresets','feedlayouts','create-fit']],
  [/assets\/welcome\./,['welcome']],
  [/tools\/restock/,['restock-styles','backgrounds']],[/tools\/photo-story/,['photostory-styles','backgrounds']],[/tools\/collage/,['collage-grids','backgrounds','simplify40']],[/tools\/cinematic|tools\/new-place|tools\/offer/,['backgrounds','full']],
  [/tools\/(restock|photo-story|offer|carousel|collage|highlight)\.js/,['draw-edges']],
  [/tools\/highlight|tools\/carousel/,['highlight','highlight-product','highlight-emoji','quickpages','batch','simplify40']],
  [/assets\/batch\.js/,['batch','batch-saved']],
  [/assets\/render\.js/,['batch-saved','draft-pictures','reels-hub']],
  [/tools\/video/,['video','video-timeline','video-polish','video-fixes']],
  [/assets\/reel-project\.js/,['video-project','video','video-timeline','video-polish','video-fixes']],
  [/assets\/reel\.js|reel\.json|brands\/[\w-]+\/reels\//,['video','reel-scene','video-fixes']],
  [/assets\/reel\.js/,['reel-label-reveal']],
  [/brands\/[\w-]+\/reels\/label-reveal\//,['reel-label-reveal','reel-audio-label-reveal']],
  [/assets\/reel-audio\.js/,['video','reel-audio','reel-audio-label-reveal']],
  [/assets\/reel-export\.js/,['video','reel-export','video-fixes']],
];
let names=process.argv.slice(2);
try{ if(sh0('git rev-parse --is-shallow-repository').trim()==='true') console.log('NOTE: this clone is shallow; suites that read old file versions from git (photostory-styles, draw-edges) fail without history. Run: git fetch --unshallow'); }catch(_){}
const dry=names.includes('--dry'); names=names.filter(n=>n!=='--dry');
const why={};
const SKIP=['run','_quiet','_saveflow-helpers','kit','shot','shot-stickers','shot-create','tapscan','tplthumbs','reelthumbs','look8','seed'];
const TWINS=['home7','polish71','collage-grids'];   // the whole-file versions of home7-hub/-saved/-save and polish71-saved/-search/-bar: --all runs the parts instead
if(names[0]==='--all'){ const sk=[...SKIP,...TWINS];
  names=fs.readdirSync(new URL('.',import.meta.url)).filter(f=>/\.mjs$/.test(f)&&!f.startsWith('_')).map(f=>f.slice(0,-4)).filter(n=>!sk.includes(n)).sort();
  names.forEach(n=>why[n]='all'); }
const TOOL_SUITES=['nav','saveflow','teamassets','rules','captions','components','full','v5','polish','queue','queue-keep','copystyle','batch','home7-save','stickers','emoji-stickers','flip','simplify15','batch-saved','textstyles','brandkit','backgrounds','draft-pictures','simplify30','simplify40','font-ready','team-retry','toolfix43','drafts-queue','goldens','saved-versions','resave','tokens'],
      HUB_SUITES=['nav','ideas','kpis','calpick','calendar','review','captions','campaigns','phrasebook','packs','hub-offline','hub-fixes','drafts-queue','home7-hub','home7-saved','pins','pinorder','fresh','peek','select','extra','cardnames','search','queue-keep','alltools-cam','simplify','quickpages','waiting-tag','simplify15','tplfav','batch-saved','brandkit','draft-pictures','saved-find','reels-hub','simplify30','continue-clear','tplteam','simplify35','create-render','select-swipe','flags','who'];
const sh=c=>execSync(c,{encoding:'utf8',stdio:['ignore','pipe','ignore']});
const add=(set,list,r)=>list.forEach(x=>{ if(!set.has(x)){ set.add(x); why[x]=r; } });
/* the part of studio.js a set of changed lines falls in: tool(), home(), the VERSION line, or anything else */
function studioParts(base){
  let diff=''; try{ diff=sh(`git diff -U0 ${base} -- assets/studio.js`); }catch(_){ return ['other']; }
  const src=require_('assets/studio.js').split('\n'), starts=[]; src.forEach((l,i)=>{ const m=l.match(/^(?:async )?function (\w+)/); if(m) starts.push([i+1,m[1]]); });
  /* a line belongs to tool()/home() only between its first line and its closing "}" at column 0: the lines between functions are 'other' */
  const closeOf=ln=>{ for(let i=ln;i<src.length;i++) if(/^}/.test(src[i])) return i+1; return src.length; };
  const fnAt=n=>{ let f=null, st=0; for(const [ln,name] of starts){ if(ln<=n){ f=name; st=ln; } else break; } return f&&n<=closeOf(st)?f:null; };
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
    const m=f.match(/^tests\/([\w-]+)\.mjs$/); if(m&&!SKIP.includes(m[1])&&!m[1].startsWith('_')) add(set,[m[1]],'suite changed');
    if(quick) continue;
    if(f==='assets/studio.js'){ const parts=studioParts(base);
      if(parts.includes('tool')||parts.includes('other')) add(set,TOOL_SUITES,'studio.js: tool pages');
      if(parts.includes('home')||parts.includes('other')) add(set,HUB_SUITES,'studio.js: hub');
      if(parts.includes('version')) add(set,['whatsnew'],'studio.js: VERSION'); }
    for(const [re,s2] of MAP) if(re.test(f)&&!(f==='assets/studio.js'&&re.source.includes('studio'))) add(set,s2,f); }
  names=[...set].filter(n=>fs.existsSync(new URL(n+'.mjs',import.meta.url))||(console.log('  (skipped '+n+': no tests/'+n+'.mjs in this tree)'),false));   // a suite from a branch not merged yet
  console.log('Compared with '+base+': '+files.length+' file(s) changed');
}
if(dry){ names.forEach(n=>console.log('  '+n.padEnd(18)+(why[n]||'named'))); process.exit(0); }
if(!names.length){ console.log('Name suites, or use --changed'); process.exit(2); }
const JOBS=+process.env.JOBS||Math.min(4,os.cpus().length);
console.log(`Running ${names.length} suites, ${JOBS} at a time: ${names.join(' ')}`);
const t0=Date.now(), out=[];
const QUIET=!process.env.NOQUIET, quietArgs=QUIET?['--import',new URL('_quiet.mjs',import.meta.url).pathname]:[];
const REAL_TIME=['welcome'];   // sleeps that wait for a slide's timed choreography (JS animation sequences, not timers or CSS animations): always the full time
const runOne=name=>new Promise(res=>{ const t=Date.now(); let log='';
  const p=spawn(process.execPath,[...(REAL_TIME.includes(name)?[]:quietArgs),`tests/${name}.mjs`],{env:process.env});
  p.stdout.on('data',d=>log+=d); p.stderr.on('data',d=>log+=d);
  p.on('close',code=>{ const lines=log.split('\n'), fails=lines.filter(l=>l.startsWith('FAIL'));
    const r={name,code,pass:lines.filter(l=>l.startsWith('PASS')).length,fails,s:((Date.now()-t)/1000).toFixed(0),tail:code&&!fails.length?lines.filter(Boolean).slice(-3):[]};
    console.log(`${code?'✗':'✓'} ${name}  pass ${r.pass}  fail ${fails.length}  ${r.s}s`); out.push(r); res(); }); });
/* longest first (seconds on a 4-core sandbox, Oct 2026), so the slow ones are not left running alone at the end */
const SLOW={goldens:110,resave:90,'collage-grids-compat':120,'collage-grids-grids':110,'video-timeline':200,video:190,'video-polish':130,textstyles:95,'draw-edges':100,'font-ready':75,'drafts-queue':75,'select-swipe':25,'create-render':60,'continue-clear':66,backgrounds:165,'batch-saved':75,full:180,'polish71-saved':110,'home7-hub':85,batch:75,postpresets:80,'queue-keep':70,'restock-styles':65,contrast:77,welcome:63,quicksave:55,queue:60,v5:50,taste:51,
  'home7-save':37,smoke:35,select:35,'home7-saved':33,'alltools-cam':23,'polish71-bar':16,'polish71-search':15};
const queue=[...names].sort((a,b)=>(SLOW[b]||30)-(SLOW[a]||30));
await Promise.all(Array.from({length:Math.min(JOBS,queue.length)},async()=>{ while(queue.length) await runOne(queue.shift()); }));
const bad=out.filter(r=>r.code);
for(const r of bad){ console.log(`\n${r.name}:`); [...r.fails.slice(0,3),...r.tail].forEach(l=>console.log('  '+l)); }
const wall=(Date.now()-t0)/1000, cpu=out.reduce((a,r)=>a+(+r.s),0), slow=[...out].sort((a,b)=>b.s-a.s).slice(0,5).map(r=>r.name+' '+r.s+'s').join(', ');
console.log(`\n${bad.length?bad.length+' suite(s) failed':'All green'}: ${out.length} suites in ${Math.floor(wall/60)} min ${(wall%60).toFixed(0)} s wall (${cpu.toFixed(0)} s of suite time, ${JOBS} at a time, load ${os.loadavg()[0].toFixed(1)} at the end). Slowest: ${slow}`);
process.exit(bad.length?1:0);
