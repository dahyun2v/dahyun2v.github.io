// Presentation-only D3 kit. One set of roles for existing plates; no campaign state.
export const D3_ROLES = [
  ['.c294-head,.nj-picker,.nj-facility,.nj-departments,.c294-summary,.c399-military,.c294-policy,.c294-production-host,.c294-selection,.c294-choices,.c294-military,.c294-overview,.c294-overview-production', 'panel'],
  ['.od-shared-detail,.od-slots,.od-budget,.od-head,#result .c298-result-body,.c298-result-tabs', 'panel'],
  ['.c426-greeting h2', 'branch'],
  ['.c260-forecast,#c292-result-dock,.c335-dock,.c335-stats,.c300-basic,.c236-command-list,.nb-todo-panel,.ih-date,.ih-res', 'compact'],
  ['#diplo .c262-negotiation,#diplo .c262-factions,#c254-card .c373-report-paper,.c261-settings .c261-tab-content', 'panel'],
  ['.u3-sortie-panel,.u3-sortie-roster,.u3-sortie-head', 'panel'],
  ['.c426-selection footer button,.od-confirm,.rs-actions :is(button,a),.c261-tabs button,.c399-city .k-btn,.c399-city .k-tab', 'button'],
  ['.c432-art,.c298-draft-hero', 'art'],
  ['.od-foot,.rs-actions', 'toolbar'],
  ['.c426-selection,#officer-draft .c404-v6 .od,#city-stage .c399-city,#result .w-result', 'stage'],
];

// Dim only the decoration beneath public text. This never changes text or art.
function protectReadingArea(node,doc){
  const box=node.getBoundingClientRect();if(!box.width||!box.height)return;
  const walker=doc.createTreeWalker(node,4),rects=[];let text;
  while((text=walker.nextNode())){
    if(!text.textContent.trim()||text.parentElement.closest('.d3-ornament'))continue;
    const range=doc.createRange();range.selectNodeContents(text);
    for(const r of range.getClientRects())if(r.width&&r.height)rects.push(
      `<rect x="${r.x-box.x-6}" y="${r.y-box.y-4}" width="${r.width+12}" height="${r.height+8}" rx="5" fill="black"/>`);
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><rect width="100%" height="100%" fill="white"/>${rects.join('')}</svg>`;
  node.style.setProperty('--d3-reading-mask',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}

export function mountDetailD3(doc=globalThis.document) {
  if (!doc?.body) return;
  let queued=false;
  const watched=new Set();
  let plateSignatures462=new WeakMap();
  const roleSelector=D3_ROLES.map(([selector])=>selector).join(',');
  const schedule=()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  };
  const sizes=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  const apply = () => {
    for(const node of watched)if(!node.isConnected){sizes?.unobserve(node);watched.delete(node);}
    for (const [selector, role] of D3_ROLES) for (const node of doc.querySelectorAll(selector)) {
      const signature=[node.clientWidth,node.clientHeight,node.textContent].join('|');
      if(watched.has(node)&&plateSignatures462.get(node)===signature)continue;
      plateSignatures462.set(node,signature);
      if(!watched.has(node)){watched.add(node);sizes?.observe(node);}
      node.classList.add('d3-panel');
      node.dataset.d3Variant=role;
      node.style.setProperty('--d3-plate-height',`${node.clientHeight}px`);
      if(role==='compact'){
        if(node.clientWidth>660&&node.clientHeight>150)node.dataset.d3Roomy='true';else delete node.dataset.d3Roomy;
      }
      if(role==='stage')for(const bg of node.querySelectorAll(':scope > .c399-backdrop'))bg.classList.add('d3-backdrop');
      if(node.tagName==='HEADER'){
        if(node.getBoundingClientRect().width>1500)node.dataset.d3Wide='true';else delete node.dataset.d3Wide;
      }
      if(node.matches('.c294-head,.od-shared-detail,#result .c298-result-body')||role==='art') node.dataset.d3Seal='true';
      // Do not alter an existing positioned plate, nor create stacking over hero art.
      if (getComputedStyle(node).position==='static') node.classList.add('d3-relative');
      if (!node.querySelector(':scope > .d3-ornament')) {
        // Custom decoration tag avoids legacy HUD rules that force all spans opaque.
        const ink=doc.createElement('sg-d3-ornament');
        ink.className='d3-ornament';ink.setAttribute('aria-hidden','true');
        for(const part of ['paper','mountains','landscape','scenery','branch','birds','pine','pine-right','edge','seal']){
          const piece=doc.createElement('sg-d3-piece');piece.className=`d3-piece d3-${part}`;ink.append(piece);
        }
        node.append(ink);
      }
      if(['panel','compact','stage'].includes(role))protectReadingArea(node,doc);
    }
  };
  const observer=new MutationObserver(records=>{
    // Map impact particles are outside these plates and need no kit traversal.
    const relevant=n=>n.nodeType===1&&(n.matches(roleSelector)||n.querySelector(roleSelector));
    if (!records.some(r=>{
      const inside=r.target.nodeType===1&&r.target.closest('.d3-panel');
      if(r.type==='attributes')return inside||relevant(r.target);
      return [...r.addedNodes].some(n=>relevant(n)||inside&&n.nodeType===1&&!n.matches('.d3-piece,.d3-ornament'))||
        [...r.removedNodes].some(n=>relevant(n)||inside&&n.nodeType===1&&!n.classList.contains('d3-piece'));
    })) return;
    schedule();
  });
  apply();observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
  doc.fonts?.ready.then(()=>{plateSignatures462=new WeakMap();schedule();});
  globalThis.addEventListener?.('resize',schedule);
  return ()=>{observer.disconnect();sizes?.disconnect();watched.clear();globalThis.removeEventListener?.('resize',schedule);};
}
if (globalThis.document) {
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>mountDetailD3(),{once:true});
  else mountDetailD3();
}
