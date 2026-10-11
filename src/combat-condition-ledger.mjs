const FORMAT='sangoku-combat-condition-ledger';
const VERSION=1;
const DEFINITION_VERSION='g21-combat-trial-contract-v1/1';
const MOVE_SLOW_EFFECT_PAYLOAD_VERSION='move-slow-movement-progress-v1';
const STATUS_KEYS=Object.freeze(['MOVE_SLOW','CONFUSION','MENTAL_DISRUPTION_RESISTANCE']);
const STATUS_KEY_SET=new Set(STATUS_KEYS);
const G21_TRIAL=Object.freeze({
  officerId:'G21',traitId:'UT-G21',tacticId:'ART-G21',baseDurationTicks:20,traitBonusPerRankTicks:4,maximumDurationTicks:40,reapplicationResistanceTicks:20,
});
export const CONFUSION_TRIAL_SEMANTICS=Object.freeze({
  allowedWhileActive:Object.freeze(['MOVE','BASIC_ATTACK','BASIC_DEFEND','RETREAT']),
  blockedWhileActive:Object.freeze(['CHARGE','CAST','DEPLOY','TREAT','CLEANSE','START_PROTECTION']),
  onApply:Object.freeze(['CANCEL_IN_PROGRESS_CAST','CANCEL_IN_PROGRESS_DEPLOY','END_ACTIVE_PROTECTION']),
  doesNotDo:Object.freeze(['RANDOM_MOVEMENT','ATTACK_ALLY','DELETE_COMPLETED_DEPLOYMENT','RETROACTIVELY_CANCEL_COMPLETED_ACTION']),
});

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function id(value,label){invariant(typeof value==='string'&&value.length>0&&value.length<=240,`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function positive(value,label){invariant(Number.isInteger(value)&&value>0,`${label} must be a positive integer`);return value;}
function own(value,key){return Object.hasOwn(value,key);}
function activeAt(status,globalTick){return status.startGlobalTick<=globalTick&&status.endGlobalTickExclusive>globalTick&&status.endReason===null;}
function requestFingerprint(kind,input){return JSON.stringify({kind,input});}
function snapshotFingerprint(input){return JSON.stringify({schema:input.schema,version:input.version,battleId:input.battleId,targetUnitId:input.targetUnitId,executionGlobalTick:input.executionGlobalTick,ledgerRevision:input.ledgerRevision,conditions:input.conditions});}
function logId(state){return `CCL.LOG.${String(state.logOrder.length+1).padStart(6,'0')}`;}

function appendLog(state,{type,globalTick,requestId,statusInstanceId=null,targetUnitId=null,statusKey=null,details={}}){
  const eventId=logId(state);
  state.logs[eventId]={eventId,type,globalTick:uint(globalTick,'log globalTick'),requestId:id(requestId,'log requestId'),statusInstanceId,targetUnitId,statusKey,details:clone(details)};
  state.logOrder.push(eventId);
}

function recordRequest(state,requestId,fingerprint,result){
  state.processedRequests[requestId]={fingerprint,result:clone(result)};
  state.revision++;
}

function replayResult(state,requestId,fingerprint){
  const existing=state.processedRequests[requestId];
  if(!existing)return null;
  invariant(existing.fingerprint===fingerprint,`CONFLICTING_CONDITION_REQUEST:${requestId}`);
  return {state:clone(state),result:clone(existing.result),replayed:true};
}

function normalizeTraitModifierRefs(refs=[]){
  invariant(Array.isArray(refs),'traitModifierRefs must be an array');
  const normalized=refs.map((value,index)=>id(value,`traitModifierRefs[${index}]`)).sort();
  invariant(new Set(normalized).size===normalized.length,'DUPLICATE_TRAIT_MODIFIER_REF');
  return normalized;
}

function normalizeEffectPayload(statusKey,input){
  const hasVersion=own(input,'effectPayloadVersion');
  const hasMovementProgress=own(input,'movementProgressPermille');
  if(statusKey!=='MOVE_SLOW'){
    invariant(!hasVersion&&!hasMovementProgress,`MOVEMENT_PROGRESS_NOT_ALLOWED:${statusKey}`);
    return null;
  }
  if(!hasVersion&&!hasMovementProgress)return null;
  invariant(hasVersion&&hasMovementProgress,'INCOMPLETE_MOVE_SLOW_EFFECT_PAYLOAD');
  invariant(input.effectPayloadVersion===MOVE_SLOW_EFFECT_PAYLOAD_VERSION,`UNSUPPORTED_MOVE_SLOW_EFFECT_PAYLOAD_VERSION:${input.effectPayloadVersion}`);
  invariant(Number.isInteger(input.movementProgressPermille)&&input.movementProgressPermille>=1&&input.movementProgressPermille<=1000,'movementProgressPermille must be an integer in 1..1000');
  return {effectPayloadVersion:MOVE_SLOW_EFFECT_PAYLOAD_VERSION,movementProgressPermille:input.movementProgressPermille};
}

function statusRecord(input){
  const statusKey=id(input.statusKey,'statusKey');invariant(STATUS_KEY_SET.has(statusKey),`UNSUPPORTED_CONDITION_STATUS:${statusKey}`);
  const startGlobalTick=uint(input.startGlobalTick,'startGlobalTick'),durationTicks=positive(input.durationTicks,'durationTicks');
  const cleanseable=input.cleanseable??statusKey!=='MENTAL_DISRUPTION_RESISTANCE';
  invariant(typeof cleanseable==='boolean','cleanseable must be boolean');
  if(statusKey==='MENTAL_DISRUPTION_RESISTANCE')invariant(cleanseable===false,'MENTAL_DISRUPTION_RESISTANCE_NOT_CLEANSEABLE');
  invariant(input.definitionVersion===DEFINITION_VERSION,`UNSUPPORTED_CONDITION_DEFINITION_VERSION:${input.definitionVersion}`);
  const effectPayload=normalizeEffectPayload(statusKey,input);
  return {
    statusInstanceId:id(input.statusInstanceId,'statusInstanceId'),
    statusKey,
    targetUnitId:id(input.targetUnitId,'targetUnitId'),
    sourceOfficerId:id(input.sourceOfficerId,'sourceOfficerId'),
    sourceTacticId:id(input.sourceTacticId,'sourceTacticId'),
    sourceUnitId:id(input.sourceUnitId,'sourceUnitId'),
    applicationMode:id(input.applicationMode,'applicationMode'),
    applicationBatchId:id(input.applicationBatchId,'applicationBatchId'),
    startGlobalTick,
    endGlobalTickExclusive:startGlobalTick+durationTicks,
    naturalEndGlobalTickExclusive:startGlobalTick+durationTicks,
    cleanseable,
    traitModifierRefs:normalizeTraitModifierRefs(input.traitModifierRefs),
    definitionVersion:DEFINITION_VERSION,
    ...(effectPayload??{}),
    endReason:null,
    endedGlobalTick:null,
    replacedByStatusInstanceId:null,
    spawnedResistanceStatusInstanceId:null,
    originStatusInstanceId:input.originStatusInstanceId??null,
  };
}

function endStatus(status,{reason,globalTick,replacedByStatusInstanceId=null}){
  invariant(status.endReason===null,`CONDITION_ALREADY_ENDED:${status.statusInstanceId}`);
  invariant(globalTick>=status.startGlobalTick&&globalTick<=status.endGlobalTickExclusive,`INVALID_CONDITION_END_TICK:${status.statusInstanceId}`);
  status.endGlobalTickExclusive=globalTick;
  status.endReason=reason;
  status.endedGlobalTick=globalTick;
  status.replacedByStatusInstanceId=replacedByStatusInstanceId;
}

function resistanceInput(confusion,startGlobalTick){
  return {
    statusInstanceId:`RESIST.${confusion.statusInstanceId}.${startGlobalTick}`,
    statusKey:'MENTAL_DISRUPTION_RESISTANCE',
    targetUnitId:confusion.targetUnitId,
    sourceOfficerId:confusion.sourceOfficerId,
    sourceTacticId:confusion.sourceTacticId,
    sourceUnitId:confusion.sourceUnitId,
    applicationMode:'SYSTEM_REAPPLICATION_RESISTANCE',
    applicationBatchId:`RESISTANCE:${confusion.statusInstanceId}`,
    startGlobalTick,
    durationTicks:G21_TRIAL.reapplicationResistanceTicks,
    cleanseable:false,
    traitModifierRefs:[],
    definitionVersion:DEFINITION_VERSION,
    originStatusInstanceId:confusion.statusInstanceId,
  };
}

function activeSameKey(state,targetUnitId,statusKey,globalTick){
  return state.statusOrder.map(statusId=>state.statuses[statusId]).find(status=>status.targetUnitId===targetUnitId&&status.statusKey===statusKey&&activeAt(status,globalTick))??null;
}

function installStatus(state,record,{requestId,logType='APPLIED'}){
  invariant(!own(state.statuses,record.statusInstanceId),`DUPLICATE_STATUS_INSTANCE:${record.statusInstanceId}`);
  const existing=activeSameKey(state,record.targetUnitId,record.statusKey,record.startGlobalTick);
  if(existing){
    if(existing.endGlobalTickExclusive>=record.endGlobalTickExclusive){
      appendLog(state,{type:'REAPPLY_KEPT_EXISTING',globalTick:record.startGlobalTick,requestId,statusInstanceId:existing.statusInstanceId,targetUnitId:record.targetUnitId,statusKey:record.statusKey,details:{rejectedStatusInstanceId:record.statusInstanceId,keptEndGlobalTickExclusive:existing.endGlobalTickExclusive,proposedEndGlobalTickExclusive:record.endGlobalTickExclusive}});
      return {status:'REAPPLY_KEPT_EXISTING',statusInstanceId:existing.statusInstanceId,endGlobalTickExclusive:existing.endGlobalTickExclusive};
    }
    endStatus(existing,{reason:'REPLACED_LATER_END',globalTick:record.startGlobalTick,replacedByStatusInstanceId:record.statusInstanceId});
    appendLog(state,{type:'REAPPLY_REPLACED_EARLIER_END',globalTick:record.startGlobalTick,requestId,statusInstanceId:existing.statusInstanceId,targetUnitId:record.targetUnitId,statusKey:record.statusKey,details:{replacementStatusInstanceId:record.statusInstanceId,replacementEndGlobalTickExclusive:record.endGlobalTickExclusive}});
  }
  state.statuses[record.statusInstanceId]=record;state.statusOrder.push(record.statusInstanceId);
  appendLog(state,{type:logType,globalTick:record.startGlobalTick,requestId,statusInstanceId:record.statusInstanceId,targetUnitId:record.targetUnitId,statusKey:record.statusKey,details:{endGlobalTickExclusive:record.endGlobalTickExclusive,traitModifierRefs:record.traitModifierRefs}});
  return {status:existing?'REAPPLIED_LATER_END':'APPLIED',statusInstanceId:record.statusInstanceId,endGlobalTickExclusive:record.endGlobalTickExclusive};
}

function spawnResistance(state,confusion,{requestId,startGlobalTick}){
  if(confusion.spawnedResistanceStatusInstanceId!==null)return confusion.spawnedResistanceStatusInstanceId;
  const record=statusRecord(resistanceInput(confusion,startGlobalTick));
  const installed=installStatus(state,record,{requestId,logType:'RESISTANCE_STARTED'});
  confusion.spawnedResistanceStatusInstanceId=installed.statusInstanceId;
  return installed.statusInstanceId;
}

function expireThrough(state,{requestId,currentGlobalTick}){
  uint(currentGlobalTick,'currentGlobalTick');invariant(currentGlobalTick>=state.cursorGlobalTick,'NON_MONOTONIC_CONDITION_TICK');
  let progressed=true;
  while(progressed){
    progressed=false;
    const due=state.statusOrder.map(statusId=>state.statuses[statusId]).filter(status=>status.endReason===null&&status.endGlobalTickExclusive<=currentGlobalTick).sort((a,b)=>a.endGlobalTickExclusive-b.endGlobalTickExclusive||a.statusInstanceId.localeCompare(b.statusInstanceId));
    for(const status of due){
      if(status.endReason!==null)continue;
      status.endReason='EXPIRED';status.endedGlobalTick=status.endGlobalTickExclusive;
      appendLog(state,{type:'EXPIRED',globalTick:status.endGlobalTickExclusive,requestId,statusInstanceId:status.statusInstanceId,targetUnitId:status.targetUnitId,statusKey:status.statusKey});
      if(status.statusKey==='CONFUSION')spawnResistance(state,status,{requestId,startGlobalTick:status.endGlobalTickExclusive});
      progressed=true;
    }
  }
  state.cursorGlobalTick=currentGlobalTick;
}

export function createCombatConditionLedger({battleId,startGlobalTick=0}={}){
  const state={schemaVersion:VERSION,battleId:id(battleId,'battleId'),cursorGlobalTick:uint(startGlobalTick,'startGlobalTick'),revision:0,statuses:{},statusOrder:[],logs:{},logOrder:[],processedRequests:{}};
  validateCombatConditionLedger(state);return state;
}

export function capturePreExecutionConditionSnapshot(state,{targetUnitId,executionGlobalTick}={}){
  validateCombatConditionLedger(state);id(targetUnitId,'targetUnitId');uint(executionGlobalTick,'executionGlobalTick');
  const conditions=state.statusOrder.map(statusId=>state.statuses[statusId]).filter(status=>status.targetUnitId===targetUnitId&&activeAt(status,executionGlobalTick)).map(clone);
  const snapshot={schema:'combat-condition-pre-execution-snapshot-v1',version:1,battleId:state.battleId,targetUnitId,executionGlobalTick,ledgerRevision:state.revision,conditions};return {...snapshot,fingerprint:snapshotFingerprint(snapshot)};
}

export function calculateG21ConfusionDuration({controlApplied,sourceOfficerId,sourceTacticId,applicationMode,applicationBatchId,traitRank=0,preExecutionSnapshot}={}){
  invariant(typeof controlApplied==='boolean','controlApplied must be boolean');
  id(sourceOfficerId,'sourceOfficerId');id(sourceTacticId,'sourceTacticId');id(applicationMode,'applicationMode');id(applicationBatchId,'applicationBatchId');
  invariant(Number.isInteger(traitRank)&&traitRank>=0&&traitRank<=5,'traitRank must be in 0..5');
  invariant(object(preExecutionSnapshot)&&preExecutionSnapshot.schema==='combat-condition-pre-execution-snapshot-v1'&&preExecutionSnapshot.version===1,'INVALID_PRE_EXECUTION_CONDITION_SNAPSHOT');
  invariant(Array.isArray(preExecutionSnapshot.conditions),'snapshot conditions must be an array');
  invariant(preExecutionSnapshot.fingerprint===snapshotFingerprint(preExecutionSnapshot),'CONDITION_SNAPSHOT_FINGERPRINT_MISMATCH');
  if(!controlApplied)return {statusApplied:false,durationTicks:0,baseDurationTicks:0,bonusDurationTicks:0,traitModifierRefs:[],qualifyingSlowStatusInstanceIds:[]};
  const qualifying=preExecutionSnapshot.conditions.filter(status=>status.statusKey==='MOVE_SLOW'&&status.targetUnitId===preExecutionSnapshot.targetUnitId&&status.applicationBatchId!==applicationBatchId&&activeAt(status,preExecutionSnapshot.executionGlobalTick)).map(status=>status.statusInstanceId).sort();
  const traitEligible=sourceOfficerId===G21_TRIAL.officerId&&sourceTacticId===G21_TRIAL.tacticId&&applicationMode==='DIRECT'&&traitRank>0&&qualifying.length>0;
  const bonus=traitEligible?G21_TRIAL.traitBonusPerRankTicks*traitRank:0;
  return {statusApplied:true,durationTicks:Math.min(G21_TRIAL.maximumDurationTicks,G21_TRIAL.baseDurationTicks+bonus),baseDurationTicks:G21_TRIAL.baseDurationTicks,bonusDurationTicks:bonus,traitModifierRefs:traitEligible?[`${G21_TRIAL.traitId}:R${traitRank}`]:[],qualifyingSlowStatusInstanceIds:traitEligible?qualifying:[]};
}

export function applyCombatCondition(state,input={}){
  validateCombatConditionLedger(state);
  const normalized={requestId:id(input.requestId,'requestId'),statusInstanceId:id(input.statusInstanceId,'statusInstanceId'),statusKey:id(input.statusKey,'statusKey'),targetUnitId:id(input.targetUnitId,'targetUnitId'),sourceOfficerId:id(input.sourceOfficerId,'sourceOfficerId'),sourceTacticId:id(input.sourceTacticId,'sourceTacticId'),sourceUnitId:id(input.sourceUnitId,'sourceUnitId'),applicationMode:id(input.applicationMode,'applicationMode'),applicationBatchId:id(input.applicationBatchId,'applicationBatchId'),startGlobalTick:uint(input.startGlobalTick,'startGlobalTick'),durationTicks:positive(input.durationTicks,'durationTicks'),cleanseable:input.cleanseable??input.statusKey!=='MENTAL_DISRUPTION_RESISTANCE',traitModifierRefs:normalizeTraitModifierRefs(input.traitModifierRefs),definitionVersion:input.definitionVersion,...(own(input,'effectPayloadVersion')?{effectPayloadVersion:input.effectPayloadVersion}:{}),...(own(input,'movementProgressPermille')?{movementProgressPermille:input.movementProgressPermille}:{})};
  invariant(['MOVE_SLOW','CONFUSION'].includes(normalized.statusKey),`DIRECT_CONDITION_APPLICATION_NOT_ALLOWED:${normalized.statusKey}`);
  const fingerprint=requestFingerprint('APPLY',normalized),replay=replayResult(state,normalized.requestId,fingerprint);if(replay)return replay;
  const next=clone(state);expireThrough(next,{requestId:normalized.requestId,currentGlobalTick:normalized.startGlobalTick});
  if(normalized.statusKey==='CONFUSION'){
    const resistance=activeSameKey(next,normalized.targetUnitId,'MENTAL_DISRUPTION_RESISTANCE',normalized.startGlobalTick);
    if(resistance){
      const result={status:'RESISTED',statusInstanceId:null,resistanceStatusInstanceId:resistance.statusInstanceId,endGlobalTickExclusive:null};
      appendLog(next,{type:'APPLICATION_RESISTED',globalTick:normalized.startGlobalTick,requestId:normalized.requestId,targetUnitId:normalized.targetUnitId,statusKey:normalized.statusKey,details:{resistanceStatusInstanceId:resistance.statusInstanceId}});
      recordRequest(next,normalized.requestId,fingerprint,result);validateCombatConditionLedger(next);return {state:next,result,replayed:false};
    }
  }
  const result=installStatus(next,statusRecord(normalized),{requestId:normalized.requestId});
  recordRequest(next,normalized.requestId,fingerprint,result);validateCombatConditionLedger(next);return {state:next,result,replayed:false};
}

export function cleanseCombatCondition(state,{requestId,statusInstanceId,currentGlobalTick}={}){
  validateCombatConditionLedger(state);const normalized={requestId:id(requestId,'requestId'),statusInstanceId:id(statusInstanceId,'statusInstanceId'),currentGlobalTick:uint(currentGlobalTick,'currentGlobalTick')};
  const fingerprint=requestFingerprint('CLEANSE',normalized),replay=replayResult(state,normalized.requestId,fingerprint);if(replay)return replay;
  const next=clone(state);expireThrough(next,{requestId:normalized.requestId,currentGlobalTick:normalized.currentGlobalTick});
  const status=next.statuses[normalized.statusInstanceId];invariant(status,`UNKNOWN_CONDITION_STATUS:${normalized.statusInstanceId}`);invariant(activeAt(status,normalized.currentGlobalTick),`CONDITION_NOT_ACTIVE:${normalized.statusInstanceId}`);invariant(status.cleanseable,`CONDITION_NOT_CLEANSEABLE:${normalized.statusInstanceId}`);
  endStatus(status,{reason:'CLEANSED',globalTick:normalized.currentGlobalTick});
  appendLog(next,{type:'CLEANSED',globalTick:normalized.currentGlobalTick,requestId:normalized.requestId,statusInstanceId:status.statusInstanceId,targetUnitId:status.targetUnitId,statusKey:status.statusKey});
  const resistanceStatusInstanceId=status.statusKey==='CONFUSION'?spawnResistance(next,status,{requestId:normalized.requestId,startGlobalTick:normalized.currentGlobalTick}):null;
  const result={status:'CLEANSED',statusInstanceId:status.statusInstanceId,resistanceStatusInstanceId};recordRequest(next,normalized.requestId,fingerprint,result);validateCombatConditionLedger(next);return {state:next,result,replayed:false};
}

export function advanceCombatConditionLedger(state,{requestId,currentGlobalTick}={}){
  validateCombatConditionLedger(state);const normalized={requestId:id(requestId,'requestId'),currentGlobalTick:uint(currentGlobalTick,'currentGlobalTick')};
  const fingerprint=requestFingerprint('ADVANCE',normalized),replay=replayResult(state,normalized.requestId,fingerprint);if(replay)return replay;
  const next=clone(state),beforeLogCount=next.logOrder.length;expireThrough(next,{requestId:normalized.requestId,currentGlobalTick:normalized.currentGlobalTick});
  const result={status:'ADVANCED',currentGlobalTick:normalized.currentGlobalTick,newLogEventIds:next.logOrder.slice(beforeLogCount)};recordRequest(next,normalized.requestId,fingerprint,result);validateCombatConditionLedger(next);return {state:next,result,replayed:false};
}

export function getActiveCombatConditions(state,{targetUnitId,globalTick=state.cursorGlobalTick,statusKey=null}={}){
  validateCombatConditionLedger(state);id(targetUnitId,'targetUnitId');uint(globalTick,'globalTick');if(statusKey!==null)invariant(STATUS_KEY_SET.has(statusKey),`UNSUPPORTED_CONDITION_STATUS:${statusKey}`);
  return state.statusOrder.map(statusId=>state.statuses[statusId]).filter(status=>status.targetUnitId===targetUnitId&&(statusKey===null||status.statusKey===statusKey)&&activeAt(status,globalTick)).map(clone);
}

export function getMovementProgressPermilleForUnit(state,{targetUnitId,globalTick=state.cursorGlobalTick}={}){
  validateCombatConditionLedger(state);id(targetUnitId,'targetUnitId');uint(globalTick,'globalTick');
  const slow=activeSameKey(state,targetUnitId,'MOVE_SLOW',globalTick);
  if(!slow||!own(slow,'effectPayloadVersion'))return 1000;
  return slow.movementProgressPermille;
}

export function serializeCombatConditionLedger(state){validateCombatConditionLedger(state);return JSON.stringify({format:FORMAT,version:VERSION,state});}
export function deserializeCombatConditionLedger(serialized){
  invariant(typeof serialized==='string','serialized condition ledger must be a string');let payload;try{payload=JSON.parse(serialized);}catch{throw new Error('INVALID_COMBAT_CONDITION_LEDGER_JSON');}
  invariant(payload?.format===FORMAT,'INVALID_COMBAT_CONDITION_LEDGER_FORMAT');invariant(payload.version===VERSION,'UNSUPPORTED_COMBAT_CONDITION_LEDGER_VERSION');validateCombatConditionLedger(payload.state);return clone(payload.state);
}

export function validateCombatConditionLedger(state){
  invariant(object(state)&&state.schemaVersion===VERSION,'UNSUPPORTED_COMBAT_CONDITION_LEDGER_STATE_VERSION');id(state.battleId,'battleId');uint(state.cursorGlobalTick,'cursorGlobalTick');uint(state.revision,'revision');
  invariant(object(state.statuses)&&Array.isArray(state.statusOrder)&&new Set(state.statusOrder).size===state.statusOrder.length,'invalid condition status ledger');
  invariant(object(state.logs)&&Array.isArray(state.logOrder)&&new Set(state.logOrder).size===state.logOrder.length,'invalid condition log ledger');invariant(object(state.processedRequests),'processedRequests are required');
  for(const statusId of state.statusOrder){
    const status=state.statuses[statusId];invariant(object(status)&&status.statusInstanceId===statusId,`CONDITION_STATUS_KEY_MISMATCH:${statusId}`);invariant(STATUS_KEY_SET.has(status.statusKey),`UNSUPPORTED_CONDITION_STATUS:${status.statusKey}`);
    for(const field of ['targetUnitId','sourceOfficerId','sourceTacticId','sourceUnitId','applicationMode','applicationBatchId'])id(status[field],`${field}:${statusId}`);
    uint(status.startGlobalTick,`startGlobalTick:${statusId}`);uint(status.endGlobalTickExclusive,`endGlobalTickExclusive:${statusId}`);positive(status.naturalEndGlobalTickExclusive-status.startGlobalTick,`natural duration:${statusId}`);invariant(status.endGlobalTickExclusive>=status.startGlobalTick&&status.endGlobalTickExclusive<=status.naturalEndGlobalTickExclusive,`INVALID_CONDITION_END:${statusId}`);
    invariant(typeof status.cleanseable==='boolean',`invalid cleanseable:${statusId}`);if(status.statusKey==='MENTAL_DISRUPTION_RESISTANCE')invariant(status.cleanseable===false,`MENTAL_DISRUPTION_RESISTANCE_NOT_CLEANSEABLE:${statusId}`);
    normalizeEffectPayload(status.statusKey,status);
    normalizeTraitModifierRefs(status.traitModifierRefs);invariant(status.definitionVersion===DEFINITION_VERSION,`UNSUPPORTED_CONDITION_DEFINITION_VERSION:${statusId}`);
    invariant(status.endReason===null||['EXPIRED','CLEANSED','REPLACED_LATER_END'].includes(status.endReason),`INVALID_CONDITION_END_REASON:${statusId}`);
    if(status.endReason===null){invariant(status.endedGlobalTick===null&&status.replacedByStatusInstanceId===null&&status.endGlobalTickExclusive>state.cursorGlobalTick,`INVALID_ACTIVE_CONDITION_END:${statusId}`);}else{invariant(status.endedGlobalTick===status.endGlobalTickExclusive,`CONDITION_ENDED_TICK_MISMATCH:${statusId}`);if(status.endReason==='REPLACED_LATER_END')id(status.replacedByStatusInstanceId,`replacedByStatusInstanceId:${statusId}`);else invariant(status.replacedByStatusInstanceId===null,`UNEXPECTED_REPLACEMENT_REF:${statusId}`);}
    invariant(status.spawnedResistanceStatusInstanceId===null||typeof status.spawnedResistanceStatusInstanceId==='string',`invalid resistance ref:${statusId}`);if(status.spawnedResistanceStatusInstanceId!==null)invariant(own(state.statuses,status.spawnedResistanceStatusInstanceId),`MISSING_SPAWNED_RESISTANCE:${statusId}`);
    if(status.statusKey==='MENTAL_DISRUPTION_RESISTANCE'){
      id(status.originStatusInstanceId,`originStatusInstanceId:${statusId}`);const origin=state.statuses[status.originStatusInstanceId];invariant(origin?.statusKey==='CONFUSION'&&origin.spawnedResistanceStatusInstanceId===statusId&&origin.targetUnitId===status.targetUnitId,`INVALID_RESISTANCE_ORIGIN:${statusId}`);
    }else invariant(status.originStatusInstanceId===null,`UNEXPECTED_CONDITION_ORIGIN:${statusId}`);
  }
  invariant(Object.keys(state.statuses).length===state.statusOrder.length,'UNORDERED_CONDITION_STATUS');
  for(const eventId of state.logOrder){const event=state.logs[eventId];invariant(object(event)&&event.eventId===eventId,`CONDITION_LOG_KEY_MISMATCH:${eventId}`);id(event.type,`log type:${eventId}`);uint(event.globalTick,`log tick:${eventId}`);id(event.requestId,`log request:${eventId}`);invariant(object(event.details),`log details required:${eventId}`);}
  invariant(Object.keys(state.logs).length===state.logOrder.length,'UNORDERED_CONDITION_LOG');
  for(const[requestId,record]of Object.entries(state.processedRequests)){id(requestId,'processed requestId');invariant(object(record)&&typeof record.fingerprint==='string'&&object(record.result),`INVALID_PROCESSED_CONDITION_REQUEST:${requestId}`);}
  invariant(state.revision===Object.keys(state.processedRequests).length,'CONDITION_LEDGER_REVISION_MISMATCH');
  const active=new Set();for(const status of Object.values(state.statuses).filter(status=>activeAt(status,state.cursorGlobalTick))){const key=`${status.targetUnitId}\u0000${status.statusKey}`;invariant(!active.has(key),`STACKED_ACTIVE_CONDITION:${status.targetUnitId}:${status.statusKey}`);active.add(key);}
  return true;
}

export const COMBAT_CONDITION_LEDGER_FORMAT=FORMAT;
export const COMBAT_CONDITION_LEDGER_VERSION=VERSION;
export const COMBAT_CONDITION_DEFINITION_VERSION=DEFINITION_VERSION;
export {MOVE_SLOW_EFFECT_PAYLOAD_VERSION};
export const COMBAT_CONDITION_STATUS_KEYS=STATUS_KEYS;
export const G21_CONDITION_TRIAL=G21_TRIAL;
