import {createSettlementAudio} from '/src/settlement-audio.mjs';
import {uiButton,uiPanel,resourceStrip,unitArt,troopSymbol,portraitBadge,preserveUiFocus,terrainLegend,loadTerrainArt,terrainTexture,loadDisplayArt,cityArt,facilityArtGallery} from '/src/shared-ui.mjs';
import {createMapCampaignApi,INTEGRATED_SLOT} from '/src/map-campaign-trial.mjs';
import {createCampaignActionAudio} from '/src/campaign-action-audio.mjs';
const q=s=>document.querySelector(s),esc=v=>String(v??'없음').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let initialArtData=null,artCatalog=null;
const displayArt=loadDisplayArt(()=>render());
const terrainArt=loadTerrainArt(()=>render());
let api,map,state=null,selection=null,destination=null,target=null,epoch=0,busy=false;
let menuOpen=false,moveMode=false;
function closeUnitMenu(){menuOpen=false;moveMode=false;destination=null;target=null;epoch++;render();}
export function unitMenuPlacement(rect,scroll,viewport,anchor,menuHeight){
 const left=Math.max(8,rect.left,scroll.left),top=Math.max(8,rect.top,scroll.top),right=Math.min(viewport.width-8,rect.right,scroll.right),bottom=Math.min(viewport.height-8,rect.bottom,scroll.bottom);
 const width=Math.max(0,Math.min(280,right-left)),height=Math.max(0,bottom-top);
 if(width<120||height<90)return null;
 const x=anchor.clientX??rect.left+(28+24*Math.sqrt(3)*(anchor.q+anchor.r/2))/1070*rect.width,y=anchor.clientY??rect.top+(28+36*anchor.r)/535*rect.height;
 return {width,maxHeight:height,left:Math.max(left,Math.min(x+26,right-width)),top:Math.max(top,Math.min(y-25,bottom-Math.min(menuHeight,height)))};
}
function positionUnitMenu(){
 const menu=q('#unit-menu'),svg=q('svg.map');if(!menu||!svg?.getBoundingClientRect)return;
 const unit=selection?.kind==='UNIT'?api.view(state).units.find(u=>u.id===selection.id):null;if(!unit)return;
 const anchor={...unit.anchor};if(svg.createSVGPoint&&svg.getScreenCTM()){const point=svg.createSVGPoint();point.x=28+24*Math.sqrt(3)*(anchor.q+anchor.r/2);point.y=28+36*anchor.r;const client=point.matrixTransform(svg.getScreenCTM());anchor.clientX=client.x;anchor.clientY=client.y;}
 const placement=unitMenuPlacement(svg.getBoundingClientRect(),q('.map-scroll').getBoundingClientRect(),{width:innerWidth,height:innerHeight},anchor,menu.offsetHeight);
 menu.hidden=!placement;if(!placement)return;
 for(const [key,value] of Object.entries(placement))menu.style[key]=value+'px';
}
const session=globalThis.crypto.randomUUID(),audio=createCampaignActionAudio();
const settlementAudio=createSettlementAudio();
const notify=s=>q('#notice').textContent=s;
function run(fn){if(busy)return;try{fn();}catch(e){notify('처리하지 못했습니다: '+e.message);}render();}
function dispatch(domain,request,stamp,revision){if(stamp!==epoch||busy||revision!==state?.revision){notify('이전 화면의 입력입니다. 현재 현황에서 다시 선택하세요.');return;}run(()=>{if(domain==='DOMESTIC'&&request.kind==='TURN')settlementAudio.unlock();else if(domain==='TACTICAL')audio.unlock();const id=`${session}:${stamp}:${revision}:${domain}:${request.kind}`,before=state;state=api.step(state,{id,expectedRevision:revision,domain,request});destination=null;target=null;if(state!==before){menuOpen=false;moveMode=false;epoch++;}if(state!==before&&domain==='DOMESTIC'&&request.kind==='TURN')settlementAudio.play(id);if(state!==before&&domain==='TACTICAL')audio.playTransition(before,state,request,id);notify(domain==='DOMESTIC'&&request.kind==='TURN'?'10일 정산 완료. 도시 장부를 확인하세요.':'통합 상태에 명령을 반영했습니다.');});}
const domestic=(kind,fields={})=>({kind,cityId:null,officerId:null,job:null,amount:null,...fields});
function render(){
 q('#start').disabled=!api||!!state;q('#load').disabled=!api||busy;q('#save').disabled=!state||busy;q('#settle').disabled=!state||busy;
 if(!state){q('#play').textContent='통합 시험을 시작하거나 독립 통합 저장을 재개하세요.';return;}
 const v=api.view(state),stamp=epoch,rev=state.revision,active=v.active,ownActive=v.units.find(u=>u.id===active?.unitId)?.own&&!v.result;
 const name=id=>v.units.find(u=>u.id===id)?.name??id;
 const p=(a,b)=>({x:28+24*Math.sqrt(3)*(a+b/2),y:28+36*b});
 const polygon=(a,b)=>{const x=p(a,b);return Array.from({length:6},(_,i)=>`${x.x+23*Math.cos(i*Math.PI/3-Math.PI/6)},${x.y+23*Math.sin(i*Math.PI/3-Math.PI/6)}`).join(' ');};
 const tiles=map.tiles.map(t=>{const id=t.at.join(','),legal=moveMode&&selection?.id===active?.unitId&&ownActive&&v.moves.some(m=>m.tileId===id);const texture=terrainTexture(t,p(...t.at),polygon(...t.at),terrainArt,'campaign');return `${texture}<polygon style="fill-opacity:${texture?.length?0.3:1}" class="tile terrain-${esc(t.type)} ${v.arena.includes(id)?'arena':''} ${legal?'reachable':''}" points="${polygon(...t.at)}" ${legal?`data-tile="${id}" role="button" tabindex="0" aria-label="${id} 이동 실행"`:''}><title>${id}</title></polygon>`;}).join('');
 const cities=v.cities.map(c=>{const a=p(...c.at);return `<g data-city="${c.id}" role="button" tabindex="${moveMode?-1:0}" aria-disabled="${moveMode}" aria-label="${esc(c.name)} 도시 선택" aria-pressed="${selection?.kind==='CITY'&&selection.id===c.id}" transform="translate(${a.x},${a.y})">${cityArt(displayArt)}<rect style="fill-opacity:${displayArt.has('city')?0.15:1}" class="city-mark ${selection?.kind==='CITY'&&selection.id===c.id?'city-selected':''}" x="-12" y="-12" width="24" height="24"/><rect class="city-label-hit" x="-116" y="-55" width="104" height="44" rx="6"/><text class="city-click-label" x="-64" y="-29" text-anchor="middle">성 · ${esc(c.name)}</text></g>`;}).join('');
 const units=v.units.map(u=>{const a=p(u.anchor.q,u.anchor.r),officer=api.config.roster.find(o=>o.unitId===u.id),art=unitArt(officer,initialArtData,artCatalog);return `<g data-unit="${u.id}" role="button" tabindex="0" aria-label="${esc(u.name)} 부대 선택${active?.unitId===u.id&&!v.result?' · 현재 차례':''}" aria-pressed="${selection?.kind==='UNIT'&&selection.id===u.id}" class="${selection?.kind==='UNIT'&&selection.id===u.id?'selected-unit':''} ${active?.unitId===u.id?'active-unit':''}" transform="translate(${a.x},${a.y})"><rect class="unit-name-hit" x="-32" y="22" width="64" height="30"/><circle r="21" fill="${u.own?'#3c6083':'#a04b40'}" opacity="${u.count?1:.3}"/>${selection?.kind==='UNIT'&&selection.id===u.id?'<rect class="selection-frame" x="-25" y="-25" width="50" height="50" rx="5"/>':''}${active?.unitId===u.id&&!v.result?`<circle class="turn-outline" r="33"/><circle class="turn-ring" r="29"/><path class="turn-arrow" d="M-7-45H7L0-35Z"/><rect class="turn-label-hit" x="-72" y="-79" width="144" height="31"/><g class="turn-label"><rect x="-70" y="-76" width="140" height="27" rx="5"/><text y="-58" text-anchor="middle">◆ 현재 차례 · ${esc(u.name)}</text></g>`:''}${troopSymbol(art.baseTroop,displayArt)}${portraitBadge(officer,art.portrait)}<text class="unit-name" y="33" text-anchor="middle">${esc(u.name)}</text><text class="unit-count" y="46" text-anchor="middle">${u.count}</text></g>`;}).join('');
 let unitMenu='',panel='<h2>도시 또는 부대 선택</h2><p>부대를 누르면 부대 근처에서 명령을 선택합니다. 도시는 내정 패널을 엽니다.</p>';
 const city=selection?.kind==='CITY'?v.cities.find(c=>c.id===selection.id):null,u=selection?.kind==='UNIT'?v.units.find(x=>x.id===selection.id):null;
 if(city){
  if(!city.own)panel=`<h2>${esc(city.name)}</h2><p>다른 세력의 내정 정보는 비공개입니다.</p>`;
  else{const c=city.economy,r=city.report;panel=`<h2>${esc(city.name)} · 내정</h2>${resourceStrip([{label:'인구',icon:'population',value:c.population},{label:'식량',icon:'food',value:c.food},{label:'예약',icon:'reserved',value:c.reserved}])}<p>담당: ${c.task?esc(city.officers.find(o=>o.id===c.task.officerId)?.name)+' / '+esc(v.jobs[c.task.job]):'배치 없음'}</p><label>현지 장수 <select id="officer">${city.officers.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></label><label>업무 <select id="job"><option value="FOOD">식량 관리</option><option value="CIVIL">민생 현황</option></select></label><div class="actions">${uiButton({id:'assign',label:'배치 / 변경',disabled:!city.officers.length})}${uiButton({id:'cancel-job',label:'업무 취소',disabled:!c.task})}</div><label>보존할 식량 <input id="reserve" type="number" min="0" max="${c.food}" step="1" value="${c.reserved}"></label>${uiButton({id:'reserve-apply',label:'예약 변경',disabled:c.task?.job!=='FOOD'})}<p class="muted">현지 장수만 배치합니다. 업무는 책임 기록이며 생산 보너스·성장을 부여하지 않습니다. 예약은 소비에서 제외하고 취소 시 해제합니다.</p>${facilityArtGallery(displayArt)}<h3>최근 10일 장부</h3>${r?`<div class="scroll"><table><tr><th>기초</th><th>생산</th><th>소비</th><th>부족</th><th>기말</th></tr><tr><td>${r.before}</td><td>+${r.produced}</td><td>−${r.consumed}</td><td>${r.shortage}</td><td>${r.after}</td></tr></table></div><p class="muted">기초 + 생산 − 실제 소비 = 기말. 필요 소비${r.required} · 예약${r.reserved} · 인구 변화 없음.</p>`:'아직 정산하지 않았습니다.'}`;}
 }else if(u){
  const selectedActive=ownActive&&active.unitId===u.id,moving=selectedActive&&active.stage==='MOVEMENT',major=selectedActive&&active.stage==='MAJOR';
  const buttons=[...(moving?[...(v.moves.length?[['move','이동',true]]:[]),['skip','이동 종료',true],...(!state.battle.bundle.frame.round.units[u.id].waited?[['wait','대기 (Wait)',true]]:[])]:[]),...(major?[...(v.targets.length?[['attack','공격',v.targets.includes(target)]]:[]),['brace','방어 (Brace)',true]]:[])];
  const reason=v.result?'전투가 종료되었습니다.':!u.own?'적 부대에는 명령할 수 없습니다.':!selectedActive?'현재 행동 부대만 명령할 수 있습니다.':moving&&!v.moves.length?'현재 합법 이동 칸이 없습니다.':'';
  panel=`<h2>${esc(u.name)} · 전술</h2><p>위치 ${u.anchor.q},${u.anchor.r} · 병력${u.count}</p><p>명령은 지도 위 부대를 다시 눌러 선택하세요.</p>`;
  if(menuOpen)unitMenu=`<section id="unit-menu" class="unit-context-menu ui-panel" role="dialog" aria-label="${esc(u.name)} 부대 명령"><h2>${esc(u.name)} · 전술</h2><p>${esc(reason|| (moving?'이동 / 대기 선택':'주행동 선택'))}</p>${moveMode?'<p role="status">초록 타일을 누르면 바로 이동합니다.</p>':''}${major&&v.targets.length?`<label>합법 공격 대상 <select id="target"><option value="">대상 선택</option>${v.targets.map(id=>`<option value="${id}" ${target===id?'selected':''}>${esc(name(id))}</option>`).join('')}</select></label>`:''}<div class="actions">${buttons.map(([id,label,enabled])=>uiButton({id,label,disabled:!enabled,icon:{move:'move',skip:'done',wait:'wait',attack:'attack',brace:'brace'}[id]})).join('')}${uiButton({id:'clear',label:'취소 / 닫기',icon:'cancel'})}</div></section>`;
 }
 const currentUnit=v.units.find(x=>x.id===active?.unitId),currentController=api.config.roster.find(x=>x.unitId===active?.unitId)?.controller;
 const restoreFocus=preserveUiFocus(q('#play'));
 q('#play').innerHTML=`<div class="status"><strong>캠페인 ${v.campaignTurn}턴 · ${v.elapsedDays}일</strong><strong>전술 Round ${v.round}</strong><div class="turn-banner ${currentController==='AI'?'ai-turn':'player-turn'}" role="status" aria-live="polite"><svg class="ui-icon" viewBox="0 0 40 40" aria-hidden="true"><use href="#ui-current" width="40" height="40"/></svg><strong>${v.result?'전투 종료':`현재 차례 · ${currentController==='AI'?'AI':'플레이어'} · ${esc(currentUnit?.name??'없음')}`}</strong>${!v.result&&active?`<span>${active.stage==='MOVEMENT'?'이동 / 대기 단계':'주요 행동 단계'}</span>`:''}</div>${uiButton({id:'ai',label:'AI 한 행동',disabled:!!ownActive||!!v.result,icon:'current'})}${moveMode?`<div class="move-mode-hint" role="status">이동할 초록 칸을 누르세요.${uiButton({id:'clear',label:'이동 취소',icon:'cancel'})}</div>`:''}</div><div class="layout"><section class="mapcard ui-panel"><p class="muted">도시 □ · 부대 ● · 초록색 합법 이동 칸 · 진한 테두리 전술 시험 구역</p>${terrainLegend(map.tiles)}<div class="map-scroll"><svg class="map${moveMode?' movement-mode':''}" viewBox="0 0 1070 535" aria-label="도시 내정과 부대 명령을 선택하는 FIRST3 통합 지도">${tiles}${cities}${units}</svg>${unitMenu}</div><p class="ui-art-note">병종 표식은 기존 FIRST3 표시 자료이며 전술 효과는 공통 시험값입니다. 해당 장수 초상이 없으면 미확보 표식을 유지합니다.</p><ol>${v.log.map(e=>`<li>${esc(name(e.actorId))} ${esc(e.kind)} ${esc(e.message)}</li>`).join('')}</ol></section>${uiPanel(panel,{tag:'aside',label:'선택 상세와 명령'})}</div>`;
 const valid=fn=>(...args)=>{if(stamp!==epoch||rev!==state.revision){notify('이전 화면의 입력입니다. 다시 선택하세요.');return;}fn(...args);};
 function choose(kind,id){selection={kind,id};destination=null;target=null;moveMode=false;menuOpen=kind==='UNIT';epoch++;render();q('#unit-menu button')?.focus?.({preventScroll:true});}
 for(const [selector,kind,field] of [['[data-city]','CITY','city'],['[data-unit]','UNIT','unit'],['[data-tile]','TILE','tile']])for(const node of document.querySelectorAll(selector)){
  const pick=valid(()=>{if(kind==='TILE'){if(!moveMode)return;dispatch('TACTICAL',{kind:'MOVE',actorId:active.unitId,targetId:null,tileId:node.dataset[field]},stamp,rev);}else{if(kind==='CITY'&&moveMode)return;choose(kind,node.dataset[field]);}});node.addEventListener('click',pick);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
 }
 if(city?.own){
  q('#assign').addEventListener('click',valid(()=>dispatch('DOMESTIC',domestic('ASSIGN',{cityId:city.id,officerId:q('#officer').value,job:q('#job').value}),stamp,rev)));
  q('#cancel-job').addEventListener('click',valid(()=>dispatch('DOMESTIC',domestic('CANCEL',{cityId:city.id}),stamp,rev)));
  q('#reserve-apply').addEventListener('click',valid(()=>dispatch('DOMESTIC',domestic('RESERVE',{cityId:city.id,amount:q('#reserve').value.trim()===''?NaN:Number(q('#reserve').value)}),stamp,rev)));
 }
 if(u&&(menuOpen||moveMode)){
  q('#target')?.addEventListener('change',valid(()=>{target=q('#target').value;epoch++;render();}));
  q('#clear')?.addEventListener('click',valid(()=>closeUnitMenu()));
  q('#move')?.addEventListener('click',valid(()=>{moveMode=true;menuOpen=false;target=null;epoch++;render();document.querySelectorAll('[data-tile]')[0]?.focus?.();notify('합법 이동 칸을 선택하세요.');}));
  for(const [id,kind] of [['skip','SKIP_MOVE'],['wait','WAIT'],['attack','ATTACK'],['brace','BRACE']]){
   const targetId=target;q('#'+id)?.addEventListener('click',valid(()=>dispatch('TACTICAL',{kind,actorId:active?.unitId??null,targetId:kind==='ATTACK'?targetId:null,tileId:null},stamp,rev)));
  }
 }
 q('#ai')?.addEventListener('click',valid(()=>dispatch('TACTICAL',{kind:'AI_STEP',actorId:active?.unitId??null,targetId:null,tileId:null},stamp,rev)));
 restoreFocus();
 positionUnitMenu();
}
q('#start').addEventListener('click',()=>run(()=>{if(state)throw Error('INTEGRATED_ALREADY_STARTED');state=api.create();audio.unlock();audio.playStart(state,session+':initial-turn');selection=null;destination=null;target=null;menuOpen=false;moveMode=false;epoch++;notify('같은 지도 통합 시험을 시작했습니다.');}));
q('#save').addEventListener('click',()=>run(()=>{globalThis.localStorage.setItem(INTEGRATED_SLOT,api.serialize(state));notify('도시와 전술 상태를 하나의 통합 슬롯에 저장했습니다.');}));
q('#load').addEventListener('click',()=>run(()=>{const loaded=api.deserialize(globalThis.localStorage.getItem(INTEGRATED_SLOT));audio.cancel();state=loaded;selection=null;destination=null;target=null;menuOpen=false;moveMode=false;epoch++;notify('통합 상태를 재개했습니다. 이전 선택은 해제했습니다.');}));
q('#settle').addEventListener('click',()=>{if(!state||busy)return;dispatch('DOMESTIC',domestic('TURN'),epoch,state.revision);busy=true;q('#settle').disabled=true;globalThis.setTimeout(()=>{busy=false;render();},350);});
Promise.all(['/data/map.json','/data/first3.json','/data/domestic-trial-contract.json'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('HTTP '+r.status);return r.json();})).then(([m,initialData,contract])=>{map=m;initialArtData=initialData;api=createMapCampaignApi({map,inputs:{initialData},contract});render();}).catch(e=>notify('초기 자료를 읽지 못했습니다: '+e.message));
render();

fetch('/data/adopted-officer-art.json').then(r=>r.ok?r.json():null).then(c=>{artCatalog=c;render();}).catch(()=>{});

document.addEventListener?.('keydown',e=>{if(e.key==='Escape'&&(menuOpen||moveMode)){e.preventDefault();const id=selection?.id;closeUnitMenu();[...document.querySelectorAll('[data-unit]')].find(n=>n.dataset.unit===id)?.focus?.();}});
document.addEventListener?.('click',e=>{const selector='#unit-menu,[data-unit],[data-tile]',inside=e.composedPath?.().some(node=>node.matches?.(selector))||!!e.target?.closest?.(selector);if((menuOpen||moveMode)&&!inside)closeUnitMenu();});
globalThis.addEventListener?.('resize',positionUnitMenu);document.addEventListener?.('scroll',positionUnitMenu,true);
globalThis.addEventListener?.('pagehide',()=>audio.dispose());
globalThis.addEventListener?.('storage',e=>{if(e.key===null||e.key==='sangoku-round-map-audio-v1')audio.refresh();});
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden')audio.cancel();});
