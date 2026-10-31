import {
  executeCombatAction,
  getCombatResolverRecord,
  quoteCombatAction,
  reserveCombatAction,
  validateCombatResolverState,
} from './combat-resolver.mjs';
import {
  COMBAT_CONDITION_DEFINITION_VERSION,
  CONFUSION_TRIAL_SEMANTICS,
  advanceCombatConditionLedger,
  applyCombatCondition,
  calculateG21ConfusionDuration,
  capturePreExecutionConditionSnapshot,
  getActiveCombatConditions,
  validateCombatConditionLedger,
} from './combat-condition-ledger.mjs';

const VERSION=1;
const ID_PATTERN=/^[A-Za-z0-9._:,\/-]+$/;
const LOS_STATES=new Set(['CLEAR','BLOCKED','UNKNOWN']);
const ALLOWED_TROOPS=Object.freeze(['bow','engineer','mystic','spear']);
const ACTION_KINDS=new Set([...CONFUSION_TRIAL_SEMANTICS.allowedWhileActive,...CONFUSION_TRIAL_SEMANTICS.blockedWhileActive]);
const CONDITION_CHANGED_RESULTS=new Set(['APPLIED','REAPPLIED_LATER_END']);

// The shared resolver currently models TACTIC_CONTROL as the mental-control
// command channel and therefore accepts "mystic" internally. Actual unit
// eligibility is owned and preserved by this officer-tactic adapter.
const RESOLVER_DEFINITION=Object.freeze({
  actionId:'TACTIC_CONTROL',
  ownerSystem:'TROOP_COMBAT',
  definitionVersion:'BaseActionRegistry/I2-R3/1',
  preparedConsumption:'NONE',
  allowedTroopTypes:Object.freeze(['mystic']),
  staminaCost:18,
  windupTicks:8,
  recoveryTicks:12,
  cooldownTicks:40,
  eventProfile:'CONTROL',
  semanticTags:Object.freeze([]),
  losPolicy:'CLEAR_REQUIRED',
  emitEventNames:Object.freeze(['CONTROL_APPLIED']),
});

export const G21_CONFUSION_TACTIC_TRIAL=Object.freeze({
  status:'WORK_TRIAL',
  officerId:'G21',
  traitId:'UT-G21',
  tacticId:'ART-G21',
  commandId:'TACTIC_CONTROL',
  cooldownFamily:'MENTAL_DISRUPTION',
  staminaCost:18,
  windupTicks:8,
  recoveryTicks:12,
  cooldownTicks:40,
  rangeTiles:2,
  targetCount:1,
  losPolicy:'CLEAR_REQUIRED',
  allowedTroopTypes:ALLOWED_TROOPS,
  resolverTransportTroopType:'mystic',
});

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function own(value,key){return Object.hasOwn(value,key);}
function clone(value){return structuredClone(value);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function bool(value,label){invariant(typeof value==='boolean',`${label} must be boolean`);return value;}
function uniqueIds(values,label){
  invariant(Array.isArray(values),`${label} must be an array`);
  const normalized=values.map((value,index)=>id(value,`${label}[${index}]`)).sort();
  invariant(new Set(normalized).size===normalized.length,`DUPLICATE_${label.toUpperCase()}`);
  return normalized;
}

function definition(){return clone(RESOLVER_DEFINITION);}

function normalizeTargetActivity(input={}){
  invariant(object(input),'targetActivity must be an object');
  const inProgressActions=(input.inProgressActions??[]).map((action,index)=>{
    invariant(object(action),`inProgressActions[${index}] must be an object`);
    return {actionInstanceId:id(action.actionInstanceId,`inProgressActions[${index}].actionInstanceId`),actionKind:id(action.actionKind,`inProgressActions[${index}].actionKind`)};
  }).sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId));
  invariant(new Set(inProgressActions.map(action=>action.actionInstanceId)).size===inProgressActions.length,'DUPLICATE_IN_PROGRESS_ACTION');
  return {
    inProgressActions,
    activeProtectionIds:uniqueIds(input.activeProtectionIds??[],'activeProtectionIds'),
    completedDeploymentIds:uniqueIds(input.completedDeploymentIds??[],'completedDeploymentIds'),
  };
}

function normalizeDecisionInput(state,input){
  invariant(object(input),'G21 tactic decision input is required');
  invariant(!own(input,'targetUnitIds'),'G21_REQUIRES_EXACTLY_ONE_TARGET');
  invariant(!own(input,'discountTokenIds'),'G21_TRIAL_DISCOUNTS_NOT_ALLOWED');
  const normalized={
    actionInstanceId:id(input.actionInstanceId,'actionInstanceId'),
    sourceUnitId:id(input.sourceUnitId,'sourceUnitId'),
    sourceOfficerId:id(input.sourceOfficerId,'sourceOfficerId'),
    sourceTroopType:id(input.sourceTroopType,'sourceTroopType'),
    targetUnitId:id(input.targetUnitId,'targetUnitId'),
    tacticId:id(input.tacticId,'tacticId'),
    applicationBatchId:id(input.applicationBatchId,'applicationBatchId'),
    traitRank:uint(input.traitRank??0,'traitRank'),
    currentTick:uint(input.currentTick,'currentTick'),
    distanceTiles:uint(input.distanceTiles,'distanceTiles'),
    losState:id(input.losState,'losState'),
  };
  invariant(normalized.traitRank<=5,'traitRank must be in 0..5');
  invariant(LOS_STATES.has(normalized.losState),'losState must be CLEAR, BLOCKED, or UNKNOWN');
  invariant(normalized.sourceUnitId===state.resolverState.actorRef,`ACTOR_SCOPE_MISMATCH:${normalized.sourceUnitId}`);
  return normalized;
}

function permissionAt(conditionLedger,{targetUnitId,globalTick,actionKind}){
  validateCombatConditionLedger(conditionLedger);
  id(targetUnitId,'targetUnitId');uint(globalTick,'globalTick');id(actionKind,'actionKind');
  invariant(ACTION_KINDS.has(actionKind),`UNCLASSIFIED_CONFUSION_ACTION:${actionKind}`);
  invariant(globalTick>=conditionLedger.cursorGlobalTick,'CONDITION_PERMISSION_TICK_BEFORE_CURSOR');
  const confusion=getActiveCombatConditions(conditionLedger,{targetUnitId,globalTick,statusKey:'CONFUSION'})[0]??null;
  if(!confusion)return {allowed:true,reason:null,confusionStatusInstanceId:null};
  const allowed=CONFUSION_TRIAL_SEMANTICS.allowedWhileActive.includes(actionKind);
  return {allowed,reason:allowed?null:'CONFUSION_ACTION_BLOCKED',confusionStatusInstanceId:confusion.statusInstanceId};
}

function decisionReason(state,input){
  if(input.sourceOfficerId!==G21_CONFUSION_TACTIC_TRIAL.officerId)return 'G21_OFFICER_REQUIRED';
  if(input.tacticId!==G21_CONFUSION_TACTIC_TRIAL.tacticId)return 'ART_G21_REQUIRED';
  if(!ALLOWED_TROOPS.includes(input.sourceTroopType))return 'G21_TROOP_NOT_ALLOWED';
  if(input.losState!=='CLEAR')return `LOS_${input.losState}`;
  if(input.distanceTiles>G21_CONFUSION_TACTIC_TRIAL.rangeTiles)return 'TARGET_OUT_OF_RANGE';
  if(input.currentTick<state.conditionLedger.cursorGlobalTick)return 'CONDITION_LEDGER_AHEAD_OF_ACTION';
  const permission=permissionAt(state.conditionLedger,{targetUnitId:input.sourceUnitId,globalTick:input.currentTick,actionKind:'CAST'});
  return permission.allowed?null:permission.reason;
}

function publicCommand(input){
  return {
    actionInstanceId:input.actionInstanceId,
    commandId:G21_CONFUSION_TACTIC_TRIAL.commandId,
    tacticId:input.tacticId,
    cooldownFamily:G21_CONFUSION_TACTIC_TRIAL.cooldownFamily,
    sourceUnitId:input.sourceUnitId,
    sourceOfficerId:input.sourceOfficerId,
    sourceTroopType:input.sourceTroopType,
    targetUnitId:input.targetUnitId,
    applicationBatchId:input.applicationBatchId,
    traitRank:input.traitRank,
    issuedGlobalTick:input.currentTick,
    dueGlobalTick:input.currentTick+G21_CONFUSION_TACTIC_TRIAL.windupTicks,
    rangeTiles:G21_CONFUSION_TACTIC_TRIAL.rangeTiles,
    targetCount:G21_CONFUSION_TACTIC_TRIAL.targetCount,
    losPolicy:G21_CONFUSION_TACTIC_TRIAL.losPolicy,
    statusInstanceId:`CONFUSION.${input.actionInstanceId}`,
    conditionRequestId:`G21.CONDITION.${input.actionInstanceId}`,
    conditionAdvanceRequestId:`G21.ADVANCE.${input.actionInstanceId}`,
  };
}

function executionReason(state,context,input){
  if(input.losState!=='CLEAR')return `LOS_${input.losState}`;
  if(input.distanceTiles>G21_CONFUSION_TACTIC_TRIAL.rangeTiles)return 'TARGET_OUT_OF_RANGE';
  if(!input.sourceAvailable)return 'SOURCE_UNAVAILABLE';
  if(!input.targetAvailable)return 'TARGET_UNAVAILABLE';
  if(input.currentTick<state.conditionLedger.cursorGlobalTick)return 'CONDITION_LEDGER_AHEAD_OF_ACTION';
  const permission=permissionAt(state.conditionLedger,{targetUnitId:context.command.sourceUnitId,globalTick:input.currentTick,actionKind:'CAST'});
  return permission.allowed?null:permission.reason;
}

function normalizeExecutionInput(input){
  invariant(object(input),'G21 tactic execution input is required');
  const normalized={
    actionInstanceId:id(input.actionInstanceId,'actionInstanceId'),
    currentTick:uint(input.currentTick,'currentTick'),
    distanceTiles:uint(input.distanceTiles,'distanceTiles'),
    losState:id(input.losState,'losState'),
    sourceAvailable:bool(input.sourceAvailable??true,'sourceAvailable'),
    targetAvailable:bool(input.targetAvailable??true,'targetAvailable'),
    resolution:input.resolution??null,
    targetActivity:normalizeTargetActivity(input.targetActivity??{}),
  };
  invariant(LOS_STATES.has(normalized.losState),'losState must be CLEAR, BLOCKED, or UNKNOWN');
  if(normalized.resolution!==null){
    invariant(object(normalized.resolution),'resolution must be an object');
    normalized.resolution={controlApplied:bool(normalized.resolution.controlApplied,'resolution.controlApplied')};
  }
  return normalized;
}

function resultId(command){return `${command.actionInstanceId}/${command.targetUnitId}/0`;}

function coordinatorEntry(command,controlApplied){
  return {
    actorRef:command.sourceUnitId,
    actionInstanceId:command.actionInstanceId,
    actorPostMergeState:'UNCHANGED',
    appliedResults:[{
      resultId:resultId(command),
      personnelDamage:0,
      moraleDelta:0,
      healedActive:0,
      beneficialDelta:0,
      controlApplied,
      routePending:false,
    }],
  };
}

export function planConfusionOnApplyInterruptions({conditionApplicationStatus,targetActivity={}}={}){
  id(conditionApplicationStatus,'conditionApplicationStatus');
  const activity=normalizeTargetActivity(targetActivity);
  const changed=CONDITION_CHANGED_RESULTS.has(conditionApplicationStatus);
  return {
    conditionChanged:changed,
    cancelActionInstanceIds:changed?activity.inProgressActions.filter(action=>action.actionKind==='CAST'||action.actionKind==='DEPLOY').map(action=>action.actionInstanceId):[],
    preserveInProgressActionIds:activity.inProgressActions.filter(action=>!changed||(action.actionKind!=='CAST'&&action.actionKind!=='DEPLOY')).map(action=>action.actionInstanceId),
    endProtectionIds:changed?[...activity.activeProtectionIds]:[],
    preserveCompletedDeploymentIds:[...activity.completedDeploymentIds],
  };
}

export function evaluateConfusionActionPermission(conditionLedger,input={}){
  return permissionAt(conditionLedger,input);
}

export function createG21ConfusionTacticState({resolverState,conditionLedger,actions={}}={}){
  validateCombatResolverState(resolverState);
  validateCombatConditionLedger(conditionLedger);
  invariant(resolverState.battleId===conditionLedger.battleId,'G21_TACTIC_BATTLE_SCOPE_MISMATCH');
  invariant(object(actions),'G21 tactic actions are required');
  const state={schemaVersion:VERSION,resolverState:clone(resolverState),conditionLedger:clone(conditionLedger),actions:clone(actions)};
  validateG21ConfusionTacticState(state);
  return state;
}

export function quoteG21ConfusionTactic(state,input={}){
  validateG21ConfusionTacticState(state);
  const normalized=normalizeDecisionInput(state,input);
  const base=quoteCombatAction(state.resolverState,{definition:definition(),currentTick:normalized.currentTick});
  const reason=decisionReason(state,normalized)??base.reason;
  return {
    ...base,
    actionId:G21_CONFUSION_TACTIC_TRIAL.tacticId,
    commandId:G21_CONFUSION_TACTIC_TRIAL.commandId,
    cooldownFamily:G21_CONFUSION_TACTIC_TRIAL.cooldownFamily,
    actualTroopType:normalized.sourceTroopType,
    targetCount:1,
    rangeTiles:2,
    available:reason===null,
    reason,
  };
}

export function reserveG21ConfusionTactic(state,input={}){
  validateG21ConfusionTacticState(state);
  const normalized=normalizeDecisionInput(state,input);
  const fingerprint=JSON.stringify(normalized);
  const existing=state.actions[normalized.actionInstanceId];
  if(existing){
    invariant(existing.decisionFingerprint===fingerprint,`CONFLICTING_G21_TACTIC_DECISION:${normalized.actionInstanceId}`);
    return {state:clone(state),command:clone(existing.command),quote:clone(existing.quote),replayed:true};
  }
  const quote=quoteG21ConfusionTactic(state,normalized);
  invariant(quote.available,`ACTION_UNAVAILABLE:${quote.reason}`);
  const resolverState=reserveCombatAction(state.resolverState,{
    actionInstanceId:normalized.actionInstanceId,
    definition:definition(),
    actorRef:normalized.sourceUnitId,
    actorTroopType:G21_CONFUSION_TACTIC_TRIAL.resolverTransportTroopType,
    targetRef:normalized.targetUnitId,
    currentTick:normalized.currentTick,
    decisionValidation:{valid:true,losState:'CLEAR'},
  });
  const next=clone(state),command=publicCommand(normalized);
  next.resolverState=resolverState;
  next.actions[normalized.actionInstanceId]={
    actionInstanceId:normalized.actionInstanceId,
    status:'RESERVED',
    decisionFingerprint:fingerprint,
    executionFingerprint:null,
    quote:clone(quote),
    command,
    output:null,
  };
  validateG21ConfusionTacticState(next);
  return {state:next,command:clone(command),quote:clone(quote),replayed:false};
}

export function interruptReservedG21ConfusionTactic(state,input={}){
  validateG21ConfusionTacticState(state);
  invariant(object(input),'G21 tactic interruption input is required');
  const actionInstanceId=id(input.actionInstanceId,'actionInstanceId');
  const currentTick=uint(input.currentTick,'currentTick');
  const internalReason=id(input.internalReason??'CONFUSION_APPLIED','internalReason');
  const fingerprint=JSON.stringify({actionInstanceId,currentTick,internalReason});
  const context=state.actions[actionInstanceId];
  invariant(context,`UNKNOWN_G21_TACTIC_ACTION:${actionInstanceId}`);
  if(context.status!=='RESERVED'){
    invariant(context.status==='CANCELLED'&&context.output?.interruptionFingerprint===fingerprint,`CONFLICTING_G21_TACTIC_INTERRUPTION:${actionInstanceId}`);
    return {state:clone(state),result:clone(context.output),replayed:true};
  }
  const record=getCombatResolverRecord(state.resolverState,actionInstanceId);
  invariant(record?.instance.status==='RESERVED'&&record.lifecycle.status==='RESERVED',`G21_TACTIC_NOT_INTERRUPTIBLE:${actionInstanceId}`);
  invariant(currentTick>=record.lifecycle.decisionTick,'G21_INTERRUPTION_BEFORE_DECISION');
  invariant(record.lifecycle.discountTokenIds.length===0,'G21_TRIAL_DISCOUNTS_NOT_ALLOWED');
  const next=clone(state),resolver=next.resolverState,lifecycle=resolver.lifecycleState,action=lifecycle.actions[actionInstanceId],instance=resolver.instances[actionInstanceId];
  invariant(lifecycle.stamina.reserved>=action.quotedCost,'G21_INTERRUPTION_RESERVATION_MISMATCH');
  lifecycle.stamina.reserved-=action.quotedCost;
  action.status='CANCELLED';
  action.validationTick=currentTick;
  action.cancelReason='CONDITION_NO_LONGER_MET';
  const validation={valid:false,internalReason,publicReason:'CONDITION_NO_LONGER_MET',losState:'CLEAR'};
  instance.status='CANCELLED';
  instance.execution={tick:currentTick,validation,fingerprint:JSON.stringify({tick:currentTick,validation,results:[]})};
  const output={
    status:'CANCELLED',
    internalReason,
    controlResolution:'NOT_RESOLVED',
    conditionApplicationStatus:'NOT_ATTEMPTED',
    duration:null,
    coordinatorEntry:null,
    interruptionPlan:planConfusionOnApplyInterruptions({conditionApplicationStatus:'NOT_ATTEMPTED'}),
    interruptionFingerprint:fingerprint,
  };
  next.actions[actionInstanceId].status='CANCELLED';
  next.actions[actionInstanceId].executionFingerprint=fingerprint;
  next.actions[actionInstanceId].output=clone(output);
  validateG21ConfusionTacticState(next);
  return {state:next,result:output,replayed:false};
}

export function resolveG21ConfusionTactic(state,input={}){
  validateG21ConfusionTacticState(state);
  const normalized=normalizeExecutionInput(input);
  const context=state.actions[normalized.actionInstanceId];
  invariant(context,`UNKNOWN_G21_TACTIC_ACTION:${normalized.actionInstanceId}`);
  const fingerprint=JSON.stringify(normalized);
  if(context.status!=='RESERVED'){
    invariant(context.executionFingerprint===fingerprint,`CONFLICTING_G21_TACTIC_EXECUTION:${normalized.actionInstanceId}`);
    return {state:clone(state),result:clone(context.output),replayed:true};
  }
  const reason=executionReason(state,context,normalized);
  if(reason!==null){
    const resolverState=executeCombatAction(state.resolverState,{
      actionInstanceId:normalized.actionInstanceId,
      currentTick:normalized.currentTick,
      executionValidation:{valid:false,internalReason:reason,publicReason:'CONDITION_NO_LONGER_MET',losState:normalized.losState},
      results:[],
    });
    const output={
      status:'CANCELLED',
      internalReason:reason,
      controlResolution:'NOT_RESOLVED',
      conditionApplicationStatus:'NOT_ATTEMPTED',
      duration:null,
      coordinatorEntry:null,
      interruptionPlan:planConfusionOnApplyInterruptions({conditionApplicationStatus:'NOT_ATTEMPTED',targetActivity:normalized.targetActivity}),
    };
    const next=clone(state);
    next.resolverState=resolverState;
    next.actions[normalized.actionInstanceId].status='CANCELLED';
    next.actions[normalized.actionInstanceId].executionFingerprint=fingerprint;
    next.actions[normalized.actionInstanceId].output=clone(output);
    validateG21ConfusionTacticState(next);
    return {state:next,result:output,replayed:false};
  }

  invariant(normalized.resolution!==null,'EXPLICIT_G21_CONTROL_RESOLUTION_REQUIRED');
  let conditionLedger=advanceCombatConditionLedger(state.conditionLedger,{
    requestId:context.command.conditionAdvanceRequestId,
    currentGlobalTick:normalized.currentTick,
  }).state;
  const preExecutionSnapshot=capturePreExecutionConditionSnapshot(conditionLedger,{
    targetUnitId:context.command.targetUnitId,
    executionGlobalTick:normalized.currentTick,
  });
  const duration=calculateG21ConfusionDuration({
    controlApplied:normalized.resolution.controlApplied,
    sourceOfficerId:context.command.sourceOfficerId,
    sourceTacticId:context.command.tacticId,
    applicationMode:'DIRECT',
    applicationBatchId:context.command.applicationBatchId,
    traitRank:context.command.traitRank,
    preExecutionSnapshot,
  });
  const resolverState=executeCombatAction(state.resolverState,{
    actionInstanceId:normalized.actionInstanceId,
    currentTick:normalized.currentTick,
    executionValidation:{valid:true,losState:'CLEAR'},
    results:[{targetRef:context.command.targetUnitId,effectValue:normalized.resolution.controlApplied?1:0}],
  });

  let conditionApplicationStatus='NOT_ATTEMPTED',conditionResult=null;
  if(duration.statusApplied){
    const applied=applyCombatCondition(conditionLedger,{
      requestId:context.command.conditionRequestId,
      statusInstanceId:context.command.statusInstanceId,
      statusKey:'CONFUSION',
      targetUnitId:context.command.targetUnitId,
      sourceOfficerId:context.command.sourceOfficerId,
      sourceTacticId:context.command.tacticId,
      sourceUnitId:context.command.sourceUnitId,
      applicationMode:'DIRECT',
      applicationBatchId:context.command.applicationBatchId,
      startGlobalTick:normalized.currentTick,
      durationTicks:duration.durationTicks,
      cleanseable:true,
      traitModifierRefs:duration.traitModifierRefs,
      definitionVersion:COMBAT_CONDITION_DEFINITION_VERSION,
    });
    conditionLedger=applied.state;
    conditionResult=applied.result;
    conditionApplicationStatus=applied.result.status;
  }
  const controlEffectApplied=CONDITION_CHANGED_RESULTS.has(conditionApplicationStatus);
  const entry=coordinatorEntry(context.command,controlEffectApplied);
  const output={
    status:'RESOLVED_PENDING_COORDINATOR_MERGE',
    internalReason:null,
    controlResolution:normalized.resolution.controlApplied?'SUCCESS':'FAILED',
    conditionApplicationStatus,
    conditionResult:conditionResult?clone(conditionResult):null,
    duration:clone(duration),
    preExecutionSnapshotFingerprint:preExecutionSnapshot.fingerprint,
    coordinatorEntry:entry,
    interruptionPlan:planConfusionOnApplyInterruptions({conditionApplicationStatus,targetActivity:normalized.targetActivity}),
  };
  const next=clone(state);
  next.resolverState=resolverState;
  next.conditionLedger=conditionLedger;
  next.actions[normalized.actionInstanceId].status='RESOLVED_PENDING_COORDINATOR_MERGE';
  next.actions[normalized.actionInstanceId].executionFingerprint=fingerprint;
  next.actions[normalized.actionInstanceId].output=clone(output);
  validateG21ConfusionTacticState(next);
  return {state:next,result:output,replayed:false};
}

export function acknowledgeG21ConfusionCoordinatorMerge(state,{actionInstanceId,currentTick}={}){
  validateG21ConfusionTacticState(state);
  id(actionInstanceId,'actionInstanceId');uint(currentTick,'currentTick');
  const context=state.actions[actionInstanceId];
  invariant(context,`UNKNOWN_G21_TACTIC_ACTION:${actionInstanceId}`);
  const fingerprint=JSON.stringify({actionInstanceId,currentTick});
  if(context.status==='COMPLETED'){
    invariant(context.output?.coordinatorMergeFingerprint===fingerprint,`CONFLICTING_G21_COORDINATOR_ACK:${actionInstanceId}`);
    return {state:clone(state),result:clone(context.output),replayed:true};
  }
  invariant(context.status==='RESOLVED_PENDING_COORDINATOR_MERGE',`G21_TACTIC_NOT_AWAITING_COORDINATOR:${actionInstanceId}`);
  const record=getCombatResolverRecord(state.resolverState,actionInstanceId);
  invariant(record?.instance.status==='RESULTS_MERGED'&&record.instance.merge?.tick===currentTick,`G21_COORDINATOR_MERGE_NOT_FOUND:${actionInstanceId}`);
  const next=clone(state);
  next.actions[actionInstanceId].status='COMPLETED';
  next.actions[actionInstanceId].output.status='COMPLETED';
  next.actions[actionInstanceId].output.coordinatorMergeFingerprint=fingerprint;
  validateG21ConfusionTacticState(next);
  return {state:next,result:clone(next.actions[actionInstanceId].output),replayed:false};
}

export function validateG21ConfusionTacticState(state){
  invariant(object(state)&&state.schemaVersion===VERSION,'UNSUPPORTED_G21_CONFUSION_TACTIC_STATE_VERSION');
  validateCombatResolverState(state.resolverState);
  validateCombatConditionLedger(state.conditionLedger);
  invariant(state.resolverState.battleId===state.conditionLedger.battleId,'G21_TACTIC_BATTLE_SCOPE_MISMATCH');
  invariant(object(state.actions),'G21 tactic actions are required');
  for(const[actionInstanceId,context]of Object.entries(state.actions)){
    id(actionInstanceId,'G21 actionInstanceId');
    invariant(object(context)&&context.actionInstanceId===actionInstanceId,`G21_ACTION_KEY_MISMATCH:${actionInstanceId}`);
    invariant(['RESERVED','CANCELLED','RESOLVED_PENDING_COORDINATOR_MERGE','COMPLETED'].includes(context.status),`INVALID_G21_ACTION_STATUS:${context.status}`);
    invariant(typeof context.decisionFingerprint==='string','G21 decisionFingerprint is required');
    invariant(object(context.quote)&&object(context.command),'G21 quote and command are required');
    const command=context.command;
    invariant(command.actionInstanceId===actionInstanceId&&command.commandId==='TACTIC_CONTROL'&&command.tacticId==='ART-G21',`INVALID_G21_COMMAND:${actionInstanceId}`);
    invariant(command.sourceUnitId===state.resolverState.actorRef&&command.sourceOfficerId==='G21',`INVALID_G21_COMMAND_SOURCE:${actionInstanceId}`);
    invariant(ALLOWED_TROOPS.includes(command.sourceTroopType),`INVALID_G21_COMMAND_TROOP:${actionInstanceId}`);
    invariant(command.cooldownFamily==='MENTAL_DISRUPTION'&&command.targetCount===1&&command.rangeTiles===2&&command.losPolicy==='CLEAR_REQUIRED',`INVALID_G21_COMMAND_CONTRACT:${actionInstanceId}`);
    invariant(Number.isInteger(command.traitRank)&&command.traitRank>=0&&command.traitRank<=5,`INVALID_G21_TRAIT_RANK:${actionInstanceId}`);
    const record=getCombatResolverRecord(state.resolverState,actionInstanceId);
    invariant(record&&record.instance.actionId==='TACTIC_CONTROL'&&record.instance.actorTroopType==='mystic',`MISSING_G21_RESOLVER_ACTION:${actionInstanceId}`);
    invariant(record.instance.targetRef===command.targetUnitId,`G21_TARGET_MISMATCH:${actionInstanceId}`);
    invariant(record.lifecycle.definition.staminaCost===18&&record.lifecycle.definition.windupTicks===8&&record.lifecycle.definition.recoveryTicks===12&&record.lifecycle.definition.cooldownTicks===40,`G21_LIFECYCLE_CONTRACT_MISMATCH:${actionInstanceId}`);
    if(context.status==='RESERVED'){
      invariant(record.instance.status==='RESERVED'&&context.executionFingerprint===null&&context.output===null,`G21_RESERVED_STATE_MISMATCH:${actionInstanceId}`);
    }else if(context.status==='CANCELLED'){
      invariant(record.instance.status==='CANCELLED'&&typeof context.executionFingerprint==='string'&&object(context.output)&&context.output.status==='CANCELLED',`G21_CANCELLED_STATE_MISMATCH:${actionInstanceId}`);
    }else if(context.status==='RESOLVED_PENDING_COORDINATOR_MERGE'){
      invariant(['RESOLVED','RESULTS_MERGED'].includes(record.instance.status)&&typeof context.executionFingerprint==='string'&&object(context.output)&&context.output.status==='RESOLVED_PENDING_COORDINATOR_MERGE',`G21_RESOLVED_STATE_MISMATCH:${actionInstanceId}`);
      invariant(object(context.output.coordinatorEntry)&&context.output.coordinatorEntry.actionInstanceId===actionInstanceId,`G21_COORDINATOR_ENTRY_MISMATCH:${actionInstanceId}`);
    }else{
      invariant(record.instance.status==='RESULTS_MERGED'&&typeof context.executionFingerprint==='string'&&object(context.output)&&context.output.status==='COMPLETED',`G21_COMPLETED_STATE_MISMATCH:${actionInstanceId}`);
      invariant(object(context.output.coordinatorEntry)&&context.output.coordinatorEntry.actionInstanceId===actionInstanceId&&typeof context.output.coordinatorMergeFingerprint==='string',`G21_COORDINATOR_ACK_MISMATCH:${actionInstanceId}`);
    }
  }
  return true;
}

export const G21_CONFUSION_TACTIC_STATE_VERSION=VERSION;
