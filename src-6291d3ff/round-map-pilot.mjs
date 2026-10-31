import {ROUND_MAP_PILOT_CONFIG as C} from './round-map-pilot-config.mjs';
import {createCombatRound,finishCombatMajorAction} from './combat-round.mjs';
import {createCombatSpace,deriveCombatContactState} from './combat-space.mjs';
import {createCombatActionFrame,validateCombatActionFrame,beginFrameActivation,waitFrameActivation,commitFrameMovement,finishFrameMovementWithoutMove,resolveContactAttemptFrameMelee,resolveEngagedFrameMelee} from './combat-action-frame.mjs';
import {createCombatConditions} from './combat-condition-kernel.mjs';
import {createCombatConditionBundle,validateCombatConditionBundle,resolveFrameConditionEvents} from './combat-condition-bridge.mjs';
import {createBattleClosure,validateBattleClosure,decideBattleClosure,finalizeBattleClosure} from './combat-battle-result.mjs';
import {canonical} from './contract-data.mjs';
const clone=structuredClone;
const need=(ok,reason)=>{if(!ok)throw new Error(reason);};
export const hexDistance=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
const key=p=>`${p.q},${p.r}`;
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const adjacent=p=>directions.map(([q,r])=>({q:p.q+q,r:p.r+r}));
const toward=(from,to)=>directions.map(([q,r],direction)=>({direction,distance:hexDistance({q:from.q+q,r:from.r+r},to)})).sort((a,b)=>a.distance-b.distance||a.direction-b.direction)[0].direction;
const pose=(unitId,factionId,p,facing=0)=>({unitId,factionId,anchor:{q:p.q,r:p.r},facing:{direction:facing},physicalFootprint:{q:p.q,r:p.r},controlFootprint:{radius:C.controlRadius}});
const live=(s,id)=>s.bundle.frame.round.units[id].state==='COMMANDABLE';
const unit=(s,id)=>s.bundle.frame.space.units.find(u=>u.unitId===id);
const enemy=(s,id)=>s.bundle.frame.space.units.find(u=>live(s,u.unitId)&&u.factionId!==unit(s,id).factionId);
const board=p=>Number.isInteger(p.q)&&Number.isInteger(p.r)&&p.q>=C.arena.minQ&&p.q<=C.arena.maxQ&&p.r>=C.arena.minR&&p.r<=C.arena.maxR;
export const roundMapGeometry={
  validateUnitPose:u=>board(u.anchor)&&canonical(u.anchor)===canonical(u.physicalFootprint)&&Number.isInteger(u.facing.direction)&&u.facing.direction>=0&&u.facing.direction<6&&u.controlFootprint.radius===C.controlRadius,
  sameAnchor:(a,b)=>key(a.anchor)===key(b.anchor),hasPhysicalOverlap:(a,b)=>key(a.anchor)===key(b.anchor),isPhysicalOverlapAllowed:()=>false,
  areEnemies:(a,b)=>a.factionId!==b.factionId,
  isInControl:(a,b)=>hexDistance(a.anchor,b.anchor)<=b.controlFootprint.radius,
  measureContact:(a,b,l,frontageUnit)=>({possible:hexDistance(a.anchor,b.anchor)===1,contactSide:'FRONT',contactWidth:C.frontage,frontageUnit}),
};
const contactState=(s,id)=>deriveCombatContactState({...s.bundle.frame.space,units:s.bundle.frame.space.units.filter(u=>live(s,u.unitId)),contactLinks:s.bundle.frame.space.contactLinks.filter(l=>l.active&&live(s,l.attackerUnitId)&&live(s,l.defenderUnitId))},id,roundMapGeometry);
const command=(s,id,extra={})=>({operationId:id,expectedRevision:s.bundle.frame.revision,...extra});
const withFrame=(s,result)=>{s.bundle.frame=result.frame;return result.result;};
function settle(s,id){
  if(!s.bundle.frame.pendingResolvers.length)return;
  s.bundle=resolveFrameConditionEvents(s.bundle,{...command(s,id,{resolutionRef:'TEST_ORDINARY_MELEE_NO_EXTRA_CONDITIONS'}),expectedConditionsRevision:s.bundle.conditions.revision},{geometry:roundMapGeometry,
    resolveConditionEvents:()=>({events:[],spaceUpdate:{unitUpdates:[],contactUpdates:[]},exitedUnitIds:[],routPursuitResolved:true})}).bundle;
}
function advance(s,id){
  const alive=s.bundle.frame.space.units.filter(u=>live(s,u.unitId));
  const factions=[...new Set(alive.map(u=>u.factionId))];
  if(factions.length<=1){
    const decided=decideBattleClosure(s.closure,s.bundle.frame.round,{decisionRef:'TEST_ONLY_COMMANDABLE_SIDE_REMAINS',pendingCleanupIds:[]});
    s.bundle.frame.round=decided.round;s.closure=finalizeBattleClosure(decided.closure,s.bundle.frame);
    s.result={winnerFactionId:factions[0]??null,round:s.bundle.frame.round.roundNumber};return;
  }
  if(s.bundle.frame.round.active)return;
  withFrame(s,beginFrameActivation(s.bundle.frame,command(s,id+':begin'),roundMapGeometry));
  if(s.bundle.frame.round.phase==='ROUND_ACTIONS_COMPLETE'){
    // No recovery/invented condition events in this limited ordinary-melee fixture.
    const roundNumber=s.bundle.frame.round.roundNumber+1;
    s.bundle.frame.round=createCombatRound({roundNumber,units:Object.entries(s.bundle.frame.round.units).map(([unitId,u])=>({unitId,state:u.state})),initiativeOrder:C.initiativeOrder.filter(id=>live(s,id))});
    withFrame(s,beginFrameActivation(s.bundle.frame,command(s,id+':round-begin'),roundMapGeometry));
  }
}
export function createRoundMapPilot(map,{approachMode='NORMAL'}={}){
  need(map?.width===18&&map?.height===14&&Array.isArray(map.tiles),'FIRST3_MAP_REQUIRED');
  need(['NORMAL','BLOCK_CONSUME','BLOCK_RETAIN'].includes(approachMode),'TEST_MODE_INVALID');
  const arenaTiles=map.tiles.filter(t=>board({q:t.at[0],r:t.at[1]})).map(t=>`${t.at[0]},${t.at[1]}`).sort();
  need(arenaTiles.length===(C.arena.maxQ-C.arena.minQ+1)*(C.arena.maxR-C.arena.minR+1),'TEST_ARENA_MAP_MISSING');
  const round=createCombatRound({roundNumber:1,units:C.roster.map(u=>({unitId:u.unitId,state:'COMMANDABLE'})),initiativeOrder:[...C.initiativeOrder]});
  const space=createCombatSpace({frontageUnit:'TEST_WIDTH',units:C.roster.map(u=>pose(u.unitId,u.factionId,u)),contactLinks:[]},roundMapGeometry);
  const troops=C.roster.map(u=>({unitId:u.unitId,count:u.count}));
  const frame=createCombatActionFrame({battleId:'FIRST3_MAP_ROUND_TEST',round,space,troops},roundMapGeometry);
  const conditions=createCombatConditions(C.roster.map(u=>({unitId:u.unitId,formationMode:'BATTLE',formationCondition:'ORDERED',morale:'STEADY'})));
  const s={format:'round-map-pilot-v1',configVersion:C.version,approachMode,mapBinding:{width:map.width,height:map.height,arenaTiles},revision:0,receipts:[],log:[],bundle:createCombatConditionBundle({frame,conditions},roundMapGeometry),closure:createBattleClosure({battleId:frame.battleId,initialTroops:troops,participantUnitIds:C.roster.map(u=>u.unitId)}),result:null};
  advance(s,'initial');return validateRoundMapPilot(s);
}
export function validateRoundMapPilot(s){
  need(s?.format==='round-map-pilot-v1'&&s.configVersion===C.version,'PILOT_SAVE_VERSION_INVALID');
  need(['NORMAL','BLOCK_CONSUME','BLOCK_RETAIN'].includes(s.approachMode),'TEST_MODE_INVALID');
  need(Number.isSafeInteger(s.revision)&&s.revision===s.receipts.length,'PILOT_REVISION_INVALID');
  need(new Set(s.receipts.map(r=>r.operationId)).size===s.receipts.length&&s.receipts.every((r,i)=>typeof r.operationId==='string'&&r.operationId.length>0&&typeof r.request==='string'&&r.revision===i+1),'PILOT_RECEIPTS_INVALID');
  need(s.mapBinding.width===18&&s.mapBinding.height===14&&s.mapBinding.arenaTiles.length===28,'PILOT_MAP_INVALID');
  const expectedTiles=[];for(let q=C.arena.minQ;q<=C.arena.maxQ;q++)for(let r=C.arena.minR;r<=C.arena.maxR;r++)expectedTiles.push(`${q},${r}`);
  need(canonical([...s.mapBinding.arenaTiles].sort())===canonical(expectedTiles.sort())&&Array.isArray(s.log),'PILOT_MAP_INVALID');
  need(s.log.length===s.revision&&s.log.every((e,i)=>e&&e.revision===i+1&&Number.isSafeInteger(e.round)&&e.round>0&&C.initiativeOrder.includes(e.actorId)&&['MOVE','WAIT','SKIP_MOVE','ATTACK','BRACE','AI_STEP'].includes(e.kind)&&typeof e.message==='string'),'PILOT_LOG_INVALID');
  validateCombatConditionBundle(s.bundle,roundMapGeometry);validateBattleClosure(s.closure);
  need(canonical(s.bundle.frame.troops.map(u=>u.unitId).sort())===canonical(C.roster.map(u=>u.unitId).sort()),'PILOT_ROSTER_INVALID');
  need(s.bundle.frame.space.units.every(u=>u.factionId===C.roster.find(r=>r.unitId===u.unitId)?.factionId)&&s.bundle.frame.troops.every(u=>u.count<=C.roster.find(r=>r.unitId===u.unitId)?.count),'PILOT_ROSTER_INVALID');
  need(s.closure.battleId===s.bundle.frame.battleId&&s.closure.initialTroops.every(t=>t.count===C.roster.find(u=>u.unitId===t.unitId)?.count),'PILOT_INITIAL_COUNT_INVALID');
  need(canonical([...s.closure.participantUnitIds].sort())===canonical(C.roster.map(u=>u.unitId).sort()),'PILOT_PARTICIPANT_COVERAGE');
  need((s.result!==null)===(s.closure.state==='ENDED'),'PILOT_RESULT_INVALID');
  if(s.result!==null){const sides=[...new Set(s.bundle.frame.space.units.filter(u=>live(s,u.unitId)).map(u=>u.factionId))];need(s.bundle.frame.round.phase==='DECIDED'&&sides.length<=1&&s.result.winnerFactionId===(sides[0]??null)&&s.result.round===s.bundle.frame.round.roundNumber,'PILOT_WINNER_INVALID');finalizeBattleClosure(s.closure,s.bundle.frame);}
  else need(s.closure.state==='ACTIVE'&&s.bundle.frame.round.phase==='ACTIVATIONS'&&s.bundle.frame.round.active!==null,'PILOT_ACTIVATION_REQUIRED');
  need(s.bundle.frame.pendingResolvers.length===0,'PILOT_PENDING_RESOLUTION');return s;
}
export function roundMapMoveOptions(s){
  validateRoundMapPilot(s);const active=s.bundle.frame.round.active;
  if(s.result||active?.stage!=='MOVEMENT'||contactState(s,active.unitId)==='ENGAGED')return [];
  const a=unit(s,active.unitId),e=enemy(s,a.unitId),paths=new Map([[key(a.anchor),[]]]),queue=[a.anchor];
  for(let i=0;i<queue.length;i++){
    const p=queue[i],path=paths.get(key(p));if(path.length>=C.movementHexes)continue;
    for(const n of adjacent(p)){if(!board(n)||paths.has(key(n))||s.bundle.frame.space.units.some(u=>live(s,u.unitId)&&key(u.anchor)===key(n))||e&&hexDistance(n,e.anchor)<=C.controlRadius)continue;
      const next=[...path,n];paths.set(key(n),next);queue.push(n);}
  }
  return [...paths.entries()].filter(([,path])=>path.length).map(([tileId,path])=>({tileId,path}));
}
export function roundMapCanAttack(s){
  validateRoundMapPilot(s);const a=s.bundle.frame.round.active;
  if(s.result||a?.stage!=='MAJOR')return false;
  const e=enemy(s,a.unitId);if(!e)return false;
  const linked=s.bundle.frame.space.contactLinks.some(l=>l.active&&[l.attackerUnitId,l.defenderUnitId].includes(a.unitId));
  return linked||hexDistance(unit(s,a.unitId).anchor,e.anchor)===C.controlRadius+C.contactApproachHexes&&contactState(s,e.unitId)==='FREE';
}
function basic(s,kind,tileId,id){
  const active=s.bundle.frame.round.active;need(active,'ACTIVATION_REQUIRED');const actor=active.unitId;
  if(kind==='WAIT'){withFrame(s,waitFrameActivation(s.bundle.frame,command(s,id),roundMapGeometry));advance(s,id);return 'Wait: 일반 순서 뒤 대기열로 이동';}
  if(kind==='SKIP_MOVE'){withFrame(s,finishFrameMovementWithoutMove(s.bundle.frame,command(s,id,{unitId:actor}),roundMapGeometry));return '이동 없이 Major 단계';}
  if(kind==='MOVE'){
    const selected=roundMapMoveOptions(s).find(o=>o.tileId===tileId);need(selected,'MOVEMENT_NOT_LEGAL');
    const a=unit(s,actor),endPose=pose(actor,a.factionId,selected.path.at(-1),a.facing.direction);
    withFrame(s,commitFrameMovement(s.bundle.frame,command(s,id,{unitId:actor,path:selected.path,endPose}),{geometry:roundMapGeometry,resolveNormalMove:()=>({legal:true,stopReason:'VOLUNTARY_END',endPose})}));return `이동 ${tileId}: Major 단계`;
  }
  if(kind==='BRACE'){need(active.stage==='MAJOR','MAJOR_STAGE_REQUIRED');s.bundle.frame.round=finishCombatMajorAction(s.bundle.frame.round,{action:'BRACE'});advance(s,id);return 'Brace: Major 사용, 추가 방어수치 없음';}
  need(kind==='ATTACK'&&roundMapCanAttack(s),'ATTACK_NOT_LEGAL');
  const a=unit(s,actor),e=enemy(s,actor),link=s.bundle.frame.space.contactLinks.find(l=>l.active&&[l.attackerUnitId,l.defenderUnitId].includes(actor));
  const adapters={geometry:roundMapGeometry,canMelee:frame=>hexDistance(frame.space.units.find(u=>u.unitId===actor).anchor,frame.space.units.find(u=>u.unitId===e.unitId).anchor)===1,resolveAttack:frame=>({casualties:Math.min(C.attackCasualties,frame.troops.find(u=>u.unitId===e.unitId).count)}),canCounter:()=>true,resolveCounter:frame=>({casualties:Math.min(C.counterCasualties,frame.troops.find(u=>u.unitId===actor).count)})};
  let outcome;
  if(link)outcome=withFrame(s,resolveEngagedFrameMelee(s.bundle.frame,command(s,id,{attackerId:actor,defenderId:e.unitId,contactId:link.contactId,counterTriggerId:id+':counter',counterSelected:true}),adapters));
  else{
    const end=adjacent(a.anchor).find(p=>board(p)&&hexDistance(p,e.anchor)===1);need(end,'FINAL_APPROACH_PATH_REQUIRED');
    const blocked=s.approachMode!=='NORMAL'&&s.bundle.frame.round.units[e.unitId].reactionRemaining>0;
    outcome=withFrame(s,resolveContactAttemptFrameMelee(s.bundle.frame,command(s,id,{attackerId:actor,defenderId:e.unitId,contactId:id+':contact',path:[a.anchor,end],approachTriggerId:id+':approach',interceptorIds:[],reactionSelection:{unitId:blocked?e.unitId:null,executed:blocked},counterTriggerId:id+':counter',counterSelected:true}),{
      ...adapters,canApproachReact:()=>blocked,canApproachIntercept:()=>false,resolveApproachReaction:()=>({casualties:C.approachCasualties,preventsContact:blocked}),resolveBlockedApproachCost:()=>({consumeMajor:s.approachMode==='BLOCK_CONSUME'}),
      resolveFinalApproach:()=>({legal:true,reactionPose:clone(a),contactPose:pose(actor,a.factionId,end,toward(end,e.anchor)),defenderPose:{...clone(e),facing:{direction:toward(e.anchor,end)}},contactLink:{contactId:id+':contact',attackerUnitId:actor,defenderUnitId:e.unitId,contactSide:'FRONT',contactWidth:C.frontage,active:true}}),
    }));
  }
  settle(s,id+':conditions');advance(s,id);
  return outcome.contactPrevented?`접근 저지: ${s.approachMode==='BLOCK_CONSUME'?'Major 소비':'Major 유지'} (비교 시험)`:'공격·생존병 반격 정산';
}
export function stepRoundMapPilot(state,request){
  validateRoundMapPilot(state);need(request&&typeof request.operationId==='string'&&request.operationId.length>0&&Number.isSafeInteger(request.expectedRevision),'REQUEST_REQUIRED');
  const fingerprint=canonical(request),previous=state.receipts.find(r=>r.operationId===request.operationId);
  if(previous){need(previous.request===fingerprint,'OPERATION_ID_CONFLICT');return {state:clone(state),replayed:true};}
  need(request.expectedRevision===state.revision,'STALE_PILOT_REVISION');need(!state.result,'BATTLE_ENDED');
  const active=state.bundle.frame.round.active,controller=C.roster.find(u=>u.unitId===active.unitId).controller;
  need(request.actorId===active.unitId,'ACTIVE_ACTOR_REQUIRED');
  const s=clone(state);let message;
  if(request.kind==='AI_STEP'){
    need(controller==='AI','AI_ACTOR_REQUIRED');
    if(active.stage==='MOVEMENT'){
      const e=enemy(s,active.unitId),choices=roundMapMoveOptions(s).sort((a,b)=>hexDistance(a.path.at(-1),e.anchor)-hexDistance(b.path.at(-1),e.anchor)||a.path.length-b.path.length||a.tileId.localeCompare(b.tileId));
      const best=choices.find(c=>hexDistance(c.path.at(-1),e.anchor)<hexDistance(unit(s,active.unitId).anchor,e.anchor));
      basic(s,best?'MOVE':'SKIP_MOVE',best?.tileId,request.operationId+':move');
    }
    message=basic(s,roundMapCanAttack(s)?'ATTACK':'BRACE',null,request.operationId+':major');
  }else{need(controller==='PLAYER','PLAYER_ACTOR_REQUIRED');message=basic(s,request.kind,request.tileId,request.operationId);}
  s.revision++;s.receipts.push({operationId:request.operationId,request:fingerprint,revision:s.revision});
  s.log.push({revision:s.revision,round:state.bundle.frame.round.roundNumber,actorId:active.unitId,kind:request.kind,message});return {state:validateRoundMapPilot(s),replayed:false};
}
export function serializeRoundMapPilot(s){return JSON.stringify(validateRoundMapPilot(s));}
export function deserializeRoundMapPilot(text){need(typeof text==='string'&&text.length<1000000,'PILOT_SAVE_REQUIRED');return validateRoundMapPilot(JSON.parse(text));}
