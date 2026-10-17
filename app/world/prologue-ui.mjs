const escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function prologueGuide(s){
 const p=s.prologue,army=id=>`[data-unit="${id}"]`,tile=id=>`[data-tile="${id}"]`;
 const cao=s.officers.G07.locationRef;
 const rows={
 SORTIE:['1차례 · 출진','허창을 눌러 병영 → 출진. 하후돈 · 도검병 · 병력 5,000명을 고르세요. 조조도 도검병 4,000명으로 출진시킵니다.','[data-city="west"]'],
 MOVE:['1차례 · 이동',`하후돈 부대를 고르면 이동 칸과 붉은 통제 구역이 보입니다. 표시된 칸(${p.moveTileId})으로 이동하세요.`,tile(p.moveTileId)],
 END_FIRST:['1차례 · 함께 출진',cao.kind==='ARMY'?'조조를 (-9,26) 칸으로 옮긴 뒤 차례를 끝내세요. 두 부대가 다른 방향에서 적을 마주합니다.':'허창 병영에서 조조도 도검병 4,000명으로 출진시켜 (-9,26)으로 이동하세요.',cao.kind==='ARMY'?'#end-turn':'[data-city="west"]'],
 COMBAT:['2차례 · 교전 예고와 측면','조조 부대를 선택하고 적 수비대를 가리키세요. 피해·반격과 측면 +15%를 확인한 뒤 공격하세요.',army(p.defenderId)],
 END_SECOND:['2차례 · 공격 완료','측면에서 실제로 공격했습니다. 차례를 끝내면 작은 성을 공격합니다.','#end-turn'],
 CITY:['3차례 · 성 공격','하후돈을 선택해 기억의 작은 성을 공격하세요. 수비·내구를 확인합니다. 내구 0 + 성 공격이면 함락입니다.', '[data-city="julu"]'],
 DONE:['서장 끝','출진과 병력 선택 · 이동과 통제 구역 · 교전 예고와 측면 · 성 공격과 함락',null]
 };
 const [heading,text,target]=rows[p.stage];return {heading,text,target,done:p.stage==='DONE'};
}
export function prologueHtml(s){
 const g=prologueGuide(s);
 if(g.done)return `<section class="c227-prologue-end" role="dialog" aria-modal="true" aria-labelledby="c227-prologue-title"><img class="c227-cao" src="/assets/officer-art/cutout/G07.png" alt="조조"><div><h2 id="c227-prologue-title">서장 끝</h2><h3>배운 것</h3><ul><li>출진: 장수·병종·병력 선택</li><li>이동: 이동 칸과 통제 구역</li><li>교전: 피해·반격 예고와 측면 +15%</li><li>함락: 내구 0 + 성 공격</li></ul><p>조조 — 이 칼의 무게가 낯설지 않군.</p><button type="button" data-prologue-main>본 판 시작</button><button type="button" data-prologue-retry>다시 하기</button></div></section>`;
 return `<section class="c225-coach" role="region" aria-label="서장 안내"><header><b>${g.heading}</b><button type="button" data-prologue-skip>건너뛰기</button></header><p>${escapeHtml(g.text)}</p><button type="button" data-prologue-retry aria-label="다시 하기">다시 하기</button><small>실제 행동을 하면 다음 안내로 이어집니다.</small></section>`;
}
// C225b: the left rail includes danger/undo controls and may grow after movement.
export function prologuePlacement({width,coachWidth,headerBottom=0,railRight=0}){
 return {left:Math.min(Math.max(100,railRight+16),Math.max(16,width-coachWidth-16)),top:Math.max(76,headerBottom+12)};
}
export function renderPrologue(s,{document:doc=globalThis.document,navigate=url=>globalThis.location.assign(url),complete=()=>{}}={}){
 if(!s?.prologue)return;
 let root=doc.querySelector('#c225-prologue');if(!root){root=doc.createElement('aside');root.id='c225-prologue';doc.body.appendChild(root);}
 root.innerHTML=prologueHtml(s);
 root.querySelector('[data-prologue-skip]')?.addEventListener('click',()=>navigate('/world?entry=new'));
 root.querySelector('[data-prologue-main]')?.addEventListener('click',()=>navigate('/world?entry=new'));
 root.querySelector('[data-prologue-retry]')?.addEventListener('click',()=>navigate('/world?entry=prologue'));
 const save=doc.querySelector('[data-fwd="#save"]');if(save){save.disabled=true;save.title='서장에서는 저장하지 않습니다';}
 root.dataset.done=String(s.prologue.stage==='DONE');
 if(s.prologue.stage==='DONE'){complete();root.style.left='0';root.style.top='0';root.style.right='0';root.style.bottom='0';return;}
 const guide=prologueGuide(s);
 // Prefer the open sortie controls over the city beneath the scene.
 const preferred=guide.target?.includes('data-city')?guide.target.replace('[data-city','#map .w-cityplate[data-city'):guide.target;
 const selectors=['#sortie-screen [data-sortie]','#city-quick:not([hidden]) [data-city-quick-action="sortie"]','[data-sortie-open]',preferred??'#c225-prologue'];
 const target=selectors.flatMap(selector=>[...doc.querySelectorAll(selector)]).find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0;});
 for(const n of doc.querySelectorAll('.c225-pointed'))n.classList.remove('c225-pointed');
 target?.classList.add('c225-pointed');
 if(target){const r=target.getBoundingClientRect(),arrow=doc.createElement('img');arrow.className='c225-arrow';arrow.src='/assets/ui-v3/hud/kit-brush-arrow.png';arrow.alt='';arrow.style.left=Math.max(2,r.left-42)+'px';arrow.style.top=Math.max(50,r.top+r.height/2-14)+'px';root.appendChild(arrow);}
 root.dataset.target=guide.target??'';
 // Keep the coach in free map space, clear of the top HUD, right report and bottom commands.
 const railRight=Math.max(0,...[...doc.querySelectorAll('.nb-bookmarks,#c186-danger,#c186-undo,#c186-undo-reason')].map(n=>n.getBoundingClientRect().right));
 const at=prologuePlacement({width:doc.documentElement.clientWidth,coachWidth:root.getBoundingClientRect().width,headerBottom:doc.querySelector('.nb-state-title')?.getBoundingClientRect().bottom??0,railRight});
 root.style.left=at.left+'px';root.style.right='auto';root.style.top=at.top+'px';
 root.style.bottom='auto';
}
