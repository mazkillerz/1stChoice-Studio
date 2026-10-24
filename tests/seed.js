/* Test helper: seeds fakecloud (tests/fakecloud.js) with a few saved designs, using the tool thumbnails as their pictures.
   Usage (Playwright): await ctx.addInitScript({content: seedScript(designs)}) where designs come from seedDesigns(). */
import fs from 'fs';
const ROOT=new URL('..',import.meta.url);
export function seedDesigns(){
  const pic=id=>'data:image/jpeg;base64,'+fs.readFileSync(new URL('assets/thumbs/1stchoice/'+id+'-sm.jpg',ROOT)).toString('base64');
  const day=n=>new Date(Date.now()-n*3600e3).toISOString();
  const list=[['restock','Restock – 24 Oct',1,['Restocks']],['photo-story','Photo story – 23 Oct',5,[]],['offer','Offer – 22 Oct',20,['Offers']],['restock','Restock – 21 Oct',40,['Restocks']],
    ['carousel','Carousel – 20 Oct',60,[]],['highlight','Highlight covers – 19 Oct',80,[]],['collage','Collage – 18 Oct',100,[]],['split','Two-photo split – 17 Oct',120,[]]];
  const db={designs:{},files:{},cols:{Restocks:{id:'Restocks',name:'Restocks',brand:'1stchoice'},Offers:{id:'Offers',name:'Offers',brand:'1stchoice'}}};
  list.forEach(([tool,name,h,cols],i)=>{ const id='seed'+i, thumb='1stchoice/'+id+'/thumb.jpg'; db.files[thumb]=pic(tool);
    db.designs[id]={id,brand:'1stchoice',tool,name,kind:'design',recipe:{photoPaths:[]},thumb_path:thumb,cols,updated_at:day(h)}; });
  return db;
}
export const seedScript=db=>`try{ if(!localStorage.getItem('fakecloud')) localStorage.setItem('fakecloud',${JSON.stringify(JSON.stringify(db))}); }catch(e){}`;
