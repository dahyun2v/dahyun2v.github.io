import {
  getCombatCoordinatorBatch,
  validateCombatCoordinatorState,
} from './combat-coordinator.mjs';

const FORMAT='sangoku-battle-delta';
const VERSION=2;
const LEGACY_VERSION=1;
const EPSILON=1e-9;

function invariant(condition,message){if(!condition)throw new Error(message);}
function id(value,label){invariant(typeof value==='string'&&value.length>0,`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function integer(value,label){invariant(Number.isInteger(value),`${label} must be an integer`);return value;}
function finite(value,label){invariant(Number.isFinite(value),`${label} must be finite`);return value;}
function nonnegative(value,label){finite(value,label);invariant(value>=0,`${label} must be non-negative`);return value;}
function own(object,key){return Object.hasOwn(object,key);}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function normalizeControl(input,unitId){
  if(input===null||input===undefined)return null;
  invariant(input&&typeof input==='object'&&input.active===true,`invalid control state:${unitId}`);
  return {
    active:true,
    sourceActionInstanceId:id(input.sourceActionInstanceId,`control sourceActionInstanceId:${unitId}`),
    sourceResultId:id(input.sourceResultId,`control sourceResultId:${unitId}`),
    appliedTick:uint(input.appliedTick,`control appliedTick:${unitId}`),
  };
}

function normalizeUnit(input,index){
  invariant(input&&typeof input==='object',`unit ${index} is required`);
  const unitId=id(input.unitId,`unit ${index} unitId`);
  const maxPersonnel=uint(input.maxPersonnel,`maxPersonnel:${unitId}`);
  invariant(maxPersonnel>0,`maxPersonnel must be positive:${unitId}`);
  const activePersonnel=uint(input.activePersonnel,`activePersonnel:${unitId}`);
  const woundedPersonnel=uint(input.woundedPersonnel,`woundedPersonnel:${unitId}`);
  const deadPersonnel=uint(input.deadPersonnel,`deadPersonnel:${unitId}`);
  invariant(activePersonnel+woundedPersonnel+deadPersonnel<=maxPersonnel,`PERSONNEL_TOTAL_EXCEEDS_MAX:${unitId}`);
  const moraleMin=integer(input.moraleMin??0,`moraleMin:${unitId}`);
  const moraleMax=integer(input.moraleMax??100,`moraleMax:${unitId}`);
  invariant(moraleMin<moraleMax,`INVALID_MORALE_RANGE:${unitId}`);
  const morale=integer(input.morale,`morale:${unitId}`);
  invariant(morale>=moraleMin&&morale<=moraleMax,`MORALE_OUT_OF_RANGE:${unitId}`);
  invariant(typeof input.routePending==='boolean',`routePending must be boolean:${unitId}`);
  const control=normalizeControl(input.control??null,unitId);
  const hpTracked=own(input,'currentHp')||own(input,'maxHp')||own(input,'defeated');
  let currentHp,maxHp,defeated;
  if(hpTracked){
    invariant(own(input,'currentHp')&&own(input,'maxHp'),`INCOMPLETE_HP_STATE:${unitId}`);
    currentHp=nonnegative(input.currentHp,`currentHp:${unitId}`);
    maxHp=nonnegative(input.maxHp,`maxHp:${unitId}`);
    invariant(maxHp===activePersonnel*2,`MAX_HP_ACTIVE_MISMATCH:${unitId}`);
    invariant(currentHp<=maxHp,`CURRENT_HP_EXCEEDS_MAX:${unitId}`);
    defeated=activePersonnel===0||currentHp===0;
    if(own(input,'defeated'))invariant(input.defeated===defeated,`DEFEATED_FLAG_MISMATCH:${unitId}`);
  }else defeated=activePersonnel===0;
  if(defeated){
    invariant(input.routePending===false,`DEFEATED_CANNOT_ROUTE:${unitId}`);
    invariant(control===null,`DEFEATED_CANNOT_BE_CONTROLLED:${unitId}`);
  }else if(morale===moraleMin){
    invariant(input.routePending===true,`MORALE_MIN_REQUIRES_ROUTE_PENDING:${unitId}`);
  }
  const normalized={unitId,maxPersonnel,activePersonnel,woundedPersonnel,deadPersonnel,morale,moraleMin,moraleMax,control,routePending:input.routePending};
  if(hpTracked)Object.assign(normalized,{currentHp,maxHp,defeated});
  return normalized;
}

function normalizeUnits(inputs){
  invariant(Array.isArray(inputs)&&inputs.length>0,'units must be a non-empty array');
  const units={};
  for(let index=0;index<inputs.length;index++){
    const unit=normalizeUnit(inputs[index],index);
    invariant(!own(units,unit.unitId),`DUPLICATE_UNIT:${unit.unitId}`);
    units[unit.unitId]=unit;
  }
  return Object.fromEntries(Object.entries(units).sort(([a],[b])=>a.localeCompare(b)));
}

function normalizeCasualtyAllocations(inputs=[]){
  invariant(Array.isArray(inputs),'casualtyAllocations must be an array');
  const allocations=inputs.map((input,index)=>{
    invariant(input&&typeof input==='object',`casualty allocation ${index} is required`);
    const allocation={
      resultId:id(input.resultId,`casualty allocation ${index} resultId`),
      woundedGain:uint(input.woundedGain,`woundedGain:${index}`),
      deadGain:uint(input.deadGain,`deadGain:${index}`),
    };
    const hpTracked=input.hpTracked===true||['hpDamage','hpHealing','targetRef','beforeCurrentHp','beforeMaxHp','afterCurrentHp','afterMaxHp'].some(key=>own(input,key));
    if(hpTracked){
      invariant(input.hpTracked===true,`HP_ALLOCATION_FLAG_REQUIRED:${allocation.resultId}`);
      Object.assign(allocation,{
        hpTracked:true,
        hpDamage:nonnegative(input.hpDamage,`hpDamage:${index}`),
        hpHealing:nonnegative(input.hpHealing,`hpHealing:${index}`),
        targetRef:id(input.targetRef,`hp targetRef:${index}`),
        beforeCurrentHp:nonnegative(input.beforeCurrentHp,`beforeCurrentHp:${index}`),
        beforeMaxHp:nonnegative(input.beforeMaxHp,`beforeMaxHp:${index}`),
        afterCurrentHp:nonnegative(input.afterCurrentHp,`afterCurrentHp:${index}`),
        afterMaxHp:nonnegative(input.afterMaxHp,`afterMaxHp:${index}`),
      });
      invariant(allocation.beforeCurrentHp<=allocation.beforeMaxHp,`HP_BEFORE_EXCEEDS_MAX:${allocation.resultId}`);
      invariant(allocation.afterCurrentHp<=allocation.afterMaxHp,`HP_AFTER_EXCEEDS_MAX:${allocation.resultId}`);
    }
    return allocation;
  }).sort((a,b)=>a.resultId.localeCompare(b.resultId));
  invariant(new Set(allocations.map(item=>item.resultId)).size===allocations.length,'DUPLICATE_CASUALTY_ALLOCATION');
  return allocations;
}

function batchResults(coordinatorState,batch){
  const appliedById=new Map();
  for(const entry of batch.entries){
    invariant(own(coordinatorState.actorStates,entry.actorRef),`UNKNOWN_RESULT_ACTOR:${entry.actorRef}`);
    for(const applied of entry.appliedResults){
      invariant(!appliedById.has(applied.resultId),`DUPLICATE_APPLIED_RESULT:${applied.resultId}`);
      appliedById.set(applied.resultId,{actorRef:entry.actorRef,actionInstanceId:entry.actionInstanceId,applied});
    }
  }
  return batch.resultOrder.map(reference=>{
    const source=appliedById.get(reference.resultId);
    invariant(source,`MISSING_APPLIED_RESULT:${reference.resultId}`);
    invariant(source.actorRef===reference.actorRef&&source.actionInstanceId===reference.actionInstanceId,`RESULT_SOURCE_MISMATCH:${reference.resultId}`);
    const actorState=coordinatorState.actorStates[reference.actorRef];
    const instance=actorState.instances[reference.actionInstanceId];
    invariant(instance,`UNKNOWN_RESULT_ACTION:${reference.actionInstanceId}`);
    const result=instance.results.find(item=>item.resultId===reference.resultId);
    invariant(result,`UNKNOWN_RESULT_REFERENCE:${reference.resultId}`);
    return {...reference,targetRef:result.targetRef,eventProfile:instance.definition.eventProfile,applied:clone(source.applied)};
  });
}

function validateBatchEvents(batch,results){
  const expected=[];
  for(const result of results){
    const value=result.applied;
    if(result.eventProfile==='ATTACK'){
      if(value.personnelDamage>0)expected.push([result.resultId,'DAMAGE_TAKEN']);
      if(value.moraleDelta!==0)expected.push([result.resultId,'MORALE_CHANGED']);
      if(value.routePending)expected.push([result.resultId,'ROUT_PENDING']);
    }else if(result.eventProfile==='SUPPORT'){
      if(value.healedActive>0)expected.push([result.resultId,'TREATMENT_APPLIED']);
      if(value.beneficialDelta>0)expected.push([result.resultId,'ALLY_SUPPORTED']);
      if(value.moraleDelta!==0)expected.push([result.resultId,'MORALE_CHANGED']);
    }else if(result.eventProfile==='CONTROL'&&value.controlApplied){
      expected.push([result.resultId,'CONTROL_APPLIED']);
    }
  }
  const actual=batch.eventOrder.map(eventKey=>{
    const event=batch.events[eventKey];
    invariant(event&&event.resultId,`INVALID_DELTA_EVENT:${eventKey}`);
    return [event.resultId,event.eventName];
  });
  const expectedCounts=new Map(),actualCounts=new Map();
  for(const pair of expected){const key=JSON.stringify(pair);expectedCounts.set(key,(expectedCounts.get(key)??0)+1);}
  for(const pair of actual){const key=JSON.stringify(pair);actualCounts.set(key,(actualCounts.get(key)??0)+1);}
  invariant(same([...expectedCounts].sort(),[...actualCounts].sort()),'BATCH_EVENT_RESULT_MISMATCH');
}

function resultFingerprint(result,allocation){return JSON.stringify({result,allocation:allocation??null});}

export function createBattleDeltaState({battleId,units}={}){
  id(battleId,'battleId');
  return {schemaVersion:VERSION,battleId,units:normalizeUnits(units),processedBatches:{},processedResults:{},batchOrder:[]};
}

export function applyCoordinatorBatch(state,{coordinatorState,currentTick,casualtyAllocations=[]}={}){
  validateBattleDeltaState(state);
  validateCombatCoordinatorState(coordinatorState);
  const tick=uint(currentTick,'currentTick');
  invariant(coordinatorState.battleId===state.battleId,'BATTLE_SCOPE_MISMATCH');
  const batch=getCombatCoordinatorBatch(coordinatorState,tick);
  invariant(batch,`UNKNOWN_COORDINATOR_BATCH:${tick}`);
  const allocations=normalizeCasualtyAllocations(casualtyAllocations);
  const results=batchResults(coordinatorState,batch);
  validateBatchEvents(batch,results);
  const allocationByResult=new Map(allocations.map(item=>[item.resultId,item]));
  const resultIds=new Set(results.map(item=>item.resultId));
  for(const allocation of allocations)invariant(resultIds.has(allocation.resultId),`UNKNOWN_CASUALTY_RESULT:${allocation.resultId}`);
  const hpMode=allocations.some(allocation=>allocation.hpTracked===true);
  for(const result of results){
    const allocation=allocationByResult.get(result.resultId);
    if(result.applied.personnelDamage>0){
      invariant(allocation,`MISSING_CASUALTY_ALLOCATION:${result.resultId}`);
      invariant(allocation.woundedGain+allocation.deadGain===result.applied.personnelDamage,`CASUALTY_ALLOCATION_MISMATCH:${result.resultId}`);
    }else{
      invariant(!allocation||allocation.woundedGain+allocation.deadGain===0,`CASUALTY_WITHOUT_DAMAGE:${result.resultId}`);
    }
    if(allocation?.hpTracked)invariant(allocation.targetRef===result.targetRef,`HP_ALLOCATION_TARGET_MISMATCH:${result.resultId}`);
    if(hpMode&&['ATTACK','SUPPORT'].includes(result.eventProfile))invariant(allocation?.hpTracked===true,`MISSING_HP_ALLOCATION:${result.resultId}`);
    invariant(own(state.units,result.actorRef),`UNKNOWN_ACTOR_UNIT:${result.actorRef}`);
    invariant(own(state.units,result.targetRef),`UNKNOWN_TARGET_UNIT:${result.targetRef}`);
  }

  const batchId=`${state.battleId}/${tick}`;
  const fingerprint=JSON.stringify({coordinatorFingerprint:batch.fingerprint,results,allocations});
  if(own(state.processedBatches,batchId)){
    invariant(state.processedBatches[batchId].fingerprint===fingerprint,`CONFLICTING_BATTLE_BATCH_REPLAY:${batchId}`);
    return clone(state);
  }
  const alreadyProcessed=results.filter(result=>own(state.processedResults,result.resultId));
  if(alreadyProcessed.length){
    for(const result of alreadyProcessed){
      const expected=resultFingerprint(result,allocationByResult.get(result.resultId));
      invariant(state.processedResults[result.resultId].fingerprint===expected,`CONFLICTING_BATTLE_RESULT_REPLAY:${result.resultId}`);
    }
    invariant(alreadyProcessed.length===results.length,'PARTIAL_BATTLE_RESULT_REPLAY');
    return clone(state);
  }

  let next=clone(state);
  const resultById=new Map(results.map(result=>[result.resultId,result]));
  const initialRoute=Object.fromEntries(Object.entries(next.units).map(([unitId,unit])=>[unitId,unit.routePending]));
  const initialWounded=Object.fromEntries(Object.entries(next.units).map(([unitId,unit])=>[unitId,unit.woundedPersonnel]));
  const initialActive=Object.fromEntries(Object.entries(next.units).map(([unitId,unit])=>[unitId,unit.activePersonnel]));
  const healedFromSnapshot=Object.fromEntries(Object.keys(next.units).map(unitId=>[unitId,0]));
  const routeSignals=new Set();
  for(const eventKey of batch.eventOrder){
    const event=batch.events[eventKey],result=resultById.get(event.resultId);
    invariant(result,`EVENT_RESULT_NOT_FOUND:${event.resultId}`);
    invariant(event.targetRef===result.targetRef,`EVENT_TARGET_MISMATCH:${eventKey}`);
    const unit=next.units[result.targetRef],applied=result.applied;
    if(event.eventName==='DAMAGE_TAKEN'){
      const allocation=allocationByResult.get(result.resultId);
      const actualDamage=Math.min(applied.personnelDamage,unit.activePersonnel);
      invariant(actualDamage===applied.personnelDamage,`UNCLAMPED_PERSONNEL_DAMAGE:${result.resultId}`);
      unit.activePersonnel=clamp(unit.activePersonnel-actualDamage,0,unit.maxPersonnel);
      unit.woundedPersonnel+=allocation.woundedGain;
      unit.deadPersonnel+=allocation.deadGain;
      invariant(unit.activePersonnel+unit.woundedPersonnel+unit.deadPersonnel<=unit.maxPersonnel,`PERSONNEL_TOTAL_EXCEEDS_MAX:${unit.unitId}`);
      if(unit.activePersonnel===0){unit.routePending=false;unit.control=null;}
    }else if(event.eventName==='MORALE_CHANGED'){
      const clamped=clamp(unit.morale+applied.moraleDelta,unit.moraleMin,unit.moraleMax);
      invariant(clamped-unit.morale===applied.moraleDelta,`UNCLAMPED_MORALE_DELTA:${result.resultId}`);
      unit.morale=clamped;
    }else if(event.eventName==='TREATMENT_APPLIED'){
      invariant(unit.activePersonnel>0&&(!own(unit,'currentHp')||unit.currentHp>0),`TREATMENT_CANNOT_REVIVE:${result.resultId}`);
      const capacity=unit.maxPersonnel-unit.activePersonnel-unit.deadPersonnel;
      const snapshotAvailable=initialWounded[unit.unitId]-healedFromSnapshot[unit.unitId];
      invariant(applied.healedActive<=snapshotAvailable,`TREATMENT_EXCEEDS_INITIAL_WOUNDED:${result.resultId}`);
      const actualHeal=Math.min(applied.healedActive,unit.woundedPersonnel,capacity,snapshotAvailable);
      invariant(actualHeal===applied.healedActive,`UNCLAMPED_TREATMENT_DELTA:${result.resultId}`);
      unit.woundedPersonnel-=actualHeal;
      unit.activePersonnel+=actualHeal;
      healedFromSnapshot[unit.unitId]+=actualHeal;
    }else if(event.eventName==='CONTROL_APPLIED'){
      invariant(unit.activePersonnel>0,`CONTROL_CANNOT_TARGET_ZERO_ACTIVE:${result.resultId}`);
      unit.control={active:true,sourceActionInstanceId:result.actionInstanceId,sourceResultId:result.resultId,appliedTick:tick};
    }else if(event.eventName==='ROUT_PENDING'){
      routeSignals.add(unit.unitId);
    }else if(event.eventName!=='ALLY_SUPPORTED'){
      throw new Error(`UNSUPPORTED_BATTLE_DELTA_EVENT:${event.eventName}`);
    }
  }
  if(hpMode){
    const hpGroups=new Map();
    for(const allocation of allocations.filter(item=>item.hpTracked)){
      if(!hpGroups.has(allocation.targetRef))hpGroups.set(allocation.targetRef,[]);
      hpGroups.get(allocation.targetRef).push(allocation);
    }
    for(const[targetRef,group]of [...hpGroups.entries()].sort(([a],[b])=>a.localeCompare(b))){
      const unit=next.units[targetRef],before=state.units[targetRef];
      const projection=group[0];
      for(const item of group){
        invariant(item.beforeCurrentHp===projection.beforeCurrentHp&&item.beforeMaxHp===projection.beforeMaxHp&&item.afterCurrentHp===projection.afterCurrentHp&&item.afterMaxHp===projection.afterMaxHp,`CONFLICTING_HP_PROJECTION:${targetRef}`);
      }
      invariant(projection.beforeMaxHp===initialActive[targetRef]*2,`HP_BEFORE_MAX_ACTIVE_MISMATCH:${targetRef}`);
      if(own(before,'currentHp')){
        invariant(before.currentHp===projection.beforeCurrentHp&&before.maxHp===projection.beforeMaxHp,`HP_BEFORE_STATE_MISMATCH:${targetRef}`);
      }
      const hpDamage=group.reduce((sum,item)=>sum+item.hpDamage,0);
      const hpHealing=group.reduce((sum,item)=>sum+item.hpHealing,0);
      const personnelDamage=group.reduce((sum,item)=>sum+(resultById.get(item.resultId)?.applied.personnelDamage??0),0);
      const healedActive=group.reduce((sum,item)=>sum+(resultById.get(item.resultId)?.applied.healedActive??0),0);
      const afterDamageMax=Math.max(0,(initialActive[targetRef]-personnelDamage)*2);
      const afterDamageHp=Math.min(Math.max(0,projection.beforeCurrentHp-hpDamage),afterDamageMax);
      invariant(afterDamageHp>EPSILON||hpHealing<=EPSILON,`HP_ZERO_CANNOT_HEAL:${targetRef}`);
      invariant(afterDamageHp>EPSILON||healedActive===0,`HP_ZERO_CANNOT_TREAT:${targetRef}`);
      const expectedMax=unit.activePersonnel*2;
      const expectedCurrent=Math.min(afterDamageHp+hpHealing,expectedMax);
      invariant(Math.abs(projection.afterMaxHp-expectedMax)<=EPSILON,`HP_AFTER_MAX_ACTIVE_MISMATCH:${targetRef}`);
      invariant(Math.abs(projection.afterCurrentHp-expectedCurrent)<=EPSILON,`HP_PROJECTION_TOTAL_MISMATCH:${targetRef}`);
      unit.currentHp=projection.afterCurrentHp;
      unit.maxHp=projection.afterMaxHp;
      unit.defeated=unit.activePersonnel===0||unit.currentHp===0;
    }
  }
  for(const unit of Object.values(next.units)){
    const defeated=unit.activePersonnel===0||(own(unit,'currentHp')&&unit.currentHp===0);
    if(own(unit,'currentHp'))unit.defeated=defeated;
    if(defeated){
      invariant(!routeSignals.has(unit.unitId),`STALE_ROUTE_PENDING:${unit.unitId}`);
      unit.routePending=false;
      unit.control=null;
    }else if(initialRoute[unit.unitId]){
      unit.routePending=true;
    }else if(unit.morale===unit.moraleMin){
      invariant(routeSignals.has(unit.unitId),`ROUTE_PENDING_REQUIRED:${unit.unitId}`);
      unit.routePending=true;
    }else{
      invariant(!routeSignals.has(unit.unitId),`STALE_ROUTE_PENDING:${unit.unitId}`);
      unit.routePending=false;
    }
  }
  for(const result of results){
    next.processedResults[result.resultId]={batchId,fingerprint:resultFingerprint(result,allocationByResult.get(result.resultId))};
  }
  const orderedResultIds=results.map(item=>item.resultId);
  next.processedBatches[batchId]={
    currentTick:tick,
    coordinatorFingerprint:batch.fingerprint,
    fingerprint,
    resultIds:orderedResultIds,
    resultFingerprints:Object.fromEntries(orderedResultIds.map(resultId=>[resultId,next.processedResults[resultId].fingerprint])),
  };
  next.batchOrder.push(batchId);
  validateBattleDeltaState(next);
  return next;
}

export function getBattleDeltaUnit(state,unitId){
  validateBattleDeltaState(state);
  const unit=state.units[id(unitId,'unitId')];
  return unit?clone(unit):null;
}

export function serializeBattleDeltaState(state){
  validateBattleDeltaState(state);
  return JSON.stringify({format:FORMAT,version:VERSION,state});
}

export function deserializeBattleDeltaState(serialized){
  invariant(typeof serialized==='string','serialized battle delta state must be a string');
  let payload;
  try{payload=JSON.parse(serialized);}catch{throw new Error('INVALID_BATTLE_DELTA_JSON');}
  invariant(payload?.format===FORMAT,'INVALID_BATTLE_DELTA_FORMAT');
  invariant([LEGACY_VERSION,VERSION].includes(payload.version),'UNSUPPORTED_BATTLE_DELTA_VERSION');
  if(payload.version===LEGACY_VERSION&&payload.state?.schemaVersion===LEGACY_VERSION)payload.state.schemaVersion=VERSION;
  validateBattleDeltaState(payload.state);
  return clone(payload.state);
}

export function validateBattleDeltaState(state){
  invariant(state&&typeof state==='object','battle delta state is required');
  invariant(state.schemaVersion===VERSION,'UNSUPPORTED_BATTLE_DELTA_STATE_VERSION');
  id(state.battleId,'battleId');
  invariant(state.units&&typeof state.units==='object'&&!Array.isArray(state.units),'units are required');
  const normalized=normalizeUnits(Object.values(state.units));
  invariant(same(state.units,normalized),'NON_CANONICAL_BATTLE_UNITS');
  invariant(state.processedBatches&&typeof state.processedBatches==='object','processedBatches are required');
  invariant(state.processedResults&&typeof state.processedResults==='object','processedResults are required');
  invariant(Array.isArray(state.batchOrder),'batchOrder must be an array');
  invariant(new Set(state.batchOrder).size===state.batchOrder.length,'DUPLICATE_BATTLE_BATCH_ORDER');
  const claimedResults=new Set();
  let previousTick=-1;
  for(const batchId of state.batchOrder){
    const record=state.processedBatches[batchId];
    invariant(record&&batchId===`${state.battleId}/${uint(record.currentTick,'processed batch currentTick')}`,`PROCESSED_BATCH_KEY_MISMATCH:${batchId}`);
    invariant(record.currentTick>previousTick,'NON_MONOTONIC_BATTLE_BATCH_ORDER');
    previousTick=record.currentTick;
    invariant(typeof record.coordinatorFingerprint==='string'&&typeof record.fingerprint==='string',`INVALID_PROCESSED_BATCH_FINGERPRINT:${batchId}`);
    invariant(Array.isArray(record.resultIds)&&new Set(record.resultIds).size===record.resultIds.length,`INVALID_PROCESSED_BATCH_RESULTS:${batchId}`);
    invariant(record.resultFingerprints&&typeof record.resultFingerprints==='object',`MISSING_RESULT_FINGERPRINTS:${batchId}`);
    for(const resultId of record.resultIds){
      id(resultId,'processed resultId');
      invariant(!claimedResults.has(resultId),`RESULT_CLAIMED_BY_MULTIPLE_BATCHES:${resultId}`);
      claimedResults.add(resultId);
      invariant(state.processedResults[resultId]?.batchId===batchId,`PROCESSED_RESULT_BATCH_MISMATCH:${resultId}`);
      invariant(record.resultFingerprints[resultId]===state.processedResults[resultId].fingerprint,`PROCESSED_RESULT_FINGERPRINT_MISMATCH:${resultId}`);
    }
    invariant(Object.keys(record.resultFingerprints).length===record.resultIds.length,`UNORDERED_RESULT_FINGERPRINT:${batchId}`);
  }
  invariant(Object.keys(state.processedBatches).length===state.batchOrder.length,'UNORDERED_PROCESSED_BATCH');
  for(const[resultId,record]of Object.entries(state.processedResults)){
    id(resultId,'processed resultId');
    invariant(typeof record.fingerprint==='string'&&own(state.processedBatches,record.batchId),`INVALID_PROCESSED_RESULT:${resultId}`);
    invariant(claimedResults.has(resultId),`ORPHAN_PROCESSED_RESULT:${resultId}`);
  }
  return true;
}

export const BATTLE_DELTA_FORMAT=FORMAT;
export const BATTLE_DELTA_VERSION=VERSION;
