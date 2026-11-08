import { chromium } from 'playwright';
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const pg=await ctx.newPage();
pg.on('pageerror',e=>console.log('ERR',e.message)); pg.on('console',m=>{ if(m.type()==='error') console.log('C',m.text()); });
await ctx.addInitScript(()=>{localStorage.setItem('studio:flag:team','1');localStorage.setItem('studio:welcome','1');});
await pg.goto('http://127.0.0.1:8301/index.html#calendar'); await pg.waitForTimeout(3000); console.log((await pg.innerText('#calendarView')).slice(0,200));
