// Read-only art selection. No combat, roster or save mutations.
const names={G34:'조인',G41:'노숙',G17:'맹획',G36:'순유',G11:'동탁',G35:'가후',G03:'제갈량',G43:'법정',G42:'위연',G15:'유장',G14:'공손찬',G39:'저수',G26:'초선',G10:'원술',G46:'이각'};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateOfficerArtCatalog(catalog){
 if(catalog?.schema!=='adopted-officer-art-v1'||!Array.isArray(catalog.officers)||catalog.officers.length!==Object.keys(names).length)throw new Error('장수 그림 목록을 확인할 수 없습니다.');
 const ids=new Set();for(const art of catalog.officers){
  if(ids.has(art.officerId)||names[art.officerId]!==art.name||!/^\/assets\/officer-art\/G\d{2}-[a-f0-9]{12}\.(png|jpeg)$/.test(art.path)||!art.path.split('/').at(-1).startsWith(art.officerId+'-')||!/^[a-f0-9]{64}$/.test(art.sha256)||!art.path.includes(art.sha256.slice(0,12))||typeof art.version!=='string')throw new Error('장수와 그림의 연결이 일치하지 않습니다.');
  if(art.officerId==='G26'&&(art.version!=='v5'||art.sha256!=='3fcd43dd7edec526d9fb9a2dd3be1367f24090772f5a826f96b38f61668606e9'))throw new Error('초선은 채택된 v5 그림만 사용할 수 있습니다.');
  if(art.officerId==='G10'&&(art.version!=='v3'||art.sha256!=='f9ead10c35e761b1963f1d1a4a0e3ad0c3c1231b0529644b982b9d489369c706'))throw new Error('원술은 확인된 v3 PNG만 사용할 수 있습니다.');
  if(art.officerId==='G46'&&(art.version!=='v3'||art.sha256!=='dc7a33a32e066643a9e48bb4c2d3becbe072141daabb5971141f21150c13980f'))throw new Error('이각은 사용자 채택 v3 그림만 사용할 수 있습니다.');
  ids.add(art.officerId);
 }return catalog;
}
export function mountOfficerArt(root,catalog){
 validateOfficerArtCatalog(catalog);let selected=catalog.officers[0].officerId;
 function render(){
  const art=catalog.officers.find(a=>a.officerId===selected);
  root.innerHTML=`<h2>장수 일러스트</h2><p class="muted">장수를 선택하면 확인된 15명의 그림을 크게 볼 수 있습니다. 원술(G10)은 전달받은 v3 PNG를 사용하며 이전 JPEG 참조와 구분합니다. 지도에서는 부대 깃발을 사용합니다.</p><div class="officer-art-layout"><div class="officer-art-list" aria-label="장수 목록">${catalog.officers.map(a=>`<button type="button" class="officer-art-card" data-art-id="${a.officerId}" aria-pressed="${a.officerId===selected}"><img src="${a.path}" alt="${escape(a.name)} 전신 그림" loading="lazy"><span>${escape(a.name)}</span><small>${a.officerId} · ${escape(a.version)}</small></button>`).join('')}</div><figure class="officer-art-detail"><img data-art-detail-image src="${art.path}" alt="${escape(art.name)} ${escape(art.version)} 채택 그림"><figcaption aria-live="polite">${escape(art.name)} · ${art.officerId} · ${escape(art.version)}</figcaption><p data-art-status role="status"></p></figure></div>`;
  root.querySelector('[data-art-detail-image]')?.addEventListener('error',()=>{root.querySelector('[data-art-status]').textContent='그림을 불러오지 못했습니다. 다른 장수를 선택할 수 있습니다.';});
 }
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-art-id]');if(!button||!root.contains(button))return;
  if(!catalog.officers.some(a=>a.officerId===button.dataset.artId))return;
  selected=button.dataset.artId;render();root.querySelector(`[data-art-id="${selected}"]`)?.focus({preventScroll:true});
 });render();
}
const root=typeof document==='undefined'?null:document.querySelector('#officer-art');
if(root)fetch('/data/adopted-officer-art.json').then(response=>{if(!response.ok)throw new Error('장수 그림 목록을 불러오지 못했습니다.');return response.json();}).then(catalog=>mountOfficerArt(root,catalog)).catch(error=>{root.textContent=error.message;});
