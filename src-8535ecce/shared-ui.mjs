// Presentation only. Native event handlers own commands and their existing success sounds.
export const escapeUi=value=>String(value??'정보 없음').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Small presentation glyphs are inline so every consuming screen has their geometry.
const uiShapes={
 population:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2"/>',
 food:'<path d="M12 21V3m0 5C5 8 5 3 5 3s7 0 7 5zm0 6c-7 0-7-5-7-5s7 0 7 5zm0-3c7 0 7-5 7-5s-7 0-7 5zm0 6c7 0 7-5 7-5s-7 0-7 5z"/>',
 reserved:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
 wait:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 brace:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM12 7v10"/>',
 cancel:'<path d="m6 6 12 12M18 6 6 18"/>',
 plain:'<path d="M3 18h18M5 12h4m6 0h4M10 6h4"/>',
 forest:'<path d="m8 3-5 8h3l-4 6h12l-4-6h3zM8 17v4m9-17-3 5h2l-2 5h7l-3-5h2zm0 10v5"/>',
 hill:'<path d="M2 19c5-13 15-13 20 0H2zm5-5c3-3 7-3 10 0"/>',
 mountain:'<path d="m2 21 9-18 11 18H2zm6-12 3 3 3-4"/>'
};
export function presentationIcon(key){return Object.hasOwn(uiShapes,key)?`<svg class="ui-icon" data-ui-icon="${key}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${uiShapes[key]}</svg>`:'';}
export function commandIcon(key){return ['move','current','attack','engaged','done','save','settings'].includes(key)?`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ui-${key}" width="24" height="24"/></svg>`:presentationIcon(key);}
const terrainNames={plain:'평지',forest:'숲',hill:'언덕',mountain:'산'};
export function terrainLegend(tiles){return `<div class="ui-terrain-legend" aria-label="지도 지형">${Object.keys(terrainNames).filter(key=>tiles.some(t=>t.type===key)).map(key=>`<span>${presentationIcon(key)}${terrainNames[key]}</span>`).join('')}</div>`;}
export const terrainArtPaths=Object.freeze(Object.fromEntries(Object.keys(terrainNames).map(key=>[key,`/assets/terrain-art/${key}_v1.png`])));
// Optional presentation cache, never part of game state or saves. Missing/invalid files keep CSS terrain.
export function loadTerrainArt(onReady,ImageClass=globalThis.Image){
 const ready=new Set();
 if(typeof ImageClass!=='function')return ready;
 for(const [key,path] of Object.entries(terrainArtPaths)){
  const image=new ImageClass();
  image.onload=()=>{if(image.naturalWidth>0&&image.naturalWidth===image.naturalHeight){ready.add(key);onReady?.();}};
  image.onerror=()=>{};
  image.src=path;
 }
 return ready;
}
export function terrainTexture(tile,center,points,ready,prefix){
 if(!Object.hasOwn(terrainArtPaths,tile.type)||!ready?.has(tile.type))return '';
 const id=`${prefix}-terrain-${tile.at[0]}-${tile.at[1]}`;
 return `<g class="terrain-texture" aria-hidden="true" pointer-events="none"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><polygon points="${escapeUi(points)}"/></clipPath></defs><image href="${terrainArtPaths[tile.type]}" x="${center.x-24}" y="${center.y-24}" width="48" height="48" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/></g>`;
}
export function uiButton({id,label,disabled=false,selected,icon,title,cityId}){
 return `<button${id?` id="${escapeUi(id)}"`:''} class="ui-button" type="button"${disabled?' disabled':''}${typeof selected==='boolean'?` aria-pressed="${selected}"`:''}${cityId?` data-city="${escapeUi(cityId)}"`:''}${title?` title="${escapeUi(title)}"`:''}>${commandIcon(icon)}${escapeUi(label)}</button>`;
}
export function resourceStrip(items){return `<div class="resources ui-resources" aria-label="자원 현황">${items.map(({label,value,icon})=>`<div class="ui-resource">${presentationIcon(icon)}${escapeUi(label)}<strong>${escapeUi(Number.isFinite(value)?value:'정보 없음')}</strong></div>`).join('')}</div>`;}
export function uiPanel(content,{tag='section',className='',label=''}={}){return `<${tag==='aside'?'aside':'section'} class="${escapeUi(className)} ui-panel"${label?` aria-label="${escapeUi(label)}"`:''}>${content}</${tag==='aside'?'aside':'section'}>`;}
const baseTroopNames={FOOT_CLOSE:'근접 보병 기반',FOOT_REACH:'장병 전열 기반',FOOT_RANGED:'원거리 기반',MOUNTED:'기마 기반'};
const troopShapes={
 FOOT_CLOSE:'<circle cx="-3" cy="-10" r="4"/><path d="M-3-5v14m0-10-8 5m8-5 9 4M-3 9l-7 9m7-9 6 9"/><path d="M5 0h10v9l-5 5-5-5z"/>',
 FOOT_REACH:'<circle cx="-6" cy="-8" r="3"/><circle cx="5" cy="-8" r="3"/><path d="M-6-4v13m11-13v13M-6 9l-4 8m4-8 4 8M5 9l-4 8m4-8 4 8M-1-22v37m12-37v37"/>',
 FOOT_RANGED:'<circle cx="-6" cy="-10" r="4"/><path d="M-6-5v14m0-9 13-3M-6 9l-5 9m5-9 5 9M8-15q16 15 0 30M8-15v30M0 0h20m-3-3 3 3-3 3"/>',
 MOUNTED:'<path d="M-15 1h20l7-10 6 3-2 13-7 2H-10l-6-3zM-11 9l-3 10m7-10-1 10M6 9l-1 10m7-12 3 12M-16 3l-6-7"/><circle cx="-2" cy="-14" r="4"/><path d="M-2-10l4 8-8 4M0-5l9-3"/>'
};
const displayArtPaths=Object.freeze({FOOT_CLOSE:'/assets/troop-art/infantry.png',FOOT_REACH:'/assets/troop-art/spear_infantry.png',FOOT_RANGED:'/assets/troop-art/ranged.png',MOUNTED:'/assets/troop-art/cavalry.png',city:'/assets/map-art/walled_city_v1.png',farm:'/assets/facility-art/farm_v1.png',market:'/assets/facility-art/market_v1.png',granary:'/assets/facility-art/granary_v1.png',barracks:'/assets/facility-art/barracks_v1.png'});
export function loadDisplayArt(onReady,ImageClass=globalThis.Image){
 const ready=new Set();if(typeof ImageClass!=='function')return ready;
 for(const [key,path] of Object.entries(displayArtPaths)){const image=new ImageClass();image.onload=()=>{if(image.naturalWidth>0&&image.naturalHeight>0){ready.add(key);onReady?.();}};image.onerror=()=>{};image.src=path;}return ready;
}
export function cityArt(ready){return ready?.has('city')?`<image class="city-art" href="${displayArtPaths.city}" x="-22" y="-21" width="44" height="30" preserveAspectRatio="xMidYMid meet" pointer-events="none" aria-hidden="true"/>`:'';}
export function facilityArtGallery(ready){
 const labels={farm:'농장',market:'시장',granary:'곡창',barracks:'병영'};
 const keys=Object.keys(labels).filter(key=>ready?.has(key));return keys.length?`<details class="facility-art-gallery"><summary>시설 그림</summary><p class="muted">시설 외형을 살펴봅니다. 현재 도시의 건설·배치 현황을 나타내지는 않습니다.</p><div>${keys.map(key=>`<figure><img src="${displayArtPaths[key]}" alt="${labels[key]} 외형" loading="lazy"><figcaption>${labels[key]}</figcaption></figure>`).join('')}</div></details>`:'';
}

export function troopSymbol(troop,ready){return Object.hasOwn(troopShapes,troop)?ready?.has(troop)?`<image class="troop-raster" data-base-troop="${troop}" aria-label="${baseTroopNames[troop]}" href="${displayArtPaths[troop]}" x="-21" y="-22" width="42" height="42" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`:`<g class="troop-silhouette" data-base-troop="${troop}" aria-label="${baseTroopNames[troop]}">${troopShapes[troop]}</g>`:'<text class="missing-troop" y="3">?</text>';}
export function approvedPortrait(officer,catalog){
 if(catalog?.schema!=='adopted-officer-art-v1'||!Array.isArray(catalog.officers)||!officer||!/^G\d{2}$/.test(officer.officerId))return null;
 const pathPattern=new RegExp('^/assets/officer-art/'+officer.officerId+'-[a-f0-9]{12}\\.(png|jpeg)$');
 const matches=catalog.officers.filter(art=>art!==null&&typeof art==='object'&&!Array.isArray(art)&&art.officerId===officer.officerId&&art.name===officer.name&&typeof art.path==='string'&&typeof art.sha256==='string'&&pathPattern.test(art.path)&&/^[a-f0-9]{64}$/.test(art.sha256)&&art.path.includes(art.sha256.slice(0,12)));
 return matches.length===1?matches[0]:null;
}
export function unitArt(officer,initialData,catalog){
 const army=initialData?.world?.armies?.[officer?.unitId];
 // Existing FIRST3 identity metadata is display only; it never enters Round stats/saves.
 const matched=!!army&&army.commanderId===officer?.officerId&&army?.factionId===officer?.factionId;
 const baseTroop=matched?({militia:'FOOT_CLOSE',spear:'FOOT_REACH',bow:'FOOT_RANGED',cavalry:'MOUNTED'}[army.troopType]??null):null;
 return {baseTroop,portrait:approvedPortrait(officer,catalog)};
}
export function portraitBadge(officer,art){
 const name=escapeUi(officer?.name??'정보 없음'),id=/^G\d{2}$/.test(officer?.officerId)?officer.officerId:'unknown',clip='portrait-'+id;
 return art&&approvedPortrait(officer,{schema:'adopted-officer-art-v1',officers:[art]})?`<g class="officer-badge" data-portrait-officer="${id}"><defs><clipPath id="${clip}"><rect x="-13" y="-64" width="26" height="32" rx="3"/></clipPath></defs><image href="${escapeUi(art.path)}" x="-13" y="-64" width="26" height="32" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clip})"/><rect x="-13" y="-64" width="26" height="32" rx="3" fill="none"/><title>${name} 채택 그림</title></g>`:`<g class="officer-badge portrait-missing" data-portrait-officer="${id}" data-portrait-status="missing"><rect x="-13" y="-64" width="26" height="32" rx="3"/><text y="-46">${escapeUi(officer?.name?.[0]??'?')}</text><text class="missing-label" y="-34">미확보</text><title>${name} · 해당 장수 채택 그림 없음</title></g>`;
}

// Restore the same native control after a presentation-only re-render.
export function preserveUiFocus(root){
 const focused=globalThis.document?.activeElement;
 if(!focused||!root?.contains?.(focused))return ()=>{};
 const id=focused.id,attrs=['data-city','data-unit','data-tile','data-target'];
 const field=attrs.find(a=>focused.hasAttribute?.(a)),value=field?focused.getAttribute(field):null;
 return ()=>{const node=id?globalThis.document.getElementById(id):field?[...root.querySelectorAll(`[${field}]`)].find(n=>n.getAttribute(field)===value):null;if(node&&!node.disabled)node.focus?.({preventScroll:true});};
}
