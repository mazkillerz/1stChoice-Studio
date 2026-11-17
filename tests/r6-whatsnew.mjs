/* r6 What's New: no Jump to bar, one filter row (All / New / Improved / Fixed), Fixed shows only fixes, #v-<version> deep link,
   no sideways scroll at 360, chip contrast in light + dark, Back returns to the previous page. BASE env var like the other suites. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8080/';
const res=[]; const ok=(n,c,i)=>res.push((c?'PASS ':'FAIL ')+n+(i?' ('+i+')':''));
const md=fs.readFileSync(new URL('../studio-notes/changelog.md',import.meta.url),'utf8');
const vers=md.split(/^## /m).slice(1).map(s=>s.split('\n')[0].split(' · ')[0].trim());
const target=vers[Math.min(30,vers.length-1)];
const lum=c=>{const m=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*m[0]+.7152*m[1]+.0722*m[2];};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const b=await chromium.launch(); const errs=[];
async function mk(w,h,scheme){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<500,hasTouch:w<500,serviceWorkers:'block',colorScheme:scheme});await ctx.route(/fonts\.g/,r=>r.abort());const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(String(e)));return {ctx,pg};}
for(const scheme of ['light','dark']){
  const {ctx,pg}=await mk(390,844,scheme);
  await pg.goto(BASE+'whats-new.html'); await pg.waitForSelector('.wn-latest .wn-line');
  ok(scheme+': no Jump to bar or All versions button',await pg.evaluate(()=>!document.querySelector('#wnJump,.wn-jump,.wn-jall')&&![...document.querySelectorAll('button,a,[role=button]')].some(e=>/^(Jump to|All versions)/.test(e.textContent.trim()))));
  const chips=await pg.$$eval('.wn-f',l=>l.map(x=>x.querySelector('span').textContent));
  ok(scheme+': exactly one chip row with All / New / Improved / Fixed',await pg.locator('.wn-filters').count()===1&&chips.join()==='All,New,Improved,Fixed',chips.join());
  ok(scheme+': one chip selected',await pg.locator('.wn-f[aria-pressed="true"]').count()===1);
  await pg.click('.wn-f[data-filter="fix"]'); await pg.waitForTimeout(300);
  const types=await pg.$$eval('.wn-line',l=>l.filter(x=>!x.hidden&&!x.closest('[hidden]')).map(x=>x.dataset.type));
  const rowsLeft=await pg.$$eval('.wn-ver',l=>l.filter(x=>!x.hidden&&!x.closest('[hidden]')).length).catch(()=>0);   /* r6: the newest version may have no fix: then only versions with fixes stay listed */
  ok(scheme+': Fixed shows only fix changes',types.every(t=>t==='fix')&&(types.length>0||rowsLeft>0),types.length+' lines, '+rowsLeft+' version rows');
  ok(scheme+': Fixed hides versions with no fix',await pg.$$eval('.wn-ver',l=>l.every(v=>v.hidden||v.querySelector('.wn-cc[data-type="fix"]'))));
  /* contrast of selected and unselected chip text */
  const col=async sel=>pg.$eval(sel,e=>{const cs=getComputedStyle(e);let bg=cs.backgroundColor,n=e;while(/rgba\(.*, ?0\)|transparent/.test(bg)&&n.parentElement){n=n.parentElement;bg=getComputedStyle(n).backgroundColor;}return [cs.color,bg];});
  for(const [sel,name] of [['.wn-f[aria-pressed="true"]','selected'],['.wn-f[aria-pressed="false"]','unselected']]){const [c,bg]=await col(sel);const r=ratio(c,bg);ok(scheme+': '+name+' chip contrast >= 4.5',r>=4.5,r.toFixed(2));}
  await pg.click('.wn-f[data-filter="all"]'); await pg.waitForTimeout(200);
  await pg.goto(BASE+'whats-new.html#v-'+target); await pg.waitForSelector('.wn-latest .wn-line'); await pg.waitForTimeout(900);
  ok(scheme+': deep link #v-'+target+' opens that version and scrolls to it',await pg.evaluate(v=>{const e=document.getElementById('v-'+v),r=e.getBoundingClientRect();return e.querySelector('.wn-vbtn').getAttribute('aria-expanded')==='true'&&r.top<innerHeight&&r.bottom>0;},target));
  await ctx.close();
}
{ const {ctx,pg}=await mk(360,740,'light'); await pg.goto(BASE+'whats-new.html'); await pg.waitForSelector('.wn-latest .wn-line');
  await pg.evaluate(()=>document.querySelectorAll('.wn-vbtn').forEach((x,i)=>{if(i<40)x.click();})); await pg.waitForTimeout(400);
  ok('360: no horizontal scroll',await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  ok('360: chips fit the screen',await pg.$$eval('.wn-f',l=>l.every(x=>{const r=x.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height>=44;})));
  await ctx.close(); }
{ const {ctx,pg}=await mk(390,844,'light'); await pg.goto(BASE+'index.html'); await pg.goto(BASE+'whats-new.html'); await pg.waitForSelector('.wn-latest .wn-line');
  await pg.click('.back'); await pg.waitForTimeout(600);
  ok('Back returns to the page the person came from',/index\.html$|\/$/.test(new URL(pg.url()).pathname)); await ctx.close(); }
await b.close();
ok('no page errors',!errs.length,errs.join(' | '));
console.log(res.join('\n')); const f=res.filter(r=>r.startsWith('FAIL')).length; console.log(f?f+' failed':'all pass'); process.exit(f?1:0);
