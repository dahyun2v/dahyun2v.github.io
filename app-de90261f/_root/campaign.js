import {orderEligible,orderRoute,routeTurns,orderHighlights,queuedOrderUnit} from '/src/campaign-orders.mjs';
import {selectionRect,rectangleSelection,toggleSelection,cycleTileUnit,targetTile} from '/src/campaign-select.mjs';
import {campaignTactics,officerEffectCards,tacticIsDamage,cardEffectPending,recallReason,hasCampaignRule} from '/src/campaign-effects.mjs';
import {regroupReason,campaignPath,campaignReachable} from '/src/campaign-morale.mjs';
import {TICKS_PER_TURN} from '/src/first3.mjs';
import {cityAttackTargets,previewCityAttack,previewTactic,attackTargets,previewAttack,previewDisengage,armyActionEnded} from '/src/campaign-combat.mjs';
import {createCampaignCombatAudio} from '/src/campaign-combat-audio.mjs';
import {createCampaign, view, step, serialize, deserialize, CAMPAIGN_SAVE_KEY,campaignMoveOptions,CAMPAIGN_TURN_LIMIT} from '/src/campaign-runtime.mjs';
import {statsToOfficerPack,troopToCampaign} from '/src/campaign-adapters.mjs';
import {saveText,loadText,settle,saveMarkerKey} from '/src/save-store.mjs';
import {campaignSubAbility,directionToward} from '/src/campaign-abilities.mjs';
import {SPECIAL_TROOPS} from '/src/campaign-special-troops.mjs';
import {securityLabel,CITY_JOBS,cityEconomyRates,cityOccupationStatus} from '/src/campaign-economy.mjs';
import {occupationDisplay,occupationMethodReason,OCCUPATION_METHODS} from '/src/campaign-occupation.mjs';
import {campaignCaptives,captiveRecruitmentReason} from '/src/campaign-captives.mjs';
import {c29BindingTargets} from '/src/campaign-c29.mjs';
import {xpToNextLevel} from '/src/growth-progress.mjs';
import {pendingCampaignDraft,needsTraitResolution,tacticLoadoutReason,CAMPAIGN_RARITY_NAMES,resolveTraitSpace,CAMPAIGN_TRAIT_SLOTS,CAMPAIGN_TACTIC_SLOTS} from '/src/campaign-growth.mjs';

import {renderStrategicMap,renderMinimap,FACTION_STYLE} from '/app/design/map-render.mjs';
// 화면 테마: 기본 청록산수(qinglu). ?theme=classic 으로 예전 담채 지도 — 고른 값은 기억한다.
const THEME=(()=>{try{const q=new URLSearchParams(location.search).get('theme');if(q==='classic'||q==='qinglu'){localStorage.setItem('sg-theme',q);return q;}return localStorage.getItem('sg-theme')==='classic'?'classic':'qinglu';}catch{return 'qinglu';}})();
try{document.body?.classList.add('theme-'+THEME);}catch{}
import {campaignMapModel,campaignDate} from '/src/campaign-map-model.mjs';
import {escapeUi as esc} from '/src/shared-ui.mjs';
import {createCampaignActionAudio} from '/src/campaign-action-audio.mjs';
import {createSettlementAudio} from '/src/settlement-audio.mjs';
import {createPilotAudio} from '/src/pilot-audio.mjs';
import {createTitleBgm} from '/src/title-bgm.mjs';
import {relation,relationCityOfficers,socialReason,RELATIONS} from '/src/campaign-relations.mjs';
import {hubBuildReason} from '/src/campaign-supply.mjs';
let achPick=null,visitTalks=null,feastPick=[],feastCity=null,visitScene=null; // C38 친목: 저택 대화 초안(visit-talks)·주점 술자리 고른 장수·열린 대화
let crisisData=null,crisisSeen=new Set(),bondsData=null,hoverSide=null,dangerMode=false,lastActedArmy=null,dangerCache=null,memoryLines={},artCatalog=null,portraits={},menuOpen=false,moveMode=false,faceMode=false,destination=null,soundSequence=0,audioGesture=false;
// 엔진 오류 코드를 플레이어 문장으로(코드는 콘솔에만)
const ERROR_TEXT={C26_COMMAND_UNAVAILABLE:'지금은 이 내정 명령을 쓸 수 없습니다.',INVALID_C26_CITY:'우리 성에서만 쓸 수 있습니다.',INVALID_ORDER_UNITS:'이미 움직였거나 행동을 마친 부대에는 이동 명령을 줄 수 없습니다.',INVALID_ORDER_DESTINATION:'갈 수 없는 칸입니다.',INVALID_CAMPAIGN_ATTACK:'지금 공격할 수 없는 대상입니다.',INVALID_CAMPAIGN_CITY_ATTACK:'지금 이 성은 공격할 수 없습니다.',INVALID_CAMPAIGN_FACE:'이동하기 전에만 정면을 돌릴 수 있습니다.',INVALID_MUSTER_OFFICER_OR_TROOP:'출진할 장수와 병종을 확인하세요.',MUSTER_RESERVE_200_REQUIRED:'예비병이 200명 이상 있어야 출진할 수 있습니다.',INVALID_WANDERER_RECRUITMENT:'지금은 등용할 수 없습니다(이미 협의 중이거나 성의 주인이 아님).',INVALID_GARRISON:'적과 붙어 있지 않은 상태로 자기 성 중심에 있어야 주둔할 수 있습니다.',MAIN_ACTION_USED:'이번 턴 행동을 이미 썼습니다.',EVENT_PENDING:'사건 카드를 먼저 정하세요.',UNIQUE_FACILITY_LIMIT:'고유 시설은 도시당 1개입니다.',UNIQUE_FACILITY_LOCKED:'다른 세력의 고유 시설입니다.',NO_DAMAGED_FACILITY:'손상된 시설이 없습니다.',MINOR_CITY_NO_FACILITIES:'작은 성에는 지을 수 없습니다.',STAR_COOLDOWN:'재사용 대기 중입니다.',STAR_UNAVAILABLE:'패주 중이라 쓸 수 없습니다.',STAR_OCCUPIED:'점령 처리 중인 성입니다.'};
const reasonText=code=>code?(/[가-힣]/.test(code)?code:ERROR_TEXT[code]??'조건 미충족'):'';
const TROOP_LABEL={militia:'보병',spear:'창병',bow:'궁병',cavalry:'기병',engineer:'공병',mystic:'술법'};
const statLine=o=>o?.baseStats?`지휘 ${o.baseStats.leadership} · 무용 ${o.baseStats.might} · 지략 ${o.baseStats.intelligence}`:'';
const errorText=e=>{const m=String(e?.message??e);if(/^[A-Z0-9_]+$/.test(m)){console.warn(m);return ERROR_TEXT[m]??'지금은 할 수 없는 명령입니다.';}return m;};
const FORMATION_NAME={DISORDERED:'흐트러짐',BROKEN:'붕괴'};
const SUB_AXES={지휘:['전열 유지','기동','전환','수습'],무용:['힘','기술','막아내기','되받기'],지략:['군재','응변','속이기','통찰'],정무:['행정','병참','인사','제도','민정'],감화:['설득','포섭','결집','중재']};
const COMBAT_SUBS=new Set(['전열 유지','전환','수습','힘','기술','막아내기','되받기','결집']);
const APTITUDE_NAME={HIGH:'높음',MEDIUM:'보통',LOW:'낮음'},TROOP_NAME={BT01:'도검',BT02:'창',BT03:'궁',BT04:'기병'};
const actionAudio=createCampaignActionAudio(),settlementAudio=createSettlementAudio();
const combatAudio=createCampaignCombatAudio();
let pilotAudio=createPilotAudio();
const bgm=createTitleBgm({settings:pilotAudio.settings});
// 초상: 채택본(adopted) 우선, 없으면 임시 Old(사용자 2026-10-04 "일단 old로넣어" — 채택 상태 변경 아님)
Promise.all([fetch('/assets/officer-art/adopted.json').then(r=>r.json()).catch(()=>({officers:[]})),fetch('/assets/officer-art/provisional-old.json').then(r=>r.json()).catch(()=>({officers:[]})),fetch('/docs/design-data/officer-pack/redesign-50-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/bonds-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/person-crisis-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/trial-51-100-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/visit-talks-v0.1.json').then(r=>r.json()).catch(()=>null)])
 .then(([a,old,lines,bonds,crisis,more,talks])=>{bondsData=bonds;crisisData=crisis;visitTalks=talks;memoryLines={...Object.fromEntries(Object.values(lines?.officers??{}).filter(o=>o?.memorableLine).map(o=>[o.id,o.memorableLine])),...Object.fromEntries((more?.officers??[]).filter(o=>o.memoryLine).map(o=>[o.id,o.memoryLine]))};artCatalog=a;portraits={...Object.fromEntries(old.officers.map(o=>[o.officerId,o])),...Object.fromEntries(a.officers.map(o=>[o.officerId,o]))};if(state)render();}).catch(()=>{});
function unlockAudio(){audioGesture=true;actionAudio.unlock();combatAudio.unlock();settlementAudio.unlock();pilotAudio.unlock();bgm.gesture();}
const $ = selector => document.querySelector(selector);
const colors = {F01:'#d34a45', F02:'#63a88b', F03:'#3f83c5'};
let state = null;
let selectedArmyId=null,selectedArmyIds=[],orderTimer=null;
let selectedCityId=null,cityTab=null; // 도시 패널 탭(개요·생산·인물) — 문명7 도시 창 탭 + 카드 격자 배치
let aiTimer=null;
let selectedTacticId=null,selectedOfficerId=null,traitChoice=null;
let attackMode=false,combatAnimating=false,zoom=1,losses={},combatTimers=[],mapMargin=0;
let turnLog=[];
const START_ZOOM=1.7; // 시작 시점: 부대 얼굴·병력이 읽히는 거리(휠로 0.5~2.6)
// 지도 위 움직임(렌더러 모델로 넘김): 행군 경로·공격 동작·바라보는 쪽·전투 효과. elapsed 로 다시 그려도 이어진다.
let motions={},attackAnims={},facings={},fxList=[],motionSeq=0,redrawTimer=null;
const factionName=id=>({F01:"조조군",F02:"유비군",F03:"손권군"}[id]??id);
function inputLocked(){return (state?.orderQueue?.length>0)||combatAnimating||state?.phase==='AI'||!!(state&&pendingCampaignDraft(state));}
function scheduleOrders(){
 clearTimeout(orderTimer);
 if(!state?.gameResult&&state?.phase==='PLAYER'&&queuedOrderUnit(state)&&!combatAnimating&&!pendingCampaignDraft(state))orderTimer=setTimeout(()=>command({type:'ADVANCE_ORDER'}),Math.max(10,motionRemaining()+60));
}
function scheduleAi(){
 scheduleOrders();
 clearTimeout(aiTimer);
 if(state&&!state.gameResult&&state.phase==='AI'&&!combatAnimating)aiTimer=setTimeout(()=>command({type:'ADVANCE_AI'}),Math.max(150,motionRemaining()+60));
}
// 안개 속 전투(내 세력이 양쪽 칸 모두 못 보는 AI끼리 싸움)는 연출·화면 이동·기록 없이 넘긴다 — 숨은 정보가 새지 않게
function armyVisible(s,id){const a=s.armies[id];return !!a&&(a.factionId===s.playerFactionId||s.knowledge?.[s.playerFactionId]?.tiles?.[a.tileId]==='VISIBLE');}
function combatVisible(before,after,c){
 const f=after.playerFactionId,seen=(s,tile)=>tile&&s.knowledge?.[f]?.tiles?.[tile]==='VISIBLE';
 const tiles=[before.armies[c.attackerId]?.tileId,before.armies[c.targetId]?.tileId,c.fromTileId,before.cities?.[c.cityId]?.tileId].filter(Boolean);
 return [c.attackerId,c.targetId].some(id=>before.armies[id]?.factionId===f)||tiles.some(t=>seen(before,t)||seen(after,t));
}
function command(request) {
 const keepSel=request.type==='ADVANCE_ORDER'&&selectedArmyId?{id:selectedArmyId,menu:menuOpen}:null; // 예약 이동 자동 처리가 플레이어 선택을 풀지 않게
 if(['ATTACK_UNIT','ATTACK_CITY','BRACE','REGROUP','WAIT_UNIT','USE_TACTIC','GARRISON'].includes(request.type))lastActedArmy=request.armyId??null;
 const draftAction=['DRAFT_PICK','DRAFT_REROLL'].includes(request.type);
 if(combatAnimating||(!draftAction&&!['ADVANCE_AI','ADVANCE_ORDER'].includes(request.type)&&inputLocked()))return;
 try {
  const before=state;state=step(state,{...request,incremental:true});
  $('#growth-error').textContent='';
  const id=`campaign:${++soundSequence}`;
  if(state.turn>before.turn){turnLog=[];settlementAudio.play(id+':settlement');playStrategicCue('START',before,state,id+':start');}
  if(['MOVE_UNIT','ADVANCE_ORDER'].includes(request.type)||(request.type==='ADVANCE_AI'&&Object.values(state.armies).some(a=>a.tileId!==before.armies[a.armyId]?.tileId)))playStrategicCue('MOVE',before,state,id);
  if(request.type==='END_TURN')playStrategicCue('TURN',before,state,id);
  for(const event of (state.moraleLog??[]).slice((before.moraleLog??[]).length))if(armyVisible(state,event.armyId)||armyVisible(before,event.armyId))turnLog.push(event.text);
  const combat=state.lastCombat&&state.lastCombat.sequence!==before.lastCombat?.sequence?state.lastCombat:null;
  const movers=startMotions(before,state,combat);
  // 성 주인이 바뀌면 함락 컷인(페르소나5·림버스 붓 띠) — 내가 얻거나 잃은 성, 또는 보이는 성만
  for(const c of Object.values(state.cities)){const was=before.cities[c.cityId]?.ownerFactionId;if(was===c.ownerFactionId||!c.ownerFactionId)continue;
   if(c.ownerFactionId===state.playerFactionId||was===state.playerFactionId||view(state).knowledge.tiles[c.tileId]==='VISIBLE'){setTimeout(()=>showCutIn(`${c.name} 함락`,`${factionName(c.ownerFactionId)}군${was?` ← ${factionName(was)}군`:''}`,c.ownerFactionId),combat?1250:150);break;}}
  if(state.turn>before.turn&&!state.gameResult)showBanner(campaignDate(state.turn),`${factionName(state.playerFactionId)}의 차례`);
  else if(before.phase==='PLAYER'&&state.phase==='AI'&&!state.gameResult)showBanner('적군의 차례',Object.keys(state.factions).filter(f=>f!==state.playerFactionId).map(factionName).join(' · '));
  $('#attack-preview').hidden=true;menuOpen=false;moveMode=false;faceMode=false;attackMode=false;selectedTacticId=null;destination=null;
  if(combat&&combatVisible(before,state,combat)){$('#attack-preview').hidden=true;$('#status').textContent='공격 중…';animateCombat(before,combat,id);return;}
  if(request.type!=='MOVE_UNIT')selectedArmyId=null;
  if(keepSel&&state.armies[keepSel.id]&&!armyActionEnded(state,keepSel.id)&&state.phase==='PLAYER'){selectedArmyId=keepSel.id;selectedArmyIds=[keepSel.id];menuOpen=keepSel.menu;moveMode=true;}
  render();scheduleOrders();if(request.type==='ADVANCE_AI'&&movers[0])follow(movers[0]);scheduleAi();
  $('#status').textContent=state.phase==='AI'?(before.phase==='PLAYER'?(request.type==='END_TURN'?'AI 차례 진행 중…':'모든 부대 행동 완료 — AI 차례'):'AI 차례 진행 중…'):'명령을 선택하세요.';
  autoNextUnit();
 }catch(error){$('#status').textContent=errorText(error);if(draftAction)$('#growth-error').textContent=errorText(error);}
}
function animateCityCombat(before,c,id){
 combatAnimating=true;
 const events=c.kind==='CITY_STRIKE'?(state.combatLog??[]).slice((before.combatLog??[]).length).filter(e=>e.kind==='CITY_STRIKE'):[c];
 for(const event of events){
 c=event;ruleFx(before,c);const strike=c.kind==='CITY_STRIKE',city=before.cities[c.cityId],now=performance.now();
 const from=strike?city.tileId:before.armies[c.attackerId].tileId,to=strike?before.armies[c.targetId].tileId:city.tileId;
 fxList.push({kind:strike?'volley':'siege',from,to,start:now,duration:1100});
 const cityName=before.cityDisplayNames[c.cityId]??city.name;
 turnLog.push(strike?`${cityName} 사격: 적 −${c.enemyLoss}`:`${before.officers[before.armies[c.attackerId].commanderId].name} → ${cityName}: 내구 −${c.dealt}`);
 if(strike){const u=c.units[0],oldUnit=campaignMapModel(view(before)).units.find(a=>a.id===u.unitId);losses[u.unitId]={displayCount:u.preBattleCount,oldUnit};
 combatTimers.push(setTimeout(()=>{losses[u.unitId]={prevCount:u.preBattleCount,postCount:u.postBattleCount,heavyLoss:false,oldUnit};combatAudio.play('BT01',id+':hit');render();},360));}
 else {attackAnims[c.attackerId]={targetTileId:to,start:now,duration:520,ranged:false};combatAudio.play('BT01',id+':hit');}
 }
 render();combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();},1600));
}
// 신화 규칙 발동 줄("[특기 이름] 설명")은 기록에 남기고 지도에 진홍 표찰로 띄운다
function ruleFx(before,c){
 const tile=before.armies[c.attackerId]?.tileId??before.cities[c.cityId]?.tileId;
 for(const line of c.effectLines??[]){const name=line.match(/\[([^\]]+)\]/)?.[1];if(!name)continue;turnLog.push(line);if(tile)fxList.push({kind:'tactic',rule:true,label:name,from:tile,to:tile,start:performance.now(),duration:1700});}
}
function animateCombat(before,c,id){
 ruleFx(before,c);
 if(c.kind==='TACTIC'||c.kind==='TACTIC_EFFECT')fxList.push({kind:'tactic',label:c.tacticName,from:before.armies[c.attackerId].tileId,to:before.armies[c.targetId]?.tileId??before.armies[c.attackerId].tileId,start:performance.now(),duration:1700});
 if(c.kind==='TACTIC_EFFECT'){turnLog.push(`${before.officers[before.armies[c.attackerId].commanderId].name} · 전법 ${c.tacticName}`);combatAnimating=true;render();combatTimers.push(setTimeout(()=>{combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();},1100));return;}
 if(c.kind==='CITY'||c.kind==='CITY_STRIKE'){animateCityCombat(before,c,id);return;}
 combatAnimating=true;
 const pursuit=c.kind==='PURSUIT',attackTroop=troopToCampaign(before.armies[c.attackerId].troopType),ranged=attackTroop==='BT03'&&!pursuit;
 const leadSound=['BT03','BT04'].includes(attackTroop);
 const fromTile=before.armies[c.attackerId].tileId,targetTile=c.fromTileId??before.armies[c.targetId].tileId;
 if(leadSound)combatAudio.play(attackTroop,id+':lead',{heavyLoss:c.enemyLoss/c.units.find(u=>u.unitId===c.targetId).preBattleCount>=.3});
 const name=armyId=>before.officers[before.armies[armyId].commanderId].name;
 turnLog.push(pursuit?`${name(c.attackerId)} 추격 → ${name(c.targetId)}: −${c.enemyLoss} (교전 이탈)`:`${name(c.attackerId)} → ${name(c.targetId)}: 적 −${c.enemyLoss}, 아군 −${c.allyLoss}${c.counter?'(반격)':''}`);
 // Keep the old counts while the charge plays; committed state/vision is already updated.
 const oldUnits=campaignMapModel(view(before)).units;
 for(const u of c.units)losses[u.unitId]={displayCount:u.preBattleCount,oldUnit:oldUnits.find(x=>x.id===u.unitId)};
 const now=performance.now();
 attackAnims[c.attackerId]={targetTileId:targetTile,start:now,duration:520,ranged};
 facings[c.attackerId]={tileId:targetTile,until:now+2300};facings[c.targetId]={tileId:fromTile,until:now+(pursuit?560:2300)};
 fxList.push({kind:ranged?'volley':attackTroop==='BT04'?'charge':'clash',from:fromTile,to:targetTile,start:now+(ranged?0:150),duration:1100});
 render();follow(c.targetId);
 const hit=(armyId,loss,counter)=>{
  const u=c.units.find(u=>u.unitId===armyId);losses[armyId]={prevCount:u.preBattleCount,postCount:u.postBattleCount,heavyLoss:loss/u.preBattleCount>=.3,oldUnit:oldUnits.find(x=>x.id===armyId),lossLabel:pursuit&&!counter?'추격':counter?'반격':''};
  if(counter||!leadSound)combatAudio.play(troopToCampaign(before.armies[counter?c.targetId:c.attackerId].troopType),id+(counter?':counter':':hit'),{counter,heavyLoss:loss/u.preBattleCount>=.3});render();
 };
 combatTimers.push(setTimeout(()=>{hit(c.targetId,c.enemyLoss,false);if(!c.counter)delete losses[c.attackerId];},360));
 if(c.counter){
  combatTimers.push(setTimeout(()=>{const t=performance.now();attackAnims[c.targetId]={targetTileId:fromTile,start:t,duration:480,ranged:false};fxList.push({kind:'clash',from:targetTile,to:fromTile,start:t+140,duration:1000});render();},540));
  combatTimers.push(setTimeout(()=>hit(c.attackerId,c.allyLoss,true),700));
 }
 combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'모든 부대 행동 완료 — AI 차례':'명령을 선택하세요.';},pursuit?Math.max(1500,motionRemaining()+200):state.phase==='AI'?1500:2260)); // AI 차례 전투는 마무리를 짧게
}
// 움직인 부대마다 행군 경로를 기록한다(보이는 부대만). 전투로 밀려난 부대는 맞은 뒤에 움직인다.
function startMotions(before,after,combat){
 const now=performance.now(),seen=new Set();
 for(const v of [view(before),view(after)])for(const id of [...Object.keys(v.ownArmies),...Object.keys(v.knowledge.observedArmies)])seen.add(id);
 const moved=[];
 for(const a of Object.values(after.armies)){
  const from=before.armies[a.armyId]?.tileId;if(!from||from===a.tileId||!seen.has(a.armyId))continue;
  let path=null;try{path=campaignPath(before,a.armyId,a.tileId)?.pathTileIds??null;}catch{path=null;}
  if(!path||path[0]!==from||path.at(-1)!==a.tileId)path=[from,a.tileId];
  const hold=combat?(combat.kind==='PURSUIT'&&combat.targetId===a.armyId?560:1000):0;
  motions[a.armyId]={path,start:now,hold,duration:hold+Math.min(1300,200*(path.length-1)),key:++motionSeq};
  moved.push(a.armyId);
 }
 if(moved.length)scheduleRedraw();
 return moved;
}
function motionRemaining(){const now=performance.now();return Math.max(0,...Object.values(motions).map(m=>m.start+m.duration-now));}
function overlayAnimations(model){
 const now=performance.now();
 for(const u of model.units){
  const m=motions[u.id];
  if(m){const e=now-m.start;if(e<m.duration)u.motion={path:m.path,elapsed:e,duration:m.duration,hold:m.hold,key:m.key};else delete motions[u.id];}
  const a=attackAnims[u.id];
  if(a){const e=now-a.start;if(e<a.duration)u.attack={targetTileId:a.targetTileId,elapsed:e,duration:a.duration,ranged:a.ranged};else delete attackAnims[u.id];}
  const f=facings[u.id];
  if(f){if(now<f.until)u.faceTileId=f.tileId;else delete facings[u.id];}
 }
 fxList=fxList.filter(f=>now-f.start<f.duration);
 model.fx=fxList.map(f=>({kind:f.kind,label:f.label,rule:f.rule,from:f.from,to:f.to,elapsed:now-f.start}));
}
// 행군이 끝나면 한 번 다시 그려 바라보는 쪽·교전 표시를 맞춘다(브라우저 프레임 기준, 타이머 대기열을 쓰지 않음).
function scheduleRedraw(){
 if(redrawTimer||!globalThis.requestAnimationFrame)return;
 const tick=()=>{if(motionRemaining()>0){redrawTimer=requestAnimationFrame(tick);return;}redrawTimer=null;if(state&&!combatAnimating)drawMap(view(state));};
 redrawTimer=requestAnimationFrame(tick);
}
// AI 가 화면 밖에서 움직이면 그쪽으로 부드럽게 옮겨 보여 준다.
function follow(armyId,instant=false){
 const node=$('#map').querySelector?.(`[data-unit="${armyId}"]`),port=$('.viewport');
 if(!node?.getBoundingClientRect||!port?.getBoundingClientRect||!port.scrollTo)return;
 const r=node.getBoundingClientRect(),v=port.getBoundingClientRect(),m=90;
 if(r.left>=v.left+m&&r.right<=v.right-m&&r.top>=v.top+m&&r.bottom<=v.bottom-m)return;
 port.scrollTo({left:port.scrollLeft+(r.left+r.width/2)-(v.left+v.width/2),top:port.scrollTop+(r.top+r.height/2)-(v.top+v.height/2),behavior:instant?'auto':'smooth'});
}
// 턴이 바뀔 때 가운데에 잠깐 뜨는 붓글씨 띠.
let bannerTimer=null;
let cutInTimer=null;
function showCutIn(title,sub,factionId){
 let el=$('#cut-in');
 if(!el&&document.body?.insertAdjacentHTML){document.body.insertAdjacentHTML('beforeend','<div id="cut-in" class="cut-in" hidden></div>');el=$('#cut-in');}
 if(!el)return;const style=FACTION_STYLE[factionId]??{color:'#7d7a6a',emblem:'f-dragon'};
 el.style.setProperty('--fc',style.color);
 el.innerHTML=`<div class="stroke"></div><span class="seal"><svg class="ic"><use href="/app/design/sg-icons.svg#${style.emblem}"/></svg></span><b>${esc(title)}</b><span class="sub">${esc(sub)}</span>`;
 el.hidden=false;el.className='cut-in';void el.offsetWidth;el.className='cut-in show';
 clearTimeout(cutInTimer);cutInTimer=setTimeout(()=>{el.hidden=true;el.className='cut-in';},1900);
}
function showBanner(title,sub){
 let el=$('#turn-banner');
 if(!el&&document.body?.insertAdjacentHTML){document.body.insertAdjacentHTML('beforeend','<div id="turn-banner" class="turn-banner" hidden></div>');el=$('#turn-banner');}
 if(!el)return;
 el.innerHTML=`<b>${esc(title)}</b><span>${esc(sub)}</span>`;el.hidden=false;el.className='turn-banner';void el.offsetWidth;el.className='turn-banner show';
 clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{el.hidden=true;el.className='turn-banner';},1700);
}
// Feed committed strategic actions into the existing action sound sequencer.
function playStrategicCue(kind,before,after,id){
 const round={roundNumber:before.turn,active:{unitId:'campaign',queue:'normal'}};
 const old={round:kind==='START'?{...round,active:null}:round,receipts:[]};
 const next={round:kind==='TURN'?{...round,active:null}:round,receipts:kind==='MOVE'?[{request:JSON.stringify({kind:'MOVE'})}]:[]};
 actionAudio.playTransition({battle:{revision:0,bundle:{frame:old}}},{battle:{revision:1,bundle:{frame:next}}},{},id);
}
// 부대 그림(병사)과 이름표(맨 위 층)가 같은 data-unit 을 단 두 노드다 — 상태 표시는 둘 다에
const unitNodes=id=>{const map=$('#map');return map.querySelectorAll?[...map.querySelectorAll(`[data-unit="${id}"]`)]:[map.querySelector(`[data-unit="${id}"]`)].filter(Boolean);};
// 특기 효과 기록: 지난 턴과 똑같은 줄(매 턴 도는 태수 효과 등)은 다시 쓰지 않는다 — 처음과 값이 바뀔 때만
function repeatFree(log,mine){const previous=new Set(log.filter(e=>e.turn===state.turn-1&&mine(e)).map(e=>e.text));return log.filter(e=>e.turn===state.turn&&mine(e)&&!previous.has(e.text)).map(e=>e.text);}
// "이번 턴" 창: 제목을 누르면 조작 안내·기록을 접는다(지도를 덜 가리게). 접힘 상태는 이 브라우저에만 기억
{const tracker=$('.tracker'),title=$('.tracker h2');let folded=false;try{folded=localStorage.getItem('sg-tracker-folded')==='1';}catch{}
 const apply=()=>{tracker?.classList?.toggle?.('folded',folded);title?.setAttribute?.('aria-expanded',String(!folded));};
 title?.addEventListener?.('click',()=>{folded=!folded;try{localStorage.setItem('sg-tracker-folded',folded?'1':'0');}catch{}apply();});apply();}
function markUnknownCounts(model){
 for(const unit of model.units){
  if(Number.isFinite(unit.count))continue;
  for(const node of unitNodes(unit.id)){
   const count=node.querySelector('.count');if(count)count.textContent='—';
   for(const bar of node.querySelectorAll('.bar,.bar-bg'))bar.style.visibility='hidden';
  }
 }
}
function render() {
  const v=view(state);
  $('#selection').hidden=true;$('#game').hidden=false;
  const shownTurn=state.gameResult?.type==='TURN_LIMIT'?CAMPAIGN_TURN_LIMIT:v.turn;$('#turn').textContent=campaignDate(shownTurn);
  const left=CAMPAIGN_TURN_LIMIT-Math.min(v.turn,CAMPAIGN_TURN_LIMIT+1)+1;$('#turn').dataset.left=state.gameResult?'':left>0?`${left}턴 남음`:'';$('#turn').title=`한 판 ${CAMPAIGN_TURN_LIMIT}턴`;
  const locked=inputLocked();
  $('#end-turn').disabled=locked||state.remainingTicks!==null||!!state.gameResult;
  $('#save').disabled=combatAnimating||state.phase==='AI';$('#continue').disabled=locked;

  $('#result').hidden=!(state.gameResult&&state.remainingTicks===null);
  $('#map').hidden=false;
  const g=state.gameResult,won=['UNIFICATION','TURN_LIMIT'].includes(g?.type)&&(g.winnerFactionId??state.playerFactionId)===state.playerFactionId;
  $('#result-text').textContent=g?.type==='UNIFICATION'?(won?'천하 통일':'통일 — 캠페인 종료'):g?.type==='TURN_LIMIT'?(won?`${CAMPAIGN_TURN_LIMIT}턴 종료 — 승리`:`${CAMPAIGN_TURN_LIMIT}턴 종료 — ${factionName(g.winnerFactionId)} 승리`):'멸망 — 캠페인 종료';
  if(state.gameResult&&!$('#result').hidden)renderResultSummary(v,won);
  const style=FACTION_STYLE[v.factionId];$('#hud').dataset.faction=v.factionId;
  $('#faction').innerHTML=`<span class="emblem" data-faction="${v.factionId}"><svg class="ic"><use href="/app/design/sg-icons.svg#${style.emblem}"/></svg></span>${style.name}`;
  const cities=Object.values(v.ownCities),sum=key=>cities.reduce((n,c)=>n+(Number(c[key])||0),0);
  // 위 자원 줄: 현재/최대 + 다음 정산 증감(삼국지8R 자원 줄 · 문명6 산출 줄). 정산 예측은 도시 economyForecast 합.
  const fc=key=>cities.reduce((n,c)=>n+(Number(c.economyForecast?.[key])||0),0),delta=n=>n?`<small class="delta ${n>0?'up':'down'}">${n>0?'+':'−'}${Math.round(Math.abs(n))}</small>`:'';
  const research=v.research&&Number.isFinite(v.research.nextThreshold)?`${Math.round(v.research.science??0)}<i>/${v.research.nextThreshold}</i>`:null;
  $('#resources').innerHTML=[['food','식량',`${Math.round(sum('foodStock'))}${sum('foodCapacity')?`<i>/${Math.round(sum('foodCapacity'))}</i>`:''}`,fc('food'),'식량 재고/창고 · 다음 정산 증감'],['production','생산',Math.round(sum('production')),fc('production'),'도시 생산 합 · 다음 정산 증감'],...(research?[['science','과학',research,fc('science'),`연구 ${v.research.stage}단계 · 다음 단계 문턱 ${v.research.nextThreshold}`]]:[]),['fame','인망',v.faction.prestige??'—',fc('prestige'),'인망 · 다음 정산 증감'],['troops','병력',Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0),0,'부대 병력 합'],['reserve','예비',Math.round(sum('reserveTroops')),0,'도시 예비병 합']].map(([icon,label,value,d,title])=>`<span class="chip" title="${esc(title)}"><svg class="ic"><use href="/app/design/sg-icons.svg#i-${icon}"/></svg>${label} <b>${value}</b>${delta(d)}</span>`).join('');
  const remaining=Object.values(v.ownArmies).filter(a=>!armyActionEnded(state,a.armyId)).length;
  const idle=idleCities(v);$('#end-turn').dataset.blocker=locked?'':idle[0]?.cityId??'';$('#end-turn').classList?.toggle?.('blocked',!locked&&idle.length>0);
  $('#remaining').textContent=!locked&&idle.length?`생산 선택 ${idle.length}`:`행동 ${remaining} 남음`;$('#summary').textContent=`${state.phase==='AI'?'AI 자동 진행':'내 차례'} · 남은 부대 ${remaining}${v.crisis?` · 위기 ${v.crisis.name}(${factionName(v.crisis.factionId)}) ${v.crisis.turnsLeft}턴${v.crisis.joined?' · 연합':''}`:''}`;
  $('#turn-log').innerHTML=[...turnLog,...repeatFree(state.campaignEffects?.log??[],e=>e.factionId===state.playerFactionId),...(state.orderLog??[]).filter(e=>e.turn===state.turn).map(e=>e.text),...(state.administrationLog??[]).filter(e=>e.turn===state.turn&&(!e.factionId||e.factionId===state.playerFactionId)).map(e=>e.text),...(state.campaignGrowth?.log??[]).filter(e=>e.turn===state.turn&&state.officers[e.officerId]?.allegianceFactionId===state.playerFactionId).map(e=>e.text)].map(line=>`<p>${esc(line)}</p>`).join('');
  drawMap(v);
  $('#cancel-move').hidden=!moveMode||combatAnimating||!selectedArmyId||!campaignMoveOptions(state,selectedArmyId).length;
  renderUnitMenu(v);positionUnitMenu();
  renderCityPanel(v);renderCaptives();renderSetTracker(v);renderCrisis(v);renderDejaVu(v);
  $('#officers').innerHTML=Object.values(v.officers).map(o=>{const g=o.growth,role=officerRole(v,o.officerId),face=portraits[o.officerId]?.path;return `<tr><td><span class="ro-face" style="--fc:${FACTION_STYLE[v.factionId]?.color}">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</span><button class="btn ghost sm" data-officer="${esc(o.officerId)}">${esc(o.name)}</button>${role?`<em class="ro-role">${esc(role)}</em>`:''}${g?.status==='TRIAL'?'<small> TRIAL</small>':''}${(g?.cards??[]).map(c=>`<small>${c.kind==='trait'?traitChip(c):`${esc(c.name)} ${c.rank}단계`}${cardEffectPending(c)?' · 효과 준비 중':''}</small>`).join('')}</td><td><span class="potential" data-rank="${g.potential}">${g.potential}</span></td><td>${g.level}</td><td><progress value="${g.nextXp?g.xp:1}" max="${g.nextXp??1}" aria-label="${esc(o.name)} 경험치"></progress><small>${g.nextXp?`${g.xp}/${g.nextXp}`:'MAX'}</small></td>${Object.values(statsToOfficerPack(o.baseStats)).map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`;}).join('');
  renderGrowthDraft();renderEventCard(v);renderChoiceCard(v);renderTraitChoice();renderOfficerCard();renderFactionModal();
}
// 소속 장수 역할(어게인스트 더 스톰·올드 월드 초상 목록처럼 누가 어디서 무엇을 하는지 한눈에)
function officerRole(v,id){
 const army=Object.values(v.ownArmies).find(a=>a.commanderId===id);if(army)return '부대장';
 const gov=Object.values(v.ownCities).find(c=>c.governorId===id);if(gov)return `태수 · ${gov.name}`;
 const free=Object.values(v.ownCities).find(c=>(c.freeOfficers??[]).some(o=>o.officerId===id));return free?`대기 · ${free.name}`:'';
}
const RARITY_NAME=CAMPAIGN_RARITY_NAMES;
const CARD_ART_ICON={지휘:'command',무용:'valor',지략:'intellect',정무:'politics',감화:'charisma',기병:'troops',보병:'troops',궁병:'troops',창병:'troops',도검:'troops'};
function renderFactionModal(){
 const modal=$('#faction-modal');if(!modal||modal.hidden||!state)return;
 const v=view(state),p=v.policy,r=v.research,style=FACTION_STYLE[v.factionId],cityName=id=>v.ownCities[id]?.name??v.knowledge.cities[id]?.name??id;
 const own=p?.facilities?.filter(f=>f.factionId===v.factionId||p.unlocks?.some(u=>u.kind===f.kind))??[];
 $('#faction-title').innerHTML=`<span class="emblem lg" data-faction="${v.factionId}"><svg class="ic"><use href="/app/design/sg-icons.svg#${style.emblem}"/></svg></span>${esc(style.name)}군`;
 $('#faction-content').innerHTML=p?`<section class="fp-policy"><p class="fp-slot">세력 정책 · ${esc(p.slot)} 고정</p><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p></section>
 <h3>고유 시설</h3><ul class="fp-list">${own.map(f=>`<li>${UI_ICON(JOB_ICON[f.kind]??'build')}<b>${esc(f.name)}</b> <span>${esc(f.description)} · 생산 ${f.cost}</span><small>${f.cityIds.length?`지을 수 있는 성: ${f.cityIds.map(id=>esc(cityName(id))).join(', ')}`:'지을 수 있는 성 없음'}</small></li>`).join('')||'<li>없음</li>'}</ul>
 ${p.unlocks?.length?`<h3>편입제국 해금</h3><ul class="fp-list">${p.unlocks.map(u=>`<li><b>${esc((p.facilities.find(f=>f.kind===u.kind)??CITY_JOBS[u.kind])?.name??u.kind)}</b> <span>${u.turn}턴 · ${u.cityIds.map(id=>esc(cityName(id))).join(', ')}</span></li>`).join('')}</ul>`:''}
 ${v.factionId==='F02'?`<h3>피란 대열</h3>${p.refugees?.length?`<ul class="fp-list">${p.refugees.map(x=>`<li><b>주민 ${x.population??0} · 예비병 ${x.reserveTroops??0}</b> <span>${(x.officerIds??[]).length?'장수 '+x.officerIds.map(id=>esc(v.officers[id]?.name??id)).join(', '):''}</span></li>`).join('')}</ul>`:'<p class="muted">없음 — 성을 잃으면 주민 절반·예비병·자유 장수가 가까운 성으로 탈출합니다.</p>'}`:''}
 ${p.actions?.length?`<h3>별의 길 행동</h3><ul class="fp-list">${p.actions.map(a=>`<li><b>${esc(v.officers[a.officerId]?.name??a.officerId)} · ${a.role==='ARMY'?'부대장':'태수'}</b> <span>${esc(a.axis)} → ${esc(a.name)}: ${esc(a.description)}</span><small>${a.canUse?'지금 쓸 수 있음':a.readyTurn>state.turn?`대기 ${a.readyTurn-state.turn}턴`:esc(reasonText(a.blockedReason))}</small></li>`).join('')}</ul>`:''}`:'<p class="muted">이 지도에서는 세력 정책이 꺼져 있습니다.</p>';
 $('#faction-content').innerHTML+=diplomacySection(v);
 if(r)$('#faction-content').innerHTML+=`<h3>연구</h3><p>과학 ${Math.round(r.science??0)}${Number.isFinite(r.nextThreshold)?` / 다음 문턱 ${r.nextThreshold}`:' · 모든 단계 해금'} · ${r.stage}단계</p>${r.unlocks?.length?`<p class="muted">해금: ${r.unlocks.map(u=>esc(u.name??u)).join(' · ')}</p>`:''}`;
}
// C22 사건 카드(올드 월드식): 그림 · 제목 · 장소 · 글 · 선택지(결과 미리보기). 성장 Draft 가 먼저.
const EVENT_SCALE={SITUATION:'상황',EVENT:'사건',INCIDENT:'돌발',CRISIS:'위기'};
function renderEventCard(v=view(state)){
 const modal=$('#event-modal');if(!modal)return;
 const e=v.pendingEvent;modal.hidden=!e||combatAnimating||!!state.gameResult||!!pendingCampaignDraft(state);if(modal.hidden)return;
 menuOpen=false;$('#unit-menu').hidden=true;
 const crisis=e.scale==='CRISIS'||e.eventId==='CRISIS_HEGEMONY';
 $('#event-art').src=`/assets/event-art/${crisis?'CRISIS':esc(e.eventId)}_v1.jpg`;
 $('#event-scale').textContent=EVENT_SCALE[e.scale]??'사건';$('#event-scale').className='ev-scale'+(crisis?' crisis':'');
 $('#event-title').textContent=e.title;
 $('#event-place').textContent=[e.cityName,...(e.officerNames??[])].filter(Boolean).join(' · ');
 $('#event-text').textContent=e.text;
 $('#event-choices').innerHTML=e.choices.map((c,i)=>`<button class="ev-choice" data-event-choice="${esc(c.id)}" ${c.blockedReason||inputLocked()?'disabled':''}><span class="key">${'一二三四五'[i]??i+1}</span><b>${esc(c.label)}</b><small>${esc(c.blockedReason?reasonText(c.blockedReason):c.preview)}</small></button>`).join('');
}
$('#event-choices')?.addEventListener?.('click',e=>{const id=e.target.closest('[data-event-choice]')?.dataset.eventChoice,ev=state&&view(state).pendingEvent;if(!id||!ev)return;
 try{state=step(state,{type:'EVENT_CHOICE',eventId:ev.eventId,choiceId:id});$('#event-error').textContent='';render();scheduleOrders();}catch(err){$('#event-error').textContent=errorText(err);}});
// 외교(C43) — 세력 창 '외교' 칸 + 받은 제안은 선택 창. 화면은 다시 만들 예정이라 기능 확인용
const SUPPLY_LABEL={SAFE:'안전',DISRUPTED:'불안',CUT:'끊김',STARVING:'굶주림'},food1=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const DIPLO_KIND={TRUCE:'휴전',ALLIANCE:'동맹'},DIPLO_STATE={WAR:'전쟁',TRUCE:'휴전',ALLIANCE:'동맹'};
const DIPLO_TEXT={TRUCE:'다음 차례부터 3차례 동안 서로 공격하지 않고 상대 땅에 새로 들어가지 않습니다. 상대 땅에 있던 부대는 철수하는 동안 보호받습니다.',ALLIANCE:'서로 공격하지 않습니다. 자동으로 함께 싸우지는 않습니다.'};
function diplomacySection(v){
 const d=v.diplomacy;if(!d)return '';
 const btn=(f,kind)=>{const c=f.canPropose?.[kind];if(!c)return '';const tip=[c.reason,...(c.effectLines??[]),Number.isFinite(c.score)?`받을 점수 ${c.score}(0 이상이면 받음)`:''].filter(Boolean).join('\n');return `<button class="btn sm" data-diplo-propose="${esc(f.factionId)}" data-kind="${kind}" ${c.ok&&!inputLocked()?'':'disabled'} title="${esc(tip)}">${DIPLO_KIND[kind]} 제안</button>`;};
 const rows=(d.factions??[]).map(f=>`<li class="dp-row" data-state="${esc(f.state)}"><span class="emblem" data-faction="${esc(f.factionId)}"><svg class="ic"><use href="/app/design/sg-icons.svg#${FACTION_STYLE[f.factionId]?.emblem??'f-dragon'}"/></svg></span><b>${esc(f.name??FACTION_STYLE[f.factionId]?.name??f.factionId)}</b><em class="dp-state">${DIPLO_STATE[f.state]??f.state}${Number.isFinite(f.turnsLeft)?` ${f.turnsLeft}차례`:''}${f.endingAt?` · ${f.endingAt}턴 종료`:''}</em><span class="dp-acts">${f.contact===false?'<small>아직 만나지 않음</small>':`${f.state==='ALLIANCE'?`<button class="btn sm" data-diplo-end="${esc(f.factionId)}" ${f.endingAt||inputLocked()?'disabled':''}>동맹 종료</button>`:btn(f,'TRUCE')+btn(f,'ALLIANCE')}`}</span>${Number.isFinite(f.opinionOfMe)?`<div class="dp-axes"><span class="dp-op" title="이 세력이 나를 보는 마음(−100~100)">나를 보는 호감 <b class="${f.opinionOfMe>=0?'up':'down'}">${f.opinionOfMe>0?'+':''}${f.opinionOfMe}</b></span>${Number.isFinite(f.trust)?`<span title="약속을 지키면 오르고 기습·배신하면 떨어짐">신용 <b>${f.trust}</b></span>`:''}${Number.isFinite(f.threat)?`<span title="성을 빼앗을수록 오름 — 50 이상이면 다른 세력이 견제 동맹">위협 <b class="${f.threat>=50?'down':''}">${f.threat}</b></span>`:''}</div>${(f.opinionReasons??[]).length?`<ul class="dp-reasons">${f.opinionReasons.map(r=>`<li><span>${esc(r.text)}</span><b class="${r.value>=0?'up':'down'}">${r.value>0?'+':''}${r.value}</b><small>${Number.isFinite(r.turnsLeft)?`${r.turnsLeft}차례`:'계속'}</small></li>`).join('')}</ul>`:''}`:''}${['TRUCE','ALLIANCE'].map(k=>f.canPropose?.[k]?.ok&&f.canPropose[k].effectLines?.length?`<small class="dp-why">${DIPLO_KIND[k]}: ${esc(f.canPropose[k].effectLines.join(' · '))}${Number.isFinite(f.canPropose[k].score)?` → ${f.canPropose[k].score}`:''}</small>`:'').join('')}</li>`).join('');
 const prot=(d.protectedArmies??[]).length?`<p class="muted">철수 보호 중: ${d.protectedArmies.map(a=>`${esc(v.officers[v.ownArmies[a.armyId]?.commanderId]?.name??a.armyId)}(${a.until}턴까지)`).join(', ')}</p>`:'';
 const me=d.me?`<p class="dp-me">우리 신용 <b>${d.me.trust}</b> · 우리 위협 <b class="${d.me.threat>=50?'down':''}">${d.me.threat}</b> <small>(위협 50 이상이면 다른 세력들이 견제 동맹)</small></p>`:'';
 return `<h3>외교</h3>${me}<ul class="dp-list">${rows||'<li class="muted">외교 상대 없음</li>'}</ul>${prot}<p class="muted">휴전 3차례 · 동맹은 서로 공격 금지(자동 참전 없음) · 거절되면 같은 제안은 3차례 뒤에</p>`;
}
// 선택 창 — 탐험 조사 결과(C42) 등. 사건 카드 모양 재사용(화면은 다시 만들 예정이라 기능 확인용)
function pendingChoice(v){
 const d=v.diplomacy?.incoming?.[0];
 if(d)return {kind:'외교',title:`${d.fromName??d.from}의 ${DIPLO_KIND[d.kind]??d.kind} 제안`,place:Number.isFinite(d.expiresTurn)?`${d.expiresTurn}턴까지 답하지 않으면 거절`:'',text:DIPLO_TEXT[d.kind]??'',choices:[{id:'yes',label:'받아들인다',preview:DIPLO_TEXT[d.kind]??''},{id:'no',label:'거절한다',preview:'같은 제안은 3차례 동안 다시 오지 않습니다'}],send:id=>({type:'DIPLO_RESPOND',proposalId:d.proposalId,accept:id==='yes'})};
 const a=v.achievements?.pending;
 if(a){
  const CAT={boost:'강화',special:'전문화',open:'개방'},card=achPick&&a.cards?.find(c=>c.cardId===achPick);
  if(card&&(card.targets?.length??0)>1)return {kind:'주요 성과',title:`${a.name} — ${card.name}`,place:'대상을 고르세요',text:card.effectLine??'',turnsLeft:a.turnsLeft,
   choices:[...card.targets.map(t=>({id:'t:'+t.id,label:t.name,preview:t.effectLine??''})),{id:'back',label:'다른 카드 보기',preview:''}],
   send:id=>{if(id==='back'){achPick=null;return null;}const tid=id.slice(2);achPick=null;return {type:'ACHIEVEMENT_CHOICE',achievementId:a.achievementId,cardId:card.cardId,...(card.target==='CITY'?{cityId:tid}:{officerId:tid})};}};
  return {kind:'주요 성과',title:a.name,place:a.queued?`대기 중인 성과 ${a.queued}개 더`:'',text:'보상 하나를 고르세요. 판 안에서만 유지됩니다.',turnsLeft:a.turnsLeft,
   choices:(a.cards??[]).map(c=>({id:c.cardId,label:`${c.name} · ${CAT[c.category]??''}`,preview:c.effectLine??''})),
   send:id=>{const c=a.cards.find(x=>x.cardId===id);if(c&&(c.targets?.length??0)>1){achPick=id;return null;}const t=c?.targets?.[0];return {type:'ACHIEVEMENT_CHOICE',achievementId:a.achievementId,cardId:id,...(t?(c.target==='CITY'?{cityId:t.id}:{officerId:t.id}):{})};}};
 }
 const x=v.exploration?.pending;
 if(x)return {kind:'탐험',title:x.name??'빈 곳',place:[x.officerName,x.placeId].filter(Boolean).join(' · '),text:x.scene??'',turnsLeft:x.turnsLeft,choices:(x.choices??[]).map(c=>({id:c.choiceId,label:c.text,preview:c.effectLine})),send:id=>({type:'EXPLORE_CHOICE',placeId:x.placeId,choiceId:id})};
 return null;
}
function renderChoiceCard(v=view(state)){
 const modal=$('#choice-modal');if(!modal)return;
 const c=state.phase==='PLAYER'&&!combatAnimating&&!state.gameResult&&!pendingCampaignDraft(state)&&!v.pendingEvent?pendingChoice(v):null;
 modal.hidden=!c;if(!c)return;
 $('#choice-kind').textContent=c.kind;$('#choice-title').textContent=c.title;
 $('#choice-place').textContent=c.place+(Number.isFinite(c.turnsLeft)?` · ${c.turnsLeft}차례 안에 고르세요(안 고르면 첫 번째)`:'');
 $('#choice-text').textContent=c.text;
 $('#choice-list').innerHTML=c.choices.map((x,i)=>`<button class="ev-choice" data-choice="${esc(x.id)}" ${inputLocked()?'disabled':''}><span class="key">${'一二三四五'[i]??i+1}</span><b>${esc(x.label)}</b><small>${esc(x.preview??'')}</small></button>`).join('');
}
$('#choice-list')?.addEventListener?.('click',e=>{const id=e.target.closest('[data-choice]')?.dataset.choice,c=state&&pendingChoice(view(state));if(!id||!c)return;
 try{const cmd=c.send(id);if(!cmd){renderChoiceCard(view(state));return;}state=step(state,cmd);$('#choice-error').textContent='';render();}catch(err){$('#choice-error').textContent=errorText(err);}});
function renderGrowthDraft(){
 const pending=pendingCampaignDraft(state),modal=$('#growth-modal');
 modal.hidden=!pending||combatAnimating||!!state.gameResult;if(modal.hidden)return;
 menuOpen=false;$('#unit-menu').hidden=true;$('#attack-preview').hidden=true;
 const r=state.campaignGrowth.officers[pending.officerId],level=pending.draft.contextSnapshot.levelAfter;
 const officer=state.officers[pending.officerId],face=portraits[pending.officerId]?.path;
 $('#growth-title').innerHTML=`<span>${esc(officer.name)} <small>Lv ${level - 1} → ${level}</small></span><span class="potential" data-rank="${esc(r.potential)}" title="이번 판 포텐">${esc(r.potential)}</span>`;
 // 레벨업 창 왼쪽 전신 그림(하데스·파이어 엠블렘·다키스트 던전 구도). 그림이 없으면 먹 실루엣.
 const line=memoryLines[pending.officerId];
 $('#growth-art').innerHTML=`${face?`<img src="${esc(face)}" alt="">`:`<span class="art-fallback">${faceFallback(officer.name,FACTION_STYLE[officer.allegianceFactionId]?.color)}</span>`}<figcaption><b>${esc(officer.name)}</b><small>Lv ${level - 1} → ${level}</small>${line?`<q>${esc(line)}</q>`:''}${face?'':'<em>초상 준비 중</em>'}</figcaption>`;
 $('#growth-status').textContent=`레벨업 — ${level%5===0?'전법':'특기'} ${pending.cards.length}장 중 1장을 고르세요. 같은 특기는 다시 고르면 강해집니다(최대 5단계).`;
 const c28=pending.draft.c28,bonus=c28?.bonusRerolls??0,cardHtml=c=>`<button class="draft-card reveal" data-rarity="${esc(c.rarity)}" data-draft-pick="${esc(c.traitId)}"><span class="kind"><svg class="ic"><use href="/app/design/sg-icons.svg#i-${c.kind==='stat'?'stat-up':['trait','tactic'].includes(c.kind)?c.kind:c.kind==='fork'?'tactic':'trait'}"/></svg>${(c.kind==='awakening'?`각성 · ${{steady:'정석',narrative:'서사',wild:'변칙'}[c.branch]??''}`:c.kind==='fork'?'갈래':c.modifier?'전법 변형':{stat:'능력',trait:'특기',tactic:'전법'}[c.kind]??'특기')} · <span class="grade" data-rarity="${esc(c.rarity)}">${RARITY_NAME[c.rarity]??esc(c.rarity)}</span></span><span class="art">${UI_ICON(CARD_ART_ICON[c.classTag]??(c.kind==='stat'?'stat-up':c.kind))}</span><h3>${esc(c.name)}</h3>${cardOrigin(c)?`<span class="origin">유래 ${esc(cardOrigin(c))}</span>`:''}<p>${esc(c.text)}${c.kind!=='stat'&&cardEffectPending(c)?' · 효과 준비 중':''}</p><span class="foot"><span>${esc(c.sourceText??c.classTag??'고유 경로')}</span><span class="tier">${c.rank?`${c.rank}단계 → ${c.rank+1}단계`:'신규'}</span></span></button>`;
 $('#growth-cards').innerHTML=pending.cards.map(c=>c28?`<div class="draft-slot" data-slot="${esc(c.slot??'')}">${c.slot?`<span class="slot-tag">${esc(c.slot)}</span>`:''}${cardHtml(c)}<button class="card-reroll" data-card-reroll="${esc(c.traitId)}" ${(c.rerollsRemaining??0)+bonus<1?'disabled':''}>다시 뽑기 · ${(c.rerollsRemaining??0)}${bonus?` (+${bonus})`:''}</button></div>`:cardHtml(c)).join('');
 const draft=pending.draft,limit=draft.rerollLimit??1;
 $('#growth-reroll').hidden=!!draft.c28;
 $('#growth-reroll').disabled=draft.rerollCount>=limit||r.track.growthStates[pending.officerId].aptitudePoints<1||draft.eligibleCandidateSnapshot.filter(c=>!draft.offeredIds.includes(c.traitId)).length<1;
 $('#growth-reroll').textContent=draft.rerollCount>=limit?'다시 뽑기 사용 완료':`다시 뽑기 · ${limit-draft.rerollCount}회`;
}
let bindChoice=null;
function showBindChooser(pending,traitId){
 const r=state.campaignGrowth.officers[pending.officerId],card=r.cards[traitId],targets=c29BindingTargets(state,pending.officerId,card);
 bindChoice={draftId:pending.draft.draftId,traitId};
 $('#growth-error').innerHTML=targets.length?`<span class="bind-ask">「${esc(card.name)}」을 묶을 전법 — 그 전법 재사용 대기 +${card.params?.extraCooldown?2:1}</span>${targets.map(k=>`<button class="bind-opt" data-bind-tactic="${esc(k)}">${esc(r.cards[k]?.name??k)}</button>`).join('')}`:'묶을 수 있는 장착 전법이 없습니다.';
}
$('#growth-error').addEventListener('click',e=>{const t=e.target.closest?.('[data-bind-tactic]')?.dataset.bindTactic;if(t&&bindChoice){const b=bindChoice;bindChoice=null;command({type:'DRAFT_PICK',draftId:b.draftId,traitId:b.traitId,tacticId:t});}});
$('#growth-cards').addEventListener('click',e=>{
 const rerollId=e.target.closest('[data-card-reroll]')?.dataset.cardReroll;
 if(rerollId){const pending=state&&pendingCampaignDraft(state);if(pending)command({type:'DRAFT_REROLL',draftId:pending.draft.draftId,traitId:rerollId});return;}
 const traitId=e.target.closest('[data-draft-pick]')?.dataset.draftPick,pending=state&&pendingCampaignDraft(state);
 if(traitId&&pending){
   if(state.campaignGrowth.officers[pending.officerId]?.cards[traitId]?.modifier){showBindChooser(pending,traitId);return;}
   if(needsTraitResolution(state,pending.officerId,traitId)){traitChoice={draftId:pending.draft.draftId,officerId:pending.officerId,traitId,mode:null,selected:[],resolutions:[]};renderTraitChoice();}
   else command({type:'DRAFT_PICK',draftId:pending.draft.draftId,traitId});
 }
});
$('#growth-reroll').addEventListener('click',()=>{const pending=state&&pendingCampaignDraft(state);if(pending)command({type:'DRAFT_REROLL',draftId:pending.draft.draftId});});
function cardOrigin(c){return c?.origin??c?.formerName??'';}
function traitChip(c){const tip=[c.text,cardOrigin(c)&&`유래 ${cardOrigin(c)}`].filter(Boolean).join(' · ');return `<span class="trait-chip${c.core?' unique':''}" data-rarity="${esc(c.rarity)}"${tip?` title="${esc(tip)}"`:''}><b>●</b>${esc(c.name)} ${c.rank}단계</span>`;}
// 한 판 결과: 날짜·턴·전투 수·남은 성, 내 장수들의 성장(포텐·Lv·특기·전법)
function renderResultSummary(v,won){
 const box=$('#result-summary');if(!box)return;
 const officers=Object.values(v.officers).filter(o=>o.growth).sort((a,b)=>b.growth.level-a.growth.level||a.name.localeCompare(b.name,'ko'));
 const color=FACTION_STYLE[state.playerFactionId]?.color??'#7d7a6a';
 const rank=state.gameResult?.type==='TURN_LIMIT'?`<ol class="rs-rank">${state.gameResult.ranking.map(r=>`<li data-faction="${esc(r.factionId)}"${r.factionId===state.playerFactionId?' class="me"':''}><b>${esc(factionName(r.factionId))}</b> 큰 성 ${r.majorCities??r.cities} · 병력 ${r.troops.toLocaleString('ko-KR')}</li>`).join('')}</ol>`:'';
 box.innerHTML=rank+`<p class="rs-sub">${esc(campaignDate(state.gameResult?.type==='TURN_LIMIT'?CAMPAIGN_TURN_LIMIT:state.turn))} · 전투 ${state.battleSequence??0}회 · 성 ${Object.keys(v.ownCities).length}곳${won?'':' · 다음 판에는 포텐과 카드가 달라집니다'} · <span title="같은 판 다시 하기: 주소 뒤에 ?seed=${esc(state.campaignSeed)}">시드 ${esc(state.campaignSeed)}</span></p>
 <ul class="rs-officers" style="--fc:${color}">${officers.map(o=>{const g=o.growth,face=portraits[o.officerId]?.path;return `<li><div class="oc-face sm">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</div>
  <div><p><b class="rs-name">${esc(o.name)}</b> <span class="potential" data-rank="${g.potential}">${g.potential}</span> <span class="oc-lv">Lv ${g.level}</span></p>
  <p>${g.cards.filter(c=>c.kind==='trait').map(traitChip).join('')}${g.cards.filter(c=>c.kind==='tactic').map(c=>`<span class="grade" data-rarity="${esc(c.rarity)}">${esc(c.name)}</span>`).join(' ')}</p></div></li>`;}).join('')}</ul>`;
}
// 장수 카드: 초상·포텐·경험치, 능력 5개 막대, 특기 5칸(고유 먼저·빈 칸 표시), 전법 장착 3칸 + 보관함
const STAT_LABELS=['지휘','무용','지략','정무','감화'];
// C25 전기: 경력 칭호(얻은 턴·근거)와 한 일 — "레벨업에 서사"(사용자)
const TRACE_LABEL={charge:'돌격',flank:'측면 공격',rear:'후방 공격',frontHold:'정면 수비',siegeDamage:'성 내구 피해',cityDefense:'수성',pursuit:'추격',tactic:'전법',survived:'생환',routed:'패주',govTurns:'태수 턴',foodAdded:'늘린 식량',productionAdded:'늘린 생산',scienceAdded:'늘린 과학',facilitiesBuilt:'지은 시설',securityRecovered:'치안 회복',recruited:'등용',eventsDecided:'사건 결정'};
function careerSection(g){
 const titles=g.titles??[],trace=g.trace??{};if(!titles.length&&!Object.values(trace).some(Boolean))return '';
 const rows=Object.entries(trace).filter(([k,n])=>n&&TRACE_LABEL[k]).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`<span>${TRACE_LABEL[k]} <b>${n}</b></span>`);
 const foes=Object.keys(trace).filter(k=>k.startsWith('foughtBy:')&&trace[k]).length;if(foes)rows.push(`<span>교전 상대 <b>${foes}</b>명</span>`);
 return `<section class="oc-career"><h3>전기</h3>${titles.length?`<div class="oc-titles">${titles.map(t=>`<span class="title-chip" title="${esc(t.text??'')}">「${esc(t.name)}」<small>${t.turn}턴 · ${esc(t.text??'')}</small></span>`).join('')}</div>`:'<p class="muted">아직 칭호가 없습니다.</p>'}<div class="oc-trace">${rows.join('')}</div></section>`;
}
// C30 인연·세트. 세트 진행판 = TFT 시너지 표(왼쪽 숫자 배지 + 단계 눈금), 팀업 = 마블 라이벌즈 팀업(짝끼리 금색 끈)
const officerName=id=>state.officers?.[id]?.name??id;
function setTierSteps(id){return Object.keys(bondsData?.sets?.find(x=>x.id===id)?.tiers??{}).map(Number).sort((a,b)=>a-b);}
function renderSetTracker(v){
 const box=$('#set-tracker');if(!box)return;
 const rows=(v.setProgress??[]).filter(x=>x.count>0).sort((a,b)=>b.tier-a.tier||b.count-a.count);
 const groups=v.social?.boundGroups??[];box.hidden=!rows.length&&!groups.length;if(box.hidden){box.innerHTML='';return;}
 box.innerHTML=`${rows.length?'<h3>장수 세트</h3>':''}${rows.map(x=>{const steps=setTierSteps(x.id),set=bondsData?.sets?.find(s=>s.id===x.id),lv=x.tier>=(steps.at(-1)??99)?'max':x.tier?'on':'off';
  const tip=`${x.name} ${x.count}/${x.total}\n${(set?.members??[]).map(id=>`${(state.officers[id]?.allegianceFactionId===state.playerFactionId&&Object.values(state.armies).some(a=>a.commanderId===id&&a.factionId===state.playerFactionId))?'●':'○'} ${officerName(id)}`).join('  ')}\n${steps.map(n=>`${n<=x.tier?'▶':'·'} ${n}명: ${set?.tiers?.[n]??''}`).join('\n')}`;
  return `<div class="st-row ${lv}" title="${esc(tip)}"><span class="st-badge">${x.count}</span><span class="st-name">${esc(x.name)}</span><span class="st-steps">${steps.map(n=>`<i class="${n<=x.tier?'hit':''}">${n}</i>`).join('<b>›</b>')}</span></div>`;}).join('')}${groups.length?`<h3>결의 세트</h3>${groups.map(g=>{const fx=RELATIONS.boundSet.tiers,tip=`${g.members.map(officerName).join('·')} — 결의로 이어진 부대장 ${g.members.length}명 출진\n${Object.entries(fx).map(([n,t])=>`${Number(n)<=g.stage?'▶':'·'} ${n}명: ${t}`).join('\n')}`;
  return `<div class="st-row ${g.stage>=4?'max':'on'} bound" title="${esc(tip)}"><span class="st-badge">${g.members.length}</span><span class="st-name">${esc(g.members.map(officerName).join('·'))}</span><span class="st-steps">${Object.keys(fx).map(n=>`<i class="${Number(n)<=g.stage?'hit':''}">${n}</i>`).join('<b>›</b>')}</span></div>`;}).join('')}`:''}`;
}
function bondLinks(v){
 if(!bondsData)return [];const out=[],armyOf=id=>Object.values(v.ownArmies).find(a=>a.commanderId===id);
 for(const b of bondsData.teamUps??[]){const anchor=armyOf(b.anchor);if(!anchor)continue;
  for(const pid of b.partners??[]){const p=armyOf(pid);if(!p)continue;const on=[b.anchor,pid].some(id=>(v.officers[id]?.teamUps??[]).some(t=>t.id===b.id));if(on&&anchor.tileId!==p.tileId)out.push({from:anchor.tileId,to:p.tileId,label:b.name,armies:[anchor.armyId,p.armyId]});}}
 return out;
}
function bondChips(o){
 const t=(o?.teamUps??[]).map(x=>`<span class="bond-chip team" title="${esc(x.effect)}">${UI_ICON('charisma')}${esc(x.name)}</span>`),s=(o?.sets??[]).map(x=>`<span class="bond-chip set" title="${esc(x.effect)}">${esc(x.name)} ${x.tier}단계</span>`);
 return t.length||s.length?`<div class="um-bonds">${[...t,...s].join('')}</div>`:'';
}
function bondSection(id){
 if(!bondsData)return '';const o=view(state).officers[id];
 const mine=(bondsData.teamUps??[]).filter(b=>b.anchor===id||(b.partners??[]).includes(id)),sets=(bondsData.sets??[]).filter(x=>x.members.includes(id));if(!mine.length&&!sets.length)return '';
 const active=new Set((o?.teamUps??[]).map(x=>x.id)),tiers=Object.fromEntries((o?.sets??[]).map(x=>[x.id,x.tier])),prog=Object.fromEntries((view(state).setProgress??[]).map(x=>[x.id,x]));
 const teams=mine.map(b=>`<li class="${active.has(b.id)?'on':''}"><b>${esc(b.name)}</b> <small>${[b.anchor,...b.partners].filter(x=>x!==id).map(officerName).map(esc).join('·')}${b.range?` · ${b.range}칸 안`:''}</small>${active.has(b.id)?'<em>성립</em>':''}<p>${esc(b.text)}</p></li>`).join('');
 const setRows=sets.map(x=>{const p=prog[x.id],tier=tiers[x.id]??p?.tier??0;return `<li class="${tier?'on':''}"><b>${esc(x.name)}</b> <small>${p?`${p.count}/${p.total}`:`0/${x.members.length}`}${tier?` · ${tier}단계`:''}</small><p>${Object.entries(x.tiers).map(([n,t])=>`<span class="${Number(n)<=tier?'hit':''}">${n}명 ${esc(t)}</span>`).join('')}</p></li>`;}).join('');
 return `<section class="oc-bonds"><h3>인연 · 세트</h3>${teams?`<ul class="bond-list">${teams}</ul>`:''}${setRows?`<ul class="bond-list sets">${setRows}</ul>`:''}</section>`;
}
// C31 인물 Crisis: 등장·해결 카드(XCOM2 Chosen 등장 · 네메시스), 위 띠(토탈 워 엔드게임 위기), 지도 붉은 고리
const CRISIS_END={ROUTED:'패주시켰다',ELIMINATED:'무너뜨렸다',CAPTURED:'사로잡았다',TIMEOUT:'버텨 냈다 — 8턴이 지났다'};
const hasBatchim=w=>{const c=(w??'').charCodeAt((w??'').length-1)-0xAC00;return c>=0&&c<=11171&&c%28>0;};
const playText=t=>(t??'').replace(/\s*\(C\d+[^)]*\)/g,'').replace(/Crisis\s*를/g,'위기를').replace(/Crisis/g,'위기').replace(/AI 는/g,'AI는');
const josa=t=>(t??'').replace(/([가-힣A-Za-z0-9]+)(이\(가\)|을\(를\)|은\(는\)|과\(와\))/g,(m,w,j)=>w+(hasBatchim(w)?j[0]:j[2]));
function crisisKey(x){return `${x.actorId}:${x.startTurn}:${x.resolved?'end':'start'}`;}
function renderCrisis(v){
 const x=v.c31,pill=$('#crisis-pill'),modal=$('#crisis-modal');if(!pill||!modal)return;
 const actor=x&&state.officers[x.actorId],type=crisisData?.types?.find(t=>t.id===x?.type);
 pill.hidden=!x||!!x.resolved;
 if(x&&!x.resolved){const face=portraits[x.actorId]?.path;pill.innerHTML=`<span class="cp-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(actor?.name??'')}</span><span class="cp-text"><small>위기 인물</small><b>${esc(actor?.name??'')} — ${esc(x.name)}</b></span><span class="cp-turns">${x.turnsLeft}<small>턴</small></span>`;pill.title='위기 카드 다시 보기';}
 if(!x||!modal.hidden&&modal.dataset.key===crisisKey(x))return;
 const key=crisisKey(x);if(crisisSeen.has(key)||combatAnimating||state.phase!=='PLAYER'||v.pendingEvent||pendingCampaignDraft(state))return;
 if(x.resolved&&(state.c31?.endTurn??-1)<state.turn-1)return;
 openCrisisCard(v);
}
function openCrisisCard(v=view(state)){
 const x=v.c31,modal=$('#crisis-modal');if(!x||!modal)return;
 const actor=state.officers[x.actorId],type=crisisData?.types?.find(t=>t.id===x.type),face=portraits[x.actorId]?.path,fac=FACTION_STYLE[actor?.allegianceFactionId];
 const gauge=Math.round(state.campaignGrowth?.officers?.[x.actorId]?.c29?.gauge??0),resolver=state.c31?.resolverId&&state.officers[state.c31.resolverId];
 const name=actor?.name??'',reward=playText(crisisData?.reward?.text).replace(/\{actor\}를/g,name+(hasBatchim(name)?'을':'를')).replace(/\{actor\}/g,name);
 const title=x.resolved?(x.resolved==='TIMEOUT'?'위기가 지나갔다':'위기를 막았다'):'위기 인물 등장';
 const body=x.resolved
  ?`<p class="cr-warn">${esc(name)}의 ${esc(x.name)} — ${esc(resolver?josa(`${resolver.name}이(가) ${CRISIS_END[x.resolved]??'막았다'}`):CRISIS_END[x.resolved]??'끝났다')}</p>${x.resolved==='TIMEOUT'?`<p class="cr-line"><b>결과</b>${esc(fac?.name??'그 세력')} 인망 +${crisisData?.end?.timeoutFame??30}. 위기 동안의 효과는 사라지고, ${esc(josa(name+'이(가)'))} 얻은 레벨·칭호·카드는 남는다.</p>`:`<p class="cr-line"><b>보상</b>${esc(resolver?reward.replace('해결한 플레이어 장수',resolver.name):reward)}</p>`}`
  :`<p class="cr-warn">${esc(josa(x.warnText))}</p><p class="cr-line"><b>달라지는 것</b>${esc(playText(type?.effect))}</p><p class="cr-line"><b>막는 법</b>${esc(playText(crisisData?.end?.text))}</p><p class="cr-line"><b>보상</b>${esc(reward)}</p><p class="cr-gauge"><span class="sig-gauge" style="--g:${Math.min(100,gauge)}%">고유 전법 게이지 ${gauge}/100</span><span class="cr-turns">남은 ${x.turnsLeft}턴</span></p>`;
 $('#crisis-art').innerHTML=`${face?`<img src="${esc(face)}" alt="">`:`<span class="art-fallback">${faceFallback(name,fac?.color)}</span>`}<figcaption><b>${esc(name)}</b><small>${esc(fac?.name??'')} 세력 · Lv ${state.campaignGrowth?.officers?.[x.actorId]?.track?.growthStates?.[x.actorId]?.level??'—'}</small>${memoryLines[x.actorId]?`<q>${esc(memoryLines[x.actorId])}</q>`:''}</figcaption>`;
 $('#crisis-main').innerHTML=`<p class="cr-eyebrow">${title}</p><h1>${esc(name)}</h1><p class="cr-type type-${esc(x.type)}">${esc(x.name)}</p>${body}<button class="btn primary" data-crisis-close>${x.resolved?'확인':'맞선다'}</button>`;
 modal.dataset.key=crisisKey(x);modal.classList?.toggle?.('resolved',!!x.resolved);modal.hidden=false;crisisSeen.add(crisisKey(x));menuOpen=false;$('#unit-menu').hidden=true;
}
$('#crisis-modal')?.addEventListener?.('click',e=>{if(e.target.closest?.('[data-crisis-close]')||e.target.id==='crisis-modal')$('#crisis-modal').hidden=true;});
$('#crisis-pill')?.addEventListener?.('click',()=>openCrisisCard());
// C29 성장(장수 정보 창): 고유 전법 게이지 · 고유 특기 각성 · 묶인 변형 · 갈래
function c29Section(id){
 const r=state.campaignGrowth?.officers?.[id],x=r?.c29;if(!x)return '';
 const sig=Object.values(r.cards).find(c=>c.kind==='tactic'&&(c.signature||c.classTag==='고유'));
 const name=k=>esc(r.cards[k]?.name??k),branch={steady:'정석',narrative:'서사',wild:'변칙'};
 const aw=(x.awakenings??[]).map(a=>`<li><span class="aw-b">${branch[a.branch]??'각성'}</span><b>${esc(a.name)}</b><small>Lv ${a.level??''} · ${esc(a.text??'')}</small></li>`).join('');
 const binds=Object.entries(x.bindings??{}).map(([t,m])=>`<li>${name(m)} → <b>${name(t)}</b></li>`).join(''); // 저장 형식 {전법: 변형}
 const owned=r.track?.growthStates?.[id]?.ownedTraitRanks??{},lv=r.track?.growthStates?.[id]?.level??1,cost=xpToNextLevel(lv),locked=tacticLoadoutReason(state,id),xp=Math.max(r.totalXp??0,r.xp??0);
 const rebind=Object.keys(owned).filter(k=>r.cards[k]?.modifier).map(m=>{const cur=Object.entries(x.bindings??{}).find(([,v])=>v===m)?.[0],opts=c29BindingTargets(state,id,r.cards[m]).filter(t=>t!==cur);if(!opts.length)return '';const why=locked?'전투 중에는 못 바꿈':(x.xpDebt??0)>0?`경험치 빚 ${Math.ceil(x.xpDebt)} 을 먼저 갚아야 함(전투로 얻는 경험치가 빚부터 갚음)`:xp<cost?`경험치 ${cost} 필요`:'';return `<li><b>${name(m)}</b> 다시 묶기 <small>경험치 ${cost}</small>${opts.map(t=>`<button class="bind-opt" data-rebind="${esc(m)}" data-rebind-tactic="${esc(t)}" ${why||inputLocked()?'disabled':''} title="${esc(why||`${r.cards[t]?.name??t} 의 재사용 대기 +1`)}">→ ${name(t)}</button>`).join('')}${why?`<em class="muted"> ${esc(why)}</em>`:''}</li>`;}).join('');
 const forks=Object.entries(x.forks??{}).map(([t,b])=>`<li>${name(t)} · 갈래 ${esc(String(b).toUpperCase())}</li>`).join('');
 const g=Math.min(100,Math.round(x.gauge??0));
 return `<section class="oc-c29"><h3>고유 전법 · 각성</h3>${sig?`<p class="sig-row"><b>${esc(sig.name)}</b><span class="sig-gauge" style="--g:${g}%">게이지 ${g}/100${g>=100?' · 사용 가능':''}</span></p>`:''}<p class="muted">고유 특기 각성 ${(x.awakenings??[]).length}/3 (Lv 4·8·12)</p>${aw?`<ul class="aw-list">${aw}</ul>`:''}${binds?`<h4>묶인 전법 변형</h4><ul class="bind-list">${binds}</ul>`:''}${rebind?`<ul class="bind-list rebind">${rebind}</ul>`:''}${forks?`<h4>전법 갈래</h4><ul class="bind-list">${forks}</ul>`:''}</section>`;
}
function renderOfficerCard(){
 const modal=$('#officer-modal'),o=selectedOfficerId&&view(state).officers[selectedOfficerId];modal.hidden=!o||!!pendingCampaignDraft(state);if(modal.hidden)return;
 const g=o.growth,reason=tacticLoadoutReason(state,o.officerId),traits=g.cards.filter(c=>c.kind==='trait'),tactics=g.cards.filter(c=>c.kind==='tactic');
 const color=FACTION_STYLE[o.allegianceFactionId]?.color??'#7d7a6a',face=portraits[o.officerId]?.path,stats=statsToOfficerPack(o.baseStats);
 $('#officer-title').textContent=o.name;
 const ordered=[...traits.filter(c=>c.core),...traits.filter(c=>!c.core)];
 const pips=n=>`<span class="pips" aria-label="${n}단계">${'●'.repeat(Math.min(5,n))}${'○'.repeat(Math.max(0,5-n))}</span>`;
 const trait=c=>`<li class="oc-slot" data-rarity="${esc(c.rarity)}">${traitChip(c)}${pips(c.rank)}<small>${esc(c.text??'')}${cardEffectPending(c)?' · 효과 준비 중':''}</small></li>`;
 const slots=[...ordered.map(trait),...Array.from({length:Math.max(0,g.traitSlots-ordered.length)},()=>'<li class="oc-slot empty">빈 칸</li>')].join('');
 const button=(c,on)=>`<button class="btn sm" data-loadout="${esc(c.traitId)}" data-equip="${!on}" ${reason||(!on&&g.equippedTacticIds.length>=CAMPAIGN_TACTIC_SLOTS)?'disabled':''}>${on?'해제':'장착'}</button>`;
 const tactic=(c,on)=>`<li class="oc-tactic${on?' on':''}" data-rarity="${esc(c.rarity)}"><span class="grade" data-rarity="${esc(c.rarity)}">${RARITY_NAME[c.rarity]??esc(c.rarity)}</span><b>${esc(c.name)}</b>${pips(c.rank)}<em>${on?'장착 ✓':'보관'}</em>${button(c,on)}<small>${esc(c.text??'')}${cardEffectPending(c)?' · 효과 준비 중':''}</small></li>`;
 const equipped=g.equippedTacticIds.map(id=>tactics.find(c=>c.traitId===id)).filter(Boolean),stored=tactics.filter(c=>!g.equippedTacticIds.includes(c.traitId));
 $('#officer-content').innerHTML=`<div class="oc-head" style="--fc:${color}">
  <div class="oc-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</div>
  <div class="oc-meta"><p><span class="potential" data-rank="${g.potential}" title="이번 판 포텐">${g.potential}</span> <span class="oc-lv">Lv ${g.level} · 경험치 ${g.nextXp?`${g.xp}/${g.nextXp}`:'MAX'}</span></p>
   <progress value="${g.nextXp?g.xp:1}" max="${g.nextXp??1}" aria-label="경험치"></progress>${availabilityLine(o)}
   <ul class="oc-stats">${STAT_LABELS.map(k=>`<li><span>${k}</span><i style="--v:${Math.max(0,Math.min(100,stats[k]??0))}%"></i><b>${stats[k]??'—'}</b></li>`).join('')}</ul></div></div>
 <details class="oc-sub"><summary>하위 능력치 · 병종 적성</summary><dl>${STAT_LABELS.map(axis=>`<dt>${axis}</dt><dd>${SUB_AXES[axis].map(k=>`<span${COMBAT_SUBS.has(k)?' class="cb" title="전투 계산에 쓰임"':''}>${esc(k)} <b>${campaignSubAbility(state,o.officerId,axis,k)}</b></span>`).join('')}</dd>`).join('')}<dt>병종 적성</dt><dd>${Object.entries(TROOP_NAME).map(([bt,n])=>{const v=state.campaignGrowth?.officers[o.officerId]?.pack?.troopAptitude?.[bt]??'MEDIUM';return `<span class="apt-${v.toLowerCase()}">${n} <b>${APTITUDE_NAME[v]??v}</b></span>`;}).join('')}</dd></dl><p class="muted">밑줄 = 전투 계산에 쓰이는 능력치. 적성 높음 +10% · 낮음 −10%</p></details>
 ${careerSection(g)}${c29Section(o.officerId)}${bondSection(o.officerId)}${relationSection(o.officerId)}
 <h3>특기 칸 ${g.traitCount}/${g.traitSlots}</h3><ul class="oc-slots">${slots}</ul>
 <h3>전법 장착 ${g.equippedTacticIds.length}/${CAMPAIGN_TACTIC_SLOTS}</h3><ul class="oc-tactics">${equipped.map(c=>tactic(c,true)).join('')}${Array.from({length:Math.max(0,CAMPAIGN_TACTIC_SLOTS-equipped.length)},()=>'<li class="oc-tactic empty">빈 장착 칸</li>').join('')}</ul>
 ${stored.length?`<h3>보관한 전법 ${stored.length}</h3><ul class="oc-tactics stored">${stored.map(c=>tactic(c,false)).join('')}</ul>`:''}
 ${reason?`<p class="oc-lock">${esc(reason)}</p>`:''}`;
}
$('#officers').addEventListener('click',e=>{const id=e.target.closest('[data-officer]')?.dataset.officer;if(id){selectedOfficerId=id;renderOfficerCard();}});
$('#officer-close').addEventListener('click',()=>{selectedOfficerId=null;$('#officer-modal').hidden=true;});
$('#dejavu')?.addEventListener('click',closeDejaVu);
$('#visit-modal')?.addEventListener('click',e=>{
 if(e.target.closest('[data-visit-close]')||e.target===e.currentTarget){visitScene=null;renderVisit();return;}
 const i=e.target.closest('[data-visit-choice]')?.dataset.visitChoice;if(i!==undefined)pickVisit(Number(i));
});
document.addEventListener('keydown',e=>{if(!visitScene)return;if(e.key==='Escape'){visitScene=null;renderVisit();e.stopImmediatePropagation();}else if(/^[1-3]$/.test(e.key)){pickVisit(Number(e.key)-1);e.stopImmediatePropagation();}});
$('#officer-content').addEventListener('click',e=>{const rb=e.target.closest?.('[data-rebind]');if(rb&&!inputLocked()){command({type:'MODIFIER_REBIND',officerId:selectedOfficerId,modifierId:rb.dataset.rebind,tacticId:rb.dataset.rebindTactic});return;}const b=e.target.closest('[data-loadout]');if(b&&!inputLocked())command({type:'TACTIC_LOADOUT',officerId:selectedOfficerId,traitId:b.dataset.loadout,equip:b.dataset.equip==='true'});});
function choicePreviewState(){const preview=structuredClone(state);for(const resolution of traitChoice.resolutions)resolveTraitSpace(preview,traitChoice.officerId,resolution);return preview;}
function choiceTraits(){return officerEffectCards(choicePreviewState(),traitChoice.officerId).filter(c=>!c.core);}
function renderTraitChoice(){
 const modal=$('#trait-modal');if(traitChoice&&!pendingCampaignDraft(state))traitChoice=null;modal.hidden=!traitChoice;if(modal.hidden)return;
 $('#growth-modal').hidden=true;const mode=traitChoice.mode;
 $('#trait-status').textContent=!mode?'합치기 또는 버리기를 선택하세요. 고유특기는 보호됩니다.':mode==='merge'?'둘을 선택하세요. 먼저 고른 특기를 남깁니다.':'버릴 특기 하나를 선택하세요.';
 $('#trait-options').innerHTML=!mode?`<button class="draft-card" data-trait-mode="merge">합치기</button><button class="draft-card" data-trait-mode="discard">버리기</button>`:choiceTraits().map(c=>`<button class="draft-card" data-trait-material="${esc(c.traitId)}" aria-pressed="${traitChoice.selected.includes(c.traitId)}">${traitChip(c)}${traitChoice.selected.includes(c.traitId)?' ✓':''}</button>`).join('');
 if(mode==='merge'&&traitChoice.selected.length===2){const preview=choicePreviewState(),resultId=resolveTraitSpace(preview,traitChoice.officerId,{mode:'merge',keepId:traitChoice.selected[0],removeId:traitChoice.selected[1]});const result=officerEffectCards(preview,traitChoice.officerId).find(c=>c.traitId===resultId);if(result)$('#trait-status').innerHTML=`합치기 결과: ${traitChip(result)}`;}
 $('#trait-confirm').hidden=!mode;$('#trait-confirm').disabled=traitChoice.selected.length!==(mode==='merge'?2:1);
}
$('#trait-options').addEventListener('click',e=>{
 if(!traitChoice)return;const mode=e.target.closest('[data-trait-mode]')?.dataset.traitMode,id=e.target.closest('[data-trait-material]')?.dataset.traitMaterial;
 if(mode){traitChoice.mode=mode;traitChoice.selected=[];}
 if(id){const list=traitChoice.selected;if(list.includes(id))traitChoice.selected=list.filter(k=>k!==id);else if(list.length<(traitChoice.mode==='merge'?2:1))list.push(id);}
 renderTraitChoice();
});
$('#trait-back').addEventListener('click',()=>{if(traitChoice?.mode){traitChoice.mode=null;traitChoice.selected=[];renderTraitChoice();}else{traitChoice=null;render();}});
$('#trait-confirm').addEventListener('click',()=>{
 if(!traitChoice)return;const c=traitChoice;if(c.selected.length!==(c.mode==='merge'?2:1))return;
 c.resolutions.push(c.mode==='merge'?{mode:c.mode,keepId:c.selected[0],removeId:c.selected[1]}:{mode:c.mode,removeId:c.selected[0]});
 if(choiceTraits().length+1>=CAMPAIGN_TRAIT_SLOTS){c.mode=null;c.selected=[];renderTraitChoice();return;}
 traitChoice=null;command({type:'DRAFT_PICK',draftId:c.draftId,traitId:c.traitId,resolution:c.resolutions});
});
// 저장소: 브라우저는 IndexedDB(압축), 없으면 localStorage — 값 또는 Promise 를 돌려준다(save-store.mjs)
function savedState() {
  return settle(loadText(CAMPAIGN_SAVE_KEY), raw => raw ? deserialize(raw) : null);
}
const attempt=(fn,onError)=>{try{const r=fn();if(r&&typeof r.catch==='function')r.catch(onError);}catch(error){onError(error);}};

const cityNumber=n=>Math.round(n).toLocaleString('ko-KR');
function renderCaptives() {
 let panel=document.querySelector('#captives');if(!panel)return;
 const captives=campaignCaptives(state);panel.hidden=!captives.length; // 포로가 없으면 제목도 숨김
 panel.innerHTML='<h3>포로</h3>'+captives.map(p=>`<p>${esc(p.name)} · ${esc(factionName(p.homeFactionId))}${p.negotiating?' · 등용 협의 1턴':''}</p><div class="options">${[['hold','억류'],['release','무상 석방'],['recruit','조건부 등용']].map(([action,label])=>{const reason=p.negotiating?'등용 협의 중':action==='recruit'?captiveRecruitmentReason(state,p):null;return `<button class="option" data-captive="${esc(p.prisonerId)}" data-captive-action="${action}" ${reason||inputLocked()?'disabled':''}><b>${label}</b><small>${esc(reason??(action==='recruit'?'인망 50 · 협의 1턴 · 성공 시만 소비':''))}</small></button>`;}).join('')}</div>`).join('');
}
$('#captives').addEventListener('click',e=>{const button=e.target.closest('[data-captive-action]');if(button&&!inputLocked())command({type:'CAPTIVE_ACTION',prisonerId:button.dataset.captive,action:button.dataset.captiveAction});});
// 치안 표시: 저장된 단계 대신 산출에 쓰는 단계(태수와 결의 짝이 같은 성이면 한 단계 위 — C39)
const citySecurity=c=>securityLabel({...c,securityLevel:c.economyForecast?.securityLevel??c.securityLevel});
// 기시감(전생의 기억) — 내 세력 장수 사건을 한 번씩 먹 띠 장면으로(엔진 view.dejaVu.recent, C41). 불러온 판의 지난 차례 것은 다시 띄우지 않음
let dejaVuSeen=null,dejaVuQueue=[],dejaVuTimer=null,dejaVuRetry=null;
function renderDejaVu(v){
 const box=$('#dejavu');if(!box)return;
 const INJ={INJURED:'중상',RETURNED:'복귀'},list=[...(v.dejaVu?.recent??[]),...(v.injury?.recent??[]).map(x=>({id:`inj:${x.kind}:${x.officerId}:${x.turn}`,officerId:x.officerId,officerName:x.officerName,name:INJ[x.kind]??x.kind,scene:'',line:x.line,turn:x.turn,label:x.kind==='RETURNED'?'복귀':'부상',foot:x.kind==='RETURNED'?'군주와 친밀도 +5 · 경험치 +10':(Number.isFinite(x.turnsLeft)?`${x.turnsLeft}차례 요양`:'요양')}))];
 if(!dejaVuSeen)dejaVuSeen=new Set(list.filter(x=>x.turn<state.turn).map(x=>x.id));
 for(const x of list)if(!dejaVuSeen.has(x.id)){dejaVuSeen.add(x.id);dejaVuQueue.push(x);}
 const busy=combatAnimating||state.phase!=='PLAYER'||v.pendingEvent||pendingCampaignDraft(state)||[...document.querySelectorAll('.modal-backdrop')].some(m=>!m.hidden);
 if(box.hidden&&dejaVuQueue.length){if(!busy)showDejaVu();else if(!dejaVuRetry)dejaVuRetry=setTimeout(()=>{dejaVuRetry=null;if(state)renderDejaVu(view(state));},700);}
}
function showDejaVu(){
 const box=$('#dejavu'),x=dejaVuQueue.shift();if(!box)return;if(!x){box.hidden=true;return;}
 const o=state.officers[x.officerId],face=portraits[x.officerId]?.path,name=x.officerName??o?.name??'';
 box.innerHTML=`<div class="dv-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(name,FACTION_STYLE[o?.allegianceFactionId]?.color)}</div><div class="dv-text"><p class="dv-head"><small>${esc(x.label??'기시감')}</small><b>${esc(x.name)}</b><span>${esc(name)}</span></p>${x.scene?`<p class="dv-scene">${esc(x.scene)}</p>`:''}<p class="dv-line">${esc(x.line)}</p><p class="dv-foot">${esc(x.foot??`전생의 기억 조각 · 경험치 +${Number(x.xp)||15}`)}</p></div>`;
 box.hidden=false;box.classList.remove('in');void box.offsetWidth;box.classList.add('in');
 clearTimeout(dejaVuTimer);dejaVuTimer=setTimeout(closeDejaVu,10000);
}
function closeDejaVu(){clearTimeout(dejaVuTimer);const box=$('#dejavu');if(box)box.hidden=true;if(dejaVuQueue.length)setTimeout(()=>renderDejaVu(view(state)),300);}
// C38 친목 화면 — 주점 술자리·저택 대화·장수 관계. 판정·한도·문구는 엔진(campaign-relations)을 그대로 쓴다
const tierChip=r=>`<i class="tier t-${String(r.tier).toLowerCase()}${r.kind==='RIVAL'&&r.tier!=='RIVAL'?' t-feud':''}"${r.rivalEvent?` title="${esc(r.rivalEvent)}"`:''}>${esc(r.displayName??r.tierName)}</i>`;
const tierAt=n=>n<=RELATIONS.rivalAt?'숙적':[...RELATIONS.tiers].reverse().find(t=>n>=t.min).name;
const affBar=n=>`<span class="aff" style="--v:${Math.max(0,Math.min(100,n))}%" title="친밀도 ${n}"><i></i></span>`;
const faceChip=id=>{const p=portraits[id]?.path,o=state.officers[id];return `<span class="soc-face">${p?`<img src="${esc(p)}" alt="">`:faceFallback(o?.name,FACTION_STYLE[o?.allegianceFactionId]?.color)}</span>`;};
let feastDone=null;
function feastHtml(v,c){
 if(!v.social)return '';
 if(feastCity!==c.cityId){feastCity=c.cityId;feastPick=[];}
 const city=state.cities[c.cityId],ids=relationCityOfficers(state,city,{commanders:true}),g=RELATIONS.gains.feast,used=v.social.feastUsed?.[c.cityId];feastPick=feastPick.filter(id=>ids.includes(id));
 const role=id=>id===v.social.lordId?'군주':id===city.governorId?'태수':Object.values(state.armies).some(a=>a.commanderId===id&&a.factionId===city.ownerFactionId)?'부대장':'';
 const reason=feastPick.length<2?'':socialReason(state,{type:'FEAST',cityId:c.cityId,officerIds:feastPick});
 const pairs=feastPick.flatMap((a,i)=>feastPick.slice(i+1).map(b=>[a,b]));
 const head=`<h3>술자리 <small>성마다 한 달에 한 번 · 함께한 모든 짝 친밀도 +${g.value} · 인망 ${g.costPrestige}</small></h3>`;
 if(used)return head+(feastDone?.cityId===c.cityId&&feastDone.month===v.social.month?`<ul class="feast-pairs done">${feastDone.lines.map(x=>`<li><span>${esc(x.names)}</span><b>${x.before} → ${x.after}</b>${x.tier?`<em>${esc(x.tier)}</em>`:''}</li>`).join('')}</ul>`:'')+'<p class="feast-go"><small>이번 달 이 성의 술자리는 이미 열었습니다. 다음 달에 다시 열 수 있습니다.</small></p>';
 const seats=ids.length<2?'<p class="muted">이 성에 장수가 두 명 이상 있어야 합니다.</p>':`<ul class="feast-seats">${ids.map(id=>{const on=feastPick.includes(id);return `<li><button class="feast-seat${on?' on':''}" data-feast-pick="${esc(id)}" aria-pressed="${on}" ${!on&&feastPick.length>=3?'disabled':''}>${faceChip(id)}<b>${esc(officerName(id))}</b><small>${role(id)}</small></button></li>`;}).join('')}</ul>`;
 const preview=pairs.length?`<ul class="feast-pairs">${pairs.map(([a,b])=>{const r=relation(state,a,b),n=Math.min(RELATIONS.range[1],r.value+g.value);return `<li><span>${esc(officerName(a))} · ${esc(officerName(b))}</span>${tierChip(r)}<b>${r.value} → ${n}</b>${tierAt(n)!==r.tierName?`<em>${esc(tierAt(n))}</em>`:''}</li>`;}).join('')}</ul>`:'';
 const hint=ids.length<2?'':feastPick.length<2?'함께할 장수 2~3명을 고르세요.':reason;
 return `${head}${seats}${preview}${ids.length<2?'':`<p class="feast-go"><button class="btn primary" data-feast-open ${feastPick.length<2||reason?'disabled':''}>술자리 열기</button>${hint?`<small>${esc(hint)}</small>`:''}</p>`}`;
}
function openFeast(cityId){
 const ids=[...feastPick],pairs=ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b])),before=pairs.map(([a,b])=>relation(state,a,b)),old=state;
 command({type:'FEAST',cityId,officerIds:ids});if(state===old)return;
 feastPick=[];feastDone={cityId,month:view(state).social?.month,lines:pairs.map(([a,b],i)=>{const r=relation(state,a,b);return {names:`${officerName(a)} · ${officerName(b)}`,before:before[i].value,after:r.value,tier:r.tier!==before[i].tier?`${before[i].displayName} → ${r.displayName}`:''};})};
 renderCityPanel(view(state));
}
function visitListHtml(v,c){
 const soc=v.social,ids=relationCityOfficers(state,state.cities[c.cityId]).filter(id=>id!==soc.lordId),g=RELATIONS.gains.visit.values;
 const rows=ids.map(id=>{const s=soc.officers[id],r=relation(state,soc.lordId,id);return `<li>${faceChip(id)}<div class="visit-who"><p><b>${esc(officerName(id))}</b>${tierChip(r)}</p>${affBar(r.value)}<small>군주와 ${r.value} · ${statLine(v.officers[id]??state.officers[id])}</small></div><button class="btn sm" data-visit="${esc(id)}" ${s?.visitUsed?'disabled':''}>${s?.visitUsed?'이번 달 만남':'찾아가기'}</button></li>`;}).join('');
 return `<h3>찾아가기 <small>장수마다 한 달에 한 번 · 군주와 친밀도 +${g[0]}~${g.at(-1)}</small></h3>${rows?`<ul class="visit-list">${rows}</ul>`:'<p class="muted">이 성에 찾아갈 장수가 없습니다.</p>'}`;
}
function relationSection(id){
 const soc=view(state).social,s=soc?.officers?.[id];if(!s)return '';
 const lord=s.lordAffinity===null?'':`<p class="oc-lord"><span>군주 ${esc(officerName(soc.lordId))}와</span>${tierChip(relation(state,soc.lordId,id))}${affBar(s.lordAffinity)}<b>${s.lordAffinity}</b></p>`;
 const rows=s.relations.filter(r=>r.officerId!==soc.lordId).map(r=>`<li class="${r.tier==='RIVAL'?'rival':''}">${faceChip(r.officerId)}<b>${esc(r.name)}${r.rivalEvent?`<em>${esc(r.rivalEvent)}</em>`:''}</b>${tierChip(r)}<small>${r.value}</small></li>`).join('');
 return `<h3>관계</h3>${lord}${rows?`<ul class="oc-rel">${rows}</ul>`:''}<p class="muted">함께 싸우고, 같은 성에서 일하고, 술자리·대화로 가까워진다. 신뢰 이상 = 사기 보호(3턴에 한 번)·생산 · 친우 이상 = 협공 · 결의 = 결의 세트. 숙적은 싸움만으로는 생기지 않고 특별한 일(전생의 원한 등)로 드물게 생긴다.</p>`;
}
// 저택 대화: 장수별 대사(visit-talks, 군주가 맞을 때) 또는 공통 대사. 군주와 친밀도로 장면(보통·신뢰·친우)을 고른다
function openVisit(id){
 const lord=view(state).social?.lordId,own=visitTalks?.officers?.[id],pack=own&&own.lord===lord?own:visitTalks?.generic;
 const r=relation(state,lord,id),min=t=>RELATIONS.tiers.find(x=>x.id===t).min,tier=r.value>=min('CLOSE')?'CLOSE':r.value>=min('TRUST')?'TRUST':'NORMAL';
 const talk=pack?.talks?.find(t=>t.tier===tier)??pack?.talks?.[0];
 if(!talk){command({type:'VISIT',officerId:id,choice:1});return;}
 const choices=[...talk.choices];for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 visitScene={id,pack,talk,choices,done:null,error:''};renderVisit();
}
function renderVisit(){
 const modal=$('#visit-modal');if(!modal)return;modal.hidden=!visitScene;if(!visitScene)return;
 const {id,pack,talk,choices,done,error}=visitScene,o=state.officers[id],lord=view(state).social?.lordId,r=relation(state,lord,id),fill=s=>String(s??'').replaceAll('{name}',o?.name??'');
 const art=portraits[id]?.path;modal.style.setProperty('--fc',FACTION_STYLE[o?.allegianceFactionId]?.color??'#7d7a6a');
 $('#visit-art').innerHTML=art?`<img src="${esc(art)}" alt="">`:faceFallback(o?.name,FACTION_STYLE[o?.allegianceFactionId]?.color);
 $('#visit-name').textContent=o?.name??'';
 $('#visit-rel').innerHTML=`${tierChip(r)}${affBar(r.value)}<small>군주와 ${r.value}</small>`;
 $('#visit-scene').textContent=fill(talk.scene);
 $('#visit-line').textContent=done?fill(done.reply):fill(talk.line);
 $('#visit-choices').innerHTML=error?`<p class="visit-error">${esc(error)}</p><button class="btn" data-visit-close>물러나기</button>`
  :done?`<p class="visit-gain">친밀도 +${done.after-done.before} <small>${done.before} → ${done.after}${done.tier?` · ${esc(done.tier)}`:''}</small></p>${done.bound&&pack?.bound?`<blockquote class="visit-bound">“${esc(fill(pack.bound))}”</blockquote>`:''}<button class="btn primary" data-visit-close>물러나기</button>`
  :`${choices.map((ch,i)=>`<button class="visit-choice" data-visit-choice="${i}"><b>${i+1}</b><span>${esc(fill(ch.text))}</span></button>`).join('')}<button class="btn ghost sm" data-visit-close>그냥 물러나기</button>`;
}
function pickVisit(i){
 const sc=visitScene;if(!sc||sc.done||sc.error)return;const ch=sc.choices[i];if(!ch)return;
 const lord=view(state).social?.lordId,before=relation(state,lord,sc.id),cmd={type:'VISIT',officerId:sc.id,choice:ch.gain};
 const reason=inputLocked()?'지금은 대화할 수 없습니다':socialReason(state,cmd);if(reason){sc.error=reason;renderVisit();return;}
 command(cmd);const after=relation(state,lord,sc.id);
 sc.done={reply:ch.reply,before:before.value,after:after.value,tier:after.tier!==before.tier?`${before.displayName} → ${after.displayName}`:'',bound:after.tier==='BOUND'&&before.tier!=='BOUND'};renderVisit();
}
function renderCityPanel(v) {
 const panel=$('#city-panel');
 panel.hidden=!selectedCityId;
 if(panel.hidden)return;
 const c=v.ownCities[selectedCityId]??v.knowledge.cities[selectedCityId];
 if(!c){selectedCityId=null;panel.hidden=true;return;}
 const owner=c.ownerFactionId?factionName(c.ownerFactionId):'중립';
 const header=`<header class="city-head" style="--fc:${FACTION_STYLE[c.ownerFactionId]?.color??'#7d7a6a'}"><div><p class="city-kind">${{major:'큰 성',minor:'작은 성'}[c.kind]??'성'} · ${esc(owner)}</p><h2>${esc(c.name)}</h2></div><button class="btn ghost sm" data-city-close aria-label="도시 패널 닫기">${UI_ICON('cancel')}닫기</button></header>`;
 const wanderersHtml=(list,own)=>list?.length?`<h3>재야 장수</h3><ul class="wanderers">${list.map(o=>`<li><b>${esc(o.name)}</b> <small>${statLine(o)}</small>${own?`<button class="btn sm" data-wanderer="${esc(o.officerId)}" ${inputLocked()?'disabled':''}>등용</button>`:''}</li>`).join('')}</ul>${own?'<p class="muted">등용 협의 1턴 · 인망 50</p>':'<p class="muted">이 성을 차지하면 등용할 수 있습니다.</p>'}`:'';
 if(!v.ownCities[selectedCityId]){panel.innerHTML=header+`<p>${c.ownerFactionId?esc(factionName(c.ownerFactionId)):'중립 · 소유 세력 없음'}</p><p class="muted">관측한 도시 위치 · 내부 자원과 작업은 미상</p>${wanderersHtml(c.wanderers,false)}`;return;}
 const rates=cityEconomyRates(state,state.cities[selectedCityId]),status=cityOccupationStatus(state,state.cities[selectedCityId]);
 const occupation=occupationDisplay(state,state.cities[selectedCityId]);
 const gov=c.governorId?v.officers[c.governorId]:null,govFace=gov?portraits[gov.officerId]?.path:null;
 const yieldsHtml=`<div class="city-yields"><span class="cy-gov">${govFace?`<img src="${esc(govFace)}" alt="">`:gov?faceFallback(gov.name):'<i>空</i>'}<small>태수</small><b>${esc(gov?.name??'공석')}</b></span>${[['food','식량',rates.food],['build','생산',rates.production],['science','과학',rates.science],['politics','인망',rates.prestige]].map(([ic,n,x])=>`<span class="cy">${UI_ICON(ic)}<small>${n}</small><b>+${cityNumber(x)}</b></span>`).join('')}</div>`;
 const occupationOptions=['CAPTURED','OCCUPATION'].includes(occupation.stage)?`<div class="occ-box"><h3>점령 처리 방식</h3><div class="options">${Object.entries(OCCUPATION_METHODS).map(([method,label])=>{const reason=occupationMethodReason(state,state.cities[selectedCityId],method);return `<button class="option" data-occupation-method="${method}" ${reason||inputLocked()?'disabled':''}><b>${label}</b><small>${esc(reason??{conciliation:'주민 유지식량 · 1턴',military:'현역 50% 주둔 · 2턴',plunder:'재고 30% · 인망 −20 · 시설 손상 → 군정'}[method])}</small></button>`;}).join('')}</div></div>`:'';
 const governors=[...Object.values(v.officers).filter(o=>o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.travelState==='STATIONARY'&&o.locationRef.kind==='NONE'),...(c.freeOfficers??[]).map(o=>v.officers[o.officerId]??o)].filter((o,i,a)=>a.findIndex(x=>x.officerId===o.officerId)===i);
 const musterOfficers=[...(c.freeOfficers??[]),...(c.governorId&&!Object.values(v.ownArmies).some(a=>a.commanderId===c.governorId)&&v.officers[c.governorId]?[v.officers[c.governorId]]:[])];
 const governorSelection=occupation.stage==='NORMAL'&&governors.length?`<label>태수 후보 <select id="city-governor">${governors.map(o=>`<option value="${esc(o.officerId)}">${esc(o.name)}</option>`).join('')}</select></label><button class="btn sm" data-governor-appoint ${inputLocked()?'disabled':''}>태수 임명</button>`:'';
 const governor=v.officers[c.governorId],portrait=portraits[c.governorId]?.path;
 const armies=Object.values(v.ownArmies).filter(a=>{
  const [q,r]=a.tileId.split(',').map(Number),[cq,cr]=c.tileId.split(',').map(Number);
  return Math.max(Math.abs(q-cq),Math.abs(r-cr),Math.abs(q+r-cq-cr))<=2&&a.troopCount>0;
 });
 const jobList=c.jobs?c.jobs.filter(j=>j.blockedReason!=='UNIQUE_FACILITY_LOCKED').map(j=>[j.kind,{...CITY_JOBS[j.kind],name:j.name,cost:j.cost,description:j.description??CITY_JOBS[j.kind]?.description??JOB_FX[j.kind]},j.blockedReason]):Object.entries(CITY_JOBS);
 const optionList=jobList.map(([kind,job,reason])=>{
  const progress=kind==='reorganize'&&c.currentProduction?.kind===kind?c.productionProgress:c.jobProgress?.[kind]??0;
  const gain=(c.production||rates.production)*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1);
  const remaining=Math.max(1,Math.ceil((job.cost-progress)/gain));
  const blocked=!!reason&&reason!=='MUSTER_RESERVE_200_REQUIRED'||kind==='farm'&&c.facilities.filter(f=>f.kind==='farm').length>=2;
  if(kind==='muster'&&!('freeOfficers' in c))return '';
  return `<button class="option" data-city-job="${kind}" aria-pressed="${c.currentProduction?.kind===kind}" ${inputLocked()||blocked||kind==='reorganize'&&!armies.length||kind==='muster'&&(!musterOfficers.length||c.reserveTroops<200)?'disabled':''}>${UI_ICON(JOB_ICON[kind]??'build')}<b>${job.name}</b>${job.description?`<em class="job-fx">${esc(job.description)}</em>`:''}<small>${reason&&blocked?esc(reasonText(reason)):`생산 ${job.cost} · ${cityNumber(progress)}/${job.cost} · ${status==='NORMAL'?remaining+'턴 남음':'중단'}`}</small><span class="job-track"><i style="width:${Math.min(100,progress/job.cost*100)}%"></i></span></button>`;
 });
 const MIL_JOBS=new Set(['muster','recruit','reorganize']),options=optionList.filter((_,k)=>!MIL_JOBS.has(jobList[k][0])).join(''),milOptions=optionList.filter((_,k)=>MIL_JOBS.has(jobList[k][0])).join('');
 const cause=x=>`<div class="cause"><span>${esc(x.label)}</span><span class="v ${x.amount>=0?'up':'down'}">${x.amount>0?'+':x.amount<0?'−':''}${cityNumber(Math.abs(x.amount))}</span></div>`;
 const RES_NAME={food:'식량',production:'생산',science:'과학',prestige:'인망'};
 const causes=Object.entries(RES_NAME).map(([r,n])=>{const list=(c.economyCauses??[]).filter(x=>x.resource===r&&(r==='food'||x.amount));return list.length?`<p class="cause-head">${n}</p>${list.map(cause).join('')}`:'';}).join('');
 const tab=({overview:'office',jobs:'office',people:'residence'})[cityTab]??cityTab??'office',pane=(id,html)=>`<section class="city-pane" data-pane="${id}" ${tab===id?'':'hidden'}>${html}</section>`;
 const stat=(icon,label,value)=>`<span class="city-stat">${UI_ICON(icon)}<small>${label}</small><b>${value}</b></span>`;
 const stats=`<div class="city-stats">${stat('people','인구',`${c.population}${c.populationCapacity?`<i>/${c.populationCapacity}</i>`:''}`)}${stat('reserve','예비병',c.reserveTroops)}${stat('wounded','부상병',c.woundedTroops)}${stat('security','치안',citySecurity(c))}</div>`;
 const tabs=`<nav class="city-tabs" role="tablist">${[['office','관청'],['barracks','병영'],['tavern','주점'],['residence','저택']].map(([id,n])=>`<button role="tab" data-city-tab="${id}" aria-selected="${tab===id}">${n}</button>`).join('')}</nav>`;
 const working=c.currentProduction?.kind?CITY_JOBS[c.currentProduction.kind]?.name:null;
 panel.innerHTML=header+yieldsHtml+stats+tabs+pane('office',`<p class="city-working">${working?`진행 중 · <b>${esc(working)}</b>`:'진행 중인 작업 없음'} <small>한 번에 1개 · 작업별 진행도 보존${c.jobBlocked?' · '+esc(c.jobBlocked):''}</small></p><div class="options">${options}</div>
 ${(c.domesticCommands??[]).length?`<h3>내정 특기 명령</h3><div class="options domestic-cmds">${c.domesticCommands.map((d,i)=>`<button class="option" data-domestic="${i}" ${d.blockedReason?'disabled':''}><b>${esc(d.label)}</b>${DOMESTIC_CMD_FX[d.type]?`<em class="job-fx">${DOMESTIC_CMD_FX[d.type]}</em>`:''}<small>${Number.isFinite(d.cost)?`${d.resource==='science'?'과학':'인망'} ${cityNumber(d.cost)}`:''}${d.blockedReason?` · ${esc(d.blockedReason)}`:''}</small></button>`).join('')}</div>`:''}
 <h3 class="city-sec">성 형편</h3><ol class="steps"><li class="${status==='NORMAL'?'done':'now'}">${{NORMAL:'정상',CAPTURED:'함락',OCCUPATION:'점령 처리',STABILIZING:'안정화'}[occupation.stage]}${occupation.turnsLeft?' '+occupation.turnsLeft+'턴':''}</li><li>10일 정산</li></ol>${occupationOptions}
 <p>치안 ${citySecurity(c)} · ${esc((c.securityCauses??[]).join(' · ')||'악화 원인 없음')}</p><h3>식량 ${cityNumber(c.foodStock)} / ${cityNumber(c.foodCapacity)}</h3>
 <div class="meter"><span>재고</span><span class="track"><i style="width:${Math.min(100,c.foodStock/c.foodCapacity*100)}%"></i></span><span>${cityNumber(c.foodStock)}</span></div>
 ${c.foodWarehouse?`<p class="muted">세력 공동 창고 ${cityNumber(c.foodWarehouse.stock)} / ${cityNumber(c.foodWarehouse.capacity)}</p>`:''}
 <p class="muted">이번 정산 증감 원인</p>${causes||'<p>첫 정산 전입니다.</p>'}
 ${c.specialists?`<h3>전문인력</h3><div class="city-specialists">${SPECIALISTS.map(([k,n,icon,fx])=>`<span class="spec${c.nextSpecialist===k?' next':''}" title="${esc(fx)}">${UI_ICON(icon)}<small>${n}</small><b>${c.specialists[k]??0}</b><em>${esc(fx)}</em></span>`).join('')}</div><p class="muted">3턴마다 1명 · 다음 ${esc(SPECIALISTS.find(x=>x[0]===c.nextSpecialist)?.[1]??'')} ${c.specialistTurnsLeft}턴 뒤 · 태수의 정무 하위 능력(행정·인사→관료, 병참→병참, 제도→학자, 민정→기술자)</p>`:''}
 <h3>지은 시설</h3><ul class="city-facilities">${c.facilities.map(f=>`<li>${UI_ICON(JOB_ICON[f.kind]??'build')}${CITY_JOBS[f.kind].name} · ${esc(f.tileId)}${f.disabled?' · 효과 정지':''}</li>`).join('')||'<li>없음</li>'}</ul>`)
 +pane('barracks',`<p class="city-working">${working?`진행 중 · <b>${esc(working)}</b>`:'진행 중인 작업 없음'} <small>한 번에 1개 · 작업별 진행도 보존${c.jobBlocked?' · '+esc(c.jobBlocked):''}</small></p><div class="options">${milOptions||'<p class="muted">이 성에서 할 수 있는 군사 일이 없습니다.</p>'}</div>
 ${musterOfficers.length?`<div class="muster-target"><label>출진 장수 <select id="city-job-officer">${musterOfficers.map(o=>{const tag=musterTag(v.officers[o.officerId]);return `<option value="${esc(o.officerId)}" ${tag?'disabled':''}>${esc(o.name)}${o.officerId===c.governorId?' (태수)':''}${tag}</option>`;}).join('')}</select></label><label>병종 <select id="city-job-muster-troop"></select></label>${c.reserveTroops<200?'<small class="warn">예비병 200 이상 필요</small>':''}<small id="muster-troop-info" class="muster-info"></small></div>`:('freeOfficers' in c?'<p class="muted">출진할 장수가 없습니다(부대를 맡지 않은 장수가 이 성에 있어야 함).</p>':'')}
 ${armies.length?`<div class="reorganize-target"><label>재편 부대 <select id="city-job-army">${armies.map(a=>`<option value="${esc(a.armyId)}">${esc(v.officers[a.commanderId]?.name??a.armyId)}</option>`).join('')}</select></label><label>병종 <select id="city-job-troop"></select></label></div>`:''}`)
 +pane('tavern',`<p class="place-lede">떠돌이 인재와 소문이 모이는 곳. 마음 맞는 장수들과 술자리를 열 수도 있다.</p>${feastHtml(v,c)}<h3>떠돌이 인재</h3>${wanderersHtml(c.wanderers,true)||'<p class="muted">이 성에 재야 장수가 없습니다.</p>'}`)
 +pane('residence',`<p class="place-lede">장수들이 머무는 곳. 찾아가 이야기를 나눌 수 있다.</p><div class="city-governor">${portrait?`<img src="${esc(portrait)}" alt="${esc(governor?.name??'태수')} 초상">`:`<span class="governor-placeholder">${governor?faceFallback(governor.name,FACTION_STYLE[c.ownerFactionId]?.color):'空'}</span>`}<div><small>태수</small><b>${esc(governor?.name??'공석')}</b><br>정무 ${governor?.baseStats.politics??'—'} · 산출 +${cityNumber(rates.bonus*100)}%</div></div>
 <div class="governor-pick">${governorSelection}</div>${c.starAction?starButton(c.starAction,`data-city-star="${esc(c.cityId)}"`):''}${v.social?visitListHtml(v,c):(c.freeOfficers??[]).length?`<h3>성의 자유 장수</h3><ul class="wanderers">${c.freeOfficers.map(o=>`<li><b>${esc(o.name)}</b> <small>${statLine(v.officers[o.officerId]??o)}</small></li>`).join('')}</ul>`:''}`);
 refreshCityTroops(v);refreshMusterTroops(v);
}
function refreshMusterTroops(v=view(state)){
 const id=$('#city-job-officer')?.value,select=$('#city-job-muster-troop');if(!select||!id)return;
 const c=v.ownCities[selectedCityId],o=v.officers[id]??c?.freeOfficers?.find(x=>x.officerId===id);
 const apt=state.campaignGrowth?.officers[id]?.pack?.troopAptitude??{},rank={HIGH:0,MEDIUM:1,LOW:2},bt={militia:'BT01',spear:'BT02',bow:'BT03',cavalry:'BT04'};
 // C24: view 의 musterOptions(특수 병종·투석기, 막힘 이유·효과·대가)가 있으면 그것으로
 const opts=c?.musterOptions?.find(m=>m.officerId===id)?.troops;
 if(opts){const pb={BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry'};
  select.innerHTML=opts.filter(t=>!SPECIAL_TROOPS[t.troopType]?.factionId||SPECIAL_TROOPS[t.troopType].factionId===state.playerFactionId).map(t=>{const base=TROOP_LABEL[t.troopType],a=apt[t.parentBaseTroopId];return `<option value="${esc(t.troopType)}" ${t.blockedReason?'disabled':''}>${esc(base??t.troopDisplayName)}${base?'':' ★'}${a==='HIGH'?' · 적성 높음':''}${t.blockedReason?' — '+esc(reasonText(t.blockedReason)):''}</option>`;}).join('');
  const info=$('#muster-troop-info');const show=()=>{const t=opts.find(x=>x.troopType===select.value);if(info)info.textContent=t?.effectLine?`${t.effectLine}${t.costLine?' · 대가 '+t.costLine:''}`:'';};select.onchange=show;show();return;}
 select.innerHTML=[...(o?.allowedTroops??[])].sort((a,b)=>(rank[apt[bt[a]]]??1)-(rank[apt[bt[b]]]??1)).map(t=>`<option value="${t}">${TROOP_LABEL[t]??t}${apt[bt[t]]==='HIGH'?' · 적성 높음':''}</option>`).join('');
}
function refreshCityTroops(v=view(state)) {
 const army=v.ownArmies[$('#city-job-army')?.value],select=$('#city-job-troop');
 if(!select||!army)return;
 const troopName={militia:'보병',spear:'창병',bow:'궁병',cavalry:'기병',engineer:'공병',mystic:'술법'};
 select.innerHTML=v.officers[army.commanderId].allowedTroops.map(type=>`<option value="${type}" ${type===army.troopType?'selected':''}>${troopName[type]??type}</option>`).join('');
}
$('#city-panel').addEventListener('change',e=>{if(e.target.id==='city-job-army')refreshCityTroops();if(e.target.id==='city-job-officer')refreshMusterTroops();});
$('#city-panel').addEventListener('click',e=>{
 if(e.target.closest('[data-city-close]')){selectedCityId=null;$('#city-panel').hidden=true;return;}
 const starCity=e.target.closest('[data-city-star]')?.dataset.cityStar;
 if(starCity&&!inputLocked()){command({type:'STAR_ACTION',cityId:starCity});return;}
 const tabId=e.target.closest('[data-city-tab]')?.dataset.cityTab;
 if(tabId){cityTab=tabId;renderCityPanel(view(state));return;}
 const wanderer=e.target.closest('[data-wanderer]')?.dataset.wanderer;
 if(wanderer&&!inputLocked()){command({type:'WANDERER_RECRUIT',officerId:wanderer,cityId:selectedCityId});return;}
 const pick=e.target.closest('[data-feast-pick]')?.dataset.feastPick;
 if(pick){feastPick=feastPick.includes(pick)?feastPick.filter(x=>x!==pick):[...feastPick,pick].slice(0,3);renderCityPanel(view(state));return;}
 if(e.target.closest('[data-feast-open]')&&!inputLocked()){openFeast(selectedCityId);return;}
 const visitId=e.target.closest('[data-visit]')?.dataset.visit;
 if(visitId&&!inputLocked()){openVisit(visitId);return;}
 if(e.target.closest('[data-governor-appoint]')&&!inputLocked()){command({type:'CITY_GOVERNOR',cityId:selectedCityId,officerId:$('#city-governor').value});return;}
 const di=e.target.closest('[data-domestic]')?.dataset.domestic;
 if(di!==undefined&&!inputLocked()){const d=view(state).ownCities[selectedCityId]?.domesticCommands?.[Number(di)];if(d)command({type:d.type,cityId:d.cityId,...(d.resource?{resource:d.resource}:{}),...(d.officerId?{officerId:d.officerId}:{})});return;}
 const method=e.target.closest('[data-occupation-method]')?.dataset.occupationMethod;
 if(method&&!inputLocked()){command({type:'OCCUPATION_METHOD',cityId:selectedCityId,method});return;}
 const kind=e.target.closest('[data-city-job]')?.dataset.cityJob;
 if(kind&&!inputLocked())command({type:'CITY_JOB',cityId:selectedCityId,kind,
  ...(kind==='reorganize'?{armyId:$('#city-job-army')?.value,troopType:$('#city-job-troop')?.value}:kind==='muster'?{officerId:$('#city-job-officer')?.value,troopType:$('#city-job-muster-troop')?.value}:{})});
});
function refreshContinue() {
  attempt(()=>settle(savedState(),saved=>{$('#continue').disabled = !saved;}),
    ()=>{$('#continue').disabled = true; $('#status').textContent = '저장을 읽을 수 없습니다. 기존 저장은 보존했습니다.';});
}
function resume() {
  attempt(()=>settle(savedState(),applySaved),error=>{$('#status').textContent = error.message;});
}
function applySaved(saved) {
  try {
    if (!saved) throw new Error('캠페인 저장이 없습니다.');
    state = saved;selectedArmyIds=[];scheduleOrders(); attackMode=false; selectedArmyId=null;menuOpen=false;moveMode=false;destination=null;zoom=START_ZOOM;render();centerPlayer(); scheduleAi(); $('#status').textContent = '저장된 캠페인을 이어합니다.';
  } catch (error) {$('#status').textContent = error.message;}
}
// 새 판의 시드: 주소의 ?seed= 가 있으면 그것(재현용), 브라우저에서는 매번 새로(판마다 포텐·Draft가 달라지게 — 완료 기준 3),
// 브라우저가 아닌 시험 환경은 기존 고정값
function newCampaignSeed(){
 const fixed=Number(new URLSearchParams(globalThis.location?.search??'').get('seed'));
 if(Number.isSafeInteger(fixed)&&fixed>0)return fixed;
 if(typeof window!=='undefined'&&globalThis.crypto?.getRandomValues)return 1+globalThis.crypto.getRandomValues(new Uint32Array(1))[0]%2147483646;
 return 190919;
}
for (const button of document.querySelectorAll('button[data-faction]')) {
  button.disabled = false;
  button.addEventListener('click', () => {
    clearTimeout(aiTimer);clearTimeout(orderTimer);selectedArmyIds=[];attackMode=false;state = createCampaign({factionId:button.dataset.faction,seed:newCampaignSeed()});
    selectedArmyId=null;menuOpen=false;moveMode=false;unlockAudio();zoom=START_ZOOM;render();centerPlayer(); $('#status').textContent = '부대를 선택해 이동 명령을 내리세요.';
  });
}
$('#end-turn').addEventListener('click', e => {const b=$('#end-turn').dataset.blocker;if(b&&!e?.shiftKey){openCity(b,'jobs');$('#status').textContent='생산할 작업을 고르세요 · Shift+클릭이나 Shift+Enter 로 그냥 넘기기';return;}command({type:'END_TURN'});});
$('#save').addEventListener('click', () => {
  $('#status').textContent = '저장 중…';
  attempt(()=>settle(saveText(CAMPAIGN_SAVE_KEY,serialize(state)),r=>{refreshContinue();$('#status').textContent = `단일 슬롯에 저장했습니다.${r?.bytes?` (${Math.max(1,Math.round(r.bytes/1024)).toLocaleString('ko-KR')}KB)`:''}`;}),
    ()=>{$('#status').textContent = '저장하지 못했습니다.';});
});
$('#continue').addEventListener('click',resume);
globalThis.addEventListener('storage',event => {if (event.key === CAMPAIGN_SAVE_KEY || event.key === saveMarkerKey(CAMPAIGN_SAVE_KEY) || event.key === null) refreshContinue();});
$('#status').textContent = '세력을 선택하세요.';
refreshAudio();
refreshContinue();

export function unitMenuPlacement(rect,scroll,viewport,anchor,menuHeight,targets=[]){
 const left=Math.max(8,rect.left,scroll.left),top=Math.max(8,rect.top,scroll.top),right=Math.min(viewport.width-8,rect.right,scroll.right),bottom=Math.min(viewport.height-8,rect.bottom,scroll.bottom);
 const width=Math.max(0,Math.min(280,right-left)),height=Math.max(0,bottom-top);if(width<120||height<90)return null;
 const h=Math.min(menuHeight,height),clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const unit=anchor.bounds??{left:anchor.clientX-55,right:anchor.clientX+55,top:anchor.clientY-55,bottom:anchor.clientY+90};
 const obstacles=[unit,...targets],gap=12;
 const sideY=clamp(anchor.clientY-h/2,top,bottom-h);
 const candidates=[{x:unit.right+gap,y:sideY},{x:unit.left-gap-width,y:sideY},
   {x:clamp(anchor.clientX-width/2,left,right-width),y:unit.bottom+gap},
   {x:clamp(anchor.clientX-width/2,left,right-width),y:unit.top-gap-h}];
 for(const c of candidates){
   if(c.x<left||c.x+width>right||c.y<top||c.y+h>bottom)continue;
   if(obstacles.every(t=>c.x+width<=t.left||c.x>=t.right||c.y+h<=t.top||c.y>=t.bottom))return {width,maxHeight:height,left:c.x,top:c.y};
 }
 return null;
}
function positionUnitMenu(){
 const menu=$('#unit-menu'),svg=$('#map svg'),id=selectedArmyId;
 if(!menuOpen||!svg?.getScreenCTM||!menu.getBoundingClientRect)return;
 const node=svg.querySelector(`[data-unit="${id}"]`);if(!node?.getScreenCTM())return;
 const point=svg.createSVGPoint(),anchor=point.matrixTransform(node.getScreenCTM());
 const bounds=node.getBoundingClientRect();
 const obstacles=[...attackTargets(state,id).map(target=>svg.querySelector(`[data-unit="${target}"]`)?.getBoundingClientRect()).filter(Boolean),
   ...[...svg.querySelectorAll('.mr-unit .plate')].filter(n=>n.closest('[data-unit]')?.dataset.unit!==id).map(n=>n.getBoundingClientRect()), // 자기 이름표는 붙어 있어도 된다
   ...[...svg.querySelectorAll('.mr-attack')].map(n=>n.getBoundingClientRect())]; // 공격할 수 있는 성 칸도 가리지 않게
 const placement=unitMenuPlacement(svg.getBoundingClientRect(),$('#game').getBoundingClientRect(),{width:innerWidth,height:innerHeight},{clientX:anchor.x,clientY:anchor.y,bounds},menu.offsetHeight,obstacles);
 menu.hidden=!placement;if(placement)for(const [key,value]of Object.entries(placement))menu.style[key]=value+'px';
}
function closeUnitMenu(){selectedTacticId=null;attackMode=false;menuOpen=false;moveMode=false;faceMode=false;destination=null;selectedArmyId=null;selectedArmyIds=[];if(state)render();}
// 부대 명령 카드 머리(레퍼런스: 삼국지14 초상 부대 · 문명6 선택 패널 · 워해머3 부대 카드) — 초상·병종·병력·사기·전열
// C21 전문인력(사용자 2026-10-04 승인 단순안): 종류·이름·아이콘·1명당 효과
const SPECIALISTS=[['artisan','기술자','build','생산 +1'],['official','관료','politics','산출 +5% · 점령 단계 −1'],['scholar','학자','science','과학 +1'],['logistician','병참','food','군량 +1']];
const JOB_ICON={muster:'troops',workshop:'build',recruit:'recruit',reorganize:'class',farm:'food',granary:'food',repair:'security',market:'gold',barracks:'troops',tuntian:'food',clinic:'wounded',mufu:'command'};
// 초상이 아직 없는 장수: 투구 쓴 반신 실루엣 + 이름 첫 글자 인장(문명·올드 월드의 빈 초상 자리처럼) — 초상 그림은 GPT 담당
const BUST=['M32 2c2 0 3 2 2 5l-1 3c7 1 11 6 12 14l2 3-1 6h-4c-1 7-5 12-10 12s-9-5-10-12h-4l-1-6 2-3c1-8 5-13 12-14l-1-3c-1-3 0-5 2-5z','M26 43v5c-10 1-17 6-19 16h50c-2-10-9-15-19-16v-5c-2 2-4 3-6 3s-4-1-6-3z'];
const faceFallback=(name,color)=>`<span class="face-fb"${color?` style="--fc:${color}"`:''}><svg viewBox="6 0 52 64" aria-hidden="true">${BUST.map(d=>`<path d="${d}"/>`).join('')}</svg><i>${esc(String(name??'').slice(0,1))}</i></span>`;
// 공격 예측 카드(파이어 엠블렘 예측 창·문명6 전투 예측·올드 월드) — 양측 병력 전→후, 결과 단계, 방향, 보정, 판정 확률
const SIDE_NAME={FRONT:'정면',FLANK:'측면',REAR:'후방'};
function fcCol(name,face,before,after,cls){const lost=Math.max(0,before-after),w=v=>Math.max(0,Math.min(100,v/Math.max(1,before)*100)).toFixed(1);return `<div class="fc-col ${cls}"><div class="fc-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(name)}</div><b>${esc(name)}</b><div class="fc-bar"><i style="width:${w(after)}%"></i><s style="width:${w(lost)}%"></s></div><small>${before} → <em>${after}</em> <span>−${lost}</span></small></div>`;}
function fcResult(ef,af,destroyed){return destroyed?['격파','win']:ef-af>0.15?['대승','win']:ef-af>0.05?['우세','good']:ef-af>-0.05?['접전','even']:['불리','bad'];}
function forecastHtml(attId,tgtId,p,title=''){
 const A=state.armies[attId],T=state.armies[tgtId],an=state.officers[A?.commanderId]?.name??'',tn=state.officers[T?.commanderId]?.name??'적';
 // 적 병력은 공격자에게 보이는 값(가짜 깃발이면 2배 — 정본 20 v3.5)으로 보여 준다
 const aT=A?.troopCount??0,tT=p.shownTargetCount??T?.troopCount??0,aAfter=Math.max(0,aT-(p.allyLoss??0)),tAfter=p.shownTargetAfter??Math.max(0,tT-(p.enemyLoss??0));
 const [res,cls]=fcResult((p.enemyLoss??0)/Math.max(1,tT),(p.allyLoss??0)/Math.max(1,aT),tAfter<=0);
 const m=p.multipliers??{},mods=[...(p.effectLines??[])];
 if(m.terrain&&m.terrain!==1)mods.push(`${state.tiles[T.tileId].terrainType==='forest'?'숲':'언덕'} 방어 ×${m.terrain}`);if(m.castle&&m.castle!==1)mods.push(`성 방어 ×${m.castle}`);if(m.matchup&&m.matchup!==1)mods.push(`상성 ×${m.matchup}`);if(m.river&&m.river!==1)mods.push('도하 ×0.75');if(m.flank&&m.flank!==1)mods.push(`협공 +${Math.round((m.flank-1)*100)}%`);
 const risks=[p.formationRisk?.check?`적 전열 판정 — 버틸 확률 ${Math.round(p.formationRisk.successProbability*100)}%`:null,p.moraleRisk?.check?`적 사기 판정 — 버틸 확률 ${Math.round(p.moraleRisk.successProbability*100)}%`:null].filter(Boolean);
 return `<div class="fc-top">${title?`<span class="fc-title">${esc(title)}</span>`:''}<span class="fc-res" data-res="${cls}">${res}</span>${SIDE_NAME[p.side]?`<span class="fc-dir" data-side="${esc(p.side)}">${SIDE_NAME[p.side]} 공격</span>`:''}${p.counter===false?'<span class="fc-tag">반격 없음</span>':''}</div><p class="fc-sum">아군 −${p.allyLoss??0} / 적 −${p.enemyLoss??0}</p><div class="fc-vs">${fcCol(an,portraits[A?.commanderId]?.path,aT,aAfter,'ally')}<b class="fc-x">VS</b>${fcCol(tn,portraits[T?.commanderId]?.path,tT,tAfter,'enemy')}</div>${mods.length?`<ul class="fc-mods">${mods.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${risks.map(x=>`<p class="fc-risk">${esc(x)}</p>`).join('')}`;
}
function cityLabel(id){return document.querySelector?.(`#map .mr-city-banner[data-city="${id}"] .name`)?.textContent??id;}
function setTip(tip,html,text){tip.classList?.add('forecast');tip.innerHTML=html;if(!('firstElementChild' in tip))tip.textContent=text;}
function placeTip(tip,e,w=320){const gap=70,right=e.clientX+gap,left=right+w+8>innerWidth?Math.max(8,e.clientX-gap-w):right; // 대상 칸(방향 색)을 가리지 않게 옆으로
 tip.style.top=Math.min(innerHeight-260,Math.max(8,e.clientY-60))+'px';tip.style.left=left+'px';}
// 성 생산 상태(지도 이름표·턴 종료 안내용)
function cityProductionBadge(c){
 const sc=state.cities[c.cityId];if(!sc||!c.jobs)return null;
 const stage=state.occupations?.[c.cityId]?.stage;if(stage&&stage!=='NORMAL')return null;
 if(!c.currentProduction)return {idle:true};
 const kind=c.currentProduction.kind,job=c.jobs.find(j=>j.kind===kind)??{},rates=cityEconomyRates(state,sc);
 const progress=kind==='reorganize'?c.productionProgress??0:c.jobProgress?.[kind]??0,gain=(c.production||rates.production)*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1);
 return {name:job.name??CITY_JOBS[kind]?.name??kind,turns:Math.max(1,Math.ceil(((job.cost??CITY_JOBS[kind]?.cost??0)-progress)/Math.max(0.01,gain)))};
}
function idleCities(v){return state.phase==='PLAYER'&&!state.gameResult?Object.values(v.ownCities).filter(c=>cityProductionBadge(c)?.idle):[];}
function closeProdPop(){const p=document.querySelector?.('#prod-pop');if(p)p.hidden=true;}
function openProdPop(cityId,e){
 const v=view(state),c=v.ownCities[cityId];if(!c?.jobs||!document.createElement)return false;
 let pop=document.querySelector('#prod-pop');if(!pop){pop=document.createElement('div');pop.id='prod-pop';pop.className='panel lacquer prod-pop';document.body.appendChild(pop);
  pop.addEventListener('click',ev=>{const k=ev.target.closest('[data-quick-job]')?.dataset.quickJob,more=ev.target.closest('[data-quick-more]');const id=pop.dataset.city;
   if(more){closeProdPop();openCity(id,'jobs');return;}if(k&&!inputLocked()){closeProdPop();command({type:'CITY_JOB',cityId:id,kind:k});const next=idleCities(view(state))[0];if(next&&next.cityId!==id)$('#status').textContent=`생산 선택 — 다음 성: ${next.name} (턴 종료 버튼으로 이동)`;}});}
 const sc=state.cities[cityId],rates=cityEconomyRates(state,sc);
 const items=c.jobs.filter(j=>!j.blockedReason&&!['muster','reorganize','repair'].includes(j.kind)).map(j=>{const progress=c.jobProgress?.[j.kind]??0,gain=(c.production||rates.production)*(j.kind==='recruit'?1+rates.workBonus:1),turns=Math.max(1,Math.ceil((j.cost-progress)/Math.max(0.01,gain)));return `<button data-quick-job="${esc(j.kind)}">${UI_ICON(JOB_ICON[j.kind]??'build')}<b>${esc(j.name)}</b><em>${esc(j.description??JOB_FX[j.kind]??'')}</em><small>${turns}턴</small></button>`;}).join('');
 pop.dataset.city=cityId;pop.innerHTML=`<header><b>${esc(c.name)}</b> 생산 선택</header><div class="pp-list">${items||'<p class="muted">지금 바로 고를 작업이 없습니다.</p>'}</div><button class="pp-more" data-quick-more>출진·재편·자세히 — 성 창</button>`;
 pop.hidden=false;const r=pop.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(innerWidth-r.width-8,e.clientX-r.width/2))+'px';pop.style.top=Math.max(8,Math.min(innerHeight-r.height-8,e.clientY+14))+'px';return true;
}
function openCity(cityId,tab='jobs'){selectedCityId=cityId;cityTab=tab;closeUnitMenu();renderCityPanel(view(state));const n=$('#map').querySelector?.(`[data-city="${cityId}"]`);n?.scrollIntoView?.({block:'center',inline:'center',behavior:'smooth'});}
// 부대 행동 단축키(W·A·S·D 는 지도 이동이라 피함)
const JOB_FX={farm:'식량 +2 (도시당 2개까지)',granary:'식량 창고 +80',market:'인망 +1',barracks:'모집·재편 진행 +10%',workshop:'생산 +1 (도시당 2개까지)',recruit:'예비병 +500 (동원 한도 안)',muster:'장수 + 예비병 200 → 새 부대',repair:'손상된 시설 수리',reorganize:'부대 병종 바꾸기'};
// 명령형 내정 특기: 누르기 전에 효과와 대가를 보여 준다(common-pool v0.3 문장)
const DOMESTIC_CMD_FX={CITY_TAX_ADVANCE:'다음 3턴 생산을 지금 받음 · 대가: 그 3턴 생산 0, 치안 한 단계 악화'};
const ACTION_KEYS={move:'Q',attack:'E',face:'F',brace:'B',regroup:'R',garrison:'G',wait:'Z'};
// 위험 지역(파이어 엠블렘 위험 지대·토탈워 영향권): 보이는 적이 다음 턴에 들어오거나 칠 수 있는 칸
function dangerTiles(v){
 if(dangerCache?.state===state)return dangerCache.tiles;
 const tiles=new Set(),near=id=>{const [q,r]=id.split(',').map(Number);return [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([a,b])=>`${q+a},${r+b}`).filter(t=>state.tiles[t]);};
 for(const a of Object.values(v.knowledge?.observedArmies??{})){if(v.knowledge.tiles[a.tileId]!=='VISIBLE'||a.factionId===state.playerFactionId)continue;let reach=[a.tileId];try{reach=[a.tileId,...[...campaignReachable(state,a.armyId,TICKS_PER_TURN)].map(([t])=>t)];}catch{}for(const t of reach){tiles.add(t);for(const n of near(t))tiles.add(n);}}
 dangerCache={state,tiles:[...tiles]};return dangerCache.tiles;
}
// 다음 부대 자동 선택(문명 '다음 유닛'): 방금 행동한 부대가 끝났으면 아직 움직일 부대를 고른다
function autoNextUnit(){if(lastActedArmy)setTimeout(autoNextUnitNow,60);}
function autoNextUnitNow(){
 const prev=lastActedArmy;lastActedArmy=null;
 if(!prev||!state||state.phase!=='PLAYER'||state.gameResult||combatAnimating||selectedArmyId||document.querySelector?.('.modal-backdrop:not([hidden])'))return;
 if(state.armies[prev]&&!armyActionEnded(state,prev))return;
 const ids=Object.values(view(state).ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)&&!state.moveOrders?.[id]).sort();if(!ids.length)return;
 const next=ids[0];selectedArmyId=next;selectedArmyIds=[next];menuOpen=true;moveMode=true;destination=null;render();follow(next,true);positionUnitMenu();setTimeout(positionUnitMenu,120);
 $('#status').textContent=`다음 부대 — ${state.officers[state.armies[next].commanderId]?.name??''} (Space 다음 · Esc 놓기)`;
}
const UI_ICON=name=>`<svg class="ic" aria-hidden="true"><use href="/app/design/sg-icons.svg#i-${name}"/></svg>`;
const MORALE_NAME={STEADY:'사기 안정',SHAKEN:'동요',ROUTING:'패주'},UNIT_TROOP_NAME={BT01:'도검병',BT02:'창병',BT03:'궁병',BT04:'기병'},UNIT_TROOP_NAME_SET=new Set(['도검병','창병','궁병','기병','보병']);
// 손권 P1 '별의 길': 가장 높은 큰 능력에 따른 행동 1개(부대장 대기 2턴·태수 3턴)
function starButton(a,attr){const wait=a.readyTurn>state.turn?a.readyTurn-state.turn:0;return `<button class="star-action" ${attr} ${a.canUse?'':'disabled'} title="${esc(a.description)}">${UI_ICON('potential')}별의 길 · ${esc(a.name)} <small>${esc(a.axis)} · ${a.canUse?esc(a.description):wait?`대기 ${wait}턴`:esc(reasonText(a.blockedReason))}</small></button>`;}
// 장수 가용성(C46) — 피로(재출진 제한만, 출진 중 효과 없음)·중상(요양)
function availabilityLine(o){
 if(!o)return '';const f=o.fatigue,inj=o.injury,parts=[];
 if(inj)parts.push(`<span class="av-inj" title="중상 — 요양이 끝나면 복귀(군주와 친밀도 +5·경험치 +10)">중상 · ${Number.isFinite(inj.turnsLeft)?`${inj.turnsLeft}차례 요양`:'요양 중'}</span>`);
 if(f&&Number.isFinite(f.value))parts.push(`<span class="av-fat${f.musterBlocked?' blocked':''}" title="성 밖에서 보낸 차례·교전으로 오르고 성에서 쉬면 내림. 60 이상이면 다시 출진 못 함 — 이미 나가 있는 부대에는 효과 없음"><i style="--v:${Math.max(0,Math.min(100,f.value))}%"></i>피로 ${Math.round(f.value)}${f.levelName?` · ${esc(f.levelName)}`:''}${f.musterBlocked?` · 출진 불가${Number.isFinite(f.restTurns)&&f.restTurns>0?`(${f.restTurns}차례 쉼)`:''}`:''}</span>`);
 return parts.length?`<p class="av-line">${parts.join('')}</p>`:'';
}
const musterTag=o=>o?.injury?' — 중상 요양':o?.fatigue?.musterBlocked?` — 피로(${Number.isFinite(o.fatigue.restTurns)?o.fatigue.restTurns+'차례 쉼':'쉬어야 함'})`:'';
function unitCardHead(v,army,title){
 if(!army)return `<h2>${esc(title)}</h2>`;
 const face=portraits[army.commanderId]?.path,color=FACTION_STYLE[army.factionId]?.color??'#7d7a6a';
 const tags=[MORALE_NAME[army.morale??'STEADY'],FORMATION_NAME[army.formation]?`전열 ${FORMATION_NAME[army.formation]}`:'전열 정연',army.braced?'방어 태세':null,(f=>f&&f.until>=state.turn?`진형 ${f.name}`:null)(state.armies[army.armyId]?.c33?.formation)].filter(Boolean);
 return `<header class="um-head" style="--fc:${color}"><div class="um-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(title)}</div><div class="um-id"><h2>${esc(title)}</h2><div class="um-meta">${esc(army.troopDisplayName&&!UNIT_TROOP_NAME_SET.has(army.troopDisplayName)?`${army.troopDisplayName}(${UNIT_TROOP_NAME[troopToCampaign(army.troopType)]??''})`:UNIT_TROOP_NAME[troopToCampaign(army.troopType)]??'')} · 병력 <b>${army.troopCount}</b></div><div class="um-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${bondChips(v.officers[army.commanderId])}</div></header>`;
}
function renderUnitMenu(v){
 const menu=$('#unit-menu');menu.hidden=!menuOpen;if(!menuOpen)return;
 if(selectedArmyIds.length>1){menu.innerHTML=`<header class="um-head"><div class="um-id"><h2>${selectedArmyIds.length}개 부대 선택</h2></div></header><div class="um-body"><button data-menu="move" ${selectedArmyIds.every(id=>orderEligible(state,id))?'':'disabled'}>${UI_ICON('move')}이동(목적지 클릭)</button><button data-menu="brace">${UI_ICON('security')}방어 태세(전체)</button><button data-menu="wait">${UI_ICON('wait')}대기(전체)</button><button data-menu="close">${UI_ICON('cancel')}닫기</button></div>`;return;}
 const army=v.ownArmies[selectedArmyId],title=v.officers[army?.commanderId]?.name??'';
 const recall=hasCampaignRule(state,selectedArmyId,'RECALL')?`<button data-menu="recall" ${recallReason(state,selectedArmyId)?'disabled':''}>귀환${recallReason(state,selectedArmyId)?' · '+esc(recallReason(state,selectedArmyId)):''}</button>`:'';
 const controls=armyActionEnded(state,selectedArmyId)?`<p>${army?.morale==='ROUTING'?'패주 — 명령 불가':'이번 턴 행동 완료'}</p>`:
  `${campaignMoveOptions(state,selectedArmyId).length?`<button data-menu="move">${UI_ICON('move')}이동</button>`:''}${(attackTargets(state,selectedArmyId).length||cityAttackTargets(state,selectedArmyId).length)?`<button data-menu="attack">${UI_ICON('attack')}공격 · 대상 선택</button>`:''}${state.movedArmyIds.includes(selectedArmyId)?'':`<button data-menu="face" title="이동 대신 바라보는 쪽만 바꿉니다. 옆·뒤를 맞으면 피해가 커집니다.">${UI_ICON('command')}정면 돌리기</button>`}<button data-menu="brace">${UI_ICON('security')}방어 태세</button>${Object.values(state.cities).some(c=>c.tileId===army?.tileId&&c.ownerFactionId===army?.factionId)&&state.mapId&&state.mapId!=='v1'?`<button data-menu="garrison" title="부대를 해산해 병력은 성 예비병으로, 장수는 성의 자유 장수로">${UI_ICON('city')}주둔(해산)</button>`:''}<button data-menu="regroup" ${regroupReason(state,selectedArmyId)?'disabled':''}>${UI_ICON('reserve')}재정비${regroupReason(state,selectedArmyId)?' · '+esc(regroupReason(state,selectedArmyId)):''}</button><button data-menu="wait">${UI_ICON('wait')}대기 / 행동 종료</button>`;
 const chase=!armyActionEnded(state,selectedArmyId)&&campaignMoveOptions(state,selectedArmyId).length?previewDisengage(state,selectedArmyId):null;
 const warn=chase?`<p class="warn">이동하면 추격받음 — ${esc(state.officers[state.armies[chase.pursuerId].commanderId]?.name??'적')} 예상 −${chase.dealt} ${chase.effectLines.length?' · '+esc(chase.effectLines.join(' · ')):''}</p>`:'';
 const tactics=campaignTactics(state,selectedArmyId).map(c=>`<button data-tactic="${esc(c.traitId)}" ${!c.targets.length?'disabled':''}>${UI_ICON('tactic')}${c.jointArmyIds?'<span class="joint-tag">공동</span>':''}전법 · ${esc(c.name)} · ${c.signature?(()=>{const g=Math.min(100,state.campaignGrowth?.officers?.[state.armies[selectedArmyId]?.commanderId]?.c29?.gauge??(100-(c.waiting??0)));return `<span class="sig-gauge" style="--g:${g}%">고유 · 게이지 ${Math.round(g)}/100${g>=100?(c.targets.length?' · 사용 가능':' · 대상 없음'):''}</span>`;})():!c.waiting&&!c.targets.length?'대상 없음':`대기 ${c.waiting}턴`}${c.effects?.length?'':' · 효과 준비 중'}</button>`).join('');
 const fm=FORMATION_NAME[army?.formation]?`<p class="warn">전열 ${FORMATION_NAME[army.formation]} — 받는 피해 +${army.formation==='BROKEN'?30:15}%${army.formation==='BROKEN'?', 반격 불가':', 반격 절반'} · 재정비로 회복</p>`:'';
 const star=army?.starAction&&!armyActionEnded(state,selectedArmyId)?starButton(army.starAction,'data-menu="star"'):'';
 // 보급(C45): 상태 한 줄 + 보급 거점 짓기
 const sup=army?.supply,supLine=sup?`<p class="supply-line" data-supply="${esc(sup.state)}" title="보급선: 내 성·보급 거점까지 지나갈 수 있는 길 — 8칸 안 안전, 16칸 안 불안(성이 절반만), 그 밖 끊김(휴대 군량만). 휴대 군량이 바닥나면 굶주림">보급 <b>${SUPPLY_LABEL[sup.state]??esc(sup.state)}</b> · 휴대 군량 ${food1(sup.stock??0)}/${food1(sup.max??0)}${Number.isFinite(sup.turnsLeft)?` (${sup.turnsLeft}차례분)`:''}${Number.isFinite(sup.distance)?` · 원천까지 ${sup.distance}칸`:''}</p>`:'';
 const hubWhy=sup&&!armyActionEnded(state,selectedArmyId)?(()=>{try{return hubBuildReason(state,state.armies[selectedArmyId]);}catch{return '';}})():null;
 const hub=hubWhy!==null?`<button data-menu="hub" ${hubWhy?'disabled':''} title="이 칸에 보급 거점을 짓습니다 — 교전 없이 이번 차례를 마치면 완공, 원천에서 군량 2차례분을 옮겨 첫 재고로">${UI_ICON('build')}보급 거점 짓기${hubWhy?`<small class="why">${esc(hubWhy)}</small>`:''}</button>`:'';
 menu.innerHTML=`${unitCardHead(v,army,title)}<div class="um-body">${supLine}${(f=>f&&Number.isFinite(f.value)?`<p class="av-line"><span class="av-fat" title="나가 있는 동안은 효과 없음 — 돌아와서 다시 출진할 때 60 이상이면 막힘"><i style="--v:${Math.max(0,Math.min(100,f.value))}%"></i>피로 ${Math.round(f.value)}${f.levelName?` · ${esc(f.levelName)}`:''} · 재출진 때만 적용</span></p>`:'')(v.officers[army?.commanderId]?.fatigue)}${fm}${warn}${controls}${hub}${recall}${star}${tactics}${state.moveOrders?.[selectedArmyId]?`<button data-menu="cancel-order">${UI_ICON('cancel')}이동 명령 취소</button>`:''}<button data-menu="officer">${UI_ICON('info')}장수 정보</button><button data-menu="close">${UI_ICON('cancel')}닫기</button></div>`;
 for(const [a,key] of Object.entries(ACTION_KEYS))menu.querySelector?.(`[data-menu="${a}"]`)?.insertAdjacentHTML?.('beforeend',`<kbd>${key}</kbd>`);
 [...(menu.querySelectorAll?.('[data-tactic]')??[])].slice(0,3).forEach((b,n)=>b.insertAdjacentHTML?.('beforeend',`<kbd>${n+1}</kbd>`));
}
$('#unit-menu').addEventListener('click',e=>{
 const action=e.target.closest('[data-menu]')?.dataset.menu;
 if(inputLocked())return;
 const tacticId=e.target.closest('[data-tactic]')?.dataset.tactic;
 if(tacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===tacticId);if(!card?.targets.length)return;if(card.targets.length===1&&card.targets[0]===selectedArmyId){command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:tacticId,targetId:selectedArmyId});return;}selectedTacticId=tacticId;menuOpen=false;moveMode=false;render();$('#status').textContent='전법 대상을 누르세요';return;}
 if(action==='cancel-order'){command({type:'CANCEL_MOVE',armyId:selectedArmyId});return;}
 if(selectedArmyIds.length>1&&['brace','wait'].includes(action)){const ids=[...selectedArmyIds];for(const armyId of ids)command({type:action==='brace'?'BRACE':'WAIT_UNIT',armyId});selectedArmyIds=[];return;}
 if(action==='brace'||action==='regroup'){command({type:action==='brace'?'BRACE':'REGROUP',armyId:selectedArmyId});return;}
 if(action==='recall'){command({type:'RECALL_UNIT',armyId:selectedArmyId});return;}
 if(action==='star'){command({type:'STAR_ACTION',armyId:selectedArmyId});return;}
 if(action==='garrison'){command({type:'GARRISON',armyId:selectedArmyId});return;}
 if(action==='hub'){command({type:'BUILD_HUB',armyId:selectedArmyId});return;}
 if(action==='officer'){selectedOfficerId=state.armies[selectedArmyId]?.commanderId??null;closeUnitMenu();renderOfficerCard();return;}
 if(action==='wait'){command({type:'WAIT_UNIT',armyId:selectedArmyId});return;}
 if(action==='move'){menuOpen=false;moveMode=true;render();const chase=previewDisengage(state,selectedArmyId);$('#status').textContent='이동할 칸을 누르세요'+(chase?` · 교전 이탈 시 추격 −${chase.dealt}`:'');}
 if(action==='face'){menuOpen=false;moveMode=false;faceMode=true;render();$('#status').textContent='바라볼 쪽의 칸을 누르세요(Esc 취소)';return;}
 if(action==='attack'){attackMode=true;menuOpen=false;$('#unit-menu').hidden=true;$('#status').textContent='빨간 점선 공격 대상을 누르세요';}
 if(action==='close')closeUnitMenu();
});
function mapClick(e){
 if(!state||state.gameResult||inputLocked())return;
 const prodCity=e.target.closest?.('[data-prod-city]')?.dataset.prodCity;if(prodCity&&state.cities[prodCity]?.ownerFactionId===state.playerFactionId&&openProdPop(prodCity,e))return;
 closeProdPop();
 const tileId=targetTile(e.target,state.armies,state.cities);if(!tileId)return;
 // 이름표를 누르면 그 부대, 칸(병사 그림)을 누르면 그 칸의 내 부대를 차례로
 const own=Object.values(view(state).ownArmies),plateUnit=e.target.closest?.('.plate-top')?.dataset.unit;
 const id=plateUnit&&own.some(a=>a.armyId===plateUnit)?plateUnit:cycleTileUnit(own,tileId,selectedArmyId);
 const enemies=selectedArmyId?attackTargets(state,selectedArmyId):[],enemy=enemies.find(id=>state.armies[id].tileId===tileId);
 const cityId=Object.values(state.cities).find(c=>c.tileId===tileId)?.cityId;
 if(faceMode&&selectedArmyId){const a=state.armies[selectedArmyId];if(tileId!==a.tileId){faceMode=false;command({type:'FACE',armyId:selectedArmyId,facing:directionToward(state.tiles[a.tileId],state.tiles[tileId],a.facing)});}return;}
 if(selectedArmyId&&selectedTacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);const target=card?.targets.find(id=>state.armies[id]?.tileId===tileId);if(target)command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:selectedTacticId,targetId:target});return;}
 if(e.shiftKey&&id){selectedArmyIds=toggleSelection(selectedArmyIds,id);selectedArmyId=selectedArmyIds[0]??null;menuOpen=!!selectedArmyId;render();return;}
 if(moveMode&&!menuOpen&&selectedArmyId&&orderRoute(state,selectedArmyId,tileId)){
  command({type:'QUEUE_MOVE',armyIds:selectedArmyIds.length?selectedArmyIds:[selectedArmyId],destinationTileId:tileId});return;
 }
 if(e.target.closest('[data-city]')&&cityId&&!(selectedArmyId&&cityAttackTargets(state,selectedArmyId).includes(cityId))){if(selectedCityId!==cityId)cityTab=null;selectedCityId=cityId;closeUnitMenu();renderCityPanel(view(state));return;}
 if(id){selectedArmyId=id;selectedArmyIds=[id];menuOpen=true;moveMode=true;destination=null;render();pilotAudio.play('select',`select:${++soundSequence}`);return;}
 if(selectedArmyId&&enemy){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:enemy});return;}
 if(selectedArmyId&&cityId&&cityAttackTargets(state,selectedArmyId).includes(cityId)){command({type:'ATTACK_CITY',armyId:selectedArmyId,cityId});return;}
 if(selectedArmyId&&orderRoute(state,selectedArmyId,tileId)){command({type:'QUEUE_MOVE',armyIds:selectedArmyIds.length?selectedArmyIds:[selectedArmyId],destinationTileId:tileId});return;}
 if(cityId){if(selectedCityId!==cityId)cityTab=null;selectedCityId=cityId;closeUnitMenu();renderCityPanel(view(state));return;}
 if(menuOpen)closeUnitMenu();
}
$('#map').addEventListener('click',e=>{if(suppressPanClick){suppressPanClick=false;e.preventDefault();return;}mapClick(e);});
$('#map').addEventListener('pointerover',e=>{
 if(panGesture||inputLocked()||!selectedArmyId)return;
 const hoverTile=targetTile(e.target,state.armies,state.cities);
 const unit=e.target.closest('[data-unit]')?.dataset.unit??attackTargets(state,selectedArmyId).find(id=>state.armies[id].tileId===hoverTile);
 const tip=$('#attack-preview');
 if(selectedTacticId){const c=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);if(c?.targets.includes(unit)){const p=previewTactic(state,selectedArmyId,selectedTacticId,unit);setTip(tip,p.effectOnly?`<div class="fc-top"><span class="fc-title">전법 · ${esc(c.name)}</span></div>${(p.effectLines??[]).length?`<ul class="fc-mods">${p.effectLines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`:forecastHtml(selectedArmyId,unit,p,`전법 · ${c.name}`),`전법 · ${c.name}`+(p.effectOnly?'':` · 아군 −${p.allyLoss} / 적 −${p.enemyLoss}`)+(p.effectLines.length?' · '+p.effectLines.join(' · '):''));tip.hidden=false;}else tip.hidden=true;return;}
 const cityId=e.target.closest('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===e.target.closest('[data-tile]')?.dataset.tile)?.cityId;
 if(cityId&&cityAttackTargets(state,selectedArmyId).includes(cityId)){
  const p=previewCityAttack(state,selectedArmyId,cityId);setTip(tip,`<div class="fc-top"><span class="fc-title">성 공격 · ${esc(cityLabel(cityId))}</span><span class="fc-res" data-res="${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)<=0?'win':'even'}">${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)<=0?'내구 0':'공성'}</span></div><p class="fc-sum">내구 −${p.dealt}</p><div class="fc-bar wide"><i style="width:${(Math.max(0,(state.cities[cityId].durability??0)-p.dealt)/Math.max(1,state.cities[cityId].durabilityMax??1)*100).toFixed(1)}%"></i><s style="width:${(Math.min(state.cities[cityId].durability??0,p.dealt)/Math.max(1,state.cities[cityId].durabilityMax??1)*100).toFixed(1)}%"></s></div><small class="fc-dur">내구 ${state.cities[cityId].durability??0} → <em>${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)}</em></small>${p.effectLines.length?`<ul class="fc-mods">${p.effectLines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`,`내구 −${p.dealt}`+(p.effectLines.length?' · '+p.effectLines.join(' · '):''));tip.hidden=false;
  tip.style.top=Math.min(innerHeight-100,Math.max(8,e.clientY+15))+'px';tip.style.left=Math.max(8,Math.min(innerWidth-300,e.clientX+15))+'px';return;
 }
 if(unit&&attackTargets(state,selectedArmyId).includes(unit)){
  const p=previewAttack(state,selectedArmyId,unit),m=p.multipliers;
  {const hs={tile:state.armies[unit].tileId,side:p.side};if(hoverSide?.tile!==hs.tile||hoverSide?.side!==hs.side){hoverSide=hs;drawMap(view(state));}}
  setTip(tip,forecastHtml(selectedArmyId,unit,p),`아군 −${p.allyLoss} / 적 −${p.enemyLoss}`+
   (m.terrain!==1?` · ${state.tiles[state.armies[unit].tileId].terrainType==='forest'?'숲':'언덕'} 방어 ×${m.terrain}`:'')+
   (m.castle!==1?` · 성 방어 ×${m.castle}`:'')+(m.matchup!==1?` · 상성 ×${m.matchup}`:'')+(m.river!==1?' · 도하 ×0.75':'')+(m.flank!==1?` · 협공 +${Math.round((m.flank-1)*100)}%`:'')+(p.effectLines.length?' · '+p.effectLines.join(' · '):'')+
   (p.formationRisk?.check?` · 적 전열 판정(버틸 확률 ${Math.round(p.formationRisk.successProbability*100)}%)`:'')+(p.moraleRisk?.check?` · 적 사기 판정(버틸 확률 ${Math.round(p.moraleRisk.successProbability*100)}%)`:''));
  tip.hidden=false;placeTip(tip,e);return;
 }
 tip.hidden=true;tip.classList?.remove?.('forecast');if(hoverSide){hoverSide=null;drawMap(view(state));}
 const id=hoverTile;
 if(moveMode&&id){const route=orderRoute(state,selectedArmyId,id);if(route){tip.textContent=`${routeTurns(state,selectedArmyId,route)}턴`;tip.hidden=false;tip.style.left=e.clientX+15+'px';tip.style.top=e.clientY+15+'px';}}
 if(moveMode&&id&&id!==destination){destination=id;drawMap(view(state));}
});
$('#map').addEventListener('pointerleave',()=>{$('#attack-preview').hidden=true;if(hoverSide){hoverSide=null;if(state)drawMap(view(state));}});
$('#cancel-move').addEventListener('click',closeUnitMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeProdPop();selectedCityId=null;closeUnitMenu();$('#city-panel').hidden=true;}});
document.addEventListener('click',e=>{if(menuOpen&&!e.target.closest('#unit-menu,[data-unit],[data-tile]'))closeUnitMenu();});
globalThis.addEventListener('resize',()=>{if(state)drawMap(view(state));positionUnitMenu();});document.addEventListener('scroll',positionUnitMenu,true);
document.addEventListener('pointerdown',unlockAudio);
$('#mute').addEventListener('click',()=>{pilotAudio.configure({muted:!pilotAudio.settings.muted});refreshAudio();});
function refreshAudio(){pilotAudio=createPilotAudio();actionAudio.refresh();combatAudio.refresh();bgm.configure(pilotAudio.settings);$('#mute').textContent=pilotAudio.settings.muted?'소리 켜기':'음소거';}
globalThis.addEventListener('storage',e=>{if(e.key===null||e.key==='sangoku-round-map-audio-v1')refreshAudio();});
globalThis.addEventListener('pagehide',()=>{actionAudio.dispose();combatAudio.dispose();bgm.deactivate();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){actionAudio.cancel();combatAudio.cancel();bgm.deactivate();}else if(audioGesture)bgm.activate();});


function centerPlayer(){
 const viewport=$('.viewport'),v=view(state);
 if(!viewport?.clientWidth)return;

 const capital=v.ownCities[v.faction.capitalCityId]??Object.values(v.ownCities)[0];
 const army=Object.values(v.ownArmies)[0];
 const node=capital?$('#map').querySelector(`[data-city="${capital.cityId}"]`):army?$('#map').querySelector(`[data-unit="${army.armyId}"]`):null;
 if(!node?.getScreenCTM||!viewport?.getBoundingClientRect)return;
 const svg=$('#map svg'),point=svg.createSVGPoint();
 // City banners sit above the center by 2.05 hex radii.
 if(capital)point.y=30*2.05;
 const target=point.matrixTransform(node.getScreenCTM()),rect=viewport.getBoundingClientRect();
 viewport.scrollLeft+=target.x-rect.left-viewport.clientWidth/2;
 viewport.scrollTop+=target.y-rect.top-viewport.clientHeight/2;
 // 시작 시점은 종이 지도가 화면을 채우게(수도가 지도 귀퉁이여도 탁자만 보이지 않게). 손으로 끌면 여백까지 갈 수 있다.
 const sheet=$('#map .mr-sheet .paper')?.getBoundingClientRect?.();
 if(sheet&&sheet.width){
  const fit=(scroll,lo,hi,size)=>scroll+(hi-lo<size?(lo+hi-size)/2:lo>0?lo:hi<size?hi-size:0);
  const r=viewport.getBoundingClientRect(),s2=$('#map .mr-sheet .paper').getBoundingClientRect();
  viewport.scrollLeft=fit(viewport.scrollLeft,s2.left-r.left,s2.right-r.left,viewport.clientWidth);
  viewport.scrollTop=fit(viewport.scrollTop,s2.top-r.top,s2.bottom-r.top,viewport.clientHeight);
 }
}
let panGesture=null,suppressPanClick=false;
const viewport=$('.viewport');
viewport.addEventListener('contextmenu',e=>e.preventDefault());
viewport.addEventListener('pointerdown',e=>{
 suppressPanClick=false;
 if(!state||![0,1,2].includes(e.button)||e.target.closest('button,#unit-menu,.tracker,.officers,.minimap,#city-panel'))return;
 // 끌기 = 지도 이동(어느 버튼이든), Shift+끌기 = 여러 부대 선택(사용자 지시 2026-10-04)
 const select=e.button===0&&e.shiftKey&&!inputLocked();
 panGesture={id:e.pointerId,button:e.button,select,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,panning:false};
});
viewport.addEventListener('pointermove',e=>{
 if(!panGesture||e.pointerId!==panGesture.id)return;
 const dx=e.clientX-panGesture.x,dy=e.clientY-panGesture.y;
 if(!panGesture.panning&&Math.hypot(dx,dy)<=6)return;
 panGesture.panning=true;suppressPanClick=true;viewport.setPointerCapture?.(e.pointerId);
 if(panGesture.select){const r=selectionRect(panGesture.x,panGesture.y,e.clientX,e.clientY),box=$('#select-box');box.hidden=false;for(const [k,v] of Object.entries(r))box.style[k]=v+'px';}
 else {viewport.style.cursor='grabbing';viewport.scrollLeft=panGesture.left-dx;viewport.scrollTop=panGesture.top-dy;}
 e.preventDefault();
});
function endPan(e){
 if(!panGesture||e.pointerId!==panGesture.id)return;
 if(panGesture.select&&panGesture.panning&&e.type!=='pointercancel'){
  const r=selectionRect(panGesture.x,panGesture.y,e.clientX??panGesture.x,e.clientY??panGesture.y);
  const units=Object.values(view(state).ownArmies).flatMap(a=>{
   const node=$('#map').querySelector(`[data-tile="${a.tileId}"]`),svg=$('#map svg');
   if(!node?.getBBox||!node.getScreenCTM||!svg?.createSVGPoint)return [];
   const b=node.getBBox(),p=svg.createSVGPoint();p.x=b.x+b.width/2;p.y=b.y+b.height/2;
   const c=p.matrixTransform(node.getScreenCTM());return [{id:a.armyId,x:c.x,y:c.y,eligible:!armyActionEnded(state,a.armyId)}];
  });
  selectedArmyIds=rectangleSelection(r,units);selectedArmyId=selectedArmyIds[0]??null;menuOpen=!!selectedArmyId;moveMode=false;render();
 }
 $('#select-box').hidden=true;
 if(viewport.hasPointerCapture?.(e.pointerId))viewport.releasePointerCapture(e.pointerId);
 if(e.type==='pointercancel')suppressPanClick=false;
 panGesture=null;viewport.style.cursor='';
}
viewport.addEventListener('pointerup',endPan);viewport.addEventListener('pointercancel',endPan);
viewport.addEventListener('click',e=>{if(suppressPanClick){suppressPanClick=false;e.preventDefault();e.stopPropagation();}});
document.addEventListener('keydown',e=>{if(!state||e.target?.closest?.('input,select,textarea'))return;const d={ArrowLeft:[-80,0],a:[-80,0],ArrowRight:[80,0],d:[80,0],ArrowUp:[0,-80],w:[0,-80],ArrowDown:[0,80],s:[0,80]}[e.key.length===1?e.key.toLowerCase():e.key];if(d){e.preventDefault();viewport.scrollLeft+=d[0];viewport.scrollTop+=d[1];}});

// Fixed SVG margin covers the viewport even at the minimum zoom; no second background.
function drawMap(v){
 const options=selectedArmyId&&!inputLocked()?campaignMoveOptions(state,selectedArmyId):[];
 const model=campaignMapModel(v,{selectedArmyId,movedArmyIds:Object.values(state.armies).filter(a=>state.movedArmyIds.includes(a.armyId)||armyActionEnded(state,a.armyId)).map(a=>a.armyId),moveOptions:options,destination,portraits});
 for(const u of model.units)u.active=selectedArmyIds.includes(u.id)||u.id===selectedArmyId;
 if(model.places){const xs=v.exploration?.places??[];model.places=model.places.map(p=>{const x=xs.find(e=>e.placeId===p.label);return {...p,status:x?.status,eventName:x?.eventName};});}
 model.highlights.orders=orderHighlights(state,selectedArmyIds);
 if(dangerMode)model.highlights.danger=dangerTiles(v);
 {const seen={...v.ownArmies,...(v.knowledge?.observedArmies??{})};for(const u of model.units)if(seen[u.id]?.crisis)u.crisis=seen[u.id].crisis;}
 model.highlights.links=bondLinks(v);{const bonded=new Set(model.highlights.links.flatMap(l=>l.armies));for(const u of model.units)if(bonded.has(u.id))u.bond=true;}
 model.highlights.intents=Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.nextMoveTarget&&a.nextMoveTarget!==a.tileId&&state.tiles[a.nextMoveTarget]).map(a=>({from:a.tileId,to:a.nextMoveTarget}));
 if(hoverSide&&selectedArmyId)model.highlights.side=hoverSide;
 if(moveMode&&destination&&selectedArmyId){const route=orderRoute(state,selectedArmyId,destination);if(route)model.highlights.orders=[{unitId:selectedArmyId,path:route.pathTileIds,turns:routeTurns(state,selectedArmyId,route)},...model.highlights.orders.filter(o=>o.unitId!==selectedArmyId)];}
 if(faceMode&&selectedArmyId){const [q,r]=state.armies[selectedArmyId].tileId.split(',').map(Number);model.highlights.move=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([dq,dr])=>`${q+dq},${r+dr}`).filter(id=>state.tiles[id]);}
 const targets=selectedArmyId&&!inputLocked()?attackTargets(state,selectedArmyId):[];
 if(selectedTacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);targets.splice(0,targets.length,...(card?.targets??[]));}
 model.highlights.attack=[...targets.map(id=>state.armies[id].tileId),...(selectedArmyId&&!inputLocked()?cityAttackTargets(state,selectedArmyId).map(id=>state.cities[id].tileId):[])];
 for(const [id,effect] of Object.entries(losses))if(effect.oldUnit&&!model.units.some(u=>u.id===id))model.units.push({...effect.oldUnit,count:0});
 for(const u of model.units){const effect=losses[u.id];if(effect){Object.assign(u,effect);u.count=effect.displayCount??effect.postCount??u.count;u.maxCount??=effect.prevCount??effect.displayCount;}}
 for(const u of model.units){const a=state.armies[u.id];if(a&&!u.enemy)u.braced=!!a.braced;}
 overlayAnimations(model);
 const margin=Math.max(viewport.clientWidth||800,viewport.clientHeight||600)/.5/2+100;
 const offset=mapMargin?(margin-mapMargin)*zoom:0;mapMargin=margin;
 const left=viewport.scrollLeft,top=viewport.scrollTop;
 const cityBadges=Object.fromEntries(Object.values(v.ownCities??{}).map(c=>[c.cityId,cityProductionBadge(c)]).filter(([,b])=>b));$('#map').innerHTML=renderStrategicMap(model,{size:30,margin,base:'',cityBadges,theme:THEME});markUnknownCounts(model);applyZoom();
 viewport.scrollLeft=left+offset;viewport.scrollTop=top+offset;
 for(const id of targets)for(const node of unitNodes(id))node.classList.add('attack-target');
 for(const u of model.units){const node=$('#map').querySelector(`[data-unit="${u.id}"]`);if(node?.insertAdjacentHTML)node.insertAdjacentHTML('beforeend',`<g class="zoom-marker"><circle r="9" fill="${colors[u.factionId]}"/><use href="/app/design/sg-icons.svg#${FACTION_STYLE[u.factionId].emblem}" x="-7" y="-7" width="14" height="14"/></g>`);}
 $('#mini').innerHTML=renderMinimap(model,{theme:THEME});
}
function applyZoom(){
 const svg=$('#map svg');if(!svg)return;
 const width=svg.viewBox?.baseVal?.width;
 if(width)svg.style.width=width*zoom+'px';
 svg.classList.toggle('zoom-far',zoom<.75);svg.classList.toggle('zoom-near',zoom>=1.4);
}
export function zoomScroll(left,top,x,y,from,to){return {left:(left+x)*to/from-x,top:(top+y)*to/from-y};}
let zoomTimer=null;
function zoomAt(value,x,y){
 const next=Math.max(.5,Math.min(2.6,value)),from=zoom,start=performance.now(),left=viewport.scrollLeft,top=viewport.scrollTop;
 clearTimeout(zoomTimer);
 function frame(){const t=Math.min(1,(performance.now()-start)/120);zoom=from+(next-from)*t;
  applyZoom();const p=zoomScroll(left,top,x,y,from,zoom);viewport.scrollLeft=p.left;viewport.scrollTop=p.top;
  if(t<1)zoomTimer=setTimeout(frame,16);
 }frame();
}
viewport.addEventListener('wheel',e=>{if(!state||e.target.closest('.float,#city-panel,#unit-menu,.officers'))return;e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX-r.left,e.clientY-r.top);},{passive:false});
document.addEventListener('keydown',e=>{if(!state||e.target?.closest?.('input,select,textarea'))return;if(['+','=','-'].includes(e.key)){e.preventDefault();zoomAt(zoom*(e.key==='-'?1/1.12:1.12),viewport.clientWidth/2,viewport.clientHeight/2);}});
$('#mini').addEventListener('click',e=>{
 const mini=$('#mini svg'),svg=$('#map svg');if(!mini?.createSVGPoint||!svg?.createSVGPoint)return;
 const point=mini.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
 const p=point.matrixTransform(mini.getScreenCTM().inverse()),box=mini.viewBox.baseVal;
 const hits=[...svg.querySelectorAll('[data-tile]')];if(!hits.length)return;
 const b=hits.map(n=>n.getBBox()),minX=Math.min(...b.map(n=>n.x)),maxX=Math.max(...b.map(n=>n.x+n.width)),minY=Math.min(...b.map(n=>n.y)),maxY=Math.max(...b.map(n=>n.y+n.height));
 const x=minX+(p.x/box.width)*(maxX-minX),y=minY+(p.y/box.height)*(maxY-minY);
 viewport.scrollLeft=x*zoom-viewport.clientWidth/2;viewport.scrollTop=y*zoom-viewport.clientHeight/2;
});
// 규칙 도움말 창(HUD '규칙'): 지금 구현된 규칙과 시험값만 요약
$('#rules-open')?.addEventListener?.('click',()=>{$('#rules-modal').hidden=false;});
$('#rules-close')?.addEventListener?.('click',()=>{$('#rules-modal').hidden=true;});
$('#faction')?.addEventListener?.('click',()=>{if(!state)return;$('#faction-modal').hidden=false;renderFactionModal();});
$('#faction-close')?.addEventListener?.('click',()=>{$('#faction-modal').hidden=true;});
$('#faction-content')?.addEventListener?.('click',e=>{if(!state||inputLocked())return;const b=e.target.closest('[data-diplo-propose],[data-diplo-end]');if(!b)return;
 const cmd=b.dataset.diploPropose?{type:'DIPLO_PROPOSE',factionId:b.dataset.diploPropose,kind:b.dataset.kind}:{type:'DIPLO_END_ALLIANCE',factionId:b.dataset.diploEnd};
 try{state=step(state,cmd);render();renderFactionModal();}catch(err){$('#status').textContent=errorText(err);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#rules-modal')&&!$('#rules-modal').hidden)$('#rules-modal').hidden=true;});
// 키보드: N = 다음 부대(이번 턴 행동이 남은 내 부대를 차례로 골라 보여 줌), Enter = 다음 턴. 창이 떠 있거나 입력 중이면 무시
document.addEventListener('keydown',e=>{
 if(!state||state.gameResult||e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,select,textarea,button,a'))return;
 if(document.querySelector('.modal-backdrop:not([hidden])'))return;
 if(e.key==='x'||e.key==='X'){e.preventDefault();dangerMode=!dangerMode;render();$('#status').textContent=dangerMode?'위험 지역 보기 — 보이는 적이 다음 턴에 닿는 칸 (X 끄기)':'위험 지역 보기 끔';return;}
 if(e.key==='n'||e.key==='N'||e.key===' '){
  if(inputLocked()||state.phase!=='PLAYER')return;
  const ids=Object.values(view(state).ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)).sort();
  if(!ids.length)return;e.preventDefault();
  const next=ids[(ids.indexOf(selectedArmyId)+1)%ids.length];
  selectedTacticId=null;attackMode=false;selectedArmyId=next;selectedArmyIds=[next];menuOpen=true;moveMode=true;destination=null;render();follow(next);
 }
 if(e.key==='Enter'&&!$('#end-turn').disabled){e.preventDefault();const b=$('#end-turn').dataset.blocker;if(b&&!e.shiftKey){openCity(b,'jobs');return;}command({type:'END_TURN'});}
 // 부대 행동 단축키: Q 이동 · E 공격 · F 정면 · B 방어 · R 재정비 · G 주둔 · Z 대기 · 1~3 전법 · Space 다음 부대
 if(selectedArmyId&&state.phase==='PLAYER'&&!inputLocked()){
  const key=e.key.length===1?e.key.toUpperCase():e.key,action=Object.entries(ACTION_KEYS).find(([,k])=>k===key)?.[0],ti=['1','2','3'].indexOf(e.key);
  if(action||ti>=0){if(!menuOpen){menuOpen=true;render();}const btn=ti>=0?[...(document.querySelectorAll?.('#unit-menu [data-tactic]')??[])][ti]:document.querySelector(`#unit-menu [data-menu="${action}"]`);if(btn&&!btn.disabled){e.preventDefault();btn.click();}}
 }
});
// 이어하기로 들어오면 모듈 끝에서 불러온다 — 위쪽에서 부르면 아래의 viewport 등이 아직 만들어지지 않아(TDZ) 끝난 판에서 오류 문구가 남았다
if (new URLSearchParams(location.search).get('entry') === 'continue') resume();
