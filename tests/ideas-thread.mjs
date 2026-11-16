/* Ideas thread (assets/ideas.js): capture lands in Idea, "new" dot, text + voice replies, archive with confirm + Restore,
   voice recorder settings (constraints + MediaRecorder options), Arabic RTL, no-database fallback.
   Run: node tests/ideas-thread.mjs (server on :8080, or BASE=...). The microphone is stubbed (the sandbox has none). */
import { chromium } from 'playwright';
import fs from 'fs';
import { seedDesigns } from './seed.js';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const fake=fs.readFileSync(new URL('fakecloud.js',import.meta.url),'utf8');
const res=[]; const ok=(n,c,i)=>{ res.push((c?'PASS ':'FAIL ')+n+(i!==undefined&&i!==''?' ('+(typeof i==='string'?i:JSON.stringify(i))+')':'')); };
const b=await chromium.launch(), errs=[];
const hrs=n=>new Date(Date.now()-n*3600e3).toISOString();
const wav=(()=>{ const n=8000, buf=Buffer.alloc(44+n*2); buf.write('RIFF',0); buf.writeUInt32LE(36+n*2,4); buf.write('WAVEfmt ',8); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22); buf.writeUInt32LE(8000,24); buf.writeUInt32LE(16000,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34); buf.write('data',36); buf.writeUInt32LE(n*2,40); return 'data:audio/wav;base64,'+buf.toString('base64'); })();
function seeded(){
  const db=seedDesigns(); const I=(id,o)=>({id,brand:'1stchoice',title:'',note:'',type:'post',stage:'idea',link:null,image_path:null,audio_path:null,audio_secs:null,design_id:null,calendar_id:null,sort:0,author:'Omar',seen_at:null,seen_by:null,deleted_at:null,deleted_by:null,created_at:hrs(2),updated_at:hrs(2),...o});
  db.files['1stchoice/ideas/v1/voice.wav']=wav;
  db.ideas=[ I('i1',{title:'Fresh from Omar',audio_path:'1stchoice/ideas/v1/voice.wav',audio_secs:5,created_at:hrs(1)}),
    I('i2',{title:'My own idea',author:'Sara',created_at:hrs(3)}),
    (()=>{ const x=I('i3',{title:'فكرة قديمة',created_at:hrs(5)}); delete x.seen_at; delete x.seen_by; delete x.deleted_at; delete x.deleted_by; return x; })() ];
  return db;
}
/* a stub microphone that records what it was asked for */
const STUB=(mp4)=>`(()=>{ window.__gum=[]; window.__mr=[];
  navigator.mediaDevices.getUserMedia=async c=>{ window.__gum.push(JSON.parse(JSON.stringify(c))); if(window.__overconstrain&&window.__gum.length===1){ const e=new Error('x'); e.name='OverconstrainedError'; throw e; } return {getTracks:()=>[{stop(){}}]}; };
  class MR{ constructor(s,o){ this.o=o||{}; this.state='inactive'; this.mimeType=this.o.mimeType||'audio/webm'; window.__mr.push({opts:o||{}}); }
    static isTypeSupported(t){ return ${mp4?"/mp4/.test(t)":"/webm;codecs=opus/.test(t)"}; }
    start(ms){ this.state='recording'; window.__mr[window.__mr.length-1].start=ms; }
    stop(){ this.state='inactive'; this.ondataavailable&&this.ondataavailable({data:new Blob(['voice-bytes'],{type:this.mimeType})}); setTimeout(()=>this.onstop&&this.onstop(),0); } }
  window.MediaRecorder=MR; })();`;
const init=(db,extra)=>`try{ localStorage.setItem('studio:welcome','1'); localStorage.setItem('studio:who',JSON.stringify({name:'Sara',owner:false})); localStorage.setItem('studio:flag:plan','1');
  ${extra||''} if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
async function mk(opts,db,{mp4,extra,over}={}){
  const ctx=await b.newContext({serviceWorkers:'block',...opts});
  await ctx.route(/supabase\.co/,r=>r.abort()); await ctx.route(/assets\/cloud\.js/,r=>r.fulfill({contentType:'application/javascript',body:fake}));
  await ctx.addInitScript({content:init(db,extra)}); await ctx.addInitScript({content:(over?'window.__overconstrain=1;':'')+'document.addEventListener("DOMContentLoaded",()=>{'+STUB(mp4)+'});'+STUB(mp4)});
  return ctx;
}
const PH={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const stored=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('fakecloud')));
const txt=(pg,s)=>pg.$eval(s,e=>e.innerText.replace(/\s+/g,' ').trim()).catch(()=>'');
const open=async(pg)=>{ await pg.goto(BASE+'index.html#ideas'); await pg.waitForSelector('#ideasView .id-top',{timeout:10000}); await pg.waitForFunction(()=>!document.querySelector('#ideasView .id-skel'),null,{timeout:10000}); };
const smalls=pg=>pg.evaluate(()=>{ const out=[]; document.querySelectorAll('dialog[open] button,dialog[open] input:not([hidden])').forEach(e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); if(!r.width||!r.height||cs.visibility==='hidden'||e.closest('[hidden]')) return; if(r.height<43.5||r.width<43.5) out.push((e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height)); }); return out; });
const wait=(pg,f,a)=>pg.waitForFunction(f,a,{timeout:5000}).then(()=>true).catch(()=>false);

async function main(dark){
  const T=(dark?'dark ':'light ')+'thread: ';
  const ctx=await mk({...PH,colorScheme:dark?'dark':'light'},seeded()); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(T+e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/fonts|ERR_FAILED|net::|favicon/i.test(m.text())) errs.push(T+'console '+m.text()); });
  await open(pg);
  /* capture lands in the Idea stage */
  await pg.tap('#fab'); await pg.waitForSelector('dialog.id-capdlg textarea'); await pg.fill('#idCT','Quick one: a slow pour'); await pg.tap('#idSave');
  ok(T+'capture lands on the board in the Idea stage at once',await wait(pg,()=>/slow pour/.test(document.querySelector('.id-list[data-stage="idea"]')?.innerText||'')));
  await pg.waitForFunction(()=>(JSON.parse(localStorage.getItem('fakecloud')).ideas||[]).length===4,null,{timeout:5000}).catch(()=>{});
  ok(T+'stored with stage idea',(await stored(pg)).ideas.find(x=>/slow pour/.test(x.title)).stage==='idea');
  /* new dot */
  const dots=await pg.evaluate(()=>[...document.querySelectorAll('.id-card')].filter(c=>c.querySelector('.id-new-dot')).map(c=>c.dataset.id));
  ok(T+'the new dot shows only on the idea another person wrote and nobody opened',dots.length===1&&dots[0]==='i1',dots);
  await pg.tap('.id-card[data-id="i1"] .id-main'); await pg.waitForSelector('dialog.id-edit');
  ok(T+'opening it removes the dot at once',await wait(pg,()=>!document.querySelector('.id-card[data-id="i1"] .id-new-dot')));
  await wait(pg,()=>JSON.parse(localStorage.getItem('fakecloud')).ideas.find(x=>x.id==='i1').seen_at);
  const sv=(await stored(pg)).ideas.find(x=>x.id==='i1'); ok(T+'seen_at and seen_by are stored',!!sv.seen_at&&sv.seen_by==='Sara',[sv.seen_at,sv.seen_by]);
  /* thread */
  const first=await pg.evaluate(()=>{ const m=document.querySelector('dialog .id-thread .id-msg'); return m&&{voice:!!m.querySelector('.id-voice'),name:m.querySelector('.id-mn').textContent,time:m.querySelector('bdi.id-mt').textContent,av:m.querySelector('.id-av').textContent,dir:m.querySelector('.id-mn').getAttribute('dir')}; });
  ok(T+'the idea\'s own voice note is the first entry (avatar, name, time, player)',first&&first.voice&&first.name==='Omar'&&/ago/.test(first.time)&&first.av==='O'&&first.dir==='auto',first);
  await pg.fill('#idReply','Love it, let us film Friday'); await pg.press('#idReply','Enter');
  ok(T+'a text reply appears with my name and the time',await wait(pg,()=>{ const m=[...document.querySelectorAll('dialog .id-msg')].pop(); return m&&/Love it/.test(m.innerText)&&m.querySelector('.id-mn').textContent==='Sara'&&/just now|min ago/.test(m.querySelector('bdi.id-mt').textContent); }));
  await pg.waitForFunction(()=>(JSON.parse(localStorage.getItem('fakecloud')).idea_notes||[]).some(n=>n.body&&!n._pending),null,{timeout:5000}).catch(()=>{});
  let s=await stored(pg), n1=(s.idea_notes||[])[0]||{};
  ok(T+'stored in idea_notes with idea, author and body; field cleared',n1.idea_id==='i1'&&n1.author==='Sara'&&/Love it/.test(n1.body)&&(await pg.inputValue('#idReply'))==='',n1);
  await pg.fill('#idReply','ممتاز واجد'); await pg.tap('.id-csend');
  const rtl=await wait(pg,()=>{ const p=[...document.querySelectorAll('dialog .id-mtx')].pop(); return p&&/ممتاز/.test(p.innerText); })&&await pg.evaluate(()=>{ const p=[...document.querySelectorAll('dialog .id-mtx')].pop(); return p.getAttribute('dir')==='auto'&&getComputedStyle(p).direction==='rtl'; });
  ok(T+'an Arabic reply is right-to-left',rtl);
  /* voice reply */
  await pg.tap('[data-cmic]'); await pg.waitForSelector('dialog .id-rec',{timeout:4000});
  ok(T+'recording shows the timer, level meter and a cancel ×; the text field hides',!!(await pg.$('dialog .id-rtime'))&&!!(await pg.$('dialog .id-meter'))&&!!(await pg.$('dialog .id-rcancel.x'))&&await pg.evaluate(()=>document.querySelector('.id-crow').hidden));
  const gum=await pg.evaluate(()=>window.__gum), mr=await pg.evaluate(()=>window.__mr);
  ok(T+'getUserMedia asks for clear speech (mono, 48 kHz, 16 bit, noise suppression + auto gain, no echo cancellation)',gum.length===1&&JSON.stringify(gum[0])===JSON.stringify({audio:{channelCount:{ideal:1},sampleRate:{ideal:48000},sampleSize:{ideal:16},echoCancellation:false,noiseSuppression:true,autoGainControl:true}}),gum);
  ok(T+'MediaRecorder: Opus webm at 96000 bps, data every 1000 ms',mr.length===1&&mr[0].opts.mimeType==='audio/webm;codecs=opus'&&mr[0].opts.audioBitsPerSecond===96000&&mr[0].start===1000,mr);
  await pg.waitForTimeout(1300); await pg.tap('[data-rstop]');
  ok(T+'stopping sends the voice reply: a second voice entry',await wait(pg,()=>document.querySelectorAll('dialog .id-thread .id-voice').length===2));
  await pg.waitForFunction(()=>(JSON.parse(localStorage.getItem('fakecloud')).idea_notes||[]).some(n=>n.audio_path),null,{timeout:5000}).catch(()=>{});
  s=await stored(pg); const vn=(s.idea_notes||[]).find(n=>n.audio_path);
  ok(T+'the voice reply is stored under <brand>/ideas/<idea>/notes/ with its length',!!vn&&/^1stchoice\/ideas\/i1\/notes\//.test(vn.audio_path)&&/^data:audio\//.test(s.files[vn.audio_path]||'')&&vn.audio_secs>=1,vn);
  ok(T+'the sheet has no "replace voice note" action',!/Replace voice|Record again/i.test(await txt(pg,'dialog')));
  ok(T+'no control under 44px in the sheet',(await smalls(pg)).length===0,await smalls(pg));
  if(!dark) await pg.screenshot({path:new URL('../studio-notes/pending/shots/ideas-thread-light.png',import.meta.url).pathname}); else await pg.screenshot({path:new URL('../studio-notes/pending/shots/ideas-thread-dark.png',import.meta.url).pathname});
  /* archive a text reply: Keep it, then Move to archive */
  const entryMore=(i)=>pg.tap('dialog .id-thread .id-msg:nth-child('+i+') [data-mmore]');
  await entryMore(2); await pg.waitForSelector('.id-menu [data-a="arch"]'); await pg.tap('.id-menu [data-a="arch"]'); await pg.waitForSelector('.id-confirm');
  const cf=await txt(pg,'.id-confirm');
  ok(T+'archive asks first, with the restore promise and Move to archive / Keep it',/Move this reply to the archive\?/.test(cf)&&/restore it any time from Archive/.test(cf)&&/Move to archive/.test(cf)&&/Keep it/.test(cf),cf);
  await pg.tap('.id-confirm [data-no]'); await pg.waitForTimeout(300);
  s=await stored(pg);
  ok(T+'Keep it does nothing',(s.idea_notes||[]).every(n=>!n.deleted_at)&&(await pg.$$('dialog .id-msg')).length===4);
  await entryMore(2); await pg.tap('.id-menu [data-a="arch"]'); await pg.waitForSelector('.id-confirm'); await pg.tap('.id-confirm [data-yes]');
  ok(T+'Move to archive hides the reply',await wait(pg,()=>!/Love it/.test(document.querySelector('dialog .id-thread').innerText)));
  s=await stored(pg); const an=(s.idea_notes||[]).find(n=>/Love it/.test(n.body));
  ok(T+'it is only marked archived (who + when), never removed',!!an&&!!an.deleted_at&&an.deleted_by==='Sara');
  /* archive the idea's own voice note (entry 1) */
  await entryMore(1); await pg.tap('.id-menu [data-a="arch"]'); await pg.waitForSelector('.id-confirm');
  ok(T+'the main voice note asks "Move this voice note to the archive?"',/Move this voice note to the archive\?/.test(await txt(pg,'.id-confirm')));
  await pg.tap('.id-confirm [data-yes]');
  ok(T+'the main voice note leaves the thread',await wait(pg,()=>document.querySelectorAll('dialog .id-thread .id-voice').length===1));
  s=await stored(pg); const i1=s.ideas.find(x=>x.id==='i1'), mv=(s.idea_notes||[]).find(n=>n.audio_path==='1stchoice/ideas/v1/voice.wav');
  ok(T+'the idea\'s audio moved to an archived note; the file is still in storage',!i1.audio_path&&!!mv&&!!mv.deleted_at&&!!s.files['1stchoice/ideas/v1/voice.wav'],[i1.audio_path,!!mv]);
  await pg.evaluate(()=>document.querySelector('dialog.id-edit').close()); await pg.waitForTimeout(200);
  /* Archive sheet + Restore */
  ok(T+'Archive is a quiet link at the end of the board (not a filled button)',await pg.evaluate(()=>{ const a=document.querySelector('[data-archive]'); return !!a&&a.classList.contains('link')&&!a.classList.contains('btn'); }));
  await pg.tap('[data-archive]'); await pg.waitForSelector('dialog.id-archive .id-arow');
  const at=await txt(pg,'dialog.id-archive');
  ok(T+'the Archive lists the voice note and the reply with who archived and when, each with Restore',/Voice note/.test(at)&&/Reply: Love it/.test(at)&&/Sara/.test(at)&&(await pg.$$('dialog.id-archive [data-restore]')).length===2,at);
  await pg.tap('dialog.id-archive .id-arow:has-text("Love it") [data-restore]');
  ok(T+'Restore brings the reply back',await wait(pg,()=>document.querySelectorAll('dialog.id-archive .id-arow').length===1));
  s=await stored(pg); ok(T+'its archive mark is cleared',!(s.idea_notes||[]).find(n=>/Love it/.test(n.body)).deleted_at);
  await pg.tap('dialog.id-archive [data-restore]'); await wait(pg,()=>!document.querySelector('dialog.id-archive .id-arow'));
  await pg.evaluate(()=>document.querySelector('dialog.id-archive').close()); await pg.waitForTimeout(200);
  await pg.tap('.id-card[data-id="i1"] .id-main'); await pg.waitForSelector('dialog.id-edit');
  ok(T+'after both Restores the thread has the voice note first and the reply again',await wait(pg,()=>{ const m=document.querySelectorAll('dialog .id-thread .id-msg'); return m.length>=4&&!!m[0].querySelector('.id-voice')&&/Love it/.test(document.querySelector('dialog .id-thread').innerText); }));
  await pg.evaluate(()=>document.querySelector('dialog.id-edit').close()); await pg.waitForTimeout(200);
  /* archive a whole idea */
  await pg.tap('.id-card[data-id="i2"] [data-more]'); await pg.waitForSelector('.id-menu'); await pg.tap('.id-menu [data-a="del"]'); await pg.waitForSelector('.id-confirm');
  ok(T+'archiving an idea asks first',/Move this idea to the archive\?/.test(await txt(pg,'.id-confirm'))&&/Keep it/.test(await txt(pg,'.id-confirm')));
  await pg.tap('.id-confirm [data-yes]');
  ok(T+'the idea leaves the board',await wait(pg,()=>!document.querySelector('.id-card[data-id="i2"]')));
  s=await stored(pg); ok(T+'the row stays, marked archived',s.ideas.find(x=>x.id==='i2').deleted_at&&s.ideas.length===4);
  await pg.tap('[data-archive]'); await pg.waitForSelector('dialog.id-archive .id-arow'); await pg.tap('dialog.id-archive .id-arow:has-text("My own idea") [data-restore]');
  await pg.evaluate(()=>document.querySelector('dialog.id-archive')?.close());
  ok(T+'Restore puts the idea back on the board',await wait(pg,()=>!!document.querySelector('.id-card[data-id="i2"]')));
  ok(T+'no sideways scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await ctx.close();
}
await main(false); await main(true);

/* iPhone Safari: AAC in mp4 at 128 kbit/s; OverconstrainedError falls back to {audio:true} */
{ const ctx=await mk(PH,seeded(),{mp4:true,over:true}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('mp4: '+e.message));
  await open(pg); await pg.tap('.id-card[data-id="i2"] .id-main'); await pg.waitForSelector('dialog.id-edit'); await pg.tap('[data-cmic]'); await pg.waitForSelector('dialog .id-rec');
  const gum=await pg.evaluate(()=>window.__gum), mr=await pg.evaluate(()=>window.__mr);
  ok('Overconstrained: the second call is {audio:true}',gum.length===2&&JSON.stringify(gum[1])==='{"audio":true}',gum);
  ok('AAC: audio/mp4;codecs=mp4a.40.2 at 128000 bps',mr[0].opts.mimeType==='audio/mp4;codecs=mp4a.40.2'&&mr[0].opts.audioBitsPerSecond===128000&&mr[0].start===1000,mr);
  await pg.tap('dialog .id-rcancel'); await pg.waitForTimeout(300);
  ok('cancel ×: no reply is sent',((await stored(pg)).idea_notes||[]).length===0&&!(await pg.$('dialog .id-rec')));
  await ctx.close(); }

/* database not updated yet: no dots, no errors, a friendly message on a reply */
{ const ctx=await mk(PH,seeded(),{extra:"localStorage.setItem('fakecloud-nothread','1');"}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push('nothread: '+e.message));
  await open(pg); await pg.waitForSelector('.id-card');
  const rows=await pg.$$eval('.id-card',e=>e.length), dots=await pg.$$eval('.id-new-dot',e=>e.length);
  ok('the board still shows; a row without the seen_at column gets no dot (only i1 does)',rows===3&&dots===1&&!(await pg.$('.id-card[data-id="i3"] .id-new-dot')),[rows,dots]);
  await pg.tap('.id-card[data-id="i3"] .id-main'); await pg.waitForSelector('dialog.id-edit'); await pg.fill('#idReply','hello'); await pg.tap('.id-csend');
  ok('a reply says "This switches on once the owner updates the database."',await wait(pg,()=>/switches on once the owner updates the database/i.test(document.querySelector('#idRSt').innerText)),await txt(pg,'#idRSt'));
  await ctx.close(); }

ok('no page errors',errs.length===0,errs.slice(0,5));
await b.close();
console.log(res.join('\n')); const bad=res.filter(r=>r.startsWith('FAIL')).length; console.log(`\n${res.length-bad} passed, ${bad} failed`); process.exit(bad?1:0);
