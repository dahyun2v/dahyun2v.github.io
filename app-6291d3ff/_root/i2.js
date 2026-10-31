import {FACTIONS,TROOPS,loadInputs} from '/src/data.mjs';
import {createInitialState,SAVE_KEY} from '/src/core.mjs';
import {loadCanonicalLosRules} from '/src/los-rules.mjs';
import {createCampaignTerminalUiModel} from '/src/campaign-terminal-ui-model.mjs';
import {
  FIRST3_RUNTIME_SAVE_KEY,
  FIRST3_RUNTIME_V1_SAVE_KEY,
  createFirst3Runtime,
  completeRuntimeG03FieldTransitionWorkTrial,
  admitRuntimeFieldInspection,
  applyRuntimeGrowthDraftAction,
  cancelRuntimeDetachment,
  cancelRuntimeFieldInspection,
  completeRuntimeDetachment,
  deserializeFirst3Runtime,
  executeFirst3RuntimeTicks,
  getFirst3RuntimePublicView,
  getRuntimeG03SlowTacticAvailability,
  getRuntimeG21ConfusionTacticAvailability,
  issueRuntimeCombatCommand,
  issueRuntimeG03SlowTactic,
  issueRuntimeG07CommandCoordination,
  issueRuntimeG08BannerTactic,
  issueRuntimeG21ConfusionTactic,
  issueRuntimeFieldInspectionMove,
  issueRuntimeMoveOrder,
  migrateFirst3RuntimeV2R9ControlAuthoritySave,
  migrateFirst3RuntimeV2R9AiSave,
  migrateFirst3RuntimeV2R9IdentityTacticsSave,
  migrateFirst3RuntimeV2R5Save,
  migrateFirst3RuntimeV2R6Save,
  migrateFirst3V3Save,
  migrateFirst3RuntimeV1Save,
  prepareI2TrialWorld,
  prepareRuntimeG21ConfusionWorkTrial,
  queryRuntimeKnownLos,
  resolveRuntimeCampaignTerminalChoice,
  selectRuntimeArmy,
  serializeFirst3Runtime,
  scheduleRuntimeDetachment,
  startRuntimeTraining,
  startRuntimeRecruitment,
  cancelRuntimeRecruitment,
} from '/src/first3-runtime.mjs';

const app=document.querySelector('#app');
const SPRITE='/assets/round-04/map-symbols-v1.svg';
const trialByFaction={
  F01:{actorRef:'U-F01-G24',targetRef:'U-F02-G02',actorTileId:'3,3',targetTileId:'6,3',pathTileIds:['3,3','4,3','5,3']},
  F02:{actorRef:'U-F02-G05',targetRef:'U-F01-G07',actorTileId:'12,3',targetTileId:'13,3',pathTileIds:[]},
  F03:{actorRef:'U-F03-G20',targetRef:'U-F01-G24',actorTileId:'5,10',targetTileId:'8,10',pathTileIds:['5,10','6,10','7,10']},
};
const troopIcon={spear:'unit-spear',cavalry:'unit-cavalry',bow:'unit-archer',engineer:'unit-engineer',militia:'unit-medic',mystic:'unit-caster'};
const actionName={CAVALRY_CHARGE:'돌격',BASIC_ATTACK:'기본 공격',RANGED_VOLLEY:'집중 사격','ART-G03':'반룡의 매듭','ART-G07':'난세의 군령','ART-G08':'벽안의 군기','ART-G21':'봉추의 미혹',BASIC_TROOP_REORGANIZATION_COMPLETED:'기본 병종 재편 완료',GOVERNOR_COMMANDER_SWAP_COMPLETED:'태수·지휘관 교대 완료',ASSIGNMENT_TRAINING_STARTED:'훈련 시작',ASSIGNMENT_TRAINING_COMPLETED:'훈련 완료',ASSIGNMENT_FIELD_INSPECTION_STARTED:'전선 확인 시작',ASSIGNMENT_FIELD_INSPECTION_COMPLETED:'전선 확인 완료',ASSIGNMENT_FIELD_INSPECTION_FAILED:'전선 확인 실패'};
const statusName={RESERVED:'실행 준비 중',CANCELLED:'조건 변경으로 취소',RESOLVED:'결과 계산됨',RESULTS_MERGED:'결과 반영 완료',SETTLED:'정산 완료'};
let inputs,losRules,growthPool,cityEconomy,recruitmentContracts,runtime=null,selectedFaction='F01',selectedTarget=null,notice='',strategicAiEnabled=true;
let detachmentSourceArmyId=null,detachmentTransferTroopCount=null,selectedDetachmentDeploymentTileId=null;
let selectedG03AreaTileIds=[];
let selectedMoveDestination=null;
let g24PilotCard=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const pct=(value,max)=>max>0?clamp(value/max*100,0,100):0;
const tileDistance=(a,b)=>{const[x,y]=a.split(',').map(Number),[q,r]=b.split(',').map(Number);return (Math.abs(x-q)+Math.abs(y-r)+Math.abs(x+y-q-r))/2;};
const point=id=>{const[q,r]=id.split(',').map(Number),size=17;return{x:26+Math.sqrt(3)*size*(q+r/2),y:28+size*1.5*r};};
const polygon=position=>Array.from({length:6},(_,index)=>{const angle=Math.PI/3*index-Math.PI/6;return `${position.x+16*Math.cos(angle)},${position.y+16*Math.sin(angle)}`;}).join(' ');
const icon=(name,className='')=>`<svg class="${className}" width="32" height="32" viewBox="0 0 64 64" aria-hidden="true"><use href="${SPRITE}#${name}"></use></svg>`;

function act(operation){
  try{operation();}
  catch(error){notice=error.message;}
  render();
}

function freshTrial(){
  const config=trialByFaction[selectedFaction];
  let world=createInitialState({...inputs,factionId:selectedFaction});
  world=prepareI2TrialWorld(world,config);
  runtime=createFirst3Runtime({world,losRules,growthPool,cityEconomy,recruitmentContracts,scenarioMode:'I2_TRIAL',strategicAiEnabled});
  runtime=selectRuntimeArmy(runtime,{armyId:config.actorRef,losRules});
  selectedTarget=config.targetRef;
  selectedMoveDestination=null;
  resetDetachmentDraft();
  selectedG03AreaTileIds=[];
  notice='전투 연결 시험 배치를 열었습니다. 이 배치는 본편 초기 위치를 바꾸지 않습니다.';
}

function freshCampaign(){
  const world=createInitialState({...inputs,factionId:selectedFaction});
  runtime=createFirst3Runtime({world,losRules,growthPool,cityEconomy,recruitmentContracts,scenarioMode:'FIRST3',strategicAiEnabled});
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  const armyId=Object.keys(view.world.ownArmies)[0];
  if(armyId)runtime=selectRuntimeArmy(runtime,{armyId,losRules});
  selectedTarget=null;
  selectedMoveDestination=null;
  selectedG03AreaTileIds=[];
  resetDetachmentDraft();
  notice='정상 초기 배치에서 캠페인을 시작했습니다. 부대를 선택하고 알려진 목적지로 이동을 명령하세요.';
}

function issueMove(){
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  if(!['VISIBLE','REMEMBERED'].includes(view.world.knowledge.tiles[selectedMoveDestination]))throw new Error('현재 알려진 목적지를 선택하세요.');
  runtime=issueRuntimeMoveOrder(runtime,{armyId:view.world.ui.selectedArmyId,destinationTileId:selectedMoveDestination},{losRules});
  notice=`${selectedMoveDestination} 이동을 계획했습니다. 시간을 진행하면 실제 경로를 따라 이동합니다.`;
}

function movementPanel(view){
  const army=view.world.ownArmies[view.world.ui.selectedArmyId];
  const tiles=Object.values(view.world.tiles).filter(tile=>['VISIBLE','REMEMBERED'].includes(view.world.knowledge.tiles[tile.tileId])&&tile.tileId!==army?.tileId);
  if(!tiles.some(tile=>tile.tileId===selectedMoveDestination))selectedMoveDestination=null;
  const order=army?.currentOrder;
  const planning=view.world.turnPhase==='PLANNING';
  const busy=army?.movementState||view.combat.commands.some(command=>command.actorRef===army?.armyId&&command.status==='RESERVED');
  const locked=army&&detachmentArmyLockReason(view,army.armyId);
  const options=tiles.map(tile=>`<option value="${esc(tile.tileId)}" ${selectedMoveDestination===tile.tileId?'selected':''}>${esc(tile.tileId)}${Object.values(view.world.knowledge.cities).some(city=>city.tileId===tile.tileId)?' · 도시':''}</option>`).join('');
  return `<section class="card movement" aria-label="일반 이동"><div class="eyebrow">일반 이동</div><p>${army?`${esc(view.world.officers[army.commanderId]?.name)} · 현재 ${esc(army.tileId)}`:'아군 부대를 선택하세요.'}</p><label for="move-destination">알려진 목적지</label><select id="move-destination"><option value="">목적지 선택</option>${options}</select><div class="actions"><button id="issue-move" ${army&&planning&&!busy&&!locked&&selectedMoveDestination?'':'disabled'}>이동 명령</button><button id="advance-20">20틱 진행</button><button id="advance-boundary">${planning?'이번 턴 실행':'다음 계획 단계까지'}</button></div><p class="note">${planning?'계획 단계: 경로의 통행 가능 여부를 확인한 뒤 명령합니다.':'진행 중에는 이동 명령을 바꿀 수 없습니다.'}${locked?` ${esc(locked)}`:''}</p><p class="movement-status">${order?`${esc(order.type)} · ${esc(order.status)}${order.pathTileIds?.length?` · ${order.pathTileIds.map(esc).join(' → ')}`:''}`:'현재 이동 명령 없음'}</p></section>`;
}

function loadRuntime(){
  const saved=localStorage.getItem(FIRST3_RUNTIME_SAVE_KEY);
  if(!saved)throw new Error('저장된 I2 진행이 없습니다.');
  let loaded,migratedEmptyAiLedger=false,migratedEmptyIdentityLedger=false,migratedControlAuthority=false;
  const migrateLegacyAuthority=()=>{
    const legacy=JSON.parse(saved);
    migratedEmptyAiLedger=!Object.hasOwn(legacy,'strategicAiRuntime');
    migratedEmptyIdentityLedger=!Object.hasOwn(legacy,'identityTactics');
    migratedControlAuthority=true;
    return migrateFirst3RuntimeV2R9ControlAuthoritySave(saved,{inputs,losRules,originalPlayerFactionId:selectedFaction});
  };
  try{loaded=deserializeFirst3Runtime(saved,{inputs,losRules});}
  catch(error){
    if(error.message==='RUNTIME_R9_CONTROL_AUTHORITY_MIGRATION_REQUIRED')loaded=migrateLegacyAuthority();
    else if(error.message==='RUNTIME_R9_IDENTITY_MIGRATION_REQUIRED'){
      try{loaded=migrateFirst3RuntimeV2R9IdentityTacticsSave(saved,{inputs,losRules});migratedEmptyIdentityLedger=true;}
      catch(identityError){if(identityError.message!=='RUNTIME_R9_CONTROL_AUTHORITY_MIGRATION_REQUIRED')throw identityError;loaded=migrateLegacyAuthority();}
    }else if(error.message==='RUNTIME_R9_AI_MIGRATION_REQUIRED'){
      try{loaded=migrateFirst3RuntimeV2R9AiSave(saved,{inputs,losRules});migratedEmptyAiLedger=true;migratedEmptyIdentityLedger=true;}
      catch(aiError){if(aiError.message!=='RUNTIME_R9_CONTROL_AUTHORITY_MIGRATION_REQUIRED')throw aiError;loaded=migrateLegacyAuthority();}
    }else throw error;
  }
  runtime=loaded;
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  selectedFaction=view.world.factionId;
  selectedMoveDestination=null;
  selectedTarget=Object.keys(view.world.knowledge.observedArmies)[0]??null;
  resetDetachmentDraft();
  selectedG03AreaTileIds=[];
  notice=migratedControlAuthority
    ?`전역 tick ${view.globalTick}의 구 저장을 선택한 원래 플레이 세력 ${FACTIONS[selectedFaction].name}에 묶어 명시 이관했습니다.${migratedEmptyAiLedger?' AI는 빈 비활성 원장으로 시작합니다.':''}${migratedEmptyIdentityLedger?' G07·G08은 빈 원장으로 시작하며 과거 효과를 추론하지 않습니다.':''}`
    :migratedEmptyIdentityLedger
    ?`전역 tick ${view.globalTick}의 pre-identity R9 저장을 빈 G07·G08 원장으로 명시 이관했습니다. 과거 전법 효과는 추론하지 않았습니다.`
    :migratedEmptyAiLedger
    ?`전역 tick ${view.globalTick}의 pre-AI R9 v2 저장을 빈 비활성 AI 원장으로 명시 이관했습니다. 과거 계획이나 실패는 추론하지 않았습니다.`
    :`전역 tick ${view.globalTick}의 통합 저장을 불러왔습니다.`;
}

function migrateOld(){
  const old=localStorage.getItem(SAVE_KEY);
  if(!old)throw new Error('보존된 I1 v3 저장이 없습니다.');
  runtime=migrateFirst3V3Save(old,{inputs,losRules,growthPool,cityEconomy});
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  selectedTarget=Object.keys(view.world.knowledge.observedArmies)[0]??null;
  selectedG03AreaTileIds=[];
  notice='I1 v3 저장을 메모리에서 명시적으로 읽었습니다. 원본 키는 그대로이며, 새 저장 버튼을 눌러야 I2 키에 기록됩니다.';
}

function migrateRuntimeV1(){
  const old=localStorage.getItem(FIRST3_RUNTIME_V1_SAVE_KEY);
  if(!old)throw new Error('보존된 I2 v1 저장이 없습니다.');
  runtime=migrateFirst3RuntimeV1Save(old,{inputs,losRules,growthPool,cityEconomy});
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  selectedTarget=Object.keys(view.world.knowledge.observedArmies)[0]??null;
  selectedG03AreaTileIds=[];
  notice='I2 v1 저장을 메모리에서 명시적으로 읽어 역사 원장이 포함된 v2로 이관했습니다. 원본 v1 키는 그대로이며, 저장 버튼을 눌러야 v2 키에 기록됩니다.';
}

function migrateRuntimeV2R5(){
  const old=localStorage.getItem(FIRST3_RUNTIME_SAVE_KEY);
  if(!old)throw new Error('보존된 I2 v2 저장이 없습니다.');
  const r5=migrateFirst3RuntimeV2R5Save(old,{inputs,losRules});
  runtime=migrateFirst3RuntimeV2R6Save(serializeFirst3Runtime(r5,{inputs,losRules}),{inputs,losRules,cityEconomy});
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  selectedTarget=Object.keys(view.world.knowledge.observedArmies)[0]??null;
  selectedG03AreaTileIds=[];
  notice='ROUND-04 I2 v2 저장을 R5 임무·성장과 R6 도시 정산으로 메모리에서 이관했습니다. 원본 저장은 새 저장 버튼을 누르기 전까지 그대로입니다.';
}

function saveRuntime(){
  localStorage.setItem(FIRST3_RUNTIME_SAVE_KEY,serializeFirst3Runtime(runtime,{inputs,losRules}));
  notice=`전역 tick ${runtime.committedGlobalTick} 경계의 world·전투·도시 정산·처리 ID를 한 번에 저장했습니다.`;
}

function currentAction(view){
  const actorId=view.world.ui.selectedArmyId,targetId=selectedTarget;
  if(!actorId)return {available:false,reason:'아군 부대를 선택하세요.'};
  if(!targetId||!view.world.knowledge.observedArmies[targetId])return {available:false,reason:'현재 관측된 적 대상을 선택하세요.'};
  if(view.combat.commands.some(command=>command.actorRef===actorId&&command.status==='RESERVED'))return {available:false,reason:'선택 부대가 이미 명령을 준비 중입니다.'};
  const actor=view.world.ownArmies[actorId],target=view.world.knowledge.observedArmies[targetId];
  if(!actor)return {available:false,reason:'행동 가능한 아군 부대를 선택하세요.'};
  const detachmentReason=detachmentArmyLockReason(view,actorId);
  if(detachmentReason)return {available:false,reason:detachmentReason};
  if(view.strategic.characters[actor.commanderId]?.assignmentId)return {available:false,reason:'이 장수는 국가 임무를 수행 중입니다.'};
  const distance=tileDistance(actor.tileId,target.tileId),trial=trialByFaction[view.world.factionId];
  const lifecycleReason=actionId=>{
    const quote=view.combat.units[actorId].actionAvailability[actionId];
    if(!quote||quote.available)return null;
    const remaining=Math.max(0,quote.nextAvailableTick-view.globalTick);
    if(quote.reason==='RECOVERY_ACTIVE')return `행동 회복 중입니다. ${remaining}틱 뒤 다시 명령할 수 있습니다.`;
    if(quote.reason==='ACTION_COOLDOWN_ACTIVE')return `해당 행동 재사용 대기 중입니다. ${remaining}틱 남았습니다.`;
    if(quote.reason==='INSUFFICIENT_STAMINA')return `사용 가능 기력이 부족합니다. 필요 ${quote.quotedCost}, 현재 ${quote.availableStamina}.`;
    return '현재 행동 생명주기 조건에서 사용할 수 없습니다.';
  };
  if(actor.troopType==='cavalry'&&trial&&actorId===trial.actorRef&&targetId===trial.targetRef&&actor.tileId===trial.pathTileIds[0]){
    const reason=lifecycleReason('CAVALRY_CHARGE');
    return reason?{available:false,reason}:{available:true,actionId:'CAVALRY_CHARGE',pathTileIds:trial.pathTileIds,label:'돌격 명령',explanation:'돌격은 공개된 이동 경로를 판정하므로 사격 LOS가 막혀 있어도 실행할 수 있습니다.'};
  }
  if(distance===1){const reason=lifecycleReason('BASIC_ATTACK');return reason?{available:false,reason}:{available:true,actionId:'BASIC_ATTACK',pathTileIds:[],label:'기본 공격'};}
  if(actor.troopType==='bow'&&distance>=2&&distance<=3){
    const los=queryRuntimeKnownLos(runtime,{factionId:view.world.factionId,sourceTileId:actor.tileId,targetTileId:target.tileId,losRules});
    if(los.status==='CLEAR'){const reason=lifecycleReason('RANGED_VOLLEY');return reason?{available:false,reason}:{available:true,actionId:'RANGED_VOLLEY',pathTileIds:[],label:'집중 사격'};}
    return {available:false,reason:`공개 시야선이 ${los.status}입니다.`};
  }
  return {available:false,reason:'현재 위치와 병종에서 실행할 수 있는 공격이 없습니다.'};
}

function issueAction(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),choice=currentAction(view);
  if(!choice.available)throw new Error(choice.reason);
  runtime=issueRuntimeCombatCommand(runtime,{actorRef:view.world.ui.selectedArmyId,targetRef:selectedTarget,actionId:choice.actionId,pathTileIds:choice.pathTileIds},{losRules});
  notice=`${choice.label}을 예약했습니다. 실제 기력은 ExecutionCommit 전까지 차감되지 않습니다.`;
}

const stableUiToken=value=>String(value).replace(/[^A-Za-z0-9._:-]/g,'.');
const g21ReasonName={
  G21_DETACHMENT_NOT_COMPLETED:'방통 영입 뒤 20틱 분견 편성을 완료해야 합니다.',
  G21_FIELD_COMMANDER_REQUIRED:'방통이 새 분견 부대를 직접 지휘해야 합니다.',
  G21_SEVENTH_ARMY_REQUIRED:'7번째 분견 부대가 아직 준비되지 않았습니다.',
  G21_RECRUITED_FIELD_COMMANDER_REQUIRED:'방통이 아군 현장 지휘관이어야 합니다.',
  G21_FIELD_COMMANDER_ROLE_REQUIRED:'방통의 현장 지휘 상태를 확인할 수 없습니다.',
  G21_OFFICER_UNAVAILABLE:'방통이 현재 전법을 사용할 수 없는 상태입니다.',
  G21_TROOP_NOT_ALLOWED:'현재 병종은 봉추의 미혹을 쓸 수 없습니다.',
  DETACHMENT_SOURCE_ARMY_LOCKED:'분견 준비 중인 부대는 전법을 쓸 수 없습니다.',
  TARGET_NOT_ENEMY:'적 부대만 대상으로 지정할 수 있습니다.',
  TARGET_NOT_OBSERVED:'현재 관측된 적만 대상으로 지정할 수 있습니다.',
  ACTOR_NOT_ACTIONABLE:'방통 부대가 행동 가능한 상태가 아닙니다.',
  TARGET_INVALID:'대상이 행동 불능입니다.',
  ACTOR_MOVEMENT_ACTIVE:'이동이 끝난 뒤 전법을 쓸 수 있습니다.',
  ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE:'국가 임무 중에는 전법을 쓸 수 없습니다.',
  CONFUSION_ACTION_BLOCKED:'혼란 상태에서는 이 전법을 쓸 수 없습니다.',
  OUT_OF_RANGE:'대상이 사거리 2칸 밖에 있습니다.',
  LOS_BLOCKED:'공개 시야선이 차단되어 있습니다.',
  LOS_UNKNOWN:'공개 시야선이 아직 확인되지 않았습니다.',
  ACTION_COOLDOWN_ACTIVE:'전법 재사용 대기 중입니다.',
  INSUFFICIENT_STAMINA:'방통 부대의 사용 가능 기력이 부족합니다.',
  RECOVERY_ACTIVE:'방통 부대가 행동 회복 중입니다.',
  ACTION_UNAVAILABLE:'현재 공개 조건으로 전법을 쓸 수 없습니다.',
};

const g03ReasonName={
  G03_PLAYER_FIELD_COMMANDER_REQUIRED:'제갈량이 지휘하는 아군 부대를 선택해야 합니다.',
  G03_FIELD_COMMANDER_REQUIRED:'제갈량의 현장 지휘 편성을 먼저 완료해야 합니다.',
  G03_FIELD_COMMANDER_ROLE_REQUIRED:'제갈량의 현장 지휘 상태를 확인할 수 없습니다.',
  G03_OFFICER_UNAVAILABLE:'제갈량이 현재 전법을 사용할 수 없는 상태입니다.',
  G03_TROOP_NOT_ALLOWED:'현재 병종은 반룡의 매듭을 쓸 수 없습니다.',
  DETACHMENT_SOURCE_ARMY_LOCKED:'분견 준비 중인 원부대는 전법을 쓸 수 없습니다.',
  ACTOR_NOT_ACTIONABLE:'제갈량 부대가 행동 가능한 상태가 아닙니다.',
  ACTOR_MOVEMENT_ACTIVE:'이동이 끝난 뒤 전법을 쓸 수 있습니다.',
  ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE:'국가 임무 중에는 전법을 쓸 수 없습니다.',
  CONFUSION_ACTION_BLOCKED:'혼란 상태에서는 이 전법을 쓸 수 없습니다.',
  G03_AREA_REQUIRES_ONE_TO_THREE_TILES:'지도에서 공개된 연결 구역을 1~3칸 선택하세요.',
  DUPLICATE_G03_AREA_TILE:'같은 칸은 한 번만 선택할 수 있습니다.',
  AREA_NOT_CONNECTED:'선택 구역은 서로 이어져야 합니다.',
  NO_OBSERVED_HOSTILE_IN_AREA:'선택 구역 안에 현재 관측된 적이 있어야 합니다.',
  ACTION_COOLDOWN_ACTIVE:'반룡의 매듭이 재사용 대기 중입니다.',
  INSUFFICIENT_STAMINA:'제갈량 부대의 사용 가능 기력이 부족합니다.',
  RECOVERY_ACTIVE:'제갈량 부대가 행동 회복 중입니다.',
  ACTION_UNAVAILABLE:'현재 공개 조건으로 전법을 쓸 수 없습니다.',
};

function g03ReasonText(reasonCode){
  if(g03ReasonName[reasonCode])return g03ReasonName[reasonCode];
  if(String(reasonCode).startsWith('AREA_TILE_'))return '모든 구역 칸은 사거리 3 안의 현재 보이는 칸이어야 합니다.';
  if(String(reasonCode).startsWith('LOS_'))return '모든 구역 칸에 공개 시야선이 확보되어야 합니다.';
  return g03ReasonName.ACTION_UNAVAILABLE;
}

function connectedTileIds(tileIds){
  if(tileIds.length<2)return true;
  const remaining=new Set(tileIds),open=[tileIds[0]];remaining.delete(tileIds[0]);
  while(open.length){
    const current=open.pop();
    for(const candidate of [...remaining])if(tileDistance(current,candidate)===1){remaining.delete(candidate);open.push(candidate);}
  }
  return remaining.size===0;
}

function g03SelectableTileIds(view){
  const actorRef=view.world.ui.selectedArmyId,actor=view.world.ownArmies[actorRef];
  if(!actor||actor.commanderId!=='G03')return [];
  return Object.values(view.world.tiles).filter(tile=>{
    if(view.world.knowledge.tiles[tile.tileId]!=='VISIBLE'||tileDistance(actor.tileId,tile.tileId)>3)return false;
    try{return queryRuntimeKnownLos(runtime,{factionId:view.world.factionId,sourceTileId:actor.tileId,targetTileId:tile.tileId,losRules}).status==='CLEAR';}
    catch{return false;}
  }).map(tile=>tile.tileId).sort();
}

function toggleG03AreaTile(tileId){
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  if(!g03SelectableTileIds(view).includes(tileId))throw new Error('사거리 3 안의 현재 보이는 CLEAR LOS 칸만 선택할 수 있습니다.');
  let next=selectedG03AreaTileIds.includes(tileId)?selectedG03AreaTileIds.filter(id=>id!==tileId):[...selectedG03AreaTileIds,tileId];
  if(next.length>3)throw new Error('반룡의 매듭 구역은 최대 3칸입니다.');
  next=[...next].sort();
  if(!connectedTileIds(next))throw new Error('반룡의 매듭 구역은 서로 이어진 칸이어야 합니다.');
  selectedG03AreaTileIds=next;
  notice=next.length?`반룡의 매듭 구역 ${next.length}칸을 선택했습니다.`:'반룡의 매듭 구역 선택을 비웠습니다.';
}

function currentG03Tactic(view){
  const actorRef=view.world.ui.selectedArmyId;
  if(!actorRef)return {actionId:'ART-G03',available:false,reasonCode:'G03_FIELD_COMMANDER_REQUIRED'};
  if(view.combat.commands.some(command=>command.actorRef===actorRef&&command.status==='RESERVED'))return {actionId:'ART-G03',available:false,reasonCode:'ACTION_UNAVAILABLE'};
  return getRuntimeG03SlowTacticAvailability(runtime,{actorRef,areaTileIds:selectedG03AreaTileIds},{losRules});
}

function issueG03Tactic(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),choice=currentG03Tactic(view);
  if(!choice.available)throw new Error(g03ReasonText(choice.reasonCode));
  const actorRef=view.world.ui.selectedArmyId,areaToken=selectedG03AreaTileIds.map(stableUiToken).join('-');
  const requestId=`UI:R8G4:ART-G03:${view.globalTick}:${stableUiToken(actorRef)}:${areaToken}`;
  runtime=issueRuntimeG03SlowTactic(runtime,{requestId,actorRef,areaTileIds:selectedG03AreaTileIds},{losRules});
  notice='반룡의 매듭을 준비했습니다. 10틱 뒤 대상별 둔화 또는 저항 결과만 공개합니다.';
}

const identityReasonName={
  G07_PLAYER_COMMANDER_REQUIRED:'조조가 지휘하는 아군 부대를 선택해야 합니다.',
  G08_PLAYER_COMMANDER_REQUIRED:'손권이 지휘하는 아군 부대를 선택해야 합니다.',
  OBSERVED_ENEMY_REQUIRED:'현재 관측된 적을 하나 선택해야 합니다.',
  ELIGIBLE_ALLY_REQUIRED:'인접한 다른 병종 아군 중 사기가 회복될 부대가 필요합니다.',
  ACTION_PENDING:'선택 부대가 이미 명령을 준비 중입니다.',
  ACTOR_NOT_ACTIONABLE:'선택 부대가 현재 행동할 수 없습니다.',
  ACTOR_MOVEMENT_ACTIVE:'이동이 끝난 뒤 전법을 쓸 수 있습니다.',
  ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE:'국가 임무 중에는 전법을 쓸 수 없습니다.',
  CONFUSION_ACTION_BLOCKED:'혼란 상태에서는 전법을 쓸 수 없습니다.',
  ACTION_COOLDOWN_ACTIVE:'전법 재사용 대기 중입니다.',
  INSUFFICIENT_STAMINA:'사용 가능 기력이 20보다 적습니다.',
};

function identitySourceReason(view,actor,commanderId,runtimeOwner){
  if(!actor||actor.commanderId!==commanderId)return `${commanderId}_PLAYER_COMMANDER_REQUIRED`;
  if(view.combat.commands.some(command=>command.actorRef===actor.armyId&&command.status==='RESERVED'))return 'ACTION_PENDING';
  const unit=view.combat.units[actor.armyId];
  if(!unit||unit.currentHp<=0||unit.activePersonnel<=0||unit.routePending)return 'ACTOR_NOT_ACTIONABLE';
  if(actor.movementState||actor.currentOrder?.type==='MOVE')return 'ACTOR_MOVEMENT_ACTIVE';
  if(view.strategic.characters[commanderId]?.assignmentId)return 'ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE';
  if(unit.conditions.some(condition=>condition.statusKey==='CONFUSION'))return 'CONFUSION_ACTION_BLOCKED';
  if((actor.cooldowns??[]).some(cooldown=>cooldown.runtimeOwner===runtimeOwner&&cooldown.endGlobalTickExclusive>view.globalTick))return 'ACTION_COOLDOWN_ACTIVE';
  if(unit.stamina-unit.reservedStamina<20)return 'INSUFFICIENT_STAMINA';
  return null;
}

function currentG07Tactic(view){
  const actor=view.world.ownArmies[view.world.ui.selectedArmyId],reasonCode=identitySourceReason(view,actor,'G07','ART-G07');
  if(reasonCode)return {available:false,reasonCode};
  if(!selectedTarget||!view.world.knowledge.observedArmies[selectedTarget])return {available:false,reasonCode:'OBSERVED_ENEMY_REQUIRED'};
  return {available:true,reasonCode:null};
}

function g08EligibleAllies(view,actor){
  if(!actor)return [];
  return Object.values(view.world.ownArmies).filter(army=>{
    const unit=view.combat.units[army.armyId];
    return army.armyId!==actor.armyId&&army.troopType!==actor.troopType&&tileDistance(army.tileId,actor.tileId)===1&&unit&&unit.currentHp>0&&unit.activePersonnel>0&&!unit.routePending&&unit.morale<100;
  }).sort((left,right)=>left.armyId.localeCompare(right.armyId)).slice(0,2);
}

function currentG08Tactic(view){
  const actor=view.world.ownArmies[view.world.ui.selectedArmyId],reasonCode=identitySourceReason(view,actor,'G08','ART-G08');
  if(reasonCode)return {available:false,reasonCode,eligibleAllies:[]};
  const eligibleAllies=g08EligibleAllies(view,actor);
  return eligibleAllies.length?{available:true,reasonCode:null,eligibleAllies}:{available:false,reasonCode:'ELIGIBLE_ALLY_REQUIRED',eligibleAllies};
}

function issueG07Tactic(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),choice=currentG07Tactic(view);
  if(!choice.available)throw new Error(identityReasonName[choice.reasonCode]);
  const actorRef=view.world.ui.selectedArmyId,requestId=`UI:R9G7:ART-G07:${view.globalTick}:${stableUiToken(actorRef)}:${stableUiToken(selectedTarget)}`;
  runtime=issueRuntimeG07CommandCoordination(runtime,{requestId,actorRef,targetRef:selectedTarget},{losRules});
  notice='난세의 군령을 준비했습니다. 10틱 뒤 다음 합법 기본 공격 1회의 실행 순서 조율 여부를 공개합니다.';
}

function issueG08Tactic(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),choice=currentG08Tactic(view);
  if(!choice.available)throw new Error(identityReasonName[choice.reasonCode]);
  const actorRef=view.world.ui.selectedArmyId,requestId=`UI:R9G7:ART-G08:${view.globalTick}:${stableUiToken(actorRef)}`;
  runtime=issueRuntimeG08BannerTactic(runtime,{requestId,actorRef},{losRules});
  notice='벽안의 군기를 준비했습니다. 10틱 뒤 현재 인접한 적합 아군의 공개 사기 결과를 표시합니다.';
}

function completeG03FieldTransition(){
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  runtime=completeRuntimeG03FieldTransitionWorkTrial(runtime,{requestId:`UI:R8G4:G03-FIELD:${view.globalTick}`},{losRules});
  runtime=selectRuntimeArmy(runtime,{armyId:'U-F02-G05',losRules});
  selectedG03AreaTileIds=[];
  notice='WORK_TRIAL 재편 완료: 기존 유비군을 창병으로 재편하고 미축 태수·제갈량 현장 지휘관으로 교대했습니다.';
}

function buildG03TransitionPanel(view){
  if(view.scenarioMode==='FIRST3')return '<section class="card g03-transition"><div class="eyebrow">제갈량 현장 교대</div><p class="note">정상 캠페인의 보직 교대는 아직 연결되지 않았습니다. 현재 G03→G21 조합 검증은 별도 전투 시험에서만 가능합니다.</p></section>';
  if(view.world.factionId!=='F02')return '';
  const city=view.world.ownCities.east,army=view.world.ownArmies['U-F02-G05'];
  const before=city?.governorId==='G03'&&army?.commanderId==='G05'&&army?.troopType==='militia';
  const completed=city?.governorId==='G05'&&army?.commanderId==='G03'&&army?.troopType==='spear';
  if(completed)return `<section class="card g03-transition"><div class="eyebrow">G03 현장 전환 · 완료</div><p><strong>제갈량</strong>이 기존 창병 부대 하나를 지휘하고 <strong>미축</strong>이 동쪽 도시 태수를 맡습니다.</p><p class="note">병력·부대·자원을 새로 만들지 않았습니다. 생산 비용과 시간은 아직 WORK_TRIAL 확정 전입니다.</p></section>`;
  return `<section class="card g03-transition"><div class="eyebrow">G03 현장 전환 · WORK_TRIAL</div><p>기존 유비 의병을 창병으로 재편한 뒤 미축과 제갈량의 태수·지휘관 보직을 원자 교대합니다.</p><p class="note">새 부대나 무료 병력은 만들지 않습니다. 진행 중 전투·이동·임무가 있으면 runtime이 거부합니다.</p><div class="actions"><button class="primary" data-g03-transition ${before?'':'disabled'}>재편·보직 교대 완료</button></div></section>`;
}

function currentG21Tactic(view){
  const actorRef=view.world.ui.selectedArmyId,targetRef=selectedTarget;
  if(!actorRef)return {available:false,reasonCode:'G21_FIELD_COMMANDER_REQUIRED'};
  if(!targetRef||!view.world.knowledge.observedArmies[targetRef])return {available:false,reasonCode:'TARGET_NOT_OBSERVED'};
  if(view.combat.commands.some(command=>command.actorRef===actorRef&&command.status==='RESERVED'))return {available:false,reasonCode:'ACTION_UNAVAILABLE'};
  return getRuntimeG21ConfusionTacticAvailability(runtime,{actorRef,targetRef},{losRules});
}

function issueG21Tactic(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),choice=currentG21Tactic(view);
  if(!choice.available)throw new Error(g21ReasonName[choice.reasonCode]??g21ReasonName.ACTION_UNAVAILABLE);
  const actorRef=view.world.ui.selectedArmyId,targetRef=selectedTarget;
  const requestId=`UI:R7E2:ART-G21:${view.globalTick}:${stableUiToken(actorRef)}:${stableUiToken(targetRef)}`;
  runtime=issueRuntimeG21ConfusionTactic(runtime,{requestId,actorRef,targetRef},{losRules});
  notice='봉추의 미혹을 준비했습니다. 8틱 뒤 결과가 공개되며, 적의 판정 수치와 의도는 표시하지 않습니다.';
}

function prepareG21WorkTrial(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),detachment=view.detachment;
  const actorRef=detachment?.newArmyId,targetRef=selectedTarget??Object.keys(view.world.knowledge.observedArmies)[0];
  if(!actorRef||!targetRef)throw new Error('방통 분견 부대와 관측된 적이 필요합니다.');
  runtime=prepareRuntimeG21ConfusionWorkTrial(runtime,{actorRef,targetRef},{losRules});
  runtime=selectRuntimeArmy(runtime,{armyId:actorRef,losRules});
  selectedTarget=targetRef;
  notice='WORK_TRIAL 시험 배치: 방통과 관측된 적을 공개 사거리·CLEAR LOS 위치에 배치했습니다. 일반 이동 명령이 아닙니다.';
}

function advance(count){
  runtime=executeFirst3RuntimeTicks(runtime,{count,losRules,growthPool});
  const view=getFirst3RuntimePublicView(runtime,{losRules}),commit=view.combat.lastCommit;
  const detachment=view.detachment;
  notice=detachment?.status==='PREPARING'
    ?`${count}틱 진행: 분견 편성 준비가 ${detachment.remainingTicks}틱 남았습니다.`
    :detachment?.status==='CANCELLED'
      ?`${count}틱 진행: 분견 편성이 ${detachment.cancelReason??'조건 변경'}으로 취소됐습니다.`
      :commit.executedActionIds.length?`${count}틱 진행: 명령 결과를 원자 반영했습니다.`:commit.cancelledActionIds.length?`${count}틱 진행: 공개 조건 변경으로 명령이 취소됐습니다.`:`${count}틱 진행했습니다.`;
}

function startTraining(characterId){
  runtime=startRuntimeTraining(runtime,{requestId:`UI:${runtime.committedGlobalTick}:${characterId}`,characterId},{losRules});
  notice='국가 행동력 1을 사용해 200틱 훈련을 시작했습니다.';
}

function admitFieldInspection(opportunityId){
  runtime=admitRuntimeFieldInspection(runtime,{opportunityId},{losRules});
  notice='후속 전선 확인을 채택했습니다. 국가 행동력 1을 사용했으며 실제 부대 이동과 현장 관측이 필요합니다.';
}

function moveFieldInspection(assignmentId){
  runtime=issueRuntimeFieldInspectionMove(runtime,{assignmentId},{losRules});
  notice='기존 MOVE 경로로 전선 확인 지점 또는 인접 칸을 향해 이동 명령을 냈습니다.';
}

function cancelFieldInspection(assignmentId){
  runtime=cancelRuntimeFieldInspection(runtime,{assignmentId},{losRules});
  notice='전선 확인을 취소했습니다. 사용한 국가 행동력은 돌아오지 않으며 성공 기억과 XP는 생기지 않습니다.';
}

function pickGrowth(draftId,traitId,expectedRevision){
  runtime=applyRuntimeGrowthDraftAction(runtime,{requestId:`UI:GROWTH:${draftId}:${traitId}:${expectedRevision}`,draftId,expectedRevision,action:'PICK',selectedTraitId:traitId},{losRules});
  notice='성장 후보를 선택해 장수 성장 원장과 저장에 반영했습니다.';
}

function startRecruitment(){runtime=startRuntimeRecruitment(runtime,{candidateId:'G21',agentOfficerId:null,losRules});notice='방통 채용을 제안했습니다. 인망 50은 합의 전까지 예약되며 다음 턴에 협의합니다.';}
function cancelRecruitment(proposalId){runtime=cancelRuntimeRecruitment(runtime,{proposalId,losRules});notice='합의 전 채용 제안을 취소해 예약 인망을 해제했습니다.';}

const DETACHMENT_MINIMUM_SOURCE_REMAINDER=50;

function resetDetachmentDraft(){
  detachmentSourceArmyId=null;
  detachmentTransferTroopCount=null;
  selectedDetachmentDeploymentTileId=null;
}

function ownedCityForArmy(view,army){
  return Object.values(view.world.ownCities??{}).find(city=>city.tileId===army.tileId)??null;
}

function detachmentSourceCandidates(view){
  const g21=view.world.officers.G21;
  if(!g21||g21.allegianceFactionId!==view.world.factionId)return [];
  const g21Available=g21.lifeState==='ALIVE'&&g21.conditionState==='NORMAL'&&g21.captivityState==='FREE'&&g21.travelState==='STATIONARY'&&g21.locationRef?.kind==='CITY';
  if(!g21Available)return [];
  return Object.values(view.world.ownArmies).filter(army=>{
    const city=ownedCityForArmy(view,army);
    return city!==null
      && army.commanderId!=='G21'
      && g21.locationRef.id===city.cityId
      && g21.allowedTroops.includes(army.troopType)
      && army.troopCount>DETACHMENT_MINIMUM_SOURCE_REMAINDER
      && army.currentOrder===null
      && army.movementState===null
      && army.retreatState===null
      && army.engagedArmyIds.length===0;
  }).sort((a,b)=>a.armyId.localeCompare(b.armyId));
}

function selectedDetachmentSource(view){
  const candidates=detachmentSourceCandidates(view);
  return candidates.find(army=>army.armyId===detachmentSourceArmyId)??candidates[0]??null;
}

function detachmentTransferFor(army){
  if(!army)return null;
  const maximum=army.troopCount-DETACHMENT_MINIMUM_SOURCE_REMAINDER;
  const fallback=Math.min(100,maximum);
  const requested=Number(detachmentTransferTroopCount);
  return Number.isInteger(requested)&&requested>=1&&requested<=maximum?requested:fallback;
}

function generatedDetachmentArmyId(view){
  const base=`U-${view.world.factionId}-G21`;
  const ownIds=new Set(Object.keys(view.world.ownArmies));
  let candidate=base,sequence=2;
  while(ownIds.has(candidate)){candidate=`${base}-${sequence}`;sequence++;}
  return candidate;
}

function detachmentArmyLockReason(view,armyId){
  const detachment=view.detachment;
  return detachment?.status==='PREPARING'&&detachment.sourceArmyId===armyId?'분견 편성 준비 중인 원부대는 이동·전투 명령을 낼 수 없습니다.':null;
}

function detachmentOfficerIsLocked(view,officerId){
  const detachment=view.detachment;
  if(detachment?.status!=='PREPARING')return false;
  const source=view.world.ownArmies[detachment.sourceArmyId];
  return officerId===detachment.officerId||officerId===source?.commanderId;
}

function detachmentDeploymentCandidates(view,detachment){
  if(!detachment||detachment.status!=='PREPARING')return [];
  const city=view.world.ownCities?.[detachment.cityId];
  if(!city)return [];
  const occupied=new Set([
    ...Object.keys(view.world.ownArmies),
    ...Object.keys(view.world.knowledge.observedArmies),
  ].map(armyId=>(view.world.ownArmies[armyId]??view.world.knowledge.observedArmies[armyId]).tileId));
  return Object.values(view.world.tiles)
    .filter(tile=>view.world.knowledge.tiles[tile.tileId]==='VISIBLE'
      && tile.terrainType
      && tile.terrainType!=='water'
      && tileDistance(city.tileId,tile.tileId)===1
      && !occupied.has(tile.tileId))
    .sort((a,b)=>a.tileId.localeCompare(b.tileId));
}

function scheduleDetachment(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),source=selectedDetachmentSource(view);
  if(!source)throw new Error('방통이 영입되어 같은 아군 도시의 편성 가능한 부대가 있어야 합니다.');
  const city=ownedCityForArmy(view,source),transferTroopCount=detachmentTransferFor(source);
  if(!city||transferTroopCount===null)throw new Error('분견 편성 조건을 다시 확인하세요.');
  const newArmyId=generatedDetachmentArmyId(view);
  runtime=scheduleRuntimeDetachment(runtime,{
    requestId:`UI:R7E1:DETACH:${view.globalTick}:${source.armyId}:${newArmyId}`,
    sourceArmyId:source.armyId,
    officerId:'G21',
    cityId:city.cityId,
    newArmyId,
    transferTroopCount,
  },{losRules});
  detachmentSourceArmyId=source.armyId;
  detachmentTransferTroopCount=transferTroopCount;
  selectedDetachmentDeploymentTileId=null;
  notice=`${view.world.officers.G21.name}이 ${source.troopCount}명 중 ${transferTroopCount}명을 재편할 준비를 시작했습니다. 20틱 동안 원부대와 장수는 잠깁니다.`;
}

function cancelDetachment(preparationId){
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  runtime=cancelRuntimeDetachment(runtime,{requestId:`UI:R7E1:CANCEL:${view.globalTick}:${preparationId}`,preparationId},{losRules});
  selectedDetachmentDeploymentTileId=null;
  notice='분견 편성을 취소했습니다. 새 부대나 병력 변화는 만들지 않았습니다.';
}

function completeDetachment(preparationId){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),detachment=view.detachment;
  const candidates=detachmentDeploymentCandidates(view,detachment);
  if(!candidates.some(tile=>tile.tileId===selectedDetachmentDeploymentTileId))throw new Error('공개된 인접 빈 육상 타일을 선택하세요.');
  const deploymentRequestTileId=selectedDetachmentDeploymentTileId.replaceAll(',','.');
  runtime=completeRuntimeDetachment(runtime,{
    requestId:`UI:R7E1:COMPLETE:${view.globalTick}:${preparationId}:${deploymentRequestTileId}`,
    preparationId,
    deploymentTileId:selectedDetachmentDeploymentTileId,
  },{losRules});
  notice='분견 편성을 완료했습니다. 방통이 새 부대 하나를 지휘하며 원부대의 실제 병력 일부만 옮겼습니다.';
}

function buildDetachmentPanel(view){
  const g21=view.world.officers.G21,detachment=view.detachment;
  if(detachment){
    const source=view.world.ownArmies[detachment.sourceArmyId],officer=view.world.officers[detachment.officerId];
    if(detachment.status==='PREPARING'){
      const ready=detachment.remainingTicks===0,candidates=detachmentDeploymentCandidates(view,detachment);
      if(!candidates.some(tile=>tile.tileId===selectedDetachmentDeploymentTileId))selectedDetachmentDeploymentTileId=null;
      const deploymentChoices=candidates.length?candidates.map(tile=>`<button data-detachment-deployment="${esc(tile.tileId)}" aria-pressed="${selectedDetachmentDeploymentTileId===tile.tileId}">${esc(tile.tileId)} · ${esc(tile.terrainType)}</button>`).join(''):'<span class="note">현재 공개된 인접 빈 육상 타일이 없습니다.</span>';
      return `<section class="card detachment"><div class="eyebrow">분견 편성 · 준비 중</div><div class="proof"><div><span class="note">원부대</span><strong>${esc(source?.armyId??detachment.sourceArmyId)}</strong></div><div><span class="note">지휘관</span><strong>${esc(officer?.name??detachment.officerId)}</strong></div><div><span class="note">남은 준비</span><strong>${detachment.remainingTicks}틱</strong></div></div><p class="note">원부대와 ${esc(officer?.name??detachment.officerId)}은 이동·전투·훈련·다른 배치를 할 수 없습니다. 일기토나 부장 배치는 만들지 않습니다.</p>${ready?`<p>전개할 공개 인접 빈 육상 타일을 선택하세요.</p><div class="actions deployment-options">${deploymentChoices}</div><div class="actions"><button class="primary" data-detachment-complete="${esc(detachment.preparationId)}" ${selectedDetachmentDeploymentTileId?'':'disabled'}>선택한 타일에 새 부대 전개</button></div>`:`<div class="actions"><button data-detachment-run="${esc(detachment.preparationId)}">${detachment.remainingTicks}틱 진행해 편성 준비</button></div>`}<div class="actions"><button class="danger" data-detachment-cancel="${esc(detachment.preparationId)}">분견 편성 취소</button></div></section>`;
    }
    if(detachment.status==='COMPLETED'){
      const placement=view.world.factionId==='F02'
        ?'<div class="trial-callout"><strong>ROUND-08 정상 연결</strong> · 현재 전개 위치와 공개된 적을 그대로 사용합니다. 별도 순간이동 없이 G03 둔화 뒤 G21 연계를 확인하세요.</div>'
        :'<div class="trial-callout"><strong>WORK_TRIAL</strong> · 실제 이동을 대체하지 않는 R7 전법 연결 시험입니다. 방통과 관측된 적을 사거리·CLEAR LOS 위치로만 옮깁니다.</div><div class="actions"><button data-g21-work-trial>전법 시험 배치</button></div>';
      return `<section class="card detachment"><div class="eyebrow">분견 편성 · 완료</div><p><strong>${esc(g21?.name??detachment.officerId)}</strong>이 새 부대 ${esc(detachment.newArmyId)}를 지휘합니다.</p><p class="note">전개 ${esc(detachment.deploymentTileId)} · 실제 병력 ${detachment.transferTroopCount}명만 원부대에서 분리했습니다. 한 부대 한 장수 원칙을 유지합니다.</p>${placement}</section>`;
    }
    return `<section class="card detachment"><div class="eyebrow">분견 편성 · 취소</div><p class="note">${esc(detachment.cancelReason??'조건 변경')}으로 편성이 끝났습니다. 새 부대나 무료 병력은 생기지 않았습니다.</p></section>`;
  }
  if(!g21)return `<section class="card detachment"><div class="eyebrow">분견 편성 · 방통</div><p class="note">방통을 인망으로 영입하고 명부 등록을 마친 뒤에만 기존 부대를 분리해 배치할 수 있습니다.</p></section>`;
  const candidates=detachmentSourceCandidates(view),source=selectedDetachmentSource(view);
  if(!candidates.length)return `<section class="card detachment"><div class="eyebrow">분견 편성 · 방통</div><p class="note">방통이 같은 아군 도시에 정상 대기하고, 명령·이동·교전이 없는 허용 병종의 원부대가 최소 51명 이상 있어야 합니다.</p></section>`;
  const city=ownedCityForArmy(view,source),transfer=detachmentTransferFor(source),maximum=source.troopCount-DETACHMENT_MINIMUM_SOURCE_REMAINDER;
  const sourceButtons=candidates.map(army=>{const candidateCity=ownedCityForArmy(view,army);return `<button data-detachment-source="${esc(army.armyId)}" aria-pressed="${army.armyId===source.armyId}">${esc(view.world.officers[army.commanderId].name)} · ${TROOPS[army.troopType]} · ${candidateCity?.name??candidateCity?.cityId}</button>`;}).join('');
  return `<section class="card detachment"><div class="eyebrow">분견 편성 · 방통</div><p>방통에게 기존 아군 부대의 실제 현역병 일부를 맡깁니다. 도시 예비병을 만들거나 병종을 바꾸지 않습니다.</p><div class="actions">${sourceButtons}</div><label class="detachment-transfer" for="detachment-transfer">옮길 현역병 <input id="detachment-transfer" type="number" min="1" max="${maximum}" step="1" value="${transfer}"/> / 최대 ${maximum}명</label><p class="note">${esc(city.name)} 주둔 원부대에 최소 ${DETACHMENT_MINIMUM_SOURCE_REMAINDER}명은 남깁니다. 새 부대 ID: ${esc(generatedDetachmentArmyId(view))}</p><div class="actions"><button class="primary" data-detachment-start>20틱 분견 편성 시작</button></div></section>`;
}

function mapSvg(view){
  const knowledge=view.world.knowledge,selectedId=view.world.ui.selectedArmyId;
  const g03Selectable=new Set(g03SelectableTileIds(view)),g03Selected=new Set(selectedG03AreaTileIds);
  const tiles=Object.values(view.world.tiles).map(tile=>{
    const sight=knowledge.tiles[tile.tileId],position=point(tile.tileId),terrain=tile.terrainType??'plain';
    const sightClass=sight==='VISIBLE'?'sight-visible':sight==='REMEMBERED'?'sight-remembered':'sight-hidden';
    const blocker=view.los.tileBlocksLOS[tile.tileId]===true?'los-blocker':'';
    const areaClass=g03Selected.has(tile.tileId)?'g03-area-selected':g03Selectable.has(tile.tileId)?'g03-area-selectable':'';
    const areaData=g03Selectable.has(tile.tileId)?` data-g03-area-tile="${esc(tile.tileId)}"`:'';
    return `<polygon class="map-tile terrain-${terrain} ${sightClass} ${blocker} ${areaClass}"${areaData} points="${polygon(position)}"><title>${tile.tileId} · ${sight==='VISIBLE'?'현재 관측':sight==='REMEMBERED'?'기억':'미탐색'}${blocker?' · 공개된 시야 차단':''}${areaClass?' · 반룡의 매듭 구역 선택 가능':''}</title></polygon>`;
  }).join('');
  const cityMarkers=Object.values(knowledge.cities).map(city=>{const position=point(city.tileId);return `<g class="city-marker" transform="translate(${position.x-15} ${position.y-15})">${icon('city')}<title>${esc(city.name)}</title></g>`;}).join('');
  const ownMarkers=Object.values(view.world.ownArmies).map(army=>{const position=point(army.tileId),selected=army.armyId===selectedId;return `<g data-army="${army.armyId}" class="unit-marker ${selected?'is-selected':''}" transform="translate(${position.x-16} ${position.y-16})">${icon(troopIcon[army.troopType])}${selected?icon('selected','selection-ring'):''}<title>${esc(view.world.officers[army.commanderId].name)} · ${TROOPS[army.troopType]}</title></g>`;}).join('');
  const enemyMarkers=Object.values(knowledge.observedArmies).map(army=>{const position=point(army.tileId),selected=army.armyId===selectedTarget,routed=view.combat.units[army.armyId]?.routePending;return `<g data-target="${army.armyId}" data-g03-target-tile="${esc(army.tileId)}" class="unit-marker enemy ${selected?'is-selected':''} ${routed?'is-routed':''}" transform="translate(${position.x-16} ${position.y-16})">${icon(troopIcon[army.troopType])}${selected?icon('selected','selection-ring'):''}${routed?icon('routed'):''}<title>${FACTIONS[army.factionId].name} ${TROOPS[army.troopType]} · 병력과 기력은 미공개</title></g>`;}).join('');
  const end=point('17,13');
  return `<svg class="battle-map" viewBox="0 0 ${end.x+45} ${end.y+45}" role="img" aria-label="공개 관측만 표시한 FIRST3 전투 지도">${tiles}${cityMarkers}${ownMarkers}${enemyMarkers}</svg>`;
}

function ownCard(view,armyId){
  const army=view.world.ownArmies[armyId],unit=view.combat.units[armyId];
  if(!army||!unit)return '<div class="unit"><p>아군 부대를 선택하세요.</p></div>';
  const officer=view.world.officers[army.commanderId];
  return `<article class="unit"><div class="eyebrow">아군 · ${TROOPS[army.troopType]}</div><h2>${esc(officer.name)}</h2><div class="note">(${army.tileId})</div>${army.commanderId==='G24'?`<p><a href="/g24-pilot">장료 파일럿: 새 21개 평가·공통 돌격 시험</a></p>${g24PilotCard?`<details><summary>장료 시험 평가 21개 · 무용 ${esc(g24PilotCard.majorAbilities['무용'])} · 대응형/P01 후보</summary><p>${esc(g24PilotCard.identityLine)}</p><ul>${g24PilotCard.abilities.map(item=>`<li>${esc(item.name)}: ${item.value===null?'미확인':esc(item.value)}</li>`).join('')}</ul><p>UT-G24 Rank 1 효과 꺼짐. 기존 5/20 시험값으로 계산하며 새21은 전투 계산에 사용하지 않습니다.</p></details>`:'<p>장료 시험 평가를 읽는 중입니다.</p>'}`:''}${conditionChips(unit)}<label>병력 ${unit.activePersonnel}</label><div class="meter"><span style="width:${pct(unit.activePersonnel,unit.activePersonnel+unit.woundedPersonnel+unit.deadPersonnel)}%"></span></div><label>사기 ${unit.morale}</label><div class="meter morale"><span style="width:${unit.morale}%"></span></div><label>기력 ${unit.stamina} · 예약 ${unit.reservedStamina}</label><div class="meter stamina"><span style="width:${pct(unit.stamina,army.maxStamina)}%"></span></div><div class="values"><span>HP ${Number(unit.currentHp.toFixed(2))}/${unit.maxHp}</span><span>부상 ${unit.woundedPersonnel}</span><span>전사 ${unit.deadPersonnel}</span><span>${unit.routePending?'패주 대기':'전열 유지'}</span></div></article>`;
}

const conditionName={MOVE_SLOW:'둔화',CONFUSION:'혼란',MENTAL_DISRUPTION_RESISTANCE:'정신 교란 저항'};
function conditionChips(unit){
  const conditions=unit?.conditions??[];
  return conditions.length?`<div class="condition-chips">${conditions.map(condition=>`<span class="condition-chip ${esc(condition.statusKey.toLowerCase())}">${esc(conditionName[condition.statusKey]??condition.statusKey)} · ${condition.remainingTicks}틱</span>`).join('')}</div>`:'';
}

function enemyCard(view,targetId){
  const army=view.world.knowledge.observedArmies[targetId],unit=view.combat.units[targetId];
  if(!army||!unit)return '<div class="unit enemy"><p>현재 관측된 적이 없습니다.</p></div>';
  return `<article class="unit enemy"><div class="eyebrow">관측된 적 · ${TROOPS[army.troopType]}</div><h2>${FACTIONS[army.factionId].name} 부대</h2><div class="note">현재 위치 (${army.tileId})</div>${conditionChips(unit)}<p>병력·HP·사기·기력·cooldown·다음 의도는 공개하지 않습니다.</p><div class="values"><span>병력 미상</span><span>기력 미상</span><span>의도 미상</span><span>${unit.routePending?'패주 상태가 전장에 드러남':'전열 상태 미상'}</span></div></article>`;
}

function commandTimeline(view){
  if(!view.combat.commands.length)return '<li>아직 내린 전투 명령이 없습니다.</li>';
  return view.combat.commands.map(command=>{
    const g21Result=command.actionId==='ART-G21'&&command.outcome?` · ${command.outcome.conditionApplicationStatus==='APPLIED'?'혼란 적용':command.outcome.conditionApplicationStatus==='RESISTED'?'저항':command.outcome.controlResolution==='SUCCESS'?'혼란 판정 성공':command.outcome.controlResolution==='FAILED'?'혼란 판정 실패':'결과 확인'}`:'';
    const g03Results=command.actionId==='ART-G03'&&command.outcome?.targetResults?.length
      ?` · ${command.outcome.targetResults.map(result=>`${esc(result.targetUnitId)} ${result.conditionApplicationStatus==='APPLIED'?'둔화 적용':result.resolution==='RESISTED'?'저항':'적용 없음'}`).join(' / ')}`
      :command.actionId==='ART-G03'&&command.outcome?.resolution==='WHIFF'?' · 대상 없음':'';
    const g07Result=command.actionId==='ART-G07'&&command.outcome
      ?command.outcome.status==='TOKEN_ISSUED'?' · 다음 합법 기본 공격 1회 조율 준비':command.outcome.status==='CANCELLED'?' · 공개 조건 변경으로 취소':''
      :'';
    const g08Result=command.actionId==='ART-G08'&&command.outcome
      ?command.outcome.status==='COMPLETED'&&command.outcome.targetResults.length
        ?` · ${command.outcome.targetResults.map(result=>`${esc(view.world.officers[view.world.ownArmies[result.targetUnitId]?.commanderId]?.name??result.targetUnitId)} 사기 ${result.moraleDelta>=0?'+':''}${result.moraleDelta}`).join(' / ')}`
        :command.outcome.status==='CANCELLED'?' · 공개 조건 변경으로 취소':' · 적합 대상 없음'
      :'';
    const area=command.actionId==='ART-G03'?`<br>구역 ${command.areaTileIds.map(esc).join(' · ')}`:'';
    return `<li><strong>${actionName[command.actionId]??command.actionId}</strong> · ${statusName[command.status]??command.status}<br>tick ${command.issuedGlobalTick} 명령 → ${command.dueGlobalTick} 실행${area}${g21Result}${g03Results}${g07Result}${g08Result}${command.publicReason?` · ${esc(command.publicReason)}`:''}</li>`;
  }).join('');
}

function publicHistory(view){
  if(!view.history.length)return '<li>아직 공개된 역사 기록이 없습니다.</li>';
  return view.history.slice(-6).map(event=>{
    const status=event.resolution?.status??event.outcome?.status;
    const phase=event.actionType?.match(/_START(?:ED)?$/)?'명령 접수':status==='SUCCEEDED'?'결과 확정':status==='FAILED'?'명령 취소':'사건';
    const actionId=event.resolution?.actionId??(event.actionType?.endsWith('_START')?event.actionType.replace(/_START$/,''):event.actionType);
    const action=actionName[actionId]??actionId??'행동';
    return `<li><strong>${esc(action)}</strong> · ${phase}<br>tick ${event.globalTick}${event.placeRef?` · ${esc(event.placeRef.id)}`:''}</li>`;
  }).join('');
}

function terminalFactionName(factionId){return FACTIONS[factionId]?.name??factionId;}

function buildTerminalPanel(view,model){
  if(model===null)return '';
  const armyOutcomes=model.ownArmyOutcomes.length
    ?model.ownArmyOutcomes.map(outcome=>`<li><strong>${esc(view.world.officers[outcome.commanderId]?.name??outcome.commanderId)}</strong> · ${outcome.disposition==='DEFEATED'?'패배':'해산'}<br>부대 ${esc(outcome.armyId)} · tick ${outcome.terminalAtTick}</li>`).join('')
    :'<li>내 패배·해산 부대 결과가 아직 없습니다.</li>';
  const events=model.knownEvents.length
    ?model.knownEvents.map(event=>`<li><strong>${esc(event.summaryCode)}</strong><br>tick ${event.globalTick}</li>`).join('')
    :'<li>알려진 종단 사건이 아직 없습니다.</li>';
  const choices=model.pendingChoices.length
    ?model.pendingChoices.map(choice=>{
      const label=choice.type==='SUCCESSION'?'후계 선택':'점령 선택';
      const subject=choice.type==='SUCCESSION'?'군주 공석':(view.world.ownCities[choice.cityId]?.name??choice.cityId);
      const candidates=choice.candidateOfficerIds.length
        ?`<div class="actions">${choice.candidateOfficerIds.map(officerId=>`<button data-terminal-choice="${esc(choice.choiceId)}" data-terminal-officer="${esc(officerId)}">${esc(view.world.officers[officerId]?.name??officerId)} 임명</button>`).join('')}</div>`
        :'<span class="note">현재 공개된 임명 후보가 없습니다.</span>';
      return `<li><strong>${label}</strong> · ${esc(subject)}<br>${candidates}</li>`;
    }).join('')
    :'<li>내 선택 대기가 없습니다.</li>';
  const prisoners=model.prisonerSummary;
  const result=model.gameResult;
  const resultPanel=result===null
    ?'<p class="note">캠페인 종료 결과가 아직 없습니다.</p>'
    :`<div class="terminal-result"><p><strong>${esc(result.type)}</strong> · ${esc(result.reasonCode)}<br>종료 tick ${result.terminalAtTick}${result.winnerFactionId?` · 승자 ${esc(terminalFactionName(result.winnerFactionId))}`:''}</p><ul class="timeline">${model.terminalReport.factions.map(faction=>`<li><strong>${esc(terminalFactionName(faction.factionId))}</strong> · ${faction.alive?'생존':'멸망'}<br>최종 도시 ${faction.ownedCityCount}</li>`).join('')}</ul></div>`;
  const pendingNotice=model.actionBlocking.command.reasonCode==='TERMINAL_CHOICE_PENDING'
    ?'<p class="note">후계·점령 임명을 마치기 전에는 명령과 시간 진행을 할 수 없습니다. 저장과 선택 해결은 계속 사용할 수 있습니다.</p>'
    :'<p class="note">후보가 없는 임시 점령지는 생산이 멈춘 채 유지되며, 새 공개 후보가 생기기 전까지 선택할 수 없습니다.</p>';
  return `<section class="card terminal" aria-label="공개 종단 현황"><div class="eyebrow">공개 종단 현황 · WORK_TRIAL</div><div class="terminal-grid"><div><strong>내 부대 결과</strong><ul class="timeline">${armyOutcomes}</ul></div><div><strong>알려진 종단 사건</strong><ul class="timeline">${events}</ul></div><div><strong>내 선택 대기 · 후보 확인</strong><ul class="timeline">${choices}</ul>${model.pendingChoices.length?pendingNotice:''}</div><div><strong>포로 요약</strong><div class="proof"><div><span class="note">알려진 합계</span><strong>${prisoners.total}</strong></div><div><span class="note">내 장수</span><strong>${prisoners.homeOfficerCount}</strong></div><div><span class="note">수감 중</span><strong>${prisoners.heldCount}</strong></div></div><p class="note">석방 ${prisoners.releasedCount} · 사망 ${prisoners.deceasedCount} · 내 수감 ${prisoners.custodyCount}</p></div></div><div class="terminal-end"><strong>종료 결과 · 최종 도시 수</strong>${resultPanel}</div></section>`;
}

function resolveTerminalChoice(choiceId,selectedOfficerId){
  const view=getFirst3RuntimePublicView(runtime,{losRules});
  const model=view.terminal===null?null:createCampaignTerminalUiModel(view.terminal);
  const choice=model?.pendingChoices.find(item=>item.choiceId===choiceId);
  if(!choice||!choice.candidateOfficerIds.includes(selectedOfficerId))throw new Error('공개된 선택 후보가 더 이상 유효하지 않습니다.');
  runtime=resolveRuntimeCampaignTerminalChoice(runtime,{
    transactionId:`UI:R9Q:${view.globalTick}:${stableUiToken(choiceId)}:${stableUiToken(selectedOfficerId)}`,
    globalTick:view.globalTick,
    choiceId,
    selectedOfficerId,
    resolutionMode:'PLAYER',
  },{losRules});
  notice=choice.type==='SUCCESSION'?'후계자를 임명했습니다.':'점령지 태수를 임명해 도시를 정상화했습니다.';
}

function disableTerminalActions(model){
  if(!model?.actionBlocking.command.disabled&&!model?.actionBlocking.advance.disabled)return;
  const reason=model.actionBlocking.command.reasonCode??model.actionBlocking.advance.reasonCode??'CAMPAIGN_ENDED';
  const selectors=[
    '#issue','#issue-move','#move-destination','#advance-20','#advance-boundary','#issue-g03','#issue-g07','#issue-g08','#issue-g21','#tick','#due','#finish-training','#to-planning',
    '[data-training]','[data-field-admit]','[data-field-move]','[data-field-run]','[data-field-cancel]','[data-growth-draft]',
    '[data-recruit-start]','[data-recruit-cancel]','[data-recruit-run]','[data-detachment-source]','[data-detachment-start]','[data-detachment-cancel]','[data-detachment-run]','[data-detachment-deployment]','[data-detachment-complete]','[data-g03-transition]','[data-g21-work-trial]','[data-g03-area-tile]','[data-g03-area-remove]',
  ];
  app.querySelectorAll(selectors.join(',')).forEach(button=>{button.disabled=true;button.title=reason;});
  const transfer=app.querySelector('#detachment-transfer');
  if(transfer){transfer.disabled=true;transfer.title=reason;}
}

function renderStart(){
  app.innerHTML=`<section class="card start"><div class="eyebrow">FIRST3 · 캠페인 / 전투 시험</div><div class="title">삼국지 FIRST3 시작</div><p class="sub">정상 캠페인은 원래 위치와 병력에서 시작합니다. 전투 시험은 고유 행동을 확인하기 위한 별도 배치입니다. <a href="/">I1 이동 화면</a></p><div class="start-options">${Object.values(FACTIONS).map(faction=>`<button class="choice" data-faction="${faction.id}" aria-pressed="${selectedFaction===faction.id}"><strong>${esc(faction.name)}</strong><br><span>${esc(faction.concept)}</span></button>`).join('')}</div><label class="ai-toggle" for="strategic-ai-toggle"><input id="strategic-ai-toggle" type="checkbox" ${strategicAiEnabled?'checked':''}/><span><strong>상대 AI 자동 계획 (WORK_TRIAL)</strong><small>새 캠페인과 전투 시험에서 적용합니다. 끄면 상대 세력은 자동 전략 명령을 제출하지 않습니다.</small></span></label><div class="actions"><button class="primary" id="fresh-campaign" ${inputs?'':'disabled'}>정상 캠페인 시작</button><button id="fresh" ${inputs?'':'disabled'}>선택 세력 전투 시험 시작</button><a href="/g24-pilot">장료 파일럿 열기 (별도 시험)</a><button id="load-runtime" ${inputs?'':'disabled'}>통합 저장 불러오기</button><button id="migrate-runtime-v2" ${inputs?'':'disabled'}>ROUND-04 v2 저장 R6 이관</button><button id="migrate-runtime-v1" ${inputs?'':'disabled'}>I2 v1 저장 명시 이관</button><button id="migrate" ${inputs?'':'disabled'}>I1 v3 저장 명시 이관</button></div><p class="status">${esc(notice)}</p><p class="note">구 저장을 불러올 때는 저장 당시 플레이한 세력을 먼저 선택해야 합니다. 기존 저장은 저장된 AI 활성 상태를 그대로 불러옵니다. 본편 초기 배치·10시간 밸런스·완주를 검증한 화면이 아닙니다.</p></section>`;
  app.querySelectorAll('[data-faction]').forEach(button=>button.addEventListener('click',()=>{selectedFaction=button.dataset.faction;renderStart();}));
  app.querySelector('#strategic-ai-toggle').addEventListener('change',event=>{strategicAiEnabled=event.currentTarget.checked;});
  app.querySelector('#fresh-campaign').addEventListener('click',()=>act(freshCampaign));
  app.querySelector('#fresh').addEventListener('click',()=>act(freshTrial));
  app.querySelector('#load-runtime').addEventListener('click',()=>act(loadRuntime));
  app.querySelector('#migrate-runtime-v2').addEventListener('click',()=>act(migrateRuntimeV2R5));
  app.querySelector('#migrate-runtime-v1').addEventListener('click',()=>act(migrateRuntimeV1));
  app.querySelector('#migrate').addEventListener('click',()=>act(migrateOld));
}

function renderGame(){
  const view=getFirst3RuntimePublicView(runtime,{losRules}),actorId=view.world.ui.selectedArmyId;
  const terminalUiModel=view.terminal===null?null:createCampaignTerminalUiModel(view.terminal);
  if(!selectedTarget||!view.world.knowledge.observedArmies[selectedTarget])selectedTarget=Object.keys(view.world.knowledge.observedArmies)[0]??null;
  const choice=currentAction(view),g03Choice=currentG03Tactic(view),g07Choice=currentG07Tactic(view),g08Choice=currentG08Tactic(view),g21Choice=currentG21Tactic(view),pending=view.combat.commands.find(command=>command.actorRef===actorId&&command.status==='RESERVED');
  const completed=view.combat.commands.some(command=>command.actorRef===actorId&&['RESULTS_MERGED','SETTLED','CANCELLED'].includes(command.status));
  const stage=pending?'실행 준비 중':completed?'결과 확인':'명령 준비';
  let knownLos='대상 없음';
  const actor=view.world.ownArmies[actorId],target=view.world.knowledge.observedArmies[selectedTarget];
  if(actor&&target){try{const result=queryRuntimeKnownLos(runtime,{factionId:view.world.factionId,sourceTileId:actor.tileId,targetTileId:target.tileId,losRules});knownLos=`${result.status} · 거리 ${result.distance}`;}catch{knownLos='UNKNOWN';}}
  const dueIn=pending?Math.max(1,pending.dueGlobalTick-view.globalTick):1;
  const selectedOfficerId=actor?.commanderId,characterRecord=selectedOfficerId?view.characterHistory[selectedOfficerId]:null;
  const memoryCount=characterRecord?.memories.length??0,traceCount=characterRecord?.experienceTraces.length??0,growthDraftCount=view.growth?.drafts.length??0;
  const assignments=Object.values(view.strategic.assignments),trainingAssignments=assignments.filter(item=>item.type==='TRAINING'),activeTraining=trainingAssignments.find(item=>item.status==='ACTIVE');
  const trainingCharacters=Object.values(view.strategic.characters).filter(character=>character.roles.includes('TRAINING_SUPERVISOR'));
  const trainingStatus=trainingAssignments.length?trainingAssignments.map(item=>`<li><strong>${esc(view.world.officers[item.characterId]?.name??item.characterId)}</strong> · ${item.status}<br>tick ${item.startedGlobalTick} → ${item.expectedEndGlobalTick}</li>`).join(''):'<li>아직 시작한 훈련이 없습니다.</li>';
  const openField=view.strategic.opportunities.find(item=>item.claimedAssignmentId===null&&view.globalTick<=item.startByTick),activeField=assignments.find(item=>item.type==='FIELD_INSPECTION'&&item.status==='ACTIVE');
  const fieldRecord=activeField??assignments.filter(item=>item.type==='FIELD_INSPECTION').at(-1)??null,planning=view.world.turnPhase==='PLANNING';
  const ticksToPlanning=planning?0:view.world.time.ticksPerTurn-view.world.time.tick;
  const fieldPanel=`<section class="card"><div class="eyebrow">전투 후속 · 전선 확인</div>${openField?`<p><strong>${esc(view.world.officers[openField.actorCharacterId]?.name??openField.actorCharacterId)}</strong>이 전투지 ${esc(openField.targetPlaceRef.id)}를 확인할 수 있습니다.</p><p class="note">시작 기한 tick ${openField.startByTick} · 실제 MOVE와 현재 관측 상태 4틱이 필요합니다.</p><div class="actions">${planning?`<button class="primary" data-field-admit="${openField.opportunityId}" ${view.strategic.budget.remaining<1||detachmentOfficerIsLocked(view,openField.actorCharacterId)?'disabled':''}>전선 확인 채택</button>`:`<button id="to-planning">${ticksToPlanning}틱 진행해 다음 계획 단계</button>`}</div>`:''}${fieldRecord?`<ul class="timeline"><li><strong>${esc(view.world.officers[fieldRecord.characterId]?.name??fieldRecord.characterId)}</strong> · ${fieldRecord.status}<br>목표 ${esc(fieldRecord.targetPlaceRef?.slice(5)??fieldRecord.destinationRef)} · 현장 확인 ${fieldRecord.confirmationTicks??0}/4 · 완료 기한 tick ${fieldRecord.expectedEndGlobalTick}</li></ul>${activeField?`<div class="actions"><button data-field-move="${activeField.assignmentId}" ${planning?'':'disabled'}>기존 MOVE로 현장 이동</button><button data-field-run="${activeField.assignmentId}">이동·현장확인 진행</button><button class="danger" data-field-cancel="${activeField.assignmentId}">임무 취소</button></div>`:''}`:openField?'':'<p class="note">실제 성공한 전투 결과가 공개되면 후속 선택이 열립니다.</p>'}</section>`;
  const visibleTraits=[...growthPool.traits,...(recruitmentContracts?.growthContract?.traitPoolExtension?.traits??[])];
  const traitLabel=traitId=>visibleTraits.find(trait=>trait.traitId===traitId)?.displayName??traitId;
  const compactNumber=value=>Number.isInteger(value)?String(value):String(Number(value.toFixed(3)));
  const growthSummary=Object.entries(view.growth?.progress??{}).map(([characterId,progress])=>{const growth=view.growth.characters[characterId],owned=Object.entries(growth.ownedTraitRanks).filter(([,rank])=>rank>0).map(([traitId,rank])=>`${traitLabel(traitId)} R${rank}`).join(' · ');return `<div class="growth-summary"><p><strong>${esc(view.world.officers[characterId]?.name??characterId)} Lv.${progress.level}</strong> · 현재 XP ${progress.xp} · 누적 ${progress.totalXp} · 적성 ${growth.aptitudePoints}</p><p class="note">보유 특기: ${esc(owned||'없음')}</p></div>`;}).join('');
  const growthOffers=(view.growth?.drafts??[]).filter(draft=>draft.state==='OFFERED').map(draft=>`<div class="growth-offer"><p><strong>${esc(view.world.officers[draft.characterId]?.name??draft.characterId)} 성장 후보</strong></p><div class="actions">${draft.offeredIds.map(traitId=>`<button data-growth-draft="${draft.draftId}" data-growth-trait="${traitId}" data-growth-revision="${draft.offerRevision}">${esc(traitLabel(traitId))} 선택</button>`).join('')}</div></div>`).join('');
  const resolvedGrowth=(view.growth?.drafts??[]).filter(draft=>draft.state==='RESOLVED').map(draft=>`<p class="note">선택 완료: ${esc(traitLabel(draft.selectedTraitId))}</p>`).join('');
  const cityPanels=Object.values(view.citySettlement?.cities??{}).map(city=>`<section class="card"><div class="eyebrow">도시 정산 · ${esc(city.name)}</div><div class="proof"><div><span class="note">가용 식량</span><strong>${city.availableFood}</strong></div><div><span class="note">인구</span><strong>${city.population}/${city.populationCapacity}</strong></div><div><span class="note">유지비</span><strong>${city.latestSettlement?.derivedEconomy?.consumptionRequired??city.derivedEconomy.consumptionRequired}</strong></div></div><p class="note">생산 ${city.derivedEconomy.producedProduction} · 과학 ${city.derivedEconomy.producedScience} · 인망 ${city.derivedEconomy.producedPrestige} · 예약 식량 ${city.reservedFood}</p><p class="note">생산 진행 ${city.productionProgress} · 성장 진행 ${city.growthProgress} · ${city.latestSettlement?`직전 정산 턴 ${city.latestSettlementTurn}`:'다음 계획 단계에서 첫 정산'}</p></section>`).join('');
  const recruitCandidate=view.recruitment?.candidates.find(candidate=>candidate.candidateId==='G21'),recruitProposal=view.recruitment?.proposals.at(-1)??null,recruitAvailable=(view.recruitment?.availablePrestige??0)>=50&&recruitCandidate?.status==='AVAILABLE'&&planning;
  const recruitmentPanel=view.recruitment?`<section class="card"><div class="eyebrow">인망 채용 · 방통</div><div class="proof"><div><span class="note">인망</span><strong>${compactNumber(view.recruitment.availablePrestige)}/${compactNumber(view.recruitment.prestige)}</strong></div><div><span class="note">예약</span><strong>${compactNumber(view.recruitment.reservedPrestige)}</strong></div><div><span class="note">상태</span><strong>${esc(recruitProposal?.status??recruitCandidate.status)}</strong></div></div><p class="note">현재 위치 ${esc(recruitCandidate.currentTileId)}${recruitCandidate.arrivalGlobalTick?` · 도착 예정 tick ${recruitCandidate.arrivalGlobalTick}`:''} · 특기 효과 ${recruitCandidate.effectStatus}</p><div class="actions"><button data-recruit-start ${recruitAvailable?'':'disabled'}>인망 50으로 채용 제안</button>${recruitProposal?.status==='NEGOTIATING'?`<button class="danger" data-recruit-cancel="${recruitProposal.proposalId}">합의 전 취소</button>`:''}${recruitProposal&&!['ACTIVE','CLOSED_PRE_AGREEMENT'].includes(recruitProposal.status)?'<button data-recruit-run>다음 상태까지 진행</button>':''}</div><p class="note">${recruitAvailable?'합의 후 실제 지도 경로를 이동합니다.':recruitCandidate.worldOfficerExists?'도착·명부·성장 등록 완료. 부대 편성은 별도입니다.':planning?'인망 부족·예약 중·이미 진행 중인 제안입니다.':'계획 단계에서만 제안할 수 있습니다.'}</p></section>`:'';
  const transitionPanel=buildG03TransitionPanel(view);
  const detachmentPanel=buildDetachmentPanel(view);
  const terminalPanel=buildTerminalPanel(view,terminalUiModel);
  const aiEnabled=view.strategic.ai.enabled,ownAiFailureCount=view.strategic.ai.failedAttackLedger.length;
  const aiPanel=`<section class="card ai-runtime-status" data-ai-enabled="${aiEnabled}"><div class="eyebrow">상대 AI 자동 계획 · WORK_TRIAL</div><div class="ai-status-row"><span class="badge ${aiEnabled?'is-enabled':'is-disabled'}">${aiEnabled?'활성':'비활성'}</span><strong>${aiEnabled?'계획 단계에서 상대 세력이 공개 정보로 명령을 제출합니다.':'상대 세력 자동 명령 제출이 꺼져 있습니다.'}</strong></div><p class="note">표시 상태는 저장 정본의 공개 facade에서 읽었습니다. 상대의 명령·실패 ID와 숨은 판단은 표시하지 않습니다.</p><p class="note">내 세력의 공개된 실패 공격 기억: ${ownAiFailureCount}건</p></section>`;
  const g03Actor=actor?.commanderId==='G03';
  const g03Selection=selectedG03AreaTileIds.length?selectedG03AreaTileIds.map(tileId=>`<button class="area-chip" data-g03-area-remove="${esc(tileId)}">${esc(tileId)} ×</button>`).join(''):'<span class="note">선택한 구역 없음</span>';
  const g03Panel=`<div class="tactic-box"><strong>반룡의 매듭 · 연결 구역 1~3칸</strong><p class="note">${g03Actor?'지도에서 밝게 테두리 친 공개 칸을 눌러 구역을 고르세요. 구역 안에는 관측된 적이 하나 이상 있어야 합니다.':'제갈량 부대를 선택하면 구역 선택이 열립니다.'}</p><div class="actions area-selection">${g03Selection}</div><div class="actions"><button id="issue-g03" ${g03Choice.available?'':'disabled'} title="${esc(g03ReasonText(g03Choice.reasonCode))}">반룡의 매듭</button></div><p class="note tactic-note">${esc(g03Choice.available?'10틱 준비 뒤 대상별 둔화 또는 저항 결과를 공개합니다.':g03ReasonText(g03Choice.reasonCode))}</p></div>`;
  const coordination=view.combat.identityTactics.coordination.at(-1)??null;
  const g07Progress=coordination
    ?coordination.status==='PENDING'?`조율 준비 · tick ${coordination.validThroughTick}까지`:coordination.status==='CONSUMED'?`기본 공격 조율 완료 · tick ${coordination.consumedAtTick}`:'조율 기한 만료'
    :g07Choice.available?'관측된 적을 대상으로 시전할 수 있습니다.':identityReasonName[g07Choice.reasonCode];
  const g08Targets=g08Choice.eligibleAllies.map(army=>view.world.officers[army.commanderId]?.name??army.armyId).join(' · ');
  const identityPanel=`<div class="tactic-box identity-tactics" aria-label="G07 G08 공개 전법"><strong>세력 고유 전법 · WORK_TRIAL</strong><div class="identity-tactic-row"><div><b>난세의 군령</b><p class="note">관측 적 선택 → 10틱 준비 → 다음 합법 기본 공격 1회 순서 조율</p></div><button id="issue-g07" ${g07Choice.available?'':'disabled'} title="${esc(g07Choice.available?'현재 공개 조건으로 시전 가능':identityReasonName[g07Choice.reasonCode])}">난세의 군령</button></div><p class="identity-public-result">${esc(g07Progress)}</p><div class="identity-tactic-row"><div><b>벽안의 군기</b><p class="note">10틱 준비 뒤 인접한 다른 병종 아군 최대 2부대의 사기를 지원</p></div><button id="issue-g08" ${g08Choice.available?'':'disabled'} title="${esc(g08Choice.available?'현재 공개 조건으로 시전 가능':identityReasonName[g08Choice.reasonCode])}">벽안의 군기</button></div><p class="identity-public-result">${esc(g08Choice.available?`공개 적합 아군: ${g08Targets}`:identityReasonName[g08Choice.reasonCode])}</p></div>`;
  const g21Synergy=actor?.commanderId==='G21'?(g21Choice.slowSynergyCandidate?'둔화 연계 가능 · 이 명령의 다음 실행 batch에서 혼란 지속 증가':'활성 둔화 연계 없음 · 기본 혼란 지속'):'방통 부대를 선택하면 둔화 연계 가능 여부를 확인합니다.';
  app.innerHTML=`<div class="shell"><header class="topbar"><div><div class="eyebrow">삼국지 · 실제 I2 모듈 연결</div><div class="title">${FACTIONS[view.world.factionId].name} 전투 연결 시험</div><div class="sub">제 ${view.world.turnNumber}턴 · 전역 tick ${view.globalTick} · ${view.world.currentDate}일</div></div><span class="badge">${stage}</span></header><section class="card dev"><strong>개발 검토용 시험 배치</strong><div class="note">실존 combat calculator·coordinator·delta applier, 승인 LOS, history ledger를 사용합니다. 본편 초기 배치·AI·완주 결과는 아닙니다.</div></section>${aiPanel}<div class="grid"><div class="stack"><section class="card"><div class="eyebrow">공개 관측 지도</div><div class="map-frame">${mapSvg(view)}</div><div class="legend">${Object.entries(troopIcon).map(([key,symbol])=>`<span>${icon(symbol)} ${TROOPS[key]}</span>`).join('')}${icon('city')} 도시</div><p class="note">황색 점선은 공개된 LOS 차단입니다. 이동 불가 표시는 아닙니다. 미탐색 칸의 차단값과 적 세부값은 렌더 입력에 없습니다.</p></section><section class="card"><div class="eyebrow">전투 상태</div><div class="arena">${ownCard(view,actorId)}<div class="versus">VS</div>${enemyCard(view,selectedTarget)}</div><div class="proof"><div><span class="note">현재 단계</span><strong>${stage}</strong></div><div><span class="note">공개 시야선</span><strong>${knownLos}</strong></div><div><span class="note">저장 경계</span><strong>tick ${view.globalTick}</strong></div></div></section></div><aside class="stack"><section class="card"><div class="eyebrow">부대와 대상</div><div class="actions">${Object.values(view.world.ownArmies).map(army=>`<button data-army="${army.armyId}" aria-pressed="${army.armyId===actorId}">${esc(view.world.officers[army.commanderId].name)} · ${TROOPS[army.troopType]}</button>`).join('')}</div><div class="actions">${Object.values(view.world.knowledge.observedArmies).map(army=>`<button data-target="${army.armyId}" aria-pressed="${army.armyId===selectedTarget}">${FACTIONS[army.factionId].name} ${TROOPS[army.troopType]}</button>`).join('')||'<span class="note">관측된 적 없음</span>'}</div><div class="actions"><button class="primary" id="issue" ${choice.available?'':'disabled'} title="${esc(choice.reason??'공개 조건으로 실행 가능')}">${esc(choice.label??'공격 명령')}</button><button id="issue-g21" ${g21Choice.available?'':'disabled'} title="${esc(g21ReasonName[g21Choice.reasonCode]??'공개 조건으로 실행 가능')}">봉추의 미혹</button><button id="tick">1틱 진행</button><button id="due" ${pending?'':'disabled'}>${pending?`${dueIn}틱 진행해 실행`:'준비 중 명령 없음'}</button></div><p class="note">${esc(choice.available?(choice.explanation??'대상·거리·시야가 공개 조건에서 합법입니다.'):choice.reason)}</p>${g03Panel}<p class="note tactic-note">봉추의 미혹: ${esc(g21Choice.available?'8틱 준비 뒤 혼란 또는 저항 결과를 공개합니다.':g21ReasonName[g21Choice.reasonCode]??g21ReasonName.ACTION_UNAVAILABLE)}</p><p class="synergy-status ${g21Choice.slowSynergyCandidate?'is-ready':''}">${esc(g21Synergy)}</p></section><section class="card"><div class="eyebrow">국가 임무 · 훈련</div><div class="proof"><div><span class="note">이번 턴 행동력</span><strong>${view.strategic.budget.remaining}/${view.strategic.budget.capacity}</strong></div><div><span class="note">사용</span><strong>${view.strategic.budget.committed}</strong></div><div><span class="note">훈련 기간</span><strong>200틱</strong></div></div><div class="actions">${trainingCharacters.map(character=>`<button data-training="${character.characterId}" ${character.assignmentId||detachmentOfficerIsLocked(view,character.characterId)||view.strategic.budget.remaining<1?'disabled':''}>${esc(view.world.officers[character.characterId]?.name??character.characterId)} 훈련</button>`).join('')}</div><div class="actions"><button id="finish-training" ${activeTraining?'':'disabled'}>${activeTraining?`${Math.max(1,activeTraining.expectedEndGlobalTick-view.globalTick)}틱 진행해 완료`:'진행 중 훈련 없음'}</button></div><ul class="timeline">${trainingStatus}</ul>${growthSummary}${growthOffers||'<p class="note">성장 후보 없음</p>'}${resolvedGrowth}</section>${fieldPanel}${transitionPanel}${cityPanels}${recruitmentPanel}${detachmentPanel}<section class="card"><div class="eyebrow">결과 기록</div><ul class="timeline">${commandTimeline(view)}</ul><p class="status">${esc(notice)}</p></section><section class="card"><div class="eyebrow">공개 역사 기록</div><ul class="timeline">${publicHistory(view)}</ul><p class="note">선택 장수 기억 ${memoryCount} · 경험 흔적 ${traceCount} · 생성된 성장 후보 ${growthDraftCount}</p></section><section class="card"><div class="eyebrow">원자 저장과 재개</div><div class="actions"><button id="save">현재 tick 경계 저장</button><button id="load">I2 저장 불러오기</button><button class="quiet" id="restart">새 시험</button></div><p class="save-info">키: ${FIRST3_RUNTIME_SAVE_KEY}<br>world + 전투 원장 + 도시 정산 + 채용 여행/명부 + history/knowledge + character history + 국가 임무 + 성장 진행 + G03 구역 전법 + 둔화 상태 + 분견 준비/완료 영수증 + AI 활성·공개 실패 원장</p><p class="note">도시 정산은 각 턴의 계획 단계 진입 때 한 번만 적용합니다. 현재 수송·시설 손상·다도시 병력 배정은 이 시험 범위에 포함하지 않습니다.</p><p class="note">향후 시각 소비 기준: 세력-생물모티프-디자인문법 v1 및 UX. 현재 심벌·원화에 새 모티프 자산을 적용한 상태가 아닙니다.</p></section></aside></div></div>`;
  app.querySelector('.tactic-box').insertAdjacentHTML('beforebegin',identityPanel);
  app.querySelector('.map-frame').closest('.card').insertAdjacentHTML('afterend',movementPanel(view));
  const campaign=view.scenarioMode==='FIRST3';
  app.querySelector('.topbar .title').textContent=`${FACTIONS[view.world.factionId].name} ${campaign?'정상 캠페인':'전투 시험'}`;
  app.querySelector('.dev').innerHTML=campaign?'<strong>정상 초기 배치 · FIRST3</strong><div class="note">이동·전투·점령·승계·종료가 연결된 시제품입니다. 시험 수치를 사용하며 재미와 최종 밸런스는 검증 중입니다.</div>':'<strong>별도 전투 시험 배치</strong><div class="note">고유 행동의 작동을 확인하는 배치입니다. 정상 캠페인 완주와 구분합니다.</div>';
  app.querySelector('.save-info').insertAdjacentHTML('beforeend','<br>+ G07/G08 전법 원장과 공개 결과');
  app.querySelector('.dev').insertAdjacentHTML('afterend',terminalPanel);
  disableTerminalActions(terminalUiModel);
  app.querySelectorAll('[data-terminal-choice]').forEach(button=>button.addEventListener('click',()=>act(()=>resolveTerminalChoice(button.dataset.terminalChoice,button.dataset.terminalOfficer))));
  app.querySelectorAll('[data-army]').forEach(button=>button.addEventListener('click',()=>act(()=>{runtime=selectRuntimeArmy(runtime,{armyId:button.dataset.army,losRules});selectedG03AreaTileIds=[];})));
  app.querySelectorAll('[data-target]').forEach(button=>button.addEventListener('click',()=>act(()=>{
    selectedTarget=button.dataset.target;
    if(button.dataset.g03TargetTile&&g03SelectableTileIds(getFirst3RuntimePublicView(runtime,{losRules})).includes(button.dataset.g03TargetTile))toggleG03AreaTile(button.dataset.g03TargetTile);
  })));
  app.querySelectorAll('[data-g03-area-tile]').forEach(tile=>tile.addEventListener('click',()=>act(()=>toggleG03AreaTile(tile.dataset.g03AreaTile))));
  app.querySelectorAll('[data-g03-area-remove]').forEach(button=>button.addEventListener('click',()=>act(()=>toggleG03AreaTile(button.dataset.g03AreaRemove))));
  app.querySelector('#issue').addEventListener('click',()=>act(issueAction));
  app.querySelector('#issue-g03').addEventListener('click',()=>act(issueG03Tactic));
  app.querySelector('#issue-g07').addEventListener('click',()=>act(issueG07Tactic));
  app.querySelector('#issue-g08').addEventListener('click',()=>act(issueG08Tactic));
  app.querySelector('#issue-g21').addEventListener('click',()=>act(issueG21Tactic));
  app.querySelector('#move-destination').addEventListener('change',event=>{selectedMoveDestination=event.currentTarget.value||null;renderGame();});
  app.querySelector('#issue-move').addEventListener('click',()=>act(issueMove));
  app.querySelector('#advance-20').addEventListener('click',()=>act(()=>advance(Math.min(20,view.world.time.ticksPerTurn-view.world.time.tick))));
  app.querySelector('#advance-boundary').addEventListener('click',()=>act(()=>advance(view.world.time.ticksPerTurn-view.world.time.tick)));
  app.querySelector('#tick').addEventListener('click',()=>act(()=>advance(1)));
  app.querySelector('#due').addEventListener('click',()=>act(()=>advance(dueIn)));
  app.querySelectorAll('[data-training]').forEach(button=>button.addEventListener('click',()=>act(()=>startTraining(button.dataset.training))));
  app.querySelector('#finish-training').addEventListener('click',()=>act(()=>advance(Math.min(200,Math.max(1,activeTraining.expectedEndGlobalTick-view.globalTick)))));
  app.querySelectorAll('[data-field-admit]').forEach(button=>button.addEventListener('click',()=>act(()=>admitFieldInspection(button.dataset.fieldAdmit))));
  app.querySelectorAll('[data-field-move]').forEach(button=>button.addEventListener('click',()=>act(()=>moveFieldInspection(button.dataset.fieldMove))));
  app.querySelectorAll('[data-field-run]').forEach(button=>button.addEventListener('click',()=>act(()=>advance(Math.min(200,Math.max(1,activeField.expectedEndGlobalTick-view.globalTick))))));
  app.querySelectorAll('[data-field-cancel]').forEach(button=>button.addEventListener('click',()=>act(()=>cancelFieldInspection(button.dataset.fieldCancel))));
  app.querySelectorAll('[data-growth-draft]').forEach(button=>button.addEventListener('click',()=>act(()=>pickGrowth(button.dataset.growthDraft,button.dataset.growthTrait,Number(button.dataset.growthRevision)))));
  app.querySelector('[data-recruit-start]')?.addEventListener('click',()=>act(startRecruitment));
  app.querySelectorAll('[data-recruit-cancel]').forEach(button=>button.addEventListener('click',()=>act(()=>cancelRecruitment(button.dataset.recruitCancel))));
  app.querySelector('[data-recruit-run]')?.addEventListener('click',()=>act(()=>advance(200)));
  app.querySelectorAll('[data-detachment-source]').forEach(button=>button.addEventListener('click',()=>{
    detachmentSourceArmyId=button.dataset.detachmentSource;
    detachmentTransferTroopCount=null;
    selectedDetachmentDeploymentTileId=null;
    renderGame();
  }));
  app.querySelector('#detachment-transfer')?.addEventListener('change',event=>{
    detachmentTransferTroopCount=Number(event.currentTarget.value);
    renderGame();
  });
  app.querySelector('[data-detachment-start]')?.addEventListener('click',()=>act(scheduleDetachment));
  app.querySelectorAll('[data-detachment-cancel]').forEach(button=>button.addEventListener('click',()=>act(()=>cancelDetachment(button.dataset.detachmentCancel))));
  app.querySelectorAll('[data-detachment-run]').forEach(button=>button.addEventListener('click',()=>act(()=>{
    const remaining=getFirst3RuntimePublicView(runtime,{losRules}).detachment?.remainingTicks??1;
    advance(Math.max(1,remaining));
  })));
  app.querySelectorAll('[data-detachment-deployment]').forEach(button=>button.addEventListener('click',()=>{
    selectedDetachmentDeploymentTileId=button.dataset.detachmentDeployment;
    renderGame();
  }));
  app.querySelectorAll('[data-detachment-complete]').forEach(button=>button.addEventListener('click',()=>act(()=>completeDetachment(button.dataset.detachmentComplete))));
  app.querySelector('[data-g03-transition]')?.addEventListener('click',()=>act(completeG03FieldTransition));
  app.querySelector('[data-g21-work-trial]')?.addEventListener('click',()=>act(prepareG21WorkTrial));
  app.querySelector('#to-planning')?.addEventListener('click',()=>act(()=>advance(ticksToPlanning)));
  app.querySelector('#save').addEventListener('click',()=>act(saveRuntime));
  app.querySelector('#load').addEventListener('click',()=>act(loadRuntime));
  app.querySelector('#restart').addEventListener('click',()=>{runtime=null;selectedTarget=null;selectedG03AreaTileIds=[];notice='';resetDetachmentDraft();renderStart();});
}

function render(){runtime?renderGame():renderStart();}
renderStart();
Promise.all([loadInputs(),fetch('/data/los.json').then(response=>{if(!response.ok)throw new Error('승인 LOS 자료를 불러오지 못했습니다.');return response.json();}),fetch('/data/growth-pool.json').then(response=>{if(!response.ok)throw new Error('성장 시험 풀을 불러오지 못했습니다.');return response.json();}),fetch('/data/economy.json').then(response=>{if(!response.ok)throw new Error('도시 경제 자료를 불러오지 못했습니다.');return response.json();}),fetch('/data/g21-growth.json').then(response=>response.json()),fetch('/data/g21-officer.json').then(response=>response.json())]).then(([loaded,manifest,loadedGrowthPool,loadedCityEconomy,g21Growth,g21Officer])=>{
  inputs=loaded;
  losRules=loadCanonicalLosRules({manifest,map:inputs.map});
  growthPool=loadedGrowthPool;
  cityEconomy=loadedCityEconomy;
  recruitmentContracts={growthContract:g21Growth,officerContract:g21Officer};
  notice='정상 캠페인 또는 전투 시험을 시작할 수 있습니다.';
  render();
}).catch(error=>{notice=error.message;render();});





fetch('/api/g24-pilot/card').then(response=>{if(!response.ok)throw new Error('G24_CARD_UNAVAILABLE');return response.json();}).then(card=>{g24PilotCard=card;if(runtime)render();}).catch(()=>{});

