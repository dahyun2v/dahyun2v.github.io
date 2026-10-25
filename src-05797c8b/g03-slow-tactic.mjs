import {
  executeCombatAction,
  getCombatResolverRecord,
  quoteCombatAction,
  reserveCombatAction,
  validateCombatResolverState,
} from './combat-resolver.mjs';
import {
  COMBAT_CONDITION_DEFINITION_VERSION,
  MOVE_SLOW_EFFECT_PAYLOAD_VERSION,
  applyCombatCondition,
  getActiveCombatConditions,
  validateCombatConditionLedger,
} from './combat-condition-ledger.mjs';

const VERSION=1;
const ID_PATTERN=/^[A-Za-z0-9._:,\/-]+$/;
const LOS_STATES=new Set(['CLEAR','BLOCKED','UNKNOWN']);
const ALLOWED_TROOPS=Object.freeze(['bow','engineer','mystic','spear']);
const MOVEMENT_PROGRESS_PERMILLE=Object.freeze({1:800,2:750,3:700,4:650,5:600});
const FINISHED_ACTION_STATUSES=new Set(['CANCELLED','RESOLVED_PENDING_COORDINATOR_MERGE','COMPLETED']);

// TACTIC_CONTROL is the shared resolver transport. Actual officer, troop,
// area, rank, and MOVE_SLOW semantics remain owned by this adapter.
const RESOLVER_DEFINITION=Object.freeze({
  actionId:'TACTIC_CONTROL',
  ownerSystem:'TROOP_COMBAT',
  definitionVersion:'BaseActionRegistry/I2-R3/1',
  preparedConsumption:'NONE',
  allowedTroopTypes:Object.freeze(['mystic']),
  staminaCost:24,
  windupTicks:10,
  recoveryTicks:12,
  cooldownTicks:40,
  eventProfile:'CONTROL',
  semanticTags:Object.freeze([]),
  losPolicy:'CLEAR_REQUIRED',
  emitEventNames:Object.freeze(['CONTROL_APPLIED']),
});

export const G03_SLOW_TACTIC_TRIAL=Object.freeze({
  status:'WORK_TRIAL_NOT_BALANCE_VALIDATED',
  officerId:'G03',
  traitId:'UT-G03',
  tacticId:'ART-G03',
  commandId:'TACTIC_CONTROL',
  cooldownFamily:'MOVEMENT_CONTROL',
  staminaCost:24,
  windupTicks:10,
  recoveryTicks:12,
  cooldownTicks:40,
  rangeTiles:3,
  minimumAreaTiles:1,
  maximumAreaTiles:3,
  slowDurationTicks:24,
  allowedTroopTypes:ALLOWED_TROOPS,
  movementProgressPermilleByTraitRank:MOVEMENT_PROGRESS_PERMILLE,
  resolverTransportTroopType:'mystic',
});

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function own(value,key){return Object.hasOwn(value,key);}
function clone(value){return structuredClone(value);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function bool(value,label){invariant(typeof value==='boolean',`${label} must be boolean`);return value;}
function stat(value,label){invariant(Number.isInteger(value)&&value>=0&&value<=100,`${label} must be an integer in 0..100`);return value;}
function definition(){return clone(RESOLVER_DEFINITION);}

function rejectCallerAuthority(input,label){
  for(const key of ['traitRank','rank','resolution','outcome','outcomes','targetResults','attackerStrategy','movementProgressPermille']){
    invariant(!own(input,key),`CALLER_${key.toUpperCase()}_NOT_ALLOWED:${label}`);
  }
}

function normalizeIds(values,label){
  invariant(Array.isArray(values),`${label} must be an array`);
  const normalized=values.map((value,index)=>id(value,`${label}[${index}]`)).sort();
  invariant(new Set(normalized).size===normalized.length,`DUPLICATE_${label.toUpperCase()}`);
  return normalized;
}

function normalizeIssueTiles(value){
  invariant(Array.isArray(value),'areaTiles must be an array');
  invariant(value.length>=G03_SLOW_TACTIC_TRIAL.minimumAreaTiles&&value.length<=G03_SLOW_TACTIC_TRIAL.maximumAreaTiles,'G03_AREA_REQUIRES_ONE_TO_THREE_TILES');
  const tiles=value.map((tile,index)=>{
    invariant(object(tile),`areaTiles[${index}] must be an object`);
    const losState=id(tile.losState,`areaTiles[${index}].losState`);
    invariant(LOS_STATES.has(losState),`areaTiles[${index}].losState must be CLEAR, BLOCKED, or UNKNOWN`);
    return {
      tileId:id(tile.tileId,`areaTiles[${index}].tileId`),
      distanceTiles:uint(tile.distanceTiles,`areaTiles[${index}].distanceTiles`),
      losState,
      visible:bool(tile.visible,`areaTiles[${index}].visible`),
      neighborTileIds:normalizeIds(tile.neighborTileIds??[],`areaTiles[${index}].neighborTileIds`),
      observedHostileUnitIds:normalizeIds(tile.observedHostileUnitIds??[],`areaTiles[${index}].observedHostileUnitIds`),
    };
  }).sort((a,b)=>a.tileId.localeCompare(b.tileId));
  invariant(new Set(tiles.map(tile=>tile.tileId)).size===tiles.length,'DUPLICATE_G03_AREA_TILE');
  return tiles;
}

function areaConnected(tiles){
  const selected=new Set(tiles.map(tile=>tile.tileId)),neighbors=new Map(tiles.map(tile=>[tile.tileId,new Set()]));
  for(const tile of tiles){
    for(const neighborId of tile.neighborTileIds){
      if(!selected.has(neighborId))continue;
      neighbors.get(tile.tileId).add(neighborId);
      neighbors.get(neighborId).add(tile.tileId);
    }
  }
  const visited=new Set(),queue=[tiles[0].tileId];
  while(queue.length){
    const tileId=queue.shift();
    if(visited.has(tileId))continue;
    visited.add(tileId);
    for(const neighborId of neighbors.get(tileId))if(!visited.has(neighborId))queue.push(neighborId);
  }
  return visited.size===tiles.length;
}

function normalizeDecisionInput(state,input){
  invariant(object(input),'G03 tactic decision input is required');
  rejectCallerAuthority(input,'DECISION');
  const normalized={
    actionInstanceId:id(input.actionInstanceId,'actionInstanceId'),
    sourceUnitId:id(input.sourceUnitId,'sourceUnitId'),
    sourceOfficerId:id(input.sourceOfficerId,'sourceOfficerId'),
    sourceTroopType:id(input.sourceTroopType,'sourceTroopType'),
    tacticId:id(input.tacticId,'tacticId'),
    applicationBatchId:id(input.applicationBatchId,'applicationBatchId'),
    currentTick:uint(input.currentTick,'currentTick'),
    areaTiles:normalizeIssueTiles(input.areaTiles),
  };
  invariant(normalized.sourceUnitId===state.resolverState.actorRef,`ACTOR_SCOPE_MISMATCH:${normalized.sourceUnitId}`);
  return normalized;
}

function sourceConfused(state,globalTick){
  if(globalTick<state.conditionLedger.cursorGlobalTick)return false;
  return getActiveCombatConditions(state.conditionLedger,{targetUnitId:state.sourceProfile.sourceUnitId,globalTick,statusKey:'CONFUSION'}).length>0;
}

function decisionReason(state,input){
  if(input.sourceOfficerId!==G03_SLOW_TACTIC_TRIAL.officerId)return 'G03_OFFICER_REQUIRED';
  if(input.tacticId!==G03_SLOW_TACTIC_TRIAL.tacticId)return 'ART_G03_REQUIRED';
  if(input.sourceUnitId!==state.sourceProfile.sourceUnitId)return 'G03_SOURCE_UNIT_REQUIRED';
  if(!ALLOWED_TROOPS.includes(input.sourceTroopType))return 'G03_TROOP_NOT_ALLOWED';
  if(input.currentTick<state.conditionLedger.cursorGlobalTick)return 'CONDITION_LEDGER_AHEAD_OF_ACTION';
  if(sourceConfused(state,input.currentTick))return 'CONFUSION_ACTION_BLOCKED';
  if(!areaConnected(input.areaTiles))return 'AREA_NOT_CONNECTED';
  for(const tile of input.areaTiles){
    if(!tile.visible)return `AREA_TILE_NOT_VISIBLE:${tile.tileId}`;
    if(tile.distanceTiles>G03_SLOW_TACTIC_TRIAL.rangeTiles)return `AREA_TILE_OUT_OF_RANGE:${tile.tileId}`;
    if(tile.losState!=='CLEAR')return `LOS_${tile.losState}:${tile.tileId}`;
  }
  if(!input.areaTiles.some(tile=>tile.observedHostileUnitIds.length>0))return 'NO_OBSERVED_HOSTILE_IN_AREA';
  return null;
}

function publicCommand(state,input){
  return {
    actionInstanceId:input.actionInstanceId,
    commandId:G03_SLOW_TACTIC_TRIAL.commandId,
    tacticId:G03_SLOW_TACTIC_TRIAL.tacticId,
    cooldownFamily:G03_SLOW_TACTIC_TRIAL.cooldownFamily,
    sourceUnitId:input.sourceUnitId,
    sourceOfficerId:G03_SLOW_TACTIC_TRIAL.officerId,
    sourceTroopType:input.sourceTroopType,
    applicationBatchId:input.applicationBatchId,
    traitId:G03_SLOW_TACTIC_TRIAL.traitId,
    traitRank:state.sourceProfile.traitRank,
    issuedGlobalTick:input.currentTick,
    dueGlobalTick:input.currentTick+G03_SLOW_TACTIC_TRIAL.windupTicks,
    areaTileIds:input.areaTiles.map(tile=>tile.tileId),
    areaShapeVersion:1,
    rangeTiles:G03_SLOW_TACTIC_TRIAL.rangeTiles,
    losPolicy:'CLEAR_REQUIRED_FOR_EACH_TILE',
  };
}

function normalizeExecutionTiles(value){
  invariant(Array.isArray(value),'execution areaTiles must be an array');
  const tiles=value.map((tile,index)=>{
    invariant(object(tile),`execution areaTiles[${index}] must be an object`);
    const losState=id(tile.losState,`execution areaTiles[${index}].losState`);
    invariant(LOS_STATES.has(losState),`execution areaTiles[${index}].losState must be CLEAR, BLOCKED, or UNKNOWN`);
    return {tileId:id(tile.tileId,`execution areaTiles[${index}].tileId`),distanceTiles:uint(tile.distanceTiles,`execution areaTiles[${index}].distanceTiles`),losState};
  }).sort((a,b)=>a.tileId.localeCompare(b.tileId));
  invariant(new Set(tiles.map(tile=>tile.tileId)).size===tiles.length,'DUPLICATE_G03_EXECUTION_AREA_TILE');
  return tiles;
}

function normalizeExecutionTargets(value,areaTileIds){
  invariant(Array.isArray(value),'targetUnits must be an array');
  const area=new Set(areaTileIds);
  const targets=value.map((target,index)=>{
    invariant(object(target),`targetUnits[${index}] must be an object`);
    const normalized={targetUnitId:id(target.targetUnitId,`targetUnits[${index}].targetUnitId`),tileId:id(target.tileId,`targetUnits[${index}].tileId`),defenderInsight:stat(target.defenderInsight,`targetUnits[${index}].defenderInsight`)};
    invariant(area.has(normalized.tileId),`TARGET_OUTSIDE_FIXED_AREA:${normalized.targetUnitId}`);
    return normalized;
  }).sort((a,b)=>a.targetUnitId.localeCompare(b.targetUnitId));
  invariant(new Set(targets.map(target=>target.targetUnitId)).size===targets.length,'DUPLICATE_G03_TARGET');
  return targets;
}

function normalizeExecutionInput(input,areaTileIds){
  invariant(object(input),'G03 tactic execution input is required');
  rejectCallerAuthority(input,'EXECUTION');
  const normalized={
    actionInstanceId:id(input.actionInstanceId,'actionInstanceId'),
    currentTick:uint(input.currentTick,'currentTick'),
    sourceAvailable:bool(input.sourceAvailable??true,'sourceAvailable'),
    areaTiles:normalizeExecutionTiles(input.areaTiles),
    targetUnits:normalizeExecutionTargets(input.targetUnits??[],areaTileIds),
  };
  return normalized;
}

function executionReason(state,command,input){
  if(!input.sourceAvailable)return 'SOURCE_UNAVAILABLE';
  if(input.currentTick<state.conditionLedger.cursorGlobalTick)return 'CONDITION_LEDGER_AHEAD_OF_ACTION';
  if(sourceConfused(state,input.currentTick))return 'CONFUSION_ACTION_BLOCKED';
  if(JSON.stringify(input.areaTiles.map(tile=>tile.tileId))!==JSON.stringify(command.areaTileIds))return 'FIXED_AREA_CHANGED';
  for(const tile of input.areaTiles){
    if(tile.distanceTiles>G03_SLOW_TACTIC_TRIAL.rangeTiles)return `AREA_TILE_OUT_OF_RANGE:${tile.tileId}`;
    if(tile.losState!=='CLEAR')return `LOS_${tile.losState}:${tile.tileId}`;
  }
  return null;
}

function fnv1a64(value){
  let hash=0xcbf29ce484222325n;
  for(const character of value){hash^=BigInt(character.codePointAt(0));hash=BigInt.asUintN(64,hash*0x100000001b3n);}
  return hash;
}

export function calculateG03SlowTargetResolution({campaignSeed,actionInstanceId,targetUnitId,attackerStrategy,defenderInsight}={}){
  invariant(typeof campaignSeed==='string'&&campaignSeed.length>0,'campaignSeed must be a non-empty string');
  id(actionInstanceId,'actionInstanceId');id(targetUnitId,'targetUnitId');stat(attackerStrategy,'attackerStrategy');stat(defenderInsight,'defenderInsight');
  const chancePercent=Math.max(15,Math.min(85,50+attackerStrategy-defenderInsight));
  const roll=Number(fnv1a64(`${campaignSeed}:${actionInstanceId}:${targetUnitId}:${G03_SLOW_TACTIC_TRIAL.tacticId}`)%100n)+1;
  return {resolution:roll<=chancePercent?'SUCCESS':'RESISTED',chancePercent,roll};
}

function conditionInput(state,command,target,currentTick){
  const movementProgressPermille=MOVEMENT_PROGRESS_PERMILLE[state.sourceProfile.traitRank];
  return {
    requestId:`G03.CONDITION.${command.actionInstanceId}.${target.targetUnitId}`,
    statusInstanceId:`SLOW.${command.actionInstanceId}.${target.targetUnitId}`,
    statusKey:'MOVE_SLOW',
    targetUnitId:target.targetUnitId,
    sourceOfficerId:G03_SLOW_TACTIC_TRIAL.officerId,
    sourceTacticId:G03_SLOW_TACTIC_TRIAL.tacticId,
    sourceUnitId:command.sourceUnitId,
    applicationMode:'AREA_DIRECT',
    applicationBatchId:command.applicationBatchId,
    startGlobalTick:currentTick,
    durationTicks:G03_SLOW_TACTIC_TRIAL.slowDurationTicks,
    cleanseable:true,
    traitModifierRefs:[`${G03_SLOW_TACTIC_TRIAL.traitId}:R${state.sourceProfile.traitRank}`],
    definitionVersion:COMBAT_CONDITION_DEFINITION_VERSION,
    effectPayloadVersion:MOVE_SLOW_EFFECT_PAYLOAD_VERSION,
    movementProgressPermille,
  };
}

function coordinatorEntry(command,targetResults){
  return {
    actorRef:command.sourceUnitId,
    actionInstanceId:command.actionInstanceId,
    actorPostMergeState:'UNCHANGED',
    appliedResults:targetResults.map((target,index)=>({
      resultId:`${command.actionInstanceId}/${target.targetUnitId}/${index}`,
      personnelDamage:0,
      moraleDelta:0,
      healedActive:0,
      beneficialDelta:0,
      controlApplied:target.conditionChanged,
      routePending:false,
    })),
  };
}

export function createG03SlowTacticState({resolverState,conditionLedger,campaignSeed,sourceProfile,actions={}}={}){
  validateCombatResolverState(resolverState);validateCombatConditionLedger(conditionLedger);
  invariant(resolverState.battleId===conditionLedger.battleId,'G03_TACTIC_BATTLE_SCOPE_MISMATCH');
  invariant(typeof campaignSeed==='string'&&campaignSeed.length>0,'campaignSeed must be a non-empty string');
  invariant(object(sourceProfile),'G03 sourceProfile is required');
  const normalizedProfile={
    sourceUnitId:id(sourceProfile.sourceUnitId,'sourceProfile.sourceUnitId'),
    sourceOfficerId:id(sourceProfile.sourceOfficerId,'sourceProfile.sourceOfficerId'),
    traitId:id(sourceProfile.traitId,'sourceProfile.traitId'),
    traitRank:uint(sourceProfile.traitRank,'sourceProfile.traitRank'),
    strategy:stat(sourceProfile.strategy,'sourceProfile.strategy'),
  };
  invariant(normalizedProfile.sourceUnitId===resolverState.actorRef,'G03_PROFILE_ACTOR_SCOPE_MISMATCH');
  invariant(normalizedProfile.sourceOfficerId==='G03','G03_PROFILE_OFFICER_REQUIRED');
  invariant(normalizedProfile.traitId==='UT-G03','G03_PROFILE_TRAIT_REQUIRED');
  invariant(normalizedProfile.traitRank>=1&&normalizedProfile.traitRank<=5,'G03_PROFILE_TRAIT_RANK_MUST_BE_1_TO_5');
  invariant(object(actions),'G03 tactic actions are required');
  const state={schemaVersion:VERSION,resolverState:clone(resolverState),conditionLedger:clone(conditionLedger),campaignSeed,sourceProfile:normalizedProfile,actions:clone(actions)};
  validateG03SlowTacticState(state);return state;
}

export function quoteG03SlowTactic(state,input={}){
  validateG03SlowTacticState(state);
  const normalized=normalizeDecisionInput(state,input),base=quoteCombatAction(state.resolverState,{definition:definition(),currentTick:normalized.currentTick});
  const reason=decisionReason(state,normalized)??base.reason;
  return {...base,actionId:G03_SLOW_TACTIC_TRIAL.tacticId,commandId:G03_SLOW_TACTIC_TRIAL.commandId,cooldownFamily:G03_SLOW_TACTIC_TRIAL.cooldownFamily,actualTroopType:normalized.sourceTroopType,areaTileCount:normalized.areaTiles.length,rangeTiles:G03_SLOW_TACTIC_TRIAL.rangeTiles,available:reason===null,reason};
}

export function reserveG03SlowTactic(state,input={}){
  validateG03SlowTacticState(state);
  const normalized=normalizeDecisionInput(state,input),fingerprint=JSON.stringify(normalized),existing=state.actions[normalized.actionInstanceId];
  if(existing){
    invariant(existing.decisionFingerprint===fingerprint,`CONFLICTING_G03_TACTIC_DECISION:${normalized.actionInstanceId}`);
    return {state:clone(state),command:clone(existing.command),quote:clone(existing.quote),replayed:true};
  }
  const quote=quoteG03SlowTactic(state,normalized);invariant(quote.available,`ACTION_UNAVAILABLE:${quote.reason}`);
  const command=publicCommand(state,normalized);
  const resolverState=reserveCombatAction(state.resolverState,{actionInstanceId:normalized.actionInstanceId,definition:definition(),actorRef:normalized.sourceUnitId,actorTroopType:G03_SLOW_TACTIC_TRIAL.resolverTransportTroopType,targetRef:`AREA:${command.areaTileIds.join(',')}`,currentTick:normalized.currentTick,decisionValidation:{valid:true,losState:'CLEAR'}});
  const next=clone(state);next.resolverState=resolverState;next.actions[normalized.actionInstanceId]={actionInstanceId:normalized.actionInstanceId,status:'RESERVED',decisionFingerprint:fingerprint,executionFingerprint:null,quote:clone(quote),command,output:null};
  validateG03SlowTacticState(next);return {state:next,command:clone(command),quote:clone(quote),replayed:false};
}

export function interruptReservedG03SlowTacticForConfusion(state,{actionInstanceId,currentTick}={}){
  validateG03SlowTacticState(state);id(actionInstanceId,'actionInstanceId');uint(currentTick,'currentTick');
  const context=state.actions[actionInstanceId];invariant(context,`UNKNOWN_G03_TACTIC_ACTION:${actionInstanceId}`);
  const confusion=getActiveCombatConditions(state.conditionLedger,{targetUnitId:context.command.sourceUnitId,globalTick:currentTick,statusKey:'CONFUSION'})[0]??null;
  invariant(confusion,`G03_INTERRUPTION_REQUIRES_ACTIVE_CONFUSION:${actionInstanceId}`);
  const fingerprint=JSON.stringify({actionInstanceId,currentTick,confusionStatusInstanceId:confusion.statusInstanceId});
  if(context.status!=='RESERVED'){
    invariant(context.status==='CANCELLED'&&context.executionFingerprint===fingerprint,`CONFLICTING_G03_TACTIC_INTERRUPTION:${actionInstanceId}`);
    return {state:clone(state),result:clone(context.output),replayed:true};
  }
  const record=getCombatResolverRecord(state.resolverState,actionInstanceId);invariant(record?.instance.status==='RESERVED'&&record.lifecycle.status==='RESERVED',`G03_TACTIC_NOT_INTERRUPTIBLE:${actionInstanceId}`);
  const next=clone(state),resolver=next.resolverState,lifecycle=resolver.lifecycleState,action=lifecycle.actions[actionInstanceId],instance=resolver.instances[actionInstanceId];
  invariant(lifecycle.stamina.reserved>=action.quotedCost,'G03_INTERRUPTION_RESERVATION_MISMATCH');
  lifecycle.stamina.reserved-=action.quotedCost;action.status='CANCELLED';action.validationTick=currentTick;action.cancelReason='CONDITION_NO_LONGER_MET';
  const validation={valid:false,internalReason:'CONFUSION_APPLIED',publicReason:'CONDITION_NO_LONGER_MET',losState:'CLEAR'};
  instance.status='CANCELLED';instance.execution={tick:currentTick,validation,fingerprint:JSON.stringify({tick:currentTick,validation,results:[]})};
  const output={status:'CANCELLED',internalReason:'CONFUSION_APPLIED',resolution:'NOT_RESOLVED',targetResults:[],coordinatorEntry:null,persistentZone:null,interruptionFingerprint:fingerprint};
  next.actions[actionInstanceId].status='CANCELLED';next.actions[actionInstanceId].executionFingerprint=fingerprint;next.actions[actionInstanceId].output=clone(output);
  validateG03SlowTacticState(next);return {state:next,result:output,replayed:false};
}

export function resolveG03SlowTactic(state,input={}){
  validateG03SlowTacticState(state);
  invariant(object(input),'G03 tactic execution input is required');
  const actionInstanceId=id(input.actionInstanceId,'actionInstanceId'),context=state.actions[actionInstanceId];invariant(context,`UNKNOWN_G03_TACTIC_ACTION:${actionInstanceId}`);
  const normalized=normalizeExecutionInput(input,context.command.areaTileIds),fingerprint=JSON.stringify(normalized);
  if(context.status!=='RESERVED'){
    invariant(FINISHED_ACTION_STATUSES.has(context.status)&&context.executionFingerprint===fingerprint,`CONFLICTING_G03_TACTIC_EXECUTION:${actionInstanceId}`);
    return {state:clone(state),result:clone(context.output),replayed:true};
  }
  const reason=executionReason(state,context.command,normalized);
  if(reason!==null){
    const failedLosTile=normalized.areaTiles.find(tile=>tile.losState!=='CLEAR')??null;
    const resolverLosState=failedLosTile?.losState??'CLEAR';
    const resolverReason=failedLosTile?`LOS_${resolverLosState}`:reason;
    const resolverState=executeCombatAction(state.resolverState,{actionInstanceId,currentTick:normalized.currentTick,executionValidation:{valid:false,internalReason:resolverReason,publicReason:'CONDITION_NO_LONGER_MET',losState:resolverLosState},results:[]});
    const output={status:'CANCELLED',internalReason:reason,resolution:'NOT_RESOLVED',targetResults:[],coordinatorEntry:null,persistentZone:null};
    const next=clone(state);next.resolverState=resolverState;next.actions[actionInstanceId].status='CANCELLED';next.actions[actionInstanceId].executionFingerprint=fingerprint;next.actions[actionInstanceId].output=clone(output);
    validateG03SlowTacticState(next);return {state:next,result:output,replayed:false};
  }

  const targetResults=normalized.targetUnits.map(target=>({
    ...target,
    ...calculateG03SlowTargetResolution({campaignSeed:state.campaignSeed,actionInstanceId,targetUnitId:target.targetUnitId,attackerStrategy:state.sourceProfile.strategy,defenderInsight:target.defenderInsight}),
  }));
  const resolverState=executeCombatAction(state.resolverState,{actionInstanceId,currentTick:normalized.currentTick,executionValidation:{valid:true,losState:'CLEAR'},results:targetResults.map(target=>({targetRef:target.targetUnitId,effectValue:target.resolution==='SUCCESS'?1:0}))});

  // All condition writes happen against a private clone. Any later conflict
  // throws before the returned state can expose a partial multi-target commit.
  let conditionLedger=clone(state.conditionLedger);
  for(const target of targetResults){
    if(target.resolution!=='SUCCESS'){
      target.conditionApplicationStatus='NOT_ATTEMPTED';target.createdStatusInstanceId=null;target.activeStatusInstanceId=null;target.conditionChanged=false;continue;
    }
    const applied=applyCombatCondition(conditionLedger,conditionInput(state,context.command,target,normalized.currentTick));
    conditionLedger=applied.state;target.conditionApplicationStatus=applied.result.status;target.createdStatusInstanceId=['APPLIED','REAPPLIED_LATER_END'].includes(applied.result.status)?`SLOW.${actionInstanceId}.${target.targetUnitId}`:null;target.activeStatusInstanceId=applied.result.statusInstanceId;target.conditionChanged=['APPLIED','REAPPLIED_LATER_END'].includes(applied.result.status);
  }
  const publicTargetResults=targetResults.map(target=>({targetUnitId:target.targetUnitId,resolution:target.resolution,conditionApplicationStatus:target.conditionApplicationStatus,createdStatusInstanceId:target.createdStatusInstanceId,activeStatusInstanceId:target.activeStatusInstanceId,conditionChanged:target.conditionChanged}));
  const entry=coordinatorEntry(context.command,publicTargetResults);
  const output={status:publicTargetResults.length===0?'WHIFF':'RESOLVED_PENDING_COORDINATOR_MERGE',resolution:publicTargetResults.length===0?'WHIFF':'TARGETS_RESOLVED',targetResults:publicTargetResults,coordinatorEntry:entry,persistentZone:null};
  const next=clone(state);next.resolverState=resolverState;next.conditionLedger=conditionLedger;next.actions[actionInstanceId].status='RESOLVED_PENDING_COORDINATOR_MERGE';next.actions[actionInstanceId].executionFingerprint=fingerprint;next.actions[actionInstanceId].output=clone(output);
  validateG03SlowTacticState(next);return {state:next,result:output,replayed:false};
}

export function acknowledgeG03SlowCoordinatorMerge(state,{actionInstanceId,currentTick}={}){
  validateG03SlowTacticState(state);id(actionInstanceId,'actionInstanceId');uint(currentTick,'currentTick');
  const context=state.actions[actionInstanceId];invariant(context,`UNKNOWN_G03_TACTIC_ACTION:${actionInstanceId}`);const fingerprint=JSON.stringify({actionInstanceId,currentTick});
  if(context.status==='COMPLETED'){
    invariant(context.output?.coordinatorMergeFingerprint===fingerprint,`CONFLICTING_G03_COORDINATOR_ACK:${actionInstanceId}`);return {state:clone(state),result:clone(context.output),replayed:true};
  }
  invariant(context.status==='RESOLVED_PENDING_COORDINATOR_MERGE',`G03_TACTIC_NOT_AWAITING_COORDINATOR:${actionInstanceId}`);
  const record=getCombatResolverRecord(state.resolverState,actionInstanceId);invariant(record?.instance.status==='RESULTS_MERGED'&&record.instance.merge?.tick===currentTick,`G03_COORDINATOR_MERGE_NOT_FOUND:${actionInstanceId}`);
  const next=clone(state);next.actions[actionInstanceId].status='COMPLETED';next.actions[actionInstanceId].output.status='COMPLETED';next.actions[actionInstanceId].output.coordinatorMergeFingerprint=fingerprint;
  validateG03SlowTacticState(next);return {state:next,result:clone(next.actions[actionInstanceId].output),replayed:false};
}

export function validateG03SlowTacticState(state){
  invariant(object(state)&&state.schemaVersion===VERSION,'UNSUPPORTED_G03_SLOW_TACTIC_STATE_VERSION');validateCombatResolverState(state.resolverState);validateCombatConditionLedger(state.conditionLedger);
  invariant(state.resolverState.battleId===state.conditionLedger.battleId,'G03_TACTIC_BATTLE_SCOPE_MISMATCH');invariant(typeof state.campaignSeed==='string'&&state.campaignSeed.length>0,'campaignSeed must be a non-empty string');
  invariant(object(state.sourceProfile),'G03 sourceProfile is required');invariant(state.sourceProfile.sourceUnitId===state.resolverState.actorRef,'G03_PROFILE_ACTOR_SCOPE_MISMATCH');invariant(state.sourceProfile.sourceOfficerId==='G03'&&state.sourceProfile.traitId==='UT-G03','INVALID_G03_CANONICAL_PROFILE');invariant(Number.isInteger(state.sourceProfile.traitRank)&&state.sourceProfile.traitRank>=1&&state.sourceProfile.traitRank<=5,'INVALID_G03_CANONICAL_TRAIT_RANK');stat(state.sourceProfile.strategy,'sourceProfile.strategy');invariant(object(state.actions),'G03 tactic actions are required');
  for(const[actionInstanceId,context]of Object.entries(state.actions)){
    id(actionInstanceId,'G03 actionInstanceId');invariant(object(context)&&context.actionInstanceId===actionInstanceId,`G03_ACTION_KEY_MISMATCH:${actionInstanceId}`);invariant(['RESERVED','CANCELLED','RESOLVED_PENDING_COORDINATOR_MERGE','COMPLETED'].includes(context.status),`INVALID_G03_ACTION_STATUS:${context.status}`);invariant(typeof context.decisionFingerprint==='string'&&object(context.quote)&&object(context.command),'G03 action context is incomplete');
    const command=context.command;invariant(command.actionInstanceId===actionInstanceId&&command.commandId==='TACTIC_CONTROL'&&command.tacticId==='ART-G03',`INVALID_G03_COMMAND:${actionInstanceId}`);invariant(command.sourceUnitId===state.sourceProfile.sourceUnitId&&command.sourceOfficerId==='G03'&&command.traitId==='UT-G03'&&command.traitRank===state.sourceProfile.traitRank,`INVALID_G03_COMMAND_SOURCE:${actionInstanceId}`);invariant(ALLOWED_TROOPS.includes(command.sourceTroopType),`INVALID_G03_COMMAND_TROOP:${actionInstanceId}`);invariant(command.cooldownFamily==='MOVEMENT_CONTROL'&&Array.isArray(command.areaTileIds)&&command.areaTileIds.length>=1&&command.areaTileIds.length<=3&&new Set(command.areaTileIds).size===command.areaTileIds.length,`INVALID_G03_COMMAND_CONTRACT:${actionInstanceId}`);
    const record=getCombatResolverRecord(state.resolverState,actionInstanceId);invariant(record&&record.instance.actionId==='TACTIC_CONTROL'&&record.instance.actorTroopType==='mystic',`MISSING_G03_RESOLVER_ACTION:${actionInstanceId}`);invariant(record.lifecycle.definition.staminaCost===24&&record.lifecycle.definition.windupTicks===10&&record.lifecycle.definition.recoveryTicks===12&&record.lifecycle.definition.cooldownTicks===40,`G03_LIFECYCLE_CONTRACT_MISMATCH:${actionInstanceId}`);
    if(context.status==='RESERVED')invariant(record.instance.status==='RESERVED'&&context.executionFingerprint===null&&context.output===null,`G03_RESERVED_STATE_MISMATCH:${actionInstanceId}`);
    else if(context.status==='CANCELLED')invariant(record.instance.status==='CANCELLED'&&typeof context.executionFingerprint==='string'&&object(context.output)&&context.output.status==='CANCELLED',`G03_CANCELLED_STATE_MISMATCH:${actionInstanceId}`);
    else if(context.status==='RESOLVED_PENDING_COORDINATOR_MERGE')invariant(['RESOLVED','RESULTS_MERGED'].includes(record.instance.status)&&typeof context.executionFingerprint==='string'&&object(context.output)&&['RESOLVED_PENDING_COORDINATOR_MERGE','WHIFF'].includes(context.output.status),`G03_RESOLVED_STATE_MISMATCH:${actionInstanceId}`);
    else invariant(record.instance.status==='RESULTS_MERGED'&&typeof context.executionFingerprint==='string'&&object(context.output)&&context.output.status==='COMPLETED'&&typeof context.output.coordinatorMergeFingerprint==='string',`G03_COMPLETED_STATE_MISMATCH:${actionInstanceId}`);
  }
  return true;
}

export const G03_SLOW_TACTIC_STATE_VERSION=VERSION;
