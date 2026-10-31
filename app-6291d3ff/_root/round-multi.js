import {uiButton,commandIcon,unitArt,troopSymbol,portraitBadge,preserveUiFocus,terrainLegend,loadTerrainArt,terrainTexture,loadDisplayArt,cityArt,facilityArtGallery} from '/src/shared-ui.mjs';
import {createRoundMultiAdapter} from '/src/round-multi-adapter.mjs';
import {ROUND_MULTI_FIXTURE} from '/src/round-multi-fixture.mjs';
import {ROUND_OFFICER_TRIAL} from '/src/round-officer-trial.mjs';
import {createPilotAudio} from '/src/pilot-audio.mjs';
const scenarios=new Map([ROUND_MULTI_FIXTURE,ROUND_OFFICER_TRIAL].map(c=>[c.scenarioId,c]));
const $=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let initialArtData=null,artCatalog=null;
const displayArt=loadDisplayArt(()=>render());
const terrainArt=loadTerrainArt(()=>render());
let api,C,key;function chooseScenario(){api=createRoundMultiAdapter(scenarios.get($('#scenario')?.value)||ROUND_MULTI_FIXTURE);C=api.config;key='sangoku-round-multi-test-save-v1:'+C.scenarioId;}
chooseScenario();
let map=null,state=null,target=null,destination=null,epoch=0,busy=false,restartPending=false,feedback=null;
let selectedUnit=null,menuOpen=false,moveMode=false;
const session=crypto.randomUUID();
const audio=createPilotAudio();
function run(fn){if(busy)return;audio.unlock();busy=true;feedback=null;try{fn();}catch(e){$('#notice').textContent=e.message;}finally{busy=false;render();}}
// Presentation only: queue and legality come from the current scheduler/adapter.
function commandPresentation(s,c,adapter,selection={}){
 const f=s.bundle.frame,a=f.round.active,ended=!!s.result;
 const own=!ended&&c.roster.find(u=>u.unitId===a?.unitId)?.controller==='PLAYER';
 const moves=own?adapter.moveOptions(s):[],targets=own?adapter.attackTargets(s):[];
 const engaged=!!a&&f.space.contactLinks.some(l=>l.active&&[l.attackerUnitId,l.defenderUnitId].includes(a.unitId));
 const common=ended?'전투가 종료되었습니다.':!own?'AI 차례입니다. AI 한 행동을 누르세요.':'';
 const reasons={
  move:common||(a.stage!=='MOVEMENT'?'이동 단계가 끝났습니다.':engaged?'접촉 중인 부대는 일반 이동할 수 없습니다.':!moves.length?'현재 합법적인 이동 칸이 없습니다.':!moves.some(m=>m.tileId===selection.destination)?'초록 이동 칸을 먼저 선택하세요.':''),
  skip:common||(a.stage!=='MOVEMENT'?'이동 단계가 끝났습니다.':''),
  wait:common||(a.stage!=='MOVEMENT'?'Wait는 이동 단계에서만 가능합니다.':f.round.units[a.unitId].waited?'이번 Round에는 이미 Wait를 사용했습니다.':''),
  attack:common||(a.stage!=='MAJOR'?'이동하거나 이동을 생략한 뒤 공격 대상을 고르세요.':!targets.length?'현재 시험 제한 안에서 합법적인 공격 대상이 없습니다.':!targets.includes(selection.target)?'빨간 점선 부대 또는 목록에서 공격 대상을 선택하세요.':''),
  brace:common||(a.stage!=='MAJOR'?'이동하거나 이동을 생략한 뒤 Brace를 사용할 수 있습니다.':''),
  cancel:common||(!selection.destination&&!selection.target?'취소할 선택이 없습니다.':''),
  ai:ended?'전투가 종료되었습니다.':own?'플레이어 차례입니다.':''
 };
 const pending=[...f.round.normalQueue,...f.round.waitQueue];
 const nextRound=!ended&&pending.length===0;
 const upcoming=ended?[]:pending.length?pending:c.initiativeOrder.filter(id=>f.round.units[id].state==='COMMANDABLE');
 return {moves,targets,reasons,activeId:a?.unitId??null,upcoming,nextRound};
}
// Transient presentation only; never serialized into the adapter state.
function outcomePresentation(before,after){
 const old=before.bundle.frame,next=after.bundle.frame;
 return next.space.units.map(u=>{
  const prior=old.space.units.find(v=>v.unitId===u.unitId);
  const previous=old.troops.find(t=>t.unitId===u.unitId)?.count??0;
  const count=next.troops.find(t=>t.unitId===u.unitId)?.count??0;
  return {unitId:u.unitId,loss:Math.max(0,previous-count),moved:!!prior&&(prior.anchor.q!==u.anchor.q||prior.anchor.r!==u.anchor.r)};
 }).filter(v=>v.loss||v.moved);
}
function liveEngagement(frame,id){return frame.troops.some(t=>t.unitId===id&&t.count>0)&&frame.space.contactLinks.some(l=>l.active&&[l.attackerUnitId,l.defenderUnitId].includes(id));}
function render(){
 $('#start').disabled=!map||!!state;$('#save').disabled=!state;$('#load').disabled=!map;
 if($('#scenario'))$('#scenario').disabled=!map||!!state;
 if($('#restart'))$('#restart').disabled=!state;
 if(!state){const restoreFocus=preserveUiFocus($('#play'));
 $('#play').innerHTML='<p>처음 시작 또는 저장 재개를 선택하세요. 시작 후 초기화 버튼은 비활성화되어 저장을 실수로 버리지 않습니다.</p>';return;}
 const generation=epoch,active=state.bundle.frame.round.active,f=state.bundle.frame;
 const player=!state.result&&C.roster.find(u=>u.unitId===active?.unitId)?.controller==='PLAYER';
 let view=commandPresentation(state,C,api,{target,destination});const moves=view.moves,targets=view.targets;
 if(!targets.includes(target))target=null;
 if(!moves.some(m=>m.tileId===destination))destination=null;
 view=commandPresentation(state,C,api,{target,destination});
 const p=(q,r)=>({x:28+24*Math.sqrt(3)*(q+r/2),y:28+36*r});
 const polygon=(q,r)=>{const a=p(q,r);return Array.from({length:6},(_,i)=>`${a.x+23*Math.cos(i*Math.PI/3-Math.PI/6)},${a.y+23*Math.sin(i*Math.PI/3-Math.PI/6)}`).join(' ');};
 const tiles=map.tiles.map(t=>{const [q,r]=t.at,id=`${q},${r}`,legal=moveMode&&selectedUnit===active?.unitId&&moves.some(m=>m.tileId===id),arena=state.mapBinding.arenaTiles.includes(id);const texture=terrainTexture(t,p(q,r),polygon(q,r),terrainArt,'multi');return `${texture}<polygon fill-opacity="${texture?.length?0.3:1}" class="tile terrain-${esc(t.type)} ${arena?'arena':''} ${legal?'reachable':''}" points="${polygon(q,r)}" ${destination===id?'style="fill:#dbbb61"':''} ${legal?`data-tile="${id}" role="button" tabindex="0"`:''}><title>${id} ${esc(t.type)}${arena?' TEST':''}</title></polygon>`;}).join('');
 const cities=map.cities.map(c=>{const a=p(...c.at);return `<g transform="translate(${a.x} ${a.y})">${cityArt(displayArt)}</g><text x="${a.x}" y="${a.y-28}" class="city-label">${esc(c.label)}</text>`;}).join('');
 const unitName=id=>C.roster.find(u=>u.unitId===id)?.name??id;
 const units=f.space.units.map(u=>{const a=p(u.anchor.q,u.anchor.r),officer=C.roster.find(o=>o.unitId===u.unitId),art=unitArt(officer,initialArtData,artCatalog),count=f.troops.find(t=>t.unitId===u.unitId).count,isActive=u.unitId===view.activeId,attackable=targets.includes(u.unitId),chosen=u.unitId===target,engaged=liveEngagement(f,u.unitId),effect=feedback?.find(v=>v.unitId===u.unitId);return `<g data-unit="${u.unitId}" class="multi-unit ${isActive?'multi-active':''} ${attackable?'multi-target':''} ${chosen?'multi-chosen':''} ${effect?.loss?'multi-loss':''} ${effect?.moved?'multi-moved':''}" transform="translate(${a.x} ${a.y})" role="button" tabindex="0" aria-label="${esc(unitName(u.unitId))} 부대 선택${isActive&&!state.result?' · 현재 차례':''}" ${attackable?`data-target="${u.unitId}"`:''}><title>${esc(unitName(u.unitId))} (${u.unitId})</title><rect class="unit-name-hit" x="-32" y="22" width="64" height="30"/><circle r="21" fill="${u.factionId===C.roster[0].factionId?'#305b91':'#a34741'}" opacity="${count?1:0.25}"/>${selectedUnit===u.unitId?'<rect class="selection-frame" x="-25" y="-25" width="50" height="50" rx="5"/>':''}${isActive&&!state.result?`<circle class="turn-outline" r="33"/><circle class="turn-ring" r="29"/><path class="turn-arrow" d="M-7-45H7L0-35Z"/><rect class="turn-label-hit" x="-72" y="-79" width="144" height="31"/><g class="turn-label"><rect x="-70" y="-76" width="140" height="27" rx="5"/><text y="-58" text-anchor="middle">◆ 현재 차례 · ${esc(unitName(u.unitId))}</text></g>`:''}${troopSymbol(art.baseTroop,displayArt)}${portraitBadge(officer,art.portrait)}<text text-anchor="middle" y="33" fill="white">${esc(unitName(u.unitId))}</text><text class="unit-count" text-anchor="middle" y="46">${count}</text>${engaged?'<svg class="multi-map-icon engaged-icon" x="-44" y="40" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ui-engaged" width="24" height="24"/></svg><text class="engaged-badge" text-anchor="middle" y="52">교전 중</text>':''}${effect?.loss?`<text class="loss-badge" text-anchor="middle" y="-42">병력 −${effect.loss}</text>`:''}</g>`;}).join('');
 const selected=f.space.units.find(u=>u.unitId===selectedUnit),selectedActive=selectedUnit===active?.unitId&&player;
 const moving=selectedActive&&active.stage==='MOVEMENT',major=selectedActive&&active.stage==='MAJOR';
 const reason=state.result?'전투가 종료되었습니다.':!selectedActive?`현재 차례는 ${player?'플레이어':'AI'} ${unitName(view.activeId)}입니다. ${player?'현재 행동 부대만 명령할 수 있습니다.':'AI 차례 진행 버튼을 누르세요.'}`:moving&&!moves.length?'교전 중이거나 합법적인 이동 칸이 없습니다.':'';
 const controls=[...(moving?[...(moves.length?[['move','이동',true]]:[]),['skip','이동 생략',true],...(!f.round.units[selectedUnit].waited?[['wait','Wait',true]]:[])]:[]),...(major?[...(targets.length?[['attack','선택 대상 공격',targets.includes(target)]]:[]),['brace','Brace',true]]:[])];
 const menu=menuOpen&&selected?`<section id="unit-menu" class="unit-context-menu ui-panel" role="dialog" aria-label="${esc(unitName(selectedUnit))} 부대 명령"><h2>${esc(unitName(selectedUnit))}</h2><p>병력 ${f.troops.find(t=>t.unitId===selectedUnit).count} · 위치 ${selected.anchor.q},${selected.anchor.r}</p><p>${esc(reason||(moving?'이동 / 대기 단계':'주요 행동 단계'))}</p>${moveMode?'<p role="status">초록 칸을 누르면 바로 이동합니다.</p>':''}${major&&targets.length?`<label>합법 공격 대상 <select id="target"><option value="">대상 선택</option>${targets.map(id=>`<option value="${id}" ${id===target?'selected':''}>${esc(unitName(id))}</option>`).join('')}</select></label>`:''}<div class="actions">${controls.map(([id,label,enabled])=>uiButton({id,label,disabled:!enabled,icon:{move:'move',skip:'done',wait:'wait',attack:'attack',brace:'brace'}[id]})).join('')}${uiButton({id:'cancel',label:'취소 / 닫기',icon:'cancel'})}</div></section>`:'';
 const restoreFocus=preserveUiFocus($('#play'));
 $('#play').innerHTML=`<section class="round-status" aria-label="현재와 다음 차례"><strong>Round ${f.round.roundNumber}</strong><div class="turn-banner ${player?'player-turn':'ai-turn'}" role="status" aria-live="polite"><strong>${state.result?'전투 종료':`현재 차례 · ${player?'플레이어':'AI'} · ${esc(unitName(view.activeId))}`}</strong>${state.result?'':`<span>${active.stage==='MOVEMENT'?'이동 / 대기 단계':'주요 행동 단계'}</span>`}</div>${uiButton({id:'ai',label:'AI 차례 진행',disabled:!!view.reasons.ai,icon:'current'})}${moveMode?`<div class="move-mode-hint" role="status">이동할 초록 칸을 누르세요.${uiButton({id:'cancel',label:'이동 취소',icon:'cancel'})}</div>`:''}<span>${state.result?'다음 차례 없음':(view.nextRound?'다음 Round 첫 차례: ':'다음 차례: ')+esc(unitName(view.upcoming[0]))}</span></section><p>공통 시험수치 · ${esc(C.scenarioId)}</p><p class="multi-legend">노란 실선: 현재 부대 · 초록 칸: 이동 가능 · 빨간 점선: 공격 대상 선택 가능 · 빨간 실선: 선택한 공격 대상</p>${feedback?.length?`<p class="multi-feedback" role="status">${commandIcon(feedback.some(v=>v.loss)?'attack':'done')}${feedback.map(v=>esc(unitName(v.unitId))+': '+(v.loss?'병력 −'+v.loss:'이동 완료')).join(' · ')}</p>`:''}${terrainLegend(map.tiles)}<div class="map-scroll"><svg viewBox="0 0 1070 535" class="map${moveMode?' movement-mode':''}" aria-label="FIRST3 지도 위 시험 부대 배치">${tiles}${cities}${units}</svg>${menu}</div><p>${state.result?'승자 '+esc(state.result.winnerFactionId):'목표: 상대 COMMANDABLE 부대 소멸'}</p><p>이후 예약: ${view.upcoming.length?view.upcoming.map(id=>esc(unitName(id))).join(' → '):'없음'}${view.nextRound?' (다음 Round)':''}</p><ol>${state.log.slice(-8).map(e=>`<li>${esc(unitName(e.actorId))} ${esc(e.kind)} ${esc(e.message)}</li>`).join('')}</ol>`;

 function valid(fn){return (...args)=>{if(generation!==epoch)return;fn(...args);};}
 function execute(kind,fields={}){const revision=state.revision,actorId=active?.unitId;run(()=>{const operationId=session+':'+generation+':'+revision+':'+kind,before=state;const result=api.step(state,{operationId,expectedRevision:revision,actorId,kind,...fields});state=result.state;feedback=result.replayed?null:outcomePresentation(before,state);if(!result.replayed)audio.play(state.result?'result':kind==='MOVE'?'move':kind==='ATTACK'?'attack':'turn',operationId);target=null;destination=null;moveMode=false;menuOpen=false;epoch++;$('#notice').textContent=state.log.at(-1)?.message??'';});}
 for(const [id,kind] of [['skip','SKIP_MOVE'],['wait','WAIT'],['attack','ATTACK'],['brace','BRACE'],['ai','AI_STEP']]){const targetId=target;$('#'+id)?.addEventListener('click',valid(()=>execute(kind,kind==='ATTACK'?{targetId}:{})));}
 $('#move')?.addEventListener('click',valid(()=>{moveMode=true;menuOpen=false;target=null;epoch++;render();document.querySelectorAll('[data-tile]')[0]?.focus?.();}));
 $('#target')?.addEventListener('change',valid(()=>{feedback=null;target=$('#target').value;epoch++;render();}));
 $('#cancel')?.addEventListener('click',valid(()=>closeMenu()));
 for(const node of document.querySelectorAll('[data-unit]')){
  const pick=valid(()=>{feedback=null;if(menuOpen&&selectedUnit===active?.unitId&&active.stage==='MAJOR'&&targets.includes(node.dataset.unit)){target=node.dataset.unit;}else{selectedUnit=node.dataset.unit;menuOpen=true;moveMode=false;target=null;destination=null;}epoch++;render();$('#unit-menu button')?.focus?.({preventScroll:true});});
  node.addEventListener('click',pick);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
 }
 for(const node of document.querySelectorAll('[data-tile]')){const pick=valid(()=>{if(moveMode)execute('MOVE',{tileId:node.dataset.tile});});node.addEventListener('click',pick);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});}
 restoreFocus();positionMenu();
}
$('#scenario')?.addEventListener('change',()=>run(()=>{if(state)throw new Error('SCENARIO_SWITCH_REQUIRES_RESTART');chooseScenario();epoch++;target=null;destination=null;}));
function startTrial(){if(!map)throw new Error('MAP_NOT_READY');if(state)throw new Error('SESSION_ALREADY_STARTED');state=api.create(map);selectedUnit=null;menuOpen=false;moveMode=false;epoch++;$('#notice').textContent='공통 시험수치 시나리오 시작';}
$('#start').addEventListener('click',()=>run(startTrial));
$('#restart')?.addEventListener('click',()=>{if(state&&$('#restart-warning')){restartPending=true;$('#restart-warning').hidden=false;}});
$('#restart-cancel')?.addEventListener('click',()=>{restartPending=false;$('#restart-warning').hidden=true;});
$('#restart-confirm')?.addEventListener('click',()=>run(()=>{if(!state||!restartPending)return;restartPending=false;state=null;target=null;destination=null;selectedUnit=null;menuOpen=false;moveMode=false;epoch++;$('#restart-warning').hidden=true;$('#notice').textContent='화면 초기화 완료. 저장은 보존되었습니다. 시나리오 선택 후 처음 시작을 누르세요.';}));
$('#save').addEventListener('click',()=>run(()=>{localStorage.setItem(key,api.serialize(state));$('#notice').textContent='가상 시나리오 저장 완료';}));
function loadTrial(){if(!map)throw new Error('MAP_NOT_READY');const loaded=api.deserialize(localStorage.getItem(key));state=loaded;selectedUnit=null;menuOpen=false;moveMode=false;epoch++;target=null;destination=null;restartPending=false;if($('#restart-warning'))$('#restart-warning').hidden=true;$('#notice').textContent='공통 시험수치 시나리오 재개 완료';}
$('#load').addEventListener('click',()=>run(loadTrial));
fetch('/data/map.json').then(r=>{if(!r.ok)throw new Error('MAP_LOAD_FAILED');return r.json();}).then(m=>{map=m;const entry=new URL(globalThis.location?.href??'http://127.0.0.1/round-multi').searchParams.get('entry');try{if(entry==='new')startTrial();else if(entry==='continue')loadTrial();}catch(e){$('#notice').textContent='메뉴 요청을 실행하지 못했습니다: '+e.message+' · 기존 저장은 보존되었습니다.';}render();}).catch(e=>{$('#notice').textContent=e.message;});
render();

Promise.all(['/data/first3.json','/data/adopted-officer-art.json'].map(u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null))).then(([d,c])=>{initialArtData=d;artCatalog=c;render();});

function closeMenu(){menuOpen=false;moveMode=false;target=null;destination=null;epoch++;render();}
function positionMenu(){
 const menu=$('#unit-menu'),svg=$('svg.map'),scroll=$('.map-scroll');if(!menu||!svg?.getBoundingClientRect||!scroll)return;
 const unit=state.bundle.frame.space.units.find(u=>u.unitId===selectedUnit);if(!unit)return;
 const rect=svg.getBoundingClientRect(),clip=scroll.getBoundingClientRect(),left=Math.max(8,rect.left,clip.left),top=Math.max(8,rect.top,clip.top),right=Math.min(innerWidth-8,rect.right,clip.right),bottom=Math.min(innerHeight-8,rect.bottom,clip.bottom),width=Math.min(280,right-left),height=bottom-top;
 menu.hidden=width<120||height<90;if(menu.hidden)return;menu.style.width=width+'px';menu.style.maxHeight=height+'px';
 let x=rect.left+(28+24*Math.sqrt(3)*(unit.anchor.q+unit.anchor.r/2))/1070*rect.width,y=rect.top+(28+36*unit.anchor.r)/535*rect.height;if(svg.createSVGPoint&&svg.getScreenCTM()){const point=svg.createSVGPoint();point.x=28+24*Math.sqrt(3)*(unit.anchor.q+unit.anchor.r/2);point.y=28+36*unit.anchor.r;const client=point.matrixTransform(svg.getScreenCTM());x=client.x;y=client.y;}
 menu.style.left=Math.max(left,Math.min(x+26,right-width))+'px';menu.style.top=Math.max(top,Math.min(y-25,bottom-Math.min(menu.offsetHeight,height)))+'px';
}
function insideUnitControls(event){const selector='#unit-menu,[data-unit],[data-tile]';return event.composedPath?.().some(node=>node.matches?.(selector))||!!event.target?.closest?.(selector);}
document.addEventListener?.('click',event=>{if((menuOpen||moveMode)&&!insideUnitControls(event))closeMenu();});
document.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&(menuOpen||moveMode)){event.preventDefault();closeMenu();[...document.querySelectorAll('[data-unit]')].find(node=>node.dataset.unit===selectedUnit)?.focus?.();}});
document.addEventListener?.('scroll',positionMenu,true);globalThis.addEventListener?.('resize',positionMenu);
