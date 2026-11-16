/* r6-nav: the top-left Back button goes to exactly where you came from (the same screen, collection, tab and scroll), never "always Home".
   Tiny and standalone: loaded first on every page that has a back link (tools, Create, Video, Board, the Lab, What's New). studio.js's
   Studio.goBack(href) wraps go() so open layers' history entries are stepped over and the leave prompts run first.
   came: the page before this one was a Studio page (same-origin referrer, or a breadcrumb the previous Studio page left in sessionStorage
   when it was closed, for when the referrer is stripped). Without that (deep link, new tab, installed app) the link goes to the hub at
   the last view it showed. A link marked data-back keeps its href, so "open in a new tab" still works. */
(function(){
'use strict';
var KEY='studio:crumb', VIEW='studio:view', came=false;
try{ var r=new URL(document.referrer); came=r.origin===location.origin&&r.href.split('#')[0]!==location.href.split('#')[0]; }catch(_){}
if(!came){ try{ var c=JSON.parse(sessionStorage.getItem(KEY)||'null'); came=!!c&&Date.now()-c.t<20000&&String(c.from).split('#')[0]!==location.href.split('#')[0]; }catch(_){} }
addEventListener('pagehide',function(){ try{ sessionStorage.setItem(KEY,JSON.stringify({from:location.href,t:Date.now()})); }catch(_){} });
function canBack(){ return came&&history.length>1; }
/* where a link with no history goes: the hub, at the view the person was last on in this tab */
function target(fb){
  var v=''; try{ v=sessionStorage.getItem(VIEW)||''; }catch(_){}
  return v&&fb.indexOf('#')<0&&/index\.html$/.test(fb.split('?')[0])?fb+v:fb; }
/* extra: history entries opened by layers on this page that are still there; they are stepped over in one go */
function go(fb,extra){
  if(canBack()){ try{ history.go(-(1+(extra|0))); return true; }catch(_){} }
  location.href=target(fb); return false; }
document.addEventListener('click',function(e){
  if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
  var a=e.target.closest&&e.target.closest('a[data-back]'); if(!a) return;
  if(!canBack()){ var t=target(a.href); if(t!==a.href){ e.preventDefault(); location.href=t; } return; }
  e.preventDefault(); if(window.Studio&&Studio.goBack) Studio.goBack(a.href); else go(a.href,0); });
window.StudioBack={canBack:canBack,go:go,target:target};
})();
