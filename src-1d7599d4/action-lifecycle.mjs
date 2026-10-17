const FORMAT='sangoku-action-lifecycle';
const VERSION=1;
const ID_PATTERN=/^[A-Za-z0-9._:-]+$/;
const ACTIVE_RESERVATION_STATUSES=new Set(['RESERVED','VALIDATED']);
const EXECUTED_STATUSES=new Set(['EXECUTED','RESOLVED','RESULTS_MERGED','SETTLED']);

function invariant(condition,message){if(!condition)throw new Error(message);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function own(object,key){return Object.hasOwn(object,key);}

function normalizeDefinition(definition){
  invariant(definition&&typeof definition==='object','definition is required');
  return {
    actionId:id(definition.actionId,'actionId'),
    staminaCost:uint(definition.staminaCost,'staminaCost'),
    windupTicks:uint(definition.windupTicks??0,'windupTicks'),
    recoveryTicks:uint(definition.recoveryTicks??0,'recoveryTicks'),
    cooldownTicks:uint(definition.cooldownTicks??0,'cooldownTicks'),
  };
}

function normalizeToken(token){
  invariant(token&&typeof token==='object','discount token is required');
  const type=token.type??'fixed';
  invariant(type==='fixed',`UNSUPPORTED_DISCOUNT_TYPE:${type}`);
  return {
    tokenId:id(token.tokenId,'tokenId'),
    type,
    amount:uint(token.amount,'discount amount'),
    securedTick:uint(token.securedTick,'securedTick'),
    status:'READY',
    heldBy:null,
    consumedBy:null,
  };
}

function normalizeTokenIds(discountTokenIds=[]){
  invariant(Array.isArray(discountTokenIds),'discountTokenIds must be an array');
  const result=discountTokenIds.map(value=>id(value,'discountTokenId')).sort();
  invariant(new Set(result).size===result.length,'duplicate discountTokenId');
  return result;
}

export function createActionLifecycleState({stamina,discountTokens=[]}={}){
  uint(stamina,'stamina');
  invariant(Array.isArray(discountTokens),'discountTokens must be an array');
  const tokens={};
  for(const input of discountTokens){
    const token=normalizeToken(input);
    invariant(!own(tokens,token.tokenId),`duplicate tokenId:${token.tokenId}`);
    tokens[token.tokenId]=token;
  }
  return {
    schemaVersion:VERSION,
    stamina:{current:stamina,reserved:0},
    recoveryEndTick:0,
    cooldownEnds:{},
    discountTokens:tokens,
    actions:{},
    processedRefunds:{},
  };
}

export function quoteAction(state,{definition,currentTick,discountTokenIds=[]}){
  validateActionLifecycleState(state);
  const action=normalizeDefinition(definition);
  const tick=uint(currentTick,'currentTick');
  const tokenIds=normalizeTokenIds(discountTokenIds);
  let flatDiscount=0;
  let reason=null;
  for(const tokenId of tokenIds){
    const token=state.discountTokens[tokenId];
    if(!token){reason??=`UNKNOWN_DISCOUNT_TOKEN:${tokenId}`;continue;}
    if(token.type!=='fixed')throw new Error(`UNSUPPORTED_DISCOUNT_TYPE:${token.type}`);
    if(token.status!=='READY'){reason??=`DISCOUNT_TOKEN_NOT_READY:${tokenId}`;continue;}
    if(token.securedTick>=tick){reason??=`DISCOUNT_TOKEN_NOT_PRIOR_TICK:${tokenId}`;continue;}
    flatDiscount+=token.amount;
  }
  const quotedCost=Math.max(0,action.staminaCost-flatDiscount);
  const availableStamina=state.stamina.current-state.stamina.reserved;
  const cooldownEndTick=state.cooldownEnds[action.actionId]??0;
  const nextAvailableTick=Math.max(state.recoveryEndTick,cooldownEndTick);
  if(tick<state.recoveryEndTick)reason??='RECOVERY_ACTIVE';
  if(tick<cooldownEndTick)reason??='ACTION_COOLDOWN_ACTIVE';
  if(availableStamina<quotedCost)reason??='INSUFFICIENT_STAMINA';
  return {
    actionId:action.actionId,
    currentTick:tick,
    baseCost:action.staminaCost,
    flatDiscount,
    quotedCost,
    availableStamina,
    recoveryEndTick:state.recoveryEndTick,
    cooldownEndTick,
    nextAvailableTick,
    available:reason===null,
    reason,
  };
}

export function decisionCommit(state,{actionInstanceId,definition,currentTick,discountTokenIds=[]}){
  validateActionLifecycleState(state);
  const instanceId=id(actionInstanceId,'actionInstanceId');
  const action=normalizeDefinition(definition);
  const tick=uint(currentTick,'currentTick');
  const tokenIds=normalizeTokenIds(discountTokenIds);
  const replayKey={definition:action,decisionTick:tick,discountTokenIds:tokenIds};
  const existing=state.actions[instanceId];
  if(existing){
    invariant(same({definition:existing.definition,decisionTick:existing.decisionTick,discountTokenIds:existing.discountTokenIds},replayKey),`CONFLICTING_ACTION_INSTANCE:${instanceId}`);
    return clone(state);
  }
  const quote=quoteAction(state,{definition:action,currentTick:tick,discountTokenIds:tokenIds});
  invariant(quote.available,`ACTION_UNAVAILABLE:${quote.reason}`);
  const next=clone(state);
  next.stamina.reserved+=quote.quotedCost;
  for(const tokenId of tokenIds){
    const token=next.discountTokens[tokenId];
    token.status='HELD';
    token.heldBy=instanceId;
  }
  next.actions[instanceId]={
    actionInstanceId:instanceId,
    definition:action,
    status:'RESERVED',
    decisionTick:tick,
    windupEndTick:tick+action.windupTicks,
    validationTick:null,
    executionTick:null,
    discountTokenIds:tokenIds,
    baseCost:quote.baseCost,
    flatDiscount:quote.flatDiscount,
    quotedCost:quote.quotedCost,
    chargedStamina:0,
    refundedStamina:0,
    netCost:0,
    recoveryEndTick:0,
    cooldownEndTick:0,
    cancelReason:null,
    resolution:null,
    merge:null,
  };
  return next;
}

function releaseReservation(next,record){
  next.stamina.reserved-=record.quotedCost;
  for(const tokenId of record.discountTokenIds){
    const token=next.discountTokens[tokenId];
    invariant(token.status==='HELD'&&token.heldBy===record.actionInstanceId,`DISCOUNT_HOLD_MISMATCH:${tokenId}`);
    token.status='READY';
    token.heldBy=null;
  }
}

export function executionValidation(state,{actionInstanceId,currentTick,isValid,cancelReason='CONDITION_NO_LONGER_MET'}){
  validateActionLifecycleState(state);
  const instanceId=id(actionInstanceId,'actionInstanceId');
  const tick=uint(currentTick,'currentTick');
  invariant(typeof isValid==='boolean','isValid must be boolean');
  const existing=state.actions[instanceId];
  invariant(existing,`UNKNOWN_ACTION_INSTANCE:${instanceId}`);
  if(existing.status==='VALIDATED'){
    invariant(isValid&&existing.validationTick===tick,`CONFLICTING_EXECUTION_VALIDATION:${instanceId}`);
    return clone(state);
  }
  if(existing.status==='CANCELLED'){
    invariant(!isValid&&existing.validationTick===tick&&existing.cancelReason===cancelReason,`CONFLICTING_EXECUTION_VALIDATION:${instanceId}`);
    return clone(state);
  }
  invariant(existing.status==='RESERVED',`INVALID_EXECUTION_VALIDATION_ORDER:${existing.status}`);
  invariant(tick>=existing.windupEndTick,`WINDUP_NOT_COMPLETE:${instanceId}`);
  const next=clone(state),record=next.actions[instanceId];
  record.validationTick=tick;
  if(isValid){
    record.status='VALIDATED';
  }else{
    id(cancelReason,'cancelReason');
    releaseReservation(next,record);
    record.status='CANCELLED';
    record.cancelReason=cancelReason;
  }
  return next;
}

export function executionCommit(state,{actionInstanceId,currentTick}){
  validateActionLifecycleState(state);
  const instanceId=id(actionInstanceId,'actionInstanceId');
  const tick=uint(currentTick,'currentTick');
  const existing=state.actions[instanceId];
  invariant(existing,`UNKNOWN_ACTION_INSTANCE:${instanceId}`);
  if(EXECUTED_STATUSES.has(existing.status)){
    invariant(existing.executionTick===tick,`CONFLICTING_EXECUTION_COMMIT:${instanceId}`);
    return clone(state);
  }
  invariant(existing.status==='VALIDATED',`INVALID_EXECUTION_COMMIT_ORDER:${existing.status}`);
  invariant(existing.validationTick===tick,`STALE_EXECUTION_VALIDATION:${instanceId}`);
  const next=clone(state),record=next.actions[instanceId];
  invariant(next.stamina.current>=record.quotedCost&&next.stamina.reserved>=record.quotedCost,'STAMINA_RESERVATION_MISMATCH');
  next.stamina.current-=record.quotedCost;
  next.stamina.reserved-=record.quotedCost;
  for(const tokenId of record.discountTokenIds){
    const token=next.discountTokens[tokenId];
    invariant(token.status==='HELD'&&token.heldBy===instanceId,`DISCOUNT_HOLD_MISMATCH:${tokenId}`);
    token.status='CONSUMED';
    token.heldBy=null;
    token.consumedBy=instanceId;
  }
  record.status='EXECUTED';
  record.executionTick=tick;
  record.chargedStamina=record.quotedCost;
  record.netCost=record.quotedCost;
  record.recoveryEndTick=tick+record.definition.recoveryTicks;
  record.cooldownEndTick=tick+record.definition.cooldownTicks;
  next.recoveryEndTick=Math.max(next.recoveryEndTick,record.recoveryEndTick);
  next.cooldownEnds[record.definition.actionId]=Math.max(next.cooldownEnds[record.definition.actionId]??0,record.cooldownEndTick);
  return next;
}

export function resolveAction(state,{actionInstanceId,effectValue}){
  validateActionLifecycleState(state);
  const instanceId=id(actionInstanceId,'actionInstanceId');
  uint(effectValue,'effectValue');
  const existing=state.actions[instanceId];
  invariant(existing,`UNKNOWN_ACTION_INSTANCE:${instanceId}`);
  if(['RESOLVED','RESULTS_MERGED','SETTLED'].includes(existing.status)){
    invariant(existing.resolution?.effectValue===effectValue,`CONFLICTING_RESOLUTION:${instanceId}`);
    return clone(state);
  }
  invariant(existing.status==='EXECUTED',`INVALID_RESOLUTION_ORDER:${existing.status}`);
  const next=clone(state),record=next.actions[instanceId];
  record.status='RESOLVED';
  record.resolution={effectValue};
  return next;
}

export function mergeActionResults(state,{actionInstanceId,actorPostMergeState='UNCHANGED'}){
  validateActionLifecycleState(state);
  const instanceId=id(actionInstanceId,'actionInstanceId');
  id(actorPostMergeState,'actorPostMergeState');
  const existing=state.actions[instanceId];
  invariant(existing,`UNKNOWN_ACTION_INSTANCE:${instanceId}`);
  if(['RESULTS_MERGED','SETTLED'].includes(existing.status)){
    invariant(existing.merge?.actorPostMergeState===actorPostMergeState,`CONFLICTING_RESULTS_MERGE:${instanceId}`);
    return clone(state);
  }
  invariant(existing.status==='RESOLVED',`INVALID_RESULTS_MERGE_ORDER:${existing.status}`);
  const next=clone(state),record=next.actions[instanceId];
  record.status='RESULTS_MERGED';
  record.merge={actorPostMergeState};
  return next;
}

export function settleSuccessRefund(state,{actionInstanceId,settlementSourceId,amount}){
  validateActionLifecycleState(state);
  const instanceId=id(actionInstanceId,'actionInstanceId');
  const sourceId=id(settlementSourceId,'settlementSourceId');
  const requested=uint(amount,'refund amount');
  const existing=state.actions[instanceId];
  invariant(existing,`UNKNOWN_ACTION_INSTANCE:${instanceId}`);
  invariant(['RESULTS_MERGED','SETTLED'].includes(existing.status),`INVALID_REFUND_ORDER:${existing.status}`);
  const processedKey=JSON.stringify([instanceId,sourceId]);
  if(own(state.processedRefunds,processedKey)){
    invariant(state.processedRefunds[processedKey].requested===requested,`CONFLICTING_REFUND_REPLAY:${processedKey}`);
    return clone(state);
  }
  const next=clone(state),record=next.actions[instanceId];
  const refundable=record.chargedStamina-record.refundedStamina;
  const applied=Math.min(requested,refundable);
  record.refundedStamina+=applied;
  record.netCost=record.chargedStamina-record.refundedStamina;
  record.status='SETTLED';
  next.stamina.current+=applied;
  next.processedRefunds[processedKey]={actionInstanceId:instanceId,settlementSourceId:sourceId,requested,applied};
  return next;
}

export function getActionRecord(state,actionInstanceId){
  validateActionLifecycleState(state);
  const record=state.actions[id(actionInstanceId,'actionInstanceId')];
  return record?clone(record):null;
}

export function serializeActionLifecycle(state){
  validateActionLifecycleState(state);
  return JSON.stringify({format:FORMAT,version:VERSION,state});
}

export function deserializeActionLifecycle(serialized){
  invariant(typeof serialized==='string','serialized lifecycle must be a string');
  let payload;
  try{payload=JSON.parse(serialized);}catch{throw new Error('INVALID_ACTION_LIFECYCLE_JSON');}
  invariant(payload?.format===FORMAT,'INVALID_ACTION_LIFECYCLE_FORMAT');
  invariant(payload.version===VERSION,'UNSUPPORTED_ACTION_LIFECYCLE_VERSION');
  validateActionLifecycleState(payload.state);
  return clone(payload.state);
}

export function validateActionLifecycleState(state){
  invariant(state&&typeof state==='object','action lifecycle state is required');
  invariant(state.schemaVersion===VERSION,'UNSUPPORTED_ACTION_LIFECYCLE_STATE_VERSION');
  invariant(state.stamina&&typeof state.stamina==='object','stamina ledger is required');
  uint(state.stamina.current,'stamina.current');
  uint(state.stamina.reserved,'stamina.reserved');
  uint(state.recoveryEndTick,'recoveryEndTick');
  for(const[actionId,endTick]of Object.entries(state.cooldownEnds??{})){id(actionId,'cooldown actionId');uint(endTick,'cooldown endTick');}
  let expectedReserved=0;
  for(const[instanceId,record]of Object.entries(state.actions??{})){
    id(instanceId,'actionInstanceId');
    invariant(record.actionInstanceId===instanceId,`ACTION_INSTANCE_KEY_MISMATCH:${instanceId}`);
    normalizeDefinition(record.definition);
    invariant(['RESERVED','VALIDATED','CANCELLED','EXECUTED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(record.status),`INVALID_ACTION_STATUS:${record.status}`);
    for(const field of ['decisionTick','windupEndTick','baseCost','flatDiscount','quotedCost','chargedStamina','refundedStamina','netCost','recoveryEndTick','cooldownEndTick'])uint(record[field],field);
    invariant(Array.isArray(record.discountTokenIds),'discountTokenIds must be an array');
    invariant(record.refundedStamina<=record.chargedStamina,`REFUND_EXCEEDS_CHARGE:${instanceId}`);
    invariant(record.netCost===record.chargedStamina-record.refundedStamina,`NET_COST_MISMATCH:${instanceId}`);
    if(ACTIVE_RESERVATION_STATUSES.has(record.status))expectedReserved+=record.quotedCost;
  }
  invariant(expectedReserved===state.stamina.reserved,'RESERVED_STAMINA_LEDGER_MISMATCH');
  for(const[tokenId,token]of Object.entries(state.discountTokens??{})){
    id(tokenId,'tokenId');
    invariant(token.tokenId===tokenId,`TOKEN_KEY_MISMATCH:${tokenId}`);
    invariant(token.type==='fixed',`UNSUPPORTED_DISCOUNT_TYPE:${token.type}`);
    uint(token.amount,'discount amount');uint(token.securedTick,'securedTick');
    invariant(['READY','HELD','CONSUMED'].includes(token.status),`INVALID_TOKEN_STATUS:${token.status}`);
    if(token.status==='HELD'){
      const holder=state.actions[token.heldBy];
      invariant(holder&&ACTIVE_RESERVATION_STATUSES.has(holder.status)&&holder.discountTokenIds.includes(tokenId),`ORPHAN_DISCOUNT_HOLD:${tokenId}`);
    }
    if(token.status==='READY')invariant(token.heldBy===null&&token.consumedBy===null,`INVALID_READY_TOKEN:${tokenId}`);
    if(token.status==='CONSUMED')invariant(token.heldBy===null&&typeof token.consumedBy==='string',`INVALID_CONSUMED_TOKEN:${tokenId}`);
  }
  for(const[key,refund]of Object.entries(state.processedRefunds??{})){
    invariant(key===JSON.stringify([refund.actionInstanceId,refund.settlementSourceId]),`REFUND_KEY_MISMATCH:${key}`);
    id(refund.actionInstanceId,'refund actionInstanceId');id(refund.settlementSourceId,'refund settlementSourceId');
    uint(refund.requested,'refund requested');uint(refund.applied,'refund applied');
    invariant(refund.applied<=refund.requested,'refund applied exceeds requested');
  }
  return true;
}

export const ACTION_LIFECYCLE_FORMAT=FORMAT;
export const ACTION_LIFECYCLE_VERSION=VERSION;
