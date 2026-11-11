/* The "New Studio look" preview (flag "next", off by default). Loaded by Studio.lazy only when the flag is on; home() in studio.js
   calls into it at marked r3-next hooks. Brand-agnostic: no brand names or colours here. All styles are in next.css under :root[data-next]. */
(function(){
'use strict';
const NX={};
const SVGO='<svg class="ic-off" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const SVGN='<svg class="ic-on" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const CAL='<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 10h18" stroke="var(--raised)"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>';

/* the bar: Home · Saved · ( + ) · Plan · Templates. The existing anchors (and the + button) are re-used and re-ordered, so every
   handler in home() keeps working; Plan is new and opens the calendar page. */
NX.bar=function(fab){
  const nav=document.querySelector('.hubbar'); if(!nav||nav.dataset.nx) return;
  const get=t=>nav.querySelector('[data-tab="'+t+'"]');
  const plan=document.createElement('a'); plan.href='#calendar'; plan.dataset.tab='calendar'; plan.setAttribute('aria-current','false');
  plan.innerHTML=SVGO+CAL+'</svg>'+SVGN+CAL+'</svg><span>Plan</span>';
  const slot=document.createElement('span'); slot.className='nb-slot'; if(fab) slot.appendChild(fab);
  nav.append(get('home'),get('saved'),slot,plan,get('templates')); nav.dataset.nx='1';
};
/* the indicator slides to the current tab (centred, a short bar at the top edge) */
NX.pill=function(pill,on){ const x=on.offsetLeft+on.offsetWidth/2-14; pill.style.width='28px'; pill.style.height='3px'; pill.style.transform='translate('+x+'px,0)'; };

window.StudioNext=NX;
})();
