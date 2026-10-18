// C178: presentation only; sheets stay byte-for-byte as delivered.
import {fxPreferences} from './hud-ink.mjs';
export const LIFE_SHEETS = Object.freeze({
  smoke: {file:'C1-chimney-smoke', frames:6, fps:9, ratio:128/256},
  flame: {file:'C2-flame', frames:6, fps:10, ratio:64/96},
  flag: {file:'C3-red-flag', frames:4, fps:8, ratio:96/128},
  civilian: {file:'C4-civilian', frames:4, fps:7, ratio:64/96},
  soldier: {file:'C4-soldier', frames:4, fps:7, ratio:64/96},
  birds: {file:'C5-birds', frames:4, fps:7, ratio:128/64},
});

export function lifeIsPaused({hidden=false, inViewport=true, reduced=false, facility=false}={}) {
  return hidden || !inViewport || reduced || facility;
}

export function cityLifeHtml(art) {
  const known = art.life?.placements;
  // Different, uncharted paintings get only smoke and sky birds, never people on unknown roads.
  const placements = known ?? [
    {kind:'smoke', at:[.40,.42], width:.022},
    {kind:'smoke', at:[.62,.52], width:.018},
    {kind:'birds', at:[-.12,.16], width:.09, to:[1.12,.12], seconds:38},
  ];
  return `<div class="cs-life paused" aria-hidden="true">${placements.map((p,i)=>{
    const s=LIFE_SHEETS[p.kind]; if(!s)return '';
    const [x,y]=p.at, [tx,ty]=p.to??p.at;
    return `<i class="cs-life-path ${p.kind}${p.to?' travels':''}" style="left:${x*100}%;top:${y*100}%;width:${p.width*100}%;--dx:${(tx-x)/p.width*100}%;--dy:${(ty-y)/p.width*art.h/art.w*s.ratio*100}%;--facing:${tx<x?-1:1};--back:${tx<x?1:-1};--journey:${p.seconds??24}s;--phase:${-(p.phase??i*.13)}s"><i class="cs-life-sprite" style="aspect-ratio:${s.ratio};background-image:url('/assets/ui-v3/dots-1016/city-life/${s.file}.png');background-size:${s.frames*100}% 100%;--end:${s.frames/(s.frames-1)*100}%;--frames:${s.frames};--cycle:${s.frames/s.fps}s"></i></i>`;
  }).join('')}</div>`;
}

// One observer per stage, no frame loop, no work on the map or inside a facility scene.
const controllers = new WeakMap();
export function mountCityLife(root) {
  if(!root?.querySelector || !globalThis.MutationObserver)return;
  if(controllers.has(root)){controllers.get(root)();return;}
  const doc=root.ownerDocument, media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let inViewport=false;
  const update=()=>{
    const layer=root.querySelector('.cs-life');if(!layer)return;
    layer.classList.toggle('paused',lifeIsPaused({hidden:root.hidden||doc.hidden,inViewport,reduced:fxPreferences.reduced(),facility:root.classList.contains('push')||root.classList.contains('facility')}));
    layer.classList.toggle('reduced',fxPreferences.reduced());
  };
  if(globalThis.IntersectionObserver){new IntersectionObserver(entries=>{inViewport=entries[0]?.isIntersecting??false;update();}).observe(root);}
  else inViewport=true;
  new MutationObserver(update).observe(root,{attributes:true,attributeFilter:['hidden','class']});
  doc.addEventListener('visibilitychange',update);
  media?.addEventListener?.('change',update);
  doc.addEventListener('ink:fx-settings',update);
  controllers.set(root,update);update();
}
