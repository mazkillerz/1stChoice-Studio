/* Feed preview (2.9.0, brand-agnostic): the Calendar's third view. A phone-shaped 3-column grid like an Instagram profile (tiles 3:4, 2px gaps,
   newest top-left) of the posts and reels from 60 days back to 90 days ahead, so planned ones sit above posted ones like they will on the profile.
   assets/calendar.js hands in what it already has (items, designs, thumb urls); this file only builds the HTML (taps are handled by the calendar: data-open opens the edit sheet).
   No reordering in this version. */
(function(){
const pad=n=>(n<10?'0':'')+n, iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DAYS_BACK=60, DAYS_AHEAD=90;
function range(base){ base=base||new Date(); const t=new Date(base.getFullYear(),base.getMonth(),base.getDate());
  return [new Date(t.getFullYear(),t.getMonth(),t.getDate()-DAYS_BACK),new Date(t.getFullYear(),t.getMonth(),t.getDate()+DAYS_AHEAD)]; }
/* posts and reels (not stories, not the read-only old log), newest first */
function pick(items,fmtOf){ const [a,b]=range(), lo=iso(a), hi=iso(b);
  return items.filter(x=>!x.legacy&&x.day>=lo&&x.day<=hi&&fmtOf(x)!=='story')
    .sort((p,q)=>((q.day+' '+(q.at||'00:00')).localeCompare(p.day+' '+(p.at||'00:00')))||String(q.id).localeCompare(String(p.id))); }
function html(c){ const list=pick(c.items,c.fmtOf);
  if(!list.length) return `<div class="feed-empty"><b>Nothing planned for your feed yet</b><p>Add a post or a reel and it shows up here, like on your profile.</p><button type="button" class="btn slim" data-add="${c.todayIso}">${c.plus||''}<span>Add a post</span></button></div>`;
  const tile=it=>{ const d=(it.design_ids||[]).map(c.designOf).find(Boolean), posted=it.status==='posted', f=c.fmtOf(it);
    const pic=d&&d.thumb_path?`<img alt="" decoding="async" data-path="${c.esc(d.thumb_path)}"${c.urls[d.thumb_path]?` src="${c.urls[d.thumb_path]}"`:''}>`:`<span class="ft-title" dir="auto">${c.esc(it.title||'Untitled')}</span>`;
    return `<button type="button" class="feed-tile${posted?' posted':' planned'}${d&&d.thumb_path?' has-pic':''}" data-open="${c.esc(it.id)}" data-id="${c.esc(it.id)}" aria-label="${c.esc((it.title||'Untitled')+', '+(posted?'posted':'planned')+' '+c.dayLabel(it.day))}">${pic}${f==='reel'?`<span class="ft-fmt" aria-hidden="true">${(c.fmtIcon&&c.fmtIcon('reel'))||''}</span>`:''}${posted?'':`<span class="feed-badge"><bdi>${c.esc(c.dayLabel(it.day))}</bdi></span>`}</button>`; };
  return `<div class="feed"><div class="feed-grid">${list.map(tile).join('')}</div></div>`; }
window.StudioFeed={ html, range, pick, DAYS_BACK, DAYS_AHEAD };
})();
