/* Studio: Save all pages on a computer (1.9.0). One ZIP with every page, built in the browser (no library, works offline).
   PNGs are already compressed, so the files are stored as they are ("store" method): the ZIP is quick to make and every
   picture inside is byte for byte the PNG Studio made. Names may be Arabic: they are written as UTF-8 (flag bit 11).
   StudioBatch.zip([File,…]) → Promise<Blob> (application/zip). */
(function(){
  let table=null;
  function crcTable(){ if(table) return table; table=new Uint32Array(256);
    for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; table[n]=c>>>0; } return table; }
  function crc32(bytes){ const t=crcTable(); let c=0xFFFFFFFF; for(let i=0;i<bytes.length;i++) c=t[(c^bytes[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
  function dosTime(d){ return ((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF; }
  function dosDate(d){ return (((Math.max(1980,d.getFullYear())-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF; }
  async function zip(files,at){
    const enc=new TextEncoder(), d=at||new Date(), parts=[], central=[]; let offset=0;
    for(const f of files){
      const data=new Uint8Array(await f.arrayBuffer()), name=enc.encode(f.name), crc=crc32(data), size=data.length;
      const h=new DataView(new ArrayBuffer(30));
      h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true);
      h.setUint16(10,dosTime(d),true); h.setUint16(12,dosDate(d),true); h.setUint32(14,crc,true);
      h.setUint32(18,size,true); h.setUint32(22,size,true); h.setUint16(26,name.length,true); h.setUint16(28,0,true);
      parts.push(h.buffer,name,data);
      const c=new DataView(new ArrayBuffer(46));
      c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true);
      c.setUint16(12,dosTime(d),true); c.setUint16(14,dosDate(d),true); c.setUint32(16,crc,true);
      c.setUint32(20,size,true); c.setUint32(24,size,true); c.setUint16(28,name.length,true);
      c.setUint32(42,offset,true);
      central.push(c.buffer,name);
      offset+=30+name.length+size;
    }
    const cSize=central.reduce((s,b)=>s+b.byteLength,0), e=new DataView(new ArrayBuffer(22));
    e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true);
    e.setUint32(12,cSize,true); e.setUint32(16,offset,true);
    return new Blob([...parts,...central,e.buffer],{type:'application/zip'});
  }
  window.StudioBatch={zip,crc32};
})();
