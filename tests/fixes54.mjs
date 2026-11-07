/* Small fixes sweep (mega 1.4): UI weights stay 400/500/600 in Board's CSS; text inputs run right to left. Reads BASE. */
const BASE=process.env.BASE||'http://127.0.0.1:8080/'; let bad=0;
const ok=(n,c,d)=>{ console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(d||''))); if(!c) bad++; };
for(const f of ['lab/board.css','lab/lab.css']){
  const css=await (await fetch(BASE+f)).text();
  const heavy=[...css.matchAll(/(?:font-weight\s*:|font\s*:)\s*(?:[a-z-]+\s+)?(700|800|900|bold)\b/g)].map(m=>m[0]);
  ok(f+': no font weight above 600',heavy.length===0,heavy);
}
process.exit(bad?1:0);
