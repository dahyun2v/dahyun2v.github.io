import {
  quoteAction,
  decisionCommit,
  executionValidation,
  executionCommit,
  resolveAction,
  mergeActionResults,
  settleSuccessRefund,
  getActionRecord,
  validateActionLifecycleState,
} from './action-lifecycle.mjs';

const VERSION=1;
const ID_PATTERN=/^[A-Za-z0-9._:,\/-]+$/;
const LOS_STATES=new Set(['CLEAR','BLOCKED','UNKNOWN']);
const FINISHED_STATUSES=new Set(['RESOLVED','RESULTS_MERGED','SETTLED']);
const ATTACK_EVENTS=['ATTACK_STARTED','ATTACK_HIT','DAMAGE_TAKEN','MORALE_CHANGED','ROUT_PENDING'];
const EVENT_PROFILE_ALLOWLIST={
  ATTACK:ATTACK_EVENTS,
  DEPLOY:[],
  CONTROL:['CONTROL_APPLIED'],
  SUPPORT:['TREATMENT_APPLIED','ALLY_SUPPORTED','MORALE_CHANGED'],
};
const SUPPORTED_ACTION_IDS=new Set(['BASIC_ATTACK','SPEAR_ENGAGE','CAVALRY_CHARGE','RANGED_VOLLEY','ENGINEER_DEPLOY','ENGINEER_AREA','TACTIC_CONTROL','TREAT_RALLY']);
const SIX_TROOPS=['bow','cavalry','engineer','militia','mystic','spear'];
const ACTION_CONTRACTS={
  BASIC_ATTACK:{allowedTroopTypes:SIX_TROOPS,eventProfile:'ATTACK',losPolicy:'NONE',semanticTags:[],emitEventNames:ATTACK_EVENTS},
  SPEAR_ENGAGE:{allowedTroopTypes:['spear'],eventProfile:'ATTACK',losPolicy:'NONE',semanticTags:['ENGAGE'],emitEventNames:ATTACK_EVENTS},
  CAVALRY_CHARGE:{allowedTroopTypes:['cavalry'],eventProfile:'ATTACK',losPolicy:'NONE',semanticTags:['CHARGE'],emitEventNames:ATTACK_EVENTS},
  RANGED_VOLLEY:{allowedTroopTypes:['bow'],eventProfile:'ATTACK',losPolicy:'CLEAR_REQUIRED',semanticTags:['RANGED'],emitEventNames:ATTACK_EVENTS},
  ENGINEER_DEPLOY:{allowedTroopTypes:['engineer'],eventProfile:'DEPLOY',losPolicy:'NONE',semanticTags:[],emitEventNames:[]},
  ENGINEER_AREA:{allowedTroopTypes:['engineer'],eventProfile:'ATTACK',losPolicy:'CLEAR_REQUIRED',semanticTags:[],emitEventNames:ATTACK_EVENTS},
  TACTIC_CONTROL:{allowedTroopTypes:['mystic'],eventProfile:'CONTROL',losPolicy:'CLEAR_REQUIRED',semanticTags:[],emitEventNames:['CONTROL_APPLIED']},
  TREAT_RALLY:{allowedTroopTypes:['militia'],eventProfile:'SUPPORT',losPolicy:'NONE',semanticTags:[],emitEventNames:['TREATMENT_APPLIED','ALLY_SUPPORTED','MORALE_CHANGED']},
};

function invariant(condition,message){if(!condition)throw new Error(message);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function integer(value,label){invariant(Number.isInteger(value),`${label} must be an integer`);return value;}
function clone(value){return structuredClone(value);}
function own(object,key){return Object.hasOwn(object,key);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}

function normalizeDefinition(input){
  invariant(input&&typeof input==='object','definition is required');
  const actionId=id(input.actionId,'definition.actionId');
  invariant(input.ownerSystem==='TROOP_COMBAT',`UNSUPPORTED_ACTION_OWNER:${actionId}`);
  invariant(SUPPORTED_ACTION_IDS.has(actionId),`UNSUPPORTED_COMBAT_ADAPTER_ACTION:${actionId}`);
  invariant(!own(input,'effectId')&&!own(input,'consumerEffectIds'),`TRAIT_EFFECT_FIELDS_NOT_ALLOWED:${actionId}`);
  invariant(input.definitionVersion==='BaseActionRegistry/I2-R3/1',`UNSUPPORTED_ACTION_DEFINITION_VERSION:${actionId}`);
  invariant(input.preparedConsumption==='NONE','UNSUPPORTED_PREPARED_OPTION_CONSUMPTION');
  invariant(Array.isArray(input.allowedTroopTypes)&&input.allowedTroopTypes.length>0,`allowedTroopTypes are required for ${actionId}`);
  const allowedTroopTypes=input.allowedTroopTypes.map(value=>id(value,`allowedTroopTypes for ${actionId}`));
  invariant(new Set(allowedTroopTypes).size===allowedTroopTypes.length,`DUPLICATE_ALLOWED_TROOP_TYPE:${actionId}`);
  const eventProfile=id(input.eventProfile,'definition.eventProfile');
  invariant(own(EVENT_PROFILE_ALLOWLIST,eventProfile),`UNSUPPORTED_EVENT_PROFILE:${eventProfile}`);
  invariant(input.losPolicy==='NONE'||input.losPolicy==='CLEAR_REQUIRED',`UNSUPPORTED_LOS_POLICY:${actionId}`);
  invariant(Array.isArray(input.semanticTags),'semanticTags must be an array');
  const semanticTags=input.semanticTags.map(value=>id(value,`semanticTag for ${actionId}`));
  invariant(new Set(semanticTags).size===semanticTags.length,`DUPLICATE_SEMANTIC_TAG:${actionId}`);
  invariant(Array.isArray(input.emitEventNames),'emitEventNames must be an array');
  const emitEventNames=input.emitEventNames.map(value=>id(value,`emitEventName for ${actionId}`));
  invariant(new Set(emitEventNames).size===emitEventNames.length,`DUPLICATE_EMIT_EVENT:${actionId}`);
  const allowedEvents=new Set(EVENT_PROFILE_ALLOWLIST[eventProfile]);
  for(const eventName of emitEventNames)invariant(allowedEvents.has(eventName),`EVENT_NOT_ALLOWED:${actionId}:${eventName}`);
  const normalized={
    actionId,
    ownerSystem:'TROOP_COMBAT',
    definitionVersion:'BaseActionRegistry/I2-R3/1',
    preparedConsumption:'NONE',
    allowedTroopTypes:[...allowedTroopTypes].sort(),
    staminaCost:uint(input.staminaCost,'definition.staminaCost'),
    windupTicks:uint(input.windupTicks,'definition.windupTicks'),
    recoveryTicks:uint(input.recoveryTicks,'definition.recoveryTicks'),
    cooldownTicks:uint(input.cooldownTicks,'definition.cooldownTicks'),
    eventProfile,
    semanticTags:[...semanticTags].sort(),
    losPolicy:input.losPolicy,
    emitEventNames:[...emitEventNames],
  };
  const contract=ACTION_CONTRACTS[actionId];
  for(const field of ['allowedTroopTypes','eventProfile','losPolicy','semanticTags','emitEventNames']){
    invariant(same(normalized[field],contract[field]),`ACTION_CONTRACT_MISMATCH:${actionId}:${field}`);
  }
  return normalized;
}

function lifecycleDefinition(definition){
  return {
    actionId:definition.actionId,
    staminaCost:definition.staminaCost,
    windupTicks:definition.windupTicks,
    recoveryTicks:definition.recoveryTicks,
    cooldownTicks:definition.cooldownTicks,
  };
}

function normalizeValidation(definition,validation,label){
  invariant(validation&&typeof validation==='object',`${label} is required`);
  invariant(typeof validation.valid==='boolean',`${label}.valid must be boolean`);
  let internalReason=validation.internalReason??null;
  let losState=validation.losState??null;
  if(definition.losPolicy==='CLEAR_REQUIRED'){
    invariant(LOS_STATES.has(losState),`${label}.losState must be CLEAR, BLOCKED, or UNKNOWN`);
    if(losState!=='CLEAR'){
      const losReason=`LOS_${losState}`;
      invariant(validation.valid===false,`${label} conflicts with ${losReason}`);
      invariant(internalReason===null||internalReason===losReason,`${label}.internalReason conflicts with ${losReason}`);
      internalReason=losReason;
    }
  }else{
    invariant(losState===null,`${label}.losState is not allowed for ${definition.actionId}`);
  }
  if(validation.valid){
    invariant(internalReason===null,`${label}.internalReason must be null when valid`);
    return {valid:true,internalReason:null,publicReason:null,losState};
  }
  id(internalReason,`${label}.internalReason`);
  const publicReason=id(validation.publicReason??'CONDITION_NO_LONGER_MET',`${label}.publicReason`);
  return {valid:false,internalReason,publicReason,losState};
}

function rejectPreparedInput(input){
  if(input.preparedTokenIds!==undefined||input.opportunityTokenIds!==undefined){
    throw new Error('UNSUPPORTED_PREPARED_OPTION_CONSUMPTION');
  }
}

function normalizeResolvedResults(results=[]){
  invariant(Array.isArray(results),'results must be an array');
  const normalized=results.map((result,index)=>{
    invariant(result&&typeof result==='object',`result ${index} is required`);
    return {
      targetRef:id(result.targetRef,`result ${index} targetRef`),
      validResult:result.validResult??true,
      effectValue:uint(result.effectValue??0,`result ${index} effectValue`),
    };
  });
  for(const result of normalized)invariant(typeof result.validResult==='boolean','validResult must be boolean');
  normalized.sort((a,b)=>a.targetRef.localeCompare(b.targetRef));
  invariant(new Set(normalized.map(result=>result.targetRef)).size===normalized.length,'DUPLICATE_RESULT_TARGET');
  return normalized.map((result,index)=>({...result,resultId:`pending/${result.targetRef}/${index}`}));
}

function finalizeResultIds(actionInstanceId,results){
  return results.map((result,index)=>({...result,resultId:`${actionInstanceId}/${result.targetRef}/${index}`}));
}

function normalizeMergeResults(storedResults,appliedResults=[]){
  invariant(Array.isArray(appliedResults),'appliedResults must be an array');
  invariant(appliedResults.length===storedResults.length,'APPLIED_RESULT_COUNT_MISMATCH');
  const byId={};
  for(const input of appliedResults){
    invariant(input&&typeof input==='object','applied result is required');
    const resultId=id(input.resultId,'applied resultId');
    invariant(!own(byId,resultId),`DUPLICATE_APPLIED_RESULT:${resultId}`);
    byId[resultId]={
      resultId,
      personnelDamage:uint(input.personnelDamage??0,'personnelDamage'),
      moraleDelta:integer(input.moraleDelta??0,'moraleDelta'),
      healedActive:uint(input.healedActive??0,'healedActive'),
      beneficialDelta:uint(input.beneficialDelta??0,'beneficialDelta'),
      controlApplied:input.controlApplied??false,
      routePending:input.routePending??false,
    };
    invariant(typeof byId[resultId].controlApplied==='boolean','controlApplied must be boolean');
    invariant(typeof byId[resultId].routePending==='boolean','routePending must be boolean');
  }
  return storedResults.map(result=>{
    invariant(own(byId,result.resultId),`MISSING_APPLIED_RESULT:${result.resultId}`);
    return {...result,...byId[result.resultId]};
  });
}

function emitEvent(state,{eventName,phase,tick,instance,resultId=null,targetRef=null}){
  invariant(instance.definition.emitEventNames.includes(eventName),`EVENT_NOT_ALLOWED:${instance.actionId}:${eventName}`);
  const suffixResult=resultId??'none',suffixTarget=targetRef??'none';
  const eventKey=`${state.battleId}/${tick}/${eventName}/${instance.actionInstanceId}/${suffixResult}/${suffixTarget}`;
  if(own(state.events,eventKey))return state;
  const next=clone(state);
  next.events[eventKey]={
    eventKey,
    battleId:state.battleId,
    tick,
    eventName,
    phase,
    actionInstanceId:instance.actionInstanceId,
    actionId:instance.actionId,
    resultId,
    targetRef,
    semanticTags:[...instance.definition.semanticTags],
    producerSystem:'TROOP_COMBAT',
  };
  next.eventOrder.push(eventKey);
  return next;
}

function executionFingerprint(input){return JSON.stringify(input);}

export function createCombatResolverState({battleId,actorRef,lifecycleState}={}){
  id(battleId,'battleId');
  id(actorRef,'actorRef');
  validateActionLifecycleState(lifecycleState);
  return {schemaVersion:VERSION,battleId,actorRef,lifecycleState:clone(lifecycleState),instances:{},events:{},eventOrder:[]};
}

export function quoteCombatAction(state,{definition:definitionInput,currentTick,discountTokenIds=[]}){
  validateCombatResolverState(state);
  const definition=normalizeDefinition(definitionInput);
  return quoteAction(state.lifecycleState,{definition:lifecycleDefinition(definition),currentTick,discountTokenIds});
}

export function reserveCombatAction(state,input){
  validateCombatResolverState(state);rejectPreparedInput(input);
  const definition=normalizeDefinition(input.definition);
  const instanceId=id(input.actionInstanceId,'actionInstanceId');
  const actorRef=id(input.actorRef,'actorRef');
  invariant(actorRef===state.actorRef,`ACTOR_SCOPE_MISMATCH:${actorRef}`);
  const actorTroopType=id(input.actorTroopType,'actorTroopType');
  const targetRef=id(input.targetRef,'targetRef');
  invariant(definition.allowedTroopTypes.includes(actorTroopType),`TROOP_TYPE_MISMATCH:${definition.actionId}:${actorTroopType}`);
  const eligibility=normalizeValidation(definition,input.decisionValidation,'decisionValidation');
  invariant(eligibility.valid,`ACTION_UNAVAILABLE:${eligibility.internalReason}`);
  const context={actionInstanceId:instanceId,actionId:definition.actionId,actorRef,actorTroopType,targetRef,decisionTick:uint(input.currentTick,'currentTick'),decisionValidation:eligibility,discountTokenIds:[...(input.discountTokenIds??[])].sort()};
  const existing=state.instances[instanceId];
  if(existing){
    invariant(same(existing.decisionContext,context)&&same(existing.definition,definition),`CONFLICTING_COMBAT_ACTION_INSTANCE:${instanceId}`);
    return clone(state);
  }
  const lifecycleState=decisionCommit(state.lifecycleState,{actionInstanceId:instanceId,definition:lifecycleDefinition(definition),currentTick:input.currentTick,discountTokenIds:input.discountTokenIds??[]});
  const next=clone(state);
  next.lifecycleState=lifecycleState;
  next.instances[instanceId]={...context,definition:clone(definition),decisionContext:context,status:'RESERVED',execution:null,results:[],merge:null};
  return next;
}

export function executeCombatAction(state,input){
  validateCombatResolverState(state);rejectPreparedInput(input);
  const instanceId=id(input.actionInstanceId,'actionInstanceId');
  const existing=state.instances[instanceId];
  invariant(existing,`UNKNOWN_COMBAT_ACTION_INSTANCE:${instanceId}`);
  const tick=uint(input.currentTick,'currentTick');
  const validation=normalizeValidation(existing.definition,input.executionValidation,'executionValidation');
  const normalizedResults=finalizeResultIds(instanceId,normalizeResolvedResults(input.results??[]));
  invariant(validation.valid||normalizedResults.length===0,'FAILED_EXECUTION_MUST_NOT_HAVE_RESULTS');
  const fingerprint=executionFingerprint({tick,validation,results:normalizedResults});
  if(existing.status==='CANCELLED'||FINISHED_STATUSES.has(existing.status)){
    invariant(existing.execution?.fingerprint===fingerprint,`CONFLICTING_COMBAT_EXECUTION:${instanceId}`);
    return clone(state);
  }
  invariant(existing.status==='RESERVED',`INVALID_COMBAT_EXECUTION_ORDER:${existing.status}`);
  let lifecycleState=executionValidation(state.lifecycleState,{actionInstanceId:instanceId,currentTick:tick,isValid:validation.valid,cancelReason:validation.publicReason??'CONDITION_NO_LONGER_MET'});
  const next=clone(state),record=next.instances[instanceId];
  record.execution={tick,validation,fingerprint};
  if(!validation.valid){
    next.lifecycleState=lifecycleState;
    record.status='CANCELLED';
    return next;
  }
  lifecycleState=executionCommit(lifecycleState,{actionInstanceId:instanceId,currentTick:tick});
  let eventState={...next,lifecycleState};
  if(record.definition.eventProfile==='ATTACK'){
    eventState=emitEvent(eventState,{eventName:'ATTACK_STARTED',phase:'ExecutionCommitted',tick,instance:record,targetRef:record.targetRef});
  }
  const effectValue=normalizedResults.filter(result=>result.validResult).reduce((sum,result)=>sum+result.effectValue,0);
  lifecycleState=resolveAction(eventState.lifecycleState,{actionInstanceId:instanceId,effectValue});
  eventState.lifecycleState=lifecycleState;
  eventState.instances[instanceId].status='RESOLVED';
  eventState.instances[instanceId].results=normalizedResults;
  for(const result of normalizedResults){
    if(record.definition.eventProfile==='ATTACK'&&result.validResult){
      eventState=emitEvent(eventState,{eventName:'ATTACK_HIT',phase:'Resolved',tick,instance:eventState.instances[instanceId],resultId:result.resultId,targetRef:result.targetRef});
    }
  }
  return eventState;
}

export function mergeCombatActionResults(state,input){
  validateCombatResolverState(state);
  const instanceId=id(input.actionInstanceId,'actionInstanceId');
  const existing=state.instances[instanceId];
  invariant(existing,`UNKNOWN_COMBAT_ACTION_INSTANCE:${instanceId}`);
  const tick=uint(input.currentTick,'currentTick');
  const actorPostMergeState=id(input.actorPostMergeState??'UNCHANGED','actorPostMergeState');
  const mergedResults=normalizeMergeResults(existing.results,input.appliedResults??[]);
  const fingerprint=executionFingerprint({tick,actorPostMergeState,mergedResults});
  if(['RESULTS_MERGED','SETTLED'].includes(existing.status)){
    invariant(existing.merge?.fingerprint===fingerprint,`CONFLICTING_COMBAT_MERGE:${instanceId}`);
    return clone(state);
  }
  invariant(existing.status==='RESOLVED',`INVALID_COMBAT_MERGE_ORDER:${existing.status}`);
  const lifecycleState=mergeActionResults(state.lifecycleState,{actionInstanceId:instanceId,actorPostMergeState});
  let next=clone(state);
  next.lifecycleState=lifecycleState;
  next.instances[instanceId].status='RESULTS_MERGED';
  next.instances[instanceId].merge={tick,actorPostMergeState,results:mergedResults,fingerprint};
  const instance=next.instances[instanceId];
  const emitForResults=(eventName,predicate)=>{
    for(const result of mergedResults){
      if(predicate(result))next=emitEvent(next,{tick,instance,resultId:result.resultId,targetRef:result.targetRef,eventName,phase:'ResultsMerged'});
    }
  };
  if(instance.definition.eventProfile==='ATTACK'){
    emitForResults('DAMAGE_TAKEN',result=>result.personnelDamage>0);
    emitForResults('MORALE_CHANGED',result=>result.moraleDelta!==0);
    emitForResults('ROUT_PENDING',result=>result.routePending);
  }else if(instance.definition.eventProfile==='SUPPORT'){
    emitForResults('TREATMENT_APPLIED',result=>result.healedActive>0);
    emitForResults('ALLY_SUPPORTED',result=>result.beneficialDelta>0);
    emitForResults('MORALE_CHANGED',result=>result.moraleDelta!==0);
  }else if(instance.definition.eventProfile==='CONTROL'){
    emitForResults('CONTROL_APPLIED',result=>result.controlApplied);
  }
  return next;
}

export function settleCombatRefund(state,input){
  validateCombatResolverState(state);
  const instanceId=id(input.actionInstanceId,'actionInstanceId');
  const existing=state.instances[instanceId];
  invariant(existing,`UNKNOWN_COMBAT_ACTION_INSTANCE:${instanceId}`);
  invariant(['RESULTS_MERGED','SETTLED'].includes(existing.status),`INVALID_COMBAT_SETTLEMENT_ORDER:${existing.status}`);
  const lifecycleState=settleSuccessRefund(state.lifecycleState,{actionInstanceId:instanceId,settlementSourceId:input.settlementSourceId,amount:input.amount});
  const next=clone(state);
  next.lifecycleState=lifecycleState;
  next.instances[instanceId].status='SETTLED';
  return next;
}

export function getCombatResolverRecord(state,actionInstanceId){
  validateCombatResolverState(state);
  const instance=state.instances[id(actionInstanceId,'actionInstanceId')];
  return instance?{instance:clone(instance),lifecycle:getActionRecord(state.lifecycleState,actionInstanceId)}:null;
}

export function validateCombatResolverState(state){
  invariant(state&&typeof state==='object','combat resolver state is required');
  invariant(state.schemaVersion===VERSION,'UNSUPPORTED_COMBAT_RESOLVER_VERSION');
  id(state.battleId,'battleId');
  id(state.actorRef,'actorRef');
  validateActionLifecycleState(state.lifecycleState);
  invariant(state.instances&&typeof state.instances==='object','instances are required');
  invariant(state.events&&typeof state.events==='object','events are required');
  invariant(Array.isArray(state.eventOrder),'eventOrder must be an array');
  invariant(new Set(state.eventOrder).size===state.eventOrder.length,'DUPLICATE_EVENT_ORDER_KEY');
  for(const eventKey of state.eventOrder){
    invariant(own(state.events,eventKey),`MISSING_EVENT:${eventKey}`);
    invariant(state.events[eventKey].eventKey===eventKey,`EVENT_KEY_MISMATCH:${eventKey}`);
    invariant(!own(state.events[eventKey],'effectId'),`COMBAT_EVENT_MUST_NOT_OWN_EFFECT_ID:${eventKey}`);
  }
  for(const[instanceId,instance]of Object.entries(state.instances)){
    id(instanceId,'combat actionInstanceId');
    invariant(instance.actionInstanceId===instanceId,`COMBAT_INSTANCE_KEY_MISMATCH:${instanceId}`);
    invariant(instance.actorRef===state.actorRef,`ACTOR_SCOPE_MISMATCH:${instance.actorRef}`);
    const definition=normalizeDefinition(instance.definition);
    invariant(definition.actionId===instance.actionId,`COMBAT_DEFINITION_ACTION_MISMATCH:${instanceId}`);
    invariant(getActionRecord(state.lifecycleState,instanceId),`MISSING_LIFECYCLE_ACTION:${instanceId}`);
  }
  return true;
}

export const COMBAT_RESOLVER_VERSION=VERSION;
