import {
  getCombatResolverRecord,
  mergeCombatActionResults,
  validateCombatResolverState,
} from './combat-resolver.mjs';

const FORMAT='sangoku-combat-coordinator';
const VERSION=1;
const EVENT_STAGE={
  'ATTACK:DAMAGE_TAKEN':10,
  'ATTACK:MORALE_CHANGED':20,
  'SUPPORT:TREATMENT_APPLIED':30,
  'SUPPORT:ALLY_SUPPORTED':31,
  'SUPPORT:MORALE_CHANGED':32,
  'CONTROL:CONTROL_APPLIED':40,
  'ATTACK:ROUT_PENDING':50,
};

function invariant(condition,message){if(!condition)throw new Error(message);}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function id(value,label){invariant(typeof value==='string'&&value.length>0,`${label} must be a non-empty stable ID`);return value;}
function own(object,key){return Object.hasOwn(object,key);}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function integer(value,label){invariant(Number.isInteger(value),`${label} must be an integer`);return value;}

function normalizeAppliedResult(input,index){
  invariant(input&&typeof input==='object',`applied result ${index} is required`);
  const normalized={
    resultId:id(input.resultId,`applied result ${index} resultId`),
    personnelDamage:uint(input.personnelDamage??0,'personnelDamage'),
    moraleDelta:integer(input.moraleDelta??0,'moraleDelta'),
    healedActive:uint(input.healedActive??0,'healedActive'),
    beneficialDelta:uint(input.beneficialDelta??0,'beneficialDelta'),
    controlApplied:input.controlApplied??false,
    routePending:input.routePending??false,
  };
  invariant(typeof normalized.controlApplied==='boolean','controlApplied must be boolean');
  invariant(typeof normalized.routePending==='boolean','routePending must be boolean');
  return normalized;
}

function normalizeBatchEntries(entries){
  invariant(Array.isArray(entries)&&entries.length>0,'entries must be a non-empty array');
  const normalized=entries.map((input,index)=>{
    invariant(input&&typeof input==='object',`entry ${index} is required`);
    invariant(Array.isArray(input.appliedResults),`entry ${index} appliedResults must be an array`);
    const appliedResults=input.appliedResults.map(normalizeAppliedResult).sort((a,b)=>a.resultId.localeCompare(b.resultId));
    return {
      actorRef:id(input.actorRef,`entry ${index} actorRef`),
      actionInstanceId:id(input.actionInstanceId,`entry ${index} actionInstanceId`),
      actorPostMergeState:id(input.actorPostMergeState??'UNCHANGED',`entry ${index} actorPostMergeState`),
      appliedResults,
    };
  }).sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId)||a.actorRef.localeCompare(b.actorRef));
  const actionIds=new Set(),resultIds=new Set();
  for(const entry of normalized){
    invariant(!actionIds.has(entry.actionInstanceId),`DUPLICATE_BATCH_ACTION_INSTANCE:${entry.actionInstanceId}`);
    actionIds.add(entry.actionInstanceId);
    for(const result of entry.appliedResults){
      invariant(!resultIds.has(result.resultId),`DUPLICATE_BATCH_RESULT_ID:${result.resultId}`);
      resultIds.add(result.resultId);
    }
  }
  return normalized;
}

function globalReferences(actorStates){
  const actions=new Map(),results=new Map(),eventKeys=new Set();
  for(const actorRef of Object.keys(actorStates).sort()){
    const actorState=actorStates[actorRef];
    for(const instance of Object.values(actorState.instances)){
      invariant(!actions.has(instance.actionInstanceId),`DUPLICATE_GLOBAL_ACTION_INSTANCE:${instance.actionInstanceId}`);
      actions.set(instance.actionInstanceId,actorRef);
      for(const result of instance.results){
        invariant(!results.has(result.resultId),`DUPLICATE_GLOBAL_RESULT_ID:${result.resultId}`);
        results.set(result.resultId,{actorRef,actionInstanceId:instance.actionInstanceId});
      }
    }
    for(const eventKey of actorState.eventOrder){
      invariant(!eventKeys.has(eventKey),`DUPLICATE_GLOBAL_EVENT_KEY:${eventKey}`);
      eventKeys.add(eventKey);
    }
  }
  return {actions,results};
}

function normalizeActorStates(battleId,input){
  invariant(input&&typeof input==='object'&&!Array.isArray(input),'actorStates are required');
  const actorRefs=Object.keys(input).sort();
  invariant(actorRefs.length>0,'actorStates must not be empty');
  const actorStates={};
  for(const actorRef of actorRefs){
    id(actorRef,'actorStates key');
    validateCombatResolverState(input[actorRef]);
    invariant(input[actorRef].actorRef===actorRef,`ACTOR_STATE_KEY_MISMATCH:${actorRef}`);
    invariant(input[actorRef].battleId===battleId,`BATTLE_SCOPE_MISMATCH:${actorRef}`);
    actorStates[actorRef]=clone(input[actorRef]);
  }
  globalReferences(actorStates);
  return actorStates;
}

function batchKey(tick){return String(tick);}

function expectedResolvedActions(state,tick){
  const expected=[];
  for(const actorRef of Object.keys(state.actorStates).sort()){
    for(const instance of Object.values(state.actorStates[actorRef].instances)){
      if(instance.status==='RESOLVED'&&instance.execution?.tick===tick){
        expected.push(`${actorRef}\u0000${instance.actionInstanceId}`);
      }
    }
  }
  return expected.sort();
}

function suppliedActions(entries){return entries.map(entry=>`${entry.actorRef}\u0000${entry.actionInstanceId}`).sort();}

function eventSortKey(item){
  const profile=item.instance.definition.eventProfile;
  const stage=EVENT_STAGE[`${profile}:${item.event.eventName}`];
  invariant(stage!==undefined,`UNSUPPORTED_COORDINATED_EVENT:${profile}:${item.event.eventName}`);
  return [stage,item.event.actionInstanceId,item.event.resultId??'',item.event.targetRef??'',item.event.eventKey];
}

function compareKeys(a,b){
  const left=eventSortKey(a),right=eventSortKey(b);
  for(let index=0;index<left.length;index++){
    if(left[index]===right[index])continue;
    return typeof left[index]==='number'?left[index]-right[index]:left[index].localeCompare(right[index]);
  }
  return 0;
}

export function createCombatCoordinatorState({battleId,actorStates}={}){
  id(battleId,'battleId');
  return {schemaVersion:VERSION,battleId,actorStates:normalizeActorStates(battleId,actorStates),batches:{},batchOrder:[]};
}

export function mergeSameTickCombatResults(state,{currentTick,entries}={}){
  validateCombatCoordinatorState(state);
  const tick=uint(currentTick,'currentTick');
  const normalizedEntries=normalizeBatchEntries(entries);
  const key=batchKey(tick);
  const fingerprint=JSON.stringify(normalizedEntries);
  if(own(state.batches,key)){
    invariant(state.batches[key].fingerprint===fingerprint,`CONFLICTING_SAME_TICK_BATCH:${tick}`);
    return clone(state);
  }
  if(state.batchOrder.length>0){
    const lastTick=Number(state.batchOrder[state.batchOrder.length-1]);
    invariant(tick>lastTick,`NON_MONOTONIC_BATCH_TICK:${tick}`);
  }
  invariant(same(expectedResolvedActions(state,tick),suppliedActions(normalizedEntries)),`INCOMPLETE_SAME_TICK_BATCH:${tick}`);

  const beforeEventKeys={};
  for(const entry of normalizedEntries){
    const actorState=state.actorStates[entry.actorRef];
    invariant(actorState,`UNKNOWN_BATCH_ACTOR:${entry.actorRef}`);
    const record=getCombatResolverRecord(actorState,entry.actionInstanceId);
    invariant(record,`UNKNOWN_BATCH_ACTION_INSTANCE:${entry.actionInstanceId}`);
    invariant(record.instance.actorRef===entry.actorRef,`ACTION_ACTOR_MISMATCH:${entry.actionInstanceId}`);
    invariant(record.instance.status==='RESOLVED',`BATCH_ACTION_NOT_RESOLVED:${entry.actionInstanceId}`);
    invariant(record.instance.execution?.tick===tick,`BATCH_TICK_MISMATCH:${entry.actionInstanceId}`);
    beforeEventKeys[entry.actorRef]=new Set(actorState.eventOrder);
  }

  let next=clone(state);
  for(const entry of normalizedEntries){
    next.actorStates[entry.actorRef]=mergeCombatActionResults(next.actorStates[entry.actorRef],{
      actionInstanceId:entry.actionInstanceId,
      currentTick:tick,
      actorPostMergeState:entry.actorPostMergeState,
      appliedResults:entry.appliedResults,
    });
  }

  const newEvents=[];
  for(const actorRef of [...new Set(normalizedEntries.map(entry=>entry.actorRef))].sort()){
    const actorState=next.actorStates[actorRef];
    for(const eventKey of actorState.eventOrder){
      if(!beforeEventKeys[actorRef].has(eventKey)){
        const event=actorState.events[eventKey],instance=actorState.instances[event.actionInstanceId];
        invariant(instance,`EVENT_ACTION_NOT_FOUND:${eventKey}`);
        newEvents.push({actorRef,instance,event:clone(event)});
      }
    }
  }
  newEvents.sort(compareKeys);
  const resultOrder=[];
  for(const entry of normalizedEntries){
    const instance=next.actorStates[entry.actorRef].instances[entry.actionInstanceId];
    for(const result of instance.results)resultOrder.push({actorRef:entry.actorRef,actionInstanceId:entry.actionInstanceId,resultId:result.resultId});
  }
  resultOrder.sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId)||a.resultId.localeCompare(b.resultId)||a.actorRef.localeCompare(b.actorRef));
  next.batches[key]={
    currentTick:tick,
    entries:normalizedEntries,
    resultOrder,
    eventOrder:newEvents.map(item=>item.event.eventKey),
    events:Object.fromEntries(newEvents.map(item=>[item.event.eventKey,{actorRef:item.actorRef,...item.event}])),
    fingerprint,
  };
  next.batchOrder.push(key);
  validateCombatCoordinatorState(next);
  return next;
}

export function getCombatCoordinatorBatch(state,currentTick){
  validateCombatCoordinatorState(state);
  const batch=state.batches[batchKey(uint(currentTick,'currentTick'))];
  return batch?clone(batch):null;
}

export function serializeCombatCoordinator(state){
  validateCombatCoordinatorState(state);
  return JSON.stringify({format:FORMAT,version:VERSION,state});
}

export function deserializeCombatCoordinator(serialized){
  invariant(typeof serialized==='string','serialized coordinator must be a string');
  let payload;
  try{payload=JSON.parse(serialized);}catch{throw new Error('INVALID_COMBAT_COORDINATOR_JSON');}
  invariant(payload?.format===FORMAT,'INVALID_COMBAT_COORDINATOR_FORMAT');
  invariant(payload.version===VERSION,'UNSUPPORTED_COMBAT_COORDINATOR_VERSION');
  validateCombatCoordinatorState(payload.state);
  return clone(payload.state);
}

export function validateCombatCoordinatorState(state){
  invariant(state&&typeof state==='object','combat coordinator state is required');
  invariant(state.schemaVersion===VERSION,'UNSUPPORTED_COMBAT_COORDINATOR_STATE_VERSION');
  id(state.battleId,'battleId');
  normalizeActorStates(state.battleId,state.actorStates);
  invariant(state.batches&&typeof state.batches==='object','batches are required');
  invariant(Array.isArray(state.batchOrder),'batchOrder must be an array');
  invariant(new Set(state.batchOrder).size===state.batchOrder.length,'DUPLICATE_BATCH_ORDER_KEY');
  for(let index=1;index<state.batchOrder.length;index++){
    invariant(Number(state.batchOrder[index-1])<Number(state.batchOrder[index]),'NON_MONOTONIC_BATCH_ORDER');
  }
  for(const key of state.batchOrder){
    const batch=state.batches[key];
    invariant(batch,`MISSING_BATCH:${key}`);
    invariant(key===batchKey(uint(batch.currentTick,'batch currentTick')),`BATCH_KEY_MISMATCH:${key}`);
    const entries=normalizeBatchEntries(batch.entries);
    invariant(same(batch.entries,entries),`NON_CANONICAL_BATCH_ENTRIES:${key}`);
    invariant(batch.fingerprint===JSON.stringify(entries),`BATCH_FINGERPRINT_MISMATCH:${key}`);
    invariant(Array.isArray(batch.resultOrder),'batch resultOrder must be an array');
    invariant(Array.isArray(batch.eventOrder),'batch eventOrder must be an array');
    invariant(batch.events&&typeof batch.events==='object','batch events are required');
    const expectedResults=[];
    for(const entry of entries){
      const instance=state.actorStates[entry.actorRef].instances[entry.actionInstanceId];
      invariant(instance,`BATCH_ACTION_NOT_FOUND:${entry.actionInstanceId}`);
      for(const result of instance.results)expectedResults.push({actorRef:entry.actorRef,actionInstanceId:entry.actionInstanceId,resultId:result.resultId});
    }
    expectedResults.sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId)||a.resultId.localeCompare(b.resultId)||a.actorRef.localeCompare(b.actorRef));
    invariant(same(batch.resultOrder,expectedResults),`BATCH_RESULT_ORDER_MISMATCH:${key}`);
    invariant(new Set(batch.eventOrder).size===batch.eventOrder.length,`DUPLICATE_BATCH_EVENT:${key}`);
    const sortableEvents=[];
    for(const eventKey of batch.eventOrder){
      invariant(own(batch.events,eventKey),`MISSING_BATCH_EVENT:${eventKey}`);
      const stored=batch.events[eventKey],actorState=state.actorStates[stored.actorRef];
      invariant(actorState&&own(actorState.events,eventKey),`BATCH_EVENT_SOURCE_MISMATCH:${eventKey}`);
      const {actorRef,...event}=stored;
      invariant(same(event,actorState.events[eventKey]),`BATCH_EVENT_PAYLOAD_MISMATCH:${eventKey}`);
      invariant(!own(event,'effectId'),`COORDINATOR_EVENT_MUST_NOT_OWN_EFFECT_ID:${eventKey}`);
      const instance=actorState.instances[event.actionInstanceId];
      invariant(instance,`EVENT_ACTION_NOT_FOUND:${eventKey}`);
      sortableEvents.push({actorRef,instance,event});
    }
    sortableEvents.sort(compareKeys);
    invariant(same(batch.eventOrder,sortableEvents.map(item=>item.event.eventKey)),`BATCH_EVENT_ORDER_MISMATCH:${key}`);
    invariant(Object.keys(batch.events).length===batch.eventOrder.length,`UNORDERED_BATCH_EVENT:${key}`);
  }
  invariant(Object.keys(state.batches).length===state.batchOrder.length,'UNORDERED_BATCH_RECORD');
  return true;
}

export const COMBAT_COORDINATOR_FORMAT=FORMAT;
export const COMBAT_COORDINATOR_VERSION=VERSION;
